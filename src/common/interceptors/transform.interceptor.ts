import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  statusCode: number;
  data: T;
  meta?: any;
  timestamp: string;
}

/**
 * Interceptor chuẩn hóa dữ liệu trả về cho Frontend.
 * Tự động format thành { success, statusCode, data, meta... }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((result) => {
        const isPaginated =
          result &&
          typeof result === 'object' &&
          'meta' in result &&
          'data' in result;

        return {
          success: true,
          statusCode,
          data: isPaginated ? result.data : result,
          ...(isPaginated && { meta: result.meta }),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
