<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useChatStore } from '../store/chat'
import { Send, MessageSquare, X, Sparkles, User, Square, RefreshCw, Download, Clock, Trash2, Plus, ChevronLeft, History } from 'lucide-vue-next'

const chatStore = useChatStore()
const userInput = ref('')
const isOpen = ref(false)
const showSessionList = ref(false)
const messageListRef = ref<HTMLDivElement>()

const handleSend = async () => {
  if (!userInput.value.trim() || chatStore.isLoading) return
  const content = userInput.value
  userInput.value = ''

  // 如果没有会话，先创建
  if (!chatStore.currentSessionId) {
    if (!chatStore.currentWorkflowId) {
      alert('请先选择一个工作流')
      return
    }
    try {
      await chatStore.createSession(chatStore.currentWorkflowId)
    } catch (err: any) {
      alert('创建会话失败: ' + err.message)
      return
    }
  }

  chatStore.sendMessageStream(content)
}

// 停止生成
const handleStop = () => {
  chatStore.cancelOngoingRequest()
}

// 打开聊天窗口时获取工作流和会话列表
watch(isOpen, async (open) => {
  if (open) {
    await Promise.all([
      chatStore.fetchWorkflows(),
      chatStore.fetchSessions()
    ])
  }
})

// 消息更新时自动滚动到底部
watch(() => chatStore.messages.length, () => {
  nextTick(() => {
    scrollToBottom()
  })
})

// 组件挂载时也获取数据
onMounted(async () => {
  await Promise.all([
    chatStore.fetchWorkflows(),
    chatStore.fetchSessions()
  ])

  // 页面刷新或关闭时取消正在进行的请求
  window.addEventListener('beforeunload', handleBeforeUnload)
})

