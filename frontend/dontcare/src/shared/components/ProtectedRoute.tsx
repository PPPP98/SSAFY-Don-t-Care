import { useAuthStore } from '@/auth/stores/authStore';
import { HydrateFallback } from '@/shared/components/HydrateFallback';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * 보호된 라우트 컴포넌트
 *
 * @description
 * - 인증된 사용자만 접근 가능한 라우트를 보호
 * - 미인증 시 지정된 경로로 리다이렉트
 * - 로그인 후 원래 페이지로 돌아갈 수 있도록 state 전달
 *
 * @param children - 보호할 컴포넌트
 * @param redirectTo - 미인증 시 리다이렉트할 경로 (기본값: '/onboarding')
 */
export const ProtectedRoute = ({ children, redirectTo = '/onboarding' }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // 완전 미인증 상태 (토큰도 없고 사용자도 없음)
  if (!isAuthenticated && !user) {
    return (
      <Navigate
        to={redirectTo}
        state={{
          from: location.pathname + location.search + location.hash,
          message: '로그인이 필요한 페이지입니다.',
        }}
        replace
      />
    );
  }

  // 토큰은 있지만 사용자 정보가 아직 로딩 중인 경우 (타이밍 이슈 해결)
  if (isAuthenticated && !user) {
    return <HydrateFallback />;
  }

  // 인증된 경우 자식 컴포넌트 렌더링
  return <>{children}</>;
};
