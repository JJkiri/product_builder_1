import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '한국 주식 스크리너',
  description: '코스피/코스닥 Top10 종목 스크리닝 및 켈리 기반 투자금액 계산',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen">
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold text-gray-900">
                한국 주식 스크리너
              </h1>
              <p className="text-sm text-gray-500">
                코스피/코스닥 실시간 Top10 종목
              </p>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </main>
          <footer className="bg-white border-t mt-8">
            <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
              데이터 출처: KRX 정보데이터시스템 · 5분 간격 갱신
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
