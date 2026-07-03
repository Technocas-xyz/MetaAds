from typing import Optional
from sqlalchemy import String, Text, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import TimestampedBase


class Offer(TimestampedBase):
    __tablename__ = "offers"

    type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mentions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    trending: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)