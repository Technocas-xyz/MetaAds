"""Repair ads mangled by the video-player codec error

The scraper used to run Playwright's bundled Chromium, which lacks the H.264
codec. Meta replaced each video ad's player with "Sorry, we're having trouble
with playing this video", and the scraper stored that message as the ad's
hook/headline (and sometimes primary_text), left is_video false, and took a
screenshot of the grey error box.

This migration repairs those rows so the next scrape (now using Google Chrome)
re-captures the real creative:
  - is_video        -> TRUE
  - screenshot_url  -> NULL (force re-capture)
  - primary_text    -> NULL only when it *is* the error message
  - hook / headline -> first line of the cleaned primary_text (<=200 chars), else NULL

Uses position(... in lower(...)) instead of LIKE so there are no % wildcards in
the SQL. downgrade() is intentionally a no-op (the mangled text is unrecoverable).

Revision ID: k1f2g3h4i5j6
Revises: j0e1f2g3h4i5
Create Date: 2026-10-08 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "k1f2g3h4i5j6"
down_revision: Union[str, Sequence[str], None] = "j0e1f2g3h4i5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PHRASE = "having trouble with playing this video"


def upgrade() -> None:
    # Match rows where the phrase appears in hook, headline, or primary_text.
    # position(needle in haystack) > 0 is the LIKE-free way to test containment.
    affected = (
        f"position('{PHRASE}' in lower(coalesce(hook, ''))) > 0 "
        f"OR position('{PHRASE}' in lower(coalesce(headline, ''))) > 0 "
        f"OR position('{PHRASE}' in lower(coalesce(primary_text, ''))) > 0"
    )

    # "cleaned" primary_text: NULL when primary_text is itself the error message,
    # otherwise the stored value. hook/headline are rebuilt from this.
    cleaned_primary = (
        "CASE WHEN position('" + PHRASE + "' in lower(coalesce(primary_text, ''))) > 0 "
        "THEN NULL ELSE primary_text END"
    )
    # First line of the cleaned primary_text, trimmed and capped at 200 chars;
    # NULL when nothing usable remains. split_part(..., chr(10), 1) takes the
    # text before the first newline.
    first_line = f"nullif(trim(left(split_part({cleaned_primary}, chr(10), 1), 200)), '')"

    # 1. Mark as video and drop the error-box screenshot so it is re-captured.
    op.execute(
        f"UPDATE ads SET is_video = TRUE, screenshot_url = NULL WHERE {affected}"
    )

    # 2. Rebuild hook/headline from the cleaned primary_text. Done before nulling
    #    primary_text (step 3) so the expression still sees the original value and
    #    every affected row — including ones matched only via primary_text — is covered.
    op.execute(
        f"UPDATE ads SET hook = {first_line}, headline = {first_line} WHERE {affected}"
    )

    # 3. Clear primary_text when it is itself the error message.
    op.execute(
        "UPDATE ads SET primary_text = NULL "
        f"WHERE position('{PHRASE}' in lower(coalesce(primary_text, ''))) > 0"
    )


def downgrade() -> None:
    # The original hook/headline text was Meta's error message, not real ad copy,
    # so there is nothing meaningful to restore.
    pass
