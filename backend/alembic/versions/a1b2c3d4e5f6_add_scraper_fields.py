"""add scraper fields to competitor + scrape_runs table

Revision ID: a1b2c3d4e5f6
Revises: c0a9644e189c
Create Date: 2026-06-17 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'c0a9644e189c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add scraping columns to competitors
    op.add_column('competitors', sa.Column('page_id', sa.String(length=100), nullable=True))
    op.add_column('competitors', sa.Column('query', sa.String(length=255), nullable=True))
    op.add_column('competitors', sa.Column('query_type', sa.String(length=20), nullable=False, server_default='page_id'))
    op.add_column('competitors', sa.Column('meta_ad_library_url', sa.Text(), nullable=True))
    op.add_column('competitors', sa.Column('schedule_time', sa.Time(), nullable=False, server_default='03:00:00'))
    op.add_column('competitors', sa.Column('last_run', sa.DateTime(timezone=True), nullable=True))

    # Make name unique
    op.create_unique_constraint('uq_competitors_name', 'competitors', ['name'])

    # Create scrape_runs table
    op.create_table('scrape_runs',
        sa.Column('competitor_id', sa.UUID(), nullable=False),
        sa.Column('run_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('ads_found', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('new_ads', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('ended_ads', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='running'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['competitor_id'], ['competitors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_scrape_runs_competitor_id', 'scrape_runs', ['competitor_id'])

    # Add unique index on ad_library_id for deduplication
    op.create_index('ix_ads_ad_library_id', 'ads', ['ad_library_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_ads_ad_library_id', table_name='ads')
    op.drop_index('ix_scrape_runs_competitor_id', table_name='scrape_runs')
    op.drop_table('scrape_runs')
    op.drop_constraint('uq_competitors_name', 'competitors', type_='unique')
    op.drop_column('competitors', 'last_run')
    op.drop_column('competitors', 'schedule_time')
    op.drop_column('competitors', 'meta_ad_library_url')
    op.drop_column('competitors', 'query_type')
    op.drop_column('competitors', 'query')
    op.drop_column('competitors', 'page_id')
