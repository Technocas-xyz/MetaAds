import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Text, Boolean, BigInteger, Numeric, Date, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class FacebookOwnedAd(Base):
    __tablename__ = "facebook_owned_ads"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meta_ad_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    account_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    campaign_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    campaign_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    campaign_objective: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    campaign_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    adset_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    adset_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    adset_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    ad_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    configured_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    effective_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)
    creative_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    creative_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    headline: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cta_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    destination: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    instagram_permalink_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    preview_shareable_link: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    effective_object_story_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    meta_created_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    meta_updated_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    first_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_active_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    raw_ad_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    raw_campaign_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    raw_adset_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    raw_creative_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class FacebookAdInsightsDaily(Base):
    __tablename__ = "facebook_ad_insights_daily"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meta_ad_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    date_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    date_stop: Mapped[date] = mapped_column(Date, nullable=False)
    impressions: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    reach: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    frequency: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), nullable=True)
    spend: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4), nullable=True)
    clicks: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    unique_clicks: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    inline_link_clicks: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    ctr: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 6), nullable=True)
    unique_ctr: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 6), nullable=True)
    inline_link_click_ctr: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 6), nullable=True)
    cpc: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4), nullable=True)
    cpm: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4), nullable=True)
    raw_insights_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class FacebookAdActionsDaily(Base):
    __tablename__ = "facebook_ad_actions_daily"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meta_ad_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    date_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    action_source: Mapped[str] = mapped_column(String(30), nullable=False, default="actions")
    action_type: Mapped[str] = mapped_column(String(200), nullable=False)
    value: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 4), nullable=True)
    raw_action_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class FacebookAdSyncRun(Base):
    __tablename__ = "facebook_ad_sync_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    sync_type: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="running", index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ads_received: Mapped[Optional[int]] = mapped_column(nullable=True)
    ads_inserted: Mapped[Optional[int]] = mapped_column(nullable=True)
    ads_updated: Mapped[Optional[int]] = mapped_column(nullable=True)
    insight_rows_inserted: Mapped[Optional[int]] = mapped_column(nullable=True)
    insight_rows_updated: Mapped[Optional[int]] = mapped_column(nullable=True)
    action_rows_inserted: Mapped[Optional[int]] = mapped_column(nullable=True)
    action_rows_updated: Mapped[Optional[int]] = mapped_column(nullable=True)
    pages_fetched: Mapped[Optional[int]] = mapped_column(nullable=True)
    sanitized_error: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    diagnostics: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
