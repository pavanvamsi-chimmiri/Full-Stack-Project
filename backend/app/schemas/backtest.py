from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class RebalanceFrequency(str, Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    HALF_YEARLY = "half_yearly"
    YEARLY = "yearly"


class PositionSizing(str, Enum):
    EQUAL_WEIGHT = "equal_weight"
    MARKET_CAP_WEIGHT = "market_cap_weight"
    METRIC_WEIGHT = "metric_weight"


class FilterOperator(str, Enum):
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    BETWEEN = "between"


class FilterConfig(BaseModel):
    field: str = Field(..., description="Field to filter: market_cap, roce, pat, roe, pe, pb")
    operator: FilterOperator
    value: float | None = None
    min_value: float | None = None
    max_value: float | None = None

    @field_validator("field")
    @classmethod
    def validate_field(cls, v: str) -> str:
        allowed = {"market_cap", "roce", "pat", "roe", "pe", "pb", "debt_equity", "eps"}
        if v not in allowed:
            raise ValueError(f"Invalid filter field: {v}. Allowed: {allowed}")
        return v


class RankingMetric(BaseModel):
    metric: str = Field(..., description="Metric: roe, roce, pe, pb, eps, market_cap")
    direction: str = Field(default="desc", description="asc or desc")
    weight: float = Field(default=1.0, ge=0, le=1)

    @field_validator("metric")
    @classmethod
    def validate_metric(cls, v: str) -> str:
        allowed = {"roe", "roce", "pe", "pb", "eps", "market_cap", "pat"}
        if v not in allowed:
            raise ValueError(f"Invalid ranking metric: {v}")
        return v

    @field_validator("direction")
    @classmethod
    def validate_direction(cls, v: str) -> str:
        if v not in ("asc", "desc"):
            raise ValueError("Direction must be 'asc' or 'desc'")
        return v


class BacktestRequest(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    start_date: date
    end_date: date
    rebalance_frequency: RebalanceFrequency = RebalanceFrequency.QUARTERLY
    portfolio_size: int = Field(default=10, ge=1, le=100)
    initial_capital: float = Field(default=100000.0, gt=0)
    position_sizing: PositionSizing = PositionSizing.EQUAL_WEIGHT
    metric_weight_field: str | None = Field(default="roe", description="For metric_weight sizing")
    filters: list[FilterConfig] = Field(default_factory=list)
    ranking_metrics: list[RankingMetric] = Field(default_factory=list)

    @field_validator("end_date")
    @classmethod
    def validate_date_range(cls, v: date, info) -> date:
        start = info.data.get("start_date")
        if start and v <= start:
            raise ValueError("end_date must be after start_date")
        return v

    @field_validator("ranking_metrics")
    @classmethod
    def validate_ranking(cls, v: list[RankingMetric]) -> list[RankingMetric]:
        if not v:
            raise ValueError("At least one ranking metric is required")
        return v


class BacktestResponse(BaseModel):
    id: int
    name: str | None
    status: str
    user_inputs: dict
    results: dict | None
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class BacktestRunResponse(BaseModel):
    id: int
    status: str
    message: str
