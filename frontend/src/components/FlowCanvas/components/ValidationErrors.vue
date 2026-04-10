<script setup lang="ts">
import { AlertCircle, X } from 'lucide-vue-next'

defineProps<{
  errors: string[]
  show: boolean
}>()

defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div v-if="show && errors.length > 0" class="validation-errors">
    <div class="errors-header">
      <AlertCircle :size="16" />
      <span>工作流配置错误</span>
      <button class="close-btn" @click="$emit('close')">
        <X :size="14" />
      </button>
    </div>
    <ul class="errors-list">
      <li v-for="(error, index) in errors" :key="index">
        {{ error }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.validation-errors {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px 16px;
  max-width: 400px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 50;
}

.errors-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #dc2626;
}

.close-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #dc2626;
  background: #fee2e2;
}

.errors-list {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: #991b1b;
}

.errors-list li {
  margin-bottom: 4px;
}

.errors-list li:last-child {
  margin-bottom: 0;
}
</style>
