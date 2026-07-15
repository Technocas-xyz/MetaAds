"""
Backfill script — downloads ad creative images from Meta CDN and stores them in MinIO.

For ads that have a live media_url but no screenshot_url (or screenshot_url points
to a Meta CDN URL that will expire), this downloads and stores in our own storage.

Run with:
  python -m app.scripts.backfill_minio [--limit 100] [--dry-run]

Ads whose Meta URL has already expired (403) will be skipped — they'll get
a stored image on the next successful re-scrape.
"""

import asyncio
import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import select, or_
from app.database import AsyncSessionLocal
from app.models.ad import Ad
from app.models.competitor import Competitor
from app.core.storage.s3_writer import download_and_store_image

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)


async def backfill(limit: int = 0, dry_run: bool = False):
    """
    Iterate ads that have a media_url (Meta CDN) but no MinIO screenshot_url,
    download the image, store in MinIO, and update screenshot_url.
    """
    async with AsyncSessionLocal() as db:
        # Find ads needing backfill:
        # - Has media_url containing 'scontent' or 'fbcdn' (Meta CDN)
        # - Either no screenshot_url, or screenshot_url also points to Meta CDN
        stmt = (
            select(Ad, Competitor.name)
            .join(Competitor, Ad.competitor_id == Competitor.id)
            .where(
                Ad.media_url.isnot(None),
                or_(
                    Ad.screenshot_url.is_(None),
                    Ad.screenshot_url == "",
                    Ad.screenshot_url.contains("scontent"),
                    Ad.screenshot_url.contains("fbcdn"),
                ),
            )
            .order_by(Ad.days_running.desc())  # Prioritize long-running (proven) ads
        )

        if limit > 0:
            stmt = stmt.limit(limit)

        rows = (await db.execute(stmt)).all()
        total = len(rows)
        logger.info(f"[backfill] Found {total} ads to backfill")

        if dry_run:
            logger.info("[backfill] DRY RUN — no changes will be made")
            for ad, comp_name in rows[:10]:
                logger.info(f"  Would process: {comp_name} / {ad.ad_library_id} ({ad.days_running}d)")
            return

        success = 0
        failed = 0
        skipped = 0

        for i, (ad, comp_name) in enumerate(rows):
            # Pick the best source URL
            source_url = ad.media_url
            if not source_url or ("scontent" not in source_url and "fbcdn" not in source_url):
                source_url = ad.video_poster_url
            if not source_url:
                skipped += 1
                continue

            # Build storage key
            brand_slug = (comp_name or "unknown").lower().replace(" ", "_")[:30]
            ad_id = ad.ad_library_id or str(ad.id)[:16]
            ext = "jpg"
            if ".png" in source_url:
                ext = "png"
            elif ".webp" in source_url:
                ext = "webp"
            key = f"ad-creatives/{brand_slug}/{ad_id}.{ext}"

            # Download and store
            stored_url = await download_and_store_image(source_url, key)

            if stored_url:
                ad.screenshot_url = stored_url
                success += 1
                if (i + 1) % 20 == 0:
                    logger.info(f"[backfill] Progress: {i+1}/{total} (success={success}, failed={failed})")
                    await db.commit()
            else:
                failed += 1

        await db.commit()
        logger.info(
            f"[backfill] Done: {success} stored, {failed} failed (expired?), {skipped} skipped. "
            f"Total processed: {total}"
        )


def main():
    parser = argparse.ArgumentParser(description="Backfill ad images to MinIO")
    parser.add_argument("--limit", type=int, default=0, help="Max ads to process (0 = all)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without changes")
    args = parser.parse_args()

    asyncio.run(backfill(limit=args.limit, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
