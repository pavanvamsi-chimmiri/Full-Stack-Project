from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "equity_backtest",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    beat_schedule={
        "refresh-market-data-daily": {
            "task": "app.tasks.data_tasks.refresh_all_market_data",
            "schedule": crontab(hour=6, minute=30),
        },
        "refresh-fundamentals-weekly": {
            "task": "app.tasks.data_tasks.refresh_all_fundamentals",
            "schedule": crontab(hour=7, minute=0, day_of_week="sunday"),
        },
    },
)

celery_app.autodiscover_tasks(["app.tasks"])
