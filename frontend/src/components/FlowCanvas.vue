<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { ref, onMounted, onUnmounted, markRaw, computed } from 'vue'
import { useWorkflowStore } from '../store/workflow'
import {
  Save, Play, Trash2,
  PlayCircle, Bot, BookOpen, GitBranch, Square,
  ArrowLeft
} from 'lucide-vue-next'
import CustomNodes from './CustomNodes.vue'

const emit = defineEmits<{
  (e: 'back'): void
}>()

const store = useWorkflowStore()
const { onConnect, onNodeClick, onEdgeClick, project, onNodesChange, onEdgesChange } = useVueFlow()

const selectedNode = ref<any>(null)
const selectedEdge = ref<any>(null)
const isSaving = ref(false)
const isRunning = ref(false)
const runLogs = ref<any[]>([])
const showLogPanel = ref(false)

// 直接使用 computed 绑定 store 数据，确保撤销/重做同步
const localNodes = computed({
  get: () => store.nodes,
  set: (val) => { store.nodes = val }
})
const localEdges = computed({
  get: () => store.edges,
  set: (val) => { store.edges = val }
})

// 节点类型定义
const nodeTypes = [
  { type: 'input', label: '开始', icon: 'PlayCircle', color: '#10B981' },
  { type: 'AI_AGENT', label: 'AI 节点', icon: 'Bot', color: '#4776F6' },
  { type: 'KNOWLEDGE_RETRIEVAL', label: '知识检索', icon: 'BookOpen', color: '#F59E0B' },
  { type: 'CONDITION', label: '条件分支', icon: 'GitBranch', color: '#EC4899' },
  { type: 'output', label: '结束', icon: 'Square', color: '#EF4444' },
]

// Vue Flow 节点类型映射
const flowNodeTypes = {
  input: markRaw(CustomNodes),
  output: markRaw(CustomNodes),
  AI_AGENT: markRaw(CustomNodes),
  KNOWLEDGE_RETRIEVAL: markRaw(CustomNodes),
  CONDITION: markRaw(CustomNodes),
  START: markRaw(CustomNodes),
  END: markRaw(CustomNodes),
  INPUT: markRaw(CustomNodes),
  OUTPUT: markRaw(CustomNodes),
}

// 监听边的点击
onEdgeClick((event) => {
  selectedEdge.value = event.edge
  selectedNode.value = null
})

// 监听节点点击
onNodeClick((event) => {
  selectedNode.value = event.node
  selectedEdge.value = null
})

// 监听连接
onConnect((params) => {
  const newEdge = {
    id: `edge-${Date.now()}`,
    source: params.source,
    target: params.target,
    sourceHandle: params.sourceHandle || undefined,
    targetHandle: params.targetHandle || undefined,
  }
  store.edges = [...store.edges, newEdge]
  store.saveHistory()
})

// 监听节点变化（移动等）
onNodesChange((changes) => {
  const hasPositionChange = changes.some(c => c.type === 'position' && c.dragging === false)
  if (hasPositionChange) {
    store.saveHistory()
  }
})

// 监听边变化
onEdgesChange(() => {
  // 边的变化通常由连接操作处理
})

// 键盘事件
const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    store.undo()
    return
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault()
    store.redo()
    return
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
      return
    }
    deleteSelected()
  }
}

// 删除选中
const deleteSelected = () => {
  if (selectedNode.value) {
    store.nodes = store.nodes.filter(n => n.id !== selectedNode.value.id)
    store.saveHistory()
    selectedNode.value = null
  } else if (selectedEdge.value) {
    store.edges = store.edges.filter(e => e.id !== selectedEdge.value.id)
    store.saveHistory()
    selectedEdge.value = null
  }
}

// 初始化
onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

// 获取图标组件
const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = { PlayCircle, Bot, BookOpen, GitBranch, Square }
  return icons[iconName] || Square
}

// 获取节点默认数据
const getDefaultNodeData = (type: string): any => {
  switch (type) {
    case 'AI_AGENT':
      return { nodeType: 'AI_AGENT', prompt: '基于上下文回答问题：\n{{START_INPUT}}', model: 'deepseek-ai/DeepSeek-V3', temperature: 0.7 }
    case 'KNOWLEDGE_RETRIEVAL':
      return { nodeType: 'KNOWLEDGE_RETRIEVAL', kbId: '', query: '{{START_INPUT}}' }
    case 'CONDITION':
      return { nodeType: 'CONDITION', expression: '' }
    default:
      return {}
  }
}

// 拖放处理
const onDragStart = (e: DragEvent, nodeType: string) => {
  if (e.dataTransfer) {
    e.dataTransfer.setData('application/node-type', nodeType)
    e.dataTransfer.effectAllowed = 'copy'
  }
}

