export class ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;

  constructor(code: number, message: string, data?: T) {
    this.code = code;
    this.message = message;
    this.data = data ?? null;
  }

  static success<T>(data: T, message = 'OK'): ApiResponse<T> {
    return new ApiResponse(0, message, data);
  }

  static error(message: string, code = 400): ApiResponse {
    return new ApiResponse(code, message, null);
  }
}
