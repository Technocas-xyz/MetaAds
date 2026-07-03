"""
Offer Library endpoints — aggregations over ad_analyses.offer_type field.
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
from app.schemas.offer import (
    OffersSummary,
    TrendingOffer,
    OfferTypeDistItem,
    OfferPerformanceItem,
    OfferTrendPoint,
    OfferRow,
    OfferCompetitorRef,
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
    "None": "#94A3B8",
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


def _initials(name: str) -> str:
    if not name:
        return "?"
    words = name.split()
    if len(words) >= 2:
        return (words[0][0] + words[1][0]).upper()
    return name[:2].upper()


# ---------- Endpoints ----------

@router.get("/summary", response_model=OffersSummary)
async def get_offers_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate KPIs for the Offers Library top cards."""
    # Exclude None/null offer types
    unique_stmt = select(func.count(distinct(AdAnalysis.offer_type))).where(
        AdAnalysis.offer_type.is_not(None),
        AdAnalysis.offer_type != "None",
    )
    total_unique = (await db.execute(unique_stmt)).scalar() or 0

    total_stmt = select(func.count(AdAnalysis.id)).where(
        AdAnalysis.offer_type.is_not(None),
        AdAnalysis.offer_type != "None",
    )
    total_mentions = (await db.execute(total_stmt)).scalar() or 0

    # Top offer type
    top_stmt = (
        select(AdAnalysis.offer_type, func.count(AdAnalysis.id).label("c"))
        .where(
            AdAnalysis.offer_type.is_not(None),
            AdAnalysis.offer_type != "None",
        )
        .group_by(AdAnalysis.offer_type)
        .order_by(func.count(AdAnalysis.id).desc())
        .limit(1)
    )
    row = (await db.execute(top_stmt)).first()
    top_offer_type = row[0] if row else None
    top_count = row[1] if row else 0
    top_pct = round(top_count / total_mentions * 100, 1) if total_mentions else 0.0

    # Discount-heavy share = % of mentions that are "Discount"
    disc_stmt = select(func.count(AdAnalysis.id)).where(
        AdAnalysis.offer_type == "Discount"
    )
    disc_count = (await db.execute(disc_stmt)).scalar() or 0
    disc_share = round(disc_count / total_mentions * 100, 1) if total_mentions else 0.0

    # Trending offer — most-used offer text in last 7 days
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    trend_stmt = (
        select(
            AdAnalysis.offer_value,
            AdAnalysis.offer_type,
            func.count(AdAnalysis.id).label("c"),
        )
        .where(
            AdAnalysis.offer_value.is_not(None),
            AdAnalysis.offer_type.is_not(None),
            AdAnalysis.offer_type != "None",
            AdAnalysis.analyzed_at >= week_ago,
        )
        .group_by(AdAnalysis.offer_value, AdAnalysis.offer_type)
        .order_by(func.count(AdAnalysis.id).desc())
        .limit(1)
    )
    trend_row = (await db.execute(trend_stmt)).first()
    trending = (
        TrendingOffer(
            text=trend_row[0],
            type=trend_row[1],
            pct=round(trend_row[2] / max(total_mentions, 1) * 100, 1),
        )
        if trend_row else None
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


@router.get("/type-dist", response_model=List[OfferTypeDistItem])
async def get_offers_type_distribution(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Offer type distribution for donut chart."""
    stmt = (
        select(AdAnalysis.offer_type, func.count(AdAnalysis.id).label("c"))
        .where(
            AdAnalysis.offer_type.is_not(None),
            AdAnalysis.offer_type != "None",
        )
        .group_by(AdAnalysis.offer_type)
        .order_by(func.count(AdAnalysis.id).desc())
    )
    rows = (await db.execute(stmt)).all()
    total = sum(r[1] for r in rows)

    return [
        OfferTypeDistItem(
            name=r[0],
            value=r[1],
            pct=round(r[1] / total * 100, 1) if total else 0.0,
        )
        for r in rows
    ]


@router.get("/performance", response_model=List[OfferPerformanceItem])
async def get_offers_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Avg confidence score per offer type — bar chart."""
    stmt = (
        select(
            AdAnalysis.offer_type,
            func.avg(AdAnalysis.confidence_score).label("avg_score"),
        )
        .where(
            AdAnalysis.offer_type.is_not(None),
            AdAnalysis.offer_type != "None",
        )
        .group_by(AdAnalysis.offer_type)
        .order_by(func.avg(AdAnalysis.confidence_score).desc())
    )
    rows = (await db.execute(stmt)).all()

    return [
        OfferPerformanceItem(
            type=r[0],
            avg_score=round(float(r[1]), 1),
            color=OFFER_COLORS.get(r[0], "#94A3B8"),
        )
        for r in rows
    ]


@router.get("/trend", response_model=List[OfferTrendPoint])
async def get_offers_trend(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Offer mentions over time."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days - 1)
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

    stmt = (
        select(
            func.date_trunc("day", AdAnalysis.analyzed_at).label("day"),
            AdAnalysis.offer_type,
            func.count(AdAnalysis.id).label("c"),
        )
        .where(
            AdAnalysis.offer_type.is_not(None),
            AdAnalysis.offer_type != "None",
            AdAnalysis.analyzed_at >= start_date,
        )
        .group_by("day", AdAnalysis.offer_type)
        .order_by("day")
    )
    rows = (await db.execute(stmt)).all()

    points: dict = {}
    for i in range(days):
        d = (start_date + timedelta(days=i)).date()
        date_str = d.strftime("%b %d")
        points[date_str] = {
            "date": date_str,
            "Discount": 0,
            "Bundle": 0,
            "Free Shipping": 0,
            "BOGO": 0,
        }

    for row in rows:
        day_date = row[0].date() if hasattr(row[0], "date") else row[0]
        date_str = day_date.strftime("%b %d")
        offer = row[1]
        count = row[2]
        if date_str in points and offer in ("Discount", "Bundle", "Free Shipping", "BOGO"):
            points[date_str][offer] = count

    # Convert dict-based points to model instances using aliased field
    result = []
    for p in points.values():
        result.append(OfferTrendPoint(
            date=p["date"],
            Discount=p["Discount"],
            Bundle=p["Bundle"],
            **{"Free Shipping": p["Free Shipping"]},
            BOGO=p["BOGO"],
        ))
    return result


@router.get("", response_model=List[OfferRow])
async def list_offers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all detected offers with stats, sorted by mentions desc."""
    stmt = (
        select(
            AdAnalysis.offer_value,
            AdAnalysis.offer_type,
            func.count(AdAnalysis.id).label("mentions"),
            func.avg(AdAnalysis.confidence_score).label("avg_conf"),
            func.min(AdAnalysis.analyzed_at).label("first_seen"),
        )
        .where(
            AdAnalysis.offer_type.is_not(None),
            AdAnalysis.offer_type != "None",
        )
        .group_by(AdAnalysis.offer_value, AdAnalysis.offer_type)
        .order_by(func.count(AdAnalysis.id).desc())
    )
    rows = (await db.execute(stmt)).all()

    result: List[OfferRow] = []
    for rank, r in enumerate(rows, start=1):
        offer_value, offer_type, mentions, avg_conf, first_seen = r

        # Competitors using this offer
        comp_stmt = (
            select(Competitor.id, Competitor.name)
            .join(Ad, Ad.competitor_id == Competitor.id)
            .join(AdAnalysis, AdAnalysis.ad_id == Ad.id)
            .where(AdAnalysis.offer_type == offer_type)
            .distinct()
        )
        comp_rows = (await db.execute(comp_stmt)).all()
        all_comps = [
            OfferCompetitorRef(id=str(c[0]), name=c[1], initials=_initials(c[1]))
            for c in comp_rows
        ]
        shown = all_comps[:3]
        extra = max(0, len(all_comps) - 3)

        # Example ad media URLs
        media_stmt = (
            select(Ad.media_url)
            .join(AdAnalysis, AdAnalysis.ad_id == Ad.id)
            .where(AdAnalysis.offer_type == offer_type)
            .limit(3)
        )
        media_rows = (await db.execute(media_stmt)).all()
        example_ads = [m[0] for m in media_rows if m[0]]

        first_seen_str = first_seen.strftime("%b %d, %Y") if first_seen else None

        # Display text: prefer offer_value if present, else the type label
        text = offer_value if offer_value else offer_type

        result.append(
            OfferRow(
                id=str(rank),
                rank=rank,
                text=text,
                description=OFFER_DESCRIPTIONS.get(offer_type, ""),
                type=offer_type,
                mentions=mentions,
                avg_confidence=round(float(avg_conf), 1),
                trending=0.0,
                competitors=shown,
                extra_competitors=extra,
                example_ads=example_ads,
                first_seen=first_seen_str,
                related_hooks=[],
            )
        )

    return result