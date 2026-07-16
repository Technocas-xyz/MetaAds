from math import ceil
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.competitor import Competitor
from app.schemas.ad import (
    AdCreate,
    AdUpdate,
    AdResponse,
    AdListResponse,
    AdsSummary,
    AIInsights,
    CompetitorRef,
    PaginationMeta,
)


router = APIRouter(prefix="/competitor-ads", tags=["ads"])


# ---------- Helpers ----------

def _ad_to_response(ad: Ad) -> AdResponse:
    """Convert SQLAlchemy Ad (with relationships loaded) into AdResponse."""
    from app.schemas.ad import AIInsights, InsightField, CompetitorRef

    # Build ai_insights nested shape if analysis exists
    insights = None
    top_hook_type = None
    top_hook_text = None
    top_angle = None
    top_angle_detail = None
    top_offer_type = None
    overall_conf = 0.0
    ai_notes = None
    analysis_block = None

    if ad.analysis is not None:
        a = ad.analysis
        insights = AIInsights(
            hook=InsightField(value=a.hook_text, confidence=a.hook_confidence or 0.0),
            hook_type=InsightField(value=a.hook_type, confidence=a.hook_confidence or 0.0),
            angle=InsightField(value=a.angle, confidence=a.angle_confidence or 0.0),
            offer_type=InsightField(value=a.offer_type, confidence=a.offer_confidence or 0.0),
            offer_value=InsightField(value=a.offer_value, confidence=a.offer_confidence or 0.0),
            creative_format=InsightField(value=a.creative_format, confidence=85.0),
            product_line=InsightField(value=a.product_line, confidence=85.0),
            audience_type=InsightField(value=a.audience_type, confidence=70.0),
            usp_detected=InsightField(value=a.usp_detected, confidence=80.0),
            overall=a.confidence_score or 0.0,
        )
        top_hook_type = a.hook_type
        top_hook_text = a.hook_text
        top_angle = a.angle
        top_angle_detail = a.angle_detail
        top_offer_type = a.offer_type
        overall_conf = a.confidence_score or 0.0
        ai_notes = a.ai_notes

        if a.summary or a.suggested_angle or a.suggested_hook:
            analysis_block = {
                "summary": a.summary,
                "suggested_angle": a.suggested_angle,
                "suggested_hook": a.suggested_hook,
            }

    # Compute running_since_days from first_seen
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    first_seen = ad.first_seen
    if first_seen.tzinfo is None:
        first_seen = first_seen.replace(tzinfo=timezone.utc)
    days = max(0, (now - first_seen).days)
    date_str = first_seen.strftime("%b %d, %Y")

    return AdResponse(
        id=ad.id,
        competitor=CompetitorRef.model_validate(ad.competitor),
        platform=ad.platform,
        hook_type=top_hook_type,
        hook_text=top_hook_text,
        angle=top_angle,
        angle_detail=top_angle_detail,
        offer_type=top_offer_type,
        confidence_score=overall_conf,
        status=ad.status,
        headline=ad.headline,
        primary_text=ad.primary_text,
        cta=ad.cta,
        ad_url=ad.ad_url,
        landing_url=ad.landing_url,
        media_url=ad.media_url,
        is_video=ad.is_video,
        variants=ad.variants,
        running_since_days=days,
        running_since_date=date_str,
        captured_at=ad.captured_at,
        last_seen=ad.last_seen,
        first_seen=ad.first_seen,
        notes=ad.notes,
        ai_insights=insights,
        ai_notes=ai_notes,
        analysis=analysis_block,
        evidence=None,
        ad_library_id=ad.ad_library_id,
        created_at=ad.created_at,
        updated_at=ad.updated_at,
    )


async def _get_ad_or_404(db: AsyncSession, ad_id: UUID) -> Ad:
    """Fetch an ad with competitor + analysis eagerly loaded, 404 if missing."""
    stmt = (
        select(Ad)
        .where(Ad.id == ad_id)
        .options(selectinload(Ad.competitor), selectinload(Ad.analysis))
    )
    ad = (await db.execute(stmt)).scalar_one_or_none()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    return ad


# ---------- Endpoints ----------

