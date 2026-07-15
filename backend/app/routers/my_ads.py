"""
My Ads Router — endpoints for OUR brand's ads (Decoinks).

Reuses the same scraper/analysis infrastructure but keeps our brand's data
separate from competitor aggregates.
"""

import asyncio as _asyncio
import logging
from collections import Counter
from math import ceil
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db, AsyncSessionLocal
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.competitor import Competitor
from app.config import settings
from app.services.scraper_service import scrape_competitor
from app.services.analysis_service import run_analysis


router = APIRouter(prefix="/my-ads", tags=["my-ads"])
logger = logging.getLogger(__name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_own_brand(db: AsyncSession) -> Optional[Competitor]:
    """Get the own brand entry (is_own_brand=True)."""
    stmt = select(Competitor).where(Competitor.is_own_brand == True)
    return (await db.execute(stmt)).scalar_one_or_none()


# ─── Brand setup ──────────────────────────────────────────────────────────────

@router.get("/brand")
async def get_my_brand(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current own brand config."""
    brand = await _get_own_brand(db)
    if not brand:
        return {"configured": False}

    # Stats
    total_ads = (await db.execute(
        select(func.count(Ad.id)).where(Ad.competitor_id == brand.id)
    )).scalar() or 0
    analyzed = (await db.execute(
        select(func.count(AdAnalysis.ad_id))
        .join(Ad, Ad.id == AdAnalysis.ad_id)
        .where(Ad.competitor_id == brand.id)
    )).scalar() or 0

    return {
        "configured": True,
        "id": str(brand.id),
        "name": brand.name,
        "page_id": brand.page_id,
        "query": brand.query,
        "query_type": brand.query_type,
        "meta_ad_library_url": brand.meta_ad_library_url,
        "last_run": brand.last_run.isoformat() if brand.last_run else None,
        "total_ads": total_ads,
        "analyzed": analyzed,
        "pending": total_ads - analyzed,
    }


@router.post("/brand")
async def set_my_brand(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Set/update our brand. Accepts: name, page_id, query, query_type, meta_ad_library_url.
    If already set, updates it. Only one own-brand entry allowed.
    """
    name = payload.get("name", "Decoinks")
    page_id = payload.get("page_id")
    query = payload.get("query")
    query_type = payload.get("query_type", "page_id" if page_id else "keyword")
    meta_url = payload.get("meta_ad_library_url", "")

    # Check if own brand already exists
    existing = await _get_own_brand(db)

    if existing:
        existing.name = name
        existing.page_id = page_id
        existing.query = query
        existing.query_type = query_type
        existing.meta_ad_library_url = meta_url
        await db.commit()
        return {"status": "updated", "id": str(existing.id), "name": name}
    else:
        # Check if a competitor with the same name exists (upgrade it)
        by_name = (await db.execute(
            select(Competitor).where(Competitor.name == name)
        )).scalar_one_or_none()

        if by_name:
            by_name.is_own_brand = True
            by_name.page_id = page_id or by_name.page_id
            by_name.query = query or by_name.query
            by_name.query_type = query_type
            by_name.meta_ad_library_url = meta_url or by_name.meta_ad_library_url
            await db.commit()
            return {"status": "upgraded", "id": str(by_name.id), "name": name}

        brand = Competitor(
            name=name,
            domain="",
            page_id=page_id,
            query=query,
            query_type=query_type,
            meta_ad_library_url=meta_url,
            status="Active",
            is_own_brand=True,
            niches=["DTF", "Custom Printing"],
            priority_tier="High",
            region="US",
            tier=1,
            created_by=current_user.id,
        )
        db.add(brand)
        await db.commit()
        await db.refresh(brand)
        return {"status": "created", "id": str(brand.id), "name": name}


# ─── Scrape our brand ─────────────────────────────────────────────────────────

@router.post("/scrape", status_code=202)
async def trigger_my_brand_scrape(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger a scrape for our brand. Same mechanics as competitor scrape."""
    brand = await _get_own_brand(db)
    if not brand:
        raise HTTPException(status_code=400, detail="Own brand not configured. Set it first via POST /api/my-ads/brand.")

    _asyncio.create_task(_run_own_brand_scrape(brand.id, brand.name))
    return {"status": "started", "message": f"Scrape started for {brand.name}"}


async def _run_own_brand_scrape(brand_id: UUID, brand_name: str):
    try:
        async with AsyncSessionLocal() as db:
            await scrape_competitor(brand_id, db, trigger="manual")
        logger.info(f"[my-ads] Scrape completed for {brand_name}")
    except Exception as e:
        logger.error(f"[my-ads] Scrape failed for {brand_name}: {e}")


@router.get("/scrape-status")
async def get_my_brand_scrape_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get latest scrape status for own brand."""
    from app.models.scrape_run import ScrapeRun

    brand = await _get_own_brand(db)
    if not brand:
        return {"status": "not_configured"}

    latest = (await db.execute(
        select(ScrapeRun)
        .where(ScrapeRun.competitor_id == brand.id)
        .order_by(ScrapeRun.run_at.desc())
        .limit(1)
    )).scalar_one_or_none()

    if not latest:
        return {"status": "none"}

    return {
        "status": latest.status,
        "ads_found": latest.ads_found,
        "new_ads": latest.new_ads,
        "duration_seconds": latest.duration_seconds,
        "error_message": latest.error_message,
    }


# ─── Ads list ─────────────────────────────────────────────────────────────────

@router.get("/ads")
async def list_my_ads(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List our brand's ads with filters."""
    brand = await _get_own_brand(db)
    if not brand:
        return {"data": [], "total": 0, "page": 1, "per_page": per_page, "total_pages": 0}

    now = datetime.now(timezone.utc)
    stmt = select(Ad).where(Ad.competitor_id == brand.id).options(selectinload(Ad.analysis))

    if filter == "active":
        stmt = stmt.where(Ad.status == "approved")
    elif filter == "new_7d":
        seven_days_ago = now.date() - timedelta(days=7)
        stmt = stmt.where(Ad.active_since.isnot(None), Ad.active_since >= seven_days_ago)
    elif filter == "long_running":
        stmt = stmt.where(Ad.days_running >= 90)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = stmt.order_by(Ad.days_running.desc())
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    ads = (await db.execute(stmt)).scalars().unique().all()

    total_pages = ceil(total / per_page) if per_page else 0

    data = []
    for ad in ads:
        a = ad.analysis
        data.append({
            "id": str(ad.id),
            "ad_library_id": ad.ad_library_id,
            "headline": ad.headline,
            "hook": ad.hook,
            "primary_text": ad.primary_text,
            "media_url": ad.media_url,
            "screenshot_url": ad.screenshot_url,
            "video_poster_url": ad.video_poster_url,
            "is_video": ad.is_video,
            "cta": ad.cta,
            "domain": ad.domain,
            "advertiser_name": ad.advertiser_name,
            "ad_url": ad.ad_url,
            "days_running": ad.days_running,
            "status": ad.status,
            "first_seen": ad.first_seen.isoformat() if ad.first_seen else None,
            "hook_type": a.hook_type if a else None,
            "angle": a.angle if a else None,
            "offer_type": a.offer_type if a else None,
            "offer_value": a.offer_value if a else None,
            "confidence_score": a.confidence_score if a else None,
            "has_multiple_versions": ad.has_multiple_versions,
        })

    return {"data": data, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_my_ads_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """KPI stats for our brand."""
    brand = await _get_own_brand(db)
    if not brand:
        return {"total_ads": 0, "new_7d": 0, "long_running": 0, "oldest_days": 0, "avg_duration": 0}

    bid = brand.id
    now = datetime.now(timezone.utc)

    total = (await db.execute(select(func.count(Ad.id)).where(Ad.competitor_id == bid))).scalar() or 0
    new_7d = (await db.execute(
        select(func.count(Ad.id)).where(Ad.competitor_id == bid, Ad.active_since >= (now.date() - timedelta(days=7)))
    )).scalar() or 0
    long_running = (await db.execute(
        select(func.count(Ad.id)).where(Ad.competitor_id == bid, Ad.days_running >= 90)
    )).scalar() or 0
    oldest = (await db.execute(select(func.max(Ad.days_running)).where(Ad.competitor_id == bid))).scalar() or 0
    avg_dur = (await db.execute(
        select(func.avg(Ad.days_running)).where(Ad.competitor_id == bid, Ad.active_since.isnot(None))
    )).scalar() or 0

    return {
        "total_ads": total,
        "new_7d": new_7d,
        "long_running": long_running,
        "oldest_days": oldest,
        "avg_duration": round(float(avg_dur), 1),
    }


# ─── Analyze ──────────────────────────────────────────────────────────────────

_my_analysis_running = False
_my_analysis_progress = {"total": 0, "completed": 0, "failed": 0}


async def _run_my_brand_analysis(brand_id: UUID):
    global _my_analysis_running, _my_analysis_progress
    _my_analysis_running = True

    try:
        async with AsyncSessionLocal() as db:
            analyzed_ids = set((await db.execute(
                select(AdAnalysis.ad_id).join(Ad, Ad.id == AdAnalysis.ad_id).where(Ad.competitor_id == brand_id)
            )).scalars().all())

            all_ads = (await db.execute(
                select(Ad.id, Ad.primary_text, Ad.hook).where(Ad.competitor_id == brand_id)
            )).all()

        to_analyze = [aid for aid, pt, h in all_ads if aid not in analyzed_ids and (pt or h)]
        _my_analysis_progress = {"total": len(to_analyze), "completed": 0, "failed": 0}

        for i, ad_id in enumerate(to_analyze):
            try:
                async with AsyncSessionLocal() as db:
                    await run_analysis(str(ad_id), db)
                _my_analysis_progress["completed"] += 1
            except Exception:
                _my_analysis_progress["failed"] += 1

            await _asyncio.sleep(2)
            if (i + 1) % 5 == 0:
                await _asyncio.sleep(10)
    finally:
        _my_analysis_running = False


@router.post("/analyze", status_code=202)
async def trigger_my_brand_analyze(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyze all pending ads for our brand."""
    global _my_analysis_running
    brand = await _get_own_brand(db)
    if not brand:
        raise HTTPException(status_code=400, detail="Own brand not configured.")

    if _my_analysis_running:
        return {"status": "already_running", "progress": _my_analysis_progress}

    _asyncio.create_task(_run_my_brand_analysis(brand.id))
    return {"status": "started"}


@router.get("/analyze-status")
async def get_my_brand_analyze_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check analysis progress for our brand."""
    return {"running": _my_analysis_running, "progress": _my_analysis_progress}


# ─── Per-ad improvement suggestions ──────────────────────────────────────────

@router.post("/ads/{ad_id}/suggest")
async def get_ad_suggestion(
    ad_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate improvement suggestions for one of OUR ads,
    benchmarked against competitor winning patterns.
    """
    from app.services.ai_client import chat_completion

    # Get the ad + its analysis
    ad = (await db.execute(
        select(Ad).where(Ad.id == ad_id).options(selectinload(Ad.analysis))
    )).scalar_one_or_none()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")

    analysis = ad.analysis

    # Get competitor winning patterns (long-running, weighted)
    comp_stmt = (
        select(Ad, AdAnalysis)
        .join(AdAnalysis, Ad.id == AdAnalysis.ad_id)
        .join(Competitor, Ad.competitor_id == Competitor.id)
        .where(Competitor.is_own_brand == False, Ad.days_running >= 30)
        .order_by(Ad.days_running.desc())
        .limit(200)
    )
    comp_rows = (await db.execute(comp_stmt)).all()

    # Aggregate competitor patterns
    hook_counter = Counter()
    angle_counter = Counter()
    offer_counter = Counter()
    format_counter = Counter()
    for c_ad, c_analysis in comp_rows:
        w = c_ad.days_running
        if c_analysis.hook_type:
            hook_counter[c_analysis.hook_type] += w
        if c_analysis.angle:
            angle_counter[c_analysis.angle] += w
        if c_analysis.offer_type and c_analysis.offer_type != "None":
            offer_counter[c_analysis.offer_type] += w
        format_counter["video" if c_ad.is_video else "image"] += w

    winning_summary = {
        "top_hooks": [{"type": k, "score": v} for k, v in hook_counter.most_common(5)],
        "top_angles": [{"type": k, "score": v} for k, v in angle_counter.most_common(5)],
        "top_offers": [{"type": k, "score": v} for k, v in offer_counter.most_common(5)],
        "dominant_format": "video" if format_counter.get("video", 0) > format_counter.get("image", 0) else "image",
        "total_winners_analyzed": len(comp_rows),
    }

    # Build prompt
    ad_info = f"""
Ad headline: {ad.headline or 'N/A'}
Ad primary text: {(ad.primary_text or '')[:300]}
CTA: {ad.cta or 'None'}
Days running: {ad.days_running}
Is video: {ad.is_video}
"""
    if analysis:
        ad_info += f"""
Hook type: {analysis.hook_type or 'Not detected'}
Angle: {analysis.angle or 'Not detected'}
Offer type: {analysis.offer_type or 'None'}
Confidence: {analysis.confidence_score}%
"""

    system_prompt = """You are an advertising strategist. You analyze one of OUR ads and suggest improvements based on what works for competitors' long-running (proven) ads.

Rules:
- Base suggestions ONLY on the competitor winning patterns provided (real data: weighted by days running).
- Identify specific GAPS between our ad and proven patterns.
- Give 2-3 ORIGINAL rewritten hook lines to test (never copy competitor text).
- Flag weaknesses: missing CTA, weak hook, no offer, wrong format.
- Be specific and actionable. No vague advice.
- Output as JSON: {"gaps": [...], "weaknesses": [...], "suggested_hooks": [...], "recommended_angle": "...", "recommended_offer": "...", "format_note": "...", "summary": "..."}
"""

    user_prompt = f"""Our ad:
{ad_info}

Competitor winning patterns (weighted by days running, from {len(comp_rows)} proven ads):
Top hooks: {', '.join(f"{h['type']} ({h['score']})" for h in winning_summary['top_hooks'][:4])}
Top angles: {', '.join(f"{a['type']} ({a['score']})" for a in winning_summary['top_angles'][:4])}
Top offers: {', '.join(f"{o['type']} ({o['score']})" for o in winning_summary['top_offers'][:4])}
Dominant format: {winning_summary['dominant_format']}

Analyze our ad against these patterns. What gaps exist? How can we improve?"""

    raw = await chat_completion(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.4,
        max_tokens=1024,
        json_mode=True,
    )

    import json
    try:
        suggestion = json.loads(raw)
    except json.JSONDecodeError:
        suggestion = {"summary": raw, "gaps": [], "weaknesses": [], "suggested_hooks": []}

    return {
        "ad_id": str(ad_id),
        "suggestion": suggestion,
        "winning_patterns": winning_summary,
    }


# ─── Overall recommendation ──────────────────────────────────────────────────

@router.get("/recommendation")
async def get_overall_recommendation(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Overall "what ad should we make?" recommendation based on competitor data.
    Reuses competitor winning patterns.
    """
    # Get competitor winners
    comp_stmt = (
        select(Ad, AdAnalysis)
        .join(AdAnalysis, Ad.id == AdAnalysis.ad_id)
        .join(Competitor, Ad.competitor_id == Competitor.id)
        .where(Competitor.is_own_brand == False, Ad.days_running >= 30)
        .order_by(Ad.days_running.desc())
        .limit(200)
    )
    comp_rows = (await db.execute(comp_stmt)).all()

    if not comp_rows:
        return {
            "has_data": False,
            "message": "Not enough competitor data yet. Run competitor analysis first.",
        }

    hook_counter = Counter()
    angle_counter = Counter()
    offer_counter = Counter()
    format_counter = Counter()
    for c_ad, c_analysis in comp_rows:
        w = c_ad.days_running
        if c_analysis.hook_type:
            hook_counter[c_analysis.hook_type] += w
        if c_analysis.angle:
            angle_counter[c_analysis.angle] += w
        if c_analysis.offer_type and c_analysis.offer_type != "None":
            offer_counter[c_analysis.offer_type] += w
        format_counter["video" if c_ad.is_video else "image"] += w

    top_hook = hook_counter.most_common(1)[0][0] if hook_counter else "Benefit"
    top_angle = angle_counter.most_common(1)[0][0] if angle_counter else "Quality"
    top_offer = offer_counter.most_common(1)[0][0] if offer_counter else "Discount"
    dom_format = "video" if format_counter.get("video", 0) > format_counter.get("image", 0) else "image"

    # Simple example hooks based on winning patterns
    example_hooks = []
    if top_angle == "Price":
        example_hooks = [
            "Your custom prints shouldn't cost a fortune — here's proof.",
            "Same quality. Half the price. See why shops are switching.",
        ]
    elif top_angle == "Quality":
        example_hooks = [
            "Feel the difference real quality makes — prints that last 100+ washes.",
            "Premium DTF that looks store-bought, priced for small businesses.",
        ]
    elif top_angle == "Speed":
        example_hooks = [
            "Need custom shirts by tomorrow? We ship same-day.",
            "From upload to doorstep in 24 hours — no rush fees.",
        ]
    else:
        example_hooks = [
            "Your brand deserves custom apparel that actually impresses.",
            "The smart way to get quality custom merch without the hassle.",
        ]

    return {
        "has_data": True,
        "winners_analyzed": len(comp_rows),
        "recommended_hook_type": top_hook,
        "recommended_angle": top_angle,
        "recommended_offer": top_offer,
        "recommended_format": dom_format,
        "top_hooks": [{"type": k, "score": v} for k, v in hook_counter.most_common(5)],
        "top_angles": [{"type": k, "score": v} for k, v in angle_counter.most_common(5)],
        "top_offers": [{"type": k, "score": v} for k, v in offer_counter.most_common(5)],
        "example_hooks": example_hooks,
        "summary": (
            f"Based on {len(comp_rows)} proven competitor ads, the winning formula is: "
            f"{top_hook} hook + {top_angle} angle + {top_offer} offer in {dom_format} format. "
            f"This combination dominates among long-running (30d+) ads."
        ),
    }
