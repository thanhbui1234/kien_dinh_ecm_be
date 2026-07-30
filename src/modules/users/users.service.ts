import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
   * Mở khóa tài khoản và cài đặt mật khẩu mới
   */
  async unlockAndResetPassword(id: string, newPasswordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        isLocked: false,
        password: newPasswordHash,
        refreshToken: null,
      },
    });
  }

  /**
   * Lấy danh sách tất cả tài khoản
   */
  async findAll() {
    return this.prisma.user.findMany({
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
  }

  /**
   * Tạo tài khoản Admin mới
   */
  async createAdmin(email: string, passwordHash: string, fullName: string) {
    return this.prisma.user.create({
      data: {
        email,
        password: passwordHash,
        fullName,
        role: Role.ADMIN,
      },
    });
  }

  /**
   * Xóa tài khoản
   */
  async deleteUser(id: string) {
    return this.prisma.user.delete({
      where: { id },
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
