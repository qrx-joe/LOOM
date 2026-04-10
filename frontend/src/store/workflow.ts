import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import { getWorkflowUrl } from '../config/api';
// 复用共享类型
import type {
    WorkflowNode,
    WorkflowEdge,
    Workflow,
} from '../types/workflow.types';

// 重新导出类型，保持兼容性
export type { WorkflowNode, WorkflowEdge, Workflow };

export const useWorkflowStore = defineStore('workflow', () => {
    const nodes = ref<WorkflowNode[]>([]);
    const edges = ref<WorkflowEdge[]>([]);
    const workflowName = ref('未命名工作流');
    const currentWorkflowId = ref<string | null>(null);
    const savedWorkflows = ref<Workflow[]>([]);
    const hasUnsavedChanges = ref(false);

    // 历史记录（撤销/重做）
    const MAX_HISTORY = 50;
    const history = ref<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }[]>([]);
    const historyIndex = ref(-1);

    // 保存当前状态到历史记录
    const saveHistory = () => {
        const currentState = {
            nodes: JSON.parse(JSON.stringify(nodes.value)),
            edges: JSON.parse(JSON.stringify(edges.value)),
        };

        // 如果当前不在历史记录末尾，截断后面的历史
        if (historyIndex.value < history.value.length - 1) {
            history.value = history.value.slice(0, historyIndex.value + 1);
        }

        // 添加新历史
        history.value.push(currentState);

        // 限制历史记录数量
        if (history.value.length > MAX_HISTORY) {
            history.value.shift();
        } else {
            historyIndex.value++;
        }

        // 标记有未保存的修改
        hasUnsavedChanges.value = true;
    };

    // 撤销
    const undo = () => {
        if (historyIndex.value > 0) {
            historyIndex.value--;
            const state = history.value[historyIndex.value]
            if (state) {
                nodes.value = JSON.parse(JSON.stringify(state.nodes));
                edges.value = JSON.parse(JSON.stringify(state.edges));
            }
        }
    };

    // 重做
    const redo = () => {
        if (historyIndex.value < history.value.length - 1) {
            historyIndex.value++;
            const state = history.value[historyIndex.value]
            if (state) {
                nodes.value = JSON.parse(JSON.stringify(state.nodes));
                edges.value = JSON.parse(JSON.stringify(state.edges));
            }
        }
    };

    // 检查是否可以撤销/重做
    const canUndo = () => historyIndex.value > 0;
    const canRedo = () => historyIndex.value < history.value.length - 1;

    // 加载所有已保存的工作流
    const fetchWorkflows = async () => {
        try {
            const resp = await axios.get(getWorkflowUrl());
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
        // 初始化历史记录
        history.value = [{
            nodes: JSON.parse(JSON.stringify(nodes.value)),
            edges: JSON.parse(JSON.stringify(edges.value)),
        }];
        historyIndex.value = 0;
        // 加载的是已保存的数据
        hasUnsavedChanges.value = false;
    };

    // 创建空白工作流
    const createNewWorkflow = () => {
        currentWorkflowId.value = null;
        workflowName.value = '未命名工作流';
        // 创建带默认节点的工作流
        nodes.value = [
            { id: 'node-1', type: 'input', label: '开始', position: { x: 100, y: 200 }, data: {} },
            { id: 'node-2', type: 'AI_AGENT', label: 'AI 节点', position: { x: 350, y: 200 }, data: { prompt: '基于上下文回答问题：\n{{START_INPUT}}' } },
            { id: 'node-3', type: 'output', label: '结束', position: { x: 600, y: 200 }, data: {} },
        ];
        edges.value = [
            { id: 'edge-1', source: 'node-1', target: 'node-2', sourceHandle: 'out', targetHandle: 'in' },
            { id: 'edge-2', source: 'node-2', target: 'node-3', sourceHandle: 'out', targetHandle: 'in' },
        ];
        // 初始化历史记录
        history.value = [{
            nodes: JSON.parse(JSON.stringify(nodes.value)),
            edges: JSON.parse(JSON.stringify(edges.value)),
        }];
        historyIndex.value = 0;
        // 新建的工作流还未保存
        hasUnsavedChanges.value = true;
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
                resp = await axios.put(getWorkflowUrl(currentWorkflowId.value), payload);
            } else {
                // 创建新工作流
                resp = await axios.post(getWorkflowUrl(), payload);
                currentWorkflowId.value = resp.data.id;
            }
            // 刷新列表
            await fetchWorkflows();
            // 清除未保存标记
            hasUnsavedChanges.value = false;
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
            const resp = await axios.post(`${getWorkflowUrl(currentWorkflowId.value)}/run`);
            return resp.data;
        } catch (err) {
            console.error('Failed to run workflow', err);
            throw err;
        }
    };

    // 删除工作流
    const deleteWorkflow = async (id: string) => {
        console.log('Deleting workflow:', id);
        try {
            const response = await axios.delete(getWorkflowUrl(id));
            console.log('Delete response:', response);
            if (currentWorkflowId.value === id) {
                createNewWorkflow();
            }
            await fetchWorkflows();
        } catch (err) {
            console.error('Failed to delete workflow', err);
            throw err;
        }
    };

    // 更新工作流名称
    const updateWorkflowName = async (id: string, name: string) => {
        try {
            await axios.put(getWorkflowUrl(id), { name });
            await fetchWorkflows();
            // 如果是当前编辑的工作流，更新本地名称
            if (currentWorkflowId.value === id) {
                workflowName.value = name;
            }
        } catch (err) {
            console.error('Failed to update workflow name', err);
            throw err;
        }
    };

    return {
        nodes,
        edges,
        workflowName,
        currentWorkflowId,
        savedWorkflows,
        hasUnsavedChanges,
        history,
        historyIndex,
        fetchWorkflows,
        loadWorkflow,
        createNewWorkflow,
        saveWorkflow,
        runWorkflow,
        deleteWorkflow,
        updateWorkflowName,
        saveHistory,
        undo,
        redo,
        canUndo,
        canRedo,
    };
});
