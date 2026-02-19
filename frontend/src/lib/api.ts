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
  cap_pct?: number;
}

export interface KellyAnalysis {
  code: string;
  name: string;
  current_price: number;
  lookback_days: number;
  // 역사적 통계
  win_rate: number;
  avg_gain_pct: number;
  avg_loss_pct: number;
  // 켈리 비율
  kelly_fraction: number;
  half_kelly_fraction: number;
  // ATR 손절
  atr_pct: number;
  stop_pct: number;
  stop_price: number;
  // 포지션 계산
  risk_amount: number;
  kelly_investment: number;
  risk_investment: number;
  cap_investment: number;
  recommended_shares: number;
  recommended_investment: number;
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

// === Chart ===

export interface Candle {
  date: string; // "20260219"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartData {
  code: string;
  period: string;
  candles: Candle[];
}

export async function getChartData(
  code: string,
  period: 'day' | 'week' | 'month' = 'day',
  count = 120,
): Promise<ChartData> {
  const response = await fetch(`${API_BASE_URL}/chart/${code}?period=${period}&count=${count}`);
  if (!response.ok) throw new Error('Failed to fetch chart data');
  return response.json();
}

// === Market / Indicators ===

export interface MarketStats {
  count: number;
  up: number;
  down: number;
  flat: number;
  total_value: number;
  avg_chg_pct: number;
  top_gainers: { code: string; name: string; chg_pct: number; price: number }[];
  top_losers: { code: string; name: string; chg_pct: number; price: number }[];
}

export interface MarketSummary {
  loaded: boolean;
  asof?: string;
  kospi?: MarketStats;
  kosdaq?: MarketStats;
  total?: MarketStats;
}

export interface MarketIndex {
  code: string;
  name: string;
  price: string;
  change: string;
  change_direction: string;
  chg_pct: string;
  status: string;
  traded_at: string;
  chart_image: string;
}

export async function getMarketSummary(): Promise<MarketSummary> {
  const response = await fetch(`${API_BASE_URL}/market-summary`);
  if (!response.ok) throw new Error('Failed to fetch market summary');
  return response.json();
}

export async function getMarketIndex(code: string): Promise<MarketIndex> {
  const response = await fetch(`${API_BASE_URL}/market-index/${code}`);
  if (!response.ok) throw new Error('Failed to fetch market index');
  return response.json();
}

// === News ===

export interface NewsItem {
  title: string;
  summary: string;
  source: string;
  thumbnail: string;
  datetime: string;
  link: string;
}

export interface NewsResponse {
  items: NewsItem[];
  page: number;
  page_size: number;
}

export async function getNews(page = 1, pageSize = 20): Promise<NewsResponse> {
  const response = await fetch(`${API_BASE_URL}/news?page=${page}&page_size=${pageSize}`);
  if (!response.ok) throw new Error('Failed to fetch news');
  return response.json();
}

export async function getStockNews(code: string, page = 1): Promise<NewsResponse> {
  const response = await fetch(`${API_BASE_URL}/news/stock/${code}?page=${page}`);
  if (!response.ok) throw new Error('Failed to fetch stock news');
  return response.json();
}

// === Finance / Earnings ===

export interface FinancePeriod {
  title: string;
  is_consensus: boolean;
}

export interface FinanceMetric {
  title: string;
  values: Record<string, string>;
}

export interface FinanceData {
  code: string;
  period_type: string;
  periods: FinancePeriod[];
  period_keys: string[];
  metrics: FinanceMetric[];
  summary: string[];
}

export interface FinanceDetail {
  code: string;
  name: string;
  last_close: string;
  open: string;
  high: string;
  low: string;
  volume: string;
  value: string;
  market_cap: string;
  foreign_rate: string;
  high_52w: string;
  low_52w: string;
  per: string;
  eps: string;
  pbr: string;
  bps: string;
  dividend: string;
  dividend_yield: string;
}

export async function getFinance(code: string, period: 'annual' | 'quarter' = 'annual'): Promise<FinanceData> {
  const response = await fetch(`${API_BASE_URL}/finance/${code}?period=${period}`);
  if (!response.ok) throw new Error('Failed to fetch finance data');
  return response.json();
}

export async function getFinanceDetail(code: string): Promise<FinanceDetail> {
  const response = await fetch(`${API_BASE_URL}/finance/${code}/detail`);
  if (!response.ok) throw new Error('Failed to fetch finance detail');
  return response.json();
}

// === Kelly Risk Analysis ===

export async function getKellyAnalysis(
  code: string,
  account_size: number,
  risk_pct: number,
  cap_pct: number,
  lookback = 60,
): Promise<KellyAnalysis> {
  const params = new URLSearchParams({
    account_size: account_size.toString(),
    risk_pct: risk_pct.toString(),
    cap_pct: cap_pct.toString(),
    lookback: lookback.toString(),
  });
  const response = await fetch(`${API_BASE_URL}/risk/kelly/${code}?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch kelly analysis');
  return response.json();
}
