<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { Plus, Trash2, Upload, FileText } from 'lucide-vue-next'

const kbs = ref<any[]>([])
const newKbName = ref('')
const isLoading = ref(false)
const selectedKb = ref<any>(null)

const fetchKbs = async () => {
  try {
    const resp = await axios.get('http://localhost:3001/knowledge/bases')
    kbs.value = resp.data
  } catch (err) {
    console.error('Fetch KBs failed', err)
  }
}

const createKb = async () => {
  if (!newKbName.value.trim()) return
  try {
    await axios.post('http://localhost:3001/knowledge/bases', { name: newKbName.value })
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
    await axios.post(`http://localhost:3001/knowledge/bases/${kbId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    alert('上传成功！后端已自动分片并生成 Mock 向量索引。')
    await fetchKbs()
  } catch (err) {
    alert('上传失败')
  } finally {
    isLoading.value = false
  }
}

const deleteKb = async (kbId: string, event: Event) => {
  event.stopPropagation()
  if (!confirm('确定要删除这个知识库吗？删除后无法恢复。')) return

  try {
    await axios.delete(`http://localhost:3001/knowledge/bases/${kbId}`)
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
    await axios.delete(`http://localhost:3001/knowledge/documents/${docId}`)
    await fetchKbs()
  } catch (err) {
    alert('删除失败')
  }
}

onMounted(fetchKbs)
</script>

<template>
  <div class="kb-container">
    <header class="kb-header">
      <div class="header-main">
        <h1>知识库中心</h1>
        <p class="subtitle">管理您的 AI 知识资产，支持多种格式文档上传。</p>
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
      <div class="kb-grid">
        <div 
          v-for="kb in kbs" 
          :key="kb.id" 
          class="kb-card glass-card"
          :class="{ active: selectedKb?.id === kb.id }"
          @click="selectedKb = kb"
        >
          <div class="kb-card-header">
            <div class="kb-icon">📚</div>
            <div class="kb-meta">
              <h3>{{ kb.name }}</h3>
              <span class="kb-tag">{{ kb.documents?.length || 0 }} Docs</span>
            </div>
          </div>
          
          <div class="kb-card-actions">
            <label class="upload-btn">
              <Upload :size="16" />
              上传文档
              <input type="file" @change="e => handleUpload(kb.id, e)" hidden />
            </label>
            <button class="icon-btn danger" @click="e => deleteKb(kb.id, e)">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
      </div>

      <transition name="fade">
        <div v-if="selectedKb" class="kb-detail-panel glass">
          <header class="detail-header">
            <h2>文档详情 - {{ selectedKb.name }}</h2>
            <p v-if="selectedKb.documents?.length > 0">共 {{ selectedKb.documents.length }} 个文档</p>
          </header>

          <div class="doc-list">
            <div v-if="selectedKb.documents?.length === 0" class="empty-state">
              <div class="empty-icon">📂</div>
              <p>暂无文档，请点击上方“上传文档”开始。</p>
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
                <div class="doc-status-tag">已索引</div>
                <button class="icon-btn danger small" @click="e => deleteDoc(doc.id, e)">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
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
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
  border: 1px solid var(--border-subtle);
}

.detail-header {
  margin-bottom: 24px;
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
  font-size: 12px;
  color: #10b981;
  font-weight: 600;
  background: #ecfdf5;
  padding: 4px 12px;
  border-radius: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
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
}

input {
  background: white;
  border: 1px solid var(--border-subtle);
  padding: 12px 18px;
  border-radius: 12px;
  width: 240px;
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Icon Button */
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

/* Doc Actions */
.doc-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
