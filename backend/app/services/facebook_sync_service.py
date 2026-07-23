"""
Facebook Ads Sync Service — upserts owned-ad data into PostgreSQL.

- full_sync: all ads + daily insights (use for initial import / backfill)
- active_sync: only ACTIVE ads, last N days (use for scheduled refresh)

No Meta ads are modified. Read-only access.
Token, credentials read from settings. Never logged.
"""

import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
from typing import Optional, List

import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.facebook_owned_ad import (
    FacebookOwnedAd,
    FacebookAdInsightsDaily,
    FacebookAdActionsDaily,
    FacebookAdSyncRun,
)
from app.services import facebook_ads_client as fb

logger = logging.getLogger(__name__)

ACTIVE_STATUSES = {"ACTIVE", "APPROVED"}
FB_ACTIVE_AD_SYNC_ENABLED = os.getenv("FB_ACTIVE_AD_SYNC_ENABLED", "true").lower() == "true"
FB_ACTIVE_AD_SYNC_MINUTES = int(os.getenv("FB_ACTIVE_AD_SYNC_MINUTES", "60"))

# Insights fields for daily fetch
DAILY_INSIGHTS_FIELDS = [
    "ad_id", "date_start", "date_stop",
    "impressions", "reach", "frequency", "spend",
    "clicks", "unique_clicks", "inline_link_clicks",
    "ctr", "unique_ctr", "inline_link_click_ctr",
    "cpc", "cpm",
    "actions", "cost_per_action_type",
]


# ─── Running sync state ───────────────────────────────────────────────────────
_active_sync_task: Optional[asyncio.Task] = None
_sync_progress: dict = {"status": "idle", "sync_type": None, "ads_processed": 0, "total": 0}


def get_sync_progress() -> dict:
    return dict(_sync_progress)


async def start_full_sync() -> dict:
    """Trigger full sync of all ads + backfill daily insights. Returns run_id."""
    global _active_sync_task
    if _active_sync_task and not _active_sync_task.done():
        return {"status": "already_running", "progress": _sync_progress}
    run_id = await _create_sync_run("full_sync")
    _active_sync_task = asyncio.create_task(_run_full_sync(run_id))
    return {"status": "started", "run_id": str(run_id)}


async def start_active_sync() -> dict:
    """Trigger sync of ACTIVE ads only (last 7 days insights)."""
    global _active_sync_task
    if _active_sync_task and not _active_sync_task.done():
        return {"status": "already_running", "progress": _sync_progress}
    run_id = await _create_sync_run("scheduled_active")
    _active_sync_task = asyncio.create_task(_run_active_sync(run_id))
    return {"status": "started", "run_id": str(run_id)}


# ─── Background sync tasks ────────────────────────────────────────────────────

async def _run_full_sync(run_id: str):
    """Full sync: fetch all ads + daily insights for each."""
    global _sync_progress
    _sync_progress = {"status": "running", "sync_type": "full_sync", "ads_processed": 0, "total": 0}
    stats = {"ads_received": 0, "ads_inserted": 0, "ads_updated": 0,
             "insight_rows_inserted": 0, "insight_rows_updated": 0,
             "action_rows_inserted": 0, "action_rows_updated": 0, "pages_fetched": 0}
    try:
        ads = await _fetch_all_ads()
        stats["ads_received"] = len(ads)
        stats["pages_fetched"] = _sync_progress.get("pages_fetched", 1)
        _sync_progress["total"] = len(ads)

        async with AsyncSessionLocal() as db:
            for i, ad_raw in enumerate(ads):
                ins, upd = await _upsert_ad(db, ad_raw)
                stats["ads_inserted"] += ins
                stats["ads_updated"] += upd
                _sync_progress["ads_processed"] = i + 1

            # Daily insights (lifetime, time_increment=1)
            for ad_raw in ads:
                ad_id = ad_raw.get("id")
                if not ad_id:
                    continue
                ii, iu, ai, au = await _fetch_and_store_daily_insights(db, ad_id)
                stats["insight_rows_inserted"] += ii
                stats["insight_rows_updated"] += iu
                stats["action_rows_inserted"] += ai
                stats["action_rows_updated"] += au
                await asyncio.sleep(0.3)  # rate limit

        await _complete_sync_run(run_id, "completed", stats)
        _sync_progress["status"] = "completed"
    except Exception as e:
        logger.error(f"[fb-sync] Full sync failed: {e}")
        await _complete_sync_run(run_id, "failed", stats, error=str(e)[:300])
        _sync_progress["status"] = "failed"


