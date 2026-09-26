"""Orchestrates polling, assessment, and GitHub actions.

Kept independent of the concrete GitHub/Anthropic SDK clients so it can be
tested with fakes: GitHubClient only needs to expose the methods used below
(list_issues, get_issue, list_comments, create_comment, update_comment,
add_label, remove_label), and the "anthropic client" is only passed through
to assess_fn (ticketbot.assessor.assess by default).

Per issue the bot posts at most one comment, ever: before posting it looks for
an existing comment of its own, and the comment id is saved as soon as the
comment exists. Adding the label is a separate step that is retried on its own.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Callable, Dict, List, Optional

from ticketbot.assessor import Assessment, FatalAssessmentError, assess as default_assess
from ticketbot.comment_text import COMPLETE_MESSAGE, MARKER, build_comment_text, format_comment
from ticketbot.config import Config
from ticketbot.github_client import Comment, GitHubClient
from ticketbot.state import BotState, IssueState, RepoState, StateStore, issue_key

logger = logging.getLogger(__name__)

MAX_ERROR_ATTEMPTS = 3
RECENT_ISSUES_OVERLAP = timedelta(minutes=5)
GITHUB_SINCE_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return utc_now().isoformat()


def parse_ts(value: str) -> datetime:
    """Parses GitHub ("...Z") and our own isoformat() timestamps as aware datetimes."""
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def is_after(value: Optional[str], reference: Optional[str]) -> bool:
    """True if timestamp `value` is later than `reference` (or reference is unknown)."""
    if reference is None:
        return True
    if value is None:
        return False
    return parse_ts(value) > parse_ts(reference)


def body_hash(body: Optional[str]) -> str:
    return hashlib.sha256((body or "").encode("utf-8")).hexdigest()


def is_bot_user(comment: Comment, bot_login: Optional[str] = None) -> bool:
    """If we know our own App's login (owner-slug + "[bot]"), only that exact
    login counts: otherwise any other GitHub App could paste our marker and
    have its comment adopted as ours. Without a known login (e.g. --issue
    mode, or an older caller) this falls back to the generic bot heuristic."""
    if bot_login:
        return comment.user_login.lower() == bot_login.lower()
    return comment.user_login.lower().endswith("[bot]") or comment.user_type == "Bot"


def is_own_comment(comment: Comment, bot_comment_id: Optional[int] = None, bot_login: Optional[str] = None) -> bool:
    """The marker alone isn't trusted: anyone (or any other App) can paste it
    into a comment."""
    if bot_comment_id is not None and comment.id == bot_comment_id:
        return True
    return is_bot_user(comment, bot_login) and MARKER in (comment.body or "")


def parse_issue_arg(value: str, default_repo: str) -> "tuple[str, int]":
    """Parses '--issue' values: either 'owner/repo#N' or a bare 'N'."""
    if "#" in value:
        repo, number_str = value.rsplit("#", 1)
        return repo, int(number_str)
    return default_repo, int(value)


def label_names(issue: dict) -> List[str]:
    return [label["name"] for label in issue.get("labels", [])]


class TicketBot:
    def __init__(
        self,
        config: Config,
        clients: Dict[str, GitHubClient],
        anthropic_client,
        state_store: StateStore,
        model: Optional[str] = None,
        assess_fn: Callable = default_assess,
        now_func: Callable[[], datetime] = utc_now,
        bot_login: Optional[str] = None,
    ) -> None:
        self.config = config
        self.clients = clients
        self.anthropic_client = anthropic_client
        self.state_store = state_store
        self.model = model or config.model
        self._assess_fn = assess_fn
        self._now = now_func
        # This App's own login ("<slug>[bot]"), used to tell our comments
        # apart from any other bot's. None until fetched (see __main__.build_bot).
        self.bot_login = bot_login
        # In dry-run the state lives only in memory, loaded once from disk.
        self._dry_run_state: Optional[BotState] = None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _call_assess(
        self,
        title: str,
        author: str,
        labels: List[str],
        body: str,
        follow_up_comments: Optional[List[str]] = None,
    ) -> Assessment:
        return self._assess_fn(
            self.anthropic_client,
            self.model,
            title,
            author,
            labels,
            body,
            follow_up_comments=follow_up_comments,
        )

    @staticmethod
    def _is_missing(assessment: Assessment) -> bool:
        if not assessment.is_bug:
            return False
        return bool(
            (assessment.debug_infos_needed and not assessment.debug_infos_attached)
            or assessment.missing_information
        )

    def _now_iso(self) -> str:
        return self._now().isoformat()

    def _load_state(self) -> BotState:
        if not self.config.dry_run:
            return self.state_store.load()
        if self._dry_run_state is None:
            self._dry_run_state = self.state_store.load()
        return self._dry_run_state

    def _save(self, state: BotState) -> None:
        if not self.config.dry_run:
            self.state_store.save(state)

    def _repo_state(self, state: BotState, repo: str, true_first_run: bool = False) -> RepoState:
        """`true_first_run` is whether the bot has never watched *any* repo
        before this poll cycle (a fresh state file). BOT_START_AT only ever
        applies then: a repo that shows up later - added to BOT_REPOS while
        the state file already tracks others - gets max(BOT_START_AT, now),
        so its backlog is skipped just like a repo seen for the very first
        time with no BOT_START_AT configured."""
        repo_state = state.repos.get(repo)
        if repo_state is None:
            repo_state = RepoState()
            state.repos[repo] = repo_state
        if not repo_state.start_at:
            now = self._now()
            if true_first_run:
                start_at = self.config.start_at or now
            elif self.config.start_at:
                start_at = max(self.config.start_at, now)
            else:
                start_at = now
            repo_state.start_at = start_at.isoformat()
            logger.info("Watching %s from %s on; older issues are never processed", repo, repo_state.start_at)
            self._save(state)
        return repo_state

    def _is_maintainer(self, login: str) -> bool:
        return login.lower() in self.config.ignore_users

    def _has_needs_info_label(self, issue: dict) -> bool:
        wanted = self.config.needs_info_label.lower()
        return any(name.lower() == wanted for name in label_names(issue))

    def _reporter_comments(self, issue: dict, comments: List[Comment], bot_comment_id: Optional[int]) -> List[Comment]:
        reporter = issue["user"]["login"].lower()
        return sorted(
            (
                c
                for c in comments
                if c.user_login.lower() == reporter and not is_own_comment(c, bot_comment_id, self.bot_login)
            ),
            key=lambda c: parse_ts(c.created_at),
        )

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------
    def run_once(self) -> None:
        state = self._load_state()
        # Whether no repo has ever completed a full poll cycle yet - the only
        # case where BOT_START_AT itself (rather than "now") applies. Checked
        # via last_poll rather than state.repos being empty so that a cycle
        # aborted by a FatalAssessmentError before reaching every repo (which
        # leaves start_at set but last_poll unset for whichever repos it
        # didn't get to) still counts as part of the same first run, not as
        # "repos added later".
        true_first_run = not any(repo_state.last_poll for repo_state in state.repos.values())
        try:
            for repo, client in self.clients.items():
                try:
                    self._poll_repo(repo, client, state, true_first_run)
                except FatalAssessmentError:
                    raise
                except Exception:
                    logger.exception("Unexpected error polling repo %s", repo)
        except FatalAssessmentError as e:
            logger.error("Aborting this poll cycle, Anthropic is unavailable or rejected the request: %s", e)
        finally:
            self._save(state)

    def _poll_repo(self, repo: str, client: GitHubClient, state: BotState, true_first_run: bool = False) -> None:
        repo_state = self._repo_state(state, repo, true_first_run)
        if repo_state.last_poll:
            since = parse_ts(repo_state.last_poll) - RECENT_ISSUES_OVERLAP
        else:
            # Nothing created before start_at is processed, so nothing updated before it matters.
            since = parse_ts(repo_state.start_at)

        cycle_started_at = self._now_iso()
        processed = set()
        for issue in client.list_issues(since=since.astimezone(timezone.utc).strftime(GITHUB_SINCE_FORMAT)):
            processed.add(issue["number"])
            self._process_issue_safely(repo, client, issue, state)

        # Retry failed or unfinished work even if the issue fell out of the `since` window.
        for entry in list(state.issues.values()):
            if entry.repo != repo or entry.number in processed or not self._needs_retry(entry):
                continue
            try:
                issue = client.get_issue(entry.number)
            except Exception:
                logger.exception("Error fetching %s#%s for a retry", repo, entry.number)
                self._record_error(state, repo, entry.number, None)
                self._save(state)
                continue
            if not self._issue_matches_entry(issue, repo, entry.number):
                logger.warning(
                    "%s#%s now resolves to a different issue (likely transferred to another repo); "
                    "no longer tracking it",
                    repo,
                    entry.number,
                )
                entry.resolved = True
                self._save(state)
                continue
            self._process_issue_safely(repo, client, issue, state)

        repo_state.last_poll = cycle_started_at

    @staticmethod
    def _issue_matches_entry(issue: dict, repo: str, number: int) -> bool:
        """A number fetched via get_issue can silently resolve to a different
        issue once the original one was transferred to another repository:
        the number gets reused there. repository_url is GitHub's own way to
        tell us which repo actually answered."""
        if issue.get("number") != number:
            return False
        repository_url = (issue.get("repository_url") or "").rstrip("/")
        return repository_url.lower().endswith(f"/repos/{repo}".lower())

    @staticmethod
    def _needs_retry(entry: IssueState) -> bool:
        if entry.resolved:
            return False
        return entry.is_bug is None or entry.error_count > 0 or not entry.label_applied

    # ------------------------------------------------------------------
    # Per-issue processing
    # ------------------------------------------------------------------
    def _process_issue_safely(self, repo: str, client: GitHubClient, issue: dict, state: BotState) -> None:
        number = issue.get("number")
        key = issue_key(repo, number)
        before = state.issues[key].to_dict() if key in state.issues else None
        try:
            self._process_issue(repo, client, issue, state)
        except FatalAssessmentError:
            self._save(state)
            raise
        except Exception:
            logger.exception("Error processing %s", key)
            self._record_error(state, repo, number, issue)
        entry = state.issues.get(key)
        if entry is not None and entry.to_dict() != before:
            self._save(state)

    def _record_error(self, state: BotState, repo: str, number: int, issue: Optional[dict]) -> None:
        key = issue_key(repo, number)
        entry = state.issues.get(key)
        if entry is None:
            entry = IssueState(repo=repo, number=number, created_at=(issue or {}).get("created_at"))
            state.issues[key] = entry
        entry.error_count += 1
        entry.last_checked = self._now_iso()
        if entry.error_count >= MAX_ERROR_ATTEMPTS:
            logger.warning("Giving up on %s after %d failed attempts", key, entry.error_count)
            entry.resolved = True

    def _should_skip_new(self, issue: dict, repo_state: RepoState) -> bool:
        author = issue["user"]["login"]
        skip_labels = [s.lower() for s in self.config.skip_labels]

        if repo_state.start_at and parse_ts(issue["created_at"]) < parse_ts(repo_state.start_at):
            return True
        if self._is_maintainer(author):
            return True
        if issue["user"].get("type", "User") == "Bot":
            return True
        if any(label.lower() in skip_labels for label in label_names(issue)):
            return True
        return False

    def _process_issue(self, repo: str, client: GitHubClient, issue: dict, state: BotState) -> None:
        number = issue["number"]
        key = issue_key(repo, number)
        entry = state.issues.get(key)

        if entry is None:
            if self._should_skip_new(issue, self._repo_state(state, repo)):
                return
            entry = IssueState(repo=repo, number=number, created_at=issue["created_at"])
            state.issues[key] = entry

        if entry.resolved:
            return

        if issue.get("state", "open") != "open":
            logger.info("%s was closed, no longer tracking it", key)
            entry.resolved = True
            entry.last_checked = self._now_iso()
            return

        assessed = entry.is_bug is not None
        nothing_pending = entry.error_count == 0 and entry.label_applied
        if assessed and nothing_pending and not is_after(issue["updated_at"], entry.updated_at_seen):
            return

        comments = client.list_comments(number)

        if any(
            self._is_maintainer(c.user_login) and not is_own_comment(c, entry.bot_comment_id, self.bot_login)
            for c in comments
        ):
            logger.info("A maintainer commented on %s, no longer tracking it", key)
            entry.resolved = True
        elif not assessed:
            self._assess_and_act(repo, client, issue, comments, entry, state)
        else:
            self._recheck(repo, client, issue, comments, entry, state)

        entry.updated_at_seen = issue["updated_at"]
        entry.error_count = 0
        entry.last_checked = self._now_iso()

    def _recheck(
        self, repo: str, client: GitHubClient, issue: dict, comments: List[Comment], entry: IssueState, state: BotState
    ) -> None:
        key = issue_key(repo, entry.number)
        if entry.completing:
            # A previous attempt at completion (comment updated, label
            # removed) failed partway through; finish it rather than reading
            # GitHub's current label state, which would otherwise look
            # identical to "a maintainer removed the label themselves".
            logger.info("Resuming an interrupted completion of %s", key)
            self._complete(client, entry)
            entry.resolved = True
            return
        if not entry.label_applied:
            self._apply_label(client, entry)
        elif not self._has_needs_info_label(issue):
            logger.info("Label %r was removed from %s, no longer tracking it", self.config.needs_info_label, key)
            entry.resolved = True
            return

        current_hash = body_hash(issue.get("body"))
        if entry.body_hash is None:  # entry from an older state file
            entry.body_hash = current_hash
        body_changed = entry.body_hash != current_hash
        reporter_comments = self._reporter_comments(issue, comments, entry.bot_comment_id)
        new_reporter_comment = bool(reporter_comments) and is_after(
            reporter_comments[-1].created_at, entry.last_reporter_comment_at
        )
        if body_changed or new_reporter_comment:
            logger.info("Reporter activity on %s, re-assessing", key)
            self._assess_and_act(repo, client, issue, comments, entry, state)

    def _assess_and_act(
        self, repo: str, client: GitHubClient, issue: dict, comments: List[Comment], entry: IssueState, state: BotState
    ) -> None:
        key = issue_key(repo, entry.number)
        reporter_comments = self._reporter_comments(issue, comments, entry.bot_comment_id)
        assessment = self._call_assess(
            issue["title"],
            issue["user"]["login"],
            label_names(issue),
            issue.get("body") or "",
            follow_up_comments=[c.body for c in reporter_comments] or None,
        )
        missing = self._is_missing(assessment)
        logger.info("%s assessed: is_bug=%s missing=%s (%s)", key, assessment.is_bug, missing, assessment.reasoning)

        if missing:
            text = format_comment(build_comment_text(assessment.comment, assessment.missing_information, repo))
            if entry.bot_comment_id is None:
                self._post_first_comment(client, comments, entry, text, state)
            else:
                client.update_comment(entry.bot_comment_id, text)
        elif entry.bot_comment_id is not None:
            entry.completing = True
            self._save(state)
            self._complete(client, entry)

        # Only recorded once GitHub is up to date, so a failure above is retried.
        entry.is_bug = assessment.is_bug
        entry.missing_info = missing
        entry.resolved = not missing
        entry.body_hash = body_hash(issue.get("body"))
        entry.last_reporter_comment_at = reporter_comments[-1].created_at if reporter_comments else None

        if missing and not entry.label_applied:
            self._save(state)
            self._apply_label(client, entry)

    def _post_first_comment(
        self, client: GitHubClient, comments: List[Comment], entry: IssueState, text: str, state: BotState
    ) -> None:
        existing = next((c for c in comments if is_bot_user(c, self.bot_login) and MARKER in (c.body or "")), None)
        if existing is not None:
            logger.info("Found an earlier bot comment %s on %s#%s, reusing it", existing.id, entry.repo, entry.number)
            client.update_comment(existing.id, text)
            entry.bot_comment_id = existing.id
        else:
            created = client.create_comment(entry.number, text)
            if created is None:  # dry-run
                return
            entry.bot_comment_id = created["id"]
        entry.label_applied = False
        # Persist right away: whatever fails next must never lead to a second comment.
        self._save(state)

    def _apply_label(self, client: GitHubClient, entry: IssueState) -> None:
        client.add_label(entry.number, self.config.needs_info_label)
        entry.label_applied = True

    def _complete(self, client: GitHubClient, entry: IssueState) -> None:
        """Marks an issue as complete on GitHub: the comment first (still
        correct even if the label removal below then fails and is retried),
        then the label. label_applied and completing are only cleared once
        the label removal actually succeeds, so a failure between the two
        calls is retried to completion instead of being read back as "the
        label was removed by someone else"."""
        client.update_comment(entry.bot_comment_id, format_comment(COMPLETE_MESSAGE))
        client.remove_label(entry.number, self.config.needs_info_label)
        entry.label_applied = False
        entry.completing = False

    # ------------------------------------------------------------------
    # --issue CLI support: read-only, never writes to GitHub or state.
    # ------------------------------------------------------------------
    def evaluate_single_issue(self, repo: str, number: int) -> Assessment:
        client = self.clients[repo]
        issue = client.get_issue(number)
        comments = client.list_comments(number)
        follow_ups = [c.body for c in self._reporter_comments(issue, comments, None)]

        assessment = self._call_assess(
            issue["title"],
            issue["user"]["login"],
            label_names(issue),
            issue.get("body") or "",
            follow_up_comments=follow_ups or None,
        )
        missing = self._is_missing(assessment)

        print(f"Issue: {repo}#{number} - {issue['title']}")
        print(f"is_bug={assessment.is_bug} debug_infos_attached={assessment.debug_infos_attached} "
              f"debug_infos_needed={assessment.debug_infos_needed}")
        print(f"reasoning: {assessment.reasoning}")
        print(f"missing_information: {assessment.missing_information}")
        print(f"Would post comment and add label {self.config.needs_info_label!r}: {missing}")
        if missing:
            print("--- comment ---")
            print(format_comment(build_comment_text(assessment.comment, assessment.missing_information, repo)))
        return assessment
