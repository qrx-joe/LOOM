import { getErrorMessage } from './error-handler';

// Toast 事件总线
const listeners = new Set<(toast: Toast) => void>();

interface Toast {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  duration: number;
}

let toastId = 0;

// 内部添加 toast 方法
function addToast(type: Toast['type'], message: string, duration: number) {
  const id = `toast-${++toastId}`;
  const toast: Toast = { id, type, message, duration };
  listeners.forEach((listener) => listener(toast));
}

// 添加错误提示
export function showError(error: any, duration = 5000) {
  const message = getErrorMessage(error);
  addToast('error', message, duration);
}

// 添加警告提示
export function showWarning(message: string, duration = 4000) {
  addToast('warning', message, duration);
}

// 添加信息提示
export function showInfo(message: string, duration = 3000) {
  addToast('info', message, duration);
}

// 添加成功提示
export function showSuccess(message: string, duration = 3000) {
  addToast('success', message, duration);
}

// 订阅 toast 事件
export function subscribeToToasts(callback: (toast: Toast) => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
