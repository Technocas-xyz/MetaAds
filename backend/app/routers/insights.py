"""
Insights Router — per-competitor + overall AI analysis aggregation.

Aggregates ad_analyses data into structured insights WITHOUT calling the LLM.
Pure data aggregation from stored analysis results.
"""

from collections import Counter
from math import ceil
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.competitor import Competitor


router = APIRouter(prefix="/insights", tags=["insights"])


# ─── Per-competitor insights ──────────────────────────────────────────────────

@router.get("/competitors/{competitor_id}")
async def get_competitor_insights(
    competitor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Aggregated AI insights for ONE competitor.
    Returns hook/angle/offer breakdowns + winning (long-running) ads.
    """
    # Get all analyzed ads for this competitor
    stmt = (
        select(Ad, AdAnalysis)
        .join(AdAnalysis, Ad.id == AdAnalysis.ad_id)
        .where(Ad.competitor_id == competitor_id)
        .order_by(Ad.days_running.desc())
    )
    rows = (await db.execute(stmt)).all()

    # Get competitor name
    competitor = await db.get(Competitor, competitor_id)
    comp_name = competitor.name if competitor else "Unknown"

    # Total ads for this competitor (analyzed + unanalyzed)
    total_ads = (await db.execute(
        select(func.count(Ad.id)).where(Ad.competitor_id == competitor_id)
    )).scalar() or 0

    analyzed_count = len(rows)

    if analyzed_count == 0:
        return {
            "competitor_id": str(competitor_id),
            "competitor_name": comp_name,
            "total_ads": total_ads,
            "analyzed_count": 0,
            "limited_data": True,
            "message": "No analyzed ads yet. Run 'Analyze All' to generate insights.",
            "hooks": [],
            "angles": [],
            "offers": [],
            "winning_ads": [],
            "readout": None,
        }

    # Aggregate breakdowns
    hook_types = Counter()
    angles = Counter()
    offers = Counter()
    formats = Counter()

    for ad, analysis in rows:
        if analysis.hook_type:
            hook_types[analysis.hook_type] += 1
        if analysis.angle:
            angles[analysis.angle] += 1
        if analysis.offer_type:
            offers[analysis.offer_type] += 1
        formats["video" if ad.is_video else "image"] += 1

    # Winning ads = longest-running with analysis
    winning_ads = []
    for ad, analysis in rows[:10]:  # Top 10 by days_running
        if ad.days_running >= 7:  # At least a week old to be meaningful
            winning_ads.append({
                "ad_library_id": ad.ad_library_id,
                "days_running": ad.days_running,
                "hook_type": analysis.hook_type,
                "hook_text": analysis.hook_text,
                "angle": analysis.angle,
                "offer_type": analysis.offer_type,
                "is_long_runner": ad.days_running >= 90,
                "media_url": ad.media_url,
            })

    # Generate plain-language readout
    top_hook = hook_types.most_common(1)[0][0] if hook_types else None
    top_angle = angles.most_common(1)[0][0] if angles else None
    top_offer = offers.most_common(1)[0][0] if offers else None
    oldest = rows[0][0].days_running if rows else 0

    readout_parts = []
    if top_angle:
        readout_parts.append(f"leans on the {top_angle} angle")
    if top_hook:
        readout_parts.append(f"uses {top_hook} hooks most")
    if top_offer and top_offer != "None":
        readout_parts.append(f"with {top_offer} offers")
    if oldest >= 30:
        readout_parts.append(f"(longest-running ad: {oldest}d)")

    readout = f"{comp_name} {', '.join(readout_parts)}." if readout_parts else None

    return {
        "competitor_id": str(competitor_id),
        "competitor_name": comp_name,
        "total_ads": total_ads,
        "analyzed_count": analyzed_count,
        "limited_data": analyzed_count < 5,
        "hooks": [{"type": k, "count": v, "pct": round(v / analyzed_count * 100, 1)} for k, v in hook_types.most_common(10)],
        "angles": [{"type": k, "count": v, "pct": round(v / analyzed_count * 100, 1)} for k, v in angles.most_common(10)],
        "offers": [{"type": k, "count": v, "pct": round(v / analyzed_count * 100, 1)} for k, v in offers.most_common(10)],
        "formats": {"video": formats.get("video", 0), "image": formats.get("image", 0)},
        "winning_ads": winning_ads,
        "readout": readout,
    }


# ─── All competitors summary (for the AI Analysis page) ──────────────────────

@router.get("/competitors")
async def get_all_competitor_insights(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Per-competitor breakdown for every competitor — used on the AI Analysis page.
    Returns a compact summary per competitor: top hook/angle/offer + winning ad.
    """
    # Get all competitors
    comps = (await db.execute(
        select(Competitor).where(
            Competitor.status == "Active",
            Competitor.is_own_brand == False,
        ).order_by(Competitor.name)
    )).scalars().all()

    results = []
    for comp in comps:
        # Get analyzed ads for this competitor
        stmt = (
            select(Ad, AdAnalysis)
            .join(AdAnalysis, Ad.id == AdAnalysis.ad_id)
            .where(Ad.competitor_id == comp.id)
            .order_by(Ad.days_running.desc())
        )
        rows = (await db.execute(stmt)).all()

        total_ads = (await db.execute(
            select(func.count(Ad.id)).where(Ad.competitor_id == comp.id)
        )).scalar() or 0

        analyzed = len(rows)
        if analyzed == 0:
            results.append({
                "competitor_id": str(comp.id),
                "name": comp.name,
                "total_ads": total_ads,
                "analyzed": 0,
                "top_hook": None,
                "top_angle": None,
                "top_offer": None,
                "longest_running_days": 0,
                "long_runners_count": 0,
            })
            continue

        hooks = Counter(a.hook_type for _, a in rows if a.hook_type)
        angles_c = Counter(a.angle for _, a in rows if a.angle)
        offers_c = Counter(a.offer_type for _, a in rows if a.offer_type)
        longest = rows[0][0].days_running if rows else 0
        long_runners = sum(1 for ad, _ in rows if ad.days_running >= 90)

        results.append({
            "competitor_id": str(comp.id),
            "name": comp.name,
            "total_ads": total_ads,
            "analyzed": analyzed,
            "top_hook": hooks.most_common(1)[0][0] if hooks else None,
            "top_angle": angles_c.most_common(1)[0][0] if angles_c else None,
            "top_offer": offers_c.most_common(1)[0][0] if offers_c else None,
            "longest_running_days": longest,
            "long_runners_count": long_runners,
        })

    return results


# ─── Overall market insights ─────────────────────────────────────────────────

@router.get("/overall")
async def get_overall_insights(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Market-level analysis: patterns among long-running (winning) ads,
    competitive landscape, and actionable recommendation.
    """
    # Get ALL analyzed ads with their competitor info
    stmt = (
        select(Ad, AdAnalysis, Competitor.name)
        .join(AdAnalysis, Ad.id == AdAnalysis.ad_id)
        .join(Competitor, Ad.competitor_id == Competitor.id)
        .where(Competitor.is_own_brand == False)
        .order_by(Ad.days_running.desc())
    )
    rows = (await db.execute(stmt)).all()

    total_analyzed = len(rows)
    if total_analyzed == 0:
        return {
            "total_analyzed": 0,
            "message": "No analyzed ads yet. Run 'Analyze All' first.",
            "winning_patterns": None,
            "competitor_comparison": [],
            "recommendation": None,
        }

    # Split into winners (long-running 30d+) and all
    winners = [(ad, analysis, name) for ad, analysis, name in rows if ad.days_running >= 30]
    long_runners = [(ad, analysis, name) for ad, analysis, name in rows if ad.days_running >= 90]

    # Aggregate patterns among ALL analyzed ads
    all_hooks = Counter(a.hook_type for _, a, _ in rows if a.hook_type)
    all_angles = Counter(a.angle for _, a, _ in rows if a.angle)
    all_offers = Counter(a.offer_type for _, a, _ in rows if a.offer_type)
    all_formats = Counter("video" if ad.is_video else "image" for ad, _, _ in rows)

    # Aggregate patterns among WINNERS (weighted by days_running)
    winner_hooks = Counter()
    winner_angles = Counter()
    winner_offers = Counter()
    winner_formats = Counter()

    for ad, analysis, _ in winners:
        weight = ad.days_running  # Weight by longevity
        if analysis.hook_type:
            winner_hooks[analysis.hook_type] += weight
        if analysis.angle:
            winner_angles[analysis.angle] += weight
        if analysis.offer_type:
            winner_offers[analysis.offer_type] += weight
        winner_formats["video" if ad.is_video else "image"] += weight

    # Per-competitor comparison
    comp_stats = {}
    for ad, analysis, comp_name in rows:
        if comp_name not in comp_stats:
            comp_stats[comp_name] = {
                "name": comp_name,
                "ads": 0,
                "long_runners": 0,
                "longest_day": 0,
                "top_angles": Counter(),
                "video_count": 0,
                "image_count": 0,
            }
        s = comp_stats[comp_name]
        s["ads"] += 1
        if ad.days_running >= 90:
            s["long_runners"] += 1
        s["longest_day"] = max(s["longest_day"], ad.days_running)
        if analysis.angle:
            s["top_angles"][analysis.angle] += 1
        if ad.is_video:
            s["video_count"] += 1
        else:
            s["image_count"] += 1

    competitor_comparison = []
    for name, s in sorted(comp_stats.items(), key=lambda x: x[1]["long_runners"], reverse=True):
        top_angle = s["top_angles"].most_common(1)[0][0] if s["top_angles"] else None
        competitor_comparison.append({
            "name": name,
            "analyzed_ads": s["ads"],
            "long_runners": s["long_runners"],
            "longest_day": s["longest_day"],
            "primary_angle": top_angle,
            "format": "video" if s["video_count"] > s["image_count"] else "image",
        })

    # Build recommendation (data-grounded)
    top_winner_hook = winner_hooks.most_common(1)[0][0] if winner_hooks else None
    top_winner_angle = winner_angles.most_common(1)[0][0] if winner_angles else None
    top_winner_offer = winner_offers.most_common(1)[0][0] if winner_offers else None
    dominant_format = "video" if winner_formats.get("video", 0) > winner_formats.get("image", 0) else "image"

    recommendation_parts = []
    if top_winner_angle:
        count = winner_angles[top_winner_angle]
        recommendation_parts.append(
            f"The {top_winner_angle} angle dominates among proven winners ({count} weighted mentions across long-running ads)."
        )
    if top_winner_hook:
        count = winner_hooks[top_winner_hook]
        recommendation_parts.append(
            f"{top_winner_hook} hooks are most effective for longevity ({count} weighted)."
        )
    if top_winner_offer and top_winner_offer != "None":
        recommendation_parts.append(
            f"The recurring offer type among long-runners is '{top_winner_offer}'."
        )
    recommendation_parts.append(
        f"Dominant format among winners: {dominant_format} ({winner_formats.get(dominant_format, 0)} weighted vs {winner_formats.get('image' if dominant_format == 'video' else 'video', 0)})."
    )

    # Example hooks (original, based on winning patterns)
    example_hooks = []
    if top_winner_angle == "Price":
        example_hooks = [
            "Your custom prints shouldn't cost a fortune — here's proof.",
            "Same quality. Half the price. See why shops are switching.",
            "Stop overpaying for DTF transfers — we deliver for less.",
        ]
    elif top_winner_angle == "Quality":
        example_hooks = [
            "Feel the difference real quality makes — prints that last 100+ washes.",
            "Your customers deserve better than cheap transfers that crack.",
            "Premium DTF that looks store-bought, priced for small businesses.",
        ]
    elif top_winner_angle == "Speed":
        example_hooks = [
            "Need custom shirts by tomorrow? We ship same-day.",
            "From upload to doorstep in 24 hours — no rush fees.",
            "Last-minute event? Your branded tees arrive overnight.",
        ]
    elif top_winner_angle == "Convenience":
        example_hooks = [
            "Upload. Order. Done. Custom merch shouldn't be complicated.",
            "3 clicks to professional custom prints — no minimums.",
            "The easiest way to get branded apparel for your whole team.",
        ]
    else:
        example_hooks = [
            "Your brand deserves custom apparel that actually impresses.",
            "Stop settling — get prints your customers will talk about.",
            "The smart way to get quality custom merch without the hassle.",
        ]

    return {
        "total_analyzed": total_analyzed,
        "winners_count": len(winners),
        "long_runners_count": len(long_runners),
        "winning_patterns": {
            "hooks": [{"type": k, "weighted_score": v} for k, v in winner_hooks.most_common(5)],
            "angles": [{"type": k, "weighted_score": v} for k, v in winner_angles.most_common(5)],
            "offers": [{"type": k, "weighted_score": v} for k, v in winner_offers.most_common(5)],
            "format_split": {"video": winner_formats.get("video", 0), "image": winner_formats.get("image", 0)},
        },
        "all_patterns": {
            "hooks": [{"type": k, "count": v} for k, v in all_hooks.most_common(7)],
            "angles": [{"type": k, "count": v} for k, v in all_angles.most_common(7)],
            "offers": [{"type": k, "count": v} for k, v in all_offers.most_common(7)],
            "format_split": {"video": all_formats.get("video", 0), "image": all_formats.get("image", 0)},
        },
        "competitor_comparison": competitor_comparison,
        "recommendation": " ".join(recommendation_parts),
        "example_hooks": example_hooks,
    }


# ─── Per-competitor analyzed ads (for the detail page) ────────────────────────

@router.get("/competitors/{competitor_id}/ads")
async def get_competitor_analyzed_ads(
    competitor_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    hook_type: Optional[str] = Query(None),
    angle: Optional[str] = Query(None),
    offer_type: Optional[str] = Query(None),
    confidence: Optional[str] = Query(None),
    winners_only: bool = Query(False),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Paginated list of ANALYZED ads for one competitor, with filters.
    Used by the per-competitor analysis detail page.
    """
    from math import ceil

    # Base: only ads that have an analysis row
    stmt = (
        select(Ad, AdAnalysis)
        .join(AdAnalysis, Ad.id == AdAnalysis.ad_id)
        .where(Ad.competitor_id == competitor_id)
    )

    # Filters
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
    if winners_only:
        stmt = stmt.where(Ad.days_running >= 90)
    if search:
        like_pattern = f"%{search}%"
        stmt = stmt.where(
            Ad.headline.ilike(like_pattern) | Ad.primary_text.ilike(like_pattern)
        )

    # Count total matching
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Order by days_running desc (most proven first)
    stmt = stmt.order_by(Ad.days_running.desc())

    # Paginate
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    rows = (await db.execute(stmt)).all()

    total_pages = ceil(total / per_page) if per_page else 0

    # Build response
    ads_out = []
    for ad, analysis in rows:
        ads_out.append({
            "id": str(ad.id),
            "ad_library_id": ad.ad_library_id,
            "headline": ad.headline,
            "primary_text": ad.primary_text,
            "media_url": ad.media_url,
            "is_video": ad.is_video,
            "hook_type": analysis.hook_type,
            "hook_text": analysis.hook_text,
            "angle": analysis.angle,
            "offer_type": analysis.offer_type,
            "offer_value": analysis.offer_value,
            "confidence_score": analysis.confidence_score,
            "days_running": ad.days_running,
            "first_seen": ad.first_seen.isoformat() if ad.first_seen else None,
            "status": ad.status,
        })

    return {
        "data": ads_out,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
        },
    }
