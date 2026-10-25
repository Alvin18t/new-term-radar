"""Direct third-party keyword and site-metric adapters.

The radar's core works without these providers. When a key is present, finalists can
be cross-checked against Ahrefs and Semrush, while Similarweb evaluates the domains
already found on page one. Secrets stay in environment variables; cached responses
contain metrics and provenance, never keys.

Ahrefs:      AHREFS_API_KEY
Semrush v4: SEMRUSH_API_KEY
Similarweb: SIMILARWEB_API_KEY (Batch API key)
"""
from __future__ import annotations

import hashlib
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from . import UA, dataforseo, snap

AHREFS_URL = os.environ.get("AHREFS_API_BASE_URL", "https://api.ahrefs.com") + "/v3/keywords-explorer/overview"
SEMRUSH_URL = os.environ.get("SEMRUSH_API_BASE_URL", "https://api.semrush.com") + "/apis/v4/keywords/v1/metrics"
_SIMILARWEB_BASE = os.environ.get("SIMILARWEB_API_BASE_URL", "https://api.similarweb.com")
SIMILARWEB_REQUEST_URL = os.environ.get("SIMILARWEB_REQUEST_URL", _SIMILARWEB_BASE + "/batch/v4/request-report")
SIMILARWEB_STATUS_URL = os.environ.get("SIMILARWEB_STATUS_URL", _SIMILARWEB_BASE + "/v3/batch/request-status/")
SIMILARWEB_VTABLE = os.environ.get("SIMILARWEB_VTABLE", "traffic_and_engagement")
TIMEOUT = 60
CACHE_DAYS = 7


class ProviderError(RuntimeError):
    pass


def _key(name: str) -> str:
    return os.environ.get(name, "").strip()


def status(check: bool = False) -> list[dict]:
    """Connection inventory without exposing credential values."""
    rows = [
        ("Ahrefs", "AHREFS_API_KEY", "keyword metrics, traffic potential, parent topic"),
        ("Semrush", "SEMRUSH_API_KEY", "volume, KD, CPC, paid density, intent, SERP features"),
        ("Similarweb", "SIMILARWEB_API_KEY", "page-one domain traffic and engagement"),
    ]
    direct = [{"provider": provider, "adapter": "ready", "credential": "configured" if _key(env) else "missing",
               "env": env, "capabilities": capabilities, "role": "cross_check", "route": "direct",
               "connection": "not_checked", "detail": "configured state only"}
              for provider, env, capabilities in rows]
    return dataforseo.status_rows(check) + direct


