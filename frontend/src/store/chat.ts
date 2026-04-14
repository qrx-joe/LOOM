import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../utils/api-client';
import { showError, showSuccess } from '../utils/toast';


// 格式化相对时间
function formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    return then.toLocaleDateString('zh-CN');
}

export const useChatStore = defineStore('chat', () => {
    const sessions = ref<any[]>([]);
    const workflows = ref<any[]>([]);
    const currentSessionId = ref<string | null>(null);
    const currentWorkflowId = ref<string | null>(null);
    const messages = ref<any[]>([]);
    const isLoading = ref(false);
    const streamingContent = ref('');
    const lastSendTime = ref<number>(0);
    let eventSource: EventSource | null = null;
    let abortController: AbortController | null = null;

    const fetchWorkflows = async () => {
        try {
            const data = await api.get<any[]>('/workflows');
            workflows.value = Array.isArray(data) ? data : [];
            console.log('Workflows fetched:', workflows.value);
            // 自动选择第一个工作流
            if (workflows.value.length > 0 && !currentWorkflowId.value) {
                currentWorkflowId.value = workflows.value[0].id;
                console.log('Auto-selected workflow:', workflows.value[0].id);
            }
        } catch (err: any) {
            // 忽略请求取消的错误（去重机制导致的）
            if (err?.message?.includes('取消')) {
                return;
            }
            // 只在非取消错误时打印日志
            console.error('Fetch workflows failed', err);
            showError(err);
            throw err;
        }
    };

    const createSession = async (workflowId: string) => {
        console.log('Creating session for workflow:', workflowId);
        try {
            const resultData = await api.post<any>('/agent/sessions', { workflowId });
            console.log('Session created:', resultData);
            if (!resultData?.id) {
                throw new Error('Failed to create session: invalid response');
            }
            currentSessionId.value = resultData.id;
            currentWorkflowId.value = workflowId;
            messages.value = [];
            return resultData;
        } catch (err: any) {
            console.error('Create session failed', err);
            // 忽略请求取消的错误
            if (err?.message?.includes('取消')) {
                return;
            }
            showError(err);
            throw err;
        }
    };

    // 防抖检测：防止重复提交
    const checkDebounce = (): boolean => {
        const now = Date.now();
        const minInterval = 500; // 最小间隔 500ms
        if (now - lastSendTime.value < minInterval) {
            console.warn('发送过于频繁，请稍后再试');
            return false;
        }
        lastSendTime.value = now;
        return true;
    };

    // 流式发送消息（打字机效果）
    const sendMessageStream = (content: string) => {
        if (!currentSessionId.value) return;
        if (!checkDebounce()) return;

        // 取消之前的请求（如果有）
        cancelOngoingRequest();

        // 创建新的 AbortController
        abortController = new AbortController();

        // 乐观更新：先加用户消息
        messages.value.push({ role: 'user', content, createdAt: new Date() });

        // 创建 SSE 连接
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
        const sseUrl = `${baseUrl}/agent/sessions/${currentSessionId.value}/messages/stream?content=${encodeURIComponent(content)}`;
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
                    // 优先使用前端已流式累积的内容（token by token 已经是正确答案）
                    // 只在流式内容为空时才降级使用后端 done.content 兜底
                    // 这样可以避免后端 extractTextFromOutput 的任何提取偏差覆盖正确结果
                    const finalContent = streamingContent.value.trim()
                        ? streamingContent.value
                        : (data.content || '');
                    messages.value[assistantMsgIndex].content = finalContent;
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

    // 重新生成最后一条消息
    const regenerateMessage = () => {
        if (!currentSessionId.value || isLoading.value) return;
        if (!checkDebounce()) return;

        // 移除最后一条助手消息（如果存在）
        const lastMsg = messages.value[messages.value.length - 1];
        if (lastMsg?.role === 'assistant') {
            messages.value.pop();
        }

        // 创建 SSE 连接
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
        const sseUrl = `${baseUrl}/agent/sessions/${currentSessionId.value}/regenerate`;
        eventSource = new EventSource(sseUrl);

        // 添加临时的 assistant 消息
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
                    streamingContent.value += data.content;
                    messages.value[assistantMsgIndex].content = streamingContent.value;
                } else if (data.type === 'done') {
                    const finalContent = streamingContent.value.trim()
                        ? streamingContent.value
                        : (data.content || '');
                    messages.value[assistantMsgIndex].content = finalContent;
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
            if (!streamingContent.value || streamingContent.value.trim() === '') {
                messages.value[assistantMsgIndex].content = '抱歉，重新生成时发生错误，请重试。';
            }
            closeStream();
        };
    };

    // 导出会话
    const exportSession = async () => {
        if (!currentSessionId.value) return;

        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            const response = await fetch(`${baseUrl}/agent/sessions/${currentSessionId.value}/export`);
            if (!response.ok) throw new Error('导出失败');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session-${currentSessionId.value}.md`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showSuccess('会话导出成功');
        } catch (err: any) {
            console.error('导出失败', err);
            showError(err);
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
            const resultData = await api.post<any>(
                `/agent/sessions/${currentSessionId.value}/messages`,
                { content }
            );
            messages.value.push(resultData);
        } catch (err: any) {
            if (err.name === 'AbortError' || err.name === 'CanceledError') {
                console.log('Request was cancelled');
            } else {
                console.error('Send message failed', err);
                showError(err);
            }
        } finally {
            isLoading.value = false;
            abortController = null;
        }
    };

    const fetchMessages = async (sessionId: string) => {
        try {
            const data = await api.get<any[]>(`/agent/sessions/${sessionId}/messages`);
            messages.value = Array.isArray(data) ? data : [];
            currentSessionId.value = sessionId;
        } catch (err: any) {
            console.error('Fetch messages failed', err);
            // 忽略请求取消的错误
            if (err?.message?.includes('取消')) {
                return;
            }
            showError(err);
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
        regenerateMessage,
        exportSession,
        formatRelativeTime,
    };
});
