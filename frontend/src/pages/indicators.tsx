import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  getMarketSummary,
  getMarketIndex,
  MarketSummary,
  MarketIndex,
  formatValue,
  formatPercent,
  formatNumber,
} from '@/lib/api';

function IndexCard({ index, label }: { index: MarketIndex | null; label: string }) {
  if (!index) {
    return (
      <div className="bg-white rounded-lg shadow-md p-5 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-20 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>
    );
  }

  const isUp = index.change_direction === 'RISING';
  const isDown = index.change_direction === 'FALLING';
  const color = isUp ? 'text-red-600' : isDown ? 'text-blue-600' : 'text-gray-600';
  const bg = isUp ? 'bg-red-50' : isDown ? 'bg-blue-50' : 'bg-gray-50';
  const arrow = isUp ? '▲' : isDown ? '▼' : '';

  return (
    <div className={`rounded-lg shadow-md p-5 ${bg}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className="text-xs text-gray-400">
          {index.status === 'OPEN' ? '거래중' : '장마감'}
        </span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{index.price}</div>
      <div className={`text-sm ${color} mt-1`}>
        {arrow} {index.change} ({isDown ? '-' : '+'}{index.chg_pct}%)
      </div>
      {index.chart_image && (
        <img
          src={index.chart_image}
          alt={`${label} chart`}
          className="mt-3 w-full h-12 object-contain opacity-60"
        />
      )}
    </div>
  );
}

function MarketStatsCard({
  title,
  stats,
}: {
  title: string;
  stats?: MarketSummary['kospi'];
}) {
  if (!stats) return null;

  const upPct = stats.count > 0 ? ((stats.up / stats.count) * 100).toFixed(1) : '0';
  const downPct = stats.count > 0 ? ((stats.down / stats.count) * 100).toFixed(1) : '0';

  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h3 className="text-sm font-semibold text-gray-500 mb-3">{title}</h3>

      {/* Advance / Decline bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span className="text-red-600">상승 {stats.up}종목 ({upPct}%)</span>
          <span>보합 {stats.flat}</span>
          <span className="text-blue-600">하락 {stats.down}종목 ({downPct}%)</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
          <div
            className="bg-red-400"
            style={{ width: `${upPct}%` }}
          />
          <div
            className="bg-gray-300"
            style={{ width: `${stats.count > 0 ? ((stats.flat / stats.count) * 100) : 0}%` }}
          />
          <div
            className="bg-blue-400"
            style={{ width: `${downPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500">종목 수</span>
          <span className="float-right font-medium">{formatNumber(stats.count)}</span>
        </div>
        <div>
          <span className="text-gray-500">총 거래대금</span>
          <span className="float-right font-medium">{formatValue(stats.total_value)}</span>
        </div>
        <div>
          <span className="text-gray-500">평균 등락률</span>
          <span className={`float-right font-medium ${stats.avg_chg_pct >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
            {formatPercent(stats.avg_chg_pct)}
          </span>
        </div>
      </div>
    </div>
  );
}

function MoverList({
  title,
  items,
  type,
}: {
  title: string;
  items: { code: string; name: string; chg_pct: number; price: number }[];
  type: 'gainer' | 'loser';
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h3 className="text-sm font-semibold text-gray-500 mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <Link
            key={item.code}
            href={`/chart?code=${item.code}`}
            className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-4">{i + 1}</span>
              <span className="text-sm font-medium text-gray-900">{item.name}</span>
              <span className="text-xs text-gray-400">{item.code}</span>
            </div>
            <span
              className={`text-sm font-medium ${
                type === 'gainer' ? 'text-red-600' : 'text-blue-600'
              }`}
            >
              {formatPercent(item.chg_pct)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function IndicatorsPage() {
  const [kospi, setKospi] = useState<MarketIndex | null>(null);
  const [kosdaq, setKosdaq] = useState<MarketIndex | null>(null);
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMarketIndex('KOSPI').catch(() => null),
      getMarketIndex('KOSDAQ').catch(() => null),
      getMarketSummary().catch(() => null),
    ]).then(([k, kd, s]) => {
      setKospi(k);
      setKosdaq(kd);
      setSummary(s);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <Head>
        <title>시장 지표 - KR Stock Lab</title>
        <meta name="description" content="KOSPI/KOSDAQ 지수, 시장 통계, 등락 종목" />
      </Head>

      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">시장 지표</h1>

        {/* Index Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IndexCard index={kospi} label="코스피 (KOSPI)" />
          <IndexCard index={kosdaq} label="코스닥 (KOSDAQ)" />
        </div>

        {/* Market Stats */}
        {summary?.loaded && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MarketStatsCard title="코스피 시장 현황" stats={summary.kospi} />
              <MarketStatsCard title="코스닥 시장 현황" stats={summary.kosdaq} />
            </div>

            {/* Top Movers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MoverList
                title="🔥 상승률 Top 5"
                items={summary.total?.top_gainers || []}
                type="gainer"
              />
              <MoverList
                title="📉 하락률 Top 5"
                items={summary.total?.top_losers || []}
                type="loser"
              />
            </div>
          </>
        )}

        {!loading && !summary?.loaded && (
          <div className="text-center py-10 text-gray-500">
            시장 데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.
          </div>
        )}
      </div>
    </>
  );
}
