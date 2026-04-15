<script setup lang="ts">
import { ref, computed } from 'vue'
import { FileText, FolderOpen, Trash2, Loader2, CheckCircle, AlertCircle, Eye, Square, CheckSquare, X } from 'lucide-vue-next'
import type { Document, ProcessingStatus } from '../../composables/useKnowledgeBases'

interface Props {
  documents: Document[]
  documentStatuses: Map<string, { status: ProcessingStatus; progress: number; error?: string }>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  delete: [docId: string]
  deleteBatch: [docIds: string[]]
  preview: [doc: Document]
}>()

// 选中的文档ID
const selectedIds = ref<Set<string>>(new Set())

// 是否处于批量选择模式
const isBatchMode = ref(false)

// 计算属性
const completedDocs = computed(() => {
  return props.documents.filter(doc => doc.processingStatus === 'completed')
})

const isAllSelected = computed(() => {
  if (completedDocs.value.length === 0) return false
  return completedDocs.value.every(doc => selectedIds.value.has(doc.id))
})

const selectedCount = computed(() => selectedIds.value.size)

// 获取文档状态
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

// 切换选择模式
const toggleBatchMode = () => {
  isBatchMode.value = !isBatchMode.value
  if (!isBatchMode.value) {
    selectedIds.value.clear()
  }
}

// 切换单个文档选择
const toggleSelect = (docId: string) => {
  if (selectedIds.value.has(docId)) {
    selectedIds.value.delete(docId)
  } else {
    selectedIds.value.add(docId)
  }
}

// 全选/取消全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value.clear()
  } else {
    completedDocs.value.forEach(doc => selectedIds.value.add(doc.id))
  }
}

// 批量删除
const handleBatchDelete = () => {
  if (selectedCount.value === 0) return
  if (!confirm(`确定要删除选中的 ${selectedCount.value} 个文档吗？`)) return

  const ids = Array.from(selectedIds.value)
  emit('deleteBatch', ids)
  selectedIds.value.clear()
  isBatchMode.value = false
}

// 取消批量模式
const cancelBatchMode = () => {
  selectedIds.value.clear()
  isBatchMode.value = false
}
</script>

<template>
  <div class="doc-list">
    <!-- 批量操作工具栏 -->
    <div v-if="documents.length > 0" class="batch-toolbar">
      <template v-if="isBatchMode">
        <div class="batch-info">
          <button class="checkbox-btn" @click="toggleSelectAll">
            <CheckSquare v-if="isAllSelected" :size="18" class="checked" />
            <Square v-else :size="18" />
          </button>
          <span class="batch-count">已选 {{ selectedCount }} 个</span>
        </div>
        <div class="batch-actions">
          <button
            v-if="selectedCount > 0"
            class="batch-delete-btn"
            @click="handleBatchDelete"
          >
            <Trash2 :size="16" />
            删除选中
          </button>
          <button class="batch-cancel-btn" @click="cancelBatchMode">
            <X :size="16" />
            取消
          </button>
        </div>
      </template>
      <template v-else>
        <button class="batch-mode-btn" @click="toggleBatchMode">
          <Square :size="16" />
          批量选择
        </button>
      </template>
    </div>

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
      :class="{ selected: selectedIds.has(doc.id), 'batch-mode': isBatchMode }"
    >
      <!-- 复选框（批量模式显示） -->
      <button
        v-if="isBatchMode"
        class="checkbox-btn"
        :disabled="doc.processingStatus !== 'completed'"
        @click.stop="toggleSelect(doc.id)"
      >
        <CheckSquare v-if="selectedIds.has(doc.id)" :size="18" class="checked" />
        <Square v-else :size="18" />
      </button>

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

        <!-- 预览按钮 -->
        <button
          v-if="!isBatchMode"
          class="icon-btn small"
          @click.stop="emit('preview', doc)"
          title="预览"
          :disabled="doc.processingStatus !== 'completed'"
        >
          <Eye :size="14" />
        </button>

        <!-- 删除按钮 -->
        <button
          v-if="!isBatchMode"
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

/* 批量操作工具栏 */
.batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  margin-bottom: 8px;
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-count {
  font-size: 14px;
  color: var(--text-main);
  font-weight: 500;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.batch-mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: white;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-mode-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.batch-delete-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: #ef4444;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.batch-delete-btn:hover {
  opacity: 0.9;
}

.batch-cancel-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: white;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-cancel-btn:hover {
  background: var(--bg-surface);
}

/* 复选框按钮 */
.checkbox-btn {
  background: transparent;
  border: none;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all 0.2s;
}

.checkbox-btn:hover:not(:disabled) {
  color: var(--primary);
}

.checkbox-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.checkbox-btn .checked {
  color: var(--primary);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px;
  color: var(--text-muted);
}

.empty-icon {
  margin-bottom: 16px;
  color: var(--text-disabled);
}

/* 文档行 */
.doc-row {
  display: flex;
  align-items: center;
  gap: 12px;
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

.doc-row.selected {
  background: var(--primary-light);
  border-color: var(--primary);
}

.doc-row.batch-mode {
  padding-left: 16px;
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

.icon-btn:hover:not(:disabled) {
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

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
