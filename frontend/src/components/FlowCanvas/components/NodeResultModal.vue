<script setup lang="ts">
import { computed } from 'vue'
import { X, BookOpen, FolderOpen, AlertCircle } from 'lucide-vue-next'
import { isKnowledgeNode, isAINode } from '../utils/nodeTypes'

const props = defineProps<{
  show: boolean
  node: any | null
  result: any | null
  knowledgeBases: { id: string; name: string }[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// 获取知识库名称
const getKnowledgeBaseName = (kbId: string) => {
  if (!kbId) return ''
  const kb = props.knowledgeBases.find(k => k.id === kbId)
  return kb?.name || kbId
}

// 判断节点类型
const showKnowledgeResult = computed(() => props.node && isKnowledgeNode(props.node))
const showAIResult = computed(() => props.node && isAINode(props.node))

// 是否有结果
const hasResult = computed(() => !!props.result)
const hasError = computed(() => props.result?.error)

// 知识检索结果
const fragments = computed(() => props.result?.fragments || [])
</script>

<template>
  <div v-if="show && node" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <!-- 头部 -->
      <div class="modal-header">
        <h3>节点运行结果 - {{ node.label || node.type }}</h3>
        <button class="close-btn" @click="$emit('close')">
          <X :size="18" />
        </button>
      </div>

      <!-- 内容 -->
      <div class="modal-body">
        <!-- 知识检索节点结果 -->
        <template v-if="showKnowledgeResult">
          <!-- 检索配置 -->
          <div class="result-section">
            <h4>检索配置</h4>
            <div class="config-info">
              <p>
                <strong>知识库：</strong>
                {{ getKnowledgeBaseName(node.data?.kbId) || '未配置' }}
              </p>
              <p>
                <strong>查询：</strong>
                <span v-html="node.data?.query || '&#123;&#123;START_INPUT&#125;&#125;'"></span>
              </p>
            </div>
          </div>

          <!-- 检索结果 -->
          <div v-if="hasResult" class="result-section">
            <h4>检索结果</h4>

            <!-- 结果列表 -->
            <div v-if="fragments.length > 0" class="fragments-list">
              <div
                v-for="(fragment, idx) in fragments"
                :key="idx"
                class="fragment-card"
              >
                <div class="fragment-header">
                  <span class="fragment-score">
                    匹配度: {{ (fragment.score * 100).toFixed(1) }}%
                  </span>
                  <span class="fragment-doc">
                    <BookOpen :size="12" />
                    {{ fragment.documentName }}
                  </span>
                </div>
                <div class="fragment-content">{{ fragment.content }}</div>
              </div>
            </div>

            <!-- 错误状态 -->
            <div v-else-if="hasError" class="error-state">
              <AlertCircle :size="16" />
              <span>{{ result.error }}</span>
            </div>

            <!-- 空结果 -->
            <div v-else class="empty-state">
              <FolderOpen :size="32" />
              <p>未检索到相关文档</p>
            </div>
          </div>

          <!-- 无结果 -->
          <div v-else class="no-result">
            <p>暂无运行结果，请先运行工作流</p>
          </div>
        </template>

        <!-- AI 节点结果 -->
        <template v-if="showAIResult">
          <div class="result-section">
            <h4>AI 配置</h4>
            <div class="config-info">
              <p><strong>模型：</strong>{{ node.data?.model || 'DeepSeek V3' }}</p>
              <p><strong>温度：</strong>{{ node.data?.temperature ?? 0.7 }}</p>
            </div>
          </div>

          <div v-if="hasResult" class="result-section">
            <h4>AI 回答</h4>
            <div v-if="result.text" class="ai-response">{{ result.text }}</div>
            <div v-else-if="hasError" class="error-state">
              <AlertCircle :size="16" />
              <span>{{ result.error }}</span>
            </div>
          </div>

          <div v-else class="no-result">
            <p>暂无运行结果，请先运行工作流</p>
          </div>
        </template>

        <!-- 其他节点 -->
        <template v-if="!showKnowledgeResult && !showAIResult">
          <div v-if="hasResult" class="result-section">
            <h4>节点输出</h4>
            <pre class="json-output">{{ JSON.stringify(result, null, 2) }}</pre>
          </div>
          <div v-else class="no-result">
            <p>暂无运行结果，请先运行工作流</p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
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
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.result-section {
  margin-bottom: 24px;
}

.result-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.config-info {
  background: #f9fafb;
  padding: 12px;
  border-radius: 8px;
}

.config-info p {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #4b5563;
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
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
}

.fragment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.fragment-score {
  font-size: 12px;
  font-weight: 600;
  color: #059669;
  background: #d1fae5;
  padding: 2px 8px;
  border-radius: 4px;
}

.fragment-doc {
  font-size: 11px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}

.fragment-content {
  font-size: 13px;
  line-height: 1.6;
  color: #334155;
  max-height: 200px;
  overflow-y: auto;
}

.ai-response {
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: #1f2937;
  white-space: pre-wrap;
}

.json-output {
  background: #1f2937;
  color: #e5e7eb;
  padding: 16px;
  border-radius: 8px;
  font-size: 12px;
  font-family: monospace;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}

.error-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 8px;
  font-size: 13px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: #9ca3af;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.no-result {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
  font-size: 14px;
}
</style>
