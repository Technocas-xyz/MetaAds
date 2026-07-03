"""
Brief schemas — aligned with frontend fixture (src/api/_fixtures/briefs.js)
and API client (src/api/briefs.js).

Endpoints served:
  GET    /api/briefs
  GET    /api/briefs/{id}
  POST   /api/briefs/generate
  DELETE /api/briefs/{id}
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


# ── Request bodies ─────────────────────────────────────────────────────────────

class BriefGenerateRequest(BaseModel):
    target_audience: str = Field(..., min_length=3, max_length=500)
    goal: str = Field(..., min_length=3, max_length=500)
    platform: str = Field(default="Facebook", max_length=20)
    competitor_ids: Optional[List[UUID]] = Field(
        default=None,
        description="Filter context to specific competitors. null/[] = use all.",
    )


# ── Response shapes ────────────────────────────────────────────────────────────

class BriefResponse(BaseModel):
    """
    Single brief — matches fixture shape field-for-field.
    Frontend accesses: id, title, hook_type, angle, offer_type, platform,
    target_audience, key_messages, suggested_copy, status, created_at.
    """
    id: UUID
    title: str
    hook_type: Optional[str] = None
    angle: Optional[str] = None
    offer_type: Optional[str] = None
    platform: Optional[str] = None
    target_audience: Optional[str] = None
    key_messages: List[str] = Field(default_factory=list)
    suggested_copy: Optional[str] = None
    status: str = "active"
    created_at: datetime
    updated_at: datetime

    # Extra field for generate endpoint — signals data quality to caller
    # "full" = 8 ads used, "limited" = fewer than 3 ads available
    data_quality: Optional[str] = Field(
        default=None,
        description="'full' or 'limited' — only present on generate response",
    )

    model_config = ConfigDict(from_attributes=True)
