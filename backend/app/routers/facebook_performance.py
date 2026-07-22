"""
Own Ads Performance Report — aggregates Facebook Marketing API data into
a ranked report with winner categories and messaging metrics.

Reuses the existing facebook_ads_client. No separate Meta integration.
No data persistence (Phase 1). Generated from live API data.
"""

import logging
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
    if ad["spend"] > 0:
        reach_per_dollar = ad["reach"] / ad["spend"]
        score += min(5, reach_per_dollar * 0.01)

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
    Generate the own-ads performance report from live Facebook API data.
    Fetches all ads with complete pagination, ranks them, identifies winners.
    """
    if not fb.is_configured():
        return {"ok": False, "error": "Facebook API not configured"}

    # Fetch all ads with pagination
    all_ads = []
    after = None
    pages = 0
    while pages < fb.MAX_PAGES:
        pages += 1
        result = await fb.fetch_ads(limit=100, after=after, date_preset=date_preset)
        if not result.get("ok"):
            if pages == 1:
                return {"ok": False, "error": result.get("error", "API error")}
            break
        all_ads.extend(result.get("data", []))
        paging = result.get("paging")
        if paging and paging.get("after"):
            after = paging["after"]
        else:
            break

    # Process ads
    processed = [_process_ad(ad) for ad in all_ads]

    # Apply filters
    if status_filter:
        processed = [a for a in processed if a["status"] == status_filter]
    if campaign:
        processed = [a for a in processed if a["campaign"] == campaign]

    # Score and rank
    for ad in processed:
        ad["score"] = _score_ad(ad)

    eligible = [a for a in processed if a["eligible"]]
    ineligible = [a for a in processed if not a["eligible"]]
    ranked = sorted(eligible, key=lambda x: x["score"], reverse=True)
    for i, ad in enumerate(ranked, 1):
        ad["rank"] = i
    for ad in ineligible:
        ad["rank"] = None

    # Summary totals (blended)
    total_spend = sum(a["spend"] for a in processed)
    total_impressions = sum(a["impressions"] for a in processed)
    total_reach = sum(a["reach"] for a in processed)
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
        "total_reach": total_reach,
        "blended_frequency": round(total_impressions / total_reach, 2) if total_reach > 0 else 0,
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

    # Winner categories
    winners = {}
    if eligible:
        # Best overall
        winners["best_overall"] = ranked[0] if ranked else None
        # Most conversations
        by_convos = sorted(eligible, key=lambda x: x["conversations"], reverse=True)
        winners["most_conversations"] = by_convos[0] if by_convos else None
        # Lowest cost per conversation
        with_convos = [a for a in eligible if a["cost_per_convo"] and a["cost_per_convo"] > 0]
        if with_convos:
            winners["lowest_cost_per_convo"] = sorted(with_convos, key=lambda x: x["cost_per_convo"])[0]
        # Best CTR
        winners["best_ctr"] = sorted(eligible, key=lambda x: x["ctr"], reverse=True)[0]
        # Best conversation quality (reply rate)
        with_replies = [a for a in eligible if a["convo_to_reply_rate"] and a["convo_to_reply_rate"] > 0]
        if with_replies:
            winners["best_conversation_quality"] = sorted(with_replies, key=lambda x: x["convo_to_reply_rate"], reverse=True)[0]
        # Best low-budget (highest convos_per_100_spend)
        with_efficiency = [a for a in eligible if a["convos_per_100_spend"] and a["convos_per_100_spend"] > 0]
        if with_efficiency:
            winners["best_low_budget"] = sorted(with_efficiency, key=lambda x: x["convos_per_100_spend"], reverse=True)[0]

    # Competitor patterns (from existing DB)
    comp_patterns = await _get_competitor_patterns(db)

    # Campaigns list (for filter)
    campaigns = list(set(a["campaign"] for a in processed if a["campaign"]))

    return {
        "ok": True,
        "account_id": settings.FB_AD_ACCOUNT_ID[:10] + "...",
        "api_version": settings.FB_API_VERSION,
        "reporting_period": date_preset,
        "pages_fetched": pages,
        "ads_total": len(all_ads),
        "ads_with_insights": sum(1 for a in all_ads if a.get("_insights")),
        "ads_without_insights": sum(1 for a in all_ads if not a.get("_insights")),
        "summary": summary,
        "winners": winners,
        "ads": ranked + ineligible,
        "insufficient_data_ads": ineligible,
        "competitor_patterns": comp_patterns,
        "campaigns": campaigns,
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
