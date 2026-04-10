<script setup lang="ts">
import { computed } from 'vue'
import { BookOpen, AlertCircle } from 'lucide-vue-next'
import { isAINode, isKnowledgeNode, isConditionNode } from '../utils/nodeTypes'

const props = defineProps<{
  node: any | null
  knowledgeBases: { id: string; name: string }[]
}>()

const emit = defineEmits<{
  (e: 'update', data: any): void
  (e: 'delete'): void
}>()

// 获取知识库名称
const getKnowledgeBaseName = (kbId: string) => {
  if (!kbId) return ''
  const kb = props.knowledgeBases.find(k => k.id === kbId)
  return kb?.name || kbId
}

// 判断节点类型
const showAIGroup = computed(() => props.node && isAINode(props.node))
const showKnowledgeGroup = computed(() => props.node && isKnowledgeNode(props.node))
const showConditionGroup = computed(() => props.node && isConditionNode(props.node))

// 更新节点数据
const updateNodeData = (key: string, value: any) => {
  if (!props.node) return
  emit('update', { ...props.node.data, [key]: value })
}
</script>

<template>
  <div class="property-panel">
    <div v-if="!node" class="empty-state">
      <p>选择一个节点进行配置</p>
    </div>

    <template v-else>
      <!-- 节点基本信息 -->
      <div class="panel-section">
        <h3>节点配置</h3>
        <div class="form-group">
          <label>节点名称</label>
          <input
            v-model="node.label"
            @change="$emit('update', node.data)"
            class="form-input"
          />
        </div>
      </div>

      <!-- AI 节点配置 -->
      <template v-if="showAIGroup">
        <div class="panel-section">
          <h4>AI 配置</h4>
          <div class="form-group">
            <label>Prompt</label>
            <textarea
              :value="node.data?.prompt"
              @input="e => updateNodeData('prompt', (e.target as HTMLTextAreaElement).value)"
              @change="$emit('update', node.data)"
              class="form-textarea"
              rows="6"
              placeholder="输入Prompt，使用 {{START_INPUT}} 表示用户输入"
            />
            <span class="hint">可用变量: {{'{{START_INPUT}}'}} 表示用户输入</span>
          </div>

          <div class="form-group">
            <label>模型</label>
            <select
              :value="node.data?.model"
              @change="e => updateNodeData('model', (e.target as HTMLSelectElement).value)"
              class="form-select"
            >
              <option value="deepseek-ai/DeepSeek-V3">DeepSeek V3</option>
              <option value="deepseek-ai/DeepSeek-R1">DeepSeek R1</option>
            </select>
          </div>

          <div class="form-group">
            <label>温度 ({{ node.data?.temperature ?? 0.7 }})</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              :value="node.data?.temperature ?? 0.7"
              @input="e => updateNodeData('temperature', parseFloat((e.target as HTMLInputElement).value))"
              @change="$emit('update', node.data)"
            />
          </div>
        </div>
      </template>

      <!-- 知识检索节点配置 -->
      <template v-if="showKnowledgeGroup">
        <div class="panel-section">
          <h4>检索配置</h4>
          <div class="form-group">
            <label>知识库</label>
            <div class="kb-selector">
              <select
                :value="node.data?.kbId"
                @change="e => updateNodeData('kbId', (e.target as HTMLSelectElement).value)"
                class="form-select"
              >
                <option value="">选择知识库</option>
                <option v-for="kb in knowledgeBases" :key="kb.id" :value="kb.id">
                  {{ kb.name }}
                </option>
              </select>
              <div v-if="node.data?.kbId" class="kb-selected">
                <BookOpen :size="14" />
                {{ getKnowledgeBaseName(node.data.kbId) }}
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>查询模板</label>
            <input
              :value="node.data?.query"
              @input="e => updateNodeData('query', (e.target as HTMLInputElement).value)"
              @change="$emit('update', node.data)"
              class="form-input"
              :placeholder="'{{START_INPUT}}'"
            />
          </div>
        </div>
      </template>

      <!-- 条件节点配置 -->
      <template v-if="showConditionGroup">
        <div class="panel-section">
          <h4>条件配置</h4>
          <div class="form-group">
            <label>条件表达式</label>
            <input
              :value="node.data?.expression"
              @input="e => updateNodeData('expression', (e.target as HTMLInputElement).value)"
              @change="$emit('update', node.data)"
              class="form-input"
              placeholder="e.g. {{input}} > 10"
            />
            <span class="hint">示例: {{'{{score}}'}} > 10, {{'{{name}}'}} == 'test'</span>
          </div>
        </div>
      </template>

      <!-- 删除按钮 -->
      <div class="panel-section panel-actions">
        <button class="btn btn-danger" @click="$emit('delete')">
          <AlertCircle :size="16" />
          删除节点
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.property-panel {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #9ca3af;
}

.panel-section {
  margin-bottom: 24px;
}

.panel-section h3,
.panel-section h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 6px;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.hint {
  display: block;
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
}

.kb-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kb-selected {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #3b82f6;
  background: #eff6ff;
  padding: 6px 10px;
  border-radius: 4px;
}

.panel-actions {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger {
  background: #fee2e2;
  color: #dc2626;
}

.btn-danger:hover {
  background: #fecaca;
}
</style>
