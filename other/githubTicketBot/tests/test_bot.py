import json
import re
from datetime import datetime, timedelta, timezone

from ticketbot.assessor import AssessmentError, FatalAssessmentError
from ticketbot.bot import TicketBot, is_after, now_iso, parse_issue_arg
from ticketbot.comment_text import FOOTER, MARKER
from ticketbot.config import Config
from ticketbot.state import StateStore
from tests.fakes import BOT_LOGIN, FakeClock, FakeGitHubClient, fake_assess_fn, make_assessment

REPO = "theotherp/nzbhydra2"
OTHER_REPO = "theotherp/apitests"
OLD_START_AT = datetime(2000, 1, 1, tzinfo=timezone.utc)


def make_config(tmp_path, repos=None, dry_run=False, start_at=OLD_START_AT, ignore_users=None, skip_labels=None):
    return Config(
        app_id="1",
        private_key_file="unused.pem",
        anthropic_api_key="unused",
        repos=repos or [REPO],
        model="claude-sonnet-5",
        poll_interval=300,
        state_file=str(tmp_path / "state.json"),
        needs_info_label="needs-info",
        ignore_users=ignore_users if ignore_users is not None else ["theotherp"],
        skip_labels=skip_labels if skip_labels is not None else ["enhancement"],
        start_at=start_at,
        dry_run=dry_run,
        log_level="INFO",
        installation_id=None,
    )


def make_bot(
    tmp_path,
    repos=None,
    dry_run=False,
    queue=None,
    calls=None,
    ignore_users=None,
    skip_labels=None,
    start_at=OLD_START_AT,
    clock=None,
    assess_fn=None,
    clients=None,
    bot_login=BOT_LOGIN,
):
    repos = repos or [REPO]
    store = StateStore(str(tmp_path / "state.json"))
    config = make_config(tmp_path, repos=repos, dry_run=dry_run, start_at=start_at,
                         ignore_users=ignore_users, skip_labels=skip_labels)
    fake_now = clock.iso if clock else now_iso
    clients = clients or {repo: FakeGitHubClient(repo, dry_run=dry_run, now_func=fake_now) for repo in repos}
    assess_fn = assess_fn or fake_assess_fn(queue if queue is not None else [], calls)
    kwargs = {"now_func": clock.now} if clock else {}
    bot = TicketBot(config, clients, anthropic_client=None, state_store=store, assess_fn=assess_fn,
                    bot_login=bot_login, **kwargs)
    return bot, store, clients


def missing(comment="Please attach the debug infos ZIP.", missing_information=None):
    return make_assessment(is_bug=True, debug_infos_needed=True, debug_infos_attached=False,
                           missing_information=missing_information or ["debug infos ZIP"], comment=comment)


def complete():
    return make_assessment(is_bug=True, debug_infos_needed=True, debug_infos_attached=True, missing_information=[])


# ---------------------------------------------------------------------------
# New-issue flow
# ---------------------------------------------------------------------------

def test_new_issue_missing_debug_infos_posts_comment_and_label(tmp_path):
    bot, store, clients = make_bot(tmp_path, queue=[missing(comment="Please attach logs.")])
    client = clients[REPO]
    client.add_issue(1, "Crashes on search", "It just crashes", "reporter1", created_at=now_iso())

    bot.run_once()

    assert len(client.created_comments) == 1
    number, body = client.created_comments[0]
    assert number == 1
    assert "Please attach logs." in body
    assert MARKER in body
    assert FOOTER in body
    assert client.added_labels == [(1, "needs-info")]

    issue_state = store.load().issues[f"{REPO}#1"]
    assert issue_state.is_bug is True
    assert issue_state.missing_info is True
    assert issue_state.resolved is False
    assert issue_state.label_applied is True
    assert issue_state.bot_comment_id is not None


def test_new_issue_not_a_bug_takes_no_action(tmp_path):
    bot, store, clients = make_bot(tmp_path, queue=[make_assessment(is_bug=False, missing_information=[])])
    client = clients[REPO]
    client.add_issue(2, "Please add a dark mode", "Would be nice", "reporter2", created_at=now_iso())

    bot.run_once()

    assert client.created_comments == []
    assert client.added_labels == []
    assert store.load().issues[f"{REPO}#2"].resolved is True


