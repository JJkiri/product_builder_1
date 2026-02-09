from typing import Optional
from fastapi import APIRouter, Query

from app.models.schemas import Symbol
from app.services.firestore import firestore_service

router = APIRouter()


@router.get("/symbols", response_model=list[Symbol])
async def get_symbols(
    query: Optional[str] = Query(None, description="종목명 또는 종목코드 검색어"),
    market: Optional[str] = Query(None, description="시장 구분 (KOSPI, KOSDAQ, ALL)")
):
    """
    종목 목록 조회

    - **query**: 종목명 또는 종목코드로 검색 (선택)
    - **market**: 시장 구분 필터 (KOSPI, KOSDAQ, ALL)
    """
    symbols = await firestore_service.get_symbols(
        query=query,
        market=market
    )
    return symbols
