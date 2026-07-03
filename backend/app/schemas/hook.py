"""
Hook library schemas — aligned with frontend fixture (src/api/_fixtures/hooks.js).
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ---------- Summary ----------

class TopHookPerformer(BaseModel):
    text: str
    avg_score: float


class TrendingHook(BaseModel):
    text: str
    pct: float


class HooksSummary(BaseModel):
    total_unique: int = 0
    total_mentions: int = 0
    mentions_trend: float = 0.0
    top_hook_type: Optional[str] = None
    top_hook_type_pct: float = 0.0
    top_performing_hook: Optional[TopHookPerformer] = None
    trending_hook: Optional[TrendingHook] = None


# ---------- Distribution + performance ----------

class HookTypeDistItem(BaseModel):
    name: str
    value: int
    pct: float


class HookPerformanceItem(BaseModel):
    type: str
    avg_score: float
    color: str


# ---------- Trend ----------

class HookTrendPoint(BaseModel):
    """One point on the trend line — date + counts per hook type."""
    date: str
    Pain: int = 0
    Benefit: int = 0
    Curiosity: int = 0
    Urgency: int = 0


# ---------- Detailed table row ----------

class HookCompetitorRef(BaseModel):
    id: str
    name: str
    initials: str


class HookRow(BaseModel):
    id: str
    rank: int
    text: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    offer_type: Optional[str] = None
    mentions: int = 0
    avg_confidence: float = 0.0
    trending: float = 0.0
    competitors: List[HookCompetitorRef] = Field(default_factory=list)
    extra_competitors: int = 0
    example_ads: List[str] = Field(default_factory=list)
    first_seen: Optional[str] = None
    related_angles: List[str] = Field(default_factory=list)