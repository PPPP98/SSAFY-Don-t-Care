/**
 * 세션 로딩 상태를 사용자에게 명확히 보여주는 컴포넌트
 * 향상된 UX를 위한 로딩 인디케이터와 상태 메시지 제공
 */

import { useEffect, useState } from 'react';

interface SessionLoadingIndicatorProps {
  sessionName?: string | undefined;
  isVisible?: boolean;
  loadingMessage?: string;
  showProgress?: boolean;
}

export function SessionLoadingIndicator({
  sessionName,
  isVisible = true,
  loadingMessage,
  showProgress = false,
}: SessionLoadingIndicatorProps) {
  const [dots, setDots] = useState('');
  const [progress, setProgress] = useState(0);

  // 점 애니메이션 효과
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  // 진행률 시뮬레이션 (실제 로딩 진행률이 있다면 props로 받을 수 있음)
  useEffect(() => {
    if (!isVisible || !showProgress) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev; // 90%에서 멈춤 (실제 완료까지 대기)
        return prev + Math.random() * 10;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isVisible, showProgress]);

  if (!isVisible) return null;

  const displayMessage = loadingMessage || '세션을 불러오는 중';

  return (
    <div className="flex items-center justify-center rounded-lg border border-accent-primary/20 bg-bg-tertiary/50 p-6 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4">
        {/* 로딩 스피너 */}
        <div className="relative">
          <div className="border-3 h-8 w-8 animate-spin rounded-full border-accent-primary border-t-transparent"></div>
          <div className="absolute inset-0 h-8 w-8 animate-ping rounded-full border border-accent-secondary/30 opacity-20"></div>
        </div>

        {/* 로딩 메시지 */}
        <div className="text-center">
          <p className="font-medium text-text-primary">
            {displayMessage}
            {dots}
          </p>

          {sessionName && (
            <p className="mt-1 text-sm text-text-secondary">이전 대화를 복원하고 있습니다</p>
          )}
        </div>

        {/* 진행률 바 (선택적) */}
        {showProgress && (
          <div className="h-2 w-64 rounded-full bg-bg-secondary">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}

        {/* 로딩 힌트 */}
        <div className="max-w-xs text-center text-xs text-text-muted">
          <p>💡 세션이 로딩되는 동안 잠시만 기다려 주세요</p>
        </div>
      </div>
    </div>
  );
}

// 미니 버전 (인라인 사용)
interface MiniSessionLoadingProps {
  size?: 'sm' | 'md';
}

export function MiniSessionLoading({ size = 'sm' }: MiniSessionLoadingProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const spinnerSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const textSize = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <div className="flex items-center gap-3 rounded-md bg-bg-tertiary/50 px-3 py-2 backdrop-blur-sm">
      <div
        className={`animate-spin ${spinnerSize} rounded-full border-2 border-accent-primary border-t-transparent`}
      />
      <span className={`${textSize} text-text-primary`}>세션 로딩 중{dots}</span>
    </div>
  );
}

// 커스텀 훅 - 세션 로딩 상태 관리
export function useSessionLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>();
  const [sessionName, setSessionName] = useState<string>();

  const startLoading = (sessionName?: string, message?: string) => {
    setIsLoading(true);
    setSessionName(sessionName);
    setLoadingMessage(message);
  };

  const stopLoading = () => {
    setIsLoading(false);
    setSessionName(undefined);
    setLoadingMessage(undefined);
  };

  const updateMessage = (message: string) => {
    setLoadingMessage(message);
  };

  return {
    isLoading,
    sessionName,
    loadingMessage,
    startLoading,
    stopLoading,
    updateMessage,
  };
}
