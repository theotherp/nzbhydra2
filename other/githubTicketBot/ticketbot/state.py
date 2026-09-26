"""Persisted bot state: per-repo poll bookkeeping and per-issue tracking.

Issues are keyed as "owner/repo#number" since the bot can watch several repos.
Entries are never deleted: a resolved entry is what stops an issue from being
evaluated (and commented on) a second time.

Written atomically (tmp file + os.replace) so a crash mid-write never corrupts
the file. Loading tolerates unknown keys (ignored) and missing keys (defaulted)
so older or newer state files don't crash the bot.
"""
from __future__ import annotations

import json
import logging
import os
import shutil
from dataclasses import asdict, dataclass, field, fields
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class CorruptStateError(RuntimeError):
    """Raised when the state file exists but can't be read or parsed (I/O
    error, invalid JSON, or an unexpected top-level shape). Deliberately not
    handled by starting fresh: that would silently forget every issue the
    bot is tracking and could re-comment on issues that are already
    resolved. The caller (main()) is expected to log this and exit non-zero;
    a missing file is a normal first run and does not raise this."""


def issue_key(repo: str, number: int) -> str:
    return f"{repo}#{number}"


def _known_fields(cls, d: dict) -> dict:
    names = {f.name for f in fields(cls)}
    return {k: v for k, v in d.items() if k in names}


@dataclass
class IssueState:
    repo: str
    number: int
    created_at: Optional[str] = None
    # The issue's updated_at when the bot last looked at it; a cheap filter so
    # comments are only fetched when something changed.
    updated_at_seen: Optional[str] = None
    # None until an assessment was recorded.
    is_bug: Optional[bool] = None
    missing_info: Optional[bool] = None
    bot_comment_id: Optional[int] = None
    # False while the bot's comment exists but the label couldn't be added yet.
    label_applied: bool = True
    # True while a completion (comment updated to "looks complete", label
    # about to be removed) is in progress: set before either GitHub call and
    # cleared only once both have succeeded, so a failure in between is
    # retried to completion instead of being mistaken for the label having
    # been removed by someone else.
    completing: bool = False
    # sha256 of the issue body at the last assessment.
    body_hash: Optional[str] = None
    # created_at of the newest reporter comment included in the last assessment.
    last_reporter_comment_at: Optional[str] = None
    error_count: int = 0
    resolved: bool = False
    last_checked: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)

    @staticmethod
    def from_dict(key: str, d: dict) -> "IssueState":
        values = _known_fields(IssueState, d)
        if "repo" not in values or "number" not in values:
            repo, number = key.rsplit("#", 1)
            values.setdefault("repo", repo)
            values.setdefault("number", int(number))
        return IssueState(**values)


@dataclass
class RepoState:
    last_poll: Optional[str] = None
    # Issues created before this are never processed.
    start_at: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)

    @staticmethod
    def from_dict(d: dict) -> "RepoState":
        return RepoState(**_known_fields(RepoState, d))


@dataclass
class BotState:
    repos: Dict[str, RepoState] = field(default_factory=dict)
    issues: Dict[str, IssueState] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "repos": {k: v.to_dict() for k, v in self.repos.items()},
            "issues": {k: v.to_dict() for k, v in self.issues.items()},
        }

    @staticmethod
    def from_dict(d: dict) -> "BotState":
        repos = {k: RepoState.from_dict(v) for k, v in (d.get("repos") or {}).items()}
        # Older state files had one global start_at; use it for repos that
        # don't have their own yet.
        legacy_start_at = d.get("start_at")
        if legacy_start_at:
            for repo_state in repos.values():
                if not repo_state.start_at:
                    repo_state.start_at = legacy_start_at

        issues: Dict[str, IssueState] = {}
        for key, value in (d.get("issues") or {}).items():
            try:
                issues[key] = IssueState.from_dict(key, value)
            except (TypeError, ValueError, AttributeError) as e:
                logger.error("Ignoring unreadable state entry %s: %s", key, e)
        return BotState(repos=repos, issues=issues)


class StateStore:
    def __init__(self, path: str):
        self.path = Path(path)

    def load(self) -> BotState:
        """A missing file is a normal first run. A file that exists but can't
        be read or parsed is not: silently starting fresh there would forget
        every tracked issue, so this raises CorruptStateError instead (after
        quarantining a readable-but-unparseable copy for inspection)."""
        if not self.path.exists():
            return BotState()
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                raw = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            logger.error("Could not read state file %s: %s", self.path, e)
            self._quarantine()
            raise CorruptStateError(f"Could not read state file {self.path}: {e}") from e
        if not isinstance(raw, dict):
            logger.error(
                "State file %s has an unexpected top-level type (%s), expected an object",
                self.path,
                type(raw).__name__,
            )
            self._quarantine()
            raise CorruptStateError(
                f"State file {self.path} has an unexpected top-level type: {type(raw).__name__}"
            )
        try:
            return BotState.from_dict(raw)
        except (TypeError, ValueError, AttributeError) as e:
            logger.error("Could not parse state file %s: %s", self.path, e)
            self._quarantine()
            raise CorruptStateError(f"Could not parse state file {self.path}: {e}") from e

    def _quarantine(self) -> None:
        """Best-effort copy of an unreadable/unparseable state file, so it
        can be inspected instead of just being overwritten on the next save."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        corrupt_path = self.path.with_name(f"{self.path.name}.corrupt-{timestamp}")
        try:
            shutil.copy2(self.path, corrupt_path)
            logger.error("Copied the unreadable state file to %s for inspection", corrupt_path)
        except OSError as e:
            logger.error("Could not copy the unreadable state file %s for inspection: %s", self.path, e)

    def save(self, state: BotState) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = self.path.with_suffix(self.path.suffix + ".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(state.to_dict(), f, indent=2, sort_keys=True)
        os.replace(tmp_path, self.path)
