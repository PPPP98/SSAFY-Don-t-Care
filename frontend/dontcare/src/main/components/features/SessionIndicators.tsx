import { SessionLoadingIndicator } from '@/main/components/ui/SessionLoadingIndicator';
import { SessionRecoveryNotification } from '@/main/components/ui/SessionRecoveryNotification';
import { useSessionManager } from '@/main/hooks/useSessionManager';

/**
 * 세션 상태 인디케이터 컴포넌트
 * - 세션 로딩 인디케이터 (화면 중앙)
 * - 세션 복구 알림 (상단)
 */
export function SessionIndicators() {
  const {
    isSessionLoading,
    sessionName,
    showNotification,
    isRecovering,
    recoveryAttempt,
    handleRetry,
    handleCreateNew,
    handleDismiss,
  } = useSessionManager();

  return (
    <>
      {/* 세션 로딩 인디케이터 - 화면 중앙에 위치 */}
      {isSessionLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md">
            <SessionLoadingIndicator
              sessionName={sessionName}
              isVisible={isSessionLoading}
              showProgress={true}
            />
          </div>
        </div>
      )}

      {/* 세션 복구 알림 */}
      {showNotification && (
        <div className="mx-0 w-full max-w-2xl px-4 md:px-6 lg:max-w-4xl lg:px-8 xl:max-w-5xl">
          <SessionRecoveryNotification
            sessionName={sessionName}
            isRecovering={isRecovering}
            recoveryAttempt={recoveryAttempt}
            maxRetries={3}
            onRetry={handleRetry}
            onCreateNew={handleCreateNew}
            onDismiss={handleDismiss}
            autoHide={false}
          />
        </div>
      )}
    </>
  );
}
