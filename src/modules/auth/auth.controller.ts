import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Đăng nhập. Trả về token. Bypass xác thực.
   */
  @ApiOperation({
    summary: 'Đăng nhập',
    description: 'Đăng nhập bằng email và password',
  })
  @ApiBody({ type: LoginDto })
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Dùng Refresh Token để xin cấp Access Token mới.
   */
  @ApiOperation({
    summary: 'Làm mới Token',
    description: 'Gửi Refresh Token để lấy cặp Token mới',
  })
  @ApiBody({ type: RefreshDto })
  @Public()
  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refreshTokens(refreshDto.refreshToken);
  }

  /**
   * Đăng xuất. Xóa bỏ Refresh Token.
   */
  @ApiOperation({
    summary: 'Đăng xuất',
    description: 'Xoá bỏ Refresh Token của người dùng',
  })
  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  async logout(@CurrentUser('userId') userId: string) {
    return this.authService.logout(userId);
  }

  /**
   * Lấy profile user đang đăng nhập.
   */
  @ApiOperation({
    summary: 'Lấy thông tin cá nhân',
    description: 'Trả về dữ liệu của user đang đăng nhập hiện tại',
  })
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  async getProfile(@CurrentUser('userId') userId: string) {
    return this.authService.getMe(userId);
  }
}
