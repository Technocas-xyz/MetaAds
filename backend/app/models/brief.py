import uuid
from typing import Optional, List
from sqlalchemy import String, Text, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import TimestampedBase


class Brief(TimestampedBase):
    __tablename__ = "briefs"

    title: Mapped[str] = mapped_column(Text, nullable=False)
    hook_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    angle: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    offer_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    platform: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    target_audience: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    key_messages: Mapped[List[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    suggested_copy: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    creator = relationship("User", back_populates="briefs_created", foreign_keys=[created_by])