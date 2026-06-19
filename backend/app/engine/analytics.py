"""Performance analytics calculations."""

import math
from datetime import date

import numpy as np
import pandas as pd


def calculate_analytics(
    equity_curve: list[dict],
    transactions: list[dict],
    initial_capital: float,
    start_date: date,
    end_date: date,
    risk_free_rate: float = 0.06,
) -> dict:
    """Calculate comprehensive performance metrics."""
    if not equity_curve:
        return _empty_analytics(initial_capital)

    df = pd.DataFrame(equity_curve)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date")
    values = df["value"].values
    dates = df["date"].values

    total_return = (values[-1] - initial_capital) / initial_capital * 100
    years = max((end_date - start_date).days / 365.25, 0.01)
    cagr = ((values[-1] / initial_capital) ** (1 / years) - 1) * 100

    daily_returns = pd.Series(values).pct_change().dropna()
    annual_return = daily_returns.mean() * 252 * 100 if len(daily_returns) > 0 else 0
    volatility = daily_returns.std() * np.sqrt(252) * 100 if len(daily_returns) > 1 else 0

    excess_return = (cagr / 100) - risk_free_rate
    sharpe = excess_return / (volatility / 100) if volatility > 0 else 0

    downside = daily_returns[daily_returns < 0]
    downside_std = downside.std() * np.sqrt(252) if len(downside) > 1 else 0
    sortino = excess_return / downside_std if downside_std > 0 else 0

    peak = pd.Series(values).cummax()
    drawdown = (pd.Series(values) - peak) / peak * 100
    max_drawdown = abs(drawdown.min()) if len(drawdown) > 0 else 0

    drawdown_series = [
        {"date": str(d)[:10], "drawdown": round(float(dd), 4)}
        for d, dd in zip(dates, drawdown.values)
    ]

    trade_returns = [t.get("return_pct", 0) for t in transactions if t.get("return_pct") is not None]
    win_rate = (sum(1 for r in trade_returns if r > 0) / len(trade_returns) * 100) if trade_returns else 0
    best_trade = max(trade_returns) if trade_returns else 0
    worst_trade = min(trade_returns) if trade_returns else 0

    return {
        "total_return": round(total_return, 2),
        "cagr": round(cagr, 2),
        "annual_return": round(annual_return, 2),
        "volatility": round(volatility, 2),
        "sharpe_ratio": round(sharpe, 2),
        "sortino_ratio": round(sortino, 2),
        "max_drawdown": round(max_drawdown, 2),
        "win_rate": round(win_rate, 2),
        "best_trade": round(best_trade, 2),
        "worst_trade": round(worst_trade, 2),
        "final_value": round(float(values[-1]), 2),
        "initial_capital": initial_capital,
        "equity_curve": [{"date": str(d)[:10], "value": round(float(v), 2)} for d, v in zip(dates, values)],
        "drawdown_series": drawdown_series,
    }


def _empty_analytics(initial_capital: float) -> dict:
    return {
        "total_return": 0,
        "cagr": 0,
        "annual_return": 0,
        "volatility": 0,
        "sharpe_ratio": 0,
        "sortino_ratio": 0,
        "max_drawdown": 0,
        "win_rate": 0,
        "best_trade": 0,
        "worst_trade": 0,
        "final_value": initial_capital,
        "initial_capital": initial_capital,
        "equity_curve": [],
        "drawdown_series": [],
    }
