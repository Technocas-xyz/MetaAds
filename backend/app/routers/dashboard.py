"""
Dashboard endpoints — top-level KPIs + distribution snapshots.
"""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.schemas.dashboard import (
    DashboardSummary,
    DashboardTrends,
    TopHookItem,
    TopAngleItem,
    TopOfferItem,
)


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ---------- Endpoints ----------

@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Top 4 KPI cards on the Dashboard page."""
    # Total ads in DB
    total_ads = (await db.execute(select(func.count(Ad.id)))).scalar() or 0

    # Analyzed = ads with AdAnalysis row
    analyzed = (await db.execute(select(func.count(AdAnalysis.id)))).scalar() or 0

    # Pending = ads without analysis
    pending = max(0, total_ads - analyzed)

    # Low confidence = analyses below 65
    low_conf = (
        await db.execute(
            select(func.count(AdAnalysis.id)).where(AdAnalysis.confidence_score < 65)
        )
    ).scalar() or 0

    # Trends — placeholder zeros; computed properly once we have historical snapshots
    trends = DashboardTrends(
        total_ads=0.0,
        analyzed_ads=0.0,
        pending_analysis=0.0,
        low_confidence=0.0,
    )

    return DashboardSummary(
        total_ads=total_ads,
        analyzed_ads=analyzed,
        pending_analysis=pending,
        low_confidence=low_conf,
        trends=trends,
    )


@router.get("/hooks", response_model=List[TopHookItem])
async def get_dashboard_hooks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Top hook types by mention count (for Dashboard chart card)."""
    stmt = (
        select(AdAnalysis.hook_type, func.count(AdAnalysis.id).label("c"))
        .where(AdAnalysis.hook_type.is_not(None))
        .group_by(AdAnalysis.hook_type)
        .order_by(func.count(AdAnalysis.id).desc())
        .limit(6)
    )
    rows = (await db.execute(stmt)).all()
    total = sum(r[1] for r in rows)

    return [
        TopHookItem(
            type=r[0],
            count=r[1],
            pct=round(r[1] / total * 100, 1) if total else 0.0,
        )
        for r in rows
    ]


@router.get("/angles", response_model=List[TopAngleItem])
async def get_dashboard_angles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Top angles by mention count (for Dashboard chart card)."""
    stmt = (
        select(AdAnalysis.angle, func.count(AdAnalysis.id).label("c"))
        .where(AdAnalysis.angle.is_not(None))
        .group_by(AdAnalysis.angle)
        .order_by(func.count(AdAnalysis.id).desc())
        .limit(5)
    )
    rows = (await db.execute(stmt)).all()
    total = sum(r[1] for r in rows)

    return [
        TopAngleItem(
            angle=r[0],
            count=r[1],
            pct=round(r[1] / total * 100, 1) if total else 0.0,
        )
        for r in rows
    ]


@router.get("/offers", response_model=List[TopOfferItem])
async def get_dashboard_offers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Top offer types by mention count (for Dashboard chart card)."""
    stmt = (
        select(AdAnalysis.offer_type, func.count(AdAnalysis.id).label("c"))
        .where(
            AdAnalysis.offer_type.is_not(None),
            AdAnalysis.offer_type != "None",
        )
        .group_by(AdAnalysis.offer_type)
        .order_by(func.count(AdAnalysis.id).desc())
        .limit(6)
    )
    rows = (await db.execute(stmt)).all()
    total = sum(r[1] for r in rows)

    return [
        TopOfferItem(
            type=r[0],
            count=r[1],
            pct=round(r[1] / total * 100, 1) if total else 0.0,
        )
        for r in rows
    ]