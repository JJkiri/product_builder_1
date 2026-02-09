'use client';

import { Top10Params } from '@/lib/api';

interface RiskInputPanelProps {
  params: Top10Params;
  onChange: (params: Top10Params) => void;
}

export default function RiskInputPanel({ params, onChange }: RiskInputPanelProps) {
  const handleChange = (key: keyof Top10Params, value: number | undefined) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">리스크 설정</h3>
      <p className="text-sm text-gray-600 mb-4">
        켈리 기준으로 종목당 최대 투자금액을 계산합니다.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Account Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            계좌금액 (원)
          </label>
          <input
            type="number"
            value={params.account_size ?? ''}
            onChange={(e) => handleChange('account_size', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="예: 10000000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {params.account_size && (
            <p className="text-xs text-gray-500 mt-1">
              = {new Intl.NumberFormat('ko-KR').format(params.account_size)}원
            </p>
          )}
        </div>

        {/* Risk % */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            1회 최대 손실률 (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={params.risk_pct !== undefined ? params.risk_pct * 100 : 1}
            onChange={(e) => handleChange('risk_pct', e.target.value ? Number(e.target.value) / 100 : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            허용 손실: {params.account_size && params.risk_pct
              ? new Intl.NumberFormat('ko-KR').format(Math.round(params.account_size * (params.risk_pct ?? 0.01)))
              : '-'}원
          </p>
        </div>

        {/* Stop % */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            손절폭 (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={params.stop_pct !== undefined ? params.stop_pct * 100 : 3}
            onChange={(e) => handleChange('stop_pct', e.target.value ? Number(e.target.value) / 100 : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            매수가 대비 -3% 시 손절
          </p>
        </div>

        {/* Cap % */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            종목당 최대 비중 (%)
          </label>
          <input
            type="number"
            step="1"
            min="0"
            max="100"
            value={params.cap_pct !== undefined ? params.cap_pct * 100 : 10}
            onChange={(e) => handleChange('cap_pct', e.target.value ? Number(e.target.value) / 100 : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            최대 투자: {params.account_size && params.cap_pct
              ? new Intl.NumberFormat('ko-KR').format(Math.round(params.account_size * (params.cap_pct ?? 0.10)))
              : '-'}원
          </p>
        </div>
      </div>
    </div>
  );
}
