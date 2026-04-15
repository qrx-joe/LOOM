<script setup lang="ts">
import { FileText, FolderOpen, Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-vue-next'
import type { Document, ProcessingStatus } from '../../composables/useKnowledgeBases'

interface Props {
  documents: Document[]
  documentStatuses: Map<string, { status: ProcessingStatus; progress: number; error?: string }>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  delete: [docId: string]
}>()

const getDocStatus = (doc: Document) => {
  const tracked = props.documentStatuses.get(doc.id)
  return tracked || { status: doc.processingStatus || 'completed', progress: 100 }
}

const getStatusText = (status: ProcessingStatus): string => {
  const map: Record<ProcessingStatus, string> = {
    pending: '等待处理',
    parsing: '解析文档',
    chunking: '文本分片',
    embedding: '生成向量',
    completed: '已完成',
    failed: '处理失败',
  }
  return map[status] || status
}

const getStatusColor = (status: ProcessingStatus): string => {
  const map: Record<ProcessingStatus, string> = {
    pending: '#6b7280',
    parsing: '#3b82f6',
    chunking: '#8b5cf6',
    embedding: '#f59e0b',
    completed: '#10b981',
    failed: '#ef4444',
  }
  return map[status] || '#6b7280'
}
</script>

<template>
  <div class="doc-list">
    <!-- 空状态 -->
    <div v-if="!documents || documents.length === 0" class="empty-state">
      <div class="empty-icon">
        <FolderOpen :size="48" />
      </div>
      <p>暂无文档，支持 PDF、Word 和纯文本格式。</p>
    </div>

    <!-- 文档列表 -->
    <div
      v-for="doc in documents"
      :key="doc.id"
      class="doc-row"
    >
      <div class="doc-info">
        <FileText :size="18" class="doc-icon" />
        <div class="doc-texts">
          <span class="doc-name">{{ doc.name }}</span>
          <span class="doc-date">{{ new Date(doc.createdAt).toLocaleDateString() }}</span>
        </div>
      </div>

      <div class="doc-actions">
        <!-- 状态标签 -->
        <div
          class="doc-status-tag"
          :class="{ processing: getDocStatus(doc).status !== 'completed' && getDocStatus(doc).status !== 'failed' }"
          :style="{ borderColor: getStatusColor(getDocStatus(doc).status), color: getStatusColor(getDocStatus(doc).status) }"
        >
          <Loader2
            v-if="getDocStatus(doc).status !== 'completed' && getDocStatus(doc).status !== 'failed'"
            :size="12"
            class="spin"
          />
          <CheckCircle v-else-if="getDocStatus(doc).status === 'completed'" :size="12" />
          <AlertCircle v-else :size="12" />
          {{ getStatusText(getDocStatus(doc).status) }}
        </div>

        <!-- 进度条 -->
        <div
          v-if="getDocStatus(doc).status !== 'completed' && getDocStatus(doc).status !== 'failed'"
          class="progress-bar"
        >
          <div class="progress-fill" :style="{ width: `${getDocStatus(doc).progress}%` }"></div>
        </div>

        <!-- 删除按钮 -->
        <button
          class="icon-btn danger small"
          @click.stop="emit('delete', doc.id)"
          title="删除"
        >
          <Trash2 :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.doc-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: var(--text-muted);
}

.empty-icon {
  margin-bottom: 16px;
  color: var(--text-disabled);
}

.doc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  transition: all 0.2s;
}

.doc-row:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.doc-info {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  flex: 1;
}

.doc-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.doc-texts {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.doc-name {
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-date {
  font-size: 12px;
  color: var(--text-muted);
}

.doc-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.doc-status-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid;
  white-space: nowrap;
}

.doc-status-tag.processing {
  background: #fef3c7;
}

.progress-bar {
  width: 80px;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s ease;
}

.icon-btn {
  background: transparent;
  border: none;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: var(--text-muted);
}

.icon-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}

.icon-btn.small {
  padding: 6px;
  border-radius: 6px;
}

.icon-btn.danger {
  color: #ef4444;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