def test_new_bug_with_everything_attached_takes_no_action(tmp_path):
    bot, store, clients = make_bot(tmp_path, queue=[complete()])
    client = clients[REPO]
    client.add_issue(3, "Search fails", "Full debug ZIP attached", "reporter3", created_at=now_iso())

    bot.run_once()

    assert client.created_comments == []
    assert client.added_labels == []
    assert store.load().issues[f"{REPO}#3"].resolved is True


def test_first_assessment_includes_earlier_reporter_comments(tmp_path):
    calls = []
    bot, store, clients = make_bot(tmp_path, queue=[complete()], calls=calls)
    client = clients[REPO]
    client.add_issue(4, "Crash", "body", "reporter4", created_at=now_iso())
    client.add_comment(4, "reporter4", "Forgot the zip: https://github.com/user-attachments/files/1/x.zip")

    bot.run_once()

    assert calls[0]["follow_up_comments"] == ["Forgot the zip: https://github.com/user-attachments/files/1/x.zip"]


# ---------------------------------------------------------------------------
# Filtering rules
# ---------------------------------------------------------------------------

def test_maintainer_own_issue_is_skipped(tmp_path):
    bot, store, clients = make_bot(tmp_path, calls=(calls := []))
    clients[REPO].add_issue(4, "Known issue", "body", "theotherp", created_at=now_iso())

    bot.run_once()

    assert calls == []
    assert f"{REPO}#4" not in store.load().issues


def test_bot_authored_issue_is_skipped(tmp_path):
    bot, store, clients = make_bot(tmp_path, calls=(calls := []))
    clients[REPO].add_issue(5, "Automated report", "body", "some-bot[bot]", author_type="Bot", created_at=now_iso())

    bot.run_once()

    assert calls == []
    assert f"{REPO}#5" not in store.load().issues


def test_issue_with_skip_label_is_skipped(tmp_path):
    bot, store, clients = make_bot(tmp_path, calls=(calls := []))
    clients[REPO].add_issue(6, "Add CSV export", "body", "reporter", labels=["Enhancement"], created_at=now_iso())

    bot.run_once()

    assert calls == []
    assert f"{REPO}#6" not in store.load().issues


def test_maintainer_comment_before_first_post_means_no_assessment(tmp_path):
    bot, store, clients = make_bot(tmp_path, calls=(calls := []))
    client = clients[REPO]
    client.add_issue(7, "Crash", "body", "reporter", created_at=now_iso())
    client.add_comment(7, "TheOtherP", "Already on it.")

    bot.run_once()

    assert calls == []
    assert client.created_comments == []
    assert store.load().issues[f"{REPO}#7"].resolved is True


# ---------------------------------------------------------------------------
# start_at per repo
# ---------------------------------------------------------------------------

def test_start_at_defaults_to_now_and_skips_pre_existing_issues(tmp_path):
    clock = FakeClock()
    bot, store, clients = make_bot(tmp_path, start_at=None, clock=clock, calls=(calls := []))
    clients[REPO].add_issue(7, "Old bug", "body", "reporter", created_at="2000-01-01T00:00:00Z")

    bot.run_once()

    assert calls == []
    state = store.load()
    assert state.repos[REPO].start_at == clock.iso()
    assert f"{REPO}#7" not in state.issues
    # The first poll only asks for issues updated since start_at.
    assert clients[REPO].list_issues_calls == [clock.now().strftime("%Y-%m-%dT%H:%M:%SZ")]


def test_configured_start_at_is_used_for_new_repos(tmp_path):
    start_at = datetime(2026, 3, 1, tzinfo=timezone.utc)
    bot, store, clients = make_bot(tmp_path, start_at=start_at, queue=[complete()], calls=(calls := []))
    clients[REPO].add_issue(1, "Before", "body", "reporter", created_at="2026-02-28T23:59:59Z")
    clients[REPO].add_issue(2, "After", "body", "reporter", created_at="2026-03-01T00:00:01Z")

    bot.run_once()

    assert [c["title"] for c in calls] == ["After"]
    assert store.load().repos[REPO].start_at == start_at.isoformat()


def test_repo_added_later_does_not_process_its_backlog(tmp_path):
    clock = FakeClock()
    bot, store, clients = make_bot(tmp_path, start_at=None, clock=clock)
    bot.run_once()
    first_start_at = store.load().repos[REPO].start_at

    clock.advance(days=30)
    other = FakeGitHubClient(OTHER_REPO, now_func=clock.iso)
    # Created after REPO's start_at, but before OTHER_REPO was added.
    other.add_issue(5, "Old ticket", "body", "reporter", created_at=(clock.now() - timedelta(days=10)).isoformat())
    calls = []
    bot2, _, _ = make_bot(tmp_path, repos=[REPO, OTHER_REPO], start_at=None, clock=clock, calls=calls,
                          clients={REPO: clients[REPO], OTHER_REPO: other})
    bot2.run_once()

    assert calls == []
    assert other.created_comments == []
    state = store.load()
    assert state.repos[REPO].start_at == first_start_at
    assert state.repos[OTHER_REPO].start_at == clock.iso()


