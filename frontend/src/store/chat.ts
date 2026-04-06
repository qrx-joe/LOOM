import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useChatStore = defineStore('chat', () => {
    const sessions = ref<any[]>([]);
    const workflows = ref<any[]>([]);
    const currentSessionId = ref<string | null>(null);
    const currentWorkflowId = ref<string | null>(null);
    const messages = ref<any[]>([]);
    const isLoading = ref(false);

    const fetchWorkflows = async () => {
        try {
            const resp = await axios.get('http://localhost:3001/workflows');
            workflows.value = resp.data;
            // 自动选择第一个工作流
            if (resp.data.length > 0 && !currentWorkflowId.value) {
                currentWorkflowId.value = resp.data[0].id;
            }
        } catch (err) {
            console.error('Fetch workflows failed', err);
        }
    };

    const createSession = async (workflowId: string) => {
        try {
            const resp = await axios.post('http://localhost:3001/chat/sessions', { workflowId });
            currentSessionId.value = resp.data.id;
            currentWorkflowId.value = workflowId;
            messages.value = [];
            return resp.data;
        } catch (err) {
            console.error('Create session failed', err);
        }
    };

    const sendMessage = async (content: string) => {
        if (!currentSessionId.value) return;
        isLoading.value = true;

        // 乐观更新：先加用户消息
        messages.value.push({ role: 'user', content, createdAt: new Date() });

        try {
            const resp = await axios.post(`http://localhost:3001/chat/sessions/${currentSessionId.value}/messages`, { content });
            messages.value.push(resp.data);
        } catch (err) {
            console.error('Send message failed', err);
        } finally {
            isLoading.value = false;
        }
    };

    const fetchMessages = async (sessionId: string) => {
        try {
            const resp = await axios.get(`http://localhost:3001/chat/sessions/${sessionId}/messages`);
            messages.value = resp.data;
            currentSessionId.value = sessionId;
        } catch (err) {
            console.error('Fetch messages failed', err);
        }
    };

    return {
        sessions,
        workflows,
        currentSessionId,
        currentWorkflowId,
        messages,
        isLoading,
        fetchWorkflows,
        createSession,
        sendMessage,
        fetchMessages
    };
});
