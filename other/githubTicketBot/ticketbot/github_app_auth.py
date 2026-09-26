"""GitHub App authentication: JWT creation and installation access token caching.

The bot authenticates as a GitHub App (not a personal access token). It signs a
short-lived RS256 JWT with the App's private key and uses that JWT to look up
the App's installation for each watched repo (unless an installation id is
configured explicitly), then exchanges it for an installation access token.

The bot can watch several repositories under the same owner, which are
typically served by a single installation. Installation ids are cached per
repo and access tokens are cached per installation id, so two repos on the
same installation share one token. Tokens are refreshed shortly before they
expire, and also refreshed once on a 401.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable, Dict, Optional, Tuple

import jwt
import requests

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"

# Refresh this long before the actual expiry to avoid races where a request
# is sent with a token that expires mid-flight.
TOKEN_REFRESH_MARGIN = timedelta(minutes=5)
JWT_LIFETIME_SECONDS = 9 * 60
JWT_ISSUED_AT_SKEW_SECONDS = 60
HTTP_TIMEOUT = 30


class GitHubAppAuthError(RuntimeError):
    pass


class GitHubAppAuth:
    """Manages JWTs and installation access tokens for a GitHub App that may
    be installed across multiple repos of the same owner."""

    def __init__(
        self,
        app_id: str,
        private_key_path: str,
        installation_id: Optional[str] = None,
        session: Optional[requests.Session] = None,
        time_func: Callable[[], float] = time.time,
    ) -> None:
        self.app_id = app_id
        self._private_key = Path(private_key_path).read_text()
        # Optional explicit override, applied to every repo (the common case
        # where one installation covers all watched repos).
        self._installation_id_override = installation_id
        self.session = session or requests.Session()
        self._time_func = time_func

        self._installation_id_by_repo: Dict[str, str] = {}
        # installation_id -> (token, expires_at)
        self._tokens: Dict[str, Tuple[str, datetime]] = {}
        self._app_slug: Optional[str] = None

    def _now(self) -> datetime:
        return datetime.fromtimestamp(self._time_func(), tz=timezone.utc)

    def _generate_jwt(self) -> str:
        now = int(self._time_func())
        payload = {
            "iat": now - JWT_ISSUED_AT_SKEW_SECONDS,
            "exp": now + JWT_LIFETIME_SECONDS,
            "iss": self.app_id,
        }
        return jwt.encode(payload, self._private_key, algorithm="RS256")

    def _jwt_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._generate_jwt()}",
            "Accept": "application/vnd.github+json",
        }

    def get_installation_id(self, repo: str) -> str:
        if self._installation_id_override:
            return self._installation_id_override
        if repo in self._installation_id_by_repo:
            return self._installation_id_by_repo[repo]
        url = f"{GITHUB_API}/repos/{repo}/installation"
        resp = self.session.get(url, headers=self._jwt_headers(), timeout=HTTP_TIMEOUT)
        if resp.status_code != 200:
            raise GitHubAppAuthError(
                f"Could not discover installation id for {repo}: "
                f"{resp.status_code} {resp.text}"
            )
        installation_id = str(resp.json()["id"])
        self._installation_id_by_repo[repo] = installation_id
        return installation_id

    def get_app_slug(self) -> str:
        if self._app_slug:
            return self._app_slug
        resp = self.session.get(f"{GITHUB_API}/app", headers=self._jwt_headers(), timeout=HTTP_TIMEOUT)
        if resp.status_code != 200:
            raise GitHubAppAuthError(f"Could not fetch app info: {resp.status_code} {resp.text}")
        self._app_slug = resp.json()["slug"]
        return self._app_slug

    def _is_token_fresh(self, installation_id: str) -> bool:
        cached = self._tokens.get(installation_id)
        if not cached:
            return False
        _, expires_at = cached
        return self._now() < (expires_at - TOKEN_REFRESH_MARGIN)

    def get_token(self, repo: str, force_refresh: bool = False) -> str:
        installation_id = self.get_installation_id(repo)
        if not force_refresh and self._is_token_fresh(installation_id):
            return self._tokens[installation_id][0]

        url = f"{GITHUB_API}/app/installations/{installation_id}/access_tokens"
        resp = self.session.post(url, headers=self._jwt_headers(), timeout=HTTP_TIMEOUT)
        if resp.status_code == 404:
            # The App was probably reinstalled under a new installation id;
            # forget the cached one so the next call discovers it again.
            self._installation_id_by_repo.pop(repo, None)
            self._tokens.pop(installation_id, None)
        if resp.status_code not in (200, 201):
            raise GitHubAppAuthError(
                f"Could not create installation access token for installation "
                f"{installation_id}: {resp.status_code} {resp.text}"
            )
        data = resp.json()
        token = data["token"]
        expires_at = datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00"))
        self._tokens[installation_id] = (token, expires_at)
        logger.debug(
            "Refreshed installation access token for installation %s, expires at %s",
            installation_id,
            expires_at,
        )
        return token
