"""
Campaigns endpoints.

GET  /api/campaigns  — list all campaigns (plain array, newest first)
POST /api/campaigns  — create a new campaign
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.brief import Brief
from app.models.campaign import Campaign
from app.models.user import User
from app.schemas.campaign import CampaignCreate, CampaignResponse


router = APIRouter(prefix="/campaigns", tags=["campaigns"])


# ── Helper ────────────────────────────────────────────────────────────────────

def _to_response(c: Campaign) -> CampaignResponse:
    return CampaignResponse(
        id=c.id,
        name=c.name,
        platform=c.platform,
        status=c.status,
        objective=c.objective,
        budget=float(c.budget),
        spend=float(c.spend),
        impressions=c.impressions,
        clicks=c.clicks,
        conversions=c.conversions,
        roas=float(c.roas),
        brief_id=c.brief_id,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[CampaignResponse])
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all campaigns, newest first.
    Returns plain array — frontend handles both array and {data:[]} shapes.
    """
    stmt = select(Campaign).order_by(Campaign.created_at.desc())
    campaigns = (await db.execute(stmt)).scalars().all()
    return [_to_response(c) for c in campaigns]


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new campaign.

    Validates:
    - brief_id exists in DB (if provided) → 404
    - budget/spend/impressions/clicks/conversions >= 0 → 422 (Pydantic)
    - clicks <= impressions, conversions <= clicks → 422 (model_validator)
    - status in [draft, active, paused] → 422 (Pydantic Literal)
    """
    # Validate brief_id if provided
    if payload.brief_id:
        brief = await db.get(Brief, payload.brief_id)
        if not brief:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Brief {payload.brief_id} not found",
            )

    campaign = Campaign(
        name=payload.name,
        platform=payload.platform,
        status=payload.status,
        objective=payload.objective,
        budget=payload.budget,
        spend=payload.spend,
        impressions=payload.impressions,
        clicks=payload.clicks,
        conversions=payload.conversions,
        roas=payload.roas,
        brief_id=payload.brief_id,
        created_by=current_user.id,
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return _to_response(campaign)
