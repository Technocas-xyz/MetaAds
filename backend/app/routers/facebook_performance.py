"""
Own Ads Performance Report — aggregates Facebook Marketing API data into
a ranked report with winner categories and messaging metrics.

Reuses the existing facebook_ads_client. No separate Meta integration.
No data persistence (Phase 1). Generated from live API data.
"""

import logging
import os
from collections import Counter
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.competitor import Competitor
from app.config import settings
from app.services import facebook_ads_client as fb
from app.database import AsyncSessionLocal

router = APIRouter(prefix="/facebook/performance", tags=["facebook-performance"])
logger = logging.getLogger(__name__)

# Eligibility thresholds
MIN_IMPRESSIONS = 1000
MIN_SPEND = 20.0
MIN_CONVERSATIONS = 10


def _extract_action(actions, action_type):
    """Get value for a specific action_type from actions list."""
    if not actions:
        return 0
    for a in actions:
        if a.get("action_type") == action_type:
            return float(a.get("value", 0))
    return 0


def _extract_cost(cost_per_action, action_type):
    """Get cost for a specific action_type."""
    if not cost_per_action:
        return 0
    for a in cost_per_action:
        if a.get("action_type") == action_type:
            return float(a.get("value", 0))
    return 0


def _process_ad(ad_raw: dict) -> dict:
    """Process a raw FB ad into a report row with derived metrics."""
    ins = ad_raw.get("_insights") or {}
    cr = ad_raw.get("creative") or {}
    camp = ad_raw.get("campaign") or {}
    adset = ad_raw.get("adset") or {}
    actions = ins.get("actions", [])
    cost_per_action = ins.get("cost_per_action_type", [])

    spend = float(ins.get("spend", 0))
    impressions = int(ins.get("impressions", 0))
    reach = int(ins.get("reach", 0))
    frequency = float(ins.get("frequency", 0))
    clicks = int(ins.get("clicks", 0))
    unique_clicks = int(ins.get("unique_clicks", 0))
    inline_link_clicks = int(ins.get("inline_link_clicks", 0))
    ctr = float(ins.get("ctr", 0))
    unique_ctr = float(ins.get("unique_ctr", 0))
    inline_link_click_ctr = float(ins.get("inline_link_click_ctr", 0))
    cpc = float(ins.get("cpc", 0))
    cpm = float(ins.get("cpm", 0))

    # Messaging
    conversations = _extract_action(actions, "onsite_conversion.messaging_conversation_started_7d")
    first_replies = _extract_action(actions, "onsite_conversion.messaging_first_reply")
    replied_convos = _extract_action(actions, "onsite_conversion.messaging_conversation_replied_7d")
    welcome_views = _extract_action(actions, "onsite_conversion.messaging_welcome_message_view")
    depth2 = _extract_action(actions, "onsite_conversion.messaging_user_depth_2_message_send")
    depth3 = _extract_action(actions, "onsite_conversion.messaging_user_depth_3_message_send")
    depth5 = _extract_action(actions, "onsite_conversion.messaging_user_depth_5_message_send")
    blocks = _extract_action(actions, "onsite_conversion.messaging_block")
    cost_per_convo = _extract_cost(cost_per_action, "onsite_conversion.messaging_conversation_started_7d")
    cost_per_reply = _extract_cost(cost_per_action, "onsite_conversion.messaging_first_reply")

    # Derived rates (only when denominator > 0)
    welcome_to_convo = (conversations / welcome_views * 100) if welcome_views > 0 else None
    convo_to_reply = (first_replies / conversations * 100) if conversations > 0 else None
    link_to_convo = (conversations / inline_link_clicks * 100) if inline_link_clicks > 0 else None
    block_rate = (blocks / conversations * 100) if conversations > 0 else None
    convos_per_100 = (conversations / spend * 100) if spend > 0 else None

    # Eligibility
    eligible = impressions >= MIN_IMPRESSIONS or spend >= MIN_SPEND or conversations >= MIN_CONVERSATIONS

    return {
        "id": ad_raw.get("id"),
        "name": ad_raw.get("name"),
        "campaign": camp.get("name"),
        "campaign_id": camp.get("id"),
        "campaign_objective": camp.get("objective"),
        "adset": adset.get("name"),
        "adset_id": adset.get("id"),
        "status": ad_raw.get("effective_status"),
        "created_time": ad_raw.get("created_time"),
        "thumbnail_url": cr.get("thumbnail_url") or cr.get("image_url"),
        # Performance
        "spend": spend,
        "impressions": impressions,
        "reach": reach,
        "frequency": frequency,
        "clicks": clicks,
        "unique_clicks": unique_clicks,
        "inline_link_clicks": inline_link_clicks,
        "ctr": ctr,
        "unique_ctr": unique_ctr,
        "inline_link_click_ctr": inline_link_click_ctr,
        "cpc": cpc,
        "cpm": cpm,
        # Messaging
        "conversations": conversations,
        "first_replies": first_replies,
        "replied_convos": replied_convos,
        "welcome_views": welcome_views,
        "depth2": depth2,
        "depth3": depth3,
        "depth5": depth5,
        "blocks": blocks,
        "cost_per_convo": cost_per_convo,
        "cost_per_reply": cost_per_reply,
        # Derived
        "welcome_to_convo_rate": welcome_to_convo,
        "convo_to_reply_rate": convo_to_reply,
        "link_to_convo_rate": link_to_convo,
        "block_rate": block_rate,
        "convos_per_100_spend": convos_per_100,
        # Eligibility
        "eligible": eligible,
        "date_start": ins.get("date_start"),
        "date_stop": ins.get("date_stop"),
    }


