"""
Scraper Router — endpoints for the competitor scraping feature.

GET  /scraper/competitors          — list all competitors with scraping stats
GET  /scraper/competitors/:id      — competitor detail with stats + recent runs
GET  /scraper/competitors/:id/ads  — paginated list of scraped ads
POST /scraper/competitors/:id/scrape — trigger manual scrape (Run Now)
POST /scraper/ads/:id/analyze      — trigger AI analysis for a single ad
GET  /scraper/runs                 — recent scrape runs (all competitors)
"""

from math import ceil
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db, AsyncSessionLocal
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.competitor import Competitor
from app.models.scrape_run import ScrapeRun
from app.schemas.scraper import (
    ScraperCompetitorResponse,
    ScraperCompetitorDetailResponse,
    ScrapedAdResponse,
    ScrapedAdsListResponse,
    ScrapeRunResponse,
)
from app.services.scraper_service import scrape_competitor
from app.services.analysis_service import run_analysis


router = APIRouter(prefix="/scraper", tags=["scraper"])


# ---------- Helpers ----------

async def _compute_scraper_stats(db: AsyncSession, competitor_id: UUID) -> dict:
    """Compute scraping-specific stats for a competitor using REAL ad start dates."""
    now = datetime.now(timezone.utc)
    today = now.date()

    # Total ads (ALL ads for this competitor, matching what the list shows)
    total_stmt = select(func.count(Ad.id)).where(
        Ad.competitor_id == competitor_id,
    )
    total_active = (await db.execute(total_stmt)).scalar() or 0

    # New in last 7 days — uses active_since (real Meta start date)
    seven_days_ago = today - timedelta(days=7)
    new_7d_stmt = select(func.count(Ad.id)).where(
        Ad.competitor_id == competitor_id,
        Ad.active_since.isnot(None),
        Ad.active_since >= seven_days_ago,
    )
    new_7d = (await db.execute(new_7d_stmt)).scalar() or 0

    # Long-running (3+ months) — days_running >= 90
    long_running_stmt = select(func.count(Ad.id)).where(
        Ad.competitor_id == competitor_id,
        Ad.days_running >= 90,
    )
    long_running_3mo = (await db.execute(long_running_stmt)).scalar() or 0

    # Oldest ad — max(days_running)
    oldest_stmt = select(func.max(Ad.days_running)).where(
        Ad.competitor_id == competitor_id,
    )
    oldest_ad_days = (await db.execute(oldest_stmt)).scalar() or 0

    # Average duration — avg(days_running) where active_since is set
    avg_stmt = select(func.avg(Ad.days_running)).where(
        Ad.competitor_id == competitor_id,
        Ad.active_since.isnot(None),
    )
    avg_duration_days = (await db.execute(avg_stmt)).scalar() or 0
    avg_duration_days = round(float(avg_duration_days), 1)

    return {
        "total_active_ads": total_active,
        "new_7d": new_7d,
        "long_running_3mo": long_running_3mo,
        "oldest_ad_days": oldest_ad_days,
        "avg_duration_days": avg_duration_days,
    }


def _ad_to_scraped_response(ad: Ad) -> ScrapedAdResponse:
    """Convert an Ad model to ScrapedAdResponse."""
    now = datetime.now(timezone.utc)
    first_seen = ad.first_seen
    if first_seen.tzinfo is None:
        first_seen = first_seen.replace(tzinfo=timezone.utc)

    days_running = max(0, (now - first_seen).days)
    start_date_str = first_seen.strftime("%b %d, %Y")
    is_active = ad.status != "flagged"

    # Get AI analysis if available
    hook_type = None
    angle = None
    offer = None
    if ad.analysis:
        hook_type = ad.analysis.hook_type
        angle = ad.analysis.angle
        offer = ad.analysis.offer_type

    return ScrapedAdResponse(
        id=ad.id,
        ad_library_id=ad.ad_library_id,
        competitor_id=ad.competitor_id,
        headline=ad.headline,
        hook=ad.hook,
        primary_text=ad.primary_text,
        media_url=ad.media_url,
        screenshot_url=ad.screenshot_url,
        ad_video_url=ad.ad_video_url,
        video_poster_url=ad.video_poster_url,
        is_video=ad.is_video,
        has_multiple_versions=ad.has_multiple_versions,
        platform=ad.platform,
        ad_url=ad.ad_url,
        landing_url=ad.landing_url,
        cta=ad.cta,
        advertiser_name=ad.advertiser_name,
        domain=ad.domain,
        status=ad.status,
        first_seen=ad.first_seen,
        last_seen=ad.last_seen,
        start_date=start_date_str,
        days_running=days_running,
        is_active=is_active,
        variants=ad.variants or 1,
        hook_type=hook_type,
        angle=angle,
        offer=offer,
    )


