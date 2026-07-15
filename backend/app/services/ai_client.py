"""
Centralized AI Client — switchable between xAI (Grok) and Groq.

Config via settings (from .env):
  AI_PROVIDER   = "xai" | "groq"  (default: "xai")
  XAI_API_KEY   = xai-...
  XAI_MODEL     = grok-4.3 (default)
  XAI_BASE_URL  = https://api.x.ai/v1 (default)
  GROQ_API_KEY  = gsk_...
  GROQ_MODEL    = llama-3.3-70b-versatile (default)

xAI's API is OpenAI-compatible, so we use the openai library with base_url override.
"""

import logging

from app.config import settings

logger = logging.getLogger(__name__)


def get_provider_info() -> dict:
    """Return current AI provider info for logging."""
    if settings.AI_PROVIDER.lower() == "xai":
        return {"provider": "xAI (Grok)", "model": settings.XAI_MODEL, "base_url": settings.XAI_BASE_URL}
    else:
        return {"provider": "Groq", "model": settings.GROQ_MODEL, "base_url": "https://api.groq.com"}


def get_model_name() -> str:
    """Return the active model name."""
    return settings.XAI_MODEL if settings.AI_PROVIDER.lower() == "xai" else settings.GROQ_MODEL


async def chat_completion(
    messages: list,
    temperature: float = 0.3,
    max_tokens: int = 1024,
    json_mode: bool = True,
) -> str:
    """
    Make a chat completion call using the configured AI provider.

    Returns the raw content string from the model's response.
    Raises on API errors.
    """
    if settings.AI_PROVIDER.lower() == "xai":
        return await _call_xai(messages, temperature, max_tokens, json_mode)
    else:
        return await _call_groq(messages, temperature, max_tokens, json_mode)


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
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = await client.chat.completions.create(**kwargs)
    content = response.choices[0].message.content
    if content is None:
        raise ValueError("Groq returned empty response")
    return content