@router.get("/summary", response_model=AdsSummary)
async def get_ads_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate KPIs across all ads — frontend-aligned shape."""
    from datetime import datetime, timezone, timedelta

    # Total + status breakdown
    total_stmt = select(func.count(Ad.id))
    total = (await db.execute(total_stmt)).scalar() or 0

    # Analyzed = ads with AdAnalysis row
    analyzed_stmt = select(func.count(AdAnalysis.id))
    analyzed = (await db.execute(analyzed_stmt)).scalar() or 0

    pending = total - analyzed

    # Low confidence = analyses below threshold (default 65)
    low_conf_stmt = select(func.count(AdAnalysis.id)).where(
        AdAnalysis.confidence_score < 65
    )
    low_confidence = (await db.execute(low_conf_stmt)).scalar() or 0

    # This week = ads captured in last 7 days
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    week_stmt = select(func.count(Ad.id)).where(Ad.captured_at >= week_ago)
    this_week = (await db.execute(week_stmt)).scalar() or 0

    def pct(n: int, d: int) -> float:
        return round((n / d * 100), 1) if d else 0.0

    return AdsSummary(
        total=total,
        analyzed=analyzed,
        analyzed_pct=pct(analyzed, total),
        pending=pending,
        pending_pct=pct(pending, total),
        low_confidence=low_confidence,
        low_conf_pct=pct(low_confidence, total),
        this_week=this_week,
    )


@router.get("", response_model=AdListResponse)
async def list_ads(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    platform: Optional[str] = None,
    competitor_id: Optional[UUID] = None,
    competitor: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    min_confidence: Optional[float] = Query(None, ge=0.0, le=100.0),
    hook_type: Optional[str] = Query(None),
    angle: Optional[str] = Query(None),
    offer: Optional[str] = Query(None),
    confidence: Optional[str] = Query(None),
    format: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("-captured_at"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Paginated list of ads with full server-side filters."""
    # Base query with eager-loaded relationships
    stmt = select(Ad).options(
        selectinload(Ad.competitor),
        selectinload(Ad.analysis),
    )

    # --- Filters ---
    if platform:
        stmt = stmt.where(Ad.platform == platform)
    if competitor_id:
        stmt = stmt.where(Ad.competitor_id == competitor_id)
    if competitor:
        # Filter by competitor name (exact, case-insensitive)
        stmt = stmt.join(Competitor, Ad.competitor_id == Competitor.id).where(
            func.lower(Competitor.name) == func.lower(competitor)
        )
    if status_filter:
        stmt = stmt.where(Ad.status == status_filter)

    # Join to AdAnalysis for analysis-based filters
    needs_analysis_join = any([hook_type, angle, offer, confidence, min_confidence])
    if needs_analysis_join:
        # Use outerjoin so we don't lose ads without analysis when only min_confidence is set
        stmt = stmt.join(AdAnalysis, Ad.id == AdAnalysis.ad_id)

    if min_confidence is not None:
        stmt = stmt.where(AdAnalysis.confidence_score >= min_confidence)
    if hook_type:
        stmt = stmt.where(func.lower(AdAnalysis.hook_type) == func.lower(hook_type))
    if angle:
        stmt = stmt.where(func.lower(AdAnalysis.angle) == func.lower(angle))
    if offer:
        stmt = stmt.where(func.lower(AdAnalysis.offer_type) == func.lower(offer))
    if confidence:
        # Confidence level: High (>=70), Medium (40-69), Low (<40)
        if confidence == "High":
            stmt = stmt.where(AdAnalysis.confidence_score >= 70)
        elif confidence == "Medium":
            stmt = stmt.where(AdAnalysis.confidence_score >= 40, AdAnalysis.confidence_score < 70)
        elif confidence == "Low":
            stmt = stmt.where(AdAnalysis.confidence_score < 40)

    # Free-text search (ILIKE on headline + primary_text)
    if search:
        like_pattern = f"%{search}%"
        stmt = stmt.where(
            Ad.headline.ilike(like_pattern) | Ad.primary_text.ilike(like_pattern)
        )

    # Format filter (video/image)
    if format:
        if format.lower() == "video":
            stmt = stmt.where(Ad.is_video == True)
        elif format.lower() == "image":
            stmt = stmt.where(Ad.is_video == False)

    # Count total before pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Sorting
    sort_field = sort.lstrip("-")
    descending = sort.startswith("-")
    sort_col = getattr(Ad, sort_field, None)
    if sort_col is None:
        raise HTTPException(status_code=400, detail=f"Unknown sort field: {sort_field}")
    stmt = stmt.order_by(sort_col.desc() if descending else sort_col.asc())

    # Pagination
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)

    ads = (await db.execute(stmt)).scalars().unique().all()

    total_pages = ceil(total / per_page) if per_page else 0

    return AdListResponse(
        data=[_ad_to_response(ad) for ad in ads],
        meta=PaginationMeta(
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
        ),
    )


@router.get("/{ad_id}", response_model=AdResponse)
async def get_ad(
    ad_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single ad with competitor + AI analysis."""
    ad = await _get_ad_or_404(db, ad_id)
    return _ad_to_response(ad)


@router.post("", response_model=AdResponse, status_code=status.HTTP_201_CREATED)
async def create_ad(
    payload: AdCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new ad. Triggers analysis later (Step 9 wires Celery)."""
    # Validate that competitor exists
    competitor = await db.get(Competitor, payload.competitor_id)
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    ad = Ad(
        competitor_id=payload.competitor_id,
        platform=payload.platform,
        headline=payload.headline,
        primary_text=payload.primary_text,
        cta=payload.cta,
        ad_url=payload.ad_url,
        landing_url=payload.landing_url,
        media_url=payload.media_url,
        is_video=payload.is_video,
        ad_library_id=payload.ad_library_id,
        variants=payload.variants,
        notes=payload.notes,
        status="pending",
    )
    db.add(ad)
    await db.commit()

    # Re-fetch with relationships for the response
    ad = await _get_ad_or_404(db, ad.id)
    return _ad_to_response(ad)


@router.put("/{ad_id}", response_model=AdResponse)
async def update_ad(
    ad_id: UUID,
    payload: AdUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update specific ad fields."""
    ad = await _get_ad_or_404(db, ad_id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ad, field, value)

    await db.commit()
    ad = await _get_ad_or_404(db, ad_id)
    return _ad_to_response(ad)


@router.delete("/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ad(
    ad_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hard-delete an ad (and its analysis via cascade)."""
    ad = await db.get(Ad, ad_id)
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    await db.delete(ad)
    await db.commit()
    return None