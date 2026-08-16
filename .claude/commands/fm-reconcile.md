---
description: Reconcile uncommitted ad-hoc changes with the FM migration process so the next task starts from a clean, verified baseline.
---

Requested scope: $ARGUMENTS

`$ARGUMENTS` is optional. It may narrow the reconciliation to specific paths, name an FM task ID to attribute changes to, or contain `--plan` to stop before any commit. With no arguments, reconcile the entire working tree.

Use this after work happened outside the FM pipeline — a live user session, an interrupted agent, a manual fix — and the working tree is dirty. Its single goal is a clean, verified, correctly attributed tree so `/fm-orchestrate` can start
the next task from a real baseline. It is not a task runner: never start the next FM task here.

You are a coordinator, as in `/fm-orchestrate`. You do not implement feature work, design task packets, or decide architecture yourself. Route that work to fresh subagents via the Agent tool: `migration-task-designer`,
`migration-implementer`, `migration-reviewer`, `migration-fixer`, `migration-adr-proposer`. Where the source workflow says "ask the user", use AskUserQuestion.

## Invariants

- Nothing is deleted, reverted, discarded, or force-overwritten. When work should not be kept, `git stash push` it with a descriptive message and report the stash ref; the human deletes, not you.
- The invocation-time snapshot, not later index state, is the only authority on what existed before you started.
- No verification gate is weakened, skipped silently, or reported as passing when it did not run. A blocked command is recorded as blocked with its evidence.
- Feature-level implementation changes never reach a commit without a fresh independent review by an agent that did not write them.
- Governance documents and agent definitions are edited directly and never routed through the FM task pipeline. Implementation code is never edited directly by you.
- Every specialized-agent invocation uses a fresh Agent call. Pass repository state, diffs, contracts, and findings — never conversation history.
- At most three fix/review cycles per reconciled unit.
- Never push, amend, squash, rebase, reset, cherry-pick, or chain further git operations into a commit command.

## Step 1 — Snapshot before touching anything

Before any edit, install, or verification command, capture and write to a scratchpad file so it survives compaction:

- `git rev-parse HEAD` and `git log --oneline -8`
- `git status --porcelain=v1 -uall`
- `git diff` and `git diff --staged`
- the full content of every untracked file in scope (`git diff --no-index /dev/null <path>` per file), unless it is plainly build output
- `git stash list`

Everything not in this snapshot but changed later is attributable to work you initiated. Never re-derive the pre-existing set from the index afterwards — installs, formatters, and generators mutate it.

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

If `$ARGUMENTS` narrowed the scope, still classify everything, then state which buckets you are deliberately leaving dirty and confirm in Step 8 that they cannot collide with the next task's `Files Allowed To Modify`.

## Step 3 — Resolve ownership for bucket R

For the React implementation changes, in order:

1. **Resumed task work.** If a task is `in_progress`, `review`, or `blocked`, and the changed paths are inside its `Files Allowed To Modify` and content-coherent with its `Outcome`, these are that task's changes. Do not reconcile them here.
   Report them as resumed task work and tell the human to continue with `/fm-orchestrate <FM-ID>`, which already owns resumption, attribution, and the task-boundary commit. Reconcile the other buckets and stop cleanly for this one.
2. **Explicit attribution.** If `$ARGUMENTS` named a task ID, verify the paths are within that task's allowlist and coherent with its outcome before accepting the attribution. If they are not, say so and fall through rather than stretching
   the packet to fit.
3. **Out-of-band work with no live owner.** Invoke a fresh `migration-task-designer` to create a retroactive packet, following the `FM-034` precedent: the packet is written after the fact, its `Dependency Notes` state plainly that the work
   was implemented interactively outside the normal `planned -> ready -> in_progress` promotion, and its `Boundary Rationale` justifies the unit that actually exists. Give the designer the snapshot, the complete diff, and the affected
   registry IDs. A retroactive packet describes what was done; it must not be widened merely to legitimize a change that overreached — if the diff spans genuinely unrelated capabilities, the designer splits it and each part is reconciled
   separately.
