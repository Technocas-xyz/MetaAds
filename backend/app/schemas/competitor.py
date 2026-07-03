"""
Competitor schemas — aligned with frontend fixture (src/api/_fixtures/competitors.js).
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


# ---------- Request bodies ----------

class CompetitorCreate(BaseModel):
    name: str = Field(..., max_length=120)
    meta_ad_library_url: str = Field(..., description="Full Meta Ad Library URL")
    page_id: Optional[str] = None
    query: Optional[str] = None
    query_type: str = Field(default="page_id", max_length=20)
    domain: str = Field(default="", max_length=255)
    logo_url: Optional[str] = None
    niches: List[str] = Field(default_factory=list)
    priority_tier: str = Field(default="Medium", max_length=20)
    region: Optional[str] = Field(default="US", max_length=10)
    tier: int = Field(default=2, ge=1, le=3)


class CompetitorUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    niches: Optional[List[str]] = None
    priority_tier: Optional[str] = None
    status: Optional[str] = None
    region: Optional[str] = None
    tier: Optional[int] = None


# ---------- Stats (per-competitor) ----------

class CompetitorStats(BaseModel):
    """Stats for one competitor — frontend-aligned."""
    total_ads: int = 0
    total_ads_trend: float = 0.0
    total_ads_trend_up: bool = True

    existing_ads: int = 0
    existing_ads_pct: float = 0.0
    existing_ads_trend: float = 0.0

    removed_ads: int = 0
    removed_ads_pct: float = 0.0

    avg_duration: float = 0.0
    avg_duration_prev: float = 0.0

    running_7_plus: int = 0
    running_7_plus_pct: float = 0.0

    winning_ads: int = 0
    winning_ads_pct: float = 0.0

    variants: int = 0
    last_activity: Optional[datetime] = None


# ---------- Response shapes ----------

class CompetitorResponse(BaseModel):
    id: UUID
    name: str
    domain: str
    logo_url: Optional[str] = None
    niches: List[str] = Field(default_factory=list)
    priority_tier: str
    status: str
    region: Optional[str] = None
    tier: int
    stats: CompetitorStats = Field(default_factory=CompetitorStats)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Aggregate summary (across all competitors) ----------

class CompetitorsSummary(BaseModel):
    """Top KPI cards on Competitors page — frontend-aligned."""
    total_ads_analyzed: int = 0
    total_ads_trend: float = 0.0
    existing_ads: int = 0
    existing_ads_pct: float = 0.0
    removed_ads: int = 0
    removed_ads_pct: float = 0.0
    running_7_plus: int = 0
    running_7_plus_pct: float = 0.0
    winning_ads: int = 0
    winning_ads_pct: float = 0.0
    avg_duration: float = 0.0


# Backwards-compat alias for old imports
CompetitorSummary = CompetitorsSummary