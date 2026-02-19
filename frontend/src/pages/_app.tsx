import type { AppProps } from 'next/app';
import Navigation from '@/components/Navigation';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Component {...pageProps} />
      </main>
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          데이터 출처: KRX 정보데이터시스템 · 5분 간격 갱신 · TradingView 차트
        </div>
      </footer>
    </div>
  );
}
