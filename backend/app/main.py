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

# CORS — allow local dev + deployed VPS frontend
# Override via CORS_ORIGINS env var (comma-separated) if needed
import os as _os
_default_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://31.97.110.197:8096",
    "http://31.97.110.197:5173",
]
_cors_env = _os.getenv("CORS_ORIGINS", "")
_cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()] if _cors_env else _default_origins
# Also include FRONTEND_URL from settings if not already in the list
if settings.FRONTEND_URL and settings.FRONTEND_URL not in _cors_origins:
    _cors_origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
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