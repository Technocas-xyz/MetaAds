"""
Scraper schemas — for the competitor scraping feature.
"""

from datetime import datetime, time
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


# ---------- ScrapeRun response ----------

class ScrapeRunResponse(BaseModel):
    id: UUID
    competitor_id: UUID
    run_at: datetime
    ads_found: int
    new_ads: int
    ended_ads: int
    status: str
    error_message: Optional[str] = None
    duration_seconds: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Competitor scraper views ----------

class ScraperCompetitorResponse(BaseModel):
    """Competitor shape for the scraper list view — includes scraping metadata."""
    id: UUID
    name: str
    page_id: Optional[str] = None
    query: Optional[str] = None
    query_type: str
    meta_ad_library_url: Optional[str] = None
    schedule_time: time = Field(default=time(3, 0))
    last_run: Optional[datetime] = None
    logo_url: Optional[str] = None
    status: str

    # Computed stats
    total_active_ads: int = 0
    new_7d: int = 0
    long_running_3mo: int = 0

    model_config = ConfigDict(from_attributes=True)


class ScraperCompetitorDetailResponse(BaseModel):
    """Detailed competitor with scraping stats and history."""
    id: UUID
    name: str
    page_id: Optional[str] = None
    query: Optional[str] = None
    query_type: str
    meta_ad_library_url: Optional[str] = None
    schedule_time: time = Field(default=time(3, 0))
    last_run: Optional[datetime] = None
    logo_url: Optional[str] = None
    status: str

    # Stats
    total_ads: int = 0
    new_7d: int = 0
    long_running_3mo: int = 0
    oldest_ad_days: int = 0
    avg_duration_days: float = 0.0

    # Recent runs
    recent_runs: List[ScrapeRunResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# ---------- Scraped ad response ----------

class ScrapedAdResponse(BaseModel):
    """Ad shape for the competitor detail view — Meta Ad Library style."""
    id: UUID
    ad_library_id: Optional[str] = None
    competitor_id: UUID
    headline: Optional[str] = None
    hook: Optional[str] = None
    primary_text: Optional[str] = None
    media_url: Optional[str] = None
    screenshot_url: Optional[str] = None
    ad_video_url: Optional[str] = None
    video_poster_url: Optional[str] = None
    is_video: bool = False
    has_multiple_versions: bool = False
    platform: str
    ad_url: Optional[str] = None
    landing_url: Optional[str] = None
    cta: Optional[str] = None
    advertiser_name: Optional[str] = None
    domain: Optional[str] = None
    status: str
    first_seen: datetime
    last_seen: datetime
    start_date: Optional[str] = None  # Formatted as "May 29, 2026"
    days_running: int = 0
    is_active: bool = True
    variants: int = 1

    # AI Analysis (if available)
    hook_type: Optional[str] = None
    angle: Optional[str] = None
    offer: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ScrapedAdsListResponse(BaseModel):
    """Paginated scraped ads list."""
    data: List[ScrapedAdResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ---------- Trigger scrape request ----------

class TriggerScrapeRequest(BaseModel):
    """Optional params when manually triggering a scrape."""
    pass  # No params needed for now — competitor_id comes from URL path