def test_configured_start_at_does_not_apply_to_a_repo_added_much_later(tmp_path):
    """BOT_START_AT only applies on a true first run. A repo added to
    BOT_REPOS long after the bot already tracks others must not get a
    long-past BOT_START_AT - that would process its entire backlog - it gets
    max(BOT_START_AT, now) instead, same as if no BOT_START_AT were set."""
    clock = FakeClock()
    start_at = clock.now() - timedelta(days=200)
    bot, store, clients = make_bot(tmp_path, start_at=start_at, clock=clock)
    bot.run_once()

    clock.advance(days=100)
    other = FakeGitHubClient(OTHER_REPO, now_func=clock.iso)
    other.add_issue(5, "Old ticket", "body", "reporter",
                    created_at=(clock.now() - timedelta(days=90)).isoformat())
    bot2, _, _ = make_bot(tmp_path, repos=[REPO, OTHER_REPO], start_at=start_at, clock=clock,
                          clients={REPO: clients[REPO], OTHER_REPO: other})
    bot2.run_once()

    assert other.created_comments == []
    state = store.load()
    assert state.repos[REPO].start_at == start_at.isoformat()  # unaffected, already set
    assert state.repos[OTHER_REPO].start_at == clock.iso()


def test_legacy_global_start_at_applies_to_existing_repos(tmp_path):
    (tmp_path / "state.json").write_text(json.dumps({
        "start_at": "2026-03-01T00:00:00+00:00",
        "repos": {REPO: {"last_poll": None}},
        "issues": {},
    }))
    bot, store, clients = make_bot(tmp_path, start_at=None, queue=[complete()], calls=(calls := []))
    clients[REPO].add_issue(1, "Before", "body", "reporter", created_at="2026-02-01T00:00:00Z")
    clients[REPO].add_issue(2, "After", "body", "reporter", created_at="2026-04-01T00:00:00Z")

    bot.run_once()

    assert [c["title"] for c in calls] == ["After"]
    assert store.load().repos[REPO].start_at == "2026-03-01T00:00:00+00:00"


# ---------------------------------------------------------------------------
# Re-check flow
# ---------------------------------------------------------------------------

def test_recheck_still_missing_edits_existing_comment_only(tmp_path):
    queue = [missing(comment="Please attach the ZIP."), missing(comment="Still need your OS version.")]
    bot, store, clients = make_bot(tmp_path, queue=queue)
    client = clients[REPO]
    client.add_issue(10, "Crash", "body", "reporter10", created_at=now_iso())

    bot.run_once()
    client.add_comment(10, "reporter10", "Here's some more info but no OS.")
    bot.run_once()

    assert len(client.created_comments) == 1  # never a second comment
    assert len(client.updated_comments) == 1
    assert "OS version" in client.updated_comments[0][1]
    issue_state = store.load().issues[f"{REPO}#10"]
    assert issue_state.missing_info is True
    assert issue_state.error_count == 0


def test_recheck_complete_removes_label_and_edits_comment(tmp_path):
    bot, store, clients = make_bot(tmp_path, queue=[missing(), complete()])
    client = clients[REPO]
    client.add_issue(11, "Crash", "body", "reporter11", created_at=now_iso())

    bot.run_once()
    client.add_comment(11, "reporter11", "Here's the debug zip finally.")
    bot.run_once()

    assert client.removed_labels == [(11, "needs-info")]
    assert len(client.updated_comments) == 1
    issue_state = store.load().issues[f"{REPO}#11"]
    assert issue_state.missing_info is False
    assert issue_state.resolved is True


