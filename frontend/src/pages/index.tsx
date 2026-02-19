import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Top10Table from '@/components/Top10Table';
import { getTop10, Top10Item } from '@/lib/api';

const features = [
  {
    title: '주식 스크리너',
    description: '거래대금 기준 Top10 종목을 필터링하고 켈리 기준 투자금액을 계산합니다.',
    href: '/screener',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
  },
  {
    title: '차트 분석',
    description: 'TradingView 실시간 차트로 기술적 분석을 수행합니다.',
    href: '/chart',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    title: '시장 지표',
    description: 'KOSPI/KOSDAQ 지수, 환율, 시장 심리 지표를 한눈에 확인합니다.',
    href: '/indicators',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function Home() {
  const router = useRouter();
  const [top5, setTop5] = useState<Top10Item[]>([]);
  const [asof, setAsof] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTop10({ market: 'ALL', sort_by: 'value' })
      .then((res) => {
        setTop5(res.items.slice(0, 5));
        setAsof(res.asof);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Head>
        <title>KR Stock Lab - 한국 주식 분석 플랫폼</title>
        <meta name="description" content="코스피/코스닥 주식 스크리닝, 기술적 분석, 시장 지표를 한곳에서" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="space-y-8">
        {/* Hero */}
        <section className="text-center py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            한국 주식 분석 플랫폼
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            코스피/코스닥 주식 스크리닝, 기술적 분석, 시장 지표를 한곳에서 확인하세요
          </p>
        </section>

        {/* Feature Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="text-blue-600 mb-4 group-hover:text-blue-700">{f.icon}</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h2>
              <p className="text-sm text-gray-500">{f.description}</p>
            </Link>
          ))}
        </section>

        {/* Top 5 Preview */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">거래대금 Top 5</h2>
            <Link href="/screener" className="text-sm text-blue-600 hover:text-blue-800">
              전체 보기 &rarr;
            </Link>
          </div>
          <Top10Table
            items={top5}
            asof={asof}
            loading={loading}
            onStockClick={(code) => router.push(`/chart?code=${code}`)}
          />
        </section>
      </div>
    </>
  );
}
