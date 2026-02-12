import io
import asyncio
import httpx
from datetime import datetime, timedelta
from typing import Optional

from app.models.schemas import Symbol, LatestQuote, QuoteSnapshot


class KRXFetcher:
    """KRX 정보데이터시스템 데이터 수집기 (OTP 방식 + pykrx fallback)"""

    OTP_URL = "http://data.krx.co.kr/comm/fileDn/GenerateOTP/generate.cmd"
    DOWNLOAD_URL = "http://data.krx.co.kr/comm/fileDn/download_csv/download.cmd"
    JSON_URL = "http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd"

    KOSPI_MKT_ID = "STK"
    KOSDAQ_MKT_ID = "KSQ"

    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "http://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?boxType=pr498",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
        }

    def _get_trade_date(self) -> str:
        """Get the most recent likely trading date (KST)."""
        # Use KST (UTC+9)
        now_kst = datetime.utcnow() + timedelta(hours=9)
        # If before market open (9 AM), use previous day
        if now_kst.hour < 9:
            now_kst -= timedelta(days=1)
        # Skip weekends
        while now_kst.weekday() >= 5:  # Saturday=5, Sunday=6
            now_kst -= timedelta(days=1)
        return now_kst.strftime("%Y%m%d")

    async def _fetch_via_otp(self, market: str) -> list[dict]:
        """Fetch data using KRX OTP + CSV download method."""
        mkt_id = self.KOSPI_MKT_ID if market == "KOSPI" else self.KOSDAQ_MKT_ID
        trade_date = self._get_trade_date()

        otp_params = {
            "locale": "ko_KR",
            "mktId": mkt_id,
            "trdDd": trade_date,
            "share": "1",
            "money": "1",
            "csvxls_isNo": "false",
            "name": "fileDown",
            "url": "dbms/MDC/STAT/standard/MDCSTAT01501",
        }

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            # Step 1: Get OTP
            otp_headers = {**self.headers, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"}
            otp_resp = await client.post(self.OTP_URL, data=otp_params, headers=otp_headers)
            otp_resp.raise_for_status()
            otp_code = otp_resp.text.strip()

            if not otp_code or len(otp_code) > 100:
                raise ValueError(f"Invalid OTP response: {otp_code[:50]}")

            # Step 2: Download CSV using OTP
            download_headers = {**self.headers, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"}
            csv_resp = await client.post(
                self.DOWNLOAD_URL,
                data={"code": otp_code},
                headers=download_headers,
            )
            csv_resp.raise_for_status()

            # Parse CSV
            return self._parse_csv(csv_resp.text, market)

    def _parse_csv(self, csv_text: str, market: str) -> list[dict]:
        """Parse KRX CSV data into list of dicts."""
        import csv
        reader = csv.DictReader(io.StringIO(csv_text))
        rows = []
        for row in reader:
            rows.append(row)
        return rows

    async def _fetch_via_json(self, market: str) -> list[dict]:
        """Fetch data using the JSON API (original method)."""
        mkt_id = self.KOSPI_MKT_ID if market == "KOSPI" else self.KOSDAQ_MKT_ID
        trade_date = self._get_trade_date()

        payload = {
            "bld": "dbms/MDC/STAT/standard/MDCSTAT01501",
            "locale": "ko_KR",
            "mktId": mkt_id,
            "trdDd": trade_date,
            "share": "1",
            "money": "1",
            "csvxls_isNo": "false",
        }

        json_headers = {**self.headers, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.JSON_URL, data=payload, headers=json_headers)
            response.raise_for_status()
            data = response.json()

        return data.get("OutBlock_1", [])

    async def _fetch_via_pykrx(self, market: str) -> list[dict]:
        """Fallback: use pykrx library."""
        trade_date = self._get_trade_date()

        def _sync_fetch():
            from pykrx import stock
            mkt = "KOSPI" if market == "KOSPI" else "KOSDAQ"
            df = stock.get_market_ohlcv_by_ticker(trade_date, market=mkt)
            if df.empty:
                # Try previous trading day
                prev = (datetime.strptime(trade_date, "%Y%m%d") - timedelta(days=1)).strftime("%Y%m%d")
                df = stock.get_market_ohlcv_by_ticker(prev, market=mkt)
            return df

        df = await asyncio.to_thread(_sync_fetch)

        if df.empty:
            return []

        rows = []
        for code, row in df.iterrows():
            rows.append({
                "ISU_SRT_CD": code,
                "ISU_ABBRV": "",  # pykrx doesn't include name in ohlcv
                "TDD_CLSPRC": str(int(row.get("종가", 0))),
                "FLUC_RT": str(row.get("등락률", 0.0)),
                "ACC_TRDVOL": str(int(row.get("거래량", 0))),
                "ACC_TRDVAL": str(int(row.get("거래대금", 0))),
                "TDD_HGPRC": str(int(row.get("고가", 0))),
                "TDD_LWPRC": str(int(row.get("저가", 0))),
                "TDD_OPNPRC": str(int(row.get("시가", 0))),
                "_source": "pykrx",
            })

        # Fetch ticker names
        def _sync_names():
            from pykrx import stock
            names = {}
            for code in [r["ISU_SRT_CD"] for r in rows]:
                try:
                    name = stock.get_market_ticker_name(code)
                    if name:
                        names[code] = name
                except Exception:
                    pass
            return names

        names = await asyncio.to_thread(_sync_names)
        for row in rows:
            row["ISU_ABBRV"] = names.get(row["ISU_SRT_CD"], "")

        return rows

    async def fetch_market_data(self, market: str = "KOSPI") -> list[dict]:
        """Fetch market data with multiple fallback methods."""
        errors = []

        # Method 1: OTP + CSV download
        try:
            print(f"[KRX] Trying OTP method for {market}...")
            data = await self._fetch_via_otp(market)
            if data:
                print(f"[KRX] OTP method succeeded for {market}: {len(data)} rows")
                return data
        except Exception as e:
            errors.append(f"OTP: {e}")
            print(f"[KRX] OTP method failed for {market}: {e}")

        # Method 2: Direct JSON API
        try:
            print(f"[KRX] Trying JSON method for {market}...")
            data = await self._fetch_via_json(market)
            if data:
                print(f"[KRX] JSON method succeeded for {market}: {len(data)} rows")
                return data
        except Exception as e:
            errors.append(f"JSON: {e}")
            print(f"[KRX] JSON method failed for {market}: {e}")

        # Method 3: pykrx library
        try:
            print(f"[KRX] Trying pykrx method for {market}...")
            data = await self._fetch_via_pykrx(market)
            if data:
                print(f"[KRX] pykrx method succeeded for {market}: {len(data)} rows")
                return data
        except Exception as e:
            errors.append(f"pykrx: {e}")
            print(f"[KRX] pykrx method failed for {market}: {e}")

        print(f"[KRX] All methods failed for {market}: {errors}")
        return []

    def parse_stock_data(
        self,
        raw_data: list[dict],
        market: str,
        asof: Optional[datetime] = None
    ) -> tuple[list[Symbol], list[LatestQuote], list[QuoteSnapshot]]:
        """Parse raw KRX data into our models."""
        if asof is None:
            asof = datetime.now()

        symbols = []
        latest_quotes = []
        quote_snapshots = []

        # Detect CSV column names (Korean headers from OTP download)
        csv_column_map = {
            "종목코드": "ISU_SRT_CD",
            "종목명": "ISU_ABBRV",
            "종가": "TDD_CLSPRC",
            "등락률": "FLUC_RT",
            "거래량": "ACC_TRDVOL",
            "거래대금": "ACC_TRDVAL",
            "고가": "TDD_HGPRC",
            "저가": "TDD_LWPRC",
            "시가": "TDD_OPNPRC",
        }

        for item in raw_data:
            try:
                # Normalize column names (handle both KRX JSON and CSV formats)
                normalized = {}
                for k, v in item.items():
                    mapped = csv_column_map.get(k, k)
                    normalized[mapped] = v

                code = normalized.get("ISU_SRT_CD", "").strip()
                name = normalized.get("ISU_ABBRV", "").strip()

                if not code:
                    continue

                # Skip ETF, ETN, etc.
                if len(code) != 6 or not code.isdigit():
                    continue

                # Skip if no name (incomplete data)
                if not name:
                    continue

                def parse_int(val) -> int:
                    if not val or val == "-":
                        return 0
                    return int(str(val).replace(",", "").split(".")[0])

                def parse_float(val) -> float:
                    if not val or val == "-":
                        return 0.0
                    return float(str(val).replace(",", ""))

                price = parse_int(normalized.get("TDD_CLSPRC", "0"))
                chg_pct = parse_float(normalized.get("FLUC_RT", "0"))
                volume = parse_int(normalized.get("ACC_TRDVOL", "0"))
                value = parse_int(normalized.get("ACC_TRDVAL", "0"))
                high = parse_int(normalized.get("TDD_HGPRC", "0"))
                low = parse_int(normalized.get("TDD_LWPRC", "0"))
                open_price = parse_int(normalized.get("TDD_OPNPRC", "0"))

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
                    volume=volume, value=value, high=high, low=low, open=open_price,
                )
                quote_snapshots.append(quote_snapshot)

            except (ValueError, KeyError) as e:
                continue

        return symbols, latest_quotes, quote_snapshots

    async def fetch_all_markets(
        self
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
                print(f"[KRX] {market}: {len(symbols)} symbols loaded")
            except Exception as e:
                print(f"[KRX] Error fetching {market} data: {e}")
                continue

        return all_symbols, all_latest_quotes, all_quote_snapshots


# Singleton instance
krx_fetcher = KRXFetcher()
