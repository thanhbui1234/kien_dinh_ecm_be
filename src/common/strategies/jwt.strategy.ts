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

  async validate(payload: { sub: string; email: string; role: string }) {
    // Truy vấn CSDL để đảm bảo user vẫn còn tồn tại (chưa bị xoá hoặc khoá)
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException({
        message: AppMessages.AUTH.USER_NOT_FOUND,
        errorCode: ErrorCode.USER_NOT_FOUND,
      });
    }

    // Trả về thông tin user (được nhét vào request.user)
    return { userId: user.id, email: user.email, role: user.role };
  }
}
