"""
Hook Library endpoints — aggregations over ad_analyses.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.competitor import Competitor
from app.schemas.hook import (
    HooksSummary,
    TopHookPerformer,
    TrendingHook,
    HookTypeDistItem,
    HookPerformanceItem,
    HookTrendPoint,
    HookRow,
    HookCompetitorRef,
)


router = APIRouter(prefix="/hooks", tags=["hooks"])


# Brand colors for hook types — matches frontend fixture
HOOK_TYPE_COLORS = {
    "Pain": "#EF4444",
    "Benefit": "#22C55E",
    "Curiosity": "#8B5CF6",
    "Urgency": "#F97316",
    "How To": "#14B8A6",
    "Social Proof": "#6366F1",
    "Trust": "#3B82F6",
}

# Descriptions used in the table
HOOK_TYPE_DESCRIPTIONS = {
    "Pain": "Addresses a specific frustration the target audience faces, creating emotional resonance before presenting a solution.",
    "Benefit": "Leads with a compelling outcome or advantage, immediately communicating value to potential customers.",
    "Curiosity": "Opens with a question or surprising statement that compels the audience to keep watching or reading to get the answer.",
    "Urgency": "Creates a sense of time pressure or scarcity to drive immediate action and reduce purchase hesitation.",
    "How To": "Promises practical, actionable knowledge that solves a problem, positioning the brand as a helpful expert.",
    "Social Proof": "Leverages numbers, reviews, or endorsements to build trust through the wisdom or behavior of others.",
    "Trust": "Emphasizes guarantees, certifications, or reliability signals to reduce risk perception and build confidence.",
}


def _initials(name: str) -> str:
    """Get 2-letter initials for a competitor name."""
    if not name:
        return "?"
    words = name.split()
    if len(words) >= 2:
        return (words[0][0] + words[1][0]).upper()
    return name[:2].upper()


# ---------- Endpoints ----------

@router.get("/summary", response_model=HooksSummary)
async def get_hooks_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate KPIs for the Hooks Library top cards."""
    # Total unique hooks = distinct hook_text values
    unique_stmt = select(func.count(distinct(AdAnalysis.hook_text))).where(
        AdAnalysis.hook_text.is_not(None)
    )
    total_unique = (await db.execute(unique_stmt)).scalar() or 0

    # Total mentions = total analyses with a hook
    total_stmt = select(func.count(AdAnalysis.id)).where(
        AdAnalysis.hook_text.is_not(None)
    )
    total_mentions = (await db.execute(total_stmt)).scalar() or 0

    # Top hook type (most common)
    type_stmt = (
        select(AdAnalysis.hook_type, func.count(AdAnalysis.id).label("c"))
        .where(AdAnalysis.hook_type.is_not(None))
        .group_by(AdAnalysis.hook_type)
        .order_by(func.count(AdAnalysis.id).desc())
        .limit(1)
    )
    row = (await db.execute(type_stmt)).first()
    top_hook_type = row[0] if row else None
    top_count = row[1] if row else 0
    top_pct = round(top_count / total_mentions * 100, 1) if total_mentions else 0.0

    # Top performing hook (highest avg confidence)
    perf_stmt = (
        select(AdAnalysis.hook_text, func.avg(AdAnalysis.confidence_score).label("avg_score"))
        .where(AdAnalysis.hook_text.is_not(None))
        .group_by(AdAnalysis.hook_text)
        .order_by(func.avg(AdAnalysis.confidence_score).desc())
        .limit(1)
    )
    perf_row = (await db.execute(perf_stmt)).first()
    top_performer = (
        TopHookPerformer(text=perf_row[0], avg_score=round(float(perf_row[1]), 1))
        if perf_row else None
    )

    # Trending hook — most-mentioned in last 7 days
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    trend_stmt = (
        select(AdAnalysis.hook_text, func.count(AdAnalysis.id).label("c"))
        .where(
            AdAnalysis.hook_text.is_not(None),
            AdAnalysis.analyzed_at >= week_ago,
        )
        .group_by(AdAnalysis.hook_text)
        .order_by(func.count(AdAnalysis.id).desc())
        .limit(1)
    )
    trend_row = (await db.execute(trend_stmt)).first()
    trending = (
        TrendingHook(text=trend_row[0], pct=round(trend_row[1] / max(total_mentions, 1) * 100, 1))
        if trend_row else None
    )

    return HooksSummary(
        total_unique=total_unique,
        total_mentions=total_mentions,
        mentions_trend=0.0,
        top_hook_type=top_hook_type,
        top_hook_type_pct=top_pct,
        top_performing_hook=top_performer,
        trending_hook=trending,
    )


