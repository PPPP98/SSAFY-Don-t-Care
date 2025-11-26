import { useEffect, useRef } from 'react';
import { useMainStore } from '@/main/stores/mainStore';
import { useSessionsInfiniteQuery } from '@/main/hooks/useSessionsInfiniteQuery';
import type { Session } from '@/main/types/main.types';
import { DeleteSessionModal } from '@/main/components/ui/DeleteSessionModal';
import { useSessionActions } from '@/main/hooks/useSessionActions';
import { extractSessionId } from '@/main/services/vertexAiService';
import { MiniSessionLoading } from '@/main/components/ui/SessionLoadingIndicator';

// 시간대별로 세션을 그룹화하는 헬퍼 함수
function groupSessionsByTime(sessions: Session[]): Array<{ title: string; items: Session[] }> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups = {
    today: [] as Session[],
    yesterday: [] as Session[],
    thisWeek: [] as Session[],
    older: [] as Session[],
  };

  sessions.forEach((session) => {
    const sessionDate = session.createdAt ? new Date(session.createdAt) : new Date();

    if (sessionDate >= today) {
      groups.today.push(session);
    } else if (sessionDate >= yesterday) {
      groups.yesterday.push(session);
    } else if (sessionDate >= weekAgo) {
      groups.thisWeek.push(session);
    } else {
      groups.older.push(session);
    }
  });

  const result = [];
  if (groups.today.length > 0) result.push({ title: '오늘', items: groups.today });
  if (groups.yesterday.length > 0) result.push({ title: '어제', items: groups.yesterday });
  if (groups.thisWeek.length > 0) result.push({ title: '이번 주', items: groups.thisWeek });
  if (groups.older.length > 0) result.push({ title: '이전', items: groups.older });

  return result;
}

export function ChatHistory() {
  const { activeSession } = useMainStore();

  // 무한 스크롤 훅 사용
  const {
    sessions,
    isLoading: isLoadingSessions,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    handleSessionDeleted,
  } = useSessionsInfiniteQuery({ pageSize: 20 });

  // 세션 액션 훅 사용
  const { handleSessionClick, handleDeleteSession, isDeleting } = useSessionActions();

  // Intersection Observer를 위한 ref
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection Observer 설정
  useEffect(() => {
    const currentRef = loadMoreRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: '100px', // 100px 전에 미리 로드 시작
        threshold: 0.1,
      },
    );

    observer.observe(currentRef);

    return () => {
      observer.unobserve(currentRef);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Custom hook에서 handleDeleteSession을 래핑하여 handleSessionDeleted도 호출
  const wrappedHandleDeleteSession = async (sessionId: string) => {
    try {
      await handleDeleteSession(sessionId);
      // 캐시 업데이트 (세션 목록 새로고침)
      handleSessionDeleted();
    } catch (error) {
      throw error; // 모달이 에러 상태를 처리하도록 재전파
    }
  };

  const sessionGroups = groupSessionsByTime(sessions);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4 md:py-4">
      {isLoadingSessions && sessions.length === 0 && (
        <div className="mb-4">
          <MiniSessionLoading size="sm" />
        </div>
      )}

      {sessionGroups.map((group, index) => (
        <div key={index} className="mb-4 md:mb-6">
          <div className="mb-1.5 px-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted md:mb-2 md:px-2">
            {group.title}
          </div>
          {group.items.map((session) => (
            <div
              key={session.name}
              onClick={(e) => {
                // 삭제 버튼 또는 그 자식 요소를 클릭하는 경우 세션 클릭 처리하지 않음
                if ((e.target as HTMLElement).closest('button[aria-label="Delete session"]')) {
                  return;
                }
                handleSessionClick(extractSessionId(session.name));
              }}
              className={`group relative mb-0.5 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap rounded-md px-2.5 py-2 text-xs transition-all duration-200 md:px-3 md:py-2.5 md:text-sm ${
                activeSession?.name === session.name
                  ? 'bg-bg-tertiary text-text-primary'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              } ${isDeleting(extractSessionId(session.name)) ? 'pointer-events-none opacity-50' : ''}`}
            >
              <span className="block truncate">
                {session.displayName && session.displayName.trim() !== ''
                  ? session.displayName.length > 15
                    ? `${session.displayName.slice(0, 15)}...`
                    : session.displayName
                  : '새로운 세션'}
              </span>

              {/* 삭제 버튼 */}
              <DeleteSessionModal
                onConfirm={() => wrappedHandleDeleteSession(extractSessionId(session.name))}
                sessionName={
                  session.displayName && session.displayName.trim() !== ''
                    ? session.displayName
                    : `Session ${extractSessionId(session.name).slice(0, 15)}...`
                }
                trigger={(openModal) => (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      openModal();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Delete session"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              />
            </div>
          ))}
        </div>
      ))}

      {/* 개선된 무한 스크롤 로더 */}
      <div ref={loadMoreRef} className="py-4">
        {isFetchingNextPage && (
          <div className="flex justify-center">
            <MiniSessionLoading size="sm" />
          </div>
        )}
        {!hasNextPage && sessions.length > 0 && (
          <div className="text-center text-xs text-text-muted md:text-sm">
            모든 세션을 불러왔습니다
          </div>
        )}
      </div>

      {sessions.length === 0 && !isLoadingSessions && (
        <div className="px-2 text-xs text-text-muted md:text-sm">아직 채팅 기록이 없습니다.</div>
      )}
    </div>
  );
}
