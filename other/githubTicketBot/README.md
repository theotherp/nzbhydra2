# githubTicketBot

A small bot that polls new and updated issues on `theotherp/nzbhydra2` (and
optionally other repos, e.g. `theotherp/apitests`), asks Claude whether an
issue is a bug report and whether the required debug information is present,
and posts a comment (plus a `needs-info` label) when it's missing. It
re-checks when the reporter edits the issue or comments again, and stops
tracking once things look complete, a maintainer weighs in, or the label is
removed by someone else.

## How it authenticates

The bot authenticates as a **GitHub App**, not a personal access token.

1. Create a GitHub App (e.g. "NZBHydra 2 Bot") under your GitHub account's
   Developer settings.
2. Give it repository permissions **Issues: Read & write** and **Metadata:
   Read-only** (the minimum needed to read issues/comments and post
   comments/labels). No webhook is needed - the bot polls - so you can leave
   the webhook inactive or deactivate it.
3. Install the App on every repo it should watch (`theotherp/nzbhydra2`,
   and any others listed in `BOT_REPOS`).
4. Generate a private key for the App (Settings -> General -> Private keys)
   and download the `.pem` file. Keep it secret; it's the App's credential.
5. Note the App ID, shown on the App's settings page.

The bot can create the `needs-info` label itself on startup (it has Issues
write access), so there's nothing to set up manually in the repo.

## Configuration

Copy `.env.example` to `.env` and fill in at least:

- `BOT_GITHUB_APP_ID` - the App ID from step 5 above.
- `BOT_GITHUB_APP_PRIVATE_KEY_FILE` - path to the `.pem` from step 4.
- `ANTHROPIC_API_KEY` - an Anthropic API key.
- `ANTHROPIC_WORKSPACE_ID` - only if the key isn't scoped to a workspace; the ID is shown in the Console's workspace settings.

Everything else has a sensible default; see `.env.example` for the full list (repos watched, model, poll interval, ignored maintainers, skip labels,
`BOT_START_AT`, dry-run, log level). If the App is installed on multiple repos
under the same account and `BOT_GITHUB_APP_INSTALLATION_ID` is left unset, the
bot discovers each repo's installation id itself (they're usually the same
installation) and caches access tokens per installation.

## Trying it out

Before running the loop, sanity-check the judge against a few real, old
tickets:

```bash
python -m ticketbot --issue 1234
python -m ticketbot --issue theotherp/apitests#12
```

This prints Claude's assessment and the comment it would post. `--issue` is
always read-only: it never writes to GitHub or the state file, with or without
`--dry-run`. The repo must be one of `BOT_REPOS`.

## Running

```bash
pip install -r requirements.txt
python -m ticketbot            # polls forever, sleeping BOT_POLL_INTERVAL seconds
python -m ticketbot --once     # a single poll cycle, e.g. for cron
python -m ticketbot --dry-run  # log what would happen, write nothing (not even state)
python -m ticketbot --issue 1234   # evaluate one issue and print the result, read-only
```

State (per repo: last poll time and `start_at`; per issue: tracking) is kept
in `BOT_STATE_FILE` (default `./state/state.json`), written atomically so a
crash mid-write can't corrupt it. It's saved after every issue that changed.
Issue entries are never deleted, so an issue is never evaluated twice once
it's resolved.

Each repo gets its own `start_at` when the bot first sees it. `BOT_START_AT`
only applies on a true first run (no repo tracked yet in the state file): a
repo added to `BOT_REPOS` later gets `max(BOT_START_AT, now)` instead, so its
backlog isn't processed either. With no `BOT_START_AT` set, both cases use
that moment. Issues created before a repo's `start_at` are never processed,
so adding a repo to `BOT_REPOS` later doesn't comment on its backlog.

At most one polling instance runs against a given `BOT_STATE_FILE` at a time:
`python -m ticketbot` and `--once` take an exclusive lock on
`<BOT_STATE_FILE>.lock` before touching GitHub or the state file, and exit
with an error if another instance already holds it. `--issue` is read-only
and doesn't need the lock.

### How an issue is handled

- New issue (not by a maintainer or a bot, no skip label): if a maintainer
  already commented, it's left alone. Otherwise Claude assesses it; if it's a
  bug with missing information the bot posts one comment and adds the label.
  It never posts a second comment: an existing comment of its own is reused.
- Re-checks happen only on reporter activity: an edited issue body or a new
  comment by the reporter. Other activity (someone else's +1, labels) doesn't
  cost a Claude call. The comment is edited in place.
- Tracking stops when the information looks complete (label removed, comment
  edited), a maintainer comments, the label is removed by someone else, or the
  issue is closed.
- Failures (Claude or GitHub) are retried on the next cycles, up to 3 times
  per issue. Account-level and transient Anthropic errors (bad key, no
  permission, invalid model, rate limits, server overload, connection
  timeouts, an exhausted credit balance) abort the cycle instead and don't
  count against any issue.
- If the state file exists but can't be read or parsed, the bot logs an error,
  copies it to `state.json.corrupt-<timestamp>` for inspection, and exits
  rather than silently starting fresh (which would forget every tracked
  issue). A missing state file is a normal first run.
- Claude's comment is sanitized before posting: @mentions are neutralized,
  links other than to `github.com/theotherp/...`, the repo wiki or
  `127.0.0.1`/`localhost` are reduced to their text, and it's capped at 3000
  characters.

### Docker

```bash
cp .env.example .env   # fill in secrets; state and key paths are set by docker-compose.yml
mkdir -p state secrets
cp /path/to/your-app-key.pem secrets/app.pem
sudo chown -R 1000:1000 state secrets/app.pem   # the container runs as uid 1000
docker compose up -d --build
```

`docker-compose.yml` mounts `./state` at `/data` for persistence and the
private key read-only at `/secrets/app.pem`. The container runs as uid 1000,
so `secrets/app.pem` must be readable and `./state` writable by uid 1000.

### systemd

See `deploy/githubticketbot.service` for an example unit using an
`EnvironmentFile`. Adjust the paths (`WorkingDirectory`, venv location,
`.env`) to your setup, then:

```bash
sudo cp deploy/githubticketbot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now githubticketbot
```

## Development

```bash
pip install -r requirements-dev.txt
pytest
```

Tests run with fakes for the GitHub and Anthropic clients - no network calls.