def test_complete_path_resumes_after_failure_between_comment_and_label(tmp_path):
    """The comment is updated before the label is removed, and a failure in
    between must be retried to completion - not read back on the next cycle
    as "the label was removed by someone else" (which would leave the stale
    "please attach" text in place forever)."""
    bot, store, clients = make_bot(tmp_path, queue=[missing(), complete()])
    client = clients[REPO]
    client.add_issue(60, "Crash", "body", "reporter", created_at=now_iso())

    bot.run_once()
    client.add_comment(60, "reporter", "Here's the zip.")
    client.update_comment = _failing(client.update_comment, times=1)

    bot.run_once()  # update_comment fails: nothing on GitHub changes yet
    entry = store.load().issues[f"{REPO}#60"]
    assert entry.completing is True
    assert entry.resolved is False
    assert client.removed_labels == []  # never attempted before the comment succeeded

    bot.run_once()  # retried: completes both steps now

    assert client.removed_labels == [(60, "needs-info")]
    bot_comment_id = store.load().issues[f"{REPO}#60"].bot_comment_id
    final_body = next(c.body for c in client.comments[60] if c.id == bot_comment_id)
    assert "complete" in final_body.lower()
    entry = store.load().issues[f"{REPO}#60"]
    assert entry.resolved is True
    assert entry.completing is False
    assert entry.label_applied is False


def test_recheck_when_reporter_edits_body(tmp_path):
    calls = []
    bot, store, clients = make_bot(tmp_path, queue=[missing(), complete()], calls=calls)
    client = clients[REPO]
    client.add_issue(12, "Crash", "body", "reporter", created_at=now_iso())

    bot.run_once()
    client.edit_body(12, "body, now with https://github.com/user-attachments/files/1/debug.zip")
    bot.run_once()

    assert len(calls) == 2
    assert "debug.zip" in calls[1]["body"]
    assert store.load().issues[f"{REPO}#12"].resolved is True


def test_third_party_activity_does_not_call_claude(tmp_path):
    calls = []
    bot, store, clients = make_bot(tmp_path, queue=[missing()], calls=calls)
    client = clients[REPO]
    client.add_issue(13, "Crash", "body", "reporter", created_at=now_iso())

    bot.run_once()
    client.add_comment(13, "someone-else", "+1, same here")
    bot.run_once()
    client.touch(13)  # e.g. a maintainer adding another label
    bot.run_once()

    assert len(calls) == 1
    issue_state = store.load().issues[f"{REPO}#13"]
    assert issue_state.resolved is False
    assert issue_state.updated_at_seen == client.issues[13]["updated_at"]


def test_recheck_stops_when_maintainer_comments(tmp_path):
    calls = []
    bot, store, clients = make_bot(tmp_path, queue=[missing()], calls=calls)
    client = clients[REPO]
    client.add_issue(14, "Crash", "body", "reporter14", created_at=now_iso())

    bot.run_once()
    client.add_comment(14, "theotherp", "I'll look into this directly.")
    client.add_comment(14, "reporter14", "Thanks!")
    bot.run_once()

    assert len(calls) == 1  # no re-assessment triggered
    assert store.load().issues[f"{REPO}#14"].resolved is True


def test_recheck_stops_when_label_removed_by_someone_else(tmp_path):
    calls = []
    bot, store, clients = make_bot(tmp_path, queue=[missing()], calls=calls)
    client = clients[REPO]
    client.add_issue(15, "Crash", "body", "reporter15", created_at=now_iso())

    bot.run_once()
    client.remove_label(15, "needs-info")
    client.add_comment(15, "reporter15", "Update on this.")
    bot.run_once()

    assert len(calls) == 1  # no re-assessment triggered
    assert store.load().issues[f"{REPO}#15"].resolved is True


def test_label_comparison_is_case_insensitive(tmp_path):
    calls = []
    bot, store, clients = make_bot(tmp_path, queue=[missing(), missing()], calls=calls)
    client = clients[REPO]
    client.add_issue(16, "Crash", "body", "reporter", created_at=now_iso())

    bot.run_once()
    client.issues[16]["labels"] = [{"name": "Needs-Info"}]
    client.add_comment(16, "reporter", "More info")
    bot.run_once()

    assert len(calls) == 2
    assert store.load().issues[f"{REPO}#16"].resolved is False


def test_bots_own_comment_does_not_retrigger_assessment(tmp_path):
    calls = []
    bot, store, clients = make_bot(tmp_path, queue=[missing()], calls=calls)
    client = clients[REPO]
    client.add_issue(17, "Crash", "body", "reporter17", created_at=now_iso())

    bot.run_once()
    bot.run_once()
    bot.run_once()

    assert len(calls) == 1
    assert len(client.created_comments) == 1


