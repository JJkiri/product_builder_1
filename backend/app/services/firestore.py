from datetime import datetime
from typing import Optional
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from app.config import get_settings
from app.models.schemas import Symbol, LatestQuote, QuoteSnapshot

settings = get_settings()


class FirestoreService:
    """Firestore database service."""

    def __init__(self):
        self._db: Optional[firestore.Client] = None

    @property
    def db(self) -> firestore.Client:
        if self._db is None:
            if settings.google_cloud_project:
                self._db = firestore.Client(project=settings.google_cloud_project)
            else:
                self._db = firestore.Client()
        return self._db

    # Collections
    @property
    def symbols_collection(self):
        return self.db.collection("symbols")

    @property
    def quote_snapshots_collection(self):
        return self.db.collection("quote_snapshots")

    @property
    def latest_quotes_collection(self):
        return self.db.collection("latest_quotes")

    # Symbol operations
    async def get_symbols(
        self,
        query: Optional[str] = None,
        market: Optional[str] = None,
        limit: int = 100
    ) -> list[Symbol]:
        """Get symbols with optional filtering."""
        ref = self.symbols_collection.where(
            filter=FieldFilter("is_active", "==", True)
        )

        if market and market != "ALL":
            ref = ref.where(filter=FieldFilter("market", "==", market))

        ref = ref.limit(limit)
        docs = ref.stream()

        symbols = []
        for doc in docs:
            data = doc.to_dict()
            symbol = Symbol(
                code=data["code"],
                name=data["name"],
                market=data["market"]
            )
            # Client-side filtering for name/code query
            if query:
                if query.lower() in symbol.name.lower() or query in symbol.code:
                    symbols.append(symbol)
            else:
                symbols.append(symbol)

        return symbols

    async def get_symbol(self, code: str) -> Optional[Symbol]:
        """Get a single symbol by code."""
        doc = self.symbols_collection.document(code).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        return Symbol(
            code=data["code"],
            name=data["name"],
            market=data["market"]
        )

    async def upsert_symbol(self, symbol: Symbol, is_active: bool = True) -> None:
        """Insert or update a symbol."""
        self.symbols_collection.document(symbol.code).set({
            "code": symbol.code,
            "name": symbol.name,
            "market": symbol.market,
            "is_active": is_active,
            "updated_at": datetime.now()
        }, merge=True)

    async def batch_upsert_symbols(self, symbols: list[Symbol]) -> None:
        """Batch insert or update symbols."""
        batch = self.db.batch()
        for symbol in symbols:
            ref = self.symbols_collection.document(symbol.code)
            batch.set(ref, {
                "code": symbol.code,
                "name": symbol.name,
                "market": symbol.market,
                "is_active": True,
                "updated_at": datetime.now()
            }, merge=True)
        batch.commit()

    # Quote operations
    async def get_latest_quote(self, code: str) -> Optional[LatestQuote]:
        """Get the latest quote for a symbol."""
        doc = self.latest_quotes_collection.document(code).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        return LatestQuote(
            code=data["code"],
            name=data["name"],
            market=data["market"],
            asof=data["asof"],
            price=data["price"],
            chg_pct=data["chg_pct"],
            volume=data["volume"],
            value=data["value"]
        )

    async def get_all_latest_quotes(
        self,
        market: Optional[str] = None
    ) -> list[LatestQuote]:
        """Get all latest quotes, optionally filtered by market."""
        ref = self.latest_quotes_collection

        if market and market != "ALL":
            ref = ref.where(filter=FieldFilter("market", "==", market))

        docs = ref.stream()

        quotes = []
        for doc in docs:
            data = doc.to_dict()
            quotes.append(LatestQuote(
                code=data["code"],
                name=data["name"],
                market=data["market"],
                asof=data["asof"],
                price=data["price"],
                chg_pct=data["chg_pct"],
                volume=data["volume"],
                value=data["value"]
            ))

        return quotes

    async def save_quote_snapshot(self, snapshot: QuoteSnapshot) -> None:
        """Save a quote snapshot."""
        doc_id = f"{snapshot.code}_{snapshot.asof.strftime('%Y%m%d%H%M')}"
        self.quote_snapshots_collection.document(doc_id).set({
            "code": snapshot.code,
            "asof": snapshot.asof,
            "price": snapshot.price,
            "chg_pct": snapshot.chg_pct,
            "volume": snapshot.volume,
            "value": snapshot.value,
            "high": snapshot.high,
            "low": snapshot.low,
            "open": snapshot.open
        })

    async def batch_save_quote_snapshots(
        self,
        snapshots: list[QuoteSnapshot]
    ) -> None:
        """Batch save quote snapshots."""
        batch = self.db.batch()
        for snapshot in snapshots:
            doc_id = f"{snapshot.code}_{snapshot.asof.strftime('%Y%m%d%H%M')}"
            ref = self.quote_snapshots_collection.document(doc_id)
            batch.set(ref, {
                "code": snapshot.code,
                "asof": snapshot.asof,
                "price": snapshot.price,
                "chg_pct": snapshot.chg_pct,
                "volume": snapshot.volume,
                "value": snapshot.value,
                "high": snapshot.high,
                "low": snapshot.low,
                "open": snapshot.open
            })
        batch.commit()

    async def upsert_latest_quote(self, quote: LatestQuote) -> None:
        """Insert or update a latest quote."""
        self.latest_quotes_collection.document(quote.code).set({
            "code": quote.code,
            "name": quote.name,
            "market": quote.market,
            "asof": quote.asof,
            "price": quote.price,
            "chg_pct": quote.chg_pct,
            "volume": quote.volume,
            "value": quote.value
        })

    async def batch_upsert_latest_quotes(self, quotes: list[LatestQuote]) -> None:
        """Batch insert or update latest quotes."""
        batch = self.db.batch()
        for quote in quotes:
            ref = self.latest_quotes_collection.document(quote.code)
            batch.set(ref, {
                "code": quote.code,
                "name": quote.name,
                "market": quote.market,
                "asof": quote.asof,
                "price": quote.price,
                "chg_pct": quote.chg_pct,
                "volume": quote.volume,
                "value": quote.value
            })
        batch.commit()


# Singleton instance
firestore_service = FirestoreService()
