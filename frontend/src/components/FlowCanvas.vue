<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { ref, onMounted, onUnmounted } from 'vue'
import { useWorkflowStore } from '../store/workflow'
import axios from 'axios'
import {
  Save, Play, Plus, List, Trash2,
  PlayCircle, Bot, BookOpen, GitBranch, Square,
  X, ChevronRight, ArrowLeft, FileCode
} from 'lucide-vue-next'

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
const currentView = ref<'editor' | 'list'>('editor')
const draggedNodeType = ref<string | null>(null)

// 监听边的点击
onEdgeClick((event) => {
  selectedEdge.value = event.edge
  selectedNode.value = null
})

// 键盘事件处理 - 删除选中的节点或边
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Delete' || e.key === 'Backspace') {
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
  window.addEventListener('keydown', handleKeyDown)

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

// 节点类型定义 - 使用 Lucide 图标名称
const nodeTypes = [
  { type: 'input', label: '开始', icon: 'PlayCircle', color: '#10B981', description: '工作流入口节点' },
  { type: 'AI_AGENT', label: 'AI 节点', icon: 'Bot', color: '#4776F6', description: '调用大模型' },
  { type: 'KNOWLEDGE_RETRIEVAL', label: '知识检索', icon: 'BookOpen', color: '#F59E0B', description: 'RAG 检索' },
  { type: 'CONDITION', label: '条件分支', icon: 'GitBranch', color: '#EC4899', description: 'IF/ELSE 分支' },
  { type: 'output', label: '结束', icon: 'Square', color: '#EF4444', description: '工作流结束' },
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

  const canvasArea = document.querySelector('.canvas-area')
  if (!canvasArea) return

  const canvasRect = canvasArea.getBoundingClientRect()
  const position = project({
    x: e.clientX - canvasRect.left,
    y: e.clientY - canvasRect.top,
  })

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
      return { prompt: '基于上下文回答问题：\n{{START_INPUT}}', model: 'deepseek-ai/DeepSeek-V3', temperature: 0.7 }
    case 'KNOWLEDGE_RETRIEVAL':
      return { kbId: '', query: '{{START_INPUT}}' }
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
  currentView.value = 'editor'

  if (eventSource) {
    eventSource.close()
  }

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
  currentView.value = 'editor'
}

const handleLoadWorkflow = (wf: any) => {
  store.loadWorkflow(wf)
  showWorkflowList.value = false
  currentView.value = 'editor'
}

const handleDeleteWorkflow = async (e: Event, id: string) => {
  e.stopPropagation()
  if (confirm('确定要删除这个工作流吗？')) {
    await store.deleteWorkflow(id)
  }
}

const closeSidebar = () => {
  selectedNode.value = null
  selectedEdge.value = null
}

// 获取图标组件
const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = {
    PlayCircle,
    Bot,
    BookOpen,
    GitBranch,
    Square,
  }
  return icons[iconName] || Square
}
</script>

