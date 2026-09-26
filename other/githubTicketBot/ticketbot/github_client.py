"""Thin wrapper around the GitHub REST API used by the ticket bot.

Authenticates every request as the GitHub App's installation (see
github_app_auth.py), retries once on 401 after refreshing the token, and
respects GitHub's rate limit headers.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional

import requests

from ticketbot.github_app_auth import GITHUB_API, GitHubAppAuth

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 30


@dataclass
class Comment:
    id: int
    body: str
    user_login: str
    user_type: str
    created_at: str


class GitHubClient:
    def __init__(
        self,
        auth: GitHubAppAuth,
        repo: str,
        dry_run: bool = False,
        session: Optional[requests.Session] = None,
        sleep_func: Callable[[float], None] = time.sleep,
    ) -> None:
        self.auth = auth
        self.repo = repo
        self.dry_run = dry_run
        self.session = session or auth.session
        self._sleep = sleep_func

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.auth.get_token(self.repo)}",
            "Accept": "application/vnd.github+json",
        }

    def _handle_rate_limit(self, resp: requests.Response) -> bool:
        """Sleeps and returns True if the response indicates a rate limit that
        we should retry after; returns False otherwise."""
        if resp.status_code not in (403, 429):
            return False
        remaining = resp.headers.get("X-RateLimit-Remaining")
        retry_after = resp.headers.get("Retry-After")
        if retry_after is not None:
            wait_seconds = float(retry_after)
        elif remaining == "0":
            reset = resp.headers.get("X-RateLimit-Reset")
            if reset is None:
                return False
            wait_seconds = max(0.0, float(reset) - time.time())
        else:
            return False
        logger.warning("Rate limited by GitHub, sleeping for %.0f seconds", wait_seconds)
        self._sleep(wait_seconds)
        return True

    def _request(self, method: str, url: str, **kwargs) -> requests.Response:
        kwargs.setdefault("timeout", DEFAULT_TIMEOUT)
        refreshed_once = False
        while True:
            headers = self._headers()
            extra_headers = kwargs.pop("headers", None)
            if extra_headers:
                headers.update(extra_headers)
            resp = self.session.request(method, url, headers=headers, **kwargs)
            if "headers" not in kwargs and extra_headers:
                kwargs["headers"] = extra_headers
            if resp.status_code == 401 and not refreshed_once:
                logger.info("Got 401 from GitHub, refreshing installation token and retrying")
                self.auth.get_token(self.repo, force_refresh=True)
                refreshed_once = True
                continue
            if self._handle_rate_limit(resp):
                continue
            return resp

    @staticmethod
    def _parse_link_header(link_header: Optional[str]) -> Dict[str, str]:
        links: Dict[str, str] = {}
        if not link_header:
            return links
        for part in link_header.split(","):
            segments = part.split(";")
            if len(segments) < 2:
                continue
            url_part = segments[0].strip().lstrip("<").rstrip(">")
            for segment in segments[1:]:
                segment = segment.strip()
                if segment.startswith("rel="):
                    rel = segment[len("rel=") :].strip('"')
                    links[rel] = url_part
        return links

    def list_issues(self, since: Optional[str] = None) -> List[dict]:
        """Lists open issues (pull requests filtered out), updated ascending."""
        issues: List[dict] = []
        params = {
            "state": "open",
            "sort": "updated",
            "direction": "asc",
            "per_page": 100,
        }
        if since:
            params["since"] = since
        url = f"{GITHUB_API}/repos/{self.repo}/issues"
        while url:
            resp = self._request("GET", url, params=params)
            resp.raise_for_status()
            for item in resp.json():
                if "pull_request" not in item:
                    issues.append(item)
            links = self._parse_link_header(resp.headers.get("Link"))
            url = links.get("next")
            params = {}
        return issues

    def get_issue(self, number: int) -> dict:
        url = f"{GITHUB_API}/repos/{self.repo}/issues/{number}"
        resp = self._request("GET", url)
        resp.raise_for_status()
        return resp.json()

    def list_comments(self, number: int) -> List[Comment]:
        comments: List[Comment] = []
        url = f"{GITHUB_API}/repos/{self.repo}/issues/{number}/comments"
        params = {"per_page": 100}
        while url:
            resp = self._request("GET", url, params=params)
            resp.raise_for_status()
            for item in resp.json():
                comments.append(
                    Comment(
                        id=item["id"],
                        body=item.get("body") or "",
                        user_login=item["user"]["login"],
                        user_type=item["user"].get("type", "User"),
                        created_at=item["created_at"],
                    )
                )
            links = self._parse_link_header(resp.headers.get("Link"))
            url = links.get("next")
            params = {}
        return comments

    def create_comment(self, number: int, body: str) -> Optional[dict]:
        if self.dry_run:
            logger.info("[dry-run] Would create comment on issue #%s:\n%s", number, body)
            return None
        url = f"{GITHUB_API}/repos/{self.repo}/issues/{number}/comments"
        resp = self._request("POST", url, json={"body": body})
        resp.raise_for_status()
        return resp.json()

    def update_comment(self, comment_id: int, body: str) -> Optional[dict]:
        if self.dry_run:
            logger.info("[dry-run] Would update comment %s:\n%s", comment_id, body)
            return None
        url = f"{GITHUB_API}/repos/{self.repo}/issues/comments/{comment_id}"
        resp = self._request("PATCH", url, json={"body": body})
        resp.raise_for_status()
        return resp.json()

    def add_label(self, number: int, label: str) -> None:
        if self.dry_run:
            logger.info("[dry-run] Would add label %r to issue #%s", label, number)
            return
        url = f"{GITHUB_API}/repos/{self.repo}/issues/{number}/labels"
        resp = self._request("POST", url, json={"labels": [label]})
        resp.raise_for_status()

    def remove_label(self, number: int, label: str) -> None:
        if self.dry_run:
            logger.info("[dry-run] Would remove label %r from issue #%s", label, number)
            return
        url = f"{GITHUB_API}/repos/{self.repo}/issues/{number}/labels/{label}"
        resp = self._request("DELETE", url)
        if resp.status_code not in (200, 404):
            resp.raise_for_status()

    def ensure_label_exists(self, label: str, color: str = "ededed", description: str = "") -> None:
        """Creates the label in the repo if it doesn't exist yet. Requires Issues: write."""
        get_url = f"{GITHUB_API}/repos/{self.repo}/labels/{label}"
        resp = self._request("GET", get_url)
        if resp.status_code == 200:
            return
        if self.dry_run:
            logger.info("[dry-run] Would create label %r", label)
            return
        create_url = f"{GITHUB_API}/repos/{self.repo}/labels"
        resp = self._request(
            "POST", create_url, json={"name": label, "color": color, "description": description}
        )
        if resp.status_code not in (201, 422):
            resp.raise_for_status()
