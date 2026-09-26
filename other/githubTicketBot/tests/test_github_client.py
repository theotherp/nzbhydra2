import pytest
import requests

from ticketbot.github_client import GitHubClient

REPO = "theotherp/nzbhydra2"
API = "https://api.github.com"


class FakeResponse:
    def __init__(self, status_code, json_data=None, headers=None):
        self.status_code = status_code
        self._json = json_data if json_data is not None else []
        self.headers = headers or {}

    def json(self):
        return self._json

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"{self.status_code} error")


class FakeSession:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def request(self, method, url, headers=None, **kwargs):
        self.calls.append({"method": method, "url": url, "headers": headers, **kwargs})
        return self.responses.pop(0)


class FakeAuth:
    def __init__(self):
        self.tokens = ["tok-1", "tok-2"]
        self.refreshes = 0

    def get_token(self, repo, force_refresh=False):
        if force_refresh:
            self.refreshes += 1
            self.tokens.pop(0)
        return self.tokens[0]


def make_client(responses, dry_run=False):
    session = FakeSession(responses)
    sleeps = []
    client = GitHubClient(FakeAuth(), REPO, dry_run=dry_run, session=session, sleep_func=sleeps.append)
    return client, session, sleeps


def issue(number, pull_request=False):
    item = {"number": number}
    if pull_request:
        item["pull_request"] = {}
    return item


def test_list_issues_follows_link_pagination_and_drops_pull_requests():
    next_url = f"{API}/repositories/1/issues?page=2"
    client, session, _ = make_client([
        FakeResponse(200, [issue(1), issue(2, pull_request=True)],
                     headers={"Link": f'<{next_url}>; rel="next", <{API}/x?page=2>; rel="last"'}),
        FakeResponse(200, [issue(3)]),
    ])

    issues = client.list_issues(since="2026-01-01T00:00:00Z")

    assert [i["number"] for i in issues] == [1, 3]
    assert session.calls[0]["params"]["since"] == "2026-01-01T00:00:00Z"
    assert session.calls[1]["url"] == next_url
    assert session.calls[1]["params"] == {}  # the next link already carries the query
    assert all(call["timeout"] == 30 for call in session.calls)


def test_list_comments_maps_fields():
    client, _, _ = make_client([
        FakeResponse(200, [{"id": 7, "body": None, "user": {"login": "bot[bot]", "type": "Bot"},
                            "created_at": "2026-01-01T00:00:00Z"}]),
    ])

    comments = client.list_comments(5)

    assert len(comments) == 1
    assert (comments[0].id, comments[0].body, comments[0].user_type) == (7, "", "Bot")


def test_401_refreshes_token_once_and_retries():
    client, session, _ = make_client([FakeResponse(401), FakeResponse(200, {"number": 5})])

    assert client.get_issue(5) == {"number": 5}
    assert client.auth.refreshes == 1
    assert session.calls[0]["headers"]["Authorization"] == "Bearer tok-1"
    assert session.calls[1]["headers"]["Authorization"] == "Bearer tok-2"


def test_second_401_is_not_retried_forever():
    client, session, _ = make_client([FakeResponse(401), FakeResponse(401)])

    with pytest.raises(requests.HTTPError):
        client.get_issue(5)
    assert len(session.calls) == 2


def test_rate_limit_with_retry_after_sleeps_and_retries():
    client, session, sleeps = make_client([
        FakeResponse(429, headers={"Retry-After": "12"}),
        FakeResponse(200, {"number": 5}),
    ])

    assert client.get_issue(5) == {"number": 5}
    assert sleeps == [12.0]
    assert len(session.calls) == 2


def test_rate_limit_exhausted_sleeps_until_reset(monkeypatch):
    monkeypatch.setattr("ticketbot.github_client.time.time", lambda: 1000.0)
    client, session, sleeps = make_client([
        FakeResponse(403, headers={"X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "1060"}),
        FakeResponse(200, {"number": 5}),
    ])

    assert client.get_issue(5) == {"number": 5}
    assert sleeps == [60.0]


def test_plain_403_is_not_treated_as_rate_limit():
    client, session, sleeps = make_client([FakeResponse(403, headers={"X-RateLimit-Remaining": "4999"})])

    with pytest.raises(requests.HTTPError):
        client.get_issue(5)
    assert sleeps == []


def test_dry_run_does_not_send_writes():
    client, session, _ = make_client([], dry_run=True)

    assert client.create_comment(5, "hi") is None
    client.update_comment(1, "hi")
    client.add_label(5, "needs-info")
    client.remove_label(5, "needs-info")

    assert session.calls == []
