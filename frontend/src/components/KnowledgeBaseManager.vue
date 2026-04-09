<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { Plus, Trash2, Upload, FileText, BookOpen, FolderOpen, Loader2, CheckCircle, AlertCircle } from 'lucide-vue-next'
import {
  getKnowledgeBasesUrl,
  getKnowledgeBaseUrl,
  getUploadDocumentUrl,
  getDocumentStatusUrl,
} from '../config/api'

type ProcessingStatus = 'pending' | 'parsing' | 'chunking' | 'embedding' | 'completed' | 'failed'

interface Document {
  id: string
  name: string
  createdAt: string
  processingStatus?: ProcessingStatus
  progress?: number
  errorMessage?: string
}

interface KnowledgeBase {
  id: string
  name: string
  description?: string
  documents?: Document[]
  createdAt: string
}

const kbs = ref<KnowledgeBase[]>([])
const newKbName = ref('')
const isLoading = ref(false)
const selectedKb = ref<KnowledgeBase | null>(null)
const documentStatuses = ref<Map<string, { status: ProcessingStatus; progress: number; error?: string }>>(new Map())
let statusPollingInterval: ReturnType<typeof setInterval> | null = null

const fetchKbs = async () => {
  try {
    const resp = await axios.get(getKnowledgeBasesUrl())
    kbs.value = resp.data
    // 更新 selectedKb 的引用
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
  } catch (err) {
    console.error('Fetch KBs failed', err)
  }
}

const selectKb = (kb: KnowledgeBase) => {
  selectedKb.value = kb
}

const createKb = async () => {
  if (!newKbName.value.trim()) return
  try {
    await axios.post(getKnowledgeBasesUrl(), { name: newKbName.value })
    newKbName.value = ''
    await fetchKbs()
  } catch (err) {
    alert('创建失败')
  }
}

const handleUpload = async (kbId: string, event: any) => {
  const file = event.target.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  isLoading.value = true
  try {
    const resp = await axios.post(getUploadDocumentUrl(kbId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    const newDoc = resp.data as Document
    documentStatuses.value.set(newDoc.id, {
      status: 'pending',
      progress: 0,
    })

    await fetchKbs()
    startStatusPolling(newDoc.id)
  } catch (err: any) {
    alert(err.response?.data?.message || '上传失败')
  } finally {
    isLoading.value = false
    event.target.value = ''
  }
}

const startStatusPolling = (_docId: string) => {
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
      const resp = await axios.get(getDocumentStatusUrl(docId))
      const { status, progress, errorMessage } = resp.data
      documentStatuses.value.set(docId, { status, progress, error: errorMessage })

      if (status === 'completed' || status === 'failed') {
        await fetchKbs()
      }
    } catch (err) {
      console.error(`Failed to poll status for doc ${docId}`, err)
    }
  }
}

const deleteKb = async (kbId: string, event: Event) => {
  event.stopPropagation()
  if (!confirm('确定要删除这个知识库吗？删除后无法恢复。')) return

  try {
    await axios.delete(getKnowledgeBaseUrl(kbId))
    if (selectedKb.value?.id === kbId) {
      selectedKb.value = null
    }
    await fetchKbs()
  } catch (err) {
    alert('删除失败')
  }
}

const deleteDoc = async (docId: string, event: Event) => {
  event.stopPropagation()
  if (!confirm('确定要删除这个文档吗？')) return

  try {
    await axios.delete(`${getKnowledgeBasesUrl().replace('/bases', '')}/documents/${docId}`)
    documentStatuses.value.delete(docId)
    await fetchKbs()
  } catch (err) {
    alert('删除失败')
  }
}

const getDocStatus = (doc: Document) => {
  const tracked = documentStatuses.value.get(doc.id)
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
      <div class="add-kb-wrapper">
        <input v-model="newKbName" placeholder="起个好记的名字..." @keyup.enter="createKb" />
        <button class="primary-btn" @click="createKb">
          <Plus :size="20" />
          创建知识库
        </button>
      </div>
    </header>

    <div class="kb-main">
      <!-- 知识库卡片网格 -->
      <div class="kb-grid">
        <div
          v-for="kb in kbs"
          :key="kb.id"
          class="kb-card"
          :class="{ active: selectedKb?.id === kb.id }"
          @click="selectKb(kb)"
        >
          <div class="kb-card-header">
            <div class="kb-icon"><BookOpen :size="24" /></div>
            <div class="kb-meta">
              <h3>{{ kb.name }}</h3>
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
                @change="e => handleUpload(kb.id, e)"
                hidden
              />
            </label>
            <button class="icon-btn danger" @click="e => deleteKb(kb.id, e)">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
      </div>

      <!-- 文档详情面板 -->
      <div v-if="selectedKb" class="kb-detail-panel">
        <header class="detail-header">
          <h2>文档详情 - {{ selectedKb.name }}</h2>
          <p v-if="(selectedKb.documents?.length || 0) > 0">共 {{ selectedKb.documents?.length || 0 }} 个文档</p>
        </header>

        <div class="doc-list">
          <div v-if="!selectedKb.documents || selectedKb.documents.length === 0" class="empty-state">
            <div class="empty-icon"><FolderOpen :size="48" /></div>
            <p>暂无文档，支持 PDF、Word 和纯文本格式。</p>
          </div>

          <div v-for="doc in selectedKb.documents" :key="doc.id" class="doc-row">
            <div class="doc-info">
              <FileText :size="18" class="doc-icon" />
              <div class="doc-texts">
                <span class="doc-name">{{ doc.name }}</span>
                <span class="doc-date">{{ new Date(doc.createdAt).toLocaleDateString() }}</span>
              </div>
            </div>
            <div class="doc-actions">
              <div
                class="doc-status-tag"
                :class="{ processing: getDocStatus(doc).status !== 'completed' && getDocStatus(doc).status !== 'failed' }"
                :style="{ borderColor: getStatusColor(getDocStatus(doc).status), color: getStatusColor(getDocStatus(doc).status) }"
              >
                <Loader2 v-if="getDocStatus(doc).status !== 'completed' && getDocStatus(doc).status !== 'failed'" :size="12" class="spin" />
                <CheckCircle v-else-if="getDocStatus(doc).status === 'completed'" :size="12" />
                <AlertCircle v-else :size="12" />
                {{ getStatusText(getDocStatus(doc).status) }}
              </div>
              <div
                v-if="getDocStatus(doc).status !== 'completed' && getDocStatus(doc).status !== 'failed'"
                class="progress-bar"
              >
                <div class="progress-fill" :style="{ width: `${getDocStatus(doc).progress}%` }"></div>
              </div>
              <button class="icon-btn danger small" @click="e => deleteDoc(doc.id, e)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
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
  align-items: flex-end;
  margin-bottom: 48px;
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

.add-kb-wrapper {
  display: flex;
  gap: 12px;
}

.kb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 60px;
}

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
}

.kb-meta h3 {
  margin: 0 0 4px 0;
  font-size: 1.2rem;
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
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
}

.doc-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.doc-icon {
  color: var(--primary);
}

.doc-texts {
  display: flex;
  flex-direction: column;
}

.doc-name {
  font-weight: 600;
  font-size: 15px;
}

.doc-date {
  font-size: 12px;
  color: var(--text-muted);
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
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s ease;
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
}

input {
  background: white;
  border: 1px solid var(--border-subtle);
  padding: 12px 18px;
  border-radius: 12px;
  width: 240px;
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

.doc-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