def test_closed_issue_stops_tracking(tmp_path):
    clock = FakeClock()
    bot, store, clients = make_bot(tmp_path, queue=[missing()], clock=clock)
    client = clients[REPO]
    client.add_issue(18, "Crash", "body", "reporter", created_at=clock.iso())
    client.add_label = _failing(client.add_label, times=1)

    bot.run_once()  # label fails, so the issue is retried via get_issue
    client.close_issue(18)
    clock.advance(hours=1)
    bot.run_once()

    assert store.load().issues[f"{REPO}#18"].resolved is True


def test_resolved_issue_is_never_re_evaluated_even_much_later(tmp_path):
    clock = FakeClock()
    calls = []
    bot, store, clients = make_bot(tmp_path, queue=[make_assessment(is_bug=False)], calls=calls, clock=clock)
    client = clients[REPO]
    client.add_issue(19, "Question", "body", "reporter", created_at=clock.iso())

    bot.run_once()
    clock.advance(days=120)
    client.add_comment(19, "reporter", "Any news?")
    bot.run_once()

    assert len(calls) == 1
    state = store.load()
    assert state.issues[f"{REPO}#19"].resolved is True


# ---------------------------------------------------------------------------
# Duplicate comment prevention and marker handling
# ---------------------------------------------------------------------------

def _failing(func, times, exc=RuntimeError("GitHub 502")):
    remaining = [times]

    def wrapper(*args, **kwargs):
        if remaining[0] > 0:
            remaining[0] -= 1
            raise exc
        return func(*args, **kwargs)

    return wrapper


def test_label_failure_is_retried_without_second_comment(tmp_path):
    calls = []
    bot, store, clients = make_bot(tmp_path, queue=[missing()], calls=calls)
    client = clients[REPO]
    client.add_issue(20, "Crash", "body", "reporter", created_at=now_iso())
    real_add_label = client.add_label
    saved_before_label = []

    def add_label(number, label):
        # The comment id must already be on disk when the label is attempted.
        saved_before_label.append(store.load().issues[f"{REPO}#20"].bot_comment_id)
        return real_add_label(number, label)

    client.add_label = _failing(add_label, times=1)

    bot.run_once()
    entry = store.load().issues[f"{REPO}#20"]
    assert entry.label_applied is False
    assert entry.error_count == 1
    assert entry.bot_comment_id is not None

    bot.run_once()

    assert len(client.created_comments) == 1
    assert client.added_labels == [(20, "needs-info")]
    assert len(calls) == 1
    entry = store.load().issues[f"{REPO}#20"]
    assert entry.label_applied is True
    assert entry.error_count == 0
    assert saved_before_label == [entry.bot_comment_id]


def test_existing_bot_comment_is_adopted_after_lost_state(tmp_path):
    bot, store, clients = make_bot(tmp_path, queue=[missing(comment="New text")])
    client = clients[REPO]
    client.add_issue(21, "Crash", "body", "reporter", created_at=now_iso())
    # Posted by an earlier run whose state never made it to disk.
    old = client.add_comment(21, BOT_LOGIN, f"Old text\n\n{MARKER}", author_type="Bot")

    bot.run_once()

    assert client.created_comments == []
    assert client.updated_comments[0][0] == old.id
    assert "New text" in client.updated_comments[0][1]
    entry = store.load().issues[f"{REPO}#21"]
    assert entry.bot_comment_id == old.id
    assert client.added_labels == [(21, "needs-info")]


def test_marker_comment_from_a_different_app_is_not_adopted(tmp_path):
    """Only a comment authored by this exact App's login is trusted as ours:
    otherwise any other GitHub App could paste our marker into a comment and
    have it silently adopted (and then edited by us) as if it were ours."""
    bot, store, clients = make_bot(tmp_path, queue=[missing(comment="New text")])
    client = clients[REPO]
    client.add_issue(61, "Crash", "body", "reporter", created_at=now_iso())
    impostor = client.add_comment(61, "some-other-app[bot]", f"Old text\n\n{MARKER}", author_type="Bot")

    bot.run_once()

    assert len(client.created_comments) == 1  # posts its own instead of adopting
    assert client.updated_comments == []
    entry = store.load().issues[f"{REPO}#61"]
    assert entry.bot_comment_id != impostor.id


