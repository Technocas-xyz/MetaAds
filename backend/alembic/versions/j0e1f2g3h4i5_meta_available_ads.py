"""Store Meta's current ad count per competitor and per scrape run

Merges the two open heads (ai_recommend history, facebook owned-ads tables).

Revision ID: j0e1f2g3h4i5
Revises: h8c9d0e1f2g3, i9d0e1f2g3h4
Create Date: 2026-10-06 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "j0e1f2g3h4i5"
down_revision: Union[str, Sequence[str], None] = ("h8c9d0e1f2g3", "i9d0e1f2g3h4")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("competitors", sa.Column("meta_available_ads", sa.Integer(), nullable=True))
    op.add_column("competitors", sa.Column("meta_available_checked_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("scrape_runs", sa.Column("meta_reported_total", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("scrape_runs", "meta_reported_total")
    op.drop_column("competitors", "meta_available_checked_at")
    op.drop_column("competitors", "meta_available_ads")