async def _run_active_sync(run_id: str):
    """Active sync: only ACTIVE ads, last 7 days insights."""
    global _sync_progress
    _sync_progress = {"status": "running", "sync_type": "scheduled_active", "ads_processed": 0, "total": 0}
    stats = {"ads_received": 0, "ads_inserted": 0, "ads_updated": 0,
             "insight_rows_inserted": 0, "insight_rows_updated": 0,
             "action_rows_inserted": 0, "action_rows_updated": 0, "pages_fetched": 0}
    try:
        ads = await _fetch_all_ads()
        active_ads = [a for a in ads if a.get("effective_status") in ACTIVE_STATUSES]
        stats["ads_received"] = len(active_ads)
        _sync_progress["total"] = len(active_ads)

        async with AsyncSessionLocal() as db:
            for i, ad_raw in enumerate(active_ads):
                ins, upd = await _upsert_ad(db, ad_raw)
                stats["ads_inserted"] += ins
                stats["ads_updated"] += upd
                _sync_progress["ads_processed"] = i + 1

            # Last 7 days daily insights
            since = (datetime.now(timezone.utc) - timedelta(days=7)).date()
            for ad_raw in active_ads:
                ad_id = ad_raw.get("id")
                if not ad_id:
                    continue
                ii, iu, ai, au = await _fetch_and_store_daily_insights(db, ad_id, since=since)
                stats["insight_rows_inserted"] += ii
                stats["insight_rows_updated"] += iu
                stats["action_rows_inserted"] += ai
                stats["action_rows_updated"] += au
                await asyncio.sleep(0.3)

        await _complete_sync_run(run_id, "completed", stats)
        _sync_progress["status"] = "completed"
    except Exception as e:
        logger.error(f"[fb-sync] Active sync failed: {e}")
        await _complete_sync_run(run_id, "failed", stats, error=str(e)[:300])
        _sync_progress["status"] = "failed"


# ─── Core fetch + store helpers ───────────────────────────────────────────────

async def _fetch_all_ads() -> List[dict]:
    """Fetch all ads from the configured account with full pagination."""
    all_ads = []
    after = None
    pages = 0
    while pages < fb.MAX_PAGES:
        pages += 1
        result = await fb.fetch_ads(limit=100, after=after)
        if not result.get("ok"):
            logger.warning(f"[fb-sync] fetch_ads page {pages} failed: {result.get('error')}")
            break
        all_ads.extend(result.get("data", []))
        paging = result.get("paging")
        after = paging.get("after") if paging else None
        if not after:
            break
    _sync_progress["pages_fetched"] = pages
    logger.info(f"[fb-sync] Fetched {len(all_ads)} ads in {pages} pages")
    return all_ads


