<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { Bot, BookOpen, GitBranch } from 'lucide-vue-next'
import type { NodeProps } from '@vue-flow/core'

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
</script>

<template>
  <!-- AI Agent Node -->
  <template v-if="data?.nodeType === 'AI_AGENT'">
    <div class="custom-node ai-node">
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
  </template>

  <!-- Knowledge Retrieval Node -->
  <template v-else-if="data?.nodeType === 'KNOWLEDGE_RETRIEVAL'">
    <div class="custom-node knowledge-node">
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
  </template>

  <!-- Condition Node -->
  <template v-else-if="data?.nodeType === 'CONDITION'">
    <div class="custom-node condition-node">
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
