import { useSessionPreparation } from '@/main/hooks/useSessionPreparation';

interface SessionPreparationLoaderProps {
  isVisible: boolean;
}

/**
 * 세션 준비 상태를 표시하는 로딩 컴포넌트
 * - 세션 생성 및 설정 단계별 메시지 순환
 * - 타이핑 인디케이터와 동일한 로딩 도트
 * - 페이드 인/아웃 애니메이션
 * - 접근성 지원
 */
export function SessionPreparationLoader({ isVisible }: SessionPreparationLoaderProps) {
  const { currentMessage, isTextVisible } = useSessionPreparation(isVisible);

  if (!isVisible) return null;

  return (
    <div
      className="flex items-center space-x-3 px-4 py-3"
      role="status"
      aria-live="polite"
      aria-label="새로운 대화 세션을 준비하고 있습니다"
    >
      {/* 타이핑 인디케이터 도트 - 기존 스타일과 동일 */}
      <div className="flex space-x-1">
        <span className="h-1 w-1 animate-typing rounded-full bg-text-muted"></span>
        <span className="h-1 w-1 animate-typing rounded-full bg-text-muted [animation-delay:0.2s]"></span>
        <span className="h-1 w-1 animate-typing rounded-full bg-text-muted [animation-delay:0.4s]"></span>
      </div>

      {/* 세션 준비 메시지 */}
      <span
        className={`text-sm text-text-muted transition-opacity duration-300 ${
          isTextVisible ? 'opacity-100' : 'opacity-50'
        }`}
      >
        {currentMessage}
      </span>
    </div>
  );
}
