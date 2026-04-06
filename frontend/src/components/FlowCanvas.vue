<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { ref } from 'vue'
import { useWorkflowStore } from '../store/workflow'

interface ExecutionLog {
  nodeId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  output?: any;
  error?: string;
  startTime: number;
  endTime?: number;
}

const store = useWorkflowStore()
const { onConnect, addEdges, onNodeClick } = useVueFlow()

const selectedNode = ref<any>(null)

onConnect((params) => {
  addEdges(params)
})

onNodeClick((event) => {
  selectedNode.value = event.node
})

// 初始化一些测试节点
if (store.nodes.length === 0) {
  store.nodes = [
    { id: '1', type: 'input', label: '开始', position: { x: 50, y: 50 }, data: {} },
    { id: '2', label: 'AI 节点', position: { x: 250, y: 50 }, data: { prompt: '' } },
  ]
}

const runLogs = ref<ExecutionLog[]>([])
const isRunning = ref(false)

const handleRun = async () => {
  isRunning.value = true
  try {
    const result = await store.saveWorkflow()
    runLogs.value = result
  } catch (e) {
    alert('运行失败，请检查控制台')
  } finally {
    isRunning.value = false
  }
}
</script>

<template>
  <div class="flow-container">
    <div class="canvas-area">
      <VueFlow
        v-model:nodes="store.nodes"
        v-model:edges="store.edges"
        fit-view-on-init
        class="custom-flow"
      >
        <Background pattern-color="#ccc" :gap="20" />
        <Controls />
      </VueFlow>
    </div>

    <!-- 侧边属性栏 - Glassmorphism -->
    <transition name="slide">
      <div v-if="selectedNode" class="sidebar glass">
        <header class="sidebar-header">
          <h3>节点配置</h3>
          <span class="node-id">#{{ selectedNode.id }}</span>
        </header>
        
        <div class="sidebar-content">
          <div class="form-group">
            <label>显示名称</label>
            <input v-model="selectedNode.label" placeholder="输入节点名称..." />
          </div>
          
          <div v-if="selectedNode.label?.includes('AI')" class="form-group">
            <label>Prompt 引导词</label>
            <textarea v-model="selectedNode.data.prompt" rows="8" placeholder="在此输入 AI 处理逻辑..."></textarea>
            <p v-pre class="hint">支持使用 {{nodeId.output}} 引用其他节点输出</p>
          </div>

          <div v-if="selectedNode.label?.includes('检索')" class="form-group">
            <label>关联知识库</label>
            <input v-model="selectedNode.data.kbId" placeholder="输入知识库 ID..." />
            <label>查询语句 (Query)</label>
            <input v-model="selectedNode.data.query" placeholder="要搜索的内容..." />
          </div>
        </div>

        <footer class="sidebar-footer">
          <button @click="selectedNode = null" class="secondary-btn">关闭面板</button>
        </footer>
      </div>
    </transition>

    <!-- 底部运行日志 - Premium Dark -->
    <div class="log-panel" :class="{ open: runLogs.length > 0 }">
      <div class="log-header">
        <div class="log-title">
          <span class="pulse-icon"></span>
          运行日志
        </div>
        <button class="clear-btn" @click="runLogs = []">清空</button>
      </div>
      <div class="log-content">
        <div v-for="log in runLogs" :key="log.nodeId" class="log-item">
          <div class="log-status" :class="log.status"></div>
          <div class="log-info">
            <span class="log-node">Node {{ log.nodeId }}</span>
            <span class="log-msg">{{ log.output || log.error }}</span>
          </div>
          <div class="log-time">{{ new Date(log.startTime).toLocaleTimeString() }}</div>
        </div>
      </div>
    </div>

    <div class="toolbar glass">
      <button class="run-btn" @click="handleRun" :disabled="isRunning">
        {{ isRunning ? '正在执行' : '保存并执行工作流' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.flow-container {
  height: 100%;
  width: 100%;
  display: flex;
  position: relative;
  overflow: hidden;
  background: #f8f9fa;
}

.canvas-area {
  flex-grow: 1;
  height: 100%;
}

.custom-flow {
  background: white;
}

.sidebar {
  width: 340px;
  position: absolute;
  top: 20px;
  right: 20px;
  bottom: 20px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  z-index: 1001;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
}

.sidebar-header {
  padding: 24px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.node-id {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--primary-light);
  padding: 2px 8px;
  border-radius: 4px;
}

.sidebar-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
}

.hint {
  font-size: 11px;
  color: var(--text-muted);
}

input, textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  background: white;
}

input:focus, textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(110, 86, 207, 0.1);
}

.sidebar-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--border-subtle);
}

.secondary-btn {
  width: 100%;
  background: white;
  border: 1px solid var(--border-subtle);
  padding: 10px;
  border-radius: 8px;
  color: var(--text-main);
  font-weight: 500;
  cursor: pointer;
}

.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

.log-panel {
  position: absolute;
  bottom: -300px;
  left: 20px;
  right: 20px;
  height: 280px;
  background: #111;
  color: #eee;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -10px 25px rgba(0,0,0,0.15);
  transition: bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.log-panel.open {
  bottom: 0px;
}

.log-header {
  padding: 12px 20px;
  background: #1a1a1a;
  border-radius: 16px 16px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #333;
}

.log-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 14px;
}

.pulse-icon {
  width: 8px;
  height: 8px;
  background: #6e56cf;
  border-radius: 50%;
  box-shadow: 0 0 10px #6e56cf;
}

.clear-btn {
  background: transparent;
  border: none;
  color: #888;
  font-size: 12px;
  cursor: pointer;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid #222;
}

.log-status {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.log-status.COMPLETED { background: #10b981; box-shadow: 0 0 8px #10b981; }
.log-status.FAILED { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
.log-status.RUNNING { background: #3b82f6; box-shadow: 0 0 8px #3b82f6; }

.log-info {
  flex: 1;
  display: flex;
  gap: 12px;
}

.log-node {
  font-weight: 700;
  color: #ccc;
  font-size: 13px;
}

.log-msg {
  color: #888;
  font-size: 13px;
  font-family: monospace;
}

.log-time {
  font-size: 11px;
  color: #555;
}

.toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  padding: 6px;
  border-radius: 12px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
}

.run-btn {
  background: var(--primary);
  color: white;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: all 0.2s;
}

.run-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.run-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
