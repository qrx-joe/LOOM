<script setup lang="ts">
import { ref } from 'vue'
import FlowCanvas from './components/FlowCanvas.vue'
import ChatWidget from './components/ChatWidget.vue'
import KnowledgeBaseManager from './components/KnowledgeBaseManager.vue'

const activeView = ref<'workflow' | 'knowledge'>('workflow')
</script>

<template>
  <div class="app-layout">
    <nav class="main-nav">
      <div class="logo">Mini-Coze</div>
      <div class="nav-links">
        <button :class="{ active: activeView === 'workflow' }" @click="activeView = 'workflow'">工作流编排</button>
        <button :class="{ active: activeView === 'knowledge' }" @click="activeView = 'knowledge'">知识库管理</button>
      </div>
    </nav>

    <main class="content-box">
      <FlowCanvas v-if="activeView === 'workflow'" />
      <KnowledgeBaseManager v-else />
    </main>
    
    <ChatWidget />
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: 'Inter', system-ui, sans-serif;
}
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.main-nav {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 40px;
}
.logo {
  font-weight: 800;
  color: #6e56cf;
  font-size: 1.2rem;
}
.nav-links {
  display: flex;
  gap: 20px;
}
.nav-links button {
  background: none;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 6px;
  font-weight: 500;
}
.nav-links button.active {
  background: #f5f3ff;
  color: #6e56cf;
}
.content-box {
  flex: 1;
  position: relative;
  overflow: hidden;
}
</style>
