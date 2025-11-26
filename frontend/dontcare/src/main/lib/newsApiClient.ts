// src/main/lib/newsApiClient.ts
export const API_BASE =
  import.meta.env?.VITE_API_BASE_URL ??
  (() => {
    throw new Error('VITE_API_BASE_URL 환경 변수가 필요합니다');
  })();
export const NEWS_API_URL = `${API_BASE}/crawlings/news/`;

// fetch 래퍼
export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    mode: 'cors',
    credentials: 'omit',
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}
