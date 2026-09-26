from datetime import datetime, timedelta, timezone

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from ticketbot.github_app_auth import GitHubAppAuth, GitHubAppAuthError


@pytest.fixture()
def private_key_path(tmp_path):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    path = tmp_path / "app.pem"
    path.write_bytes(pem)
    return str(path), key


class FakeResponse:
    def __init__(self, status_code, json_data=None, text=""):
        self.status_code = status_code
        self._json = json_data or {}
        self.text = text or str(json_data)

    def json(self):
        return self._json


class FakeSession:
    def __init__(self):
        self.get_responses = []
        self.post_responses = []
        self.get_calls = []
        self.post_calls = []
        self.timeouts = []

    def get(self, url, headers=None, **kwargs):
        self.get_calls.append((url, headers))
        self.timeouts.append(kwargs.get("timeout"))
        return self.get_responses.pop(0)

    def post(self, url, headers=None, **kwargs):
        self.post_calls.append((url, headers))
        self.timeouts.append(kwargs.get("timeout"))
        return self.post_responses.pop(0)


def test_generated_jwt_has_correct_claims_and_verifies_with_public_key(private_key_path):
    key_path, private_key = private_key_path
    now = 1_700_000_000.0
    auth = GitHubAppAuth(app_id="99887", private_key_path=key_path, time_func=lambda: now)

    token = auth._generate_jwt()

    public_key = private_key.public_key()
    decoded = jwt.decode(
        token, public_key, algorithms=["RS256"], options={"verify_exp": False, "verify_iat": False}
    )
    assert decoded["iss"] == "99887"
    assert decoded["iat"] == int(now) - 60
    assert decoded["exp"] == int(now) + 9 * 60


def test_get_installation_id_discovers_and_caches(private_key_path):
    key_path, _ = private_key_path
    session = FakeSession()
    session.get_responses = [FakeResponse(200, {"id": 555})]
    auth = GitHubAppAuth(app_id="1", private_key_path=key_path, session=session)

    first = auth.get_installation_id("theotherp/nzbhydra2")
    second = auth.get_installation_id("theotherp/nzbhydra2")

    assert first == "555"
    assert second == "555"
    assert len(session.get_calls) == 1  # cached, no second HTTP call


def test_get_installation_id_uses_override_without_http_call(private_key_path):
    key_path, _ = private_key_path
    session = FakeSession()
    auth = GitHubAppAuth(
        app_id="1", private_key_path=key_path, installation_id="42", session=session
    )

    assert auth.get_installation_id("theotherp/nzbhydra2") == "42"
    assert session.get_calls == []


def test_get_installation_id_raises_on_error(private_key_path):
    key_path, _ = private_key_path
    session = FakeSession()
    session.get_responses = [FakeResponse(404, text="not found")]
    auth = GitHubAppAuth(app_id="1", private_key_path=key_path, session=session)

    with pytest.raises(GitHubAppAuthError):
        auth.get_installation_id("theotherp/nzbhydra2")


def test_get_token_fetches_and_caches_per_installation(private_key_path):
    key_path, _ = private_key_path
    session = FakeSession()
    now = [1_700_000_000.0]
    expires = datetime.fromtimestamp(now[0], tz=timezone.utc) + timedelta(hours=1)
    session.get_responses = [FakeResponse(200, {"id": 777})]
    session.post_responses = [
        FakeResponse(201, {"token": "tok-1", "expires_at": expires.isoformat().replace("+00:00", "Z")})
    ]
    auth = GitHubAppAuth(
        app_id="1", private_key_path=key_path, session=session, time_func=lambda: now[0]
    )

    token1 = auth.get_token("theotherp/nzbhydra2")
    token2 = auth.get_token("theotherp/nzbhydra2")

    assert token1 == "tok-1"
    assert token2 == "tok-1"
    assert len(session.post_calls) == 1  # second call served from cache


def test_get_token_refreshes_when_close_to_expiry(private_key_path):
    key_path, _ = private_key_path
    session = FakeSession()
    now = [1_700_000_000.0]
    expires_soon = datetime.fromtimestamp(now[0], tz=timezone.utc) + timedelta(minutes=4)
    expires_later = datetime.fromtimestamp(now[0], tz=timezone.utc) + timedelta(hours=1)
    session.get_responses = [FakeResponse(200, {"id": 777})]
    session.post_responses = [
        FakeResponse(
            201,
            {"token": "tok-1", "expires_at": expires_soon.isoformat().replace("+00:00", "Z")},
        ),
        FakeResponse(
            201,
            {"token": "tok-2", "expires_at": expires_later.isoformat().replace("+00:00", "Z")},
        ),
    ]
    auth = GitHubAppAuth(
        app_id="1", private_key_path=key_path, session=session, time_func=lambda: now[0]
    )

    token1 = auth.get_token("theotherp/nzbhydra2")
    # Token expires in 4 minutes, which is within the 5 minute refresh margin,
    # so the next call must fetch a fresh one even though we didn't force it.
    token2 = auth.get_token("theotherp/nzbhydra2")

    assert token1 == "tok-1"
    assert token2 == "tok-2"
    assert len(session.post_calls) == 2


