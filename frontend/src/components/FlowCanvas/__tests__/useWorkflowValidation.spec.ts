import { describe, it, expect } from 'vitest'
import { useWorkflowValidation } from '../composables/useWorkflowValidation'
import { NodeType } from '../utils/nodeTypes'

describe('useWorkflowValidation', () => {
  const { validateWorkflow } = useWorkflowValidation()

  describe('空工作流验证', () => {
    it('应该检测到空工作流', () => {
      const result = validateWorkflow([], [])
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('工作流没有任何节点')
    })
  })

  describe('开始节点验证', () => {
    it('应该检测到缺少开始节点', () => {
      const nodes = [
        { id: 'ai-1', type: NodeType.AI_AGENT, label: 'AI', position: { x: 0, y: 0 }, data: { prompt: 'test' } },
        { id: 'end-1', type: NodeType.END, label: '结束', position: { x: 0, y: 0 } },
      ]
      const result = validateWorkflow(nodes, [])
      expect(result.errors).toContain('缺少开始节点')
    })

    it('应该检测到多个开始节点', () => {
      const nodes = [
        { id: 'start-1', type: NodeType.START, label: '开始1', position: { x: 0, y: 0 } },
        { id: 'start-2', type: NodeType.START, label: '开始2', position: { x: 0, y: 0 } },
      ]
      const result = validateWorkflow(nodes, [])
      expect(result.errors).toContain('只能有一个开始节点')
    })
  })

  describe('结束节点验证', () => {
    it('应该检测到缺少结束节点', () => {
      const nodes = [
        { id: 'start-1', type: NodeType.START, label: '开始', position: { x: 0, y: 0 } },
        { id: 'ai-1', type: NodeType.AI_AGENT, label: 'AI', position: { x: 0, y: 0 }, data: { prompt: 'test' } },
      ]
      const result = validateWorkflow(nodes, [])
      expect(result.errors).toContain('缺少结束节点')
    })

    it('应该检测到多个结束节点', () => {
      const nodes = [
        { id: 'start-1', type: NodeType.START, label: '开始', position: { x: 0, y: 0 } },
        { id: 'end-1', type: NodeType.END, label: '结束1', position: { x: 0, y: 0 } },
        { id: 'end-2', type: NodeType.END, label: '结束2', position: { x: 0, y: 0 } },
      ]
      const result = validateWorkflow(nodes, [])
      expect(result.errors).toContain('只能有一个结束节点')
    })
  })

  describe('孤立节点验证', () => {
    it('应该检测到孤立节点', () => {
      const nodes = [
        { id: 'start-1', type: NodeType.START, label: '开始', position: { x: 0, y: 0 } },
        { id: 'end-1', type: NodeType.END, label: '结束', position: { x: 0, y: 0 } },
        { id: 'isolated', type: NodeType.AI_AGENT, label: '孤立节点', position: { x: 0, y: 0 }, data: {} },
      ]
      const edges = [
        { id: 'e1', source: 'start-1', target: 'end-1' },
      ]
      const result = validateWorkflow(nodes, edges)
      expect(result.errors.some(e => e.includes('孤立节点'))).toBe(true)
    })

    it('不应该将正确连接的节点标记为孤立', () => {
      const nodes = [
        { id: 'start-1', type: NodeType.START, label: '开始', position: { x: 0, y: 0 } },
        { id: 'ai-1', type: NodeType.AI_AGENT, label: 'AI', position: { x: 0, y: 0 }, data: { prompt: 'test' } },
        { id: 'end-1', type: NodeType.END, label: '结束', position: { x: 0, y: 0 } },
      ]
      const edges = [
        { id: 'e1', source: 'start-1', target: 'ai-1' },
        { id: 'e2', source: 'ai-1', target: 'end-1' },
      ]
      const result = validateWorkflow(nodes, edges)
      expect(result.errors.some(e => e.includes('孤立节点'))).toBe(false)
    })
  })

  describe('AI 节点验证', () => {
    it('应该检测到缺少 prompt 的 AI 节点', () => {
      const nodes = [
        { id: 'start-1', type: NodeType.START, label: '开始', position: { x: 0, y: 0 } },
        { id: 'ai-1', type: NodeType.AI_AGENT, label: 'AI', position: { x: 0, y: 0 }, data: {} },
        { id: 'end-1', type: NodeType.END, label: '结束', position: { x: 0, y: 0 } },
      ]
      const edges = [
        { id: 'e1', source: 'start-1', target: 'ai-1' },
        { id: 'e2', source: 'ai-1', target: 'end-1' },
      ]
      const result = validateWorkflow(nodes, edges)
      expect(result.errors.some(e => e.includes('缺少 Prompt'))).toBe(true)
    })

    it('不应该报告有 prompt 的 AI 节点', () => {
      const nodes = [
        { id: 'start-1', type: NodeType.START, label: '开始', position: { x: 0, y: 0 } },
        { id: 'ai-1', type: NodeType.AI_AGENT, label: 'AI', position: { x: 0, y: 0 }, data: { prompt: 'test' } },
        { id: 'end-1', type: NodeType.END, label: '结束', position: { x: 0, y: 0 } },
      ]
      const edges = [
        { id: 'e1', source: 'start-1', target: 'ai-1' },
        { id: 'e2', source: 'ai-1', target: 'end-1' },
      ]
      const result = validateWorkflow(nodes, edges)
      expect(result.errors.some(e => e.includes('缺少 Prompt'))).toBe(false)
    })
  })

  describe('知识检索节点验证', () => {
    it('应该检测到未选择知识库的知识检索节点', () => {
      const nodes = [
        { id: 'start-1', type: NodeType.START, label: '开始', position: { x: 0, y: 0 } },
        { id: 'kb-1', type: NodeType.KNOWLEDGE_RETRIEVAL, label: '知识检索', position: { x: 0, y: 0 }, data: {} },
        { id: 'end-1', type: NodeType.END, label: '结束', position: { x: 0, y: 0 } },
      ]
      const edges = [
        { id: 'e1', source: 'start-1', target: 'kb-1' },
        { id: 'e2', source: 'kb-1', target: 'end-1' },
      ]
      const result = validateWorkflow(nodes, edges)
      expect(result.errors.some(e => e.includes('未选择知识库'))).toBe(true)
    })
  })

  describe('完整工作流验证', () => {
    it('应该验证通过正确配置的工作流', () => {
      const nodes = [
        { id: 'start-1', type: NodeType.START, label: '开始', position: { x: 0, y: 0 } },
        { id: 'ai-1', type: NodeType.AI_AGENT, label: 'AI', position: { x: 0, y: 0 }, data: { prompt: 'test' } },
        { id: 'end-1', type: NodeType.END, label: '结束', position: { x: 0, y: 0 } },
      ]
      const edges = [
        { id: 'e1', source: 'start-1', target: 'ai-1' },
        { id: 'e2', source: 'ai-1', target: 'end-1' },
      ]
      const result = validateWorkflow(nodes, edges)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})
