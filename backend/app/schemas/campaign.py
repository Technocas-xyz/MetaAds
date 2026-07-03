"""
Campaign schemas — aligned with frontend fixture (src/api/_fixtures/campaigns.js)
and API client (src/api/campaigns.js).

Endpoints served:
  GET  /api/campaigns
  POST /api/campaigns

Status values confirmed from frontend CampaignsPage.jsx STATUS_CFG:
  draft | active | paused
"""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator


# ── Valid status values (confirmed from frontend STATUS_CFG) ──────────────────
CampaignStatus = Literal["draft", "active", "paused"]


# ── Request body ──────────────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    platform: str = Field(..., max_length=20)
    status: CampaignStatus = "draft"
    objective: Optional[str] = Field(default=None, max_length=50)

    # Financial + performance metrics — user-entered for OUR campaigns
    budget:      float = Field(default=0.0, ge=0, description="Total budget in USD")
    spend:       float = Field(default=0.0, ge=0, description="Amount spent so far")
    impressions: int   = Field(default=0,   ge=0)
    clicks:      int   = Field(default=0,   ge=0)
    conversions: int   = Field(default=0,   ge=0)
    roas:        float = Field(default=0.0, description="Return on ad spend (can be negative for losses)")

    # Optional link to a creative brief
    brief_id: Optional[UUID] = None

    @model_validator(mode="after")
    def check_funnel_consistency(self) -> "CampaignCreate":
        """clicks <= impressions and conversions <= clicks."""
        if self.clicks > self.impressions:
            raise ValueError(
                f"clicks ({self.clicks}) cannot exceed impressions ({self.impressions})"
            )
        if self.conversions > self.clicks:
            raise ValueError(
                f"conversions ({self.conversions}) cannot exceed clicks ({self.clicks})"
            )
        return self


# ── Response shape ────────────────────────────────────────────────────────────

class CampaignResponse(BaseModel):
    """
    Single campaign — matches fixture shape field-for-field.
    Frontend accesses: id, name, platform, status, budget, spend,
    impressions, clicks, conversions, roas, brief_id, created_at.
    """
    id: UUID
    name: str
    platform: str
    status: str                          # str not Literal — DB may have legacy values
    objective: Optional[str] = None

    # Numeric fields — float/int so JS .toLocaleString() works correctly
    budget:      float = 0.0
    spend:       float = 0.0
    impressions: int   = 0
    clicks:      int   = 0
    conversions: int   = 0
    roas:        float = 0.0

    brief_id:   Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
