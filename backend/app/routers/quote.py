from fastapi import APIRouter, HTTPException

from app.models.schemas import Quote
from app.services.memory_store import memory_store

router = APIRouter()


@router.get("/quote/{code}", response_model=Quote)
async def get_quote(code: str):
    """
    개별 종목 시세 조회

    - **code**: 종목코드 (예: 005930)
    """
    latest_quote = await memory_store.get_latest_quote(code)

    if not latest_quote:
        raise HTTPException(status_code=404, detail=f"Quote not found for code: {code}")

    return Quote(
        code=latest_quote.code,
        name=latest_quote.name,
        market=latest_quote.market,
        price=latest_quote.price,
        chg_pct=latest_quote.chg_pct,
        volume=latest_quote.volume,
        value=latest_quote.value,
        asof=latest_quote.asof
    )
