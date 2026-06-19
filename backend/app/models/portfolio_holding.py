from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    backtest_id: Mapped[int] = mapped_column(ForeignKey("backtests.id", ondelete="CASCADE"), nullable=False)
    stock: Mapped[str] = mapped_column(String(20), nullable=False)
    weight: Mapped[float] = mapped_column(Float, nullable=False)
    entry_date: Mapped[date | None] = mapped_column(Date)
    exit_date: Mapped[date | None] = mapped_column(Date)
    returns: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    backtest = relationship("Backtest", back_populates="holdings")

    __table_args__ = (
        Index("ix_portfolio_holdings_backtest_id", "backtest_id"),
        Index("ix_portfolio_holdings_stock", "stock"),
    )
