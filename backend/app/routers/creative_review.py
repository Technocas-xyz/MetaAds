"""
Creative Review & QA — upload ad creative + copy, get AI review.

Stores reviews in memory for now (no migration needed for Phase 1).
Uses MinIO for creative storage. AI review via configured provider.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.competitor import Competitor
from app.config import settings
from app.services.ai_client import chat_completion, get_model_name
from app.core.storage.s3_writer import upload_bytes

router = APIRouter(prefix="/creative-reviews", tags=["creative-review"])
logger = logging.getLogger(__name__)

# In-memory store (will be DB-backed in Phase 2 with migration)
_reviews: dict = {}  # id -> review dict


@router.post("/upload")
async def upload_creative(
    file: UploadFile = File(...),
    headline: str = Form(""),
    primary_text: str = Form(""),
    cta: str = Form(""),
    offer: str = Form(""),
    platform: str = Form("facebook"),
    recommendation_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    """Upload creative + copy for review. Returns review_id."""
    # Validate file
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files accepted (PNG, JPEG, WebP)")
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Read and store in MinIO
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    review_id = str(uuid4())
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    storage_key = f"creative-reviews/{review_id}.{ext}"
    image_url = await upload_bytes(data, storage_key, file.content_type)

    _reviews[review_id] = {
        "id": review_id,
        "status": "uploaded",
        "image_url": image_url,
        "headline": headline,
        "primary_text": primary_text,
        "cta": cta,
        "offer": offer,
        "platform": platform,
        "recommendation_id": recommendation_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "review_result": None,
        "provider": None,
    }

    return {"id": review_id, "status": "uploaded", "image_url": image_url}


@router.post("/{review_id}/analyze", status_code=202)
async def analyze_creative(
    review_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start AI review of an uploaded creative. Returns 202 + polls via GET."""
    if review_id not in _reviews:
        raise HTTPException(status_code=404, detail="Review not found")

    review = _reviews[review_id]
    if review["status"] == "reviewing":
        return {"status": "already_running"}

    review["status"] = "reviewing"
    asyncio.create_task(_run_review(review_id, db))
    return {"status": "started", "review_id": review_id}


@router.get("/{review_id}")
async def get_review(
    review_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get review status and results."""
    if review_id not in _reviews:
        raise HTTPException(status_code=404, detail="Review not found")
    return _reviews[review_id]


@router.get("")
async def list_reviews(current_user: User = Depends(get_current_user)):
    """List all reviews."""
    return sorted(_reviews.values(), key=lambda r: r.get("created_at", ""), reverse=True)[:20]


@router.post("/{review_id}/approve")
async def approve_creative(review_id: str, current_user: User = Depends(get_current_user)):
    if review_id not in _reviews:
        raise HTTPException(status_code=404, detail="Review not found")
    _reviews[review_id]["status"] = "approved"
    return {"status": "approved"}


@router.post("/{review_id}/request-revision")
async def request_revision(
    review_id: str, payload: dict = None,
    current_user: User = Depends(get_current_user),
):
    if review_id not in _reviews:
        raise HTTPException(status_code=404, detail="Review not found")
    _reviews[review_id]["status"] = "needs_changes"
    _reviews[review_id]["revision_reason"] = (payload or {}).get("reason", "")
    return {"status": "needs_changes"}


async def _run_review(review_id: str, db: AsyncSession):
    """Background: AI reviews the creative against market data."""
    review = _reviews[review_id]

    try:
        # Get market context for grounding
        winners_stmt = (
            select(Ad, AdAnalysis)
            .join(AdAnalysis, Ad.id == AdAnalysis.ad_id)
            .join(Competitor, Ad.competitor_id == Competitor.id)
            .where(Competitor.is_own_brand == False, Ad.days_running >= 30)
            .order_by(Ad.days_running.desc())
            .limit(50)
        )
        async with AsyncSessionLocal() as session:
            rows = (await session.execute(winners_stmt)).all()

        from collections import Counter
        from app.database import AsyncSessionLocal

        hook_counter = Counter(a.hook_type for _, a in rows if a.hook_type)
        angle_counter = Counter(a.angle for _, a in rows if a.angle)
        offer_counter = Counter(a.offer_type for _, a in rows if a.offer_type and a.offer_type != "None")

        market_context = f"""Winning competitor patterns (weighted by longevity):
Top hooks: {', '.join(f'{k} ({v})' for k, v in hook_counter.most_common(5))}
Top angles: {', '.join(f'{k} ({v})' for k, v in angle_counter.most_common(5))}
Top offers: {', '.join(f'{k} ({v})' for k, v in offer_counter.most_common(5))}"""

        prompt = f"""You are reviewing a Decoinks ad creative before publishing.

SUBMITTED AD:
Headline: {review['headline'] or 'Not provided'}
Primary Text: {review['primary_text'] or 'Not provided'}
CTA: {review['cta'] or 'Not provided'}
Offer: {review['offer'] or 'None'}
Platform: {review['platform']}

MARKET CONTEXT (from {len(rows)} proven competitor ads):
{market_context}

TASK: Review this ad and return ONLY valid JSON:
{{
  "verdict": "approve|revise|reject",
  "overall_score": 0-100,
  "suggestions": [
    {{
      "title": "short title",
      "priority": "high|medium|low|positive",
      "area": "offer|cta|hook|copy|social_proof|visual|brand|other",
      "note": "specific actionable feedback grounded in market data"
    }}
  ],
  "matches_recommendation": true/false,
  "recommendation_note": "how well it aligns with winning patterns",
  "similarity_to_competitors": 0-100,
  "alignment_scores": {{
    "copy_clarity": 0-100,
    "cta_presence": 0-100,
    "offer_clarity": 0-100,
    "hook_strength": 0-100
  }},
  "strategic_insight": "1-2 sentence strategic observation"
}}

RULES:
- Score reflects creative READINESS, not performance prediction.
- Do not predict CTR, ROAS, or conversions.
- Suggestions must be specific and actionable.
- similarity_to_competitors: higher = more similar to existing competitor ads (may need differentiation).
- Only score dimensions you can actually judge from the text provided.
- If you cannot assess something, set it to null."""

        raw = await chat_completion(
            messages=[
                {"role": "system", "content": "You are an expert ad creative reviewer. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=2000,
            json_mode=True,
        )

        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            result = {"verdict": "revise", "overall_score": 50, "suggestions": [],
                      "strategic_insight": raw[:300]}

        review["review_result"] = result
        review["status"] = "reviewed"
        review["provider"] = get_model_name()
        review["reviewed_at"] = datetime.now(timezone.utc).isoformat()

    except Exception as e:
        review["status"] = "failed"
        review["error"] = str(e)[:300]
        logger.error(f"[creative-review] Failed: {e}")
