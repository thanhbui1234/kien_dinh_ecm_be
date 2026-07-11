import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  statusCode: number;
  data: T;
  meta?: unknown;
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
    const response = ctx.getResponse<ExpressResponse>();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((result: unknown) => {
        const isObject = result !== null && typeof result === 'object';
        const isPaginated = isObject && 'meta' in result && 'data' in result;

        return {
          success: true,
          statusCode,
          data: isPaginated ? (result as { data: T }).data : (result as T),
          ...(isPaginated && { meta: (result as { meta: unknown }).meta }),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
