import { useState } from 'react';
import { useMainStore } from '@/main/stores/mainStore';
import { AGENT_CONFIG } from '@/main/types/agents';
import type { RealTimeAgent, SSEMessage, AgentStatus } from '@/main/types/agents';

interface UseAgentStreamingOptions {
  endpoint?: string | undefined;
  autoConnect?: boolean;
}

interface AgentStreamingState {
  agents: RealTimeAgent[];
  activeAgentIds: string[];
  isConnected: boolean;
  connectionError: string | null;
  lastActivity: Date | null;
}

export function useAgentStreaming(options: UseAgentStreamingOptions = {}) {
  const { endpoint, autoConnect = false } = options;

  // 단일 상태로 통합 - React 최적화 훅 사용 안함
  const [state, setState] = useState<AgentStreamingState>({
    agents: Object.values(AGENT_CONFIG),
    activeAgentIds: [],
    isConnected: false,
    connectionError: null,
    lastActivity: null,
  });

  // MainStore 직접 연결
  const { setActiveAgent, addMessage, updateStreamingMessage } = useMainStore();

  // POST 방식 SSE 연결 함수
  const connect = async (streamEndpoint: string) => {
    try {
      setState((prev) => ({ ...prev, connectionError: null }));

      // POST 방식으로 SSE 연결
      const response = await fetch(streamEndpoint, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      setState((prev) => ({ ...prev, isConnected: true }));

      // ReadableStream으로 SSE 데이터 읽기
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              setState((prev) => ({ ...prev, isConnected: false }));
              break;
            }

            // 스트림 데이터 디코딩
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // 마지막 불완전한 라인을 buffer에 보관
            buffer = lines.pop() || '';

            // 각 라인 처리
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.substring(6).trim();

                if (data && data !== '[DONE]') {
                  handleSSEMessage(data);
                }
              }
            }
          }
        } catch (error) {
          setState((prev) => ({
            ...prev,
            isConnected: false,
            connectionError: error instanceof Error ? error.message : 'Stream error',
          }));
        } finally {
          reader.releaseLock();
        }
      };

      processStream();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        connectionError: error instanceof Error ? error.message : 'Connection failed',
      }));
    }
  };

  // SSE 메시지 처리 - 타입 안전하게 수정
  const handleSSEMessage = (data: string) => {
    try {
      const message: SSEMessage = JSON.parse(data);
      const now = new Date();
      let shouldUpdate = false;

      setState((prevState) => {
        const newAgents = [...prevState.agents];
        const newActiveIds = [...prevState.activeAgentIds];

        // Function call 감지 - 에이전트 활성화
        const functionCalls = message.content?.parts?.filter((part) => part.functionCall) || [];
        for (const part of functionCalls) {
          if (part.functionCall && AGENT_CONFIG[part.functionCall.name]) {
            const agentId = part.functionCall.name;

            // 에이전트 상태 업데이트
            const agentIndex = newAgents.findIndex((a) => a.id === agentId);
            if (agentIndex !== -1) {
              const existingAgent = newAgents[agentIndex];
              if (existingAgent) {
                newAgents[agentIndex] = {
                  id: existingAgent.id,
                  name: existingAgent.name,
                  description: existingAgent.description,
                  icon: existingAgent.icon,
                  tools: existingAgent.tools,
                  category: existingAgent.category,
                  status: 'calling' as AgentStatus,
                  isActive: true,
                  lastActivity: now,
                  currentTaskId: part.functionCall.id,
                };
              }
            }

            // 활성 목록에 추가
            if (!newActiveIds.includes(agentId)) {
              newActiveIds.push(agentId);
            }

            shouldUpdate = true;
            setActiveAgent(agentId);
          }
        }

        // Function response 감지 - 에이전트 비활성화
        const functionResponses =
          message.content?.parts?.filter((part) => part.functionResponse) || [];
        for (const part of functionResponses) {
          if (part.functionResponse && AGENT_CONFIG[part.functionResponse.name]) {
            const agentId = part.functionResponse.name;

            // 에이전트 상태 업데이트
            const agentIndex = newAgents.findIndex((a) => a.id === agentId);
            if (agentIndex !== -1) {
              const hasError = part.functionResponse.response?.error;
              const existingAgent = newAgents[agentIndex];
              if (existingAgent) {
                newAgents[agentIndex] = {
                  id: existingAgent.id,
                  name: existingAgent.name,
                  description: existingAgent.description,
                  icon: existingAgent.icon,
                  tools: existingAgent.tools,
                  category: existingAgent.category,
                  status: (hasError ? 'error' : 'completed') as AgentStatus,
                  isActive: false,
                  lastActivity: now,
                  ...(existingAgent.currentTaskId && {
                    currentTaskId: existingAgent.currentTaskId,
                  }),
                };
              }
            }

            // 활성 목록에서 제거
            const activeIndex = newActiveIds.indexOf(agentId);
            if (activeIndex !== -1) {
              newActiveIds.splice(activeIndex, 1);
            }

            shouldUpdate = true;
          }
        }

        // Partial text 감지 - root_agent 활성화
        const textParts = message.content?.parts?.filter((part) => part.text) || [];
        if (textParts.length > 0 && message.partial) {
          const author = message.author || 'root_agent';
          const content = textParts.map((part) => part.text).join('');

          if (author === 'root_agent') {
            const agentIndex = newAgents.findIndex((a) => a.id === 'root_agent');
            if (agentIndex !== -1) {
              const existingAgent = newAgents[agentIndex];
              if (existingAgent) {
                newAgents[agentIndex] = {
                  id: existingAgent.id,
                  name: existingAgent.name,
                  description: existingAgent.description,
                  icon: existingAgent.icon,
                  tools: existingAgent.tools,
                  category: existingAgent.category,
                  status: 'processing' as AgentStatus,
                  isActive: true,
                  lastActivity: now,
                  ...(existingAgent.currentTaskId && {
                    currentTaskId: existingAgent.currentTaskId,
                  }),
                };
              }
            }

            if (!newActiveIds.includes('root_agent')) {
              newActiveIds.push('root_agent');
            }

            shouldUpdate = true;
          }

          // 스트리밍 메시지 처리
          const messageId = useMainStore.getState().streamingMessageId;
          if (messageId) {
            updateStreamingMessage(messageId, content);
          } else if (author === 'root_agent') {
            const newMessageId = `streaming-${Date.now()}`;
            addMessage({
              id: newMessageId,
              content,
              type: 'ai',
              timestamp: now,
              agentId: author,
              isStreaming: true,
            });
            useMainStore.setState({ streamingMessageId: newMessageId });
          }
        }

        // 상태 업데이트 - 변경사항이 있을 때만
        if (shouldUpdate) {
          return {
            ...prevState,
            agents: newAgents,
            activeAgentIds: newActiveIds,
            lastActivity: now,
          };
        }

        return prevState;
      });
    } catch {
      // SSE 메시지 파싱 에러 시 무시
    }
  };

  // 연결 해제
  const disconnect = () => {
    setState((prev) => ({
      ...prev,
      isConnected: false,
      activeAgentIds: [],
      connectionError: null,
      agents: prev.agents.map((agent) => ({
        ...agent,
        status: 'idle' as AgentStatus,
        isActive: false,
      })),
    }));

    setActiveAgent(null);
  };

  // 수동 연결
  const connectTo = (streamEndpoint: string) => {
    if (state.isConnected) {
      disconnect();
    }
    connect(streamEndpoint);
  };

  // 자동 연결 (단순화)
  if (autoConnect && endpoint && !state.isConnected && !state.connectionError) {
    connect(endpoint);
  }

  // 계산된 값들 - useMemo 없이 직접 계산
  const activeAgents = state.agents.filter((agent) => state.activeAgentIds.includes(agent.id));
  const hasActiveAgents = state.activeAgentIds.length > 0;
  const activeAgentCount = state.activeAgentIds.length;

  return {
    // 기본 상태
    agents: state.agents,
    activeAgents,
    allAgents: state.agents,
    activeAgentIds: state.activeAgentIds,
    hasActiveAgents,
    activeAgentCount,
    isConnected: state.isConnected,
    connectionError: state.connectionError,
    lastActivity: state.lastActivity,

    // 액션
    connect: connectTo,
    disconnect,
  };
}
