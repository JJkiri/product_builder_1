'use client';

import { Top10Item, formatNumber, formatValue, formatPercent } from '@/lib/api';

interface Top10TableProps {
  items: Top10Item[];
  asof?: string;
  showRisk?: boolean;
  loading?: boolean;
}

export default function Top10Table({ items, asof, showRisk = false, loading = false }: Top10TableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500">조건에 맞는 종목이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
        <h3 className="text-lg font-semibold">Top 10 종목</h3>
        {asof && (
          <span className="text-sm text-gray-500">
            기준: {new Date(asof).toLocaleString('ko-KR')}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                순위
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                종목
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                현재가
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                등락률
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                거래대금
              </th>
              {showRisk && (
                <>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    손절가
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    최대 주수
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    최대 투자금액
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.code} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    item.rank <= 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.rank}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div>
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.code} · {item.market}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                  {formatNumber(item.price)}원
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-right font-medium ${
                  item.chg_pct > 0 ? 'text-red-600' : item.chg_pct < 0 ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {formatPercent(item.chg_pct)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-600">
                  {formatValue(item.value)}
                </td>
                {showRisk && (
                  <>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-gray-600">
                      {item.stop_price ? `${formatNumber(item.stop_price)}원` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-blue-600">
                      {item.max_shares ? `${formatNumber(item.max_shares)}주` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-green-600">
                      {item.max_investment ? `${formatNumber(item.max_investment)}원` : '-'}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
