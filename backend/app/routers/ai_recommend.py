"""
AI Recommendation Router — multi-engine comparison with:
- Background execution (returns 202 immediately)
- Persistent PostgreSQL history
- Real cancellation of in-flight provider tasks
"""

import asyncio
import logging
from collections import Counter
from datetime import datetime, timezone
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc, update
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

# Active runs tracking (for cancellation)
_active_runs: dict = {}  # run_id -> {"tasks": {engine: task}, "cancelled": bool}


@router.get("/engines")
async def list_engines(current_user: User = Depends(get_current_user)):
    return get_engine_status()


@router.get("/context")
async def get_recommendation_context(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Build real data context for prompt template."""
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


@router.post("/generate", status_code=202)
async def generate_comparison(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start a comparison run in the background. Returns 202 with run_id immediately.
    Poll GET /ai-recommend/runs/{run_id} for results.
    """
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

    # Create DB record immediately (status=running)
    run = AIRecommendRun(id=run_id, prompt=prompt[:5000], engines=engines, results=[], status="running")
    db.add(run)
    await db.commit()

    # Launch background execution
    _active_runs[run_id] = {"tasks": {}, "cancelled": False}
    asyncio.create_task(_execute_run(run_id, engines, prompt, system_prompt))

    return {"id": run_id, "status": "running", "engines": engines}


async def _execute_run(run_id: str, engines: list, prompt: str, system_prompt: str):
    """Background task: run prompt on each engine, update DB with results."""
    tasks = {}
    results = []

    # Create tasks for each engine
    for eng in engines:
        task = asyncio.create_task(
            run_prompt_on_engine(eng, prompt, system_prompt, max_tokens=2048, temperature=0.5)
        )
        tasks[eng] = task

    if run_id in _active_runs:
        _active_runs[run_id]["tasks"] = tasks

    # Await each, handling cancellation
    for eng in engines:
        task = tasks[eng]
        try:
            result = await task
            results.append(result)
        except asyncio.CancelledError:
            results.append({
                "engine": eng, "name": eng, "model": None,
                "output": None, "error": "Cancelled by user", "duration": 0,
            })
        except Exception as e:
            results.append({
                "engine": eng, "name": eng, "model": None,
                "output": None, "error": str(e)[:200], "duration": 0,
            })

    # Determine final status
    cancelled = _active_runs.get(run_id, {}).get("cancelled", False)
    has_output = any(r.get("output") for r in results)
    has_cancelled = any(r.get("error") == "Cancelled by user" for r in results)

    if cancelled and has_output:
        status = "partially_completed"
    elif cancelled:
        status = "cancelled"
    elif all(r.get("output") for r in results):
        status = "completed"
    elif has_output:
        status = "partially_completed"
    else:
        status = "failed"

    # Update DB
    async with AsyncSessionLocal() as db:
        stmt = (
            update(AIRecommendRun)
            .where(AIRecommendRun.id == run_id)
            .values(results=results, status=status)
        )
        await db.execute(stmt)
        await db.commit()

    # Cleanup
    _active_runs.pop(run_id, None)
    logger.info(f"[ai-recommend] Run {run_id[:8]} finished: {status}")


@router.post("/cancel/{run_id}")
async def cancel_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Cancel an in-flight comparison run. Completed provider results are preserved.
    Note: a request already received by a provider may still incur API cost.
    """
    if run_id not in _active_runs:
        raise HTTPException(status_code=404, detail="Run not found or already completed")

    _active_runs[run_id]["cancelled"] = True
    cancelled_count = 0
    for eng, task in _active_runs[run_id].get("tasks", {}).items():
        if not task.done():
            task.cancel()
            cancelled_count += 1

    return {
        "status": "cancelling",
        "cancelled_engines": cancelled_count,
        "message": (
            "Run is being cancelled. Completed results will be preserved. "
            "Note: requests already received by a provider may still incur cost."
        ),
    }


@router.get("/runs/{run_id}")
async def get_run_status(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current status + results of a comparison run (for polling)."""
    run = await db.get(AIRecommendRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return {
        "id": str(run.id),
        "status": run.status,
        "engines": run.engines,
        "results": run.results or [],
        "timestamp": run.created_at.isoformat(),
    }


@router.get("/history")
async def get_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
