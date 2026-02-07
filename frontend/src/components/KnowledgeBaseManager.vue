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

onMounted(fetchKbs)
</script>

<template>
  <div class="kb-manager">
    <div class="header">
      <h2>知识库管理</h2>
      <div class="add-kb">
        <input v-model="newKbName" placeholder="新知识库名称..." @keyup.enter="createKb" />
        <button @click="createKb"><Plus :size="18" /></button>
      </div>
    </div>

    <div class="kb-list">
      <div v-for="kb in kbs" :key="kb.id" class="kb-card" :class="{ active: selectedKb?.id === kb.id }" @click="selectedKb = kb">
        <div class="kb-info">
          <strong>{{ kb.name }}</strong>
          <span class="count">{{ kb.documents?.length || 0 }} 个文档</span>
        </div>
        <div class="kb-actions">
          <label class="upload-label">
            <Upload :size="16" />
            <input type="file" @change="e => handleUpload(kb.id, e)" hidden />
          </label>
        </div>
      </div>
    </div>

    <div v-if="selectedKb" class="kb-detail">
      <h3>文档列表 - {{ selectedKb.name }}</h3>
      <div v-if="selectedKb.documents?.length === 0" class="empty">暂无文档</div>
      <div v-for="doc in selectedKb.documents" :key="doc.id" class="doc-item">
        <FileText :size="16" />
        <span>{{ doc.name }}</span>
        <span class="date">{{ new Date(doc.createdAt).toLocaleDateString() }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kb-manager {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  color: #333;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}
.add-kb {
  display: flex;
  gap: 10px;
}
.kb-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}
.kb-card {
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}
.kb-card:hover {
  border-color: #6e56cf;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.kb-card.active {
  border-color: #6e56cf;
  background: #f5f3ff;
}
.kb-info {
  display: flex;
  flex-direction: column;
}
.count {
  font-size: 12px;
  color: #888;
}
.upload-label {
  cursor: pointer;
  color: #6e56cf;
  padding: 5px;
}
.kb-detail {
  padding-top: 20px;
  border-top: 1px solid #eee;
}
.doc-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 4px;
  margin-bottom: 8px;
}
.date {
  margin-left: auto;
  font-size: 12px;
  color: #999;
}
.empty {
  color: #aaa;
  font-style: italic;
}
input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
}
button {
  background: #6e56cf;
  color: white;
  padding: 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
