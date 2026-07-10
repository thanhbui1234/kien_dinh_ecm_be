import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { ErrorCode } from '../constants/error-codes.constant';
import { AppMessages } from '../constants/messages.constant';

/**
 * Exception filter for Prisma database errors.
 * Maps Prisma error codes (e.g., P2002, P2025) to standard HTTP responses.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = AppMessages.SYSTEM.INTERNAL_SERVER_ERROR;
    let errorCode: string = ErrorCode.INTERNAL_SERVER_ERROR;
    
    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        message = AppMessages.SYSTEM.UNIQUE_CONSTRAINT(exception.meta?.target as string);
        errorCode = ErrorCode.UNIQUE_CONSTRAINT_VIOLATION;
        break;
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = AppMessages.SYSTEM.RECORD_NOT_FOUND;
        errorCode = ErrorCode.RECORD_NOT_FOUND;
        break;
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = AppMessages.SYSTEM.FOREIGN_KEY_VIOLATION;
        errorCode = ErrorCode.FOREIGN_KEY_VIOLATION;
        break;
      default:
        break;
    }

    this.logger.error(`[${request.method}] ${request.url} - Prisma Error ${exception.code}: ${message}`);

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


