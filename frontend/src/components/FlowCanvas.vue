<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { ref, onMounted, onUnmounted } from 'vue'
import { useWorkflowStore } from '../store/workflow'
import axios from 'axios'
import { Save, Play, Plus, List, Trash2 } from 'lucide-vue-next'

interface ExecutionLog {
  nodeId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  output?: any;
  error?: string;
  startTime: number;
  endTime?: number;
}

interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  documents?: any[];
}

const store = useWorkflowStore()
const { onConnect, addEdges, onNodeClick } = useVueFlow()

const selectedNode = ref<any>(null)
const showWorkflowList = ref(false)
const isEditing = ref(false)
const knowledgeBases = ref<KnowledgeBase[]>([])

onConnect((params) => {
  addEdges(params)
})

onNodeClick(async (event) => {
  selectedNode.value = event.node
  // 如果点击的是知识检索节点，获取知识库列表
  if (String(event.node.label || '').includes('检索')) {
    await fetchKnowledgeBases()
  }
})

// 获取知识库列表
const fetchKnowledgeBases = async () => {
  try {
    const resp = await axios.get('http://localhost:3001/knowledge/bases')
    knowledgeBases.value = resp.data
  } catch (err) {
    console.error('Failed to fetch knowledge bases:', err)
  }
}

onMounted(async () => {
  await store.fetchWorkflows()
  // 如果没有已保存的工作流，创建新的空白工作流
  const firstWorkflow = store.savedWorkflows[0]
  if (!firstWorkflow) {
    store.createNewWorkflow()
    isEditing.value = true
  } else {
    // 默认加载第一个
    store.loadWorkflow(firstWorkflow)
  }
})

const runLogs = ref<ExecutionLog[]>([])
const isRunning = ref(false)
const isSaving = ref(false)
let eventSource: EventSource | null = null

const handleSave = async () => {
  isSaving.value = true
  try {
    await store.saveWorkflow()
    alert('工作流已保存')
  } catch (e) {
    alert('保存失败')
  } finally {
    isSaving.value = false
  }
}

const handleRun = async () => {
  // 如果有未保存的修改，先保存
  if (store.nodes.length > 0 && !store.currentWorkflowId) {
    try {
      await store.saveWorkflow()
    } catch (e: any) {
      alert(e.message || '保存失败')
      return
    }
  }

  if (!store.currentWorkflowId) {
    alert('请先保存工作流')
    return
  }

  isRunning.value = true
  runLogs.value = []

  // 关闭之前的 SSE 连接
  if (eventSource) {
    eventSource.close()
  }

  // 建立 SSE 连接
  const sseUrl = `http://localhost:3001/workflows/${store.currentWorkflowId}/run-stream`
  eventSource = new EventSource(sseUrl)

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'node_start':
          runLogs.value.push({
            nodeId: data.nodeId,
            status: 'RUNNING',
            startTime: data.timestamp,
          })
          break

        case 'node_complete':
          const runningLog = runLogs.value.find(l => l.nodeId === data.nodeId && l.status === 'RUNNING')
          if (runningLog) {
            runningLog.status = 'COMPLETED'
            runningLog.output = data.data.output
            runningLog.endTime = data.timestamp
          }
          break

        case 'node_error':
          const errorLog = runLogs.value.find(l => l.nodeId === data.nodeId && l.status === 'RUNNING')
          if (errorLog) {
            errorLog.status = 'FAILED'
            errorLog.error = data.data.error
            errorLog.endTime = data.timestamp
          }
          break

        case 'workflow_complete':
          isRunning.value = false
          break
      }
    } catch (e) {
      console.error('Failed to parse SSE event:', e)
    }
  }

  eventSource.onerror = (error) => {
    console.error('SSE error:', error)
    isRunning.value = false
    eventSource?.close()
    eventSource = null
  }
}

// 组件卸载时关闭 SSE
onUnmounted(() => {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
})

const handleNewWorkflow = () => {
  store.createNewWorkflow()
  isEditing.value = true
  showWorkflowList.value = false
}

const handleLoadWorkflow = (wf: any) => {
  store.loadWorkflow(wf)
  showWorkflowList.value = false
}

const handleDeleteWorkflow = async (e: Event, id: string) => {
  e.stopPropagation()
  if (confirm('确定要删除这个工作流吗？')) {
    await store.deleteWorkflow(id)
  }
}
</script>

