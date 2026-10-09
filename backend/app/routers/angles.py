"""
Angle Library endpoints — aggregations over analyzed ads (ad_analyses.angle).

Mirrors the Hook Library: every number comes from ad_analyses joined to ads and
competitors, and all five endpoints share one filter helper (from
_library_common) so the cards, charts and table always describe the same set.

Filters: search, angle, competitor, confidence, date range (on ads.active_since).
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
from app.routers._library_common import (
    AD_KEY,
    LibraryFilters,
    LibrarySpec,
    apply_filters,
    base,
    compute_trending,
    filter_options,
    initials,
    make_filters_dependency,
    trend_windows,
)
from app.schemas.angle import (
    AnglesSummary,
    TopAnglePerformer,
    TrendingAngle,
    AngleTypeDistItem,
    AnglePerformanceItem,
    AngleTrendPoint,
    AngleRow,
    AngleCompetitorRef,
    AngleFilterOptions,
    FilterCompetitor,
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

# Angle is both the grouped dimension and the row key.
SPEC = LibrarySpec(
    dimension_col=AdAnalysis.angle,
    value_col=AdAnalysis.angle,
    search_cols=[AdAnalysis.angle, AdAnalysis.angle_detail],
)

angle_filters = make_filters_dependency("angle")

# Which angle series the trend line draws (top of the mix).
TREND_ANGLES = ("Price", "Quality", "Speed", "Benefit")


# ─── Filter options ───────────────────────────────────────────────────────────

@router.get("/filter-options", response_model=AngleFilterOptions)
async def get_filter_options(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dropdown options from analyzed ads: competitors + distinct angles."""
    competitors, angles = await filter_options(db, SPEC)
    return AngleFilterOptions(
        competitors=[FilterCompetitor(id=cid, name=name) for cid, name in competitors],
        angles=angles,
    )


