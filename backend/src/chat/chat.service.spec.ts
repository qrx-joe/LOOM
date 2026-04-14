import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { Session, Message } from './chat.entity';
import { ExecutorService } from '../workflow/executor.service';
import { WorkflowService } from '../workflow/workflow.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Workflow } from '../workflow/workflow.entity';

describe('ChatService', () => {
  let service: ChatService;
  let sessionRepo: Repository<Session>;
  let messageRepo: Repository<Message>;
  let executorService: ExecutorService;
  let workflowService: WorkflowService;

  const mockSession = {
    id: 'session-1',
    name: 'Test Session',
    workflow: { id: 'wf-1', name: 'Test Workflow', nodes: [], edges: [] },
    createdAt: new Date(),
  };

  const mockWorkflow = {
    id: 'wf-1',
    name: 'Test Workflow',
    nodes: [
      { id: 'input', type: 'INPUT', label: '输入', position: { x: 0, y: 0 } },
      { id: 'ai', type: 'AI_AGENT', label: 'AI', position: { x: 100, y: 0 }, data: { prompt: 'Hello' } },
      { id: 'output', type: 'OUTPUT', label: '输出', position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'input', target: 'ai' },
      { id: 'e2', source: 'ai', target: 'output' },
    ],
  };

  const mockSessionRepo = {
    find: jest.fn(() => Promise.resolve([mockSession])),
    findOne: jest.fn(() => Promise.resolve(mockSession)),
    create: jest.fn((data) => ({ ...data, id: 'session-1' })),
    save: jest.fn((data) => Promise.resolve({ ...data, id: data.id || 'session-1' })),
    remove: jest.fn(() => Promise.resolve()),
  };

  const mockMessageRepo = {
    find: jest.fn(() => Promise.resolve([])),
    create: jest.fn((data) => ({ ...data, id: 'msg-1' })),
    save: jest.fn((data) => Promise.resolve({ ...data, id: data.id || 'msg-1' })),
    remove: jest.fn(() => Promise.resolve()),
  };

  const mockExecutorService = {
    runWorkflow: jest.fn(() =>
      Promise.resolve([
        { nodeId: 'input', status: 'COMPLETED', output: { input: 'hello' } },
        { nodeId: 'ai', status: 'COMPLETED', output: { text: 'AI response' } },
        { nodeId: 'output', status: 'COMPLETED', output: { text: 'AI response' } },
      ]),
    ),
  };

  const mockWorkflowService = {
    findOne: jest.fn(() => Promise.resolve(mockWorkflow)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(Session),
          useValue: mockSessionRepo,
        },
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepo,
        },
        {
          provide: ExecutorService,
          useValue: mockExecutorService,
        },
        {
          provide: WorkflowService,
          useValue: mockWorkflowService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    sessionRepo = module.get<Repository<Session>>(getRepositoryToken(Session));
    messageRepo = module.get<Repository<Message>>(getRepositoryToken(Message));
    executorService = module.get<ExecutorService>(ExecutorService);
    workflowService = module.get<WorkflowService>(WorkflowService);

    jest.clearAllMocks();
  });

  describe('会话管理', () => {
    it('应该返回所有会话', async () => {
      const sessions = await service.findAllSessions();

      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('session-1');
      expect(mockSessionRepo.find).toHaveBeenCalledWith({
        relations: ['workflow'],
        order: { createdAt: 'DESC' },
      });
    });

    it('应该创建新会话', async () => {
      const session = await service.createSession('wf-1', 'Test Session');

      expect(session.id).toBe('session-1');
      expect(mockWorkflowService.findOne).toHaveBeenCalledWith('wf-1');
      expect(mockSessionRepo.create).toHaveBeenCalledWith({
        name: 'Test Session',
        workflow: mockWorkflow,
      });
      expect(mockSessionRepo.save).toHaveBeenCalled();
    });

    it('工作流不存在时应该抛出错误', async () => {
      mockWorkflowService.findOne.mockResolvedValueOnce(null);

      await expect(service.createSession('invalid-wf', 'Test')).rejects.toThrow('Workflow not found');
    });

    it('应该获取会话消息', async () => {
      const mockMessages = [
        { id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date() },
        { id: 'msg-2', role: 'assistant', content: 'Hi', createdAt: new Date() },
      ];
      mockMessageRepo.find.mockResolvedValueOnce(mockMessages);

      const messages = await service.getMessages('session-1');

      expect(messages).toHaveLength(2);
      expect(mockMessageRepo.find).toHaveBeenCalledWith({
        where: { session: { id: 'session-1' } },
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('消息发送', () => {
    it('应该保存用户消息并执行工作流', async () => {
      const result = await service.sendMessage('session-1', 'Hello AI');

      // 验证保存了用户消息
      expect(mockMessageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Hello AI',
        }),
      );
      expect(mockMessageRepo.save).toHaveBeenCalledTimes(2); // 用户消息 + 助手回复

      // 验证执行了工作流
      expect(mockExecutorService.runWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'wf-1',
          name: 'Test Workflow',
        }),
        { input: 'Hello AI' },
      );

      // 验证返回了助手回复
      expect(result.role).toBe('assistant');
      expect(result.content).toBe('AI response');
    });

    it('会话不存在时应该抛出错误', async () => {
      mockSessionRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.sendMessage('invalid-session', 'Hello')).rejects.toThrow('Session not found');
    });

    it('应该处理知识检索结果溯源', async () => {
      mockExecutorService.runWorkflow.mockResolvedValueOnce([
        { nodeId: 'input', status: 'COMPLETED', output: { input: 'test' } },
        {
          nodeId: 'knowledge',
          status: 'COMPLETED',
          output: {
            fragments: [
              { id: 'chunk-1', content: 'Test content', score: 0.95, documentName: 'doc.pdf' },
            ],
          },
        },
        { nodeId: 'ai', status: 'COMPLETED', output: { text: 'Answer based on knowledge' } },
      ]);

      const result = await service.sendMessage('session-1', 'test');

      // 验证消息包含了溯源元数据
      expect(mockMessageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            sourceDocs: [
              { id: 'chunk-1', content: 'Test content', score: 0.95, documentName: 'doc.pdf' },
            ],
          },
        }),
      );
    });

    it('应该保存用户消息并返回AI回复', async () => {
      const result = await service.sendMessage('session-1', 'Hello AI');

      expect(mockMessageRepo.save).toHaveBeenCalledTimes(2);
      expect(result.role).toBe('assistant');
    });

    it('工作流无输出时应该返回友好提示', async () => {
      mockExecutorService.runWorkflow.mockResolvedValueOnce([
        { nodeId: 'input', status: 'COMPLETED', output: { input: 'test' } },
        { nodeId: 'output', status: 'COMPLETED', output: {} },
      ]);

      const result = await service.sendMessage('session-1', 'test');

      expect(result.content).toContain('工作流执行完成，但没有返回有效内容');
    });
  });

  describe('流式消息发送', () => {
    it('应该支持流式发送', async () => {
      const onToken = jest.fn();

      mockExecutorService.runWorkflow.mockImplementationOnce((wf, input, onEvent, onTokenCb) => {
        // 模拟流式调用
        if (onTokenCb) {
          onTokenCb('Hello');
          onTokenCb(' World');
        }
        return Promise.resolve([
          { nodeId: 'input', status: 'COMPLETED', output: { input: 'test' } },
          { nodeId: 'ai', status: 'COMPLETED', output: { text: 'Hello World' } },
        ]);
      });

      await service.sendMessageStream('session-1', 'test', onToken);

      expect(onToken).toHaveBeenCalledWith({ type: 'token', content: 'Hello' });
      expect(onToken).toHaveBeenCalledWith({ type: 'token', content: ' World' });
      expect(onToken).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'done',
          content: 'Hello World',
        }),
      );
    });

    it('流式发送也应该保存消息', async () => {
      mockExecutorService.runWorkflow.mockResolvedValueOnce([
        { nodeId: 'input', status: 'COMPLETED', output: { input: 'test' } },
        { nodeId: 'ai', status: 'COMPLETED', output: { text: 'Response' } },
      ]);

      await service.sendMessageStream('session-1', 'test', jest.fn());

      expect(mockMessageRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('输出提取', () => {
    it('应该从 text 字段提取内容', async () => {
      mockExecutorService.runWorkflow.mockResolvedValueOnce([
        { nodeId: 'ai', status: 'COMPLETED', output: { text: 'Text content' } },
      ]);

      const result = await service.sendMessage('session-1', 'test');

      expect(result.content).toBe('Text content');
    });

    it('应该从 content 字段提取内容', async () => {
      mockExecutorService.runWorkflow.mockResolvedValueOnce([
        { nodeId: 'ai', status: 'COMPLETED', output: { content: 'Content field' } },
      ]);

      const result = await service.sendMessage('session-1', 'test');

      expect(result.content).toBe('Content field');
    });

    it('应该从 fragments 数组提取内容', async () => {
      mockExecutorService.runWorkflow.mockResolvedValueOnce([
        {
          nodeId: 'knowledge',
          status: 'COMPLETED',
          output: {
            fragments: [{ content: 'Fragment 1' }, { content: 'Fragment 2' }],
          },
        },
      ]);

      const result = await service.sendMessage('session-1', 'test');

      expect(result.content).toBe('Fragment 1\n\nFragment 2');
    });

    it('应该处理嵌套对象提取', async () => {
      mockExecutorService.runWorkflow.mockResolvedValueOnce([
        { nodeId: 'ai', status: 'COMPLETED', output: { nested: { text: 'Nested value' } } },
      ]);

      const result = await service.sendMessage('session-1', 'test');

      expect(result.content).toBe('Nested value');
    });

    it('空输出应该返回友好提示', async () => {
      mockExecutorService.runWorkflow.mockResolvedValueOnce([
        { nodeId: 'ai', status: 'COMPLETED', output: {} },
      ]);

      const result = await service.sendMessage('session-1', 'test');

      expect(result.content).toContain('没有返回有效内容');
    });

    it('空消息内容应该抛出错误', async () => {
      await expect(service.sendMessage('session-1', '')).rejects.toThrow('Message content cannot be empty');
      await expect(service.sendMessage('session-1', '   ')).rejects.toThrow('Message content cannot be empty');
    });

    it('超长消息内容应该抛出错误', async () => {
      const longContent = 'a'.repeat(10001);
      await expect(service.sendMessage('session-1', longContent)).rejects.toThrow('exceeds maximum length');
    });
  });

  describe('会话详情获取', () => {
    it('应该返回会话详情', async () => {
      const session = await service.findSessionById('session-1');

      expect(session.id).toBe('session-1');
      expect(mockSessionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        relations: ['workflow'],
      });
    });

    it('会话不存在时应该抛出错误', async () => {
      mockSessionRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.findSessionById('invalid-id')).rejects.toThrow('Session not found');
    });
  });

  describe('会话删除', () => {
    it('应该删除会话及其消息', async () => {
      const mockSessionWithMessages = {
        ...mockSession,
        messages: [{ id: 'msg-1', content: 'test' }],
      };
      mockSessionRepo.findOne.mockResolvedValueOnce(mockSessionWithMessages);

      const result = await service.deleteSession('session-1');

      expect(mockMessageRepo.remove).toHaveBeenCalledWith(mockSessionWithMessages.messages);
      expect(mockSessionRepo.remove).toHaveBeenCalledWith(mockSessionWithMessages);
      expect(result.success).toBe(true);
    });

    it('删除不存在会话应该抛出错误', async () => {
      mockSessionRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.deleteSession('invalid-id')).rejects.toThrow('Session not found');
    });
  });

  describe('会话重命名', () => {
    it('应该更新会话名称', async () => {
      mockSessionRepo.findOne.mockResolvedValueOnce({ ...mockSession, name: 'Old Name' });

      const result = await service.updateSession('session-1', 'New Name');

      expect(mockSessionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name' })
      );
    });

    it('空名称应该抛出错误', async () => {
      await expect(service.updateSession('session-1', '')).rejects.toThrow('Session name cannot be empty');
      await expect(service.updateSession('session-1', '   ')).rejects.toThrow('Session name cannot be empty');
    });

    it('超长名称应该抛出错误', async () => {
      const longName = 'a'.repeat(101);
      await expect(service.updateSession('session-1', longName)).rejects.toThrow('exceeds maximum length');
    });
  });
});
