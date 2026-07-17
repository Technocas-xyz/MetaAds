"""
Standalone Playwright scraper — runs as a subprocess.

Usage: python -m app.scripts.run_scraper <input.json> <output.json>

Input JSON: {"competitor": {"name", "page_id", "query", "query_type"}, "existing_ids": [...]}
Output JSON: list of ad dicts
"""

import json
import logging
import re
import sys
import time
import urllib.parse
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

AD_LIBRARY_BASE = "https://www.facebook.com/ads/library/"

KNOWN_CTA_LABELS = {
    "Learn More", "Shop Now", "Sign Up", "Get Offer", "Download",
    "Apply Now", "Book Now", "Contact Us", "Send Message", "Subscribe",
    "Get Quote", "Order Now", "See Menu", "Watch More", "Listen Now",
    "Learn more", "Shop now", "Sign up",
}

NON_AD_TEXT = KNOWN_CTA_LABELS | {
    "Sponsored", "Active", "Inactive", "Ad", "See more", "See less",
    "See ad details", "About this ad", "Why am I seeing this ad?",
}

MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    "january": 1, "february": 2, "march": 3, "april": 4,
    "june": 6, "july": 7, "august": 8, "september": 9,
    "october": 10, "november": 11, "december": 12,
}

# Date formats Meta uses (US format is most common)
DATE_FORMATS = [
    "%b %d, %Y",   # "Jun 18, 2026" (most common US)
    "%B %d, %Y",   # "June 18, 2026"
    "%d %b %Y",    # "18 Jun 2026" (day-first)
    "%d %B %Y",    # "18 June 2026"
    "%Y-%m-%d",    # "2026-06-18" (ISO)
]


def parse_started_date(text: str) -> Optional[datetime]:
    """
    Parse date from "Started running on <date>" text.
    Handles multiple formats: "Jun 18, 2026", "18 Jun 2026", "June 18, 2026", etc.
    """
    # Extract the date portion after "Started running on"
    match = re.search(r"Started running on\s+(.+?)(?:\n|$)", text, re.IGNORECASE)
    if not match:
        return None

    date_str = match.group(1).strip().rstrip(".")

    # Try each format
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue

    # Fallback: try MONTH_MAP approach for "18 Jun 2026" or "Jun 18, 2026" with comma
    # Pattern: day month year or month day, year
    m = re.match(r"(\d{1,2})\s+(\w+)\s+(\d{4})", date_str)
    if m:
        day, month_s, year = int(m.group(1)), m.group(2).lower(), int(m.group(3))
        month_num = MONTH_MAP.get(month_s)
        if month_num:
            try:
                return datetime(year, month_num, day)
            except ValueError:
                pass

    m = re.match(r"(\w+)\s+(\d{1,2}),?\s+(\d{4})", date_str)
    if m:
        month_s, day, year = m.group(1).lower(), int(m.group(2)), int(m.group(3))
        month_num = MONTH_MAP.get(month_s)
        if month_num:
            try:
                return datetime(year, month_num, day)
            except ValueError:
                pass

    logger.debug(f"  Could not parse date: '{date_str}'")
    return None


