"""
켈리 기준 리스크 계산 서비스

켈리 공식: f* = (p × avg_gain - q × avg_loss) / avg_gain
실용적 적용을 위해 Half Kelly (f* × 0.5) 사용
"""


def calculate_atr_pct(candles: list[dict], period: int = 14) -> float:
    """
    ATR(Average True Range)을 현재가 대비 비율(%)로 반환.
    손절폭 = ATR × 2 (1% ~ 15% 클램핑)
    """
    if len(candles) < period + 1:
        return 0.03  # 데이터 부족 시 기본값 3%

    true_ranges = []
    for i in range(1, len(candles)):
        high = candles[i]["high"]
        low = candles[i]["low"]
        prev_close = candles[i - 1]["close"]
        tr = max(
            high - low,
            abs(high - prev_close),
            abs(low - prev_close),
        )
        true_ranges.append(tr)

    atr = sum(true_ranges[-period:]) / period
    current_price = candles[-1]["close"]

    if current_price <= 0:
        return 0.03

    atr_pct = atr / current_price
    # 손절폭 = ATR × 2, 최소 1% ~ 최대 15%
    stop_pct = max(0.01, min(atr_pct * 2, 0.15))
    return stop_pct


def calculate_kelly_stats(candles: list[dict], lookback: int = 60) -> dict | None:
    """
    OHLCV 캔들 데이터에서 켈리 파라미터 계산.

    Args:
        candles: 날짜 오름차순 정렬된 OHLCV 딕셔너리 리스트
                 키: date, open, high, low, close, volume
        lookback: 분석 기간 (거래일 기준)

    Returns:
        win_rate, avg_gain_pct, avg_loss_pct, kelly_fraction,
        half_kelly_fraction, atr_pct, stop_pct, lookback_days
        또는 데이터 부족 시 None
    """
    if len(candles) < 5:
        return None

    recent = candles[-lookback:]

    # 종가 기준 일간 수익률
    returns = []
    for i in range(1, len(recent)):
        prev = recent[i - 1]["close"]
        curr = recent[i]["close"]
        if prev > 0:
            returns.append((curr - prev) / prev)

    if len(returns) < 5:
        return None

    up_returns = [r for r in returns if r > 0]
    down_returns = [r for r in returns if r < 0]

    win_rate = len(up_returns) / len(returns)
    avg_gain = sum(up_returns) / len(up_returns) if up_returns else 0.01
    avg_loss = abs(sum(down_returns) / len(down_returns)) if down_returns else 0.01

    # 켈리 공식: f* = (p × avg_gain - q × avg_loss) / avg_gain
    loss_rate = 1 - win_rate
    if avg_gain > 0:
        kelly_f = (win_rate * avg_gain - loss_rate * avg_loss) / avg_gain
    else:
        kelly_f = 0.0

    kelly_f = max(0.0, min(kelly_f, 1.0))
    half_kelly = kelly_f * 0.5

    # ATR 기반 손절폭
    stop_pct = calculate_atr_pct(candles)
    atr_pct = stop_pct / 2  # stop_pct = ATR × 2이므로 ATR% = stop_pct / 2

    return {
        "win_rate": round(win_rate, 4),
        "avg_gain_pct": round(avg_gain * 100, 2),
        "avg_loss_pct": round(avg_loss * 100, 2),
        "kelly_fraction": round(kelly_f, 4),
        "half_kelly_fraction": round(half_kelly, 4),
        "atr_pct": round(atr_pct * 100, 2),
        "stop_pct": round(stop_pct, 4),
        "lookback_days": len(returns),
    }


def calculate_kelly_position(
    current_price: int,
    kelly_stats: dict,
    account_size: int,
    risk_pct: float,
    cap_pct: float,
) -> dict:
    """
    켈리 + 리스크 + 비중 제한 세 가지 기준 중 가장 보수적인 값으로 권장 투자금액 결정.

    Returns:
        stop_price, risk_amount, kelly_investment, risk_investment,
        cap_investment, recommended_shares, recommended_investment
    """
    stop_pct = kelly_stats["stop_pct"]
    half_kelly = kelly_stats["half_kelly_fraction"]

    # 손절가
    stop_price = int(current_price * (1 - stop_pct))
    loss_per_share = current_price - stop_price

    # 1) 리스크 기준: 허용 손실 내에서 최대 주수
    risk_amount = int(account_size * risk_pct)
    if loss_per_share > 0:
        risk_shares = risk_amount // loss_per_share
    else:
        risk_shares = 0
    risk_investment = risk_shares * current_price

    # 2) 켈리 기준 (Half Kelly)
    kelly_investment = int(account_size * half_kelly)
    kelly_shares = kelly_investment // current_price if current_price > 0 else 0

    # 3) 비중 상한 기준
    cap_investment = int(account_size * cap_pct)
    cap_shares = cap_investment // current_price if current_price > 0 else 0

    # 최종: 세 기준 중 가장 보수적인 값
    recommended_shares = min(risk_shares, kelly_shares, cap_shares)
    recommended_investment = recommended_shares * current_price

    return {
        "stop_price": stop_price,
        "risk_amount": risk_amount,
        "kelly_investment": kelly_investment,
        "risk_investment": risk_investment,
        "cap_investment": cap_investment,
        "recommended_shares": recommended_shares,
        "recommended_investment": recommended_investment,
    }
