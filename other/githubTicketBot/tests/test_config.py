import pytest

from ticketbot.config import Config, ConfigError


REQUIRED_ENV = {
    "BOT_GITHUB_APP_ID": "1234",
    "BOT_GITHUB_APP_PRIVATE_KEY_FILE": "/tmp/does-not-matter.pem",
    "ANTHROPIC_API_KEY": "sk-ant-test",
}


def _set_env(monkeypatch, **overrides):
    for key in [
        "BOT_GITHUB_APP_ID",
        "BOT_GITHUB_APP_PRIVATE_KEY_FILE",
        "ANTHROPIC_API_KEY",
        "BOT_REPOS",
        "BOT_MODEL",
        "BOT_POLL_INTERVAL",
        "BOT_STATE_FILE",
        "BOT_NEEDS_INFO_LABEL",
        "BOT_IGNORE_USERS",
        "BOT_SKIP_LABELS",
        "BOT_START_AT",
        "BOT_DRY_RUN",
        "BOT_LOG_LEVEL",
        "BOT_GITHUB_APP_INSTALLATION_ID",
    ]:
        monkeypatch.delenv(key, raising=False)
    for key, value in {**REQUIRED_ENV, **overrides}.items():
        monkeypatch.setenv(key, value)


def test_missing_app_id_raises(monkeypatch):
    _set_env(monkeypatch)
    monkeypatch.delenv("BOT_GITHUB_APP_ID")
    with pytest.raises(ConfigError):
        Config.from_env()


def test_missing_private_key_file_raises(monkeypatch):
    _set_env(monkeypatch)
    monkeypatch.delenv("BOT_GITHUB_APP_PRIVATE_KEY_FILE")
    with pytest.raises(ConfigError):
        Config.from_env()


def test_missing_anthropic_key_raises(monkeypatch):
    _set_env(monkeypatch)
    monkeypatch.delenv("ANTHROPIC_API_KEY")
    with pytest.raises(ConfigError):
        Config.from_env()


def test_defaults(monkeypatch):
    _set_env(monkeypatch)
    config = Config.from_env()
    assert config.repos == ["theotherp/nzbhydra2", "theotherp/apitests"]
    assert config.model == "claude-sonnet-5"
    assert config.poll_interval == 300
    assert config.needs_info_label == "needs-info"
    assert config.ignore_users == ["theotherp"]
    assert config.skip_labels == ["enhancement"]
    assert config.dry_run is False
    assert config.start_at is None
    assert config.installation_id is None


def test_repos_env_overrides_default(monkeypatch):
    _set_env(monkeypatch, BOT_REPOS="foo/bar, foo/baz")
    config = Config.from_env()
    assert config.repos == ["foo/bar", "foo/baz"]


def test_ignore_users_lowercased_and_split(monkeypatch):
    _set_env(monkeypatch, BOT_IGNORE_USERS="TheOtherP, SomeoneElse")
    config = Config.from_env()
    assert config.ignore_users == ["theotherp", "someoneelse"]


def test_dry_run_env_parsing(monkeypatch):
    _set_env(monkeypatch, BOT_DRY_RUN="true")
    assert Config.from_env().dry_run is True


def test_start_at_parsed_as_utc(monkeypatch):
    _set_env(monkeypatch, BOT_START_AT="2026-01-01T00:00:00Z")
    config = Config.from_env()
    assert config.start_at is not None
    assert config.start_at.year == 2026


def test_invalid_start_at_raises(monkeypatch):
    _set_env(monkeypatch, BOT_START_AT="not-a-date")
    with pytest.raises(ConfigError):
        Config.from_env()
