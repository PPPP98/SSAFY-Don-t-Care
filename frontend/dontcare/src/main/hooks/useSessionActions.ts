import { vertexAIService } from '@/main/services/vertexAiService';
import { useMainStore } from '@/main/stores/mainStore';
import { useCallback, useState } from 'react';

export function useSessionActions() {
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const { activeSession, loadSessionMessages, startNewChat } = useMainStore();

  const handleSessionClick = useCallback(
    async (sessionId: string) => {
      // 세션이 삭제 중이면 차단
      if (deletingSessionId === sessionId) {
        return;
      }

      // 이미 로딩 중이면 차단
      const { isLoading } = useMainStore.getState();
      if (isLoading) return;

      try {
        await loadSessionMessages(sessionId);
      } catch {
        // 세션 로드 실패
      }
    },
    [deletingSessionId, loadSessionMessages],
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      // 동시 삭제 방지
      if (deletingSessionId) {
        return;
      }

      setDeletingSessionId(sessionId);

      try {
        // 활성 세션 삭제 여부 확인
        const isActiveSession =
          activeSession?.name && activeSession.name.split('/').pop() === sessionId;

        // 백엔드에서 세션 삭제
        await vertexAIService.deleteSession(sessionId);

        // 활성 세션이 삭제되면 웰컴 화면으로 이동
        if (isActiveSession) {
          startNewChat();
        }

        // 세션 목록 새로고침 (useSessionsInfiniteQuery로 처리)
        // 참고: 이는 이 훅을 사용하는 컴포넌트에서 처리됨
      } catch (error) {
        // 세션 삭제 실패
        throw error; // 모달이 에러 상태를 처리하도록 재전파
      } finally {
        setDeletingSessionId(null);
      }
    },
    [deletingSessionId, activeSession, startNewChat],
  );

  const isDeleting = useCallback(
    (sessionId: string) => {
      return deletingSessionId === sessionId;
    },
    [deletingSessionId],
  );

  return {
    handleSessionClick,
    handleDeleteSession,
    isDeleting,
    isDeletingAny: deletingSessionId !== null,
  };
}
