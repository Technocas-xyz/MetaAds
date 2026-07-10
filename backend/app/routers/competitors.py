from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.competitor import Competitor
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.schemas.competitor import (
    CompetitorCreate,
    CompetitorUpdate,
    CompetitorResponse,
    CompetitorStats,
    CompetitorsSummary,
)


router = APIRouter(prefix="/competitors", tags=["competitors"])


# ---------- Helper: compute stats for one competitor ----------

async def _compute_stats_for_competitor(
    db: AsyncSession, competitor_id: UUID
) -> CompetitorStats:
    """Per-competitor stats: pulls from Ad + AdAnalysis tables."""
    # Total ads
    total_stmt = select(func.count(Ad.id)).where(Ad.competitor_id == competitor_id)
    total = (await db.execute(total_stmt)).scalar() or 0

    if total == 0:
        return CompetitorStats()

    # Existing = approved or pending
    existing_stmt = select(func.count(Ad.id)).where(
        Ad.competitor_id == competitor_id,
        Ad.status.in_(["approved", "pending"]),
    )
    existing = (await db.execute(existing_stmt)).scalar() or 0

    # Removed = flagged
    removed_stmt = select(func.count(Ad.id)).where(
        Ad.competitor_id == competitor_id,
        Ad.status == "flagged",
    )
    removed = (await db.execute(removed_stmt)).scalar() or 0

    # Running 7+ days
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    running_stmt = select(func.count(Ad.id)).where(
        Ad.competitor_id == competitor_id,
        Ad.first_seen <= week_ago,
        Ad.status.in_(["approved", "pending"]),
    )
    running_7_plus = (await db.execute(running_stmt)).scalar() or 0

    # Winning ads (confidence >= 85)
    winning_stmt = (
        select(func.count(AdAnalysis.id))
        .join(Ad, Ad.id == AdAnalysis.ad_id)
        .where(
            Ad.competitor_id == competitor_id,
            AdAnalysis.confidence_score >= 85,
        )
    )
    winning = (await db.execute(winning_stmt)).scalar() or 0

    # Variants total
    variants_stmt = select(func.coalesce(func.sum(Ad.variants), 0)).where(
        Ad.competitor_id == competitor_id
    )
    variants = (await db.execute(variants_stmt)).scalar() or 0

    # Average duration (last_seen - first_seen, in days)
    duration_stmt = select(
        func.coalesce(
            func.avg(
                func.extract("epoch", Ad.last_seen)
                - func.extract("epoch", Ad.first_seen)
            ),
            0,
        )
    ).where(Ad.competitor_id == competitor_id)
    avg_dur_seconds = (await db.execute(duration_stmt)).scalar() or 0
    avg_duration = round(float(avg_dur_seconds) / 86400, 1) if avg_dur_seconds else 0.0

    # Last activity
    last_act_stmt = select(func.max(Ad.last_seen)).where(
        Ad.competitor_id == competitor_id
    )
    last_activity = (await db.execute(last_act_stmt)).scalar()

    def pct(n: int, d: int) -> float:
        return round((n / d * 100), 1) if d else 0.0

    return CompetitorStats(
        total_ads=total,
        total_ads_trend=0.0,
        total_ads_trend_up=True,
        existing_ads=existing,
        existing_ads_pct=pct(existing, total),
        existing_ads_trend=0.0,
        removed_ads=removed,
        removed_ads_pct=pct(removed, total),
        avg_duration=avg_duration,
        avg_duration_prev=0.0,
        running_7_plus=running_7_plus,
        running_7_plus_pct=pct(running_7_plus, existing) if existing else 0.0,
        winning_ads=winning,
        winning_ads_pct=pct(winning, existing) if existing else 0.0,
        variants=int(variants),
        last_activity=last_activity,
    )


