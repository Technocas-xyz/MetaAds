"""
Brief generation service — pulls competitor ad intelligence from DB,
builds a rich Groq prompt with actual ad copy, saves the result.

Flow:
  1. Validate competitor_ids (if provided)
  2. Pull top 8 ads by confidence DESC (filtered or all)
  3. Build prompt with actual headline + copy + classifications
  4. Call Groq (json_object mode, async)
  5. Parse JSON — raise ValueError on failure
  6. Save Brief row (status="active")
  7. Return (Brief, data_quality)
"""

import json
import re
from typing import List, Optional
from uuid import UUID

from groq import AsyncGroq
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.brief import Brief
from app.models.competitor import Competitor


# ── Prompt templates ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert direct-response advertising strategist specialising in
Facebook and Instagram paid social campaigns. You analyse competitor ad intelligence and
produce precise, actionable creative briefs for in-house design teams.
Output valid JSON only — no markdown, no prose, no code fences."""


def _build_user_prompt(
    target_audience: str,
    goal: str,
    platform: str,
    ad_examples: list[dict],
    data_limited: bool,
) -> str:
    """Construct the user-turn prompt with real competitor ad data."""

    if data_limited:
        context_note = (
            "NOTE: Limited competitor data available — fewer than 3 analysed ads found. "
            "Generate the brief based primarily on the campaign parameters below."
        )
    else:
        context_note = ""

    # Build numbered ad examples block
    if ad_examples:
        examples_lines = []
        for i, ad in enumerate(ad_examples, start=1):
            copy_preview = (ad.get("primary_text") or "")[:200].strip()
            if len(ad.get("primary_text") or "") > 200:
                copy_preview += "..."
            examples_lines.append(
                f'{i}. {ad["competitor_name"]} | {ad["platform"]} | '
                f'{ad["hook_type"]} hook | {ad["angle"]} angle | '
                f'{ad["confidence_score"]:.0f}% confidence\n'
                f'   Headline: "{ad["headline"] or "N/A"}"\n'
                f'   Copy: "{copy_preview or "N/A"}"'
            )
        examples_block = "\n".join(examples_lines)
    else:
        examples_block = "No competitor ads available."

    return f"""Generate a creative brief based on the following competitor intelligence and campaign parameters.

{context_note}

COMPETITOR AD INTELLIGENCE ({len(ad_examples)} highest-confidence ads):
{examples_block}

CAMPAIGN PARAMETERS:
- Target audience: {target_audience}
- Campaign goal: {goal}
- Platform: {platform}

Return ONLY valid JSON with this exact structure:
{{
  "title": "descriptive brief title (max 80 chars)",
  "hook_type": "Pain | Benefit | Curiosity | Urgency | How To | Social Proof | Trust",
  "angle": "Price | Quality | Speed | Convenience | Innovation | Trust",
  "offer_type": "Discount | Free Shipping | Bundle | BOGO | Limited Time | Free Trial | Guarantee | None",
  "target_audience": "refined audience description based on intelligence",
  "key_messages": ["message 1", "message 2", "message 3"],
  "suggested_copy": "1-2 sentence ad copy suggestion that would resonate with the target audience"
}}

Rules:
- hook_type and angle must be exactly one of the listed values
- key_messages must be an array of 3-5 short strings
- suggested_copy should be direct-response style, not generic
- Base recommendations on the actual competitor copy patterns above"""


# ── JSON extraction ───────────────────────────────────────────────────────────

def _extract_json(raw: str) -> dict:
    """Extract JSON from Groq response. Tolerant of stray markdown fences."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON object in response: {raw[:300]}")
    return json.loads(cleaned[start : end + 1])


# ── Main service function ─────────────────────────────────────────────────────

async def generate_brief(
    target_audience: str,
    goal: str,
    platform: str,
    competitor_ids: Optional[List[UUID]],
    created_by: UUID,
    db: AsyncSession,
) -> tuple[Brief, str]:
    """
    Generate and save a creative brief using Groq.

    Returns:
        (Brief ORM object, data_quality)
        data_quality: "full" | "limited"

    Raises:
        ValueError: invalid competitor_ids or Groq JSON parse failure
    """

    # ── 1. Validate competitor_ids ────────────────────────────────────────────
    # Normalise: treat empty list same as None
    filter_ids: Optional[List[UUID]] = competitor_ids if competitor_ids else None

    if filter_ids:
        for cid in filter_ids:
            comp = await db.get(Competitor, cid)
            if not comp:
                raise ValueError(f"competitor_id not found: {cid}")

    # ── 2. Pull top 8 ads by confidence DESC ──────────────────────────────────
    stmt = (
        select(Ad, AdAnalysis, Competitor)
        .join(AdAnalysis, AdAnalysis.ad_id == Ad.id)
        .join(Competitor, Competitor.id == Ad.competitor_id)
        .where(AdAnalysis.confidence_score.is_not(None))
    )
    if filter_ids:
        stmt = stmt.where(Ad.competitor_id.in_(filter_ids))

    stmt = stmt.order_by(AdAnalysis.confidence_score.desc()).limit(8)
    rows = (await db.execute(stmt)).all()

    ad_examples = [
        {
            "competitor_name": comp.name,
            "platform": ad.platform,
            "hook_type": analysis.hook_type or "Unknown",
            "angle": analysis.angle or "Unknown",
            "offer_type": analysis.offer_type or "None",
            "confidence_score": analysis.confidence_score,
            "headline": ad.headline,
            "primary_text": ad.primary_text,
        }
        for ad, analysis, comp in rows
    ]

    data_limited = len(ad_examples) < 3
    data_quality = "limited" if data_limited else "full"

    # ── 3. Build prompt ───────────────────────────────────────────────────────
    user_prompt = _build_user_prompt(
        target_audience=target_audience,
        goal=goal,
        platform=platform,
        ad_examples=ad_examples,
        data_limited=data_limited,
    )

    # ── 4. Call Groq ──────────────────────────────────────────────────────────
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    response = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.4,
        max_tokens=1500,
        response_format={"type": "json_object"},
    )

    raw_output = response.choices[0].message.content
    if not raw_output:
        raise ValueError("Groq returned empty response")

    # ── 5. Parse JSON ─────────────────────────────────────────────────────────
    try:
        data = _extract_json(raw_output)
    except (json.JSONDecodeError, ValueError) as exc:
        raise ValueError(f"AI generation failed, please retry. ({exc})") from exc

    # ── 6. Save Brief ─────────────────────────────────────────────────────────
    key_messages = data.get("key_messages", [])
    # Ensure it's a list of strings (Groq occasionally returns a single string)
    if isinstance(key_messages, str):
        key_messages = [key_messages]
    key_messages = [str(m) for m in key_messages]

    brief = Brief(
        title=str(data.get("title", "AI-Generated Brief"))[:255],
        hook_type=data.get("hook_type"),
        angle=data.get("angle"),
        offer_type=data.get("offer_type"),
        platform=platform,
        target_audience=data.get("target_audience") or target_audience,
        key_messages=key_messages,
        suggested_copy=data.get("suggested_copy"),
        status="active",
        created_by=created_by,
    )
    db.add(brief)
    await db.commit()
    await db.refresh(brief)

    return brief, data_quality
