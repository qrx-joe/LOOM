<script setup lang="ts">
import { Search, X } from 'lucide-vue-next'

interface Props {
  modelValue: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '搜索知识库...'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  clear: []
}>()

const onInput = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}

const onClear = () => {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <div class="search-input-wrapper">
    <Search :size="18" class="search-icon" />
    <input
      :value="modelValue"
      @input="onInput"
      type="text"
      :placeholder="placeholder"
      class="search-input"
    />
    <button
      v-if="modelValue"
      class="clear-btn"
      @click="onClear"
      title="清空"
    >
      <X :size="14" />
    </button>
  </div>
</template>

<style scoped>
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 280px;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 40px;
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  font-size: 14px;
  background: white;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(71, 118, 246, 0.1);
}

.clear-btn {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all 0.2s;
}

.clear-btn:hover {
  background: #f3f4f6;
  color: var(--text-main);
}
</style>
