// src/main/components/features/MarketWidget.tsx
import { API_BASE } from '@/main/lib/newsApiClient';
import type { MarketData } from '@/main/types/main.types';
import { useEffect, useState } from 'react';

type ApiStockItem = {
  title: string; // "코스피" | "코스닥" | "나스닥 종합지수"
  market: string; // "코스피" | "코스닥" | "나스닥"
  price: string; // "3448.45" ...
  change: string; // "-37.74"
  changeRate: string; // "-1.08"
  sign: string; // 서버 제공값 (무시해도 됨)
};

export function MarketWidget() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>('');

  const formatNumber = (numLike: string) => {
    const n = Number(numLike);
    if (Number.isNaN(n)) return numLike;
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  useEffect(() => {
    const normalize = (item: ApiStockItem): MarketData => {
      const rate = Number(item.changeRate);
      const isPositive = !Number.isNaN(rate) ? rate >= 0 : String(item.changeRate)[0] !== '-';
      const symbol = item.market || item.title; // 화면엔 더 짧은 market 우선
      const price = formatNumber(item.price);
      const change = `${isPositive ? '+' : ''}${rate.toFixed(2)}%`;
      return { symbol, price, change, isPositive };
    };

    const fetchStocks = async () => {
      try {
        setError(null);
        const res = await fetch(`${API_BASE}/stocks/`, { method: 'GET' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ApiStockItem[] = await res.json();
        setMarketData(data.map(normalize));
        setUpdatedAt(new Date().toLocaleTimeString());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '로드 실패');
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
    // 원하면 주기적 갱신 (예: 30초)
    const id = setInterval(fetchStocks, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mb-8 w-full max-w-2xl animate-fade-in-up rounded-xl border border-border-color bg-bg-secondary p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-text-secondary">시장 개요</span>
        <span className="text-xs text-text-muted">
          {loading ? '로딩 중…' : error ? '오류' : `업데이트됨 ${updatedAt}`}
        </span>
      </div>

      {error ? (
        <div className="rounded-lg border border-border-color bg-bg-chat p-4 text-sm text-error">
          데이터를 불러오는 중 오류가 발생했습니다: {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {marketData.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border-color bg-bg-chat p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/15"
            >
              <div className="mb-1 text-xs font-semibold text-text-muted">{item.symbol}</div>
              <div className="mb-1 text-lg font-bold">{item.price}</div>
              <div
                className={`text-xs font-medium ${item.isPositive ? 'text-success' : 'text-error'}`}
              >
                {item.change}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
