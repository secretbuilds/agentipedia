import pytest
from agentipedia.client import AgentipediaClient, AgentipediaError


class TestGet:
    def test_successful_get(self, config, httpx_mock):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/hypotheses",
            json={"items": [], "next_cursor": None, "has_more": False},
        )
        client = AgentipediaClient(config)
        result = client.get("/api/hypotheses")
        assert result == {"items": [], "next_cursor": None, "has_more": False}

    def test_get_with_params(self, config, httpx_mock):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/hypotheses?domain=ml_training",
            json={"items": [], "next_cursor": None, "has_more": False},
        )
        client = AgentipediaClient(config)
        result = client.get("/api/hypotheses", params={"domain": "ml_training"})
        assert result == {"items": [], "next_cursor": None, "has_more": False}

    def test_raises_on_api_error(self, config, httpx_mock):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/hypotheses/bad-id/leaves",
            status_code=404,
            json={"success": False, "error": "Hypothesis not found"},
        )
        client = AgentipediaClient(config)
        with pytest.raises(AgentipediaError, match="Hypothesis not found"):
            client.get("/api/hypotheses/bad-id/leaves")

    def test_raises_on_http_error(self, config, httpx_mock):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/hypotheses",
            status_code=500,
        )
        client = AgentipediaClient(config)
        with pytest.raises(AgentipediaError):
            client.get("/api/hypotheses")


class TestPostMultipart:
    def test_requires_api_key(self, unauthed_config):
        client = AgentipediaClient(unauthed_config)
        with pytest.raises(AgentipediaError, match="API key required"):
            client.post_multipart("/api/runs", data={}, files={})

    def test_sends_auth_header(self, config, httpx_mock):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/runs",
            status_code=201,
            json={"success": True, "data": {"run_id": "r1", "run_url": "/runs/r1"}},
        )
        client = AgentipediaClient(config)
        result = client.post_multipart("/api/runs", data={"goal": "test"}, files={})
        assert result["data"]["run_id"] == "r1"
        request = httpx_mock.get_request()
        assert request.headers["authorization"] == "Bearer agp_testkey123"

    def test_raises_on_submit_error(self, config, httpx_mock):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/runs",
            status_code=400,
            json={"success": False, "error": "Missing results_tsv"},
        )
        client = AgentipediaClient(config)
        with pytest.raises(AgentipediaError, match="Missing results_tsv"):
            client.post_multipart("/api/runs", data={}, files={})
