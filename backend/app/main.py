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


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.scheduler_service import start_scheduler, stop_scheduler
    print(f"[startup] Environment: {settings.ENVIRONMENT}")
    print(f"[startup] AI provider: Groq ({settings.GROQ_MODEL})")
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
