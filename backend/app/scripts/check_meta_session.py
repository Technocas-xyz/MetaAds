"""
Live check of the stored Meta session: opens one Ad Library listing and reports
whether Facebook treats us as logged in and whether pagination loads past the
first page. Prints one JSON line.

Usage: python -m app.scripts.check_meta_session <page_id>
"""

import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.scripts.run_scraper import PaginationMonitor, build_url  # noqa: E402


def main(page_id: str) -> dict:
    from playwright.sync_api import sync_playwright

    state_path = os.getenv("META_STORAGE_STATE_PATH", "")
    result = {"logged_in": False, "first_page_cards": 0, "cards_after_scroll": 0,
              "rate_limited": False, "checkpoint": False, "reported_total": None}
    if not state_path or not Path(state_path).exists():
        result["error"] = "No session stored"
        return result

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage",
                                                            "--disable-blink-features=AutomationControlled"])
        context = browser.new_context(
            storage_state=state_path,
            viewport={"width": 1920, "height": 1080},
            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"),
            locale="en-US",
            timezone_id="America/New_York",
        )
        page = context.new_page()
        monitor = PaginationMonitor()
        page.on("response", monitor.on_response)
        try:
            page.goto(build_url({"page_id": page_id}), wait_until="domcontentloaded", timeout=60000)
        except Exception as e:
            result["error"] = f"Navigation failed: {str(e)[:120]}"
        time.sleep(6)

        url = page.url
        body = ""
        try:
            body = page.inner_text("body")
        except Exception:
            pass
        result["checkpoint"] = "checkpoint" in url or "/login" in url or "confirm your identity" in body.lower()
        # Facebook drops c_user as soon as it rejects the session.
        names = {c["name"] for c in context.cookies("https://www.facebook.com")}
        result["logged_in"] = "c_user" in names and not result["checkpoint"]

        import re
        m = re.search(r"~?\s*([\d,]+)\s*results?", body, re.IGNORECASE)
        if m:
            result["reported_total"] = int(m.group(1).replace(",", ""))

        result["first_page_cards"] = len(page.query_selector_all("div._7jyh"))
        for _ in range(6):
            page.mouse.move(960, 600)
            page.mouse.wheel(0, 4000)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(3)
        result["cards_after_scroll"] = len(page.query_selector_all("div._7jyh"))
        result["rate_limited"] = monitor.rate_limited > 0
        result["pagination_ok"] = monitor.ok
        context.close()
        browser.close()
    return result


if __name__ == "__main__":
    print(json.dumps(main(sys.argv[1] if len(sys.argv) > 1 else "")))
