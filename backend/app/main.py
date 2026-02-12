import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import symbols, quote, top10
from app.collector.krx_fetcher import krx_fetcher
from app.services.memory_store import memory_store
from app.models.schemas import LatestQuote

settings = get_settings()


async def refresh_data():
    """Fetch fresh data from KRX and update memory store."""
    try:
        symbols_list, latest_quotes, _ = await krx_fetcher.fetch_all_markets()
        if symbols_list:
            quotes = [
                LatestQuote(
                    code=q.code, name=q.name, market=q.market,
                    asof=q.asof, price=q.price, chg_pct=q.chg_pct,
                    volume=q.volume, value=q.value,
                )
                for q in latest_quotes
            ]
            await memory_store.update(symbols_list, quotes)
            print(f"[refresh] Loaded {len(symbols_list)} symbols")
    except Exception as e:
        print(f"[refresh] Error: {e}")


async def periodic_refresh():
    """Background task: refresh every 5 minutes."""
    while True:
        await refresh_data()
        await asyncio.sleep(5 * 60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load initial data and start background refresh
    task = asyncio.create_task(periodic_refresh())
    yield
    # Shutdown
    task.cancel()


app = FastAPI(
    title=settings.app_name,
    description="한국 주식 스크리닝 API (코스피/코스닥)",
    version="1.0.0",
    lifespan=lifespan,
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
        "status": "running",
        "data_loaded": memory_store.is_loaded,
        "last_updated": memory_store.last_updated.isoformat() if memory_store.last_updated else None,
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "data_loaded": memory_store.is_loaded}


@app.post("/collect")
async def trigger_collection():
    """수동 데이터 수집 트리거"""
    await refresh_data()
    return {
        "status": "success",
        "data_loaded": memory_store.is_loaded,
        "last_updated": memory_store.last_updated.isoformat() if memory_store.last_updated else None,
    }
