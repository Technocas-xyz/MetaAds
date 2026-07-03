"""
Review Queue endpoints — manual review of low-confidence or flagged analyses.
"""

from datetime import datetime, timezone
from math import ceil
from typing import List, Optional
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
from app.models.review_queue import ReviewQueue
from app.models.competitor import Competitor
from app.schemas.review import (
    ReviewQueueSummary,
    ReasonBreakdown,
    ReviewQueueList,
    ReviewItem,
    ReviewItemDetail,
    ReviewAdInfo,
    ReviewCompetitor,
    ReviewAIInsights,
    InsightField,
    AssignedUser,
    PaginationMeta,
    ApproveRequest,
    UpdateReviewRequest,
    BulkActionRequest,
    BulkReassignRequest,
    ActionResult,
    BulkResult,
)


router = APIRouter(tags=["review-queue"])


REASON_LABELS = {
    "low_confidence": "Low Confidence Score",
    "missing_info": "Missing Information",
    "flagged_by_rule": "Flagged by Rule",
}


# ---------- Helpers ----------

def _build_insights(analysis: Optional[AdAnalysis]) -> ReviewAIInsights:
    """Convert AdAnalysis row to nested ReviewAIInsights shape."""
    if not analysis:
        return ReviewAIInsights()
    return ReviewAIInsights(
        hook=InsightField(value=analysis.hook_text, confidence=analysis.hook_confidence or 0),
        hook_type=InsightField(value=analysis.hook_type, confidence=analysis.hook_confidence or 0),
        angle=InsightField(value=analysis.angle, confidence=analysis.angle_confidence or 0),
        offer_type=InsightField(value=analysis.offer_type, confidence=analysis.offer_confidence or 0),
        offer_value=InsightField(value=analysis.offer_value, confidence=analysis.offer_confidence or 0),
        creative_format=InsightField(value=analysis.creative_format, confidence=85),
        product_line=InsightField(value=analysis.product_line, confidence=85),
        audience_type=InsightField(value=analysis.audience_type, confidence=70),
        usp_detected=InsightField(value=analysis.usp_detected, confidence=80),
        overall=analysis.confidence_score or 0,
    )


def _build_review_item(
    queue_row: ReviewQueue, ad: Ad, competitor: Competitor, analysis: Optional[AdAnalysis]
) -> ReviewItem:
    """Assemble a ReviewItem from joined data."""
    ad_info = ReviewAdInfo(
        id=str(ad.id),
        thumbnail=ad.media_url,
        media_url=ad.media_url,
        platform=ad.platform,
        is_video=ad.is_video,
        headline=ad.headline,
        primary_text=ad.primary_text,
        cta=ad.cta,
        ad_url=ad.ad_url,
        landing_page=ad.landing_url,
        ad_library_id=ad.ad_library_id,
        first_seen=ad.first_seen,
        last_seen=ad.last_seen,
        duration=None,
    )
    comp = ReviewCompetitor(
        id=str(competitor.id),
        name=competitor.name,
        tier=competitor.tier,
        region=competitor.region,
    )

    return ReviewItem(
        id=str(queue_row.id),
        ad=ad_info,
        competitor=comp,
        ai_insights=_build_insights(analysis),
        evidence=None,
        ai_notes=analysis.ai_notes if analysis else None,
        reason=queue_row.reason,
        reason_label=queue_row.reason_label or REASON_LABELS.get(queue_row.reason, "Review Needed"),
        reason_detail=queue_row.reason_detail,
        confidence_score=analysis.confidence_score if analysis else 0,
        priority=queue_row.priority or "Medium",
        assigned_to=None,
        added_at=queue_row.created_at,
        status=queue_row.status or "pending",
    )


# ---------- Endpoints ----------

@router.get("/review-queue/summary", response_model=ReviewQueueSummary)
async def get_review_queue_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """KPI cards on the Review Queue page."""
    total_stmt = select(func.count(ReviewQueue.id)).where(
        ReviewQueue.status == "pending"
    )
    total = (await db.execute(total_stmt)).scalar() or 0

    async def _by_reason(reason: str) -> int:
        stmt = select(func.count(ReviewQueue.id)).where(
            ReviewQueue.status == "pending",
            ReviewQueue.reason == reason,
        )
        return (await db.execute(stmt)).scalar() or 0

    low_c = await _by_reason("low_confidence")
    missing = await _by_reason("missing_info")
    flagged = await _by_reason("flagged_by_rule")

    def pct(n: int) -> float:
        return round(n / total * 100, 1) if total else 0.0

    return ReviewQueueSummary(
        total=total,
        low_confidence=ReasonBreakdown(count=low_c, pct=pct(low_c)),
        missing_info=ReasonBreakdown(count=missing, pct=pct(missing)),
        flagged=ReasonBreakdown(count=flagged, pct=pct(flagged)),
        assigned_to_me=0,
    )