def _request(url: str, *, headers: dict | None = None, body: dict | None = None, timeout: int = TIMEOUT) -> dict | list:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method="POST" if body is not None else "GET", headers={
        "accept": "application/json", "user-agent": UA,
        **({"content-type": "application/json"} if body is not None else {}), **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return json.load(res)
    except urllib.error.HTTPError as exc:
        detail = " ".join(exc.read().decode("utf-8", "replace").split())[:180]
        raise ProviderError(f"HTTP {exc.code}: {detail}".rstrip(": ")) from exc
    except (OSError, ValueError) as exc:
        raise ProviderError(f"{type(exc).__name__}: {exc}") from exc


def ahrefs(keywords: list[str], country: str = "US") -> dict[str, dict]:
    """Ahrefs Keywords Explorer metrics, keyed by normalized keyword."""
    key = _key("AHREFS_API_KEY")
    if not key:
        raise ProviderError("no AHREFS_API_KEY")
    phrases = list(dict.fromkeys(" ".join(k.lower().split()) for k in keywords if k.strip()))
    if not phrases:
        return {}
    select = ",".join(("keyword", "volume", "global_volume", "difficulty", "cpc", "clicks", "traffic_potential",
                       "parent_topic", "parent_volume", "intents", "serp_features", "serp_last_update"))
    query = urllib.parse.urlencode({"country": country.lower(), "keywords": ",".join(phrases), "select": select,
                                    "limit": len(phrases), "output": "json"})
    data = _request(AHREFS_URL + "?" + query, headers={"authorization": f"Bearer {key}"})
    return {str(row.get("keyword") or "").lower(): {**row, "provider": "ahrefs", "country": country.upper()}
            for row in data.get("keywords", []) if isinstance(row, dict) and row.get("keyword")}


def semrush(keyword: str, country: str = "US") -> dict:
    """Semrush v4 Keyword Metrics for one finalist."""
    key = _key("SEMRUSH_API_KEY")
    if not key:
        raise ProviderError("no SEMRUSH_API_KEY")
    phrase = " ".join(keyword.lower().split())
    query = urllib.parse.urlencode({"keyword": phrase, "country": country.upper(), "format": "json"})
    data = _request(SEMRUSH_URL + "?" + query, headers={"authorization": f"Apikey {key}"})
    if not isinstance(data, dict) or not isinstance(data.get("data"), dict):
        raise ProviderError("unexpected Semrush response")
    return {**data["data"], "provider": "semrush", "country": country.upper(), "keyword": phrase}


def similarweb_submit(domains: list[str], country: str = "WW") -> dict:
    """Start an asynchronous Similarweb Batch API traffic report."""
    key = _key("SIMILARWEB_API_KEY")
    if not key:
        raise ProviderError("no SIMILARWEB_API_KEY")
    hosts = list(dict.fromkeys(d.lower().removeprefix("www.") for d in domains if d))
    if not hosts:
        return {"status": "empty"}
    body = {
        "report_name": "new-term-radar-page-one-traffic",
        "delivery_information": {"delivery_method": "download_link", "response_format": "json"},
        "report_query": {"tables": [{
            "vtable": SIMILARWEB_VTABLE, "granularity": "monthly", "latest": True,
            "filters": {"domains": hosts, "countries": [country.upper()], "include_subdomains": True},
            "metrics": ["all_traffic_visits", "all_traffic_unique_visitors", "all_traffic_pages_per_visit",
                        "all_traffic_average_visit_duration", "all_traffic_bounce_rate", "global_rank"],
        }]},
    }
    data = _request(SIMILARWEB_REQUEST_URL, headers={"api-key": key}, body=body)
    if not isinstance(data, dict) or not data.get("report_id"):
        raise ProviderError("unexpected Similarweb submit response")
    return data


def similarweb_status(report_id: str) -> dict:
    key = _key("SIMILARWEB_API_KEY")
    if not key:
        raise ProviderError("no SIMILARWEB_API_KEY")
    data = _request(SIMILARWEB_STATUS_URL + urllib.parse.quote(report_id), headers={"api-key": key})
    if not isinstance(data, dict) or not data.get("status"):
        raise ProviderError("unexpected Similarweb status response")
    return data


def similarweb_download(url: str) -> dict[str, dict]:
    """Normalize a completed JSON download into {domain: metrics}."""
    data = _request(url)
    rows = data if isinstance(data, list) else next((data.get(k) for k in ("data", "rows", "records")
                                                    if isinstance(data.get(k), list)), [])
    out = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        domain = str(row.get("domain") or row.get("domains") or "").lower().removeprefix("www.")
        if domain:
            out[domain] = {**row, "provider": "similarweb"}
    return out


def _fresh(entry: dict, today: date, days: int) -> bool:
    try:
        return today - date.fromisoformat(entry["day"]) < timedelta(days=days)
    except (KeyError, TypeError, ValueError):
        return False


def _cache_key(provider: str, country: str, item: str) -> str:
    return f"{provider}|{country.upper()}|{' '.join(item.lower().split())}"


def _commercial(row: dict) -> bool:
    competition = row.get("competition") or {}
    if competition.get("ads") or competition.get("paid"):
        return True
    metrics = row.get("provider_metrics") or {}
    ahrefs_data, semrush_data = metrics.get("ahrefs") or {}, metrics.get("semrush") or {}
    return bool((ahrefs_data.get("cpc") or 0) > 0 or (semrush_data.get("cpc") or 0) not in (0, "0", "0.0", None, "")
                or (semrush_data.get("competitive_density") or 0) > 0)


def _number(value):
    try:
        return float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def conflicts(row: dict) -> list[dict]:
    """Material cross-source disagreements that require a human decision."""
    metrics, out = row.get("provider_metrics") or {}, []
    ahrefs_data, semrush_data = metrics.get("ahrefs") or {}, metrics.get("semrush") or {}
    volumes = {"google_ads": _number(row.get("volume")), "ahrefs": _number(ahrefs_data.get("volume")),
               "semrush": _number(semrush_data.get("search_volume"))}
    volumes = {k: v for k, v in volumes.items() if v is not None and v > 0}
    if len(volumes) >= 2 and max(volumes.values()) / min(volumes.values()) >= 3:
        out.append({"metric": "monthly_volume", "values": volumes, "reason": "largest estimate is at least 3x the smallest"})
    competition = row.get("competition") or {}
    difficulties = {"dataforseo": _number(competition.get("kd")), "ahrefs": _number(ahrefs_data.get("difficulty")),
                    "semrush": _number(semrush_data.get("keyword_difficulty"))}
    difficulties = {k: v for k, v in difficulties.items() if v is not None}
    if len(difficulties) >= 2 and max(difficulties.values()) - min(difficulties.values()) >= 30:
        out.append({"metric": "keyword_difficulty", "values": difficulties, "reason": "provider scores differ by at least 30 points"})
    return out


def gate(row: dict) -> dict:
    """Explain the action gate and demote unsupported heat-only priorities."""
    demand = bool((row.get("volume") or 0) > 0 or (row.get("per_day") or 0) > 0) and not row.get("no_data")
    competition = bool((row.get("competition") or {}).get("verdict"))
    commercial = _commercial(row)
    direct = sum(1 for value in (row.get("provider_metrics") or {}).values() if isinstance(value, dict) and value.get("provider"))
    disagreements = conflicts(row)
    ready = demand and competition and commercial and not disagreements
    return {"demand": "pass" if demand else "missing", "competition": "pass" if competition else "missing",
            "commercial": "pass" if commercial else "missing", "direct_cross_checks": direct,
            "conflicts": disagreements, "actionable": ready,
            "confidence": "high" if ready and direct >= 2 else "medium" if ready else "review" if disagreements else "low"}


def enrich(rows: list[dict], cfg: dict, state: Path, today: date | None = None) -> tuple[int, list[str]]:
    """Cross-check finalist rows, cache paid results, and attach an explainable gate.

    Similarweb is asynchronous: the first run submits one report; later runs check it
    once and consume it when complete. This keeps the daily monitor non-blocking.
    """
    c = cfg.get("providers") or {}
    if not c.get("enabled", True):
        return 0, []
    today = today or date.today()
    country, limit = str(c.get("country") or "US").upper(), int(c.get("max_rows") or 3)
    picked = ([r for r in rows if r.get("decision") == "prioritize"] +
              [r for r in rows if r.get("decision") == "watch"])[:limit]
    if not picked:
        return 0, []
    cache_path, jobs_path = state / "provider_metrics.json.gz", state / "similarweb_jobs.json.gz"
    cache, jobs = snap.load(cache_path) or {}, snap.load(jobs_path) or {}
    errors, queries = [], 0

    def cached(provider: str, item: str):
        entry = cache.get(_cache_key(provider, country, item)) or {}
        return entry.get("data") if _fresh(entry, today, int(c.get("cache_days") or CACHE_DAYS)) else None

    missing_ahrefs = [r["phrase"] for r in picked if cached("ahrefs", r["phrase"]) is None]
    if _key("AHREFS_API_KEY") and missing_ahrefs:
        try:
            for phrase, data in ahrefs(missing_ahrefs, country).items():
                cache[_cache_key("ahrefs", country, phrase)] = {"day": today.isoformat(), "data": data}
            queries += 1
        except ProviderError as exc:
            errors.append(f"Ahrefs: {exc}")

    if _key("SEMRUSH_API_KEY"):
        for row in picked:
            if cached("semrush", row["phrase"]) is not None:
                continue
            try:
                data = semrush(row["phrase"], country)
                cache[_cache_key("semrush", country, row["phrase"])] = {"day": today.isoformat(), "data": data}
                queries += 1
            except ProviderError as exc:
                errors.append(f"Semrush ({row['phrase']}): {exc}")

    domains = list(dict.fromkeys(d for row in picked for d in (row.get("competition") or {}).get("domains", []) if d))
    missing_domains = [d for d in domains if cached("similarweb", d) is None]
    if _key("SIMILARWEB_API_KEY") and missing_domains:
        signature = hashlib.sha256((country + "\n" + "\n".join(sorted(missing_domains))).encode()).hexdigest()[:20]
        job = jobs.get(signature)
        try:
            if not job:
                submitted = similarweb_submit(missing_domains, country)
                jobs[signature] = {"report_id": submitted["report_id"], "status": submitted.get("status", "pending"),
                                   "domains": missing_domains, "day": today.isoformat()}
                queries += 1
            else:
                result = similarweb_status(job["report_id"])
                jobs[signature]["status"] = result["status"]
                queries += 1
                if result["status"] == "completed" and result.get("download_url"):
                    for domain, data in similarweb_download(result["download_url"]).items():
                        cache[_cache_key("similarweb", country, domain)] = {"day": today.isoformat(), "data": data}
                    jobs.pop(signature, None)
                elif result["status"] in ("bad_request", "internal_error", "internal error"):
                    errors.append(f"Similarweb: report {result['status']}")
                    jobs.pop(signature, None)
        except ProviderError as exc:
            errors.append(f"Similarweb: {exc}")

    for row in picked:
        metrics = {}
        for provider in ("ahrefs", "semrush"):
            data = cached(provider, row["phrase"])
            if data is not None:
                metrics[provider] = data
        traffic = {d: cached("similarweb", d) for d in (row.get("competition") or {}).get("domains", [])}
        traffic = {d: v for d, v in traffic.items() if v is not None}
        if traffic:
            metrics["similarweb"] = {"provider": "similarweb", "domains": traffic, "country": country}
        row["provider_metrics"] = metrics
        row["evidence_gate"] = gate(row)
        if row.get("decision") == "prioritize" and not row["evidence_gate"]["actionable"]:
            row["decision"], row["verification_demoted"] = "watch", True

    snap.save(cache_path, cache)
    snap.save(jobs_path, jobs)
    return queries, errors
