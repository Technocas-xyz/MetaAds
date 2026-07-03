"""
AI Analysis Service — uses Groq to classify ad copy.

Input: an ad's headline + primary_text + cta + landing_url
Output: structured AdAnalysis with hook/angle/offer + confidence scores
Side effects: saves AdAnalysis row; adds to ReviewQueue if low confidence
"""

import json
import re
from datetime import datetime, timezone

from groq import AsyncGroq
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.review_queue import ReviewQueue


# ---------- Prompts ----------

ANALYSIS_SYSTEM_PROMPT = """You are an expert direct-response advertising analyst.
Analyze the provided ad copy and return a structured JSON analysis.
Be precise and base your analysis ONLY on the provided text.
Output valid JSON only — no markdown, no commentary, no code fences."""


ANALYSIS_USER_PROMPT_TEMPLATE = """Analyze this advertisement and return ONLY valid JSON with this exact structure:

{{
  "hook": "the exact hook sentence or phrase from the ad",
  "hook_type": "Pain | Benefit | Curiosity | Urgency | How To | Social Proof | Trust",
  "angle": "Price | Quality | Speed | Convenience | Innovation | Trust",
  "angle_detail": "brief explanation of the angle",
  "offer_type": "Discount | Free Shipping | Bundle | Limited Time | BOGO | Free Trial | None",
  "offer_value": "specific offer details or null",
  "creative_format": "UGC | Product Demo | Testimonial | Lifestyle | Direct Response | Infographic",
  "product_line": "product category",
  "audience_type": "target audience description",
  "usp_detected": "unique selling proposition",
  "confidence": {{
    "hook": 0-100,
    "hook_type": 0-100,
    "angle": 0-100,
    "offer_type": 0-100,
    "overall": 0-100
  }},
  "ai_notes": "brief analysis commentary",
  "summary": "1-2 sentence human-readable summary",
  "suggested_angle": "counter-angle recommendation for our own ad",
  "suggested_hook": "counter-hook recommendation for our own ad"
}}

Advertisement to analyze:
HEADLINE: {headline}
PRIMARY TEXT: {primary_text}
CTA: {cta}
LANDING PAGE URL: {landing_url}"""


# ---------- Helpers ----------

def _extract_json(raw: str) -> dict:
    """Extract JSON object from model response. Tolerant of code fences and prose."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE)

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON object found in response: {raw[:200]}")

    json_str = cleaned[start:end + 1]
    return json.loads(json_str)


# ---------- Main service ----------

async def run_analysis(ad_id: str, db: AsyncSession) -> AdAnalysis:
    """
    Analyze a single ad with Groq. Saves AdAnalysis row.
    Returns the analysis or raises an exception on failure.
    """
    ad = await db.get(Ad, ad_id)
    if not ad:
        raise ValueError(f"Ad {ad_id} not found")

    user_prompt = ANALYSIS_USER_PROMPT_TEMPLATE.format(
        headline=ad.headline or "N/A",
        primary_text=ad.primary_text or "N/A",
        cta=ad.cta or "N/A",
        landing_url=ad.landing_url or "N/A",
    )

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    response = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
        max_tokens=1024,
        response_format={"type": "json_object"},
    )

    raw_output = response.choices[0].message.content
    if raw_output is None:
        raise ValueError("Groq returned empty response")

    try:
        data = _extract_json(raw_output)
    except (json.JSONDecodeError, ValueError) as e:
        await _save_failed_analysis(ad_id, str(e), db)
        raise

    confidence = data.get("confidence", {})
    overall_conf = float(confidence.get("overall", 0))

    # Upsert AdAnalysis row
    existing_stmt = select(AdAnalysis).where(AdAnalysis.ad_id == ad_id)
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()
    analysis = existing or AdAnalysis(ad_id=ad_id)
    if not existing:
        db.add(analysis)

    analysis.hook_text = data.get("hook")
    analysis.hook_type = data.get("hook_type")
    analysis.angle = data.get("angle")
    analysis.angle_detail = data.get("angle_detail")
    analysis.offer_type = data.get("offer_type")
    analysis.offer_value = data.get("offer_value")
    analysis.creative_format = data.get("creative_format")
    analysis.product_line = data.get("product_line")
    analysis.audience_type = data.get("audience_type")
    analysis.usp_detected = data.get("usp_detected")
    analysis.confidence_score = overall_conf
    analysis.hook_confidence = float(confidence.get("hook", 0))
    analysis.angle_confidence = float(confidence.get("angle", 0))
    analysis.offer_confidence = float(confidence.get("offer_type", 0))
    analysis.ai_notes = data.get("ai_notes")
    analysis.summary = data.get("summary")
    analysis.suggested_angle = data.get("suggested_angle")
    analysis.suggested_hook = data.get("suggested_hook")
    analysis.model_version = settings.GROQ_MODEL
    analysis.analyzed_at = datetime.now(timezone.utc)

    # Update ad status; queue for review if low confidence
    if overall_conf >= settings.CONFIDENCE_THRESHOLD:
        ad.status = "approved"
    else:
        ad.status = "pending"
        await _ensure_review_queue_entry(ad_id, overall_conf, db)

    await db.commit()
    await db.refresh(analysis)
    return analysis


async def _ensure_review_queue_entry(ad_id: str, confidence: float, db: AsyncSession) -> None:
    """Add ad to review queue if not already there (low-confidence analyses)."""
    existing_stmt = select(ReviewQueue).where(
        ReviewQueue.ad_id == ad_id,
        ReviewQueue.status == "pending",
    )
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing:
        return

    priority = "High" if confidence < 40 else "Medium"
    queue_item = ReviewQueue(
        ad_id=ad_id,
        reason="low_confidence",
        reason_label="Low Confidence Score",
        reason_detail=f"AI confidence {confidence:.0f}% below threshold {settings.CONFIDENCE_THRESHOLD}%",
        priority=priority,
        status="pending",
    )
    db.add(queue_item)


async def _save_failed_analysis(ad_id: str, error: str, db: AsyncSession) -> None:
    """Record a failed analysis attempt in the review queue."""
    queue_item = ReviewQueue(
        ad_id=ad_id,
        reason="missing_info",
        reason_label="Analysis Failed",
        reason_detail=f"JSON parse error: {error[:200]}",
        priority="High",
        status="pending",
    )
    db.add(queue_item)
    await db.commit()