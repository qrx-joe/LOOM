import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  path: string;
}

/**
 * 全局响应拦截器
 * 统一所有 API 响应格式
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
        path,
      })),
      catchError((error) => {
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';

        if (error instanceof HttpException) {
          status = error.getStatus();
          const response = error.getResponse();
          message = typeof response === 'string' ? response : (response as any).message || JSON.stringify(response);
        } else if (error instanceof Error) {
          message = error.message;
        }

        const errorResponse: ApiResponse<null> = {
          success: false,
          error: message,
          timestamp: new Date().toISOString(),
          path,
        };

        return throwError(() => new HttpException(errorResponse, status));
      }),
    );
  }
}
