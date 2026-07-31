import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { RedisService } from '../../database/redis.service';
import { HashUtil } from '../../common/utils/hash.util';
import { parseUserAgent } from '../../common/utils/user-agent.util';
import { LoginDto } from './dto/login.dto';
import { SetupAdminDto } from './dto/setup-admin.dto';
import { AppMessages } from '../../common/constants/messages.constant';
import { ErrorCode } from '../../common/constants/error-codes.constant';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Tạo cặp token: Access Token và Refresh Token (Gắn kèm sessionId)
   */
  private async getTokens(userId: string, email: string, role: string, sessionId: string) {
    const payload = { sub: userId, email, role, sessionId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ) as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Xác thực thông tin đăng nhập và trả về JWT token với quy trình Anti-Sharing 3 thiết bị
   */
  async login(loginDto: LoginDto, userAgent?: string) {
    const { email, password, deviceId, fingerprint } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException({
        message: AppMessages.AUTH.USER_NOT_FOUND,
        errorCode: ErrorCode.USER_NOT_FOUND,
      });
    }

    // 1. Kiểm tra tài khoản có đang bị khóa hay không
    if (user.isLocked) {
      throw new UnauthorizedException({
        message: 'Tài khoản đã bị khóa do đăng nhập ở thiết bị thứ 3! Vui lòng liên hệ Super Admin.',
        errorCode: ErrorCode.ACCOUNT_LOCKED,
      });
    }

    const isPasswordMatching = await HashUtil.compare(password, user.password);
    if (!isPasswordMatching) {
      throw new UnauthorizedException({
        message: AppMessages.AUTH.INVALID_CREDENTIALS,
        errorCode: ErrorCode.INVALID_CREDENTIALS,
      });
    }

    // 2. Định danh thiết bị lai (Hybrid Device Fingerprinting)
    const deviceKey = `user_devices:${user.id}`;
    const rawDevices = await this.redisService.client.smembers(deviceKey);
    const existingDevices = (rawDevices || []).map((d) => String(d));

    const currentDevId = deviceId?.trim() || '';
    const currentFp = fingerprint?.trim() || '';

    // Kiểm tra xem thiết bị này đã từng đăng nhập trước đây chưa
    const isKnownDevice = existingDevices.some((entry) => {
      const parts = entry.split(':');
      const savedDevId = parts[0];
      const savedFp = parts[1];
      if (currentDevId && savedDevId && currentDevId === savedDevId) return true;
      if (currentFp && savedFp && currentFp === savedFp) return true;
      return false;
    });

    // 3. Nếu là thiết bị mới hoàn toàn -> Kiểm tra giới hạn 3 thiết bị
    if (!isKnownDevice && (currentDevId || currentFp)) {
      if (existingDevices.length >= 2) {
        // Thiết bị thứ 3 xuất hiện -> TỰ ĐỘNG KHÓA TÀI KHOẢN & KICK SẠCH SESSION
        const randomPassHash = await HashUtil.hash(randomUUID());
        await this.usersService.lockUser(user.id, randomPassHash);
        await this.redisService.client.del(`user_sessions:${user.id}`);

        throw new UnauthorizedException({
          message: 'Tài khoản vi phạm đăng nhập quá 3 thiết bị độc nhất và đã bị khóa tự động! Vui lòng liên hệ Super Admin.',
          errorCode: ErrorCode.ACCOUNT_LOCKED,
        });
      }

      // Lưu thiết bị mới vào danh sách kèm tên HĐH & Trình duyệt
      const deviceName = parseUserAgent(userAgent);
      await this.redisService.client.sadd(
        deviceKey,
        `${currentDevId || 'none'}:${currentFp || 'none'}:${deviceName}`,
      );
    }

    // 4. Tạo sessionId cho phiên đăng nhập này
    const sessionId = randomUUID();
    await this.redisService.client.hset(`user_sessions:${user.id}`, {
      [sessionId]: Date.now().toString(),
    });

    const tokens = await this.getTokens(user.id, user.email, user.role, sessionId);
    const hashedRefreshToken = await HashUtil.hash(tokens.refreshToken);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  /**
   * Cấp lại Access Token mới bằng Refresh Token
   */
  async refreshTokens(refreshToken: string) {
    try {
      // Xác thực token có hợp lệ không
      const payload = await this.jwtService.verifyAsync<{ sub: string; sessionId?: string }>(
        refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      // Lấy thông tin user (gồm cả hashed refresh token trong DB)
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException({
          message: AppMessages.AUTH.INVALID_REFRESH_TOKEN,
          errorCode: ErrorCode.INVALID_REFRESH_TOKEN,
        });
      }

      if (user.isLocked) {
        throw new UnauthorizedException({
          message: 'Tài khoản đã bị khóa do vi phạm 3 thiết bị! Vui lòng liên hệ Super Admin.',
          errorCode: 'ACCOUNT_LOCKED',
        });
      }

      // So khớp mã hash
      const isRefreshTokenMatching = await HashUtil.compare(
        refreshToken,
        user.refreshToken,
      );
      if (!isRefreshTokenMatching) {
        throw new UnauthorizedException({
          message: AppMessages.AUTH.INVALID_REFRESH_TOKEN,
          errorCode: ErrorCode.INVALID_REFRESH_TOKEN,
        });
      }

      // Cấp cặp token mới với sessionId giữ nguyên hoặc tạo mới
      const sessionId = payload.sessionId || randomUUID();
      await this.redisService.client.hset(`user_sessions:${user.id}`, {
        [sessionId]: Date.now().toString(),
      });

      const tokens = await this.getTokens(user.id, user.email, user.role, sessionId);
      const hashedRefreshToken = await HashUtil.hash(tokens.refreshToken);
      await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

      return tokens;
    } catch {
      throw new UnauthorizedException({
        message: AppMessages.AUTH.INVALID_REFRESH_TOKEN,
        errorCode: ErrorCode.INVALID_REFRESH_TOKEN,
      });
    }
  }

  /**
   * Đăng xuất: Thu hồi Refresh Token trong DB
   */
  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    await this.redisService.client.del(`user_sessions:${userId}`);
    return {
      message: AppMessages.AUTH.LOGOUT_SUCCESS,
    };
  }

  /**
   * Trả về thông tin profile của user đang đăng nhập.
   */
  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        message: AppMessages.AUTH.PROFILE_NOT_FOUND,
        errorCode: ErrorCode.USER_NOT_FOUND,
      });
    }
    return user;
  }

  /**
   * Tạo tài khoản Admin (ẩn) dùng cho bàn giao hệ thống
   */
  async setupAdmin(setupAdminDto: SetupAdminDto) {
    const { email, password, fullName, secretKey } = setupAdminDto;
    
    // Kiểm tra Secret Key
    const expectedSecret = this.configService.get<string>('ADMIN_SETUP_SECRET');
    if (!expectedSecret || secretKey !== expectedSecret) {
      throw new UnauthorizedException({
        message: 'Invalid Secret Key',
        errorCode: ErrorCode.INVALID_CREDENTIALS,
      });
    }

    // Mã hóa mật khẩu và tạo user
    const passwordHash = await HashUtil.hash(password);
    const finalName = fullName || 'Quản trị viên';
    const user = await this.usersService.upsertAdmin(email, passwordHash, finalName);
    
    return {
      message: 'Admin account created successfully',
      email: user.email,
    };
  }
}
