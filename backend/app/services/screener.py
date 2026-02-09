from typing import Optional
from datetime import datetime

from app.models.schemas import LatestQuote, Top10Item, Top10Filter, RiskParams
from app.services.risk import calculate_position_size


def filter_quotes(
    quotes: list[LatestQuote],
    filter_params: Top10Filter
) -> list[LatestQuote]:
    """
    Apply filters to quotes.

    Args:
        quotes: List of latest quotes
        filter_params: Filter parameters

    Returns:
        Filtered list of quotes
    """
    filtered = []

    for quote in quotes:
        # Market filter
        if filter_params.market != "ALL":
            if quote.market != filter_params.market:
                continue

        # Value filter (min_value is in 억원, value is in 원)
        if filter_params.min_value is not None:
            min_value_won = filter_params.min_value * 100_000_000
            if quote.value < min_value_won:
                continue

        # Change percentage filter
        if filter_params.min_chg_pct is not None:
            if quote.chg_pct < filter_params.min_chg_pct:
                continue

        if filter_params.max_chg_pct is not None:
            if quote.chg_pct > filter_params.max_chg_pct:
                continue

        # Price filter
        if filter_params.min_price is not None:
            if quote.price < filter_params.min_price:
                continue

        if filter_params.max_price is not None:
            if quote.price > filter_params.max_price:
                continue

        filtered.append(quote)

    return filtered


def sort_quotes(
    quotes: list[LatestQuote],
    sort_by: str = "value"
) -> list[LatestQuote]:
    """
    Sort quotes by specified criteria.

    Args:
        quotes: List of quotes to sort
        sort_by: "value" (거래대금) or "weighted" (거래대금+등락률 가중)

    Returns:
        Sorted list of quotes
    """
    if sort_by == "value":
        # Sort by trading value (descending)
        return sorted(quotes, key=lambda q: q.value, reverse=True)

    elif sort_by == "weighted":
        # Weighted sort: combine normalized value and change percentage
        # Normalize value to 0-100 scale
        if not quotes:
            return quotes

        max_value = max(q.value for q in quotes) if quotes else 1
        min_value = min(q.value for q in quotes) if quotes else 0
        value_range = max_value - min_value if max_value != min_value else 1

        def weighted_score(quote: LatestQuote) -> float:
            # Normalized value score (0-100)
            value_score = ((quote.value - min_value) / value_range) * 100
            # Change percentage already in percentage points
            # Weight: 70% value, 30% change percentage
            return value_score * 0.7 + quote.chg_pct * 0.3

        return sorted(quotes, key=weighted_score, reverse=True)

    return quotes


def create_top10_items(
    quotes: list[LatestQuote],
    risk_params: Optional[RiskParams] = None
) -> list[Top10Item]:
    """
    Create Top10 items from sorted quotes.

    Args:
        quotes: Sorted list of quotes (already limited to 10)
        risk_params: Optional risk parameters for position sizing

    Returns:
        List of Top10Item with rank and optional risk calculations
    """
    items = []

    for rank, quote in enumerate(quotes[:10], start=1):
        item = Top10Item(
            rank=rank,
            code=quote.code,
            name=quote.name,
            market=quote.market,
            price=quote.price,
            chg_pct=quote.chg_pct,
            value=quote.value
        )

        # Calculate risk if parameters provided
        if risk_params and risk_params.account_size > 0:
            risk_result = calculate_position_size(
                price=quote.price,
                account_size=risk_params.account_size,
                risk_pct=risk_params.risk_pct,
                stop_pct=risk_params.stop_pct,
                cap_pct=risk_params.cap_pct
            )
            item.stop_price = risk_result.stop_price
            item.max_shares = risk_result.max_shares
            item.max_investment = risk_result.max_investment
            item.risk_amount = risk_result.risk_amount

        items.append(item)

    return items


async def screen_top10(
    quotes: list[LatestQuote],
    filter_params: Top10Filter,
    risk_params: Optional[RiskParams] = None
) -> tuple[list[Top10Item], datetime]:
    """
    Screen and return top 10 stocks based on filters.

    Args:
        quotes: List of all latest quotes
        filter_params: Filter parameters
        risk_params: Optional risk parameters

    Returns:
        Tuple of (list of Top10Item, asof timestamp)
    """
    # Get the most recent timestamp from quotes
    asof = max((q.asof for q in quotes), default=datetime.now())

    # Apply filters
    filtered = filter_quotes(quotes, filter_params)

    # Sort
    sorted_quotes = sort_quotes(filtered, filter_params.sort_by)

    # Create top 10 items
    items = create_top10_items(sorted_quotes[:10], risk_params)

    return items, asof
