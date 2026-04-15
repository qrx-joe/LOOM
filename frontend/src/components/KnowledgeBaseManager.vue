<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import { useKnowledgeBases, type KnowledgeBase, type ProcessingStatus, type Document } from '../composables/useKnowledgeBases'
import KbCard from './knowledge/KbCard.vue'
import DocumentList from './knowledge/DocumentList.vue'
import SearchInput from './knowledge/SearchInput.vue'
import DocumentPreview from './knowledge/DocumentPreview.vue'
import KbCardSkeleton from './knowledge/KbCardSkeleton.vue'
import EmptyState from './knowledge/EmptyState.vue'

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
  deleteDocuments,
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

// 从空状态创建知识库
const handleCreateFromEmpty = async () => {
  const name = prompt('请输入知识库名称：')
  if (!name?.trim()) return
  try {
    await createKb(name.trim())
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

// 批量删除文档
const handleDeleteDocs = async (docIds: string[]) => {
  try {
    await deleteDocuments(docIds)
    // 清除已删除文档的状态
    docIds.forEach(id => documentStatuses.value.delete(id))
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
        <!-- 骨架屏 -->
        <template v-if="isLoading">
          <KbCardSkeleton v-for="i in 6" :key="`skeleton-${i}`" />
        </template>

        <!-- 空状态 -->
        <EmptyState
          v-else-if="kbs.length === 0"
          @create="handleCreateFromEmpty"
        />

        <!-- 实际卡片 -->
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

      <!-- 文档详情抽屉 -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="selectedKb" class="drawer-overlay" @click.self="selectedKb = null">
          <div class="drawer-panel">
            <header class="drawer-header">
              <div class="drawer-title">
                <h2>文档详情 - {{ selectedKb.name }}</h2>
                <p class="doc-count">共 {{ selectedKb.documents?.length || 0 }} 个文档</p>
              </div>
              <button class="close-btn" @click="selectedKb = null" title="关闭">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span class="close-text">关闭</span>
              </button>
            </header>

            <div class="drawer-divider"></div>

            <div class="drawer-content">
              <DocumentList
                :documents="selectedKb.documents || []"
                :document-statuses="documentStatuses"
                @delete="handleDeleteDoc"
                @delete-batch="handleDeleteDocs"
                @preview="openPreview"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.kb-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 24px;
  gap: 24px;
  flex-wrap: wrap;
}

.header-main h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--text-main);
}

.subtitle {
  color: var(--text-muted);
  font-size: 14px;
  margin: 0;
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
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

/* 抽屉遮罩层 */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
}

/* 抽屉面板 */
.drawer-panel {
  width: 480px;
  height: 100vh;
  background: var(--bg-surface);
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
}

.drawer-title h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--primary);
  margin: 0 0 4px 0;
}

.drawer-title .doc-count {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.close-btn {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  background: white;
  border: 1px solid var(--border-default, #d1d5db);
  color: var(--text-muted, #6b7280);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  font-size: 13px;
  font-weight: 500;
}

.close-btn:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #dc2626;
}

.close-text {
  margin-left: 2px;
}

.drawer-divider {
  height: 1px;
  background: var(--border-subtle);
  margin-bottom: 16px;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
}

/* 抽屉动画 */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 0.3s ease;
}

.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
  transform: translateX(100%);
}
</style>
