<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ChatWidget from './components/ChatWidget.vue'
import ErrorToast from './components/ErrorToast.vue'

const route = useRoute()
const activeView = computed(() => {
  if (route.path.startsWith('/knowledge')) return 'knowledge'
  return 'workflow'
})
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
          <span>LOOM</span>
        </div>
        <div class="nav-links">
          <router-link to="/workflow" :class="{ active: activeView === 'workflow' }">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            工作流编排
          </router-link>
          <router-link to="/knowledge" :class="{ active: activeView === 'knowledge' }">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            知识库管理
          </router-link>
        </div>
        <div class="nav-extra">
          <span class="status-indicator"></span>
          <span>系统就绪</span>
        </div>
      </div>
    </nav>

    <main class="content-box">
      <div class="view-wrapper">
        <router-view />
      </div>
    </main>

    <ChatWidget />
    <ErrorToast />
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
  gap: 24px;
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

.nav-links a {
  background: transparent;
  border: none;
  padding: 10px 16px;
  cursor: pointer;
  border-radius: var(--radius-md);
  font-weight: 600;
  color: var(--text-muted);
  transition: all var(--transition-fast);
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.nav-links a:hover {
  background: var(--bg-hover);
  color: var(--text-main);
}

.nav-links a.active {
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
  overflow: hidden;
}

.view-wrapper {
  height: 100%;
  width: 100%;
}
</style>
