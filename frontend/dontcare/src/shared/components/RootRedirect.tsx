import { useAuthStore } from '@/auth/stores/authStore';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * 루트 경로 리다이렉트 컴포넌트
 *
 * @description
 * - '/' 경로 접근 시 인증 상태에 따라 적절한 페이지로 리다이렉트
 * - 인증된 사용자: /main으로 리다이렉트
 * - 미인증 사용자: /onboarding으로 리다이렉트
 * - 로그인 후 복귀를 위한 state 정보 처리
 */
export const RootRedirect = () => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // 로그인 후 돌아갈 페이지가 state에 있는 경우 해당 페이지로 리다이렉트
  const fromPath = location.state?.from;
  if (isAuthenticated && user && typeof fromPath === 'string' && fromPath.trim()) {
    return <Navigate to={fromPath} replace />;
  }

  // 인증된 사용자는 홈으로, 미인증 사용자는 온보딩으로
  const redirectTo = isAuthenticated && user ? '/main' : '/onboarding';

  return <Navigate to={redirectTo} replace />;
};
