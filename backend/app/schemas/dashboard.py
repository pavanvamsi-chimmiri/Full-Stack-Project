from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_backtests: int
    avg_cagr: float | None
    latest_portfolio_value: float | None
    active_strategies: int
    total_companies: int
    last_data_refresh: str | None


class DashboardResponse(BaseModel):
    stats: DashboardStats
    recent_backtests: list[dict]
