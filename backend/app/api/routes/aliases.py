"""Canonical API aliases: POST /backtest, GET /results, GET /stocks."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.backtest import BacktestRequest, BacktestResponse
from app.services.backtest_service import BacktestService

router = APIRouter(tags=["Backtest API"])


@router.post("/backtest", response_model=BacktestResponse)
def post_backtest(
    config: BacktestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run a backtest synchronously. Alias for POST /backtest/run/sync."""
    service = BacktestService(db)
    backtest = service.create_backtest(config, current_user)
    backtest = service.run_backtest(backtest.id)
    return BacktestResponse.model_validate(backtest)


@router.get("/results")
def get_results(
    backtest_id: int = Query(..., description="Backtest ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get backtest results. Alias for GET /backtest/results/{id}."""
    service = BacktestService(db)
    backtest = service.get_backtest(backtest_id, user_id=current_user.id)
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
        "portfolio_log": results.get("holdings", []),
        "user_inputs": backtest.user_inputs,
    }
