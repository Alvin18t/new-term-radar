from __future__ import annotations

from datetime import date
from urllib.parse import parse_qs, urlparse

from radar import config, providers


def test_status_distinguishes_ready_adapter_from_missing_credential(monkeypatch):
    monkeypatch.setenv("AHREFS_API_KEY", "configured")
    rows = {row["provider"]: row for row in providers.status()}
    assert rows["Ahrefs"]["adapter"] == "ready" and rows["Ahrefs"]["credential"] == "configured"
    assert rows["Semrush"]["adapter"] == "ready" and rows["Semrush"]["credential"] == "missing"
    assert "SEMRUSH_API_KEY" == rows["Semrush"]["env"]


def test_ahrefs_uses_v3_overview_and_normalizes_rows(monkeypatch):
    monkeypatch.setenv("AHREFS_API_KEY", "secret")
    seen = {}

    def request(url, **kwargs):
        seen.update(url=url, kwargs=kwargs)
        return {"keywords": [{"keyword": "seo tool", "volume": 1200, "difficulty": 18, "traffic_potential": 3400}]}

    monkeypatch.setattr(providers, "_request", request)
    out = providers.ahrefs(["SEO Tool"], "US")
    query = parse_qs(urlparse(seen["url"]).query)
    assert query["keywords"] == ["seo tool"] and query["country"] == ["us"]
    assert seen["kwargs"]["headers"]["authorization"] == "Bearer secret"
    assert out["seo tool"]["provider"] == "ahrefs" and out["seo tool"]["traffic_potential"] == 3400


def test_semrush_uses_v4_keyword_metrics(monkeypatch):
    monkeypatch.setenv("SEMRUSH_API_KEY", "secret")
    seen = {}

    def request(url, **kwargs):
        seen.update(url=url, kwargs=kwargs)
        return {"meta": {"success": True}, "data": {"search_volume": "60500", "cpc": "1245",
                                                        "keyword_difficulty": 74, "intents": ["COMMERCIAL"]}}

    monkeypatch.setattr(providers, "_request", request)
    out = providers.semrush("SEO tools", "US")
    assert "/apis/v4/keywords/v1/metrics" in seen["url"]
    assert seen["kwargs"]["headers"]["authorization"] == "Apikey secret"
    assert out["provider"] == "semrush" and out["keyword"] == "seo tools" and out["cpc"] == "1245"


def test_similarweb_batch_submit_status_and_download(monkeypatch):
    monkeypatch.setenv("SIMILARWEB_API_KEY", "secret")
    calls = []

    def request(url, **kwargs):
        calls.append((url, kwargs))
        if "request-report" in url:
            return {"report_id": "r-1", "status": "pending"}
        if "request-status" in url:
            return {"status": "completed", "download_url": "https://download.example/report"}
        return [{"domain": "example.com", "all_traffic_visits": 1234}]

    monkeypatch.setattr(providers, "_request", request)
    submitted = providers.similarweb_submit(["www.example.com"], "US")
    assert submitted["report_id"] == "r-1"
    table = calls[0][1]["body"]["report_query"]["tables"][0]
    assert table["filters"]["domains"] == ["example.com"] and "all_traffic_visits" in table["metrics"]
    assert providers.similarweb_status("r-1")["status"] == "completed"
    assert providers.similarweb_download("https://download.example/report")["example.com"]["all_traffic_visits"] == 1234


def test_enrich_builds_gate_without_optional_keys_and_demotes_heat_only(tmp_path):
    cfg = {"providers": dict(config.DEFAULTS["providers"])}
    rows = [
        {"phrase": "paid need", "decision": "prioritize", "volume": 1000, "no_data": False,
         "competition": {"verdict": "open", "ads": True, "domains": ["a.com"]}},
        {"phrase": "heat only", "decision": "prioritize", "volume": 1000, "no_data": False,
         "competition": {"verdict": "open", "ads": False, "paid": [], "domains": ["b.com"]}},
    ]
    queries, errors = providers.enrich(rows, cfg, tmp_path, date(2026, 10, 21))
    assert queries == 0 and errors == []
    assert rows[0]["decision"] == "prioritize" and rows[0]["evidence_gate"]["actionable"]
    assert rows[1]["decision"] == "watch" and rows[1]["verification_demoted"]
    assert rows[1]["evidence_gate"]["commercial"] == "missing"


def test_enrich_caches_direct_provider_metrics(tmp_path, monkeypatch):
    cfg = {"providers": dict(config.DEFAULTS["providers"])}
    monkeypatch.setenv("AHREFS_API_KEY", "a")
    monkeypatch.setenv("SEMRUSH_API_KEY", "s")
    monkeypatch.setattr(providers, "ahrefs", lambda keywords, country: {
        keywords[0]: {"provider": "ahrefs", "keyword": keywords[0], "cpc": 15}})
    monkeypatch.setattr(providers, "semrush", lambda keyword, country: {
        "provider": "semrush", "keyword": keyword, "cpc": "1", "competitive_density": 20})
    row = {"phrase": "tool need", "decision": "prioritize", "volume": 1000, "no_data": False,
           "competition": {"verdict": "open", "ads": False, "domains": []}}
    queries, errors = providers.enrich([row], cfg, tmp_path, date(2026, 10, 21))
    assert queries == 2 and errors == [] and set(row["provider_metrics"]) == {"ahrefs", "semrush"}
    assert row["evidence_gate"]["confidence"] == "high" and row["decision"] == "prioritize"

    monkeypatch.setattr(providers, "ahrefs", lambda *_: (_ for _ in ()).throw(AssertionError("cache missed")))
    monkeypatch.setattr(providers, "semrush", lambda *_: (_ for _ in ()).throw(AssertionError("cache missed")))
    second = {"phrase": "tool need", "decision": "prioritize", "volume": 1000, "no_data": False,
              "competition": {"verdict": "open", "ads": False, "domains": []}}
    queries, errors = providers.enrich([second], cfg, tmp_path, date(2026, 10, 22))
    assert queries == 0 and errors == [] and second["evidence_gate"]["confidence"] == "high"


def test_material_provider_conflict_requires_review():
    row = {"volume": 1000, "no_data": False, "competition": {"verdict": "open", "ads": True, "kd": 18},
           "provider_metrics": {
               "ahrefs": {"provider": "ahrefs", "volume": 5000, "difficulty": 22},
               "semrush": {"provider": "semrush", "search_volume": "900", "keyword_difficulty": 68, "cpc": "2"},
           }}
    gate = providers.gate(row)
    assert not gate["actionable"] and gate["confidence"] == "review"
    assert {item["metric"] for item in gate["conflicts"]} == {"monthly_volume", "keyword_difficulty"}
