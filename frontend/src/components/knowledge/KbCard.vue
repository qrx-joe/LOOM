<script setup lang="ts">
import { BookOpen, Upload, Pencil, Trash2 } from 'lucide-vue-next'
import type { KnowledgeBase } from '../../composables/useKnowledgeBases'

interface Props {
  kb: KnowledgeBase
  isActive: boolean
  isEditing: boolean
  editName: string
  editDescription: string
}

defineProps<Props>()

const emit = defineEmits<{
  click: []
  startEdit: [event: Event]
  cancelEdit: [event: Event]
  saveEdit: [event: Event]
  delete: [event: Event]
  upload: [event: Event]
  'update:editName': [value: string]
  'update:editDescription': [value: string]
}>()

const onStartEdit = (e: Event) => {
  e.stopPropagation()
  emit('startEdit', e)
}

const onCancelEdit = (e: Event) => {
  e.stopPropagation()
  emit('cancelEdit', e)
}

const onSaveEdit = (e: Event) => {
  e.stopPropagation()
  emit('saveEdit', e)
}

const onDelete = (e: Event) => {
  e.stopPropagation()
  emit('delete', e)
}

const onUpload = (e: Event) => {
  e.stopPropagation()
  emit('upload', e)
}
</script>

<template>
  <div
    class="kb-card"
    :class="{ active: isActive, editing: isEditing }"
    @click="emit('click')"
  >
    <!-- 编辑模式 -->
    <div v-if="isEditing" class="kb-edit-form" @click.stop>
      <input
        :value="editName"
        type="text"
        placeholder="知识库名称"
        class="edit-input"
        @input="e => emit('update:editName', (e.target as HTMLInputElement).value)"
        @keyup.enter="onSaveEdit"
      />
      <input
        :value="editDescription"
        type="text"
        placeholder="描述（可选）"
        class="edit-input"
        @input="e => emit('update:editDescription', (e.target as HTMLInputElement).value)"
        @keyup.enter="onSaveEdit"
      />
      <div class="edit-actions">
        <button class="icon-btn success" title="保存" @click="onSaveEdit">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button class="icon-btn" title="取消" @click="onCancelEdit">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- 展示模式 -->
    <template v-else>
      <div class="kb-card-header">
        <div class="kb-icon">
          <BookOpen :size="20" />
        </div>
        <div class="kb-card-actions">
          <button class="action-btn" title="编辑" @click="onStartEdit">
            <Pencil :size="16" />
          </button>
          <button class="action-btn delete" title="删除" @click="onDelete">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
      <div class="kb-card-body">
        <h3 class="card-title">{{ kb.name }}</h3>
        <p v-if="kb.description" class="kb-desc">{{ kb.description }}</p>
        <div class="kb-stats">
          <span>{{ kb.documents?.length || 0 }} 个文档</span>
        </div>
      </div>
      <div class="kb-card-footer">
        <label class="upload-btn" @click.stop>
          <Upload :size="14" />
          上传文档
          <input
            type="file"
            accept=".txt,.md,.pdf,.doc,.docx"
            hidden
            @change="onUpload"
          />
        </label>
      </div>
    </template>
  </div>
</template>

<style scoped>
.kb-card {
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--bg-surface);
}

.kb-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.kb-card.active {
  background: var(--primary-light);
  border-color: var(--primary);
}

.kb-card.editing {
  background: var(--bg-surface);
  border-color: var(--primary);
}

.kb-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.kb-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  flex-shrink: 0;
}

.kb-card.active .kb-icon {
  background: var(--primary);
  color: white;
}

.kb-meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kb-meta h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kb-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.kb-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.kb-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
  word-break: break-word;
}

.kb-card-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.kb-card:hover .kb-card-actions {
  opacity: 1;
}

.action-btn {
  padding: 6px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-main);
}

.action-btn.delete:hover {
  color: var(--error);
}

.kb-card-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.upload-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-hover);
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.upload-btn:hover {
  background: var(--primary);
  color: white;
}

.kb-card.active .upload-btn {
  background: var(--primary);
  color: white;
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

.icon-btn.danger {
  color: #ef4444;
}

.icon-btn.success {
  color: #10b981;
}

.icon-btn.success:hover {
  background: #d1fae5;
}

.kb-edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  font-size: 14px;
  background: white;
  box-sizing: border-box;
}

.edit-input:focus {
  outline: none;
  border-color: var(--primary);
}

.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