// 自动滚动到底部
const scrollToBottom = () => {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

// 切换会话列表
const toggleSessionList = () => {
  showSessionList.value = !showSessionList.value
}

// 选择会话
const selectSession = (sessionId: string) => {
  chatStore.switchSession(sessionId)
  showSessionList.value = false
}

// 删除会话
const handleDeleteSession = async (sessionId: string, event: Event) => {
  event.stopPropagation()
  if (confirm('确定要删除这个会话吗？')) {
    await chatStore.deleteSession(sessionId)
  }
}

// 新建会话
const handleNewSession = () => {
  chatStore.currentSessionId = null
  chatStore.messages = []
  showSessionList.value = false
}

// 组件卸载时清理
onUnmounted(() => {
  chatStore.cancelOngoingRequest()
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

// 页面卸载前取消请求
const handleBeforeUnload = () => {
  chatStore.cancelOngoingRequest()
}

// 格式化消息内容（处理换行和代码块）
const formatMessage = (content: string): string => {
  if (!content) return ''

  // 转义 HTML 特殊字符
  let formatted = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 处理代码块 ```code```
  formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>')

  // 处理行内代码 `code`
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

  // 处理加粗 **text**
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // 处理斜体 *text*
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // 处理换行
  formatted = formatted.replace(/\n/g, '<br>')

  return formatted
}

const startNewChat = async () => {
  if (!chatStore.currentWorkflowId) {
    alert('请先选择一个工作流')
    return
  }
  try {
    await chatStore.createSession(chatStore.currentWorkflowId)
  } catch (err: any) {
    alert('创建会话失败: ' + err.message)
  }
}
</script>

<template>
  <div class="chat-widget" :class="{ open: isOpen }">
    <!-- 悬浮按钮 -->
    <button class="toggle-btn" :class="{ active: isOpen }" @click="isOpen = !isOpen">
      <MessageSquare v-if="!isOpen" :size="24" />
      <X v-else :size="24" />
    </button>

    <!-- 聊天窗口 -->
    <transition name="pop">
      <div v-if="isOpen" class="chat-window">
        <!-- 会话列表面板 -->
        <transition name="slide">
          <div v-if="showSessionList" class="session-panel">
            <div class="session-panel-header">
              <h4>历史会话</h4>
              <button @click="handleNewSession" class="new-session-btn" title="新建会话">
                <Plus :size="16" />
              </button>
            </div>
            <div class="session-list">
              <div
                v-for="session in chatStore.sessions"
                :key="session.id"
                class="session-item"
                :class="{ active: session.id === chatStore.currentSessionId }"
                @click="selectSession(session.id)"
              >
                <div class="session-info">
                  <span class="session-name">{{ session.name || '未命名会话' }}</span>
                  <span class="session-time">{{ chatStore.formatRelativeTime(session.createdAt) }}</span>
                </div>
                <button
                  class="delete-session-btn"
                  @click="(e) => handleDeleteSession(session.id, e)"
                  title="删除会话"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
              <div v-if="chatStore.sessions.length === 0" class="empty-sessions">
                <History :size="24" />
                <p>暂无历史会话</p>
              </div>
            </div>
          </div>
        </transition>

        <!-- 主聊天区域 -->
        <div class="chat-main">
          <header class="chat-header">
            <div class="header-left">
              <button v-if="chatStore.currentSessionId" @click="toggleSessionList" class="back-btn" title="会话列表">
                <ChevronLeft :size="20" />
              </button>
              <div class="header-info">
                <div class="bot-avatar"><Sparkles :size="20" /></div>
                <div class="bot-texts">
                  <h3>{{ chatStore.currentSessionId ? 'AI 助手' : '选择会话' }}</h3>
                  <span v-if="chatStore.currentSessionId" class="status">在线中</span>
                </div>
              </div>
            </div>

            <!-- 新建会话状态 -->
            <div v-if="!chatStore.currentSessionId && !showSessionList" class="session-start">
              <button @click="toggleSessionList" class="start-session-btn">
                <History :size="14" />
                历史会话
              </button>
              <select v-model="chatStore.currentWorkflowId" class="workflow-select">
                <option value="" disabled>选择工作流</option>
                <option v-for="wf in chatStore.workflows" :key="wf.id" :value="wf.id">
                  {{ wf.name }}
                </option>
              </select>
              <button @click="startNewChat" class="start-session-btn primary">
                <Plus :size="14" />
                新建会话
              </button>
            </div>

            <!-- 聊天状态工具栏 -->
            <div v-if="chatStore.currentSessionId" class="header-actions">
              <button @click="chatStore.exportSession" class="icon-btn" title="导出会话">
                <Download :size="16" />
              </button>
              <button @click="toggleSessionList" class="icon-btn" title="会话列表">
                <History :size="16" />
              </button>
            </div>
          </header>

          <!-- 消息列表 -->
          <div ref="messageListRef" class="message-list">
            <!-- 空状态 -->
            <div v-if="!chatStore.currentSessionId" class="empty-state">
              <div class="empty-content">
                <History :size="48" class="empty-icon" />
                <h4>选择一个会话开始</h4>
                <p>从历史记录中选择或创建新会话</p>
                <button @click="toggleSessionList" class="start-session-btn primary" style="margin-top: 16px;">
                  查看历史会话
                </button>
              </div>
            </div>

            <template v-else>
              <!-- 欢迎卡片 -->
              <div v-if="chatStore.messages.length === 0" class="welcome-card">
                <Sparkles :size="32" class="sparkle-icon" />
                <h4>有什么我可以帮你的？</h4>
                <p>我可以基于你编排的工作流提供智能问答服务。</p>
              </div>

              <!-- 消息气泡 -->
              <div
                v-for="(msg, i) in chatStore.messages"
                :key="i"
                class="message-bubble"
                :class="[msg.role, { last: i === chatStore.messages.length - 1 }]"
              >
                <div class="avatar-sm">
                  <User v-if="msg.role === 'user'" :size="14" />
                  <Sparkles v-else :size="14" />
                </div>
                <div class="bubble-wrapper">
                  <div class="message-header">
                    <span class="message-role">{{ msg.role === 'user' ? '用户' : 'AI助手' }}</span>
                    <span v-if="msg.createdAt" class="message-time">
                      <Clock :size="10" />
                      {{ chatStore.formatRelativeTime(msg.createdAt) }}
                    </span>
                  </div>
                  <div class="bubble-content">
                    <div class="message-text" v-html="formatMessage(msg.content)"></div>
                    <span v-if="msg.isStreaming" class="typing-cursor">▋</span>
                  </div>
                  <!-- 引用来源 -->
                  <div v-if="msg.metadata?.sourceDocs?.length > 0 && !msg.isStreaming" class="source-docs">
                    <div class="source-header">
                      <span>引用来源</span>
                      <span class="source-count">{{ msg.metadata.sourceDocs.length }}个</span>
                    </div>
                    <div v-for="(doc, idx) in msg.metadata.sourceDocs" :key="idx" class="source-item">
                      <span class="source-name">{{ doc.documentName || '未知文档' }}</span>
                      <span class="source-score">{{ (doc.score * 100).toFixed(0) }}%</span>
                    </div>
                  </div>
                  <!-- 重新生成按钮 -->
                  <div v-if="msg.role === 'assistant' && i === chatStore.messages.length - 1 && !msg.isStreaming && !chatStore.isLoading" class="message-actions">
                    <button @click="chatStore.regenerateMessage" class="action-btn" title="重新生成">
                      <RefreshCw :size="12" />
                      重新生成
                    </button>
                  </div>
                </div>
              </div>

              <!-- 加载状态 -->
              <div v-if="chatStore.isLoading" class="message-bubble assistant">
                <div class="avatar-sm loading-spin"><Sparkles :size="14" /></div>
                <div class="bubble-content typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </template>
          </div>

          <!-- 输入区域 -->
          <footer v-if="chatStore.currentSessionId" class="chat-input-wrapper">
            <div class="input-area">
              <input
                v-model="userInput"
                placeholder="输入你的问题..."
                @keyup.enter="handleSend"
                :disabled="chatStore.isLoading"
              />
              <button v-if="chatStore.isLoading" @click="handleStop" class="stop-btn">
                <Square :size="14" fill="currentColor" />
              </button>
              <button v-else @click="handleSend" class="send-btn" :disabled="!userInput.trim()">
                <Send :size="18" />
              </button>
            </div>
          </footer>
        </div>
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

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: white;
  border: 1px solid var(--border-subtle, #e5e7eb);
  color: var(--text-muted, #6b7280);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.icon-btn svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
}

.icon-btn:hover {
  background: var(--primary-light, #eef2ff);
  color: var(--primary, #4776f6);
  border-color: var(--primary, #4776f6);
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
  gap: 4px;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.message-role {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.message-time {
  font-size: 10px;
  color: #aaa;
  display: flex;
  align-items: center;
  gap: 2px;
}

.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 11px;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  color: var(--primary);
  background: var(--primary-light);
  border-color: var(--primary);
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

.stop-btn {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 10px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  animation: pulse 1.5s ease-in-out infinite;
}

.stop-btn:hover {
  background: #dc2626;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
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

/* 会话列表面板 */
.session-panel {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 240px;
  background: #f8f9fa;
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from, .slide-leave-to {
  transform: translateX(-100%);
}

.session-panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-panel-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.new-session-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--primary);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.session-item:hover {
  background: white;
  box-shadow: var(--shadow-sm);
}

.session-item.active {
  background: var(--primary-light);
  border: 1px solid var(--primary);
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.session-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-time {
  font-size: 11px;
  color: var(--text-muted);
}

.delete-session-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.session-item:hover .delete-session-btn {
  opacity: 1;
}

.delete-session-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}

.empty-sessions {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  color: var(--text-muted);
  gap: 8px;
}

.empty-sessions p {
  font-size: 12px;
  margin: 0;
}

/* 主聊天区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--primary-light);
  color: var(--primary);
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-content {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.empty-icon {
  color: var(--primary);
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-content h4 {
  margin: 0 0 8px;
  color: var(--text-main);
}

.empty-content p {
  margin: 0 0 16px;
  font-size: 13px;
}

/* 按钮变体 */
.start-session-btn.primary {
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  gap: 4px;
}

.start-session-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 消息文本格式化 */
.message-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.message-text :deep(.code-block) {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-text :deep(.inline-code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: #e83e8c;
}

.message-text :deep(strong) {
  font-weight: 600;
}

.message-text :deep(em) {
  font-style: italic;
}

.message-text :deep(br) {
  display: block;
  content: '';
  margin-bottom: 4px;
}

/* 引用来源改进 */
.source-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.source-count {
  font-size: 10px;
  background: var(--primary-light);
  color: var(--primary);
  padding: 2px 6px;
  border-radius: 4px;
}

/* 消息间距优化 */
.message-bubble {
  margin-bottom: 8px;
}

.message-bubble.last {
  margin-bottom: 0;
}
</style>
