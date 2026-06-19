from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.company import Company
from app.models.financial import Financial
from app.models.ratio import Ratio
from app.schemas.financial import FinancialListResponse, FinancialResponse, RatioListResponse, RatioResponse

router = APIRouter(tags=["Financials"])


@router.get("/financials", response_model=FinancialListResponse)
def get_financials(
    ticker: str | None = None,
    fiscal_year: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Financial).join(Company)
    if ticker:
        query = query.filter(Company.ticker == ticker)
    if fiscal_year:
        query = query.filter(Financial.fiscal_year == fiscal_year)

    total = query.count()
    financials = query.offset((page - 1) * page_size).limit(page_size).all()
    return FinancialListResponse(
        financials=[FinancialResponse.model_validate(f) for f in financials],
        total=total,
    )


@router.get("/ratios", response_model=RatioListResponse)
def get_ratios(
    ticker: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Ratio).join(Company)
    if ticker:
        query = query.filter(Company.ticker == ticker)

    total = query.count()
    ratios = query.order_by(Ratio.as_of_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return RatioListResponse(
        ratios=[RatioResponse.model_validate(r) for r in ratios],
        total=total,
    )
