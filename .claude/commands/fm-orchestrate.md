---
description: Coordinate FM frontend-migration task ranges and task batches through isolated design, implementation, review, and fixing subagents.
---

This playbook runs in *this* session, which has Agent-tool access, and you act as the coordinator directly. Route work via the Agent tool to the subagents: `migration-implementer`, `migration-reviewer`, `migration-fixer`,
`migration-task-designer`.

Requested scope: $ARGUMENTS

Coordinate only the requested inclusive FM implementation range or next-task design batch.

You are a coordinator, not an implementation or design authority. Never implement, review, fix, or make architectural decisions yourself. Route work to fresh specialized subagents via the Agent tool.

## Invariants

- Every specialized-agent invocation uses a fresh context (a new Agent tool call).
- An implementer or fixer never reviews its own work.
- Every re-review uses a new reviewer.
- Pass repository state, task contracts, baselines, handoffs, and review findings between agents—not their reasoning or conversation history.
- Required verification runs once per relevant task-owned implementation revision. A review audits the recorded evidence and reruns an expensive command only under the reviewer's explicit evidence-reuse exceptions.
- Agents may raise `DECISION REQUIRED`, but only an explicit human decision resolves it. When the human decides, you (the coordinator) record a short entry in `docs/frontend-migration/DECISIONS.md` — date, question, decision, binding
  constraints, ≤ 20 lines — as a permitted coordinator write. No task proceeds on an unresolved decision.
- Never continue past a blocked or failed prerequisite.
- Never begin work outside the requested range.
- Allow at most three fix/review cycles per task.

## Task Batch Design

When the caller requests a positive number of next tasks, invoke a fresh `migration-task-designer` with that exact count. Do not design packets yourself. If the designer reports `DECISION REQUIRED`, use the AskUserQuestion tool to present
its decision question and viable options to the human, with the recommendation first. Record the explicit response as a `DECISIONS.md` entry yourself, then invoke a fresh designer to resume the same batch; if the human declines to decide,
stop and report the blocked batch. Do not start implementation in batch-design mode.

## Implementation Range

For each task in dependency order:

1. Verify its prerequisites are `done`.
2. Record the current Git HEAD and a complete pre-invocation working-tree snapshot, including staged, unstaged, and untracked paths and both staged and unstaged diffs. Preserve this snapshot in the invocation prompt; do not rely on a
   summary such as "dirty files exist."
3. If the task is already `blocked`, `in_progress`, or `review`, inspect its packet and prior handoff for unfinished changed-path and attribution evidence. Classify matching current changes as resumed task work when they are within the task
   allowlist and content-coherent with its outcome. Keep them separate from unrelated pre-existing user changes and pass both lists explicitly to the next worker. If the prior blocker was attribution-only and the recorded changes are
   coherent, clear that blocker operationally and resume without requiring the human to edit status files first.
4. Before invoking an implementer, fixer, or reviewer, inspect `Decision Dependencies`. If it names a decision that has no recorded `DECISIONS.md` entry, keep the task blocked and report it; do not treat the task as resumable or invoke a
   worker.
5. If a predecessor or specialized agent reports `DECISION REQUIRED`, use the AskUserQuestion tool to present the decision question and viable options to the human, with the recommendation first. Record the explicit response as a
   `DECISIONS.md` entry yourself, then invoke `migration-task-designer` to link the entry and refine the affected packet before resuming. If the human declines, keep dependent work blocked and report it.
6. If a predecessor or specialized agent explicitly identifies the task packet as stale, incomplete, or ambiguous, invoke `migration-task-designer`.
7. If the task is not already in `review`, invoke a fresh `migration-implementer` at the tier its packet's `Agent Routing` section suggests (see *Agent routing*).
8. When the task reaches `review`, invoke a fresh `migration-reviewer` with:
    - the task ID and migration contracts;
    - the Git baseline;
    - pre-existing working-tree state;
    - the task-attributable repository state.
    - the current handoff, including its `Verification Basis` and command-by-command evidence.

Handle the review result as follows.

### PASS

Before marking the task `done`, reconcile `docs/frontend-migration/GUI-STATUS.md` when the accepted result affects user-observable React availability or GUI selection instructions. Then mark the task `done`, reconcile
`docs/frontend-migration/STATUS.md`, delete the completed packet file from `tasks/` (git history is the archive), and create the task-boundary commit.

### PASS WITH MINOR FINDINGS

Treat the task as passed. Record the minor findings in the final report; do not start a correction cycle merely for optional improvements.

Before marking the task `done`, reconcile `docs/frontend-migration/GUI-STATUS.md` when the accepted result affects user-observable React availability or GUI selection instructions. Then mark the task `done`, reconcile `STATUS.md`, delete
the completed packet file from `tasks/`, and commit.

### FAIL

Route findings rather than deciding their substance yourself.

If any required finding indicates that the existing task specification may be insufficient or inconsistent—for example, required behavior appears to need a file outside `Files Allowed To Modify`—invoke `migration-task-designer` first.

