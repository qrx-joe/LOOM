import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { OpenAI } from 'openai';
import { WorkflowDefinition, NodeData, ExecutionLog, NodeType } from './interfaces/workflow.interface';
import { SearchService } from '../knowledge/services/search.service';
import { DEFAULT_SEARCH_CONFIG } from '../knowledge/interfaces';
import { WorkflowLog, WorkflowLogStatus } from './workflow-log.entity';
import { ConditionContext } from './strategies/condition.strategy';

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

    // 策略上下文实例
    private readonly conditionContext = new ConditionContext();

    constructor(
        private readonly searchService: SearchService,
        @InjectRepository(WorkflowLog)
        private readonly workflowLogRepo: Repository<WorkflowLog>,
    ) {
        // 打印已注册的策略（调试用）
        this.logger.log(`Registered condition strategies: ${this.conditionContext.getRegisteredStrategies().join(', ')}`);
    }

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

        // 创建工作流执行日志记录
        const workflowLog = (await this.workflowLogRepo.save(
            this.workflowLogRepo.create({
                workflowId: workflow.id,
                nodeId: undefined,
                status: WorkflowLogStatus.RUNNING,
                inputData: initialInput,
                metadata: { name: workflow.name },
            }),
        )) as WorkflowLog;

        // 发送工作流开始事件
        if (onEvent) {
            onEvent({
                type: 'workflow_complete',
                nodeId: 'workflow',
                data: { status: 'started', name: workflow.name, logId: workflowLog.id },
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

        let hasError = false;

        // 3. 按顺序执行
        while (queue.length > 0) {
            const nodeId = queue.shift();
            if (!nodeId) continue;

            const node = workflow.nodes.find(n => n.id === nodeId);
            if (!node) continue;

            const nodeInput = this.resolveInputs(node, nodeResults);
            const startTime = Date.now();

            // 创建节点执行日志（持久化）
            const nodeLog = await this.workflowLogRepo.save(
                this.workflowLogRepo.create({
                    workflowId: workflow.id,
                    nodeId,
                    status: WorkflowLogStatus.RUNNING,
                    inputData: nodeInput,
                }),
            );

            const log: ExecutionLog = {
                nodeId,
                status: 'RUNNING',
                input: nodeInput,
                output: null,
                startTime,
            };
            logs.push(log);

            // 发送节点开始事件
            if (onEvent) {
                onEvent({
                    type: 'node_start',
                    nodeId,
                    data: { input: log.input },
                    timestamp: startTime,
                });
            }

            try {
                const result = await this.executeNode(node, log.input, onToken);
                log.status = 'COMPLETED';
                log.output = result;
                log.endTime = Date.now();
                nodeResults.set(nodeId, result);

                // 更新节点日志为完成
                await this.workflowLogRepo.update(nodeLog.id, {
                    status: WorkflowLogStatus.COMPLETED,
                    outputData: result,
                    completedAt: new Date(log.endTime),
                });

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
                hasError = true;
                this.logger.error(`Node ${nodeId} failed: ${error.message}`);

                // 更新节点日志为失败
                await this.workflowLogRepo.update(nodeLog.id, {
                    status: WorkflowLogStatus.FAILED,
                    error: error.message,
                    completedAt: new Date(log.endTime),
                });

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

        // 更新工作流日志状态
        const updatedLog = await this.workflowLogRepo.findOneBy({ id: workflowLog.id });
        if (updatedLog) {
            updatedLog.status = hasError ? WorkflowLogStatus.FAILED : WorkflowLogStatus.COMPLETED;
            updatedLog.outputData = JSON.stringify({ nodeCount: workflow.nodes.length });
            updatedLog.completedAt = new Date();
            await this.workflowLogRepo.save(updatedLog);
        }

        // 发送工作流完成事件
        if (onEvent) {
            onEvent({
                type: 'workflow_complete',
                nodeId: 'workflow',
                data: { status: hasError ? 'error' : 'completed', logs, logId: workflowLog.id },
                timestamp: Date.now(),
            });
        }

        return logs;
    }

    private resolveInputs(node: NodeData, nodeResults: Map<string, any>): any {
        // 构建节点的输入：使用 config 中的字段，并注入必要的上下文变量
        // 注意：不要把整个 _context 注入到输入中，避免污染节点输出
        const result: any = { ...node.data };

        // 注入上下文中的简单值（排除嵌套对象，避免循环引用）
        const context = Object.fromEntries(nodeResults);
        for (const [key, value] of Object.entries(context)) {
            if (typeof value !== 'object' || value === null) {
                result[key] = value;
            }
        }

        return result;
    }

    private async executeNode(node: NodeData, input: any, onToken?: (token: string) => void): Promise<any> {
        // 兼容 data 和 config 两种属性
        const config = (node as any).config || (node as any).data || {};

        // 兼容 Vue Flow 内置类型和自定义类型
        const nodeType = node.type as string;
        switch (nodeType) {
            case 'input':
            case 'INPUT':
            case NodeType.INPUT:
                // INPUT 节点：直接返回原始输入，这是用户发送的内容
                return { input: input.input || input };
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
            case 'OUTPUT':
            case NodeType.OUTPUT:
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
            const model = config.model || process.env.LLM_MODEL || 'deepseek-ai/DeepSeek-V3';
            const stream = await this.openai.chat.completions.create({
                model,
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

        const searchResult = await this.searchService.search(kbId, query, DEFAULT_SEARCH_CONFIG);
        return {
            fragments: searchResult.results.map(r => ({
                id: r.chunkId,
                content: r.content,
                score: r.score,
                documentName: r.documentName,
            }))
        };
    }

    private async handleCondition(node: NodeData, config: any, input: any): Promise<any> {
        this.logger.log(`Executing Condition node: ${node.id}`);
        const expression = config.expression || '';

        // 使用策略模式执行条件求值
        const { result, strategy } = this.conditionContext.evaluate(input, expression);
        const conditionResult = result ? 'true' : 'false';

        this.logger.log(`Condition node ${node.id} result: ${conditionResult} (using ${strategy} strategy)`);
        return { conditionResult, ...input };
    }
}
