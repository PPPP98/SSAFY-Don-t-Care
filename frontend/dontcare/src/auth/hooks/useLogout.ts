import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { logoutApi } from '@/auth/services/authApi';
import { useAuthStore } from '@/auth/stores/authStore';
import { clearTokens } from '@/auth/utils/tokenManager';
import { NEWS_QUERY_KEY } from '@/main/lib/newsQuery';
import type { ApiRequestStatus } from '@/auth/types/auth.api.types';

interface UseLogoutReturn {
  logout: () => Promise<void>;
  isLoading: boolean;
  status: ApiRequestStatus;
  error: string | null;
}

export function useLogout(): UseLogoutReturn {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getRefreshToken, clearAuth } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<ApiRequestStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const logout = async (): Promise<void> => {
    const refreshToken = getRefreshToken();

    setIsLoading(true);
    setStatus('loading');
    setError(null);

    try {
      // httpOnly 쿠키 환경에서는 refresh token이 메모리에 없어도 서버에 로그아웃 요청
      // 서버에서 쿠키에서 refresh token을 읽어서 처리함
      await logoutApi({ refresh: refreshToken || '' });

      // 성공 시 메모리에서 토큰 정리
      clearAuth();
      clearTokens();

      // 뉴스 캐시 정리 (사용자별 데이터 분리)
      queryClient.removeQueries({ queryKey: NEWS_QUERY_KEY });

      setStatus('success');

      // 온보딩 페이지로 리다이렉트
      navigate('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '로그아웃 중 오류가 발생했습니다.';
      setError(errorMessage);
      setStatus('error');

      // 에러가 발생해도 로컬에서는 로그아웃 처리
      clearAuth();
      clearTokens();

      // 뉴스 캐시 정리 (에러 상황에서도 정리)
      queryClient.removeQueries({ queryKey: NEWS_QUERY_KEY });

      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    logout,
    isLoading,
    status,
    error,
  };
}
