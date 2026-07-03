"""add unique constraint on (competitor_id, ad_library_id)

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-20 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Unique index on (competitor_id, ad_library_id) WHERE ad_library_id IS NOT NULL
    # This prevents duplicate ads per competitor at the DB level
    op.create_index(
        'uq_ads_competitor_library_id',
        'ads',
        ['competitor_id', 'ad_library_id'],
        unique=True,
        postgresql_where="ad_library_id IS NOT NULL"
    )


def downgrade() -> None:
    op.drop_index('uq_ads_competitor_library_id', table_name='ads')
