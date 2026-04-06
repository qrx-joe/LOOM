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
const { onConnect, addEdges, onNodeClick, onEdgeClick, addNodes, project, removeNodes, removeEdges } = useVueFlow()

const selectedNode = ref<any>(null)
const selectedEdge = ref<any>(null)
const showWorkflowList = ref(false)
const isEditing = ref(false)
const knowledgeBases = ref<KnowledgeBase[]>([])
const draggedNodeType = ref<string | null>(null)

// 监听边的点击
onEdgeClick((event) => {
  selectedEdge.value = event.edge
  selectedNode.value = null
})

// 键盘事件处理 - 删除选中的节点或边
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // 避免在输入框中触发删除
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
      return
    }

    if (selectedNode.value) {
      removeNodes(selectedNode.value.id)
      selectedNode.value = null
    } else if (selectedEdge.value) {
      removeEdges(selectedEdge.value.id)
      selectedEdge.value = null
    }
  }
}

// 初始化
onMounted(async () => {
  // 添加键盘监听
  window.addEventListener('keydown', handleKeyDown)

  // 加载工作流
  await store.fetchWorkflows()
  const firstWorkflow = store.savedWorkflows[0]
  if (!firstWorkflow) {
    store.createNewWorkflow()
    isEditing.value = true
  } else {
    store.loadWorkflow(firstWorkflow)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

// 节点类型定义
const nodeTypes = [
  { type: 'input', label: '开始', icon: '▶', color: '#10b981', description: '工作流入口节点' },
  { type: 'AI_AGENT', label: 'AI 节点', icon: '🤖', color: '#6366f1', description: '调用大模型' },
  { type: 'KNOWLEDGE_RETRIEVAL', label: '知识检索', icon: '📚', color: '#f59e0b', description: 'RAG 检索' },
  { type: 'CONDITION', label: '条件分支', icon: '🔀', color: '#ec4899', description: 'IF/ELSE 分支' },
  { type: 'output', label: '结束', icon: '■', color: '#ef4444', description: '工作流结束' },
]

// 拖拽开始
const handleDragStart = (e: DragEvent, nodeType: string) => {
  draggedNodeType.value = nodeType
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/vueflow', nodeType)
  }
}

// 拖拽结束
const handleDragEnd = () => {
  draggedNodeType.value = null
}

// 处理拖拽放置
const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  if (!e.dataTransfer) return

  const nodeType = e.dataTransfer.getData('application/vueflow')
  if (!nodeType) return

  // 获取画布区域的位置
  const canvasArea = document.querySelector('.canvas-area')
  if (!canvasArea) return

  const canvasRect = canvasArea.getBoundingClientRect()
  const position = project({
    x: e.clientX - canvasRect.left,
    y: e.clientY - canvasRect.top,
  })

  // 生成新节点
  const newNode = {
    id: `node-${Date.now()}`,
    type: nodeType,
    label: nodeTypes.find(n => n.type === nodeType)?.label || '新节点',
    position,
    data: getDefaultNodeData(nodeType),
  }

  addNodes(newNode)
}

// 获取节点默认数据
const getDefaultNodeData = (type: string): any => {
  switch (type) {
    case 'AI_AGENT':
      return { prompt: '基于上下文回答问题：\n{{START_INPUT}}', model: 'gpt-3.5-turbo', temperature: 0.7 }
    case 'KNOWLEDGE_RETRIEVAL':
      return { kbId: '', query: '' }
    case 'CONDITION':
      return { expression: '' }
    default:
      return {}
  }
}

// 处理画布拖拽悬停
const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

onConnect((params) => {
  addEdges({ ...params, id: `edge-${Date.now()}` })
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
      <!-- 左侧节点面板 -->
      <div class="node-palette">
        <div class="palette-header">节点列表</div>
        <div class="palette-nodes">
          <div
            v-for="node in nodeTypes"
            :key="node.type"
            class="palette-node"
            :style="{ borderColor: node.color }"
            draggable="true"
            @dragstart="handleDragStart($event, node.type)"
            @dragend="handleDragEnd"
          >
            <span class="node-icon" :style="{ background: node.color }">{{ node.icon }}</span>
            <span class="node-label">{{ node.label }}</span>
          </div>
        </div>
        <div class="palette-hint">拖拽到画布创建节点</div>
      </div>

      <!-- Vue Flow 画布 -->
      <div
        class="flow-wrapper"
        @drop="handleDrop"
        @dragover="handleDragOver"
      >
        <VueFlow
          v-model:nodes="store.nodes"
          v-model:edges="store.edges"
          fit-view-on-init
          class="custom-flow"
          :default-edge-options="{ type: 'smoothstep' }"
        >
          <Background pattern-color="#ccc" :gap="20" />
          <Controls />
        </VueFlow>
      </div>
    </div>

    <!-- 侧边属性栏 - Glassmorphism -->
    <transition name="slide">
      <div v-if="selectedNode || selectedEdge" class="sidebar glass">
        <header class="sidebar-header">
          <h3>{{ selectedEdge ? '连线配置' : '节点配置' }}</h3>
          <span class="node-id">{{ selectedEdge ? `#${selectedEdge.source} → ${selectedEdge.target}` : `#${selectedNode?.id}` }}</span>
        </header>

        <div class="sidebar-content">
          <!-- 节点配置 -->
          <template v-if="selectedNode">
          <div class="form-group">
            <label>显示名称</label>
            <input v-model="selectedNode.label" placeholder="输入节点名称..." />
          </div>
          
          <div v-if="String(selectedNode.label || '').includes('AI')" class="form-group">
            <label>Prompt 引导词</label>
            <textarea v-model="selectedNode.data.prompt" rows="8" placeholder="在此输入 AI 处理逻辑..."></textarea>
            <p v-pre class="hint">支持使用 {{nodeId.output}} 引用其他节点输出</p>
          </div>

          <div v-if="String(selectedNode.label || '').includes('AI')" class="form-group">
            <label>AI 模型</label>
            <select v-model="selectedNode.data.model" class="kb-select">
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
            </select>
          </div>

          <div v-if="String(selectedNode.label || '').includes('AI')" class="form-group">
            <label>Temperature: {{ selectedNode.data.temperature }}</label>
            <input
              type="range"
              v-model="selectedNode.data.temperature"
              min="0"
              max="2"
              step="0.1"
              class="temp-slider"
            />
            <p class="hint">较低的值更确定性，较高的值更有创造性</p>
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

          <div v-if="String(selectedNode.label || '').includes('条件')" class="form-group">
            <label>条件表达式</label>
            <input v-model="selectedNode.data.expression" placeholder="例如: score > 10" />
            <p class="hint">支持格式: {{field}} > N, {{field}} < N, {{field}} == "value"</p>
          </div>
          </template>

          <!-- 边配置 -->
          <template v-if="selectedEdge">
          <div class="form-group">
            <label>连线条件</label>
            <select v-model="selectedEdge.condition" class="kb-select">
              <option value="">无条件 (默认)</option>
              <option value="true">条件为 true 时执行</option>
              <option value="false">条件为 false 时执行</option>
            </select>
            <p class="hint">只有条件节点后的连线需要设置条件</p>
          </div>
          </template>
        </div>

        <footer class="sidebar-footer">
          <button @click="selectedNode = null; selectedEdge = null" class="secondary-btn">关闭面板</button>
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
  display: flex;
  gap: 16px;
  padding-left: 80px;
}

.custom-flow {
  background: white;
}

/* 节点面板 */
.node-palette {
  position: absolute;
  left: 20px;
  top: 90px;
  width: 70px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-subtle);
  padding: 12px 8px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.palette-header {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-subtle);
}

.palette-nodes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.palette-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 8px;
  border: 2px solid transparent;
  background: #f8f9fa;
  cursor: grab;
  transition: all 0.2s;
}

.palette-node:hover {
  background: white;
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}

.palette-node:active {
  cursor: grabbing;
  transform: scale(0.95);
}

.node-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: white;
}

.node-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-main);
  text-align: center;
}

.palette-hint {
  font-size: 9px;
  color: var(--text-muted);
  text-align: center;
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle);
}

.flow-wrapper {
  flex: 1;
  height: 100%;
  position: relative;
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

.temp-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  appearance: none;
  cursor: pointer;
}

.temp-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.temp-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  border: none;
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
