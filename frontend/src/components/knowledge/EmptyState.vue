<script setup lang="ts">
import { BookOpen, Plus, Sparkles } from 'lucide-vue-next'

const emit = defineEmits<{
  create: []
}>()
</script>

<template>
  <div class="empty-state">
    <div class="empty-content">
      <div class="empty-icon">
        <BookOpen :size="48" />
      </div>
      <h3 class="empty-title">还没有知识库</h3>
      <p class="empty-desc">
        创建第一个知识库，开始管理您的 AI 知识资产<br>
        支持 PDF、Word 和纯文本文档
      </p>
      <div class="empty-features">
        <div class="feature-item">
          <Sparkles :size="16" />
          <span>智能文档解析</span>
        </div>
        <div class="feature-item">
          <Sparkles :size="16" />
          <span>自动文本分片</span>
        </div>
        <div class="feature-item">
          <Sparkles :size="16" />
          <span>向量语义检索</span>
        </div>
      </div>
      <button class="create-btn" @click="emit('create')">
        <Plus :size="20" />
        创建第一个知识库
      </button>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px;
}

.empty-content {
  text-align: center;
  max-width: 400px;
}

.empty-icon {
  width: 96px;
  height: 96px;
  border-radius: 24px;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  color: var(--primary);
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0 0 8px 0;
}

.empty-desc {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0 0 24px 0;
}

.empty-features {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 32px;
}

.feature-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.feature-item svg {
  color: var(--primary);
}

.create-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
