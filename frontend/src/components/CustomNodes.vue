<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { Bot, BookOpen, GitBranch, PlayCircle, Square, Globe } from 'lucide-vue-next'
import type { NodeProps } from '@vue-flow/core'

// 禁用继承 attrs，让 Vue Flow 的事件监听器能正确传递
defineOptions({ inheritAttrs: false })

type AiNodeData = {
  nodeType: 'AI_AGENT'
  prompt?: string
  model?: string
  temperature?: number
}

type KnowledgeNodeData = {
  nodeType: 'KNOWLEDGE_RETRIEVAL'
  kbId?: string
  query?: string
}

type ConditionNodeData = {
  nodeType: 'CONDITION'
  expression?: string
}

type HttpNodeData = {
  nodeType: 'HTTP_REQUEST'
  url?: string
  method?: string
}

type CustomNodeData = AiNodeData | KnowledgeNodeData | ConditionNodeData | HttpNodeData

interface Props extends NodeProps<CustomNodeData> {
  label?: string
}

const props = defineProps<Props>()

// input 和 output 是 Vue Flow 内置类型，使用 props.type 判断
// 也兼容 START/END/INPUT/OUTPUT (后端 legacy 类型)
const isInputNode = () => ['input', 'START', 'INPUT'].includes(props.type || '')
const isOutputNode = () => ['output', 'END', 'OUTPUT'].includes(props.type || '')
</script>

<template>
  <!-- Input Node -->
  <div v-if="isInputNode()" class="custom-node input-node" v-bind="$attrs">
    <div class="node-header">
      <PlayCircle :size="14" />
      <span>{{ label || '开始' }}</span>
    </div>
    <Handle type="source" :position="Position.Right" />
  </div>

  <!-- Output Node -->
  <div v-else-if="isOutputNode()" class="custom-node output-node" v-bind="$attrs">
    <div class="node-header">
      <Square :size="14" />
      <span>{{ label || '结束' }}</span>
    </div>
    <Handle type="target" :position="Position.Left" />
  </div>

  <!-- AI Agent Node -->
  <div v-else-if="data?.nodeType === 'AI_AGENT'" class="custom-node ai-node" v-bind="$attrs">
    <div class="node-header">
      <Bot :size="14" />
      <span>{{ label || 'AI 节点' }}</span>
    </div>
    <div class="node-body">
      <span class="model-tag">{{ data?.model?.split('/').pop() || 'DeepSeek V3' }}</span>
    </div>
    <Handle type="target" :position="Position.Left" />
    <Handle type="source" :position="Position.Right" />
  </div>

  <!-- Knowledge Retrieval Node -->
  <div v-else-if="data?.nodeType === 'KNOWLEDGE_RETRIEVAL'" class="custom-node knowledge-node" v-bind="$attrs">
    <div class="node-header">
      <BookOpen :size="14" />
      <span>{{ label || '知识检索' }}</span>
    </div>
    <div class="node-body">
      <span class="kb-tag">{{ data?.kbId ? '已配置' : '未配置' }}</span>
    </div>
    <Handle type="target" :position="Position.Left" />
    <Handle type="source" :position="Position.Right" />
  </div>

  <!-- Condition Node -->
  <div v-else-if="data?.nodeType === 'CONDITION'" class="custom-node condition-node" v-bind="$attrs">
    <div class="node-header">
      <GitBranch :size="14" />
      <span>{{ label || '条件分支' }}</span>
    </div>
    <div class="node-body">
      <span class="expression">{{ data?.expression || '无条件' }}</span>
    </div>
    <Handle type="target" :position="Position.Left" />
    <Handle type="source" :position="Position.Bottom" id="true" :style="{ left: '30%' }" />
    <Handle type="source" :position="Position.Bottom" id="false" :style="{ left: '70%' }" />
    <div class="handle-labels">
      <span class="handle-label true-label">True</span>
      <span class="handle-label false-label">False</span>
    </div>
  </div>

  <!-- HTTP Request Node -->
  <div v-else-if="data?.nodeType === 'HTTP_REQUEST'" class="custom-node http-node" v-bind="$attrs">
    <div class="node-header">
      <Globe :size="14" />
      <span>{{ label || 'HTTP 请求' }}</span>
    </div>
    <div class="node-body">
      <span class="method-tag">{{ data?.method || 'GET' }}</span>
    </div>
    <Handle type="target" :position="Position.Left" />
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.custom-node {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  min-width: 150px;
  font-size: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
}

.node-body {
  padding: 8px 12px;
}

.input-node {
  border-left: 3px solid #10B981;
}

.input-node .node-header {
  color: #10B981;
}

.output-node {
  border-left: 3px solid #EF4444;
}

.output-node .node-header {
  color: #EF4444;
}

.ai-node {
  border-left: 3px solid #4776F6;
}

.ai-node .node-header {
  color: #4776F6;
}

.model-tag {
  background: #EEF2FF;
  color: #4776F6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.knowledge-node {
  border-left: 3px solid #F59E0B;
}

.knowledge-node .node-header {
  color: #F59E0B;
}

.kb-tag {
  background: #FEF3C7;
  color: #D97706;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.condition-node {
  border-left: 3px solid #EC4899;
}

.condition-node .node-header {
  color: #EC4899;
}

.expression {
  color: #6B7280;
  font-family: monospace;
  font-size: 11px;
}

.handle-labels {
  display: flex;
  justify-content: space-between;
  padding: 4px 12px 8px;
}

.handle-label {
  font-size: 10px;
  font-weight: 500;
}

.true-label {
  color: #10B981;
}

.false-label {
  color: #EF4444;
}

.http-node {
  border-left: 3px solid #8B5CF6;
}

.http-node .node-header {
  color: #8B5CF6;
}

.method-tag {
  background: #EDE9FE;
  color: #7C3AED;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}
</style>
