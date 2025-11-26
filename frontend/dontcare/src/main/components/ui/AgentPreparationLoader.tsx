import { useAgentPreparation } from '@/main/hooks/useAgentPreparation';

interface AgentPreparationLoaderProps {
  isVisible: boolean;
}

/**
 * A2A 에이전트 준비 상태를 표시하는 로딩 컴포넌트
 * - 워크플로우 단계별 메시지 순환
 * - 타이핑 인디케이터와 동일한 로딩 도트
 * - 페이드 인/아웃 애니메이션
 * - 접근성 지원
 */
export function AgentPreparationLoader({ isVisible }: AgentPreparationLoaderProps) {
  const { currentMessage, isTextVisible } = useAgentPreparation(isVisible);

  if (!isVisible) return null;

  return (
    <div
      className="flex animate-gentle-emerge items-center space-x-3 px-4 py-3 transition-all duration-300 ease-out"
      role="status"
      aria-live="polite"
      aria-label="AI 에이전트가 응답을 준비하고 있습니다"
    >
      {/* 타이핑 인디케이터 도트 - 기존 스타일과 동일 */}
      <div className="flex space-x-1">
        <span className="h-1 w-1 animate-typing rounded-full bg-gray-400"></span>
        <span className="h-1 w-1 animate-typing rounded-full bg-gray-400 [animation-delay:0.2s]"></span>
        <span className="h-1 w-1 animate-typing rounded-full bg-gray-400 [animation-delay:0.4s]"></span>
      </div>

      {/* A2A 워크플로우 메시지 */}
      <span
        className={`text-sm text-gray-600 transition-opacity duration-300 ${
          isTextVisible ? 'opacity-100' : 'opacity-80'
        }`}
      >
        {currentMessage}
      </span>
    </div>
  );
}
