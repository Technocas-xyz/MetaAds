"""
Review Queue schemas — aligned with frontend fixture (src/api/_fixtures/review.js).
"""

from datetime import datetime
from typing import List, Optional, Dict
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


# ---------- Summary ----------

class ReasonBreakdown(BaseModel):
    count: int = 0
    pct: float = 0.0


class ReviewQueueSummary(BaseModel):
    total: int = 0
    low_confidence: ReasonBreakdown = Field(default_factory=ReasonBreakdown)
    missing_info: ReasonBreakdown = Field(default_factory=ReasonBreakdown)
    flagged: ReasonBreakdown = Field(default_factory=ReasonBreakdown)
    assigned_to_me: int = 0


# ---------- Nested data shapes (matching fixture) ----------

class ReviewAdInfo(BaseModel):
    id: str
    thumbnail: Optional[str] = None
    media_url: Optional[str] = None
    platform: Optional[str] = None
    is_video: bool = False
    headline: Optional[str] = None
    primary_text: Optional[str] = None
    cta: Optional[str] = None
    ad_url: Optional[str] = None
    landing_page: Optional[str] = None
    ad_library_id: Optional[str] = None
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    duration: Optional[str] = None


class ReviewCompetitor(BaseModel):
    id: str
    name: str
    tier: int
    region: Optional[str] = None


class InsightField(BaseModel):
    value: Optional[str] = None
    confidence: float = 0.0


class ReviewAIInsights(BaseModel):
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


class AssignedUser(BaseModel):
    id: str
    name: str
    initials: str
    color: str = "#6366F1"


# ---------- Main review item ----------

class ReviewItem(BaseModel):
    id: str
    ad: ReviewAdInfo
    competitor: ReviewCompetitor
    ai_insights: ReviewAIInsights = Field(default_factory=ReviewAIInsights)
    evidence: Optional[Dict] = None
    ai_notes: Optional[str] = None
    reason: str  # "low_confidence" | "missing_info" | "flagged_by_rule"
    reason_label: str
    reason_detail: Optional[str] = None
    confidence_score: float = 0.0
    priority: str  # "High" | "Medium" | "Low"
    assigned_to: Optional[AssignedUser] = None
    added_at: datetime
    status: str = "pending"

    model_config = ConfigDict(from_attributes=True)


class ReviewItemDetail(ReviewItem):
    """Used by GET /review-queue/{id} — adds nav fields."""
    position: int = 0
    total: int = 0
    prev_id: Optional[str] = None
    next_id: Optional[str] = None


# ---------- Pagination ----------

class PaginationMeta(BaseModel):
    total: int
    page: int
    per_page: int
    total_pages: int


class ReviewQueueList(BaseModel):
    data: List[ReviewItem]
    meta: PaginationMeta


# ---------- Action payloads ----------

class ApproveRequest(BaseModel):
    notes: Optional[str] = None


class UpdateReviewRequest(BaseModel):
    hook_type: Optional[str] = None
    angle: Optional[str] = None
    offer_type: Optional[str] = None
    notes: Optional[str] = None


class BulkActionRequest(BaseModel):
    ids: List[str]


class BulkReassignRequest(BaseModel):
    ids: List[str]
    userId: str


class ActionResult(BaseModel):
    id: str
    status: str


class BulkResult(BaseModel):
    approved: int = 0
    queued: int = 0
    reassigned: int = 0