def extract_library_id(card, full_text: str) -> Optional[str]:
    """
    Extract Meta's real numeric Library ID from ad card.
    Searches card text AND parent levels.
    """
    # Strategy 1: Search card's own text
    match = re.search(r"Library\s+ID[:\s]*(\d{10,20})", full_text, re.IGNORECASE)
    if match:
        return match.group(1)

    # Strategy 2: Walk up parent elements (Library ID is often outside the card div)
    for level in range(1, 5):
        try:
            parent_text = card.evaluate(
                f"el => {{ let p = el; for(let i=0; i<{level}; i++) {{ p = p?.parentElement; }} return p?.innerText || ''; }}"
            )
            match = re.search(r"Library\s+ID[:\s]*(\d{10,20})", parent_text, re.IGNORECASE)
            if match:
                return match.group(1)
        except Exception:
            continue

    # Strategy 3: data-ad-archive-id attribute
    try:
        attr = card.get_attribute("data-ad-archive-id")
        if attr and attr.isdigit() and len(attr) >= 10:
            return attr
        nested = card.query_selector("[data-ad-archive-id]")
        if nested:
            attr = nested.get_attribute("data-ad-archive-id")
            if attr and attr.isdigit() and len(attr) >= 10:
                return attr
    except Exception:
        pass

    # Strategy 4: Links with id= parameter
    try:
        links = card.query_selector_all("a[href]")
        for link in links:
            href = link.get_attribute("href") or ""
            m = re.search(r"[?&]id=(\d{10,20})", href)
            if m:
                return m.group(1)
    except Exception:
        pass

    # Strategy 5: Search ALL descendant text nodes
    try:
        all_els = card.query_selector_all("span, div, p")
        for el in all_els:
            t = (el.text_content() or "")[:200]
            if "library id" in t.lower():
                m = re.search(r"(\d{10,20})", t)
                if m:
                    return m.group(1)
    except Exception:
        pass

    return None


def extract_date_from_card(card, full_text: str) -> Optional[datetime]:
    """
    Extract "Started running on <date>" from card text and parent levels.
    """
    # Try card's own text first
    dt = parse_started_date(full_text)
    if dt:
        return dt

    # Walk up parent levels (date often outside the card div)
    for level in range(1, 5):
        try:
            parent_text = card.evaluate(
                f"el => {{ let p = el; for(let i=0; i<{level}; i++) {{ p = p?.parentElement; }} return p?.innerText || ''; }}"
            )
            dt = parse_started_date(parent_text)
            if dt:
                return dt
        except Exception:
            continue

    return None


def extract_creative_image(card) -> Optional[str]:
    """
    Extract the REAL ad creative image, not the profile pic/logo.
    Works on a standard ElementHandle.
    """
    return extract_creative_image_from_element(card)


def extract_creative_image_from_element(element) -> Optional[str]:
    """
    Extract the REAL ad creative image from an element (card or wide parent).
    Skips small square images (logos/avatars).
    Prefers video poster for video ads.
    """
    try:
        # First check for video poster (best creative for video ads)
        try:
            videos = element.query_selector_all("video")
            for video in videos:
                poster = video.get_attribute("poster")
                if poster and ("scontent" in poster or "fbcdn" in poster):
                    return poster
        except Exception:
            pass

        imgs = element.query_selector_all("img")
        candidates = []

        for img in imgs:
            src = img.get_attribute("src") or ""
            if not src:
                continue
            # Only consider Facebook CDN images
            if "scontent" not in src and "fbcdn" not in src:
                continue

            # Get dimensions
            try:
                dims = img.evaluate("""el => ({
                    w: el.naturalWidth || el.width || el.clientWidth || 0,
                    h: el.naturalHeight || el.height || el.clientHeight || 0
                })""")
                w = dims.get("w", 0)
                h = dims.get("h", 0)
            except Exception:
                w, h = 0, 0

            # Skip very small images (profile pics are typically 40-60px)
            if w > 0 and w <= 80 and h > 0 and h <= 80:
                continue

            # Skip small square images (profile pics are square)
            if w > 0 and h > 0 and w == h and w < 150:
                continue

            # Score: prefer larger images, prefer non-square (rectangular = ad creative)
            area = max(w * h, 1)
            aspect_ratio = max(w, h) / max(min(w, h), 1)
            # Bonus for rectangular images (ads are rarely square)
            score = area * (1.5 if aspect_ratio > 1.2 else 1.0)

            candidates.append((score, src))

        if candidates:
            # Return the highest-scored image
            candidates.sort(key=lambda x: x[0], reverse=True)
            return candidates[0][1]

        # Fallback: last large-ish scontent/fbcdn image
        for img in reversed(imgs):
            src = img.get_attribute("src") or ""
            if "scontent" in src or "fbcdn" in src:
                # Quick size check
                try:
                    w = img.evaluate("el => el.naturalWidth || el.width || 0")
                    if w and w > 80:
                        return src
                except Exception:
                    return src  # Can't measure, take it anyway

    except Exception:
        pass

    return None


