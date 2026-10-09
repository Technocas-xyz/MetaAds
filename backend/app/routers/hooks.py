"""
Hook Library endpoints — aggregations over analyzed ads.

Every number on the Hook Library page comes from ad_analyses joined to ads and
competitors. All five read endpoints share one filter helper (hook_filters +
apply_hook_filters) so the cards, charts and table can never describe different
subsets of the data.
"""

from datetime import datetime, timezone, timedelta, date as date_type
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, distinct, cast, String
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
    HookFilterOptions,
    FilterCompetitor,
)


router = APIRouter(prefix="/hooks", tags=["hooks"])


# Brand colors for hook types — matches frontend
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

# "None"/"none" offer_type values are noise, not a real offer.
_NONE_OFFERS = ("none", "n/a", "")

# A per-ad identity that de-duplicates on ad_library_id but still counts ads
# with no library id once (keyed on their row id).
AD_KEY = func.coalesce(Ad.ad_library_id, cast(Ad.id, String))


def _initials(name: str) -> str:
    if not name:
        return "?"
    words = name.split()
    if len(words) >= 2:
        return (words[0][0] + words[1][0]).upper()
    return name[:2].upper()


# ─── Shared filtering ─────────────────────────────────────────────────────────

class HookFilters:
    """Parsed Hook Library filters, shared by every endpoint on the page.

    Confidence is a numeric range (min/max) so the frontend's High/Medium/Low
    buckets map onto it directly. Dates filter on ads.active_since (when the ad
    started running), the same field the trend and longevity use.

    A plain data object (no FastAPI defaults) so it is trivial to build in tests;
    request parsing lives in the `hook_filters` dependency below.
    """

    def __init__(
        self,
        search: Optional[str] = None,
        hook_type: Optional[str] = None,
        competitor_id: Optional[str] = None,
        offer_type: Optional[str] = None,
        min_confidence: Optional[float] = None,
        max_confidence: Optional[float] = None,
        date_from: Optional[date_type] = None,
        date_to: Optional[date_type] = None,
    ):
        self.search = (search or "").strip() or None
        self.hook_type = self._clean(hook_type, {"all types", "all"})
        self.competitor_id = self._clean(competitor_id, {"all competitors", "all"})
        self.offer_type = self._clean(offer_type, {"all offers", "all"})
        self.min_confidence = min_confidence
        self.max_confidence = max_confidence
        self.date_from = date_from
        self.date_to = date_to

    @staticmethod
    def _clean(value: Optional[str], sentinels: set) -> Optional[str]:
        if value is None:
            return None
        v = value.strip()
        if not v or v.lower() in sentinels:
            return None
        return v


def hook_filters(
    search: Optional[str] = Query(None),
    hook_type: Optional[str] = Query(None),
    competitor_id: Optional[str] = Query(None),
    offer_type: Optional[str] = Query(None),
    min_confidence: Optional[float] = Query(None, ge=0, le=100),
    max_confidence: Optional[float] = Query(None, ge=0, le=100),
    date_from: Optional[date_type] = Query(None),
    date_to: Optional[date_type] = Query(None),
) -> HookFilters:
    """FastAPI dependency: parse query params into a HookFilters object."""
    return HookFilters(
        search=search,
        hook_type=hook_type,
        competitor_id=competitor_id,
        offer_type=offer_type,
        min_confidence=min_confidence,
        max_confidence=max_confidence,
        date_from=date_from,
        date_to=date_to,
    )


def apply_hook_filters(stmt, f: HookFilters):
    """Add every active filter to a statement that already selects FROM
    ad_analyses JOIN ads (and joins Competitor when needed).

    This is the single source of truth for what "the current view" means — all
    five endpoints route through it so they cannot drift apart.
    """
    stmt = stmt.where(AdAnalysis.hook_text.is_not(None))
    if f.search:
        stmt = stmt.where(AdAnalysis.hook_text.ilike(f"%{f.search}%"))
    if f.hook_type:
        stmt = stmt.where(func.lower(AdAnalysis.hook_type) == f.hook_type.lower())
    if f.competitor_id:
        stmt = stmt.where(Ad.competitor_id == f.competitor_id)
    if f.offer_type:
        stmt = stmt.where(func.lower(AdAnalysis.offer_type) == f.offer_type.lower())
    if f.min_confidence is not None:
        stmt = stmt.where(AdAnalysis.confidence_score >= f.min_confidence)
    if f.max_confidence is not None:
        stmt = stmt.where(AdAnalysis.confidence_score <= f.max_confidence)
    if f.date_from:
        stmt = stmt.where(Ad.active_since >= f.date_from)
    if f.date_to:
        stmt = stmt.where(Ad.active_since <= f.date_to)
    return stmt


