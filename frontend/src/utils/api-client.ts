import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from 'axios';
import { API_BASE_URL } from '../config/api';
import { AppError, ErrorType, type ErrorTypeValue, getErrorMessage } from './error-handler';

// API 客户端配置
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求队列（用于取消重复请求）
const pendingRequests = new Map<string, AbortController>();

// 生成请求 key
function getRequestKey(config: AxiosRequestConfig): string {
  return `${config.method}_${config.url}_${JSON.stringify(config.params)}_${JSON.stringify(config.data)}`;
}

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 取消重复请求
    const requestKey = getRequestKey(config);
    if (pendingRequests.has(requestKey)) {
      pendingRequests.get(requestKey)?.abort();
    }

    const controller = new AbortController();
    config.signal = controller.signal;
    pendingRequests.set(requestKey, controller);

    // 开发环境打印请求日志
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    // 移除已完成的请求
    const requestKey = getRequestKey(response.config);
    pendingRequests.delete(requestKey);

    // 开发环境打印响应日志
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }

    // 处理后端统一响应格式 { success: true, data: ... }
    const data = response.data;
    if (data && typeof data === 'object') {
      if ('success' in data) {
        if (!data.success) {
          throw new AppError(
            ErrorType.SERVER,
            data.error || data.message || '请求失败',
            response.status,
            data
          );
        }
        return data.data;
      }
    }

    return data;
  },
  (error: AxiosError) => {
    // 移除失败的请求
    if (error.config) {
      const requestKey = getRequestKey(error.config);
      pendingRequests.delete(requestKey);
    }

    // 处理取消请求
    if (axios.isCancel(error)) {
      return Promise.reject(new AppError(ErrorType.UNKNOWN, '请求已取消'));
    }

    // 处理超时
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new AppError(ErrorType.TIMEOUT, '请求超时，请稍后重试'));
    }

    // 处理网络错误
    if (!error.response) {
      return Promise.reject(new AppError(ErrorType.NETWORK, '网络连接失败，请检查网络设置'));
    }

    const status = error.response.status;
    const responseData = error.response.data as any;

    // 根据状态码处理
    let errorType: ErrorTypeValue = ErrorType.UNKNOWN;
    switch (status) {
      case 400:
        errorType = ErrorType.VALIDATION;
        break;
      case 401:
        errorType = ErrorType.UNAUTHORIZED;
        break;
      case 403:
        errorType = ErrorType.FORBIDDEN;
        break;
      case 404:
        errorType = ErrorType.NOT_FOUND;
        break;
      case 429:
        errorType = ErrorType.RATE_LIMIT;
        break;
      case 500:
      case 502:
      case 503:
        errorType = ErrorType.SERVER;
        break;
    }

    const message = responseData?.error || responseData?.message || getErrorMessage(error);
    return Promise.reject(new AppError(errorType, message, status, error));
  }
);

// 取消所有请求
export function cancelAllRequests(): void {
  pendingRequests.forEach((controller) => {
    controller.abort();
  });
  pendingRequests.clear();
}

// 导出带类型的请求方法
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T, T>(url, config),

  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.post<T, T>(url, data, config),

  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.put<T, T>(url, data, config),

  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.patch<T, T>(url, data, config),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T, T>(url, config),

  // 流式请求（用于 SSE）
  stream: (url: string) => {
    return new EventSource(`${API_BASE_URL}${url}`);
  },
};

export default apiClient;
