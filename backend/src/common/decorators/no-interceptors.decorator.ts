import { SetMetadata } from '@nestjs/common';

export const NO_INTERCEPTORS_KEY = 'noInterceptors';

/**
 * 跳过全局拦截器装饰器
 * 用于需要原始响应的端点（如 SSE）
 */
export const NoInterceptors = () => SetMetadata(NO_INTERCEPTORS_KEY, true);
