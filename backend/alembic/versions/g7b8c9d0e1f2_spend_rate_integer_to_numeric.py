"""spend rate columns: Integer to Numeric(10,2)

Preserves existing integer values (20 → 20.00).
Enables decimal rates like 20.50 or 7.25.

Revision ID: g7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-07-17 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g7b8c9d0e1f2"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Alter competitors.daily_spend_rate: Integer → Numeric(10,2)
    # Explicit USING cast preserves existing values: 20 → 20.00
    op.execute(
        "ALTER TABLE competitors "
        "ALTER COLUMN daily_spend_rate TYPE NUMERIC(10,2) "
        "USING daily_spend_rate::numeric(10,2)"
    )

    # Alter workspace_settings.default_daily_spend_rate: Integer → Numeric(10,2)
    # Preserves existing values and server default
    op.execute(
        "ALTER TABLE workspace_settings "
        "ALTER COLUMN default_daily_spend_rate TYPE NUMERIC(10,2) "
        "USING default_daily_spend_rate::numeric(10,2)"
    )
    op.execute(
        "ALTER TABLE workspace_settings "
        "ALTER COLUMN default_daily_spend_rate SET DEFAULT 20.00"
    )


def downgrade() -> None:
    # Numeric(10,2) → Integer
    # WARNING: decimal values will lose their fractional portion (20.50 → 20)
    op.execute(
        "ALTER TABLE competitors "
        "ALTER COLUMN daily_spend_rate TYPE INTEGER "
        "USING daily_spend_rate::integer"
    )
    op.execute(
        "ALTER TABLE workspace_settings "
        "ALTER COLUMN default_daily_spend_rate TYPE INTEGER "
        "USING default_daily_spend_rate::integer"
    )
    op.execute(
        "ALTER TABLE workspace_settings "
        "ALTER COLUMN default_daily_spend_rate SET DEFAULT 20"
    )
