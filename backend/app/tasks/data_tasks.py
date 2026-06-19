from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.company import Company
from app.services.data_ingestion import DataIngestionService


@celery_app.task(name="app.tasks.data_tasks.refresh_all_market_data")
def refresh_all_market_data():
    db = SessionLocal()
    try:
        service = DataIngestionService(db)
        return service.refresh_all()
    finally:
        db.close()


@celery_app.task(name="app.tasks.data_tasks.refresh_all_fundamentals")
def refresh_all_fundamentals():
    db = SessionLocal()
    try:
        service = DataIngestionService(db)
        stats = {"fundamentals": 0}
        for company in db.query(Company).all():
            stats["fundamentals"] += service.fetch_fundamentals(company.ticker)
        return stats
    finally:
        db.close()
