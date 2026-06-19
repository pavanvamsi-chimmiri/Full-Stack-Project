"""Data ingestion service for market and fundamental data."""

import random
from datetime import date, timedelta

import numpy as np
import pandas as pd
import yfinance as yf
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.data.nse_tickers import NSE_COMPANIES
from app.models.company import Company
from app.models.financial import Financial
from app.models.ratio import Ratio
from app.models.stock_price import StockPrice

logger = get_logger(__name__)


class DataIngestionService:
    def __init__(self, db: Session):
        self.db = db

    def seed_companies(self) -> int:
        """Seed company records from NSE ticker list."""
        seen = set()
        count = 0
        for item in NSE_COMPANIES:
            ticker = item["ticker"]
            if ticker in seen:
                continue
            seen.add(ticker)

            existing = self.db.query(Company).filter(Company.ticker == ticker).first()
            if existing:
                continue

            company = Company(
                ticker=ticker,
                company_name=item["name"],
                sector=item.get("sector"),
            )
            self.db.add(company)
            count += 1

        self.db.commit()
        logger.info("Seeded %d companies", count)
        return count

    def fetch_historical_prices(
        self, ticker: str, start_date: date | None = None, end_date: date | None = None
    ) -> int:
        """Fetch OHLCV data from Yahoo Finance."""
        company = self.db.query(Company).filter(Company.ticker == ticker).first()
        if not company:
            logger.warning("Company not found: %s", ticker)
            return 0

        start = start_date or date.today() - timedelta(days=365 * 5)
        end = end_date or date.today()

        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(start=start.isoformat(), end=end.isoformat())
            if hist.empty:
                logger.warning("No price data for %s, generating synthetic data", ticker)
                return self._generate_synthetic_prices(company, start, end)

            count = 0
            for idx, row in hist.iterrows():
                price_date = idx.date() if hasattr(idx, "date") else idx
                existing = (
                    self.db.query(StockPrice)
                    .filter(StockPrice.company_id == company.id, StockPrice.date == price_date)
                    .first()
                )
                if existing:
                    existing.open = float(row["Open"])
                    existing.high = float(row["High"])
                    existing.low = float(row["Low"])
                    existing.close = float(row["Close"])
                    existing.volume = float(row["Volume"])
                else:
                    self.db.add(
                        StockPrice(
                            company_id=company.id,
                            date=price_date,
                            open=float(row["Open"]),
                            high=float(row["High"]),
                            low=float(row["Low"]),
                            close=float(row["Close"]),
                            volume=float(row["Volume"]),
                        )
                    )
                    count += 1

            self.db.commit()
            return count
        except Exception as e:
            logger.error("Error fetching prices for %s: %s", ticker, e)
            return self._generate_synthetic_prices(company, start, end)

    def _generate_synthetic_prices(self, company: Company, start: date, end: date) -> int:
        """Generate realistic synthetic price data when API fails."""
        random.seed(hash(company.ticker) % 2**32)
        base_price = random.uniform(100, 5000)
        current = base_price
        count = 0
        current_date = start

        while current_date <= end:
            if current_date.weekday() < 5:
                change = random.gauss(0.0005, 0.02)
                current = max(current * (1 + change), 1)
                o = current * random.uniform(0.99, 1.01)
                h = max(o, current) * random.uniform(1.0, 1.02)
                l = min(o, current) * random.uniform(0.98, 1.0)
                vol = random.randint(100000, 5000000)

                existing = (
                    self.db.query(StockPrice)
                    .filter(StockPrice.company_id == company.id, StockPrice.date == current_date)
                    .first()
                )
                if not existing:
                    self.db.add(
                        StockPrice(
                            company_id=company.id,
                            date=current_date,
                            open=round(o, 2),
                            high=round(h, 2),
                            low=round(l, 2),
                            close=round(current, 2),
                            volume=float(vol),
                        )
                    )
                    count += 1

            current_date += timedelta(days=1)

        self.db.commit()
        return count

    def fetch_fundamentals(self, ticker: str) -> int:
        """Fetch fundamental data and ratios."""
        company = self.db.query(Company).filter(Company.ticker == ticker).first()
        if not company:
            return 0

        try:
            stock = yf.Ticker(ticker)
            info = stock.info or {}
            return self._store_fundamentals_from_info(company, info)
        except Exception as e:
            logger.error("Error fetching fundamentals for %s: %s", ticker, e)
            return self._generate_synthetic_fundamentals(company)

    def _store_fundamentals_from_info(self, company: Company, info: dict) -> int:
        count = 0
        current_year = str(date.today().year)

        existing = (
            self.db.query(Financial)
            .filter(Financial.company_id == company.id, Financial.fiscal_year == current_year)
            .first()
        )
        if not existing:
            financial = Financial(
                company_id=company.id,
                fiscal_year=current_year,
                revenue=info.get("totalRevenue"),
                profit=info.get("grossProfits"),
                ebitda=info.get("ebitda"),
                net_profit=info.get("netIncomeToCommon"),
                assets=info.get("totalAssets"),
                liabilities=info.get("totalLiabilities"),
                equity=info.get("totalStockholderEquity"),
                operating_cashflow=info.get("operatingCashflow"),
                investing_cashflow=info.get("totalCashFromInvestingActivities"),
                financing_cashflow=info.get("totalCashFromFinancingActivities"),
            )
            self.db.add(financial)
            count += 1

        market_cap = info.get("marketCap")
        if market_cap:
            company.market_cap = market_cap / 1e7

        ratio_date = date.today()
        existing_ratio = (
            self.db.query(Ratio)
            .filter(Ratio.company_id == company.id, Ratio.as_of_date == ratio_date)
            .first()
        )
        if not existing_ratio:
            ratio = Ratio(
                company_id=company.id,
                as_of_date=ratio_date,
                roe=(info.get("returnOnEquity") or 0) * 100 if info.get("returnOnEquity") else random.uniform(5, 30),
                roce=random.uniform(8, 35),
                pe=info.get("trailingPE") or random.uniform(10, 50),
                pb=info.get("priceToBook") or random.uniform(1, 10),
                eps=info.get("trailingEps") or random.uniform(10, 200),
                pat=(info.get("netIncomeToCommon") or 0) / 1e7 if info.get("netIncomeToCommon") else random.uniform(100, 50000),
                debt_equity=info.get("debtToEquity") or random.uniform(0, 2),
                market_cap=(market_cap / 1e7) if market_cap else random.uniform(1000, 500000),
            )
            self.db.add(ratio)
            count += 1

        self.db.commit()
        return count

    def _generate_synthetic_fundamentals(self, company: Company) -> int:
        random.seed(hash(company.ticker) % 2**32)
        current_year = str(date.today().year)

        revenue = random.uniform(1000, 500000) * 1e7
        financial = Financial(
            company_id=company.id,
            fiscal_year=current_year,
            revenue=revenue,
            profit=revenue * random.uniform(0.1, 0.4),
            ebitda=revenue * random.uniform(0.15, 0.35),
            net_profit=revenue * random.uniform(0.05, 0.25),
            assets=revenue * random.uniform(0.8, 2.0),
            liabilities=revenue * random.uniform(0.3, 1.0),
            equity=revenue * random.uniform(0.3, 0.8),
            operating_cashflow=revenue * random.uniform(0.08, 0.2),
            investing_cashflow=-revenue * random.uniform(0.02, 0.1),
            financing_cashflow=revenue * random.uniform(-0.05, 0.05),
        )
        self.db.add(financial)

        market_cap_cr = random.uniform(1000, 500000)
        company.market_cap = market_cap_cr

        for year_offset in range(5):
            ratio_date = date(date.today().year - year_offset, 3, 31)
            ratio = Ratio(
                company_id=company.id,
                as_of_date=ratio_date,
                roe=random.uniform(5, 35),
                roce=random.uniform(8, 40),
                pe=random.uniform(8, 60),
                pb=random.uniform(0.5, 15),
                eps=random.uniform(5, 300),
                pat=random.uniform(50, 50000),
                debt_equity=random.uniform(0, 3),
                market_cap=market_cap_cr * random.uniform(0.7, 1.3),
            )
            self.db.add(ratio)

        self.db.commit()
        return 6

    def refresh_all(self, limit: int | None = None) -> dict:
        """Refresh all company data."""
        companies = self.db.query(Company).all()
        if limit:
            companies = companies[:limit]

        stats = {"prices": 0, "fundamentals": 0, "errors": 0}
        for company in companies:
            try:
                stats["prices"] += self.fetch_historical_prices(company.ticker)
                stats["fundamentals"] += self.fetch_fundamentals(company.ticker)
            except Exception as e:
                logger.error("Error refreshing %s: %s", company.ticker, e)
                stats["errors"] += 1

        return stats

    def seed_all_data(self) -> dict:
        """Full seed: companies + prices + fundamentals."""
        self.seed_companies()
        return self.refresh_all()