<template>
  <div class="flow-container">
    <!-- 顶部工具栏 -->
    <div class="top-toolbar">
      <div class="toolbar-left">
        <input
          v-model="store.workflowName"
          class="workflow-name-input"
          placeholder="工作流名称..."
          :disabled="!isEditing"
        />
        <button v-if="!isEditing" @click="isEditing = true" class="tool-btn">
          编辑名称
        </button>
      </div>

      <div class="toolbar-right">
        <div class="workflow-list-wrapper">
          <button class="tool-btn" @click="showWorkflowList = !showWorkflowList">
            <List :size="16" />
            工作流列表
          </button>
          <div v-if="showWorkflowList" class="workflow-dropdown">
            <div class="dropdown-header">已保存的工作流</div>
            <div
              v-for="wf in store.savedWorkflows"
              :key="wf.id"
              class="dropdown-item"
              :class="{ active: store.currentWorkflowId === wf.id }"
              @click="handleLoadWorkflow(wf)"
            >
              <span class="wf-name">{{ wf.name }}</span>
              <button class="delete-wf-btn" @click="handleDeleteWorkflow($event, wf.id)">
                <Trash2 :size="14" />
              </button>
            </div>
            <div v-if="store.savedWorkflows.length === 0" class="dropdown-empty">
              暂无已保存的工作流
            </div>
            <div class="dropdown-footer">
              <button class="new-wf-btn" @click="handleNewWorkflow">
                <Plus :size="14" />
                新建工作流
              </button>
            </div>
          </div>
        </div>

        <button class="tool-btn primary" @click="handleSave" :disabled="isSaving">
          <Save :size="16" />
          {{ isSaving ? '保存中...' : '保存' }}
        </button>

        <button class="tool-btn success" @click="handleRun" :disabled="isRunning || store.nodes.length === 0">
          <Play :size="16" />
          {{ isRunning ? '执行中...' : '运行' }}
        </button>
      </div>
    </div>

    <div class="canvas-area">
      <VueFlow
        v-model:nodes="store.nodes"
        v-model:edges="store.edges"
        fit-view-on-init
        class="custom-flow"
      >
        <Background pattern-color="#ccc" :gap="20" />
        <Controls />
      </VueFlow>
    </div>

    <!-- 侧边属性栏 - Glassmorphism -->
    <transition name="slide">
      <div v-if="selectedNode" class="sidebar glass">
        <header class="sidebar-header">
          <h3>节点配置</h3>
          <span class="node-id">#{{ selectedNode.id }}</span>
        </header>
        
        <div class="sidebar-content">
          <div class="form-group">
            <label>显示名称</label>
            <input v-model="selectedNode.label" placeholder="输入节点名称..." />
          </div>
          
          <div v-if="String(selectedNode.label || '').includes('AI')" class="form-group">
            <label>Prompt 引导词</label>
            <textarea v-model="selectedNode.data.prompt" rows="8" placeholder="在此输入 AI 处理逻辑..."></textarea>
            <p v-pre class="hint">支持使用 {{nodeId.output}} 引用其他节点输出</p>
          </div>

          <div v-if="String(selectedNode.label || '').includes('检索')" class="form-group">
            <label>关联知识库</label>
            <select v-model="selectedNode.data.kbId" class="kb-select">
              <option value="" disabled>选择知识库</option>
              <option v-for="kb in knowledgeBases" :key="kb.id" :value="kb.id">
                {{ kb.name }} ({{ kb.documents?.length || 0 }} 文档)
              </option>
            </select>
            <label>查询语句 (Query)</label>
            <input v-model="selectedNode.data.query" placeholder="要搜索的内容..." />
          </div>
        </div>

        <footer class="sidebar-footer">
          <button @click="selectedNode = null" class="secondary-btn">关闭面板</button>
        </footer>
      </div>
    </transition>

    <!-- 底部运行日志 - Premium Dark -->
    <div class="log-panel" :class="{ open: runLogs.length > 0 }">
      <div class="log-header">
        <div class="log-title">
          <span class="pulse-icon"></span>
          运行日志
        </div>
        <button class="clear-btn" @click="runLogs = []">清空</button>
      </div>
      <div class="log-content">
        <div v-for="log in runLogs" :key="log.nodeId" class="log-item">
          <div class="log-status" :class="log.status"></div>
          <div class="log-info">
            <span class="log-node">Node {{ log.nodeId }}</span>
            <span class="log-msg">{{ log.output || log.error }}</span>
          </div>
          <div class="log-time">{{ new Date(log.startTime).toLocaleTimeString() }}</div>
        </div>
      </div>
    </div>

    <div class="toolbar glass">
      <button class="run-btn" @click="handleRun" :disabled="isRunning">
        {{ isRunning ? '正在执行' : '运行工作流' }}
      </button>
    </div>

    <!-- 点击空白处关闭下拉框 -->
    <div v-if="showWorkflowList" class="overlay" @click="showWorkflowList = false"></div>
  </div>