def test_restart_after_failure_before_label_does_not_comment_twice(tmp_path):
    bot, store, clients = make_bot(tmp_path, queue=[missing()])
    client = clients[REPO]
    client.add_issue(22, "Crash", "body", "reporter", created_at=now_iso())
    client.add_label = _failing(client.add_label, times=1)

    bot.run_once()
    entry = store.load().issues[f"{REPO}#22"]
    assert entry.label_applied is False
    assert entry.error_count == 1
    assert entry.bot_comment_id is not None

    # A fresh TicketBot instance, as after a real process restart, resuming
    # from the state the failed instance left on disk.
    calls = []
    restarted, _, _ = make_bot(tmp_path, queue=[missing()], calls=calls, clients=clients)
    restarted.run_once()

    assert len(client.created_comments) == 1
    assert client.added_labels == [(22, "needs-info")]
    assert store.load().issues[f"{REPO}#22"].label_applied is True


def test_sigkill_right_after_create_comment_does_not_double_post(tmp_path):
    """The state save that records bot_comment_id happens right after
    create_comment returns; if the process is killed in that exact gap, the
    on-disk state is left one step behind (comment posted, id not yet saved).
    A restart from that stale state must still recognize its own comment via
    the marker and not post a second one."""
    bot, store, clients = make_bot(tmp_path, queue=[missing()])
    client = clients[REPO]
    client.add_issue(62, "Crash", "b", "rep", created_at=now_iso())
    real_create_comment = client.create_comment
    stale_state_path = None

    def create_comment_then_snapshot(number, body):
        result = real_create_comment(number, body)
        # Capture the on-disk state exactly as it was when create_comment
        # returned, i.e. before the bot has had a chance to save.
        nonlocal stale_state_path
        if store.path.exists():
            stale_state_path = store.path.read_text()
        return result

    client.create_comment = create_comment_then_snapshot

    bot.run_once()
    assert stale_state_path is not None
    store.path.write_text(stale_state_path)  # simulate the kill: revert to the stale snapshot

    restarted, _, _ = make_bot(tmp_path, queue=[missing()], clients=clients)
    restarted.run_once()

    assert len(client.created_comments) == 1


def test_reporter_pasting_marker_is_not_treated_as_bot_comment(tmp_path):
    calls = []
    bot, store, clients = make_bot(tmp_path, queue=[missing(), missing()], calls=calls)
    client = clients[REPO]
    client.add_issue(23, "Crash", "body", "reporter", created_at=now_iso())
    client.add_comment(23, "reporter", f"Some details {MARKER}")

    bot.run_once()
    # Not adopted as the bot's comment: the bot posts its own.
    assert len(client.created_comments) == 1
    assert calls[0]["follow_up_comments"] == [f"Some details {MARKER}"]

    client.add_comment(23, "reporter", f"More details {MARKER}")
    bot.run_once()

    assert len(calls) == 2
    assert calls[1]["follow_up_comments"] == [f"Some details {MARKER}", f"More details {MARKER}"]


def test_maintainer_comment_with_marker_still_stops_tracking(tmp_path):
    calls = []
    bot, store, clients = make_bot(tmp_path, queue=[missing()], calls=calls)
    client = clients[REPO]
    client.add_issue(24, "Crash", "body", "reporter", created_at=now_iso())

    bot.run_once()
    client.add_comment(24, "theotherp", f"> quoting the bot {MARKER}\nI'll handle this")
    bot.run_once()

    assert store.load().issues[f"{REPO}#24"].resolved is True


# ---------------------------------------------------------------------------
# Comment sanitization
# ---------------------------------------------------------------------------

def test_posted_comment_is_sanitized(tmp_path):
    comment = "Thanks @someone! See [this](https://evil.example/x) and https://github.com/theotherp/nzbhydra2/wiki"
    bot, store, clients = make_bot(tmp_path, queue=[missing(comment=comment)])
    client = clients[REPO]
    client.add_issue(25, "Crash", "body", "reporter", created_at=now_iso())

    bot.run_once()

    body = client.created_comments[0][1]
    assert "@someone" not in body
    assert "evil.example" not in body
    assert "See this and https://github.com/theotherp/nzbhydra2/wiki" in body


def test_empty_comment_uses_fallback_template(tmp_path):
    bot, store, clients = make_bot(tmp_path, queue=[missing(comment="", missing_information=["NZBHydra2 version"])])
    client = clients[REPO]
    client.add_issue(26, "Crash", "body", "reporter", created_at=now_iso())

    bot.run_once()

    body = client.created_comments[0][1]
    assert "- NZBHydra2 version" in body
    assert "http://127.0.0.1:5076/system/bugreport" in body


# ---------------------------------------------------------------------------
# dry-run
# ---------------------------------------------------------------------------

