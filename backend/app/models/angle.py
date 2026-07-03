from typing import Optional
from sqlalchemy import String, Text, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import TimestampedBase


class Angle(TimestampedBase):
    __tablename__ = "angles"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    mentions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    trending: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)