"""
Removed Ads Router — lists ads that competitors have taken down.

These ads are kept for intelligence: they show what DIDN'T work.
Never hard-deleted — analysis and days_running preserved.
"""

from math import ceil
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.competitor import Competitor


router = APIRouter(prefix="/removed-ads", tags=["removed-ads"])


@router.get("/stats")
async def get_removed_ads_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """KPI stats for removed ads (competitor ads only, excludes own brand)."""
    now = datetime.now(timezone.utc)

    base = (
        select(Ad.id)
        .join(Competitor, Ad.competitor_id == Competitor.id)
        .where(Ad.status == "removed", Competitor.is_own_brand == False)
    )

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0

    # Removed in last 7 days
    seven_days = now - timedelta(days=7)
    removed_7d_stmt = (
        select(func.count(Ad.id))
        .join(Competitor, Ad.competitor_id == Competitor.id)
        .where(
            Ad.status == "removed",
            Competitor.is_own_brand == False,
            Ad.removed_at >= seven_days,
        )
    )
    removed_7d = (await db.execute(removed_7d_stmt)).scalar() or 0

    # Removed in last 30 days
    thirty_days = now - timedelta(days=30)
    removed_30d_stmt = (
        select(func.count(Ad.id))
        .join(Competitor, Ad.competitor_id == Competitor.id)
        .where(
            Ad.status == "removed",
            Competitor.is_own_brand == False,
            Ad.removed_at >= thirty_days,
        )
    )
    removed_30d = (await db.execute(removed_30d_stmt)).scalar() or 0

    # Average days_running before removal
    avg_stmt = (
        select(func.avg(Ad.days_running))
        .join(Competitor, Ad.competitor_id == Competitor.id)
        .where(Ad.status == "removed", Competitor.is_own_brand == False)
    )
    avg_days = (await db.execute(avg_stmt)).scalar() or 0

    return {
        "total_removed": total,
        "removed_7d": removed_7d,
        "removed_30d": removed_30d,
        "avg_days_before_removal": round(float(avg_days), 1),
    }


@router.get("")
async def list_removed_ads(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    competitor: Optional[str] = Query(None),
    competitor_id: Optional[UUID] = Query(None),
    hook_type: Optional[str] = Query(None),
    angle: Optional[str] = Query(None),
    offer_type: Optional[str] = Query(None),
    confidence: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("-removed_at"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all removed competitor ads with full filtering and pagination.
    Excludes own brand.
    """
    stmt = (
        select(Ad)
        .join(Competitor, Ad.competitor_id == Competitor.id)
        .where(Ad.status == "removed", Competitor.is_own_brand == False)
        .options(selectinload(Ad.competitor), selectinload(Ad.analysis))
    )

    # Filters
    if competitor:
        stmt = stmt.where(func.lower(Competitor.name) == func.lower(competitor))
    if competitor_id:
        stmt = stmt.where(Ad.competitor_id == competitor_id)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(Ad.headline.ilike(like) | Ad.primary_text.ilike(like))

    # Analysis-based filters (join already done via selectinload, use subquery)
    if hook_type or angle or offer_type or confidence:
        stmt = stmt.join(AdAnalysis, Ad.id == AdAnalysis.ad_id)
        if hook_type:
            stmt = stmt.where(func.lower(AdAnalysis.hook_type) == func.lower(hook_type))
        if angle:
            stmt = stmt.where(func.lower(AdAnalysis.angle) == func.lower(angle))
        if offer_type:
            stmt = stmt.where(func.lower(AdAnalysis.offer_type) == func.lower(offer_type))
        if confidence:
            if confidence == "High":
                stmt = stmt.where(AdAnalysis.confidence_score >= 70)
            elif confidence == "Medium":
                stmt = stmt.where(AdAnalysis.confidence_score >= 40, AdAnalysis.confidence_score < 70)
            elif confidence == "Low":
                stmt = stmt.where(AdAnalysis.confidence_score < 40)

    # Count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Sorting
    sort_field = sort.lstrip("-")
    descending = sort.startswith("-")
    if sort_field == "removed_at":
        sort_col = Ad.removed_at
    elif sort_field == "days_running":
        sort_col = Ad.days_running
    elif sort_field == "first_seen":
        sort_col = Ad.first_seen
    else:
        sort_col = Ad.removed_at
    stmt = stmt.order_by(sort_col.desc() if descending else sort_col.asc())

    # Pagination
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    ads = (await db.execute(stmt)).scalars().unique().all()

    total_pages = ceil(total / per_page) if per_page else 0

    data = []
    for ad in ads:
        a = ad.analysis
        data.append({
            "id": str(ad.id),
            "ad_library_id": ad.ad_library_id,
            "competitor_name": ad.competitor.name if ad.competitor else "Unknown",
            "competitor_id": str(ad.competitor_id),
            "headline": ad.headline,
            "primary_text": ad.primary_text,
            "media_url": ad.media_url,
            "screenshot_url": ad.screenshot_url,
            "is_video": ad.is_video,
            "hook_type": a.hook_type if a else None,
            "hook_text": a.hook_text if a else None,
            "angle": a.angle if a else None,
            "offer_type": a.offer_type if a else None,
            "confidence_score": a.confidence_score if a else None,
            "days_running": ad.days_running,
            "first_seen": ad.first_seen.isoformat() if ad.first_seen else None,
            "removed_at": ad.removed_at.isoformat() if ad.removed_at else None,
            "ad_url": ad.ad_url,
        })

    return {
        "data": data,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
        },
    }
