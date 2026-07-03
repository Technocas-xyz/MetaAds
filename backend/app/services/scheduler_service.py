"""
Scheduler Service — runs daily scrapes for each competitor at their configured time.

Uses asyncio background task approach integrated with FastAPI lifespan.
"""

import asyncio
import logging
from datetime import datetime, timezone, time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.competitor import Competitor
from app.services.scraper_service import run_scheduled_scrape

logger = logging.getLogger(__name__)

_scheduler_task: asyncio.Task | None = None


async def start_scheduler():
    """Start the background scheduler loop."""
    global _scheduler_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(_scheduler_loop())
        logger.info("[scheduler] Started daily scrape scheduler")


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


async def _scheduler_loop():
    """
    Main scheduler loop. Checks every 60 seconds which competitors
    are due for a scrape based on their schedule_time.
    """
    checked_today: set = set()  # Track (competitor_id, date) to avoid duplicate runs

    while True:
        try:
            now = datetime.now(timezone.utc)
            today = now.date()
            current_time = now.time()

            # Reset tracking at midnight
            if checked_today and any(d != today for _, d in checked_today):
                checked_today.clear()

            async with AsyncSessionLocal() as db:
                # Get all active competitors with schedule times
                stmt = select(Competitor).where(Competitor.status == "Active")
                competitors = (await db.execute(stmt)).scalars().all()

                for comp in competitors:
                    key = (comp.id, today)
                    if key in checked_today:
                        continue

                    schedule = comp.schedule_time or time(3, 0)

                    # Check if it's time to run (within 2-minute window)
                    if _is_time_to_run(current_time, schedule):
                        # Check if already ran today
                        if comp.last_run and comp.last_run.date() == today:
                            checked_today.add(key)
                            continue

                        logger.info(f"[scheduler] Triggering scrape for {comp.name}")
                        checked_today.add(key)

                        # Run scrape in background (don't block the loop)
                        asyncio.create_task(
                            _safe_scrape(comp.id, comp.name)
                        )

        except Exception as e:
            logger.error(f"[scheduler] Error in scheduler loop: {e}")

        # Check every 60 seconds
        await asyncio.sleep(60)


def _is_time_to_run(current: time, scheduled: time) -> bool:
    """Check if current time is within 2 minutes of scheduled time."""
    current_minutes = current.hour * 60 + current.minute
    scheduled_minutes = scheduled.hour * 60 + scheduled.minute
    return abs(current_minutes - scheduled_minutes) <= 1


async def _safe_scrape(competitor_id, competitor_name: str):
    """Run a scrape with error handling — won't crash the scheduler."""
    try:
        await run_scheduled_scrape(competitor_id)
        logger.info(f"[scheduler] Completed scrape for {competitor_name}")
    except Exception as e:
        logger.error(f"[scheduler] Failed scrape for {competitor_name}: {e}")
