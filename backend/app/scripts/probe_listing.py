"""
Quick check whether Meta is serving Ad Library listings to this server right now.

Loads one advertiser listing that is known to have active ads and prints the
number of ad cards. 0 means Meta is soft-blocking us; anything else means an
empty listing elsewhere is real.

Usage: python -m app.scripts.probe_listing <page_id>
"""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.scripts.run_scraper import browser_proxy, build_url  # noqa: E402


def main(page_id: str) -> int:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, proxy=browser_proxy(), args=[
            "--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled",
        ])
        page = browser.new_context(viewport={"width": 1920, "height": 1080}, locale="en-US").new_page()
        try:
            page.goto(build_url({"page_id": page_id}), wait_until="domcontentloaded", timeout=60000)
            time.sleep(6)
            cards = len(page.query_selector_all("div._7jyh"))
        except Exception:
            cards = 0
        browser.close()
    return cards


if __name__ == "__main__":
    print(main(sys.argv[1]))
