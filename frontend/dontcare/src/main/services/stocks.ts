import { API_BASE } from '@/main/lib/newsApiClient';
import type { ApiStockItem } from '@/main/types/main.types';

export async function fetchStocks(): Promise<ApiStockItem[]> {
  const res = await fetch(`${API_BASE}/stocks/`, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
