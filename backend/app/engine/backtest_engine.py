"""
Backtesting engine with no future data leakage.

Key principles:
- Financial/ratio data only used if as_of_date <= rebalance_date
- Price data only used for dates <= current simulation date
- Rebalancing occurs at end of period using data available at that point
"""

from datetime import date, timedelta
from typing import Any

import pandas as pd
from dateutil.relativedelta import relativedelta

from app.core.logging import get_logger
from app.engine.analytics import calculate_analytics
from app.engine.filters import apply_filters
from app.engine.portfolio import calculate_weights
from app.engine.ranking import rank_stocks
from app.schemas.backtest import BacktestRequest, RebalanceFrequency

logger = get_logger(__name__)

FREQUENCY_MAP = {
    RebalanceFrequency.MONTHLY: relativedelta(months=1),
    RebalanceFrequency.QUARTERLY: relativedelta(months=3),
    RebalanceFrequency.HALF_YEARLY: relativedelta(months=6),
    RebalanceFrequency.YEARLY: relativedelta(years=1),
}


class BacktestEngine:
    def __init__(
        self,
        prices_df: pd.DataFrame,
        ratios_df: pd.DataFrame,
        companies: list[dict],
    ):
        """
        prices_df: columns [ticker, date, close]
        ratios_df: columns [ticker, as_of_date, roe, roce, pe, pb, eps, pat, market_cap, debt_equity]
        companies: list of {ticker, company_name, sector}
        """
        self.prices_df = prices_df.copy()
        self.prices_df["date"] = pd.to_datetime(self.prices_df["date"])
        self.ratios_df = ratios_df.copy()
        if not self.ratios_df.empty:
            self.ratios_df["as_of_date"] = pd.to_datetime(self.ratios_df["as_of_date"])
        self.companies = {c["ticker"]: c for c in companies}
        self.price_pivot = self.prices_df.pivot_table(
            index="date", columns="ticker", values="close", aggfunc="last"
        ).sort_index()

    def run(self, config: BacktestRequest) -> dict[str, Any]:
        rebalance_dates = self._get_rebalance_dates(config.start_date, config.end_date, config.rebalance_frequency)
        if not rebalance_dates:
            raise ValueError("No rebalance dates in the given range")

        portfolio_value = config.initial_capital
        holdings: dict[str, dict] = {}
        equity_curve: list[dict] = []
        transactions: list[dict] = []
        all_holdings_log: list[dict] = []

        for i, rebal_date in enumerate(rebalance_dates):
            next_date = rebalance_dates[i + 1] if i + 1 < len(rebalance_dates) else config.end_date

            if holdings:
                portfolio_value = self._mark_to_market(holdings, portfolio_value, rebal_date)

            equity_curve.append({"date": rebal_date.isoformat(), "value": portfolio_value})

            universe = self._get_universe_as_of(rebal_date)
            filtered = apply_filters(universe, config.filters)
            ranked = rank_stocks(filtered, config.ranking_metrics)
            selected = ranked[: config.portfolio_size]

            if not selected:
                logger.warning("No stocks passed filters on %s", rebal_date)
                continue

            weights = calculate_weights(selected, config.position_sizing, config.metric_weight_field or "roe")
            new_holdings = self._rebalance(holdings, weights, portfolio_value, rebal_date, transactions)

            for ticker, info in new_holdings.items():
                if ticker not in holdings:
                    all_holdings_log.append({
                        "stock": ticker,
                        "weight": info["weight"],
                        "entry_date": rebal_date.isoformat(),
                        "exit_date": None,
                        "returns": None,
                    })
                else:
                    for h in all_holdings_log:
                        if h["stock"] == ticker and h["exit_date"] is None:
                            h["weight"] = info["weight"]

            for ticker in list(holdings.keys()):
                if ticker not in new_holdings:
                    entry_price = holdings[ticker]["entry_price"]
                    exit_price = self._get_price(ticker, rebal_date)
                    ret = ((exit_price / entry_price) - 1) * 100 if entry_price and exit_price else 0
                    for h in all_holdings_log:
                        if h["stock"] == ticker and h["exit_date"] is None:
                            h["exit_date"] = rebal_date.isoformat()
                            h["returns"] = round(ret, 2)
                    transactions.append({
                        "ticker": ticker,
                        "action": "sell",
                        "date": rebal_date.isoformat(),
                        "return_pct": ret,
                    })

            holdings = new_holdings

            if i + 1 < len(rebalance_dates):
                period_end = rebalance_dates[i + 1]
            else:
                period_end = config.end_date

            if holdings and period_end > rebal_date:
                portfolio_value = self._simulate_period(holdings, portfolio_value, rebal_date, period_end)
                equity_curve.append({"date": period_end.isoformat(), "value": portfolio_value})

        if holdings:
            for ticker, info in holdings.items():
                entry_price = info["entry_price"]
                exit_price = self._get_price(ticker, config.end_date)
                ret = ((exit_price / entry_price) - 1) * 100 if entry_price and exit_price else 0
                for h in all_holdings_log:
                    if h["stock"] == ticker and h["exit_date"] is None:
                        h["exit_date"] = config.end_date.isoformat()
                        h["returns"] = round(ret, 2)

        analytics = calculate_analytics(
            equity_curve, transactions, config.initial_capital, config.start_date, config.end_date
        )

        winners = sorted(
            [h for h in all_holdings_log if h.get("returns") is not None],
            key=lambda x: x["returns"],
            reverse=True,
        )[:10]
        losers = sorted(
            [h for h in all_holdings_log if h.get("returns") is not None],
            key=lambda x: x["returns"],
        )[:10]

        return {
            "analytics": analytics,
            "holdings": all_holdings_log,
            "transactions": transactions,
            "top_winners": winners,
            "top_losers": losers,
            "rebalance_dates": [d.isoformat() for d in rebalance_dates],
        }

    def _get_rebalance_dates(
        self, start: date, end: date, frequency: RebalanceFrequency
    ) -> list[date]:
        delta = FREQUENCY_MAP[frequency]
        dates = []
        current = start
        while current <= end:
            dates.append(current)
            current = current + delta
        return dates

    def _get_universe_as_of(self, as_of: date) -> list[dict]:
        """Build stock universe using only data available on or before as_of date."""
        as_of_ts = pd.Timestamp(as_of)
        universe = []

        for ticker, company in self.companies.items():
            ratio_row = None
            if not self.ratios_df.empty:
                ticker_ratios = self.ratios_df[
                    (self.ratios_df["ticker"] == ticker) & (self.ratios_df["as_of_date"] <= as_of_ts)
                ]
                if not ticker_ratios.empty:
                    ratio_row = ticker_ratios.sort_values("as_of_date").iloc[-1]

            price = self._get_price(ticker, as_of)
            if price is None:
                continue

            stock_data = {
                "ticker": ticker,
                "company_name": company.get("company_name", ticker),
                "sector": company.get("sector"),
                "price": price,
                "roe": float(ratio_row["roe"]) if ratio_row is not None and pd.notna(ratio_row.get("roe")) else None,
                "roce": float(ratio_row["roce"]) if ratio_row is not None and pd.notna(ratio_row.get("roce")) else None,
                "pe": float(ratio_row["pe"]) if ratio_row is not None and pd.notna(ratio_row.get("pe")) else None,
                "pb": float(ratio_row["pb"]) if ratio_row is not None and pd.notna(ratio_row.get("pb")) else None,
                "eps": float(ratio_row["eps"]) if ratio_row is not None and pd.notna(ratio_row.get("eps")) else None,
                "pat": float(ratio_row["pat"]) if ratio_row is not None and pd.notna(ratio_row.get("pat")) else None,
                "market_cap": float(ratio_row["market_cap"]) if ratio_row is not None and pd.notna(ratio_row.get("market_cap")) else None,
                "debt_equity": float(ratio_row["debt_equity"]) if ratio_row is not None and pd.notna(ratio_row.get("debt_equity")) else None,
            }
            universe.append(stock_data)

        return universe

    def _get_price(self, ticker: str, as_of: date) -> float | None:
        as_of_ts = pd.Timestamp(as_of)
        if ticker not in self.price_pivot.columns:
            return None
        available = self.price_pivot.index[self.price_pivot.index <= as_of_ts]
        if len(available) == 0:
            return None
        last_date = available[-1]
        price = self.price_pivot.loc[last_date, ticker]
        return float(price) if pd.notna(price) else None

    def _mark_to_market(self, holdings: dict, portfolio_value: float, as_of: date) -> float:
        total = 0.0
        for ticker, info in holdings.items():
            price = self._get_price(ticker, as_of)
            if price and info.get("shares"):
                total += info["shares"] * price
        return total if total > 0 else portfolio_value

    def _rebalance(
        self,
        old_holdings: dict,
        weights: dict[str, float],
        portfolio_value: float,
        rebal_date: date,
        transactions: list,
    ) -> dict:
        new_holdings = {}
        for ticker, weight in weights.items():
            price = self._get_price(ticker, rebal_date)
            if not price or price <= 0:
                continue
            allocation = portfolio_value * weight
            shares = allocation / price
            new_holdings[ticker] = {
                "weight": weight,
                "shares": shares,
                "entry_price": price,
            }
            action = "buy" if ticker not in old_holdings else "rebalance"
            transactions.append({
                "ticker": ticker,
                "action": action,
                "date": rebal_date.isoformat(),
                "weight": weight,
                "price": price,
                "shares": shares,
            })
        return new_holdings

    def _simulate_period(
        self, holdings: dict, portfolio_value: float, start: date, end: date
    ) -> float:
        start_price = self._mark_to_market(holdings, portfolio_value, start)
        end_price = self._mark_to_market(holdings, portfolio_value, end)
        if start_price > 0:
            return end_price
        return portfolio_value
