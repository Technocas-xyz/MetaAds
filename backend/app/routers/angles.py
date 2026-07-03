"""
Angle Library endpoints — aggregations over ad_analyses.angle field.
"""

from datetime import datetime, timezone, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.competitor import Competitor
from app.schemas.angle import (
    AnglesSummary,
    TopAnglePerformer,
    TrendingAngle,
    AngleTypeDistItem,
    AnglePerformanceItem,
    AngleTrendPoint,
    AngleRow,
    AngleCompetitorRef,
)


router = APIRouter(prefix="/angles", tags=["angles"])


ANGLE_COLORS = {
    "Price": "#F59E0B",
    "Quality": "#8B5CF6",
    "Speed": "#3B82F6",
    "Benefit": "#22C55E",
    "Trust": "#6366F1",
    "Trust/Social Proof": "#6366F1",
    "Convenience": "#14B8A6",
    "Innovation": "#EC4899",
    "Other": "#94A3B8",
}

ANGLE_DESCRIPTIONS = {
    "Price": "Positions the product as the most cost-effective option, leading with savings, discounts, or price comparisons.",
    "Quality": "Emphasises superior craftsmanship, materials, or output standards, appealing to customers who prioritise excellence.",
    "Speed": "Highlights fast turnaround, delivery, or results as the primary reason to choose this brand.",
    "Benefit": "Leads with specific positive outcomes the customer will experience, making the value proposition tangible.",
    "Trust": "Builds credibility through reviews, testimonials, certifications, or customer counts.",
    "Convenience": "Removes friction by stressing ease of use, no minimums, simplified ordering, or hassle-free processes.",
    "Innovation": "Positions the brand as cutting-edge, showcasing unique technology, processes, or capabilities.",
}


def _initials(name: str) -> str:
    if not name:
        return "?"
    words = name.split()
    if len(words) >= 2:
        return (words[0][0] + words[1][0]).upper()
    return name[:2].upper()


# ---------- Endpoints ----------

@router.get("/summary", response_model=AnglesSummary)
async def get_angles_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate KPIs for Angles Library top cards."""
    unique_stmt = select(func.count(distinct(AdAnalysis.angle))).where(
        AdAnalysis.angle.is_not(None)
    )
    total_unique = (await db.execute(unique_stmt)).scalar() or 0

    total_stmt = select(func.count(AdAnalysis.id)).where(
        AdAnalysis.angle.is_not(None)
    )
    total_mentions = (await db.execute(total_stmt)).scalar() or 0

    # Top angle (most common)
    top_stmt = (
        select(AdAnalysis.angle, func.count(AdAnalysis.id).label("c"))
        .where(AdAnalysis.angle.is_not(None))
        .group_by(AdAnalysis.angle)
        .order_by(func.count(AdAnalysis.id).desc())
        .limit(1)
    )
    row = (await db.execute(top_stmt)).first()
    top_angle = row[0] if row else None
    top_count = row[1] if row else 0
    top_pct = round(top_count / total_mentions * 100, 1) if total_mentions else 0.0

    # Top performing (highest avg confidence)
    perf_stmt = (
        select(AdAnalysis.angle, func.avg(AdAnalysis.confidence_score).label("avg_score"))
        .where(AdAnalysis.angle.is_not(None))
        .group_by(AdAnalysis.angle)
        .order_by(func.avg(AdAnalysis.confidence_score).desc())
        .limit(1)
    )
    perf_row = (await db.execute(perf_stmt)).first()
    top_performer = (
        TopAnglePerformer(name=perf_row[0], avg_score=round(float(perf_row[1]), 1))
        if perf_row else None
    )

    # Trending — most mentioned in last 7 days
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    trend_stmt = (
        select(AdAnalysis.angle, func.count(AdAnalysis.id).label("c"))
        .where(
            AdAnalysis.angle.is_not(None),
            AdAnalysis.analyzed_at >= week_ago,
        )
        .group_by(AdAnalysis.angle)
        .order_by(func.count(AdAnalysis.id).desc())
        .limit(1)
    )
    trend_row = (await db.execute(trend_stmt)).first()
    trending = (
        TrendingAngle(name=trend_row[0], pct=round(trend_row[1] / max(total_mentions, 1) * 100, 1))
        if trend_row else None
    )

    return AnglesSummary(
        total_unique=total_unique,
        total_mentions=total_mentions,
        mentions_trend=0.0,
        top_angle=top_angle,
        top_angle_pct=top_pct,
        top_performing_angle=top_performer,
        trending_angle=trending,
    )


@router.get("/type-dist", response_model=List[AngleTypeDistItem])
async def get_angles_type_distribution(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Angle distribution for the donut chart."""
    stmt = (
        select(AdAnalysis.angle, func.count(AdAnalysis.id).label("c"))
        .where(AdAnalysis.angle.is_not(None))
        .group_by(AdAnalysis.angle)
        .order_by(func.count(AdAnalysis.id).desc())
    )
    rows = (await db.execute(stmt)).all()
    total = sum(r[1] for r in rows)

    return [
        AngleTypeDistItem(
            name=r[0],
            value=r[1],
            pct=round(r[1] / total * 100, 1) if total else 0.0,
        )
        for r in rows
    ]


