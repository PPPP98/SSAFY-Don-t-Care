import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/shared/lib/queryClient';
import type { ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * TanStack Query Provider 컴포넌트
 *
 * @description
 * - QueryClientProvider로 앱 전체에 QueryClient 제공
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
