import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenAI } from 'openai';
import { Session, Message } from './chat.entity';
import { ExecutorService } from '../workflow/executor.service';
import { WorkflowService } from '../workflow/workflow.service';
import { WorkflowDefinition } from '../workflow/interfaces/workflow.interface';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || 'mock-key',
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.siliconflow.cn/v1',
    timeout: 30000,
    maxRetries: 2,
  });

  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private executorService: ExecutorService,
    private workflowService: WorkflowService,
  ) {}

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
      throw new Error(
        `Message content exceeds maximum length of ${this.MAX_MESSAGE_LENGTH} characters`,
      );
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
    const logs = await this.executorService.runWorkflow(definition, {
      input: content,
    });

    // 4. 收集知识检索结果（用于答案溯源）
    const sourceDocs: {
      id: string;
      content: string;
      score: number;
      documentName: string;
    }[] = [];
    for (const log of logs) {
      if (
        log.output &&
        log.output.fragments &&
        Array.isArray(log.output.fragments)
      ) {
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
    const lastLog = logs
      .slice()
      .reverse()
      .find((l) => l.status === 'COMPLETED');
    let assistantReply = '';

    if (lastLog && lastLog.output) {
      assistantReply = this.extractTextFromOutput(lastLog.output);
    }

    // 验证响应内容
    if (!assistantReply || assistantReply.trim() === '') {
      // 检查是否有失败的节点
      const failedLog = logs.find((l) => l.status === 'FAILED');
      if (failedLog) {
        assistantReply = `工作流执行出错：${failedLog.error || '未知错误'}`;
      } else {
        // 记录详细日志帮助调试
        this.logger.warn('工作流执行完成但无有效输出', {
          lastLog: lastLog
            ? { nodeId: lastLog.nodeId, output: lastLog.output }
            : null,
          allLogs: logs.map((l) => ({
            nodeId: l.nodeId,
            status: l.status,
            hasOutput: !!l.output,
          })),
        });
        assistantReply =
          '工作流执行完成，但没有返回有效内容。请确保：\n1. 工作流包含AI节点\n2. AI节点连接到输出节点\n3. AI节点的prompt配置正确';
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

    // 7. 如果是第一条消息，异步生成会话标题（不阻塞响应）
    this.generateSessionTitle(sessionId, content).catch((err) => {
      this.logger.error(
        `[sendMessage] Failed to generate session title: ${err.message}`,
      );
    });

    return assistantMsg;
  }

  /**
   * 从节点输出中提取文本内容
   */
  private extractTextFromOutput(output: any): string {
    this.logger.debug(
      `[extractTextFromOutput] Input: ${JSON.stringify(output).substring(0, 500)}`,
    );

    if (output === null || output === undefined) {
      return '';
    }

    if (typeof output !== 'object') {
      return String(output);
    }

    // 1. 优先使用 text 字段（AI节点的标准输出）
    if (output.text !== undefined && output.text !== null) {
      this.logger.debug(
        `[extractTextFromOutput] Found text field: ${output.text.substring(0, 100)}`,
      );
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

    // 4. 遍历所有字段（除了 input），找到第一个非对象的有效值
    const keys = Object.keys(output).filter(
      (k) => k !== '_context' && k !== 'input' && !k.startsWith('__'),
    );
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

    // 5. 最后使用 input 字段（兜底选项）
    // 注意：input 字段通常是用户的原始输入，应该作为最后的兜底选项
    // 只有在前面没有找到任何有效字段（text/content/fragments/其他字段）时才使用
    if (output.input !== undefined && output.input !== null) {
      const inputStr = String(output.input);
      if (inputStr.length > 0) {
        this.logger.debug(
          `[extractTextFromOutput] Using input field as fallback: ${inputStr.substring(0, 100)}`,
        );
        return inputStr;
      }
    }

    return '';
  }

  // 流式发送消息（公开API）
  async sendMessageStream(
    sessionId: string,
    content: string,
    onToken: (data: any) => void,
  ) {
    return this.sendMessageStreamInternal(sessionId, content, onToken, true);
  }

  // 流式发送消息内部实现
  private async sendMessageStreamInternal(
    sessionId: string,
    content: string,
    onToken: (data: any) => void,
    saveUserMessage: boolean = true,
  ) {
    this.validateContent(content);

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['workflow'],
    });
    if (!session) throw new Error('Session not found');

    // 1. 保存用户消息（仅在需要时）
    if (saveUserMessage) {
      const userMsg = this.messageRepository.create({
        role: 'user',
        content,
        session,
      });
      await this.messageRepository.save(userMsg);
      this.logger.debug(
        `[sendMessageStream] Saved user message: ${content.substring(0, 100)}`,
      );
    }

    // 2. 转换工作流定义
    const workflow = session.workflow;
    const definition: WorkflowDefinition = {
      id: workflow.id,
      name: workflow.name,
      nodes: workflow.nodes,
      edges: workflow.edges,
    };

    // 3. 收集知识检索结果（用于答案溯源）
    const sourceDocs: {
      id: string;
      content: string;
      score: number;
      documentName: string;
    }[] = [];

    // 4. 执行工作流（带 token 回调）
    const logs = await this.executorService.runWorkflow(
      definition,
      { input: content },
      undefined, // onEvent
      (token) => {
        // 每个 token 都通过 SSE 发送
        onToken({ type: 'token', content: token });
      },
    );

    // 5. 收集知识检索结果
    for (const log of logs) {
      if (
        log.output &&
        log.output.fragments &&
        Array.isArray(log.output.fragments)
      ) {
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
    const lastLog = logs
      .slice()
      .reverse()
      .find((l) => l.status === 'COMPLETED');
    let assistantReply = '';

    if (lastLog && lastLog.output) {
      this.logger.debug(
        `[sendMessageStream] OUTPUT node output: ${JSON.stringify(lastLog.output)}`,
      );
      assistantReply = this.extractTextFromOutput(lastLog.output);
      this.logger.debug(
        `[sendMessageStream] Extracted assistantReply: ${assistantReply.substring(0, 200)}`,
      );
    } else {
      this.logger.warn(
        `[sendMessageStream] No completed log found. Logs: ${logs.map((l) => ({ nodeId: l.nodeId, status: l.status }))}`,
      );
    }

    // 验证响应内容
    if (!assistantReply || assistantReply.trim() === '') {
      // 检查是否有失败的节点
      const failedLog = logs.find((l) => l.status === 'FAILED');
      if (failedLog) {
        assistantReply = `工作流执行出错：${failedLog.error || '未知错误'}`;
      } else {
        // 记录详细日志帮助调试
        this.logger.warn('工作流执行完成但无有效输出(流式)', {
          lastLog: lastLog
            ? { nodeId: lastLog.nodeId, output: lastLog.output }
            : null,
          allLogs: logs.map((l) => ({
            nodeId: l.nodeId,
            status: l.status,
            hasOutput: !!l.output,
          })),
        });
        assistantReply =
          '工作流执行完成，但没有返回有效内容。请确保：\n1. 工作流包含AI节点\n2. AI节点连接到输出节点\n3. AI节点的prompt配置正确';
      }
    }

    // 7. 发送完成事件
    onToken({
      type: 'done',
      content: assistantReply,
      metadata: sourceDocs.length > 0 ? { sourceDocs } : undefined,
    });

    // 8. 保存助手回复（带溯源元数据）
    const assistantMsg = this.messageRepository.create({
      role: 'assistant',
      content: assistantReply,
      session,
      metadata: sourceDocs.length > 0 ? { sourceDocs } : undefined,
    });
    await this.messageRepository.save(assistantMsg);
    this.logger.log(
      `[sendMessageStream] Saved assistant message (${assistantReply.length} chars): ${assistantReply.substring(0, 100)}...`,
    );

    // 9. 如果是第一条消息，异步生成会话标题（不阻塞响应）
    this.generateSessionTitle(sessionId, content).catch((err) => {
      this.logger.error(
        `[sendMessageStream] Failed to generate session title: ${err.message}`,
      );
    });
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
      if (msg.metadata?.sourceDocs && msg.metadata.sourceDocs.length > 0) {
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
  async regenerateMessage(
    sessionId: string,
    onToken: (data: any) => void,
  ): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['workflow', 'messages'],
    });
    if (!session) throw new Error('Session not found');

    // 获取最后一条用户消息
    const userMessages =
      session.messages?.filter((m) => m.role === 'user') || [];
    if (userMessages.length === 0) {
      throw new Error('没有用户消息可重新生成回复');
    }

    const lastUserMsg = userMessages[userMessages.length - 1];

    // 删除之前的助手回复（如果有）
    const assistantMessages =
      session.messages?.filter(
        (m) => m.role === 'assistant' && m.createdAt > lastUserMsg.createdAt,
      ) || [];
    for (const msg of assistantMessages) {
      await this.messageRepository.remove(msg);
    }

    // 重新执行工作流，跳过保存用户消息（因为已经存在）
    await this.sendMessageStreamInternal(
      sessionId,
      lastUserMsg.content,
      onToken,
      false,
    );
  }

  /**
   * 使用AI智能生成会话标题
   * 基于用户第一条消息生成简洁的标题（不超过20个字）
   */
  private async generateSessionTitle(
    sessionId: string,
    userMessage: string,
  ): Promise<string | null> {
    try {
      // 获取会话信息
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId },
        relations: ['messages'],
      });

      if (!session) return null;

      // 只处理第一条消息（用户消息数<=1且当前无标题或标题是默认格式）
      const userMessages =
        session.messages?.filter((m) => m.role === 'user') || [];
      if (userMessages.length > 1) return null;

      // 如果标题已经被自定义过（不是默认格式），不再重新生成
      if (session.name && !session.name.startsWith('Chat with')) {
        return null;
      }

      this.logger.log(
        `[generateSessionTitle] Generating title for session ${sessionId}, user message: ${userMessage.substring(0, 50)}...`,
      );

      const model = process.env.LLM_MODEL || 'deepseek-ai/DeepSeek-V3';
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              '你是一个会话标题生成助手。基于用户的第一条消息，生成一个简洁、准确的会话标题。\n要求：\n1. 标题长度不超过20个字\n2. 准确概括用户意图\n3. 不要包含标点符号\n4. 直接返回标题文本，不要有任何解释',
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.3,
        max_tokens: 50,
      });

      const title = response.choices[0]?.message?.content?.trim();
      if (!title) {
        this.logger.warn(
          `[generateSessionTitle] Empty title generated for session ${sessionId}`,
        );
        return null;
      }

      // 清理标题：移除可能的引号、限制长度
      const cleanTitle = title
        .replace(/^["']|["']$/g, '') // 移除首尾引号
        .replace(/[\n\r]/g, '') // 移除换行
        .substring(0, 20); // 限制长度

      if (cleanTitle.length < 2) {
        this.logger.warn(
          `[generateSessionTitle] Title too short: "${cleanTitle}"`,
        );
        return null;
      }

      // 更新会话标题
      session.name = cleanTitle;
      await this.sessionRepository.save(session);

      this.logger.log(
        `[generateSessionTitle] Generated title: "${cleanTitle}" for session ${sessionId}`,
      );
      return cleanTitle;
    } catch (error: any) {
      this.logger.error(
        `[generateSessionTitle] Failed to generate title: ${error.message}`,
      );
      return null;
    }
  }
}
