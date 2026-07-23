"""
AI Recommendation Router — multi-engine comparison for ad recommendations.

Runs the same prompt on multiple AI engines in parallel and returns
side-by-side results. Persists comparison history.
"""

import json
import logging
from collections import Counter
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, AsyncSessionLocal
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.competitor import Competitor
from app.services.multi_ai import get_engine_status, run_prompt_multi


router = APIRouter(prefix="/ai-recommend", tags=["ai-recommend"])
logger = logging.getLogger(__name__)

# In-memory history (persists until server restart; for VPS use a DB table)
_history: list = []
MAX_HISTORY = 50


@router.get("/engines")
async def list_engines(current_user: User = Depends(get_current_user)):
    """Return available AI engines with their configuration status."""
    return get_engine_status()


@router.get("/context")
async def get_recommendation_context(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Build the real data context for the recommendation prompt template.
    Aggregates from competitor long-running ads (weighted by days_running).
    """
    # Get competitor winners (30d+, exclude own brand)
    stmt = (
        select(Ad, AdAnalysis, Competitor.name)
        .join(AdAnalysis, Ad.id == AdAnalysis.ad_id)
        .join(Competitor, Ad.competitor_id == Competitor.id)
        .where(Competitor.is_own_brand == False, Ad.days_running >= 30)
        .order_by(Ad.days_running.desc())
        .limit(200)
    )
    rows = (await db.execute(stmt)).all()

    if not rows:
        return {"has_data": False, "message": "Not enough competitor data. Run analysis first."}

    hook_counter = Counter()
    angle_counter = Counter()
    offer_counter = Counter()
    format_counter = Counter()
    comp_angles = {}

    for ad, analysis, comp_name in rows:
        w = ad.days_running
        if analysis.hook_type:
            hook_counter[analysis.hook_type] += w
        if analysis.angle:
            angle_counter[analysis.angle] += w
        if analysis.offer_type and analysis.offer_type != "None":
            offer_counter[analysis.offer_type] += w
        format_counter["video" if ad.is_video else "image"] += w
        if comp_name not in comp_angles:
            comp_angles[comp_name] = {"angles": Counter(), "longest": 0}
        comp_angles[comp_name]["angles"][analysis.angle or "Unknown"] += 1
        comp_angles[comp_name]["longest"] = max(comp_angles[comp_name]["longest"], ad.days_running)

    # Competitor landscape
    landscape = []
    for name, data in sorted(comp_angles.items(), key=lambda x: x[1]["longest"], reverse=True)[:10]:
        top_angle = data["angles"].most_common(1)[0][0] if data["angles"] else "Unknown"
        landscape.append(f"{name}: {top_angle} angle, longest ad {data['longest']}d")

    context = {
        "has_data": True,
        "winners_analyzed": len(rows),
        "top_hooks": [{"type": k, "score": v} for k, v in hook_counter.most_common(5)],
        "top_angles": [{"type": k, "score": v} for k, v in angle_counter.most_common(5)],
        "top_offers": [{"type": k, "score": v} for k, v in offer_counter.most_common(5)],
        "format_split": {
            "video": format_counter.get("video", 0),
            "image": format_counter.get("image", 0),
        },
        "dominant_format": "video" if format_counter.get("video", 0) > format_counter.get("image", 0) else "image",
        "landscape": landscape,
    }

    # Build default prompt template
    hooks_str = ", ".join(f"{h['type']} ({h['score']})" for h in context["top_hooks"][:4])
    angles_str = ", ".join(f"{a['type']} ({a['score']})" for a in context["top_angles"][:4])
    offers_str = ", ".join(f"{o['type']} ({o['score']})" for o in context["top_offers"][:4])
    landscape_str = "\n".join(f"  - {l}" for l in landscape[:8])

    context["default_prompt"] = f"""Based on analysis of {len(rows)} proven competitor ads (running 30+ days, weighted by longevity):

WINNING PATTERNS (weighted by days running):
- Top hooks: {hooks_str}
- Top angles: {angles_str}
- Top offers: {offers_str}
- Dominant format: {context['dominant_format']} ({context['format_split']['video']} video vs {context['format_split']['image']} image, weighted)

COMPETITOR LANDSCAPE:
{landscape_str}

OUR BRAND: Decoinks (DTF transfers, custom printing, B2B + small business)

TASK: Generate 3 ad concepts for Decoinks that leverage the winning patterns above. For each concept provide:
1. Hook type + exact hook line (ORIGINAL — do not copy competitor text)
2. Angle and why it works
3. Offer suggestion
4. Recommended format (video/image) and why
5. Target audience

Also provide a brief strategic summary of what the data tells us about the market and where the biggest opportunity lies for Decoinks."""

    # Presets
    context["presets"] = [
        {
            "id": "new_ads",
            "name": "New Ad Ideas",
            "description": "Generate fresh ad concepts based on competitor winners",
        },
        {
            "id": "improve",
            "name": "Improve Our Ads",
            "description": "Suggest improvements to our current approach",
        },
        {
            "id": "market",
            "name": "Market Analysis",
            "description": "What's working in the market right now",
        },
    ]

    return context


@router.post("/generate")
async def generate_comparison(
    payload: dict,
    current_user: User = Depends(get_current_user),
):
    """
    Run the prompt on selected engines in parallel. Returns side-by-side results.
    Body: {engines: ["groq", "xai"], prompt: "...", system_prompt?: "..."}
    """
    engines = payload.get("engines", [])
    prompt = payload.get("prompt", "")
    system_prompt = payload.get("system_prompt", "You are an expert advertising strategist specializing in DTF/custom printing. Base recommendations ONLY on the data provided. Never fabricate metrics like CTR, ROAS, or engagement rates.")

    if not engines:
        raise HTTPException(status_code=400, detail="Select at least one engine")
    if not prompt or len(prompt) < 20:
        raise HTTPException(status_code=400, detail="Prompt must be at least 20 characters")
    if len(engines) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 engines")

    # Validate engines
    valid_engines = {e["id"] for e in get_engine_status()}
    for eng in engines:
        if eng not in valid_engines:
            raise HTTPException(status_code=400, detail=f"Unknown engine: {eng}")

    # Run in parallel
    results = await run_prompt_multi(
        engines=engines,
        prompt=prompt,
        system_prompt=system_prompt,
        max_tokens=2048,
        temperature=0.5,
    )

    # Save to history
    run_id = str(uuid4())
    entry = {
        "id": run_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "engines": engines,
        "prompt": prompt[:500],  # Truncate for storage
        "results": results,
    }
    _history.insert(0, entry)
    if len(_history) > MAX_HISTORY:
        _history.pop()

    return {
        "id": run_id,
        "results": results,
        "engines_run": len(engines),
    }


@router.get("/history")
async def get_history(current_user: User = Depends(get_current_user)):
    """Return recent comparison runs."""
    # Return without full output text to keep response size manageable
    summary = []
    for entry in _history[:20]:
        summary.append({
            "id": entry["id"],
            "timestamp": entry["timestamp"],
            "engines": entry["engines"],
            "prompt_preview": entry["prompt"][:100],
            "results_count": len(entry["results"]),
            "success_count": sum(1 for r in entry["results"] if r.get("output")),
        })
    return summary


@router.get("/history/{run_id}")
async def get_history_detail(
    run_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get full details of a past comparison run."""
    for entry in _history:
        if entry["id"] == run_id:
            return entry
    raise HTTPException(status_code=404, detail="Run not found")
