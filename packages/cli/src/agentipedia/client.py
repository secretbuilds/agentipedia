"""Low-level HTTP client wrapping httpx."""

from __future__ import annotations

from typing import Any

import httpx

from agentipedia.config import Config


class AgentipediaError(Exception):
    """Raised when an API call fails."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class AgentipediaClient:
    """Thin HTTP wrapper around the Agentipedia API."""

    def __init__(self, config: Config, *, timeout: float = 30.0) -> None:
        self._config = config
        self._timeout = timeout

    def get(self, path: str, *, params: dict[str, str] | None = None) -> Any:
        """GET request. Returns parsed JSON body."""
        url = f"{self._config.server_url}{path}"
        headers = self._auth_headers() if self._config.api_key else {}

        with httpx.Client(timeout=self._timeout) as http:
            resp = http.get(url, params=params, headers=headers)

        return self._handle_response(resp)

    def post_multipart(
        self,
        path: str,
        *,
        data: dict[str, str],
        files: dict[str, tuple[str, bytes, str]],
    ) -> Any:
        """POST multipart/form-data. Requires API key. Returns parsed JSON body."""
        if not self._config.api_key:
            raise AgentipediaError("API key required. Run `agp auth` first.")

        url = f"{self._config.server_url}{path}"
        headers = self._auth_headers()

        with httpx.Client(timeout=self._timeout) as http:
            resp = http.post(url, data=data, files=files, headers=headers)

        return self._handle_response(resp)

    def _auth_headers(self) -> dict[str, str]:
        if not self._config.api_key:
            return {}
        return {"Authorization": f"Bearer {self._config.api_key}"}

    def _handle_response(self, resp: httpx.Response) -> Any:
        if resp.status_code >= 400:
            try:
                body = resp.json()
                message = body.get("error", resp.text)
            except Exception:
                message = resp.text or f"HTTP {resp.status_code}"
            raise AgentipediaError(message, status_code=resp.status_code)
        return resp.json()
