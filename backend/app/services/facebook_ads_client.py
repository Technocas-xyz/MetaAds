"""
Facebook Marketing API client — thin async wrapper for discovering ad fields.

Reads token/account/version from settings (env).
Never logs the token. Handles paging and rate limits.
"""

import asyncio
import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://graph.facebook.com"

# Fields to request on each entity
AD_FIELDS = [
    "id", "name", "status", "effective_status", "configured_status",
    "created_time", "updated_time", "adset_id",
    "adset{id,name,daily_budget,lifetime_budget,optimization_goal,billing_event,targeting}",
    "campaign_id",
    "campaign{id,name,objective,status,buying_type,special_ad_categories}",
    "creative{id,name,title,body,object_story_spec,object_type,call_to_action_type,"
    "thumbnail_url,image_url,image_hash,video_id,instagram_permalink_url,"
    "effective_object_story_id,url_tags,link_url}",
    "tracking_specs", "conversion_specs", "source_ad_id",
    "preview_shareable_link", "issues_info", "recommendations",
]

INSIGHTS_FIELDS = [
    "ad_id", "impressions", "reach", "frequency", "spend",
    "clicks", "cpc", "cpm", "ctr", "unique_clicks", "unique_ctr",
    "actions", "action_values", "cost_per_action_type",
    "video_p25_watched_actions", "video_p50_watched_actions",
    "video_p75_watched_actions", "video_p100_watched_actions",
    "video_avg_time_watched_actions",
    "inline_link_clicks", "inline_link_click_ctr",
    "purchase_roas", "website_purchase_roas",
    "date_start", "date_stop",
]

MAX_PER_PAGE = 200
MAX_PAGES = 3


def _api_url(path: str) -> str:
    return f"{BASE_URL}/{settings.FB_API_VERSION}/{path}"


def _headers() -> dict:
    return {"Authorization": f"Bearer {settings.FB_ACCESS_TOKEN}"}


def is_configured() -> bool:
    return bool(settings.FB_ACCESS_TOKEN and len(settings.FB_ACCESS_TOKEN) > 10)


async def test_connection() -> dict:
    """Test if the token works by calling /me."""
    if not is_configured():
        return {"ok": False, "error": "FB_ACCESS_TOKEN not set"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                _api_url("me"),
                headers=_headers(),
                params={"fields": "id,name"},
            )
            if resp.status_code != 200:
                data = resp.json()
                err = data.get("error", {})
                return {
                    "ok": False,
                    "error": err.get("message", "Unknown error"),
                    "code": err.get("code"),
                    "subcode": err.get("error_subcode"),
                }
            data = resp.json()
            return {"ok": True, "user_id": data.get("id"), "user_name": data.get("name")}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


async def get_ad_accounts() -> dict:
    """Get ad accounts accessible by this token."""
    if not is_configured():
        return {"ok": False, "error": "Not configured"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                _api_url("me/adaccounts"),
                headers=_headers(),
                params={"fields": "id,name,account_id,account_status,currency,business_name"},
            )
            if resp.status_code != 200:
                return {"ok": False, "error": resp.json().get("error", {}).get("message", "Error")}
            return {"ok": True, "accounts": resp.json().get("data", [])}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


async def fetch_ads(
    limit: int = 25,
    after: Optional[str] = None,
    date_preset: Optional[str] = None,
) -> dict:
    """
    Fetch ads from the configured account with full fields.
    Returns raw JSON per ad + insights. Reports dropped fields.
    """
    account_id = settings.FB_AD_ACCOUNT_ID
    if not account_id:
        return {"ok": False, "error": "FB_AD_ACCOUNT_ID not set", "data": [], "dropped_fields": []}

    if not is_configured():
        return {"ok": False, "error": "FB_ACCESS_TOKEN not set", "data": [], "dropped_fields": []}

    limit = min(limit, MAX_PER_PAGE)
    dropped_fields = []

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Fetch ads
            params = {
                "fields": ",".join(AD_FIELDS),
                "limit": str(limit),
            }
            if after:
                params["after"] = after
            if date_preset:
                params["date_preset"] = date_preset

            resp = await client.get(
                _api_url(f"{account_id}/ads"),
                headers=_headers(),
                params=params,
            )

            if resp.status_code != 200:
                err = resp.json().get("error", {})
                # Check if specific fields caused the error
                if err.get("code") == 100:
                    # Try with reduced fields
                    msg = err.get("message", "")
                    dropped_fields.append({"reason": msg, "fields": "some"})
                    # Retry with minimal fields
                    params["fields"] = "id,name,status,effective_status,created_time,campaign{id,name},creative{id,thumbnail_url}"
                    resp = await client.get(
                        _api_url(f"{account_id}/ads"),
                        headers=_headers(),
                        params=params,
                    )
                    if resp.status_code != 200:
                        return {
                            "ok": False,
                            "error": resp.json().get("error", {}).get("message", "Error"),
                            "data": [],
                            "dropped_fields": dropped_fields,
                        }
                else:
                    return {
                        "ok": False,
                        "error": err.get("message", "Unknown error"),
                        "code": err.get("code"),
                        "subcode": err.get("error_subcode"),
                        "data": [],
                        "dropped_fields": dropped_fields,
                    }

            ads_data = resp.json()
            ads = ads_data.get("data", [])
            paging = ads_data.get("paging", {})
            next_after = paging.get("cursors", {}).get("after")

            # Fetch insights for each ad (batch)
            for ad in ads:
                ad_id = ad.get("id")
                if not ad_id:
                    continue
                try:
                    insights_params = {
                        "fields": ",".join(INSIGHTS_FIELDS),
                    }
                    # Use 'maximum' date_preset for lifetime data, or specific preset if provided
                    if date_preset:
                        insights_params["date_preset"] = date_preset
                    else:
                        insights_params["date_preset"] = "maximum"

                    insights_resp = await client.get(
                        _api_url(f"{ad_id}/insights"),
                        headers=_headers(),
                        params=insights_params,
                    )
                    if insights_resp.status_code == 200:
                        insights_data = insights_resp.json().get("data", [])
                        ad["_insights"] = insights_data[0] if insights_data else None
                    else:
                        err = insights_resp.json().get("error", {})
                        ad["_insights"] = None
                        ad["_insights_error"] = err.get("message", "")[:100]
                except Exception as e:
                    ad["_insights"] = None
                    ad["_insights_error"] = str(e)[:100]

                # Small delay to respect rate limits
                await asyncio.sleep(0.2)

            return {
                "ok": True,
                "data": ads,
                "count": len(ads),
                "paging": {"after": next_after} if next_after else None,
                "dropped_fields": dropped_fields,
            }

    except Exception as e:
        return {"ok": False, "error": str(e)[:300], "data": [], "dropped_fields": dropped_fields}
