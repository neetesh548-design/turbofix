import asyncio
import json
import json as json_module

import pytest

from app import config
from app.ai import summarize


class FakeResponse:
    def __init__(self, json_data=None, status_code=200):
        self._json_data = json_data
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._json_data


class FakeAsyncClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, headers=None, json=None):
        content = json_content_for(json["messages"][-1]["content"])
        return FakeResponse(json_data={"choices": [{"message": {"content": content}}]})


def json_content_for(user_message: str) -> str:
    return json.dumps({
        "likely_cause": "worn spindle bearing",
        "urgency": "high",
        "suggested_action": "inspect and replace the bearing",
        "confidence": 82,
        "evidence": "Reported loud spindle noise",
        "recommended_checks": "Isolate power; inspect bearing play",
        "likely_parts": "Spindle bearing from approved BOM",
        "safety_note": "Lock out power before inspection",
    })


def test_summarize_issue_parses_and_normalizes_urgency(monkeypatch):
    monkeypatch.setattr(config, "OPENAI_API_KEY", "fake-key")
    monkeypatch.setattr(summarize.httpx, "AsyncClient", FakeAsyncClient)

    brief = asyncio.run(summarize.summarize_issue("spindle making loud noise"))

    assert brief.likely_cause == "worn spindle bearing"
    assert brief.urgency == "High"
    assert brief.suggested_action == "inspect and replace the bearing"
    assert brief.confidence == 82
    assert brief.evidence == "Reported loud spindle noise"
    assert brief.as_ai_summary() == (
        "Likely cause: worn spindle bearing | Confidence: 82% | Suggested action: inspect and replace the bearing "
        "| Evidence: Reported loud spindle noise | Checks: Isolate power; inspect bearing play "
        "| Likely parts: Spindle bearing from approved BOM | Safety: Lock out power before inspection"
    )


def test_summarize_issue_defaults_unexpected_urgency_to_medium(monkeypatch):
    class WeirdUrgencyClient(FakeAsyncClient):
        async def post(self, url, headers=None, json=None):
            content = json_module_dumps_weird()
            return FakeResponse(json_data={"choices": [{"message": {"content": content}}]})

    def json_module_dumps_weird():
        return json.dumps({"likely_cause": "unclear", "urgency": "critical!!", "suggested_action": "investigate"})

    monkeypatch.setattr(config, "OPENAI_API_KEY", "fake-key")
    monkeypatch.setattr(summarize.httpx, "AsyncClient", WeirdUrgencyClient)

    brief = asyncio.run(summarize.summarize_issue("something weird"))
    assert brief.urgency == "Medium"


def test_summarize_issue_bounds_invalid_confidence(monkeypatch):
    class InvalidConfidenceClient(FakeAsyncClient):
        async def post(self, url, headers=None, json=None):
            content = json_module.dumps({
                "likely_cause": "unclear",
                "urgency": "low",
                "suggested_action": "inspect",
                "confidence": 999,
            })
            return FakeResponse(json_data={"choices": [{"message": {"content": content}}]})

    monkeypatch.setattr(config, "OPENAI_API_KEY", "fake-key")
    monkeypatch.setattr(summarize.httpx, "AsyncClient", InvalidConfidenceClient)

    brief = asyncio.run(summarize.summarize_issue("something unclear"))
    assert brief.confidence == 100
