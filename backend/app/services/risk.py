from app.models.schemas import RiskParams, RiskResult


def calculate_position_size(
    price: int,
    account_size: int,
    risk_pct: float = 0.01,
    stop_pct: float = 0.03,
    cap_pct: float = 0.10
) -> RiskResult:
    """
    켈리/리스크 기반 최대 투자금액 계산

    Args:
        price: 현재 주가 (원)
        account_size: 계좌금액 (원)
        risk_pct: 1회 최대 손실률 (예: 0.01 = 1%)
        stop_pct: 손절폭 (예: 0.03 = 3%)
        cap_pct: 종목당 최대 비중 (예: 0.10 = 10%)

    Returns:
        RiskResult with stop_price, max_shares, max_investment, risk_amount
    """
    # 1. 허용 손실금액
    risk_amount = int(account_size * risk_pct)

    # 2. 손절가
    stop_price = int(price * (1 - stop_pct))

    # 3. 1주당 손실
    loss_per_share = price - stop_price

    # 4. 최대 주수 (손실 기준)
    if loss_per_share > 0:
        max_shares_by_risk = int(risk_amount / loss_per_share)
    else:
        max_shares_by_risk = 0

    # 5. 켈리 상한 적용
    max_investment_by_cap = account_size * cap_pct
    if price > 0:
        max_shares_by_cap = int(max_investment_by_cap / price)
    else:
        max_shares_by_cap = 0

    # 6. 최종 (둘 중 작은 값)
    max_shares = min(max_shares_by_risk, max_shares_by_cap)
    max_investment = max_shares * price

    return RiskResult(
        stop_price=stop_price,
        max_shares=max_shares,
        max_investment=max_investment,
        risk_amount=risk_amount
    )


def calculate_position_size_from_params(
    price: int,
    params: RiskParams
) -> RiskResult:
    """Calculate position size using RiskParams model."""
    return calculate_position_size(
        price=price,
        account_size=params.account_size,
        risk_pct=params.risk_pct,
        stop_pct=params.stop_pct,
        cap_pct=params.cap_pct
    )
