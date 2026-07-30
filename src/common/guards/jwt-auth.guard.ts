import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppMessages } from '../constants/messages.constant';
import { ErrorCode } from '../constants/error-codes.constant';
import { RedisService } from '../../database/redis.service';

/**
 * Guard bảo vệ toàn cục các API, yêu cầu token hợp lệ.
 * Các API có gắn @Public() sẽ được bỏ qua.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
  ) {
    super();
  }

  /**
   * Kiểm tra quyền truy cập API toàn cục (Stateful JWT Verification).
   * 1. Bỏ qua nếu API gắn decorator @Public().
   * 2. Xác thực tính hợp lệ của Passport JWT Token.
   * 3. Soi Redis Hash `user_sessions:{userId}` xem `sessionId` còn sống không.
   * Nếu session bị Kick hoặc bị Xóa do vi phạm 3 thiết bị -> Bắn 401 (SESSION_REVOKED).
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const isValid = (await super.canActivate(context)) as boolean;
    if (!isValid) {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const user = request.user;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user && user.userId && user.sessionId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const exists = await this.redisService.client.hexists(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `user_sessions:${user.userId}`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        String(user.sessionId),
      );

      if (!exists) {
        throw new UnauthorizedException({
          message: 'Phiên đăng nhập đã bị vô hiệu hóa hoặc tài khoản bị khóa.',
          errorCode: ErrorCode.SESSION_REVOKED,
        });
      }
    }

    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext, status?: any): TUser {
    if (err || !user) {
      if (err instanceof Error) {
        throw err;
      }
      throw new UnauthorizedException({
        message: AppMessages.AUTH.UNAUTHORIZED_OR_EXPIRED,
        errorCode: 'UNAUTHORIZED',
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  }
}
