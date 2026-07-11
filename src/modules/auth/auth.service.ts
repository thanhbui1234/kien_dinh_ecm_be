import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { HashUtil } from '../../common/utils/hash.util';
import { LoginDto } from './dto/login.dto';
import { AppMessages } from '../../common/constants/messages.constant';
import { ErrorCode } from '../../common/constants/error-codes.constant';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Tạo cặp token: Access Token và Refresh Token
   */
  private async getTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

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
   * Xác thực thông tin đăng nhập và trả về JWT token.
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException({
        message: AppMessages.AUTH.USER_NOT_FOUND,
        errorCode: ErrorCode.USER_NOT_FOUND,
      });
    }

    const isPasswordMatching = await HashUtil.compare(password, user.password);
    if (!isPasswordMatching) {
      throw new UnauthorizedException({
        message: AppMessages.AUTH.INVALID_CREDENTIALS,
        errorCode: ErrorCode.INVALID_CREDENTIALS,
      });
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
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
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
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

      // Cấp cặp token mới
      const tokens = await this.getTokens(user.id, user.email, user.role);
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
}
