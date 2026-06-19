"""Ranking system for stock selection - single and multi-metric composite ranking."""

import pandas as pd

from app.schemas.backtest import RankingMetric


def rank_stocks(stocks: list[dict], ranking_metrics: list[RankingMetric]) -> list[dict]:
    """
    Rank stocks by single or multiple metrics.
    Multi-metric: average of individual ranks weighted by metric weight.
    """
    if not stocks:
        return []

    df = pd.DataFrame(stocks)
    total_weight = sum(m.weight for m in ranking_metrics)
    if total_weight == 0:
        total_weight = 1.0

    composite_rank = pd.Series(0.0, index=df.index)

    for metric in ranking_metrics:
        col = metric.metric
        if col not in df.columns:
            continue

        ascending = metric.direction == "asc"
        ranks = df[col].rank(ascending=ascending, method="average", na_option="bottom")
        normalized_weight = metric.weight / total_weight
        composite_rank += ranks * normalized_weight

    df["_composite_rank"] = composite_rank
    df = df.sort_values("_composite_rank", ascending=True)
    df = df.drop(columns=["_composite_rank"])
    return df.to_dict("records")
