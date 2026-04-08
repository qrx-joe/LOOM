<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { Bot, BookOpen, GitBranch, PlayCircle, Square } from 'lucide-vue-next'
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

type CustomNodeData = AiNodeData | KnowledgeNodeData | ConditionNodeData

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
    <Handle type="source" :position="Position.Right" id="true" />
    <Handle type="source" :position="Position.Right" id="false" />
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
</style>
