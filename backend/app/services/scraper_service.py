"""
Meta Ad Library Scraper Service — Playwright + DOM extraction.

Ported from proven MetaAdLibraryTarget scraper. Uses headless Chromium to:
1. Navigate to the public Meta Ad Library page
2. Aggressively scroll to load ALL ad cards
3. Screenshot each card + extract text/creative/dates
4. Upload screenshots to MinIO
5. Upsert ads into the DB with incremental dedup

Public interface (signatures unchanged):
  scrape_competitor(competitor_id, db, trigger) -> ScrapeRun
  run_scheduled_scrape(competitor_id) -> None
"""

import asyncio
import logging
import re
import urllib.parse
from datetime import datetime, timezone, date as date_type
from typing import Any, Dict, List, Optional, Set
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.ad import Ad
from app.models.competitor import Competitor
from app.models.scrape_run import ScrapeRun
from app.services.analysis_service import run_analysis

logger = logging.getLogger(__name__)

# Per-competitor overall timeout (seconds)
SCRAPE_TIMEOUT = 1200  # 20 minutes — large competitors (CustomInk ~1500) need more time

AD_LIBRARY_BASE = "https://www.facebook.com/ads/library/"


# ─── Constants from proven scraper ────────────────────────────────────────────

BRAND_ALIASES = {
    "ooshirts": ["ooshirts", "oo shirts", "ooshirt"],
    "uberprints": ["uberprints", "uber prints", "uber print"],
    "customink": ["customink", "custom ink", "custom-ink"],
    "rushordertees": ["rushordertees", "rush order tees", "rushorder"],
    "ninjatransfers": ["ninja transfers", "ninjatransfers"],
    "ghostdtf": ["ghost dtf", "ghostdtf"],
    "liondtf": ["lion dtf", "liondtf"],
    "bluecotton": ["blue cotton", "bluecotton"],
    "samedaytees": ["same day tees", "samedaytees"],
    "boltprinting": ["bolt printing", "boltprinting"],
    "undergroundshirts": ["underground shirts", "undergroundshirts", "ugs"],
    "dtftransfernation": ["dtf transfer nation", "dtftransfernation"],
    "dtfstation": ["dtf station", "dtfstation"],
    "weprintupress": ["we print u press", "weprintupress"],
    "indianadtfprint": ["indiana dtf print", "indianadtfprint"],
    "flexdtf": ["flex dtf", "flexdtf"],
    "beartransfers": ["bear transfers", "bear transfers print center", "beartransfers"],
    "rapiddtf": ["rapid dtf", "rapiddtf"],
    "bestpricedtf": ["best price dtf", "bestpricedtf"],
    "dtfprinceton": ["dtf princeton", "dtfprinceton"],
    "kingdomdesigns": ["kingdom designs", "kingdomdesigns"],
    "customtransfers": ["custom-transfers", "customtransfers", "custom transfers"],
    "roosterdtf": ["rooster dtf", "roosterdtf", "rooster dtf transfer co"],
    "highlyflavored": ["highly flavored", "highlyflavored"],
    "cobradtf": ["cobra dtf", "cobradtf"],
    "dtfsheet": ["dtfsheet", "dtf sheet"],
}

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


# ─── Public interface (signatures unchanged) ──────────────────────────────────

