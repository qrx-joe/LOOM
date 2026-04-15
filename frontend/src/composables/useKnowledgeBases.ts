import { ref, computed } from 'vue'
import { api } from '../utils/api-client'
import {
  getKnowledgeBasesUrl,
  getKnowledgeBaseUrl,
  getUploadDocumentUrl,
  getDocumentStatusUrl,
  getUpdateKnowledgeBaseUrl,
} from '../config/api'

export type ProcessingStatus = 'pending' | 'parsing' | 'chunking' | 'embedding' | 'completed' | 'failed'

export interface Document {
  id: string
  name: string
  createdAt: string
  processingStatus?: ProcessingStatus
  progress?: number
  errorMessage?: string
}

export interface KnowledgeBase {
  id: string
  name: string
  description?: string
  documents?: Document[]
  createdAt: string
}

export function useKnowledgeBases() {
  const kbs = ref<KnowledgeBase[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 搜索关键词
  const searchQuery = ref('')

  // 过滤后的知识库列表
  const filteredKbs = computed(() => {
    if (!searchQuery.value.trim()) return kbs.value
    const query = searchQuery.value.toLowerCase()
    return kbs.value.filter(kb =>
      kb.name.toLowerCase().includes(query) ||
      (kb.description?.toLowerCase().includes(query) ?? false)
    )
  })

  // 获取所有知识库
  const fetchKbs = async () => {
    isLoading.value = true
    error.value = null
    try {
      const data = await api.get<KnowledgeBase[]>(getKnowledgeBasesUrl())
      kbs.value = data || []
      return data || []
    } catch (err: any) {
      error.value = err.message || '获取知识库失败'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 创建知识库
  const createKb = async (name: string, description?: string) => {
    try {
      const newKb = await api.post<KnowledgeBase>(getKnowledgeBasesUrl(), {
        name: name.trim(),
        description: description?.trim() || undefined,
      })
      await fetchKbs()
      return newKb
    } catch (err: any) {
      throw new Error(err.message || '创建失败')
    }
  }

  // 更新知识库
  const updateKb = async (id: string, name: string, description?: string) => {
    try {
      const updated = await api.patch<KnowledgeBase>(getUpdateKnowledgeBaseUrl(id), {
        name: name.trim(),
        description: description?.trim() || undefined,
      })
      await fetchKbs()
      return updated
    } catch (err: any) {
      throw new Error(err.message || '更新失败')
    }
  }

  // 删除知识库
  const deleteKb = async (id: string) => {
    try {
      await api.delete(getKnowledgeBaseUrl(id))
      await fetchKbs()
    } catch (err: any) {
      throw new Error(err.message || '删除失败')
    }
  }

  // 上传文档
  const uploadDocument = async (kbId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const newDoc = await api.post<Document>(getUploadDocumentUrl(kbId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      await fetchKbs()
      return newDoc
    } catch (err: any) {
      throw new Error(err.message || '上传失败')
    }
  }

  // 删除文档
  const deleteDocument = async (docId: string) => {
    try {
      await api.delete(`${getKnowledgeBasesUrl().replace('/bases', '')}/documents/${docId}`)
      await fetchKbs()
    } catch (err: any) {
      throw new Error(err.message || '删除失败')
    }
  }

  // 批量删除文档
  const deleteDocuments = async (docIds: string[]) => {
    try {
      // 并行删除所有文档
      await Promise.all(
        docIds.map(docId =>
          api.delete(`${getKnowledgeBasesUrl().replace('/bases', '')}/documents/${docId}`)
        )
      )
      await fetchKbs()
    } catch (err: any) {
      throw new Error(err.message || '批量删除失败')
    }
  }

  // 获取文档状态
  const getDocumentStatus = async (docId: string) => {
    try {
      const result = await api.get<{
        status: ProcessingStatus
        progress: number
        errorMessage?: string
      }>(getDocumentStatusUrl(docId))
      return result
    } catch (err: any) {
      throw new Error(err.message || '获取状态失败')
    }
  }

  return {
    // State
    kbs,
    isLoading,
    error,
    searchQuery,
    filteredKbs,

    // Actions
    fetchKbs,
    createKb,
    updateKb,
    deleteKb,
    uploadDocument,
    deleteDocument,
    deleteDocuments,
    getDocumentStatus,
  }
}
