import json

import pytest

from ticketbot.state import BotState, CorruptStateError, IssueState, RepoState, StateStore, issue_key


def test_issue_key_format():
    assert issue_key("theotherp/nzbhydra2", 42) == "theotherp/nzbhydra2#42"


def test_load_returns_empty_state_when_file_missing(tmp_path):
    store = StateStore(str(tmp_path / "state.json"))
    state = store.load()
    assert state.repos == {}
    assert state.issues == {}


def test_save_and_load_round_trip(tmp_path):
    path = tmp_path / "nested" / "state.json"
    store = StateStore(str(path))
    state = BotState()
    state.repos["theotherp/nzbhydra2"] = RepoState(
        last_poll="2026-01-02T00:00:00+00:00", start_at="2026-01-01T00:00:00+00:00"
    )
    state.issues["theotherp/nzbhydra2#1"] = IssueState(
        repo="theotherp/nzbhydra2",
        number=1,
        created_at="2026-01-01T00:00:00+00:00",
        updated_at_seen="2026-01-01T00:00:00+00:00",
        is_bug=True,
        missing_info=True,
        bot_comment_id=123,
    )

    store.save(state)
    assert path.exists()

    loaded = store.load()
    assert loaded.repos["theotherp/nzbhydra2"].start_at == "2026-01-01T00:00:00+00:00"
    assert loaded.repos["theotherp/nzbhydra2"].last_poll == "2026-01-02T00:00:00+00:00"
    issue = loaded.issues["theotherp/nzbhydra2#1"]
    assert issue.bot_comment_id == 123
    assert issue.missing_info is True


def test_save_does_not_leave_tmp_file_behind(tmp_path):
    path = tmp_path / "state.json"
    store = StateStore(str(path))
    store.save(BotState())
    leftovers = list(tmp_path.glob("*.tmp"))
    assert leftovers == []


def test_load_ignores_unknown_and_defaults_missing_keys(tmp_path):
    path = tmp_path / "state.json"
    path.write_text(json.dumps({
        "some_future_field": 1,
        "repos": {"o/r": {"last_poll": "2026-01-01T00:00:00+00:00", "unknown": True}},
        "issues": {
            "o/r#5": {"repo": "o/r", "number": 5, "resolved": True, "new_field": "x"},
            "o/r#6": {"is_bug": False},
        },
    }))

    state = StateStore(str(path)).load()

    assert state.repos["o/r"].last_poll == "2026-01-01T00:00:00+00:00"
    assert state.repos["o/r"].start_at is None
    assert state.issues["o/r#5"].resolved is True
    assert state.issues["o/r#5"].label_applied is True
    assert state.issues["o/r#5"].error_count == 0
    assert (state.issues["o/r#6"].repo, state.issues["o/r#6"].number) == ("o/r", 6)


def test_load_migrates_legacy_global_start_at_to_repos(tmp_path):
    path = tmp_path / "state.json"
    path.write_text(json.dumps({
        "start_at": "2026-01-01T00:00:00+00:00",
        "repos": {"o/a": {"last_poll": None}, "o/b": {"start_at": "2026-05-01T00:00:00+00:00"}},
        "issues": {},
    }))
    store = StateStore(str(path))

    state = store.load()

    assert state.repos["o/a"].start_at == "2026-01-01T00:00:00+00:00"
    assert state.repos["o/b"].start_at == "2026-05-01T00:00:00+00:00"
    store.save(state)
    assert "start_at" not in json.loads(path.read_text())


# ---------------------------------------------------------------------------
# Corrupt state file: a missing file is a normal first run, an unreadable or
# unparseable one is not - it must not silently be treated as one.
# ---------------------------------------------------------------------------

def test_invalid_json_raises_and_quarantines_a_copy(tmp_path):
    path = tmp_path / "state.json"
    path.write_text("{not valid json")
    store = StateStore(str(path))

    with pytest.raises(CorruptStateError):
        store.load()

    corrupt_copies = list(tmp_path.glob("state.json.corrupt-*"))
    assert len(corrupt_copies) == 1
    assert corrupt_copies[0].read_text() == "{not valid json"
    assert path.exists()  # the original is left in place, not deleted


def test_unexpected_top_level_type_raises_and_quarantines_a_copy(tmp_path):
    path = tmp_path / "state.json"
    path.write_text(json.dumps(["not", "an", "object"]))
    store = StateStore(str(path))

    with pytest.raises(CorruptStateError):
        store.load()

    assert list(tmp_path.glob("state.json.corrupt-*"))


def test_malformed_repo_entry_raises_and_quarantines_a_copy(tmp_path):
    # A non-dict repo value blows up inside RepoState.from_dict (AttributeError),
    # which must be treated as corrupt state rather than starting fresh.
    path = tmp_path / "state.json"
    path.write_text(json.dumps({"repos": {"o/r": None}, "issues": {}}))
    store = StateStore(str(path))

    with pytest.raises(CorruptStateError):
        store.load()

    assert list(tmp_path.glob("state.json.corrupt-*"))


def test_missing_state_file_is_a_normal_first_run_not_corrupt(tmp_path):
    store = StateStore(str(tmp_path / "state.json"))

    state = store.load()  # must not raise

    assert state.repos == {}
    assert state.issues == {}
    assert list(tmp_path.glob("*.corrupt-*")) == []


def test_malformed_single_issue_entry_is_logged_and_skipped_not_fatal(tmp_path):
    path = tmp_path / "state.json"
    path.write_text(json.dumps({
        "repos": {},
        "issues": {"o/r#1": None, "o/r#2": {"repo": "o/r", "number": 2, "resolved": True}},
    }))
    store = StateStore(str(path))

    state = store.load()  # must not raise: one bad entry is skipped, not fatal

    assert "o/r#1" not in state.issues
    assert state.issues["o/r#2"].resolved is True
