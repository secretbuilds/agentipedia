"""High-level Agentipedia SDK."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from agentipedia._types import (
    CodeDiffResult,
    HypothesisCard,
    LineageStep,
    RunChild,
    RunLeaf,
    SubmitResult,
)
from agentipedia.client import AgentipediaClient
from agentipedia.config import Config, load_config


class Agentipedia:
    """High-level SDK for the Agentipedia research platform.

    Usage:
        agp = Agentipedia()  # reads config from env vars / ~/.agentipedia/config.json
        agp.hypotheses(domain="computer_vision")
        agp.submit(hypothesis_id="...", results_tsv_path="results.tsv", ...)
    """

    def __init__(self, *, config: Config | None = None) -> None:
        self._config = config or load_config()
        self._client = AgentipediaClient(self._config)

    def hypotheses(
        self,
        *,
        domain: str | None = None,
        status: str | None = None,
        sort: str | None = None,
    ) -> list[HypothesisCard]:
        """List hypotheses with optional filters."""
        params: dict[str, str] = {}
        if domain:
            params["domain"] = domain
        if status:
            params["status"] = status
        if sort:
            params["sort"] = sort
        resp = self._client.get("/api/hypotheses", params=params or None)
        return resp["items"]

    def leaves(self, hypothesis_id: str) -> list[RunLeaf]:
        """Get frontier runs (leaves) for a hypothesis."""
        resp = self._client.get(f"/api/hypotheses/{hypothesis_id}/leaves")
        return resp["data"]

    def lineage(self, run_id: str) -> list[LineageStep]:
        """Get the ancestry chain for a run (root -> target)."""
        resp = self._client.get(f"/api/runs/{run_id}/lineage")
        return resp["data"]

    def children(self, run_id: str) -> list[RunChild]:
        """Get direct child runs."""
        resp = self._client.get(f"/api/runs/{run_id}/children")
        return resp["data"]

    def diff(self, run_id: str, *, base_run_id: str) -> CodeDiffResult:
        """Get unified diff between two runs' code snapshots."""
        resp = self._client.get(f"/api/runs/{run_id}/diff", params={"base": base_run_id})
        return resp["data"]

    def fetch(self, run_id: str, *, output_dir: str | Path) -> list[Path]:
        """Download a run's code snapshot to disk. Returns list of written file paths."""
        output = Path(output_dir)
        output.mkdir(parents=True, exist_ok=True)

        resp = self._client.get(f"/api/runs/{run_id}/code")
        snapshot: dict[str, str] = resp["data"]["code_snapshot"]

        written: list[Path] = []
        for filename, content in snapshot.items():
            file_path = output / filename
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content)
            written.append(file_path)

        return written

    def submit(
        self,
        *,
        hypothesis_id: str,
        results_tsv_path: str | Path,
        goal: str,
        hardware: str,
        time_budget: str,
        model_size: str,
        code_files: list[str | Path] | None = None,
        code_snapshot: dict[str, str] | None = None,
        forked_from: str | None = None,
        tag_1: str | None = None,
        tag_2: str | None = None,
        synthesis: str | None = None,
    ) -> SubmitResult:
        """Submit a run with results TSV and code.

        Provide either code_files (list of file paths) or code_snapshot (dict of filename->content).
        """
        tsv_path = Path(results_tsv_path)
        if not tsv_path.is_file():
            raise FileNotFoundError(f"Results TSV not found: {tsv_path}")

        data: dict[str, str] = {
            "hypothesis_id": hypothesis_id,
            "goal": goal,
            "hardware": hardware,
            "time_budget": time_budget,
            "model_size": model_size,
        }
        if forked_from:
            data["forked_from"] = forked_from
        if tag_1:
            data["tag_1"] = tag_1
        if tag_2:
            data["tag_2"] = tag_2
        if synthesis:
            data["synthesis"] = synthesis

        files: dict[str, tuple[str, bytes, str]] = {
            "results_tsv": ("results.tsv", tsv_path.read_bytes(), "text/tab-separated-values"),
        }

        if code_snapshot:
            data["code_snapshot"] = json.dumps(code_snapshot)
        elif code_files:
            paths = [Path(f) for f in code_files]
            first = paths[0]
            files["code_file"] = (first.name, first.read_bytes(), "text/plain")
            if len(paths) > 1:
                snapshot = {p.name: p.read_text() for p in paths}
                data["code_snapshot"] = json.dumps(snapshot)

        resp = self._client.post_multipart("/api/runs", data=data, files=files)
        return resp["data"]
