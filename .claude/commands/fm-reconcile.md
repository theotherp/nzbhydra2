---
description: Reconcile uncommitted ad-hoc changes with the FM migration process so the next task starts from a clean, verified baseline.
---

Requested scope: $ARGUMENTS

`$ARGUMENTS` is optional. It may narrow the reconciliation to specific paths, name an FM task ID to attribute changes to, or contain `--plan` to stop before any commit. With no arguments, reconcile the entire working tree.

Use this after work happened outside the FM pipeline — a live user session, an interrupted agent, a manual fix — and the working tree is dirty. Its single goal is a clean, verified, correctly attributed tree so `/fm-orchestrate` can start
the next task from a real baseline. It is not a task runner: never start the next FM task here.

This is a long-running operation, not a quick cleanup. Each implementer/reviewer pair costs roughly 10-20 minutes of background agent time, and a diff spanning four capabilities becomes four of them. Say so at the Step 4 checkpoint before
spending it.

You are a coordinator, as in `/fm-orchestrate`. You do not implement feature work, design task packets, or decide architecture yourself. Route that work to fresh subagents via the Agent tool: `migration-task-designer`,
`migration-implementer`, `migration-reviewer`, `migration-fixer`, `migration-adr-proposer`. Where the source workflow says "ask the user", use AskUserQuestion.

## Invariants

- Nothing is deleted, reverted, discarded, or force-overwritten — by you or by any worker. When work should not be kept, `git stash push` it with a descriptive message and report the stash ref; the human deletes, not you.
- No agent runs a working-tree-mutating git command on task content. Inspection uses `git diff`, `git show <rev>:<path>`, and `git cat-file -p`, never `git checkout`, `git restore --worktree`, `git stash`, `git clean`, or `git reset`.
- The invocation-time snapshot, not later index state, is the only authority on what existed before you started.
- No verification gate is weakened, skipped silently, or reported as passing when it did not run. A blocked command is recorded as blocked with its evidence.
- Feature-level implementation changes never reach a commit without a fresh independent review by an agent that did not write them.
- Governance documents and agent definitions are edited directly and never routed through the FM task pipeline. Implementation code is never edited directly by you.
- Every new specialized-agent pass uses a fresh Agent call. Pass repository state, diffs, contracts, and findings — never conversation history.
- At most three fix/review cycles per reconciled unit.
- Never push, amend, squash, rebase, reset, cherry-pick, or chain further git operations into a commit command.

## Orchestration mechanics

These are coordinator tool rules, not migration rules. Getting them wrong wastes whole cycles.

- **Waiting.** Spawned workers run in the background and the harness re-invokes you when one finishes. Do not poll, and do not call `ScheduleWakeup` — it belongs to `/loop`, not to waiting on an agent. While waiting, either do
  non-conflicting coordinator work (classifying another bucket, drafting the checkpoint) or simply wait.
- **Resuming.** To continue an agent that already holds context — an implementer that stopped mid-verification, a reviewer you need to ask a follow-up — use `SendMessage` addressed to the ID or name from its spawn result, or from
  `ListAgents`. Never a new `Agent` call for this, and never `subagent_type: fork` with a placeholder prompt: a new call starts cold and loses the verification evidence, and a fork inherits *your* coordinator context rather than the
  worker's.
- **Freshness still holds.** Resuming an interrupted implementer is continuation, not a second pass. A re-review after a fix is always a brand-new reviewer, never a resumed one.
- **Nested agents.** Instruct every worker to do its own work in-process. If it spawns a helper anyway, it must not depend on messaging that helper or on being messaged back — nested addressing does not resolve reliably, and the helper's
  report can surface at the coordinator instead of its parent. Treat any report that arrives that way as unverified: confirm the claimed file state on disk by content hash before acting on it.
- **Interruption tolerance.** Require implementers to append each command's evidence to the handoff as that command completes, before starting the next long-running step, so an interrupted run still leaves usable evidence. If a worker
  returns with no handoff, resume it via `SendMessage` with explicit instructions to re-verify anything whose covered files changed in the meantime — do not start a fresh implementer that would re-derive everything from zero.