4. Then invoke a fresh `migration-implementer` on that packet, telling it explicitly that the implementation already exists in the working tree, that its job is to close acceptance gaps, run the task's verification, reconcile every linked
   registry record, and produce the `templates/handoff.md` handoff with a complete `Verification Basis`. It marks the task `review`, never `done`.
5. Then invoke a fresh `migration-reviewer` with the task ID, the baseline SHA, the pre-existing path list, the task-attributable diff, and the handoff. Handle `PASS`, `PASS WITH MINOR FINDINGS`, `FAIL`, and `BLOCKED` exactly as
   `/fm-orchestrate` does, including its three-cycle limit and its `migration-fixer` routing. Minor and cosmetic findings are recorded as deviations in the handoff, not turned into correction cycles.

If any agent reports `ADR REQUIRED`, follow the `/fm-orchestrate` ADR flow: fresh `migration-adr-proposer`, designer persists the proposal as a task block and `STATUS.md` entry, AskUserQuestion presents the decision question with the
recommendation first, a fresh proposer records the explicit human response. Nothing dependent proceeds on a proposed or rejected decision.

## Step 4 — Verification gates

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

## Step 5 — Reconcile the governance state itself

Ad-hoc work desynchronizes bookkeeping, and a stale bookkeeping file will mislead the next task as surely as a dirty file. Before the checkpoint, check and, where you own the file, fix:

- `STATUS.md` against the actual `Status:` line of every task packet: `Active`, `Review`, and `Blocked` must list exactly the tasks in those states, and `Upcoming` must name the earliest dependency-ready task, not a stale one.
- Task packet headers against `templates/task.md`, including tasks whose status was hand-edited during the ad-hoc session.
- `GUI-STATUS.md`, when the reconciled work changed user-observable React availability or GUI selection instructions. This is a permitted direct coordinator write.
- Registry records touched by bucket R changes — but only via the implementer's handoff, never by editing `FEATURES.yaml`, `COMPONENTS.yaml`, or `APIS.yaml` yourself.

`npm run validate:migration` must pass after these edits.

## Step 6 — Human checkpoint

Present the reconciliation plan with AskUserQuestion before any commit. Include, per bucket: the paths, the proposed disposition, the gate results, and anything you could not attribute. For each unit that is genuinely ambiguous — work that
looks experimental, abandoned, or contrary to an accepted ADR — offer commit, stash, or leave-dirty as explicit options with your recommendation first.

Stop here and report without committing if `--plan` was requested, if a gate failed, if a review did not reach an accepted disposition, or if an ADR decision is outstanding.

## Step 7 — Commit

One commit per bucket, never mixing buckets, in this order so the FM task boundary ends up at `HEAD`:

1. **G** — `docs(frontend-migration): <summary>` or `chore(agents): <summary>`
2. **T** — `chore(ui-react): <summary>`, naming the dependency classification when a manifest changed
3. **L** — the backend convention already used in `git log`
4. **R** — `FM-NNN: <task title>`, including the packet, handoff, reconciled registry records, `STATUS.md`, and `GUI-STATUS.md` when affected

For each: stage only that bucket's paths, inspect the staged diff, confirm it contains nothing from another bucket and nothing the human asked to keep dirty, then commit. Report every SHA. Do not edit files afterwards merely to record a
SHA in a document.

## Step 8 — Report the slate

Close with:

- `git status --porcelain` output, and for anything still dirty, the human's explicit decision to keep it plus confirmation that it does not overlap the next task's `Files Allowed To Modify`;
- the new `HEAD` SHA, which is the baseline for the next FM task;
- commits created, per bucket;
- gates run, with blocked ones named as blocked;
- retroactive packets created and their review dispositions;
- deviations and minor findings logged rather than fixed;
- stashes created, with their refs;
- the next dependency-ready task, and whether anything still blocks it.

## Escalation

Stop and report, keeping the tree intact, when: a gate fails for reasons you may not fix without widening scope; attribution cannot be made safely because ad-hoc work and task-owned work overlap in the same hunks; an accepted ADR
conflicts with what the working tree does; a decision requires human architectural input; or resolution would require deleting or reverting someone's work. Report the concrete conflicting paths and hunks — never a summary such as "dirty
files exist".
