import asyncio
import math
import httpx
from datetime import datetime, timedelta
from typing import Optional

from app.models.schemas import Symbol, LatestQuote, QuoteSnapshot


class NaverFinanceFetcher:
    """Naver Finance API 기반 데이터 수집기 (해외 서버 호환)"""

    BASE_URL = "https://m.stock.naver.com/api/stocks/marketValue"
    PAGE_SIZE = 100
    MAX_CONCURRENT = 5

    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }

    async def _fetch_page(
        self, client: httpx.AsyncClient, market_code: str, page: int
    ) -> list[dict]:
        """Fetch a single page of stock data."""
        url = f"{self.BASE_URL}/{market_code}?page={page}&pageSize={self.PAGE_SIZE}"
        resp = await client.get(url, headers=self.headers)
        resp.raise_for_status()
        data = resp.json()
        return data.get("stocks", [])

    async def _fetch_total_count(
        self, client: httpx.AsyncClient, market_code: str
    ) -> int:
        """Get total stock count for a market."""
        url = f"{self.BASE_URL}/{market_code}?page=1&pageSize=1"
        resp = await client.get(url, headers=self.headers)
        resp.raise_for_status()
        data = resp.json()
        return data.get("totalCount", 0)

    async def fetch_market_data(self, market: str = "KOSPI") -> list[dict]:
        """Fetch all stock data for a market using concurrent pagination."""
        market_code = "KOSPI" if market == "KOSPI" else "KOSDAQ"

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get total count
            total = await self._fetch_total_count(client, market_code)
            if total == 0:
                print(f"[Naver] No stocks found for {market}")
                return []

            total_pages = math.ceil(total / self.PAGE_SIZE)
            print(f"[Naver] {market}: {total} stocks, {total_pages} pages")

            # Fetch all pages concurrently (with concurrency limit)
            semaphore = asyncio.Semaphore(self.MAX_CONCURRENT)
            all_stocks = []

            async def fetch_with_limit(page: int):
                async with semaphore:
                    return await self._fetch_page(client, market_code, page)

            tasks = [fetch_with_limit(p) for p in range(1, total_pages + 1)]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    print(f"[Naver] Page {i+1} failed: {result}")
                else:
                    all_stocks.extend(result)

            print(f"[Naver] {market}: fetched {len(all_stocks)} stocks")
            return all_stocks

    def parse_stock_data(
        self,
        raw_data: list[dict],
        market: str,
        asof: Optional[datetime] = None,
    ) -> tuple[list[Symbol], list[LatestQuote], list[QuoteSnapshot]]:
        """Parse Naver Finance API data into our models."""
        if asof is None:
            asof = datetime.now()

        symbols = []
        latest_quotes = []
        quote_snapshots = []

        for item in raw_data:
            try:
                code = item.get("itemCode", "").strip()
                name = item.get("stockName", "").strip()

                if not code or not name:
                    continue

                # Only include regular stocks (6-digit numeric codes)
                if len(code) != 6 or not code.isdigit():
                    continue

                # Skip non-stock items (ETF, ETN etc)
                stock_end_type = item.get("stockEndType", "")
                if stock_end_type and stock_end_type != "stock":
                    continue

                def parse_num(val, as_float=False):
                    if not val or val == "-" or val == "N/A":
                        return 0.0 if as_float else 0
                    cleaned = str(val).replace(",", "")
                    return float(cleaned) if as_float else int(float(cleaned))

                price = parse_num(item.get("closePrice", "0"))
                chg_pct = parse_num(item.get("fluctuationsRatio", "0"), as_float=True)
                volume = parse_num(item.get("accumulatedTradingVolume", "0"))

                # Trading value: Naver returns in won or as "-"
                raw_value = item.get("accumulatedTradingValue", "0")
                value = parse_num(raw_value)

                if price == 0:
                    continue

                symbol = Symbol(code=code, name=name, market=market)
                symbols.append(symbol)

                latest_quote = LatestQuote(
                    code=code, name=name, market=market,
                    asof=asof, price=price, chg_pct=chg_pct,
                    volume=volume, value=value,
                )
                latest_quotes.append(latest_quote)

                quote_snapshot = QuoteSnapshot(
                    code=code, asof=asof, price=price, chg_pct=chg_pct,
                    volume=volume, value=value, high=0, low=0, open=0,
                )
                quote_snapshots.append(quote_snapshot)

            except (ValueError, KeyError):
                continue

        return symbols, latest_quotes, quote_snapshots

    async def fetch_all_markets(
        self,
    ) -> tuple[list[Symbol], list[LatestQuote], list[QuoteSnapshot]]:
        """Fetch data from both KOSPI and KOSDAQ markets."""
        asof = datetime.now()

        all_symbols = []
        all_latest_quotes = []
        all_quote_snapshots = []

        for market in ["KOSPI", "KOSDAQ"]:
            try:
                raw_data = await self.fetch_market_data(market)
                symbols, latest_quotes, quote_snapshots = self.parse_stock_data(
                    raw_data, market, asof
                )
                all_symbols.extend(symbols)
                all_latest_quotes.extend(latest_quotes)
                all_quote_snapshots.extend(quote_snapshots)
                print(f"[Naver] {market}: {len(symbols)} symbols loaded")
            except Exception as e:
                print(f"[Naver] Error fetching {market}: {e}")
                continue

        return all_symbols, all_latest_quotes, all_quote_snapshots


# Singleton instance (keep name for backward compatibility)
krx_fetcher = NaverFinanceFetcher()
