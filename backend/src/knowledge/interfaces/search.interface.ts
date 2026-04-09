export interface SearchConfig {
  topK: number;
  keywordWeight: number;
  vectorWeight: number;
}

export interface SearchResult {
  chunkId: string;
  content: string;
  score: number;
  keywordScore?: number;
  vectorScore?: number;
  documentName?: string;
  documentId?: string;
}

export interface HybridSearchResult {
  results: SearchResult[];
  query: string;
  total: number;
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  topK: 3,
  keywordWeight: 0.4,
  vectorWeight: 0.6,
};
