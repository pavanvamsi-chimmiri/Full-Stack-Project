#!/usr/bin/env python3
"""Seed sample data for the equity backtesting framework."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import init_db, SessionLocal
from app.core.logging import setup_logging, get_logger
from app.models.company import Company
from app.services.data_ingestion import DataIngestionService

setup_logging()
logger = get_logger(__name__)


def main():
    logger.info("Initializing database...")
    init_db()

    db = SessionLocal()
    try:
        service = DataIngestionService(db)
        logger.info("Seeding companies...")
        service.seed_companies()

        companies = db.query(Company).all()
        logger.info("Found %d companies, fetching data...", len(companies))

        stats = service.refresh_all()
        logger.info("Seed complete: %s", stats)
    finally:
        db.close()


if __name__ == "__main__":
    main()
