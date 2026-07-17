"""
Creative Briefs endpoints.

GET    /api/briefs           — list all briefs (plain array)
GET    /api/briefs/{id}      — single brief detail
POST   /api/briefs/generate  — Grok-powered brief generation
DELETE /api/briefs/{id}      — hard delete
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.brief import Brief
from app.models.user import User
from app.schemas.brief import BriefGenerateRequest, BriefResponse
from app.services import brief_service


router = APIRouter(prefix="/briefs", tags=["briefs"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_response(brief: Brief, data_quality: str | None = None) -> BriefResponse:
    return BriefResponse(
        id=brief.id,
        title=brief.title,
        hook_type=brief.hook_type,
        angle=brief.angle,
        offer_type=brief.offer_type,
        platform=brief.platform,
        target_audience=brief.target_audience,
        key_messages=brief.key_messages or [],
        suggested_copy=brief.suggested_copy,
        status=brief.status,
        created_at=brief.created_at,
        updated_at=brief.updated_at,
        data_quality=data_quality,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[BriefResponse])
async def list_briefs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all briefs, newest first.
    Returns plain array — frontend handles both array and {data:[]} shapes.
    """
    stmt = select(Brief).order_by(Brief.created_at.desc())
    briefs = (await db.execute(stmt)).scalars().all()
    return [_to_response(b) for b in briefs]


@router.get("/{brief_id}", response_model=BriefResponse)
async def get_brief(
    brief_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single brief by ID."""
    brief = await db.get(Brief, brief_id)
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")
    return _to_response(brief)


@router.post("/generate", response_model=BriefResponse, status_code=status.HTTP_201_CREATED)
async def generate_brief(
    payload: BriefGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a creative brief using Grok AI.

    Pulls top 8 highest-confidence competitor ads as context,
    calls Grok with actual ad copy + classifications,
    saves and returns the generated brief (status='active').

    Error cases:
    - 422: any competitor_id in the list does not exist in DB
    - 502: Grok returned invalid/empty JSON
    """
    try:
        brief, data_quality = await brief_service.generate_brief(
            target_audience=payload.target_audience,
            goal=payload.goal,
            platform=payload.platform,
            competitor_ids=payload.competitor_ids,
            created_by=current_user.id,
            db=db,
        )
    except ValueError as exc:
        msg = str(exc)
        # competitor_id validation errors → 422
        if "competitor_id not found" in msg:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=msg,
            )
        # Grok parse errors → 502
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=msg,
        )

    return _to_response(brief, data_quality=data_quality)


@router.delete("/{brief_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brief(
    brief_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hard-delete a brief."""
    brief = await db.get(Brief, brief_id)
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")
    await db.delete(brief)
    await db.commit()
    return None
