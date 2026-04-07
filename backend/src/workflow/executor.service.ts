import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'openai';
import { WorkflowDefinition, NodeData, ExecutionLog, NodeType } from './interfaces/workflow.interface';
import { KnowledgeService } from '../knowledge/knowledge.service';

// SSE 事件类型
export type WorkflowEventType = 'node_start' | 'node_complete' | 'node_error' | 'workflow_complete' | 'token';

export interface WorkflowEvent {
    type: WorkflowEventType;
    nodeId: string;
    data?: any;
    timestamp: number;
}

export type EventCallback = (event: WorkflowEvent) => void;

@Injectable()
export class ExecutorService {
    private readonly logger = new Logger(ExecutorService.name);
    private readonly openai = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY || 'mock-key',
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.siliconflow.cn/v1',
    });

    constructor(private readonly knowledgeService: KnowledgeService) { }

    async runWorkflow(
        workflow: WorkflowDefinition,
        initialInput: any = {},
        onEvent?: EventCallback,
        onToken?: (token: string) => void
    ): Promise<ExecutionLog[]> {
        this.logger.log(`Starting workflow execution: ${workflow.name} (${workflow.id})`);

        const logs: ExecutionLog[] = [];
        const nodeResults = new Map<string, any>();
        nodeResults.set('START_INPUT', initialInput);

        // 发送工作流开始事件
        if (onEvent) {
            onEvent({
                type: 'workflow_complete',
                nodeId: 'workflow',
                data: { status: 'started', name: workflow.name },
                timestamp: Date.now(),
            });
        }

        // 1. 构建邻接表和入度表
        // adj: sourceId -> [{targetId, condition}]
        const adj = new Map<string, {targetId: string; condition?: string}[]>();
        const inDegree = new Map<string, number>();

        workflow.nodes.forEach(node => {
            adj.set(node.id, []);
            inDegree.set(node.id, 0);
        });

        workflow.edges.forEach(edge => {
            const sourceAdj = adj.get(edge.source);
            if (sourceAdj) {
                sourceAdj.push({ targetId: edge.target, condition: edge.condition });
            }
            // 如果边没有 condition，则无条件执行
            if (!edge.condition) {
                inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
            }
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

            // 发送节点开始事件
            if (onEvent) {
                onEvent({
                    type: 'node_start',
                    nodeId,
                    data: { input: log.input },
                    timestamp: log.startTime,
                });
            }

            try {
                const result = await this.executeNode(node, log.input, onToken);
                log.status = 'COMPLETED';
                log.output = result;
                log.endTime = Date.now();
                nodeResults.set(nodeId, result);

                // 发送节点完成事件
                if (onEvent) {
                    onEvent({
                        type: 'node_complete',
                        nodeId,
                        data: { output: result },
                        timestamp: log.endTime,
                    });
                }
            } catch (error: any) {
                log.status = 'FAILED';
                log.error = error.message;
                log.endTime = Date.now();
                this.logger.error(`Node ${nodeId} failed: ${error.message}`);

                // 发送节点错误事件
                if (onEvent) {
                    onEvent({
                        type: 'node_error',
                        nodeId,
                        data: { error: error.message },
                        timestamp: log.endTime,
                    });
                }
                // 如果节点失败，后续逻辑视业务而定，Demo 简单处理为中断
                break;
            }

            // 处理后继节点
            const nextNodes = adj.get(nodeId);
            if (nextNodes) {
                for (const { targetId, condition } of nextNodes) {
                    // 如果边有条件，检查是否匹配
                    if (condition) {
                        // 条件节点的输出中应该有 conditionResult 字段
                        const conditionResult = nodeResults.get(nodeId)?.conditionResult;
                        if (conditionResult !== condition) {
                            // 条件不匹配，跳过这条边
                            continue;
                        }
                        // 条件匹配，直接加入队列，不走入度递减逻辑
                        queue.push(targetId);
                    } else {
                        // 无条件边，正常处理
                        const currentInDegree = inDegree.get(targetId) || 0;
                        inDegree.set(targetId, currentInDegree - 1);
                        if (inDegree.get(targetId) === 0) {
                            queue.push(targetId);
                        }
                    }
                }
            }
        }

        // 发送工作流完成事件
        if (onEvent) {
            onEvent({
                type: 'workflow_complete',
                nodeId: 'workflow',
                data: { status: 'completed', logs },
                timestamp: Date.now(),
            });
        }

        return logs;
    }

    private resolveInputs(node: NodeData, nodeResults: Map<string, any>): any {
        // 简单的变量映射逻辑：从结果池中提取所需变量
        // 例如：node.config.promptTemplates = "Hello {{prevNodeId.output}}"
        // 这里的实现视具体 Workflow 协议而定
        return { ...node.config, _context: Object.fromEntries(nodeResults) };
    }

    private async executeNode(node: NodeData, input: any, onToken?: (token: string) => void): Promise<any> {
        // 兼容 data 和 config 两种属性
        const config = (node as any).config || (node as any).data || {};

        // 兼容 Vue Flow 内置类型和自定义类型
        const nodeType = node.type as string;
        switch (nodeType) {
            case 'input':
            case 'START':
            case NodeType.START:
                return input;
            case 'AI_AGENT':
            case NodeType.AI_AGENT:
                return this.handleAIRequest(node, config, input, onToken);
            case 'KNOWLEDGE_RETRIEVAL':
            case 'knowledge':
            case NodeType.KNOWLEDGE_RETRIEVAL:
                return this.handleKnowledgeRetrieval(node, config, input);
            case 'CONDITION':
            case 'condition':
            case NodeType.CONDITION:
                return this.handleCondition(node, config, input);
            case 'output':
            case 'END':
            case NodeType.END:
                return input;
            default:
                // 未知类型节点默认透传
                this.logger.warn(`Unknown node type: ${nodeType}, passing through input`);
                return input;
        }
    }

    private async handleAIRequest(node: NodeData, config: any, input: any, onToken?: (token: string) => void): Promise<any> {
        this.logger.log(`Executing AI Agent node: ${node.id}`);
        // 提取 prompt 并替换上下文变量
        let prompt = config.prompt || 'Hello';

        // 简单的变量插值: {{nodeId.output}}
        if (input._context) {
            Object.entries(input._context).forEach(([key, val]: [string, any]) => {
                const search = `{{${key}}}`;
                const replace = typeof val === 'object' ? JSON.stringify(val) : String(val);
                prompt = prompt.split(search).join(replace);
            });
        }

        // 也处理 {{START_INPUT}} 作为用户输入
        if (input.input) {
            prompt = prompt.split('{{START_INPUT}}').join(input.input);
        }

        try {
            // 流式调用
            const stream = await this.openai.chat.completions.create({
                model: config.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: config.temperature ?? 0.7,
                stream: true,
            });

            let fullText = '';
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullText += content;
                    if (onToken) {
                        onToken(content);
                    }
                }
            }
            return { text: fullText };
        } catch (error: any) {
            this.logger.error(`AI call failed: ${error.message}`);
            return { text: `[AI Error: ${error.message}]` };
        }
    }

    private async handleKnowledgeRetrieval(node: NodeData, config: any, input: any): Promise<any> {
        this.logger.log(`Executing Knowledge Retrieval node: ${node.id}`);
        // kbId 和 query 可能来自 config 或 input
        const kbId = config.kbId || input.kbId;
        const query = config.query || input.query || input.input || '';

        if (!kbId) {
            return { fragments: [], error: 'Missing kbId' };
        }
        if (!query) {
            return { fragments: [], error: 'Missing query' };
        }

        const results = await this.knowledgeService.search(kbId, query);
        return {
            fragments: results.map(r => ({
                id: r.id,
                content: r.content,
                score: r.score,
                documentName: r.documentName,
            }))
        };
    }

    private async handleCondition(node: NodeData, config: any, input: any): Promise<any> {
        this.logger.log(`Executing Condition node: ${node.id}`);
        const expression = config.expression || '';

        // 简单的条件表达式求值
        // 支持格式: "{{input}}" > 10, "{{input}}" == "yes" 等
        // 或者直接检查 input 中是否有某个字段
        let conditionResult = 'true'; // 默认走 true 分支

        try {
            // 简单实现：如果表达式包含 >, <, ==, != 等，比较数值或字符串
            const matchGt = expression.match(/{{(\w+)}}\s*>\s*(\d+)/);
            const matchLt = expression.match(/{{(\w+)}}\s*<\s*(\d+)/);
            const matchEq = expression.match(/{{(\w+)}}\s*==\s*"?([^"]+)"?/);

            if (matchGt) {
                const value = parseFloat(input[matchGt[1]] || '0');
                conditionResult = value > parseFloat(matchGt[2]) ? 'true' : 'false';
            } else if (matchLt) {
                const value = parseFloat(input[matchLt[1]] || '0');
                conditionResult = value < parseFloat(matchLt[2]) ? 'true' : 'false';
            } else if (matchEq) {
                const value = String(input[matchEq[1]] || '');
                conditionResult = value === matchEq[2] ? 'true' : 'false';
            } else {
                // 默认：如果 input 有某个字段存在且为真值
                if (input[expression] || expression === 'input') {
                    conditionResult = 'true';
                }
            }
        } catch (e) {
            this.logger.warn(`Condition evaluation error: ${e}`);
        }

        this.logger.log(`Condition node ${node.id} result: ${conditionResult}`);
        return { conditionResult, ...input };
    }
}
