from typing import Optional
from sqlalchemy import String, Text, Integer, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import TimestampedBase


class WorkspaceSettings(TimestampedBase):
    __tablename__ = "workspace_settings"

    workspace_name: Mapped[str] = mapped_column(
        String(255), default="AI Ads Supervisor", nullable=False
    )
    default_platform: Mapped[str] = mapped_column(String(20), default="Facebook", nullable=False)
    confidence_threshold: Mapped[int] = mapped_column(Integer, default=65, nullable=False)
    auto_analyze: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    review_on_low_conf: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notif_email: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notif_in_app: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notif_review_ready: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notif_analysis_done: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    default_daily_spend_rate: Mapped[float] = mapped_column(Float, default=20.0, nullable=False)
    fb_ads_api_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tiktok_ads_api_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    default_daily_spend_rate: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
