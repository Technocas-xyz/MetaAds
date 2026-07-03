"""
AI Analysis page endpoints.

GET /api/ai-analysis/summary
GET /api/ai-analysis/timeline
GET /api/ai-analysis/angles
GET /api/ai-analysis/confidence-dist
GET /api/ai-analysis/winning-ads
"""

from datetime import datetime, timezone, timedelta
from typing import List

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
from app.schemas.ai_analysis import (
    AISummary,
    TimelinePoint,
    AngleDonutItem,
    ConfidenceDistItem,
    WinningAdResponse,
    WinningAdCompetitor,
    WinningAdAIInsights,
    WinningAdInsightField,
)


router = APIRouter(prefix="/ai-analysis", tags=["ai-analysis"])


# ── Confidence bucket definitions (fixed — matches fixture exactly) ────────────
_DASH = "\u2013"  # en-dash — unicode escape in a Python string literal, always safe
CONF_BUCKETS = [
    {"range": f"0{_DASH}20",   "label": "Very Low",  "min": 0,  "max": 20,  "color": "#EF4444"},
    {"range": f"21{_DASH}40",  "label": "Low",       "min": 21, "max": 40,  "color": "#F97316"},
    {"range": f"41{_DASH}60",  "label": "Medium",    "min": 41, "max": 60,  "color": "#F59E0B"},
    {"range": f"61{_DASH}80",  "label": "High",      "min": 61, "max": 80,  "color": "#22C55E"},
    {"range": f"81{_DASH}100", "label": "Very High", "min": 81, "max": 100, "color": "#10B981"},
]

# Winning threshold — matches settings default
WINNING_THRESHOLD = 65.0


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_winning_ad(ad: Ad, rank: int) -> WinningAdResponse:
    """Convert Ad ORM object (with relationships loaded) to WinningAdResponse."""
    from datetime import datetime, timezone

    a = ad.analysis
    insights = None
    if a:
        insights = WinningAdAIInsights(
            hook=WinningAdInsightField(value=a.hook_text, confidence=a.hook_confidence or 0.0),
            hook_type=WinningAdInsightField(value=a.hook_type, confidence=a.hook_confidence or 0.0),
            angle=WinningAdInsightField(value=a.angle, confidence=a.angle_confidence or 0.0),
            offer_type=WinningAdInsightField(value=a.offer_type, confidence=a.offer_confidence or 0.0),
            offer_value=WinningAdInsightField(value=a.offer_value, confidence=a.offer_confidence or 0.0),
            creative_format=WinningAdInsightField(value=a.creative_format, confidence=85.0),
            product_line=WinningAdInsightField(value=a.product_line, confidence=85.0),
            audience_type=WinningAdInsightField(value=a.audience_type, confidence=70.0),
            usp_detected=WinningAdInsightField(value=a.usp_detected, confidence=80.0),
            overall=a.confidence_score or 0.0,
        )

    # Compute running_since_days
    now = datetime.now(timezone.utc)
    first_seen = ad.first_seen
    if first_seen.tzinfo is None:
        first_seen = first_seen.replace(tzinfo=timezone.utc)
    days = max(0, (now - first_seen).days)
    date_str = first_seen.strftime("%b %d, %Y")

    analysis_block = None
    if a and (a.summary or a.suggested_angle or a.suggested_hook):
        analysis_block = {
            "summary": a.summary,
            "suggested_angle": a.suggested_angle,
            "suggested_hook": a.suggested_hook,
        }

    return WinningAdResponse(
        id=ad.id,
        rank=rank,
        competitor=WinningAdCompetitor.model_validate(ad.competitor),
        platform=ad.platform,
        hook_type=a.hook_type if a else None,
        hook_text=a.hook_text if a else None,
        angle=a.angle if a else None,
        angle_detail=a.angle_detail if a else None,
        offer_type=a.offer_type if a else None,
        confidence_score=a.confidence_score if a else 0.0,
        status=ad.status,
        headline=ad.headline,
        primary_text=ad.primary_text,
        cta=ad.cta,
        ad_url=ad.ad_url,
        landing_url=ad.landing_url,
        media_url=ad.media_url,
        is_video=ad.is_video,
        variants=ad.variants,
        running_since_days=days,
        running_since_date=date_str,
        captured_at=ad.captured_at,
        last_seen=ad.last_seen,
        first_seen=ad.first_seen,
        notes=ad.notes,
        ai_insights=insights,
        ai_notes=a.ai_notes if a else None,
        analysis=analysis_block,
        est_roas=0.0,
        est_engagement=0.0,
        ad_library_id=ad.ad_library_id,
        created_at=ad.created_at,
        updated_at=ad.updated_at,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=AISummary)
