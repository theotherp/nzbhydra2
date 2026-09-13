---
description: Fix one small, contained problem in a single session — no task packet, no subagents — and record it in the maintenance ledger so the FM history stays honest.
---

Requested fix: $ARGUMENTS

`$ARGUMENTS` describes the problem to fix. It may name paths, quote a failing command, or reference a `MAINTENANCE.md` candidate or a handoff's Follow-Up Work entry. With no arguments, ask what to fix rather than guessing.

Use this for work that is too small to justify a task packet: a stale locator, a formatter or config repair, a wrong path in a comment, a dead export, a one-function bug. **You do all of it yourself, in this session. Never spawn a
subagent** — a designer/implementer/reviewer chain costs more than the fix and is the reason this command exists.

## Why this exists

Small defects used to accumulate precisely because the only mechanism was a full packet. A failing `search.spec.ts` locator survived FM-044, FM-045, and FM-041: each implementer correctly reported it as out of scope and proposed a
corrective packet, and nobody ever wrote one. The same happened to a repo-wide `format:check` failure carried as inherited debt across four handoffs. When the cheapest available action costs twenty minutes of agent time, walking past
a two-line defect is the rational choice, and the debt compounds. This command makes discharging it cheaper than logging it.

Its output is still a real, gated, recorded, committed change — not an unrecorded side edit.

## Qualification gate

Decide this **before** doing any work, and state the verdict and its reasoning in your first response. If you cannot decide, it does not qualify.

Qualifies:

- Mechanically verifiable changes with no behavioral surface: locator and selector-string repairs in tests, typo and path corrections, comment and documentation fixes, formatter output, lint/ignore/config files, dead code removal, and
  mechanical renames.
- Styling, markup, or UX polish inside existing features that changes no behavior, no contract, and no `data-testid` — restyling a control, fixing spacing/labels/overlap, moving markup toward the `/core/ui-react/AGENTS.md`
  *UI Conventions* (ADR-0014). Rendering changes require the screenshot strip per `docs/frontend-migration/README.md` *Visual Gate*, referenced from the ledger entry.
- One genuinely contained bugfix: a defect whose repair is confined to a single module or function, **accompanied by a regression test that fails before the fix and passes after it**. The test is not optional and not negotiable — it is
  what makes an unreviewed behavioral change acceptable. If the fix cannot be covered by a test you can actually run here, it does not qualify.

Refuses, and hands off to `/fm-orchestrate`:

- A behavioral change spanning multiple modules, or one whose blast radius you cannot state precisely.
- Any edit to a `FEATURES.yaml`, `COMPONENTS.yaml`, or `APIS.yaml` contract.
- A new, renamed, or removed `data-testid` or selector contract.
- A new user-observable capability, or a behavioral change to an existing one.
- Anything touching a `DECISIONS.md` entry's subject matter, or implying a new decision. Report `DECISION REQUIRED` and stop.
- Anything the standard gates cannot fully verify, or that needs infrastructure you cannot bring up.

When a fix refuses, say which criterion it failed and what the packet would need to cover. Do not shave the fix down to fit the gate — a narrowed change that leaves the real defect in place is worse than an honest handoff.

## Invariants

- No subagents, for any part of this. If the work turns out to need one, it did not qualify.
- Nothing is deleted, reverted, discarded, or force-overwritten. Work that should not be kept is `git stash push`ed with a descriptive message and its ref reported; the human deletes, not you.
- No verification gate is weakened, skipped silently, or reported as passing when it did not run.
- One fix per invocation. A second unrelated defect found along the way is recorded as a ledger candidate, not fixed in the same commit.
- Never push, amend, squash, rebase, reset, cherry-pick, or chain further git operations into the commit.
- The commit never uses an `FM-NNN:` subject. That ID space belongs to task packets; a quickfix is not one.

## Step 1 — Snapshot

`git rev-parse HEAD`, `git status --porcelain=v1 -uall`, `git diff`, `git diff --staged`, and `git stash list`. Record which paths were already staged or dirty **before** you started; that set is the only authority on what is
pre-existing, and Step 6 depends on it. If a task packet is `in_progress`, `review`, or `blocked`, and its allowlist overlaps what you are about to touch, stop: that work belongs to `/fm-orchestrate <FM-ID>`, not here.

## Step 2 — Fix it

