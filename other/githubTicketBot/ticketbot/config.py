"""Environment-based configuration for the ticket bot."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional


class ConfigError(RuntimeError):
    """Raised when required configuration is missing or invalid."""


def _bool_env(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


def _list_env(name: str, default: str) -> List[str]:
    value = os.environ.get(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass
class Config:
    app_id: str
    private_key_file: str
    anthropic_api_key: str
    repos: List[str] = field(default_factory=lambda: ["theotherp/nzbhydra2", "theotherp/apitests"])
    model: str = "claude-sonnet-5"
    poll_interval: int = 300
    state_file: str = "./state/state.json"
    needs_info_label: str = "needs-info"
    ignore_users: List[str] = field(default_factory=lambda: ["theotherp"])
    skip_labels: List[str] = field(default_factory=lambda: ["enhancement"])
    start_at: Optional[datetime] = None
    dry_run: bool = False
    log_level: str = "INFO"
    installation_id: Optional[str] = None
    anthropic_workspace_id: Optional[str] = None

    @staticmethod
    def from_env() -> "Config":
        app_id = os.environ.get("BOT_GITHUB_APP_ID")
        if not app_id:
            raise ConfigError("BOT_GITHUB_APP_ID must be set (GitHub App id).")
        private_key_file = os.environ.get("BOT_GITHUB_APP_PRIVATE_KEY_FILE")
        if not private_key_file:
            raise ConfigError(
                "BOT_GITHUB_APP_PRIVATE_KEY_FILE must be set (path to the App's private key .pem)."
            )
        anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not anthropic_api_key:
            raise ConfigError(
                "ANTHROPIC_API_KEY must be set. Get one from the Anthropic console."
            )

        start_at_raw = os.environ.get("BOT_START_AT")
        start_at = None
        if start_at_raw:
            try:
                start_at = datetime.fromisoformat(start_at_raw.replace("Z", "+00:00"))
                if start_at.tzinfo is None:
                    start_at = start_at.replace(tzinfo=timezone.utc)
            except ValueError as e:
                raise ConfigError(f"BOT_START_AT is not a valid ISO timestamp: {start_at_raw}") from e

        return Config(
            app_id=app_id,
            private_key_file=private_key_file,
            anthropic_api_key=anthropic_api_key,
            repos=_list_env("BOT_REPOS", "theotherp/nzbhydra2,theotherp/apitests"),
            model=os.environ.get("BOT_MODEL", "claude-sonnet-5"),
            poll_interval=int(os.environ.get("BOT_POLL_INTERVAL", "300")),
            state_file=os.environ.get("BOT_STATE_FILE", "./state/state.json"),
            needs_info_label=os.environ.get("BOT_NEEDS_INFO_LABEL", "needs-info"),
            ignore_users=[u.lower() for u in _list_env("BOT_IGNORE_USERS", "theotherp")],
            skip_labels=_list_env("BOT_SKIP_LABELS", "enhancement"),
            start_at=start_at,
            dry_run=_bool_env("BOT_DRY_RUN", False),
            log_level=os.environ.get("BOT_LOG_LEVEL", "INFO"),
            installation_id=os.environ.get("BOT_GITHUB_APP_INSTALLATION_ID"),
            anthropic_workspace_id=os.environ.get("ANTHROPIC_WORKSPACE_ID") or None,
        )
