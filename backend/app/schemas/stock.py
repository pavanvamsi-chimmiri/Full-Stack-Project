from datetime import date, datetime

from pydantic import BaseModel


class CompanyResponse(BaseModel):
    id: int
    ticker: str
    company_name: str
    sector: str | None
    market_cap: float | None

    model_config = {"from_attributes": True}


class StockPriceResponse(BaseModel):
    id: int
    company_id: int
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: float

    model_config = {"from_attributes": True}


class StockListResponse(BaseModel):
    companies: list[CompanyResponse]
    total: int
    page: int
    page_size: int
