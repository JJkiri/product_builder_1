from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import symbols, quote, top10
from app.collector.scheduler import collect_market_data

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="한국 주식 스크리닝 API (코스피/코스닥)",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(symbols.router, tags=["Symbols"])
app.include_router(quote.router, tags=["Quote"])
app.include_router(top10.router, tags=["Top10"])


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/collect")
async def trigger_collection():
    """
    데이터 수집 트리거

    Cloud Scheduler에서 호출하거나 수동으로 데이터 수집을 실행합니다.
    """
    result = await collect_market_data()
    return result
