import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
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

@ApiTags('Users (Quản lý Tài khoản)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
    const user = await this.usersService.createAdmin(dto);
    return {
      message: 'Tạo tài khoản Admin thành công',
      user,
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
    return this.usersService.resetPasswordAndUnlock(id, dto);
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
    return this.usersService.kickUser(targetId, currentUser);
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
    return this.usersService.deleteUser(targetId, currentUser);
  }
}
