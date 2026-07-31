import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { HashUtil } from '../../common/utils/hash.util';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Tìm user theo email (Phục vụ đăng nhập).
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Lấy thông tin user theo ID, tự động bỏ qua trường password.
   */
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      omit: {
        password: true,
      },
    });
  }

  /**
   * Cập nhật Refresh Token (đã hash) vào DB. Set null để logout.
   */
  async updateRefreshToken(id: string, hashedToken: string | null) {
    return this.prisma.user.update({
      where: { id },
      data: { refreshToken: hashedToken },
    });
  }

  /**
   * Lấy danh sách tất cả tài khoản hệ thống kèm thông tin Redis phong phú (Trạng thái Online, Lịch sử thiết bị, Session mới nhất)
   */
  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isLocked: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        let deviceCount = 0;
        let activeSessionsCount = 0;
        let isOnline = false;
        let lastActiveAt: string | null = null;
        let devices: string[] = [];

        try {
          const [devicesRaw, sessionsRaw] = await Promise.all([
            this.redisService.client.smembers(`user_devices:${user.id}`),
            this.redisService.client.hvals(`user_sessions:${user.id}`),
          ]);

          devices = (devicesRaw || []).map((d) => {
            const str = String(d);
            const parts = str.split(':');
            if (parts.length >= 3) {
              const devName = parts.slice(2).join(':');
              const shortDevId = parts[0] !== 'none' ? parts[0].substring(0, 8) : 'FP';
              return `${devName} [${shortDevId}]`;
            }
            return str;
          });
          deviceCount = devices.length;

          const sessionTimestamps = (sessionsRaw || [])
            .map((t) => Number(t))
            .filter((t) => !isNaN(t) && t > 0);

          activeSessionsCount = sessionTimestamps.length;
          isOnline = activeSessionsCount > 0;

          if (sessionTimestamps.length > 0) {
            const maxTimestamp = Math.max(...sessionTimestamps);
            lastActiveAt = new Date(maxTimestamp).toISOString();
          }
        } catch {
          // Bỏ qua lỗi Redis nếu gặp sự cố tạm thời
        }

        return {
          ...user,
          isOnline,
          deviceCount,
          activeSessionsCount,
          lastActiveAt,
          devices,
        };
      }),
    );

    return enrichedUsers;
  }

  /**
   * Tạo tài khoản Admin mới (Chỉ dành cho Super Admin)
   */
  async createAdmin(dto: CreateAdminDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email này đã được sử dụng');
    }

    const passwordHash = await HashUtil.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: passwordHash,
        fullName: dto.fullName,
        role: Role.ADMIN,
      },
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  /**
   * Force Reset Mật khẩu và Mở khóa tài khoản (Tẩy trắng 3 thiết bị trên Redis)
   */
  async resetPasswordAndUnlock(id: string, dto: ResetPasswordDto) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    const newPasswordHash = await HashUtil.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id },
      data: {
        isLocked: false,
        password: newPasswordHash,
        refreshToken: null,
      },
    });

    // Tẩy trắng danh sách thiết bị cũ trên Redis để khôi phục hạn ngạch
    await this.redisService.client.del(`user_devices:${id}`);
    await this.redisService.client.del(`user_sessions:${id}`);

    return {
      message: 'Đặt lại mật khẩu, xóa lịch sử thiết bị và mở khóa tài khoản thành công',
    };
  }

  /**
   * Kick (Đăng xuất cưỡng chế) tài khoản khỏi hệ thống
   */
  async kickUser(targetId: string, currentUser: { userId: string; role: Role }) {
    const targetUser = await this.findById(targetId);
    if (!targetUser) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    // Phân quyền: Admin thường không được phép Kick Super Admin hoặc Admin khác
    if (currentUser.role === Role.ADMIN) {
      if (targetUser.role === Role.SUPER_ADMIN || targetUser.role === Role.ADMIN) {
        throw new ForbiddenException('Bạn không có quyền Kick tài khoản Admin khác');
      }
    }

    // Xóa sạch phiên làm việc trên Redis
    await this.redisService.client.del(`user_sessions:${targetId}`);

    return {
      message: `Đã Kick tài khoản ${targetUser.email} thành công`,
    };
  }

  /**
   * Xóa tài khoản khỏi hệ thống
   */
  async deleteUser(targetId: string, currentUser: { userId: string; role: Role }) {
    if (currentUser.userId === targetId) {
      throw new BadRequestException('Bạn không thể tự xóa tài khoản của chính mình');
    }

    const targetUser = await this.findById(targetId);
    if (!targetUser) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    // Phân quyền: Admin thường không được phép xóa Super Admin hoặc Admin khác
    if (currentUser.role === Role.ADMIN) {
      if (targetUser.role === Role.SUPER_ADMIN || targetUser.role === Role.ADMIN) {
        throw new ForbiddenException('Bạn không có quyền xóa tài khoản Admin khác');
      }
    }

    await this.prisma.user.delete({ where: { id: targetId } });
    await this.redisService.client.del(`user_sessions:${targetId}`);
    await this.redisService.client.del(`user_devices:${targetId}`);

    return {
      message: `Đã xóa tài khoản ${targetUser.email} thành công`,
    };
  }

  /**
   * Khóa tài khoản và randomize mật khẩu
   */
  async lockUser(id: string, randomPasswordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        isLocked: true,
        password: randomPasswordHash,
        refreshToken: null,
      },
    });
  }

  /**
   * Tạo hoặc cập nhật tài khoản Admin (Phục vụ API Setup)
   */
  async upsertAdmin(email: string, passwordHash: string, fullName: string) {
    return this.prisma.user.upsert({
      where: { email },
      update: {
        password: passwordHash,
        fullName,
        role: Role.SUPER_ADMIN,
      },
      create: {
        email,
        password: passwordHash,
        fullName,
        role: Role.SUPER_ADMIN,
      },
    });
  }
}
