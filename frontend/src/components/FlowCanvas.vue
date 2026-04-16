<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/controls/dist/style.css'
import { ref, onMounted, onUnmounted, markRaw, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkflowStore } from '../store/workflow'
import { getWorkflowRunStreamUrl, getKnowledgeBasesUrl } from '../config/api'
import axios from 'axios'
import {
  Save, Play, Trash2,
  PlayCircle, Bot, BookOpen, GitBranch, Square,
  ArrowLeft, FolderOpen, AlertCircle, Globe
} from 'lucide-vue-next'
import CustomNodes from './CustomNodes.vue'

const router = useRouter()

const store = useWorkflowStore()
const { onConnect, onNodeClick, onEdgeClick, project, onNodesChange } = useVueFlow()

const selectedNode = ref<any>(null)
const selectedEdge = ref<any>(null)
const isSaving = ref(false)
const isRunning = ref(false)
const runLogs = ref<any[]>([])
const showLogPanel = ref(false)
const knowledgeBases = ref<{ id: string; name: string }[]>([])
let currentEventSource: EventSource | null = null

// ID 生成器 - 使用递增计数器 + 时间戳 + 随机数确保唯一性
let nodeIdCounter = 0
let edgeIdCounter = 0
const generateNodeId = () => `node-${++nodeIdCounter}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
const generateEdgeId = () => `edge-${++edgeIdCounter}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`

// 节点运行结果预览
const nodeResults = ref<Map<string, any>>(new Map())
const showNodeResultModal = ref(false)
const selectedNodeForResult = ref<any>(null)

// 打开节点运行结果弹窗
const openNodeResultModal = (node: any) => {
  selectedNodeForResult.value = node
  showNodeResultModal.value = true
}

// 关闭节点运行结果弹窗
const closeNodeResultModal = () => {
  showNodeResultModal.value = false
  selectedNodeForResult.value = null
}

// 获取节点的运行结果
const getNodeResult = (nodeId: string) => {
  return nodeResults.value.get(nodeId)
}

// 获取知识库列表
const fetchKnowledgeBases = async () => {
  try {
    const resp = await axios.get(getKnowledgeBasesUrl())
    knowledgeBases.value = resp.data?.data || []
  } catch (err) {
    console.error('Failed to fetch knowledge bases', err)
    knowledgeBases.value = []
  }
}

// 根据知识库ID获取名称
const getKnowledgeBaseName = (kbId: string) => {
  if (!kbId) return ''
  const kb = knowledgeBases.value.find(k => k.id === kbId)
  return kb?.name || kbId
}

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
  { type: 'HTTP_REQUEST', label: 'HTTP 请求', icon: 'Globe', color: '#8B5CF6' },
  { type: 'CONDITION', label: '条件分支', icon: 'GitBranch', color: '#EC4899' },
  { type: 'output', label: '结束', icon: 'Square', color: '#EF4444' },
]

// Vue Flow 节点类型映射
const flowNodeTypes = {
  input: markRaw(CustomNodes),
  output: markRaw(CustomNodes),
  AI_AGENT: markRaw(CustomNodes),
  KNOWLEDGE_RETRIEVAL: markRaw(CustomNodes),
  HTTP_REQUEST: markRaw(CustomNodes),
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
    id: generateEdgeId(),
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
  fetchKnowledgeBases()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (currentEventSource) {
    currentEventSource.close()
    currentEventSource = null
  }
})

// 获取图标组件
const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = { PlayCircle, Bot, BookOpen, GitBranch, Square, Globe }
  return icons[iconName] || Square
}

// 获取节点默认数据
const getDefaultNodeData = (type: string): any => {
  switch (type) {
    case 'AI_AGENT':
      return { nodeType: 'AI_AGENT', prompt: '基于上下文回答问题：\n{{START_INPUT}}', model: 'deepseek-ai/DeepSeek-V3', temperature: 0.7 }
    case 'KNOWLEDGE_RETRIEVAL':
      return { nodeType: 'KNOWLEDGE_RETRIEVAL', kbId: '', query: '{{START_INPUT}}' }
    case 'HTTP_REQUEST':
      return { nodeType: 'HTTP_REQUEST', url: '', method: 'GET', headers: {}, body: '', timeout: 30000, retryCount: 0, retryDelay: 1000 }
    case 'CONDITION':
      return { nodeType: 'CONDITION', expression: '' }
    default:
      return {}
  }
}

// 点击添加节点
const handleAddNode = (nodeType: string) => {
  // 计算画布中央位置
  const canvas = document.querySelector('.flow-canvas')
  let position = { x: 300, y: 200 }

  if (canvas) {
    const rect = canvas.getBoundingClientRect()
    const center = project({
      x: rect.width / 2,
      y: rect.height / 2,
    })
    // 添加随机偏移避免重叠
    position = {
      x: center.x + (Math.random() - 0.5) * 100,
      y: center.y + (Math.random() - 0.5) * 100,
    }
  }

  const newNode = {
    id: generateNodeId(),
    type: nodeType,
    label: nodeTypes.find(n => n.type === nodeType)?.label || '新节点',
    position,
    data: getDefaultNodeData(nodeType),
  }

  store.nodes = [...store.nodes, newNode]
  store.saveHistory()
  selectedNode.value = newNode
}

// 保存
const handleSave = async () => {
  isSaving.value = true
  try {
    await store.saveWorkflow()
    alert('保存成功')
  } catch {
    alert('保存失败')
  } finally {
    isSaving.value = false
  }
}

// 运行（先保存再运行）
const handleRun = async () => {
  // 验证工作流
  const validation = validateWorkflow()
  if (!validation.valid) {
    alert('工作流验证失败：\n' + validation.errors.join('\n'))
    return
  }

  // 先保存
  isSaving.value = true
  try {
    await store.saveWorkflow()
  } catch {
    alert('保存失败，无法运行')
    isSaving.value = false
    return
  }
  isSaving.value = false

  if (!store.currentWorkflowId) {
    alert('请先保存工作流')
    return
  }

  // 关闭之前的 SSE 连接（如果有）
  if (currentEventSource) {
    currentEventSource.close()
    currentEventSource = null
  }

  isRunning.value = true
  runLogs.value = []
  nodeResults.value.clear() // 清空之前的运行结果
  showLogPanel.value = true

  const sseUrl = getWorkflowRunStreamUrl(store.currentWorkflowId)
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
        // 收集节点运行结果
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

// 属性修改时保存历史
const onPropertyChange = () => {
  store.saveHistory()
}

// 工作流验证
const validateWorkflow = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = []
  const nodes = store.nodes
  const edges = store.edges

  // 检查节点数量
  if (nodes.length === 0) {
    errors.push('工作流没有任何节点')
    return { valid: false, errors }
  }

  // 检查开始节点
  const inputNodes = nodes.filter(n => n.type === 'input' || n.type === 'START' || n.type === 'INPUT')
  if (inputNodes.length === 0) {
    errors.push('缺少开始节点')
  } else if (inputNodes.length > 1) {
    errors.push('只能有一个开始节点')
  }

  // 检查结束节点
  const outputNodes = nodes.filter(n => n.type === 'output' || n.type === 'END' || n.type === 'OUTPUT')
  if (outputNodes.length === 0) {
    errors.push('缺少结束节点')
  } else if (outputNodes.length > 1) {
    errors.push('只能有一个结束节点')
  }

  // 检查孤立节点（没有连接的节点）
  const sourceIds = new Set<string>(edges.map(e => e.source))
  const targetIds = new Set<string>(edges.map(e => e.target))

  const isolatedNodes = nodes.filter(n => {
    const hasSource = sourceIds.has(n.id)
    const hasTarget = targetIds.has(n.id)

    // 开始节点：必须有出边（是某个 edge 的 source）
    if (n.type === 'START' || n.type === 'input') {
      return !hasSource
    }
    // 结束节点：必须有入边（是某个 edge 的 target）
    if (n.type === 'END' || n.type === 'output') {
      return !hasTarget
    }
    // 其他节点：必须有入边和出边
    return !hasSource || !hasTarget
  })

  if (isolatedNodes.length > 0) {
    const nodeNames = isolatedNodes.map(n => n.label || n.type).join('、')
    errors.push(`孤立节点: ${nodeNames}`)
  }

  // 检查 AI 节点是否有 prompt
  const aiNodes = nodes.filter(n => n.type === 'AI_AGENT' || n.data?.nodeType === 'AI_AGENT')
  aiNodes.forEach(node => {
    if (!node.data?.prompt) {
      errors.push(`节点"${node.label}"缺少 Prompt 配置`)
    }
  })

  // 检查知识检索节点是否选择了知识库
  const knowledgeNodes = nodes.filter(n => n.type === 'KNOWLEDGE_RETRIEVAL' || n.data?.nodeType === 'KNOWLEDGE_RETRIEVAL')
  knowledgeNodes.forEach(node => {
    if (!node.data?.kbId) {
      errors.push(`节点"${node.label}"未选择知识库`)
    }
  })

  // 检查 HTTP 请求节点是否配置了 URL
  const httpNodes = nodes.filter(n => n.type === 'HTTP_REQUEST' || n.data?.nodeType === 'HTTP_REQUEST')
  httpNodes.forEach(node => {
    if (!node.data?.url || node.data.url.trim() === '') {
      errors.push(`节点"${node.label}"未配置请求 URL`)
    }
  })

  return { valid: errors.length === 0, errors }
}

// 日志相关函数
const formatLogTime = (timestamp?: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const formatLogMessage = (log: any) => {
  if (log.data?.error) return `错误: ${log.data.error}`
  if (log.data?.output) {
    const output = log.data.output
    if (typeof output === 'string') return output.slice(0, 200)
    return JSON.stringify(output).slice(0, 200)
  }
  return ''
}

const getLogClass = (log: any) => {
  if (log.type === 'workflow_complete') {
    return log.data?.status === 'error' ? 'log-error' : 'log-success'
  }
  if (log.data?.error) return 'log-error'
  return ''
}

// 返回列表
const handleBack = () => {
  if (store.hasUnsavedChanges) {
    if (!confirm('有未保存的修改，确定要离开吗？')) {
      return
    }
  }
  router.push('/workflow')
}
</script>

<template>
  <div class="flow-editor">
    <!-- 顶部工具栏 -->
    <header class="editor-header">
      <div class="header-left">
        <button class="back-btn" title="返回列表" @click="handleBack">
          <ArrowLeft :size="18" />
          <span class="back-text">返回</span>
        </button>
        <input
          v-model="store.workflowName"
          class="workflow-name-input"
          placeholder="工作流名称..."
          @change="store.hasUnsavedChanges = true"
        />
      </div>

      <div class="header-center">
        <button class="tool-btn" :disabled="!store.canUndo()" title="撤销" @click="store.undo()">
          <span class="btn-icon">↩</span>
        </button>
        <button class="tool-btn" :disabled="!store.canRedo()" title="重做" @click="store.redo()">
          <span class="btn-icon">↪</span>
        </button>
        <button
          class="tool-btn"
          :class="{ danger: selectedNode || selectedEdge }"
          :disabled="!selectedNode && !selectedEdge"
          title="删除"
          @click="deleteSelected"
        >
          <Trash2 :size="16" />
        </button>
      </div>

      <div class="header-right">
        <button class="tool-btn" :disabled="isSaving" @click="handleSave">
          <Save :size="16" />
          {{ isSaving ? '保存中...' : '保存' }}
        </button>
        <button class="tool-btn primary" :disabled="isRunning" @click="handleRun">
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
        <div class="palette-hint">点击添加到画布</div>
        <div
          v-for="node in nodeTypes"
          :key="node.type"
          class="palette-item"
          :style="{ borderLeftColor: node.color }"
          @click="handleAddNode(node.type)"
        >
          <component :is="getIconComponent(node.icon)" :size="16" :style="{ color: node.color }" />
          <span>{{ node.label }}</span>
        </div>
      </aside>

      <!-- 画布 -->
      <main class="flow-canvas">
        <VueFlow
          v-model:nodes="localNodes"
          v-model:edges="localEdges"
          :node-types="flowNodeTypes"
          fit-view-on-init
          :default-edge-options="{ type: 'smoothstep', style: { stroke: '#9CA3AF', strokeWidth: 2 } }"
          class="vue-flow"
          @node-double-click="(event) => openNodeResultModal(event.node)"
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
                <input v-model="selectedNode.data.temperature" type="number" min="0" max="2" step="0.1" @change="onPropertyChange" />
              </div>
            </template>
            <template v-if="selectedNode.type === 'KNOWLEDGE_RETRIEVAL' || selectedNode.data?.nodeType === 'KNOWLEDGE_RETRIEVAL'">
              <div class="form-group">
                <label>知识库</label>
                <select v-model="selectedNode.data.kbId" @change="onPropertyChange">
                  <option value="">请选择知识库</option>
                  <option v-for="kb in knowledgeBases" :key="kb.id" :value="kb.id">
                    {{ kb.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>查询模板</label>
                <input v-model="selectedNode.data.query" :placeholder="'{{START_INPUT}}'" @change="onPropertyChange" />
              </div>
            </template>
            <template v-if="selectedNode.type === 'CONDITION' || selectedNode.data?.nodeType === 'CONDITION'">
              <div class="form-group">
                <label>条件表达式</label>
                <input v-model="selectedNode.data.expression" placeholder="e.g. score > 10" @change="onPropertyChange" />
              </div>
            </template>
            <template v-if="selectedNode.type === 'HTTP_REQUEST' || selectedNode.data?.nodeType === 'HTTP_REQUEST'">
              <div class="form-group">
                <label>请求 URL</label>
                <input v-model="selectedNode.data.url" placeholder="https://api.example.com/data" @change="onPropertyChange" />
              </div>
              <div class="form-group">
                <label>请求方法</label>
                <select v-model="selectedNode.data.method" @change="onPropertyChange">
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                  <option value="HEAD">HEAD</option>
                </select>
              </div>
              <div class="form-group">
                <label>请求头 (JSON)</label>
                <textarea v-model="selectedNode.data.headers" rows="3" placeholder='{"Content-Type": "application/json"}' @change="onPropertyChange"></textarea>
              </div>
              <div v-if="selectedNode.data.method !== 'GET' && selectedNode.data.method !== 'HEAD'" class="form-group">
                <label>请求体</label>
                <textarea v-model="selectedNode.data.body" rows="4" placeholder='{"key": "value"} 或原始文本' @change="onPropertyChange"></textarea>
              </div>
              <div class="form-group">
                <label>超时时间 (毫秒)</label>
                <input v-model="selectedNode.data.timeout" type="number" min="1000" max="120000" step="1000" @change="onPropertyChange" />
              </div>
              <div class="form-group">
                <label>重试次数</label>
                <input v-model="selectedNode.data.retryCount" type="number" min="0" max="5" step="1" @change="onPropertyChange" />
              </div>
              <div class="form-group">
                <label>重试延迟 (毫秒)</label>
                <input v-model="selectedNode.data.retryDelay" type="number" min="0" max="10000" step="500" @change="onPropertyChange" />
              </div>
              <div class="form-hint">
                <p v-pre>支持变量插值：{{START_INPUT}}、{{nodeId.output}}</p>
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
        <div class="log-actions">
          <button class="log-clear-btn" :disabled="runLogs.length === 0" @click="runLogs = []">
            清空
          </button>
          <button class="log-close-btn" @click="showLogPanel = false">×</button>
        </div>
      </div>
      <div class="log-content">
        <div v-if="runLogs.length === 0" class="log-empty">
          暂无日志
        </div>
        <div v-for="(log, i) in runLogs" :key="i" class="log-item" :class="getLogClass(log)">
          <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
          <span class="log-node">{{ log.nodeId || 'workflow' }}</span>
          <span class="log-type">{{ log.type }}</span>
          <span class="log-msg">{{ formatLogMessage(log) }}</span>
        </div>
      </div>
    </div>

    <!-- 节点运行结果弹窗 -->
    <div v-if="showNodeResultModal && selectedNodeForResult" class="node-result-modal" @click.self="closeNodeResultModal">
      <div class="node-result-content">
        <div class="node-result-header">
          <h3>节点运行结果 - {{ selectedNodeForResult.label || selectedNodeForResult.type }}</h3>
          <button class="close-btn" @click="closeNodeResultModal">×</button>
        </div>
        <div class="node-result-body">
          <!-- 知识检索节点特殊展示 -->
          <template v-if="selectedNodeForResult.type === 'KNOWLEDGE_RETRIEVAL' || selectedNodeForResult.data?.nodeType === 'KNOWLEDGE_RETRIEVAL'">
            <div class="result-section">
              <h4>检索配置</h4>
              <div class="config-info">
                <p><strong>知识库：</strong>{{ getKnowledgeBaseName(selectedNodeForResult.data?.kbId) || '未配置' }}</p>
                <p><strong>查询：</strong><span v-html="selectedNodeForResult.data?.query || '&#123;&#123;START_INPUT&#125;&#125;'"></span></p>
              </div>
            </div>
            <div v-if="getNodeResult(selectedNodeForResult.id)" class="result-section">
              <h4>检索结果</h4>
              <div v-if="getNodeResult(selectedNodeForResult.id)?.fragments?.length > 0" class="fragments-list">
                <div v-for="(fragment, idx) in getNodeResult(selectedNodeForResult.id).fragments" :key="idx" class="fragment-card">
                  <div class="fragment-header">
                    <span class="fragment-score">匹配度: {{ (fragment.score * 100).toFixed(1) }}%</span>
                    <span class="fragment-doc">{{ fragment.documentName }}</span>
                  </div>
                  <div class="fragment-content">{{ fragment.content }}</div>
                </div>
              </div>
              <div v-else-if="getNodeResult(selectedNodeForResult.id)?.error" class="error-message">
                <AlertCircle :size="16" />
                <span>{{ getNodeResult(selectedNodeForResult.id).error }}</span>
              </div>
              <div v-else class="empty-result">
                <FolderOpen :size="32" />
                <p>未检索到相关文档</p>
              </div>
            </div>
            <div v-else class="no-result">
              <p>暂无运行结果，请先运行工作流</p>
            </div>
          </template>

          <!-- HTTP 请求节点展示 -->
          <template v-else-if="selectedNodeForResult.type === 'HTTP_REQUEST' || selectedNodeForResult.data?.nodeType === 'HTTP_REQUEST'">
            <div class="result-section">
              <h4>请求配置</h4>
              <div class="config-info">
                <p><strong>URL：</strong>{{ selectedNodeForResult.data?.url || '未配置' }}</p>
                <p><strong>方法：</strong>{{ selectedNodeForResult.data?.method || 'GET' }}</p>
                <p><strong>超时：</strong>{{ selectedNodeForResult.data?.timeout || 30000 }}ms</p>
              </div>
            </div>
            <div v-if="getNodeResult(selectedNodeForResult.id)" class="result-section">
              <h4>响应结果</h4>
              <div v-if="getNodeResult(selectedNodeForResult.id)?.data" class="output-content">
                <p><strong>状态码：</strong>
                  <span :class="getNodeResult(selectedNodeForResult.id).success ? 'status-success' : 'status-error'">
                    {{ getNodeResult(selectedNodeForResult.id).status }}
                  </span>
                </p>
                <pre class="json-output">{{ JSON.stringify(getNodeResult(selectedNodeForResult.id).data, null, 2) }}</pre>
              </div>
              <div v-else-if="getNodeResult(selectedNodeForResult.id)?.error" class="error-message">
                <AlertCircle :size="16" />
                <span>{{ getNodeResult(selectedNodeForResult.id).error }}</span>
              </div>
              <div v-else class="empty-result">
                <p>无响应数据</p>
              </div>
            </div>
            <div v-else class="no-result">
              <p>暂无运行结果，请先运行工作流</p>
            </div>
          </template>

          <!-- AI 节点展示 -->
          <template v-else-if="selectedNodeForResult.type === 'AI_AGENT' || selectedNodeForResult.data?.nodeType === 'AI_AGENT'">
            <div class="result-section">
              <h4>AI 配置</h4>
              <div class="config-info">
                <p><strong>模型：</strong>{{ selectedNodeForResult.data?.model || 'DeepSeek V3' }}</p>
                <p><strong>温度：</strong>{{ selectedNodeForResult.data?.temperature ?? 0.7 }}</p>
              </div>
            </div>
            <div v-if="getNodeResult(selectedNodeForResult.id)" class="result-section">
              <h4>输出结果</h4>
              <div v-if="getNodeResult(selectedNodeForResult.id)?.output" class="output-content">
                {{ typeof getNodeResult(selectedNodeForResult.id).output === 'string'
                   ? getNodeResult(selectedNodeForResult.id).output
                   : JSON.stringify(getNodeResult(selectedNodeForResult.id).output, null, 2) }}
              </div>
              <div v-else-if="getNodeResult(selectedNodeForResult.id)?.error" class="error-message">
                <AlertCircle :size="16" />
                <span>{{ getNodeResult(selectedNodeForResult.id).error }}</span>
              </div>
              <div v-else class="empty-result">
                <p>无输出</p>
              </div>
            </div>
            <div v-else class="no-result">
              <p>暂无运行结果，请先运行工作流</p>
            </div>
          </template>

          <!-- 其他节点通用展示 -->
          <template v-else>
            <div v-if="getNodeResult(selectedNodeForResult.id)" class="result-section">
              <h4>运行结果</h4>
              <pre class="json-output">{{ JSON.stringify(getNodeResult(selectedNodeForResult.id), null, 2) }}</pre>
            </div>
            <div v-else class="no-result">
              <p>暂无运行结果，请先运行工作流</p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flow-editor {
  height: 100%;
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
  margin-bottom: 4px;
  padding-left: 4px;
}

.palette-hint {
  font-size: 11px;
  color: var(--text-muted);
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
  cursor: pointer;
  transition: all 0.15s;
}

.palette-item:hover {
  background: var(--bg-active);
  transform: translateX(2px);
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
  bottom: -320px;
  left: 180px;
  right: 0;
  height: 300px;
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

.log-actions {
  display: flex;
  gap: 8px;
}

.log-clear-btn {
  background: transparent;
  border: 1px solid #444;
  color: #888;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.log-clear-btn:hover:not(:disabled) {
  border-color: #666;
  color: #fff;
}

.log-clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.log-close-btn {
  background: transparent;
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
}

.log-close-btn:hover {
  color: #fff;
}

.log-content {
  padding: 12px 16px;
  overflow-y: auto;
  max-height: 256px;
}

.log-empty {
  color: #666;
  text-align: center;
  padding: 40px;
  font-size: 13px;
}

.log-item {
  display: grid;
  grid-template-columns: 70px 100px 120px 1fr;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #333;
  font-size: 12px;
  align-items: start;
}

.log-item.log-error {
  background: rgba(239, 68, 68, 0.1);
  margin: 0 -16px;
  padding: 8px 16px;
}

.log-item.log-success {
  background: rgba(16, 185, 129, 0.1);
  margin: 0 -16px;
  padding: 8px 16px;
}

.log-time {
  color: #666;
  font-family: monospace;
}

.log-node {
  color: #4776F6;
}

.log-type {
  color: #888;
  font-weight: 500;
}

.log-msg {
  color: #ccc;
  word-break: break-word;
}

.log-error .log-type {
  color: #EF4444;
}

.log-success .log-type {
  color: #10B981;
}

/* 节点运行结果弹窗 */
.node-result-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.node-result-content {
  background: var(--bg-surface);
  border-radius: 16px;
  width: 100%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
}

.node-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-subtle);
}

.node-result-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-main);
}

.node-result-body {
  padding: 24px;
  overflow-y: auto;
  max-height: 60vh;
}

.result-section {
  margin-bottom: 24px;
}

.result-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 600;
}

.config-info {
  background: var(--bg-app);
  padding: 16px;
  border-radius: 8px;
}

.config-info p {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: var(--text-main);
}

.config-info p:last-child {
  margin-bottom: 0;
}

.fragments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fragment-card {
  background: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 16px;
}

.fragment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.fragment-score {
  background: var(--primary-light);
  color: var(--primary);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.fragment-doc {
  font-size: 12px;
  color: var(--text-muted);
}

.fragment-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-main);
  background: white;
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid var(--primary);
}

.output-content {
  background: var(--bg-app);
  padding: 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.json-output {
  background: var(--bg-app);
  padding: 16px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--error);
  background: var(--error-light);
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
}

.empty-result {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.empty-result svg {
  margin-bottom: 12px;
  color: var(--text-disabled);
}

.no-result {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
  font-size: 14px;
}

.no-result p {
  margin: 0;
}

/* HTTP 节点状态样式 */
.status-success {
  color: #10B981;
  font-weight: 600;
}

.status-error {
  color: #EF4444;
  font-weight: 600;
}

.form-hint {
  padding: 12px;
  background: var(--bg-app);
  border-radius: var(--radius-md);
  font-size: 12px;
  color: var(--text-muted);
}

.form-hint p {
  margin: 0;
}
</style>
