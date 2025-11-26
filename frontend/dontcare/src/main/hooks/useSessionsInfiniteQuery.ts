import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { vertexAIService } from '@/main/services/vertexAiService';

interface UseSessionsOptions {
  pageSize?: number;
}

export function useSessionsInfiniteQuery({ pageSize = 20 }: UseSessionsOptions = {}) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['sessions', 'infinite', pageSize],
    queryFn: async ({ pageParam }) => {
      return await vertexAIService.listSessions(pageParam, pageSize);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // 캐시 무효화 함수
  const invalidateSessions = () => {
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  // 세션 생성 후 캐시 무효화
  const handleSessionCreated = () => {
    invalidateSessions();
  };

  // 세션 삭제 후 캐시 무효화
  const handleSessionDeleted = () => {
    // 삭제 성공 후 캐시 무효화하여 최신 세션 목록 가져오기
    // 옵티미스틱 업데이트 제거 - 서버 응답 후에만 UI 업데이트
    invalidateSessions();
  };

  // 모든 세션을 하나의 배열로 플랫하게 만들기
  const allSessions = query.data?.pages.flatMap((page) => page.sessions) ?? [];

  return {
    sessions: allSessions,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    invalidateSessions,
    handleSessionCreated,
    handleSessionDeleted,
  };
}
