"""Integration test: full submit flow through SDK."""

from pathlib import Path

import pytest

from agentipedia import Agentipedia, AgentipediaError
from agentipedia.config import Config


@pytest.fixture
def config():
    return Config(api_key="agp_integration_test", server_url="https://test.agentipedia.ai")


def test_full_submit_flow(config, httpx_mock, tmp_path):
    """Test the complete flow: fetch baseline -> submit improved run."""
    # 1. Fetch baseline code
    httpx_mock.add_response(
        url="https://test.agentipedia.ai/api/runs/r-parent/code",
        json={"success": True, "data": {"code_snapshot": {"train.py": "lr = 0.01\n"}}},
    )
    agp = Agentipedia(config=config)
    files = agp.fetch("r-parent", output_dir=tmp_path / "baseline")
    assert len(files) == 1

    # 2. "Modify" the code
    improved = tmp_path / "improved" / "train.py"
    improved.parent.mkdir()
    improved.write_text("lr = 0.001  # cosine schedule\n")

    # 3. Create results TSV
    tsv = tmp_path / "results.tsv"
    tsv.write_text(
        "commit\tmetric_value\tmemory_gb\tstatus\tdescription\n"
        "baseline\t0.68\t8.0\tkeep\tBaseline\n"
        "abc123\t0.74\t8.0\tkeep\tCosine LR\n"
    )

    # 4. Submit
    httpx_mock.add_response(
        url="https://test.agentipedia.ai/api/runs",
        status_code=201,
        json={"success": True, "data": {"run_id": "r-new", "run_url": "/runs/r-new"}},
    )
    result = agp.submit(
        hypothesis_id="h1",
        results_tsv_path=tsv,
        code_files=[improved],
        goal="Cosine LR schedule",
        hardware="A100",
        time_budget="2h",
        model_size="7B",
        forked_from="r-parent",
    )
    assert result["run_id"] == "r-new"

    # Verify the request included auth header
    submit_request = httpx_mock.get_requests()[-1]
    assert submit_request.headers["authorization"] == "Bearer agp_integration_test"


def test_error_propagation(config, httpx_mock):
    """API errors surface as AgentipediaError."""
    httpx_mock.add_response(
        url="https://test.agentipedia.ai/api/hypotheses/bad/leaves",
        status_code=404,
        json={"success": False, "error": "Hypothesis not found"},
    )
    agp = Agentipedia(config=config)
    with pytest.raises(AgentipediaError, match="Hypothesis not found"):
        agp.leaves("bad")
