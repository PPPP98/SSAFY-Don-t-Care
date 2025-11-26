import { create } from 'zustand';
import { AGENT_CONFIG } from '@/main/types/agents';
import type {
  RealTimeAgent,
  AgentStatus,
  AgentStatusUpdate,
  AgentActivityEvent,
} from '@/main/types/agents';

interface AgentWorkflowState {
  // 기본 상태
  agents: Record<string, RealTimeAgent>;
  activityHistory: AgentActivityEvent[];
  isStreaming: boolean; // 스트리밍 상태

  // 계산된 상태 (무한 루프 방지)
  agentsArray: RealTimeAgent[];
  displayAgents: RealTimeAgent[];
  activeAgents: RealTimeAgent[];
  stats: {
    activeCount: number;
    totalCount: number;
    lastActivity: Date | null;
    hasActiveAgents: boolean;
  };

  // 액션
  updateAgentStatus: (update: AgentStatusUpdate) => void;
  activateAgent: (agentId: string, taskId?: string) => void;
  deactivateAgent: (agentId: string, finalStatus?: AgentStatus) => void;
  resetAllAgents: () => void;
  setStreaming: (streaming: boolean) => void; // 스트리밍 상태 설정

  // 스트리밍 연동 헬퍼
  parseAuthorActivity: (author: string, isPartial?: boolean) => void;
  handleFunctionCall: (functionName: string, taskId?: string) => void;
  handleFunctionResponse: (functionName: string, hasError?: boolean) => void;
}

const maxHistorySize = 50;

// 초기 에이전트 상태 생성
const createInitialAgents = (): Record<string, RealTimeAgent> => {
  const initialAgents: Record<string, RealTimeAgent> = {};
  Object.entries(AGENT_CONFIG).forEach(([key, config]) => {
    initialAgents[key] = {
      ...config,
      status: 'idle',
      isActive: false,
      lastActivity: undefined,
      currentTaskId: undefined,
    };
  });
  return initialAgents;
};

// 계산된 상태 업데이트 헬퍼
const computeStatsFromAgents = (agents: Record<string, RealTimeAgent>) => {
  const agentsArray = Object.values(agents);
  const activeAgents = agentsArray.filter((agent) => agent.isActive);
  const activeCount = activeAgents.length;
  const totalCount = agentsArray.length;

  // 표시할 에이전트 목록 (루트 에이전트를 맨 위로)
  const displayAgents = [...agentsArray].sort((a, b) => {
    if (a.category === 'root' && b.category !== 'root') return -1;
    if (a.category !== 'root' && b.category === 'root') return 1;
    return 0;
  });

  const timestamps = agentsArray
    .filter((a) => a.lastActivity)
    .map((a) => a.lastActivity!.getTime());

  const lastActivity = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;

  return {
    agentsArray,
    displayAgents,
    activeAgents,
    stats: {
      activeCount,
      totalCount,
      lastActivity,
      hasActiveAgents: activeCount > 0,
    },
  };
};

