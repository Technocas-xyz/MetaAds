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

# Playwright's bundled Chromium ships without the H.264 codec, so Meta swaps a
# video ad's player for an error message ("Sorry, we're having trouble ...").
# When the scraper runs Google Chrome instead the codec is present and the real
# creative loads, but any text matching this message is never real ad copy.
PLAYER_ERROR_PHRASES = (
    "having trouble with playing this video",
    "having trouble playing this video",
)


def is_player_error(text: Optional[str]) -> bool:
    """True when `text` is Meta's video-player error (codec missing), not ad copy."""
    if not text:
        return False
    lowered = text.lower()
    return any(phrase in lowered for phrase in PLAYER_ERROR_PHRASES)

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


# Meta server-renders the first page of results (~30 cards). Every further page
# comes from the AdLibrarySearchPaginationQuery GraphQL call, which Meta answers
# with error 1675004 "Rate limit exceeded" for anonymous sessions. When that
# happens we re-load the page with narrower filters (media type, then platform):
# each filtered load gets its own server-rendered first page, so the union of
# slices recovers ads that pagination would have returned.
SSR_PAGE_SIZE = 30
RATE_LIMIT_CODE = "1675004"
MEDIA_SLICES = ["video", "image", "meme", "none"]
PLATFORM_SLICES = ["facebook", "instagram", "messenger", "audience_network", "threads"]
# Keyword sweep: Meta lets anonymous sessions search inside one advertiser's
# ads, and each keyword gets its own server-rendered first page. Sweeping
# words taken from the ads already seen reaches ads that neither pagination
# nor the media slices return.
MAX_SWEEP_QUERIES = 220
SWEEP_DRY_LIMIT = 45      # stop after this many keywords in a row with nothing new
SWEEP_EMPTY_LIMIT = 10    # known words returning nothing at all = soft block
SWEEP_STOPWORDS = set(
    "the and for you your with that this from have are our get all not but can just now more out "
    "new off one any was will its it's than them they what when who how why into over only here "
    "there their been about also each every make made need want "
    # Ad Library card chrome
    "library active inactive started running platforms sponsored details summary multiple versions "
    "uses creative text shop learn sign order book send message subscribe open dropdown".split()
)
MAX_VERIFY = 80  # per-ad status checks per run (~7s each); more trips Meta's listing block
CARD_SELECTORS = ["div._7jyh", "div[role='article']", "a[href*='/ads/library/?id=']"]


def build_url(comp: dict, media_type: str = "all", platform: Optional[str] = None,
              sort_mode: str = "total_impressions") -> str:
    if comp.get("page_id"):
        params = {
            "active_status": "active",
            "ad_type": "all",
            "country": "US",
            "is_targeted_country": "false",
            "media_type": media_type,
            "search_type": "page",
            "sort_data[mode]": sort_mode,
            "sort_data[direction]": "desc",
            "view_all_page_id": comp["page_id"],
        }
    else:
        params = {
            "country": "US",
            "q": comp.get("query") or comp.get("name"),
            "active_status": "active",
            "ad_type": "all",
            "media_type": media_type,
        }
    if platform:
        params["publisher_platforms[0]"] = platform
    return f"{AD_LIBRARY_BASE}?{urllib.parse.urlencode(params)}"


def build_keyword_url(page_id: str, keyword: str) -> str:
    """Listing of one advertiser's active ads whose text contains `keyword`."""
    params = {
        "active_status": "active",
        "ad_type": "all",
        "country": "US",
        "media_type": "all",
        "q": keyword,
        "search_type": "keyword_unordered",
        "page_ids[0]": page_id,
    }
    return f"{AD_LIBRARY_BASE}?{urllib.parse.urlencode(params)}"


def ad_tokens(text: str) -> Set[str]:
    """Searchable words of an ad card, minus stopwords and Ad Library UI labels."""
    return {w for w in re.findall(r"(?<![a-z'’])[a-z]{4,14}(?![a-z'’])", text.lower()) if w not in SWEEP_STOPWORDS}


