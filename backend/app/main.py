from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth as auth_router
from app.routers import competitors as competitors_router
from app.routers import ads as ads_router
from app.routers import analysis as analysis_router
from app.routers import hooks as hooks_router
from app.routers import angles as angles_router
from app.routers import offers as offers_router
from app.routers import dashboard as dashboard_router
from app.routers import review_queue as review_queue_router
from app.routers import ai_analysis as ai_analysis_router
from app.routers import briefs as briefs_router
from app.routers import campaigns as campaigns_router
from app.routers import scraper as scraper_router
from app.routers import insights as insights_router
from app.routers import my_ads as my_ads_router
from app.routers import removed_ads as removed_ads_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.scheduler_service import start_scheduler, stop_scheduler
    from app.services.ai_client import get_provider_info
    info = get_provider_info()
    print(f"[startup] Environment: {settings.ENVIRONMENT}")
    print(f"[startup] AI provider: {info['provider']} ({info['model']})")
    await start_scheduler()
    yield
    await stop_scheduler()
    print("[shutdown] Goodbye.")


app = FastAPI(
    title="AI Ads Supervisor API",
    description="Backend for the AI Ads Supervisor platform.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Routers
app.include_router(auth_router.router, prefix="/api")
app.include_router(competitors_router.router, prefix="/api")
app.include_router(ads_router.router, prefix="/api")
app.include_router(analysis_router.router, prefix="/api")
app.include_router(hooks_router.router, prefix="/api")
app.include_router(angles_router.router, prefix="/api")
app.include_router(offers_router.router, prefix="/api")
app.include_router(dashboard_router.router, prefix="/api")
app.include_router(review_queue_router.router, prefix="/api")
app.include_router(ai_analysis_router.router, prefix="/api")
app.include_router(briefs_router.router, prefix="/api")
app.include_router(campaigns_router.router, prefix="/api")
app.include_router(scraper_router.router, prefix="/api")
app.include_router(insights_router.router, prefix="/api")
app.include_router(my_ads_router.router, prefix="/api")
app.include_router(removed_ads_router.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "app": "AI Ads Supervisor API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
async def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}


@app.get("/api/spend-rate")
async def get_spend_rate():
    """Get the global default daily spend rate."""
    from app.database import AsyncSessionLocal
    from app.models.settings import WorkspaceSettings
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        ws = (await db.execute(select(WorkspaceSettings).limit(1))).scalar_one_or_none()
        rate = float(ws.default_daily_spend_rate) if ws else 20.0
    return {"default_daily_spend_rate": rate}


@app.put("/api/spend-rate")
async def set_spend_rate(payload: dict):
    """Update the global default daily spend rate. Accepts integer or decimal values."""
    from decimal import Decimal, InvalidOperation
    from fastapi import HTTPException
    from app.database import AsyncSessionLocal
    from app.models.settings import WorkspaceSettings
    from sqlalchemy import select

    raw_rate = payload.get("rate")
    if raw_rate is None:
        raise HTTPException(status_code=422, detail="Missing required field: rate")

    try:
        rate = Decimal(str(raw_rate))
    except (InvalidOperation, TypeError, ValueError):
        raise HTTPException(status_code=422, detail="rate must be a valid number")

    if rate < 0:
        raise HTTPException(status_code=400, detail="Rate must be >= 0")

    async with AsyncSessionLocal() as db:
        ws = (await db.execute(select(WorkspaceSettings).limit(1))).scalar_one_or_none()
        if ws:
            ws.default_daily_spend_rate = rate
        else:
            ws = WorkspaceSettings(default_daily_spend_rate=rate)
            db.add(ws)
        await db.commit()
    return {"default_daily_spend_rate": float(rate)}


@app.get("/api/media/{key:path}")
async def proxy_media(key: str):
    """
    Proxy endpoint to serve MinIO objects through the backend.
    Useful when MinIO isn't directly reachable from the browser.
    Streams the object with proper content-type.
    """
    from fastapi.responses import StreamingResponse
    from app.core.storage.s3_writer import _get_client, MINIO_BUCKET, _ensure_bucket

    try:
        _ensure_bucket()
        client = _get_client()
        response = client.get_object(MINIO_BUCKET, key)
        content_type = response.headers.get("Content-Type", "image/jpeg")

        def iterfile():
            try:
                for chunk in response.stream(8192):
                    yield chunk
            finally:
                response.close()
                response.release_conn()

        return StreamingResponse(
            iterfile(),
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=31536000, immutable"},
        )
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Media not found: {key}")


@app.get("/api/search")
async def global_search(
    q: str = "",
):
    """
    Global search across entities — lightweight proxy that delegates to
    individual routers. Returns up to 5 results per category.
    """
    from sqlalchemy import select, func
    from app.database import AsyncSessionLocal
    from app.models.ad import Ad
    from app.models.ad_analysis import AdAnalysis
    from app.models.competitor import Competitor

    if not q or len(q) < 2:
        return {"ads": [], "competitors": [], "hooks": [], "angles": [], "offers": []}

    like = f"%{q}%"

    async with AsyncSessionLocal() as db:
        # Competitors
        comp_stmt = (
            select(Competitor.id, Competitor.name, Competitor.domain)
            .where(Competitor.name.ilike(like) | Competitor.domain.ilike(like))
            .limit(5)
        )
        comps = (await db.execute(comp_stmt)).all()

        # Ads (headline / primary_text)
        ads_stmt = (
            select(Ad.id, Ad.headline, Ad.media_url)
            .where(Ad.headline.ilike(like) | Ad.primary_text.ilike(like))
            .order_by(Ad.captured_at.desc())
            .limit(5)
        )
        ads = (await db.execute(ads_stmt)).all()

        # Hooks (hook_text)
        hooks_stmt = (
            select(AdAnalysis.hook_text, AdAnalysis.hook_type)
            .where(AdAnalysis.hook_text.ilike(like))
            .distinct()
            .limit(5)
        )
        hooks = (await db.execute(hooks_stmt)).all()

        # Angles
        angles_stmt = (
            select(AdAnalysis.angle)
            .where(AdAnalysis.angle.ilike(like))
            .distinct()
            .limit(5)
        )
        angles = (await db.execute(angles_stmt)).all()

        # Offers
        offers_stmt = (
            select(AdAnalysis.offer_type, AdAnalysis.offer_value)
            .where(
                AdAnalysis.offer_type.ilike(like) | AdAnalysis.offer_value.ilike(like)
            )
            .distinct()
            .limit(5)
        )
        offers = (await db.execute(offers_stmt)).all()

    return {
        "competitors": [{"id": str(c[0]), "name": c[1], "domain": c[2]} for c in comps],
        "ads": [{"id": str(a[0]), "headline": a[1], "media_url": a[2]} for a in ads],
        "hooks": [{"text": h[0], "type": h[1]} for h in hooks],
        "angles": [{"name": a[0]} for a in angles],
        "offers": [{"type": o[0], "value": o[1]} for o in offers],
    }