Make the change yourself. Keep it to the smallest edit that actually resolves the defect, and repair causes rather than symptoms — an ignore rule that stops a tool from examining throwaway output is a fix; deleting the tool's
findings is not.

For the bugfix case, write the regression test first, observe it fail, then fix, then observe it pass. Record both observations; "the test passes" alone is not evidence that it covers the defect.

## Step 3 — Gates

Run the gates for what you actually touched, recording working directory, exact command, and outcome for each.

In `core/ui-react`: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api`, `npm run validate:migration`. Install only when `package.json` or `package-lock.json`
changed or `node_modules` is inconsistent with the lockfile; otherwise record that it was skipped and why.

In `tests/system`, when anything there changed: `npx tsc --noEmit`, plus a real run of the affected spec when the change alters what it asserts. Run the whole spec file, never a `--grep` subset — a repair that green-lights one
assertion while another regresses is a worse defect than the one you fixed.

From the repository root: `git diff --check`.

A gate that was already failing before you started is pre-existing; prove that against the Step 1 snapshot or a clean baseline rather than asserting it, and say so in the ledger entry.

## Step 4 — Re-check your own diff

Read the complete finished diff and test it against the Step 2 gate criteria a second time. Small fixes grow while being made, and you are the only reader this change will get.

If the diff has drifted out of scope — extra files, a behavioral change you did not intend, a registry or selector edit, a fix that turned out to span modules — **abort without committing**. Leave the work in the tree, report exactly
which criterion it now fails, and hand off to `/fm-orchestrate`. An aborted quickfix that leaves an accurate report is a success; a committed one that quietly outgrew its gate is not.

## Step 5 — Record it

Append one entry to `docs/frontend-migration/MAINTENANCE.md`, newest last, following the format documented at the top of that file: date, one-line description, why it was a quickfix rather than a packet, paths, gates run, and the
commit SHA. Keep it to a few lines — the ledger is a lookup for "has this been dealt with?", not a handoff.

The entry records the fix's SHA, which does not exist until the fix is committed, so this lands in a **second** commit after Step 6: `docs(frontend-migration): record <thing> in the ledger`. Two commits is the expected shape — the fix
alone, then the ledger alone — and it keeps the fix's own diff free of bookkeeping. Never delay the ledger entry beyond that second commit.

If the candidate you set out to fix turns out to have been wrong about its own scope, correct the candidate rather than quietly fixing something narrower: replace it with what you actually found, and add new candidates for anything you
uncovered and did not fix, each with the reason it was left. A ledger that misdescribes the work is worse than no ledger.

Do not touch `STATUS.md`: it is limited to active, blocked, review-ready, and immediately next task work, and a quickfix is none of those. Do not create a task packet. `GUI-STATUS.md` is only touched if the fix genuinely changed
user-observable React availability — which, per the gate, it almost certainly did not.

`npm run validate:migration` must pass after this edit.

## Step 6 — Commit

Stage only the paths this fix touched, then run `git diff --staged --stat` and confirm it lists exactly those and nothing else. `git status` is not sufficient: paths staged before this session stay in the index and a plain
`git commit` sweeps them in. If a foreign path appears and Step 1 recorded its staged content as equal to its working-tree content, unstage it with `git restore --staged <path>`; if Step 1 recorded it as partially staged, leave the
index alone and commit with an explicit pathspec instead.

Commit the fix, subject prefixed by area — `chore(ui-react):`, `docs(frontend-migration):`, `test(system):`, `chore(agents):` — never `FM-NNN:`. The body states what was broken, what caused it, why it qualified as a quickfix, and the
gate results. Confirm with `git show --stat HEAD` that the commit contains exactly the intended paths, then write the Step 5 ledger entry with that SHA and commit it separately.

## Step 7 — Report

Close with: what was fixed and why it qualified; the commit SHA, which is the new baseline; gates run, with pre-existing failures named as pre-existing; anything still dirty and whether it can collide with the next task's
`Files Allowed To Modify`; ledger candidates you recorded but did not fix; and any stash refs.

## Escalation

Stop and report, keeping the tree intact, when the fix stops qualifying mid-flight, when a gate fails for reasons you may not fix without widening scope, when the defect turns out to be in a contract rather than in code, or when
resolution would require deleting or reverting someone's work. Name the concrete paths and hunks, never a summary such as "it got complicated".