async def _upsert_ad(db: AsyncSession, ad_raw: dict) -> tuple:
    """UPSERT one ad. Returns (inserted, updated)."""
    now = datetime.now(timezone.utc)
    cr = ad_raw.get("creative") or {}
    camp = ad_raw.get("campaign") or {}
    adset = ad_raw.get("adset") or {}
    oss = cr.get("object_story_spec") or {}
    link_data = oss.get("link_data") or {}

    effective_status = ad_raw.get("effective_status", "")
    is_active = effective_status in ACTIVE_STATUSES

    values = {
        "meta_ad_id": ad_raw["id"],
        "account_id": settings.FB_AD_ACCOUNT_ID,
        "campaign_id": camp.get("id"),
        "campaign_name": camp.get("name"),
        "campaign_objective": camp.get("objective"),
        "campaign_status": camp.get("status"),
        "adset_id": adset.get("id"),
        "adset_name": adset.get("name"),
        "adset_status": adset.get("status"),
        "ad_name": ad_raw.get("name"),
        "configured_status": ad_raw.get("configured_status"),
        "effective_status": effective_status,
        "creative_id": cr.get("id"),
        "creative_name": cr.get("name"),
        "headline": cr.get("title") or link_data.get("name"),
        "primary_text": cr.get("body") or link_data.get("message"),
        "cta_type": cr.get("call_to_action_type") or (link_data.get("call_to_action") or {}).get("type"),
        "destination": link_data.get("link") or cr.get("link_url"),
        "thumbnail_url": cr.get("thumbnail_url"),
        "image_url": cr.get("image_url"),
        "instagram_permalink_url": cr.get("instagram_permalink_url"),
        "preview_shareable_link": ad_raw.get("preview_shareable_link"),
        "effective_object_story_id": cr.get("effective_object_story_id"),
        "is_active": is_active,
        "last_synced_at": now,
        "last_active_at": now if is_active else None,
        "raw_ad_payload": ad_raw,
        "raw_campaign_payload": camp or None,
        "raw_adset_payload": adset or None,
        "raw_creative_payload": cr or None,
        "updated_at": now,
    }

    # Check if exists
    existing = (await db.execute(
        select(FacebookOwnedAd).where(FacebookOwnedAd.meta_ad_id == ad_raw["id"])
    )).scalar_one_or_none()

    if existing:
        for k, v in values.items():
            if k != "first_synced_at":
                setattr(existing, k, v)
        await db.commit()
        return 0, 1
    else:
        values["first_synced_at"] = now
        db.add(FacebookOwnedAd(**values))
        await db.commit()
        return 1, 0


async def _fetch_and_store_daily_insights(
    db: AsyncSession, ad_id: str, since: Optional[date] = None
) -> tuple:
    """Fetch daily Insights (time_increment=1) and upsert rows. Returns (ii, iu, ai, au)."""
    ii = iu = ai = au = 0
    now = datetime.now(timezone.utc)
    headers = {"Authorization": f"Bearer {settings.FB_ACCESS_TOKEN}"}
    base = f"https://graph.facebook.com/{settings.FB_API_VERSION}"

    params = {
        "fields": ",".join(DAILY_INSIGHTS_FIELDS),
        "time_increment": "1",
        "limit": "90",
    }
    if since:
        params["time_range"] = f'{{"since":"{since}","until":"{date.today()}"}}'
    else:
        params["date_preset"] = "maximum"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{base}/{ad_id}/insights", headers=headers, params=params)
            if resp.status_code != 200:
                logger.debug(f"[fb-sync] Insights error for {ad_id}: {resp.status_code}")
                return ii, iu, ai, au
            data = resp.json().get("data", [])
    except Exception as e:
        logger.debug(f"[fb-sync] Insights fetch failed for {ad_id}: {e}")
        return ii, iu, ai, au

    for row in data:
        d_start = _to_date(row.get("date_start"))
        d_stop = _to_date(row.get("date_stop"))
        if not d_start:
            continue

        # Upsert insight row
        insight_values = {
            "meta_ad_id": ad_id,
            "date_start": d_start,
            "date_stop": d_stop or d_start,
            "impressions": _to_int(row.get("impressions")),
            "reach": _to_int(row.get("reach")),
            "frequency": _to_decimal(row.get("frequency")),
            "spend": _to_decimal(row.get("spend")),
            "clicks": _to_int(row.get("clicks")),
            "unique_clicks": _to_int(row.get("unique_clicks")),
            "inline_link_clicks": _to_int(row.get("inline_link_clicks")),
            "ctr": _to_decimal(row.get("ctr")),
            "unique_ctr": _to_decimal(row.get("unique_ctr")),
            "inline_link_click_ctr": _to_decimal(row.get("inline_link_click_ctr")),
            "cpc": _to_decimal(row.get("cpc")),
            "cpm": _to_decimal(row.get("cpm")),
            "raw_insights_payload": row,
            "last_synced_at": now,
            "updated_at": now,
        }

        existing_ins = (await db.execute(
            select(FacebookAdInsightsDaily).where(
                FacebookAdInsightsDaily.meta_ad_id == ad_id,
                FacebookAdInsightsDaily.date_start == d_start,
                FacebookAdInsightsDaily.date_stop == (d_stop or d_start),
            )
        )).scalar_one_or_none()

        if existing_ins:
            for k, v in insight_values.items():
                setattr(existing_ins, k, v)
            iu += 1
        else:
            db.add(FacebookAdInsightsDaily(**insight_values))
            ii += 1

        # Upsert action rows
        for action_src, action_list in [("actions", row.get("actions", [])),
                                         ("cost_per_action_type", row.get("cost_per_action_type", []))]:
            for action in (action_list or []):
                action_type = action.get("action_type")
                if not action_type:
                    continue
                value = _to_decimal(action.get("value"))

                existing_act = (await db.execute(
                    select(FacebookAdActionsDaily).where(
                        FacebookAdActionsDaily.meta_ad_id == ad_id,
                        FacebookAdActionsDaily.date_start == d_start,
                        FacebookAdActionsDaily.action_source == action_src,
                        FacebookAdActionsDaily.action_type == action_type,
                    )
                )).scalar_one_or_none()

                if existing_act:
                    existing_act.value = value
                    existing_act.last_synced_at = now
                    au += 1
                else:
                    db.add(FacebookAdActionsDaily(
                        meta_ad_id=ad_id,
                        date_start=d_start,
                        action_source=action_src,
                        action_type=action_type,
                        value=value,
                        raw_action_payload=action,
                        last_synced_at=now,
                    ))
                    ai += 1

    await db.commit()
    return ii, iu, ai, au