def _extract_media_only(card, wide_card) -> dict:
    """Quick extraction of just media URLs from a card (for refreshing existing ads)."""
    result = {
        "ad_creative_url": None,
        "video_poster_url": None,
        "ad_video_url": None,
        "is_video": False,
    }
    # Video poster (priority)
    try:
        video = card.query_selector("video")
        if video:
            result["is_video"] = True
            result["ad_video_url"] = video.get_attribute("src") or ""
            poster = video.get_attribute("poster")
            if poster and ("scontent" in poster or "fbcdn" in poster):
                result["video_poster_url"] = poster
                result["ad_creative_url"] = poster
    except Exception:
        pass

    # If no video in card, check wide_card
    if not result["ad_creative_url"]:
        try:
            video = wide_card.query_selector("video")
            if video:
                result["is_video"] = True
                result["ad_video_url"] = video.get_attribute("src") or ""
                poster = video.get_attribute("poster")
                if poster and ("scontent" in poster or "fbcdn" in poster):
                    result["video_poster_url"] = poster
                    result["ad_creative_url"] = poster
        except Exception:
            pass

    # Large image (skip logo)
    if not result["ad_creative_url"]:
        try:
            imgs = card.query_selector_all("img")
            for img in imgs:
                src = img.get_attribute("src") or ""
                if not src or ("scontent" not in src and "fbcdn" not in src):
                    continue
                try:
                    w = img.evaluate("el => el.naturalWidth || el.width || 0")
                    h = img.evaluate("el => el.naturalHeight || el.height || 0")
                except Exception:
                    w, h = 0, 0
                if w > 80 or h > 80:
                    result["ad_creative_url"] = src
                    break
        except Exception:
            pass

    return result


def build_url(comp: dict) -> str:
    if comp.get("page_id"):
        params = {
            "active_status": "active",
            "ad_type": "all",
            "country": "US",
            "is_targeted_country": "false",
            "media_type": "all",
            "search_type": "page",
            "sort_data[mode]": "total_impressions",
            "sort_data[direction]": "desc",
            "view_all_page_id": comp["page_id"],
        }
    else:
        params = {
            "country": "US",
            "q": comp.get("query") or comp.get("name"),
            "active_status": "active",
            "ad_type": "all",
        }
    return f"{AD_LIBRARY_BASE}?{urllib.parse.urlencode(params)}"