<template>
  <div class="flow-container">
    <!-- 顶部工具栏 -->
    <div class="top-toolbar">
      <div class="toolbar-left">
        <button v-if="currentView === 'list'" @click="currentView = 'editor'" class="tool-btn">
          <ArrowLeft :size="16" />
          返回编辑
        </button>
        <template v-else>
          <input
            v-model="store.workflowName"
            class="workflow-name-input"
            placeholder="工作流名称..."
            :disabled="!isEditing"
          />
          <button v-if="!isEditing" @click="isEditing = true" class="tool-btn">
            编辑名称
          </button>
        </template>
      </div>

      <div class="toolbar-right">
        <template v-if="currentView === 'editor'">
          <div class="workflow-list-wrapper">
            <button class="tool-btn" @click="showWorkflowList = !showWorkflowList">
              <List :size="16" />
              工作流列表
            </button>
            <transition name="dropdown">
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
                  <button class="new-wf-btn" @click="currentView = 'list'">
                    <List :size="14" />
                    查看全部
                  </button>
                  <button class="new-wf-btn" @click="handleNewWorkflow">
                    <Plus :size="14" />
                    新建工作流
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <button class="tool-btn primary" @click="handleSave" :disabled="isSaving">
            <Save :size="16" />
            {{ isSaving ? '保存中...' : '保存' }}
          </button>

          <button class="tool-btn success" @click="handleRun" :disabled="isRunning || store.nodes.length === 0">
            <Play :size="16" />
            {{ isRunning ? '执行中...' : '运行' }}
          </button>
        </template>
        <template v-else>
          <button class="tool-btn primary" @click="handleNewWorkflow">
            <Plus :size="16" />
            新建工作流
          </button>
        </template>
      </div>
    </div>

    <!-- 工作流列表视图 -->
    <div v-if="currentView === 'list'" class="workflow-list-view">
      <div class="list-header">
        <h2>我的工作流</h2>
        <p class="list-subtitle">已创建 {{ store.savedWorkflows.length }} 个工作流</p>
      </div>
      <div class="workflow-cards">
        <div
          v-for="wf in store.savedWorkflows"
          :key="wf.id"
          class="workflow-card"
          :class="{ active: store.currentWorkflowId === wf.id }"
          @click="handleLoadWorkflow(wf); currentView = 'editor'"
        >
          <div class="card-icon">
            <FileCode :size="28" />
          </div>
          <div class="card-content">
            <h3>{{ wf.name }}</h3>
            <span class="card-meta">{{ wf.nodes?.length || 0 }} 个节点 · {{ wf.edges?.length || 0 }} 条连线</span>
          </div>
          <button class="card-action" @click.stop="handleDeleteWorkflow($event, wf.id)">
            <Trash2 :size="16" />
          </button>
        </div>
        <div v-if="store.savedWorkflows.length === 0" class="empty-list">
          <FileCode :size="48" />
          <p>还没有创建任何工作流</p>
          <button class="tool-btn primary" @click="handleNewWorkflow">
            <Plus :size="16" />
            创建第一个工作流
          </button>
        </div>
      </div>
    </div>

    <div class="canvas-area">
      <!-- 左侧节点面板 - 固定侧边栏 -->
      <div class="node-palette">
        <div class="palette-section">
          <div class="palette-section-title">输入节点</div>
          <div
            v-for="node in nodeTypes.filter(n => n.type === 'input' || n.type === 'output')"
            :key="node.type"
            class="palette-node"
            :style="{ borderLeftColor: node.color }"
            draggable="true"
            @dragstart="handleDragStart($event, node.type)"
            @dragend="handleDragEnd"
          >
            <component :is="getIconComponent(node.icon)" :size="16" :style="{ color: node.color }" />
            <span class="node-label">{{ node.label }}</span>
          </div>
        </div>

        <div class="palette-section">
          <div class="palette-section-title">处理节点</div>
          <div
            v-for="node in nodeTypes.filter(n => n.type === 'AI_AGENT' || n.type === 'KNOWLEDGE_RETRIEVAL' || n.type === 'CONDITION')"
            :key="node.type"
            class="palette-node"
            :style="{ borderLeftColor: node.color }"
            draggable="true"
            @dragstart="handleDragStart($event, node.type)"
            @dragend="handleDragEnd"
          >
            <component :is="getIconComponent(node.icon)" :size="16" :style="{ color: node.color }" />
            <span class="node-label">{{ node.label }}</span>
          </div>
        </div>

        <div class="palette-footer">
          <ChevronRight :size="12" />
          <span>拖拽到画布创建节点</span>
        </div>
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
          :default-edge-options="{ type: 'smoothstep', style: { stroke: '#9CA3AF', strokeWidth: 2 } }"
        >
          <Background pattern-color="#E5E7EB" :gap="20" />
          <Controls />
        </VueFlow>
      </div>
    </div>

    <!-- 右侧属性面板 -->
    <transition name="slide">
      <div v-if="selectedNode || selectedEdge" class="sidebar">
        <header class="sidebar-header">
          <div class="sidebar-title">
            <h3>{{ selectedEdge ? '连线配置' : '节点配置' }}</h3>
            <span class="node-id">{{ selectedEdge ? `#${selectedEdge.source} -> ${selectedEdge.target}` : `#${selectedNode?.id}` }}</span>
          </div>
          <button class="close-btn" @click="closeSidebar">
            <X :size="18" />
          </button>
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
            <select v-model="selectedNode.data.model" class="form-select">
              <option value="deepseek-ai/DeepSeek-V3">DeepSeek V3</option>
              <option value="deepseek-ai/DeepSeek-R1">DeepSeek R1</option>
              <option value="Qwen/Qwen2.5-7B-Instruct">Qwen 2.5 7B</option>
              <option value="Qwen/Qwen2.5-14B-Instruct">Qwen 2.5 14B</option>
              <option value="THUDM/glm-4-9b-chat">GLM-4 9B</option>
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
            <select v-model="selectedNode.data.kbId" class="form-select">
              <option value="" disabled>选择知识库</option>
              <option v-for="kb in knowledgeBases" :key="kb.id" :value="kb.id">
                {{ kb.name }} ({{ kb.documents?.length || 0 }} 文档)
              </option>
            </select>
            <label style="margin-top: 12px;">查询语句 (Query)</label>
            <input v-model="selectedNode.data.query" placeholder="要搜索的内容..." />
          </div>

          <div v-if="String(selectedNode.label || '').includes('条件')" class="form-group">
            <label>条件表达式</label>
            <input v-model="selectedNode.data.expression" placeholder="例如: score > 10" />
            <p v-pre class="hint">支持格式: {{field}} > N, {{field}} < N, {{field}} == "value"</p>
          </div>
          </template>

          <!-- 边配置 -->
          <template v-if="selectedEdge">
          <div class="form-group">
            <label>连线条件</label>
            <select v-model="selectedEdge.condition" class="form-select">
              <option value="">无条件 (默认)</option>
              <option value="true">条件为 true 时执行</option>
              <option value="false">条件为 false 时执行</option>
            </select>
            <p class="hint">只有条件节点后的连线需要设置条件</p>
          </div>
          </template>
        </div>
      </div>
    </transition>

    <!-- 底部运行日志 -->
    <div class="log-panel" :class="{ open: runLogs.length > 0 }">
      <div class="log-header">
        <div class="log-title">
          <span class="pulse-icon" :class="{ running: isRunning }"></span>
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

    <!-- 点击空白处关闭下拉框 -->
    <div v-if="showWorkflowList" class="overlay" @click="showWorkflowList = false"></div>
  </div>