# ─── Sync run lifecycle ───────────────────────────────────────────────────────

async def _create_sync_run(sync_type: str) -> str:
    async with AsyncSessionLocal() as db:
        run = FacebookAdSyncRun(
            account_id=settings.FB_AD_ACCOUNT_ID,
            sync_type=sync_type,
            status="running",
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)
        return str(run.id)


async def _complete_sync_run(run_id: str, status: str, stats: dict, error: str = None):
    async with AsyncSessionLocal() as db:
        run = await db.get(FacebookAdSyncRun, run_id)
        if run:
            run.status = status
            run.completed_at = datetime.now(timezone.utc)
            for k, v in stats.items():
                if hasattr(run, k):
                    setattr(run, k, v)
            if error:
                run.sanitized_error = {"message": error}
            await db.commit()


# ─── Scheduler integration ────────────────────────────────────────────────────

_scheduler_task: Optional[asyncio.Task] = None


async def start_fb_scheduler():
    """Start the scheduled active-ad sync loop."""
    global _scheduler_task
    if FB_ACTIVE_AD_SYNC_ENABLED and (not _scheduler_task or _scheduler_task.done()):
        _scheduler_task = asyncio.create_task(_fb_sync_loop())
        logger.info(f"[fb-sync] Scheduler started (every {FB_ACTIVE_AD_SYNC_MINUTES}m)")


async def stop_fb_scheduler():
    global _scheduler_task
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()


async def _fb_sync_loop():
    """Periodically refresh active ads."""
    while True:
        await asyncio.sleep(FB_ACTIVE_AD_SYNC_MINUTES * 60)
        if not fb.is_configured():
            continue
        try:
            logger.info("[fb-sync] Scheduled active sync starting")
            await start_active_sync()
        except Exception as e:
            logger.error(f"[fb-sync] Scheduled sync error: {e}")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _to_int(v) -> Optional[int]:
    if v is None or v == "":
        return None
    try:
        return int(v)
    except (ValueError, TypeError):
        return None


def _to_decimal(v) -> Optional[Decimal]:
    if v is None or v == "":
        return None
    try:
        return Decimal(str(v))
    except Exception:
        return None


def _to_date(v) -> Optional[date]:
    if not v:
        return None
    try:
        from datetime import datetime as dt
        return dt.strptime(v, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None
