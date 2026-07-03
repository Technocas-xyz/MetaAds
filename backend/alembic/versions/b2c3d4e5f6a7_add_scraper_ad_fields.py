"""add scraper ad fields (screenshot, hook, video, domain, etc)

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-19 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # New columns on ads table
    op.add_column('ads', sa.Column('hook', sa.Text(), nullable=True))
    op.add_column('ads', sa.Column('advertiser_name', sa.String(length=255), nullable=True))
    op.add_column('ads', sa.Column('domain', sa.String(length=255), nullable=True))
    op.add_column('ads', sa.Column('screenshot_url', sa.Text(), nullable=True))
    op.add_column('ads', sa.Column('ad_video_url', sa.Text(), nullable=True))
    op.add_column('ads', sa.Column('video_poster_url', sa.Text(), nullable=True))
    op.add_column('ads', sa.Column('has_multiple_versions', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('ads', sa.Column('active_since', sa.Date(), nullable=True))
    op.add_column('ads', sa.Column('days_running', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('ads', 'days_running')
    op.drop_column('ads', 'active_since')
    op.drop_column('ads', 'has_multiple_versions')
    op.drop_column('ads', 'video_poster_url')
    op.drop_column('ads', 'ad_video_url')
    op.drop_column('ads', 'screenshot_url')
    op.drop_column('ads', 'domain')
    op.drop_column('ads', 'advertiser_name')
    op.drop_column('ads', 'hook')
