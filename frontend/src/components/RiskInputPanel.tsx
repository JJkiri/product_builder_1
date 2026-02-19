'use client';

import { Top10Params } from '@/lib/api';

interface RiskInputPanelProps {
  params: Top10Params;
  onChange: (params: Top10Params) => void;
}

function getRiskLevel(riskPct: number) {
  if (riskPct <= 0.005) return { label: '안전', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' };
  if (riskPct <= 0.02)  return { label: '보통', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' };
  return { label: '위험', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
}

export default function RiskInputPanel({ params, onChange }: RiskInputPanelProps) {
  const handleChange = (key: keyof Top10Params, value: number | undefined) => {
    onChange({ ...params, [key]: value });
  };

  const riskPct = params.risk_pct ?? 0.01;
  const riskLevel = getRiskLevel(riskPct);

  const hasAccount = params.account_size !== undefined && params.account_size > 0;
  const maxLoss = hasAccount && params.risk_pct
    ? Math.round(params.account_size! * params.risk_pct)
    : null;
  const maxInvest = hasAccount && params.cap_pct
    ? Math.round(params.account_size! * params.cap_pct)
    : null;

  const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold">리스크 설정</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${riskLevel.bg} ${riskLevel.text} ${riskLevel.border}`}>
          {riskLevel.label}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        켈리 기준으로 종목당 최대 투자금액을 계산합니다.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Account Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            계좌금액
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={params.account_size !== undefined ? params.account_size / 10000 : ''}
              onChange={(e) =>
                handleChange('account_size', e.target.value ? Number(e.target.value) * 10000 : undefined)
              }
              placeholder="예: 1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">만원</span>
          </div>
          {hasAccount && (
            <p className="text-xs text-gray-400 mt-1">= {fmt(params.account_size!)}원</p>
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
            onChange={(e) =>
              handleChange('risk_pct', e.target.value ? Number(e.target.value) / 100 : undefined)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            허용 손실: {maxLoss !== null ? `${fmt(maxLoss)}원` : '-'}
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
            onChange={(e) =>
              handleChange('cap_pct', e.target.value ? Number(e.target.value) / 100 : undefined)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            최대 투자: {maxInvest !== null ? `${fmt(maxInvest)}원` : '-'}
          </p>
        </div>
      </div>

      {/* 리스크 요약 카드 */}
      {hasAccount && maxLoss !== null && maxInvest !== null && (
        <div className={`mt-4 p-3 rounded-lg border ${riskLevel.bg} ${riskLevel.border}`}>
          <p className={`text-xs font-medium mb-2 ${riskLevel.text}`}>리스크 요약</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">계좌금액</p>
              <p className="font-medium">{fmt(params.account_size!)}원</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">1회 허용 손실</p>
              <p className={`font-medium ${riskLevel.text}`}>{fmt(maxLoss)}원</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">종목당 최대 투자</p>
              <p className="font-medium">{fmt(maxInvest)}원</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">손절폭</p>
              <p className="font-medium">종목별 자동 계산</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
