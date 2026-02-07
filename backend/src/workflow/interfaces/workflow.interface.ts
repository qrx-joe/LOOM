export enum NodeType {
    START = 'START',
    AI_AGENT = 'AI_AGENT',
    CONDITION = 'CONDITION',
    KNOWLEDGE_RETRIEVAL = 'KNOWLEDGE_RETRIEVAL',
    END = 'END',
}

export class NodeData {
    id: string;
    type: NodeType;
    config: any;
    inputVariables?: string[];
    outputVariables?: string[];
}

export class EdgeData {
    id: string;
    source: string;
    target: string;
    condition?: string;
}

export class WorkflowDefinition {
    id: string;
    name: string;
    nodes: NodeData[];
    edges: EdgeData[];
}

export class ExecutionLog {
    nodeId: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    input: any;
    output: any;
    error?: string;
    startTime: number;
    endTime?: number;
}
