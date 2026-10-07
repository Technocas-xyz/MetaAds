"""
Refresh every competitor's "Meta Available Ads" count without a full scrape.

Opens each competitor's Ad Library listing once and stores Meta's "~N results"
figure. Normal scrapes keep it current; this is for filling it in on demand
(e.g. right after the column was added).

Usage: python -m app.scripts.refresh_meta_available
"""

import asyncio
import random
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import select  # noqa: E402

from app.database import AsyncSessionLocal  # noqa: E402
from app.models.competitor import Competitor  # noqa: E402
from app.scripts.run_scraper import browser_proxy, build_url  # noqa: E402

COUNT_RE = re.compile(r"~?\s*([\d,]+)\s*results?", re.IGNORECASE)


def read_counts(targets):
    """targets: list of (id, page_id, query) → {id: count or None}."""
    from playwright.sync_api import sync_playwright

    counts = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, proxy=browser_proxy(), args=[
            "--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled",
        ])
        page = browser.new_context(viewport={"width": 1920, "height": 1080}, locale="en-US").new_page()
        for cid, page_id, query in targets:
            try:
                page.goto(build_url({"page_id": page_id, "query": query}), wait_until="domcontentloaded", timeout=60000)
                time.sleep(5)
                body = page.inner_text("body")
                m = COUNT_RE.search(body)
                if m:
                    counts[cid] = int(m.group(1).replace(",", ""))
                elif "No ads match" in body:
                    counts[cid] = 0
                else:
                    counts[cid] = None
            except Exception:
                counts[cid] = None
            print(f"{query or page_id}: {counts[cid]}", flush=True)
            time.sleep(random.uniform(2, 4))
        browser.close()
    return counts


async def main():
    async with AsyncSessionLocal() as db:
        comps = (await db.execute(
            select(Competitor).where(Competitor.is_own_brand == False)  # noqa: E712
        )).scalars().all()
        targets = [(c.id, c.page_id, c.query) for c in comps]

    counts = await asyncio.to_thread(read_counts, targets)

    # Zero can also mean a soft block; only trust it when other listings returned ads.
    any_positive = any((v or 0) > 0 for v in counts.values())
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        for c in (await db.execute(select(Competitor).where(Competitor.id.in_(list(counts))))).scalars():
            value = counts[c.id]
            if value is None or (value == 0 and not any_positive):
                continue
            c.meta_available_ads = value
            c.meta_available_checked_at = now
        await db.commit()


if __name__ == "__main__":
    asyncio.run(main())
