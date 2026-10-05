"""
Meta (Facebook) browser session for the Ad Library scraper.

An operator exports the cookies of a logged-in facebook.com tab (Cookie-Editor
JSON, a Playwright storage_state, or a raw "name=value; ..." Cookie header) and
uploads them here. They are stored as a Playwright storage_state file at
META_STORAGE_STATE_PATH, which run_scraper.py loads on every run.

Cookie values are credentials: they are never logged or returned by the API.
"""

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# Present only when a Facebook account is logged in.
LOGIN_COOKIES = ("c_user", "xs")
SAME_SITE = {"strict": "Strict", "lax": "Lax", "none": "None", "no_restriction": "None", "unspecified": "Lax"}


def session_path() -> Optional[Path]:
    path = os.getenv("META_STORAGE_STATE_PATH", "")
    return Path(path) if path else None


def _to_playwright_cookie(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    name, value = raw.get("name"), raw.get("value")
    if not name or value is None:
        return None
    domain = raw.get("domain") or ".facebook.com"
    if "facebook.com" not in domain:
        return None
    expires = raw.get("expires", raw.get("expirationDate"))
    same_site = SAME_SITE.get(str(raw.get("sameSite") or "").lower(), "Lax")
    secure = bool(raw.get("secure", True))
    return {
        "name": str(name),
        "value": str(value),
        "domain": domain,
        "path": raw.get("path") or "/",
        "expires": float(expires) if expires not in (None, "", -1) else -1,
        "httpOnly": bool(raw.get("httpOnly", False)),
        # Browsers reject SameSite=None without Secure.
        "secure": secure or same_site == "None",
        "sameSite": same_site,
    }


def parse_cookies(payload: Any) -> List[Dict[str, Any]]:
    """Accept Cookie-Editor JSON, a storage_state object, or a Cookie header string."""
    if isinstance(payload, str):
        text = payload.strip()
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            # "c_user=123; xs=abc; ..." copied from a request header
            payload = [
                {"name": part.split("=", 1)[0].strip(), "value": part.split("=", 1)[1].strip()}
                for part in text.removeprefix("Cookie:").split(";")
                if "=" in part
            ]
    if isinstance(payload, dict):
        payload = payload.get("cookies", [])
    if not isinstance(payload, list):
        raise ValueError("Expected a list of cookies")

    cookies = [c for c in (_to_playwright_cookie(r) for r in payload if isinstance(r, dict)) if c]
    names = {c["name"] for c in cookies}
    missing = [n for n in LOGIN_COOKIES if n not in names]
    if missing:
        raise ValueError(
            f"Not a logged-in Facebook session: missing cookie(s) {', '.join(missing)}. "
            "Export the cookies while logged in on facebook.com."
        )
    return cookies


def save_cookies(payload: Any) -> Dict[str, Any]:
    path = session_path()
    if not path:
        raise ValueError("META_STORAGE_STATE_PATH is not configured")
    cookies = parse_cookies(payload)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump({"cookies": cookies, "origins": []}, f)
    tmp.replace(path)
    return status()


def clear() -> Dict[str, Any]:
    path = session_path()
    if path:
        path.unlink(missing_ok=True)
    return status()


def status() -> Dict[str, Any]:
    """Session summary without any cookie values."""
    path = session_path()
    info: Dict[str, Any] = {
        "configured": bool(path),
        "logged_in": False,
        "cookie_count": 0,
        "expires_at": None,
        "expired": False,
        "updated_at": None,
    }
    if not path or not path.exists():
        return info
    try:
        cookies = json.loads(path.read_text(encoding="utf-8")).get("cookies", [])
    except (OSError, json.JSONDecodeError):
        return info

    by_name = {c.get("name"): c for c in cookies}
    info["cookie_count"] = len(cookies)
    info["updated_at"] = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()
    if all(n in by_name for n in LOGIN_COOKIES):
        expiries = [by_name[n].get("expires", -1) for n in LOGIN_COOKIES]
        dated = [e for e in expiries if e and e > 0]
        if dated:
            soonest = min(dated)
            info["expires_at"] = datetime.fromtimestamp(soonest, tz=timezone.utc).isoformat()
            info["expired"] = soonest < time.time()
        info["logged_in"] = not info["expired"]
    return info
