"""
Analysis endpoints — trigger Grok analysis on stored ads.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services import analysis_service


router = APIRouter(tags=["analysis"])


class AnalyzeResponse(BaseModel):
    ad_id: UUID
    success: bool
    confidence_score: float
    hook_type: Optional[str] = None
    angle: Optional[str] = None
    offer_type: Optional[str] = None
    summary: Optional[str] = None
    error: Optional[str] = None


class BulkAnalyzeRequest(BaseModel):
    ad_ids: List[UUID]


class BulkAnalyzeResponse(BaseModel):
    results: List[AnalyzeResponse]
    total: int
    succeeded: int
    failed: int


@router.post(
    "/competitor-ads/{ad_id}/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
)
async def analyze_ad(
    ad_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run Grok analysis on a single ad. Synchronous — waits for completion."""
    try:
        analysis = await analysis_service.run_analysis(str(ad_id), db)
        return AnalyzeResponse(
            ad_id=ad_id,
            success=True,
            confidence_score=analysis.confidence_score,
            hook_type=analysis.hook_type,
            angle=analysis.angle,
            offer_type=analysis.offer_type,
            summary=analysis.summary,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"AI provider error: {type(e).__name__}: {str(e)[:200]}",
        )


@router.post(
    "/competitor-ads/bulk-analyze",
    response_model=BulkAnalyzeResponse,
)
async def bulk_analyze(
    payload: BulkAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run analysis on multiple ads sequentially. Returns per-ad results."""
    results: List[AnalyzeResponse] = []
    succeeded = 0
    failed = 0

    for ad_id in payload.ad_ids:
        try:
            analysis = await analysis_service.run_analysis(str(ad_id), db)
            results.append(
                AnalyzeResponse(
                    ad_id=ad_id,
                    success=True,
                    confidence_score=analysis.confidence_score,
                    hook_type=analysis.hook_type,
                    angle=analysis.angle,
                    offer_type=analysis.offer_type,
                    summary=analysis.summary,
                )
            )
            succeeded += 1
        except Exception as e:
            results.append(
                AnalyzeResponse(
                    ad_id=ad_id,
                    success=False,
                    confidence_score=0.0,
                    error=f"{type(e).__name__}: {str(e)[:200]}",
                )
            )
            failed += 1

    return BulkAnalyzeResponse(
        results=results,
        total=len(payload.ad_ids),
        succeeded=succeeded,
        failed=failed,
    )
