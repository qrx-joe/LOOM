<script setup lang="ts">
import { ref } from 'vue'
import WorkflowList from './components/WorkflowList.vue'
import FlowCanvas from './components/FlowCanvas.vue'
import ChatWidget from './components/ChatWidget.vue'
import KnowledgeBaseManager from './components/KnowledgeBaseManager.vue'

const activeView = ref<'workflow' | 'knowledge'>('workflow')
const workflowView = ref<'list' | 'editor'>('list')

const handleWorkflowSelect = () => {
  workflowView.value = 'editor'
}

const handleWorkflowBack = () => {
  workflowView.value = 'list'
}
</script>

<template>
  <div class="app-layout">
    <nav class="main-nav">
      <div class="nav-content">
        <div class="logo">
          <svg class="logo-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Mini-Coze</span>
        </div>
        <div class="nav-links">
          <button :class="{ active: activeView === 'workflow' }" @click="activeView = 'workflow'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            工作流编排
          </button>
          <button :class="{ active: activeView === 'knowledge' }" @click="activeView = 'knowledge'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            知识库管理
          </button>
        </div>
        <div class="nav-extra">
          <span class="status-indicator"></span>
          <span>系统就绪</span>
        </div>
      </div>
    </nav>

    <main class="content-box">
      <div class="view-wrapper">
        <template v-if="activeView === 'workflow'">
          <WorkflowList v-if="workflowView === 'list'" @select="handleWorkflowSelect" />
          <FlowCanvas v-else @back="handleWorkflowBack" />
        </template>
        <KnowledgeBaseManager v-else />
      </div>
    </main>

    <ChatWidget />
  </div>
</template>

<style>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-app);
}

.main-nav {
  height: 56px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.nav-content {
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 32px;
}

.logo {
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  color: var(--primary);
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  color: var(--primary);
}

.nav-links {
  display: flex;
  gap: 4px;
  flex: 1;
}

.nav-links button {
  background: transparent;
  border: none;
  padding: 8px 14px;
  cursor: pointer;
  border-radius: var(--radius-md);
  font-weight: 500;
  color: var(--text-muted);
  transition: all var(--transition-fast);
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-links button:hover {
  background: var(--bg-hover);
  color: var(--text-main);
}

.nav-links button.active {
  background: var(--primary-light);
  color: var(--primary);
}

.nav-extra {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}

.status-indicator {
  width: 8px;
  height: 8px;
  background: var(--success);
  border-radius: 50%;
}

.content-box {
  flex: 1;
  position: relative;
  overflow-y: auto;
}

.view-wrapper {
  min-height: 100%;
  width: 100%;
}
</style>
