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
    const streamingContent = ref('');
    let eventSource: EventSource | null = null;

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

    // 流式发送消息（打字机效果）
    const sendMessageStream = (content: string) => {
        if (!currentSessionId.value) return;

        // 乐观更新：先加用户消息
        messages.value.push({ role: 'user', content, createdAt: new Date() });

        // 创建 SSE 连接
        const sseUrl = `http://localhost:3001/chat/sessions/${currentSessionId.value}/messages/stream?content=${encodeURIComponent(content)}`;
        eventSource = new EventSource(sseUrl);

        // 添加一个临时的 assistant 消息用于流式更新
        const assistantMsgIndex = messages.value.length;
        messages.value.push({
            role: 'assistant',
            content: '',
            createdAt: new Date(),
            isStreaming: true
        });

        isLoading.value = true;
        streamingContent.value = '';

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'token') {
                    // 累积 token
                    streamingContent.value += data.content;
                    // 更新消息内容（打字机效果）
                    messages.value[assistantMsgIndex].content = streamingContent.value;
                } else if (data.type === 'done') {
                    // 流式结束
                    messages.value[assistantMsgIndex].content = data.content;
                    messages.value[assistantMsgIndex].metadata = data.metadata;
                    messages.value[assistantMsgIndex].isStreaming = false;
                    isLoading.value = false;
                    closeStream();
                }
            } catch (e) {
                console.error('Failed to parse SSE event:', e);
            }
        };

        eventSource.onerror = (error) => {
            console.error('SSE error:', error);
            isLoading.value = false;
            messages.value[assistantMsgIndex].content = '抱歉，发生了错误。';
            messages.value[assistantMsgIndex].isStreaming = false;
            closeStream();
        };
    };

    const closeStream = () => {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    };

    // 非流式发送消息（备用）
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
        sendMessageStream,
        fetchMessages,
        closeStream,
    };
});