# ─── Summary ──────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=AnglesSummary)
async def get_angles_summary(
    f: LibraryFilters = Depends(angle_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """KPI cards. Mentions count each ad once (by ad_library_id)."""
    mentions_expr = func.count(distinct(AD_KEY))

    total_unique = (await db.execute(
        apply_filters(base().add_columns(func.count(distinct(AdAnalysis.angle))), f, SPEC)
    )).scalar() or 0

    total_mentions = (await db.execute(
        apply_filters(base().add_columns(mentions_expr), f, SPEC)
    )).scalar() or 0

    top_stmt = apply_filters(
        base().add_columns(AdAnalysis.angle, mentions_expr.label("c")), f, SPEC
    ).group_by(AdAnalysis.angle).order_by(mentions_expr.desc()).limit(1)
    row = (await db.execute(top_stmt)).first()
    top_angle = row[0] if row else None
    top_count = row[1] if row else 0
    top_pct = round(top_count / total_mentions * 100, 1) if total_mentions else 0.0

    # Top performing angle = longest average days running, min 3 ads.
    days_avg = func.avg(Ad.days_running)
    perf_stmt = apply_filters(
        base().add_columns(AdAnalysis.angle, days_avg.label("avg_days"), mentions_expr.label("c")), f, SPEC
    ).group_by(AdAnalysis.angle).having(mentions_expr >= 3).order_by(days_avg.desc()).limit(1)
    perf_row = (await db.execute(perf_stmt)).first()
    top_performer = (
        TopAnglePerformer(name=perf_row[0], avg_score=round(float(perf_row[1] or 0), 1))
        if perf_row else None
    )

    # Trending angle = biggest 7d-vs-prior-7d growth in ads that started running.
    trending = None
    cur, prev = await trend_windows(db, f, SPEC)
    best = None
    for name, cur_n in cur.items():
        if cur_n <= 0:
            continue
        prev_n = prev.get(name, 0)
        pct = None if prev_n == 0 else round((cur_n - prev_n) / prev_n * 100, 1)
        key = (cur_n, pct if pct is not None else 1e9)
        if best is None or key > best[0]:
            best = (key, name, pct)
    if best:
        trending = TrendingAngle(name=best[1], pct=best[2] if best[2] is not None else 0.0)

    return AnglesSummary(
        total_unique=total_unique,
        total_mentions=total_mentions,
        mentions_trend=0.0,
        top_angle=top_angle,
        top_angle_pct=top_pct,
        top_performing_angle=top_performer,
        trending_angle=trending,
    )


# ─── Distribution (donut) ───────────────────────────────────────────────────────

@router.get("/type-dist", response_model=List[AngleTypeDistItem])
async def get_angles_type_distribution(
    f: LibraryFilters = Depends(angle_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Angle distribution for the donut — de-duplicated ad counts."""
    mentions_expr = func.count(distinct(AD_KEY))
    stmt = apply_filters(
        base().add_columns(AdAnalysis.angle, mentions_expr.label("c")), f, SPEC
    ).group_by(AdAnalysis.angle).order_by(mentions_expr.desc())
    rows = (await db.execute(stmt)).all()
    total = sum(r[1] for r in rows)
    return [
        AngleTypeDistItem(name=r[0], value=r[1], pct=round(r[1] / total * 100, 1) if total else 0.0)
        for r in rows
    ]


# ─── Performance → Longevity (bar) ─────────────────────────────────────────────

@router.get("/performance", response_model=List[AnglePerformanceItem])
async def get_angles_performance(
    f: LibraryFilters = Depends(angle_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Average days running per angle (longevity), with the ad count per bar."""
    days_avg = func.avg(Ad.days_running)
    ad_count = func.count(distinct(AD_KEY))
    stmt = apply_filters(
        base().add_columns(AdAnalysis.angle, days_avg.label("avg_days"), ad_count.label("ads")), f, SPEC
    ).group_by(AdAnalysis.angle).order_by(days_avg.desc())
    rows = (await db.execute(stmt)).all()
    return [
        AnglePerformanceItem(
            name=r[0],
            avg_days=round(float(r[1] or 0), 1),
            ads=r[2],
            color=ANGLE_COLORS.get(r[0], "#94A3B8"),
        )
        for r in rows
    ]


# ─── Trend (line) ───────────────────────────────────────────────────────────────

@router.get("/trend", response_model=List[AngleTrendPoint])
async def get_angles_trend(
    days: int = Query(7, ge=1, le=90),
    f: LibraryFilters = Depends(angle_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Angle counts over time, grouped by ads.active_since."""
    start_date = (datetime.now(timezone.utc) - timedelta(days=days - 1)).date()

    stmt = apply_filters(
        base().add_columns(
            Ad.active_since.label("day"),
            AdAnalysis.angle,
            func.count(distinct(AD_KEY)).label("c"),
        ), f, SPEC
    ).where(
        Ad.active_since.is_not(None),
        Ad.active_since >= start_date,
    ).group_by(Ad.active_since, AdAnalysis.angle).order_by(Ad.active_since)
    rows = (await db.execute(stmt)).all()

    points: dict = {}
    for i in range(days):
        d = start_date + timedelta(days=i)
        date_str = d.strftime("%b %d")
        points[date_str] = {"date": date_str, "Price": 0, "Quality": 0, "Speed": 0, "Benefit": 0}

    for row in rows:
        day_date = row[0]
        if day_date is None:
            continue
        date_str = day_date.strftime("%b %d")
        angle = row[1]
        count = row[2]
        if date_str in points and angle in TREND_ANGLES:
            points[date_str][angle] = count

    return [AngleTrendPoint(**p) for p in points.values()]


# ─── Angle table ────────────────────────────────────────────────────────────────

@router.get("", response_model=List[AngleRow])
async def list_angles(
    f: LibraryFilters = Depends(angle_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All detected angles with stats, sorted by de-duplicated mentions desc."""
    mentions_expr = func.count(distinct(AD_KEY))

    agg_stmt = apply_filters(
        base().add_columns(
            AdAnalysis.angle,
            func.mode().within_group(AdAnalysis.angle_detail).label("subtitle"),
            mentions_expr.label("mentions"),
            func.avg(AdAnalysis.confidence_score).label("avg_conf"),
            func.avg(Ad.days_running).label("avg_days"),
            func.min(Ad.active_since).label("first_seen"),
        ), f, SPEC
    ).group_by(AdAnalysis.angle).order_by(mentions_expr.desc())
    agg_rows = (await db.execute(agg_stmt)).all()

    names = [r[0] for r in agg_rows]
    if not names:
        return []

    comp_stmt = apply_filters(
        select()
        .select_from(AdAnalysis)
        .join(Ad, Ad.id == AdAnalysis.ad_id)
        .join(Competitor, Competitor.id == Ad.competitor_id)
        .add_columns(AdAnalysis.angle, Competitor.id, Competitor.name)
        .distinct(),
        f, SPEC,
    ).where(AdAnalysis.angle.in_(names))
    comps_by_angle: dict = {}
    for angle, cid, cname in (await db.execute(comp_stmt)).all():
        comps_by_angle.setdefault(angle, []).append((str(cid), cname))

    media_stmt = apply_filters(
        base().add_columns(AdAnalysis.angle, Ad.media_url), f, SPEC
    ).where(AdAnalysis.angle.in_(names), Ad.media_url.is_not(None))
    media_by_angle: dict = {}
    for angle, media_url in (await db.execute(media_stmt)).all():
        bucket = media_by_angle.setdefault(angle, [])
        if media_url and media_url not in bucket and len(bucket) < 3:
            bucket.append(media_url)

    cur_win, prev_win = await trend_windows(db, f, SPEC)
    has_prev_period = bool(prev_win)

    result: List[AngleRow] = []
    for rank, r in enumerate(agg_rows, start=1):
        angle, subtitle, mentions, avg_conf, avg_days, first_seen = r
        all_comps = [
            AngleCompetitorRef(id=cid, name=cname, initials=initials(cname))
            for cid, cname in comps_by_angle.get(angle, [])
        ]
        result.append(
            AngleRow(
                id=str(rank),
                rank=rank,
                name=angle,
                subtitle=subtitle,
                description=ANGLE_DESCRIPTIONS.get(angle, ""),
                mentions=mentions,
                avg_confidence=round(float(avg_conf or 0), 1),
                avg_days_running=round(float(avg_days or 0), 1),
                trending=compute_trending(
                    cur_win.get(angle, 0), prev_win.get(angle, 0), has_prev_period
                ),
                competitors=all_comps[:3],
                extra_competitors=max(0, len(all_comps) - 3),
                example_ads=media_by_angle.get(angle, []),
                first_seen=first_seen.strftime("%b %d, %Y") if first_seen else None,
                related_hooks=[],
            )
        )

    return result
