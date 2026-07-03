"""
Angle library schemas — aligned with frontend fixture (src/api/_fixtures/angles.js).
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ---------- Summary ----------

class TopAnglePerformer(BaseModel):
    name: str
    avg_score: float


class TrendingAngle(BaseModel):
    name: str
    pct: float


class AnglesSummary(BaseModel):
    total_unique: int = 0
    total_mentions: int = 0
    mentions_trend: float = 0.0
    top_angle: Optional[str] = None
    top_angle_pct: float = 0.0
    top_performing_angle: Optional[TopAnglePerformer] = None
    trending_angle: Optional[TrendingAngle] = None


# ---------- Distribution + performance ----------

class AngleTypeDistItem(BaseModel):
    name: str
    value: int
    pct: float


class AnglePerformanceItem(BaseModel):
    name: str
    avg_score: float
    color: str


# ---------- Trend ----------

class AngleTrendPoint(BaseModel):
    date: str
    Price: int = 0
    Quality: int = 0
    Speed: int = 0
    Benefit: int = 0


# ---------- Detailed table row ----------

class AngleCompetitorRef(BaseModel):
    id: str
    name: str
    initials: str


class AngleRow(BaseModel):
    id: str
    rank: int
    name: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    mentions: int = 0
    avg_confidence: float = 0.0
    trending: float = 0.0
    competitors: List[AngleCompetitorRef] = Field(default_factory=list)
    extra_competitors: int = 0
    example_ads: List[str] = Field(default_factory=list)
    first_seen: Optional[str] = None
    related_hooks: List[str] = Field(default_factory=list)
    offer_type: Optional[str] = None