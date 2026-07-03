"""
Dashboard schemas — aligned with frontend fixture (src/api/_fixtures/dashboard.js).
"""

from typing import Optional
from pydantic import BaseModel


# ---------- Summary KPIs ----------

class DashboardTrends(BaseModel):
    total_ads: float = 0.0
    analyzed_ads: float = 0.0
    pending_analysis: float = 0.0
    low_confidence: float = 0.0


class DashboardSummary(BaseModel):
    total_ads: int = 0
    analyzed_ads: int = 0
    pending_analysis: int = 0
    low_confidence: int = 0
    trends: DashboardTrends


# ---------- Top distributions (used for the chart cards) ----------

class TopHookItem(BaseModel):
    type: str
    count: int
    pct: float


class TopAngleItem(BaseModel):
    angle: str
    count: int
    pct: float


class TopOfferItem(BaseModel):
    type: str
    count: int
    pct: float