@router.get("/type-dist", response_model=List[HookTypeDistItem])
async def get_hooks_type_distribution(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hook type distribution (counts + percentages) for the donut chart."""
    stmt = (
        select(AdAnalysis.hook_type, func.count(AdAnalysis.id).label("c"))
        .where(AdAnalysis.hook_type.is_not(None))
        .group_by(AdAnalysis.hook_type)
        .order_by(func.count(AdAnalysis.id).desc())
    )
    rows = (await db.execute(stmt)).all()
    total = sum(r[1] for r in rows)

    return [
        HookTypeDistItem(
            name=r[0],
            value=r[1],
            pct=round(r[1] / total * 100, 1) if total else 0.0,
        )
        for r in rows
    ]


@router.get("/performance", response_model=List[HookPerformanceItem])
async def get_hooks_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Avg confidence score per hook type — for the bar chart."""
    stmt = (
        select(
            AdAnalysis.hook_type,
            func.avg(AdAnalysis.confidence_score).label("avg_score"),
        )
        .where(AdAnalysis.hook_type.is_not(None))
        .group_by(AdAnalysis.hook_type)
        .order_by(func.avg(AdAnalysis.confidence_score).desc())
    )
    rows = (await db.execute(stmt)).all()

    return [
        HookPerformanceItem(
            type=r[0],
            avg_score=round(float(r[1]), 1),
            color=HOOK_TYPE_COLORS.get(r[0], "#94A3B8"),
        )
        for r in rows
    ]


@router.get("/trend", response_model=List[HookTrendPoint])
async def get_hooks_trend(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hook type mentions over time (last N days) for the line chart."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days - 1)
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

    # Group counts by (date, hook_type)
    stmt = (
        select(
            func.date_trunc("day", AdAnalysis.analyzed_at).label("day"),
            AdAnalysis.hook_type,
            func.count(AdAnalysis.id).label("c"),
        )
        .where(
            AdAnalysis.hook_type.is_not(None),
            AdAnalysis.analyzed_at >= start_date,
        )
        .group_by("day", AdAnalysis.hook_type)
        .order_by("day")
    )
    rows = (await db.execute(stmt)).all()

    # Build a date-indexed dict of trend points
    points: dict = {}
    for i in range(days):
        d = (start_date + timedelta(days=i)).date()
        date_str = d.strftime("%b %d")
        points[date_str] = {"date": date_str, "Pain": 0, "Benefit": 0, "Curiosity": 0, "Urgency": 0}

    for row in rows:
        day_date = row[0].date() if hasattr(row[0], "date") else row[0]
        date_str = day_date.strftime("%b %d")
        hook_type = row[1]
        count = row[2]
        if date_str in points and hook_type in ("Pain", "Benefit", "Curiosity", "Urgency"):
            points[date_str][hook_type] = count

    return [HookTrendPoint(**p) for p in points.values()]


@router.get("", response_model=List[HookRow])
async def list_hooks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all detected hooks with stats, sorted by mentions desc."""
    # Aggregate by hook_text
    stmt = (
        select(
            AdAnalysis.hook_text,
            AdAnalysis.hook_type,
            func.count(AdAnalysis.id).label("mentions"),
            func.avg(AdAnalysis.confidence_score).label("avg_conf"),
            func.min(AdAnalysis.analyzed_at).label("first_seen"),
        )
        .where(AdAnalysis.hook_text.is_not(None))
        .group_by(AdAnalysis.hook_text, AdAnalysis.hook_type)
        .order_by(func.count(AdAnalysis.id).desc())
    )
    rows = (await db.execute(stmt)).all()

    result: List[HookRow] = []
    for rank, r in enumerate(rows, start=1):
        hook_text, hook_type, mentions, avg_conf, first_seen = r

        # Get competitors that used this hook (max 3 shown)
        comp_stmt = (
            select(Competitor.id, Competitor.name)
            .join(Ad, Ad.competitor_id == Competitor.id)
            .join(AdAnalysis, AdAnalysis.ad_id == Ad.id)
            .where(AdAnalysis.hook_text == hook_text)
            .distinct()
        )
        comp_rows = (await db.execute(comp_stmt)).all()
        all_comps = [
            HookCompetitorRef(id=str(c[0]), name=c[1], initials=_initials(c[1]))
            for c in comp_rows
        ]
        shown = all_comps[:3]
        extra = max(0, len(all_comps) - 3)

        # Get up to 3 example ad media URLs (or use placeholder)
        media_stmt = (
            select(Ad.media_url)
            .join(AdAnalysis, AdAnalysis.ad_id == Ad.id)
            .where(AdAnalysis.hook_text == hook_text)
            .limit(3)
        )
        media_rows = (await db.execute(media_stmt)).all()
        example_ads = [m[0] for m in media_rows if m[0]]

        first_seen_str = first_seen.strftime("%b %d, %Y") if first_seen else None

        result.append(
            HookRow(
                id=str(rank),
                rank=rank,
                text=hook_text,
                description=HOOK_TYPE_DESCRIPTIONS.get(hook_type, ""),
                type=hook_type,
                offer_type=None,
                mentions=mentions,
                avg_confidence=round(float(avg_conf), 1),
                trending=0.0,
                competitors=shown,
                extra_competitors=extra,
                example_ads=example_ads,
                first_seen=first_seen_str,
                related_angles=[],
            )
        )

    return result