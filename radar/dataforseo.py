"""Direct DataForSEO client with an explicit AIsa fallback.

Search monitoring is routed through DataForSEO when both direct credentials are
configured. AIsa remains the fallback for existing one-key installations and keeps
handling social discovery and model calls elsewhere in the radar.

Secrets:
    DATAFORSEO_LOGIN
    DATAFORSEO_PASSWORD

Routing:
    DATAFORSEO_MODE=auto    direct when configured, otherwise AIsa (default)
    DATAFORSEO_MODE=direct  require direct credentials
    DATAFORSEO_MODE=aisa    always use the AIsa tool router

Paid calls are never retried or failed over automatically: a direct request can have
been charged even when its response is unusable, so silently calling AIsa afterwards
could double bill the same monitoring task.
"""
from __future__ import annotations

import base64
import json
import os
import urllib.error
import urllib.request

from . import UA, aisa

BASE_URL = os.environ.get("DATAFORSEO_BASE_URL", "https://api.dataforseo.com").rstrip("/")
TIMEOUT = 120
MODES = {"auto", "direct", "aisa"}

# AIsa's tool names are kept as the stable internal contract, so callers receive the
# same raw DataForSEO response whichever route is selected.
ENDPOINTS = {
    "post_dataforseo_keywords_gads_search_volume_live": "/v3/keywords_data/google_ads/search_volume/live",
    "post_dataforseo_keywords_trends_explore_live": "/v3/keywords_data/google_trends/explore/live",
    "post_dataforseo_serp_google_organic_live": "/v3/serp/google/organic/live/advanced",
    "post_dataforseo_labs_google_keyword_overview_live": "/v3/dataforseo_labs/google/keyword_overview/live",
    "post_dataforseo_domains_whois_overview_live": "/v3/domain_analytics/whois/overview/live",
    "post_dataforseo_backlinks_backlinks_live": "/v3/backlinks/backlinks/live",
    "post_dataforseo_backlinks_referring_domains_live": "/v3/backlinks/referring_domains/live",
}


class DataForSEOError(RuntimeError):
    pass


def credentials() -> tuple[str, str]:
    return os.environ.get("DATAFORSEO_LOGIN", "").strip(), os.environ.get("DATAFORSEO_PASSWORD", "").strip()


def credential_state() -> str:
    login, password = credentials()
    if login and password:
        return "configured"
    if login or password:
        return "partial"
    return "missing"


def mode() -> str:
    value = os.environ.get("DATAFORSEO_MODE", "auto").strip().lower() or "auto"
    if value not in MODES:
        raise DataForSEOError(f"invalid DATAFORSEO_MODE {value!r}: use auto, direct, or aisa")
    return value


def selected_route() -> str:
    value = mode()
    if value == "direct":
        if credential_state() != "configured":
            raise DataForSEOError("DATAFORSEO_MODE=direct needs DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD")
        return "direct"
    if value == "aisa":
        return "aisa"
    return "direct" if credential_state() == "configured" else "aisa"


def route_status() -> str:
    """The effective route for status/UI without attempting a paid request."""
    try:
        value = mode()
    except DataForSEOError:
        return "invalid"
    if value == "direct":
        return "direct" if credential_state() == "configured" else "unavailable"
    if value == "aisa":
        return "aisa" if aisa.configured() else "unavailable"
    if credential_state() == "configured":
        return "direct"
    return "aisa" if aisa.configured() else "unavailable"


def _authorization() -> str:
    login, password = credentials()
    if not login or not password:
        raise DataForSEOError("set both DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD")
    token = base64.b64encode(f"{login}:{password}".encode()).decode()
    return f"Basic {token}"


