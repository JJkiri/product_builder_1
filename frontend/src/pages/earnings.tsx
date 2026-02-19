import { useState } from 'react';
import Head from 'next/head';
import SearchBar from '@/components/SearchBar';
import {
  getFinance,
  getFinanceDetail,
  FinanceData,
  FinanceDetail,
  Symbol,
} from '@/lib/api';

function DetailCard({ detail }: { detail: FinanceDetail }) {
  const rows = [
    { label: '시가총액', value: detail.market_cap },
    { label: 'PER', value: detail.per },
    { label: 'PBR', value: detail.pbr },
    { label: 'EPS', value: detail.eps },
    { label: 'BPS', value: detail.bps },
    { label: '외인소진율', value: detail.foreign_rate },
    { label: '52주 최고', value: detail.high_52w },
    { label: '52주 최저', value: detail.low_52w },
    { label: '배당금', value: detail.dividend },
    { label: '배당수익률', value: detail.dividend_yield },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{detail.name} 투자 지표</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">{r.label}</div>
            <div className="text-sm font-semibold text-gray-900">{r.value || '-'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceTable({
  data,
  period,
  onPeriodChange,
}: {
  data: FinanceData;
  period: 'annual' | 'quarter';
  onPeriodChange: (p: 'annual' | 'quarter') => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">재무제표</h2>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => onPeriodChange('annual')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              period === 'annual'
                ? 'bg-white shadow text-gray-900 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            연간
          </button>
          <button
            onClick={() => onPeriodChange('quarter')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              period === 'quarter'
                ? 'bg-white shadow text-gray-900 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            분기
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-4 text-gray-500 font-medium sticky left-0 bg-white min-w-[100px]">
                항목
              </th>
              {data.periods.map((p, i) => (
                <th key={data.period_keys[i]} className="text-right py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
                  {p.title}
                  {p.is_consensus && (
                    <span className="ml-1 text-xs text-orange-500">(E)</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.metrics.map((metric) => {
              const isHighlight = ['매출액', '영업이익', '당기순이익', 'ROE', 'PER', 'PBR'].includes(metric.title);
              return (
                <tr
                  key={metric.title}
                  className={`border-b last:border-0 ${isHighlight ? 'bg-blue-50/50' : ''}`}
                >
                  <td className={`py-2 pr-4 sticky left-0 ${isHighlight ? 'font-semibold text-gray-900 bg-blue-50/50' : 'text-gray-600 bg-white'}`}>
                    {metric.title}
                  </td>
                  {data.period_keys.map((key) => (
                    <td key={key} className="text-right py-2 px-3 text-gray-900 whitespace-nowrap">
                      {metric.values[key] || '-'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Unit note */}
      <p className="text-xs text-gray-400 mt-3">단위: 억원 (매출액·이익), %, 배, 원 (EPS·BPS·배당금)</p>
    </div>
  );
}

export default function EarningsPage() {
  const [detail, setDetail] = useState<FinanceDetail | null>(null);
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [period, setPeriod] = useState<'annual' | 'quarter'>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const handleSelect = async (symbol: Symbol) => {
    setLoading(true);
    setError(null);
    setSelectedCode(symbol.code);

    try {
      const [fin, det] = await Promise.all([
        getFinance(symbol.code, period),
        getFinanceDetail(symbol.code),
      ]);
      setFinance(fin);
      setDetail(det);
    } catch {
      setError('재무 데이터를 불러오는데 실패했습니다.');
      setFinance(null);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = async (newPeriod: 'annual' | 'quarter') => {
    setPeriod(newPeriod);
    if (!selectedCode) return;

    setLoading(true);
    try {
      const fin = await getFinance(selectedCode, newPeriod);
      setFinance(fin);
    } catch {
      setError('재무 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>기업 실적 - KR Stock Lab</title>
        <meta name="description" content="기업 재무제표 및 투자 지표 분석" />
      </Head>

      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">기업 실적</h1>

        {/* Search */}
        <SearchBar onSelect={handleSelect} />

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Results */}
        {!loading && detail && <DetailCard detail={detail} />}

        {!loading && finance && finance.metrics.length > 0 && (
          <FinanceTable data={finance} period={period} onPeriodChange={handlePeriodChange} />
        )}

        {/* Company Summary */}
        {!loading && finance && finance.summary.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-3">기업 개요</h2>
            <div className="space-y-2">
              {finance.summary.map((line, i) => (
                <p key={i} className="text-sm text-gray-600 leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !detail && !error && (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-500">종목을 검색하여 재무제표와 투자 지표를 확인하세요</p>
          </div>
        )}
      </div>
    </>
  );
}
