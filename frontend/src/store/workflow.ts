import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useWorkflowStore = defineStore('workflow', () => {
    const nodes = ref<any[]>([]);
    const edges = ref<any[]>([]);
    const workflowName = ref('未命名工作流');

    const saveWorkflow = async () => {
        const payload = {
            id: Date.now().toString(), // 临时 ID
            name: workflowName.value,
            nodes: nodes.value,
            edges: edges.value,
        };
        try {
            const resp = await axios.post('http://localhost:3001/workflows/run-preview', payload);
            return resp.data;
        } catch (err) {
            console.error('Failed to run workflow', err);
            throw err;
        }
    };

    return { nodes, edges, workflowName, saveWorkflow };
});