def browser_proxy() -> Optional[Dict[str, str]]:
    """Playwright proxy settings from SCRAPER_PROXY_URL, or None to connect directly.

    Falls back to a direct connection when the proxy is not reachable, so a
    stopped proxy degrades the scrape instead of failing every page load.
    """
    import os
    import socket
    url = os.getenv("SCRAPER_PROXY_URL", "").strip()
    if not url:
        return None
    parsed = urllib.parse.urlparse(url)
    try:
        socket.create_connection((parsed.hostname, parsed.port or 80), timeout=3).close()
    except OSError as e:
        logger.warning(f"SCRAPER_PROXY_URL is set but not reachable ({e}); connecting directly")
        return None
    return {"server": url}


class PaginationMonitor:
    """Watches Ad Library pagination GraphQL responses for rate-limit errors."""

    def __init__(self):
        self.reset()

    def reset(self):
        self.ok = 0
        self.rate_limited = 0
        self.other_errors = 0

    def on_response(self, response):
        if "/api/graphql" not in response.url:
            return
        try:
            post_data = response.request.post_data or ""
            if "AdLibrarySearchPaginationQuery" not in post_data:
                return
            body = response.text()[:400]
        except Exception:
            return
        if '"errors"' not in body:
            self.ok += 1
        elif RATE_LIMIT_CODE in body or "rate limit" in body.lower():
            self.rate_limited += 1
        else:
            self.other_errors += 1
            logger.warning(f"  Pagination error from Meta: {body[:200]}")


