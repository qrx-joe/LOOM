<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import { useKnowledgeBases, type KnowledgeBase, type ProcessingStatus, type Document } from '../composables/useKnowledgeBases'
import KbCard from './knowledge/KbCard.vue'
import DocumentList from './knowledge/DocumentList.vue'
import SearchInput from './knowledge/SearchInput.vue'
import DocumentPreview from './knowledge/DocumentPreview.vue'

// 使用组合式函数
const {
  kbs,
  isLoading,
  searchQuery,
  filteredKbs,
  fetchKbs,
  createKb,
  updateKb,
  deleteKb,
  uploadDocument,
  deleteDocument,
  getDocumentStatus,
} = useKnowledgeBases()

// 本地状态
const selectedKb = ref<KnowledgeBase | null>(null)
const newKbName = ref('')
const documentStatuses = ref<Map<string, { status: ProcessingStatus; progress: number; error?: string }>>(new Map())
let statusPollingInterval: ReturnType<typeof setInterval> | null = null

// 编辑状态
const editingKbId = ref<string | null>(null)
const editKbName = ref('')
const editKbDescription = ref('')

// 预览状态
const previewDoc = ref<Document | null>(null)

// 选择知识库
const selectKb = (kb: KnowledgeBase) => {
  if (editingKbId.value === kb.id) return
  selectedKb.value = kb
}

// 创建知识库
const handleCreateKb = async () => {
  if (!newKbName.value.trim()) return
  try {
    await createKb(newKbName.value)
    newKbName.value = ''
  } catch (err: any) {
    alert(err.message)
  }
}

// 上传文档
const handleUpload = async (kbId: string, event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const newDoc = await uploadDocument(kbId, file)
    documentStatuses.value.set(newDoc.id, { status: 'pending', progress: 0 })
    startStatusPolling()
  } catch (err: any) {
    alert(err.message)
  } finally {
    input.value = ''
  }
}

// 删除知识库
const handleDeleteKb = async (kbId: string) => {
  if (!confirm('确定要删除这个知识库吗？删除后无法恢复。')) return
  try {
    await deleteKb(kbId)
    if (selectedKb.value?.id === kbId) {
      selectedKb.value = null
    }
  } catch (err: any) {
    alert(err.message)
  }
}

// 开始编辑
const startEditKb = (kb: KnowledgeBase) => {
  editingKbId.value = kb.id
  editKbName.value = kb.name
  editKbDescription.value = kb.description || ''
}

// 取消编辑
const cancelEditKb = () => {
  editingKbId.value = null
  editKbName.value = ''
  editKbDescription.value = ''
}

// 保存编辑
const saveEditKb = async (kbId: string) => {
  if (!editKbName.value.trim()) {
    alert('知识库名称不能为空')
    return
  }
  try {
    await updateKb(kbId, editKbName.value, editKbDescription.value)
    editingKbId.value = null
    editKbName.value = ''
    editKbDescription.value = ''
  } catch (err: any) {
    alert(err.message)
  }
}

// 删除文档
const handleDeleteDoc = async (docId: string) => {
  if (!confirm('确定要删除这个文档吗？')) return
  try {
    await deleteDocument(docId)
    documentStatuses.value.delete(docId)
  } catch (err: any) {
    alert(err.message)
  }
}

// 打开预览
const openPreview = (doc: Document) => {
  previewDoc.value = doc
}

// 关闭预览
const closePreview = () => {
  previewDoc.value = null
}

// 状态轮询
const startStatusPolling = () => {
  if (!statusPollingInterval) {
    statusPollingInterval = setInterval(pollDocumentStatuses, 2000)
  }
}

const pollDocumentStatuses = async () => {
  const pendingDocs = Array.from(documentStatuses.value.entries())
    .filter(([_, data]) => data.status !== 'completed' && data.status !== 'failed')

  if (pendingDocs.length === 0) {
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval)
      statusPollingInterval = null
    }
    return
  }

  for (const [docId, _] of pendingDocs) {
    try {
      const result = await getDocumentStatus(docId)
      documentStatuses.value.set(docId, {
        status: result.status,
        progress: result.progress,
        error: result.errorMessage,
      })
      if (result.status === 'completed' || result.status === 'failed') {
        await fetchKbs()
      }
    } catch (err) {
      console.error(`Failed to poll status for doc ${docId}`, err)
    }
  }
}

