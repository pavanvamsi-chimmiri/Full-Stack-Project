from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.backtest import BacktestRequest, BacktestResponse, BacktestRunResponse
from app.services.backtest_service import BacktestService
from app.tasks.backtest_tasks import run_backtest_async

router = APIRouter(prefix="/backtest", tags=["Backtest"])


@router.post("/run", response_model=BacktestRunResponse)
def run_backtest(config: BacktestRequest, db: Session = Depends(get_db)):
    service = BacktestService(db)
    backtest = service.create_backtest(config)
    run_backtest_async.delay(backtest.id)
    return BacktestRunResponse(
        id=backtest.id,
        status="pending",
        message="Backtest queued for execution",
    )


@router.post("/run/sync", response_model=BacktestResponse)
def run_backtest_sync(config: BacktestRequest, db: Session = Depends(get_db)):
    """Run backtest synchronously (useful for development/testing)."""
    service = BacktestService(db)
    backtest = service.create_backtest(config)
    backtest = service.run_backtest(backtest.id)
    return BacktestResponse.model_validate(backtest)


@router.get("/{backtest_id}", response_model=BacktestResponse)
def get_backtest(backtest_id: int, db: Session = Depends(get_db)):
    service = BacktestService(db)
    backtest = service.get_backtest(backtest_id)
    if not backtest:
        raise HTTPException(status_code=404, detail="Backtest not found")
    return BacktestResponse.model_validate(backtest)


@router.get("/results/{backtest_id}")
def get_backtest_results(backtest_id: int, db: Session = Depends(get_db)):
    service = BacktestService(db)
    backtest = service.get_backtest(backtest_id)
    if not backtest:
        raise HTTPException(status_code=404, detail="Backtest not found")
    if backtest.status != "completed":
        raise HTTPException(status_code=400, detail=f"Backtest status: {backtest.status}")

    results = backtest.results or {}
    return {
        "id": backtest.id,
        "name": backtest.name,
        "status": backtest.status,
        "analytics": results.get("analytics", {}),
        "holdings": results.get("holdings", []),
        "top_winners": results.get("top_winners", []),
        "top_losers": results.get("top_losers", []),
        "transactions": results.get("transactions", []),
        "user_inputs": backtest.user_inputs,
    }
