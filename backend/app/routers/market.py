import httpx
from fastapi import APIRouter

from app.services.memory_store import memory_store

router = APIRouter()

NAVER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}


@router.get("/market-summary")
async def get_market_summary():
    """시장 요약 통계 (등락 비율, 거래대금 합계 등)"""
    quotes = await memory_store.get_all_latest_quotes()

    if not quotes:
        return {"loaded": False}

    kospi = [q for q in quotes if q.market == "KOSPI"]
    kosdaq = [q for q in quotes if q.market == "KOSDAQ"]

    def calc_stats(items):
        up = sum(1 for q in items if q.chg_pct > 0)
        down = sum(1 for q in items if q.chg_pct < 0)
        flat = sum(1 for q in items if q.chg_pct == 0)
        total_value = sum(q.value for q in items)
        avg_chg = sum(q.chg_pct for q in items) / len(items) if items else 0
        top_gainers = sorted(items, key=lambda q: q.chg_pct, reverse=True)[:5]
        top_losers = sorted(items, key=lambda q: q.chg_pct)[:5]
        return {
            "count": len(items),
            "up": up,
            "down": down,
            "flat": flat,
            "total_value": total_value,
            "avg_chg_pct": round(avg_chg, 2),
            "top_gainers": [
                {"code": q.code, "name": q.name, "chg_pct": q.chg_pct, "price": q.price}
                for q in top_gainers
            ],
            "top_losers": [
                {"code": q.code, "name": q.name, "chg_pct": q.chg_pct, "price": q.price}
                for q in top_losers
            ],
        }

    return {
        "loaded": True,
        "asof": memory_store.last_updated.isoformat() if memory_store.last_updated else None,
        "kospi": calc_stats(kospi),
        "kosdaq": calc_stats(kosdaq),
        "total": calc_stats(quotes),
    }


@router.get("/market-index/{index_code}")
async def get_market_index(index_code: str):
    """시장 지수 조회 (KOSPI, KOSDAQ)"""
    url = f"https://m.stock.naver.com/api/index/{index_code}/basic"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=NAVER_HEADERS)
        resp.raise_for_status()
        data = resp.json()

    return {
        "code": data.get("itemCode"),
        "name": data.get("stockName"),
        "price": data.get("closePrice"),
        "change": data.get("compareToPreviousClosePrice"),
        "change_direction": data.get("compareToPreviousPrice", {}).get("name"),
        "chg_pct": data.get("fluctuationsRatio"),
        "status": data.get("marketStatus"),
        "traded_at": data.get("localTradedAt"),
        "chart_image": data.get("imageCharts", {}).get("transparent"),
    }
