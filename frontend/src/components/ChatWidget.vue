<script setup lang="ts">
import { ref, watch } from 'vue'
import { useChatStore } from '../store/chat'
import { Send, MessageSquare, X, Sparkles, User } from 'lucide-vue-next'

const chatStore = useChatStore()
const userInput = ref('')
const isOpen = ref(false)

const handleSend = () => {
  if (!userInput.value.trim() || chatStore.isLoading) return
  const content = userInput.value
  userInput.value = ''
  chatStore.sendMessageStream(content)
}

// 打开聊天窗口时获取工作流列表
watch(isOpen, async (open) => {
  if (open) {
    await chatStore.fetchWorkflows()
  }
})

const startNewChat = async () => {
  if (!chatStore.currentWorkflowId) {
    alert('请先选择一个工作流')
    return
  }
  await chatStore.createSession(chatStore.currentWorkflowId)
}
</script>

<template>
  <div class="chat-widget" :class="{ open: isOpen }">
    <!-- 悬浮按钮 - Vibrant Pulse -->
    <button class="toggle-btn" :class="{ active: isOpen }" @click="isOpen = !isOpen">
      <MessageSquare v-if="!isOpen" :size="24" />
      <X v-else :size="24" />
    </button>

    <!-- 聊天窗口 - Glassmorphism -->
    <transition name="pop">
      <div v-if="isOpen" class="chat-window">
        <header class="chat-header">
          <div class="header-info">
            <div class="bot-avatar"><Sparkles :size="20" /></div>
            <div class="bot-texts">
              <h3>AI 助手</h3>
              <span class="status">在线中</span>
            </div>
          </div>
          <div v-if="!chatStore.currentSessionId" class="session-start">
            <select v-model="chatStore.currentWorkflowId" class="workflow-select">
              <option value="" disabled>选择工作流</option>
              <option v-for="wf in chatStore.workflows" :key="wf.id" :value="wf.id">
                {{ wf.name }}
              </option>
            </select>
            <button @click="startNewChat" class="start-session-btn">
              进入会话
            </button>
          </div>
          <button v-else @click="chatStore.currentSessionId = null" class="start-session-btn">
            切换会话
          </button>
        </header>

        <div class="message-list">
          <div v-if="chatStore.messages.length === 0" class="welcome-card">
            <Sparkles :size="32" class="sparkle-icon" />
            <h4>有什么我可以帮你的？</h4>
            <p>我可以基于你编排的工作流提供智能问答服务。</p>
          </div>
          
          <div v-for="(msg, i) in chatStore.messages" :key="i" class="message-bubble" :class="msg.role">
            <div class="avatar-sm">
              <User v-if="msg.role === 'user'" :size="14" />
              <Sparkles v-else :size="14" />
            </div>
            <div class="bubble-wrapper">
              <div class="bubble-content">
                {{ msg.content }}<span v-if="msg.isStreaming" class="typing-cursor">▋</span>
              </div>
              <!-- 引用来源 -->
              <div v-if="msg.metadata?.sourceDocs?.length > 0 && !msg.isStreaming" class="source-docs">
                <div class="source-header">引用来源</div>
                <div v-for="(doc, idx) in msg.metadata.sourceDocs" :key="idx" class="source-item">
                  <span class="source-name">{{ doc.documentName || '未知文档' }}</span>
                  <span class="source-score">{{ (doc.score * 100).toFixed(0) }}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="chatStore.isLoading" class="message-bubble assistant">
            <div class="avatar-sm loading-spin"><Sparkles :size="14" /></div>
            <div class="bubble-content typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <footer class="chat-input-wrapper">
          <div class="input-area">
            <input 
              v-model="userInput" 
              placeholder="输入你的问题..." 
              @keyup.enter="handleSend"
              :disabled="!chatStore.currentSessionId"
            />
            <button @click="handleSend" class="send-btn" :disabled="!chatStore.currentSessionId || chatStore.isLoading || !userInput.trim()">
              <Send :size="18" />
            </button>
          </div>
        </footer>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.chat-widget {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 2000;
}

.toggle-btn {
  width: 60px;
  height: 60px;
  border-radius: 20px;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(71, 118, 246, 0.3);
  cursor: pointer;
  border: none;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toggle-btn:hover {
  transform: scale(1.1) rotate(5deg);
}

.toggle-btn.active {
  background: white;
  color: var(--text-main);
  box-shadow: var(--shadow-lg);
}

.chat-window {
  position: absolute;
  bottom: 80px;
  right: 0;
  width: 380px;
  max-height: 600px;
  height: calc(100vh - 150px);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
}

.chat-header {
  padding: 24px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.bot-avatar {
  width: 40px;
  height: 40px;
  background: var(--primary-light);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.bot-texts h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.status {
  font-size: 11px;
  color: #10b981;
  font-weight: 600;
}

.start-session-btn {
  font-size: 12px;
  padding: 6px 12px;
  background: var(--primary);
  color: white;
  border-radius: 8px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.session-start {
  display: flex;
  gap: 8px;
  align-items: center;
}

.workflow-select {
  padding: 6px 10px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  font-size: 12px;
  background: white;
  color: var(--text-main);
  cursor: pointer;
}

.workflow-select:focus {
  outline: none;
  border-color: var(--primary);
}

.message-list {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.welcome-card {
  text-align: center;
  padding: 40px 20px;
}

.sparkle-icon {
  color: var(--primary);
  margin-bottom: 16px;
}

.message-bubble {
  display: flex;
  gap: 12px;
  max-width: 85%;
}

.message-bubble.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.avatar-sm {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user .avatar-sm { background: var(--primary); color: white; }
.assistant .avatar-sm { background: var(--primary-light); color: var(--primary); }

.bubble-content {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
}

.bubble-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user .bubble-content {
  background: var(--primary);
  color: white;
  border-top-right-radius: 4px;
}

.assistant .bubble-content {
  background: white;
  border: 1px solid var(--border-subtle);
  border-top-left-radius: 4px;
  box-shadow: var(--shadow-sm);
}

/* 引用来源样式 */
.source-docs {
  background: #f8f9fa;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
}

.source-header {
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.source-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid #eee;
}

.source-item:last-child {
  border-bottom: none;
}

.source-name {
  color: var(--text-main);
  font-weight: 500;
}

.source-score {
  color: var(--primary);
  font-weight: 600;
  font-size: 11px;
  background: var(--primary-light);
  padding: 2px 6px;
  border-radius: 4px;
}

.chat-input-wrapper {
  padding: 20px;
  background: white;
  border-top: 1px solid var(--border-subtle);
}

.input-area {
  display: flex;
  background: #f4f4f7;
  border-radius: 14px;
  padding: 4px;
  gap: 4px;
}

input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 10px 16px;
  font-size: 14px;
  outline: none;
}

.send-btn {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 10px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Animations */
.pop-enter-active, .pop-leave-active {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-origin: bottom right;
}

.pop-enter-from, .pop-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

/* Typing Animation */
.typing { display: flex; gap: 4px; padding: 12px 16px !important; }
.typing span {
  width: 6px;
  height: 6px;
  background: #ccc;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}
.typing span:nth-child(2) { animation-delay: 0.2s; }
.typing span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-spin { animation: spin 2s linear infinite; }

/* 打字机光标 */
.typing-cursor {
  display: inline-block;
  color: var(--primary);
  animation: blink 1s step-end infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>