</template>

<style scoped>
.flow-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: var(--bg-app);
}

.canvas-area {
  flex-grow: 1;
  height: calc(100% - 68px);
  display: flex;
  margin-top: 68px;
  position: relative;
}

.custom-flow {
  background: var(--bg-surface);
}

/* 节点面板 - 固定侧边栏 */
.node-palette {
  position: fixed;
  left: 0;
  top: 56px;
  width: 200px;
  height: calc(100% - 56px);
  background: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  z-index: 100;
  overflow-y: auto;
}

.palette-section {
  padding: 16px 12px 8px;
}

.palette-section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding-left: 4px;
}

.palette-node {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border-left: 3px solid transparent;
  background: var(--bg-hover);
  cursor: grab;
  transition: all var(--transition-fast);
  margin-bottom: 4px;
}

.palette-node:hover {
  background: var(--bg-active);
  transform: translateX(2px);
}

.palette-node:active {
  cursor: grabbing;
  transform: scale(0.98);
}

.node-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-main);
}

.palette-footer {
  margin-top: auto;
  padding: 12px 16px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-disabled);
  background: var(--bg-hover);
}

.flow-wrapper {
  flex: 1;
  height: 100%;
  margin-left: 200px;
  position: relative;
}

/* 顶部工具栏 */
.top-toolbar {
  position: fixed;
  top: 56px;
  left: 200px;
  right: 0;
  height: 56px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 100;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workflow-name-input {
  background: transparent;
  border: 1px solid transparent;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
  padding: 8px 12px;
  border-radius: var(--radius-md);
  min-width: 200px;
  transition: all var(--transition-fast);
}

.workflow-name-input:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-subtle);
}

.workflow-name-input:focus {
  outline: none;
  background: var(--bg-surface);
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.workflow-name-input:disabled {
  color: var(--text-muted);
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tool-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-light);
}

