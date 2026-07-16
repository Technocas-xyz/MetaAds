"""add daily_spend_rate to workspace_settings and competitors

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-07-16 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Global default rate on workspace_settings
    op.add_column(
        'workspace_settings',
        sa.Column('default_daily_spend_rate', sa.Float(), nullable=False, server_default='20.0')
    )
    # Per-competitor optional override
    op.add_column(
        'competitors',
        sa.Column('daily_spend_rate', sa.Float(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('competitors', 'daily_spend_rate')
    op.drop_column('workspace_settings', 'default_daily_spend_rate')
