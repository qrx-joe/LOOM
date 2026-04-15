/**
 * 节点类型工具函数
 * 复用共享类型定义，确保前后端一致
 */

// 从共享类型导入
import type { WorkflowNode } from '../../../types/workflow.types'
import {
  NodeType,
  isStartNodeType,
  isEndNodeType,
  isAINodeType,
  isKnowledgeNodeType,
  isConditionNodeType,
  isHttpNodeType,
  DEFAULT_NODE_CONFIG,
  NODE_LABELS,
  NODE_ICONS,
} from '../../../types/workflow.types'

// 重新导出类型
export { NodeType }

/**
 * 获取节点类型（统一处理 type 和 data.nodeType）
 */
export function getNodeType(node: WorkflowNode | null | undefined): string {
  if (!node) return 'unknown'
  return node.type || node.data?.nodeType || 'unknown'
}

/**
 * 判断是否为开始节点
 */
export function isStartNode(node: WorkflowNode | null | undefined): boolean {
  return isStartNodeType(getNodeType(node))
}

/**
 * 判断是否为结束节点
 */
export function isEndNode(node: WorkflowNode | null | undefined): boolean {
  return isEndNodeType(getNodeType(node))
}

/**
 * 判断是否为 AI 节点
 */
export function isAINode(node: WorkflowNode | null | undefined): boolean {
  return isAINodeType(getNodeType(node))
}

/**
 * 判断是否为知识检索节点
 */
export function isKnowledgeNode(node: WorkflowNode | null | undefined): boolean {
  return isKnowledgeNodeType(getNodeType(node))
}

/**
 * 判断是否为条件节点
 */
export function isConditionNode(node: WorkflowNode | null | undefined): boolean {
  return isConditionNodeType(getNodeType(node))
}

/**
 * 判断是否为 HTTP 请求节点
 */
export function isHttpNode(node: WorkflowNode | null | undefined): boolean {
  return isHttpNodeType(getNodeType(node))
}

/**
 * 获取默认节点数据
 */
export function getDefaultNodeData(type: string) {
  // 使用共享类型的默认配置
  if (DEFAULT_NODE_CONFIG[type]) {
    return { ...DEFAULT_NODE_CONFIG[type] }
  }
  return {}
}

/**
 * 获取节点图标名称
 */
export function getNodeIcon(type: string): string {
  return NODE_ICONS[type] || 'Box'
}

/**
 * 获取节点标签
 */
export function getNodeLabel(type: string): string {
  return NODE_LABELS[type] || '未知节点'
}
