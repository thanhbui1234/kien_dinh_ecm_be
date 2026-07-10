import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppMessages } from '../constants/messages.constant';

/**
 * Guard bảo vệ toàn cục các API, yêu cầu token hợp lệ.
 * Các API có gắn @Public() sẽ được bỏ qua.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException({
        message: AppMessages.AUTH.UNAUTHORIZED_OR_EXPIRED,
        errorCode: 'UNAUTHORIZED'
      });
    }
    return user;
  }
}
