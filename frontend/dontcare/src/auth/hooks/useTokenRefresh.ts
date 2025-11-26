import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/auth/stores/authStore';
import { tokenManager } from '@/auth/utils/tokenManager';

/**
 * 토큰 자동 갱신 훅
 *
 * @description
 * - 토큰 만료 전 자동 갱신
 * - 페이지 새로고침 시 토큰 상태 복원
 * - 토큰 갱신 실패 시 자동 로그아웃
 */
export const useTokenRefresh = () => {
  const { isAuthenticated, getAccessToken } = useAuthStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTokenRef = useRef<(() => Promise<void>) | null>(null);
  const setupRefreshTimerRef = useRef<(() => void) | null>(null);
  const isRefreshingRef = useRef<boolean>(false);
  const lastAuthStateRef = useRef<boolean | null>(null);

  /**
   * 토큰 갱신 수행
   */
  const refreshToken = useCallback(async () => {
    if (!isAuthenticated || isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;

    try {
      await tokenManager.refreshAccessToken();
      // 새로운 토큰을 기반으로 재스케줄링
      setupRefreshTimerRef.current?.();
    } catch {
      // 토큰 갱신 실패 시 토큰만 정리, 리다이렉트는 ProtectedRoute에서 담당
      tokenManager.clearTokens();
    } finally {
      isRefreshingRef.current = false;
    }
  }, [isAuthenticated]);

  /**
   * 토큰 만료 시간 계산
   */
  const getTokenExpirationTime = useCallback((token: string): number => {
    try {
      const parts = token.split('.');
      const payloadPart = parts[1];
      if (!payloadPart) return 0;

      const payload = JSON.parse(atob(payloadPart));
      return payload.exp * 1000; // 밀리초로 변환
    } catch {
      return 0;
    }
  }, []);

  /**
   * 다음 토큰 갱신 시간 계산 (만료 5분 전)
   */
  const getNextRefreshTime = useCallback(
    (token: string): number => {
      const expirationTime = getTokenExpirationTime(token);
      const refreshTime = expirationTime - 5 * 60 * 1000; // 5분 전
      return Math.max(refreshTime, Date.now() + 1000); // 최소 1초 후
    },
    [getTokenExpirationTime],
  );

  /**
   * 토큰 갱신 타이머 설정
   */
  const setupRefreshTimer = useCallback(() => {
    const accessToken = getAccessToken();
    if (!accessToken) return;

    const nextRefreshTime = getNextRefreshTime(accessToken);
    const timeUntilRefresh = nextRefreshTime - Date.now();

    // 새로운 타이머를 설정하기 전에 기존 타이머 정리
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (timeUntilRefresh > 0) {
      // 브라우저 최대 지연 시간으로 제한 (~24.8일)
      const delay = Math.min(timeUntilRefresh, 2_147_483_647);
      timerRef.current = setTimeout(() => {
        refreshTokenRef.current?.();
      }, delay);
    } else {
      // 이미 만료되었거나 곧 만료될 예정인 경우 즉시 갱신
      refreshTokenRef.current?.();
    }
  }, [getAccessToken, getNextRefreshTime]);

  /**
   * 컴포넌트 마운트 시 토큰 상태 확인 및 갱신 타이머 설정
   */
  // 함수 참조 설정
  refreshTokenRef.current = refreshToken;
  setupRefreshTimerRef.current = setupRefreshTimer;

  useEffect(() => {
    // 중복 실행 방지: 인증 상태가 실제로 변경된 경우에만 로그 출력
    const hasAuthStateChanged = lastAuthStateRef.current !== isAuthenticated;
    lastAuthStateRef.current = isAuthenticated;

    if (!isAuthenticated) {
      if (hasAuthStateChanged) {
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      isRefreshingRef.current = false; // 인증 해제 시 갱신 상태 리셋
      return;
    }

    // 충분한 지연 후 타이머 설정 (useAuthInitialization과의 경합 방지)
    if (hasAuthStateChanged) {
    }
    const initDelay = setTimeout(() => {
      if (hasAuthStateChanged) {
      }
      setupRefreshTimer();
    }, 500);

    return () => {
      if (hasAuthStateChanged) {
      }
      clearTimeout(initDelay);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAuthenticated, setupRefreshTimer]);

  /**
   * 페이지 가시성 변경 시 토큰 상태 확인
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        // 페이지가 다시 보이게 되었을 때 토큰 유효성 확인
        const accessToken = useAuthStore.getState().getAccessToken();
        if (!accessToken) return;
        if (!tokenManager.isTokenValid()) {
          refreshTokenRef.current?.();
        } else {
          // 탭이 일시 중단되었을 때 타이머를 다시 설정
          setupRefreshTimerRef.current?.();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  return {
    refreshToken,
    isTokenValid: tokenManager.isTokenValid(),
  };
};
