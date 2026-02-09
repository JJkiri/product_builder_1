import httpx
from datetime import datetime
from typing import Optional

from app.models.schemas import Symbol, LatestQuote, QuoteSnapshot


class KRXFetcher:
    """KRX 정보데이터시스템 데이터 수집기"""

    BASE_URL = "http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd"

    # Market codes
    KOSPI_MKT_ID = "STK"
    KOSDAQ_MKT_ID = "KSQ"

    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "http://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        }

    async def fetch_market_data(
        self,
        market: str = "KOSPI"
    ) -> list[dict]:
        """
        Fetch market data from KRX.

        Args:
            market: "KOSPI" or "KOSDAQ"

        Returns:
            List of stock data dictionaries
        """
        mkt_id = self.KOSPI_MKT_ID if market == "KOSPI" else self.KOSDAQ_MKT_ID
        today = datetime.now().strftime("%Y%m%d")

        # Request payload for stock prices
        payload = {
            "bld": "dbms/MDC/STAT/standard/MDCSTAT01501",
            "mktId": mkt_id,
            "trdDd": today,
            "share": "1",
            "money": "1",
            "csvxls_is498": "false",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.BASE_URL,
                data=payload,
                headers=self.headers
            )
            response.raise_for_status()
            data = response.json()

        return data.get("OutBlock_1", [])

    def parse_stock_data(
        self,
        raw_data: list[dict],
        market: str,
        asof: Optional[datetime] = None
    ) -> tuple[list[Symbol], list[LatestQuote], list[QuoteSnapshot]]:
        """
        Parse raw KRX data into our models.

        Returns:
            Tuple of (symbols, latest_quotes, quote_snapshots)
        """
        if asof is None:
            asof = datetime.now()

        symbols = []
        latest_quotes = []
        quote_snapshots = []

        for item in raw_data:
            try:
                code = item.get("ISU_SRT_CD", "").strip()
                name = item.get("ISU_ABBRV", "").strip()

                if not code or not name:
                    continue

                # Skip ETF, ETN, etc. (usually have different code patterns)
                if len(code) != 6 or not code.isdigit():
                    continue

                # Parse numeric values (remove commas)
                def parse_int(val: str) -> int:
                    if not val or val == "-":
                        return 0
                    return int(val.replace(",", ""))

                def parse_float(val: str) -> float:
                    if not val or val == "-":
                        return 0.0
                    return float(val.replace(",", ""))

                price = parse_int(item.get("TDD_CLSPRC", "0"))
                chg_pct = parse_float(item.get("FLUC_RT", "0"))
                volume = parse_int(item.get("ACC_TRDVOL", "0"))
                value = parse_int(item.get("ACC_TRDVAL", "0"))
                high = parse_int(item.get("TDD_HGPRC", "0"))
                low = parse_int(item.get("TDD_LWPRC", "0"))
                open_price = parse_int(item.get("TDD_OPNPRC", "0"))

                # Skip stocks with no trading
                if price == 0:
                    continue

                # Create models
                symbol = Symbol(code=code, name=name, market=market)
                symbols.append(symbol)

                latest_quote = LatestQuote(
                    code=code,
                    name=name,
                    market=market,
                    asof=asof,
                    price=price,
                    chg_pct=chg_pct,
                    volume=volume,
                    value=value
                )
                latest_quotes.append(latest_quote)

                quote_snapshot = QuoteSnapshot(
                    code=code,
                    asof=asof,
                    price=price,
                    chg_pct=chg_pct,
                    volume=volume,
                    value=value,
                    high=high,
                    low=low,
                    open=open_price
                )
                quote_snapshots.append(quote_snapshot)

            except (ValueError, KeyError) as e:
                # Skip malformed entries
                continue

        return symbols, latest_quotes, quote_snapshots

    async def fetch_all_markets(
        self
    ) -> tuple[list[Symbol], list[LatestQuote], list[QuoteSnapshot]]:
        """
        Fetch data from both KOSPI and KOSDAQ markets.

        Returns:
            Combined tuple of (symbols, latest_quotes, quote_snapshots)
        """
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
            except Exception as e:
                print(f"Error fetching {market} data: {e}")
                continue

        return all_symbols, all_latest_quotes, all_quote_snapshots


# Singleton instance
krx_fetcher = KRXFetcher()
