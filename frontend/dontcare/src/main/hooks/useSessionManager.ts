import { useSessionRecovery } from '@/main/components/ui/SessionRecoveryNotification';
import { useMainStore } from '@/main/stores/mainStore';
import { extractSessionId } from '@/main/services/vertexAiService';

/**
 * 세션 관리 관련 로직을 관리하는 커스텀 훅
 * - 세션 복구 상태 관리
 * - 세션 로딩 상태 관리
 * - 세션 관련 UI 상태 제공
 */
export function useSessionManager() {
  // 세션 복구 상태 관리
  const {
    isRecovering,
    recoveryAttempt,
    showNotification,
    handleRetry,
    handleCreateNew,
    handleDismiss,
  } = useSessionRecovery();

  // UI 표시용 상태들 (메시지 전송 로직은 useMessageSending에 포함됨)
  const { isSessionLoading, sessionLoadError, activeSession, isTyping } = useMainStore();

  // 세션 ID 추출 헬퍼
  const getSessionId = (session: typeof activeSession) => {
    return session ? extractSessionId(session.name) : null;
  };

  // 세션 관련 상태 통합 제공
  const sessionState = {
    isSessionLoading,
    sessionLoadError,
    activeSession,
    isTyping,
    sessionId: getSessionId(activeSession),
    sessionName: activeSession?.displayName,
  };

  // 세션 복구 관련 상태 통합 제공
  const recoveryState = {
    isRecovering,
    recoveryAttempt,
    showNotification,
    handleRetry,
    handleCreateNew,
    handleDismiss,
  };

  return {
    ...sessionState,
    ...recoveryState,
  };
}