def _score_ad(ad: dict) -> float:
    """Deterministic scoring. Higher = better."""
    if not ad["eligible"]:
        return -1

    score = 0.0
    # Cost per conversation (lower is better, max 30 pts)
    if ad["cost_per_convo"] and ad["cost_per_convo"] > 0:
        score += max(0, 30 - ad["cost_per_convo"])
    # Conversation volume (max 20 pts)
    score += min(20, ad["conversations"] * 0.5)
    # First reply rate (max 15 pts)
    if ad["convo_to_reply_rate"]:
        score += min(15, ad["convo_to_reply_rate"] * 0.15)
    # CTR (max 10 pts)
    score += min(10, ad["ctr"] * 5)
    # Low block rate (max 10 pts)
    if ad["block_rate"] is not None:
        score += max(0, 10 - ad["block_rate"] * 2)
    else:
        score += 5  # No blocks = neutral
    # Messaging depth (max 10 pts)
    if ad["conversations"] > 0:
        depth_rate = (ad["depth3"] / ad["conversations"]) * 100 if ad["conversations"] > 0 else 0
        score += min(10, depth_rate * 0.2)
    # Delivery (max 5 pts for reach/spend efficiency)
    if ad["spend"] > 0 and ad.get("reach") and ad["reach"] > 0:
        reach_per_dollar = ad["reach"] / ad["spend"]
        score += min(5, reach_per_dollar * 0.01)
    elif ad["spend"] > 0 and ad["impressions"] > 0:
        # Fallback: use impressions if reach unavailable
        imp_per_dollar = ad["impressions"] / ad["spend"]
        score += min(5, imp_per_dollar * 0.005)

    return round(score, 2)


