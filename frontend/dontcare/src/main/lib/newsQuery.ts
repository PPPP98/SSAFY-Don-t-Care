// src/main/lib/newsQuery.ts
import { adaptNewsResponse } from '@/main/lib/newsAdapter';
import { NEWS_API_URL, getJson } from '@/main/lib/newsApiClient';
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

/**
 * 뉴스 데이터를 가져오는 쿼리 함수
 * TanStack Query에서 사용할 수 있도록 설계
 */
export async function fetchNews(): Promise<NewsItem[]> {
  const raw = await getJson<NewsApiResponse>(NEWS_API_URL);

  if (!raw?.items || !Array.isArray(raw.items)) {
    throw new Error('API에서 뉴스 데이터를 사용할 수 없습니다');
  }

  return adaptNewsResponse(raw);
}

/**
 * 뉴스 쿼리 키
 * TanStack Query에서 캐싱과 리페칭에 사용
 */
export const NEWS_QUERY_KEY = ['news'] as const;