@router.get("/review-queue", response_model=ReviewQueueList)
async def list_review_queue(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    reason: Optional[str] = None,
    priority: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List pending review items, paginated."""
    base_stmt = (
        select(ReviewQueue, Ad, Competitor, AdAnalysis)
        .join(Ad, Ad.id == ReviewQueue.ad_id)
        .join(Competitor, Competitor.id == Ad.competitor_id)
        .outerjoin(AdAnalysis, AdAnalysis.ad_id == Ad.id)
        .where(ReviewQueue.status == "pending")
    )
    if reason:
        base_stmt = base_stmt.where(ReviewQueue.reason == reason)
    if priority:
        base_stmt = base_stmt.where(ReviewQueue.priority == priority)

    # Count
    count_stmt = select(func.count(ReviewQueue.id)).where(
        ReviewQueue.status == "pending"
    )
    if reason:
        count_stmt = count_stmt.where(ReviewQueue.reason == reason)
    if priority:
        count_stmt = count_stmt.where(ReviewQueue.priority == priority)
    total = (await db.execute(count_stmt)).scalar() or 0

    # Order + paginate
    base_stmt = base_stmt.order_by(ReviewQueue.created_at.desc())
    base_stmt = base_stmt.offset((page - 1) * per_page).limit(per_page)

    rows = (await db.execute(base_stmt)).all()
    items = [_build_review_item(q, ad, comp, a) for (q, ad, comp, a) in rows]

    return ReviewQueueList(
        data=items,
        meta=PaginationMeta(
            total=total,
            page=page,
            per_page=per_page,
            total_pages=ceil(total / per_page) if per_page else 0,
        ),
    )


@router.get("/review-queue/{item_id}", response_model=ReviewItemDetail)
async def get_review_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single review item with prev/next nav for detail page."""
    item_stmt = (
        select(ReviewQueue, Ad, Competitor, AdAnalysis)
        .join(Ad, Ad.id == ReviewQueue.ad_id)
        .join(Competitor, Competitor.id == Ad.competitor_id)
        .outerjoin(AdAnalysis, AdAnalysis.ad_id == Ad.id)
        .where(ReviewQueue.id == item_id)
    )
    row = (await db.execute(item_stmt)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Review item not found")

    base_item = _build_review_item(*row)

    # All pending items ordered by created_at for navigation
    nav_stmt = (
        select(ReviewQueue.id)
        .where(ReviewQueue.status == "pending")
        .order_by(ReviewQueue.created_at.desc())
    )
    all_ids = [str(r[0]) for r in (await db.execute(nav_stmt)).all()]

    position = 0
    prev_id = None
    next_id = None
    if str(item_id) in all_ids:
        idx = all_ids.index(str(item_id))
        position = idx + 1
        if idx > 0:
            prev_id = all_ids[idx - 1]
        if idx < len(all_ids) - 1:
            next_id = all_ids[idx + 1]

    return ReviewItemDetail(
        **base_item.model_dump(),
        position=position,
        total=len(all_ids),
        prev_id=prev_id,
        next_id=next_id,
    )


@router.post("/review/{item_id}/approve", response_model=ActionResult)
async def approve_review_item(
    item_id: UUID,
    payload: ApproveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve a single review item — marks it done + updates the ad."""
    item = await db.get(ReviewQueue, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Review item not found")

    item.status = "approved"
    item.resolved_at = datetime.now(timezone.utc)
    item.resolved_by = current_user.id

    # Also approve the underlying ad
    ad = await db.get(Ad, item.ad_id)
    if ad:
        ad.status = "approved"

    await db.commit()
    return ActionResult(id=str(item_id), status="approved")


@router.post("/review/{item_id}/update", response_model=ActionResult)
async def update_review_item(
    item_id: UUID,
    payload: UpdateReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually correct AI fields, then mark the item resolved."""
    item = await db.get(ReviewQueue, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Review item not found")

    # Update analysis fields if provided
    analysis_stmt = select(AdAnalysis).where(AdAnalysis.ad_id == item.ad_id)
    analysis = (await db.execute(analysis_stmt)).scalar_one_or_none()
    if analysis:
        data = payload.model_dump(exclude_unset=True, exclude={"notes"})
        for k, v in data.items():
            setattr(analysis, k, v)

    item.status = "resolved"
    item.resolved_at = datetime.now(timezone.utc)
    item.resolved_by = current_user.id

    await db.commit()
    return ActionResult(id=str(item_id), status="updated")


@router.post("/review-queue/bulk-approve", response_model=BulkResult)
async def bulk_approve(
    payload: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve multiple review items at once."""
    approved = 0
    for item_id in payload.ids:
        try:
            item = await db.get(ReviewQueue, UUID(item_id))
            if item and item.status == "pending":
                item.status = "approved"
                item.resolved_at = datetime.now(timezone.utc)
                item.resolved_by = current_user.id
                ad = await db.get(Ad, item.ad_id)
                if ad:
                    ad.status = "approved"
                approved += 1
        except (ValueError, Exception):
            continue
    await db.commit()
    return BulkResult(approved=approved)


@router.post("/review-queue/bulk-rerun", response_model=BulkResult)
async def bulk_rerun_ai(
    payload: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Queue items to re-run AI analysis (stub for now — analyses run synchronously)."""
    return BulkResult(queued=len(payload.ids))


@router.post("/review-queue/bulk-reassign", response_model=BulkResult)
async def bulk_reassign(
    payload: BulkReassignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reassign items to a user (stub for now — user assignment not yet implemented)."""
    return BulkResult(reassigned=len(payload.ids))


@router.post("/review/{item_id}", response_model=ActionResult)
async def submit_to_review(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a queue item as in-review (stub for now)."""
    item = await db.get(ReviewQueue, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Review item not found")
    item.status = "in_review"
    await db.commit()
    return ActionResult(id=str(item_id), status="in_review")