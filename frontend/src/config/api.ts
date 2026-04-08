// API 配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// API 端点
export const API_ENDPOINTS = {
  workflows: `${API_BASE_URL}/workflows`,
  knowledgeBases: `${API_BASE_URL}/knowledge-bases`,
  chat: `${API_BASE_URL}/chat`,
}

// 辅助函数
export const getWorkflowUrl = (id?: string) =>
  id ? `${API_ENDPOINTS.workflows}/${id}` : API_ENDPOINTS.workflows

export const getWorkflowRunUrl = (id: string) =>
  `${API_ENDPOINTS.workflows}/${id}/run`

export const getWorkflowRunStreamUrl = (id: string) =>
  `${API_ENDPOINTS.workflows}/${id}/run-stream`

export const getWorkflowLogsUrl = (id: string) =>
  `${API_ENDPOINTS.workflows}/${id}/logs`

export const getKnowledgeBasesUrl = () => API_ENDPOINTS.knowledgeBases
