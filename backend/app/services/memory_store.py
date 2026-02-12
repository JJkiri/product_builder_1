"""In-memory data store with auto-refresh from KRX."""

from datetime import datetime
from typing import Optional

from app.models.schemas import Symbol, LatestQuote


class MemoryStore:
    """In-memory store for stock data, refreshed from KRX."""

    def __init__(self):
        self._symbols: list[Symbol] = []
        self._latest_quotes: list[LatestQuote] = []
        self._last_updated: Optional[datetime] = None

    @property
    def last_updated(self) -> Optional[datetime]:
        return self._last_updated

    @property
    def is_loaded(self) -> bool:
        return self._last_updated is not None

    async def update(self, symbols: list[Symbol], quotes: list[LatestQuote]) -> None:
        self._symbols = symbols
        self._latest_quotes = quotes
        self._last_updated = datetime.now()

    async def get_symbols(
        self,
        query: Optional[str] = None,
        market: Optional[str] = None,
        limit: int = 100,
    ) -> list[Symbol]:
        results = []
        for s in self._symbols:
            if market and market != "ALL" and s.market != market:
                continue
            if query:
                if query.lower() not in s.name.lower() and query not in s.code:
                    continue
            results.append(s)
            if len(results) >= limit:
                break
        return results

    async def get_latest_quote(self, code: str) -> Optional[LatestQuote]:
        for q in self._latest_quotes:
            if q.code == code:
                return q
        return None

    async def get_all_latest_quotes(
        self, market: Optional[str] = None
    ) -> list[LatestQuote]:
        if market and market != "ALL":
            return [q for q in self._latest_quotes if q.market == market]
        return list(self._latest_quotes)


# Singleton
memory_store = MemoryStore()
