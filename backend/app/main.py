import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.routes import backtest, dashboard, data, export, financials, stocks
from app.core.config import get_settings
from app.core.database import init_db
from app.core.logging import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)
settings = get_settings()

limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT])


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    init_db()
    yield
    logger.info("Shutting down application")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-ready Equity Backtesting Framework for Indian markets",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info("%s %s - %d (%.3fs)", request.method, request.url.path, response.status_code, duration)
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(stocks.router, prefix="/api/v1")
app.include_router(financials.router, prefix="/api/v1")
app.include_router(backtest.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")
app.include_router(data.router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}
