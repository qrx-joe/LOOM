// API 配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// API 端点
export const API_ENDPOINTS = {
  workflows: `${API_BASE_URL}/workflows`,
  knowledgeBases: `${API_BASE_URL}/knowledge/bases`,
  chat: `${API_BASE_URL}/agent`, // 实际端点是 /agent
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

// 知识库相关
export const getKnowledgeBasesUrl = () => API_ENDPOINTS.knowledgeBases

export const getKnowledgeBaseUrl = (id: string) =>
  `${API_ENDPOINTS.knowledgeBases}/${id}`

export const getUploadDocumentUrl = (kbId: string) =>
  `${API_ENDPOINTS.knowledgeBases}/${kbId}/upload`

export const getDocumentStatusUrl = (docId: string) =>
  `${API_BASE_URL}/knowledge/documents/${docId}/status`

export const getUpdateKnowledgeBaseUrl = (id: string) =>
  `${API_ENDPOINTS.knowledgeBases}/${id}`

export const getSearchKnowledgeUrl = () =>
  `${API_BASE_URL}/knowledge/search`
