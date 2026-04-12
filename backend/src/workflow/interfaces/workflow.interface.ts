// 从共享类型导入，保持单一数据源
import {
  NodeType as SharedNodeType,
  WorkflowNode,
  WorkflowEdge,
  WorkflowDefinition as SharedWorkflowDefinition,
  ExecutionLog as SharedExecutionLog,
} from '../../common/types';

// 重新导出，保持向后兼容
export { SharedNodeType as NodeType };
export type { WorkflowNode as NodeData };
export type { WorkflowEdge as EdgeData };
export type { SharedWorkflowDefinition as WorkflowDefinition };
export type { SharedExecutionLog as ExecutionLog };

// 扩展类型（如果需要后端特有的字段）
export interface ExtendedNodeData extends WorkflowNode {
  // 后端特有的字段可以在这里添加
  executionCount?: number;
  lastExecutionTime?: number;
}
