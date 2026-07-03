import uuid
from datetime import datetime, time
from typing import Optional, List
from sqlalchemy import String, Text, Integer, Time, DateTime, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import TimestampedBase


class Competitor(TimestampedBase):
    __tablename__ = "competitors"

    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    domain: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority_tier: Mapped[str] = mapped_column(String(10), default="Medium", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="Active", nullable=False, index=True)
    niches: Mapped[List[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    region: Mapped[str] = mapped_column(String(50), default="Global", nullable=False)
    tier: Mapped[int] = mapped_column(Integer, default=2, nullable=False)

    # Scraping fields
    page_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    query: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    query_type: Mapped[str] = mapped_column(String(20), default="page_id", nullable=False)
    meta_ad_library_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    schedule_time: Mapped[time] = mapped_column(Time, default=time(3, 0), nullable=False)
    last_run: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    creator = relationship("User", back_populates="competitors_created", foreign_keys=[created_by])
    ads = relationship("Ad", back_populates="competitor", cascade="all, delete-orphan")
    scrape_runs = relationship("ScrapeRun", back_populates="competitor", cascade="all, delete-orphan")