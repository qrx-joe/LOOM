import { isStartNode, isEndNode, isAINode, isKnowledgeNode } from '../utils/nodeTypes'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * 工作流验证逻辑
 * 检查工作流配置的完整性
 */
export function useWorkflowValidation() {
  /**
   * 验证工作流
   */
  function validateWorkflow(nodes: any[], edges: any[]): ValidationResult {
    const errors: string[] = []

    // 检查节点数量
    if (nodes.length === 0) {
      errors.push('工作流没有任何节点')
      return { valid: false, errors }
    }

    // 检查开始节点
    const startNodes = nodes.filter(isStartNode)
    if (startNodes.length === 0) {
      errors.push('缺少开始节点')
    } else if (startNodes.length > 1) {
      errors.push('只能有一个开始节点')
    }

    // 检查结束节点
    const endNodes = nodes.filter(isEndNode)
    if (endNodes.length === 0) {
      errors.push('缺少结束节点')
    } else if (endNodes.length > 1) {
      errors.push('只能有一个结束节点')
    }

    // 检查孤立节点
    errors.push(...validateIsolatedNodes(nodes, edges))

    // 检查 AI 节点配置
    errors.push(...validateAINodes(nodes))

    // 检查知识检索节点配置
    errors.push(...validateKnowledgeNodes(nodes))

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 验证孤立节点
   */
  function validateIsolatedNodes(nodes: any[], edges: any[]): string[] {
    const errors: string[] = []
    const sourceIds = new Set<string>(edges.map(e => e.source))
    const targetIds = new Set<string>(edges.map(e => e.target))

    const isolatedNodes = nodes.filter(n => {
      const hasSource = sourceIds.has(n.id)
      const hasTarget = targetIds.has(n.id)

      // 开始节点：必须有出边
      if (isStartNode(n)) {
        return !hasSource
      }
      // 结束节点：必须有入边
      if (isEndNode(n)) {
        return !hasTarget
      }
      // 其他节点：必须有入边和出边
      return !hasSource || !hasTarget
    })

    if (isolatedNodes.length > 0) {
      const nodeNames = isolatedNodes.map(n => n.label || n.type).join('、')
      errors.push(`孤立节点: ${nodeNames}`)
    }

    return errors
  }

  /**
   * 验证 AI 节点配置
   */
  function validateAINodes(nodes: any[]): string[] {
    const errors: string[] = []
    const aiNodes = nodes.filter(isAINode)

    aiNodes.forEach(node => {
      if (!node.data?.prompt) {
        errors.push(`节点"${node.label}"缺少 Prompt 配置`)
      }
    })

    return errors
  }

  /**
   * 验证知识检索节点配置
   */
  function validateKnowledgeNodes(nodes: any[]): string[] {
    const errors: string[] = []
    const knowledgeNodes = nodes.filter(isKnowledgeNode)

    knowledgeNodes.forEach(node => {
      if (!node.data?.kbId) {
        errors.push(`节点"${node.label}"未选择知识库`)
      }
    })

    return errors
  }

  return {
    validateWorkflow
  }
}
