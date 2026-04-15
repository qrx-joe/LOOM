import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../utils/api-client';
import { showError, showSuccess } from '../utils/toast';
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
    const isLoading = ref(false);

    // 历史记录（撤销/重做）
    const MAX_HISTORY = 30; // 减少最大历史记录数以降低内存占用
    const history = ref<{ nodes: WorkflowNode[]; edges: WorkflowEdge[]; timestamp: number }[]>([]);
    const historyIndex = ref(-1);

    // 结构化克隆 - 比 JSON.parse(JSON.stringify) 更高效
    const deepClone = <T>(obj: T): T => {
        if (typeof structuredClone === 'function') {
            return structuredClone(obj);
        }
        // 降级方案
        return JSON.parse(JSON.stringify(obj));
    };

    // 保存当前状态到历史记录
    const saveHistory = () => {
        // 只保存节点和边的必要字段，避免存储 Vue 响应式额外属性
        const currentState = {
            nodes: nodes.value.map(n => deepClone(n)),
            edges: edges.value.map(e => deepClone(e)),
            timestamp: Date.now(),
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
            const state = history.value[historyIndex.value];
            if (state) {
                nodes.value = deepClone(state.nodes);
                edges.value = deepClone(state.edges);
            }
        }
    };

    // 重做
    const redo = () => {
        if (historyIndex.value < history.value.length - 1) {
            historyIndex.value++;
            const state = history.value[historyIndex.value];
            if (state) {
                nodes.value = deepClone(state.nodes);
                edges.value = deepClone(state.edges);
            }
        }
    };

    // 检查是否可以撤销/重做
    const canUndo = () => historyIndex.value > 0;
    const canRedo = () => historyIndex.value < history.value.length - 1;

    // 加载所有已保存的工作流
    const fetchWorkflows = async () => {
        // 防止重复请求
        if (isLoading.value) return;

        isLoading.value = true;
        try {
            const data = await api.get<Workflow[]>('/workflows');
            savedWorkflows.value = Array.isArray(data) ? data : [];
        } catch (err: any) {
            // 忽略请求取消的错误（去重机制导致的）
            if (err?.message?.includes('取消')) {
                return;
            }
            // 只在非取消错误时打印日志
            console.error('Failed to fetch workflows', err);
            showError(err);
            savedWorkflows.value = [];
        } finally {
            isLoading.value = false;
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
            id: edge.id || `edge-${Date.now()}-${index}`,
        }));
        // 初始化历史记录
        history.value = [{
            nodes: deepClone(nodes.value),
            edges: deepClone(edges.value),
            timestamp: Date.now(),
        }];
        historyIndex.value = 0;
        // 加载的是已保存的数据
        hasUnsavedChanges.value = false;
    };

    // 创建空白工作流
    const createNewWorkflow = () => {
        currentWorkflowId.value = null;
        workflowName.value = '未命名工作流';
        // 创建空白画布（不带默认节点）
        nodes.value = [];
        edges.value = [];
        // 初始化历史记录
        history.value = [{
            nodes: [],
            edges: [],
            timestamp: Date.now(),
        }];
        historyIndex.value = 0;
        // 重置 ID 计数器
        nodeIdCounter = 0;
        edgeIdCounter = 0;
        // 新建的工作流还未保存
        hasUnsavedChanges.value = true;
    };

    // 保存工作流（创建或更新）
    const saveWorkflow = async () => {
        // 深度克隆并清理数据，移除 Vue 响应式额外属性
        const cleanNodes = deepClone(nodes.value);
        const cleanEdges = deepClone(edges.value);

        // 确保每条边都有 ID
        const edgesWithIds = cleanEdges.map((edge: any, index: number) => ({
            ...edge,
            id: edge.id || `edge-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
        }));

        const payload = {
            name: workflowName.value,
            nodes: cleanNodes,
            edges: edgesWithIds,
        };

        try {
            let resultData;
            if (currentWorkflowId.value) {
                // 更新已有工作流
                resultData = await api.put<Workflow>(`/workflows/${currentWorkflowId.value}`, payload);
                showSuccess('工作流已更新');
            } else {
                // 创建新工作流
                resultData = await api.post<Workflow>('/workflows', payload);
                currentWorkflowId.value = resultData?.id;
                showSuccess('工作流已创建');
            }
            // 刷新列表
            await fetchWorkflows();
            // 清除未保存标记
            hasUnsavedChanges.value = false;
            return resultData;
        } catch (err: any) {
            // 忽略请求取消的错误
            if (err?.message?.includes('取消')) {
                return;
            }
            console.error('Failed to save workflow', err);
            showError(err);
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
            const result = await api.post<any>(`/workflows/${currentWorkflowId.value}/run`);
            showSuccess('工作流执行完成');
            return result;
        } catch (err: any) {
            // 忽略请求取消的错误
            if (err?.message?.includes('取消')) {
                return;
            }
            console.error('Failed to run workflow', err);
            showError(err);
            throw err;
        }
    };

    // 删除工作流
    const deleteWorkflow = async (id: string) => {
        console.log('Deleting workflow:', id);
        try {
            await api.delete(`/workflows/${id}`);
            if (currentWorkflowId.value === id) {
                createNewWorkflow();
            }
            await fetchWorkflows();
            showSuccess('工作流已删除');
        } catch (err: any) {
            // 忽略请求取消的错误
            if (err?.message?.includes('取消')) {
                return;
            }
            console.error('Failed to delete workflow', err);
            showError(err);
            throw err;
        }
    };

    // 更新工作流名称
    const updateWorkflowName = async (id: string, name: string) => {
        try {
            await api.put(`/workflows/${id}`, { name });
            await fetchWorkflows();
            // 如果是当前编辑的工作流，更新本地名称
            if (currentWorkflowId.value === id) {
                workflowName.value = name;
            }
            showSuccess('名称已更新');
        } catch (err: any) {
            // 忽略请求取消的错误
            if (err?.message?.includes('取消')) {
                return;
            }
            console.error('Failed to update workflow name', err);
            showError(err);
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
        isLoading,
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
