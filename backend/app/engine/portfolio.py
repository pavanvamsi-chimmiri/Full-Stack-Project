"""Portfolio weight calculation strategies."""

from app.schemas.backtest import PositionSizing


def calculate_weights(
    selected_stocks: list[dict],
    position_sizing: PositionSizing,
    metric_weight_field: str = "roe",
) -> dict[str, float]:
    """Calculate portfolio weights for selected stocks."""
    if not selected_stocks:
        return {}

    tickers = [s["ticker"] for s in selected_stocks]

    if position_sizing == PositionSizing.EQUAL_WEIGHT:
        weight = 1.0 / len(tickers)
        return {t: weight for t in tickers}

    if position_sizing == PositionSizing.MARKET_CAP_WEIGHT:
        caps = {s["ticker"]: max(s.get("market_cap") or 0, 0) for s in selected_stocks}
        total = sum(caps.values())
        if total <= 0:
            weight = 1.0 / len(tickers)
            return {t: weight for t in tickers}
        return {t: c / total for t, c in caps.items()}

    if position_sizing == PositionSizing.METRIC_WEIGHT:
        values = {s["ticker"]: max(s.get(metric_weight_field) or 0, 0) for s in selected_stocks}
        total = sum(values.values())
        if total <= 0:
            weight = 1.0 / len(tickers)
            return {t: weight for t in tickers}
        return {t: v / total for t, v in values.items()}

    weight = 1.0 / len(tickers)
    return {t: weight for t in tickers}
