"""CLI entry point: python -m ticketbot"""
from __future__ import annotations

import argparse
import fcntl
import logging
import sys
import time
from pathlib import Path
from typing import IO

import anthropic
from dotenv import load_dotenv

from ticketbot.assessor import AssessmentError, FatalAssessmentError
from ticketbot.bot import TicketBot, parse_issue_arg
from ticketbot.config import Config, ConfigError
from ticketbot.github_app_auth import GitHubAppAuth
from ticketbot.github_client import GitHubClient
from ticketbot.state import CorruptStateError, StateStore

logger = logging.getLogger(__name__)


class AlreadyRunningError(RuntimeError):
    """Raised when another instance already holds the state-file lock."""


def acquire_lock(lock_path: str) -> IO:
    """Takes an exclusive, non-blocking lock on `lock_path` so at most one
    polling instance runs against a given state file at a time. Returns the
    open file object: keep a reference to it for as long as the lock should
    be held (closing it, or process exit, releases it). Raises
    AlreadyRunningError if another instance already holds it."""
    path = Path(lock_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_file = open(path, "w")
    try:
        fcntl.flock(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError as e:
        lock_file.close()
        raise AlreadyRunningError(
            f"Another instance is already running (could not lock {path}): {e}"
        ) from e
    return lock_file


def build_bot(config: Config, fetch_app_slug: bool = False) -> TicketBot:
    auth = GitHubAppAuth(
        app_id=config.app_id,
        private_key_path=config.private_key_file,
        installation_id=config.installation_id,
    )
    clients = {
        repo: GitHubClient(auth, repo, dry_run=config.dry_run) for repo in config.repos
    }
    # Only needed for an API key that isn't scoped to a workspace.
    default_headers = (
        {"anthropic-workspace-id": config.anthropic_workspace_id} if config.anthropic_workspace_id else None
    )
    anthropic_client = anthropic.Anthropic(
        api_key=config.anthropic_api_key, max_retries=3, default_headers=default_headers
    )
    state_store = StateStore(config.state_file)
    bot_login = None
    if fetch_app_slug:
        try:
            bot_login = f"{auth.get_app_slug()}[bot]"
        except Exception as e:
            logger.warning(
                "Could not fetch the GitHub App's slug, falling back to generic bot detection: %s", e
            )
    return TicketBot(config, clients, anthropic_client, state_store, bot_login=bot_login)


def parse_args(argv=None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="python -m ticketbot",
        description=(
            "Polls new/updated GitHub issues on the configured repos, asks Claude "
            "whether a bug report is missing required debug information, and "
            "comments/labels the issue when it is."
        ),
    )
    parser.add_argument(
        "--once", action="store_true", help="Run a single poll cycle and exit (for cron)."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Log what would be posted/labelled without writing to GitHub or the state file.",
    )
    parser.add_argument(
        "--issue",
        metavar="[OWNER/REPO#]N",
        default=None,
        help=(
            "Evaluate a single issue regardless of state/start_at/filters and print the "
            "assessment and the comment that would be posted. Read-only: never writes to "
            "GitHub or the state file, with or without --dry-run. Accepts 'owner/repo#N' "
            "(the repo must be in BOT_REPOS) or a bare 'N' (uses the first configured repo)."
        ),
    )
    return parser.parse_args(argv)


def load_env_file(path: str = ".env") -> None:
    """Loads KEY=VALUE pairs from `path` (if it exists) into the environment.
    Variables that are already set take precedence over the file."""
    load_dotenv(path, override=False)


def main(argv=None) -> int:
    args = parse_args(argv)

    try:
        config = Config.from_env()
    except ConfigError as e:
        print(f"Configuration error: {e}", file=sys.stderr)
        return 1

    if args.dry_run:
        config.dry_run = True

    logging.basicConfig(
        level=config.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )

    bot = build_bot(config, fetch_app_slug=not args.issue)

    if args.issue:
        try:
            repo, number = parse_issue_arg(args.issue, config.repos[0])
        except ValueError:
            print(f"Invalid --issue value {args.issue!r}, expected 'owner/repo#N' or 'N'.", file=sys.stderr)
            return 2
        if repo not in bot.clients:
            print(
                f"Repo {repo!r} is not in BOT_REPOS ({', '.join(config.repos)}). Add it there to evaluate its issues.",
                file=sys.stderr,
            )
            return 2
        try:
            bot.evaluate_single_issue(repo, number)
        except (AssessmentError, FatalAssessmentError) as e:
            print(f"Assessment failed: {e}", file=sys.stderr)
            return 1
        return 0

    # --issue is read-only and never touches the state file, so it needs no
    # lock. Polling writes it, so only one instance may do that at a time.
    try:
        # Held for the rest of main()'s lifetime; never read again, but must
        # not be garbage-collected (that would close it and release the lock).
        lock_file = acquire_lock(f"{config.state_file}.lock")  # noqa: F841
    except AlreadyRunningError as e:
        print(str(e), file=sys.stderr)
        logger.error(str(e))
        return 1

    for repo in config.repos:
        try:
            bot.clients[repo].ensure_label_exists(config.needs_info_label)
        except Exception as e:
            logger.warning("Could not ensure label %r exists on %s: %s", config.needs_info_label, repo, e)

    if args.once:
        try:
            bot.run_once()
        except CorruptStateError as e:
            print(f"State error: {e}", file=sys.stderr)
            return 1
        return 0

    logger.info("Starting poll loop (interval=%ss) for repos: %s", config.poll_interval, config.repos)
    while True:
        try:
            bot.run_once()
        except CorruptStateError as e:
            print(f"State error: {e}", file=sys.stderr)
            logger.error(str(e))
            return 1
        time.sleep(config.poll_interval)


if __name__ == "__main__":
    # Only for real CLI runs, so tests never pick up a developer's .env.
    load_env_file()
    sys.exit(main())
