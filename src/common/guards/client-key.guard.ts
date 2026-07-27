import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_HEADERS, AI_MESSAGES } from '../../modules/ai/constants/ai.constants';

@Injectable()
export class ClientKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientKey = request.headers[AI_HEADERS.CLIENT_KEY];
    const expectedSecret = this.configService.get<string>('APP_CLIENT_SECRET');

    if (!clientKey || clientKey !== expectedSecret) {
      throw new ForbiddenException({
        message: AI_MESSAGES.INVALID_CLIENT_SIGNATURE,
        errorCode: 'INVALID_CLIENT_SIGNATURE',
      });
    }

    return true;
  }
}