def run_scrape(comp: dict, existing_ids: Set[str], output_file: str = None, time_budget: int = 1100,
               needs_image_ids: Optional[Set[str]] = None, verify_ids: Optional[List[str]] = None):
    """
    Main scrape function. time_budget is max seconds to spend.

    needs_image_ids: existing ads with no stored image — they get a card
    screenshot on this run so the image survives Meta CDN expiry.

    verify_ids: ads we currently consider active, oldest-seen first. Any that
    this run didn't see are checked one by one on their own Ad Library page
    (?id=...), which says plainly when an ad is no longer in the library.
    Results land in meta["verified_active"] / meta["verified_gone"].

    Returns (results, meta). meta["complete"] is True only when every active ad
    was reachable (no unresolved rate limit, block, or time-budget cut-off) —
    callers must not infer "ad removed" from a run that is not complete.
    """
    import os
    import random
    from playwright.sync_api import sync_playwright

    brand = comp.get("query") or comp.get("name", "unknown")
    results = []
    seen_ids: Set[str] = set()
    scrape_start = time.time()
    loads: List[Dict[str, Any]] = []
    token_ads: Dict[str, Set[str]] = {}   # word -> library ids of ads containing it
    new_ids_in_load: List[str] = []
    stats = {
        "sweep_queries": 0, "covered_results": 0, "cards": 0, "skipped": 0, "real_ids": 0, "synth_ids": 0, "dates": 0,
        "dropped_empty": 0, "dropped_error": 0, "dup_across_slices": 0,
        "video_unplayable": 0,
    }

    def elapsed() -> float:
        return time.time() - scrape_start

    # ── Session persistence ───────────────────────────────────────────────
    # Load saved session (consent cookies, locale prefs — or a logged-in
    # session exported by an operator) if available.
    storage_state_path = os.getenv("META_STORAGE_STATE_PATH", "")
    storage_state = None
    loaded_session = False

    if storage_state_path:
        state_file = Path(storage_state_path)
        if state_file.exists():
            try:
                with open(state_file, 'r', encoding='utf-8') as f:
                    storage_state = json.load(f)
                if isinstance(storage_state, dict) and "cookies" in storage_state:
                    loaded_session = True
                    logger.info(f"Loaded session state ({len(storage_state.get('cookies', []))} cookies)")
                else:
                    logger.warning("Session state file invalid (no cookies key), starting fresh")
                    storage_state = None
            except (json.JSONDecodeError, OSError) as e:
                logger.warning(f"Could not load session state ({e}), starting fresh")
                storage_state = None

    logger.info(f"Session: {'loaded from file' if loaded_session else 'fresh anonymous'}")

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

    proxy = browser_proxy()
    logger.info(f"Network: {'via ' + proxy['server'] if proxy else 'direct'}")

    launch_args = [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
    ]

    with sync_playwright() as pw:
        # Prefer Google Chrome: unlike Playwright's bundled Chromium it ships the
        # H.264 codec, so Meta renders the real video creative instead of the
        # "having trouble playing this video" error. Fall back to bundled
        # Chromium if Chrome is unavailable (e.g. Linux arm64 has no Chrome build).
        channel = os.getenv("SCRAPER_BROWSER_CHANNEL", "chrome").strip()
        browser = None
        if channel:
            try:
                browser = pw.chromium.launch(
                    channel=channel,
                    headless=True,
                    proxy=proxy,
                    args=launch_args,
                )
                logger.info(f"Browser: Google Chrome (channel={channel}) v{browser.version}")
            except Exception as e:
                logger.warning(
                    f"Could not launch browser channel '{channel}' ({e}); "
                    f"falling back to bundled Chromium — video ad creatives may be missing"
                )
                browser = None
        if browser is None:
            browser = pw.chromium.launch(
                headless=True,
                proxy=proxy,
                args=launch_args,
            )
            logger.info(f"Browser: bundled Chromium v{browser.version}")

        context_kwargs = {
            "viewport": {"width": 1920, "height": 1080},
            "user_agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            "locale": "en-US",
            "timezone_id": "America/New_York",
        }
        if storage_state:
            context_kwargs["storage_state"] = storage_state

        context = browser.new_context(**context_kwargs)
        page = context.new_page()
        monitor = PaginationMonitor()
        page.on("response", monitor.on_response)
        consent_dismissed = False
        any_blocked = False

        def dismiss_consent() -> bool:
            for sel in consent_selectors:
                try:
                    btn = page.query_selector(sel)
                    if btn and btn.is_visible():
                        btn.click()
                        logger.info(f"Dismissed consent/popup: {sel}")
                        time.sleep(2)
                        return True
                except Exception:
                    continue
            return False

        def count_cards() -> int:
            return max(len(page.query_selector_all(sel)) for sel in CARD_SELECTORS)

        def read_reported_total() -> int:
            try:
                body_text = page.inner_text("body")
                for pat in [r"~?\s*([\d,]+)\s*results?", r"([\d,]+)\s*ads?\b", r"About\s*([\d,]+)"]:
                    m = re.search(pat, body_text, re.IGNORECASE)
                    if m:
                        return int(m.group(1).replace(",", ""))
            except Exception:
                pass
            return 0

        def scroll_until_done(reported_total: int, max_scrolls: int = 500, max_stable: int = 12) -> str:
            """Scroll to trigger pagination. Returns why it stopped."""
            prev_count = 0
            stable = 0
            for i in range(max_scrolls):
                current = count_cards()
                time_for_processing = min(current * 0.8, 300)
                if elapsed() > time_budget - time_for_processing - 60:
                    logger.info(f"  Time budget running low ({elapsed():.0f}s elapsed, {current} cards). Stopping scroll.")
                    return "time_budget"

                if (i + 1) % 10 == 0:
                    logger.info(f"  Scroll {i+1}: {current} cards (target: {reported_total})")

                if reported_total > 0 and current >= reported_total:
                    logger.info(f"  Reached reported total ({reported_total}) at scroll {i+1}")
                    return "reached_total"

                if current == prev_count:
                    stable += 1
                    # Meta fires a pagination request even for empty/short result
                    # sets; a refusal there doesn't mean ads are missing.
                    if current < SSR_PAGE_SIZE // 2 and stable >= 3:
                        return "end_of_results"
                    # Meta refused the next page — more scrolling only extends the block.
                    if monitor.rate_limited and stable >= 2:
                        logger.warning(
                            f"  Pagination rate-limited by Meta at {current} cards "
                            f"({monitor.rate_limited} refused page requests). Stopping scroll."
                        )
                        return "rate_limited"
                    if stable >= max_stable:
                        logger.info(f"  Stable at {current} for {max_stable} scrolls. Done.")
                        return "end_of_results"
                else:
                    stable = 0
                    prev_count = current

                try:
                    page.mouse.move(960, 600)
                    page.mouse.wheel(0, 4000)
                except Exception:
                    pass
                page.evaluate("""
                    window.scrollTo(0, document.body.scrollHeight);
                    document.querySelectorAll('[role="main"], [role="feed"]').forEach(el => {
                        el.scrollTo(0, el.scrollHeight);
                    });
                """)
                time.sleep(3.5)

                try:
                    btn = page.query_selector("text=/See more results|Show more|Load more/i")
                    if btn:
                        btn.click()
                        logger.info(f"  Clicked 'Show more' at scroll {i+1}")
                        time.sleep(2)
                        stable = 0
                except Exception:
                    pass
            return "max_scrolls"

        def load(url: str, label: str, scroll: bool = True) -> Dict[str, Any]:
            """Navigate to url, scroll it out, and report how the load ended.

            scroll=False takes only the server-rendered first page (keyword sweep).
            """
            nonlocal consent_dismissed, any_blocked
            monitor.reset()
            logger.info(f"[{label}] Navigating to: {url}")
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=60000)
            except Exception as e:
                logger.warning(f"Navigation timeout (continuing): {e}")
            time.sleep(5)
            if dismiss_consent():
                consent_dismissed = True

            page_content = ""
            try:
                page_content = page.inner_text("body")[:500].lower()
            except Exception:
                pass
            blocked = any(x in page_content for x in [
                "you must log in", "please log in", "checkpoint",
                "confirm your identity", "something went wrong",
            ])
            if blocked:
                any_blocked = True
                logger.warning(f"[{label}] Meta is showing a login/checkpoint/error page — session may be blocked")

            reported_total = read_reported_total()
            logger.info(f"[{label}] Reported total on page: {reported_total}")
            if blocked:
                stop = "blocked"
            elif scroll:
                stop = scroll_until_done(reported_total)
            else:
                stop = "first_page"
            info = {
                "label": label,
                "reported_total": reported_total,
                "cards": count_cards(),
                "stop": stop,
                "pagination_ok": monitor.ok,
                "pagination_rate_limited": monitor.rate_limited,
                "pagination_errors": monitor.other_errors,
            }
            info["complete"] = stop in ("end_of_results", "reached_total") and not monitor.other_errors
            logger.info(f"[{label}] {info['cards']} cards, stop={stop}, complete={info['complete']}")
            loads.append(info)
            return info

        def process_cards(label: str, require_id: bool) -> bool:
            """Extract every card on the current page. Returns False if cut off by time budget."""
            selector_cards = [(sel, page.query_selector_all(sel)) for sel in CARD_SELECTORS]
            best_sel, best_cards = max(selector_cards, key=lambda x: len(x[1]))
            logger.info(f"[{label}] Processing {len(best_cards)} cards (selector: {best_sel})")
            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(2)
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            new_in_load = 0
            new_ids_in_load.clear()

            for idx, card in enumerate(best_cards):
                try:
                    if elapsed() > time_budget - 30:
                        logger.info(f"  Time budget exhausted at card {idx}/{len(best_cards)}. Saving {len(results)} collected so far.")
                        return False

                    full_text = ""
                    try:
                        full_text = card.inner_text()
                    except Exception:
                        pass

                    # For keyword results, the _7jyh card is just the text block.
                    # The full ad (with Library ID, date, video/creative) is in a parent.
                    wide_card = card
                    wide_text = full_text
                    if "Library ID" not in full_text:
                        for level in range(1, 5):
                            try:
                                parent_text = card.evaluate(
                                    f"el => {{ let p=el; for(let i=0;i<{level};i++){{p=p?.parentElement;}} return p?.innerText || ''; }}"
                                )
                                if "Library ID" in parent_text:
                                    wide_text = parent_text
                                    wide_card = card.evaluate_handle(
                                        f"el => {{ let p=el; for(let i=0;i<{level};i++){{p=p?.parentElement;}} return p; }}"
                                    )
                                    break
                            except Exception:
                                continue

                    library_id = extract_library_id(card, wide_text)

                    if library_id:
                        if library_id in seen_ids:
                            stats["dup_across_slices"] += 1
                            continue
                        # Only ads not seen yet are worth the scroll (lazy media, screenshot).
                        card.scroll_into_view_if_needed(timeout=5000)
                        time.sleep(0.5)
                        seen_ids.add(library_id)
                        stats["real_ids"] += 1
                        new_in_load += 1
                        new_ids_in_load.append(library_id)
                        for token in ad_tokens(wide_text):
                            token_ads.setdefault(token, set()).add(library_id)
                        # Meta's result count includes every ad sharing this card's
                        # creative ("8 ads use this creative and text").
                        group = re.search(r"(\d+)\s+ads use this creative", wide_text)
                        stats["covered_results"] += int(group.group(1)) if group else 1
                        if library_id in existing_ids:
                            # EXISTING AD: always report it as seen (so it is not marked
                            # removed), plus fresh media URLs since Meta CDN URLs expire.
                            stats["skipped"] += 1
                            fresh_media = _extract_media_only(card, wide_card)
                            fresh_media["library_id"] = library_id
                            if is_player_error(wide_text):
                                # Video ad whose player failed (missing codec):
                                # mark it a video and don't capture the grey error box.
                                fresh_media["is_video"] = True
                                stats["video_unplayable"] += 1
                            elif needs_image_ids and library_id in needs_image_ids:
                                fresh_media["screenshot_url"] = capture_screenshot(card, library_id, timestamp)
                            fresh_media["_is_refresh"] = True
                            results.append(fresh_media)
                            continue
                    elif require_id:
                        # Slices can't be deduplicated without an ID — skip.
                        continue

                    stats["cards"] += 1
                    ad = _extract_ad(card, wide_card, full_text, wide_text, library_id, idx, timestamp)

                    has_content = bool(ad.get("screenshot_url") or ad.get("hook") or ad.get("ad_creative_url"))
                    if library_id or has_content:
                        if not library_id:
                            stats["synth_ids"] += 1
                        results.append(ad)
                    else:
                        stats["dropped_empty"] += 1

                except Exception as e:
                    stats["dropped_error"] += 1
                    logger.debug(f"Card {idx} error: {e}")
                    continue

            logger.info(f"[{label}] {new_in_load} new unique ads (total unique: {len(seen_ids)})")
            return True

        minio_state = {"available": None, "shots": 0}
        MAX_SCREENSHOTS = 600

        def capture_screenshot(card, key: str, timestamp: str) -> Optional[str]:
            """Screenshot a card into MinIO; returns its URL or None."""
            if minio_state["available"] is False or minio_state["shots"] >= MAX_SCREENSHOTS:
                return None
            try:
                screenshot_bytes = card.screenshot(timeout=8000)
            except Exception:
                return None  # Screenshot failed — non-fatal
            minio_state["shots"] += 1
            try:
                # Sync upload: Playwright's sync API already runs an event loop in
                # this thread, so the async upload_bytes can't be driven from here.
                from app.core.storage.s3_writer import upload_bytes_sync
                url = upload_bytes_sync(screenshot_bytes, f"ad_library/{brand}/{timestamp}_ad_{key}.png", "image/png")
                minio_state["available"] = True
                return url
            except Exception as e:
                if minio_state["available"] is None:
                    minio_state["available"] = False
                    logger.warning(f"MinIO upload failed ({e}) — skipping screenshots for remaining ads.")
                return None

        def _extract_ad(card, wide_card, full_text, wide_text, library_id, idx, timestamp) -> Dict[str, Any]:
            # Meta renders a video ad's player as an error message when the browser
            # lacks the H.264 codec. The card screenshot would show the grey error
            # box, so skip it (the next run with Chrome re-captures the creative),
            # and treat the ad as a video even though no <video> element loaded.
            player_error = is_player_error(wide_text) or is_player_error(full_text)
            if player_error:
                screenshot_url = None
                stats["video_unplayable"] += 1
            else:
                screenshot_url = capture_screenshot(card, library_id or str(idx), timestamp)

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
                    if t and len(t) > 2 and len(t) < 60 and t not in NON_AD_TEXT and not is_player_error(t):
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
                    if t and len(t) > 10 and t not in NON_AD_TEXT and not t.startswith("Started") and not is_player_error(t):
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

            # ── Creative image + Video (card first, then wide card) ───
            media = _extract_media_only(card, wide_card)
            # A player error means this is a video ad whose player failed to load,
            # so no <video> element was found — force is_video regardless.
            ad["is_video"] = media["is_video"] or player_error
            ad["ad_video_url"] = media["ad_video_url"]
            ad["video_poster_url"] = media["video_poster_url"]
            ad["ad_creative_url"] = media["ad_creative_url"] or extract_creative_image_from_element(wide_card)

            # ── Date (use wide_text which includes parent with date) ──
            try:
                dt = extract_date_from_card(card, wide_text)
                if dt:
                    ad["active_since"] = dt.strftime("%Y-%m-%d")
                    ad["days_running"] = max(0, (datetime.now() - dt).days)
                    stats["dates"] += 1
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
            platform_text = wide_text.lower()
            platforms = [name for key, name in [
                ("facebook", "Facebook"), ("instagram", "Instagram"),
                ("messenger", "Messenger"), ("audience network", "Audience Network"),
            ] if key in platform_text]
            if platforms:
                ad["platforms"] = platforms
            return ad

        def check_ad_status(library_id: str) -> str:
            """'active' | 'gone' | 'unknown' from the ad's own Ad Library page."""
            try:
                page.goto(f"{AD_LIBRARY_BASE}?id={library_id}", wait_until="domcontentloaded", timeout=45000)
                time.sleep(4)
                text = page.inner_text("body")
            except Exception:
                return "unknown"
            if "isn't in the ad library" in text or "isn’t in the ad library" in text:
                return "gone"
            if library_id in text:
                return "active"
            return "unknown"

        def polite_pause():
            time.sleep(random.uniform(4, 8))

        def keyword_sweep(target: int) -> None:
            """Search inside the advertiser by words from ads already seen until
            the unique count reaches `target`, new ads dry up, or time runs low."""
            tried: Set[str] = set()
            # Many ads reuse one copy with different images, so words from the same
            # copy look identical among known ads — but they match very different
            # numbers of unseen ads. Spread tries across copies instead of skipping.
            signature_tries: Dict[frozenset, int] = {}
            dry = empty = queries = 0
            recent: List[str] = []   # ads found most recently — their words lead to neighbours

            def next_keyword() -> Optional[str]:
                best, best_key = None, None
                recent_set = set(recent[-40:])
                for word, ads in token_ads.items():
                    if word in tried:
                        continue
                    tries = signature_tries.get(frozenset(ads), 0)
                    # Words shared by a few known ads tend to match a page-sized
                    # group with unseen members; one-off words usually match only
                    # the ad they came from, so they go last. Fresh finds first.
                    n = len(ads)
                    band = 0 if 2 <= n <= 12 else (1 if n > 12 else 2)
                    key = (tries, band, 0 if ads & recent_set else 1, abs(n - 4), word)
                    if best_key is None or key < best_key:
                        best, best_key = word, key
                return best

            while queries < MAX_SWEEP_QUERIES and stats["covered_results"] < target:
                if elapsed() > time_budget - 420:
                    logger.info("  Keyword sweep: time budget reached")
                    break
                word = next_keyword()
                if not word:
                    logger.info("  Keyword sweep: no untried words left")
                    break
                tried.add(word)
                signature = frozenset(token_ads[word])
                signature_tries[signature] = signature_tries.get(signature, 0) + 1
                queries += 1
                time.sleep(random.uniform(2.5, 4.5))
                info = load(build_keyword_url(comp["page_id"], word), f"kw={word}", scroll=False)
                if info["stop"] == "blocked":
                    break
                if not process_cards(f"kw={word}", require_id=True):
                    break
                if info["cards"] == 0:
                    empty += 1
                    if empty >= SWEEP_EMPTY_LIMIT:
                        logger.warning("  Keyword sweep: known words return nothing — Meta is likely blocking, stopping")
                        break
                else:
                    empty = 0
                if new_ids_in_load:
                    dry = 0
                    recent.extend(new_ids_in_load)
                else:
                    dry += 1
                    if dry >= SWEEP_DRY_LIMIT:
                        logger.info(f"  Keyword sweep: {SWEEP_DRY_LIMIT} keywords in a row found nothing new")
                        break
                if queries % 10 == 0:
                    logger.info(
                        f"  Keyword sweep: {queries} keywords, {len(seen_ids)} unique ads "
                        f"covering {stats['covered_results']} of ~{target} results"
                    )
            stats["sweep_queries"] = queries
            logger.info(f"Keyword sweep done: {queries} keywords, {len(seen_ids)} unique ads (target ~{target})")

        def time_left() -> bool:
            return elapsed() < time_budget - 120

        coverage_complete = False

        # ── 1. Full listing ───────────────────────────────────────────────
        main = load(build_url(comp), "all")
        if main["cards"] == 0 and main["stop"] != "blocked":
            logger.warning("0 cards on first pass — retrying (warm-up reload)...")
            polite_pause()
            main = load(build_url(comp), "all-retry")
        complete = process_cards("all", require_id=False) and main["complete"]

        # ── 2. Slice fallback when Meta refuses pagination ────────────────
        if main["stop"] == "rate_limited":
            logger.warning(
                f"Meta rate-limited pagination after {main['cards']} ads "
                f"(reported ~{main['reported_total']}). Falling back to filtered slices."
            )
            complete = True
            for media_type in MEDIA_SLICES:
                if not time_left():
                    complete = False
                    break
                polite_pause()
                label = f"media={media_type}"
                info = load(build_url(comp, media_type=media_type), label)
                if not process_cards(label, require_id=True) or info["stop"] == "blocked":
                    complete = False
                    break
                if not info["complete"]:
                    complete = False

            # Meta's count is rounded ("~430"), so allow a small shortfall.
            target = int(main["reported_total"] * 0.97) if main["reported_total"] else 0
            if comp.get("page_id") and time_left() and not any_blocked and stats["covered_results"] < target:
                polite_pause()
                load(build_url(comp, sort_mode="relevancy_monthly_grouped"), "sort=relevancy", scroll=False)
                process_cards("sort=relevancy", require_id=True)
                keyword_sweep(target)
            # Coverage is an estimate (shared-creative groups can be counted twice),
            # so it never upgrades `complete`: removals must not rest on it.
            coverage_complete = bool(target) and stats["covered_results"] >= target

        # An empty listing can't be told apart from a soft block (seen with
        # Blue Cotton: 0 cards while 57 of its ads were still running).
        complete = complete and not any_blocked and len(seen_ids) > 0

        # ── 3. Verify unseen ads individually ─────────────────────────────
        verified_active: List[str] = []
        verified_gone: List[str] = []
        candidates = [lid for lid in (verify_ids or []) if lid not in seen_ids][:MAX_VERIFY]
        if candidates and not any_blocked:
            logger.info(f"Verifying {len(candidates)} ads not seen in listing")
            unknown_streak = 0
            for lid in candidates:
                if elapsed() > time_budget - 30:
                    logger.info(f"  Time budget reached after verifying {len(verified_active) + len(verified_gone)} ads")
                    break
                state = check_ad_status(lid)
                if state == "active":
                    verified_active.append(lid)
                elif state == "gone":
                    verified_gone.append(lid)
                unknown_streak = unknown_streak + 1 if state == "unknown" else 0
                if unknown_streak >= 5:
                    logger.warning("  5 inconclusive ad pages in a row — stopping verification")
                    break
                time.sleep(random.uniform(1.5, 3.5))
            logger.info(f"  Verified: {len(verified_active)} still running, {len(verified_gone)} no longer in library")

        logger.info(
            f"\n=== Scrape Summary for '{brand}' ===\n"
            f"  Page loads:        {len(loads)} ({stats['sweep_queries']} keyword searches)\n"
            f"  Reported total:    {main['reported_total']}\n"
            f"  Unique ads seen:   {len(seen_ids)} (covering {stats['covered_results']} results incl. shared creatives)\n"
            f"  Ads returned:      {len(results)}\n"
            f"  Existing (seen):   {stats['skipped']}\n"
            f"  New extracted:     {stats['cards']}\n"
            f"  Dup across slices: {stats['dup_across_slices']}\n"
            f"  Dropped (empty):   {stats['dropped_empty']}\n"
            f"  Dropped (error):   {stats['dropped_error']}\n"
            f"  Video unplayable:  {stats['video_unplayable']}\n"
            f"  Real IDs:          {stats['real_ids']}\n"
            f"  Synthetic IDs:     {stats['synth_ids']}\n"
            f"  Dates parsed:      {stats['dates']}\n"
            f"  COMPLETE:          {complete}\n"
            f"  COVERAGE REACHED:  {coverage_complete or complete}"
        )
        if not complete and not coverage_complete:
            logger.warning(
                "  Partial scrape — ads missing from this run must NOT be treated as removed."
            )

        # Guard: check for duplicate creatives (symptom of extraction bug)
        media_urls = [r.get("ad_creative_url") for r in results if r.get("ad_creative_url")]
        distinct_urls = len(set(media_urls))
        if media_urls and distinct_urls < len(media_urls) * 0.5:
            logger.warning(
                f"  ⚠️  LOW CREATIVE DIVERSITY: {distinct_urls} distinct URLs "
                f"for {len(media_urls)} ads — possible extraction bug!"
            )

        # ── Save session state ────────────────────────────────────────────
        # Save when the session context is valid (not blocked/challenged),
        # regardless of ad count. Session validity ≠ scrape completeness.
        session_is_saveable = (
            storage_state_path
            and not any_blocked
            and not (consent_dismissed is False and main["reported_total"] == 0)
        )
        if session_is_saveable:
            try:
                state_file = Path(storage_state_path)
                state_file.parent.mkdir(parents=True, exist_ok=True)
                saved_state = context.storage_state()
                tmp_path = state_file.with_suffix('.tmp')
                with open(tmp_path, 'w', encoding='utf-8') as f:
                    json.dump(saved_state, f, ensure_ascii=False)
                tmp_path.replace(state_file)
                logger.info(f"Saved session state ({len(saved_state.get('cookies', []))} cookies)")
            except Exception as e:
                logger.debug(f"Could not save session state: {e}")
        elif storage_state_path and any_blocked:
            logger.warning("Session NOT saved — page was blocked/challenged")

        context.close()
        browser.close()

    meta = {
        "complete": complete,
        "reported_total": main["reported_total"],
        "unique_ads": len(seen_ids),
        "covered_results": stats["covered_results"],
        "coverage_complete": coverage_complete or complete,
        "rate_limited": any(l["pagination_rate_limited"] for l in loads),
        "blocked": any_blocked,
        "duration_seconds": int(elapsed()),
        "loads": loads,
        "verified_active": verified_active,
        "verified_gone": verified_gone,
    }
    write_output(output_file, results, meta)
    return results, meta


def write_output(output_file: Optional[str], results: list, meta: dict) -> None:
    """Write results plus a <output>.meta.json sidecar the parent reads for run health."""
    if not output_file:
        return
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False)
        with open(f"{output_file}.meta.json", 'w', encoding='utf-8') as f:
            json.dump(meta, f, ensure_ascii=False)
    except Exception as e:
        logger.warning(f"Could not write output: {e}")


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
    needs_image = set(data.get("needs_image_ids", []))
    verify = data.get("verify_ids", [])

    try:
        ads, meta = run_scrape(comp, existing, output_file=output_file, time_budget=3300,
                               needs_image_ids=needs_image, verify_ids=verify)
        logger.info(f"Wrote {len(ads)} ads to {output_file} (complete={meta['complete']})")
    except Exception as e:
        import traceback
        logger.error(f"Scraper crashed: {e}")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({"error": traceback.format_exc(), "partial_results": []}, f, ensure_ascii=False)
        sys.exit(1)
