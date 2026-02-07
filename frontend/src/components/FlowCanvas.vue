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
      >
        <Background pattern-color="#aaa" :gap="16" />
        <Controls />
      </VueFlow>
    </div>

    <!-- 侧边属性栏 -->
    <div v-if="selectedNode" class="sidebar">
      <h3>节点配置 ({{ selectedNode.id }})</h3>
      <div class="form-group">
        <label>标签</label>
        <input v-model="selectedNode.label" />
      </div>
      
      <div v-if="selectedNode.label?.includes('AI')" class="form-group">
        <label>Prompt 模板</label>
        <textarea v-model="selectedNode.data.prompt" rows="5"></textarea>
      </div>

      <div v-if="selectedNode.label?.includes('检索')" class="form-group">
        <label>知识库 ID</label>
        <input v-model="selectedNode.data.kbId" />
        <label>查询语句</label>
        <input v-model="selectedNode.data.query" />
      </div>

      <button @click="selectedNode = null" class="close-btn">关闭</button>
    </div>

    <!-- 底部运行日志 -->
    <div class="log-panel" :class="{ open: runLogs.length > 0 }">
      <div class="log-header">
        运行日志
        <button @click="runLogs = []">清除</button>
      </div>
      <div class="log-content">
        <div v-for="log in runLogs" :key="log.nodeId" class="log-item">
          <span :class="log.status">{{ log.status }}</span>
          <strong>Node {{ log.nodeId }}</strong>: {{ log.output || log.error }}
        </div>
      </div>
    </div>

    <div class="toolbar">
      <button @click="handleRun" :disabled="isRunning">
        {{ isRunning ? '运行中...' : '保存并执行' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.flow-container {
  height: 100vh;
  width: 100%;
  display: flex;
  position: relative;
  overflow: hidden;
}
.canvas-area {
  flex-grow: 1;
  height: 100%;
}
.sidebar {
  width: 300px;
  background: #fff;
  border-left: 1px solid #ddd;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  box-shadow: -2px 0 5px rgba(0,0,0,0.05);
  z-index: 100;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
input, textarea {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.log-panel {
  position: absolute;
  bottom: -300px;
  left: 0;
  right: 0;
  height: 250px;
  background: #1e1e1e;
  color: #fff;
  transition: bottom 0.3s;
  display: flex;
  flex-direction: column;
  z-index: 200;
}
.log-panel.open {
  bottom: 0;
}
.log-header {
  padding: 10px;
  background: #333;
  display: flex;
  justify-content: space-between;
}
.log-content {
  padding: 10px;
  overflow-y: auto;
  font-family: monospace;
}
.log-item {
  margin-bottom: 5px;
}
.COMPLETED { color: #4caf50; }
.FAILED { color: #f44336; }
.RUNNING { color: #2196f3; }

.toolbar {
  position: absolute;
  top: 10px;
  right: 20px;
  z-index: 10;
}
.close-btn {
  margin-top: auto;
  background: #f5f5f5;
  color: #333;
}
button {
  background: #6e56cf;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
}
</style>
