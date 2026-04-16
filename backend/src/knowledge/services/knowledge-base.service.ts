import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  KnowledgeBase,
  KnowledgeDocument,
  KnowledgeChunk,
  ProcessingStatus,
} from '../entities';
import { EmbeddingService } from './embedding.service';
import { ChunkingService } from './chunking.service';
import { DocumentProcessorService } from './document-processor.service';
import { DEFAULT_CHUNKING_CONFIG } from '../interfaces';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    @InjectRepository(KnowledgeBase)
    private kbRepository: Repository<KnowledgeBase>,
    @InjectRepository(KnowledgeDocument)
    private docRepository: Repository<KnowledgeDocument>,
    @InjectRepository(KnowledgeChunk)
    private chunkRepository: Repository<KnowledgeChunk>,
    private embeddingService: EmbeddingService,
    private chunkingService: ChunkingService,
    private documentProcessor: DocumentProcessorService,
  ) {}

  // ==================== 知识库 CRUD ====================

  async createBase(name: string, description?: string): Promise<KnowledgeBase> {
    const kb = this.kbRepository.create({ name, description });
    return this.kbRepository.save(kb);
  }

  async findAllBases(): Promise<KnowledgeBase[]> {
    return this.kbRepository.find({ relations: ['documents'] });
  }

  async findBaseById(id: string): Promise<KnowledgeBase> {
    const kb = await this.kbRepository.findOne({
      where: { id },
      relations: ['documents'],
    });
    if (!kb) throw new NotFoundException('Knowledge Base not found');
    return kb;
  }

  async deleteBase(id: string): Promise<{ success: boolean }> {
    const kb = await this.kbRepository.findOne({
      where: { id },
      relations: ['documents'],
    });
    if (!kb) throw new NotFoundException('Knowledge Base not found');

    // 删除所有关联的文档和 chunks（级联删除）
    for (const doc of kb.documents || []) {
      await this.chunkRepository.delete({ document: { id: doc.id } });
    }
    await this.docRepository.delete({ knowledgeBase: { id } });
    await this.kbRepository.delete(id);

    return { success: true };
  }

  async updateBase(
    id: string,
    name?: string,
    description?: string,
  ): Promise<KnowledgeBase> {
    const kb = await this.kbRepository.findOne({
      where: { id },
      relations: ['documents'],
    });
    if (!kb) throw new NotFoundException('Knowledge Base not found');

    if (name !== undefined) {
      kb.name = name;
    }
    if (description !== undefined) {
      kb.description = description;
    }

    return this.kbRepository.save(kb);
  }

  async getStats(): Promise<{
    totalBases: number;
    totalDocuments: number;
    totalChunks: number;
  }> {
    const totalBases = await this.kbRepository.count();
    const totalDocuments = await this.docRepository.count();
    const totalChunks = await this.chunkRepository.count();
    return { totalBases, totalDocuments, totalChunks };
  }

  // ==================== 文档管理 ====================

  async deleteDocument(id: string): Promise<{ success: boolean }> {
    const doc = await this.docRepository.findOne({
      where: { id },
      relations: ['knowledgeBase'],
    });
    if (!doc) throw new NotFoundException('Document not found');

    await this.chunkRepository.delete({ document: { id } });
    await this.docRepository.delete(id);

    return { success: true };
  }

  async getDocumentStatus(docId: string): Promise<{
    id: string;
    name: string;
    status: ProcessingStatus;
    progress: number;
    errorMessage?: string;
  }> {
    const doc = await this.docRepository.findOneBy({ id: docId });
    if (!doc) throw new NotFoundException('Document not found');

    return {
      id: doc.id,
      name: doc.name,
      status: doc.processingStatus,
      progress: doc.progress,
      errorMessage: doc.errorMessage,
    };
  }

  async getDocumentContent(docId: string): Promise<{
    id: string;
    name: string;
    content: string;
    metadata: {
      pageCount?: number;
      wordCount?: number;
      format?: string;
    };
    chunkCount: number;
  }> {
    const doc = await this.docRepository.findOne({
      where: { id: docId },
      relations: ['chunks'],
    });
    if (!doc) throw new NotFoundException('Document not found');

    // 按顺序合并所有 chunks 的内容
    const sortedChunks = (doc.chunks || []).sort((a, b) => {
      const aIndex = a.metadata?.startIndex || 0;
      const bIndex = b.metadata?.startIndex || 0;
      return aIndex - bIndex;
    });

    const fullContent = sortedChunks.map((chunk) => chunk.content).join('\n\n');

    return {
      id: doc.id,
      name: doc.name,
      content: fullContent,
      metadata: doc.metadata || {},
      chunkCount: sortedChunks.length,
    };
  }

  // ==================== 文档处理 ====================

  async processDocument(
    kbId: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<KnowledgeDocument> {
    const kb = await this.kbRepository.findOneBy({ id: kbId });
    if (!kb) throw new NotFoundException('Knowledge Base not found');

    // 创建文档记录
    const doc = this.docRepository.create({
      name: fileName,
      filePath: fileName, // 对于内存上传，使用文件名作为标识
      mimeType,
      fileSize: buffer.length,
      processingStatus: 'pending',
      progress: 0,
    });
    doc.knowledgeBase = kb;
    await this.docRepository.save(doc);

    // 异步处理文档
    this.processDocumentAsync(doc.id, buffer, mimeType).catch((error) => {
      this.logger.error(
        `Failed to process document ${doc.id}: ${error.message}`,
      );
    });

    return doc;
  }

  private async processDocumentAsync(
    docId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    const doc = await this.docRepository.findOneBy({ id: docId });
    if (!doc) return;

    try {
      this.logger.log(
        `Starting document processing for ${doc.name} (${mimeType}, ${buffer.length} bytes)`,
      );

      // Step 1: 解析文档
      this.logger.log(`[${doc.name}] Step 1/4: Parsing document...`);
      await this.updateProgress(doc, 'parsing', 10);
      const processed = await this.documentProcessor.process(
        buffer,
        mimeType,
        doc.name,
      );
      this.logger.log(
        `[${doc.name}] Document parsed. Words: ${processed.metadata.wordCount}, Pages: ${processed.metadata.pageCount || 'N/A'}`,
      );

      // 更新元数据
      doc.metadata = {
        wordCount: processed.metadata.wordCount,
        pageCount: processed.metadata.pageCount,
        format: processed.metadata.format,
      };
      await this.docRepository.save(doc);

      // Step 2: 分片
      this.logger.log(`[${doc.name}] Step 2/4: Chunking document...`);
      await this.updateProgress(doc, 'chunking', 30);
      const chunks = await this.chunkingService.chunk(
        processed.content,
        DEFAULT_CHUNKING_CONFIG,
      );
      this.logger.log(
        `[${doc.name}] Document split into ${chunks.length} chunks`,
      );

      // Step 3: 生成 Embedding
      await this.updateProgress(doc, 'embedding', 50);
      const chunkTexts = chunks.map((c) => c.content);
      const embeddingModel = this.embeddingService.getConfig().model;

      const embeddings: number[][] = [];
      if (this.embeddingService.isConfigured()) {
        try {
          // 批量获取 embedding
          const batchSize = 20; // API 限制
          for (let i = 0; i < chunkTexts.length; i += batchSize) {
            const batch = chunkTexts.slice(i, i + batchSize);
            const result = await this.embeddingService.getEmbeddings(batch);
            embeddings.push(...result.embeddings);

            // 更新进度
            const progress = 50 + Math.floor((i / chunkTexts.length) * 40);
            await this.updateProgress(doc, 'embedding', progress);
          }
        } catch (error) {
          this.logger.warn(
            `Failed to get embeddings: ${error.message}, chunks will have no embeddings`,
          );
        }
      } else {
        this.logger.warn(
          'Embedding service not configured, chunks will have no embeddings',
        );
      }

      // Step 4: 保存 chunks
      await this.updateProgress(doc, 'embedding', 90);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = this.chunkRepository.create({
          content: chunks[i].content,
          embedding: embeddings[i] || undefined,
          embeddingModel: embeddings[i] ? embeddingModel : undefined,
          metadata: chunks[i].metadata,
          document: doc,
        });
        await this.chunkRepository.save(chunk);
      }

      // 完成
      await this.updateProgress(doc, 'completed', 100);
      this.logger.log(`Document ${doc.name} processed successfully`);
    } catch (error) {
      doc.processingStatus = 'failed';
      doc.errorMessage = error.message;
      await this.docRepository.save(doc);
      this.logger.error(
        `Failed to process document ${doc.name}: ${error.message}`,
      );
      this.logger.error(`Error stack: ${error.stack}`);
      throw error;
    }
  }

  private async updateProgress(
    doc: KnowledgeDocument,
    status: ProcessingStatus,
    progress: number,
  ): Promise<void> {
    doc.processingStatus = status;
    doc.progress = progress;
    await this.docRepository.save(doc);
  }
}
