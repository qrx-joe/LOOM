export type ChunkingStrategy = 'fixed' | 'semantic' | 'recursive';

export interface ChunkingConfig {
  strategy: ChunkingStrategy;
  chunkSize: number;
  chunkOverlap: number;
}

export interface ChunkResult {
  content: string;
  metadata: {
    startIndex: number;
    endIndex: number;
  };
}

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  strategy: 'semantic',
  chunkSize: 500,
  chunkOverlap: 50,
};
