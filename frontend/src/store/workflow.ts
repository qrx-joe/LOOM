import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export interface WorkflowNode {
    id: string;
    type?: string;
    label: string;
    position: { x: number; y: number };
    data?: Record<string, any>;
}

export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
}

export interface Workflow {
    id: string;
    name: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    createdAt?: string;
}

export const useWorkflowStore = defineStore('workflow', () => {
    const nodes = ref<WorkflowNode[]>([]);
    const edges = ref<WorkflowEdge[]>([]);
    const workflowName = ref('未命名工作流');
    const currentWorkflowId = ref<string | null>(null);
    const savedWorkflows = ref<Workflow[]>([]);

    // 加载所有已保存的工作流
    const fetchWorkflows = async () => {
        try {
            const resp = await axios.get('http://localhost:3001/workflows');
            savedWorkflows.value = resp.data;
        } catch (err) {
            console.error('Failed to fetch workflows', err);
        }
    };

    // 加载单个工作流到画布
    const loadWorkflow = (workflow: Workflow) => {
        currentWorkflowId.value = workflow.id;
        workflowName.value = workflow.name;
        nodes.value = workflow.nodes || [];
        // 确保边有 ID
        edges.value = (workflow.edges || []).map((edge, index) => ({
            ...edge,
            id: edge.id || `edge-${index}`,
        }));
    };

    // 创建空白工作流
    const createNewWorkflow = () => {
        currentWorkflowId.value = null;
        workflowName.value = '未命名工作流';
        nodes.value = [];
        edges.value = [];
    };

    // 保存工作流（创建或更新）
    const saveWorkflow = async () => {
        // 确保每条边都有 ID
        const edgesWithIds = edges.value.map((edge, index) => ({
            ...edge,
            id: edge.id || `edge-${Date.now()}-${index}`,
        }));

        const payload = {
            name: workflowName.value,
            nodes: nodes.value,
            edges: edgesWithIds,
        };

        try {
            let resp;
            if (currentWorkflowId.value) {
                // 更新已有工作流
                resp = await axios.put(`http://localhost:3001/workflows/${currentWorkflowId.value}`, payload);
            } else {
                // 创建新工作流
                resp = await axios.post('http://localhost:3001/workflows', payload);
                currentWorkflowId.value = resp.data.id;
            }
            // 刷新列表
            await fetchWorkflows();
            return resp.data;
        } catch (err) {
            console.error('Failed to save workflow', err);
            throw err;
        }
    };

    // 运行工作流（先保存再执行）
    const runWorkflow = async () => {
        // 如果有未保存的修改，先保存
        if (nodes.value.length > 0) {
            await saveWorkflow();
        }

        if (!currentWorkflowId.value) {
            throw new Error('请先保存工作流');
        }

        try {
            const resp = await axios.post(`http://localhost:3001/workflows/${currentWorkflowId.value}/run`);
            return resp.data;
        } catch (err) {
            console.error('Failed to run workflow', err);
            throw err;
        }
    };

    // 删除工作流
    const deleteWorkflow = async (id: string) => {
        try {
            await axios.delete(`http://localhost:3001/workflows/${id}`);
            if (currentWorkflowId.value === id) {
                createNewWorkflow();
            }
            await fetchWorkflows();
        } catch (err) {
            console.error('Failed to delete workflow', err);
            throw err;
        }
    };

    return {
        nodes,
        edges,
        workflowName,
        currentWorkflowId,
        savedWorkflows,
        fetchWorkflows,
        loadWorkflow,
        createNewWorkflow,
        saveWorkflow,
        runWorkflow,
        deleteWorkflow,
    };
});
