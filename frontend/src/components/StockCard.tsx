'use client';

import { Quote, formatNumber, formatValue, formatPercent } from '@/lib/api';

interface StockCardProps {
  quote: Quote;
  onClose?: () => void;
}

export default function StockCard({ quote, onClose }: StockCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">{quote.name}</h3>
          <p className="text-sm text-gray-500">
            {quote.code} · {quote.market}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">현재가</p>
          <p className="text-2xl font-bold">{formatNumber(quote.price)}원</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">등락률</p>
          <p className={`text-2xl font-bold ${
            quote.chg_pct > 0 ? 'text-red-600' : quote.chg_pct < 0 ? 'text-blue-600' : 'text-gray-600'
          }`}>
            {formatPercent(quote.chg_pct)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">거래량</p>
          <p className="text-lg font-medium">{formatNumber(quote.volume)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">거래대금</p>
          <p className="text-lg font-medium">{formatValue(quote.value)}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t text-sm text-gray-500">
        기준: {new Date(quote.asof).toLocaleString('ko-KR')}
      </div>
    </div>
  );
}