async def scrape_competitor(
    competitor_id: UUID,
    db: AsyncSession,
    trigger: str = "manual",
) -> ScrapeRun:
    """
    Scrape all active ads for a competitor from Meta Ad Library using Playwright.
    Returns the ScrapeRun record with results.
    """
    competitor = await db.get(Competitor, competitor_id)
    if not competitor:
        raise ValueError(f"Competitor {competitor_id} not found")

    # Create scrape run record
    run = ScrapeRun(
        competitor_id=competitor_id,
        status="running",
        ads_found=0,
        new_ads=0,
        ended_ads=0,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    start_time = datetime.now(timezone.utc)

    try:
        # Get existing ad_library_ids for dedup
        existing_stmt = select(Ad).where(
            Ad.competitor_id == competitor_id,
            Ad.ad_library_id.isnot(None),
        )
        existing_ads = (await db.execute(existing_stmt)).scalars().all()
        existing_map = {ad.ad_library_id: ad for ad in existing_ads if ad.ad_library_id}
        existing_ids = set(existing_map.keys())
        existing_count_before = len(existing_map)

        # Fetch all ads via Playwright
        scraped_ads = await _fetch_all_ads(competitor, existing_ids)

        # SAFETY: If scrape returned 0 and we had existing ads, do NOTHING.
        # This protects against Meta throttling / transient failures.
        if len(scraped_ads) == 0 and existing_count_before > 0:
            duration = int((datetime.now(timezone.utc) - start_time).total_seconds())
            run.ads_found = 0
            run.new_ads = 0
            run.ended_ads = 0
            run.status = "completed"
            run.duration_seconds = duration
            run.error_message = f"Empty result (Meta returned 0). {existing_count_before} existing ads preserved."
            await db.commit()
            await db.refresh(run)
            logger.warning(
                f"[scraper] EMPTY RUN for {competitor.name}: 0 ads returned, "
                f"{existing_count_before} existing ads PRESERVED (no changes made)"
            )
            print(f"[SCRAPER] SAFETY: 0 ads returned, {existing_count_before} existing ads preserved unchanged.")
            return run

        # Track which library IDs we found in this scrape
        found_library_ids = set()
        new_count = 0

        for ad_data in scraped_ads:
            library_id = ad_data.get("library_id")
            if not library_id:
                # Generate a synthetic ID from hook + creative to avoid duplication
                hook_part = (ad_data.get("hook") or "")[:50]
                creative_part = (ad_data.get("ad_creative_url") or "")[-30:]
                if hook_part or creative_part:
                    import hashlib
                    synthetic = hashlib.md5(f"{hook_part}{creative_part}".encode()).hexdigest()[:16]
                    library_id = f"synth_{synthetic}"
                else:
                    continue  # Truly empty ad, skip

            found_library_ids.add(library_id)

            if library_id in existing_map:
                # Existing ad — update last_seen, keep active
                existing_ad = existing_map[library_id]
                existing_ad.last_seen = datetime.now(timezone.utc)
                existing_ad.status = "approved"
                # Update screenshot if we got a new one
                if ad_data.get("screenshot_url"):
                    existing_ad.screenshot_url = ad_data["screenshot_url"]
            else:
                # New ad — check DB again (belt-and-suspenders dedup)
                # This catches cases where existing_map missed it (e.g. race condition)
                double_check = await db.execute(
                    select(Ad).where(
                        Ad.competitor_id == competitor_id,
                        Ad.ad_library_id == library_id,
                    )
                )
                already_exists = double_check.scalar_one_or_none()
                if already_exists:
                    # Update existing instead of inserting duplicate
                    already_exists.last_seen = datetime.now(timezone.utc)
                    already_exists.status = "approved"
                    if ad_data.get("screenshot_url"):
                        already_exists.screenshot_url = ad_data["screenshot_url"]
                    existing_map[library_id] = already_exists  # Add to map for future checks
                else:
                    # Genuinely new ad — insert
                    active_since = _parse_active_since(ad_data.get("active_since"))
                    first_seen_dt = (
                        datetime(active_since.year, active_since.month, active_since.day, tzinfo=timezone.utc)
                        if active_since else datetime.now(timezone.utc)
                    )

                    new_ad = Ad(
                        competitor_id=competitor_id,
                        ad_library_id=library_id,
                        platform=",".join(ad_data.get("platforms", ["facebook"])),
                        hook=ad_data.get("hook"),
                        headline=ad_data.get("hook"),
                        primary_text=ad_data.get("body_copy"),
                        cta=ad_data.get("cta_text"),
                        advertiser_name=ad_data.get("advertiser_name"),
                        domain=ad_data.get("domain"),
                        ad_url=f"https://www.facebook.com/ads/library/?id={library_id}",
                        landing_url=ad_data.get("landing_url"),
                        media_url=ad_data.get("ad_creative_url"),
                        screenshot_url=ad_data.get("screenshot_url"),
                        ad_video_url=ad_data.get("ad_video_url"),
                        video_poster_url=ad_data.get("video_poster_url"),
                        is_video=ad_data.get("is_video", False),
                        has_multiple_versions=ad_data.get("has_multiple_versions", False),
                        active_since=active_since,
                        days_running=ad_data.get("days_running", 0),
                        first_seen=first_seen_dt,
                        last_seen=datetime.now(timezone.utc),
                        captured_at=datetime.now(timezone.utc),
                        status="approved",
                        variants=1 if ad_data.get("has_multiple_versions") else 0,
                    )
                    db.add(new_ad)
                    new_count += 1

        # Mark ads no longer found as inactive — BUT only if the run was healthy.
        # A "healthy" run means we found a reasonable number of ads (not 0 or far
        # fewer than existing). If the run returned 0 or <30% of existing, it's
        # likely a transient Meta failure — don't nuke existing data.
        ended_count = 0
        existing_active_count = sum(1 for ad in existing_map.values() if ad.status != "flagged")
        run_looks_healthy = (
            len(found_library_ids) > 0
            and (existing_active_count == 0 or len(found_library_ids) >= existing_active_count * 0.3)
        )

        if run_looks_healthy:
            for library_id, existing_ad in existing_map.items():
                if library_id not in found_library_ids and existing_ad.status != "flagged":
                    existing_ad.status = "flagged"
                    existing_ad.last_seen = datetime.now(timezone.utc)
                    ended_count += 1
        elif len(found_library_ids) == 0:
            logger.warning(
                f"[scraper] Run returned 0 ads for {competitor.name} — "
                f"NOT marking {existing_active_count} existing ads as ended (likely transient failure)"
            )
            print(f"[SCRAPER] WARNING: 0 ads returned, preserving {existing_active_count} existing ads")

        # Update run record
        duration = int((datetime.now(timezone.utc) - start_time).total_seconds())
        run.ads_found = len(found_library_ids)
        run.new_ads = new_count
        run.ended_ads = ended_count
        run.status = "completed"
        run.duration_seconds = duration

        # Update competitor last_run
        competitor.last_run = datetime.now(timezone.utc)

        try:
            await db.commit()
        except Exception as commit_err:
            # Handle IntegrityError from unique constraint (duplicate slipped through)
            await db.rollback()
            if "uq_ads_competitor_library_id" in str(commit_err) or "duplicate" in str(commit_err).lower():
                logger.warning(f"[scraper] Duplicate detected during commit for {competitor.name}, retrying without new inserts")
                # Just update the run record without the conflicting inserts
                run.ads_found = len(found_library_ids)
                run.new_ads = 0
                run.ended_ads = 0
                run.status = "completed"
                run.error_message = "Duplicate conflict resolved — no new inserts this run"
                await db.commit()
            else:
                raise
        await db.refresh(run)

        # Trigger AI analysis for new ads — DECOUPLED from scrape status.
        # Analysis failures must NOT mark the scrape as failed.
        if new_count > 0 and settings.AUTO_ANALYZE:
            try:
                new_ads_stmt = select(Ad).where(
                    Ad.competitor_id == competitor_id,
                    Ad.ad_library_id.in_(found_library_ids - set(existing_map.keys())),
                )
                new_ads = (await db.execute(new_ads_stmt)).scalars().all()
                analyzed = 0
                for ad in new_ads[:10]:
                    try:
                        await run_analysis(str(ad.id), db)
                        analyzed += 1
                    except Exception as e:
                        logger.warning(f"[analysis] Failed for ad {ad.id} (non-fatal): {e}")
                        break  # Stop on first failure (likely rate limit) — rest will be picked up by analyze-all
                if analyzed > 0:
                    logger.info(f"[analysis] Analyzed {analyzed}/{len(new_ads[:10])} new ads inline")
            except Exception as e:
                logger.warning(f"[analysis] Inline analysis skipped due to error (non-fatal): {e}")

        logger.info(
            f"Scrape completed for {competitor.name}: "
            f"found={len(found_library_ids)}, new={new_count}, ended={ended_count}"
        )
        return run

    except Exception as e:
        duration = int((datetime.now(timezone.utc) - start_time).total_seconds())
        run.status = "failed"
        run.error_message = str(e)[:500]
        run.duration_seconds = duration
        await db.commit()
        await db.refresh(run)
        logger.error(f"Scrape failed for {competitor.name}: {e}")
        raise


async def run_scheduled_scrape(competitor_id: UUID) -> None:
    """Run a scrape in its own session — used by scheduler."""
    async with AsyncSessionLocal() as db:
        try:
            await scrape_competitor(competitor_id, db, trigger="scheduled")
        except Exception as e:
            logger.error(f"Scheduled scrape failed for {competitor_id}: {e}")


# ─── Playwright internals (ported from proven MetaAdLibraryTarget) ────────────

def _build_url(competitor: Competitor) -> str:
    """Build the Meta Ad Library URL for a competitor."""
    if competitor.page_id:
        params = {
            "active_status": "active",
            "ad_type": "all",
            "country": "US",
            "is_targeted_country": "false",
            "media_type": "all",
            "search_type": "page",
            "sort_data[mode]": "total_impressions",
            "sort_data[direction]": "desc",
            "view_all_page_id": competitor.page_id,
        }
    else:
        params = {
            "country": "US",
            "q": competitor.query or competitor.name,
            "active_status": "active",
            "ad_type": "all",
        }
    return f"{AD_LIBRARY_BASE}?{urllib.parse.urlencode(params)}"


async def _fetch_all_ads(competitor: Competitor, existing_ids: Set[str]) -> List[Dict[str, Any]]:
    """
    Fetch all ads using Playwright — scroll, screenshot, extract.
    Returns list of ad dicts ready for DB insertion.

    NOTE: Runs Playwright in a subprocess to avoid Windows asyncio
    ProactorEventLoop limitations with subprocess creation.
    """
    import json
    import subprocess
    import sys
    import tempfile
    from pathlib import Path

    # Serialize competitor data for the subprocess
    comp_data = {
        "name": competitor.name,
        "page_id": competitor.page_id,
        "query": competitor.query,
        "query_type": competitor.query_type,
    }
    existing_list = list(existing_ids)

    # Write input data to a temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        json.dump({"competitor": comp_data, "existing_ids": existing_list}, f)
        input_file = f.name

    # Output file for results
    output_file = input_file.replace('.json', '_output.json')

    # Run the scraper script as a subprocess
    script_path = str(Path(__file__).parent.parent / "scripts" / "run_scraper.py")
    backend_dir = str(Path(__file__).parent.parent.parent)
    python_exe = sys.executable

    try:
        logger.info(f"[playwright] Launching scraper subprocess for {competitor.name}")
        print(f"[SCRAPER] Launching: python={python_exe}")
        print(f"[SCRAPER] Input: {input_file}")
        print(f"[SCRAPER] Output: {output_file}")
        result = subprocess.run(
            [python_exe, script_path, input_file, output_file],
            capture_output=True,
            text=True,
            timeout=SCRAPE_TIMEOUT,
            cwd=backend_dir,
        )

        print(f"[SCRAPER] Return code: {result.returncode}")
        if result.stdout:
            for line in result.stdout.strip().split('\n')[-5:]:
                print(f"[SCRAPER:out] {line}")
        if result.stderr:
            stderr_lines = result.stderr.strip().split('\n')
            for line in stderr_lines[-15:]:
                print(f"[SCRAPER:err] {line}")

        # Read results — even on non-zero returncode, there might be partial results
        output_path = Path(output_file)
        print(f"[SCRAPER] Output exists: {output_path.exists()}")
        if output_path.exists():
            with open(output_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Handle error report from subprocess
            if isinstance(data, dict) and "error" in data:
                partial = data.get("partial_results", [])
                error_msg = data["error"][:500]
                print(f"[SCRAPER] Subprocess error: {error_msg}")
                print(f"[SCRAPER] Partial results: {len(partial)} ads")
                if partial:
                    return partial
                raise RuntimeError(f"Scraper subprocess failed: {error_msg}")
            else:
                print(f"[SCRAPER] Loaded {len(data)} ads from output")
                return data
        else:
            # No output file — capture full error
            full_stderr = result.stderr[-2000:] if result.stderr else "no stderr"
            error_msg = f"Subprocess exit={result.returncode}, no output. stderr: {full_stderr}"
            print(f"[SCRAPER] {error_msg[:200]}")
            raise RuntimeError(error_msg[:500])

    except subprocess.TimeoutExpired as e:
        logger.warning(f"[playwright] Subprocess timed out after {SCRAPE_TIMEOUT}s")
        print(f"[SCRAPER] TIMEOUT after {SCRAPE_TIMEOUT}s")
        # Try to read partial results
        if Path(output_file).exists():
            with open(output_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if isinstance(data, list):
                print(f"[SCRAPER] Got {len(data)} partial results before timeout")
                return data
        # Return empty but don't crash the run — let scrape_competitor save what it has
        return []
    except RuntimeError:
        raise
    except Exception as e:
        logger.error(f"[playwright] Subprocess error: {e}")
        raise
    finally:
        # Cleanup temp files
        try:
            Path(input_file).unlink(missing_ok=True)
            Path(output_file).unlink(missing_ok=True)
        except Exception:
            pass


def _dismiss_popups_sync(page) -> None:
    """Dismiss cookie banners, login walls, etc. (sync version)."""
    popup_selectors = [
        "button:has-text('Allow all cookies')",
        "button:has-text('Decline optional cookies')",
        "button:has-text('Decline')",
        "[aria-label='Close']",
        "div[aria-label='Close']",
    ]
    for sel in popup_selectors:
        try:
            page.click(sel, timeout=2000)
            import time
            time.sleep(1)
        except Exception:
            continue


def _scroll_to_load_all_ads_sync(page, max_scrolls: int = 60) -> int:
    """
    Aggressively scroll to load ALL ads (sync version).
    Stops when card count stable for 4 iterations.
    """
    import time
    prev_count = 0
    stable_iterations = 0
    max_stable = 4

    logger.info(f"[playwright] Starting aggressive scroll (max {max_scrolls})...")

    for i in range(max_scrolls):
        cards_a = page.query_selector_all("div._7jyh")
        cards_b = page.query_selector_all("div[role='article']")
        cards_c = page.query_selector_all("a[href*='/ads/library/?id=']")

        current_count = max(len(cards_a), len(cards_b), len(cards_c))

        if (i + 1) % 5 == 0 or current_count != prev_count:
            logger.info(
                f"[playwright]   Scroll {i+1}/{max_scrolls}: cards={current_count} "
                f"(_7jyh={len(cards_a)}, articles={len(cards_b)}, links={len(cards_c)})"
            )

        if current_count == prev_count:
            stable_iterations += 1
            if stable_iterations >= max_stable:
                logger.info(f"[playwright]   Stable at {current_count} for {max_stable} iterations. Done.")
                break
        else:
            stable_iterations = 0
            prev_count = current_count

        page.evaluate("""
            window.scrollTo(0, document.body.scrollHeight);
            document.querySelectorAll('[role="main"], [role="feed"]').forEach(el => {
                el.scrollTo(0, el.scrollHeight);
            });
        """)

        time.sleep(3.5)

        # Try clicking "Show more"
        try:
            show_more = page.query_selector("text=/See more results|Show more|Load more/i")
            if show_more:
                show_more.click()
                logger.info(f"[playwright]   Clicked 'Show more' at scroll {i+1}")
                time.sleep(2)
        except Exception:
            pass

    final_count = max(
        len(page.query_selector_all("div._7jyh")),
        len(page.query_selector_all("div[role='article']")),
        len(page.query_selector_all("a[href*='/ads/library/?id=']")),
    )
    logger.info(f"[playwright] === Finished scrolling. Final card count: {final_count} ===")
    return final_count


def _find_all_ad_cards_sync(page) -> list:
    """Find ad cards using multiple selector strategies (sync version)."""
    selectors = [
        "div._7jyh",
        "div[role='article']",
        "div._8nsi",
        "[data-ad-archive-id]",
        "a[href*='/ads/library/?id=']",
    ]
    best_cards = []
    best_count = 0
    best_selector = None

    for sel in selectors:
        try:
            cards = page.query_selector_all(sel)
            if len(cards) > best_count:
                best_count = len(cards)
                best_selector = sel
                best_cards = cards
        except Exception:
            continue

    logger.info(f"[playwright] Best selector: '{best_selector}' with {best_count} cards")
    return best_cards


def _process_card_sync(card, page, idx: int, timestamp: str, brand: str) -> Optional[Dict[str, Any]]:
    """Process one ad card: screenshot + text extraction (sync version)."""
    import time

    ad: Dict[str, Any] = {
        "source": f"meta_ad_library_{brand}",
        "library_id": None,
        "advertiser_name": brand.title(),
        "hook": None,
        "body_copy": None,
        "cta_text": None,
        "landing_url": None,
        "ad_creative_url": None,
        "screenshot_url": None,
        "active_since": None,
        "days_running": 0,
        "is_video": False,
        "ad_video_url": None,
        "video_poster_url": None,
        "has_multiple_versions": False,
        "domain": None,
        "platforms": ["facebook"],
    }

    # ── SCREENSHOT ────────────────────────────────────────────────────────
    try:
        card.scroll_into_view_if_needed(timeout=5000)
        time.sleep(0.3)
        _wait_for_media_load_sync(card)
        screenshot_bytes = card.screenshot(timeout=10000)

        filename = f"ad_library/{brand}/{timestamp}_ad_{idx:03d}.png"
        try:
            from app.core.storage.s3_writer import upload_bytes as _upload
            import asyncio as _aio
            # Run the async upload in a new event loop (we're in a thread)
            loop = _aio.new_event_loop()
            url = loop.run_until_complete(_upload(screenshot_bytes, filename, content_type="image/png"))
            loop.close()
            ad["screenshot_url"] = url
        except Exception as e:
            logger.debug(f"[playwright] S3 upload failed for card {idx}: {e}")
    except Exception as e:
        logger.debug(f"[playwright] Screenshot failed for card {idx}: {e}")

    # ── TEXT EXTRACTION ───────────────────────────────────────────────────
    full_text = ""
    try:
        full_text = card.inner_text()
    except Exception:
        pass

    # Advertiser name
    try:
        els = card.query_selector_all("a span, span[dir='auto'], strong")
        for el in els:
            text = (el.text_content() or "").strip()
            if (text and len(text) > 2 and len(text) < 60
                    and text not in NON_AD_TEXT
                    and not text.startswith("Started")
                    and not text.startswith("http")
                    and not text.startswith("Library")):
                ad["advertiser_name"] = text
                break
    except Exception:
        pass

    # Hook + Body Copy
    try:
        text_blocks = card.query_selector_all("div._7jyr, span[dir='auto']")
        all_texts = []
        for block in text_blocks:
            text = (block.text_content() or "").strip()
            if (text and len(text) > 10
                    and text not in NON_AD_TEXT
                    and not text.startswith("Started running")
                    and text != ad["advertiser_name"]
                    and text not in all_texts):
                all_texts.append(text)

        if len(all_texts) >= 2:
            sorted_texts = sorted(all_texts, key=len)
            ad["hook"] = sorted_texts[0][:200]
            ad["body_copy"] = sorted_texts[-1]
        elif len(all_texts) == 1:
            ad["hook"] = all_texts[0][:200]
            ad["body_copy"] = all_texts[0]
    except Exception:
        pass

    # Ad Creative Image (largest = ad creative)
    try:
        images = card.query_selector_all("img")
        best_url = None
        best_size = 0
        for img in images:
            src = img.get_attribute("src") or ""
            if not src or ("scontent" not in src and "fbcdn" not in src):
                continue
            try:
                width = img.evaluate("el => el.naturalWidth || el.width || 100")
                size = int(width or 0)
            except Exception:
                size = 100
            if size > best_size:
                best_size = size
                best_url = src

        if not best_url:
            for img in reversed(images):
                src = img.get_attribute("src") or ""
                if "scontent" in src or "fbcdn" in src:
                    best_url = src
                    break

        ad["ad_creative_url"] = best_url
    except Exception:
        pass

    # CTA Text + Landing URL
    try:
        cta_els = card.query_selector_all("a[role='button'], div[role='button']")
        for el in cta_els:
            text = (el.text_content() or "").strip()
            if text and (text in KNOWN_CTA_LABELS or text.title() in KNOWN_CTA_LABELS):
                ad["cta_text"] = text
                href = el.get_attribute("href")
                if href:
                    ad["landing_url"] = href
                break
    except Exception:
        pass

    # Date / Days Running
    try:
        match = re.search(
            r"Started running on\s+(\d{1,2})\s+(\w{3,})\s+(\d{4})",
            full_text, re.IGNORECASE,
        )
        if not match:
            for level in range(4):
                try:
                    parent_text = card.evaluate(
                        f"el => {{ let p = el; for(let i=0; i<{level+1}; i++) {{ p = p?.parentElement; }} return p?.innerText || ''; }}"
                    )
                    match = re.search(
                        r"Started running on\s+(\d{1,2})\s+(\w{3,})\s+(\d{4})",
                        parent_text, re.IGNORECASE,
                    )
                    if match:
                        break
                except Exception:
                    continue

        if match:
            day_s, month_s, year_s = match.group(1), match.group(2), match.group(3)
            month_num = MONTH_MAP.get(month_s.lower())
            if month_num:
                active_since = datetime(int(year_s), month_num, int(day_s))
                days = max(0, (datetime.now() - active_since).days)
                ad["active_since"] = active_since.strftime("%Y-%m-%d")
                ad["days_running"] = days
    except Exception:
        pass

    # Video detection
    try:
        video = card.query_selector("video")
        if video:
            ad["is_video"] = True
            ad["ad_video_url"] = video.get_attribute("src") or ""
            poster = video.get_attribute("poster")
            if poster:
                ad["video_poster_url"] = poster
                if not ad["ad_creative_url"]:
                    ad["ad_creative_url"] = poster
    except Exception:
        pass

    # Library ID
    ad["library_id"] = _extract_library_id_sync(card, full_text)

    # Domain
    try:
        domain_match = re.search(
            r"([A-Z][A-Z0-9-]+\.(?:COM|NET|ORG|CO|IO))",
            full_text, re.IGNORECASE,
        )
        if domain_match:
            ad["domain"] = domain_match.group(1).upper()
    except Exception:
        pass

    # Multiple versions
    ad["has_multiple_versions"] = "multiple versions" in full_text.lower()

    # Return if we got something useful
    has_screenshot = bool(ad.get("screenshot_url"))
    has_hook = bool(ad.get("hook"))
    has_image = bool(ad.get("ad_creative_url"))

    if has_screenshot or has_hook or has_image:
        return ad
    return None


def _wait_for_media_load_sync(card):
    """Wait for videos/images in card to load (sync version)."""
    import time
    try:
        videos = card.query_selector_all("video")
        if videos:
            for video in videos:
                try:
                    video.evaluate("""v => {
                        v.muted = true;
                        v.controls = false;
                        v.preload = 'metadata';
                        v.load();
                    }""")
                except Exception:
                    pass
            time.sleep(2.0)
        else:
            time.sleep(0.5)
    except Exception:
        pass


def _extract_library_id_sync(card, full_text: str) -> Optional[str]:
    """Extract Meta's unique library ID (sync version)."""
    # STRATEGY 1: "Library ID: XXXXXXXXXXX" in card text
    try:
        match = re.search(r"Library\s+ID[:\s]*(\d{10,20})", full_text, re.IGNORECASE)
        if match:
            return match.group(1)
    except Exception:
        pass

    # STRATEGY 2: Nested spans/divs
    try:
        id_elements = card.query_selector_all("span, div, p")
        for el in id_elements[:30]:
            text = (el.text_content() or "")[:200]
            if "library id" in text.lower():
                match = re.search(r"(\d{10,20})", text)
                if match:
                    return match.group(1)
    except Exception:
        pass

    # STRATEGY 3: data-ad-archive-id attribute
    try:
        archive_attr = card.get_attribute("data-ad-archive-id")
        if archive_attr and archive_attr.isdigit() and len(archive_attr) >= 10:
            return archive_attr
        nested = card.query_selector("[data-ad-archive-id]")
        if nested:
            attr = nested.get_attribute("data-ad-archive-id")
            if attr and attr.isdigit() and len(attr) >= 10:
                return attr
    except Exception:
        pass

    # STRATEGY 4: Links with id= param
    try:
        all_links = card.query_selector_all("a[href]")
        for link in all_links:
            href = link.get_attribute("href") or ""
            patterns = [
                r"[?&]id=(\d{10,20})",
                r"[?&]archive_id=(\d{10,20})",
                r"/library/(\d{10,20})",
            ]
            for pattern in patterns:
                match = re.search(pattern, href)
                if match:
                    return match.group(1)
    except Exception:
        pass

    # STRATEGY 5: Parent container
    try:
        parent_text = card.evaluate(
            "el => { let p = el; for (let i = 0; i < 3; i++) { p = p?.parentElement; } return p?.innerText || ''; }"
        )
        match = re.search(r"Library\s+ID[:\s]*(\d{10,20})", parent_text, re.IGNORECASE)
        if match:
            return match.group(1)
    except Exception:
        pass

    return None


def _parse_active_since(date_str: Optional[str]) -> Optional[date_type]:
    """Parse 'YYYY-MM-DD' string into a date object."""
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.date()
    except (ValueError, TypeError):
        return None
