"""
Hook Library endpoints — aggregations over analyzed ads.

Every number on the Hook Library page comes from ad_analyses joined to ads and
competitors. All five read endpoints share one filter helper (from
_library_common) so the cards, charts and table can never describe different
subsets of the data.

Filters: search, hook_type, competitor, confidence, date range (on
ads.active_since). There is deliberately no offer-type filter here — that is the
Offer Library's dimension.
"""

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, distinct
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
from app.schemas.hook import (
    HooksSummary,
    TopHookPerformer,
    TrendingHook,
    HookTypeDistItem,
    HookPerformanceItem,
    HookTrendPoint,
    HookRow,
    HookCompetitorRef,
    HookFilterOptions,
    FilterCompetitor,
)


router = APIRouter(prefix="/hooks", tags=["hooks"])


HOOK_TYPE_COLORS = {
    "Pain": "#EF4444",
    "Benefit": "#22C55E",
    "Curiosity": "#8B5CF6",
    "Urgency": "#F97316",
    "How To": "#14B8A6",
    "Social Proof": "#6366F1",
    "Trust": "#3B82F6",
}

HOOK_TYPE_DESCRIPTIONS = {
    "Pain": "Addresses a specific frustration the target audience faces, creating emotional resonance before presenting a solution.",
    "Benefit": "Leads with a compelling outcome or advantage, immediately communicating value to potential customers.",
    "Curiosity": "Opens with a question or surprising statement that compels the audience to keep watching or reading to get the answer.",
    "Urgency": "Creates a sense of time pressure or scarcity to drive immediate action and reduce purchase hesitation.",
    "How To": "Promises practical, actionable knowledge that solves a problem, positioning the brand as a helpful expert.",
    "Social Proof": "Leverages numbers, reviews, or endorsements to build trust through the wisdom or behavior of others.",
    "Trust": "Emphasizes guarantees, certifications, or reliability signals to reduce risk perception and build confidence.",
}

# This page's dimension is hook_type; each row keys on hook_text.
SPEC = LibrarySpec(
    dimension_col=AdAnalysis.hook_type,
    value_col=AdAnalysis.hook_text,
    search_cols=[AdAnalysis.hook_text],
)

hook_filters = make_filters_dependency("hook_type")


# ─── Filter options ───────────────────────────────────────────────────────────