def run_scrape(comp: dict, existing_ids: Set[str], output_file: str = None, time_budget: int = 1100) -> List[Dict[str, Any]]:
    """
    Main scrape function. time_budget is max seconds to spend (default 1100s = ~18min).
    If output_file is provided, writes partial results there periodically.
    """
    import os
    from playwright.sync_api import sync_playwright

    url = build_url(comp)
    brand = comp.get("query") or comp.get("name", "unknown")
    results = []
    scrape_start = time.time()

    # ── Session persistence ───────────────────────────────────────────────
    # Load saved anonymous session (consent cookies, locale prefs) if available.
    # This avoids starting fresh every time, which causes Meta to throttle/limit results.
    storage_state_path = os.getenv("META_STORAGE_STATE_PATH", "")
    storage_state = None
    loaded_session = False

    if storage_state_path:
        state_file = Path(storage_state_path)
        if state_file.exists():
            try:
                with open(state_file, 'r', encoding='utf-8') as f:
                    storage_state = json.load(f)
                # Validate it's a proper storage state (has cookies key)
                if isinstance(storage_state, dict) and "cookies" in storage_state:
                    loaded_session = True
                    logger.info(f"Loaded session state ({len(storage_state.get('cookies', []))} cookies)")
                else:
                    logger.warning("Session state file invalid (no cookies key), starting fresh")
                    storage_state = None
            except (json.JSONDecodeError, OSError) as e:
                logger.warning(f"Could not load session state ({e}), starting fresh")
                storage_state = None

    logger.info(f"Navigating to: {url}")
    logger.info(f"Session: {'loaded from file' if loaded_session else 'fresh anonymous'}")

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        )

        context_kwargs = {
            "viewport": {"width": 1920, "height": 1080},
            "user_agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/126.0.0.0 Safari/537.36"
            ),
            "locale": "en-US",
            "timezone_id": "America/New_York",
        }
        if storage_state:
            context_kwargs["storage_state"] = storage_state

        context = browser.new_context(**context_kwargs)
        page = context.new_page()

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
        except Exception as e:
            logger.warning(f"Navigation timeout (continuing): {e}")

        time.sleep(5)

        # ── Dismiss consent/cookie popups (more robust) ───────────────────
        consent_dismissed = False
        consent_selectors = [
            "button:has-text('Allow all cookies')",
            "button:has-text('Allow All Cookies')",
            "button:has-text('Accept All')",
            "button:has-text('Accept all')",
            "button:has-text('Decline optional cookies')",
            "button:has-text('Only allow essential cookies')",
            "[data-cookiebanner='accept_button']",
            "[data-testid='cookie-policy-manage-dialog-accept-button']",
            "[aria-label='Close']",
        ]
        for sel in consent_selectors:
            try:
                btn = page.query_selector(sel)
                if btn and btn.is_visible():
                    btn.click()
                    consent_dismissed = True
                    logger.info(f"Dismissed consent/popup: {sel}")
                    time.sleep(2)
                    break
            except Exception:
                continue

        # Check for challenge/login/error pages
        page_content = ""
        try:
            page_content = page.inner_text("body")[:500].lower()
        except Exception:
            pass

        is_blocked = any(x in page_content for x in [
            "you must log in", "please log in", "checkpoint",
            "confirm your identity", "something went wrong",
        ])
        if is_blocked:
            logger.warning("Meta is showing a login/checkpoint/error page — session may be blocked")

        # ── Read reported total from page ─────────────────────────────────
        reported_total = 0
        try:
            body_text = page.inner_text("body")
            for pat in [r"~?\s*([\d,]+)\s*results?", r"([\d,]+)\s*ads?\b", r"About\s*([\d,]+)"]:
                m = re.search(pat, body_text, re.IGNORECASE)
                if m:
                    reported_total = int(m.group(1).replace(",", ""))
                    break
        except Exception:
            pass
        logger.info(f"Reported total on page: {reported_total}")

        # ── Scroll to load ALL ads ───────────────────────────────────────
        def do_scroll_loop(max_scrolls, max_stable):
            """Scroll until cards stop loading or we hit the target or time runs out."""
            prev_count = 0
            stable = 0
            for i in range(max_scrolls):
                # Time budget check — leave time for card processing
                elapsed = time.time() - scrape_start
                cards_so_far = len(page.query_selector_all("div._7jyh"))
                time_for_processing = min(cards_so_far * 0.8, 300)
                if elapsed > time_budget - time_for_processing - 60:
                    logger.info(f"  Time budget running low ({elapsed:.0f}s elapsed, {cards_so_far} cards). Stopping scroll.")
                    break

                cards_a = page.query_selector_all("div._7jyh")
                cards_b = page.query_selector_all("div[role='article']")
                cards_c = page.query_selector_all("a[href*='/ads/library/?id=']")
                current = max(len(cards_a), len(cards_b), len(cards_c))

                if (i + 1) % 10 == 0:
                    logger.info(f"  Scroll {i+1}: {current} cards (target: {reported_total})")

                # If we've reached the reported total, stop
                if reported_total > 0 and current >= reported_total:
                    logger.info(f"  Reached reported total ({reported_total}) at scroll {i+1}")
                    break

                if current == prev_count:
                    stable += 1
                    # Only stop on stable if we're close to target OR truly stuck
                    # For large pages (target > current * 1.3), keep trying longer
                    effective_max_stable = max_stable
                    if reported_total > 0 and current < reported_total * 0.8:
                        effective_max_stable = max_stable * 2  # Double patience if far from target

                    if stable >= effective_max_stable:
                        logger.info(f"  Stable at {current} for {effective_max_stable} scrolls. Done.")
                        break
                else:
                    stable = 0
                    prev_count = current

                page.evaluate("""
                    window.scrollTo(0, document.body.scrollHeight);
                    document.querySelectorAll('[role="main"], [role="feed"]').forEach(el => {
                        el.scrollTo(0, el.scrollHeight);
                    });
                    const cards = document.querySelectorAll('div._7jyh');
                    if (cards.length > 0) {
                        cards[cards.length - 1].scrollIntoView({behavior: 'smooth', block: 'end'});
                    }
                """)
                time.sleep(3.5)

                # Try clicking "Show more" / "See more results"
                try:
                    btn = page.query_selector("text=/See more results|Show more|Load more/i")
                    if btn:
                        btn.click()
                        logger.info(f"  Clicked 'Show more' at scroll {i+1}")
                        time.sleep(2)
                        stable = 0
                except Exception:
                    pass

            final = max(
                len(page.query_selector_all("div._7jyh")),
                len(page.query_selector_all("div[role='article']")),
                len(page.query_selector_all("a[href*='/ads/library/?id=']")),
            )
            return final

        # First scroll attempt
        card_count = do_scroll_loop(max_scrolls=500, max_stable=12)
        logger.info(f"First scroll pass: {card_count} cards")

        # ── Warm-up retry: if 0 cards, reload and try again ──────────────
        if card_count == 0:
            logger.warning("0 cards on first pass — retrying (warm-up reload)...")
            try:
                page.reload(wait_until="domcontentloaded", timeout=60000)
            except Exception:
                pass
            time.sleep(8)
            # Dismiss consent/popups again
            for sel in consent_selectors:
                try:
                    btn = page.query_selector(sel)
                    if btn and btn.is_visible():
                        btn.click()
                        time.sleep(2)
                        break
                except Exception:
                    continue

            # Re-read reported total
            try:
                body_text = page.inner_text("body")
                for pat in [r"~?\s*([\d,]+)\s*results?", r"([\d,]+)\s*ads?\b"]:
                    m = re.search(pat, body_text, re.IGNORECASE)
                    if m:
                        reported_total = int(m.group(1).replace(",", ""))
                        break
            except Exception:
                pass
            logger.info(f"After reload, reported total: {reported_total}")

            card_count = do_scroll_loop(max_scrolls=500, max_stable=12)
            logger.info(f"Second scroll pass: {card_count} cards")

        # ── Find cards ────────────────────────────────────────────────────
        selectors = ["div._7jyh", "div[role='article']", "a[href*='/ads/library/?id=']"]
        best_cards = []
        best_sel = ""
        for sel in selectors:
            cards = page.query_selector_all(sel)
            if len(cards) > len(best_cards):
                best_cards = cards
                best_sel = sel

        logger.info(f"Final card count: {len(best_cards)} (selector: {best_sel})")
        logger.info(f"Reported vs found: {reported_total} vs {len(best_cards)}")
        if reported_total > len(best_cards) and len(best_cards) > 0:
            gap = reported_total - len(best_cards)
            logger.info(f"  Gap of {gap} — likely 'multiple versions' grouped under single cards")

        # ── Process cards ─────────────────────────────────────────────────
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(2)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        skipped = 0
        real_id_count = 0
        synth_id_count = 0
        date_count = 0
        dropped_empty = 0
        dropped_error = 0
        minio_available = None
        MAX_SCREENSHOTS = 50

        for idx, card in enumerate(best_cards):
            try:
                # Time budget check
                elapsed = time.time() - scrape_start
                if elapsed > time_budget - 30:
                    logger.info(f"  Time budget exhausted at card {idx}/{len(best_cards)}. Saving {len(results)} collected so far.")
                    break

                # Scroll card into view for proper rendering
                card.scroll_into_view_if_needed(timeout=5000)
                time.sleep(0.5)

                full_text = ""
                try:
                    full_text = card.inner_text()
                except Exception:
                    pass

                # For keyword results, the _7jyh card is just the text block.
                # The full ad (with Library ID, date, video/creative) is in a parent.
                # Find the "wide card" — the ancestor that contains "Library ID:"
                wide_card = card
                wide_text = full_text
                if "Library ID" not in full_text:
                    # Walk up to find the ancestor with Library ID
                    for level in range(1, 5):
                        try:
                            parent_text = card.evaluate(
                                f"el => {{ let p=el; for(let i=0;i<{level};i++){{p=p?.parentElement;}} return p?.innerText || ''; }}"
                            )
                            if "Library ID" in parent_text:
                                wide_text = parent_text
                                # Get the actual parent element handle
                                wide_card = card.evaluate_handle(
                                    f"el => {{ let p=el; for(let i=0;i<{level};i++){{p=p?.parentElement;}} return p; }}"
                                )
                                break
                        except Exception:
                            continue

                # ── Library ID (FIX: search wide_text which includes parents) ──
                library_id = extract_library_id(card, wide_text)

                if library_id:
                    real_id_count += 1
                    if library_id in existing_ids:
                        # EXISTING AD: still extract fresh media URLs for refresh
                        # (Meta CDN URLs expire; re-scrape gets fresh ones)
                        skipped += 1
                        fresh_media = _extract_media_only(card, wide_card)
                        if fresh_media.get("ad_creative_url") or fresh_media.get("video_poster_url"):
                            fresh_media["library_id"] = library_id
                            fresh_media["_is_refresh"] = True  # Flag for scrape_competitor
                            results.append(fresh_media)
                        continue

                # ── Screenshot (optional — skip if MinIO down or too many cards) ──
                screenshot_url = None
                should_screenshot = (
                    minio_available is not False
                    and idx < MAX_SCREENSHOTS
                )
                if should_screenshot:
                    try:
                        screenshot_bytes = card.screenshot(timeout=8000)
                        filename = f"ad_library/{brand}/{timestamp}_ad_{idx:03d}.png"
                        try:
                            from app.core.storage.s3_writer import upload_bytes
                            import asyncio
                            loop = asyncio.new_event_loop()
                            screenshot_url = loop.run_until_complete(
                                upload_bytes(screenshot_bytes, filename, "image/png")
                            )
                            loop.close()
                            if minio_available is None:
                                minio_available = True
                        except Exception as e:
                            if minio_available is None:
                                minio_available = False
                                logger.warning("MinIO unreachable — skipping screenshots for remaining ads.")
                    except Exception:
                        pass  # Screenshot failed — non-fatal

                # ── Build ad dict ─────────────────────────────────────────
                ad = {
                    "library_id": library_id,
                    "advertiser_name": brand.title(),
                    "hook": None,
                    "body_copy": None,
                    "cta_text": None,
                    "landing_url": None,
                    "ad_creative_url": None,
                    "screenshot_url": screenshot_url,
                    "active_since": None,
                    "days_running": 0,
                    "is_video": False,
                    "ad_video_url": None,
                    "video_poster_url": None,
                    "has_multiple_versions": "multiple versions" in full_text.lower(),
                    "domain": None,
                    "platforms": ["facebook"],
                }

                # ── Advertiser ────────────────────────────────────────────
                try:
                    els = card.query_selector_all("a span, span[dir='auto'], strong")
                    for el in els:
                        t = (el.text_content() or "").strip()
                        if t and len(t) > 2 and len(t) < 60 and t not in NON_AD_TEXT:
                            if not t.startswith("Started") and not t.startswith("Library"):
                                ad["advertiser_name"] = t
                                break
                except Exception:
                    pass

                # ── Hook + Body ───────────────────────────────────────────
                try:
                    blocks = card.query_selector_all("div._7jyr, span[dir='auto']")
                    texts = []
                    for b in blocks:
                        t = (b.text_content() or "").strip()
                        if t and len(t) > 10 and t not in NON_AD_TEXT and not t.startswith("Started"):
                            if t != ad["advertiser_name"] and t not in texts:
                                texts.append(t)
                    if len(texts) >= 2:
                        sorted_t = sorted(texts, key=len)
                        ad["hook"] = sorted_t[0][:200]
                        ad["body_copy"] = sorted_t[-1]
                    elif texts:
                        ad["hook"] = texts[0][:200]
                        ad["body_copy"] = texts[0]
                except Exception:
                    pass

                # ── Creative image + Video (per-card, unique) ─────────────
                # PRIORITY 1: Video poster from THIS card (not wide_card)
                try:
                    video = card.query_selector("video")
                    if video:
                        ad["is_video"] = True
                        ad["ad_video_url"] = video.get_attribute("src") or ""
                        poster = video.get_attribute("poster")
                        if poster and ("scontent" in poster or "fbcdn" in poster):
                            ad["video_poster_url"] = poster
                            ad["ad_creative_url"] = poster
                except Exception:
                    pass

                # PRIORITY 2: If no video in card, check wide_card
                if not ad.get("ad_creative_url"):
                    try:
                        video = None
                        try:
                            video = wide_card.query_selector("video")
                        except Exception:
                            pass
                        if video:
                            ad["is_video"] = True
                            ad["ad_video_url"] = video.get_attribute("src") or ""
                            poster = video.get_attribute("poster")
                            if poster and ("scontent" in poster or "fbcdn" in poster):
                                ad["video_poster_url"] = poster
                                ad["ad_creative_url"] = poster
                    except Exception:
                        pass

                # PRIORITY 3: Large image in card (skip logo/avatar: <=80px)
                if not ad.get("ad_creative_url"):
                    try:
                        imgs = card.query_selector_all("img")
                        for img in imgs:
                            src = img.get_attribute("src") or ""
                            if not src or ("scontent" not in src and "fbcdn" not in src):
                                continue
                            try:
                                w = img.evaluate("el => el.naturalWidth || el.width || 0")
                                h = img.evaluate("el => el.naturalHeight || el.height || 0")
                            except Exception:
                                w, h = 0, 0
                            # Skip small/logo images
                            if w > 80 or h > 80:
                                ad["ad_creative_url"] = src
                                break
                    except Exception:
                        pass

                # PRIORITY 4: Large image in wide_card
                if not ad.get("ad_creative_url"):
                    ad["ad_creative_url"] = extract_creative_image_from_element(wide_card)

                # ── Date (use wide_text which includes parent with date) ──
                try:
                    dt = extract_date_from_card(card, wide_text)
                    if dt:
                        ad["active_since"] = dt.strftime("%Y-%m-%d")
                        ad["days_running"] = max(0, (datetime.now() - dt).days)
                        date_count += 1
                        if idx < 5:
                            logger.info(f"  Card {idx}: date -> {ad['active_since']}, days={ad['days_running']}")
                except Exception:
                    pass

                # ── Domain ────────────────────────────────────────────────
                try:
                    dm = re.search(r"([A-Z][A-Z0-9-]+\.(?:COM|NET|ORG|CO|IO))", full_text, re.IGNORECASE)
                    if dm:
                        ad["domain"] = dm.group(1).upper()
                except Exception:
                    pass

                # ── CTA ───────────────────────────────────────────────────
                try:
                    cta_els = card.query_selector_all("a[role='button'], div[role='button']")
                    for el in cta_els:
                        t = (el.text_content() or "").strip()
                        if t in KNOWN_CTA_LABELS or t.title() in KNOWN_CTA_LABELS:
                            ad["cta_text"] = t
                            ad["landing_url"] = el.get_attribute("href")
                            break
                except Exception:
                    pass

                # ── Platforms (extract from wide_text) ────────────────────
                try:
                    platforms = []
                    platform_text = wide_text.lower()
                    if "facebook" in platform_text:
                        platforms.append("Facebook")
                    if "instagram" in platform_text:
                        platforms.append("Instagram")
                    if "messenger" in platform_text:
                        platforms.append("Messenger")
                    if "audience network" in platform_text:
                        platforms.append("Audience Network")
                    if platforms:
                        ad["platforms"] = platforms
                except Exception:
                    pass

                # ── Keep if useful (LOOSENED: keep any ad with a library ID) ──
                has_id = bool(ad.get("library_id") or library_id)
                has_content = bool(ad.get("screenshot_url") or ad.get("hook") or ad.get("ad_creative_url"))

                if has_id or has_content:
                    if not library_id:
                        synth_id_count += 1
                    results.append(ad)
                else:
                    dropped_empty += 1

            except Exception as e:
                dropped_error += 1
                logger.debug(f"Card {idx} error: {e}")
                continue

        logger.info(
            f"\n=== Scrape Summary for '{brand}' ===\n"
            f"  Reported total:    {reported_total}\n"
            f"  Cards on page:     {len(best_cards)}\n"
            f"  Cards processed:   {len(best_cards) - dropped_error}\n"
            f"  Ads saved:         {len(results)}\n"
            f"  Duplicates skipped: {skipped}\n"
            f"  Dropped (empty):   {dropped_empty}\n"
            f"  Dropped (error):   {dropped_error}\n"
            f"  Real IDs:          {real_id_count}\n"
            f"  Synthetic IDs:     {synth_id_count}\n"
            f"  Dates parsed:      {date_count}"
        )

        # Guard: check for duplicate creatives (symptom of extraction bug)
        if results:
            media_urls = [r.get("ad_creative_url") for r in results if r.get("ad_creative_url")]
            distinct_urls = len(set(media_urls))
            if media_urls and distinct_urls < len(media_urls) * 0.5:
                logger.warning(
                    f"  ⚠️  LOW CREATIVE DIVERSITY: {distinct_urls} distinct URLs "
                    f"for {len(media_urls)} ads — possible extraction bug!"
                )
            else:
                logger.info(f"  Creative diversity: {distinct_urls} distinct / {len(media_urls)} total")

        # ── Save anonymous session state ─────────────────────────────────
        # Save when the SESSION CONTEXT is valid (not blocked/challenged),
        # regardless of ad count. Session validity ≠ scrape completeness.
        # A valid session can still produce partial results due to scroll limits.
        #
        # Do NOT save if:
        # - the page was blocked/challenged/login-gated
        # - consent was never resolved (page may not have loaded fully)
        # - storage_state_path is not configured
        session_is_saveable = (
            storage_state_path
            and not is_blocked
            and not (consent_dismissed is False and reported_total == 0)
        )
        if session_is_saveable:
            try:
                state_file = Path(storage_state_path)
                state_file.parent.mkdir(parents=True, exist_ok=True)
                saved_state = context.storage_state()
                # Write atomically (to temp then rename)
                tmp_path = state_file.with_suffix('.tmp')
                with open(tmp_path, 'w', encoding='utf-8') as f:
                    json.dump(saved_state, f, ensure_ascii=False)
                tmp_path.replace(state_file)
                logger.info(f"Saved session state ({len(saved_state.get('cookies', []))} cookies)")
            except Exception as e:
                logger.debug(f"Could not save session state: {e}")
        elif storage_state_path and is_blocked:
            logger.warning("Session NOT saved — page was blocked/challenged")

        context.close()
        browser.close()

    # Write partial results to output_file (if provided) so parent can read them
    # even if the process gets killed shortly after
    if output_file and results:
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False)
        except Exception:
            pass

    return results


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python run_scraper.py <input.json> <output.json>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    with open(input_file, 'r', encoding='utf-8-sig') as f:
        data = json.load(f)

    comp = data["competitor"]
    existing = set(data.get("existing_ids", []))

    try:
        ads = run_scrape(comp, existing, output_file=output_file, time_budget=1100)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(ads, f, ensure_ascii=False)
        logger.info(f"Wrote {len(ads)} ads to {output_file}")
    except Exception as e:
        import traceback
        error_info = {
            "error": traceback.format_exc(),
            "partial_results": [],
        }
        # Try to get partial results from the global if available
        logger.error(f"Scraper crashed: {e}")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(error_info, f, ensure_ascii=False)
        sys.exit(1)