.tool-btn.primary {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.tool-btn.primary:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.tool-btn.success {
  background: var(--success);
  color: white;
  border-color: var(--success);
}

.tool-btn.success:hover {
  background: #059669;
  border-color: #059669;
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
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
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
  background: var(--bg-hover);
  border-bottom: 1px solid var(--border-subtle);
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.dropdown-item:hover {
  background: var(--bg-hover);
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
  color: var(--error);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  opacity: 0.6;
  transition: all var(--transition-fast);
}

.delete-wf-btn:hover {
  background: var(--error-light);
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
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.new-wf-btn:hover {
  background: var(--primary);
  color: white;
}

/* 右侧属性面板 */
.sidebar {
  position: fixed;
  top: 56px;
  right: 0;
  width: 360px;
  height: calc(100% - 56px);
  background: var(--bg-surface);
  border-left: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  z-index: 200;
  box-shadow: var(--shadow-lg);
}

.sidebar-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.sidebar-title h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0 0 4px 0;
}

.node-id {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-hover);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-family: monospace;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-main);
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
  color: var(--text-secondary);
}

.hint {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

input, textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-family: inherit;
  transition: all var(--transition-fast);
  background: var(--bg-surface);
  color: var(--text-main);
}

input:focus, textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-size: 14px;
  background: var(--bg-surface);
  color: var(--text-main);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.form-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.temp-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-hover);
  appearance: none;
  cursor: pointer;
  padding: 0;
  border: none;
}

.temp-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.temp-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  border: none;
}

/* 过渡动画 */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}

/* 运行日志面板 */
.log-panel {
  position: fixed;
  bottom: -300px;
  left: 200px;
  right: 0;
  height: 280px;
  background: #1a1a1a;
  color: #eee;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  transition: bottom 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 500;
  display: flex;
  flex-direction: column;
}

.log-panel.open {
  bottom: 0;
}

.log-header {
  padding: 14px 20px;
  background: #222;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
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
  color: #fff;
}

.pulse-icon {
  width: 8px;
  height: 8px;
  background: var(--success);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--success);
}

.pulse-icon.running {
  background: var(--primary);
  box-shadow: 0 0 8px var(--primary);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.clear-btn {
  background: transparent;
  border: none;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.clear-btn:hover {
  background: #333;
  color: #fff;
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
  padding: 10px 0;
  border-bottom: 1px solid #222;
}

.log-status {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.log-status.COMPLETED {
  background: var(--success);
  box-shadow: 0 0 8px var(--success);
}

.log-status.FAILED {
  background: var(--error);
  box-shadow: 0 0 8px var(--error);
}

.log-status.RUNNING {
  background: var(--info);
  box-shadow: 0 0 8px var(--info);
  animation: pulse 1s infinite;
}

.log-info {
  flex: 1;
  display: flex;
  gap: 12px;
  min-width: 0;
}

.log-node {
  font-weight: 600;
  color: #ccc;
  font-size: 13px;
  flex-shrink: 0;
}

.log-msg {
  color: #888;
  font-size: 13px;
  font-family: 'SF Mono', Monaco, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-time {
  font-size: 11px;
  color: #555;
  flex-shrink: 0;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

/* 工作流列表视图 */
.workflow-list-view {
  position: absolute;
  top: 56px;
  left: 200px;
  right: 0;
  bottom: 0;
  padding: 48px;
  background: var(--bg-app);
  overflow-y: auto;
}

.list-header {
  margin-bottom: 40px;
}

.list-header h2 {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 8px 0;
}

.list-subtitle {
  color: var(--text-muted);
  font-size: 14px;
}

.workflow-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.workflow-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.workflow-card:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.workflow-card.active {
  background: var(--primary-light);
  border-color: var(--primary);
}

.card-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-hover);
  border-radius: var(--radius-md);
  color: var(--primary);
}

.card-content {
  flex: 1;
}

.card-content h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--text-main);
}

.card-meta {
  font-size: 13px;
  color: var(--text-muted);
}

.card-action {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.card-action:hover {
  background: var(--error-light);
  color: var(--error);
}

.empty-list {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  color: var(--text-muted);
}

.empty-list p {
  margin: 16px 0 24px;
  font-size: 15px;
}
</style>
