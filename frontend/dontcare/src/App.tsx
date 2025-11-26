import { Outlet } from 'react-router-dom';
import { Layout } from '@/shared/components/Layout';
import { useTokenRefresh } from '@/auth/hooks/useTokenRefresh';
import { useAuthInitialization } from '@/auth/hooks/useAuthInitialization';
import { HydrateFallback } from '@/shared/components/HydrateFallback';

function App() {
  // 인증 초기화 (앱 시작 시 토큰 복구)
  const { isInitialized, isLoading } = useAuthInitialization();

  // 토큰 자동 갱신 활성화 (초기화 완료 후에만)
  // 조건부 훅 호출 방지를 위해 isInitialized 상태와 관계없이 항상 호출
  // 하지만 useTokenRefresh 내부에서 초기화 완료 여부를 확인하여 동작
  useTokenRefresh();

  // 초기화 중인 경우 로딩 화면 표시
  if (isLoading || !isInitialized) {
    return <HydrateFallback />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export { App };
