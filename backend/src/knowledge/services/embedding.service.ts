import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EmbeddingConfig, EmbeddingResult, BatchEmbeddingResult } from '../interfaces';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private openai: OpenAI;
  private config: EmbeddingConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      provider: this.configService.get('EMBEDDING_PROVIDER') || 'siliconflow',
      model: this.configService.get('EMBEDDING_MODEL') || 'BAAI/bge-large-zh-v1.5',
      apiKey: this.configService.get('EMBEDDING_API_KEY') || this.configService.get('DEEPSEEK_API_KEY') || '',
      baseUrl: this.configService.get('EMBEDDING_BASE_URL') || 'https://api.siliconflow.cn/v1',
      dimensions: parseInt(this.configService.get('EMBEDDING_DIMENSIONS') || '1024', 10),
    };

    if (this.config.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl,
      });
    } else {
      this.logger.warn('No EMBEDDING_API_KEY configured, embedding service will not work');
    }
  }

  async getEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.openai) {
      throw new Error('Embedding service not configured. Please set EMBEDDING_API_KEY');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.config.model,
        input: text,
        dimensions: this.config.dimensions,
      });

      const data = response.data[0];
      return {
        embedding: data.embedding,
        model: this.config.model,
        tokens: response.usage?.total_tokens,
      };
    } catch (error) {
      this.logger.error(`Failed to get embedding: ${error.message}`);
      throw error;
    }
  }

  async getEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
    if (!this.openai) {
      throw new Error('Embedding service not configured. Please set EMBEDDING_API_KEY');
    }

    if (texts.length === 0) {
      return { embeddings: [], model: this.config.model, totalTokens: 0 };
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.config.model,
        input: texts,
        dimensions: this.config.dimensions,
      });

      const embeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map(item => item.embedding);

      return {
        embeddings,
        model: this.config.model,
        totalTokens: response.usage?.total_tokens,
      };
    } catch (error) {
      this.logger.error(`Failed to get batch embeddings: ${error.message}`);
      throw error;
    }
  }

  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  isConfigured(): boolean {
    return !!this.openai && !!this.config.apiKey;
  }
}