## Step 1 — Snapshot before touching anything

Before any edit, install, or verification command, capture and write to a scratchpad file so it survives compaction:

- `git rev-parse HEAD` and `git log --oneline -8`
- `git status --porcelain=v1 -uall`
- `git diff` and `git diff --staged`
- the full content of every untracked file in scope (`git diff --no-index /dev/null <path>` per file), unless it is plainly build output
- `git stash list`

Record the **pre-existing index** separately and explicitly: which paths were already staged before you started, and for each, whether its staged content equals its working-tree content or differs from both `HEAD` and the working tree (a
partial stage). Step 9 depends on this. Everything not in this snapshot but changed later is attributable to work you initiated. Never re-derive the pre-existing set from the index afterwards — installs, formatters, and generators mutate
it.

## Step 2 — Classify every changed path

Assign each path to exactly one bucket. Classify by content, not only by location: a file under a governance directory that carries implementation logic is implementation.

| Bucket             | Typical paths                                                                                                                                              | Handling                                                                                    |
|--------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| **G** Governance   | `docs/frontend-migration/**`, `/AGENTS.md`, `core/ui-react/AGENTS.md`, `.claude/**`, `.opencode/**`                                                          | You edit and commit directly. No packet, no designer, no review cycle.                        |
| **T** Tooling      | `core/ui-react/{eslint.config.js,tsconfig*.json,vite.config.ts,vite/**,.prettierrc*,scripts/**}`, `package.json`, `package-lock.json`, `.gitignore`, CI workflows, `misc/*.py`, `tests/system` config | Maintenance commit after the gates pass. Manifest changes additionally require dependency classification. |
| **R** React impl   | `core/ui-react/src/**`, `core/ui-react/index.html`, `tests/system/tests/**`                                                                                  | Task-attributable. Resolve an owner in Step 3; never commit unreviewed.                       |
| **L** Legacy/backend | `core/ui-src/**`, `core/src/**`, `other/**`, Java/Maven files                                                                                              | Outside FM governance. Verify with the backend toolchain and commit separately; never inside an FM commit. |
| **X** Incidental   | build output, `core/target/**`, `.playwright-cli/**`, `node_modules`, stray screenshots, scratchpad leakage                                                  | Propose ignoring or removing. Never delete without approval.                                  |

A file that Prettier or a generator rewrote as a side effect of someone's verification run belongs to whichever bucket triggered it; say so explicitly rather than filing it as an independent change.

If `$ARGUMENTS` narrowed the scope, still classify everything, then state which buckets you are deliberately leaving dirty and confirm in Step 10 that they cannot collide with the next task's `Files Allowed To Modify`.

## Step 3 — Resolve ownership for bucket R

For the React implementation changes, in order:

1. **Resumed task work.** If a task is `in_progress`, `review`, or `blocked`, and the changed paths are inside its `Files Allowed To Modify` and content-coherent with its `Outcome`, these are that task's changes. Do not reconcile them here.
   Report them as resumed task work and tell the human to continue with `/fm-orchestrate <FM-ID>`, which already owns resumption, attribution, and the task-boundary commit. Reconcile the other buckets and stop cleanly for this one.
2. **Explicit attribution.** If `$ARGUMENTS` named a task ID, verify the paths are within that task's allowlist and coherent with its outcome before accepting the attribution. If they are not, say so and fall through rather than stretching
   the packet to fit.
3. **Out-of-band work with no live owner.** Invoke a fresh `migration-task-designer` to create retroactive packets, following the `FM-034` precedent: each packet is written after the fact, its `Dependency Notes` state plainly that the work
   was implemented interactively outside the normal `planned -> ready -> in_progress` promotion, and its `Boundary Rationale` justifies the unit that actually exists. Give the designer the snapshot, the complete diff, and the affected
   registry IDs.

Require the designer to deliver, in addition to the packets:

- **A split, not a wrapper.** A retroactive packet describes what was done and must not be widened to legitimize a change that overreached. When the diff spans genuinely independent capabilities, it is split into one packet each.
- **Disjoint hunk assignment for shared files.** When one file carries hunks belonging to more than one packet, the designer assigns each hunk to exactly one packet and fixes a strict commit order for them. Carry that order into Step 9
  unchanged.
- **The expected implementer gaps, per packet.** Name the concrete work the implementer is expected to close — missing test coverage, an unreconciled registry record, a missing visual or geometry check, an open regression question — or
  state plainly that the packet needs bookkeeping only. For code that already exists, "what work is actually left?" is the human's real question at the Step 4 checkpoint; answer it with this list verbatim, never with an appeal to process.
- **Latent risks it noticed.** A retroactive packet is the last chance to catch behavior the ad-hoc change silently dropped; require the designer to record such risks as acceptance criteria rather than passing the diff through.

If any agent reports `ADR REQUIRED`, follow the `/fm-orchestrate` ADR flow: fresh `migration-adr-proposer`, designer persists the proposal as a task block and `STATUS.md` entry, AskUserQuestion presents the decision question with the
recommendation first, a fresh proposer records the explicit human response. Nothing dependent proceeds on a proposed or rejected decision.

## Step 4 — Scope and cost checkpoint

Before spending implementer/reviewer time, present with AskUserQuestion: the bucket classification, the packets the designer produced, the per-packet expected gaps verbatim, and the expected cost (pairs × roughly 10-20 minutes). Offer to
run all packets, a named subset now with the rest left dirty and reported, or plan-only. Stop here if `--plan` was requested.

## Step 5 — Run the implement/review pipeline

Per packet, in the designer's commit order:

1. Invoke a fresh `migration-implementer`, telling it explicitly that the implementation already exists in the working tree, that its job is to close the named acceptance gaps, run the task's verification, reconcile every linked registry
   record, and produce the `templates/handoff.md` handoff with a complete `Verification Basis` — appending evidence incrementally as described under Orchestration mechanics. It marks the task `review`, never `done`.
2. Invoke a fresh `migration-reviewer` with the task ID, the baseline SHA, the pre-existing path list, the task-attributable diff, and the handoff. Its prompt must carry the read-only invariant explicitly: inspect with `git diff` and
   `git show <rev>:<path>`; never run `git checkout`, `git restore`, `git stash`, `git clean`, or `git reset` on any file, including one it believes it could restore afterwards.
3. Handle `PASS`, `PASS WITH MINOR FINDINGS`, `FAIL`, and `BLOCKED` exactly as `/fm-orchestrate` does, including its three-cycle limit and its `migration-fixer` routing. Minor and cosmetic findings are recorded as deviations in the handoff,
   not turned into correction cycles.

If a worker discloses that it mutated or restored a file, do not take the restoration on trust: re-hash the file yourself, compare with the handoff manifest and the Step 1 snapshot, and record the incident in the Step 10 report.

## Step 6 — Verification gates

Run the gates for the buckets you are actually committing. Record working directory, exact command, and outcome for each; these become the handoff evidence and the maintenance-commit justification.

In `core/ui-react`:

