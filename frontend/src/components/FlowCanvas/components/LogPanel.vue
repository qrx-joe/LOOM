<script setup lang="ts">
import { computed } from 'vue'
import { AlertCircle, PlayCircle, CheckCircle, XCircle } from 'lucide-vue-next'

const props = defineProps<{
  logs: any[]
  isRunning: boolean
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// 过滤系统日志，只显示关键节点事件
const displayLogs = computed(() => {
  return props.logs.filter(log => {
    // 过滤掉过多的 workflow 状态事件
    if (log.nodeId === 'workflow' && log.type === 'workflow_complete') {
      return true
    }
    return log.nodeId !== 'workflow'
  })
})

// 格式化时间
const formatTime = (timestamp: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 格式化日志消息
const formatMessage = (log: any) => {
  switch (log.type) {
    case 'node_start':
      return `开始执行: ${log.nodeId}`
    case 'node_complete':
      return `执行完成: ${log.nodeId}`
    case 'node_error':
      return `执行错误: ${log.nodeId} - ${log.data?.error || ''}`
    default:
      return log.data?.message || JSON.stringify(log.data)
  }
}

// 获取日志图标
const getLogIcon = (log: any) => {
  switch (log.type) {
    case 'node_start':
      return PlayCircle
    case 'node_complete':
      return CheckCircle
    case 'node_error':
      return XCircle
    default:
      return AlertCircle
  }
}

// 获取日志样式类
const getLogClass = (log: any) => {
  switch (log.type) {
    case 'node_complete':
      return 'log-success'
    case 'node_error':
      return 'log-error'
    default:
      return 'log-info'
  }
}
</script>

<template>
  <div v-if="show" class="log-panel">
    <div class="log-header">
      <h4>
        <AlertCircle :size="16" />
        执行日志
        <span v-if="isRunning" class="running-indicator">
          <span class="pulse"></span>
          运行中
        </span>
      </h4>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>

    <div class="log-content">
      <div v-if="displayLogs.length === 0" class="empty-logs">
        <p>暂无日志</p>
        <span v-if="isRunning">等待执行结果...</span>
      </div>

      <div v-else class="log-list">
        <div
          v-for="(log, index) in displayLogs"
          :key="index"
          class="log-item"
          :class="getLogClass(log)"
        >
          <component :is="getLogIcon(log)" :size="14" class="log-icon" />
          <div class="log-body">
            <div class="log-meta">
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              <span class="log-node">{{ log.nodeId || 'system' }}</span>
            </div>
            <div class="log-message">{{ formatMessage(log) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.log-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 300px;
  height: 200px;
  background: #1f2937;
  border-top: 1px solid #374151;
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #111827;
  border-bottom: 1px solid #374151;
}

.log-header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #e5e7eb;
  display: flex;
  align-items: center;
  gap: 8px;
}

.running-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #10b981;
  margin-left: 8px;
}

.pulse {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.1);
  }
}

.close-btn {
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
}

.close-btn:hover {
  color: #e5e7eb;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.empty-logs {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
  font-size: 13px;
}

.empty-logs span {
  font-size: 11px;
  margin-top: 4px;
  color: #4b5563;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  background: #111827;
  border-radius: 6px;
  font-size: 12px;
  border-left: 3px solid #6b7280;
}

.log-item.log-success {
  border-left-color: #10b981;
}

.log-item.log-error {
  border-left-color: #ef4444;
}

.log-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.log-success .log-icon {
  color: #10b981;
}

.log-error .log-icon {
  color: #ef4444;
}

.log-info .log-icon {
  color: #6b7280;
}

.log-body {
  flex: 1;
  min-width: 0;
}

.log-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
}

.log-time {
  color: #9ca3af;
  font-size: 11px;
  font-family: monospace;
}

.log-node {
  color: #60a5fa;
  font-size: 11px;
  font-weight: 500;
}

.log-message {
  color: #e5e7eb;
  word-break: break-all;
}
</style>
