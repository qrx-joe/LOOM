import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useChatStore = defineStore('chat', () => {
    const sessions = ref<any[]>([]);
    const currentSessionId = ref<string | null>(null);
    const messages = ref<any[]>([]);
    const isLoading = ref(false);

    const fetchSessions = async () => {
        // 简化版：暂时直接取
    };

    const createSession = async (workflowId: string) => {
        try {
            const resp = await axios.post('http://localhost:3001/chat/sessions', { workflowId });
            currentSessionId.value = resp.data.id;
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

    return { sessions, currentSessionId, messages, isLoading, createSession, sendMessage, fetchMessages };
});
