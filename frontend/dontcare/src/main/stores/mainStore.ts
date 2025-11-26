import { vertexAIService } from '@/main/services/vertexAiService';
import type { RealTimeAgent } from '@/main/types/agents';
import { AGENT_CONFIG } from '@/main/types/agents';
import type { Agent, ChatMessage, MainStore, Session, User } from '@/main/types/main.types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// RealTimeAgent를 호환 가능한 Agent로 변환하는 함수
function convertRealTimeAgentToAgent(
  realTimeAgent: RealTimeAgent,
  status: 'ready' | 'processing' = 'ready',
): Agent {
  // 에이전트별 맞춤 설정
  const agentMappings = {
    financial_analyst_agent: {
      sampleQuestion: '네이버 2022년 재무제표 분석해줘',
      keywords: [
        'financial',
        'earnings',
        'revenue',
        'profit',
        'valuation',
        'fundamental',
        'balance',
        'income',
        'cash flow',
      ],
      color: '#10b981',
    },
    market_analyst_agent: {
      sampleQuestion: '애플 주가의 최근 RSI랑 MACD 추세 분석해줘',
      keywords: [
        'technical',
        'chart',
        'pattern',
        'indicator',
        'rsi',
        'macd',
        'moving average',
        'support',
        'resistance',
        'trend',
      ],
      color: '#f59e0b',
    },
    news_analyst_agent: {
      sampleQuestion: '오늘 삼성전자 관련된 최신 뉴스 알려줘',
      keywords: [
        'news',
        'market',
        'event',
        'announcement',
        'sentiment',
        'latest',
        'today',
        'update',
        'headline',
      ],
      color: '#3b82f6',
    },
    risk_analyst_agent: {
      sampleQuestion: '테슬라 최근 3년간 투자 전략 백테스트 결과와 성과 분석해줘',
      keywords: [
        'backtest',
        'strategy',
        'historical',
        'performance',
        'optimization',
        'test',
        'simulate',
        'risk',
      ],
      color: '#ef4444',
    },
    root_agent: {
      sampleQuestion:
        '삼성전자에 대해 최근 뉴스, 최근 3년 재무제표 분석, 기술적 지표 분석, 백테스트 분석까지 종합한 투자 분석 보고서를 작성해줘.',
      keywords: ['report', 'strategy', 'comprehensive', 'analysis', 'investment'],
      color: '#8B5CF6',
    },
  };

  const mapping = agentMappings[realTimeAgent.id as keyof typeof agentMappings] || {
    sampleQuestion: `${realTimeAgent.name}에게 질문해보세요`,
    keywords: realTimeAgent.tools,
    color: '#6B7280',
  };

  return {
    id: realTimeAgent.id,
    name: realTimeAgent.name,
    description: realTimeAgent.description,
    icon: realTimeAgent.icon,
    status,
    sampleQuestion: mapping.sampleQuestion,
    keywords: mapping.keywords,
    color: mapping.color,
  };
}

// AGENT_CONFIG 기반으로 기본 에이전트 생성
function createDefaultAgents(): Agent[] {
  return Object.values(AGENT_CONFIG).map((realTimeAgent) =>
    convertRealTimeAgentToAgent(realTimeAgent, 'ready'),
  );
}

const defaultAgents: Agent[] = createDefaultAgents();

// 기본값을 제거하고 localStorage에서 불러오도록 변경 필요
const defaultUser: User = {
  id: '1',
  name: 'John Kim',
  email: 'john.kim@example.com',
  avatar: 'JK',
};