@router.get("/filter-options", response_model=HookFilterOptions)
async def get_filter_options(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dropdown options, all derived from analyzed ads (no hardcoded lists)."""
    competitors, hook_types = await filter_options(db, SPEC)
    return HookFilterOptions(
        competitors=[FilterCompetitor(id=cid, name=name) for cid, name in competitors],
        hook_types=hook_types,
    )


# ─── Summary ──────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=HooksSummary)
async def get_hooks_summary(
    f: LibraryFilters = Depends(hook_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """KPI cards. Mentions count each ad once (by ad_library_id)."""
    mentions_expr = func.count(distinct(AD_KEY))

    total_unique = (await db.execute(
        apply_filters(base().add_columns(func.count(distinct(AdAnalysis.hook_text))), f, SPEC)
    )).scalar() or 0

    total_mentions = (await db.execute(
        apply_filters(base().add_columns(mentions_expr), f, SPEC)
    )).scalar() or 0

    type_stmt = apply_filters(
        base().add_columns(AdAnalysis.hook_type, mentions_expr.label("c")), f, SPEC
    ).where(AdAnalysis.hook_type.is_not(None)).group_by(AdAnalysis.hook_type).order_by(mentions_expr.desc()).limit(1)
    row = (await db.execute(type_stmt)).first()
    top_hook_type = row[0] if row else None
    top_count = row[1] if row else 0
    top_pct = round(top_count / total_mentions * 100, 1) if total_mentions else 0.0

    # Top performing hook = longest average days running, min 3 ads so one old
    # ad can't win. Confidence is NOT used for performance.
    days_avg = func.avg(Ad.days_running)
    perf_stmt = apply_filters(
        base().add_columns(AdAnalysis.hook_text, days_avg.label("avg_days"), mentions_expr.label("c")), f, SPEC
    ).group_by(AdAnalysis.hook_text).having(mentions_expr >= 3).order_by(days_avg.desc()).limit(1)
    perf_row = (await db.execute(perf_stmt)).first()
    top_performer = (
        TopHookPerformer(text=perf_row[0], avg_score=round(float(perf_row[1] or 0), 1))
        if perf_row else None
    )

    # Trending hook = biggest 7d-vs-prior-7d growth in ads that started running.
    trending = None
    cur, prev = await trend_windows(db, f, SPEC)
    best = None
    for text, cur_n in cur.items():
        if cur_n <= 0:
            continue
        prev_n = prev.get(text, 0)
        pct = None if prev_n == 0 else round((cur_n - prev_n) / prev_n * 100, 1)
        key = (cur_n, pct if pct is not None else 1e9)
        if best is None or key > best[0]:
            best = (key, text, pct)
    if best:
        trending = TrendingHook(text=best[1], pct=best[2] if best[2] is not None else 0.0)

    return HooksSummary(
        total_unique=total_unique,
        total_mentions=total_mentions,
        mentions_trend=0.0,
        top_hook_type=top_hook_type,
        top_hook_type_pct=top_pct,
        top_performing_hook=top_performer,
        trending_hook=trending,
    )


# ─── Type distribution (donut) ─────────────────────────────────────────────────

@router.get("/type-dist", response_model=List[HookTypeDistItem])
async def get_hooks_type_distribution(
    f: LibraryFilters = Depends(hook_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hook type distribution for the donut — de-duplicated ad counts."""
    mentions_expr = func.count(distinct(AD_KEY))
    stmt = apply_filters(
        base().add_columns(AdAnalysis.hook_type, mentions_expr.label("c")), f, SPEC
    ).where(AdAnalysis.hook_type.is_not(None)).group_by(AdAnalysis.hook_type).order_by(mentions_expr.desc())
    rows = (await db.execute(stmt)).all()
    total = sum(r[1] for r in rows)
    return [
        HookTypeDistItem(name=r[0], value=r[1], pct=round(r[1] / total * 100, 1) if total else 0.0)
        for r in rows
    ]


# ─── Performance → Longevity (bar) ─────────────────────────────────────────────

@router.get("/performance", response_model=List[HookPerformanceItem])
async def get_hooks_performance(
    f: LibraryFilters = Depends(hook_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Average days running per hook type (longevity), with the ad count behind
    each bar. Replaces the old avg-confidence bars (≈90% for every type).
    """
    days_avg = func.avg(Ad.days_running)
    ad_count = func.count(distinct(AD_KEY))
    stmt = apply_filters(
        base().add_columns(AdAnalysis.hook_type, days_avg.label("avg_days"), ad_count.label("ads")), f, SPEC
    ).where(AdAnalysis.hook_type.is_not(None)).group_by(AdAnalysis.hook_type).order_by(days_avg.desc())
    rows = (await db.execute(stmt)).all()
    return [
        HookPerformanceItem(
            type=r[0],
            avg_days=round(float(r[1] or 0), 1),
            ads=r[2],
            color=HOOK_TYPE_COLORS.get(r[0], "#94A3B8"),
        )
        for r in rows
    ]


# ─── Trend (line) ───────────────────────────────────────────────────────────────

@router.get("/trend", response_model=List[HookTrendPoint])
async def get_hooks_trend(
    days: int = Query(7, ge=1, le=90),
    f: LibraryFilters = Depends(hook_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hook type counts over time, grouped by ads.active_since."""
    from datetime import datetime, timezone, timedelta
    start_date = (datetime.now(timezone.utc) - timedelta(days=days - 1)).date()

    stmt = apply_filters(
        base().add_columns(
            Ad.active_since.label("day"),
            AdAnalysis.hook_type,
            func.count(distinct(AD_KEY)).label("c"),
        ), f, SPEC
    ).where(
        AdAnalysis.hook_type.is_not(None),
        Ad.active_since.is_not(None),
        Ad.active_since >= start_date,
    ).group_by(Ad.active_since, AdAnalysis.hook_type).order_by(Ad.active_since)
    rows = (await db.execute(stmt)).all()

    points: dict = {}
    for i in range(days):
        d = start_date + timedelta(days=i)
        date_str = d.strftime("%b %d")
        points[date_str] = {"date": date_str, "Pain": 0, "Benefit": 0, "Curiosity": 0, "Urgency": 0}

    for row in rows:
        day_date = row[0]
        if day_date is None:
            continue
        date_str = day_date.strftime("%b %d")
        hook_type = row[1]
        count = row[2]
        if date_str in points and hook_type in ("Pain", "Benefit", "Curiosity", "Urgency"):
            points[date_str][hook_type] = count

    return [HookTrendPoint(**p) for p in points.values()]


# ─── Hook table ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[HookRow])
async def list_hooks(
    f: LibraryFilters = Depends(hook_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All detected hooks with stats, sorted by de-duplicated mentions desc.

    Grouped queries (competitors, example media, two trend windows) instead of
    per-row queries.
    """
    mentions_expr = func.count(distinct(AD_KEY))

    agg_stmt = apply_filters(
        base().add_columns(
            AdAnalysis.hook_text,
            func.mode().within_group(AdAnalysis.hook_type).label("hook_type"),
            mentions_expr.label("mentions"),
            func.avg(AdAnalysis.confidence_score).label("avg_conf"),
            func.avg(Ad.days_running).label("avg_days"),
            func.min(Ad.active_since).label("first_seen"),
        ), f, SPEC
    ).group_by(AdAnalysis.hook_text).order_by(mentions_expr.desc())
    agg_rows = (await db.execute(agg_stmt)).all()

    hook_texts = [r[0] for r in agg_rows]
    if not hook_texts:
        return []

    comp_stmt = apply_filters(
        select()
        .select_from(AdAnalysis)
        .join(Ad, Ad.id == AdAnalysis.ad_id)
        .join(Competitor, Competitor.id == Ad.competitor_id)
        .add_columns(AdAnalysis.hook_text, Competitor.id, Competitor.name)
        .distinct(),
        f, SPEC,
    ).where(AdAnalysis.hook_text.in_(hook_texts))
    comps_by_hook: dict = {}
    for hook_text, cid, cname in (await db.execute(comp_stmt)).all():
        comps_by_hook.setdefault(hook_text, []).append((str(cid), cname))

    media_stmt = apply_filters(
        base().add_columns(AdAnalysis.hook_text, Ad.media_url), f, SPEC
    ).where(AdAnalysis.hook_text.in_(hook_texts), Ad.media_url.is_not(None))
    media_by_hook: dict = {}
    for hook_text, media_url in (await db.execute(media_stmt)).all():
        bucket = media_by_hook.setdefault(hook_text, [])
        if media_url and media_url not in bucket and len(bucket) < 3:
            bucket.append(media_url)

    cur_win, prev_win = await trend_windows(db, f, SPEC)
    has_prev_period = bool(prev_win)

    result: List[HookRow] = []
    for rank, r in enumerate(agg_rows, start=1):
        hook_text, hook_type, mentions, avg_conf, avg_days, first_seen = r
        all_comps = [
            HookCompetitorRef(id=cid, name=cname, initials=initials(cname))
            for cid, cname in comps_by_hook.get(hook_text, [])
        ]
        result.append(
            HookRow(
                id=str(rank),
                rank=rank,
                text=hook_text,
                description=HOOK_TYPE_DESCRIPTIONS.get(hook_type, ""),
                type=hook_type,
                mentions=mentions,
                avg_confidence=round(float(avg_conf or 0), 1),
                avg_days_running=round(float(avg_days or 0), 1),
                trending=compute_trending(
                    cur_win.get(hook_text, 0), prev_win.get(hook_text, 0), has_prev_period
                ),
                competitors=all_comps[:3],
                extra_competitors=max(0, len(all_comps) - 3),
                example_ads=media_by_hook.get(hook_text, []),
                first_seen=first_seen.strftime("%b %d, %Y") if first_seen else None,
                related_angles=[],
            )
        )

    return result