const onDrop = (e: DragEvent) => {
  e.preventDefault()
  const nodeType = e.dataTransfer?.getData('application/node-type')
  if (!nodeType) return

  const canvas = document.querySelector('.flow-canvas')
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const position = project({
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  })

  const newNode = {
    id: `node-${Date.now()}`,
    type: nodeType,
    label: nodeTypes.find(n => n.type === nodeType)?.label || '新节点',
    position,
    data: getDefaultNodeData(nodeType),
  }

  store.nodes = [...store.nodes, newNode]
  store.saveHistory()
  selectedNode.value = newNode
}

const onDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

// 保存
const handleSave = async () => {
  isSaving.value = true
  try {
    await store.saveWorkflow()
    alert('保存成功')
  } catch (e) {
    alert('保存失败')
  } finally {
    isSaving.value = false
  }
}

// 运行（先保存再运行）
const handleRun = async () => {
  // 先保存
  isSaving.value = true
  try {
    await store.saveWorkflow()
  } catch (e) {
    alert('保存失败，无法运行')
    isSaving.value = false
    return
  }
  isSaving.value = false

  if (!store.currentWorkflowId) {
    alert('请先保存工作流')
    return
  }

  isRunning.value = true
  runLogs.value = []
  showLogPanel.value = true

  const sseUrl = `http://localhost:3001/workflows/${store.currentWorkflowId}/run-stream`
  const eventSource = new EventSource(sseUrl)

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'workflow_complete') {
        isRunning.value = false
      } else {
        runLogs.value.push(data)
      }
    } catch (e) {}
  }

  eventSource.onerror = () => {
    isRunning.value = false
    eventSource.close()
  }
}

// 属性修改时保存历史
const onPropertyChange = () => {
  store.saveHistory()
}

// 返回列表
const handleBack = () => {
  emit('back')
}
</script>

<template>
  <div class="flow-editor">
    <!-- 顶部工具栏 -->
    <header class="editor-header">
      <div class="header-left">
        <button class="back-btn" @click="handleBack" title="返回列表">
          <ArrowLeft :size="18" />
          <span class="back-text">返回</span>
        </button>
        <input
          v-model="store.workflowName"
          class="workflow-name-input"
          placeholder="工作流名称..."
        />
      </div>

      <div class="header-center">
        <button class="tool-btn" @click="store.undo()" :disabled="!store.canUndo()" title="撤销">
          <span class="btn-icon">↩</span>
        </button>
        <button class="tool-btn" @click="store.redo()" :disabled="!store.canRedo()" title="重做">
          <span class="btn-icon">↪</span>
        </button>
        <button
          class="tool-btn"
          :class="{ danger: selectedNode || selectedEdge }"
          @click="deleteSelected"
          :disabled="!selectedNode && !selectedEdge"
          title="删除"
        >
          <Trash2 :size="16" />
        </button>
      </div>

      <div class="header-right">
        <button class="tool-btn" @click="handleSave" :disabled="isSaving">
          <Save :size="16" />
          {{ isSaving ? '保存中...' : '保存' }}
        </button>
        <button class="tool-btn primary" @click="handleRun" :disabled="isRunning">
          <Play :size="16" />
          {{ isRunning ? '运行中...' : '运行' }}
        </button>
      </div>
    </header>

    <!-- 主体区域 -->
    <div class="editor-body">
      <!-- 左侧节点面板 -->
      <aside class="node-palette">
        <div class="palette-title">节点</div>
        <div
          v-for="node in nodeTypes"
          :key="node.type"
          class="palette-item"
          :style="{ borderLeftColor: node.color }"
          draggable="true"
          @dragstart="onDragStart($event, node.type)"
          @dragover="onDragOver"
        >
          <component :is="getIconComponent(node.icon)" :size="16" :style="{ color: node.color }" />
          <span>{{ node.label }}</span>
        </div>
      </aside>

      <!-- 画布 -->
      <main class="flow-canvas" @drop="onDrop" @dragover="onDragOver">
        <VueFlow
          v-model:nodes="localNodes"
          v-model:edges="localEdges"
          :node-types="flowNodeTypes"
          fit-view-on-init
          :default-edge-options="{ type: 'smoothstep', style: { stroke: '#9CA3AF', strokeWidth: 2 } }"
          class="vue-flow"
        >
          <Background pattern-color="#E5E7EB" :gap="20" />
          <Controls />
        </VueFlow>
      </main>

      <!-- 右侧属性面板 -->
      <aside class="property-panel" :class="{ open: selectedNode || selectedEdge }">
        <div class="panel-header">
          <h3>{{ selectedEdge ? '连线配置' : '节点配置' }}</h3>
          <button class="close-btn" @click="selectedNode = null; selectedEdge = null">
            ×
          </button>
        </div>
        <div class="panel-content">
          <template v-if="selectedNode">
            <div class="form-group">
              <label>名称</label>
              <input v-model="selectedNode.label" @change="onPropertyChange" />
            </div>
            <template v-if="selectedNode.type === 'AI_AGENT' || selectedNode.data?.nodeType === 'AI_AGENT'">
              <div class="form-group">
                <label>Prompt</label>
                <textarea v-model="selectedNode.data.prompt" rows="6" @change="onPropertyChange"></textarea>
              </div>
              <div class="form-group">
                <label>模型</label>
                <select v-model="selectedNode.data.model" @change="onPropertyChange">
                  <option value="deepseek-ai/DeepSeek-V3">DeepSeek V3</option>
                  <option value="deepseek-ai/DeepSeek-R1">DeepSeek R1</option>
                </select>
              </div>
              <div class="form-group">
                <label>温度</label>
                <input type="number" v-model="selectedNode.data.temperature" min="0" max="2" step="0.1" @change="onPropertyChange" />
              </div>
            </template>
            <template v-if="selectedNode.type === 'KNOWLEDGE_RETRIEVAL' || selectedNode.data?.nodeType === 'KNOWLEDGE_RETRIEVAL'">
              <div class="form-group">
                <label>查询模板</label>
                <input v-model="selectedNode.data.query" @change="onPropertyChange" placeholder="{{START_INPUT}}" />
              </div>
            </template>
            <template v-if="selectedNode.type === 'CONDITION' || selectedNode.data?.nodeType === 'CONDITION'">
              <div class="form-group">
                <label>条件表达式</label>
                <input v-model="selectedNode.data.expression" placeholder="e.g. score > 10" @change="onPropertyChange" />
              </div>
            </template>
          </template>
          <template v-if="selectedEdge">
            <div class="form-group">
              <label>条件</label>
              <select v-model="selectedEdge.condition" @change="onPropertyChange">
                <option value="">无条件</option>
                <option value="true">为 true 时</option>
                <option value="false">为 false 时</option>
              </select>
            </div>
          </template>
        </div>
      </aside>
    </div>

    <!-- 日志面板 -->
    <div class="log-panel" :class="{ open: showLogPanel }">
      <div class="log-header">
        <span>运行日志</span>
        <button @click="showLogPanel = false">×</button>
      </div>
      <div class="log-content">
        <div v-for="(log, i) in runLogs" :key="i" class="log-item">
          <span class="log-type">{{ log.type }}</span>
          <span class="log-msg">{{ log.data?.output || log.data?.error || '' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flow-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-app);
}

