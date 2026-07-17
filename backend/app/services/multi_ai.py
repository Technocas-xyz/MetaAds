"""
Multi-AI Provider Service — runs prompts across multiple engines in parallel.

Supports: OpenAI (ChatGPT), Anthropic (Claude), Groq, xAI (Grok).
Each provider is a thin adapter with the same interface.
Keys come from env only — missing key = engine unavailable.
"""

import asyncio
import logging
import time
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


# ─── Provider registry ────────────────────────────────────────────────────────

PROVIDERS = {
    "openai": {
        "name": "ChatGPT",
        "env_key": "OPENAI_API_KEY",
        "model_env": "OPENAI_MODEL",
        "default_model": "gpt-4o",
    },
    "anthropic": {
        "name": "Claude",
        "env_key": "ANTHROPIC_API_KEY",
        "model_env": "ANTHROPIC_MODEL",
        "default_model": "claude-sonnet-4-20250514",
    },
    "groq": {
        "name": "Groq",
        "env_key": "GROQ_API_KEY",
        "model_env": "GROQ_MODEL",
        "default_model": "llama-3.3-70b-versatile",
    },
    "xai": {
        "name": "Grok",
        "env_key": "XAI_API_KEY",
        "model_env": "XAI_MODEL",
        "default_model": "grok-4.3",
    },
}


def get_engine_status() -> list:
    """Return availability status of each engine."""
    result = []
    for key, info in PROVIDERS.items():
        api_key = getattr(settings, info["env_key"], "")
        model = getattr(settings, info["model_env"], info["default_model"])
        configured = bool(api_key and len(api_key) > 5)
        result.append({
            "id": key,
            "name": info["name"],
            "model": model if configured else None,
            "configured": configured,
        })
    return result


async def run_prompt_on_engine(
    engine_id: str,
    prompt: str,
    system_prompt: str = "You are an expert advertising strategist.",
    max_tokens: int = 2048,
    temperature: float = 0.5,
) -> dict:
    """
    Run a prompt on a single engine. Returns result dict with output or error.
    Never raises — errors are captured in the response.
    """
    start = time.time()
    info = PROVIDERS.get(engine_id)
    if not info:
        return {"engine": engine_id, "error": f"Unknown engine: {engine_id}", "duration": 0}

    api_key = getattr(settings, info["env_key"], "")
    model = getattr(settings, info["model_env"], info["default_model"])

    if not api_key or len(api_key) < 5:
        return {
            "engine": engine_id,
            "name": info["name"],
            "model": None,
            "error": "Not configured — API key not set in environment",
            "duration": 0,
        }

    try:
        if engine_id == "openai":
            output = await _call_openai(api_key, model, system_prompt, prompt, max_tokens, temperature)
        elif engine_id == "anthropic":
            output = await _call_anthropic(api_key, model, system_prompt, prompt, max_tokens, temperature)
        elif engine_id == "groq":
            output = await _call_groq(api_key, model, system_prompt, prompt, max_tokens, temperature)
        elif engine_id == "xai":
            output = await _call_xai(api_key, model, system_prompt, prompt, max_tokens, temperature)
        else:
            output = None

        duration = round(time.time() - start, 2)
        return {
            "engine": engine_id,
            "name": info["name"],
            "model": model,
            "output": output,
            "error": None,
            "duration": duration,
        }

    except Exception as e:
        duration = round(time.time() - start, 2)
        error_msg = str(e)[:300]
        logger.warning(f"[multi-ai] {info['name']} failed: {error_msg}")
        return {
            "engine": engine_id,
            "name": info["name"],
            "model": model,
            "output": None,
            "error": error_msg,
            "duration": duration,
        }


async def run_prompt_multi(
    engines: list,
    prompt: str,
    system_prompt: str = "You are an expert advertising strategist.",
    max_tokens: int = 2048,
    temperature: float = 0.5,
) -> list:
    """Run the same prompt on multiple engines in parallel."""
    tasks = [
        run_prompt_on_engine(eng, prompt, system_prompt, max_tokens, temperature)
        for eng in engines
    ]
    return await asyncio.gather(*tasks)


# ─── Provider adapters ────────────────────────────────────────────────────────

async def _call_openai(api_key, model, system_prompt, prompt, max_tokens, temperature) -> str:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=api_key)
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return response.choices[0].message.content or ""


async def _call_anthropic(api_key, model, system_prompt, prompt, max_tokens, temperature) -> str:
    import httpx
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "system": system_prompt,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["content"][0]["text"]


async def _call_groq(api_key, model, system_prompt, prompt, max_tokens, temperature) -> str:
    from groq import AsyncGroq
    client = AsyncGroq(api_key=api_key)
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return response.choices[0].message.content or ""


async def _call_xai(api_key, model, system_prompt, prompt, max_tokens, temperature) -> str:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=api_key, base_url=settings.XAI_BASE_URL)
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return response.choices[0].message.content or ""
