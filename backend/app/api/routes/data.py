from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.data_ingestion import DataIngestionService

router = APIRouter(prefix="/data", tags=["Data"])


@router.post("/seed")
def seed_data(db: Session = Depends(get_db)):
    service = DataIngestionService(db)
    stats = service.seed_all_data()
    return {"message": "Data seeding completed", "stats": stats}


@router.post("/refresh")
def refresh_data(limit: int | None = None, db: Session = Depends(get_db)):
    service = DataIngestionService(db)
    stats = service.refresh_all(limit=limit)
    return {"message": "Data refresh completed", "stats": stats}
