import type { RealTimeAgent, AgentStatus } from '@/main/types/agents';
import type { Agent } from '@/main/types/main.types';

// 에이전트 이름에 따른 이미지 매핑 함수
const getAgentImage = (agentName: string): string => {
  const imageMap: Record<string, string> = {
    '비서 실장': '/agents/RootAgent.png',
    '재무 분석 비서': '/agents/FinanceAssistant.png',
    '시장 분석 비서': '/agents/ChartAssistant.png',
    '뉴스 분석 비서': '/agents/NewsAnalyst.png',
    '백테스트 비서': '/agents/BacktestingAssistant.png',
  };

  const result = imageMap[agentName] || '';
  return result;
};

interface AgentCardProps {
  agent: RealTimeAgent | Agent;
  onSelect?: ((agentId: string) => void) | undefined;
  compact?: boolean; // 컴팩트 모드 지원
  showTools?: boolean; // 도구 정보 표시 여부
  isActive?: boolean; // 레거시 지원을 위한 prop
  isStreaming?: boolean; // 스트리밍 중인지 여부
}

// 타입 가드 함수들
function isRealTimeAgent(agent: RealTimeAgent | Agent): agent is RealTimeAgent {
  return 'category' in agent && 'tools' in agent;
}

function isLegacyAgent(agent: RealTimeAgent | Agent): agent is Agent {
  return 'sampleQuestion' in agent && 'keywords' in agent;
}

// AgentStatus별 스타일링 설정 - 더 명확한 시각적 피드백
const getStatusStyles = (status: AgentStatus, isStreaming: boolean = false) => {
  const baseStyles = 'relative rounded-xl border-2 transition-all duration-300';

  switch (status) {
    case 'calling':
      return {
        container: `${baseStyles} border-orange-400 bg-orange-50/50 dark:bg-orange-900/20 shadow-orange-400/20 shadow-md`,
        icon: 'bg-orange-500 text-white animate-pulse',
        indicator: 'bg-orange-500 animate-ping',
        statusText: '도구 호출 중',
        statusColor: 'text-orange-600 dark:text-orange-400',
        pulseRing: 'ring-2 ring-orange-400/50 ring-offset-2',
      };

    case 'processing':
      return {
        container: `${baseStyles} border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 shadow-blue-400/20 shadow-md`,
        icon: 'bg-blue-500 text-white animate-pulse',
        indicator: 'bg-blue-500 animate-pulse',
        statusText: '분석 처리 중',
        statusColor: 'text-blue-600 dark:text-blue-400',
        pulseRing: 'ring-2 ring-blue-400/50 ring-offset-2',
      };

    case 'completed':
      return {
        container: `${baseStyles} border-green-400 bg-green-50/50 dark:bg-green-900/20 shadow-green-400/20 ${isStreaming ? 'shadow-md' : 'shadow-sm'}`,
        icon: `bg-green-500 text-white ${isStreaming ? 'animate-pulse' : ''}`,
        indicator: `bg-green-500 ${isStreaming ? 'animate-pulse' : ''}`,
        statusText: isStreaming ? '스트리밍 완료' : '작업 완료',
        statusColor: 'text-green-600 dark:text-green-400',
        pulseRing: isStreaming ? 'ring-2 ring-green-400/50 ring-offset-2' : '',
      };

    case 'error':
      return {
        container: `${baseStyles} border-red-400 bg-red-50/50 dark:bg-red-900/20 shadow-red-400/20 shadow-md`,
        icon: 'bg-red-500 text-white animate-bounce',
        indicator: 'bg-red-500 animate-ping',
        statusText: '오류 발생',
        statusColor: 'text-red-600 dark:text-red-400',
        pulseRing: 'ring-2 ring-red-400/50 ring-offset-2',
      };

    default: // 'idle'
      return {
        container: `${baseStyles} border-border-color bg-bg-tertiary hover:border-accent-primary/50 hover:bg-bg-chat hover:shadow-sm cursor-pointer group`,
        icon: 'bg-text-muted/20 text-text-primary group-hover:bg-accent-primary/20',
        indicator: 'bg-text-muted/50',
        statusText: '대기 중',
        statusColor: 'text-text-muted',
        pulseRing: '',
      };
  }
};

