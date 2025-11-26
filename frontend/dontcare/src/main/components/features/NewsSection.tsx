// src/main/components/NewsSection.tsx
import { useNews } from '@/main/hooks/useNews';
import { useComposerStore } from '@/main/stores/useComposerStore';
import { decodeHtmlEntities } from '@/shared/lib/utils';
import { memo, useCallback } from 'react';

// 스켈레톤 카드 컴포넌트
const NewsSkeletonCard = memo(function NewsSkeletonCard() {
  return (
    <div className="rounded-lg border border-border-color bg-bg-secondary px-4 py-3.5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="h-3 w-16 animate-pulse rounded bg-text-muted/30"></div>
        <div className="h-3 w-12 animate-pulse rounded bg-text-muted/30"></div>
      </div>

      <div className="mb-1.5 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-text-muted/30"></div>
        <div className="h-4 w-3/4 animate-pulse rounded bg-text-muted/30"></div>
      </div>

      <div className="mb-2 space-y-1">
        <div className="h-3 w-full animate-pulse rounded bg-text-muted/30"></div>
        <div className="h-3 w-2/3 animate-pulse rounded bg-text-muted/30"></div>
      </div>

      <div className="flex items-center justify-end">
        <div className="h-3 w-20 animate-pulse rounded bg-text-muted/30"></div>
      </div>
    </div>
  );
});

export const NewsSection = memo(function NewsSection() {
  const { data: news, loading, isFetching, error, refresh } = useNews({ autoRefreshMs: 60_000 });
  const setDraft = useComposerStore((s) => s.setDraft);
  const requestFocus = useComposerStore((s) => s.requestFocus);

  const askAboutNews = useCallback(
    (headline: string, url?: string, source?: string) => {
      const prompt = `다음 기사에 대해 자세히 알려줘: ${headline}`;
      const metadata =
        url || source
          ? {
              ...(url ? { url } : {}),
              ...(source ? { source } : {}),
            }
          : undefined;
      setDraft(prompt, metadata);
      requestFocus();
    },
    [setDraft, requestFocus],
  );

  return (
    <div className="mt-8 w-full max-w-3xl animate-fade-in-up">
      <div className="mb-4 flex items-center justify-between px-1">
        <h3 className="text-base font-semibold text-text-primary">오늘의 증시 헤드라인</h3>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                loading
                  ? 'animate-pulse bg-warning'
                  : isFetching
                    ? 'animate-pulse bg-accent-primary'
                    : 'bg-success'
              }`}
            ></span>
            {loading ? '로딩 중...' : isFetching ? '업데이트 중...' : '실시간 업데이트'}
          </span>
          <button
            onClick={() => refresh()}
            className="rounded bg-accent-primary/10 px-2 py-1 text-xs text-accent-primary hover:bg-accent-primary/20"
          >
            새로고침
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded border border-error/30 bg-error/10 p-3 text-xs text-error">
          {error}
        </div>
      )}

      {!loading && news.length === 0 && !error && (
        <div className="rounded border border-border-color bg-bg-secondary p-4 text-sm text-text-muted">
          뉴스가 아직 없어요. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      <div className="flex flex-col gap-3 opacity-100 transition-opacity">
        {loading
          ? // 로딩 중일 때 스켈레톤 카드 표시
            Array.from({ length: 4 }).map((_, index) => (
              <NewsSkeletonCard key={`skeleton-${index}`} />
            ))
          : news.map((item) => (
              <div
                key={item.id}
                className="cursor-pointer rounded-lg border border-border-color bg-bg-secondary px-4 py-3.5 text-left transition-all duration-300 hover:translate-x-1 hover:border-accent-primary hover:bg-bg-tertiary"
                onClick={() => askAboutNews(item.headline, item.url, item.source)}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-accent-primary">{item.source}</span>
                  <span className="text-xs text-text-muted">{item.time}</span>
                </div>

                <div className="mb-1.5 text-sm font-medium leading-relaxed text-text-primary">
                  {decodeHtmlEntities(item.headline)}
                </div>

                {item.description ? (
                  <div className="mb-2 line-clamp-2 text-xs leading-relaxed text-text-muted">
                    {decodeHtmlEntities(item.description)}
                  </div>
                ) : null}

                <div className="flex items-center justify-end">
                  {item.url ? (
                    <a
                      href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-xs text-text-muted underline-offset-2 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      뉴스 보러 가기
                    </a>
                  ) : (
                    <span className="text-xs text-text-muted">링크 없음</span>
                  )}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
});
