import httpx
from fastapi import APIRouter, Query

router = APIRouter()

NAVER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}


@router.get("/chart/{code}")
async def get_chart_data(
    code: str,
    period: str = Query("day", pattern="^(day|week|month)$"),
    count: int = Query(120, ge=10, le=500),
):
    """종목 OHLCV 차트 데이터 (네이버 금융)"""
    period_map = {
        "day": "dayCandle",
        "week": "weekCandle",
        "month": "monthCandle",
    }
    period_type = period_map[period]

    url = (
        f"https://api.stock.naver.com/chart/domestic/item/{code}"
        f"?periodType={period_type}&page=1&pageSize={count}"
    )

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=NAVER_HEADERS)
        resp.raise_for_status()
        data = resp.json()

    price_infos = data.get("priceInfos", [])

    candles = []
    for item in price_infos:
        candles.append({
            "date": item["localDate"],  # "20260219"
            "open": item["openPrice"],
            "high": item["highPrice"],
            "low": item["lowPrice"],
            "close": item["closePrice"],
            "volume": item.get("accumulatedTradingVolume", 0),
        })

    # Sort by date ascending
    candles.sort(key=lambda x: x["date"])

    return {
        "code": code,
        "period": period,
        "candles": candles,
    }
