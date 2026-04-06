import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow } from '../workflow/workflow.entity';
import { KnowledgeBase } from '../knowledge/knowledge.entity';
import { KnowledgeDocument } from '../knowledge/knowledge.entity';
import { KnowledgeChunk } from '../knowledge/knowledge.entity';

@Injectable()
export class SeederService implements OnModuleInit {
    private readonly logger = new Logger(SeederService.name);

    constructor(
        @InjectRepository(Workflow)
        private workflowRepo: Repository<Workflow>,
        @InjectRepository(KnowledgeBase)
        private kbRepo: Repository<KnowledgeBase>,
        @InjectRepository(KnowledgeDocument)
        private docRepo: Repository<KnowledgeDocument>,
        @InjectRepository(KnowledgeChunk)
        private chunkRepo: Repository<KnowledgeChunk>,
    ) {}

    async onModuleInit() {
        await this.seed();
    }

    async seed() {
        // 检查是否已有数据
        const workflowCount = await this.workflowRepo.count();
        if (workflowCount > 0) {
            this.logger.log('Database already seeded, skipping...');
            return;
        }

        this.logger.log('Seeding database with sample data...');

        // 1. 创建示例工作流
        const sampleWorkflow = await this.workflowRepo.save(this.workflowRepo.create({
            name: '智能问答工作流',
            nodes: [
                { id: 'start-1', type: 'START', label: '开始', position: { x: 50, y: 200 }, config: {} },
                { id: 'knowledge-1', type: 'KNOWLEDGE_RETRIEVAL', label: '知识检索', position: { x: 250, y: 200 }, config: { kbId: '', query: '' } },
                { id: 'ai-1', type: 'AI_AGENT', label: 'AI 回答', position: { x: 450, y: 200 }, config: { prompt: '基于以下知识回答用户问题：\n{{knowledge-1.output}}\n\n问题：{{START_INPUT}}' } },
                { id: 'end-1', type: 'END', label: '结束', position: { x: 650, y: 200 }, config: {} },
            ],
            edges: [
                { source: 'start-1', target: 'knowledge-1', sourceHandle: 'out', targetHandle: 'in' },
                { source: 'knowledge-1', target: 'ai-1', sourceHandle: 'out', targetHandle: 'in' },
                { source: 'ai-1', target: 'end-1', sourceHandle: 'out', targetHandle: 'in' },
            ],
        }));
        this.logger.log(`Created sample workflow: ${sampleWorkflow.id}`);

        // 2. 创建示例知识库
        const sampleKb = await this.kbRepo.save(this.kbRepo.create({
            name: 'Mini-Coze 产品指南',
            description: '关于 Mini-Coze 平台的功能介绍和使用指南',
        }));

        // 3. 创建示例文档
        const sampleDoc = await this.docRepo.save(this.docRepo.create({
            name: '产品介绍.txt',
            knowledgeBase: sampleKb,
        }));

        // 4. 创建示例知识片段
        const sampleChunks = [
            { content: 'Mini-Coze 是一个轻量级的智能体平台，支持可视化工作流编排。用户可以通过拖拽节点来创建复杂的工作流程。', order: 0 },
            { content: '平台提供知识库管理功能，支持上传 TXT 和 Markdown 格式的文档。文档会自动进行分片处理，便于精确检索。', order: 1 },
            { content: 'RAG（检索增强生成）技术是平台的核心能力。系统会将文档转换为向量存储，当用户提问时，自动检索相关片段并注入到 AI 上下文中。', order: 2 },
            { content: '工作流节点类型包括：触发器（Trigger）用于启动工作流，AI 节点用于调用大模型，知识检索节点用于 RAG，分支节点用于条件判断。', order: 3 },
            { content: '智能问答功能支持多轮对话，系统会记住对话历史。用户可以在聊天窗口中提出问题，AI 会基于知识库中的内容进行回答。', order: 4 },
        ];

        for (const chunkData of sampleChunks) {
            // 计算简单的词频向量
            const embedding = this.computeSimpleEmbedding(chunkData.content);
            await this.chunkRepo.save(this.chunkRepo.create({
                content: chunkData.content,
                embedding,
                document: sampleDoc,
            }));
        }
        this.logger.log(`Created ${sampleChunks.length} knowledge chunks`);

        // 5. 创建第二个知识库 - 常见问题
        const faqKb = await this.kbRepo.save(this.kbRepo.create({
            name: '常见问题 FAQ',
            description: '用户常见问题及解答',
        }));

        const faqDoc = await this.docRepo.save(this.docRepo.create({
            name: 'FAQ.md',
            knowledgeBase: faqKb,
        }));

        const faqChunks = [
            { content: 'Q: 如何创建工作流？\nA: 点击左侧的"工作流编排" tab，然后从节点面板拖拽所需的节点到画布上，连接节点后即可。', order: 0 },
            { content: 'Q: 如何上传知识库文档？\nA: 进入"知识库管理"，点击"创建知识库"按钮创建一个新的知识库，然后点击知识库卡片上的"上传文档"按钮上传 TXT 或 Markdown 文件。', order: 1 },
            { content: 'Q: RAG 是什么意思？\nA: RAG 是 Retrieval-Augmented Generation（检索增强生成）的缩写。它是一种结合检索和生成的技术，可以从知识库中检索相关文档片段，再让 AI 基于这些片段生成回答。', order: 2 },
            { content: 'Q: 工作流执行失败怎么办？\nA: 检查节点的配置是否正确，查看底部的运行日志了解具体错误信息。常见问题包括：API Key 未配置、知识库 ID 不存在等。', order: 3 },
        ];

        for (const chunkData of faqChunks) {
            const embedding = this.computeSimpleEmbedding(chunkData.content);
            await this.chunkRepo.save(this.chunkRepo.create({
                content: chunkData.content,
                embedding,
                document: faqDoc,
            }));
        }
        this.logger.log(`Created FAQ knowledge base with ${faqChunks.length} chunks`);

        this.logger.log('Database seeding completed!');
    }

    private computeSimpleEmbedding(text: string): number[] {
        // 简化的词频向量
        const DIM = 128;
        const words = text.toLowerCase().replace(/[^\w\s\u4e00-\u9fff]/g, ' ').split(/\s+/).filter(w => w.length > 1);
        const wordFreq = new Map<string, number>();
        for (const w of words) {
            wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
        }

        const vec = new Array(DIM).fill(0);
        let i = 0;
        for (const [, freq] of Array.from(wordFreq.entries()).sort((a, b) => b[1] - a[1]).slice(0, DIM)) {
            vec[i++] = freq;
        }

        // L2 归一化
        const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
        if (norm > 0) for (let j = 0; j < vec.length; j++) vec[j] /= norm;
        return vec;
    }
}
