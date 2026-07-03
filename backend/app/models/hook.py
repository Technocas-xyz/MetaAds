from typing import Optional
from datetime import datetime
from sqlalchemy import String, Text, Integer, Float, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import TimestampedBase


class Hook(TimestampedBase):
    __tablename__ = "hooks"

    text: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    offer_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    mentions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    trending: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    first_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )