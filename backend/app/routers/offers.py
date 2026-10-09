"""
Offer Library endpoints — aggregations over analyzed ads (ad_analyses.offer_type).

Mirrors the Hook Library: every number comes from ad_analyses joined to ads and
competitors, and all five endpoints share one filter helper (from
_library_common) so cards, charts and table always describe the same set.
Rows with no real offer (null / "None") are excluded everywhere.

Filters: search, offer_type, competitor, confidence, date range (on
ads.active_since).
"""

from datetime import datetime, timezone, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, distinct, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.competitor import Competitor
from app.routers._library_common import (
    AD_KEY,
    NONE_VALUES,
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
from app.schemas.offer import (
    OffersSummary,
    TrendingOffer,
    OfferTypeDistItem,
    OfferPerformanceItem,
    OfferTrendPoint,
    OfferRow,
    OfferCompetitorRef,
    OfferFilterOptions,
    FilterCompetitor,
)


router = APIRouter(prefix="/offers", tags=["offers"])


OFFER_COLORS = {
    "Discount": "#EF4444",
    "Bundle": "#8B5CF6",
    "Free Shipping": "#3B82F6",
    "BOGO": "#F97316",
    "Limited Time": "#F59E0B",
    "Free Trial": "#22C55E",
    "Guarantee": "#22C55E",
    "Other": "#94A3B8",
}

OFFER_DESCRIPTIONS = {
    "Discount": "A direct price reduction designed to lower the perceived barrier to purchase and incentivise immediate action.",
    "Bundle": "Groups multiple products or quantities together at a reduced combined price, increasing average order value.",
    "Free Shipping": "Removes the additional cost of delivery, one of the top reasons customers abandon carts at checkout.",
    "BOGO": "Buy-one-get-one mechanics reward repeat purchase intent while creating a strong perception of value.",
    "Limited Time": "Scarcity and urgency mechanics that push prospects over the decision threshold before an offer window closes.",
    "Free Trial": "Reduces commitment risk by letting prospects experience the product before paying.",
    "Guarantee": "Risk-reversal promise that reduces purchase anxiety and builds trust by standing behind product quality.",
}

# This page's dimension is offer_type; "None"/null offers are excluded. Rows key
# on offer_type (the table shows the offer value text when present).
SPEC = LibrarySpec(
    dimension_col=AdAnalysis.offer_type,
    value_col=AdAnalysis.offer_type,
    search_cols=[AdAnalysis.offer_value, AdAnalysis.offer_type],
    exclude_none=True,
)

offer_filters = make_filters_dependency("offer_type")

TREND_OFFERS = ("Discount", "Bundle", "Free Shipping", "BOGO")


# ─── Filter options ───────────────────────────────────────────────────────────

@router.get("/filter-options", response_model=OfferFilterOptions)
async def get_filter_options(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dropdown options from analyzed ads: competitors + distinct offer types."""
    competitors, offer_types = await filter_options(db, SPEC)
    return OfferFilterOptions(
        competitors=[FilterCompetitor(id=cid, name=name) for cid, name in competitors],
        offer_types=offer_types,
    )


# ─── Summary ──────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=OffersSummary)
async def get_offers_summary(
    f: LibraryFilters = Depends(offer_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """KPI cards. Mentions count each ad once (by ad_library_id)."""
    mentions_expr = func.count(distinct(AD_KEY))

    total_unique = (await db.execute(
        apply_filters(base().add_columns(func.count(distinct(AdAnalysis.offer_type))), f, SPEC)
    )).scalar() or 0

    total_mentions = (await db.execute(
        apply_filters(base().add_columns(mentions_expr), f, SPEC)
    )).scalar() or 0

    top_stmt = apply_filters(
        base().add_columns(AdAnalysis.offer_type, mentions_expr.label("c")), f, SPEC
    ).group_by(AdAnalysis.offer_type).order_by(mentions_expr.desc()).limit(1)
    row = (await db.execute(top_stmt)).first()
    top_offer_type = row[0] if row else None
    top_count = row[1] if row else 0
    top_pct = round(top_count / total_mentions * 100, 1) if total_mentions else 0.0

    # Discount-heavy share = % of de-duplicated mentions that are "Discount".
    disc = (await db.execute(
        apply_filters(base().add_columns(mentions_expr), f, SPEC).where(
            func.lower(AdAnalysis.offer_type) == "discount"
        )
    )).scalar() or 0
    disc_share = round(disc / total_mentions * 100, 1) if total_mentions else 0.0

    # Top performing offer = longest average days running, min 3 ads.
    days_avg = func.avg(Ad.days_running)
    perf_stmt = apply_filters(
        base().add_columns(AdAnalysis.offer_type, days_avg.label("avg_days"), mentions_expr.label("c")), f, SPEC
    ).group_by(AdAnalysis.offer_type).having(mentions_expr >= 3).order_by(days_avg.desc()).limit(1)
    perf_row = (await db.execute(perf_stmt)).first()

    # Trending offer = biggest 7d-vs-prior-7d growth, keyed on offer_type.
    trending = None
    cur, prev = await trend_windows(db, f, SPEC)
    best = None
    for otype, cur_n in cur.items():
        if cur_n <= 0:
            continue
        prev_n = prev.get(otype, 0)
        pct = None if prev_n == 0 else round((cur_n - prev_n) / prev_n * 100, 1)
        key = (cur_n, pct if pct is not None else 1e9)
        if best is None or key > best[0]:
            best = (key, otype, pct)
    if best:
        trending = TrendingOffer(
            text=perf_row[0] if perf_row else best[1],
            type=best[1],
            pct=best[2] if best[2] is not None else 0.0,
        )

    return OffersSummary(
        total_unique=total_unique,
        total_mentions=total_mentions,
        mentions_trend=0.0,
        top_offer_type=top_offer_type,
        top_offer_type_pct=top_pct,
        discount_heavy_share=disc_share,
        trending_offer=trending,
    )


# ─── Distribution (donut) ───────────────────────────────────────────────────────

@router.get("/type-dist", response_model=List[OfferTypeDistItem])
async def get_offers_type_distribution(
    f: LibraryFilters = Depends(offer_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Offer type distribution for the donut — de-duplicated ad counts."""
    mentions_expr = func.count(distinct(AD_KEY))
    stmt = apply_filters(
        base().add_columns(AdAnalysis.offer_type, mentions_expr.label("c")), f, SPEC
    ).group_by(AdAnalysis.offer_type).order_by(mentions_expr.desc())
    rows = (await db.execute(stmt)).all()
    total = sum(r[1] for r in rows)
    return [
        OfferTypeDistItem(name=r[0], value=r[1], pct=round(r[1] / total * 100, 1) if total else 0.0)
        for r in rows
    ]


# ─── Performance → Longevity (bar) ─────────────────────────────────────────────

@router.get("/performance", response_model=List[OfferPerformanceItem])
async def get_offers_performance(
    f: LibraryFilters = Depends(offer_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Average days running per offer type (longevity), with the ad count per bar."""
    days_avg = func.avg(Ad.days_running)
    ad_count = func.count(distinct(AD_KEY))
    stmt = apply_filters(
        base().add_columns(AdAnalysis.offer_type, days_avg.label("avg_days"), ad_count.label("ads")), f, SPEC
    ).group_by(AdAnalysis.offer_type).order_by(days_avg.desc())
    rows = (await db.execute(stmt)).all()
    return [
        OfferPerformanceItem(
            type=r[0],
            avg_days=round(float(r[1] or 0), 1),
            ads=r[2],
            color=OFFER_COLORS.get(r[0], "#94A3B8"),
        )
        for r in rows
    ]


# ─── Trend (line) ───────────────────────────────────────────────────────────────

@router.get("/trend", response_model=List[OfferTrendPoint])
async def get_offers_trend(
    days: int = Query(7, ge=1, le=90),
    f: LibraryFilters = Depends(offer_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Offer counts over time, grouped by ads.active_since."""
    start_date = (datetime.now(timezone.utc) - timedelta(days=days - 1)).date()

    stmt = apply_filters(
        base().add_columns(
            Ad.active_since.label("day"),
            AdAnalysis.offer_type,
            func.count(distinct(AD_KEY)).label("c"),
        ), f, SPEC
    ).where(
        Ad.active_since.is_not(None),
        Ad.active_since >= start_date,
    ).group_by(Ad.active_since, AdAnalysis.offer_type).order_by(Ad.active_since)
    rows = (await db.execute(stmt)).all()

    points: dict = {}
    for i in range(days):
        d = start_date + timedelta(days=i)
        date_str = d.strftime("%b %d")
        points[date_str] = {"date": date_str, "Discount": 0, "Bundle": 0, "Free Shipping": 0, "BOGO": 0}

    for row in rows:
        day_date = row[0]
        if day_date is None:
            continue
        date_str = day_date.strftime("%b %d")
        offer = row[1]
        count = row[2]
        if date_str in points and offer in TREND_OFFERS:
            points[date_str][offer] = count

    return [
        OfferTrendPoint(
            date=p["date"], Discount=p["Discount"], Bundle=p["Bundle"],
            BOGO=p["BOGO"], **{"Free Shipping": p["Free Shipping"]},
        )
        for p in points.values()
    ]


# ─── Offer table ────────────────────────────────────────────────────────────────

@router.get("", response_model=List[OfferRow])
async def list_offers(
    f: LibraryFilters = Depends(offer_filters),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All detected offers with stats, sorted by de-duplicated mentions desc.

    Grouped by offer_type (the dimension); each row shows the most common offer
    value text for that type when present, otherwise the type label itself.
    """
    mentions_expr = func.count(distinct(AD_KEY))

    agg_stmt = apply_filters(
        base().add_columns(
            AdAnalysis.offer_type,
            mentions_expr.label("mentions"),
            func.avg(AdAnalysis.confidence_score).label("avg_conf"),
            func.avg(Ad.days_running).label("avg_days"),
            func.min(Ad.active_since).label("first_seen"),
        ), f, SPEC
    ).group_by(AdAnalysis.offer_type).order_by(mentions_expr.desc())
    agg_rows = (await db.execute(agg_stmt)).all()

    offer_types = [r[0] for r in agg_rows]
    if not offer_types:
        return []

    # Most common offer_value text per offer_type (for the row's display text).
    val_count = func.count(AdAnalysis.id)
    val_stmt = apply_filters(
        base().add_columns(AdAnalysis.offer_type, AdAnalysis.offer_value, val_count.label("c")), f, SPEC
    ).where(AdAnalysis.offer_value.is_not(None)).group_by(AdAnalysis.offer_type, AdAnalysis.offer_value)
    value_by_type: dict = {}
    for otype, oval, c in (await db.execute(val_stmt)).all():
        if not oval or oval.strip().lower() in NONE_VALUES:
            continue
        prev = value_by_type.get(otype)
        if prev is None or c > prev[1]:
            value_by_type[otype] = (oval, c)

    comp_stmt = apply_filters(
        select()
        .select_from(AdAnalysis)
        .join(Ad, Ad.id == AdAnalysis.ad_id)
        .join(Competitor, Competitor.id == Ad.competitor_id)
        .add_columns(AdAnalysis.offer_type, Competitor.id, Competitor.name)
        .distinct(),
        f, SPEC,
    ).where(AdAnalysis.offer_type.in_(offer_types))
    comps_by_type: dict = {}
    for otype, cid, cname in (await db.execute(comp_stmt)).all():
        comps_by_type.setdefault(otype, []).append((str(cid), cname))

    media_stmt = apply_filters(
        base().add_columns(AdAnalysis.offer_type, Ad.media_url), f, SPEC
    ).where(AdAnalysis.offer_type.in_(offer_types), Ad.media_url.is_not(None))
    media_by_type: dict = {}
    for otype, media_url in (await db.execute(media_stmt)).all():
        bucket = media_by_type.setdefault(otype, [])
        if media_url and media_url not in bucket and len(bucket) < 3:
            bucket.append(media_url)

    cur_win, prev_win = await trend_windows(db, f, SPEC)
    has_prev_period = bool(prev_win)

    result: List[OfferRow] = []
    for rank, r in enumerate(agg_rows, start=1):
        offer_type, mentions, avg_conf, avg_days, first_seen = r
        val = value_by_type.get(offer_type)
        all_comps = [
            OfferCompetitorRef(id=cid, name=cname, initials=initials(cname))
            for cid, cname in comps_by_type.get(offer_type, [])
        ]
        result.append(
            OfferRow(
                id=str(rank),
                rank=rank,
                text=val[0] if val else offer_type,
                description=OFFER_DESCRIPTIONS.get(offer_type, ""),
                type=offer_type,
                mentions=mentions,
                avg_confidence=round(float(avg_conf or 0), 1),
                avg_days_running=round(float(avg_days or 0), 1),
                trending=compute_trending(
                    cur_win.get(offer_type, 0), prev_win.get(offer_type, 0), has_prev_period
                ),
                competitors=all_comps[:3],
                extra_competitors=max(0, len(all_comps) - 3),
                example_ads=media_by_type.get(offer_type, []),
                first_seen=first_seen.strftime("%b %d, %Y") if first_seen else None,
                related_hooks=[],
            )
        )

    return result
