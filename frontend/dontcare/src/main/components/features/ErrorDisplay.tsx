import { useSessionManager } from '@/main/hooks/useSessionManager';

/**
 * 에러 표시 컴포넌트
 * - 세션 로드 에러 메시지 표시
 * - 세션 복구 알림이 표시되지 않는 경우에만 표시
 */
export function ErrorDisplay() {
  const { sessionLoadError, showNotification } = useSessionManager();

  // 세션 관련 에러는 SessionRecoveryNotification으로 처리하므로
  // showNotification이 false일 때만 에러 메시지 표시
  if (!sessionLoadError || showNotification) {
    return null;
  }

  return (
    <div className="mx-0 w-full max-w-2xl px-4 md:px-6 lg:max-w-4xl lg:px-8 xl:max-w-5xl">
      <div className="mb-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        <div className="flex items-center">
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {sessionLoadError}
        </div>
      </div>
    </div>
  );
}
