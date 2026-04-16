import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponse {
  success: boolean;
  error: string;
  message?: string;
  timestamp: string;
  path: string;
  statusCode: number;
}

/**
 * 全局 HTTP 异常过滤器
 * 统一处理所有 HTTP 异常，返回标准格式的错误响应
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // 获取异常响应
    const exceptionResponse = exception.getResponse();
    let errorMessage: string;
    let errorData: any = null;

    if (typeof exceptionResponse === 'string') {
      errorMessage = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      const responseObj = exceptionResponse as any;
      // 如果是我们统一格式的响应
      if (responseObj.success === false && responseObj.error) {
        errorMessage = responseObj.error;
        errorData = responseObj.data;
      } else {
        errorMessage = responseObj.message || JSON.stringify(responseObj);
      }
    } else {
      errorMessage = 'Unknown error';
    }

    // 记录错误日志
    this.logger.error(
      `[${request.method}] ${request.url} - ${status}: ${errorMessage}`,
      exception.stack,
    );

    const errorResponse: ErrorResponse = {
      success: false,
      error: errorMessage,
      message: this.getErrorMessage(status),
      timestamp: new Date().toISOString(),
      path: request.url,
      statusCode: status,
    };

    // 开发环境添加更多调试信息
    if (process.env.NODE_ENV !== 'production') {
      (errorResponse as any).stack = exception.stack;
      if (errorData) {
        (errorResponse as any).details = errorData;
      }
    }

    response.status(status).json(errorResponse);
  }

  /**
   * 根据状态码获取友好错误信息
   */
  private getErrorMessage(status: number): string {
    const messages: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: '请求参数错误',
      [HttpStatus.UNAUTHORIZED]: '未授权，请先登录',
      [HttpStatus.FORBIDDEN]: '禁止访问',
      [HttpStatus.NOT_FOUND]: '资源不存在',
      [HttpStatus.CONFLICT]: '资源冲突',
      [HttpStatus.UNPROCESSABLE_ENTITY]: '请求数据验证失败',
      [HttpStatus.TOO_MANY_REQUESTS]: '请求过于频繁，请稍后重试',
      [HttpStatus.INTERNAL_SERVER_ERROR]: '服务器内部错误',
      [HttpStatus.BAD_GATEWAY]: '网关错误',
      [HttpStatus.SERVICE_UNAVAILABLE]: '服务暂时不可用',
      [HttpStatus.GATEWAY_TIMEOUT]: '请求超时',
    };

    return messages[status] || '发生错误';
  }
}

/**
 * 捕获所有未被处理的异常
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : JSON.stringify(exceptionResponse);
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
    }

    // 记录详细错误
    this.logger.error(
      `[${request.method}] ${request.url} - Unhandled Exception: ${message}`,
      stack,
    );

    const errorResponse: ErrorResponse = {
      success: false,
      error: message,
      message: '服务器发生错误，请稍后重试',
      timestamp: new Date().toISOString(),
      path: request.url,
      statusCode: status,
    };

    // 开发环境添加堆栈信息
    if (process.env.NODE_ENV !== 'production' && stack) {
      (errorResponse as any).stack = stack;
    }

    response.status(status).json(errorResponse);
  }
}
