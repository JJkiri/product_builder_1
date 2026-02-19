import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

NAVER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}


@router.get("/finance/{code}")
async def get_finance(
    code: str,
    period: str = Query("annual", regex="^(annual|quarter)$"),
):
    """종목 재무제표 조회 (연간/분기)"""
    url = f"https://m.stock.naver.com/api/stock/{code}/finance/{period}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=NAVER_HEADERS)
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Finance data not found: {code}")
        resp.raise_for_status()
        data = resp.json()

    finance_info = data.get("financeInfo", {})
    periods = finance_info.get("trTitleList", [])
    rows = finance_info.get("rowList", [])

    # Sort period keys chronologically
    sorted_keys = [p["key"] for p in sorted(periods, key=lambda x: x["key"])]

    # Build structured response
    period_labels = {
        p["key"]: {"title": p["title"], "is_consensus": p.get("isConsensus") == "Y"}
        for p in periods
    }

    metrics = []
    for row in rows:
        title = row.get("title", "")
        columns = row.get("columns", {})
        values = {}
        for key in sorted_keys:
            col = columns.get(key, {})
            values[key] = col.get("value", "-")
        metrics.append({"title": title, "values": values})

    # Corporation summary
    corp_summary = data.get("corporationSummary", {})
    summary_lines = [
        corp_summary.get("comment1", ""),
        corp_summary.get("comment2", ""),
        corp_summary.get("comment3", ""),
    ]
    summary_lines = [s for s in summary_lines if s]

    return {
        "code": code,
        "period_type": period,
        "periods": [period_labels[k] for k in sorted_keys],
        "period_keys": sorted_keys,
        "metrics": metrics,
        "summary": summary_lines,
    }


@router.get("/finance/{code}/detail")
async def get_finance_detail(code: str):
    """종목 상세 정보 (PER, PBR, 시총, 52주 고저 등)"""
    url = f"https://m.stock.naver.com/api/stock/{code}/integration"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=NAVER_HEADERS)
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Stock not found: {code}")
        resp.raise_for_status()
        data = resp.json()

    total_infos = data.get("totalInfos", [])
    info_map = {}
    for info in total_infos:
        info_map[info["code"]] = info.get("value", "-")

    return {
        "code": data.get("itemCode"),
        "name": data.get("stockName"),
        "last_close": info_map.get("lastClosePrice", "-"),
        "open": info_map.get("openPrice", "-"),
        "high": info_map.get("highPrice", "-"),
        "low": info_map.get("lowPrice", "-"),
        "volume": info_map.get("accumulatedTradingVolume", "-"),
        "value": info_map.get("accumulatedTradingValue", "-"),
        "market_cap": info_map.get("marketValue", "-"),
        "foreign_rate": info_map.get("foreignRate", "-"),
        "high_52w": info_map.get("highPriceOf52Weeks", "-"),
        "low_52w": info_map.get("lowPriceOf52Weeks", "-"),
        "per": info_map.get("per", "-"),
        "eps": info_map.get("eps", "-"),
        "pbr": info_map.get("pbr", "-"),
        "bps": info_map.get("bps", "-"),
        "dividend": info_map.get("dividend", "-"),
        "dividend_yield": info_map.get("dividendYield", "-"),
    }
