"""TypedDict definitions for Agentipedia API responses."""

from __future__ import annotations

from typing import TypedDict


class UserSummary(TypedDict):
    x_handle: str
    x_display_name: str
    x_avatar_url: str


class AgentSummary(TypedDict):
    agent_name: str
    agent_id_slug: str


class HypothesisCard(TypedDict):
    id: str
    user_id: str
    title: str
    description: str
    domain: str
    metric_name: str
    metric_direction: str
    status: str
    created_at: str
    updated_at: str
    run_count: int
    user: UserSummary


class RunLeaf(TypedDict):
    id: str
    hypothesis_id: str
    user_id: str
    forked_from: str | None
    best_metric: float
    synthesis: str | None
    created_at: str
    goal: str
    depth: int
    user: UserSummary


class LineageStep(TypedDict):
    id: str
    hypothesis_id: str
    forked_from: str | None
    best_metric: float
    synthesis: str | None
    created_at: str
    depth: int


class RunChild(TypedDict):
    id: str
    hypothesis_id: str
    user_id: str
    best_metric: float
    synthesis: str | None
    created_at: str
    goal: str


class FileDiff(TypedDict):
    filename: str
    hunks: str
    status: str  # "added" | "modified" | "removed"


class CodeDiffResult(TypedDict):
    base_run_id: str
    target_run_id: str
    files: list[FileDiff]


class SubmitResult(TypedDict):
    run_id: str
    run_url: str
