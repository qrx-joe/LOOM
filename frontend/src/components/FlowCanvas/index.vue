<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useWorkflowStore } from '../../store/workflow'
import { getWorkflowRunStreamUrl } from '../../config/api'
import { useWorkflowValidation } from './composables/useWorkflowValidation'
import { useWorkflowHistory } from './composables/useWorkflowHistory'
import { getNodeLabel, getDefaultNodeData } from './utils/nodeTypes'

// 子组件
import NodePropertyPanel from './components/NodePropertyPanel.vue'
import LogPanel from './components/LogPanel.vue'
import NodeResultModal from './components/NodeResultModal.vue'
import ValidationErrors from './components/ValidationErrors.vue'

const emit = defineEmits<{
  (e: 'back'): void
}>()

const store = useWorkflowStore()
const { onConnect, onNodeClick, onEdgeClick } = useVueFlow()
const { validateWorkflow } = useWorkflowValidation()
const { saveState, undo, redo, initHistory } = useWorkflowHistory()

// 状态
const selectedNode = ref<any>(null)
const selectedEdge = ref<any>(null)
const isSaving = ref(false)
const isRunning = ref(false)
const runLogs = ref<any[]>([])
const showLogPanel = ref(false)
const knowledgeBases = ref<{ id: string; name: string }[]>([])
const nodeResults = ref<Map<string, any>>(new Map())
const showNodeResultModal = ref(false)
const selectedNodeForResult = ref<any>(null)
const validationErrors = ref<string[]>([])
const showValidationErrors = ref(false)
let currentEventSource: EventSource | null = null

// 本地状态（使用 computed 绑定到 store）
const localNodes = computed({
  get: () => store.nodes,
  set: (val) => { store.nodes = val }
})

const localEdges = computed({
  get: () => store.edges,
  set: (val) => { store.edges = val }
})

// 初始化
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  fetchKnowledgeBases()
  initHistory(store.nodes, store.edges)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (currentEventSource) {
    currentEventSource.close()
    currentEventSource = null
  }
})

// 获取知识库列表
const fetchKnowledgeBases = async () => {
  try {
    const resp = await fetch('http://localhost:3001/knowledge/bases')
    const result = await resp.json()
    knowledgeBases.value = result.data || []
  } catch (err) {
    console.error('Failed to fetch knowledge bases', err)
    knowledgeBases.value = []
  }
}

// 添加节点
const addNode = (type: string) => {
  const id = `${type}-${Date.now()}`
  const newNode = {
    id,
    type,
    label: getNodeLabel(type),
    position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 100 },
    data: getDefaultNodeData(type)
  }
  localNodes.value = [...localNodes.value, newNode]
  saveState(localNodes.value, localEdges.value)
}

// 删除选中节点
const deleteSelectedNode = () => {
  if (!selectedNode.value) return
  localNodes.value = localNodes.value.filter(n => n.id !== selectedNode.value.id)
  localEdges.value = localEdges.value.filter(
    e => e.source !== selectedNode.value.id && e.target !== selectedNode.value.id
  )
  selectedNode.value = null
  saveState(localNodes.value, localEdges.value)
}

