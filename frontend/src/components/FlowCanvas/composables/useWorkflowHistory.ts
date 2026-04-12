import { ref } from 'vue'

export interface HistoryState {
  nodes: any[]
  edges: any[]
}

export interface HistoryEntry {
  state: HistoryState
  timestamp: number
}

/**
 * 工作流历史记录管理
 * 支持撤销/重做功能
 */
export function useWorkflowHistory(maxHistory = 50) {
  const history = ref<HistoryEntry[]>([])
  const currentIndex = ref(-1)

  /**
   * 保存当前状态到历史
   */
  function saveState(nodes: any[], edges: any[]) {
    // 深克隆保存状态
    const state: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    }

    // 如果不在历史末尾，删除后面的历史
    if (currentIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentIndex.value + 1)
    }

    // 添加新状态
    history.value.push({
      state,
      timestamp: Date.now()
    })

    // 限制历史记录数量
    if (history.value.length > maxHistory) {
      history.value.shift()
    } else {
      currentIndex.value++
    }
  }

  /**
   * 撤销
   * @returns 上一个状态，如果没有则返回 null
   */
  function undo(): HistoryState | null {
    if (currentIndex.value > 0) {
      currentIndex.value--
      return history.value[currentIndex.value]?.state ?? null
    }
    return null
  }

  /**
   * 重做
   * @returns 下一个状态，如果没有则返回 null
   */
  function redo(): HistoryState | null {
    if (currentIndex.value < history.value.length - 1) {
      currentIndex.value++
      return history.value[currentIndex.value]?.state ?? null
    }
    return null
  }

  /**
   * 是否可以撤销
   */
  function canUndo(): boolean {
    return currentIndex.value > 0
  }

  /**
   * 是否可以重做
   */
  function canRedo(): boolean {
    return currentIndex.value < history.value.length - 1
  }

  /**
   * 初始化历史
   */
  function initHistory(nodes: any[], edges: any[]) {
    history.value = []
    currentIndex.value = -1
    saveState(nodes, edges)
  }

  /**
   * 清空历史
   */
  function clearHistory() {
    history.value = []
    currentIndex.value = -1
  }

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    initHistory,
    clearHistory
  }
}
