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

const props = defineProps<Props>()

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
        @input="e => emit('update:editName', (e.target as HTMLInputElement).value)"
        type="text"
        placeholder="知识库名称"
        class="edit-input"
        @keyup.enter="onSaveEdit"
      />
      <input
        :value="editDescription"
        @input="e => emit('update:editDescription', (e.target as HTMLInputElement).value)"
        type="text"
        placeholder="描述（可选）"
        class="edit-input"
        @keyup.enter="onSaveEdit"
      />
      <div class="edit-actions">
        <button class="icon-btn success" @click="onSaveEdit" title="保存">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button class="icon-btn" @click="onCancelEdit" title="取消">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- 展示模式 -->
    <template v-else>
      <div class="kb-card-header">
        <div class="kb-icon">
          <BookOpen :size="24" />
        </div>
        <div class="kb-meta">
          <h3>{{ kb.name }}</h3>
          <p v-if="kb.description" class="kb-desc">{{ kb.description }}</p>
          <span class="kb-tag">{{ kb.documents?.length || 0 }} Docs</span>
        </div>
      </div>
      <div class="kb-card-actions">
        <label class="upload-btn" @click.stop>
          <Upload :size="16" />
          上传文档
          <input
            type="file"
            accept=".txt,.pdf,.doc,.docx"
            @change="onUpload"
            hidden
          />
        </label>
        <button class="icon-btn" @click="onStartEdit" title="编辑">
          <Pencil :size="16" />
        </button>
        <button class="icon-btn danger" @click="onDelete" title="删除">
          <Trash2 :size="16" />
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.kb-card {
  padding: 24px;
  border-radius: 20px;
  border: 2px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.kb-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary);
}

.kb-card.active {
  background: var(--primary-light);
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(71, 118, 246, 0.2);
}

.kb-card.editing {
  background: var(--bg-surface);
  border-color: var(--primary);
}

.kb-card-header {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.kb-icon {
  font-size: 2rem;
  background: white;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  color: var(--primary);
  flex-shrink: 0;
}

.kb-meta {
  min-width: 0;
  flex: 1;
}

.kb-meta h3 {
  margin: 0 0 4px 0;
  font-size: 1.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kb-desc {
  margin: 4px 0;
  font-size: 13px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.kb-tag {
  font-size: 12px;
  background: #eee;
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--text-muted);
}

.kb-card-actions {
  display: flex;
  gap: 12px;
}

.upload-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: white;
  border: 1px solid var(--border-subtle);
  padding: 10px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
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
