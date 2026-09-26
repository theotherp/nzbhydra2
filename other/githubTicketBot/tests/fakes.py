"""Test doubles: no network, no real Anthropic/GitHub calls."""
from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone
from typing import Callable, Dict, List, Optional

from ticketbot.assessor import Assessment
from ticketbot.bot import now_iso, parse_ts
from ticketbot.github_client import Comment

BOT_LOGIN = "nzbhydra2-bot[bot]"


class FakeClock:
    """A controllable clock; pass `clock.now` as now_func to the bot and fake client."""

    def __init__(self, start: Optional[datetime] = None):
        self.current = start or datetime.now(timezone.utc)

    def now(self) -> datetime:
        return self.current

    def iso(self) -> str:
        return self.current.isoformat()

    def advance(self, **kwargs) -> None:
        self.current += timedelta(**kwargs)


class FakeGitHubClient:
    """Stands in for GitHubClient with an in-memory issue/comment store.

    Everything handed out is a deep copy, like real API responses, so the bot
    can't accidentally see its own writes through shared objects."""

    def __init__(self, repo: str, dry_run: bool = False, now_func: Callable[[], str] = now_iso):
        self.repo = repo
        self.dry_run = dry_run
        self._now = now_func
        self.issues: Dict[int, dict] = {}
        self.comments: Dict[int, List[Comment]] = {}
        self._next_comment_id = 1000

        self.created_comments: List[tuple] = []
        self.updated_comments: List[tuple] = []
        self.added_labels: List[tuple] = []
        self.removed_labels: List[tuple] = []
        self.label_ensure_calls: List[str] = []
        self.list_issues_calls: List[Optional[str]] = []
        self.get_issue_calls: List[int] = []

    def add_issue(
        self,
        number: int,
        title: str,
        body: str,
        author: str,
        author_type: str = "User",
        labels: Optional[List[str]] = None,
        created_at: str = "2026-01-01T00:00:00+00:00",
        updated_at: Optional[str] = None,
    ) -> None:
        self.issues[number] = {
            "number": number,
            "title": title,
            "body": body,
            "user": {"login": author, "type": author_type},
            "labels": [{"name": l} for l in (labels or [])],
            "state": "open",
            "created_at": created_at,
            "updated_at": updated_at or created_at,
            "repository_url": f"https://api.github.com/repos/{self.repo}",
        }
        self.comments.setdefault(number, [])

    def add_comment(
        self,
        number: int,
        author: str,
        body: str,
        author_type: str = "User",
        created_at: Optional[str] = None,
    ) -> Comment:
        created_at = created_at or self._now()
        comment = Comment(
            id=self._next_comment_id,
            body=body,
            user_login=author,
            user_type=author_type,
            created_at=created_at,
        )
        self._next_comment_id += 1
        self.comments.setdefault(number, []).append(comment)
        self.issues[number]["updated_at"] = created_at
        return comment

    def edit_body(self, number: int, body: str, updated_at: Optional[str] = None) -> None:
        self.issues[number]["body"] = body
        self.issues[number]["updated_at"] = updated_at or self._now()

    def touch(self, number: int, updated_at: Optional[str] = None) -> None:
        """Some activity that isn't the reporter's (a reaction, a label, ...)."""
        self.issues[number]["updated_at"] = updated_at or self._now()

    def close_issue(self, number: int) -> None:
        self.issues[number]["state"] = "closed"
        self.issues[number]["updated_at"] = self._now()

    def list_issues(self, since: Optional[str] = None) -> List[dict]:
        self.list_issues_calls.append(since)
        issues = [i for i in self.issues.values() if i["state"] == "open"]
        if since:
            issues = [i for i in issues if parse_ts(i["updated_at"]) >= parse_ts(since)]
        return copy.deepcopy(issues)

    def get_issue(self, number: int) -> dict:
        self.get_issue_calls.append(number)
        return copy.deepcopy(self.issues[number])

    def list_comments(self, number: int) -> List[Comment]:
        return copy.deepcopy(self.comments.get(number, []))

    def create_comment(self, number: int, body: str) -> Optional[dict]:
        if self.dry_run:
            return None
        comment_id = self._next_comment_id
        self._next_comment_id += 1
        comment = Comment(
            id=comment_id,
            body=body,
            user_login=BOT_LOGIN,
            user_type="Bot",
            created_at=self._now(),
        )
        self.comments.setdefault(number, []).append(comment)
        self.created_comments.append((number, body))
        # Real GitHub bumps the issue's updated_at whenever a comment is added.
        self.issues[number]["updated_at"] = self._now()
        return {"id": comment_id}

    def update_comment(self, comment_id: int, body: str) -> Optional[dict]:
        if self.dry_run:
            return None
        for number, comments in self.comments.items():
            for c in comments:
                if c.id == comment_id:
                    c.body = body
                    self.issues[number]["updated_at"] = self._now()
        self.updated_comments.append((comment_id, body))
        return {"id": comment_id}

    def add_label(self, number: int, label: str) -> None:
        if self.dry_run:
            return
        names = [l["name"] for l in self.issues[number]["labels"]]
        if label not in names:
            self.issues[number]["labels"].append({"name": label})
        self.added_labels.append((number, label))
        self.issues[number]["updated_at"] = self._now()

    def remove_label(self, number: int, label: str) -> None:
        if self.dry_run:
            return
        self.issues[number]["labels"] = [
            l for l in self.issues[number]["labels"] if l["name"] != label
        ]
        self.removed_labels.append((number, label))
        self.issues[number]["updated_at"] = self._now()

    def ensure_label_exists(self, label: str, color: str = "ededed", description: str = "") -> None:
        self.label_ensure_calls.append(label)


def make_assessment(
    is_bug: bool = True,
    debug_infos_attached: bool = False,
    debug_infos_needed: bool = True,
    missing_information: Optional[List[str]] = None,
    comment: str = "Please attach the debug infos ZIP.",
    reasoning: str = "test",
) -> Assessment:
    return Assessment(
        is_bug=is_bug,
        reasoning=reasoning,
        debug_infos_attached=debug_infos_attached,
        debug_infos_needed=debug_infos_needed,
        missing_information=missing_information or [],
        comment=comment,
    )


def fake_assess_fn(queue: List[Assessment], calls: Optional[list] = None) -> Callable:
    """Returns a stand-in for assessor.assess() that pops results off `queue`
    in order and records every call's arguments into `calls` if given."""

    def _assess(client, model, title, author, labels, body, follow_up_comments=None):
        if calls is not None:
            calls.append(
                {
                    "title": title,
                    "author": author,
                    "labels": labels,
                    "body": body,
                    "follow_up_comments": follow_up_comments,
                }
            )
        if not queue:
            raise AssertionError("fake_assess_fn called more times than expected")
        return queue.pop(0)

    return _assess
