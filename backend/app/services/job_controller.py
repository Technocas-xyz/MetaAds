"""
Job Controller — manages state for long-running batch jobs.

Supports: start, pause, resume, stop.
State is server-side and survives page refreshes.
A paused/stopped job makes NO further API calls.
Completed work is NEVER rolled back.
"""

import asyncio
import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


class JobState(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"
    COMPLETED = "completed"


class JobController:
    """
    Controls a single batch job. Check `should_continue()` before each item.
    """

    def __init__(self, name: str):
        self.name = name
        self.state: JobState = JobState.IDLE
        self.total: int = 0
        self.completed: int = 0
        self.failed: int = 0
        self.skipped: int = 0
        self.current: Optional[str] = None
        self.started_at: Optional[datetime] = None
        self.finished_at: Optional[datetime] = None
        self._pause_event = asyncio.Event()
        self._pause_event.set()  # Not paused initially
        self._task: Optional[asyncio.Task] = None

    def start(self, total: int):
        """Mark job as started."""
        self.state = JobState.RUNNING
        self.total = total
        self.completed = 0
        self.failed = 0
        self.skipped = 0
        self.current = None
        self.started_at = datetime.now(timezone.utc)
        self.finished_at = None
        self._pause_event.set()
        logger.info(f"[job:{self.name}] Started — {total} items to process")

    def pause(self):
        """Pause the job. Current in-flight item finishes, then stops."""
        if self.state == JobState.RUNNING:
            self.state = JobState.PAUSED
            self._pause_event.clear()
            logger.info(f"[job:{self.name}] Paused at {self.completed}/{self.total}")

    def resume(self):
        """Resume a paused job."""
        if self.state == JobState.PAUSED:
            self.state = JobState.RUNNING
            self._pause_event.set()
            logger.info(f"[job:{self.name}] Resumed from {self.completed}/{self.total}")

    def stop(self):
        """Stop the job entirely. Work done stays saved."""
        if self.state in (JobState.RUNNING, JobState.PAUSED):
            self.state = JobState.STOPPED
            self._pause_event.set()  # Unblock if paused so loop can exit
            self.finished_at = datetime.now(timezone.utc)
            logger.info(f"[job:{self.name}] Stopped at {self.completed}/{self.total}")

    def complete(self):
        """Mark job as completed."""
        self.state = JobState.COMPLETED
        self.current = None
        self.finished_at = datetime.now(timezone.utc)
        logger.info(
            f"[job:{self.name}] Completed — {self.completed}/{self.total} done, "
            f"{self.failed} failed, {self.skipped} skipped"
        )

    def reset(self):
        """Reset to idle (for starting a new run)."""
        self.state = JobState.IDLE
        self.total = 0
        self.completed = 0
        self.failed = 0
        self.skipped = 0
        self.current = None
        self.started_at = None
        self.finished_at = None
        self._pause_event.set()

    async def should_continue(self) -> bool:
        """
        Check before processing each item. Returns False if stopped.
        Blocks if paused (until resumed or stopped).
        """
        if self.state == JobState.STOPPED:
            return False

        # If paused, wait until resumed or stopped
        if self.state == JobState.PAUSED:
            await self._pause_event.wait()

        # After waking up, check if we were stopped while paused
        return self.state == JobState.RUNNING

    @property
    def is_active(self) -> bool:
        """True if running or paused (job exists and hasn't ended)."""
        return self.state in (JobState.RUNNING, JobState.PAUSED)

    def to_dict(self) -> dict:
        """Serialize state for API response."""
        return {
            "state": self.state.value,
            "total": self.total,
            "completed": self.completed,
            "failed": self.failed,
            "skipped": self.skipped,
            "current": self.current,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
        }


# ─── Global job instances ─────────────────────────────────────────────────────
# One controller per batch job type. Singleton pattern.

scrape_all_job = JobController("scrape-all")
analyze_all_job = JobController("analyze-all")
my_ads_scrape_job = JobController("my-ads-scrape")
my_ads_analyze_job = JobController("my-ads-analyze")

# Per-competitor jobs (keyed by competitor_id string)
_competitor_analyze_jobs: dict = {}
_competitor_scrape_jobs: dict = {}


def get_competitor_analyze_job(competitor_id: str) -> JobController:
    if competitor_id not in _competitor_analyze_jobs:
        _competitor_analyze_jobs[competitor_id] = JobController(f"analyze-{competitor_id[:8]}")
    return _competitor_analyze_jobs[competitor_id]


def get_competitor_scrape_job(competitor_id: str) -> JobController:
    if competitor_id not in _competitor_scrape_jobs:
        _competitor_scrape_jobs[competitor_id] = JobController(f"scrape-{competitor_id[:8]}")
    return _competitor_scrape_jobs[competitor_id]
