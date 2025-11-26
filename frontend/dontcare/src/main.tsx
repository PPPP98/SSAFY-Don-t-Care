import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import '@/index.css';
import { App } from '@/App';
import { HydrateFallback } from '@/shared/components/HydrateFallback';
import { QueryProvider } from '@/shared/components/QueryProvider';
import { AppErrorBoundary } from '@/shared/components/AppErrorBoundary';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import { RootRedirect } from '@/shared/components/RootRedirect';

/**
 * 라우트 생성 로직을 추상화하는 함수
 * lazy loading과 공통 설정을 포함하여 중복을 제거합니다.
 */
function createLazyRoute(
  path: string,
  lazyImport: () => Promise<{ [key: string]: React.ComponentType }>,
): RouteObject {
  return {
    path,
    async lazy() {
      const module = await lazyImport();
      const Component = Object.values(module)[0]; // 첫 번째 export된 컴포넌트 사용
      if (!Component) {
        throw new Error('No component found in module for index route');
      }
      return { Component };
    },
  };
}

/**
 * 보호된 라우트 생성 함수
 * ProtectedRoute로 감싸진 라우트를 생성합니다.
 */
function createProtectedRoute(
  path: string,
  lazyImport: () => Promise<{ [key: string]: React.ComponentType }>,
): RouteObject {
  return {
    path,
    async lazy() {
      const module = await lazyImport();
      const Component = Object.values(module)[0];
      if (!Component) {
        throw new Error(`No component found in module for path: ${path}`);
      }
      return {
        Component: () => (
          <ProtectedRoute>
            <Component />
          </ProtectedRoute>
        ),
      };
    },
  };
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      Component: App,
      HydrateFallback: HydrateFallback,
      errorElement: <AppErrorBoundary />,
      children: [
        // Root redirect - 인증 상태에 따라 적절한 페이지로 리다이렉트
        {
          index: true,
          Component: RootRedirect,
        },
        // Public routes - 인증 불필요
        {
          ...createLazyRoute('/onboarding', () => import('@/onboarding/OnboardingPage')),
        },
        {
          ...createLazyRoute('/login', () => import('@/auth/pages/LoginPage')),
        },
        {
          ...createLazyRoute('/signup', () => import('@/auth/pages/SignupPage')),
        },
        {
          ...createLazyRoute('/password-reset', () => import('@/auth/pages/PasswordResetPage')),
        },
        // Protected routes - 인증 필요
        {
          ...createProtectedRoute('/main', () => import('@/main/MainPage')),
        },
        // 404 page
        {
          path: '*',
          async lazy() {
            const { NotFoundPage } = await import('@/shared/pages/NotFoundPage');
            return { Component: NotFoundPage };
          },
        },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find root element');
}
createRoot(rootElement).render(
  <StrictMode>
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  </StrictMode>,
);
