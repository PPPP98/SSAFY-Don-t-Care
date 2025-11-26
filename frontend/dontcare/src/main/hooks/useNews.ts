// src/main/hooks/useNews.ts
import { fetchNews, NEWS_QUERY_KEY } from '@/main/lib/newsQuery';
import type { NewsItem } from '@/main/types/main.types';
import { useQuery } from '@tanstack/react-query';

type UseNewsOptions = {
  autoRefreshMs?: number; // 예: 60_000
  enabled?: boolean; // 쿼리 활성화 여부
};

export function useNews(options: UseNewsOptions = {}) {
  const { autoRefreshMs = 60_000, enabled = true } = options;

  const {
    data = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: NEWS_QUERY_KEY,
    queryFn: fetchNews,
    enabled,
    // 60초마다 자동 리페칭
    refetchInterval: autoRefreshMs,
    // 실패 시 기존 데이터 유지 (캐시된 데이터 표시)
    placeholderData: (previousData) => previousData,
    // 30초 동안 fresh 상태 유지 (불필요한 리페칭 방지)
    staleTime: 30_000,
    // 5분간 캐시 유지
    gcTime: 5 * 60 * 1000,
    // 에러 재시도 설정
    retry: (failureCount, error) => {
      // 네트워크 에러가 아닌 경우 재시도하지 않음
      if (error instanceof Error && error.message.includes('No news data')) {
        return false;
      }
      // 최대 2회 재시도
      return failureCount < 2;
    },
    // 에러 메시지 포맷팅
    select: (data) => {
      // 데이터가 없거나 빈 배열인 경우 처리
      if (!data || data.length === 0) {
        return [];
      }
      return data;
    },
  });

  // 에러 메시지 포맷팅
  const errorMessage = error
    ? error instanceof Error && error.message.includes('fetch')
      ? 'CORS/네트워크 오류: 백엔드 연결 불가'
      : error instanceof Error
        ? error.message
        : '알 수 없는 오류'
    : null;

  return {
    data: data as NewsItem[],
    loading: isLoading,
    isFetching,
    error: errorMessage,
    refresh: refetch,
  };
}