def test_dry_run_makes_no_github_writes_and_does_not_persist_state(tmp_path):
    calls = []
    bot, store, clients = make_bot(tmp_path, dry_run=True, start_at=None, queue=[missing()], calls=calls)
    client = clients[REPO]
    client.add_issue(30, "Crash", "body", "reporter30", created_at="2999-01-01T00:00:00Z")

    bot.run_once()
    bot.run_once()

    assert len(calls) == 1  # assessed once, remembered in memory
    assert client.created_comments == []
    assert client.added_labels == []
    assert not (tmp_path / "state.json").exists()


def test_dry_run_leaves_existing_state_file_untouched(tmp_path):
    state_file = tmp_path / "state.json"
    state_file.write_text(json.dumps({"repos": {REPO: {"last_poll": None, "start_at": "2000-01-01T00:00:00Z"}}}))
    before = state_file.read_text()
    bot, store, clients = make_bot(tmp_path, dry_run=True, queue=[missing()])
    clients[REPO].add_issue(31, "Crash", "body", "reporter", created_at=now_iso())

    bot.run_once()

    assert state_file.read_text() == before


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------

def test_error_retries_outside_since_window_and_gives_up_after_three_attempts(tmp_path):
    clock = FakeClock()
    attempts = []

    def always_fails(*args, **kwargs):
        attempts.append(1)
        raise AssessmentError("simulated Claude failure")

    bot, store, clients = make_bot(tmp_path, assess_fn=always_fails, clock=clock)
    client = clients[REPO]
    client.add_issue(40, "Crash", "body", "reporter40", created_at=clock.iso())

    for expected in (1, 2, 3):
        clock.advance(hours=1)  # the issue is long out of the `since` window after the first cycle
        bot.run_once()
        entry = store.load().issues[f"{REPO}#40"]
        assert entry.error_count == expected
        assert entry.resolved is (expected == 3)
    assert len(attempts) == 3
    assert client.get_issue_calls == [40, 40]  # retries fetched the issue directly

    clock.advance(hours=1)
    bot.run_once()
    assert len(attempts) == 3  # given up
    assert client.created_comments == []


def test_retry_stops_tracking_an_issue_transferred_to_another_repo(tmp_path):
    """A number retried via get_issue can silently resolve to a different
    issue once the original was transferred elsewhere and the number reused.
    repository_url is how the response says which repo actually answered."""
    clock = FakeClock()
    calls = []
    bot, store, clients = make_bot(tmp_path, queue=[missing()], calls=calls, clock=clock)
    client = clients[REPO]
    client.add_issue(71, "Crash", "body", "reporter", created_at=clock.iso())
    client.list_comments = _failing(client.list_comments, times=1)

    clock.advance(hours=1)
    bot.run_once()  # found via list_issues; list_comments fails, entry created with an error
    assert store.load().issues[f"{REPO}#71"].error_count == 1

    # Now out of the `since` window, so the next cycle retries it via get_issue.
    real_get_issue = client.get_issue

    def moved_get_issue(number):
        issue = real_get_issue(number)
        issue["repository_url"] = "https://api.github.com/repos/someone/else"
        return issue

    client.get_issue = moved_get_issue
    clock.advance(hours=1)
    bot.run_once()

    assert calls == []  # never assessed
    entry = store.load().issues[f"{REPO}#71"]
    assert entry.resolved is True
    assert client.created_comments == []


def test_unexpected_errors_count_towards_the_cap(tmp_path):
    bot, store, clients = make_bot(tmp_path, queue=[missing()] * 3)
    client = clients[REPO]
    client.add_issue(41, "Crash", "body", "reporter", created_at=now_iso())
    client.create_comment = _failing(client.create_comment, times=10, exc=ValueError("boom"))

    for _ in range(4):
        bot.run_once()

    entry = store.load().issues[f"{REPO}#41"]
    assert entry.error_count == 3
    assert entry.resolved is True
    assert entry.bot_comment_id is None


def test_github_error_before_assessment_creates_entry_and_is_retried(tmp_path):
    calls = []
    bot, store, clients = make_bot(tmp_path, queue=[missing()], calls=calls)
    client = clients[REPO]
    client.add_issue(42, "Crash", "body", "reporter", created_at=now_iso())
    client.list_comments = _failing(client.list_comments, times=1)

    bot.run_once()
    assert store.load().issues[f"{REPO}#42"].error_count == 1

    bot.run_once()
    assert len(calls) == 1
    assert len(client.created_comments) == 1
    assert store.load().issues[f"{REPO}#42"].error_count == 0


