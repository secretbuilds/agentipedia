import json

import pytest
from click.testing import CliRunner

from agentipedia.cli import main


@pytest.fixture
def runner():
    return CliRunner()


@pytest.fixture
def auth_env(tmp_path):
    config_dir = tmp_path / ".agentipedia"
    config_dir.mkdir()
    (config_dir / "config.json").write_text(
        json.dumps(
            {
                "api_key": "agp_testcli",
                "server_url": "https://test.agentipedia.ai",
            }
        )
    )
    return {"AGENTIPEDIA_CONFIG_DIR": str(config_dir)}


class TestAuth:
    def test_saves_key(self, runner, tmp_path):
        config_dir = tmp_path / ".agentipedia"
        result = runner.invoke(
            main,
            ["auth"],
            input="agp_mykey123\n",
            env={"AGENTIPEDIA_CONFIG_DIR": str(config_dir)},
        )
        assert result.exit_code == 0
        assert "Saved" in result.output
        data = json.loads((config_dir / "config.json").read_text())
        assert data["api_key"] == "agp_mykey123"

    def test_rejects_invalid_prefix(self, runner, tmp_path):
        config_dir = tmp_path / ".agentipedia"
        result = runner.invoke(
            main,
            ["auth"],
            input="bad_key\n",
            env={"AGENTIPEDIA_CONFIG_DIR": str(config_dir)},
        )
        assert result.exit_code != 0 or "must start with agp_" in result.output


class TestHypotheses:
    def test_lists_hypotheses(self, runner, auth_env, httpx_mock):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/hypotheses",
            json={
                "items": [
                    {
                        "id": "h1abcdef-1234-5678-9abc-def012345678",
                        "title": "CIFAR-10",
                        "domain": "computer_vision",
                        "metric_name": "accuracy",
                        "metric_direction": "higher_is_better",
                        "status": "open",
                        "run_count": 5,
                        "created_at": "2026-01-01T00:00:00Z",
                        "user": {"x_handle": "test", "x_display_name": "Test", "x_avatar_url": ""},
                    },
                ],
                "next_cursor": None,
                "has_more": False,
            },
        )
        result = runner.invoke(main, ["hypotheses"], env=auth_env)
        assert result.exit_code == 0
        assert "CIFAR-10" in result.output


class TestLeaves:
    def test_shows_leaves(self, runner, auth_env, httpx_mock):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/hypotheses/h1/leaves",
            json={
                "success": True,
                "data": [
                    {
                        "id": "r1abcdef-1234-5678-9abc-def012345678",
                        "hypothesis_id": "h1",
                        "user_id": "u1",
                        "forked_from": None,
                        "best_metric": 0.74,
                        "synthesis": None,
                        "created_at": "2026-01-01T00:00:00Z",
                        "goal": "Cosine LR",
                        "depth": 2,
                        "user": {
                            "x_handle": "alice",
                            "x_display_name": "Alice",
                            "x_avatar_url": "",
                        },
                    },
                ],
            },
        )
        result = runner.invoke(main, ["leaves", "h1"], env=auth_env)
        assert result.exit_code == 0
        assert "0.74" in result.output


class TestLineage:
    def test_shows_lineage(self, runner, auth_env, httpx_mock):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/runs/r2/lineage",
            json={
                "success": True,
                "data": [
                    {
                        "id": "r1",
                        "hypothesis_id": "h1",
                        "forked_from": None,
                        "best_metric": 0.68,
                        "synthesis": None,
                        "created_at": "2026-01-01",
                        "depth": 0,
                    },
                    {
                        "id": "r2",
                        "hypothesis_id": "h1",
                        "forked_from": "r1",
                        "best_metric": 0.74,
                        "synthesis": None,
                        "created_at": "2026-01-02",
                        "depth": 1,
                    },
                ],
            },
        )
        result = runner.invoke(main, ["lineage", "r2"], env=auth_env)
        assert result.exit_code == 0
        assert "r1" in result.output
        assert "r2" in result.output
