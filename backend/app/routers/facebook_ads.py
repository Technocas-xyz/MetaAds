"""
Facebook Marketing API Explorer — discovery endpoints.
No data is stored. Raw API responses only.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.config import settings
from app.dependencies import get_current_user
from app.models.user import User
from app.services import facebook_ads_client as fb


router = APIRouter(prefix="/facebook", tags=["facebook"])


@router.get("/status")
async def get_status(current_user: User = Depends(get_current_user)):
    """
    Check Facebook API connection status.
    Never returns the token value.
    """
    configured = fb.is_configured()
    account_set = bool(settings.FB_AD_ACCOUNT_ID)
    version = settings.FB_API_VERSION

    result = {
        "token_present": configured,
        "account_id_set": account_set,
        "account_id_preview": settings.FB_AD_ACCOUNT_ID[:10] + "..." if account_set else None,
        "api_version": version,
        "connection_test": None,
        "ad_accounts": None,
    }

    if configured:
        result["connection_test"] = await fb.test_connection()
        result["ad_accounts"] = await fb.get_ad_accounts()

    return result


@router.get("/ads/fields")
async def get_requested_fields(current_user: User = Depends(get_current_user)):
    """Return the field sets we request, grouped by entity."""
    return {
        "ad_fields": fb.AD_FIELDS,
        "insights_fields": fb.INSIGHTS_FIELDS,
        "groups": {
            "Ad": [f for f in fb.AD_FIELDS if not f.startswith(("adset", "campaign", "creative"))],
            "Ad Set": [f for f in fb.AD_FIELDS if f.startswith("adset")],
            "Campaign": [f for f in fb.AD_FIELDS if f.startswith("campaign")],
            "Creative": [f for f in fb.AD_FIELDS if f.startswith("creative")],
            "Insights": fb.INSIGHTS_FIELDS,
        },
    }


@router.get("/ads")
async def get_ads(
    limit: int = Query(25, ge=1, le=200),
    after: Optional[str] = Query(None),
    date_preset: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch ads from the Decoinks account. Returns RAW JSON per ad.
    Nothing is stored. This is a discovery/inspection endpoint.
    """
    return await fb.fetch_ads(limit=limit, after=after, date_preset=date_preset)