def _competitor_to_response(
    c: Competitor, stats: CompetitorStats
) -> CompetitorResponse:
    return CompetitorResponse(
        id=c.id,
        name=c.name,
        domain=c.domain,
        logo_url=c.logo_url,
        niches=c.niches or [],
        priority_tier=c.priority_tier,
        status=c.status,
        region=c.region,
        tier=c.tier,
        stats=stats,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


# ---------- Endpoints ----------

@router.get("/summary", response_model=CompetitorsSummary)
async def get_competitors_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate KPI summary across ALL competitors — frontend-aligned."""
    # Total ads analyzed
    total_stmt = select(func.count(AdAnalysis.id))
    total_analyzed = (await db.execute(total_stmt)).scalar() or 0

    # Existing
    existing_stmt = select(func.count(Ad.id)).where(
        Ad.status.in_(["approved", "pending"])
    )
    existing = (await db.execute(existing_stmt)).scalar() or 0

    # Removed
    removed_stmt = select(func.count(Ad.id)).where(Ad.status == "flagged")
    removed = (await db.execute(removed_stmt)).scalar() or 0

    # Running 7+ days
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    running_stmt = select(func.count(Ad.id)).where(
        Ad.first_seen <= week_ago,
        Ad.status.in_(["approved", "pending"]),
    )
    running_7_plus = (await db.execute(running_stmt)).scalar() or 0

    # Winning
    winning_stmt = select(func.count(AdAnalysis.id)).where(
        AdAnalysis.confidence_score >= 85
    )
    winning = (await db.execute(winning_stmt)).scalar() or 0

    # Average duration across ALL ads
    duration_stmt = select(
        func.coalesce(
            func.avg(
                func.extract("epoch", Ad.last_seen)
                - func.extract("epoch", Ad.first_seen)
            ),
            0,
        )
    )
    avg_dur_seconds = (await db.execute(duration_stmt)).scalar() or 0
    avg_duration = round(float(avg_dur_seconds) / 86400, 1) if avg_dur_seconds else 0.0

    def pct(n: int, d: int) -> float:
        return round((n / d * 100), 1) if d else 0.0

    return CompetitorsSummary(
        total_ads_analyzed=total_analyzed,
        total_ads_trend=0.0,
        existing_ads=existing,
        existing_ads_pct=pct(existing, total_analyzed),
        removed_ads=removed,
        removed_ads_pct=pct(removed, total_analyzed),
        running_7_plus=running_7_plus,
        running_7_plus_pct=pct(running_7_plus, existing) if existing else 0.0,
        winning_ads=winning,
        winning_ads_pct=pct(winning, existing) if existing else 0.0,
        avg_duration=avg_duration,
    )


@router.get("", response_model=List[CompetitorResponse])
async def list_competitors(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_tier: Optional[str] = Query(None),
    niche: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all competitors with computed stats. Server-side filtering."""
    stmt = select(Competitor).order_by(Competitor.created_at.desc())
    if status_filter:
        stmt = stmt.where(Competitor.status == status_filter)
    if priority_tier:
        stmt = stmt.where(func.lower(Competitor.priority_tier) == func.lower(priority_tier))
    if niche:
        # niches is a PostgreSQL array; check if the array contains the value (case-insensitive)
        stmt = stmt.where(Competitor.niches.any(niche))
    if search:
        like_pattern = f"%{search}%"
        stmt = stmt.where(
            Competitor.name.ilike(like_pattern) | Competitor.domain.ilike(like_pattern)
        )

    competitors = (await db.execute(stmt)).scalars().all()

    responses = []
    for c in competitors:
        stats = await _compute_stats_for_competitor(db, c.id)
        responses.append(_competitor_to_response(c, stats))
    return responses


@router.get("/{competitor_id}", response_model=CompetitorResponse)
async def get_competitor(
    competitor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single competitor by ID with full stats."""
    competitor = await db.get(Competitor, competitor_id)
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    stats = await _compute_stats_for_competitor(db, competitor.id)
    return _competitor_to_response(competitor, stats)


@router.post("", response_model=CompetitorResponse, status_code=status.HTTP_201_CREATED)
async def create_competitor(
    payload: CompetitorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new competitor with scraper-ready fields."""
    # Check for duplicate name
    existing = await db.execute(select(Competitor).where(Competitor.name == payload.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Competitor '{payload.name}' already exists")

    # Check for duplicate page_id
    if payload.page_id:
        existing_pid = await db.execute(
            select(Competitor).where(Competitor.page_id == payload.page_id)
        )
        if existing_pid.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"A competitor with page_id '{payload.page_id}' already exists")

    competitor = Competitor(
        name=payload.name,
        domain=payload.domain or "",
        page_id=payload.page_id,
        query=payload.query,
        query_type=payload.query_type,
        meta_ad_library_url=payload.meta_ad_library_url,
        priority_tier=payload.priority_tier,
        niches=payload.niches,
        region=payload.region or "US",
        tier=payload.tier,
        logo_url=payload.logo_url,
        status="Active",
        created_by=current_user.id,
    )
    db.add(competitor)
    await db.commit()
    await db.refresh(competitor)

    stats = CompetitorStats()
    return _competitor_to_response(competitor, stats)


@router.put("/{competitor_id}", response_model=CompetitorResponse)
async def update_competitor(
    competitor_id: UUID,
    payload: CompetitorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a competitor's fields. Only provided fields are changed."""
    competitor = await db.get(Competitor, competitor_id)
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(competitor, field, value)

    await db.commit()
    await db.refresh(competitor)

    stats = await _compute_stats_for_competitor(db, competitor.id)
    return _competitor_to_response(competitor, stats)


@router.delete("/{competitor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_competitor(
    competitor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete a competitor by setting status to 'Inactive'."""
    competitor = await db.get(Competitor, competitor_id)
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    competitor.status = "Inactive"
    await db.commit()
    return None