export function AgentCard({
  agent,
  onSelect,
  compact = false,
  showTools = false,
  isActive = false,
  isStreaming = false,
}: AgentCardProps) {
  // 에이전트 타입에 따라 상태 결정
  let status: AgentStatus;
  if (isRealTimeAgent(agent)) {
    status = agent.status;
  } else if (isLegacyAgent(agent)) {
    // 레거시 에이전트는 isActive prop으로 상태 결정
    status = isActive ? 'processing' : 'idle';
  } else {
    status = 'idle';
  }

  const styles = getStatusStyles(status, isStreaming);

  const handleClick = () => {
    if (onSelect) {
      onSelect(agent.id);
    }
  };

  if (compact) {
    return (
      <div
        className={`${styles.container} ${styles.pulseRing} p-2`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={agent.name}
      >
        <div className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-lg text-sm ${styles.icon}`}
          >
            {getAgentImage(agent.name) ? (
              <img
                src={getAgentImage(agent.name)}
                alt={agent.name}
                className="h-6 w-6 rounded-lg object-cover"
              />
            ) : (
              agent.icon
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="break-words text-xs font-medium">{agent.name}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.container} ${styles.pulseRing} mb-3 p-3`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={agent.name}
    >
      {/* 헤더: 아이콘과 이름 */}
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl font-bold transition-all duration-300 ${styles.icon}`}
        >
          {getAgentImage(agent.name) ? (
            <img
              src={getAgentImage(agent.name)}
              alt={agent.name}
              className="h-10 w-10 rounded-xl object-cover"
            />
          ) : (
            agent.icon
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="break-words text-sm font-semibold text-text-primary">{agent.name}</div>
          <div className="break-words text-xs text-text-muted">
            {isRealTimeAgent(agent)
              ? agent.category === 'root'
                ? '루트 에이전트'
                : '서브 에이전트'
              : 'AI 비서'}
          </div>
        </div>
      </div>

      {/* 설명 */}
      <div className="mb-3 line-clamp-2 break-words text-xs leading-relaxed text-text-muted sm:text-sm">
        {agent.description}
      </div>

      {/* 현재 작업 ID 표시 (RealTimeAgent만) */}
      {isRealTimeAgent(agent) && agent.currentTaskId && (
        <div className="mt-2 break-words rounded bg-bg-secondary px-2 py-1 text-xs text-text-muted">
          작업: {agent.currentTaskId.slice(0, 8)}...
        </div>
      )}

      {/* 도구 정보 (RealTimeAgent만, 옵션) */}
      {showTools && isRealTimeAgent(agent) && agent.tools.length > 0 && (
        <div className="mt-3 border-t border-border-color pt-2">
          <div className="mb-1 break-words text-xs text-text-muted">사용 도구:</div>
          <div className="flex flex-wrap gap-1">
            {agent.tools.slice(0, 3).map((tool) => (
              <span
                key={tool}
                className="break-words rounded bg-bg-secondary px-2 py-0.5 text-xs text-text-muted"
              >
                {tool}
              </span>
            ))}
            {agent.tools.length > 3 && (
              <span className="break-words rounded bg-bg-secondary px-2 py-0.5 text-xs text-text-muted">
                +{agent.tools.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 샘플 질문 표시 (레거시 Agent만) */}
      {isLegacyAgent(agent) && (
        <div className="mt-3 border-t border-border-color pt-2">
          <div className="mb-1 break-words text-xs text-text-muted">예시 질문:</div>
          <div className="break-words text-xs italic text-text-primary">
            &ldquo;{agent.sampleQuestion}&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}