export const useAgentWorkflowStore = create<AgentWorkflowState>((set, get) => {
  const initialAgents = createInitialAgents();
  const initialComputed = computeStatsFromAgents(initialAgents);

  return {
    // 초기 상태
    agents: initialAgents,
    activityHistory: [],
    isStreaming: false,
    agentsArray: initialComputed.agentsArray,
    displayAgents: initialComputed.displayAgents,
    activeAgents: initialComputed.activeAgents,
    stats: initialComputed.stats,

    // 특정 에이전트의 상태 업데이트
    updateAgentStatus: (update: AgentStatusUpdate) => {
      set((state) => {
        const agent = state.agents[update.agentId];
        if (!agent) {
          return state;
        }

        const newAgents = {
          ...state.agents,
          [update.agentId]: {
            ...agent,
            status: update.status,
            isActive: update.isActive,
            lastActivity: update.lastActivity,
            currentTaskId: update.currentTaskId,
          },
        };

        // 계산된 상태 업데이트
        const computed = computeStatsFromAgents(newAgents);

        // 활동 히스토리에 이벤트 추가
        const newEvent: AgentActivityEvent = {
          agentId: update.agentId,
          status: update.status,
          taskId: update.currentTaskId,
          timestamp: update.lastActivity,
        };

        const newHistory = [newEvent, ...state.activityHistory].slice(0, maxHistorySize);

        return {
          agents: newAgents,
          activityHistory: newHistory,
          agentsArray: computed.agentsArray,
          displayAgents: computed.displayAgents,
          activeAgents: computed.activeAgents,
          stats: computed.stats,
        };
      });
    },

    // 에이전트 활성화 (작업 시작)
    activateAgent: (agentId: string, taskId?: string) => {
      const { agents, updateAgentStatus } = get();
      const agent = agents[agentId];
      if (!agent) {
        return;
      }

      updateAgentStatus({
        agentId,
        status: 'processing',
        isActive: true,
        lastActivity: new Date(),
        currentTaskId: taskId,
      });
    },

    // 에이전트 비활성화 (작업 완료)
    deactivateAgent: (agentId: string, finalStatus: AgentStatus = 'completed') => {
      const { agents, updateAgentStatus } = get();
      const agent = agents[agentId];
      if (!agent) {
        return;
      }

      updateAgentStatus({
        agentId,
        status: finalStatus,
        isActive: false,
        lastActivity: new Date(),
        currentTaskId: undefined,
      });
    },

    // 모든 에이전트를 idle 상태로 리셋
    resetAllAgents: () => {
      const resetAgents = createInitialAgents();
      const computed = computeStatsFromAgents(resetAgents);

      set({
        agents: resetAgents,
        activityHistory: [],
        isStreaming: false,
        agentsArray: computed.agentsArray,
        displayAgents: computed.displayAgents,
        activeAgents: computed.activeAgents,
        stats: computed.stats,
      });
    },

    // 스트리밍 상태 설정
    setStreaming: (streaming: boolean) => {
      set({ isStreaming: streaming });
    },

    // 스트리밍 author 필드 파싱을 위한 헬퍼 함수 (A2A 구조 반영)
    parseAuthorActivity: (author: string, isPartial: boolean = false) => {
      const { activateAgent, deactivateAgent, resetAllAgents, setStreaming } = get();

      // A2A 워크플로우: Root Agent가 필요한 Sub Agent들을 동적으로 선택
      if (AGENT_CONFIG[author]) {
        if (author === 'root_agent') {
          // Root Agent는 항상 처리 중으로 표시 (총괄 역할)
          if (isPartial) {
            activateAgent(author);
            setStreaming(true); // 스트리밍 시작
          } else {
            deactivateAgent(author, 'completed');
            setStreaming(false); // 스트리밍 종료
          }
        } else {
          // Sub Agent들: Root Agent가 선택적으로 호출
          if (isPartial) {
            activateAgent(author);
            setStreaming(true); // 스트리밍 시작
          } else {
            deactivateAgent(author, 'completed');
            // Sub Agent 완료 시에는 스트리밍 상태 유지 (Root Agent가 완료될 때까지)
          }
        }
      } else if (author === 'user') {
        // 새로운 사용자 메시지 시작 - 모든 에이전트 리셋
        resetAllAgents();
        setStreaming(false); // 스트리밍 상태도 리셋
      }
    },

    // Function call 감지 시 에이전트 활성화 (A2A 구조: Root → Sub 호출)
    handleFunctionCall: (functionName: string, taskId?: string) => {
      const { updateAgentStatus } = get();

      // 특정 도구를 사용하는 에이전트 매핑
      const agentByTool = Object.entries(AGENT_CONFIG).find(([, config]) =>
        config.tools.includes(functionName),
      );

      if (agentByTool) {
        const [agentId] = agentByTool;
        updateAgentStatus({
          agentId,
          status: 'calling',
          isActive: true,
          lastActivity: new Date(),
          currentTaskId: taskId,
        });
      }
    },

    // Function response 감지 시 에이전트 상태 업데이트 (A2A 구조: Sub → Root 결과 전달)
    handleFunctionResponse: (functionName: string, hasError: boolean = false) => {
      const { updateAgentStatus } = get();

      // 직접 에이전트 이름으로 매핑 (Tool Result에서 에이전트 감지)
      if (AGENT_CONFIG[functionName]) {
        updateAgentStatus({
          agentId: functionName,
          status: hasError ? 'error' : 'completed',
          isActive: false,
          lastActivity: new Date(),
          currentTaskId: undefined,
        });
        return;
      }

      // 기존 도구 기반 매핑도 유지
      const agentByTool = Object.entries(AGENT_CONFIG).find(([, config]) =>
        config.tools.includes(functionName),
      );

      if (agentByTool) {
        const [agentId] = agentByTool;
        updateAgentStatus({
          agentId,
          status: hasError ? 'error' : 'completed',
          isActive: false,
          lastActivity: new Date(),
          currentTaskId: undefined,
        });
      }
    },
  };
});