export const useMainStore = create<MainStore>()(
  persist(
    (set) => ({
      user: defaultUser,
      agents: defaultAgents,
      sessions: [],
      activeSession: null,
      activeAgent: null,
      messages: [],
      isFirstMessage: true,
      isTyping: false,
      isLoading: false,
      isSessionLoading: false,
      isPreparingResponse: false,
      sessionLoadError: null,
      streamingMessageId: null,

      setUser: (user: User | null) => set({ user }),

      setActiveAgent: (agentId: string | null) => {
        set((state) => ({
          activeAgent: agentId,
          agents: state.agents.map((agent) => ({
            ...agent,
            status: agent.id === agentId ? 'processing' : 'ready',
          })),
        }));
      },

      addMessage: (message: ChatMessage) => {
        set((state) => ({
          messages: [...state.messages, message],
        }));
      },

      updateStreamingMessage: (messageId: string, content: string) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? { ...msg, content: msg.content + content } : msg,
          ),
        }));
      },
      completeStreamingMessage: (messageId: string) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? { ...msg, isStreaming: false } : msg,
          ),
        }));
      },

      setIsTyping: (isTyping: boolean) => set({ isTyping }),

      setIsFirstMessage: (isFirst: boolean) => set({ isFirstMessage: isFirst }),

      setIsPreparingResponse: (isPreparing: boolean) => set({ isPreparingResponse: isPreparing }),

      setIsLoading: (isLoading: boolean) => set({ isLoading }),

      setSessionLoading: (isSessionLoading: boolean) => set({ isSessionLoading }),

      setSessionLoadError: (sessionLoadError: string | null) => set({ sessionLoadError }),

      setSessions: (sessions: Session[]) => set({ sessions }),

      setActiveSession: (session: Session | null) => set({ activeSession: session }),

      addSession: (session: Session) => {
        set((state) => ({
          sessions: [session, ...state.sessions],
        }));
      },

      clearMessages: () => {
        set({
          messages: [],
          isFirstMessage: true,
          activeSession: null,
          streamingMessageId: null,
          isSessionLoading: false,
          isPreparingResponse: false,
          sessionLoadError: null,
        });
      },

      startNewChat: () => {
        set({
          messages: [],
          isFirstMessage: true,
          activeSession: null,
          activeAgent: null,
          isTyping: false,
          streamingMessageId: null,
          isSessionLoading: false,
          isPreparingResponse: false,
          sessionLoadError: null,
        });
      },

      // 에이전트 상태 업데이트 (실시간 연동)
      updateAgentStatus: (agentId: string, status: 'ready' | 'processing') => {
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === agentId ? { ...agent, status } : agent,
          ),
        }));
      },

      // RealTimeAgent 목록으로 동기화
      syncWithRealTimeAgents: (realTimeAgents: RealTimeAgent[]) => {
        const convertedAgents = realTimeAgents.map((realTimeAgent) =>
          convertRealTimeAgentToAgent(
            realTimeAgent,
            realTimeAgent.isActive ? 'processing' : 'ready',
          ),
        );

        set({ agents: convertedAgents });
      },

      // 에이전트 목록 새로고침
      refreshAgents: () => {
        const freshAgents = createDefaultAgents();
        set({ agents: freshAgents });
      },

      loadSessionMessages: async (sessionId: string) => {
        try {
          set({ isLoading: true, isSessionLoading: true, sessionLoadError: null });

          const session = await vertexAIService.getSession(sessionId);
          const events = session.events || [];
          const sessionState = session.state || {};

          const messages: ChatMessage[] = [];

          // 이벤트를 메시지로 변환
          for (const event of events) {
            const parts = event?.content?.parts || [];
            let textContent = '';

            // 파트에서 텍스트 추출
            for (const part of parts) {
              if (typeof part.text === 'string') {
                textContent += part.text;
              }
            }

            if (textContent) {
              const role = event?.content?.role;
              const author = event?.author;

              // 메시지 타입 판단 로직 개선
              let messageType: 'user' | 'ai' = 'ai';
              if (role === 'user' || role === 'human') {
                messageType = 'user';
              } else if (!author || author === 'user' || author === 'human') {
                messageType = 'user';
              }

              const message: ChatMessage = {
                id: `${Date.now()}-${Math.random()}`,
                content: textContent,
                type: messageType,
                timestamp: new Date(),
              };

              if (messageType === 'ai' && author) {
                message.agentId = author;
              }

              messages.push(message);
            }
          }

          // sessionState에서 추가 메시지 추출
          if (Object.keys(sessionState).length > 0) {
            // 이미 추가된 메시지의 content 목록 생성 (중복 방지용)
            const existingContents = new Set(messages.map((msg) => msg.content.trim()));

            // new_search_agent_output과 같은 AI 응답 데이터 처리
            for (const [key, value] of Object.entries(sessionState)) {
              if (
                typeof value === 'string' &&
                value.trim() &&
                !existingContents.has(value.trim())
              ) {
                const agentType = key.includes('news')
                  ? 'news'
                  : key.includes('finance')
                    ? 'finance'
                    : key.includes('technical')
                      ? 'technical'
                      : key.includes('backtest')
                        ? 'backtest'
                        : key.includes('report')
                          ? 'report'
                          : 'news';

                const message: ChatMessage = {
                  id: `session-state-${key}-${Date.now()}`,
                  content: value,
                  type: 'ai',
                  timestamp: session.updatedAt || new Date(),
                  agentId: agentType,
                };

                messages.push(message);
              }
            }
          }

          // 메시지를 시간순으로 정렬
          messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

          // 중복 메시지 제거 로직 추가
          const uniqueMessages = messages.reduce((acc: ChatMessage[], current: ChatMessage) => {
            const exists = acc.some(
              (msg) =>
                msg.content.trim() === current.content.trim() &&
                msg.type === current.type &&
                Math.abs(msg.timestamp.getTime() - current.timestamp.getTime()) < 2000, // 2초 이내
            );

            if (!exists) {
              acc.push(current);
            }
            return acc;
          }, []);

          set({
            messages: uniqueMessages, // 중복 제거된 메시지 사용
            activeSession: session,
            isFirstMessage: uniqueMessages.length === 0,
            isLoading: false,
            isSessionLoading: false,
          });
        } catch (error: unknown) {
          // 세션이 삭제되었거나 존재하지 않는 경우 (404, 400 에러) 웰컴 화면으로 이동
          const errorMessage =
            error &&
            typeof error === 'object' &&
            'message' in error &&
            typeof error.message === 'string'
              ? error.message
              : '';
          const errorStatus =
            error &&
            typeof error === 'object' &&
            'status' in error &&
            typeof error.status === 'number'
              ? error.status
              : 0;
          const isSessionNotFound =
            errorMessage.includes('Get session failed: 404') ||
            errorMessage.includes('Get session failed: 400') ||
            errorMessage.includes('Get session failed: 410') ||
            errorStatus === 404 ||
            errorStatus === 400 ||
            errorStatus === 410;

          if (isSessionNotFound) {
            // 세션이 삭제되었거나 존재하지 않는 경우 조용히 웰컴 화면으로 이동
            set({
              messages: [],
              isFirstMessage: true,
              activeSession: null,
              activeAgent: null,
              isTyping: false,
              streamingMessageId: null,
              isLoading: false,
              isSessionLoading: false,
              sessionLoadError: '세션을 찾을 수 없습니다.',
            });
          } else {
            // 예상하지 못한 에러만 로그에 기록
            // 세션 메시지 로드 실패
            const errorMsg =
              error instanceof Error ? error.message : '세션 로드 중 오류가 발생했습니다.';
            set({
              isLoading: false,
              isSessionLoading: false,
              sessionLoadError: errorMsg,
            });
          }
        }
      },
    }),
    {
      name: 'session-storage',
      partialize: (state) => ({
        activeSession: state.activeSession,
      }),
      skipHydration: true,
    },
  ),
);
