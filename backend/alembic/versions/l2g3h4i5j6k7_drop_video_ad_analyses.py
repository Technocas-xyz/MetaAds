"""Drop AI analyses of video ads so they are re-analyzed with correct copy

Video ads were scraped while the browser lacked the H.264 codec, so Meta's
"having trouble playing this video" error landed in their hook/headline. Any AI
analysis produced from that text is wrong — it describes the error message, not
the ad. Migration k1f2g3h4i5j6 already cleaned the ad rows (is_video = TRUE,
screenshot_url cleared) so the next scrape re-captures the real creative.

This migration deletes the stale ad_analyses rows for those video ads. With no
ad_analyses row, each ad falls back into the pending queue and the now-automatic
batch analysis re-analyzes it from the corrected copy.

downgrade() is a no-op: the deleted analyses were based on the error message and
are not worth restoring.

Revision ID: l2g3h4i5j6k7
Revises: k1f2g3h4i5j6
Create Date: 2026-10-08 01:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "l2g3h4i5j6k7"
down_revision: Union[str, Sequence[str], None] = "k1f2g3h4i5j6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "DELETE FROM ad_analyses "
        "WHERE ad_id IN (SELECT id FROM ads WHERE is_video = TRUE)"
    )


def downgrade() -> None:
    # The deleted analyses were derived from Meta's player-error text, not real
    # ad copy, so there is nothing meaningful to restore.
    pass
