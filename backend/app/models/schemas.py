from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


# Market type
MarketType = Literal["KOSPI", "KOSDAQ", "ALL"]


# Symbol models
class Symbol(BaseModel):
    """종목 정보"""
    code: str = Field(..., description="종목코드")
    name: str = Field(..., description="종목명")
    market: Literal["KOSPI", "KOSDAQ"] = Field(..., description="시장 구분")


class SymbolDB(Symbol):
    """Firestore 저장용 종목 모델"""
    is_active: bool = True
    updated_at: datetime = Field(default_factory=datetime.now)


# Quote models
class Quote(BaseModel):
    """시세 정보"""
    code: str = Field(..., description="종목코드")
    name: str = Field(..., description="종목명")
    market: Literal["KOSPI", "KOSDAQ"] = Field(..., description="시장 구분")
    price: int = Field(..., description="현재가")
    chg_pct: float = Field(..., description="등락률 (%)")
    volume: int = Field(..., description="거래량")
    value: int = Field(..., description="거래대금 (원)")
    asof: datetime = Field(..., description="기준 시점")


class QuoteSnapshot(BaseModel):
    """시세 스냅샷 (저장용)"""
    code: str
    asof: datetime
    price: int
    chg_pct: float
    volume: int
    value: int
    high: int
    low: int
    open: int


class LatestQuote(BaseModel):
    """최신 시세 (캐시용)"""
    code: str
    name: str
    market: Literal["KOSPI", "KOSDAQ"]
    asof: datetime
    price: int
    chg_pct: float
    volume: int
    value: int


# Risk calculation models
class RiskParams(BaseModel):
    """리스크 계산 파라미터"""
    account_size: int = Field(..., description="계좌금액 (원)", ge=0)
    risk_pct: float = Field(0.01, description="1회 최대 손실률", ge=0, le=1)
    stop_pct: float = Field(0.03, description="손절폭", ge=0, le=1)
    cap_pct: float = Field(0.10, description="종목당 최대 비중", ge=0, le=1)


class RiskResult(BaseModel):
    """리스크 계산 결과"""
    stop_price: int = Field(..., description="손절가")
    max_shares: int = Field(..., description="최대 주수")
    max_investment: int = Field(..., description="최대 투자금액")
    risk_amount: int = Field(..., description="허용 손실금액")


# Top10 models
class Top10Filter(BaseModel):
    """Top10 필터링 조건"""
    market: MarketType = Field("ALL", description="시장 구분")
    min_value: Optional[float] = Field(None, description="거래대금 하한 (억원)")
    min_chg_pct: Optional[float] = Field(None, description="등락률 하한 (%)")
    max_chg_pct: Optional[float] = Field(None, description="등락률 상한 (%)")
    min_price: Optional[int] = Field(None, description="가격 하한")
    max_price: Optional[int] = Field(None, description="가격 상한")
    sort_by: Literal["value", "weighted"] = Field("value", description="정렬 기준")


class Top10Item(BaseModel):
    """Top10 항목"""
    rank: int
    code: str
    name: str
    market: Literal["KOSPI", "KOSDAQ"]
    price: int
    chg_pct: float
    value: int
    # Risk calculation results (optional)
    stop_price: Optional[int] = None
    max_shares: Optional[int] = None
    max_investment: Optional[int] = None
    risk_amount: Optional[int] = None


class Top10Response(BaseModel):
    """Top10 응답"""
    asof: datetime
    items: list[Top10Item]


class KellyAnalysis(BaseModel):
    """켈리 기준 리스크 분석 결과"""
    code: str
    name: str
    current_price: int
    lookback_days: int
    # 역사적 통계
    win_rate: float = Field(..., description="승률 (0~1)")
    avg_gain_pct: float = Field(..., description="상승일 평균 수익률 (%)")
    avg_loss_pct: float = Field(..., description="하락일 평균 손실률 (%, 절댓값)")
    # 켈리 비율
    kelly_fraction: float = Field(..., description="켈리 비율 (0~1)")
    half_kelly_fraction: float = Field(..., description="하프켈리 비율 (0~1)")
    # ATR 기반 손절
    atr_pct: float = Field(..., description="ATR% (변동성 지표)")
    stop_pct: float = Field(..., description="권장 손절폭 (ATR×2)")
    stop_price: int = Field(..., description="권장 손절가 (원)")
    # 포지션 계산
    risk_amount: int = Field(..., description="허용 손실금액 (원)")
    kelly_investment: int = Field(..., description="켈리 기준 투자금액 (원)")
    risk_investment: int = Field(..., description="리스크 기준 투자금액 (원)")
    cap_investment: int = Field(..., description="비중상한 기준 투자금액 (원)")
    recommended_shares: int = Field(..., description="권장 주수")
    recommended_investment: int = Field(..., description="권장 투자금액 (원)")
