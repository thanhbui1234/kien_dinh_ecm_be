import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../constants/error-codes.constant';
import { AppMessages } from '../constants/messages.constant';

/**
 * Global exception filter for HTTP errors.
 * Formats standard NestJS exceptions into the unified API response structure.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as
      string | Record<string, unknown>;

    let errorCode = HttpStatus[status] || ErrorCode.INTERNAL_SERVER_ERROR;
    let message: string | string[] = AppMessages.SYSTEM.INTERNAL_SERVER_ERROR;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      if ('message' in exceptionResponse && exceptionResponse.message) {
        message = exceptionResponse.message as string | string[];
      }
      if ('errorCode' in exceptionResponse && exceptionResponse.errorCode) {
        errorCode = exceptionResponse.errorCode as string;
      }
    }

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${status} - Message: ${Array.isArray(message) ? message.join(', ') : message}`,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
