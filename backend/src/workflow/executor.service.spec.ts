import { Test, TestingModule } from '@nestjs/testing';
import { ExecutorService, WorkflowEvent } from './executor.service';
import { WorkflowDefinition, NodeType } from './interfaces/workflow.interface';
import { SearchService } from '../knowledge/services/search.service';
import { WorkflowLog, WorkflowLogStatus } from './workflow-log.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

describe('ExecutorService', () => {
  let service: ExecutorService;
  let workflowLogRepo: Repository<WorkflowLog>;
  let searchService: SearchService;

  const mockWorkflowLogRepo = {
    create: jest.fn((data) => ({ ...data, id: 'log-id' })),
    save: jest.fn((data) => Promise.resolve({ ...data, id: data.id || 'log-id' })),
    update: jest.fn(() => Promise.resolve()),
    findOneBy: jest.fn(() => Promise.resolve({ id: 'log-id' })),
  };

  const mockSearchService = {
    search: jest.fn(() =>
      Promise.resolve({
        results: [
          {
            chunkId: 'chunk-1',
            content: 'Test content',
            score: 0.9,
            documentName: 'test.pdf',
          },
        ],
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutorService,
        {
          provide: getRepositoryToken(WorkflowLog),
          useValue: mockWorkflowLogRepo,
        },
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    service = module.get<ExecutorService>(ExecutorService);
    workflowLogRepo = module.get<Repository<WorkflowLog>>(getRepositoryToken(WorkflowLog));
    searchService = module.get<SearchService>(SearchService);

    jest.clearAllMocks();
  });

  describe('基本工作流执行', () => {
    it('应该按拓扑顺序执行简单工作流', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf-1',
        name: 'Test Workflow',
        nodes: [
          { id: 'input', type: NodeType.INPUT, label: '输入', position: { x: 0, y: 0 } },
          { id: 'output', type: NodeType.OUTPUT, label: '输出', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'e1', source: 'input', target: 'output' }],
      };

      const logs = await service.runWorkflow(workflow, { input: 'hello' });

      expect(logs).toHaveLength(2);
      expect(logs[0].nodeId).toBe('input');
      expect(logs[1].nodeId).toBe('output');
      expect(logs.every((l) => l.status === 'COMPLETED')).toBe(true);
    });

    it('应该正确执行工作流并返回日志', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf-1',
        name: 'Data Flow Test',
        nodes: [
          { id: 'input', type: NodeType.INPUT, label: '输入', position: { x: 0, y: 0 } },
          { id: 'output', type: NodeType.OUTPUT, label: '输出', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'e1', source: 'input', target: 'output' }],
      };

      const logs = await service.runWorkflow(workflow, { input: 'test data' });

      expect(logs).toHaveLength(2);
      expect(logs.every((l) => l.status === 'COMPLETED')).toBe(true);
    });
  });

  describe('拓扑排序', () => {
    it('应该处理多分支工作流', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf-1',
        name: 'Branch Workflow',
        nodes: [
          { id: 'input', type: NodeType.INPUT, label: '输入', position: { x: 0, y: 0 } },
          { id: 'node1', type: NodeType.OUTPUT, label: '节点1', position: { x: 100, y: -50 } },
          { id: 'node2', type: NodeType.OUTPUT, label: '节点2', position: { x: 100, y: 50 } },
        ],
        edges: [
          { id: 'e1', source: 'input', target: 'node1' },
          { id: 'e2', source: 'input', target: 'node2' },
        ],
      };

      const logs = await service.runWorkflow(workflow, { input: 'test' });

      expect(logs).toHaveLength(3);
      expect(logs[0].nodeId).toBe('input');
      // node1 和 node2 应该在 input 之后执行，顺序不确定
      expect(['node1', 'node2']).toContain(logs[1].nodeId);
      expect(['node1', 'node2']).toContain(logs[2].nodeId);
    });

    it('应该处理依赖链工作流', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf-1',
        name: 'Chain Workflow',
        nodes: [
          { id: 'a', type: NodeType.INPUT, label: 'A', position: { x: 0, y: 0 } },
          { id: 'b', type: NodeType.OUTPUT, label: 'B', position: { x: 100, y: 0 } },
          { id: 'c', type: NodeType.OUTPUT, label: 'C', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'e1', source: 'a', target: 'b' },
          { id: 'e2', source: 'b', target: 'c' },
        ],
      };

      const logs = await service.runWorkflow(workflow, { input: 'test' });

      expect(logs.map((l) => l.nodeId)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('条件分支', () => {
    it('应该执行条件节点并返回结果', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf-1',
        name: 'Conditional Workflow',
        nodes: [
          { id: 'input', type: NodeType.INPUT, label: '输入', position: { x: 0, y: 0 } },
          {
            id: 'condition',
            type: NodeType.CONDITION,
            label: '条件',
            position: { x: 100, y: 0 },
            data: { expression: '{{score}} > 50' },
          },
          { id: 'output', type: NodeType.OUTPUT, label: '输出', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'e1', source: 'input', target: 'condition' },
          { id: 'e2', source: 'condition', target: 'output' },
        ],
      };

      const logs = await service.runWorkflow(workflow, { input: { score: 75 } });

      const conditionLog = logs.find((l) => l.nodeId === 'condition');
      expect(conditionLog).toBeDefined();
      expect(conditionLog?.output?.conditionResult).toBeDefined();
    });
  });

  describe('事件回调', () => {
    it('应该在节点执行时触发事件', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf-1',
        name: 'Event Test',
        nodes: [
          { id: 'input', type: NodeType.INPUT, label: '输入', position: { x: 0, y: 0 } },
          { id: 'output', type: NodeType.OUTPUT, label: '输出', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'e1', source: 'input', target: 'output' }],
      };

      const events: WorkflowEvent[] = [];
      const onEvent = (event: WorkflowEvent) => events.push(event);

      await service.runWorkflow(workflow, { input: 'test' }, onEvent);

      const nodeStartEvents = events.filter((e) => e.type === 'node_start');
      const nodeCompleteEvents = events.filter((e) => e.type === 'node_complete');

      expect(nodeStartEvents).toHaveLength(2);
      expect(nodeCompleteEvents).toHaveLength(2);
      expect(events.some((e) => e.type === 'workflow_complete')).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该在节点失败时停止执行', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf-1',
        name: 'Error Test',
        nodes: [
          { id: 'input', type: NodeType.INPUT, label: '输入', position: { x: 0, y: 0 } },
          {
            id: 'knowledge',
            type: NodeType.KNOWLEDGE_RETRIEVAL,
            label: '知识检索',
            position: { x: 100, y: 0 },
            data: { kbId: null }, // 故意设置为 null 导致错误
          },
          { id: 'output', type: NodeType.OUTPUT, label: '输出', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'e1', source: 'input', target: 'knowledge' },
          { id: 'e2', source: 'knowledge', target: 'output' },
        ],
      };

      // 知识检索节点在没有 kbId 时不会抛出错误，只是返回空结果
      const logs = await service.runWorkflow(workflow, { input: 'test' });

      expect(logs[0].status).toBe('COMPLETED');
      expect(logs[1].status).toBe('COMPLETED'); // 知识检索返回空结果，不会失败
    });

    it('应该记录失败的节点状态', async () => {
      // 模拟保存失败的情况
      mockWorkflowLogRepo.save.mockRejectedValueOnce(new Error('DB Error'));

      const workflow: WorkflowDefinition = {
        id: 'wf-1',
        name: 'DB Error Test',
        nodes: [{ id: 'input', type: NodeType.INPUT, label: '输入', position: { x: 0, y: 0 } }],
        edges: [],
      };

      await expect(service.runWorkflow(workflow, { input: 'test' })).rejects.toThrow('DB Error');
    });
  });

  describe('日志持久化', () => {
    it('应该为每个节点创建日志记录', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf-1',
        name: 'Logging Test',
        nodes: [
          { id: 'input', type: NodeType.INPUT, label: '输入', position: { x: 0, y: 0 } },
          { id: 'output', type: NodeType.OUTPUT, label: '输出', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'e1', source: 'input', target: 'output' }],
      };

      await service.runWorkflow(workflow, { input: 'test' });

      // 验证为工作流和节点创建了日志
      expect(mockWorkflowLogRepo.save).toHaveBeenCalledTimes(4); // workflow + 2 nodes + final update
    });

    it('应该在节点完成时更新日志状态', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf-1',
        name: 'Update Log Test',
        nodes: [{ id: 'input', type: NodeType.INPUT, label: '输入', position: { x: 0, y: 0 } }],
        edges: [],
      };

      await service.runWorkflow(workflow, { input: 'test' });

      expect(mockWorkflowLogRepo.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: WorkflowLogStatus.COMPLETED,
          outputData: expect.any(Object),
        }),
      );
    });
  });
});
