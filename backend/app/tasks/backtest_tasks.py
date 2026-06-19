from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.backtest_service import BacktestService


@celery_app.task(name="app.tasks.backtest_tasks.run_backtest_async")
def run_backtest_async(backtest_id: int):
    db = SessionLocal()
    try:
        service = BacktestService(db)
        backtest = service.run_backtest(backtest_id)
        return {"id": backtest.id, "status": backtest.status}
    finally:
        db.close()
