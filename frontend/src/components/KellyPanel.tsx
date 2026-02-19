'use client';

import { KellyAnalysis, formatNumber } from '@/lib/api';

interface KellyPanelProps {
  result: KellyAnalysis;
  onClose: () => void;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg p-4 text-center border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function ConstraintRow({
  label,
  investment,
  shares,
  isChosen,
}: {
  label: string;
  investment: number;
  shares: number;
  isChosen: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-2 rounded-lg ${isChosen ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-2">
        {isChosen && (
          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">선택</span>
        )}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className="text-right">
        <span className="text-sm font-medium text-gray-800">{formatNumber(investment)}원</span>
        <span className="text-xs text-gray-400 ml-2">({formatNumber(shares)}주)</span>
      </div>
    </div>
  );
}

export default function KellyPanel({ result, onClose }: KellyPanelProps) {
  const fmt = (n: number) => formatNumber(n);
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  const winDays = Math.round(result.win_rate * result.lookback_days);

  // 어떤 제약이 최종 선택됐는지 판단
  const recInv = result.recommended_investment;
  const isKellyChosen = recInv === result.kelly_investment && recInv !== result.risk_investment && recInv !== result.cap_investment;
  const isRiskChosen = recInv === result.risk_investment;
  const isCapChosen = recInv === result.cap_investment && !isRiskChosen;

  // 켈리 비율 수준
  const kellyLevel =
    result.half_kelly_fraction > 0.15 ? { label: '공격적', color: 'text-red-600' }
    : result.half_kelly_fraction > 0.05 ? { label: '적극적', color: 'text-yellow-600' }
    : { label: '보수적', color: 'text-green-600' };

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {result.name} <span className="text-sm font-normal text-gray-400">({result.code})</span>
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            현재가 {fmt(result.current_price)}원 · 최근 {result.lookback_days}거래일 기준 분석
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-0.5"
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      {/* 역사적 통계 */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          과거 주가 통계
        </p>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="승률"
            value={pct(result.win_rate)}
            sub={`${result.lookback_days}일 중 ${winDays}일 상승`}
          />
          <StatCard
            label="상승일 평균"
            value={`+${result.avg_gain_pct.toFixed(2)}%`}
            sub="주가 오른 날 평균 상승폭"
          />
          <StatCard
            label="하락일 평균"
            value={`-${result.avg_loss_pct.toFixed(2)}%`}
            sub="주가 내린 날 평균 하락폭"
          />
        </div>
      </div>

      {/* 켈리 비율 설명 */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-blue-800">켈리 비율</p>
          <span className={`text-sm font-bold ${kellyLevel.color}`}>{kellyLevel.label}</span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="text-center">
            <p className="text-xs text-gray-500">Full Kelly</p>
            <p className="text-lg font-bold text-gray-700">{pct(result.kelly_fraction)}</p>
          </div>
          <div className="text-gray-400 text-lg">→</div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Half Kelly 적용</p>
            <p className="text-lg font-bold text-blue-700">{pct(result.half_kelly_fraction)}</p>
          </div>
          <div className="text-center ml-auto">
            <p className="text-xs text-gray-500">켈리 기준 투자금</p>
            <p className="text-sm font-bold text-blue-700">{fmt(result.kelly_investment)}원</p>
          </div>
        </div>
        <p className="text-xs text-blue-700">
          켈리 공식은 과거 승률·수익률을 바탕으로 장기적으로 계좌를 가장 빠르게 불릴 수 있는 투자 비중을 계산합니다.
          실제 적용 시 과대평가 위험을 줄이기 위해 절반(Half Kelly)을 사용합니다.
        </p>
      </div>

      {/* 손절가 (ATR 기반) */}
      <div className="bg-orange-50 border border-orange-100 rounded-lg px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-orange-800">ATR 기반 손절가</p>
          <p className="text-xs text-orange-600 mt-0.5">
            변동성(ATR) {result.atr_pct.toFixed(2)}% → 손절폭 -{pct(result.stop_pct)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            이 종목의 평균 하루 변동폭을 고려해 자동으로 계산된 손절 기준입니다.
          </p>
        </div>
        <div className="text-right ml-4">
          <p className="text-xl font-bold text-orange-700">{fmt(result.stop_price)}원</p>
        </div>
      </div>

      {/* 제약 비교 + 최종 권장 */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          투자금액 산출 — 세 기준 중 가장 작은 값 선택
        </p>
        <div className="space-y-2 mb-3">
          <ConstraintRow
            label={`켈리 기준 (Half Kelly ${pct(result.half_kelly_fraction)})`}
            investment={result.kelly_investment}
            shares={Math.floor(result.kelly_investment / result.current_price)}
            isChosen={isKellyChosen}
          />
          <ConstraintRow
            label={`손실률 기준 (허용 손실 ${fmt(result.risk_amount)}원)`}
            investment={result.risk_investment}
            shares={Math.floor(result.risk_investment / result.current_price)}
            isChosen={isRiskChosen}
          />
          <ConstraintRow
            label="비중 상한 기준"
            investment={result.cap_investment}
            shares={Math.floor(result.cap_investment / result.current_price)}
            isChosen={isCapChosen}
          />
        </div>

        {/* 최종 결과 */}
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-green-800">권장 투자금액</p>
            <p className="text-xs text-green-600">세 기준 중 가장 보수적인 값</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-700">{fmt(result.recommended_investment)}원</p>
            <p className="text-sm text-green-600">{fmt(result.recommended_shares)}주</p>
          </div>
        </div>
      </div>
    </div>
  );
}
