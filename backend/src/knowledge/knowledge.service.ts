import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBase, KnowledgeDocument, KnowledgeChunk } from './knowledge.entity';

@Injectable()
export class KnowledgeService {
    private readonly logger = new Logger(KnowledgeService.name);
    // 固定向量维度
    private readonly EMBEDDING_DIM = 384;
    // 停用词
    private readonly STOP_WORDS = new Set([
        '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你',
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'it', 'this', 'that', 'these', 'those',
        'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'if', 'then', 'because', 'as', 'until', 'while'
    ]);

    // 全局词表（从所有 chunk 中提取的高频词）
    private globalVocabulary: Map<string, number> = new Map();
    private vocabFrozen = false;

    constructor(
        @InjectRepository(KnowledgeBase)
        private kbRepository: Repository<KnowledgeBase>,
        @InjectRepository(KnowledgeDocument)
        private docRepository: Repository<KnowledgeDocument>,
        @InjectRepository(KnowledgeChunk)
        private chunkRepository: Repository<KnowledgeChunk>,
    ) {}

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
        const allChunks: string[] = [];

        for (const chunkText of chunks) {
            // 收集所有 chunk 的文本用于构建词表
            allChunks.push(chunkText);
            const embedding = this.computeEmbedding(chunkText);
            const chunk = this.chunkRepository.create({
                content: chunkText,
                embedding,
                document: doc,
            });
            await this.chunkRepository.save(chunk);
        }

        // 更新全局词表（仅在新文档处理时扩展）
        this.updateVocabulary(allChunks);

        return doc;
    }

    // 更新全局词表
    private updateVocabulary(chunks: string[]) {
        const wordFreq = new Map<string, number>();
        for (const chunk of chunks) {
            const words = this.tokenize(chunk);
            for (const word of words) {
                wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
            }
        }
        // 合并到全局词表
        for (const [word, freq] of wordFreq) {
            this.globalVocabulary.set(word, (this.globalVocabulary.get(word) || 0) + freq);
        }
        this.logger.log(`Vocabulary size: ${this.globalVocabulary.size}`);
    }

    // 简单分词（基于空格和标点）
    private tokenize(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 1 && !this.STOP_WORDS.has(w));
    }

    // 基于词频的向量嵌入
    private computeEmbedding(text: string): number[] {
        const words = this.tokenize(text);
        const wordFreq = new Map<string, number>();
        for (const word of words) {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }

        // 如果全局词表为空，使用局部词表
        const vocab = this.globalVocabulary.size > 0 ? this.globalVocabulary : wordFreq;

        // 取最高频的词构建向量
        const topWords = Array.from(vocab.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.EMBEDDING_DIM)
            .map(([w]) => w);

        const vec = new Array(this.EMBEDDING_DIM).fill(0);
        for (let i = 0; i < topWords.length; i++) {
            vec[i] = wordFreq.get(topWords[i]) || 0;
        }

        // L2 归一化
        const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
        if (norm > 0) {
            for (let i = 0; i < vec.length; i++) {
                vec[i] /= norm;
            }
        }

        return vec;
    }

    // 向量搜索（余弦相似度）
    async search(kbId: string, query: string, topK = 3) {
        const queryEmbedding = this.computeEmbedding(query);

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
        // 按句子/段落分块，保留语义完整性
        const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
        const chunks: string[] = [];
        let currentChunk = '';

        for (const para of paragraphs) {
            if (currentChunk.length + para.length <= size) {
                currentChunk += (currentChunk ? '\n' : '') + para;
            } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = para;
            }
        }
        if (currentChunk) chunks.push(currentChunk);

        return chunks.length > 0 ? chunks : [text.slice(0, size)];
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        // 向量维度可能不同（词表变化导致），取较短的长度
        const len = Math.min(vecA.length, vecB.length);
        let dotProduct = 0;
        for (let i = 0; i < len; i++) {
            dotProduct += vecA[i] * vecB[i];
        }
        return dotProduct;
    }
}
