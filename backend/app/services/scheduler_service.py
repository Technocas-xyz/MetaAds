"""
Scheduler Service — runs daily scrapes for all competitors at a configured time.

Default: 09:00 UTC (configurable via DAILY_SCRAPE_HOUR env var).
Excludes is_own_brand=True competitors from the daily batch.
Persists run history for the UI status indicator.
Can be enabled/disabled at runtime.
"""

import asyncio
import logging
import os
from datetime import datetime, timezone, time, timedelta
from typing import Optional

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.competitor import Competitor
from app.services.scraper_service import run_scheduled_scrape

logger = logging.getLogger(__name__)

_scheduler_task: Optional[asyncio.Task] = None

# Configurable daily scrape hour (default 9 AM UTC)
DAILY_SCRAPE_HOUR = int(os.getenv("DAILY_SCRAPE_HOUR", "9"))
DAILY_SCRAPE_MINUTE = int(os.getenv("DAILY_SCRAPE_MINUTE", "0"))
DELAY_BETWEEN_COMPETITORS = int(os.getenv("SCRAPE_DELAY_SECONDS", "8"))

# Runtime state
_schedule_enabled: bool = os.getenv("DAILY_SCRAPE_ENABLED", "true").lower() == "true"

# Run history (persisted in memory; on VPS with restart, last run is visible until restart)
_last_run: Optional[dict] = None  # {started_at, finished_at, total, completed, failed, new_ads, zero_results: [...]}
_current_run: Optional[dict] = None  # While running


async def start_scheduler():
    """Start the background scheduler loop."""
    global _scheduler_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(_scheduler_loop())
        logger.info(
            f"[scheduler] Started daily scrape scheduler — "
            f"configured for {DAILY_SCRAPE_HOUR:02d}:{DAILY_SCRAPE_MINUTE:02d} UTC, "
            f"enabled={_schedule_enabled}"
        )


async def stop_scheduler():
    """Stop the background scheduler."""
    global _scheduler_task
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        try:
            await _scheduler_task
        except asyncio.CancelledError:
            pass
        logger.info("[scheduler] Stopped daily scrape scheduler")


def set_enabled(enabled: bool):
    """Enable/disable the daily schedule at runtime."""
    global _schedule_enabled
    _schedule_enabled = enabled
    logger.info(f"[scheduler] Schedule {'enabled' if enabled else 'disabled'}")


def is_enabled() -> bool:
    return _schedule_enabled


def get_schedule_status() -> dict:
    """Get full scheduler status for the UI."""
    now = datetime.now(timezone.utc)
    today = now.date()

    # Determine next run time
    scheduled_time = time(DAILY_SCRAPE_HOUR, DAILY_SCRAPE_MINUTE)
    next_run_dt = datetime.combine(today, scheduled_time, tzinfo=timezone.utc)
    if now.time() > scheduled_time:
        next_run_dt += timedelta(days=1)

    # Check if today's run happened
    today_ran = False
    if _last_run and _last_run.get("started_at"):
        last_date = _last_run["started_at"].date() if isinstance(_last_run["started_at"], datetime) else None
        today_ran = last_date == today

    return {
        "enabled": _schedule_enabled,
        "schedule_time": f"{DAILY_SCRAPE_HOUR:02d}:{DAILY_SCRAPE_MINUTE:02d} UTC",
        "today_ran": today_ran,
        "next_run": next_run_dt.isoformat(),
        "is_running": _current_run is not None,
        "current_run": _current_run,
        "last_run": _last_run,
    }


async def _scheduler_loop():
    """
    Main scheduler loop. Checks every 60 seconds if it's time for the daily run.
    """
    ran_today = False
    last_run_date = None

    while True:
        try:
            now = datetime.now(timezone.utc)
            today = now.date()
            current_time = now.time()
            scheduled_time = time(DAILY_SCRAPE_HOUR, DAILY_SCRAPE_MINUTE)

            # Reset flag at midnight
            if last_run_date != today:
                ran_today = False

            # Check if it's time to run
            if (
                _schedule_enabled
                and not ran_today
                and _is_time_to_run(current_time, scheduled_time)
            ):
                ran_today = True
                last_run_date = today
                logger.info(
                    f"[scheduler] ═══ DAILY SCRAPE TRIGGERING at "
                    f"{now.strftime('%Y-%m-%d %H:%M:%S')} UTC ═══"
                )
                asyncio.create_task(_run_daily_batch())

        except Exception as e:
            logger.error(f"[scheduler] Error in scheduler loop: {e}")

        # Check every 60 seconds
        await asyncio.sleep(60)


async def _run_daily_batch():
    """Run scrapes for all active competitors (excluding own brand) sequentially."""
    global _current_run, _last_run
    from app.services.job_controller import scrape_all_job

    start_time = datetime.now(timezone.utc)
    _current_run = {
        "started_at": start_time,
        "total": 0,
        "completed": 0,
        "failed": 0,
        "new_ads": 0,
        "zero_results": [],
        "current": None,
    }

    try:
        async with AsyncSessionLocal() as db:
            stmt = select(Competitor).where(
                Competitor.status == "Active",
                Competitor.is_own_brand == False,
            ).order_by(Competitor.name)
            competitors = (await db.execute(stmt)).scalars().all()

        total = len(competitors)
        _current_run["total"] = total
        scrape_all_job.start(total)

        logger.info(f"[scheduler] Daily batch: {total} competitors to scrape")

        for i, comp in enumerate(competitors, 1):
            # Respect pause/stop
            if not await scrape_all_job.should_continue():
                logger.info(f"[scheduler] Daily batch paused/stopped at {i}/{total}")
                break

            _current_run["current"] = comp.name
            scrape_all_job.current = comp.name
            logger.info(f"[scheduler] [{i}/{total}] Scraping: {comp.name}")

            try:
                await run_scheduled_scrape(comp.id)
                _current_run["completed"] += 1
                scrape_all_job.completed += 1
                logger.info(f"[scheduler] [{i}/{total}] ✓ {comp.name} done")
            except Exception as e:
                _current_run["failed"] += 1
                scrape_all_job.failed += 1
                logger.error(f"[scheduler] [{i}/{total}] ✗ {comp.name} FAILED: {e}")

            # Delay between competitors
            if i < total:
                await asyncio.sleep(DELAY_BETWEEN_COMPETITORS)

        if scrape_all_job.state.value == "running":
            scrape_all_job.complete()

        _current_run["finished_at"] = datetime.now(timezone.utc)
        duration = int((datetime.now(timezone.utc) - start_time).total_seconds())

        logger.info(
            f"[scheduler] ═══ DAILY SCRAPE COMPLETE ═══ "
            f"Duration: {duration}s | Completed: {_current_run['completed']}/{total} | "
            f"Failed: {_current_run['failed']}"
        )

    except Exception as e:
        logger.error(f"[scheduler] Daily batch crashed: {e}")
        _current_run["finished_at"] = datetime.now(timezone.utc)
    finally:
        _last_run = dict(_current_run)
        _current_run = None


def _is_time_to_run(current: time, scheduled: time) -> bool:
    """Check if current time is within 2 minutes of scheduled time."""
    current_minutes = current.hour * 60 + current.minute
    scheduled_minutes = scheduled.hour * 60 + scheduled.minute
    return abs(current_minutes - scheduled_minutes) <= 1
