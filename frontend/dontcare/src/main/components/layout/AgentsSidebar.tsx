import { useMainStore } from '@/main/stores/mainStore';
import { useComposerStore } from '@/main/stores/useComposerStore';
import { AgentCard } from '@/main/components/layout/AgentCard';

export function AgentsSidebar() {
  const { agents, activeAgent } = useMainStore();
  const setDraft = useComposerStore((s) => s.setDraft);
  const requestFocus = useComposerStore((s) => s.requestFocus);

  // 에이전트 이름에 따른 고정 텍스트 매핑 함수
  const getAgentText = (agentName: string): string => {
    const textMap: Record<string, string> = {
      '뉴스 분석 비서': '오늘의 주요 시장 뉴스와 핵심 이벤트를 요약해줘.',
      '재무 분석 비서': '삼성전자의 재무 건전성과 밸류에이션 지표를 분석해줘.',
      '시장 분석 비서':
        '삼성전자의 주요 지수의 기술적 지표(RSI, 이동평균선 등)와 차트 패턴을 분석해줘.',
      '백테스트 비서': '삼성전자 최근 3년간 투자 전략 백테스트 결과와 리스크 분석해줘',
      '비서 실장':
        '삼성전자에 대해 최근 뉴스, 최근 3년 재무제표 분석, 기술적 지표 분석, 리스크 평가까지 종합한 투자 분석 보고서를 작성해줘.',
    };

    const result = textMap[agentName] || '';
    return result;
  };

  const insertAgentQuestion = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);

    if (agent) {
      // 에이전트 이름에 따른 고정 텍스트 사용
      const agentText = getAgentText(agent.name);

      if (agentText) {
        setDraft(agentText);
        requestFocus();
      }
    }
  };

  return (
    <div className="w-full min-w-60 max-w-80 flex-shrink-0 overflow-y-auto border-l border-border-color bg-bg-secondary p-4 max-[1200px]:hidden">
      <div className="mb-3 px-1">
        <h2 className="mb-2 break-words bg-accent-gradient bg-clip-text text-sm font-bold text-transparent sm:text-base">
          AI 비서 목록
        </h2>
        <p className="break-words text-xs leading-relaxed text-text-muted sm:text-sm">
          원하는 비서를 클릭하면 맞춤형 질문으로 시작할 수 있습니다.
        </p>
      </div>

      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          isActive={activeAgent === agent.id}
          onSelect={insertAgentQuestion}
        />
      ))}
    </div>
  );
}
