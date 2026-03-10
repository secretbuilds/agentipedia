import json
from pathlib import Path

import pytest

from agentipedia.sdk import Agentipedia


@pytest.fixture
def tsv_file(tmp_path):
    content = "commit\tmetric_value\tmemory_gb\tstatus\tdescription\n"
    content += "baseline\t0.68\t8.0\tkeep\tBaseline model\n"
    content += "abc123\t0.74\t8.0\tkeep\tAdded cosine LR\n"
    path = tmp_path / "results.tsv"
    path.write_text(content)
    return path


@pytest.fixture
def code_file(tmp_path):
    path = tmp_path / "train.py"
    path.write_text("import torch\nprint('hello')\n")
    return path


class TestHypotheses:
    def test_returns_items(self, config, httpx_mock):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/hypotheses",
            json={"items": [{"id": "h1", "title": "Test"}], "next_cursor": None, "has_more": False},
        )
        agp = Agentipedia(config=config)
        result = agp.hypotheses()
        assert len(result) == 1
        assert result[0]["id"] == "h1"

    def test_passes_domain_filter(self, config, httpx_mock):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/hypotheses?domain=trading",
            json={"items": [], "next_cursor": None, "has_more": False},
        )
        agp = Agentipedia(config=config)
        result = agp.hypotheses(domain="trading")
        assert result == []


class TestLeaves:
    def test_returns_data(self, config, httpx_mock):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/hypotheses/h1/leaves",
            json={"success": True, "data": [{"id": "r1", "best_metric": 0.74}]},
        )
        agp = Agentipedia(config=config)
        result = agp.leaves("h1")
        assert result[0]["id"] == "r1"


class TestLineage:
    def test_returns_data(self, config, httpx_mock):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/runs/r1/lineage",
            json={"success": True, "data": [{"id": "r0", "depth": 0}, {"id": "r1", "depth": 1}]},
        )
        agp = Agentipedia(config=config)
        result = agp.lineage("r1")
        assert len(result) == 2


class TestChildren:
    def test_returns_data(self, config, httpx_mock):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/runs/r1/children",
            json={"success": True, "data": [{"id": "r2", "goal": "fork"}]},
        )
        agp = Agentipedia(config=config)
        result = agp.children("r1")
        assert result[0]["id"] == "r2"


class TestDiff:
    def test_returns_diff_result(self, config, httpx_mock):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/runs/r2/diff?base=r1",
            json={"success": True, "data": {"base_run_id": "r1", "target_run_id": "r2", "files": []}},
        )
        agp = Agentipedia(config=config)
        result = agp.diff("r2", base_run_id="r1")
        assert result["base_run_id"] == "r1"


class TestFetch:
    def test_writes_files_to_disk(self, config, httpx_mock, tmp_path):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/runs/r1/code",
            json={"success": True, "data": {"code_snapshot": {"train.py": "import torch\n", "utils.py": "# utils\n"}}},
        )
        agp = Agentipedia(config=config)
        files = agp.fetch("r1", output_dir=tmp_path)
        assert (tmp_path / "train.py").read_text() == "import torch\n"
        assert (tmp_path / "utils.py").read_text() == "# utils\n"
        assert len(files) == 2

    def test_creates_output_dir(self, config, httpx_mock, tmp_path):
        output = tmp_path / "nested" / "dir"
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/runs/r1/code",
            json={"success": True, "data": {"code_snapshot": {"train.py": "x = 1\n"}}},
        )
        agp = Agentipedia(config=config)
        agp.fetch("r1", output_dir=output)
        assert (output / "train.py").exists()


class TestSubmit:
    def test_successful_submit(self, config, httpx_mock, tsv_file, code_file):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/runs",
            status_code=201,
            json={"success": True, "data": {"run_id": "r-new", "run_url": "/runs/r-new"}},
        )
        agp = Agentipedia(config=config)
        result = agp.submit(
            hypothesis_id="h1",
            results_tsv_path=tsv_file,
            code_files=[code_file],
            goal="Test submit",
            hardware="A100",
            time_budget="1h",
            model_size="7B",
        )
        assert result["run_id"] == "r-new"

    def test_submit_with_code_snapshot(self, config, httpx_mock, tsv_file):
        httpx_mock.add_response(
            url="https://test.agentipedia.ai/api/runs",
            status_code=201,
            json={"success": True, "data": {"run_id": "r-snap", "run_url": "/runs/r-snap"}},
        )
        agp = Agentipedia(config=config)
        result = agp.submit(
            hypothesis_id="h1",
            results_tsv_path=tsv_file,
            code_snapshot={"train.py": "x = 1\n"},
            goal="Snapshot submit",
            hardware="A100",
            time_budget="1h",
            model_size="7B",
        )
        assert result["run_id"] == "r-snap"

    def test_submit_requires_tsv(self, config):
        agp = Agentipedia(config=config)
        with pytest.raises(FileNotFoundError):
            agp.submit(
                hypothesis_id="h1",
                results_tsv_path=Path("/nonexistent/results.tsv"),
                code_files=[],
                goal="Bad",
                hardware="A100",
                time_budget="1h",
                model_size="7B",
            )
