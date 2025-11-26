// SSE 기반 실시간 에이전트 시스템 타입 정의

export type AgentStatus = 'idle' | 'calling' | 'processing' | 'completed' | 'error';

// SSE 메시지 타입 정의
export interface SSEFunctionCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface SSEFunctionResponse {
  id: string;
  name: string;
  response: {
    result?: string;
    error?: string;
  };
}

export interface SSEMessagePart {
  text?: string;
  functionCall?: SSEFunctionCall;
  functionResponse?: SSEFunctionResponse;
}

export interface SSEMessage {
  content: {
    parts: SSEMessagePart[];
    role: string;
  };
  partial: boolean;
  invocationId: string;
  author: string;
  actions?: {
    stateDelta?: Record<string, unknown>;
  };
  id: string;
  timestamp: number;
}

// 실시간 에이전트 인터페이스
export interface RealTimeAgent {
  id: string; // functionCall에서의 실제 이름 (예: financial_analyst_agent)
  name: string; // 표시명 (예: 재무 분석 비서)
  description: string;
  icon: string;
  status: AgentStatus;
  isActive: boolean; // 현재 작업 중인지
  lastActivity?: Date | undefined; // 마지막 활동 시간
  currentTaskId?: string | undefined; // 현재 수행 중인 작업 ID
  tools: string[]; // 사용하는 도구들
  category: 'root' | 'sub';
}

// 실제 에이전트 설정 (AGENTS_DOCUMENTATION.md 기준)
export const AGENT_CONFIG: Record<string, RealTimeAgent> = {
  // 루트 에이전트
  root_agent: {
    id: 'root_agent',
    name: '비서 실장',
    description: '종합적인 금융 분석을 조정하고 최종 보고서를 생성합니다',
    icon: '👔',
    status: 'idle',
    isActive: false,
    tools: ['tool_now_kst', 'PreloadMemoryTool', 'sub_agents'],
    category: 'root',
  },

  // 서브 에이전트들
  financial_analyst_agent: {
    id: 'financial_analyst_agent',
    name: '재무 분석 비서',
    description: '기업의 재무제표, 재무비율, 현금흐름 등을 분석합니다',
    icon: '💰',
    status: 'idle',
    isActive: false,
    tools: [
      'search_company',
      'list_filings',
      'get_financials',
      'compute_basic_ratios',
      'fetch_and_analyze_financials',
    ],
    category: 'sub',
  },

  market_analyst_agent: {
    id: 'market_analyst_agent',
    name: '시장 분석 비서',
    description: '주가 차트, 거래량, 기술적 지표를 분석합니다',
    icon: '📈',
    status: 'idle',
    isActive: false,
    tools: ['technical_analysis_for_agent'],
    category: 'sub',
  },

  news_analyst_agent: {
    id: 'news_analyst_agent',
    name: '뉴스 분석 비서',
    description: '최신 뉴스, 공시, 이벤트를 수집·요약합니다',
    icon: '📰',
    status: 'idle',
    isActive: false,
    tools: ['google_search'],
    category: 'sub',
  },

  risk_analyst_agent: {
    id: 'risk_analyst_agent',
    name: '백테스트 비서',
    description: '투자 전략 백테스팅을 통해 성과 지표를 분석하고 최적의 투자 전략을 제시합니다',
    icon: '📊',
    status: 'idle',
    isActive: false,
    tools: ['run_strategy_backtest'],
    category: 'sub',
  },
};

// SSE 메시지에서 에이전트 상태 변화를 감지하는 유틸리티 타입
export interface AgentActivityEvent {
  agentId: string;
  status: AgentStatus;
  taskId?: string | undefined;
  timestamp: Date;
  data?: unknown;
}

// 에이전트 상태 업데이트 타입
export interface AgentStatusUpdate {
  agentId: string;
  status: AgentStatus;
  isActive: boolean;
  lastActivity: Date;
  currentTaskId?: string | undefined;
}

// SSE 파싱 결과 타입
export interface ParsedSSEResult {
  type: 'function_call' | 'function_response' | 'partial_text';
  agentUpdates: AgentStatusUpdate[];
  content?: string;
  functionName?: string;
  taskId?: string;
}
