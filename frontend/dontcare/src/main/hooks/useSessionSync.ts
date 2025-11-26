import { extractSessionId } from '@/main/services/vertexAiService';
import { useMainStore } from '@/main/stores/mainStore';
import { useCallback, useEffect, useRef } from 'react';

/**
 * 세션 상태 동기화를 보장하는 커스텀 훅
 * - 세션 무결성 검증
 * - 비정상 상태 감지 및 복구
 * - 세션 상태 변화 모니터링
 */
export function useSessionSync() {
  const {
    activeSession,
    loadSessionMessages,
    isSessionLoading,
    sessionLoadError,
    setSessionLoadError,
  } = useMainStore();

  const lastValidationRef = useRef<string | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 2;

  /**
   * 세션이 유효한지 검증 (개선된 관대한 검증 로직)
   */
  const isValidSession = useCallback((session: typeof activeSession) => {
    if (!session) return false;

    // 세션 ID 추출을 우선으로 검증 (name이 없어도 복구 가능한 경우 허용)
    const sessionId = extractSessionId(session.name);
    if (!sessionId) {
      return false;
    }

    // name이 없지만 sessionId가 추출 가능하면 복구 가능한 상태로 판단
    if (!session.name && sessionId) {
      return true;
    }

    // displayName이 없거나 'Session unknown'인 경우도 복구 가능으로 판단
    if (!session.displayName || session.displayName === 'Session unknown') {
      return true;
    }

    // 모든 필수 필드가 있는 정상 세션 (중복 로깅 제거)
    return !!(session.name && session.displayName && sessionId);
  }, []);

  /**
   * 세션 복구 시도 (개선된 복구 로직)
   */
  const recoverSession = useCallback(
    async (sessionId: string) => {
      if (isSessionLoading) {
        // 복구 건너뜀 - 이미 세션 로딩 중
        return;
      }
      if (retryCountRef.current >= maxRetries) {
        // 복구 건너뜀 - 최대 재시도 횟수 초과
        return;
      }

      try {
        retryCountRef.current++;
        // 세션 복구 시도 ${retryCountRef.current}/${maxRetries}: ${sessionId}

        // 강제로 세션 재로드 시도
        await loadSessionMessages(sessionId);

        // 복구 성공 시 재시도 카운터 리셋 및 검증
        retryCountRef.current = 0;
        // 복구 성공: ${sessionId}
      } catch (error) {
        // 복구 실패

        if (retryCountRef.current >= maxRetries) {
          // 최대 복구 시도 횟수 도달, 우아한 실패로 전환

          // 부드러운 실패 처리 - 에러를 숨기고 새 세션으로 전환
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          if (
            errorMessage.includes('404') ||
            errorMessage.includes('400') ||
            errorMessage.includes('410')
          ) {
            // 세션이 삭제되었거나 존재하지 않는 경우 - 조용히 새 채팅으로 전환
            // 세션을 찾을 수 없음, 조용히 새 채팅 시작
            setSessionLoadError(null);
            // 새 채팅 시작 (웰컴 화면으로 이동)
            const { startNewChat } = useMainStore.getState();
            startNewChat();
          } else {
            // 예상치 못한 에러인 경우만 사용자에게 표시
            setSessionLoadError('세션을 복구할 수 없습니다. 새로운 채팅을 시작해 주세요.');
          }
        }
      }
    },
    [isSessionLoading, loadSessionMessages, setSessionLoadError],
  );

  /**
   * 세션 상태 모니터링 및 검증 (무한 루프 방지 개선)
   */
  useEffect(() => {
    if (!activeSession) {
      lastValidationRef.current = null;
      retryCountRef.current = 0;
      return;
    }

    const sessionId = extractSessionId(activeSession.name);

    // 세션 ID가 없는 경우 조기 종료 (무한 루프 방지)
    if (!sessionId) {
      // 추출 가능한 세션 ID 없음, 활성 세션 클리어
      setSessionLoadError('세션 ID를 찾을 수 없습니다.');
      return;
    }

    // 이미 검증한 세션이면 스킵 (무한 루프 방지의 핵심)
    if (lastValidationRef.current === sessionId) {
      return;
    }

    // 로딩 중이면 검증 건너뛰기 (무한 루프 방지)
    if (isSessionLoading) {
      // 검증 건너뜀 - 세션 로딩 진행 중
      return;
    }

    // 세션 유효성 검사
    if (!isValidSession(activeSession)) {
      // 무효한 세션 감지 - 복구 시도

      // 복구 시도 전에 중복 실행 방지
      if (retryCountRef.current === 0) {
        recoverSession(sessionId);
      } else {
        // 복구가 이미 진행 중, 건너뜀
      }
      return;
    }

    // 검증 완료한 세션으로 기록 (무한 루프 방지의 핵심)
    lastValidationRef.current = sessionId;
    retryCountRef.current = 0;

    // 세션 검증이 성공적으로 완료됨
  }, [activeSession, isSessionLoading, setSessionLoadError, isValidSession, recoverSession]);

  /**
   * 에러 상태 모니터링
   */
  useEffect(() => {
    if (sessionLoadError) {
      // 세션 오류 감지됨
    }
  }, [sessionLoadError]);

  /**
   * 컴포넌트 언마운트 시 정리
   */
  useEffect(() => {
    return () => {
      lastValidationRef.current = null;
      retryCountRef.current = 0;
    };
  }, []);

  return {
    isValidSession: activeSession ? isValidSession(activeSession) : false,
    canRetry: retryCountRef.current < maxRetries,
    retryCount: retryCountRef.current,
  };
}
