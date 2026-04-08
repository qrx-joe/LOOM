import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, Message } from './chat.entity';
import { ExecutorService } from '../workflow/executor.service';
import { WorkflowService } from '../workflow/workflow.service';
import { WorkflowDefinition } from '../workflow/interfaces/workflow.interface';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(Session)
        private sessionRepository: Repository<Session>,
        @InjectRepository(Message)
        private messageRepository: Repository<Message>,
        private executorService: ExecutorService,
        private workflowService: WorkflowService,
    ) { }

    findAllSessions() {
        return this.sessionRepository.find({
            relations: ['workflow'],
            order: { createdAt: 'DESC' },
        });
    }

    async createSession(workflowId: string, name?: string) {
        const workflow = await this.workflowService.findOne(workflowId);
        if (!workflow) throw new Error('Workflow not found');

        const session = this.sessionRepository.create({
            name: name || `Chat with ${workflow.name}`,
            workflow,
        });
        return this.sessionRepository.save(session);
    }

    async getMessages(sessionId: string) {
        return this.messageRepository.find({
            where: { session: { id: sessionId } },
            order: { createdAt: 'ASC' },
        });
    }

    async sendMessage(sessionId: string, content: string) {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
            relations: ['workflow'],
        });
        if (!session) throw new Error('Session not found');

        // 1. 保存用户消息
        const userMsg = this.messageRepository.create({
            role: 'user',
            content,
            session,
        });
        await this.messageRepository.save(userMsg);

        // 2. 转换工作流定义
        const workflow = session.workflow;
        const definition: WorkflowDefinition = {
            id: workflow.id,
            name: workflow.name,
            nodes: workflow.nodes,
            edges: workflow.edges,
        };

        // 3. 执行工作流
        const logs = await this.executorService.runWorkflow(definition, { input: content });

        // 4. 收集知识检索结果（用于答案溯源）
        const sourceDocs: { id: string; content: string; score: number; documentName: string }[] = [];
        for (const log of logs) {
            if (log.output && log.output.fragments && Array.isArray(log.output.fragments)) {
                for (const frag of log.output.fragments) {
                    sourceDocs.push({
                        id: frag.id,
                        content: frag.content,
                        score: frag.score,
                        documentName: frag.documentName || '',
                    });
                }
            }
        }

        // 5. 获取输出节点的结果
        const lastLog = logs.reverse().find(l => l.status === 'COMPLETED');
        let assistantReply = '对不起，我没法理解这个请求。';
        if (lastLog && lastLog.output) {
            assistantReply = typeof lastLog.output === 'object'
                ? (lastLog.output.text || JSON.stringify(lastLog.output))
                : String(lastLog.output);
        }

        // 6. 保存助手回复（带溯源元数据）
        const assistantMsg = this.messageRepository.create({
            role: 'assistant',
            content: assistantReply,
            session,
            metadata: sourceDocs.length > 0 ? { sourceDocs } : undefined,
        });
        await this.messageRepository.save(assistantMsg);

        return assistantMsg;
    }

    // 流式发送消息
    async sendMessageStream(
        sessionId: string,
        content: string,
        onToken: (data: any) => void
    ) {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
            relations: ['workflow'],
        });
        if (!session) throw new Error('Session not found');

        // 1. 保存用户消息
        const userMsg = this.messageRepository.create({
            role: 'user',
            content,
            session,
        });
        await this.messageRepository.save(userMsg);

        // 2. 转换工作流定义
        const workflow = session.workflow;
        const definition: WorkflowDefinition = {
            id: workflow.id,
            name: workflow.name,
            nodes: workflow.nodes,
            edges: workflow.edges,
        };

        // 3. 收集知识检索结果（用于答案溯源）
        const sourceDocs: { id: string; content: string; score: number; documentName: string }[] = [];

        // 4. 执行工作流（带 token 回调）
        const logs = await this.executorService.runWorkflow(
            definition,
            { input: content },
            undefined, // onEvent
            (token) => {
                // 每个 token 都通过 SSE 发送
                onToken({ type: 'token', content: token });
            }
        );

        // 5. 收集知识检索结果
        for (const log of logs) {
            if (log.output && log.output.fragments && Array.isArray(log.output.fragments)) {
                for (const frag of log.output.fragments) {
                    sourceDocs.push({
                        id: frag.id,
                        content: frag.content,
                        score: frag.score,
                        documentName: frag.documentName || '',
                    });
                }
            }
        }

        // 6. 获取输出节点的结果
        const lastLog = logs.reverse().find(l => l.status === 'COMPLETED');
        let assistantReply = '对不起，我没法理解这个请求。';
        if (lastLog && lastLog.output) {
            if (typeof lastLog.output === 'object' && lastLog.output !== null) {
                // 优先使用 text 字段，这是 AI 节点的预期输出格式
                if (lastLog.output.text) {
                    assistantReply = lastLog.output.text;
                } else if (lastLog.output.content) {
                    assistantReply = lastLog.output.content;
                } else if (lastLog.output.fragments) {
                    // 知识检索节点返回 fragments，取第一个片段的内容
                    const frag = lastLog.output.fragments[0];
                    assistantReply = frag?.content || '未找到相关内容';
                } else {
                    // 兜底：检查是否有其他有效字段
                    const keys = Object.keys(lastLog.output).filter(k => k !== '_context');
                    if (keys.length > 0) {
                        assistantReply = String(lastLog.output[keys[0]]);
                    }
                }
            } else {
                assistantReply = String(lastLog.output);
            }
        }

        // 7. 发送完成事件
        onToken({
            type: 'done',
            content: assistantReply,
            metadata: sourceDocs.length > 0 ? { sourceDocs } : undefined
        });

        // 8. 保存助手回复（带溯源元数据）
        const assistantMsg = this.messageRepository.create({
            role: 'assistant',
            content: assistantReply,
            session,
            metadata: sourceDocs.length > 0 ? { sourceDocs } : undefined,
        });
        await this.messageRepository.save(assistantMsg);
    }
}
