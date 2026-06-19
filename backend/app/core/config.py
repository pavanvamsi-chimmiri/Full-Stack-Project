from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql://backtest:backtest_secret@localhost:5432/equity_backtest"
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    LOG_LEVEL: str = "INFO"
    RATE_LIMIT: str = "100/minute"
    CORS_ORIGINS: str = "http://localhost:3000"
    APP_NAME: str = "Equity Backtesting Framework"
    APP_VERSION: str = "1.0.0"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
