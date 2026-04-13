<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { X, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-vue-next';
import { subscribeToToasts } from '../utils/toast';

interface Toast {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  duration: number;
}

const toasts = ref<Toast[]>([]);

// 订阅 toast 事件
let unsubscribe: (() => void) | null = null;

onMounted(() => {
  unsubscribe = subscribeToToasts((toast) => {
    toasts.value.push(toast);
    // 自动移除
    setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration);
  });
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

// 移除提示
function removeToast(id: string) {
  const index = toasts.value.findIndex((t) => t.id === id);
  if (index > -1) {
    toasts.value.splice(index, 1);
  }
}

// 获取图标
function getIcon(type: Toast['type']) {
  switch (type) {
    case 'error':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    case 'info':
      return Info;
    case 'success':
      return CheckCircle;
    default:
      return Info;
  }
}

// 获取样式
function getStyles(type: Toast['type']) {
  switch (type) {
    case 'error':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: 'text-red-500',
      };
    case 'warning':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        icon: 'text-yellow-500',
      };
    case 'info':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: 'text-blue-500',
      };
    case 'success':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        icon: 'text-green-500',
      };
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-800',
        icon: 'text-gray-500',
      };
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="error-toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item"
          :class="[getStyles(toast.type).bg, getStyles(toast.type).border, getStyles(toast.type).text]"
        >
          <component :is="getIcon(toast.type)" class="toast-icon" :class="getStyles(toast.type).icon" />
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" @click="removeToast(toast.id)">
            <X :size="16" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.error-toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;
}

.toast-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.toast-message {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
}

.toast-close {
  flex-shrink: 0;
  padding: 4px;
  border-radius: 4px;
  opacity: 0.5;
  transition: opacity 0.2s;
  background: none;
  border: none;
  cursor: pointer;
}

.toast-close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
