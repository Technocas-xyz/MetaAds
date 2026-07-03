"""
Offer library schemas — aligned with frontend fixture (src/api/_fixtures/offers.js).
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ---------- Summary ----------

class TrendingOffer(BaseModel):
    text: str
    type: Optional[str] = None
    pct: float


class OffersSummary(BaseModel):
    total_unique: int = 0
    total_mentions: int = 0
    mentions_trend: float = 0.0
    top_offer_type: Optional[str] = None
    top_offer_type_pct: float = 0.0
    discount_heavy_share: float = 0.0
    trending_offer: Optional[TrendingOffer] = None


# ---------- Distribution + performance ----------

class OfferTypeDistItem(BaseModel):
    name: str
    value: int
    pct: float


class OfferPerformanceItem(BaseModel):
    type: str
    avg_score: float
    color: str


# ---------- Trend ----------

class OfferTrendPoint(BaseModel):
    date: str
    Discount: int = 0
    Bundle: int = 0
    Free_Shipping: int = Field(default=0, alias="Free Shipping")
    BOGO: int = 0

    model_config = {"populate_by_name": True}


# ---------- Detailed table row ----------

class OfferCompetitorRef(BaseModel):
    id: str
    name: str
    initials: str


class OfferRow(BaseModel):
    id: str
    rank: int
    text: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    mentions: int = 0
    avg_confidence: float = 0.0
    trending: float = 0.0
    competitors: List[OfferCompetitorRef] = Field(default_factory=list)
    extra_competitors: int = 0
    example_ads: List[str] = Field(default_factory=list)
    first_seen: Optional[str] = None
    related_hooks: List[str] = Field(default_factory=list)