def test_fatal_error_aborts_cycle_without_counting_against_issues(tmp_path):
    attempts = []

    def fatal(*args, **kwargs):
        attempts.append(args[2])
        raise FatalAssessmentError("invalid x-api-key")

    bot, store, clients = make_bot(tmp_path, repos=[REPO, OTHER_REPO], assess_fn=fatal)
    clients[REPO].add_issue(43, "First", "body", "reporter", created_at=now_iso())
    clients[REPO].add_issue(44, "Second", "body", "reporter", created_at=now_iso())
    clients[OTHER_REPO].add_issue(1, "Other", "body", "reporter", created_at=now_iso())

    bot.run_once()

    assert attempts == ["First"]  # rest of the cycle aborted, other repo not polled
    state = store.load()
    assert state.issues[f"{REPO}#43"].error_count == 0
    assert state.issues[f"{REPO}#43"].resolved is False
    assert state.repos[REPO].last_poll is None  # not advanced, so nothing is lost
    assert clients[OTHER_REPO].list_issues_calls == []

    bot._assess_fn = fake_assess_fn([complete(), complete(), complete()])
    bot.run_once()
    state = store.load()
    assert all(state.issues[k].resolved for k in (f"{REPO}#43", f"{REPO}#44", f"{OTHER_REPO}#1"))


# ---------------------------------------------------------------------------
# Multiple repos
# ---------------------------------------------------------------------------

def test_two_repos_are_polled_independently(tmp_path):
    queue = [missing(comment="Please attach the ZIP (repo A)."), make_assessment(is_bug=False)]
    bot, store, clients = make_bot(tmp_path, repos=[REPO, OTHER_REPO], queue=queue)
    client_a = clients[REPO]
    client_b = clients[OTHER_REPO]
    client_a.add_issue(1, "Crash in A", "body", "reporterA", created_at=now_iso())
    client_b.add_issue(1, "Question in B", "body", "reporterB", created_at=now_iso())

    bot.run_once()

    assert len(client_a.created_comments) == 1
    assert client_b.created_comments == []
    assert client_a.added_labels == [(1, "needs-info")]
    assert client_b.added_labels == []

    state = store.load()
    assert state.issues[f"{REPO}#1"].missing_info is True
    assert state.issues[f"{OTHER_REPO}#1"].resolved is True
    assert state.repos[REPO].last_poll is not None
    assert state.repos[OTHER_REPO].last_poll is not None


def test_since_is_sent_in_github_format(tmp_path):
    clock = FakeClock(datetime(2026, 5, 1, 12, 0, 0, 123456, tzinfo=timezone.utc))
    bot, store, clients = make_bot(tmp_path, clock=clock)

    bot.run_once()
    clock.advance(minutes=10)
    bot.run_once()

    assert clients[REPO].list_issues_calls[1] == "2026-05-01T11:55:00Z"
    assert all(re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ", s) for s in clients[REPO].list_issues_calls)


def test_is_after_compares_datetimes_not_strings():
    # As strings "Z" sorts after "+", but these are the same instant.
    assert is_after("2026-01-01T00:00:00Z", "2026-01-01T00:00:00+00:00") is False
    assert is_after("2026-01-01T01:00:00+01:00", "2026-01-01T00:00:00Z") is False
    assert is_after("2026-01-01T00:00:01Z", "2026-01-01T00:00:00.500000+00:00") is True
    assert is_after("2026-01-01T00:00:00Z", None) is True


# ---------------------------------------------------------------------------
# --issue
# ---------------------------------------------------------------------------

def test_evaluate_single_issue_never_writes(tmp_path, capsys):
    bot, store, clients = make_bot(tmp_path, queue=[missing(comment="Need @you to attach it")])
    client = clients[REPO]
    client.add_issue(50, "Crash", "body", "reporter", created_at=now_iso())

    bot.evaluate_single_issue(REPO, 50)

    out = capsys.readouterr().out
    assert "Need @\u200dyou to attach it" in out
    assert client.created_comments == []
    assert client.added_labels == []
    assert not (tmp_path / "state.json").exists()


def test_parse_issue_arg_plain_number_uses_default_repo():
    repo, number = parse_issue_arg("42", "theotherp/nzbhydra2")
    assert repo == "theotherp/nzbhydra2"
    assert number == 42


def test_parse_issue_arg_owner_repo_hash_number():
    repo, number = parse_issue_arg("theotherp/apitests#7", "theotherp/nzbhydra2")
    assert repo == "theotherp/apitests"
    assert number == 7
