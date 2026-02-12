from typing import Optional, Literal
from fastapi import APIRouter, Query

from app.models.schemas import Top10Response, Top10Filter, RiskParams
from app.services.memory_store import memory_store
from app.services.screener import screen_top10

router = APIRouter()


@router.get("/top10", response_model=Top10Response)
async def get_top10(
    # Filter parameters
    market: Literal["KOSPI", "KOSDAQ", "ALL"] = Query("ALL", description="시장 구분"),
    min_value: Optional[float] = Query(None, description="거래대금 하한 (억원)"),
    min_chg_pct: Optional[float] = Query(None, description="등락률 하한 (%)"),
    max_chg_pct: Optional[float] = Query(None, description="등락률 상한 (%)"),
    min_price: Optional[int] = Query(None, description="가격 하한"),
    max_price: Optional[int] = Query(None, description="가격 상한"),
    sort_by: Literal["value", "weighted"] = Query("value", description="정렬 기준"),
    # Risk parameters
    account_size: Optional[int] = Query(None, description="계좌금액 (원)", ge=0),
    risk_pct: float = Query(0.01, description="1회 최대 손실률", ge=0, le=1),
    stop_pct: float = Query(0.03, description="손절폭", ge=0, le=1),
    cap_pct: float = Query(0.10, description="종목당 최대 비중", ge=0, le=1),
):
    """Top10 종목 스크리닝"""
    quotes = await memory_store.get_all_latest_quotes(
        market=market if market != "ALL" else None
    )

    filter_params = Top10Filter(
        market=market,
        min_value=min_value,
        min_chg_pct=min_chg_pct,
        max_chg_pct=max_chg_pct,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort_by,
    )

    risk_params = None
    if account_size is not None and account_size > 0:
        risk_params = RiskParams(
            account_size=account_size,
            risk_pct=risk_pct,
            stop_pct=stop_pct,
            cap_pct=cap_pct,
        )

    items, asof = await screen_top10(quotes, filter_params, risk_params)
    return Top10Response(asof=asof, items=items)
