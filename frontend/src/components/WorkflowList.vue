<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWorkflowStore } from '../store/workflow'
import { Plus, FileCode, Trash2, Play, Clock } from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'select', workflow: any): void
}>()

const store = useWorkflowStore()
const isCreating = ref(false)

onMounted(async () => {
  await store.fetchWorkflows()
})

const handleCreateWorkflow = () => {
  store.createNewWorkflow()
  isCreating.value = true
  // 通知父组件跳转到编辑
  emit('select', store.nodes)
}

const handleSelectWorkflow = (wf: any) => {
  store.loadWorkflow(wf)
  emit('select', wf)
}

const handleDeleteWorkflow = async (e: Event, id: string) => {
  e.stopPropagation()
  if (confirm('确定要删除这个工作流吗？')) {
    await store.deleteWorkflow(id)
  }
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="workflow-list-page">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <div class="header-title">
          <h1>工作流</h1>
          <p class="header-subtitle">共 {{ store.savedWorkflows.length }} 个工作流</p>
        </div>
        <button class="create-btn" @click="handleCreateWorkflow">
          <Plus :size="18" />
          新建工作流
        </button>
      </div>
    </header>

    <!-- 工作流列表 -->
    <div class="workflow-grid">
      <!-- 新建工作流卡片 -->
      <div class="workflow-card create-card" @click="handleCreateWorkflow">
        <div class="create-icon">
          <Plus :size="32" />
        </div>
        <span>创建新工作流</span>
      </div>

      <!-- 工作流卡片 -->
      <div
        v-for="wf in store.savedWorkflows"
        :key="wf.id"
        class="workflow-card"
        :class="{ active: store.currentWorkflowId === wf.id }"
        @click="handleSelectWorkflow(wf)"
      >
        <div class="card-header">
          <div class="card-icon">
            <FileCode :size="20" />
          </div>
          <div class="card-actions">
            <button class="action-btn" @click.stop="handleDeleteWorkflow($event, wf.id)" title="删除">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>

        <div class="card-body">
          <h3 class="card-title">{{ wf.name }}</h3>
          <div class="card-meta">
            <span class="meta-item">
              <Clock :size="12" />
              {{ formatDate(wf.createdAt) }}
            </span>
          </div>
          <div class="card-stats">
            <span class="stat">{{ wf.nodes?.length || 0 }} 节点</span>
            <span class="stat-dot"></span>
            <span class="stat">{{ wf.edges?.length || 0 }} 连线</span>
          </div>
        </div>

        <div class="card-footer">
          <button class="edit-btn" @click.stop="handleSelectWorkflow(wf)">
            <Play :size="14" />
            编辑
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="store.savedWorkflows.length === 0 && !isCreating" class="empty-state">
      <div class="empty-icon">
        <FileCode :size="64" />
      </div>
      <h3>还没有工作流</h3>
      <p>点击上方按钮创建你的第一个工作流</p>
    </div>
  </div>
</template>

<style scoped>
.workflow-list-page {
  min-height: 100vh;
  background: var(--bg-app);
  padding: 0 24px 24px;
}

/* 页面头部 */
.page-header {
  padding: 32px 0 24px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.header-title h1 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0 0 4px 0;
}

.header-subtitle {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.create-btn:hover {
  background: var(--primary-hover);
}

/* 工作流网格 */
.workflow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 工作流卡片 */
.workflow-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 20px;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
}

.workflow-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.workflow-card.active {
  border-color: var(--primary);
  background: var(--primary-light);
}

/* 创建卡片 */
.create-card {
  border-style: dashed;
  border-color: var(--border-default);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  color: var(--text-muted);
}

.create-card:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-light);
}

.create-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.create-card:hover .create-icon {
  background: var(--primary);
  color: white;
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}

.workflow-card.active .card-icon {
  background: var(--primary);
  color: white;
}

.card-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.workflow-card:hover .card-actions {
  opacity: 1;
}

.action-btn {
  padding: 6px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--error);
}

/* 卡片内容 */
.card-body {
  flex: 1;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0 0 8px 0;
  word-break: break-word;
}

.card-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.card-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.stat-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--text-muted);
}

/* 卡片底部 */
.card-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.edit-btn {
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
  transition: all var(--transition-fast);
}

.edit-btn:hover {
  background: var(--primary);
  color: white;
}

.workflow-card.active .edit-btn {
  background: var(--primary);
  color: white;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  margin-bottom: 24px;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
}
</style>
