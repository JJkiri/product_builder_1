import asyncio
from datetime import datetime

from app.collector.krx_fetcher import krx_fetcher
from app.services.firestore import firestore_service
from app.config import get_settings

settings = get_settings()


async def collect_market_data():
    """
    Collect market data from KRX and save to Firestore.
    This function should be called by Cloud Scheduler or cron.
    """
    print(f"[{datetime.now()}] Starting market data collection...")

    try:
        # Check if market is open (Korean market: 09:00 - 15:30)
        now = datetime.now()
        hour = now.hour
        minute = now.minute

        # Market hours check (KST)
        is_market_hours = (
            (hour == 9 and minute >= 0) or
            (hour > 9 and hour < 15) or
            (hour == 15 and minute <= 30)
        )

        # Also check if it's a weekday (0=Monday, 6=Sunday)
        is_weekday = now.weekday() < 5

        if not (is_market_hours and is_weekday):
            print(f"[{datetime.now()}] Market is closed. Skipping collection.")
            return {"status": "skipped", "reason": "market_closed"}

        # Fetch data from KRX
        symbols, latest_quotes, quote_snapshots = await krx_fetcher.fetch_all_markets()

        print(f"[{datetime.now()}] Fetched {len(symbols)} symbols")

        if not symbols:
            print(f"[{datetime.now()}] No data fetched. Aborting.")
            return {"status": "error", "reason": "no_data"}

        # Save to Firestore in batches (Firestore batch limit is 500)
        batch_size = 450

        # Save symbols
        for i in range(0, len(symbols), batch_size):
            batch = symbols[i:i + batch_size]
            await firestore_service.batch_upsert_symbols(batch)

        # Save latest quotes
        for i in range(0, len(latest_quotes), batch_size):
            batch = latest_quotes[i:i + batch_size]
            await firestore_service.batch_upsert_latest_quotes(batch)

        # Save quote snapshots
        for i in range(0, len(quote_snapshots), batch_size):
            batch = quote_snapshots[i:i + batch_size]
            await firestore_service.batch_save_quote_snapshots(batch)

        print(f"[{datetime.now()}] Successfully saved {len(symbols)} stocks to Firestore")

        return {
            "status": "success",
            "symbols_count": len(symbols),
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"[{datetime.now()}] Error during collection: {e}")
        return {"status": "error", "reason": str(e)}


def run_collector():
    """Entry point for running the collector."""
    asyncio.run(collect_market_data())


if __name__ == "__main__":
    run_collector()
