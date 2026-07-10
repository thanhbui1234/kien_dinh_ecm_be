import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Đăng nhập. Trả về token. Bypass xác thực.
   */
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Dùng Refresh Token để xin cấp Access Token mới.
   */
  @Public()
  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refreshTokens(refreshDto.refreshToken);
  }

  /**
   * Đăng xuất. Xóa bỏ Refresh Token.
   */
  @Post('logout')
  async logout(@CurrentUser('userId') userId: string) {
    return this.authService.logout(userId);
  }

  /**
   * Lấy profile user đang đăng nhập.
   */
  @Get('me')
  async getProfile(@CurrentUser('userId') userId: string) {
    return this.authService.getMe(userId);
  }
}
