import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import String, Text, Float, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import TimestampedBase


class AdAnalysis(TimestampedBase):
    __tablename__ = "ad_analyses"

    ad_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ads.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True,
    )
    hook_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    hook_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    angle: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    angle_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    offer_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    offer_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    creative_format: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    product_line: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    audience_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    usp_detected: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, index=True)
    hook_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    angle_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    offer_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    ai_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suggested_angle: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suggested_hook: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    analyzed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    ad = relationship("Ad", back_populates="analysis")