import { useAgentWorkflowStore } from '@/main/stores/agentWorkflowStore';
import { AgentCard } from '@/main/components/layout/AgentCard';

interface AgentMonitorProps {
  onAgentSelect?: (agentId: string) => void;
  compact?: boolean; // 컴팩트 모드 지원
  showTools?: boolean; // 도구 정보 표시 여부
  trackingEnabled?: boolean; // 추적 활성화/비활성화
  isStreaming?: boolean; // 스트리밍 중인지 여부
}

export function AgentMonitor({
  onAgentSelect,
  compact = false,
  showTools = false,
  trackingEnabled = true,
  isStreaming = false,
}: AgentMonitorProps) {
  // 전역 store에서 필요한 상태들만 읽기
  const displayAgents = useAgentWorkflowStore((state) => state.displayAgents);
  const stats = useAgentWorkflowStore((state) => state.stats);
  const resetAllAgents = useAgentWorkflowStore((state) => state.resetAllAgents);
  const storeIsStreaming = useAgentWorkflowStore((state) => state.isStreaming);

  // trackingEnabled가 false일 때만 리셋 (useEffect 없이)
  if (!trackingEnabled && stats.hasActiveAgents) {
    resetAllAgents();
  }

  // 제목 및 상태 표시
  const TitleSection = () => (
    <div className="mb-6 px-1">
      <div className="flex items-center justify-between">
        <h3 className="bg-accent-gradient bg-clip-text text-base font-bold text-transparent">
          실시간 에이전트 워크플로우
        </h3>
        {!trackingEnabled && (
          <span className="rounded bg-bg-secondary px-2 py-1 text-xs text-text-muted">
            추적 비활성
          </span>
        )}
      </div>
    </div>
  );

  // 에이전트 카드 렌더링
  const AgentList = () => (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      {displayAgents.length === 0 ? (
        <div className="p-4 text-center text-sm text-text-muted">에이전트를 불러오는 중...</div>
      ) : (
        displayAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onSelect={onAgentSelect ? (agentId) => onAgentSelect(agentId) : undefined}
            compact={compact}
            showTools={showTools}
            isStreaming={isStreaming || storeIsStreaming}
          />
        ))
      )}
    </div>
  );

  return (
    <div className="w-full">
      {/* 제목 및 상태 */}
      <TitleSection />

      {/* 에이전트 목록 */}
      <AgentList />
    </div>
  );
}
