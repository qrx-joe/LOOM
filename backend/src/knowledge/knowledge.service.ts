import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBase, KnowledgeDocument, KnowledgeChunk } from './knowledge.entity';

export interface SearchResult {
    id: string;
    content: string;
    documentId: string;
    documentName: string;
    score: number;
    bm25Score?: number;
    vectorScore?: number;
}

interface ChunkWithScore extends KnowledgeChunk {
    bm25Score: number;
    vectorScore: number;
    combinedScore: number;
}

@Injectable()
export class KnowledgeService {
    private readonly logger = new Logger(KnowledgeService.name);
    // 固定向量维度
    private readonly EMBEDDING_DIM = 384;
    // BM25 参数
    private readonly BM25_K1 = 1.5;
    private readonly BM25_B = 0.75;
    // 混合检索权重 (keyword weight)
    private readonly KEYWORD_WEIGHT = 0.4;
    // 停用词
    private readonly STOP_WORDS = new Set([
        '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你',
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'it', 'this', 'that', 'these', 'those',
        'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'if', 'then', 'because', 'as', 'until', 'while'
    ]);

    // 全局词表（从所有 chunk 中提取的高频词）
    private globalVocabulary: Map<string, number> = new Map();
    // 文档频率 (DF) - 用于 IDF 计算
    private documentFrequency: Map<string, number> = new Map();
    // 总文档数
    private totalDocuments = 0;

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

        for (const chunkText of chunks) {
            const embedding = this.computeEmbedding(chunkText);
            const chunk = this.chunkRepository.create({
                content: chunkText,
                embedding,
                document: doc,
            });
            await this.chunkRepository.save(chunk);

            // 更新文档频率
            this.updateDocumentFrequency(chunkText);
        }

        this.totalDocuments++;
        this.logger.log(`Processed document: ${fileName}, chunks: ${chunks.length}`);

        return doc;
    }

    // 更新文档频率（用于 BM25 IDF）
    private updateDocumentFrequency(text: string) {
        const words = this.tokenize(text);
        const uniqueWords = new Set(words);
        for (const word of uniqueWords) {
            this.documentFrequency.set(word, (this.documentFrequency.get(word) || 0) + 1);
        }
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

    // 混合搜索：BM25 + 向量
    async search(kbId: string, query: string, topK = 3): Promise<SearchResult[]> {
        const queryWords = this.tokenize(query);
        const queryEmbedding = this.computeEmbedding(query);

        // 获取知识库下所有的 chunks
        const chunks = await this.chunkRepository.find({
            where: { document: { knowledgeBase: { id: kbId } } },
            relations: ['document'],
        });

        if (chunks.length === 0) {
            return [];
        }

        // 计算 BM25 和向量分数
        const avgDocLen = chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length;

        const scoredChunks: ChunkWithScore[] = chunks.map(chunk => {
            const bm25Score = this.calculateBM25(queryWords, chunk.content, avgDocLen);
            const vectorScore = this.cosineSimilarity(queryEmbedding, chunk.embedding);

            // 混合分数：加权融合
            const combinedScore = this.KEYWORD_WEIGHT * bm25Score + (1 - this.KEYWORD_WEIGHT) * vectorScore;

            return {
                ...chunk,
                bm25Score,
                vectorScore,
                combinedScore,
            };
        });

        // 按混合分数排序
        scoredChunks.sort((a, b) => b.combinedScore - a.combinedScore);

        // 返回 topK 结果
        return scoredChunks.slice(0, topK).map(chunk => ({
            id: chunk.id,
            content: chunk.content,
            documentId: chunk.document?.id || '',
            documentName: chunk.document?.name || '',
            score: chunk.combinedScore,
            bm25Score: chunk.bm25Score,
            vectorScore: chunk.vectorScore,
        }));
    }

    // 计算 BM25 分数
    private calculateBM25(queryWords: string[], document: string, avgDocLen: number): number {
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

            // IDF: log((N - df + 0.5) / (df + 0.5))
            const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

            // TF: (k1 + 1) * tf / (k1 * (1 - b + b * d/avgD) + tf)
            const tf = docWordFreq.get(term) || 0;
            const tfComponent = (this.BM25_K1 + 1) * tf /
                (this.BM25_K1 * (1 - this.BM25_B + this.BM25_B * docLen / avgDocLen) + tf);

            score += idf * tfComponent;
        }

        // 归一化到 0-1 范围（近似）
        // BM25 分数范围不固定，我们使用 sigmoid 近似归一化
        return this.sigmoid(score);
    }

    // Sigmoid 函数用于归一化
    private sigmoid(x: number): number {
        return 1 / (1 + Math.exp(-x));
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
