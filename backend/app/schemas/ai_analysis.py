"""
AI Analysis page schemas — aligned with frontend fixture (src/api/_fixtures/ai-analysis.js)
and API client (src/api/aiAnalysis.js).

Endpoints served:
  GET /api/ai-analysis/summary
  GET /api/ai-analysis/timeline
  GET /api/ai-analysis/angles
  GET /api/ai-analysis/confidence-dist
  GET /api/ai-analysis/winning-ads
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


# ── /summary ──────────────────────────────────────────────────────────────────

class AISummary(BaseModel):
    total_analyzed: int = 0
    winning_ads: int = 0
    winning_ads_trend: float = 0.0       # placeholder — no historical snapshots yet
    avg_confidence: float = 0.0
    avg_conf_trend: float = 0.0          # placeholder
    engagement_rate: float = 0.0         # not available from FB Ad Library — always 0.0
    engagement_trend: float = 0.0        # placeholder
    roas_est: float = 0.0                # not available from FB Ad Library — always 0.0
    roas_trend: float = 0.0              # placeholder


# ── /timeline ─────────────────────────────────────────────────────────────────

class TimelinePoint(BaseModel):
    """One day on the Performance Over Time line chart."""
    date: str                            # e.g. "May 02"
    winning_ads: int = 0
    engagement_rate: float = 0.0         # always 0.0 — no platform metrics
    roas: float = 0.0                    # always 0.0 — no platform metrics


# ── /angles ───────────────────────────────────────────────────────────────────

class AngleDonutItem(BaseModel):
    """One slice of the Top Performing Angles donut chart."""
    name: str
    value: int
    pct: float


# ── /confidence-dist ──────────────────────────────────────────────────────────

class ConfidenceDistItem(BaseModel):
    """One bar in the Confidence Score Distribution bar chart."""
    range: str                           # e.g. "0–20"
    label: str                           # e.g. "Very Low"
    count: int
    color: str                           # hex color matching frontend fixture


# ── /winning-ads ──────────────────────────────────────────────────────────────

class WinningAdCompetitor(BaseModel):
    id: UUID
    name: str
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    tier: int
    region: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WinningAdInsightField(BaseModel):
    value: Optional[str] = None
    confidence: float = 0.0


class WinningAdAIInsights(BaseModel):
    hook: WinningAdInsightField = Field(default_factory=WinningAdInsightField)
    hook_type: WinningAdInsightField = Field(default_factory=WinningAdInsightField)
    angle: WinningAdInsightField = Field(default_factory=WinningAdInsightField)
    offer_type: WinningAdInsightField = Field(default_factory=WinningAdInsightField)
    offer_value: WinningAdInsightField = Field(default_factory=WinningAdInsightField)
    creative_format: WinningAdInsightField = Field(default_factory=WinningAdInsightField)
    product_line: WinningAdInsightField = Field(default_factory=WinningAdInsightField)
    audience_type: WinningAdInsightField = Field(default_factory=WinningAdInsightField)
    usp_detected: WinningAdInsightField = Field(default_factory=WinningAdInsightField)
    overall: float = 0.0


class WinningAdResponse(BaseModel):
    """
    Full AdResponse shape + rank + est_roas + est_engagement.
    Matches the fixture: winningAds = adsList.data.map((ad, i) => ({ ...ad, rank, est_roas, est_engagement }))
    """
    # Identity
    id: UUID
    rank: int

    # Competitor ref
    competitor: WinningAdCompetitor

    # Platform + top-level AI fields (denormalized for table speed)
    platform: str
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

    # Timing
    running_since_days: int = 0
    running_since_date: Optional[str] = None
    captured_at: datetime
    last_seen: datetime
    first_seen: datetime

    notes: Optional[str] = None

    # Full AI insights (nested)
    ai_insights: Optional[WinningAdAIInsights] = None
    ai_notes: Optional[str] = None
    analysis: Optional[dict] = None

    # Estimated metrics — always 0.0 (not available from FB Ad Library)
    est_roas: float = 0.0
    est_engagement: float = 0.0

    # Bookkeeping
    ad_library_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