/* 顶部头部 */
.editor-header {
  height: 56px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  height: 36px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.back-btn:hover {
  background: var(--bg-hover);
  border-color: var(--primary);
  color: var(--primary);
}

.back-text {
  display: none;
}

@media (min-width: 768px) {
  .back-text {
    display: inline;
  }
}

.workflow-name-input {
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 500;
  background: transparent;
  min-width: 200px;
}

.workflow-name-input:hover {
  background: var(--bg-hover);
}

.workflow-name-input:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--bg-surface);
}

.header-center {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}

.tool-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-btn.danger:hover {
  border-color: var(--error);
  color: var(--error);
}

.tool-btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.tool-btn.primary:hover {
  background: var(--primary-hover);
}

/* 主体区域 */
.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

/* 节点面板 */
.node-palette {
  width: 180px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  padding: 16px 12px;
  flex-shrink: 0;
}

.palette-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 12px;
  padding-left: 4px;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-left: 3px solid;
  background: var(--bg-hover);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--text-main);
  cursor: grab;
  transition: all 0.15s;
}

.palette-item:hover {
  background: var(--bg-active);
  transform: translateX(2px);
}

.palette-item:active {
  cursor: grabbing;
}

/* 画布 */
.flow-canvas {
  flex: 1;
  position: relative;
}

.vue-flow {
  width: 100%;
  height: 100%;
}

.vue-flow :deep(.vue-flow__node) {
  cursor: pointer;
}

.vue-flow :deep(.vue-flow__edge) {
  cursor: pointer;
}

/* 属性面板 */
.property-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.2s;
  z-index: 100;
}

.property-panel.open {
  transform: translateX(0);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.panel-header h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  font-size: 20px;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-main);
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-size: 13px;
  background: var(--bg-surface);
  color: var(--text-main);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

/* 日志面板 */
.log-panel {
  position: fixed;
  bottom: -300px;
  left: 180px;
  right: 0;
  height: 280px;
  background: #1a1a1a;
  color: #eee;
  transition: bottom 0.3s;
  z-index: 100;
}

.log-panel.open {
  bottom: 0;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #222;
  font-size: 13px;
  font-weight: 500;
}

.log-header button {
  background: transparent;
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
}

.log-content {
  padding: 12px 16px;
  overflow-y: auto;
  max-height: 240px;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #333;
  font-size: 12px;
}

.log-type {
  color: #888;
  font-weight: 500;
}
</style>
