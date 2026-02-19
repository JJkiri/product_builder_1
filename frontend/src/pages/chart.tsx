import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/SearchBar';
import StockCard from '@/components/StockCard';
import { getQuote, Quote, Symbol } from '@/lib/api';

const TradingViewChart = dynamic(() => import('@/components/TradingViewChart'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">차트 로딩 중...</p>
      </div>
    </div>
  ),
});

const DEFAULT_CODE = '005930'; // 삼성전자

export default function ChartPage() {
  const router = useRouter();
  const { code } = router.query;
  const stockCode = (typeof code === 'string' ? code : DEFAULT_CODE);

  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (!stockCode) return;
    getQuote(stockCode)
      .then(setQuote)
      .catch(() => setQuote(null));
  }, [stockCode]);

  const handleSymbolSelect = (symbol: Symbol) => {
    router.replace(`/chart?code=${symbol.code}`, undefined, { shallow: true });
  };

  const tradingViewSymbol = `KRX:${stockCode}`;

  return (
    <>
      <Head>
        <title>{quote ? `${quote.name} 차트` : '차트 분석'} - KR Stock Lab</title>
        <meta name="description" content="TradingView 실시간 차트 기술적 분석" />
      </Head>

      <div className="space-y-4">
        {/* Search + Stock info row */}
        <div className="flex flex-col md:flex-row gap-4">
          <SearchBar onSelect={handleSymbolSelect} />
        </div>

        {/* Stock Card */}
        {quote && (
          <StockCard quote={quote} />
        )}

        {/* TradingView Chart */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ height: '600px' }}>
          <TradingViewChart symbol={tradingViewSymbol} />
        </div>
      </div>
    </>
  );
}
