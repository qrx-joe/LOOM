<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useChatStore } from '../store/chat'
import { useWorkflowStore } from '../store/workflow'
import { Send, MessageSquare, X } from 'lucide-vue-next'

const chatStore = useChatStore()
const workflowStore = useWorkflowStore()
const userInput = ref('')
const isOpen = ref(false)

const handleSend = async () => {
  if (!userInput.value.trim() || chatStore.isLoading) return
  const content = userInput.value
  userInput.value = ''
  await chatStore.sendMessage(content)
}

const startNewChat = async () => {
  // 简单逻辑：取当前工作流列表的第一个进行对话
  // 在实际应用中，用户应先点击“发布”或“运行”
  if (workflowStore.nodes.length > 0) {
    // 假设后端已知当前工作流 ID，或者此处传参
    // 这里暂时 Hardcode 一个从 store 取的 ID（逻辑需完善）
    alert('请确保工作流已保存')
  }
}
</script>

<template>
  <div class="chat-widget" :class="{ open: isOpen }">
    <!-- 悬浮按钮 -->
    <button class="toggle-btn" @click="isOpen = !isOpen">
      <MessageSquare v-if="!isOpen" />
      <X v-else />
    </button>

    <!-- 聊天窗口 -->
    <div v-if="isOpen" class="chat-window">
      <div class="chat-header">
        对话预览 (Agent)
        <button v-if="!chatStore.currentSessionId" @click="startNewChat" class="start-btn">开启会话</button>
      </div>

      <div class="message-list">
        <div v-for="(msg, i) in chatStore.messages" :key="i" class="message-item" :class="msg.role">
          <div class="avatar">{{ msg.role === 'user' ? 'U' : 'A' }}</div>
          <div class="content">{{ msg.content }}</div>
        </div>
        <div v-if="chatStore.isLoading" class="message-item assistant loading">
          正在思考...
        </div>
      </div>

      <div class="chat-input-area">
        <input 
          v-model="userInput" 
          placeholder="输入消息..." 
          @keyup.enter="handleSend"
          :disabled="!chatStore.currentSessionId"
        />
        <button @click="handleSend" :disabled="!chatStore.currentSessionId || chatStore.isLoading">
          <Send :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-widget {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}
.toggle-btn {
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background: #6e56cf;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  cursor: pointer;
  border: none;
}
.chat-window {
  position: absolute;
  bottom: 70px;
  right: 0;
  width: 350px;
  height: 500px;
  background: white;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  overflow: hidden;
  border: 1px solid #eee;
}
.chat-header {
  padding: 15px;
  background: #f9f9f9;
  border-bottom: 1px solid #eee;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.start-btn {
  font-size: 12px;
  padding: 4px 8px;
  background: #6e56cf;
  color: white;
  border-radius: 4px;
}
.message-list {
  flex-grow: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.message-item {
  display: flex;
  gap: 10px;
  max-width: 85%;
}
.message-item.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 15px;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}
.user .avatar { background: #6e56cf; color: white; }
.content {
  padding: 10px;
  border-radius: 8px;
  background: #f1f1f1;
  font-size: 14px;
}
.user .content {
  background: #6e56cf;
  color: white;
}
.chat-input-area {
  padding: 15px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
}
input {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
}
.chat-input-area button {
  background: #6e56cf;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chat-input-area button:disabled { opacity: 0.5; }
.loading { font-style: italic; color: #888; }
</style>
