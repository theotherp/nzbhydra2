import fcntl
import os

import pytest

from ticketbot import __main__ as cli


class FakeClient:
    def __init__(self):
        self.ensure_calls = []

    def ensure_label_exists(self, label):
        self.ensure_calls.append(label)


class FakeBot:
    def __init__(self, repos):
        self.clients = {repo: FakeClient() for repo in repos}
        self.evaluated = []
        self.run_once_calls = 0

    def evaluate_single_issue(self, repo, number):
        self.evaluated.append((repo, number))

    def run_once(self):
        self.run_once_calls += 1


def _setup(monkeypatch):
    monkeypatch.setenv("BOT_GITHUB_APP_ID", "1")
    monkeypatch.setenv("BOT_GITHUB_APP_PRIVATE_KEY_FILE", "unused.pem")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.setenv("BOT_REPOS", "theotherp/nzbhydra2")
    bot = FakeBot(["theotherp/nzbhydra2"])
    monkeypatch.setattr(cli, "build_bot", lambda config, **kwargs: bot)
    return bot


def test_issue_for_unconfigured_repo_prints_error(monkeypatch, capsys):
    bot = _setup(monkeypatch)

    assert cli.main(["--issue", "someone/else#3"]) == 2

    assert "not in BOT_REPOS" in capsys.readouterr().err
    assert bot.evaluated == []


def test_issue_mode_does_not_touch_labels(monkeypatch):
    bot = _setup(monkeypatch)

    assert cli.main(["--issue", "12"]) == 0

    assert bot.evaluated == [("theotherp/nzbhydra2", 12)]
    assert bot.clients["theotherp/nzbhydra2"].ensure_calls == []


# ---------------------------------------------------------------------------
# Single-instance lock
# ---------------------------------------------------------------------------

def _hold_lock(tmp_path):
    lock_path = tmp_path / "state.json.lock"
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    held = open(lock_path, "w")
    fcntl.flock(held, fcntl.LOCK_EX | fcntl.LOCK_NB)
    return held


def test_acquire_lock_raises_when_already_held(tmp_path):
    lock_path = tmp_path / "state.json.lock"
    held = _hold_lock(tmp_path)
    try:
        with pytest.raises(cli.AlreadyRunningError):
            cli.acquire_lock(str(lock_path))
    finally:
        held.close()


def test_acquire_lock_succeeds_once_released(tmp_path):
    lock_path = tmp_path / "state.json.lock"
    held = _hold_lock(tmp_path)
    held.close()

    lock_file = cli.acquire_lock(str(lock_path))
    lock_file.close()


def test_main_once_exits_nonzero_when_another_instance_holds_the_lock(monkeypatch, tmp_path, capsys):
    bot = _setup(monkeypatch)
    monkeypatch.setenv("BOT_STATE_FILE", str(tmp_path / "state.json"))
    held = _hold_lock(tmp_path)
    try:
        assert cli.main(["--once"]) == 1
    finally:
        held.close()
    assert "already running" in capsys.readouterr().err
    assert bot.run_once_calls == 0


def test_main_loop_mode_also_exits_nonzero_when_another_instance_holds_the_lock(monkeypatch, tmp_path):
    bot = _setup(monkeypatch)
    monkeypatch.setenv("BOT_STATE_FILE", str(tmp_path / "state.json"))
    held = _hold_lock(tmp_path)
    try:
        assert cli.main([]) == 1  # would otherwise loop forever
    finally:
        held.close()
    assert bot.run_once_calls == 0


def test_main_issue_mode_does_not_need_the_lock(monkeypatch, tmp_path):
    bot = _setup(monkeypatch)
    monkeypatch.setenv("BOT_STATE_FILE", str(tmp_path / "state.json"))
    held = _hold_lock(tmp_path)
    try:
        assert cli.main(["--issue", "12"]) == 0
    finally:
        held.close()
    assert bot.evaluated == [("theotherp/nzbhydra2", 12)]


def test_load_env_file_does_not_override_existing_variables(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text("BOT_TEST_FROM_FILE=file\nBOT_TEST_ALREADY_SET=file\n")
    monkeypatch.delenv("BOT_TEST_FROM_FILE", raising=False)
    monkeypatch.setenv("BOT_TEST_ALREADY_SET", "shell")

    try:
        cli.load_env_file(str(env_file))

        assert os.environ["BOT_TEST_FROM_FILE"] == "file"
        assert os.environ["BOT_TEST_ALREADY_SET"] == "shell"
    finally:
        monkeypatch.delenv("BOT_TEST_FROM_FILE", raising=False)


def test_load_env_file_ignores_missing_file(tmp_path):
    cli.load_env_file(str(tmp_path / "missing.env"))
