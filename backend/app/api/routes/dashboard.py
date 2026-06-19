from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.backtest import Backtest
from app.models.company import Company
from app.schemas.dashboard import DashboardResponse, DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    total_backtests = db.query(Backtest).count()
    completed = db.query(Backtest).filter(Backtest.status == "completed").all()

    cagrs = []
    latest_value = None
    for bt in completed:
        if bt.results and bt.results.get("analytics"):
            cagr = bt.results["analytics"].get("cagr")
            if cagr is not None:
                cagrs.append(cagr)
            final = bt.results["analytics"].get("final_value")
            if final:
                latest_value = final

    avg_cagr = sum(cagrs) / len(cagrs) if cagrs else None
    total_companies = db.query(Company).count()

    recent = (
        db.query(Backtest)
        .order_by(Backtest.created_at.desc())
        .limit(5)
        .all()
    )
    recent_list = []
    for bt in recent:
        entry = {
            "id": bt.id,
            "name": bt.name,
            "status": bt.status,
            "created_at": str(bt.created_at),
        }
        if bt.results and bt.results.get("analytics"):
            entry["cagr"] = bt.results["analytics"].get("cagr")
            entry["final_value"] = bt.results["analytics"].get("final_value")
        recent_list.append(entry)

    return DashboardResponse(
        stats=DashboardStats(
            total_backtests=total_backtests,
            avg_cagr=round(avg_cagr, 2) if avg_cagr else None,
            latest_portfolio_value=latest_value,
            active_strategies=len([b for b in completed if b.results]),
            total_companies=total_companies,
            last_data_refresh=None,
        ),
        recent_backtests=recent_list,
    )
