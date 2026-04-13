import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/api';

// 后端统一响应格式
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  path: string;
}

// 错误类型
export enum ErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  SERVER = 'SERVER',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN',
}

// 应用错误
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 获取错误类型
function getErrorType(statusCode: number): ErrorType {
  switch (statusCode) {
    case 400:
      return ErrorType.VALIDATION;
    case 401:
      return ErrorType.UNAUTHORIZED;
    case 403:
      return ErrorType.FORBIDDEN;
    case 404:
      return ErrorType.NOT_FOUND;
    case 408:
    case 504:
      return ErrorType.TIMEOUT;
    case 429:
      return ErrorType.RATE_LIMIT;
    case 500:
    case 502:
    case 503:
      return ErrorType.SERVER;
    default:
      return ErrorType.UNKNOWN;
  }
}

// 获取用户友好的错误消息
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    const messages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: '网络连接失败，请检查网络设置',
      [ErrorType.TIMEOUT]: '请求超时，请稍后重试',
      [ErrorType.SERVER]: '服务器繁忙，请稍后重试',
      [ErrorType.VALIDATION]: '输入数据有误，请检查后再试',
      [ErrorType.NOT_FOUND]: '请求的资源不存在',
      [ErrorType.UNAUTHORIZED]: '请先登录',
      [ErrorType.FORBIDDEN]: '没有权限执行此操作',
      [ErrorType.RATE_LIMIT]: '请求过于频繁，请稍后再试',
      [ErrorType.UNKNOWN]: '发生未知错误，请稍后重试',
    };
    return messages[error.type] || error.message;
  }

  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED') {
      return '请求超时，请稍后重试';
    }
    if (error.code === 'NETWORK_ERROR' || !error.response) {
      return '网络连接失败，请检查网络设置';
    }

    const response = error.response.data as ApiResponse<unknown>;
    return response?.error || response?.message || '请求失败';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '发生未知错误';
}

// 重试配置
interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

const defaultRetryConfig: RetryConfig = {
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error: AxiosError) => {
    // 只在网络错误或 5xx 错误时重试
    return (
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600) ||
      error.code === 'ECONNABORTED'
    );
  },
};

// 带重试的 axios 请求
export async function requestWithRetry<T>(
  config: AxiosRequestConfig,
  retryConfig: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...defaultRetryConfig, ...retryConfig };
  let lastError: AxiosError | null = null;

  for (let attempt = 0; attempt <= finalConfig.retries; attempt++) {
    try {
      const response = await axios(config);
      const data = response.data as ApiResponse<T>;

      // 检查业务错误
      if (!data.success) {
        throw new AppError(
          ErrorType.SERVER,
          data.error || '请求失败',
          response.status,
          data
        );
      }

      return data.data as T;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      lastError = error as AxiosError;

      // 不需要重试的错误
      if (
        lastError.response &&
        (lastError.response.status === 400 ||
          lastError.response.status === 401 ||
          lastError.response.status === 403 ||
          lastError.response.status === 404)
      ) {
        break;
      }

      // 最后一次尝试失败
      if (attempt === finalConfig.retries) {
        break;
      }

      // 检查是否满足重试条件
      if (finalConfig.retryCondition && !finalConfig.retryCondition(lastError)) {
        break;
      }

      // 等待后重试
      await new Promise((resolve) =>
        setTimeout(resolve, finalConfig.retryDelay * Math.pow(2, attempt))
      );
    }
  }

  // 抛出最终错误
  if (lastError) {
    if (lastError.response) {
      const data = lastError.response.data as ApiResponse<unknown>;
      throw new AppError(
        getErrorType(lastError.response.status),
        data?.error || lastError.message,
        lastError.response.status,
        lastError
      );
    } else {
      throw new AppError(
        lastError.code === 'ECONNABORTED' ? ErrorType.TIMEOUT : ErrorType.NETWORK,
        lastError.message,
        undefined,
        lastError
      );
    }
  }

  throw new AppError(ErrorType.UNKNOWN, '未知错误');
}

// 创建带错误处理的 axios 实例
export function createApiClient() {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 响应拦截器
  client.interceptors.response.use(
    (response) => {
      // 如果响应已经是统一格式，返回 data
      const data = response.data;
      if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) {
          return Promise.reject(
            new AppError(
              ErrorType.SERVER,
              data.error || '请求失败',
              response.status,
              data
            )
          );
        }
        return data.data;
      }
      return response.data;
    },
    (error: AxiosError) => {
      const appError = handleAxiosError(error);
      return Promise.reject(appError);
    }
  );

  return client;
}

// 处理 Axios 错误
function handleAxiosError(error: AxiosError): AppError {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data as ApiResponse<unknown>;

    return new AppError(
      getErrorType(status),
      data?.error || data?.message || error.message,
      status,
      error
    );
  }

  if (error.code === 'ECONNABORTED') {
    return new AppError(ErrorType.TIMEOUT, '请求超时', undefined, error);
  }

  return new AppError(ErrorType.NETWORK, '网络错误', undefined, error);
}

// 全局错误处理器
export function setupGlobalErrorHandler() {
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection:', event.reason);
  });
}
