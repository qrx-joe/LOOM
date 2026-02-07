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
        // 我们将用户输入作为初始输入传入开始节点
        const logs = await this.executorService.runWorkflow(definition, { input: content });

        // 4. 获取输出节点的结果
        // 简单起见，取最后一个完成的节点的 output
        const lastLog = logs.reverse().find(l => l.status === 'COMPLETED');
        let assistantReply = '对不起，我没法理解这个请求。';
        if (lastLog && lastLog.output) {
            assistantReply = typeof lastLog.output === 'object'
                ? (lastLog.output.text || JSON.stringify(lastLog.output))
                : String(lastLog.output);
        }

        // 5. 保存助手回复
        const assistantMsg = this.messageRepository.create({
            role: 'assistant',
            content: assistantReply,
            session,
        });
        await this.messageRepository.save(assistantMsg);

        return assistantMsg;
    }
}