// 监听选中知识库变化，更新引用
watch(kbs, () => {
  if (selectedKb.value) {
    const updated = kbs.value.find(kb => kb.id === selectedKb.value!.id)
    selectedKb.value = updated || null
  }
  // 初始化文档状态
  for (const kb of kbs.value) {
    for (const doc of kb.documents || []) {
      if (doc.processingStatus && doc.processingStatus !== 'completed') {
        documentStatuses.value.set(doc.id, {
          status: doc.processingStatus,
          progress: doc.progress || 0,
        })
      }
    }
  }
}, { immediate: true })

onMounted(() => {
  fetchKbs()
})

onUnmounted(() => {
  if (statusPollingInterval) {
    clearInterval(statusPollingInterval)
  }
})
</script>

<template>
  <div class="kb-container">
    <header class="kb-header">
      <div class="header-main">
        <h1>知识库中心</h1>
        <p class="subtitle">管理您的 AI 知识资产，支持 PDF、Word 和纯文本文档。</p>
      </div>
      <div class="header-actions">
        <SearchInput v-model="searchQuery" />
        <div class="add-kb-wrapper">
          <input
            v-model="newKbName"
            placeholder="起个好记的名字..."
            @keyup.enter="handleCreateKb"
          />
          <button class="primary-btn" @click="handleCreateKb" :disabled="isLoading">
            <Plus :size="20" />
            创建知识库
          </button>
        </div>
      </div>
    </header>

    <div class="kb-main">
      <!-- 知识库卡片网格 -->
      <div class="kb-grid">
        <KbCard
          v-for="kb in filteredKbs"
          :key="kb.id"
          :kb="kb"
          :is-active="selectedKb?.id === kb.id"
          :is-editing="editingKbId === kb.id"
          v-model:edit-name="editKbName"
          v-model:edit-description="editKbDescription"
          @click="selectKb(kb)"
          @start-edit="startEditKb(kb)"
          @cancel-edit="cancelEditKb"
          @save-edit="saveEditKb(kb.id)"
          @delete="handleDeleteKb(kb.id)"
          @upload="handleUpload(kb.id, $event)"
        />
      </div>

      <!-- 文档详情面板 -->
      <div v-if="selectedKb" class="kb-detail-panel">
        <header class="detail-header">
          <h2>文档详情 - {{ selectedKb.name }}</h2>
          <p v-if="selectedKb.description" class="detail-desc">{{ selectedKb.description }}</p>
          <p v-else class="detail-desc empty">暂无描述</p>
          <p v-if="(selectedKb.documents?.length || 0) > 0" class="doc-count">
            共 {{ selectedKb.documents?.length || 0 }} 个文档
          </p>
        </header>

        <DocumentList
          :documents="selectedKb.documents || []"
          :document-statuses="documentStatuses"
          @delete="handleDeleteDoc"
          @preview="openPreview"
        />
      </div>
    </div>

    <!-- 文档预览弹窗 -->
    <DocumentPreview
      :doc-id="previewDoc?.id || null"
      :doc-name="previewDoc?.name || ''"
      @close="closePreview"
    />
  </div>
</template>

<style scoped>
.kb-container {
  padding: 40px;
  max-width: 1400px;
  margin: 0 auto;
}

.kb-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 48px;
  gap: 24px;
  flex-wrap: wrap;
}

.header-main h1 {
  font-size: 2.4rem;
  margin-bottom: 8px;
  color: var(--text-main);
}

.subtitle {
  color: var(--text-muted);
  font-size: 1.1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.add-kb-wrapper {
  display: flex;
  gap: 12px;
}

.add-kb-wrapper input {
  background: white;
  border: 1px solid var(--border-subtle);
  padding: 12px 18px;
  border-radius: 12px;
  width: 200px;
}

.kb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 60px;
}

.kb-detail-panel {
  padding: 32px;
  border-radius: 24px;
  border: 2px solid var(--primary);
  background: var(--bg-surface);
  box-shadow: var(--shadow-md);
}

.detail-header {
  margin-bottom: 24px;
}

.detail-header h2 {
  color: var(--primary);
  margin-bottom: 8px;
}

.detail-desc {
  margin: 8px 0 4px;
  font-size: 14px;
  color: var(--text-main);
  line-height: 1.5;
}

.detail-desc.empty {
  color: var(--text-muted);
  font-style: italic;
}

.doc-count {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}

.primary-btn {
  background: var(--primary);
  color: white;
  padding: 0 24px;
  border-radius: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  cursor: pointer;
  height: 44px;
  transition: all 0.2s;
}

.primary-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