// 保存工作流
const handleSave = async () => {
  if (!store.currentWorkflowId) {
    const name = prompt('请输入工作流名称')
    if (!name) return
    store.workflowName = name
  }

  isSaving.value = true
  try {
    const payload = {
      name: store.workflowName,
      nodes: localNodes.value,
      edges: localEdges.value
    }

    if (store.currentWorkflowId) {
      await fetch(`http://localhost:3001/workflows/${store.currentWorkflowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } else {
      const resp = await fetch('http://localhost:3001/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await resp.json()
      store.currentWorkflowId = data.id
    }
    alert('保存成功')
  } catch (err) {
    alert('保存失败')
  }
  isSaving.value = false
}

// 运行工作流
const handleRun = async () => {
  const { valid, errors } = validateWorkflow(localNodes.value, localEdges.value)
  if (!valid) {
    validationErrors.value = errors
    showValidationErrors.value = true
    return
  }

  if (!store.currentWorkflowId) {
    alert('请先保存工作流')
    return
  }

  // 先获取输入
  const input = prompt('请输入测试内容')
  if (!input) return

  isRunning.value = true
  runLogs.value = []
  nodeResults.value.clear()
  showLogPanel.value = true

  // 构建 SSE URL，带上 input 参数
  const sseUrl = `${getWorkflowRunStreamUrl(store.currentWorkflowId)}?input=${encodeURIComponent(input)}`
  currentEventSource = new EventSource(sseUrl)
  const eventSource = currentEventSource

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'workflow_complete') {
        isRunning.value = false
        eventSource.close()
      } else {
        runLogs.value.push(data)
        if (data.nodeId && data.type === 'node_complete' && data.data) {
          nodeResults.value.set(data.nodeId, data.data)
        }
      }
    } catch (e) {
      console.error('Failed to parse SSE message:', e, event.data)
    }
  }

  eventSource.onerror = () => {
    isRunning.value = false
    eventSource.close()
  }
}

// 键盘快捷键
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 's':
        e.preventDefault()
        handleSave()
        break
      case 'z':
        e.preventDefault()
        if (e.shiftKey) {
          const redoState = redo()
          if (redoState) {
            localNodes.value = redoState.nodes
            localEdges.value = redoState.edges
          }
        } else {
          const undoState = undo()
          if (undoState) {
            localNodes.value = undoState.nodes
            localEdges.value = undoState.edges
          }
        }
        break
    }
  }
  if (e.key === 'Delete') {
    deleteSelectedNode()
  }
}

// 节点点击
onNodeClick((event: any) => {
  selectedNode.value = event.node
  selectedEdge.value = null
})

// 边点击
onEdgeClick((event: any) => {
  selectedEdge.value = event.edge
  selectedNode.value = null
})

// 连接节点
onConnect((connection: any) => {
  const newEdge = {
    id: `edge-${Date.now()}`,
    source: connection.source,
    target: connection.target,
    ...connection
  }
  localEdges.value = [...localEdges.value, newEdge]
  saveState(localNodes.value, localEdges.value)
})

// 更新节点数据
const updateNodeData = (data: any) => {
  if (!selectedNode.value) return
  selectedNode.value.data = { ...selectedNode.value.data, ...data }
  saveState(localNodes.value, localEdges.value)
}

// 返回
const handleBack = () => {
  emit('back')
}

// 打开节点结果弹窗
const openNodeResultModal = (node: any) => {
  selectedNodeForResult.value = node
  showNodeResultModal.value = true
}

// 获取节点运行结果
const getNodeResult = (nodeId: string) => {
  return nodeResults.value.get(nodeId)
}
</script>

<template>
  <div class="flow-canvas">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button class="btn btn-secondary" @click="handleBack">
          ← 返回
        </button>
        <h2 class="workflow-name">{{ store.workflowName || '未命名工作流' }}</h2>
      </div>

      <div class="toolbar-actions">
        <button class="btn btn-secondary" @click="handleSave" :disabled="isSaving">
          {{ isSaving ? '保存中...' : '保存' }}
        </button>
        <button
          class="btn btn-primary"
          @click="handleRun"
          :disabled="isRunning || localNodes.length === 0"
        >
          {{ isRunning ? '运行中...' : '运行' }}
        </button>
      </div>
    </div>

    <!-- 主画布区域 -->
    <div class="canvas-container">
      <!-- 左侧工具栏 -->
      <div class="sidebar-left">
        <div class="sidebar-title">组件</div>
        <div class="node-palette">
          <div class="palette-item" @click="addNode('START')">
            <div class="palette-icon start">▶</div>
            <span>开始</span>
          </div>
          <div class="palette-item" @click="addNode('KNOWLEDGE_RETRIEVAL')">
            <div class="palette-icon knowledge">📚</div>
            <span>知识检索</span>
          </div>
          <div class="palette-item" @click="addNode('AI_AGENT')">
            <div class="palette-icon ai">🤖</div>
            <span>AI 回答</span>
          </div>
          <div class="palette-item" @click="addNode('CONDITION')">
            <div class="palette-icon condition">◈</div>
            <span>条件判断</span>
          </div>
          <div class="palette-item" @click="addNode('HTTP_REQUEST')">
            <div class="palette-icon http">🌐</div>
            <span>HTTP 请求</span>
          </div>
          <div class="palette-item" @click="addNode('END')">
            <div class="palette-icon end">■</div>
            <span>结束</span>
          </div>
        </div>
      </div>

      <!-- Vue Flow 画布 -->
      <div class="flow-wrapper">
        <VueFlow
          v-model:nodes="localNodes"
          v-model:edges="localEdges"
          fit-view-on-init
          :default-zoom="1"
          :min-zoom="0.2"
          :max-zoom="4"
          @node-double-click="(event) => openNodeResultModal(event.node)"
        >
          <Background pattern-color="#e5e7eb" :gap="20" />
          <Controls />
        </VueFlow>

        <!-- 验证错误提示 -->
        <ValidationErrors
          :show="showValidationErrors"
          :errors="validationErrors"
          @close="showValidationErrors = false"
        />
      </div>

      <!-- 右侧属性面板 -->
      <div class="sidebar-right">
        <NodePropertyPanel
          :node="selectedNode"
          :knowledge-bases="knowledgeBases"
          @update="updateNodeData"
          @delete="deleteSelectedNode"
        />
      </div>
    </div>

    <!-- 底部日志面板 -->
    <LogPanel
      :show="showLogPanel"
      :logs="runLogs"
      :is-running="isRunning"
      @close="showLogPanel = false"
    />

    <!-- 节点结果弹窗 -->
    <NodeResultModal
      :show="showNodeResultModal"
      :node="selectedNodeForResult"
      :result="selectedNodeForResult ? getNodeResult(selectedNodeForResult.id) : null"
      :knowledge-bases="knowledgeBases"
      @close="showNodeResultModal = false"
    />
  </div>
</template>

<style scoped>
.flow-canvas {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f9fafb;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.workflow-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
}

.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: white;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.canvas-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar-left {
  width: 200px;
  background: white;
  border-right: 1px solid #e5e7eb;
  padding: 16px;
  overflow-y: auto;
}

.sidebar-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.node-palette {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.palette-item:hover {
  background: #f3f4f6;
  border-color: #e5e7eb;
}

.palette-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.palette-icon.start { background: #dbeafe; color: #2563eb; }
.palette-icon.knowledge { background: #fef3c7; color: #d97706; }
.palette-icon.ai { background: #dbeafe; color: #7c3aed; }
.palette-icon.condition { background: #fce7f3; color: #db2777; }
.palette-icon.http { background: #d1fae5; color: #059669; }
.palette-icon.end { background: #fee2e2; color: #dc2626; }

.palette-item span {
  font-size: 13px;
  color: #374151;
}

.flow-wrapper {
  flex: 1;
  position: relative;
}

.sidebar-right {
  width: 300px;
  background: white;
  border-left: 1px solid #e5e7eb;
  overflow-y: auto;
}
</style>
