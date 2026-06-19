from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.export_service import ExportService
from app.services.backtest_service import BacktestService

router = APIRouter(prefix="/export", tags=["Export"])


def _get_backtest_or_404(backtest_id: int, db: Session):
    service = BacktestService(db)
    backtest = service.get_backtest(backtest_id)
    if not backtest:
        raise HTTPException(status_code=404, detail="Backtest not found")
    if backtest.status != "completed":
        raise HTTPException(status_code=400, detail="Backtest not completed")
    return backtest


@router.get("/csv")
def export_csv(backtest_id: int = Query(...), db: Session = Depends(get_db)):
    backtest = _get_backtest_or_404(backtest_id, db)
    content = ExportService.export_csv(backtest)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=backtest_{backtest_id}.csv"},
    )


@router.get("/excel")
def export_excel(backtest_id: int = Query(...), db: Session = Depends(get_db)):
    backtest = _get_backtest_or_404(backtest_id, db)
    content = ExportService.export_excel(backtest)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=backtest_{backtest_id}.xlsx"},
    )


@router.get("/pdf")
def export_pdf(backtest_id: int = Query(...), db: Session = Depends(get_db)):
    backtest = _get_backtest_or_404(backtest_id, db)
    content = ExportService.export_pdf(backtest)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=backtest_{backtest_id}.pdf"},
    )