@router.get("/report")
async def get_performance_report(
    date_preset: Optional[str] = Query("maximum"),
    status_filter: Optional[str] = Query(None),
    campaign: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate the own-ads performance report from STORED PostgreSQL data.
    Does NOT call Meta. Data comes from the sync service.
    """
    from app.models.facebook_owned_ad import (
        FacebookOwnedAd, FacebookAdInsightsDaily, FacebookAdActionsDaily, FacebookAdSyncRun
    )
    from sqlalchemy import func, desc
    from decimal import Decimal

    # Load all stored ads
    ads_stmt = select(FacebookOwnedAd)
    if status_filter:
        ads_stmt = ads_stmt.where(FacebookOwnedAd.effective_status == status_filter)
    if campaign:
        ads_stmt = ads_stmt.where(FacebookOwnedAd.campaign_name == campaign)
    stored_ads = (await db.execute(ads_stmt)).scalars().all()

    if not stored_ads:
        return {"ok": False, "error": "No ads stored yet. Run a Full Sync first.", "ads": []}

    # For each ad, aggregate insights from daily rows
    processed = []
    for ad in stored_ads:
        # Sum daily insights
        ins_stmt = select(
            func.sum(FacebookAdInsightsDaily.impressions).label("impressions"),
            func.sum(FacebookAdInsightsDaily.spend).label("spend"),
            func.sum(FacebookAdInsightsDaily.clicks).label("clicks"),
            func.sum(FacebookAdInsightsDaily.unique_clicks).label("unique_clicks"),
            func.sum(FacebookAdInsightsDaily.inline_link_clicks).label("inline_link_clicks"),
            func.min(FacebookAdInsightsDaily.date_start).label("date_start"),
            func.max(FacebookAdInsightsDaily.date_stop).label("date_stop"),
        ).where(FacebookAdInsightsDaily.meta_ad_id == ad.meta_ad_id)
        ins_row = (await db.execute(ins_stmt)).one_or_none()

        impressions = int(ins_row.impressions or 0) if ins_row else 0
        spend = float(ins_row.spend or 0) if ins_row else 0
        clicks = int(ins_row.clicks or 0) if ins_row else 0
        unique_clicks = int(ins_row.unique_clicks or 0) if ins_row else 0
        inline_link_clicks = int(ins_row.inline_link_clicks or 0) if ins_row else 0
        date_start = str(ins_row.date_start) if ins_row and ins_row.date_start else None
        date_stop = str(ins_row.date_stop) if ins_row and ins_row.date_stop else None

        # Blended metrics (not averaged)
        ctr = (clicks / impressions * 100) if impressions > 0 else 0
        cpc = (spend / clicks) if clicks > 0 else 0
        cpm = (spend / impressions * 1000) if impressions > 0 else 0

        # Actions (sum across daily rows)
        action_stmt = select(
            FacebookAdActionsDaily.action_type,
            func.sum(FacebookAdActionsDaily.value).label("total"),
        ).where(
            FacebookAdActionsDaily.meta_ad_id == ad.meta_ad_id,
            FacebookAdActionsDaily.action_source == "actions",
        ).group_by(FacebookAdActionsDaily.action_type)
        action_rows = (await db.execute(action_stmt)).all()
        action_map = {r.action_type: float(r.total or 0) for r in action_rows}

        # Cost per action
        cost_stmt = select(
            FacebookAdActionsDaily.action_type,
            func.sum(FacebookAdActionsDaily.value).label("total"),
        ).where(
            FacebookAdActionsDaily.meta_ad_id == ad.meta_ad_id,
            FacebookAdActionsDaily.action_source == "cost_per_action_type",
        ).group_by(FacebookAdActionsDaily.action_type)
        cost_rows = (await db.execute(cost_stmt)).all()
        # For cost_per_action, we need average not sum
        # Actually cost_per_action_type is per-day already; we need total_spend / total_actions
        # Use action_map for counts and compute cost = spend / count

        conversations = action_map.get("onsite_conversion.messaging_conversation_started_7d", 0)
        first_replies = action_map.get("onsite_conversion.messaging_first_reply", 0)
        replied_convos = action_map.get("onsite_conversion.messaging_conversation_replied_7d", 0)
        welcome_views = action_map.get("onsite_conversion.messaging_welcome_message_view", 0)
        depth2 = action_map.get("onsite_conversion.messaging_user_depth_2_message_send", 0)
        depth3 = action_map.get("onsite_conversion.messaging_user_depth_3_message_send", 0)
        depth5 = action_map.get("onsite_conversion.messaging_user_depth_5_message_send", 0)
        blocks = action_map.get("onsite_conversion.messaging_block", 0)

        cost_per_convo = (spend / conversations) if conversations > 0 else 0
        cost_per_reply = (spend / first_replies) if first_replies > 0 else 0
        welcome_to_convo = (conversations / welcome_views * 100) if welcome_views > 0 else None
        convo_to_reply = (first_replies / conversations * 100) if conversations > 0 else None
        link_to_convo = (conversations / inline_link_clicks * 100) if inline_link_clicks > 0 else None
        block_rate = (blocks / conversations * 100) if conversations > 0 else None
        convos_per_100 = (conversations / spend * 100) if spend > 0 else None

        eligible = impressions >= MIN_IMPRESSIONS or spend >= MIN_SPEND or conversations >= MIN_CONVERSATIONS

        processed.append({
            "id": str(ad.id),
            "meta_ad_id": ad.meta_ad_id,
            "name": ad.ad_name,
            "campaign": ad.campaign_name,
            "campaign_id": ad.campaign_id,
            "campaign_objective": ad.campaign_objective,
            "adset": ad.adset_name,
            "adset_id": ad.adset_id,
            "status": ad.effective_status,
            "created_time": ad.meta_created_time.isoformat() if ad.meta_created_time else None,
            "thumbnail_url": ad.thumbnail_url,
            "spend": round(spend, 2),
            "impressions": impressions,
            "reach": None,  # Not summing daily reach — see note
            "frequency": None,
            "clicks": clicks,
            "unique_clicks": unique_clicks,
            "inline_link_clicks": inline_link_clicks,
            "ctr": round(ctr, 4),
            "unique_ctr": 0,
            "inline_link_click_ctr": round((inline_link_clicks / impressions * 100) if impressions > 0 else 0, 4),
            "cpc": round(cpc, 2),
            "cpm": round(cpm, 2),
            "conversations": conversations,
            "first_replies": first_replies,
            "replied_convos": replied_convos,
            "welcome_views": welcome_views,
            "depth2": depth2,
            "depth3": depth3,
            "depth5": depth5,
            "blocks": blocks,
            "cost_per_convo": round(cost_per_convo, 2),
            "cost_per_reply": round(cost_per_reply, 2),
            "welcome_to_convo_rate": welcome_to_convo,
            "convo_to_reply_rate": convo_to_reply,
            "link_to_convo_rate": link_to_convo,
            "block_rate": block_rate,
            "convos_per_100_spend": convos_per_100,
            "eligible": eligible,
            "date_start": date_start,
            "date_stop": date_stop,
        })

    # Score and rank
    for ad in processed:
        ad["score"] = _score_ad(ad)

    eligible_ads = [a for a in processed if a["eligible"]]
    ineligible_ads = [a for a in processed if not a["eligible"]]
    ranked = sorted(eligible_ads, key=lambda x: x["score"], reverse=True)
    for i, ad in enumerate(ranked, 1):
        ad["rank"] = i
    for ad in ineligible_ads:
        ad["rank"] = None

    # Summary totals (blended from DB)
    total_spend = sum(a["spend"] for a in processed)
    total_impressions = sum(a["impressions"] for a in processed)
    total_clicks = sum(a["clicks"] for a in processed)
    total_link_clicks = sum(a["inline_link_clicks"] for a in processed)
    total_convos = sum(a["conversations"] for a in processed)
    total_first_replies = sum(a["first_replies"] for a in processed)
    total_replied = sum(a["replied_convos"] for a in processed)
    active_count = sum(1 for a in processed if a["status"] == "ACTIVE")
    paused_count = sum(1 for a in processed if a["status"] == "PAUSED")

    summary = {
        "total_ads": len(processed),
        "active_ads": active_count,
        "paused_ads": paused_count,
        "total_spend": round(total_spend, 2),
        "total_impressions": total_impressions,
        "total_reach": None,  # Cannot sum daily reach as unique period reach
        "reach_note": "Daily reach cannot be summed as unique period reach. Use aggregate-period queries for exact reach.",
        "blended_frequency": None,
        "total_clicks": total_clicks,
        "total_link_clicks": total_link_clicks,
        "total_conversations": total_convos,
        "total_first_replies": total_first_replies,
        "total_replied_convos": total_replied,
        "blended_ctr": round(total_clicks / total_impressions * 100, 4) if total_impressions > 0 else 0,
        "blended_cpc": round(total_spend / total_clicks, 2) if total_clicks > 0 else 0,
        "blended_cpm": round(total_spend / total_impressions * 1000, 2) if total_impressions > 0 else 0,
        "cost_per_conversation": round(total_spend / total_convos, 2) if total_convos > 0 else 0,
    }

    # Winners
    winners = {}
    if eligible_ads:
        winners["best_overall"] = ranked[0] if ranked else None
        by_convos = sorted(eligible_ads, key=lambda x: x["conversations"], reverse=True)
        winners["most_conversations"] = by_convos[0] if by_convos else None
        with_convos = [a for a in eligible_ads if a["cost_per_convo"] and a["cost_per_convo"] > 0]
        if with_convos:
            winners["lowest_cost_per_convo"] = sorted(with_convos, key=lambda x: x["cost_per_convo"])[0]
        winners["best_ctr"] = sorted(eligible_ads, key=lambda x: x["ctr"], reverse=True)[0]
        with_replies = [a for a in eligible_ads if a["convo_to_reply_rate"] and a["convo_to_reply_rate"] > 0]
        if with_replies:
            winners["best_conversation_quality"] = sorted(with_replies, key=lambda x: x["convo_to_reply_rate"], reverse=True)[0]
        with_eff = [a for a in eligible_ads if a["convos_per_100_spend"] and a["convos_per_100_spend"] > 0]
        if with_eff:
            winners["best_low_budget"] = sorted(with_eff, key=lambda x: x["convos_per_100_spend"], reverse=True)[0]

    # Competitor patterns
    comp_patterns = await _get_competitor_patterns(db)

    # Data freshness
    last_sync_stmt = select(FacebookAdSyncRun).where(
        FacebookAdSyncRun.status == "completed"
    ).order_by(desc(FacebookAdSyncRun.completed_at)).limit(1)
    last_sync = (await db.execute(last_sync_stmt)).scalar_one_or_none()

    campaigns_list = list(set(a["campaign"] for a in processed if a["campaign"]))

    return {
        "ok": True,
        "source": "database",
        "account_id": settings.FB_AD_ACCOUNT_ID[:10] + "...",
        "api_version": settings.FB_API_VERSION,
        "reporting_period": "stored daily data (all synced dates)",
        "ads_total": len(stored_ads),
        "ads_with_insights": sum(1 for a in processed if a["impressions"] > 0),
        "ads_without_insights": sum(1 for a in processed if a["impressions"] == 0),
        "summary": summary,
        "winners": winners,
        "ads": ranked + ineligible_ads,
        "insufficient_data_ads": ineligible_ads,
        "competitor_patterns": comp_patterns,
        "campaigns": campaigns_list,
        "data_freshness": {
            "ads_stored": len(stored_ads),
            "active_ads": active_count,
            "last_sync": last_sync.completed_at.isoformat() if last_sync else None,
            "last_sync_status": last_sync.status if last_sync else None,
            "scheduler_interval_minutes": int(os.getenv("FB_ACTIVE_AD_SYNC_MINUTES", "60")),
        },
        "methodology": {
            "eligibility": {
                "min_impressions": MIN_IMPRESSIONS,
                "min_spend": MIN_SPEND,
                "min_conversations": MIN_CONVERSATIONS,
                "rule": "At least one threshold must be met",
            },
            "scoring": {
                "cost_per_conversation": "30 pts max (lower cost = more points)",
                "conversation_volume": "20 pts max",
                "first_reply_rate": "15 pts max",
                "ctr": "10 pts max",
                "low_block_rate": "10 pts max",
                "messaging_depth": "10 pts max",
                "delivery_efficiency": "5 pts max",
                "total_possible": 100,
            },
            "reach_note": "Reach is not displayed because daily reach cannot be summed as unique period reach.",
        },
    }


async def _get_competitor_patterns(db: AsyncSession) -> dict:
    """Get competitor creative patterns from existing DB for comparison."""
    stmt = (
        select(Ad, AdAnalysis)
        .join(AdAnalysis, Ad.id == AdAnalysis.ad_id)
        .join(Competitor, Ad.competitor_id == Competitor.id)
        .where(Competitor.is_own_brand == False, Ad.days_running >= 30)
        .order_by(Ad.days_running.desc())
        .limit(100)
    )
    rows = (await db.execute(stmt)).all()
    if not rows:
        return {"has_data": False}

    hooks = Counter()
    angles = Counter()
    offers = Counter()
    formats = Counter()
    for ad, analysis in rows:
        w = ad.days_running
        if analysis.hook_type:
            hooks[analysis.hook_type] += w
        if analysis.angle:
            angles[analysis.angle] += w
        if analysis.offer_type and analysis.offer_type != "None":
            offers[analysis.offer_type] += w
        formats["video" if ad.is_video else "image"] += w

    return {
        "has_data": True,
        "winners_analyzed": len(rows),
        "top_hooks": [{"type": k, "score": v} for k, v in hooks.most_common(5)],
        "top_angles": [{"type": k, "score": v} for k, v in angles.most_common(5)],
        "top_offers": [{"type": k, "score": v} for k, v in offers.most_common(5)],
        "dominant_format": "video" if formats.get("video", 0) > formats.get("image", 0) else "image",
        "note": "Competitor patterns based on days_running (longevity). No competitor CTR/CPC/spend data exists.",
    }


# ─── Sync endpoints ───────────────────────────────────────────────────────────

@router.post("/sync/full", status_code=202)
async def trigger_full_sync(current_user: User = Depends(get_current_user)):
    """Trigger a full sync: all ads + daily insights. Returns 202 immediately."""
    from app.services.facebook_sync_service import start_full_sync
    return await start_full_sync()


@router.post("/sync/active", status_code=202)
async def trigger_active_sync(current_user: User = Depends(get_current_user)):
    """Trigger active-ads sync (last 7 days). Returns 202 immediately."""
    from app.services.facebook_sync_service import start_active_sync
    return await start_active_sync()


@router.get("/sync/status")
async def get_sync_status(current_user: User = Depends(get_current_user)):
    """Return current sync progress."""
    from app.services.facebook_sync_service import get_sync_progress
    from app.models.facebook_owned_ad import FacebookAdSyncRun
    progress = get_sync_progress()
    # Last 5 sync runs
    async with AsyncSessionLocal() as db:
        from sqlalchemy import desc
        runs_stmt = select(FacebookAdSyncRun).order_by(desc(FacebookAdSyncRun.started_at)).limit(5)
        runs = (await db.execute(runs_stmt)).scalars().all()
        history = [
            {
                "id": str(r.id),
                "sync_type": r.sync_type,
                "status": r.status,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                "ads_received": r.ads_received,
                "ads_inserted": r.ads_inserted,
                "ads_updated": r.ads_updated,
                "insight_rows_inserted": r.insight_rows_inserted,
            }
            for r in runs
        ]
    return {"current": progress, "history": history}


@router.get("/sync/ads")
async def list_stored_ads(
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all stored Facebook own-brand ads from PostgreSQL."""
    from app.models.facebook_owned_ad import FacebookOwnedAd
    stmt = select(FacebookOwnedAd)
    if status_filter:
        stmt = stmt.where(FacebookOwnedAd.effective_status == status_filter)
    ads = (await db.execute(stmt.order_by(FacebookOwnedAd.last_synced_at.desc()))).scalars().all()
    return {
        "total": len(ads),
        "ads": [
            {
                "meta_ad_id": a.meta_ad_id,
                "ad_name": a.ad_name,
                "effective_status": a.effective_status,
                "campaign_name": a.campaign_name,
                "last_synced_at": a.last_synced_at.isoformat() if a.last_synced_at else None,
                "thumbnail_url": a.thumbnail_url,
            }
            for a in ads
        ],
    }
