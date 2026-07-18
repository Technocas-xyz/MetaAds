"""
AI Recommendation Router — multi-engine comparison with persistent history + cancel.
"""

import asyncio
import logging
from collections import Counter
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4, UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, AsyncSessionLocal
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.competitor import Competitor
from app.models.ai_recommend_run import AIRecommendRun
from app.services.multi_ai import get_engine_status, run_prompt_on_engine


router = APIRouter(prefix="/ai-recommend", tags=["ai-recommend"])
logger = logging.getLogger(__name__)

# Active runs (for cancellation)
_active_runs: dict = {}  # run_id -> {"tasks": [...], "cancelled": bool}


@router.get("/engines")
async def list_engines(current_user: User = Depends(get_current_user)):
    """Return available AI engines with their configuration status."""
    return get_engine_status()


@router.get("/context")
async def get_recommendation_context(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Build real data context for the recommendation prompt template."""
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
        "format_split": {"video": format_counter.get("video", 0), "image": format_counter.get("image", 0)},
        "dominant_format": "video" if format_counter.get("video", 0) > format_counter.get("image", 0) else "image",
        "landscape": landscape,
    }

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

Also provide a brief strategic summary of what the data tells us about the market."""

    context["presets"] = [
        {"id": "new_ads", "name": "New Ad Ideas", "description": "Generate fresh ad concepts based on competitor winners"},
        {"id": "improve", "name": "Improve Our Ads", "description": "Suggest improvements to our current approach"},
        {"id": "market", "name": "Market Analysis", "description": "What's working in the market right now"},
    ]

    return context


@router.post("/generate")
async def generate_comparison(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run prompt on selected engines in parallel. Supports cancellation."""
    engines = payload.get("engines", [])
    prompt = payload.get("prompt", "")
    system_prompt = payload.get("system_prompt",
        "You are an expert advertising strategist specializing in DTF/custom printing. "
        "Base recommendations ONLY on the data provided. "
        "Never fabricate metrics like CTR, ROAS, or engagement rates."
    )

    if not engines:
        raise HTTPException(status_code=400, detail="Select at least one engine")
    if not prompt or len(prompt) < 20:
        raise HTTPException(status_code=400, detail="Prompt must be at least 20 characters")

    valid_engines = {e["id"] for e in get_engine_status()}
    for eng in engines:
        if eng not in valid_engines:
            raise HTTPException(status_code=400, detail=f"Unknown engine: {eng}")

    run_id = str(uuid4())
    _active_runs[run_id] = {"cancelled": False, "tasks": []}

    # Run each engine as a separate task (cancellable)
    results = []
    tasks = []
    for eng in engines:
        task = asyncio.create_task(
            run_prompt_on_engine(eng, prompt, system_prompt, max_tokens=2048, temperature=0.5)
        )
        tasks.append((eng, task))
    _active_runs[run_id]["tasks"] = [t for _, t in tasks]

    for eng, task in tasks:
        try:
            if _active_runs.get(run_id, {}).get("cancelled"):
                task.cancel()
                results.append({"engine": eng, "name": eng, "error": "Cancelled", "duration": 0, "output": None})
            else:
                result = await task
                results.append(result)
        except asyncio.CancelledError:
            results.append({"engine": eng, "name": eng, "error": "Cancelled", "duration": 0, "output": None})
        except Exception as e:
            results.append({"engine": eng, "name": eng, "error": str(e)[:200], "duration": 0, "output": None})

    # Determine status
    status = "cancelled" if _active_runs.get(run_id, {}).get("cancelled") else "completed"

    # Persist to DB
    run = AIRecommendRun(
        id=run_id,
        prompt=prompt[:5000],
        engines=engines,
        results=results,
        status=status,
    )
    db.add(run)
    await db.commit()

    # Cleanup
    _active_runs.pop(run_id, None)

    return {"id": run_id, "results": results, "engines_run": len(engines), "status": status}


@router.post("/cancel/{run_id}")
async def cancel_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
):
    """Cancel an in-flight comparison run. Completed results are preserved."""
    if run_id not in _active_runs:
        raise HTTPException(status_code=404, detail="Run not found or already completed")

    _active_runs[run_id]["cancelled"] = True
    for task in _active_runs[run_id].get("tasks", []):
        if not task.done():
            task.cancel()

    return {
        "status": "cancelling",
        "message": "Run is being cancelled. Completed results will be preserved. "
                   "Note: requests already received by a provider may still incur cost.",
    }


@router.get("/history")
async def get_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return recent comparison runs from DB."""
    stmt = select(AIRecommendRun).order_by(desc(AIRecommendRun.created_at)).limit(20)
    runs = (await db.execute(stmt)).scalars().all()

    return [
        {
            "id": str(r.id),
            "timestamp": r.created_at.isoformat(),
            "engines": r.engines,
            "prompt_preview": r.prompt[:100],
            "status": r.status,
            "results_count": len(r.results) if r.results else 0,
            "success_count": sum(1 for x in (r.results or []) if x.get("output")),
        }
        for r in runs
    ]


@router.get("/history/{run_id}")
async def get_history_detail(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full details of a past comparison run."""
    run = await db.get(AIRecommendRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return {
        "id": str(run.id),
        "timestamp": run.created_at.isoformat(),
        "prompt": run.prompt,
        "engines": run.engines,
        "results": run.results,
        "status": run.status,
    }
