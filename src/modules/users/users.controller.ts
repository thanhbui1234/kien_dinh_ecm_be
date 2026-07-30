import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HashUtil } from '../../common/utils/hash.util';
import { RedisService } from '../../database/redis.service';

@ApiTags('Users (Quản lý Tài khoản)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Lấy danh sách tất cả các tài khoản hệ thống
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách tất cả tài khoản trong hệ thống' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách tài khoản' })
  async findAll() {
    return this.usersService.findAll();
  }

  /**
   * Tạo tài khoản Admin mới (Chỉ dành cho Super Admin)
   */
  @Post('admin')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Tạo tài khoản Admin mới (Chỉ Super Admin)' })
  @ApiResponse({ status: 201, description: 'Tạo tài khoản thành công' })
  async createAdmin(@Body() dto: CreateAdminDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email này đã được sử dụng');
    }

    const passwordHash = await HashUtil.hash(dto.password);
    const user = await this.usersService.createAdmin(
      dto.email,
      passwordHash,
      dto.fullName,
    );

    return {
      message: 'Tạo tài khoản Admin thành công',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  /**
   * Force Reset mật khẩu và Mở khóa tài khoản (Chỉ dành cho Super Admin)
   */
  @Patch(':id/reset-password')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Đặt lại mật khẩu và mở khóa tài khoản (Chỉ Super Admin)' })
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    const newPasswordHash = await HashUtil.hash(dto.newPassword);
    await this.usersService.unlockAndResetPassword(id, newPasswordHash);

    // Tẩy trắng danh sách thiết bị cũ trên Redis để khôi phục hạn ngạch
    await this.redisService.client.del(`user_devices:${id}`);
    await this.redisService.client.del(`user_sessions:${id}`);

    return {
      message: 'Đặt lại mật khẩu, xóa lịch sử thiết bị và mở khóa tài khoản thành công',
    };
  }

  /**
   * Kick (Đăng xuất cưỡng chế) một tài khoản
   */
  @Post(':id/kick')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Kick (Force Logout) tài khoản khỏi hệ thống' })
  async kickUser(
    @Param('id') targetId: string,
    @CurrentUser() currentUser: { userId: string; role: Role },
  ) {
    const targetUser = await this.usersService.findById(targetId);
    if (!targetUser) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    // Chặn Admin thường kick Super Admin hoặc Admin khác
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
   * Xóa tài khoản
   */
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Xóa tài khoản khỏi hệ thống' })
  async deleteUser(
    @Param('id') targetId: string,
    @CurrentUser() currentUser: { userId: string; role: Role },
  ) {
    if (currentUser.userId === targetId) {
      throw new BadRequestException('Bạn không thể tự xóa tài khoản của chính mình');
    }

    const targetUser = await this.usersService.findById(targetId);
    if (!targetUser) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    // Chặn Admin thường xóa Super Admin hoặc Admin khác
    if (currentUser.role === Role.ADMIN) {
      if (targetUser.role === Role.SUPER_ADMIN || targetUser.role === Role.ADMIN) {
        throw new ForbiddenException('Bạn không có quyền xóa tài khoản Admin khác');
      }
    }

    await this.usersService.deleteUser(targetId);
    await this.redisService.client.del(`user_sessions:${targetId}`);
    await this.redisService.client.del(`user_devices:${targetId}`);

    return {
      message: `Đã xóa tài khoản ${targetUser.email} thành công`,
    };
  }
}