- Install only when required: `npm ci` if `package.json` or `package-lock.json` changed, or if `node_modules` is absent or inconsistent with the lockfile. Otherwise skip it and record that it was skipped and why.
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm run test -- --run`
- `npm run build`
- `npm run check:api`
- `npm run validate:migration` — plus `node --test scripts/validate-migration.test.mjs` when `scripts/validate-migration.mjs` or its test changed.

In `tests/system`, when anything there changed: `npx tsc --noEmit`.

From the repository root: `git diff --check`.

For bucket L, use the backend toolchain from `/AGENTS.md` (IntelliJ MCP build and run configurations first, Maven only as fallback). Browser and system runs (`python3 misc/run_gui_systemtest.py ...`) are required only when the change
affects what they cover; a run blocked by a known environment defect is recorded as blocked, with the evidence that it is pre-existing, and never reported as passing.

Record a SHA-256 file-content manifest for every implementation and test file covered by a passing command, and confirm each command ran after the last edit to its covered files. If a formatter fix or registry edit landed afterwards, rerun
the affected commands rather than adjusting the claim.

## Step 7 — Reconcile the governance state itself

Ad-hoc work desynchronizes bookkeeping, and a stale bookkeeping file will mislead the next task as surely as a dirty file. Check and, where you own the file, fix:

- `STATUS.md` against the actual `Status:` line of every task packet: `Active`, `Review`, and `Blocked` must list exactly the tasks in those states, and `Upcoming` must name the earliest dependency-ready task, not a stale one.
- Task packet headers against `templates/task.md`, including tasks whose status was hand-edited during the ad-hoc session.
- `GUI-STATUS.md`, when the reconciled work changed user-observable React availability or GUI selection instructions. This is a permitted direct coordinator write.
- Registry records touched by bucket R changes — but only via the implementer's handoff, never by editing `FEATURES.yaml`, `COMPONENTS.yaml`, or `APIS.yaml` yourself.

A gate will often surface pre-existing breakage that predates this session — a YAML indentation error, a `Status:` casing typo. Fix mechanical breakage of that kind directly, commit it as its own governance commit, and name it as
pre-existing in the report. Anything requiring a content decision goes to the designer or the human instead.

`npm run validate:migration` must pass after these edits.

## Step 8 — Commit checkpoint

Present the final plan with AskUserQuestion before any commit: per bucket and per packet, the paths, the disposition, the gate results, the review dispositions, and anything you could not attribute. For each genuinely ambiguous unit — work
that looks experimental, abandoned, or contrary to an accepted ADR — offer commit, stash, or leave-dirty as explicit options with your recommendation first.

Stop here and report without committing if a gate failed, if a review did not reach an accepted disposition, or if an ADR decision is outstanding.

## Step 9 — Commit

One commit per bucket, never mixing buckets, in this order so the FM task boundary ends up at `HEAD` (packets within bucket R follow the designer's order):

1. **G** — `docs(frontend-migration): <summary>` or `chore(agents): <summary>`
2. **T** — `chore(ui-react): <summary>`, naming the dependency classification when a manifest changed
3. **L** — the backend convention already used in `git log`
4. **R** — `FM-NNN: <task title>`, including the packet, handoff, reconciled registry records, `STATUS.md`, and `GUI-STATUS.md` when affected

Stage only that bucket's paths, then — immediately before every commit — run `git diff --staged --stat` and confirm it lists exactly the intended paths and nothing else. `git status` is not sufficient for this: entries staged before this
session stay in the index, and a plain `git commit -m` commits the whole index, sweeping them in. When a foreign path appears:

- if Step 1 recorded its staged content as equal to its working-tree content, unstage it with `git restore --staged <path>` — index-only, the working tree is untouched;
- if Step 1 recorded it as partially staged, leave the index alone and commit this bucket with an explicit pathspec instead: `git commit -m "<message>" -- <paths>`, which takes those paths' working-tree content and preserves the human's
  partial staging.

After each commit, confirm with `git show --stat HEAD` that it contains exactly the intended paths, and report every SHA. Do not edit files afterwards merely to record a SHA in a document.

## Step 10 — Report the slate

Close with:

- `git status --porcelain` output, and for anything still dirty, the human's explicit decision to keep it plus confirmation that it does not overlap the next task's `Files Allowed To Modify`;
- the new `HEAD` SHA, which is the baseline for the next FM task;
- commits created, per bucket and packet;
- gates run, with blocked ones named as blocked, and pre-existing breakage fixed along the way;
- retroactive packets created and their review dispositions;
- deviations and minor findings logged rather than fixed;
- any worker-disclosed working-tree mutation and how you re-verified it;
- stashes created, with their refs;
- the next dependency-ready task, and whether anything still blocks it.

## Escalation

Stop and report, keeping the tree intact, when: a gate fails for reasons you may not fix without widening scope; attribution cannot be made safely because ad-hoc work and task-owned work overlap in the same hunks; an accepted ADR
conflicts with what the working tree does; a decision requires human architectural input; or resolution would require deleting or reverting someone's work. Report the concrete conflicting paths and hunks — never a summary such as "dirty
files exist".