</template>

<style scoped>
.flow-container {
  height: 100%;
  width: 100%;
  display: flex;
  position: relative;
  overflow: hidden;
  background: #f8f9fa;
}

.canvas-area {
  flex-grow: 1;
  height: 100%;
}

.custom-flow {
  background: white;
}

.sidebar {
  width: 340px;
  position: absolute;
  top: 20px;
  right: 20px;
  bottom: 20px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  z-index: 1001;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
}

.sidebar-header {
  padding: 24px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.node-id {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--primary-light);
  padding: 2px 8px;
  border-radius: 4px;
}

.sidebar-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
}

.hint {
  font-size: 11px;
  color: var(--text-muted);
}

input, textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  background: white;
}

input:focus, textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(110, 86, 207, 0.1);
}

.kb-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  font-size: 14px;
  background: white;
  color: var(--text-main);
  cursor: pointer;
}

.kb-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(110, 86, 207, 0.1);
}

.sidebar-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--border-subtle);
}

.secondary-btn {
  width: 100%;
  background: white;
  border: 1px solid var(--border-subtle);
  padding: 10px;
  border-radius: 8px;
  color: var(--text-main);
  font-weight: 500;
  cursor: pointer;
}

.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

.log-panel {
  position: absolute;
  bottom: -300px;
  left: 20px;
  right: 20px;
  height: 280px;
  background: #111;
  color: #eee;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -10px 25px rgba(0,0,0,0.15);
  transition: bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.log-panel.open {
  bottom: 0px;
}

.log-header {
  padding: 12px 20px;
  background: #1a1a1a;
  border-radius: 16px 16px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #333;
}

.log-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 14px;
}

.pulse-icon {
  width: 8px;
  height: 8px;
  background: #6e56cf;
  border-radius: 50%;
  box-shadow: 0 0 10px #6e56cf;
}

.clear-btn {
  background: transparent;
  border: none;
  color: #888;
  font-size: 12px;
  cursor: pointer;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid #222;
}

.log-status {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.log-status.COMPLETED { background: #10b981; box-shadow: 0 0 8px #10b981; }
.log-status.FAILED { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
.log-status.RUNNING { background: #3b82f6; box-shadow: 0 0 8px #3b82f6; }

.log-info {
  flex: 1;
  display: flex;
  gap: 12px;
}

.log-node {
  font-weight: 700;
  color: #ccc;
  font-size: 13px;
}

.log-msg {
  color: #888;
  font-size: 13px;
  font-family: monospace;
}

.log-time {
  font-size: 11px;
  color: #555;
}

.toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  padding: 6px;
  border-radius: 12px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
}

.run-btn {
  background: var(--primary);
  color: white;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: all 0.2s;
}

.run-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.run-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 顶部工具栏 */
.top-toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  height: 56px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 100;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-subtle);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workflow-name-input {
  background: transparent;
  border: none;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  padding: 8px 12px;
  border-radius: 8px;
  min-width: 200px;
}

.workflow-name-input:hover:not(:disabled) {
  background: var(--primary-light);
}

.workflow-name-input:focus {
  outline: none;
  background: white;
  box-shadow: 0 0 0 2px var(--primary);
}

.workflow-name-input:disabled {
  color: var(--text-muted);
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--border-subtle);
  background: white;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.tool-btn.primary {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.tool-btn.primary:hover {
  background: var(--primary-hover);
}

.tool-btn.success {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.tool-btn.success:hover {
  background: #059669;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 工作流下拉列表 */
.workflow-list-wrapper {
  position: relative;
}

.workflow-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  background: white;
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-subtle);
  z-index: 1001;
  overflow: hidden;
}

.dropdown-header {
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  background: #f8f9fa;
  border-bottom: 1px solid var(--border-subtle);
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f4f4f7;
}

.dropdown-item.active {
  background: var(--primary-light);
}

.wf-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-main);
}

.delete-wf-btn {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  opacity: 0.6;
}

.delete-wf-btn:hover {
  background: #fee2e2;
  opacity: 1;
}

.dropdown-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.dropdown-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-subtle);
}

.new-wf-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: var(--primary-light);
  color: var(--primary);
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.new-wf-btn:hover {
  background: var(--primary);
  color: white;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}
</style>
