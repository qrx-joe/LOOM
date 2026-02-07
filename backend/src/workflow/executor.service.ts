import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'openai';
import { WorkflowDefinition, NodeData, ExecutionLog, NodeType } from './interfaces/workflow.interface';
import { KnowledgeService } from '../knowledge/knowledge.service';

@Injectable()
export class ExecutorService {
    private readonly logger = new Logger(ExecutorService.name);
    private readonly openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'mock-key',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });

    constructor(private readonly knowledgeService: KnowledgeService) { }

    async runWorkflow(workflow: WorkflowDefinition, initialInput: any = {}): Promise<ExecutionLog[]> {
        this.logger.log(`Starting workflow execution: ${workflow.name} (${workflow.id})`);

        const logs: ExecutionLog[] = [];
        const nodeResults = new Map<string, any>();
        nodeResults.set('START_INPUT', initialInput);

        // 1. 构建邻接表和入度表
        const adj = new Map<string, string[]>();
        const inDegree = new Map<string, number>();

        workflow.nodes.forEach(node => {
            adj.set(node.id, []);
            inDegree.set(node.id, 0);
        });

        workflow.edges.forEach(edge => {
            const sourceAdj = adj.get(edge.source);
            if (sourceAdj) {
                sourceAdj.push(edge.target);
            }
            inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
        });

        // 2. 拓扑排序队列
        const queue: string[] = [];
        inDegree.forEach((degree, nodeId) => {
            if (degree === 0) queue.push(nodeId);
        });

        // 3. 按顺序执行
        while (queue.length > 0) {
            const nodeId = queue.shift();
            if (!nodeId) continue;

            const node = workflow.nodes.find(n => n.id === nodeId);
            if (!node) continue;

            const log: ExecutionLog = {
                nodeId,
                status: 'RUNNING',
                input: this.resolveInputs(node, nodeResults),
                output: null,
                startTime: Date.now(),
            };
            logs.push(log);

            try {
                const result = await this.executeNode(node, log.input);
                log.status = 'COMPLETED';
                log.output = result;
                log.endTime = Date.now();
                nodeResults.set(nodeId, result);
            } catch (error: any) {
                log.status = 'FAILED';
                log.error = error.message;
                log.endTime = Date.now();
                this.logger.error(`Node ${nodeId} failed: ${error.message}`);
                // 如果节点失败，后续逻辑视业务而定，Demo 简单处理为中断
                break;
            }

            // 处理后继节点
            const nextNodes = adj.get(nodeId);
            if (nextNodes) {
                nextNodes.forEach(nextId => {
                    const currentInDegree = inDegree.get(nextId) || 0;
                    inDegree.set(nextId, currentInDegree - 1);
                    if (inDegree.get(nextId) === 0) {
                        queue.push(nextId);
                    }
                });
            }
        }

        return logs;
    }

    private resolveInputs(node: NodeData, nodeResults: Map<string, any>): any {
        // 简单的变量映射逻辑：从结果池中提取所需变量
        // 例如：node.config.promptTemplates = "Hello {{prevNodeId.output}}"
        // 这里的实现视具体 Workflow 协议而定
        return { ...node.config, _context: Object.fromEntries(nodeResults) };
    }

    private async executeNode(node: NodeData, input: any): Promise<any> {
        switch (node.type) {
            case NodeType.START:
                return input;
            case NodeType.AI_AGENT:
                return this.handleAIRequest(node, input);
            case NodeType.KNOWLEDGE_RETRIEVAL:
                return this.handleKnowledgeRetrieval(node, input);
            case NodeType.CONDITION:
                return this.handleCondition(node, input);
            case NodeType.END:
                return input;
            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    }

    private async handleAIRequest(node: NodeData, input: any): Promise<any> {
        this.logger.log(`Executing AI Agent node: ${node.id}`);
        // 提取 prompt 并替换上下文变量
        let prompt = node.config.prompt || 'Hello';

        // 简单的变量插值: {{nodeId.output}}
        if (input._context) {
            Object.entries(input._context).forEach(([key, val]: [string, any]) => {
                const search = `{{${key}}}`;
                const replace = typeof val === 'object' ? JSON.stringify(val) : String(val);
                prompt = prompt.split(search).join(replace);
            });
        }

        try {
            const response = await this.openai.chat.completions.create({
                model: node.config.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
            });
            return { text: response.choices[0].message.content };
        } catch (error: any) {
            this.logger.error(`AI call failed: ${error.message}`);
            return { text: `[AI Error: ${error.message}]` };
        }
    }

    private async handleKnowledgeRetrieval(node: NodeData, input: any): Promise<any> {
        this.logger.log(`Executing Knowledge Retrieval node: ${node.id}`);
        const { kbId, query } = input;
        if (!kbId || !query) {
            return { fragments: [], error: 'Missing kbId or query' };
        }
        const results = await this.knowledgeService.search(kbId, query);
        return { fragments: results.map(r => ({ id: r.id, content: r.content, score: r.score })) };
    }

    private async handleCondition(node: NodeData, input: any): Promise<any> {
        // 简单的分支逻辑实现
        this.logger.log(`Executing Condition node: ${node.id}`);
        return input;
    }
}
