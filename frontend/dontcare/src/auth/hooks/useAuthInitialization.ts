import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/auth/stores/authStore';
import { getUserApi } from '@/auth/services/authApi';
import { tokenManager } from '@/auth/utils/tokenManager';

/**
 * 인증 초기화 상태
 */
interface AuthInitializationState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * 앱 시작 시 인증 상태 초기화 훅
 *
 * @description
 * - httpOnly 쿠키의 refresh token으로 access token 복구
 * - 복구된 토큰으로 사용자 정보 조회
 * - 초기화 완료 상태 관리
 */
export const useAuthInitialization = () => {
  const [state, setState] = useState<AuthInitializationState>({
    isInitialized: false,
    isLoading: true,
    error: null,
  });
  const isInitializingRef = useRef(false);

  /**
   * 재시도 함수
   */
  const retry = () => {
    if (!state.isLoading && !isInitializingRef.current) {
      isInitializingRef.current = false;
    }
  };

  /**
   * 컴포넌트 마운트 시 초기화 실행 (한 번만)
   */
  useEffect(() => {
    // 이미 초기화 중이거나 완료된 경우 스킵
    if (isInitializingRef.current) {
      return;
    }

    // 초기화 시작
    const initializeAuth = async () => {
      const currentState = useAuthStore.getState();
      const currentIsAuthenticated = currentState.isAuthenticated;

      // 이미 인증된 상태라면 초기화 스킵
      if (currentIsAuthenticated) {
        setState({
          isInitialized: true,
          isLoading: false,
          error: null,
        });
        return;
      }

      isInitializingRef.current = true;

      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // 1. localStorage에서 사용자 정보 즉시 로드 (UI 빠른 표시, pk 제외)
        const authStore = useAuthStore.getState();
        const cachedSafeUser = authStore.loadUserFromStorage();
        if (cachedSafeUser) {
          // SafeUserInfo만 사용하여 UI 표시 (pk 없이)
          // pk가 필요한 경우에만 API에서 가져온 완전한 User 객체 사용
        }

        // 2. httpOnly 쿠키의 refresh token으로 access token 발급 시도
        await tokenManager.refreshAccessToken();

        // 3. 백그라운드에서 사용자 정보 갱신 (최신 정보 확인)
        try {
          const freshUser = await getUserApi();
          authStore.setUser(freshUser);
          authStore.saveUserToStorage(freshUser);
        } catch {
          // 사용자 정보 갱신 실패해도 토큰은 유효하므로 계속 진행
          // 사용자 정보 갱신 실패, 캐시된 정보 사용
        }

        setState({
          isInitialized: true,
          isLoading: false,
          error: null,
        });
      } catch {
        // 토큰 갱신 실패 시 localStorage 정리
        useAuthStore.getState().clearAuth();
        setState({
          isInitialized: true,
          isLoading: false,
          error: null,
        });
      } finally {
        isInitializingRef.current = false;
      }
    };

    initializeAuth();
  }, []); // 빈 의존성 배열로 마운트 시에만 실행

  return {
    ...state,
    retry,
  };
};
