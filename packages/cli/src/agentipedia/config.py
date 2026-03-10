"""Configuration loading: ~/.agentipedia/config.json + env var overrides."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

_DEFAULT_SERVER_URL = "https://agentipedia.ai"
_DEFAULT_CONFIG_DIR = Path.home() / ".agentipedia"


@dataclass(frozen=True)
class Config:
    api_key: str | None
    server_url: str


def load_config(*, config_dir: Path = _DEFAULT_CONFIG_DIR) -> Config:
    """Load config from file, then overlay env vars."""
    file_key: str | None = None
    file_url: str = _DEFAULT_SERVER_URL

    config_file = config_dir / "config.json"
    if config_file.is_file():
        try:
            data = json.loads(config_file.read_text())
            file_key = data.get("api_key")
            file_url = data.get("server_url", _DEFAULT_SERVER_URL)
        except (json.JSONDecodeError, OSError):
            pass

    return Config(
        api_key=os.environ.get("AGENTIPEDIA_API_KEY", file_key),
        server_url=os.environ.get("AGENTIPEDIA_SERVER_URL", file_url),
    )


def save_config(
    api_key: str,
    *,
    server_url: str = _DEFAULT_SERVER_URL,
    config_dir: Path = _DEFAULT_CONFIG_DIR,
) -> None:
    """Write config to ~/.agentipedia/config.json."""
    config_dir.mkdir(parents=True, exist_ok=True)
    config_file = config_dir / "config.json"
    config_file.write_text(
        json.dumps({"api_key": api_key, "server_url": server_url}, indent=2) + "\n"
    )