def _request(path: str, body: list[dict] | None = None, timeout: int = TIMEOUT) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE_URL + path, data=data, method="POST" if body is not None else "GET", headers={
        "Accept": "application/json",
        "Authorization": _authorization(),
        "Content-Type": "application/json",
        "User-Agent": UA,
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            answer = json.load(res)
    except urllib.error.HTTPError as exc:
        detail = " ".join(exc.read().decode("utf-8", "replace").split())[:200]
        raise DataForSEOError(f"HTTP {exc.code}: {detail}".rstrip(": ")) from exc
    except (OSError, ValueError) as exc:
        raise DataForSEOError(f"{type(exc).__name__}: {exc}") from exc
    if not isinstance(answer, dict):
        raise DataForSEOError("unexpected non-object response")
    code = int(answer.get("status_code") or 0)
    if code != 20000:
        raise DataForSEOError(f"DataForSEO {code}: {answer.get('status_message') or 'request failed'}")
    failed = [task for task in answer.get("tasks") or [] if int(task.get("status_code") or 0) != 20000]
    if failed:
        task = failed[0]
        raise DataForSEOError(f"DataForSEO {task.get('status_code')}: {task.get('status_message') or 'task failed'}")
    return answer


def _micros(answer: dict) -> int:
    try:
        return round(float(answer.get("cost") or 0) * 1_000_000)
    except (TypeError, ValueError):
        return 0


def _direct(calls: list[dict]) -> tuple[dict[str, dict], int]:
    out, cost = {}, 0
    for item in calls:
        call_id, tool = str(item.get("call_id") or ""), str(item.get("tool") or "")
        path = ENDPOINTS.get(tool)
        if not call_id or not path:
            raise DataForSEOError(f"unsupported DataForSEO tool: {tool or '(missing)'}")
        body = (item.get("arguments") or {}).get("body")
        if not isinstance(body, list) or not body or not all(isinstance(task, dict) for task in body):
            raise DataForSEOError(f"{tool} needs a non-empty arguments.body task array")
        answer = _request(path, body)
        out[call_id] = answer
        cost += _micros(answer)
    return out, cost


def call(calls: list[dict]) -> tuple[dict[str, dict], int]:
    """Run DataForSEO calls through the selected route without automatic retries."""
    if not calls:
        return {}, 0
    try:
        return _direct(calls) if selected_route() == "direct" else aisa.call(calls)
    except aisa.AisaError as exc:
        raise DataForSEOError(f"AIsa route: {exc}") from exc


def call_all(calls: list[dict]) -> tuple[dict[str, dict], int]:
    """Run calls in route-appropriate batches while preserving the common response shape."""
    if not calls:
        return {}, 0
    try:
        return _direct(calls) if selected_route() == "direct" else aisa.call_all(calls)
    except aisa.AisaError as exc:
        raise DataForSEOError(f"AIsa route: {exc}") from exc


def check_connection() -> tuple[str, str]:
    """Verify direct credentials with DataForSEO's free user-data endpoint."""
    if credential_state() != "configured":
        return "not_checked", "direct credentials are not configured"
    try:
        _request("/v3/appendix/user_data")
        return "verified", "authenticated with the free user-data endpoint"
    except DataForSEOError as exc:
        return "error", str(exc)[:160]


def status_rows(check: bool = False) -> list[dict]:
    connection, detail = check_connection() if check else ("not_checked", "run providers --check to verify")
    route = route_status()
    return [
        {
            "provider": "DataForSEO",
            "adapter": "ready",
            "credential": credential_state(),
            "env": "DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD",
            "capabilities": "Trends, Ads volume, SERP, KD, WHOIS, backlinks",
            "role": "search_monitoring",
            "route": route,
            "connection": connection,
            "detail": detail,
        },
        {
            "provider": "AIsa",
            "adapter": "ready",
            "credential": "configured" if aisa.configured() else "missing",
            "env": "AISA_API_KEY",
            "capabilities": "social discovery, evidence extraction, model calls, DataForSEO fallback",
            "role": "discovery_and_ai",
            "route": "primary" if aisa.configured() else "unavailable",
            "connection": "not_checked",
            "detail": "configured state only; no paid probe is sent",
        },
    ]
