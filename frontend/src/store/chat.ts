import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export const useChatStore = defineStore('chat', () => {
    const sessions = ref<any[]>([]);
    const workflows = ref<any[]>([]);
    const currentSessionId = ref<string | null>(null);
    const currentWorkflowId = ref<string | null>(null);
    const messages = ref<any[]>([]);
    const isLoading = ref(false);
    const streamingContent = ref('');
    let eventSource: EventSource | null = null;
    let abortController: AbortController | null = null;

    const fetchWorkflows = async () => {
        try {
            const resp = await axios.get(`${API_BASE_URL}/workflows`);
            // 适配后端统一响应格式 { success: true, data: [...] }
            const data = resp.data?.data ?? resp.data;
            workflows.value = Array.isArray(data) ? data : [];
            console.log('Workflows fetched:', workflows.value);
            // 自动选择第一个工作流
            if (workflows.value.length > 0 && !currentWorkflowId.value) {
                currentWorkflowId.value = workflows.value[0].id;
                console.log('Auto-selected workflow:', workflows.value[0].id);
            }
        } catch (err: any) {
            console.error('Fetch workflows failed', err);
            const errorMsg = err.response?.data?.message || err.message || '获取工作流列表失败';
            throw new Error(errorMsg);
        }
    };

    const createSession = async (workflowId: string) => {
        console.log('Creating session for workflow:', workflowId);
        try {
            const resp = await axios.post(`${API_BASE_URL}/agent/sessions`, { workflowId });
            // 适配后端统一响应格式 { success: true, data: {...} }
            const resultData = resp.data?.data ?? resp.data;
            console.log('Session created:', resultData);
            currentSessionId.value = resultData?.id;
            currentWorkflowId.value = workflowId;
            messages.value = [];
            return resultData;
        } catch (err: any) {
            console.error('Create session failed', err);
            const errorMsg = err.response?.data?.message || err.message || '创建会话失败';
            throw new Error(errorMsg);
        }
    };

    // 流式发送消息（打字机效果）
    const sendMessageStream = (content: string) => {
        if (!currentSessionId.value) return;

        // 取消之前的请求（如果有）
        cancelOngoingRequest();

        // 创建新的 AbortController
        abortController = new AbortController();

        // 乐观更新：先加用户消息
        messages.value.push({ role: 'user', content, createdAt: new Date() });

        // 创建 SSE 连接
        const sseUrl = `${API_BASE_URL}/agent/sessions/${currentSessionId.value}/messages/stream?content=${encodeURIComponent(content)}`;
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
            messages.value[assistantMsgIndex].isStreaming = false;

            // 如果已经有内容，保留已有内容而不是覆盖
            if (!streamingContent.value || streamingContent.value.trim() === '') {
                messages.value[assistantMsgIndex].content = '抱歉，连接发生错误，请重试。';
            }
            // 否则保留已接收的内容

            closeStream();
        };
    };

    const closeStream = () => {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    };

    // 取消正在进行的请求
    const cancelOngoingRequest = () => {
        if (abortController) {
            abortController.abort();
            abortController = null;
        }
        closeStream();
    };

    // 非流式发送消息（备用）
    const sendMessage = async (content: string) => {
        if (!currentSessionId.value) return;

        // 取消之前的请求
        cancelOngoingRequest();
        abortController = new AbortController();

        isLoading.value = true;

        // 乐观更新：先加用户消息
        messages.value.push({ role: 'user', content, createdAt: new Date() });

        try {
            const resp = await axios.post(
                `${API_BASE_URL}/agent/sessions/${currentSessionId.value}/messages`,
                { content },
                { signal: abortController.signal }
            );
            // 适配后端统一响应格式
            const resultData = resp.data?.data ?? resp.data;
            messages.value.push(resultData);
        } catch (err: any) {
            if (err.name === 'AbortError' || err.name === 'CanceledError') {
                console.log('Request was cancelled');
            } else {
                console.error('Send message failed', err);
            }
        } finally {
            isLoading.value = false;
            abortController = null;
        }
    };

    const fetchMessages = async (sessionId: string) => {
        try {
            const resp = await axios.get(`${API_BASE_URL}/agent/sessions/${sessionId}/messages`);
            // 适配后端统一响应格式
            const data = resp.data?.data ?? resp.data;
            messages.value = Array.isArray(data) ? data : [];
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
        streamingContent,
        fetchWorkflows,
        createSession,
        sendMessage,
        sendMessageStream,
        fetchMessages,
        closeStream,
        cancelOngoingRequest,
    };
});
