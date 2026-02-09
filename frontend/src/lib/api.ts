// API Base URL - configure for production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Types
export interface Symbol {
  code: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ';
}

export interface Quote {
  code: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ';
  price: number;
  chg_pct: number;
  volume: number;
  value: number;
  asof: string;
}

export interface Top10Item {
  rank: number;
  code: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ';
  price: number;
  chg_pct: number;
  value: number;
  stop_price?: number;
  max_shares?: number;
  max_investment?: number;
  risk_amount?: number;
}

export interface Top10Response {
  asof: string;
  items: Top10Item[];
}

export interface Top10Params {
  market?: 'KOSPI' | 'KOSDAQ' | 'ALL';
  min_value?: number;
  min_chg_pct?: number;
  max_chg_pct?: number;
  min_price?: number;
  max_price?: number;
  sort_by?: 'value' | 'weighted';
  account_size?: number;
  risk_pct?: number;
  stop_pct?: number;
  cap_pct?: number;
}

// API Functions
export async function getSymbols(query?: string, market?: string): Promise<Symbol[]> {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (market && market !== 'ALL') params.set('market', market);

  const response = await fetch(`${API_BASE_URL}/symbols?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch symbols');
  return response.json();
}

export async function getQuote(code: string): Promise<Quote> {
  const response = await fetch(`${API_BASE_URL}/quote/${code}`);
  if (!response.ok) throw new Error('Failed to fetch quote');
  return response.json();
}

export async function getTop10(params: Top10Params = {}): Promise<Top10Response> {
  const searchParams = new URLSearchParams();

  if (params.market) searchParams.set('market', params.market);
  if (params.min_value !== undefined) searchParams.set('min_value', params.min_value.toString());
  if (params.min_chg_pct !== undefined) searchParams.set('min_chg_pct', params.min_chg_pct.toString());
  if (params.max_chg_pct !== undefined) searchParams.set('max_chg_pct', params.max_chg_pct.toString());
  if (params.min_price !== undefined) searchParams.set('min_price', params.min_price.toString());
  if (params.max_price !== undefined) searchParams.set('max_price', params.max_price.toString());
  if (params.sort_by) searchParams.set('sort_by', params.sort_by);
  if (params.account_size !== undefined) searchParams.set('account_size', params.account_size.toString());
  if (params.risk_pct !== undefined) searchParams.set('risk_pct', params.risk_pct.toString());
  if (params.stop_pct !== undefined) searchParams.set('stop_pct', params.stop_pct.toString());
  if (params.cap_pct !== undefined) searchParams.set('cap_pct', params.cap_pct.toString());

  const response = await fetch(`${API_BASE_URL}/top10?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch top 10');
  return response.json();
}

// Utility functions
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ko-KR').format(num);
}

export function formatValue(value: number): string {
  // Convert to 억원
  const billions = value / 100_000_000;
  if (billions >= 1) {
    return `${billions.toFixed(1)}억`;
  }
  // Convert to 만원
  const tenThousands = value / 10_000;
  return `${formatNumber(Math.round(tenThousands))}만`;
}

export function formatPercent(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}
