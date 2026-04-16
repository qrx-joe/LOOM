import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeChunk } from '../entities';
import { EmbeddingService } from './embedding.service';
import {
  SearchConfig,
  SearchResult,
  HybridSearchResult,
  DEFAULT_SEARCH_CONFIG,
} from '../interfaces';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  // BM25 参数
  private readonly BM25_K1 = 1.5;
  private readonly BM25_B = 0.75;

  // 停用词
  private readonly STOP_WORDS = new Set([
    '的',
    '了',
    '是',
    '在',
    '我',
    '有',
    '和',
    '就',
    '不',
    '人',
    '都',
    '一',
    '一个',
    '上',
    '也',
    '很',
    '到',
    '说',
    '要',
    '去',
    '你',
    'the',
    'a',
    'an',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'need',
    'it',
    'this',
    'that',
    'these',
    'those',
    'i',
    'you',
    'he',
    'she',
    'we',
    'they',
    'what',
    'which',
    'who',
    'whom',
    'if',
    'then',
    'because',
    'as',
    'until',
    'while',
  ]);

  // 文档频率缓存
  private documentFrequency: Map<string, number> = new Map();
  private totalDocuments = 0;

  constructor(
    @InjectRepository(KnowledgeChunk)
    private chunkRepository: Repository<KnowledgeChunk>,
    private embeddingService: EmbeddingService,
  ) {}

  async search(
    kbId: string,
    query: string,
    config: SearchConfig = DEFAULT_SEARCH_CONFIG,
  ): Promise<HybridSearchResult> {
    // 获取知识库下所有 chunks
    const chunks = await this.chunkRepository.find({
      where: { document: { knowledgeBase: { id: kbId } } },
      relations: ['document'],
    });

    if (chunks.length === 0) {
      return { results: [], query, total: 0 };
    }

    // 更新统计信息
    this.updateStats(chunks);

    // 获取查询向量
    let queryEmbedding: number[] = [];
    try {
      const embeddingResult = await this.embeddingService.getEmbedding(query);
      queryEmbedding = embeddingResult.embedding;
    } catch (error) {
      this.logger.warn(
        `Failed to get query embedding, using keyword-only search: ${error.message}`,
      );
    }

    // 计算平均文档长度
    const avgDocLen =
      chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length;

    // 计算分数
    const queryWords = this.tokenize(query);
    const results: SearchResult[] = chunks.map((chunk) => {
      const keywordScore = this.calculateBM25(
        queryWords,
        chunk.content,
        avgDocLen,
      );
      const vectorScore =
        chunk.embedding && queryEmbedding.length > 0
          ? this.cosineSimilarity(queryEmbedding, chunk.embedding)
          : 0;

      const combinedScore =
        config.keywordWeight * keywordScore + config.vectorWeight * vectorScore;

      return {
        chunkId: chunk.id,
        content: chunk.content,
        score: combinedScore,
        keywordScore,
        vectorScore,
        documentName: chunk.document?.name,
        documentId: chunk.document?.id,
      };
    });

    // 排序并返回 topK
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, config.topK);

    return {
      results: topResults,
      query,
      total: results.length,
    };
  }

  private updateStats(chunks: KnowledgeChunk[]): void {
    this.totalDocuments = chunks.length;
    this.documentFrequency.clear();

    for (const chunk of chunks) {
      const words = this.tokenize(chunk.content);
      const uniqueWords = new Set(words);
      for (const word of uniqueWords) {
        this.documentFrequency.set(
          word,
          (this.documentFrequency.get(word) || 0) + 1,
        );
      }
    }
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !this.STOP_WORDS.has(w));
  }

  private calculateBM25(
    queryWords: string[],
    document: string,
    avgDocLen: number,
  ): number {
    if (queryWords.length === 0 || document.length === 0) {
      return 0;
    }

    const docWords = this.tokenize(document);
    const docLen = document.length;
    const docWordFreq = new Map<string, number>();

    for (const word of docWords) {
      docWordFreq.set(word, (docWordFreq.get(word) || 0) + 1);
    }

    let score = 0;
    const N = Math.max(this.totalDocuments, 1);

    for (const term of queryWords) {
      const df = this.documentFrequency.get(term) || 0;
      if (df === 0) continue;

      // IDF
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

      // TF
      const tf = docWordFreq.get(term) || 0;
      const tfComponent =
        ((this.BM25_K1 + 1) * tf) /
        (this.BM25_K1 * (1 - this.BM25_B + (this.BM25_B * docLen) / avgDocLen) +
          tf);

      score += idf * tfComponent;
    }

    // Sigmoid 归一化
    return 1 / (1 + Math.exp(-score));
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
      return 0;
    }

    const len = Math.min(vecA.length, vecB.length);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < len; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dotProduct / denom : 0;
  }
}
