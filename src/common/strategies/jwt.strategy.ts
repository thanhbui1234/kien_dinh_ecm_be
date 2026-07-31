import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../modules/users/users.service';
import { AppMessages } from '../constants/messages.constant';
import { ErrorCode } from '../constants/error-codes.constant';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'defaultSecretForDev',
    });
  }

  /**
   * Giải mã và kiểm tra thông tin User trong JWT Payload.
   * 1. Xác minh tài khoản còn tồn tại trong DB không.
   * 2. Kiểm tra cờ `isLocked` (Nêu tài khoản bị khóa do vi phạm 3 thiết bị -> Bắn lỗi ACCOUNT_LOCKED).
   * 3. Trả về thông tin gắn vào `request.user` bao gồm `sessionId`.
   */
  async validate(payload: { sub: string; email: string; role: string; sessionId?: string }) {
    // Truy vấn CSDL để đảm bảo user vẫn còn tồn tại (chưa bị xoá hoặc khoá)
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException({
        message: AppMessages.AUTH.USER_NOT_FOUND,
        errorCode: ErrorCode.USER_NOT_FOUND,
      });
    }

    if (user.isLocked) {
      throw new UnauthorizedException({
        message: 'Tài khoản đã bị khóa do vi phạm 3 thiết bị! Vui lòng liên hệ Super Admin.',
        errorCode: ErrorCode.ACCOUNT_LOCKED,
      });
    }

    // Trả về thông tin user (được nhét vào request.user)
    return { userId: user.id, email: user.email, role: user.role, sessionId: payload.sessionId };
  }
}
