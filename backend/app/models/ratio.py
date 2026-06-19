from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Ratio(Base):
    __tablename__ = "ratios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    as_of_date: Mapped[date] = mapped_column(Date, nullable=False)
    roe: Mapped[float | None] = mapped_column(Float)
    roce: Mapped[float | None] = mapped_column(Float)
    pe: Mapped[float | None] = mapped_column(Float)
    pb: Mapped[float | None] = mapped_column(Float)
    eps: Mapped[float | None] = mapped_column(Float)
    pat: Mapped[float | None] = mapped_column(Float)
    debt_equity: Mapped[float | None] = mapped_column(Float)
    market_cap: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="ratios")

    __table_args__ = (
        UniqueConstraint("company_id", "as_of_date", name="uq_ratios_company_date"),
        Index("ix_ratios_company_date", "company_id", "as_of_date"),
        Index("ix_ratios_roe", "roe"),
        Index("ix_ratios_roce", "roce"),
        Index("ix_ratios_pe", "pe"),
        Index("ix_ratios_market_cap", "market_cap"),
    )
