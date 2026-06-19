from datetime import datetime

import pandas as pd
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.engine.backtest_engine import BacktestEngine
from app.models.backtest import Backtest
from app.models.company import Company
from app.models.portfolio_holding import PortfolioHolding
from app.models.ratio import Ratio
from app.models.stock_price import StockPrice
from app.schemas.backtest import BacktestRequest

logger = get_logger(__name__)


class BacktestService:
    def __init__(self, db: Session):
        self.db = db

    def create_backtest(self, config: BacktestRequest) -> Backtest:
        backtest = Backtest(
            name=config.name or f"Backtest {datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            status="pending",
            user_inputs=config.model_dump(mode="json"),
        )
        self.db.add(backtest)
        self.db.commit()
        self.db.refresh(backtest)
        return backtest

    def run_backtest(self, backtest_id: int) -> Backtest:
        backtest = self.db.query(Backtest).filter(Backtest.id == backtest_id).first()
        if not backtest:
            raise ValueError(f"Backtest {backtest_id} not found")

        backtest.status = "running"
        self.db.commit()

        try:
            config = BacktestRequest(**backtest.user_inputs)
            prices_df, ratios_df, companies = self._load_data(config.start_date, config.end_date)

            if prices_df.empty:
                raise ValueError("No price data available for the given date range")

            engine = BacktestEngine(prices_df, ratios_df, companies)
            results = engine.run(config)

            backtest.results = results
            backtest.status = "completed"
            backtest.completed_at = datetime.utcnow()

            self._save_holdings(backtest.id, results.get("holdings", []))

        except Exception as e:
            logger.exception("Backtest %d failed", backtest_id)
            backtest.status = "failed"
            backtest.error_message = str(e)

        self.db.commit()
        self.db.refresh(backtest)
        return backtest

    def _load_data(self, start_date, end_date) -> tuple[pd.DataFrame, pd.DataFrame, list[dict]]:
        companies = self.db.query(Company).all()
        company_list = [
            {"ticker": c.ticker, "company_name": c.company_name, "sector": c.sector}
            for c in companies
        ]
        company_ids = [c.id for c in companies]
        ticker_map = {c.id: c.ticker for c in companies}

        prices = (
            self.db.query(StockPrice)
            .filter(
                StockPrice.company_id.in_(company_ids),
                StockPrice.date >= start_date,
                StockPrice.date <= end_date,
            )
            .all()
        )
        prices_df = pd.DataFrame([
            {
                "ticker": ticker_map[p.company_id],
                "date": p.date,
                "close": p.close,
                "open": p.open,
                "high": p.high,
                "low": p.low,
                "volume": p.volume,
            }
            for p in prices
        ])

        ratios = (
            self.db.query(Ratio)
            .filter(Ratio.company_id.in_(company_ids), Ratio.as_of_date <= end_date)
            .all()
        )
        ratios_df = pd.DataFrame([
            {
                "ticker": ticker_map[r.company_id],
                "as_of_date": r.as_of_date,
                "roe": r.roe,
                "roce": r.roce,
                "pe": r.pe,
                "pb": r.pb,
                "eps": r.eps,
                "pat": r.pat,
                "market_cap": r.market_cap,
                "debt_equity": r.debt_equity,
            }
            for r in ratios
        ])

        return prices_df, ratios_df, company_list

    def _save_holdings(self, backtest_id: int, holdings: list[dict]) -> None:
        self.db.query(PortfolioHolding).filter(PortfolioHolding.backtest_id == backtest_id).delete()
        for h in holdings:
            entry = h.get("entry_date")
            exit_d = h.get("exit_date")
            self.db.add(
                PortfolioHolding(
                    backtest_id=backtest_id,
                    stock=h["stock"],
                    weight=h["weight"],
                    entry_date=entry if entry else None,
                    exit_date=exit_d if exit_d else None,
                    returns=h.get("returns"),
                )
            )
        self.db.commit()

    def get_backtest(self, backtest_id: int) -> Backtest | None:
        return self.db.query(Backtest).filter(Backtest.id == backtest_id).first()
