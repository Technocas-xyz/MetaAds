"""
Analysis Queue — background AI analysis of unanalyzed ads.

This module owns the "Analyze All" batch job that used to live in
routers/scraper.py. It is shared by three callers:

  * the POST /scraper/analyze-all endpoint (manual "Analyze All" button),
  * scrape_competitor() when a scrape finishes (auto-start),
  * the scheduler loop's periodic check (resumes after an AI daily-limit reset
    or a backend restart).

The batch loop itself (_run_batch_analysis) is unchanged from the original
router implementation: it analyzes every ad with no ad_analyses row, waits out
short AI rate limits (AIProvidersExhausted), and honours pause/stop through
analyze_all_job.

start_if_pending() is the single entry point for automatic starts. It never
runs when a batch is already active, when nothing is pending, or when a user
has stopped the job (see _user_stopped below).
"""

import asyncio
import logging

from sqlalchemy import func, select

from app.database import AsyncSessionLocal
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.services.ai_client import AIProvidersExhausted
from app.services.analysis_service import run_analysis
from app.services.job_controller import analyze_all_job

logger = logging.getLogger(__name__)

# ─── Module state (moved from routers/scraper.py, behaviour unchanged) ─────────
_analysis_running = False
_analysis_progress = {"total": 0, "completed": 0, "failed": 0, "skipped": 0}

# When a user clicks Stop, automatic starts (scheduler periodic check) must not
# restart the job. The flag is cleared when the user clicks Analyze All again,
# or when a new scrape brings fresh pending ads. Pause is handled separately by
# analyze_all_job.is_active (a paused job is still "active"), so a paused job is
# never auto-restarted either.
_user_stopped = False


def note_user_started() -> None:
    """Clear the manual-stop flag — the user explicitly asked analysis to run."""
    global _user_stopped
    _user_stopped = False


def note_user_stopped() -> None:
    """Record that a user stopped the batch, so auto-start leaves it alone."""
    global _user_stopped
    _user_stopped = True


async def _run_batch_analysis():
    """Analyze all unanalyzed ads sequentially in background."""
    global _analysis_running, _analysis_progress
    _analysis_running = True
    log = logging.getLogger(__name__)

    try:
        async with AsyncSessionLocal() as db:
            analyzed_ids_stmt = select(AdAnalysis.ad_id)
            analyzed_ids = set((await db.execute(analyzed_ids_stmt)).scalars().all())
            all_ads_stmt = select(Ad.id, Ad.primary_text, Ad.hook).order_by(Ad.created_at.desc())
            all_ads = (await db.execute(all_ads_stmt)).all()

        to_analyze = []
        skipped = 0
        for ad_id, primary_text, hook in all_ads:
            if ad_id in analyzed_ids:
                continue
            if not primary_text and not hook:
                skipped += 1
                continue
            to_analyze.append(ad_id)

        total = len(to_analyze)
        _analysis_progress = {"total": total, "completed": 0, "failed": 0, "skipped": skipped}
        analyze_all_job.start(total)
        analyze_all_job.skipped = skipped

        log.info(f"[analyze-all] Starting batch analysis: {total} ads to analyze")

        BATCH_SIZE = 5
        DELAY_BETWEEN = 2  # seconds between each analysis (AI rate limit)
        DELAY_BETWEEN_BATCHES = 10  # extra pause every BATCH_SIZE
        MAX_PROVIDER_WAIT = 20 * 60  # wait out AI limits shorter than this
        pending_retry = []           # ads put back while providers were busy

        def queue():
            for item in to_analyze:
                yield item
            while pending_retry:
                yield pending_retry.pop(0)

        for i, ad_id in enumerate(queue()):
            # Check pause/stop before each ad
            if not await analyze_all_job.should_continue():
                break

            try:
                async with AsyncSessionLocal() as db:
                    await run_analysis(str(ad_id), db)
                _analysis_progress["completed"] += 1
                analyze_all_job.completed += 1

                if (i + 1) % 10 == 0:
                    log.info(f"[analyze-all] Progress: {analyze_all_job.completed}/{total}")

            except AIProvidersExhausted as e:
                # Every provider is busy. Short waits (per-minute limits) are
                # sat out and the ad retried later; if nothing comes back soon
                # (no credits, daily caps) stop instead of failing every ad.
                if e.retry_in <= MAX_PROVIDER_WAIT:
                    log.info(f"[analyze-all] All AI providers busy; waiting {int(e.retry_in)}s")
                    waited = 0
                    while waited < e.retry_in + 5 and await analyze_all_job.should_continue():
                        await asyncio.sleep(15)
                        waited += 15
                    pending_retry.append(ad_id)
                    continue
                analyze_all_job.message = str(e)[:300]
                analyze_all_job.stop()
                log.warning(f"[analyze-all] Stopped at {i}/{total}: {e}")
                break
            except Exception as e:
                _analysis_progress["failed"] += 1
                analyze_all_job.failed += 1
                if analyze_all_job.failed <= 5:
                    log.warning(f"[analyze-all] Failed ad {ad_id}: {e}")

            await asyncio.sleep(DELAY_BETWEEN)
            if (i + 1) % BATCH_SIZE == 0:
                await asyncio.sleep(DELAY_BETWEEN_BATCHES)

        if analyze_all_job.state.value == "running":
            analyze_all_job.complete()
            log.info(f"[analyze-all] Done: {analyze_all_job.completed} analyzed, {analyze_all_job.failed} failed")

    except Exception as e:
        logging.getLogger(__name__).error(f"[analyze-all] Batch crashed: {e}")
    finally:
        _analysis_running = False


async def _count_pending() -> int:
    """Ads that have no ad_analyses row yet."""
    async with AsyncSessionLocal() as db:
        return (await db.execute(
            select(func.count(Ad.id))
            .outerjoin(AdAnalysis, AdAnalysis.ad_id == Ad.id)
            .where(AdAnalysis.id.is_(None))
        )).scalar() or 0


async def start_if_pending(reason: str) -> bool:
    """Start the batch analysis automatically when work is waiting.

    Returns False (and starts nothing) when:
      * a batch is already running or paused (analyze_all_job.is_active),
      * a user stopped the job and hasn't re-started it or run a new scrape,
      * no ads are pending.

    A finished scrape that brings in new pending ads clears a prior manual stop,
    so fresh ads are always analyzed; the scheduler's periodic check never does.
    """
    global _user_stopped

    if analyze_all_job.is_active:
        return False

    pending = await _count_pending()

    # A new scrape with fresh ads overrides an earlier manual stop; the periodic
    # check (and anything else) leaves the stop flag in place.
    if reason == "scrape finished" and pending > 0:
        _user_stopped = False

    if _user_stopped:
        return False
    if pending <= 0:
        return False

    analyze_all_job.reset()
    asyncio.create_task(_run_batch_analysis())
    # WARNING level on purpose: the app configures no handler for INFO, so an
    # INFO line would never reach the logs. An automatic batch start is a
    # significant, infrequent event operators need to see, so surface it.
    logger.warning(f"[auto-analysis] started ({reason}): {pending} pending")
    return True