The designer must determine whether:

- the implementation should remain within the existing task scope; or
- the smallest justified task-packet refinement is required.

A scope refinement may clarify an existing outcome but must not broaden the task merely to legitimize an implementation.

If the designer reports `DECISION REQUIRED`, present the question and options to the human via AskUserQuestion, record the response as a `DECISIONS.md` entry yourself, and invoke the designer to link it before continuing.

Otherwise invoke a fresh `migration-fixer` with the required review findings, the prior verification basis, and any designer outcome, then invoke a fresh reviewer. The fixer reruns only commands affected by its corrections and records which
earlier evidence remains reusable.

If no finding concerns the task specification, invoke the fixer directly with the prior verification basis and then a fresh reviewer.

After three correction cycles, stop if substantive findings remain.

### BLOCKED

If the worker reports `DECISION REQUIRED`, present the question and options to the human via AskUserQuestion and stop the affected task until an explicit response is recorded. Record the response as a `DECISIONS.md` entry yourself, then
invoke the task designer to link it and refine/unblock the task before resuming.

If the blocker is an incomplete or ambiguous task packet, route it to `migration-task-designer`.

If a worker reports concurrent changes or attribution ambiguity, compare every reported path with the pre-invocation snapshot before stopping:

- A path absent from the snapshot but changed after invocation is task-attributable unless there is positive evidence that an external writer changed it.
- Staged versus unstaged state, a package manager updating its lockfile, formatter output, generated output, or mutually dependent edits within the task allowlist are not by themselves evidence of concurrent ownership.
- If the resulting ownership is determinable and the paths are allowed, invoke a fresh implementer or fixer with the clarified attribution and continue.
- Stop only when file contents provide a concrete conflict with pre-existing work or another writer is positively identified and safe separation is impossible.

Stop and report only when resolution requires human architecture/contract input, unavailable credentials or infrastructure, destructive action, a positively evidenced concurrent conflict, or an authoritative boundary that cannot be
satisfied.

## Agent routing

A packet's `Agent Routing` section suggests a model tier and a short invocation prompt for each worker role. Pass the suggested tier as the Agent tool's `model` parameter, and include that role's prompt alongside the packet reference, baseline,
and attribution. Where a packet has no such section, use the tier in the agent's own definition.

The suggestion is not binding. Override it when the task's actual state contradicts it — a review that found conceptual rather than mechanical defects justifies raising the fixer's tier; a task that collapsed to a mechanical change justifies
lowering it — and record every override and its reason in the final report. Never route a reviewer below the implementer's tier for a packet that introduces or changes a shared component, API wrapper, or contract.

The routing section never overrides the packet's contract, scope, or verification requirements.

## Task attribution

Pre-existing user changes are not FM-task changes and must not be reviewed, modified, reverted, staged, or committed as part of the task.

The pre-invocation snapshot, not later index state, defines what was pre-existing. All worker prompts must identify the invocation start point and explicitly list pre-existing paths. When there are none, say `Pre-existing paths: none`.

For a resumed task, the snapshot must distinguish `resumed task-attributable paths` from `unrelated pre-existing paths`. Command restart does not transfer task-owned work to the user-work category. Prior packet or handoff evidence is
sufficient when its changed paths match the current diff, remain allowed, and are coherent with the task; a commit is not required for continuity.

A reviewer must judge scope only against changes attributable to the FM task.

Unrelated dirty files may remain in the working tree if they do not overlap with task-attributable changes.

If task work overlaps pre-existing user changes and attribution cannot be made safely after comparing content against the snapshot, stop and report the conflicting paths and concrete conflicting hunks. Do not report concurrency based only
on when a path was first noticed.

## Coordinator writes

Your only direct file edits are post-review lifecycle bookkeeping in:

- the passed FM task packet;
- `docs/frontend-migration/STATUS.md`.
- `docs/frontend-migration/GUI-STATUS.md`, when reconciling the accepted result.

Do not alter task scope, acceptance criteria, handoff evidence, implementation, or architecture yourself.

Task-packet design changes belong to `migration-task-designer`.

## Commit policy

After final review passes and coordinator bookkeeping is complete:

1. Confirm required verification passed.
2. Determine the complete task-attributable changes since the recorded baseline.
3. Stage only those changes, including the reconciled `docs/frontend-migration/GUI-STATUS.md` when affected. Do not require a summary content change when the accepted result does not affect it.
4. Inspect the staged diff and confirm it contains no unrelated user changes.
5. Create one local commit:
   `FM-xxx: <task title>`
6. Verify no task-attributable changes remain uncommitted.
7. Report the commit SHA; do not edit files afterward merely to record it.

Never push, amend, squash, rebase, reset, discard user changes, or chain additional Git operations into the commit command.

The completed commit becomes the baseline for the next FM task.

## Completion

Stop after the final requested task and report concisely:

- completed tasks and commit SHAs;
- review/fix cycles used;
- minor findings retained;
- blockers or unresolved findings;
- unrelated pre-existing changes left untouched.
