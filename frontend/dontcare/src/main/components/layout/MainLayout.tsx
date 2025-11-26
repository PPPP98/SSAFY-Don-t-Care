import { useState } from 'react';
import { Sidebar } from '@/main/components/layout/Sidebar';
import { MainContent } from '@/main/components/layout/MainContent';
import { AgentMonitor } from '@/main/components/layout/AgentMonitor';
import { useSessionSync } from '@/main/hooks/useSessionSync';
import { useComposerStore } from '@/main/stores/useComposerStore';

export function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const setDraft = useComposerStore((s) => s.setDraft);
  const requestFocus = useComposerStore((s) => s.requestFocus);

  // 세션 동기화 모니터링
  useSessionSync();

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const handleAgentSelect = (agentId: string) => {
    // agentId에 따른 텍스트 매핑
    const agentTextMap: Record<string, string> = {
      financial_analyst_agent: '삼성전자의 재무 건전성과 밸류에이션 지표를 분석해줘.',
      market_analyst_agent:
        '삼성전자의 주요 지수의 기술적 지표(RSI, 이동평균선 등)와 차트 패턴을 분석해줘.',
      news_analyst_agent: '오늘의 주요 시장 뉴스와 핵심 이벤트를 요약해줘.',
      risk_analyst_agent: '삼성전자 최근 3년간 투자 전략 백테스트 결과와 리스크 분석해줘',
      root_agent:
        '삼성전자에 대해 최근 뉴스, 최근 3년 재무제표 분석, 기술적 지표 분석, 리스크 평가까지 종합한 투자 분석 보고서를 작성해줘.',
    };

    const agentText = agentTextMap[agentId];
    if (agentText) {
      setDraft(agentText);
      requestFocus();
    }
  };

  return (
    <div className="font-system flex h-screen overflow-hidden bg-bg-primary text-text-primary">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />
      <MainContent isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />
      <div className="w-60 flex-shrink-0 overflow-y-auto border-l border-border-color bg-bg-secondary p-4 max-[1200px]:hidden">
        <AgentMonitor onAgentSelect={handleAgentSelect} />
      </div>
    </div>
  );
}
