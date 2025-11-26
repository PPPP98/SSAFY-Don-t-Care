// src/main/lib/newsAdapter.ts
import { formatTimeAgo } from '@/main/lib/newsUtils';
import type { NewsItem } from '@/main/types/main.types';

type RawNews = {
  id?: string | number;
  title?: string;
  description?: string | null;
  pub_date?: string;
  publication_date?: string;
  publisher?: string;
  original_link?: string;
  link?: string;
  url?: string;
  image_url?: string | null;
  image?: string | null;
  thumbnail?: string | null;
};

type NewsApiResponse = {
  success?: boolean;
  items?: RawNews[];
};

export function adaptNewsResponse(payload: NewsApiResponse): NewsItem[] {
  const items = payload?.items ?? [];
  return items.map((n, idx) => {
    const title = n.title ?? '제목 없음';
    const desc = n.description ?? null;
    const when = n.pub_date ?? n.publication_date;
    const url = n.original_link ?? n.link ?? n.url ?? '#';
    const image = n.image_url ?? n.image ?? n.thumbnail ?? null;

    // 시간 포맷팅을 최적화하여 동일한 시간에 대해서는 캐시된 값 사용
    const timeAgo = formatTimeAgo(when);

    return {
      id: String(n.id ?? `news-${idx}`),
      headline: title,
      source: n.publisher ?? '알 수 없음',
      time: timeAgo,
      url,
      imageUrl: image,
      description: desc,
    };
  });
}
