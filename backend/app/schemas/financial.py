from datetime import date

from pydantic import BaseModel


class FinancialResponse(BaseModel):
    id: int
    company_id: int
    fiscal_year: str
    revenue: float | None
    profit: float | None
    ebitda: float | None
    net_profit: float | None
    assets: float | None
    liabilities: float | None
    equity: float | None
    operating_cashflow: float | None
    investing_cashflow: float | None
    financing_cashflow: float | None

    model_config = {"from_attributes": True}


class RatioResponse(BaseModel):
    id: int
    company_id: int
    as_of_date: date
    roe: float | None
    roce: float | None
    pe: float | None
    pb: float | None
    eps: float | None
    pat: float | None
    debt_equity: float | None
    market_cap: float | None

    model_config = {"from_attributes": True}


class FinancialListResponse(BaseModel):
    financials: list[FinancialResponse]
    total: int


class RatioListResponse(BaseModel):
    ratios: list[RatioResponse]
    total: int
