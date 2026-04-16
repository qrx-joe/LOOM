/**
 * 工作流共享类型定义
 * 前后端统一使用这些类型，确保类型一致性
 */

// ============ 节点类型 ============
export enum NodeType {
  START = 'START',
  INPUT = 'INPUT', // 兼容旧版本
  END = 'END',
  OUTPUT = 'OUTPUT', // 兼容旧版本
  AI_AGENT = 'AI_AGENT',
  KNOWLEDGE_RETRIEVAL = 'KNOWLEDGE_RETRIEVAL',
  CONDITION = 'CONDITION',
  HTTP_REQUEST = 'HTTP_REQUEST',
}

// 节点类型判断函数
export function isStartNodeType(type: string): boolean {
  return type === NodeType.START || type === NodeType.INPUT;
}

export function isEndNodeType(type: string): boolean {
  return type === NodeType.END || type === NodeType.OUTPUT;
}

export function isAINodeType(type: string): boolean {
  return type === NodeType.AI_AGENT;
}

export function isKnowledgeNodeType(type: string): boolean {
  return type === NodeType.KNOWLEDGE_RETRIEVAL;
}

export function isConditionNodeType(type: string): boolean {
  return type === NodeType.CONDITION;
}

export function isHttpNodeType(type: string): boolean {
  return type === NodeType.HTTP_REQUEST;
}

// ============ 节点数据结构 ============
export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeData {
  // AI 节点配置
  nodeType?: string;
  prompt?: string;
  model?: string;
  temperature?: number;

  // 知识检索节点配置
  kbId?: string;
  query?: string;

  // 条件节点配置
  expression?: string;

  // HTTP 请求节点配置
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;

  // 扩展字段
  [key: string]: any;
}

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: NodePosition;
  data?: NodeData;
}

// ============ 边数据结构 ============
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  condition?: string; // 条件分支
}

// ============ 工作流定义 ============
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt?: string;
}

// ============ 执行日志 ============
export interface ExecutionLog {
  nodeId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  input: any;
  output: any;
  error?: string;
  startTime: number;
  endTime?: number;
}

// ============ 知识检索结果 ============
export interface KnowledgeFragment {
  id: string;
  content: string;
  score: number;
  documentName: string;
  documentId?: string;
}

export interface KnowledgeSearchResult {
  fragments: KnowledgeFragment[];
  query: string;
  total: number;
}

// ============ API 响应 ============
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============ 默认配置 ============
export const DEFAULT_NODE_CONFIG: Record<string, NodeData> = {
  [NodeType.AI_AGENT]: {
    nodeType: NodeType.AI_AGENT,
    prompt: '基于上下文回答问题：\n{{START_INPUT}}',
    model: 'deepseek-ai/DeepSeek-V3',
    temperature: 0.7,
  },
  [NodeType.KNOWLEDGE_RETRIEVAL]: {
    nodeType: NodeType.KNOWLEDGE_RETRIEVAL,
    kbId: '',
    query: '{{START_INPUT}}',
  },
  [NodeType.CONDITION]: {
    nodeType: NodeType.CONDITION,
    expression: '',
  },
  [NodeType.HTTP_REQUEST]: {
    nodeType: NodeType.HTTP_REQUEST,
    url: '',
    method: 'GET',
    headers: {},
    body: '',
    timeout: 30000,
    retryCount: 0,
    retryDelay: 1000,
  },
};

export const NODE_LABELS: Record<string, string> = {
  [NodeType.START]: '开始',
  [NodeType.INPUT]: '开始',
  [NodeType.END]: '结束',
  [NodeType.OUTPUT]: '结束',
  [NodeType.AI_AGENT]: 'AI 回答',
  [NodeType.KNOWLEDGE_RETRIEVAL]: '知识检索',
  [NodeType.CONDITION]: '条件判断',
  [NodeType.HTTP_REQUEST]: 'HTTP 请求',
};
