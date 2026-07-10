import { Injectable } from '@nestjs/common';
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
}


