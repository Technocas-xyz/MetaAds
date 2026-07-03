import uuid
from typing import Optional
from decimal import Decimal
from sqlalchemy import String, Text, Integer, BigInteger, Float, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import TimestampedBase


class Campaign(TimestampedBase):
    __tablename__ = "campaigns"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False, index=True)
    objective: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    budget: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    spend: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    impressions: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    clicks: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    conversions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    roas: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    brief_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("briefs.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    creator = relationship("User", back_populates="campaigns_created", foreign_keys=[created_by])
    brief = relationship("Brief", foreign_keys=[brief_id])