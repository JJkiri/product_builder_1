import httpx
from fastapi import APIRouter, Query, HTTPException

from app.models.schemas import KellyAnalysis
from app.services.kelly import calculate_kelly_stats, calculate_kelly_position
from app.services.memory_store import memory_store

router = APIRouter()

NAVER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}


@router.get("/risk/kelly/{code}", response_model=KellyAnalysis)
async def get_kelly_analysis(
    code: str,
    account_size: int = Query(..., gt=0, description="계좌금액 (원)"),
    risk_pct: float = Query(0.01, ge=0.001, le=1, description="1회 최대 손실률"),
    cap_pct: float = Query(0.10, ge=0.01, le=1, description="종목당 최대 비중"),
    lookback: int = Query(60, ge=20, le=250, description="분석 기간 (거래일)"),
):
    """
    과거 OHLCV 데이터 기반 켈리 기준 리스크 분석.
    - 승률·평균수익·평균손실 → 켈리 비율 계산
    - ATR(14일) × 2 → 손절폭 자동 계산
    - Half Kelly + 리스크 + 비중상한 중 가장 보수적인 값으로 권장 투자금액 결정
    """
    # 1. 종목 이름·현재가 조회 (메모리 캐시)
    quote = await memory_store.get_latest_quote(code)
    if quote is None:
        raise HTTPException(status_code=404, detail=f"종목 {code}을 찾을 수 없습니다.")

    # 2. 차트 데이터 조회 (분석 기간 + 여유분 20일)
    count = lookback + 20
    url = (
        f"https://api.stock.naver.com/chart/domestic/item/{code}"
        f"?periodType=dayCandle&page=1&pageSize={count}"
    )
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=NAVER_HEADERS)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="차트 데이터를 가져오는데 실패했습니다.")
        data = resp.json()

    price_infos = data.get("priceInfos", [])
    if not price_infos:
        raise HTTPException(status_code=404, detail="차트 데이터가 없습니다.")

    candles = [
        {
            "date": item["localDate"],
            "open": item["openPrice"],
            "high": item["highPrice"],
            "low": item["lowPrice"],
            "close": item["closePrice"],
            "volume": item.get("accumulatedTradingVolume", 0),
        }
        for item in price_infos
    ]
    candles.sort(key=lambda x: x["date"])

    # 3. 켈리 통계 계산
    stats = calculate_kelly_stats(candles, lookback)
    if stats is None:
        raise HTTPException(status_code=422, detail="켈리 계산에 충분한 데이터가 없습니다.")

    # 4. 포지션 계산
    current_price = quote.price
    position = calculate_kelly_position(current_price, stats, account_size, risk_pct, cap_pct)

    return KellyAnalysis(
        code=code,
        name=quote.name,
        current_price=current_price,
        lookback_days=stats["lookback_days"],
        win_rate=stats["win_rate"],
        avg_gain_pct=stats["avg_gain_pct"],
        avg_loss_pct=stats["avg_loss_pct"],
        kelly_fraction=stats["kelly_fraction"],
        half_kelly_fraction=stats["half_kelly_fraction"],
        atr_pct=stats["atr_pct"],
        stop_pct=stats["stop_pct"],
        stop_price=position["stop_price"],
        risk_amount=position["risk_amount"],
        kelly_investment=position["kelly_investment"],
        risk_investment=position["risk_investment"],
        cap_investment=position["cap_investment"],
        recommended_shares=position["recommended_shares"],
        recommended_investment=position["recommended_investment"],
    )
