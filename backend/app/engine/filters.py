"""Filter system for stock selection - applied before each rebalance."""

from app.schemas.backtest import FilterConfig, FilterOperator


def apply_filters(stocks: list[dict], filters: list[FilterConfig]) -> list[dict]:
    """Apply multiple filters simultaneously to stock universe."""
    if not filters:
        return stocks

    result = stocks
    for f in filters:
        result = [s for s in result if _passes_filter(s, f)]
    return result


def _passes_filter(stock: dict, f: FilterConfig) -> bool:
    value = stock.get(f.field)
    if value is None:
        return False

    if f.operator == FilterOperator.GT:
        return value > (f.value or 0)
    if f.operator == FilterOperator.GTE:
        return value >= (f.value or 0)
    if f.operator == FilterOperator.LT:
        return value < (f.value or 0)
    if f.operator == FilterOperator.LTE:
        return value <= (f.value or 0)
    if f.operator == FilterOperator.BETWEEN:
        return (f.min_value or float("-inf")) <= value <= (f.max_value or float("inf"))
    return True
