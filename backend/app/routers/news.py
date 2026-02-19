import httpx
from fastapi import APIRouter, Query

router = APIRouter()

NAVER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}


@router.get("/news")
async def get_news(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    """증시 뉴스 목록 (네이버 금융)"""
    url = "https://m.stock.naver.com/api/news/list"
    params = {
        "category": "ranknews",
        "page": page,
        "pageSize": page_size,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=NAVER_HEADERS, params=params)
        resp.raise_for_status()
        raw_items = resp.json()

    items = []
    for item in raw_items:
        dt_str = item.get("dt", "")
        # Format: "20260219060000" -> "2026-02-19 06:00"
        formatted_dt = ""
        if len(dt_str) >= 12:
            formatted_dt = f"{dt_str[:4]}-{dt_str[4:6]}-{dt_str[6:8]} {dt_str[8:10]}:{dt_str[10:12]}"

        items.append({
            "title": item.get("tit", ""),
            "summary": item.get("subcontent", ""),
            "source": item.get("ohnm", ""),
            "thumbnail": item.get("thumbUrl", ""),
            "datetime": formatted_dt,
            "link": f"https://n.news.naver.com/mnews/article/{item.get('oid', '')}/{item.get('aid', '')}",
        })

    return {"items": items, "page": page, "page_size": page_size}


@router.get("/news/stock/{code}")
async def get_stock_news(
    code: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=30),
):
    """종목별 뉴스 목록"""
    url = f"https://m.stock.naver.com/api/news/stock/{code}"
    params = {"page": page, "pageSize": page_size}

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=NAVER_HEADERS, params=params)
        resp.raise_for_status()
        data = resp.json()

    items = []
    for item in data if isinstance(data, list) else data.get("list", []):
        dt_str = item.get("dt", "")
        formatted_dt = ""
        if len(dt_str) >= 12:
            formatted_dt = f"{dt_str[:4]}-{dt_str[4:6]}-{dt_str[6:8]} {dt_str[8:10]}:{dt_str[10:12]}"

        items.append({
            "title": item.get("tit", ""),
            "summary": item.get("subcontent", ""),
            "source": item.get("ohnm", ""),
            "thumbnail": item.get("thumbUrl", ""),
            "datetime": formatted_dt,
            "link": f"https://n.news.naver.com/mnews/article/{item.get('oid', '')}/{item.get('aid', '')}",
        })

    return {"items": items, "code": code, "page": page}
