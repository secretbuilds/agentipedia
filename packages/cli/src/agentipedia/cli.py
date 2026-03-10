"""CLI entry point -- ``agp`` command."""

from __future__ import annotations

import os
from pathlib import Path

import click

from agentipedia.client import AgentipediaError
from agentipedia.config import load_config, save_config
from agentipedia.sdk import Agentipedia


def _config_dir() -> Path:
    """Allow override via env var for testing."""
    env = os.environ.get("AGENTIPEDIA_CONFIG_DIR")
    if env:
        return Path(env)
    return Path.home() / ".agentipedia"


def _load() -> Agentipedia:
    config = load_config(config_dir=_config_dir())
    return Agentipedia(config=config)


def _short_id(full_id: str) -> str:
    """Show first 8 chars of a UUID."""
    return full_id[:8]


@click.group()
def main() -> None:
    """agp -- Agentipedia CLI"""


@main.command()
def auth() -> None:
    """Save your Agentipedia API key."""
    key = click.prompt("Paste your API key", hide_input=False).strip()
    if not key.startswith("agp_"):
        click.echo("Error: API key must start with agp_", err=True)
        raise SystemExit(1) from None
    save_config(key, config_dir=_config_dir())
    click.echo(f"Saved to {_config_dir() / 'config.json'}")


@main.command()
@click.option("--domain", "-d", default=None, help="Filter by domain")
@click.option("--status", "-s", default=None, help="Filter by status (open/closed)")
@click.option("--sort", default=None, help="Sort: newest, most_runs, best_result")
def hypotheses(domain: str | None, status: str | None, sort: str | None) -> None:
    """List hypotheses."""
    try:
        agp = _load()
        items = agp.hypotheses(domain=domain, status=status, sort=sort)
    except AgentipediaError as e:
        click.echo(f"Error: {e}", err=True)
        raise SystemExit(1) from None

    if not items:
        click.echo("No hypotheses found.")
        return

    for h in items:
        direction = "\u2191" if h.get("metric_direction") == "higher_is_better" else "\u2193"
        runs = h.get("run_count", 0)
        click.echo(
            f"  {_short_id(h['id'])}  {direction} {h.get('metric_name', '?'):20s}  "
            f"{runs:3d} runs  {h['title']}"
        )


@main.command()
@click.argument("hypothesis_id")
def leaves(hypothesis_id: str) -> None:
    """Show frontier runs (leaves) for a hypothesis."""
    try:
        agp = _load()
        data = agp.leaves(hypothesis_id)
    except AgentipediaError as e:
        click.echo(f"Error: {e}", err=True)
        raise SystemExit(1) from None

    if not data:
        click.echo("No runs yet.")
        return

    for r in data:
        click.echo(
            f"  {_short_id(r['id'])}  metric={r['best_metric']:<10}  "
            f"depth={r['depth']}  @{r['user']['x_handle']}  {r.get('goal', '')}"
        )


@main.command()
@click.argument("run_id")
def lineage(run_id: str) -> None:
    """Show ancestry chain for a run (root -> target)."""
    try:
        agp = _load()
        data = agp.lineage(run_id)
    except AgentipediaError as e:
        click.echo(f"Error: {e}", err=True)
        raise SystemExit(1) from None

    for i, step in enumerate(data):
        arrow = "\u2192 " if i > 0 else "  "
        click.echo(f"  {arrow}{_short_id(step['id'])}  metric={step['best_metric']}")


@main.command()
@click.argument("run_id")
def children(run_id: str) -> None:
    """Show direct child runs."""
    try:
        agp = _load()
        data = agp.children(run_id)
    except AgentipediaError as e:
        click.echo(f"Error: {e}", err=True)
        raise SystemExit(1) from None

    if not data:
        click.echo("No children.")
        return

    for r in data:
        click.echo(f"  {_short_id(r['id'])}  metric={r['best_metric']:<10}  {r.get('goal', '')}")


@main.command()
@click.argument("run_id")
@click.option("--base", required=True, help="Base run ID to diff against")
def diff(run_id: str, base: str) -> None:
    """Show code diff between two runs."""
    try:
        agp = _load()
        result = agp.diff(run_id, base_run_id=base)
    except AgentipediaError as e:
        click.echo(f"Error: {e}", err=True)
        raise SystemExit(1) from None

    if not result["files"]:
        click.echo("No differences.")
        return

    for f in result["files"]:
        click.echo(f"\n--- {f['filename']} ({f['status']}) ---")
        click.echo(f["hunks"])


@main.command()
@click.argument("run_id")
@click.option("--output", "-o", default=".", help="Output directory")
def fetch(run_id: str, output: str) -> None:
    """Download a run's code snapshot to disk."""
    try:
        agp = _load()
        files = agp.fetch(run_id, output_dir=output)
    except AgentipediaError as e:
        click.echo(f"Error: {e}", err=True)
        raise SystemExit(1) from None

    for f in files:
        click.echo(f"  wrote {f}")
    click.echo(f"Fetched {len(files)} file(s) to {output}")


@main.command()
@click.option("--hypothesis", required=True, help="Hypothesis ID")
@click.option("--results", required=True, type=click.Path(exists=True), help="Path to results.tsv")
@click.option("--code", multiple=True, type=click.Path(exists=True), help="Code file(s)")
@click.option("--goal", required=True, help="Goal description")
@click.option("--hardware", required=True, help="Hardware used")
@click.option("--time-budget", required=True, help="Time budget")
@click.option("--model-size", required=True, help="Model size")
@click.option("--forked-from", default=None, help="Parent run ID")
@click.option("--tag-1", default=None, help="Optional tag 1")
@click.option("--tag-2", default=None, help="Optional tag 2")
@click.option("--synthesis", default=None, help="Summary of changes")
def submit(
    hypothesis: str,
    results: str,
    code: tuple[str, ...],
    goal: str,
    hardware: str,
    time_budget: str,
    model_size: str,
    forked_from: str | None,
    tag_1: str | None,
    tag_2: str | None,
    synthesis: str | None,
) -> None:
    """Submit a run with results and code."""
    try:
        agp = _load()
        result = agp.submit(
            hypothesis_id=hypothesis,
            results_tsv_path=results,
            code_files=list(code) if code else None,
            goal=goal,
            hardware=hardware,
            time_budget=time_budget,
            model_size=model_size,
            forked_from=forked_from,
            tag_1=tag_1,
            tag_2=tag_2,
            synthesis=synthesis,
        )
    except AgentipediaError as e:
        click.echo(f"Error: {e}", err=True)
        raise SystemExit(1) from None

    click.echo(f"Submitted! Run ID: {result['run_id']}")
    click.echo(f"View at: {result['run_url']}")
