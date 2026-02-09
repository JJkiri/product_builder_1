'use client';

import { useState, useEffect, useCallback } from 'react';
import SearchBar from '@/components/SearchBar';
import FilterPanel from '@/components/FilterPanel';
import RiskInputPanel from '@/components/RiskInputPanel';
import Top10Table from '@/components/Top10Table';
import StockCard from '@/components/StockCard';
import { getTop10, getQuote, Top10Params, Top10Item, Quote, Symbol } from '@/lib/api';

export default function Home() {
  const [filters, setFilters] = useState<Top10Params>({
    market: 'ALL',
    sort_by: 'value',
    risk_pct: 0.01,
    stop_pct: 0.03,
    cap_pct: 0.10,
  });

  const [top10, setTop10] = useState<Top10Item[]>([]);
  const [asof, setAsof] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTop10 = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTop10(filters);
      setTop10(response.items);
      setAsof(response.asof);
    } catch (err) {
      console.error('Failed to fetch top 10:', err);
      setError('데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
      setTop10([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTop10();
  }, [fetchTop10]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchTop10, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTop10]);

  const handleSymbolSelect = async (symbol: Symbol) => {
    try {
      const quote = await getQuote(symbol.code);
      setSelectedQuote(quote);
    } catch (err) {
      console.error('Failed to fetch quote:', err);
    }
  };

  const showRisk = filters.account_size !== undefined && filters.account_size > 0;

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <SearchBar onSelect={handleSymbolSelect} />
        <button
          onClick={fetchTop10}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg
            className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          새로고침
        </button>
      </div>

      {/* Selected Stock Card */}
      {selectedQuote && (
        <StockCard quote={selectedQuote} onClose={() => setSelectedQuote(null)} />
      )}

      {/* Filters */}
      <FilterPanel filters={filters} onChange={setFilters} />

      {/* Risk Settings */}
      <RiskInputPanel params={filters} onChange={setFilters} />

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Top 10 Table */}
      <Top10Table
        items={top10}
        asof={asof}
        showRisk={showRisk}
        loading={loading}
      />
    </div>
  );
}
