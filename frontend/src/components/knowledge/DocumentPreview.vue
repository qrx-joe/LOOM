<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, FileText, Loader2, AlertCircle } from 'lucide-vue-next'
import { api } from '../../utils/api-client'
import { getDocumentContentUrl } from '../../config/api'

interface Props {
  docId: string | null
  docName: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

// 状态
const content = ref('')
const metadata = ref<{
  pageCount?: number
  wordCount?: number
  format?: string
}>({})
const chunkCount = ref(0)
const isLoading = ref(false)
const error = ref<string | null>(null)

// 获取文档内容
const fetchContent = async () => {
  if (!props.docId) return

  isLoading.value = true
  error.value = null
  content.value = ''

  try {
    const data = await api.get<{
      id: string
      name: string
      content: string
      metadata: {
        pageCount?: number
        wordCount?: number
        format?: string
      }
      chunkCount: number
    }>(getDocumentContentUrl(props.docId))

    content.value = data.content
    metadata.value = data.metadata
    chunkCount.value = data.chunkCount
  } catch (err: any) {
    error.value = err.message || '获取文档内容失败'
  } finally {
    isLoading.value = false
  }
}

// 监听 docId 变化
watch(() => props.docId, (newId) => {
  if (newId) {
    fetchContent()
  }
}, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="docId" class="preview-overlay" @click="emit('close')">
        <Transition name="slide">
          <div v-if="docId" class="preview-panel" @click.stop>
            <!-- 头部 -->
            <header class="preview-header">
              <div class="preview-title">
                <FileText :size="20" class="preview-icon" />
                <h3>{{ docName }}</h3>
              </div>
              <button class="close-btn" title="关闭" @click="emit('close')">
                <X :size="20" />
              </button>
            </header>

            <!-- 元数据 -->
            <div v-if="!isLoading && !error" class="preview-meta">
              <span v-if="metadata.format" class="meta-tag">{{ metadata.format }}</span>
              <span v-if="metadata.pageCount" class="meta-tag">{{ metadata.pageCount }} 页</span>
              <span v-if="metadata.wordCount" class="meta-tag">{{ metadata.wordCount }} 字</span>
              <span class="meta-tag">{{ chunkCount }} 个片段</span>
            </div>

            <!-- 内容区域 -->
            <div class="preview-content">
              <!-- 加载中 -->
              <div v-if="isLoading" class="loading-state">
                <Loader2 :size="32" class="spin" />
                <p>正在加载文档内容...</p>
              </div>

              <!-- 错误状态 -->
              <div v-else-if="error" class="error-state">
                <AlertCircle :size="32" class="error-icon" />
                <p>{{ error }}</p>
                <button class="retry-btn" @click="fetchContent">重试</button>
              </div>

              <!-- 内容展示 -->
              <div v-else-if="content" class="content-text">
                <pre>{{ content }}</pre>
              </div>

              <!-- 空内容 -->
              <div v-else class="empty-state">
                <p>文档暂无内容</p>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: flex-end;
  z-index: 1000;
}

.preview-panel {
  width: 600px;
  max-width: 90vw;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-subtle);
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.preview-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.close-btn {
  background: transparent;
  border: none;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all 0.2s;
  flex-shrink: 0;
}

.close-btn:hover {
  background: #f3f4f6;
  color: var(--text-main);
}

.preview-meta {
  display: flex;
  gap: 8px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-surface);
}

.meta-tag {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  background: white;
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
}

.preview-content {
  flex: 1;
  overflow: auto;
  padding: 24px;
}

.content-text {
  background: var(--bg-surface);
  border-radius: 12px;
  padding: 20px;
}

.content-text pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-main);
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  gap: 16px;
}

.error-icon {
  color: #ef4444;
}

.retry-btn {
  padding: 8px 20px;
  border-radius: 8px;
  background: var(--primary);
  color: white;
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: opacity 0.2s;
}

.retry-btn:hover {
  opacity: 0.9;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
