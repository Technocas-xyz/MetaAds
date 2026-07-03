"""
Ad schemas — aligned with frontend fixture (src/api/_fixtures/ads.js).

Key alignment decisions:
- Top-level hook_type, hook_text, angle, angle_detail, offer_type,
  confidence_score, status — for table rendering speed.
- Nested ai_insights with {value, confidence} pairs — for detail view.
- running_since_days and running_since_date — computed at response time.
"""

from datetime import datetime, timezone
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


# ---------- Request bodies ----------

class AdCreate(BaseModel):
    competitor_id: UUID
    platform: str = Field(..., max_length=20)
    headline: Optional[str] = None
    primary_text: Optional[str] = None
    cta: Optional[str] = Field(default=None, max_length=100)
    ad_url: Optional[str] = None
    landing_url: Optional[str] = None
    media_url: Optional[str] = None
    is_video: bool = False
    ad_library_id: Optional[str] = Field(default=None, max_length=100)
    variants: int = 0
    notes: Optional[str] = None


class AdUpdate(BaseModel):
    headline: Optional[str] = None
    primary_text: Optional[str] = None
    cta: Optional[str] = None
    ad_url: Optional[str] = None
    landing_url: Optional[str] = None
    media_url: Optional[str] = None
    is_video: Optional[bool] = None
    status: Optional[str] = None
    variants: Optional[int] = None
    notes: Optional[str] = None


# ---------- Nested response objects ----------

class CompetitorRef(BaseModel):
    id: UUID
    name: str
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    tier: int
    region: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InsightField(BaseModel):
    """Wraps a single AI insight value with its confidence."""
    value: Optional[str] = None
    confidence: float = 0.0


class AIInsights(BaseModel):
    """Per-field insights with confidence scores. Matches frontend shape."""
    hook: InsightField = Field(default_factory=InsightField)
    hook_type: InsightField = Field(default_factory=InsightField)
    angle: InsightField = Field(default_factory=InsightField)
    offer_type: InsightField = Field(default_factory=InsightField)
    offer_value: InsightField = Field(default_factory=InsightField)
    creative_format: InsightField = Field(default_factory=InsightField)
    product_line: InsightField = Field(default_factory=InsightField)
    audience_type: InsightField = Field(default_factory=InsightField)
    usp_detected: InsightField = Field(default_factory=InsightField)
    overall: float = 0.0


# ---------- Main ad response ----------

class AdResponse(BaseModel):
    """Single ad — frontend-aligned shape."""
    id: UUID
    competitor: CompetitorRef
    platform: str

    # Denormalized top-level fields (for table speed; mirror ai_insights)
    hook_type: Optional[str] = None
    hook_text: Optional[str] = None
    angle: Optional[str] = None
    angle_detail: Optional[str] = None
    offer_type: Optional[str] = None
    confidence_score: float = 0.0
    status: str

    # Ad content
    headline: Optional[str] = None
    primary_text: Optional[str] = None
    cta: Optional[str] = None
    ad_url: Optional[str] = None
    landing_url: Optional[str] = None
    media_url: Optional[str] = None
    is_video: bool = False
    variants: int = 0

    # Timing — computed for frontend
    running_since_days: int = 0
    running_since_date: Optional[str] = None
    captured_at: datetime
    last_seen: datetime
    first_seen: datetime

    notes: Optional[str] = None

    # Full AI analysis
    ai_insights: Optional[AIInsights] = None
    ai_notes: Optional[str] = None
    analysis: Optional[dict] = None  # {summary, suggested_angle, suggested_hook}
    evidence: Optional[dict] = None

    # Bookkeeping
    ad_library_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------- Pagination ----------

class PaginationMeta(BaseModel):
    total: int
    page: int
    per_page: int
    total_pages: int


class AdListResponse(BaseModel):
    data: List[AdResponse]
    meta: PaginationMeta


# ---------- Summary (frontend-aligned) ----------

class AdsSummary(BaseModel):
    total: int
    analyzed: int
    analyzed_pct: float
    pending: int
    pending_pct: float
    low_confidence: int
    low_conf_pct: float
    this_week: int