# ---------- Endpoints ----------

@router.get("/competitors", response_model=list[ScraperCompetitorResponse])
async def list_scraper_competitors(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all competitors with scraping stats for the scraper view."""
    stmt = select(Competitor).where(
        Competitor.status == "Active"
    ).order_by(Competitor.name.asc())
    competitors = (await db.execute(stmt)).scalars().all()

    responses = []
    for c in competitors:
        stats = await _compute_scraper_stats(db, c.id)
        responses.append(ScraperCompetitorResponse(
            id=c.id,
            name=c.name,
            page_id=c.page_id,
            query=c.query,
            query_type=c.query_type,
            meta_ad_library_url=c.meta_ad_library_url,
            schedule_time=c.schedule_time,
            last_run=c.last_run,
            logo_url=c.logo_url,
            status=c.status,
            total_active_ads=stats["total_active_ads"],
            new_7d=stats["new_7d"],
            long_running_3mo=stats["long_running_3mo"],
        ))
    return responses


@router.get("/competitors/{competitor_id}", response_model=ScraperCompetitorDetailResponse)
async def get_scraper_competitor(
    competitor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a competitor with full scraping details."""
    competitor = await db.get(Competitor, competitor_id)
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    stats = await _compute_scraper_stats(db, competitor_id)

    # Get recent runs
    runs_stmt = (
        select(ScrapeRun)
        .where(ScrapeRun.competitor_id == competitor_id)
        .order_by(ScrapeRun.run_at.desc())
        .limit(10)
    )
    runs = (await db.execute(runs_stmt)).scalars().all()

    return ScraperCompetitorDetailResponse(
        id=competitor.id,
        name=competitor.name,
        page_id=competitor.page_id,
        query=competitor.query,
        query_type=competitor.query_type,
        meta_ad_library_url=competitor.meta_ad_library_url,
        schedule_time=competitor.schedule_time,
        last_run=competitor.last_run,
        logo_url=competitor.logo_url,
        status=competitor.status,
        total_ads=stats["total_active_ads"],
        new_7d=stats["new_7d"],
        long_running_3mo=stats["long_running_3mo"],
        oldest_ad_days=stats["oldest_ad_days"],
        avg_duration_days=stats["avg_duration_days"],
        recent_runs=[ScrapeRunResponse.model_validate(r) for r in runs],
    )


@router.get("/competitors/{competitor_id}/ads", response_model=ScrapedAdsListResponse)
async def list_competitor_ads(
    competitor_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    filter: Optional[str] = Query(None, description="all|active|new_7d|long_running"),
    sort: str = Query("-first_seen"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List scraped ads for a competitor with filtering and pagination."""
    # Verify competitor exists
    competitor = await db.get(Competitor, competitor_id)
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    now = datetime.now(timezone.utc)
    stmt = select(Ad).where(Ad.competitor_id == competitor_id).options(
        selectinload(Ad.analysis)
    )

    # Apply filter — uses active_since (real Meta start date)
    if filter == "active":
        stmt = stmt.where(Ad.status == "approved")
    elif filter == "new_7d":
        seven_days_ago = now.date() - timedelta(days=7)
        stmt = stmt.where(
            Ad.active_since.isnot(None),
            Ad.active_since >= seven_days_ago,
        )
    elif filter == "long_running":
        stmt = stmt.where(
            Ad.days_running >= 90,
        )
    # "all" → no additional filter

    # Count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Sorting
    sort_field = sort.lstrip("-")
    descending = sort.startswith("-")
    sort_col = getattr(Ad, sort_field, None) or Ad.first_seen
    stmt = stmt.order_by(sort_col.desc() if descending else sort_col.asc())

    # Pagination
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    ads = (await db.execute(stmt)).scalars().unique().all()

    total_pages = ceil(total / per_page) if per_page else 0

    return ScrapedAdsListResponse(
        data=[_ad_to_scraped_response(ad) for ad in ads],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.post("/competitors/{competitor_id}/scrape", status_code=202)
async def trigger_scrape(
    competitor_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger a scrape for a competitor (Run Now button).
    Returns 202 immediately; scrape runs in background.
    Poll GET /scraper/competitors/{id}/scrape-status for progress.
    """
    competitor = await db.get(Competitor, competitor_id)
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    # Launch scrape in background
    _asyncio.create_task(_run_single_scrape(competitor_id, competitor.name))

    return {
        "status": "started",
        "competitor_id": str(competitor_id),
        "message": f"Scrape started for {competitor.name}",
    }


async def _run_single_scrape(competitor_id: UUID, comp_name: str):
    """Background task: run a single competitor scrape."""
    import logging
    log = logging.getLogger(__name__)
    try:
        async with AsyncSessionLocal() as db:
            await scrape_competitor(competitor_id, db, trigger="manual")
        log.info(f"[bg-scrape] Completed for {comp_name}")
    except Exception as e:
        log.error(f"[bg-scrape] Failed for {comp_name}: {e}")


@router.get("/competitors/{competitor_id}/scrape-status")
async def get_scrape_status(
    competitor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the latest scrape run status for a competitor (for polling)."""
    latest = (await db.execute(
        select(ScrapeRun)
        .where(ScrapeRun.competitor_id == competitor_id)
        .order_by(ScrapeRun.run_at.desc())
        .limit(1)
    )).scalar_one_or_none()

    if not latest:
        return {"status": "none", "ads_found": 0, "new_ads": 0}

    return {
        "status": latest.status,
        "ads_found": latest.ads_found,
        "new_ads": latest.new_ads,
        "ended_ads": latest.ended_ads,
        "duration_seconds": latest.duration_seconds,
        "error_message": latest.error_message,
        "run_at": latest.run_at.isoformat() if latest.run_at else None,
    }


@router.post("/ads/{ad_id}/analyze", status_code=status.HTTP_200_OK)
async def analyze_ad(
    ad_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger AI analysis for a single scraped ad."""
    ad = await db.get(Ad, ad_id)
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")

    analysis = await run_analysis(str(ad_id), db)
    return {
        "status": "analyzed",
        "ad_id": str(ad_id),
        "confidence_score": analysis.confidence_score,
        "hook_type": analysis.hook_type,
        "angle": analysis.angle,
        "offer_type": analysis.offer_type,
    }


@router.get("/runs", response_model=list[ScrapeRunResponse])
async def list_recent_runs(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List recent scrape runs across all competitors."""
    stmt = (
        select(ScrapeRun)
        .order_by(ScrapeRun.run_at.desc())
        .limit(limit)
    )
    runs = (await db.execute(stmt)).scalars().all()
    return [ScrapeRunResponse.model_validate(r) for r in runs]


# ─── Scrape All (batch) ───────────────────────────────────────────────────────

import asyncio as _asyncio

_batch_running = False
_batch_progress = {"total": 0, "completed": 0, "failed": 0, "current": None}


async def _run_batch_scrape():
    """Run scrapes for all active competitors sequentially in background."""
    global _batch_running, _batch_progress
    _batch_running = True

    try:
        async with AsyncSessionLocal() as db:
            stmt = select(Competitor).where(Competitor.status == "Active").order_by(Competitor.name)
            competitors = (await db.execute(stmt)).scalars().all()
            _batch_progress["total"] = len(competitors)
            _batch_progress["completed"] = 0
            _batch_progress["failed"] = 0

        for comp in competitors:
            _batch_progress["current"] = comp.name
            try:
                async with AsyncSessionLocal() as db:
                    await scrape_competitor(comp.id, db, trigger="batch")
                _batch_progress["completed"] += 1
            except Exception as e:
                _batch_progress["failed"] += 1
                import logging
                logging.getLogger(__name__).error(f"[batch] Failed {comp.name}: {e}")

            # Delay between competitors to avoid hammering Meta
            await _asyncio.sleep(8)

    finally:
        _batch_running = False
        _batch_progress["current"] = None


@router.post("/scrape-all", status_code=202)
async def trigger_scrape_all(
    current_user: User = Depends(get_current_user),
):
    """
    Start scraping ALL competitors sequentially in the background.
    Returns immediately with 202 Accepted.
    """
    global _batch_running
    if _batch_running:
        return {
            "status": "already_running",
            "progress": _batch_progress,
        }

    # Launch background task
    _asyncio.create_task(_run_batch_scrape())

    return {
        "status": "started",
        "message": "Batch scrape started for all competitors. Check /api/scraper/scrape-all/status for progress.",
    }


@router.get("/scrape-all/status")
async def get_batch_status(
    current_user: User = Depends(get_current_user),
):
    """Check progress of the batch scrape."""
    return {
        "running": _batch_running,
        "progress": _batch_progress,
    }


# ─── Analyze All (batch AI analysis) ─────────────────────────────────────────

_analysis_running = False
_analysis_progress = {"total": 0, "completed": 0, "failed": 0, "skipped": 0}


async def _run_batch_analysis():
    """Analyze all unanalyzed ads sequentially in background."""
    global _analysis_running, _analysis_progress
    _analysis_running = True
    import logging
    log = logging.getLogger(__name__)

    try:
        # Find all ads without analysis
        async with AsyncSessionLocal() as db:
            # Get IDs of ads that already have analysis
            analyzed_ids_stmt = select(AdAnalysis.ad_id)
            analyzed_ids = set(
                (await db.execute(analyzed_ids_stmt)).scalars().all()
            )

            # Get all ads
            all_ads_stmt = select(Ad.id, Ad.primary_text, Ad.hook).order_by(Ad.created_at.desc())
            all_ads = (await db.execute(all_ads_stmt)).all()

        # Filter to unanalyzed ads that have enough text to analyze
        to_analyze = []
        for ad_id, primary_text, hook in all_ads:
            if ad_id in analyzed_ids:
                continue
            # Skip ads with no text at all (nothing to analyze)
            if not primary_text and not hook:
                _analysis_progress["skipped"] += 1
                continue
            to_analyze.append(ad_id)

        _analysis_progress["total"] = len(to_analyze)
        _analysis_progress["completed"] = 0
        _analysis_progress["failed"] = 0
        _analysis_progress["skipped"] = len(all_ads) - len(to_analyze) - len(analyzed_ids)

        log.info(f"[analyze-all] Starting batch analysis: {len(to_analyze)} ads to analyze")

        # Process in batches with delays for rate limiting
        BATCH_SIZE = 5
        DELAY_BETWEEN = 2  # seconds between each analysis (Groq rate limit)
        DELAY_BETWEEN_BATCHES = 10  # extra pause every BATCH_SIZE

        for i, ad_id in enumerate(to_analyze):
            try:
                async with AsyncSessionLocal() as db:
                    await run_analysis(str(ad_id), db)
                _analysis_progress["completed"] += 1

                if (i + 1) % 10 == 0:
                    log.info(
                        f"[analyze-all] Progress: {_analysis_progress['completed']}/{len(to_analyze)}"
                    )

            except Exception as e:
                _analysis_progress["failed"] += 1
                if _analysis_progress["failed"] <= 5:
                    log.warning(f"[analyze-all] Failed ad {ad_id}: {e}")

            # Rate limiting
            await _asyncio.sleep(DELAY_BETWEEN)
            if (i + 1) % BATCH_SIZE == 0:
                await _asyncio.sleep(DELAY_BETWEEN_BATCHES)

        log.info(
            f"[analyze-all] Done: {_analysis_progress['completed']} analyzed, "
            f"{_analysis_progress['failed']} failed, {_analysis_progress['skipped']} skipped"
        )

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"[analyze-all] Batch crashed: {e}")
    finally:
        _analysis_running = False


@router.post("/analyze-all", status_code=202)
async def trigger_analyze_all(
    current_user: User = Depends(get_current_user),
):
    """
    Start AI analysis on ALL unanalyzed ads in background.
    Returns immediately with 202. Idempotent — skips already-analyzed ads.
    """
    global _analysis_running
    if _analysis_running:
        return {
            "status": "already_running",
            "progress": _analysis_progress,
        }

    _asyncio.create_task(_run_batch_analysis())

    return {
        "status": "started",
        "message": "Batch analysis started. Check /api/scraper/analyze-all/status for progress.",
    }


@router.get("/analyze-all/status")
async def get_analysis_status(
    current_user: User = Depends(get_current_user),
):
    """Check progress of the batch analysis."""
    # Also get totals for context
    async with AsyncSessionLocal() as db:
        total_ads = (await db.execute(select(func.count(Ad.id)))).scalar() or 0
        total_analyzed = (await db.execute(select(func.count(AdAnalysis.id)))).scalar() or 0

    return {
        "running": _analysis_running,
        "progress": _analysis_progress,
        "totals": {
            "total_ads": total_ads,
            "total_analyzed": total_analyzed,
            "remaining": total_ads - total_analyzed,
        },
    }


# ─── Delete competitor ────────────────────────────────────────────────────────

@router.delete("/competitors/{competitor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_competitor(
    competitor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Hard-delete a competitor and ALL its data (ads, analyses, scrape runs).
    This is the only place hard-deletes are allowed — explicit user action.
    """
    competitor = await db.get(Competitor, competitor_id)
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    # Delete in correct order (or rely on CASCADE)
    # ads -> ad_analyses (cascade), review_queue (cascade)
    # scrape_runs -> cascade from competitor
    # The FK on ads has ondelete=CASCADE from competitor, so deleting competitor
    # cascades to ads -> ad_analyses, review_queue
    await db.delete(competitor)
    await db.commit()
    return None
