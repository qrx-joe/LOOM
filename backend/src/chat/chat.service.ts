import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, Message } from './chat.entity';
import { ExecutorService } from '../workflow/executor.service';
import { WorkflowService } from '../workflow/workflow.service';
import { WorkflowDefinition } from '../workflow/interfaces/workflow.interface';

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

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

    async findSessionById(id: string) {
        const session = await this.sessionRepository.findOne({
            where: { id },
            relations: ['workflow'],
        });
        if (!session) throw new Error('Session not found');
        return session;
    }

    async deleteSession(id: string) {
        const session = await this.sessionRepository.findOne({
            where: { id },
            relations: ['messages'],
        });
        if (!session) throw new Error('Session not found');

        // 级联删除消息（通过数据库配置也会自动删除，这里显式处理确保清理）
        if (session.messages?.length > 0) {
            await this.messageRepository.remove(session.messages);
        }

        await this.sessionRepository.remove(session);
        return { success: true, message: 'Session deleted' };
    }

    async updateSession(id: string, name: string) {
        if (!name || name.trim() === '') {
            throw new Error('Session name cannot be empty');
        }
        if (name.length > 100) {
            throw new Error('Session name exceeds maximum length of 100 characters');
        }

        const session = await this.sessionRepository.findOne({ where: { id } });
        if (!session) throw new Error('Session not found');

        session.name = name.trim();
        return this.sessionRepository.save(session);
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

    async getMessages(sessionId: string, page: number = 1, limit: number = 50) {
        const skip = (page - 1) * limit;
        const [messages, total] = await this.messageRepository.findAndCount({
            where: { session: { id: sessionId } },
            order: { createdAt: 'ASC' },
            skip,
            take: limit,
        });
        return {
            messages,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    private readonly MAX_MESSAGE_LENGTH = 10000;

    private validateContent(content: string): void {
        if (!content || content.trim() === '') {
            throw new Error('Message content cannot be empty');
        }
        if (content.length > this.MAX_MESSAGE_LENGTH) {
            throw new Error(`Message content exceeds maximum length of ${this.MAX_MESSAGE_LENGTH} characters`);
        }
    }

    async sendMessage(sessionId: string, content: string) {
        this.validateContent(content);

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
        // 使用 slice() 创建副本再 reverse，避免改变原数组
        const lastLog = logs.slice().reverse().find(l => l.status === 'COMPLETED');
        let assistantReply = '';

        if (lastLog && lastLog.output) {
            assistantReply = this.extractTextFromOutput(lastLog.output);
        }

        // 验证响应内容
        if (!assistantReply || assistantReply.trim() === '') {
            // 检查是否有失败的节点
            const failedLog = logs.find(l => l.status === 'FAILED');
            if (failedLog) {
                assistantReply = `工作流执行出错：${failedLog.error || '未知错误'}`;
            } else {
                // 记录详细日志帮助调试
                this.logger.warn('工作流执行完成但无有效输出', {
                    lastLog: lastLog ? { nodeId: lastLog.nodeId, output: lastLog.output } : null,
                    allLogs: logs.map(l => ({ nodeId: l.nodeId, status: l.status, hasOutput: !!l.output })),
                });
                assistantReply = '工作流执行完成，但没有返回有效内容。请确保：\n1. 工作流包含AI节点\n2. AI节点连接到输出节点\n3. AI节点的prompt配置正确';
            }
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

    /**
     * 从节点输出中提取文本内容
     */
    private extractTextFromOutput(output: any): string {
        this.logger.debug(`[extractTextFromOutput] Input: ${JSON.stringify(output).substring(0, 500)}`);

        if (output === null || output === undefined) {
            return '';
        }

        if (typeof output !== 'object') {
            return String(output);
        }

        // 1. 优先使用 text 字段（AI节点的标准输出）
        if (output.text !== undefined && output.text !== null) {
            this.logger.debug(`[extractTextFromOutput] Found text field: ${output.text.substring(0, 100)}`);
            return String(output.text);
        }

        // 2. 使用 content 字段
        if (output.content !== undefined && output.content !== null) {
            return String(output.content);
        }

        // 3. 使用 fragments 数组（知识检索节点）
        if (output.fragments && Array.isArray(output.fragments)) {
            return output.fragments
                .map((f: any) => f?.content || f?.text || '')
                .filter((c: string) => c)
                .join('\n\n');
        }

        // 4. 使用 input 字段（但避免返回原始用户输入）
        if (output.input !== undefined && output.input !== null) {
            const inputStr = String(output.input);
            // 如果 input 只是简单的用户输入（无其他有效字段），继续查找其他字段
            if (Object.keys(output).length > 1 && inputStr.length > 0) {
                // 有其他字段，优先使用 input
                return inputStr;
            }
            // 只有当没有其他有效字段时才使用 input
        }

        // 5. 遍历所有字段，找到第一个非对象的有效值
        const keys = Object.keys(output).filter(k => k !== '_context' && !k.startsWith('__'));
        for (const key of keys) {
            const val = output[key];
            if (val !== null && val !== undefined) {
                if (typeof val === 'string') {
                    return val;
                }
                if (typeof val === 'object') {
                    // 递归提取对象中的文本
                    const nested = this.extractTextFromOutput(val);
                    if (nested) return nested;
                } else {
                    return String(val);
                }
            }
        }

        return '';
    }

    // 流式发送消息
    async sendMessageStream(
        sessionId: string,
        content: string,
        onToken: (data: any) => void
    ) {
        this.validateContent(content);

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
        // 使用 slice() 创建副本再 reverse，避免改变原数组
        const lastLog = logs.slice().reverse().find(l => l.status === 'COMPLETED');
        let assistantReply = '';

        if (lastLog && lastLog.output) {
            assistantReply = this.extractTextFromOutput(lastLog.output);
        }

        // 验证响应内容
        if (!assistantReply || assistantReply.trim() === '') {
            // 检查是否有失败的节点
            const failedLog = logs.find(l => l.status === 'FAILED');
            if (failedLog) {
                assistantReply = `工作流执行出错：${failedLog.error || '未知错误'}`;
            } else {
                // 记录详细日志帮助调试
                this.logger.warn('工作流执行完成但无有效输出(流式)', {
                    lastLog: lastLog ? { nodeId: lastLog.nodeId, output: lastLog.output } : null,
                    allLogs: logs.map(l => ({ nodeId: l.nodeId, status: l.status, hasOutput: !!l.output })),
                });
                assistantReply = '工作流执行完成，但没有返回有效内容。请确保：\n1. 工作流包含AI节点\n2. AI节点连接到输出节点\n3. AI节点的prompt配置正确';
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

    // 导出会话为 Markdown 格式
    async exportSession(sessionId: string): Promise<string> {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
            relations: ['workflow'],
        });
        if (!session) throw new Error('Session not found');

        const { messages } = await this.getMessages(sessionId, 1, 1000);

        let markdown = `# ${session.name || '未命名会话'}\n\n`;
        markdown += `**工作流**: ${session.workflow?.name || '未知'}\n\n`;
        markdown += `**创建时间**: ${session.createdAt.toISOString()}\n\n`;
        markdown += `---\n\n`;

        for (const msg of messages) {
            const role = msg.role === 'user' ? '👤 用户' : '🤖 助手';
            markdown += `## ${role} (${msg.createdAt.toISOString()})\n\n`;
            markdown += `${msg.content}\n\n`;

            // 添加引用来源
            if (msg.metadata?.sourceDocs?.length > 0) {
                markdown += `**引用来源**:\n\n`;
                for (const doc of msg.metadata.sourceDocs) {
                    markdown += `- ${doc.documentName} (相关度: ${(doc.score * 100).toFixed(0)}%)\n`;
                }
                markdown += `\n`;
            }

            markdown += `---\n\n`;
        }

        return markdown;
    }

    // 重新生成最后一条助手回复
    async regenerateMessage(sessionId: string, onToken: (data: any) => void): Promise<void> {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
            relations: ['workflow', 'messages'],
        });
        if (!session) throw new Error('Session not found');

        // 获取最后一条用户消息
        const userMessages = session.messages?.filter(m => m.role === 'user') || [];
        if (userMessages.length === 0) {
            throw new Error('没有用户消息可重新生成回复');
        }

        const lastUserMsg = userMessages[userMessages.length - 1];

        // 删除之前的助手回复（如果有）
        const assistantMessages = session.messages?.filter(m =>
            m.role === 'assistant' && m.createdAt > lastUserMsg.createdAt
        ) || [];
        for (const msg of assistantMessages) {
            await this.messageRepository.remove(msg);
        }

        // 重新执行工作流
        await this.sendMessageStream(sessionId, lastUserMsg.content, onToken);
    }
}
