import { fetchStocks } from '@/main/services/stocks';
import type { ApiStockItem, MarketData } from '@/main/types/main.types';
import { formatNumber } from '@/main/utils/number';
import { useCallback, useEffect, useRef, useState } from 'react';

const normalize = (item: ApiStockItem): MarketData => {
  const rate = Number(item.changeRate);
  const isPositive = !Number.isNaN(rate) ? rate >= 0 : String(item.changeRate)[0] !== '-';
  return {
    symbol: item.market || item.title,
    price: formatNumber(item.price),
    change: `${isPositive ? '+' : ''}${(Number.isNaN(rate) ? 0 : rate).toFixed(2)}%`,
    isPositive,
  };
};

// 모듈 전역 캐시: 리마운트해도 마지막 정상 데이터 유지
let latestCache: { data: MarketData[]; at: number } | null = null;
const CACHE_TTL_MS = 60_000;

export function useMarketData(refreshMs = 60_000) {
  // 캐시에 값이 있으면 그걸로 초기 표시
  const [data, setData] = useState<MarketData[]>(latestCache?.data ?? []);
  const [loading, setLoading] = useState(!latestCache);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>(
    latestCache ? new Date(latestCache.at).toLocaleTimeString() : '',
  );

  const timerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const rows = await fetchStocks();
      const normalized = rows.map(normalize);
      latestCache = { data: normalized, at: Date.now() }; // 성공 시 캐시 갱신
      setData(normalized); // 화면 갱신
      setUpdatedAt(new Date().toLocaleTimeString());
      setLoading(false);
    } catch (e: unknown) {
      // 실패 시 setData를 건드리지 않아 이전 값 유지
      setError(e instanceof Error ? e.message : '로드 실패');
      setLoading(false);
    }
  }, []);

  // 가시성 기반 폴링 제어 + 최초 진입 시 캐시가 오래됐으면 갱신
  useEffect(() => {
    const start = () => {
      if (timerRef.current == null) {
        timerRef.current = window.setInterval(() => {
          if (document.visibilityState === 'visible') load();
        }, refreshMs);
      }
    };
    const stop = () => {
      if (timerRef.current != null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        load(); // 보이자마자 한번 갱신 시도
        start();
      } else {
        stop(); // 숨기면 폴링 중지
      }
    };

    // 캐시가 없거나 TTL 초과면 초기 로드
    if (!latestCache || Date.now() - latestCache.at > CACHE_TTL_MS) {
      load();
    } else {
      setLoading(false); // 캐시로 즉시 표시
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    onVisibilityChange();
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stop();
    };
  }, [load, refreshMs]);

  return { data, loading, error, updatedAt, reload: load };
}
