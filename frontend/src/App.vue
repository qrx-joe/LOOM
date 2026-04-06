<script setup lang="ts">
import { ref } from 'vue'
import FlowCanvas from './components/FlowCanvas.vue'
import ChatWidget from './components/ChatWidget.vue'
import KnowledgeBaseManager from './components/KnowledgeBaseManager.vue'

const activeView = ref<'workflow' | 'knowledge'>('workflow')
</script>

<template>
  <div class="app-layout">
    <nav class="main-nav glass">
      <div class="nav-content">
        <div class="logo">
          <span class="logo-icon">✨</span>
          Mini-Coze
        </div>
        <div class="nav-links">
          <button :class="{ active: activeView === 'workflow' }" @click="activeView = 'workflow'">
            工作流编排
          </button>
          <button :class="{ active: activeView === 'knowledge' }" @click="activeView = 'knowledge'">
            知识库管理
          </button>
        </div>
        <div class="nav-extra">
          <span class="status-indicator"></span>
          系统就绪
        </div>
      </div>
    </nav>

    <main class="content-box">
      <div class="view-wrapper">
        <FlowCanvas v-if="activeView === 'workflow'" />
        <KnowledgeBaseManager v-else />
      </div>
    </main>
    
    <ChatWidget />
  </div>
</template>

<style>
/* Global resets handled by style.css */

.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-app);
}

.main-nav {
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 64px;
  border-bottom: 1px solid var(--border-subtle);
}

.nav-content {
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 48px;
}

.logo {
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  color: var(--primary);
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 1.2rem;
}

.nav-links {
  display: flex;
  gap: 8px;
  flex: 1;
}

.nav-links button {
  background: transparent;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 8px;
  font-weight: 500;
  color: var(--text-muted);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Inter', sans-serif;
}

.nav-links button:hover {
  background: var(--primary-light);
  color: var(--primary);
}

.nav-links button.active {
  background: var(--primary);
  color: white;
  box-shadow: var(--shadow-md);
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
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.content-box {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.view-wrapper {
  height: 100%;
  width: 100%;
}
</style>