async def get_ai_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """KPI cards for the AI Analysis page."""
    # Total analyzed = rows in ad_analyses
    total_stmt = select(func.count(AdAnalysis.id))
    total_analyzed = (await db.execute(total_stmt)).scalar() or 0

    # Winning = confidence >= threshold
    winning_stmt = select(func.count(AdAnalysis.id)).where(
        AdAnalysis.confidence_score >= WINNING_THRESHOLD
    )
    winning_ads = (await db.execute(winning_stmt)).scalar() or 0

    # Avg confidence across all analyses
    avg_stmt = select(func.avg(AdAnalysis.confidence_score))
    avg_raw = (await db.execute(avg_stmt)).scalar()
    avg_confidence = round(float(avg_raw), 1) if avg_raw else 0.0

    return AISummary(
        total_analyzed=total_analyzed,
        winning_ads=winning_ads,
        winning_ads_trend=0.0,
        avg_confidence=avg_confidence,
        avg_conf_trend=0.0,
        engagement_rate=0.0,
        engagement_trend=0.0,
        roas_est=0.0,
        roas_trend=0.0,
    )


@router.get("/timeline", response_model=List[TimelinePoint])
async def get_performance_timeline(
    days: int = Query(14, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Winning ads count per day for the last N days (default 14).
    All dates are always present — missing days return zeros.
    engagement_rate and roas are always 0.0 (not available from FB Ad Library).
    """
    start_date = datetime.now(timezone.utc) - timedelta(days=days - 1)
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

    # Count winning analyses grouped by day
    stmt = (
        select(
            func.date_trunc("day", AdAnalysis.analyzed_at).label("day"),
            func.count(AdAnalysis.id).label("c"),
        )
        .where(
            AdAnalysis.confidence_score >= WINNING_THRESHOLD,
            AdAnalysis.analyzed_at >= start_date,
        )
        .group_by("day")
        .order_by("day")
    )
    rows = (await db.execute(stmt)).all()

    # Build date-keyed lookup from DB results
    db_counts: dict = {}
    for row in rows:
        day_date = row[0].date() if hasattr(row[0], "date") else row[0]
        db_counts[day_date] = row[1]

    # Generate all N days, fill zeros for missing
    points: List[TimelinePoint] = []
    for i in range(days):
        d = (start_date + timedelta(days=i)).date()
        date_str = d.strftime("%b %d")
        points.append(TimelinePoint(
            date=date_str,
            winning_ads=db_counts.get(d, 0),
            engagement_rate=0.0,
            roas=0.0,
        ))

    return points


@router.get("/angles", response_model=List[AngleDonutItem])
async def get_top_angles_donut(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Angle distribution for the donut chart on the AI Analysis page.
    Aggregated from ad_analyses.angle — same source as /angles/type-dist
    but with a different response shape (name/value/pct).
    """
    stmt = (
        select(AdAnalysis.angle, func.count(AdAnalysis.id).label("c"))
        .where(AdAnalysis.angle.is_not(None))
        .group_by(AdAnalysis.angle)
        .order_by(func.count(AdAnalysis.id).desc())
    )
    rows = (await db.execute(stmt)).all()
    total = sum(r[1] for r in rows)

    return [
        AngleDonutItem(
            name=r[0],
            value=r[1],
            pct=round(r[1] / total * 100, 1) if total else 0.0,
        )
        for r in rows
    ]


@router.get("/confidence-dist", response_model=List[ConfidenceDistItem])
async def get_confidence_distribution(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Confidence score distribution across 5 fixed buckets.
    Buckets: 0-20, 21-40, 41-60, 61-80, 81-100.
    All 5 buckets always returned — count=0 if empty.
    """
    result = []
    for bucket in CONF_BUCKETS:
        stmt = select(func.count(AdAnalysis.id)).where(
            AdAnalysis.confidence_score >= bucket["min"],
            AdAnalysis.confidence_score <= bucket["max"],
        )
        count = (await db.execute(stmt)).scalar() or 0
        result.append(ConfidenceDistItem(
            range=bucket["range"],
            label=bucket["label"],
            count=count,
            color=bucket["color"],
        ))

    return result


@router.get("/winning-ads", response_model=List[WinningAdResponse])
async def get_winning_ads(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Top winning ads sorted by confidence_score DESC.
    Returns plain array (frontend does client-side pagination with Array.slice).
    rank field is 1-indexed position in this sorted list.
    est_roas and est_engagement are always 0.0 — not available from FB Ad Library.
    """
    stmt = (
        select(Ad)
        .join(AdAnalysis, AdAnalysis.ad_id == Ad.id)
        .where(AdAnalysis.confidence_score >= WINNING_THRESHOLD)
        .options(
            selectinload(Ad.competitor),
            selectinload(Ad.analysis),
        )
        .order_by(AdAnalysis.confidence_score.desc())
    )
    ads = (await db.execute(stmt)).scalars().unique().all()

    return [_build_winning_ad(ad, rank=i + 1) for i, ad in enumerate(ads)]
