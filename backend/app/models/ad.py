import uuid
from typing import Optional
from datetime import datetime, date
from sqlalchemy import String, Text, Integer, Boolean, Date, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import TimestampedBase


class Ad(TimestampedBase):
    """
    Ad model — stores scraped ads from Meta Ad Library.

    Field mapping from old scraper:
      hook          -> hook (NEW)
      body_copy     -> primary_text (existing, reused)
      cta_text      -> cta (existing, reused)
      landing_url   -> landing_url (existing)
      ad_creative_url -> media_url (existing, reused)
      screenshot_url -> screenshot_url (NEW)
      active_since  -> active_since (NEW date field); also sets first_seen
      days_running  -> days_running (NEW)
      is_video      -> is_video (existing)
      ad_video_url  -> ad_video_url (NEW)
      video_poster_url -> video_poster_url (NEW)
      has_multiple_versions -> has_multiple_versions (NEW)
      domain        -> domain (NEW)
      advertiser_name -> advertiser_name (NEW)
      library_id    -> ad_library_id (existing, dedup key)
    """
    __tablename__ = "ads"

    competitor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competitors.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    platform: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    # Text fields
    headline: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hook: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # = body_copy
    cta: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # = cta_text
    advertiser_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # URLs
    ad_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    landing_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    media_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # = ad_creative_url
    screenshot_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ad_video_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    video_poster_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Media flags
    is_video: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_multiple_versions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Identification
    ad_library_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, index=True)

    # Timing
    active_since: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    days_running: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    first_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    removed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Misc
    variants: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    embedding_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    competitor = relationship("Competitor", back_populates="ads")
    analysis = relationship(
        "AdAnalysis", back_populates="ad", uselist=False, cascade="all, delete-orphan"
    )
    review_items = relationship(
        "ReviewQueue", back_populates="ad", cascade="all, delete-orphan"
    )