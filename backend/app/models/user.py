from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import TimestampedBase


class User(TimestampedBase):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="analyst")
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_active_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    competitors_created = relationship(
        "Competitor", back_populates="creator", foreign_keys="Competitor.created_by"
    )
    briefs_created = relationship(
        "Brief", back_populates="creator", foreign_keys="Brief.created_by"
    )
    campaigns_created = relationship(
        "Campaign", back_populates="creator", foreign_keys="Campaign.created_by"
    )