import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBase, KnowledgeDocument, KnowledgeChunk } from './knowledge.entity';

@Injectable()
export class KnowledgeService {
    private readonly logger = new Logger(KnowledgeService.name);

    constructor(
        @InjectRepository(KnowledgeBase)
        private kbRepository: Repository<KnowledgeBase>,
        @InjectRepository(KnowledgeDocument)
        private docRepository: Repository<KnowledgeDocument>,
        @InjectRepository(KnowledgeChunk)
        private chunkRepository: Repository<KnowledgeChunk>,
    ) { }

    // 创建知识库
    async createBase(name: string, description?: string) {
        const kb = this.kbRepository.create({ name, description });
        return this.kbRepository.save(kb);
    }

    // 获取所有知识库
    async findAllBases() {
        return this.kbRepository.find({ relations: ['documents'] });
    }

    // 上传并分片处理
    async processDocument(kbId: string, fileName: string, content: string) {
        const kb = await this.kbRepository.findOneBy({ id: kbId });
        if (!kb) throw new Error('Knowledge Base not found');

        const doc = this.docRepository.create({ name: fileName, knowledgeBase: kb });
        await this.docRepository.save(doc);

        // 简单分片：按行或固定长度
        const chunks = this.splitText(content, 500);
        for (const chunkText of chunks) {
            const embedding = await this.getMockEmbedding(chunkText);
            const chunk = this.chunkRepository.create({
                content: chunkText,
                embedding,
                document: doc,
            });
            await this.chunkRepository.save(chunk);
        }

        return doc;
    }

    // 向量搜索（余弦相似度）
    async search(kbId: string, query: string, topK = 3) {
        const queryEmbedding = await this.getMockEmbedding(query);

        // 获取知识库下所有的 chunks
        const chunks = await this.chunkRepository.find({
            where: { document: { knowledgeBase: { id: kbId } } },
            relations: ['document'],
        });

        // 计算相似度并排序
        const results = chunks.map(chunk => ({
            ...chunk,
            score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
        }));

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    private splitText(text: string, size: number): string[] {
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += size) {
            chunks.push(text.slice(i, i + size));
        }
        return chunks;
    }

    private async getMockEmbedding(text: string): Promise<number[]> {
        // 仅仅是 Demo 用的 Mock 向量（真实场景应调用 OpenAI Embedding API）
        const vec = new Array(1536).fill(0).map(() => Math.random());
        return vec;
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