def _base():
    """FROM ad_analyses JOIN ads — the row set every aggregation starts from."""
    return select().select_from(AdAnalysis).join(Ad, Ad.id == AdAnalysis.ad_id)


# ─── Filter options ───────────────────────────────────────────────────────────

@router.get("/filter-options", response_model=HookFilterOptions)
async def get_filter_options(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dropdown options, all derived from analyzed ads (no hardcoded lists)."""
    # Competitors with at least one analyzed ad.
    comp_stmt = (
        select(Competitor.id, Competitor.name)
        .join(Ad, Ad.competitor_id == Competitor.id)
        .join(AdAnalysis, AdAnalysis.ad_id == Ad.id)
        .where(AdAnalysis.hook_text.is_not(None))
        .distinct()
        .order_by(Competitor.name)
    )
    competitors = [
        FilterCompetitor(id=str(cid), name=name)
        for cid, name in (await db.execute(comp_stmt)).all()
    ]

    # Distinct hook types present.
    ht_stmt = (
        select(AdAnalysis.hook_type)
        .where(AdAnalysis.hook_type.is_not(None), AdAnalysis.hook_text.is_not(None))
        .distinct()
        .order_by(AdAnalysis.hook_type)
    )
    hook_types = [r[0] for r in (await db.execute(ht_stmt)).all() if r[0]]

    # Distinct offer types present (excluding null / "None").
    ot_stmt = (
        select(AdAnalysis.offer_type)
        .where(AdAnalysis.offer_type.is_not(None), AdAnalysis.hook_text.is_not(None))
        .distinct()
        .order_by(AdAnalysis.offer_type)
    )
    offer_types = [
        r[0] for r in (await db.execute(ot_stmt)).all()
        if r[0] and r[0].strip().lower() not in _NONE_OFFERS
    ]

    return HookFilterOptions(
        competitors=competitors,
        hook_types=hook_types,
        offer_types=offer_types,
    )


# ─── Summary ──────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=HooksSummary)
async def get_hooks_summary(
    f: HookFilters = Depends(hook_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """KPI cards. Mentions count each ad once (by ad_library_id)."""
    mentions_expr = func.count(distinct(AD_KEY))

    total_unique = (await db.execute(
        apply_hook_filters(_base().add_columns(func.count(distinct(AdAnalysis.hook_text))), f)
    )).scalar() or 0

    total_mentions = (await db.execute(
        apply_hook_filters(_base().add_columns(mentions_expr), f)
    )).scalar() or 0

    # Top hook type by de-duplicated ad count.
    type_stmt = apply_hook_filters(
        _base().add_columns(AdAnalysis.hook_type, mentions_expr.label("c")), f
    ).where(AdAnalysis.hook_type.is_not(None)).group_by(AdAnalysis.hook_type).order_by(mentions_expr.desc()).limit(1)
    row = (await db.execute(type_stmt)).first()
    top_hook_type = row[0] if row else None
    top_count = row[1] if row else 0
    top_pct = round(top_count / total_mentions * 100, 1) if total_mentions else 0.0

    # Top performing hook = longest average days running, min 3 ads so one old
    # ad can't win. Confidence is NOT used for performance.
    days_avg = func.avg(Ad.days_running)
    perf_stmt = apply_hook_filters(
        _base().add_columns(
            AdAnalysis.hook_text,
            days_avg.label("avg_days"),
            mentions_expr.label("c"),
        ), f
    ).group_by(AdAnalysis.hook_text).having(mentions_expr >= 3).order_by(days_avg.desc()).limit(1)
    perf_row = (await db.execute(perf_stmt)).first()
    top_performer = (
        TopHookPerformer(text=perf_row[0], avg_score=round(float(perf_row[1] or 0), 1))
        if perf_row else None
    )

    # Trending hook = biggest 7d-vs-prior-7d growth in ads that started running.
    trending = None
    cur, prev = await _trend_windows(db, f)
    best_growth = None
    for text, cur_n in cur.items():
        prev_n = prev.get(text, 0)
        if cur_n <= 0:
            continue
        if prev_n == 0:
            pct = None  # "New"
        else:
            pct = round((cur_n - prev_n) / prev_n * 100, 1)
        # Prefer the hook with the most new ads this week; break ties by growth.
        key = (cur_n, pct if pct is not None else 1e9)
        if best_growth is None or key > best_growth[0]:
            best_growth = (key, text, pct)
    if best_growth:
        trending = TrendingHook(text=best_growth[1], pct=best_growth[2] if best_growth[2] is not None else 0.0)

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
    f: HookFilters = Depends(hook_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hook type distribution for the donut — de-duplicated ad counts."""
    mentions_expr = func.count(distinct(AD_KEY))
    stmt = apply_hook_filters(
        _base().add_columns(AdAnalysis.hook_type, mentions_expr.label("c")), f
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
    f: HookFilters = Depends(hook_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Average days running per hook type (longevity), with the ad count behind
    each bar. This replaces the old avg-confidence bars, which were ~90% for
    every type and said nothing about performance.
    """
    days_avg = func.avg(Ad.days_running)
    ad_count = func.count(distinct(AD_KEY))
    stmt = apply_hook_filters(
        _base().add_columns(
            AdAnalysis.hook_type,
            days_avg.label("avg_days"),
            ad_count.label("ads"),
        ), f
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
    f: HookFilters = Depends(hook_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hook type counts over time, grouped by ads.active_since (when the ad
    started running) — not analyzed_at (when the AI happened to run).
    """
    start_date = (datetime.now(timezone.utc) - timedelta(days=days - 1)).date()

    stmt = apply_hook_filters(
        _base().add_columns(
            Ad.active_since.label("day"),
            AdAnalysis.hook_type,
            func.count(distinct(AD_KEY)).label("c"),
        ), f
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


# ─── Trending window helper (shared by summary + list) ──────────────────────────

async def _trend_windows(db: AsyncSession, f: HookFilters):
    """Per-hook_text de-duplicated ad counts for the last 7 days vs the 7 days
    before, by ads.active_since. Returns (current_window, previous_window) dicts.
    """
    today = datetime.now(timezone.utc).date()
    cur_start = today - timedelta(days=7)
    prev_start = today - timedelta(days=14)
    ad_count = func.count(distinct(AD_KEY))

    async def window(start, end):
        stmt = apply_hook_filters(
            _base().add_columns(AdAnalysis.hook_text, ad_count.label("c")), f
        ).where(
            Ad.active_since.is_not(None),
            Ad.active_since >= start,
            Ad.active_since < end,
        ).group_by(AdAnalysis.hook_text)
        return {r[0]: r[1] for r in (await db.execute(stmt)).all()}

    current = await window(cur_start, today + timedelta(days=1))
    previous = await window(prev_start, cur_start)
    return current, previous


def _compute_trending(cur_n: int, prev_n: int, has_prev_period: bool):
    """Trending value for one hook:
      - "New"  : ran this week, nothing in the earlier period
      - None   : not enough data (no activity this week, or no earlier period
                 to compare against) -> frontend shows a dash
      - float  : percent change this week vs the previous week
    Never a made-up number.
    """
    if cur_n <= 0:
        return None
    if not has_prev_period:
        return None
    if prev_n == 0:
        return "New"
    return round((cur_n - prev_n) / prev_n * 100, 1)


# ─── Hook table ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[HookRow])
async def list_hooks(
    f: HookFilters = Depends(hook_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All detected hooks with stats, sorted by de-duplicated mentions desc.

    Uses grouped queries (one for competitors, one for example media, one for
    offer types, two for the trend windows) instead of two queries per hook.
    """
    mentions_expr = func.count(distinct(AD_KEY))

    agg_stmt = apply_hook_filters(
        _base().add_columns(
            AdAnalysis.hook_text,
            # Representative hook_type: the one that appears most for this text.
            func.mode().within_group(AdAnalysis.hook_type).label("hook_type"),
            mentions_expr.label("mentions"),
            func.avg(AdAnalysis.confidence_score).label("avg_conf"),
            func.avg(Ad.days_running).label("avg_days"),
            func.min(Ad.active_since).label("first_seen"),
        ), f
    ).group_by(AdAnalysis.hook_text).order_by(mentions_expr.desc())
    agg_rows = (await db.execute(agg_stmt)).all()

    hook_texts = [r[0] for r in agg_rows]
    if not hook_texts:
        return []

    # ── One grouped query: competitors per hook_text ──────────────────────────
    comp_stmt = apply_hook_filters(
        select()
        .select_from(AdAnalysis)
        .join(Ad, Ad.id == AdAnalysis.ad_id)
        .join(Competitor, Competitor.id == Ad.competitor_id)
        .add_columns(AdAnalysis.hook_text, Competitor.id, Competitor.name)
        .distinct(),
        f,
    ).where(AdAnalysis.hook_text.in_(hook_texts))
    comps_by_hook: dict = {}
    for hook_text, cid, cname in (await db.execute(comp_stmt)).all():
        comps_by_hook.setdefault(hook_text, []).append((str(cid), cname))

    # ── One grouped query: example media per hook_text ────────────────────────
    media_stmt = apply_hook_filters(
        _base().add_columns(AdAnalysis.hook_text, Ad.media_url), f
    ).where(AdAnalysis.hook_text.in_(hook_texts), Ad.media_url.is_not(None))
    media_by_hook: dict = {}
    for hook_text, media_url in (await db.execute(media_stmt)).all():
        bucket = media_by_hook.setdefault(hook_text, [])
        if media_url and media_url not in bucket and len(bucket) < 3:
            bucket.append(media_url)

    # ── One grouped query: most common offer_type per hook_text ───────────────
    offer_count = func.count(AdAnalysis.id)
    offer_stmt = apply_hook_filters(
        _base().add_columns(AdAnalysis.hook_text, AdAnalysis.offer_type, offer_count.label("c")), f
    ).where(AdAnalysis.offer_type.is_not(None)).group_by(AdAnalysis.hook_text, AdAnalysis.offer_type)
    offer_candidates: dict = {}
    for hook_text, offer_type, c in (await db.execute(offer_stmt)).all():
        if not offer_type or offer_type.strip().lower() in _NONE_OFFERS:
            continue
        prev = offer_candidates.get(hook_text)
        if prev is None or c > prev[1]:
            offer_candidates[hook_text] = (offer_type, c)

    # ── Two grouped queries: trend windows ────────────────────────────────────
    cur_win, prev_win = await _trend_windows(db, f)
    has_prev_period = bool(prev_win)  # any ads in the earlier 7-day window at all

    result: List[HookRow] = []
    for rank, r in enumerate(agg_rows, start=1):
        hook_text, hook_type, mentions, avg_conf, avg_days, first_seen = r

        all_comps = [
            HookCompetitorRef(id=cid, name=cname, initials=_initials(cname))
            for cid, cname in comps_by_hook.get(hook_text, [])
        ]
        shown = all_comps[:3]
        extra = max(0, len(all_comps) - 3)

        trending = _compute_trending(
            cur_win.get(hook_text, 0), prev_win.get(hook_text, 0), has_prev_period
        )
        offer = offer_candidates.get(hook_text)

        result.append(
            HookRow(
                id=str(rank),
                rank=rank,
                text=hook_text,
                description=HOOK_TYPE_DESCRIPTIONS.get(hook_type, ""),
                type=hook_type,
                offer_type=offer[0] if offer else None,
                mentions=mentions,
                avg_confidence=round(float(avg_conf or 0), 1),
                avg_days_running=round(float(avg_days or 0), 1),
                trending=trending,
                competitors=shown,
                extra_competitors=extra,
                example_ads=media_by_hook.get(hook_text, []),
                first_seen=first_seen.strftime("%b %d, %Y") if first_seen else None,
                related_angles=[],
            )
        )

    return result