@router.get("/performance", response_model=List[AnglePerformanceItem])
async def get_angles_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Avg confidence score per angle for the bar chart."""
    stmt = (
        select(AdAnalysis.angle, func.avg(AdAnalysis.confidence_score).label("avg_score"))
        .where(AdAnalysis.angle.is_not(None))
        .group_by(AdAnalysis.angle)
        .order_by(func.avg(AdAnalysis.confidence_score).desc())
    )
    rows = (await db.execute(stmt)).all()

    return [
        AnglePerformanceItem(
            name=r[0],
            avg_score=round(float(r[1]), 1),
            color=ANGLE_COLORS.get(r[0], "#94A3B8"),
        )
        for r in rows
    ]


@router.get("/trend", response_model=List[AngleTrendPoint])
async def get_angles_trend(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Angle mentions over time (last N days)."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days - 1)
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

    stmt = (
        select(
            func.date_trunc("day", AdAnalysis.analyzed_at).label("day"),
            AdAnalysis.angle,
            func.count(AdAnalysis.id).label("c"),
        )
        .where(
            AdAnalysis.angle.is_not(None),
            AdAnalysis.analyzed_at >= start_date,
        )
        .group_by("day", AdAnalysis.angle)
        .order_by("day")
    )
    rows = (await db.execute(stmt)).all()

    points: dict = {}
    for i in range(days):
        d = (start_date + timedelta(days=i)).date()
        date_str = d.strftime("%b %d")
        points[date_str] = {"date": date_str, "Price": 0, "Quality": 0, "Speed": 0, "Benefit": 0}

    for row in rows:
        day_date = row[0].date() if hasattr(row[0], "date") else row[0]
        date_str = day_date.strftime("%b %d")
        angle = row[1]
        count = row[2]
        if date_str in points and angle in ("Price", "Quality", "Speed", "Benefit"):
            points[date_str][angle] = count

    return [AngleTrendPoint(**p) for p in points.values()]


@router.get("", response_model=List[AngleRow])
async def list_angles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all detected angles with stats, sorted by mentions desc."""
    stmt = (
        select(
            AdAnalysis.angle,
            AdAnalysis.angle_detail,
            func.count(AdAnalysis.id).label("mentions"),
            func.avg(AdAnalysis.confidence_score).label("avg_conf"),
            func.min(AdAnalysis.analyzed_at).label("first_seen"),
        )
        .where(AdAnalysis.angle.is_not(None))
        .group_by(AdAnalysis.angle, AdAnalysis.angle_detail)
        .order_by(func.count(AdAnalysis.id).desc())
    )
    rows = (await db.execute(stmt)).all()

    result: List[AngleRow] = []
    for rank, r in enumerate(rows, start=1):
        angle, subtitle, mentions, avg_conf, first_seen = r

        # Competitors using this angle
        comp_stmt = (
            select(Competitor.id, Competitor.name)
            .join(Ad, Ad.competitor_id == Competitor.id)
            .join(AdAnalysis, AdAnalysis.ad_id == Ad.id)
            .where(AdAnalysis.angle == angle)
            .distinct()
        )
        comp_rows = (await db.execute(comp_stmt)).all()
        all_comps = [
            AngleCompetitorRef(id=str(c[0]), name=c[1], initials=_initials(c[1]))
            for c in comp_rows
        ]
        shown = all_comps[:3]
        extra = max(0, len(all_comps) - 3)

        # Example ad media
        media_stmt = (
            select(Ad.media_url)
            .join(AdAnalysis, AdAnalysis.ad_id == Ad.id)
            .where(AdAnalysis.angle == angle)
            .limit(3)
        )
        media_rows = (await db.execute(media_stmt)).all()
        example_ads = [m[0] for m in media_rows if m[0]]

        first_seen_str = first_seen.strftime("%b %d, %Y") if first_seen else None

        result.append(
            AngleRow(
                id=str(rank),
                rank=rank,
                name=angle,
                subtitle=subtitle,
                description=ANGLE_DESCRIPTIONS.get(angle, ""),
                mentions=mentions,
                avg_confidence=round(float(avg_conf), 1),
                trending=0.0,
                competitors=shown,
                extra_competitors=extra,
                example_ads=example_ads,
                first_seen=first_seen_str,
                related_hooks=[],
                offer_type=None,
            )
        )

    return result