export interface EmbeddingConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  dimensions: number;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokens?: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  totalTokens?: number;
}
