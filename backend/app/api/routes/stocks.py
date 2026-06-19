from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.company import Company
from app.models.financial import Financial
from app.models.ratio import Ratio
from app.models.stock_price import StockPrice
from app.schemas.financial import FinancialListResponse, FinancialResponse, RatioListResponse, RatioResponse
from app.schemas.stock import CompanyResponse, StockListResponse, StockPriceResponse

router = APIRouter(prefix="/stocks", tags=["Stocks"])


@router.get("", response_model=StockListResponse)
def get_stocks(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sector: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Company)
    if sector:
        query = query.filter(Company.sector == sector)
    if search:
        query = query.filter(
            Company.ticker.ilike(f"%{search}%") | Company.company_name.ilike(f"%{search}%")
        )
    total = query.count()
    companies = query.offset((page - 1) * page_size).limit(page_size).all()
    return StockListResponse(
        companies=[CompanyResponse.model_validate(c) for c in companies],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{ticker}/prices", response_model=list[StockPriceResponse])
def get_stock_prices(
    ticker: str,
    start_date: str | None = None,
    end_date: str | None = None,
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.ticker == ticker).first()
    if not company:
        raise HTTPException(status_code=404, detail="Stock not found")

    query = db.query(StockPrice).filter(StockPrice.company_id == company.id)
    if start_date:
        query = query.filter(StockPrice.date >= start_date)
    if end_date:
        query = query.filter(StockPrice.date <= end_date)

    prices = query.order_by(StockPrice.date).all()
    return [StockPriceResponse.model_validate(p) for p in prices]
