"""
Centralized AI Client — switchable between xAI (Grok) and Groq.

Config via settings (from .env):
  AI_PROVIDER   = "xai" | "groq"  (default: "xai")
  XAI_API_KEY   = xai-...
  XAI_MODEL     = grok-4.3 (default)
  XAI_BASE_URL  = https://api.x.ai/v1 (default)
  GROQ_API_KEY  = gsk_...
  GROQ_MODEL    = openai/gpt-oss-120b (default)

The other provider is used automatically when the configured one is out of
credits, over its limits or missing the model.

xAI's API is OpenAI-compatible, so we use the openai library with base_url override.
"""

import asyncio
import logging
import time

from app.config import settings

logger = logging.getLogger(__name__)

# Providers that just told us they cannot serve (no credits, daily cap, model
# gone) are skipped until this time, so every call doesn't retry them first.
_unavailable_until: dict = {}
_last_model: str = ""

RATE_LIMIT_MAX_WAIT = 90     # seconds we will wait out a per-minute limit
RATE_LIMIT_RETRIES = 4
UNAVAILABLE_COOLDOWN = 3600  # recheck a provider that ran out after an hour


class AIProvidersExhausted(RuntimeError):
    """No configured provider can take requests right now (credits/limits)."""


def _provider_order() -> list:
    primary = "groq" if settings.AI_PROVIDER.lower() == "groq" else "xai"
    secondary = "xai" if primary == "groq" else "groq"
    order = [primary]
    if (settings.GROQ_API_KEY if secondary == "groq" else settings.XAI_API_KEY):
        order.append(secondary)
    return order


def _model_for(provider: str) -> str:
    return settings.XAI_MODEL if provider == "xai" else settings.GROQ_MODEL


def get_provider_info() -> dict:
    """Return current AI provider info for logging."""
    if settings.AI_PROVIDER.lower() == "xai":
        return {"provider": "xAI (Grok)", "model": settings.XAI_MODEL, "base_url": settings.XAI_BASE_URL,
                "fallback": "Groq" if settings.GROQ_API_KEY else None}
    else:
        return {"provider": "Groq", "model": settings.GROQ_MODEL, "base_url": "https://api.groq.com",
                "fallback": "xAI (Grok)" if settings.XAI_API_KEY else None}


def get_model_name() -> str:
    """Model that answered the most recent call (falls back to the primary's)."""
    return _last_model or _model_for(_provider_order()[0])


def _classify(exc: Exception):
    """('unavailable', seconds) | ('rate_limited', seconds) | ('error', None)."""
    status = getattr(exc, "status_code", None)
    text = str(exc).lower()
    headers = getattr(getattr(exc, "response", None), "headers", None) or {}
    try:
        retry_after = float(headers.get("retry-after") or 0)
    except (TypeError, ValueError):
        retry_after = 0
    if status in (401, 402, 403) or "credits" in text or "spending limit" in text:
        return "unavailable", UNAVAILABLE_COOLDOWN
    if status == 404 or "model_not_found" in text or "does not exist" in text:
        return "unavailable", UNAVAILABLE_COOLDOWN
    if status == 429:
        # A long wait means a daily cap, not a per-minute one.
        if retry_after > RATE_LIMIT_MAX_WAIT or "per day" in text:
            return "unavailable", max(retry_after, 600)
        return "rate_limited", retry_after or 15
    return "error", None


async def chat_completion(
    messages: list,
    temperature: float = 0.3,
    max_tokens: int = 1024,
    json_mode: bool = True,
) -> str:
    """
    Chat completion with automatic fallback between xAI and Groq.

    A provider that is out of credits, over its daily cap or missing the model
    is skipped (for an hour) and the other one is used; per-minute rate limits
    are waited out. Raises AIProvidersExhausted when nothing can serve.
    """
    global _last_model
    reasons = []
    for provider in _provider_order():
        if _unavailable_until.get(provider, 0) > time.time():
            reasons.append(f"{provider}: unavailable (cached)")
            continue
        call = _call_xai if provider == "xai" else _call_groq
        for attempt in range(RATE_LIMIT_RETRIES + 1):
            try:
                content = await call(messages, temperature, max_tokens, json_mode)
                _last_model = _model_for(provider)
                return content
            except Exception as exc:  # noqa: BLE001 — classified below
                kind, seconds = _classify(exc)
                if kind == "rate_limited" and attempt < RATE_LIMIT_RETRIES:
                    await asyncio.sleep(seconds + 1)
                    continue
                if kind in ("unavailable", "rate_limited"):
                    _unavailable_until[provider] = time.time() + (seconds or UNAVAILABLE_COOLDOWN)
                    logger.warning(f"[ai] {provider} unavailable, trying next provider: {str(exc)[:160]}")
                    reasons.append(f"{provider}: {str(exc)[:120]}")
                    break
                raise
    raise AIProvidersExhausted("No AI provider can take requests right now — " + " | ".join(reasons))


async def _call_xai(messages, temperature, max_tokens, json_mode) -> str:
    """Call xAI (Grok) via OpenAI-compatible API."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(
        api_key=settings.XAI_API_KEY,
        base_url=settings.XAI_BASE_URL,
    )

    kwargs = {
        "model": settings.XAI_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = await client.chat.completions.create(**kwargs)
    content = response.choices[0].message.content
    if content is None:
        raise ValueError("xAI returned empty response")
    return content


async def _call_groq(messages, temperature, max_tokens, json_mode) -> str:
    """Call Groq (fallback)."""
    from groq import AsyncGroq

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    kwargs = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if "gpt-oss" in settings.GROQ_MODEL:
        # Reasoning model: keep the thinking short so the answer fits max_tokens.
        # (extra_body: the installed groq SDK predates the named parameter.)
        kwargs["extra_body"] = {"reasoning_effort": "low"}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = await client.chat.completions.create(**kwargs)
    content = response.choices[0].message.content
    if content is None:
        raise ValueError("Groq returned empty response")
    return content
