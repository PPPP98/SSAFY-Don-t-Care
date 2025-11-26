export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface MarketData {
  symbol: string;
  price: string;
  change: string;
  isPositive: boolean;
}

export interface ApiStockItem {
  title: string;
  market: string;
  price: string; // "3448.45"
  change: string; // "-37.74"
  changeRate: string; // "-1.08"
  sign: string; // "5" | "+" ...
}

// src/main/types/main.types.ts
export interface NewsItem {
  id: string; // 고유 식별자(없으면 생성)
  headline: string; // 제목
  source: string; // 출처
  time: string; // "x minutes ago" 같은 상대 시각 문자열
  url?: string; // 뉴스 원문 링크
  imageUrl?: string | null; // 썸네일
  description?: string | null; // 요약(있으면 카드 하단 설명에 활용 가능)
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'ready' | 'processing';
  sampleQuestion: string;
  keywords: string[];
  color: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
  agentId?: string;
  isStreaming?: boolean;
}

export interface Session {
  name: string; // Google Cloud 리소스 이름: projects/.../sessions/{sessionId}
  displayName: string;
  state: Record<string, unknown>;
  events?: Event[];
  userId?: string;
  appName?: string;
  lastUpdateTime?: number;
  createdAt?: Date;
  updatedAt?: Date;
  isActive?: boolean;
}

export interface Event {
  author?: string;
  content?: {
    role?: string;
    parts?: Array<{
      text?: string;
      functionCall?: {
        name: string;
        args: Record<string, unknown>;
      };
      functionResponse?: {
        name: string;
        response: Record<string, unknown>;
      };
    }>;
  };
}

export interface MainStore {
  user: User | null;
  agents: Agent[];
  sessions: Session[];
  activeSession: Session | null;
  activeAgent: string | null;
  messages: ChatMessage[];
  isFirstMessage: boolean;
  isTyping: boolean;
  isLoading: boolean;
  isSessionLoading: boolean;
  isPreparingResponse: boolean;
  sessionLoadError: string | null;
  streamingMessageId: string | null;
  setUser: (user: User | null) => void;
  setActiveAgent: (agentId: string | null) => void;
  addMessage: (message: ChatMessage) => void;
  updateStreamingMessage: (messageId: string, content: string) => void;
  completeStreamingMessage: (messageId: string) => void;
  setIsTyping: (isTyping: boolean) => void;
  setIsFirstMessage: (isFirst: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setSessionLoading: (loading: boolean) => void;
  setIsPreparingResponse: (isPreparing: boolean) => void;
  setSessionLoadError: (error: string | null) => void;
  setSessions: (sessions: Session[]) => void;
  setActiveSession: (session: Session | null) => void;
  addSession: (session: Session) => void;
  clearMessages: () => void;
  startNewChat: () => void;
  loadSessionMessages: (sessionId: string) => Promise<void>;
  // 실시간 에이전트 연동 메서드
  updateAgentStatus: (agentId: string, status: 'ready' | 'processing') => void;
  syncWithRealTimeAgents: (realTimeAgents: import('@/main/types/agents').RealTimeAgent[]) => void;
  refreshAgents: () => void;
}