def test_two_repos_share_token_cache_for_same_installation(private_key_path):
    key_path, _ = private_key_path
    session = FakeSession()
    now = [1_700_000_000.0]
    expires = datetime.fromtimestamp(now[0], tz=timezone.utc) + timedelta(hours=1)
    # Both repos resolve to the same installation id.
    session.get_responses = [FakeResponse(200, {"id": 555}), FakeResponse(200, {"id": 555})]
    session.post_responses = [
        FakeResponse(201, {"token": "shared-tok", "expires_at": expires.isoformat().replace("+00:00", "Z")})
    ]
    auth = GitHubAppAuth(
        app_id="1", private_key_path=key_path, session=session, time_func=lambda: now[0]
    )

    token_a = auth.get_token("theotherp/nzbhydra2")
    token_b = auth.get_token("theotherp/apitests")

    assert token_a == token_b == "shared-tok"
    assert len(session.post_calls) == 1


def test_force_refresh_bypasses_cache(private_key_path):
    key_path, _ = private_key_path
    session = FakeSession()
    now = [1_700_000_000.0]
    expires = datetime.fromtimestamp(now[0], tz=timezone.utc) + timedelta(hours=1)
    session.get_responses = [FakeResponse(200, {"id": 555})]
    session.post_responses = [
        FakeResponse(201, {"token": "tok-1", "expires_at": expires.isoformat().replace("+00:00", "Z")}),
        FakeResponse(201, {"token": "tok-2", "expires_at": expires.isoformat().replace("+00:00", "Z")}),
    ]
    auth = GitHubAppAuth(
        app_id="1", private_key_path=key_path, session=session, time_func=lambda: now[0]
    )

    auth.get_token("theotherp/nzbhydra2")
    token = auth.get_token("theotherp/nzbhydra2", force_refresh=True)

    assert token == "tok-2"
    assert len(session.post_calls) == 2


def test_get_app_slug_caches(private_key_path):
    key_path, _ = private_key_path
    session = FakeSession()
    session.get_responses = [FakeResponse(200, {"slug": "nzbhydra2-bot"})]
    auth = GitHubAppAuth(app_id="1", private_key_path=key_path, session=session)

    assert auth.get_app_slug() == "nzbhydra2-bot"
    assert auth.get_app_slug() == "nzbhydra2-bot"
    assert len(session.get_calls) == 1


def _token_response(token, now):
    expires = datetime.fromtimestamp(now, tz=timezone.utc) + timedelta(hours=1)
    return FakeResponse(201, {"token": token, "expires_at": expires.isoformat().replace("+00:00", "Z")})


def test_all_http_calls_use_a_timeout(private_key_path):
    key_path, _ = private_key_path
    session = FakeSession()
    now = 1_700_000_000.0
    session.get_responses = [FakeResponse(200, {"id": 555}), FakeResponse(200, {"slug": "bot"})]
    session.post_responses = [_token_response("tok", now)]
    auth = GitHubAppAuth(app_id="1", private_key_path=key_path, session=session, time_func=lambda: now)

    auth.get_token("theotherp/nzbhydra2")
    auth.get_app_slug()

    assert session.timeouts == [30, 30, 30]


def test_404_on_token_exchange_forgets_installation_id(private_key_path):
    key_path, _ = private_key_path
    session = FakeSession()
    now = 1_700_000_000.0
    session.get_responses = [FakeResponse(200, {"id": 555}), FakeResponse(200, {"id": 999})]
    session.post_responses = [FakeResponse(404, text="Not Found"), _token_response("new-tok", now)]
    auth = GitHubAppAuth(app_id="1", private_key_path=key_path, session=session, time_func=lambda: now)

    with pytest.raises(GitHubAppAuthError):
        auth.get_token("theotherp/nzbhydra2")
    token = auth.get_token("theotherp/nzbhydra2")

    assert token == "new-tok"
    assert session.post_calls[1][0].endswith("/app/installations/999/access_tokens")
