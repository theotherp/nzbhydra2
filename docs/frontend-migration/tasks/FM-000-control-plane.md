# FM-000: Migration Control Plane

Status: done Owner:
Feature IDs: all initial records Component IDs: all initial records API IDs: all initial records Depends on: None Blocks: FM-001

## Outcome

Provide durable, checked-in migration context so future agents do not depend on conversation history.

## Acceptance

- Reading order, ownership, task lifecycle, and context limits are documented.
- Initial ADRs record placement, stack, API, and parity decisions.
- Machine-readable feature, component, and API registries exist with permanent IDs.
- Initial tasks through the first vertical slice and packaging validation are bounded.
- Scoped instructions exist for future `core/ui-react` work.
- Migration status validation follows the documented lifecycle: `ready` packets are listed under `STATUS.md` Upcoming, while dependency-ready `planned` packets that have not been promoted remain omitted without error.
- `GUI-STATUS.md` exists as a concise derived, non-authoritative human summary and says to start at the configured NZBHydra base URL, append `/ui/react` to select React, and append `/ui/legacy` to return to the legacy GUI.
- The initial GUI summary includes only these accepted current React capability groups: search criteria (including media and indexer selection), recent/refill, live progress, results sorting/filtering/grouping/paging, supported result download actions, and saving executed searches; saved-search list/reopen/delete; the stats shell with indexer status and search-history paging/filtering/details/repeat; and the System news page. It does not claim the planned FM-022 download-history route, complete migration, or full parity.
- Coordinator policy requires reconciliation of `GUI-STATUS.md` after accepted review and before `done` or the task-boundary commit, and permits the coordinator to write that derived summary directly for completion bookkeeping.
- README's global derived-summary and completion-workflow text is retained; all GUI-STATUS-specific scope previously added to FM-022 is removed without changing FM-022's download-history contract.

## Current Correction Boundary Rationale

Creating the initial derived GUI summary and aligning coordinator completion policy are migration control-plane work. They are independent of FM-022's user-facing download-history capability, so FM-000 is the narrow existing owner and FM-022 must retain only its original route contract.

## Files Allowed To Modify

- `docs/frontend-migration/GUI-STATUS.md`
- `docs/frontend-migration/README.md`
- `.opencode/agent/migration-orchestrator.md`
- `docs/frontend-migration/tasks/FM-000-control-plane.md`
- `docs/frontend-migration/STATUS.md`, as needed for FM-000 lifecycle only
- `docs/frontend-migration/tasks/FM-022-download-history-route.md`, only to remove the prior GUI-STATUS coupling

## Context To Read

- `docs/frontend-migration/README.md`, especially Sources Of Truth, Workflow, and coordinator ownership
- `.opencode/agent/migration-orchestrator.md`, especially PASS, Coordinator writes, Commit policy, and Completion
- FM-004's accepted selector handoff; `FEATURES.yaml`; and accepted handoffs for done FM-008 through FM-021 and FM-025 needed to bound the current user-visible summary
- Current `STATUS.md`, this packet's historical handoffs, and baseline `f6c74f22030b0abe5c27347ac9ba3440d48c8ec3`
- FM-022's baseline packet and current diff, solely to verify removal of the superseded coupling

## Explicit Scope Boundaries

- Do not implement any FM-022 route, UI, API, test, registry, or other product functionality.
- Do not add planned, blocked, inventoried-only, or unaccepted capabilities to `GUI-STATUS.md`; do not turn it into a task queue, parity/gap matrix, registry-ID inventory, roadmap, or detailed verification record.
- Do not change selector behavior, architecture, registries, runtime code, tests, package metadata, generated files, or any task dependency.
- Preserve README's current global GUI summary and completion-workflow rules; change it only if strictly needed for consistency with the explicit coordinator-write policy.
- Preserve historical implementation handoffs. This correction may append its own handoff but must not rewrite prior factual evidence.

## Verification

- Cross-check the access sentence against FM-004 and every capability phrase against a `done` packet's accepted handoff plus current `FEATURES.yaml`; confirm FM-022 and other future capabilities are absent.
- Inspect `.opencode/agent/migration-orchestrator.md`: PASS and PASS WITH MINOR FINDINGS must reconcile `GUI-STATUS.md` before `done`; Coordinator writes must allow that path; Commit policy must include the reconciled summary when affected and must not require an unnecessary content change when the accepted result does not affect it.
- Confirm the FM-022 diff against baseline `f6c74f220` contains no GUI-STATUS-specific addition and its original route outcome, scope, acceptance, verification, status, and dependencies are unchanged.
- From repository root, run `node core/ui-react/scripts/validate-migration.mjs`; it must report valid task metadata, or any pre-existing unrelated diagnostic must be reported without suppression or an out-of-scope registry edit.
- Run `git diff --check` and inspect `git diff --name-only`; task-attributable changes must be limited to the exact allowed paths.

## Handoff

Created the control plane only. No React scaffold, backend route, generated API code, legacy UI code, or static output was changed. `FM-001` is the first task for a fresh agent.

### Historical Evidence Limitation

This completed task predates the current structured handoff template. Its recorded outcome and command evidence are retained as historical evidence; no retrospective SHA-256 verification basis, fresh-review record, or unrecorded command result is asserted.

## Task Designer Correction Refinement

- Reopened FM-000 as `ready` solely to correct the validator's stale control-plane enforcement. The original bootstrap ownership remains historical evidence, not current ownership.
- Decision sources: README Workflow requires promotion from `planned` to `ready` before selection; README Creating Task Batches requires later dependency-ready packets to remain planned and absent from Upcoming; README Context Discipline limits STATUS to immediately next work; validator lines 327-336 instead require every dependency-ready planned packet.
- Lifecycle effect: FM-000 is listed under Upcoming for a fresh fixer. FM-022's already-recorded ready promotion remains untouched; FM-020 registry metadata remains separate follow-up work, and FM-021 remains blocked with all uncommitted implementation evidence untouched.

## Correction Handoff

### Outcome

- Removed only the lifecycle rule that required every dependency-ready `planned` packet under `STATUS.md` Upcoming; lifecycle section validation for `ready`, `in_progress`, `review`, and `blocked` packets remains in place.
- Corrected the status-section validator to reject every `ready`, `in_progress`, `review`, and `blocked` task ID when it appears in any section other than its mapped section, while retaining the mapped-section required check.

### Files Modified

- `core/ui-react/scripts/validate-migration.mjs`
- `docs/frontend-migration/{STATUS.md,tasks/FM-000-control-plane.md}`
- Scope confirmation: all task-attributable modifications are within `Files Allowed To Modify`.

### Toolchain

- Node: `v26.7.0`
- Package manager: `not used`
- Other material tools: `Git`

### Verification Evidence

| Working directory | Command | Classification | Result |
|---|---|---|---|
| repository root | `node core/ui-react/scripts/validate-migration.mjs` | Affected: validator implementation and task metadata changed. | Passed: `Migration registries and task metadata are valid.` |
| repository root | `git diff --check` | Affected: task-owned validator and lifecycle documentation changed. | Passed. |

### Verification Basis

- Baseline: `14f7e409cb25c1917c040f9a6943bb5a986d07ce`.
- Prior verification basis: the prior validator and diff-check evidence is affected because the validator implementation and this task packet changed for the review correction.
- Command coverage: validator covers `core/ui-react/scripts/validate-migration.mjs`; diff check covers all task-owned paths.
- File-content manifest: `core/ui-react/scripts/validate-migration.mjs: 88ea77d28e97e54178d6a581d4f1ef6d5066957e2a21b275bdcf0df59dc609da`; documentation-only paths are excluded.
- Completed after the last change to each command's listed files: yes.
- Task-owned changes after verification: none.

### Review Finding Correction

- Finding: mapped lifecycle states were required in their assigned `STATUS.md` section but were not rejected when also listed in another section.
- Correction: `validateStatus` now reports a mapped lifecycle task found in any incompatible status section. FM-000 remains `review`; `STATUS.md` and all concurrent task work remain unchanged.

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Architecture Decisions

- None. No ADR REQUIRED.

### Assumptions

- README lifecycle rules make `ready` the only state selected under Upcoming; dependency-ready `planned` packets remain absent until promotion.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- No linked registry records exist; registries are intentionally unchanged.
- Moved FM-000 from Upcoming to Review after correction; FM-021 remains Blocked and FM-022 remains Upcoming.

### Follow-Up Work

- None.

## Task Designer GUI Status Refinement

- Reopened FM-000 as `ready` for a fresh fixer to create the initial derived GUI summary and align coordinator policy independently of FM-022.
- Decision sources: the user's explicit control-plane ownership decision; README's retained derived-summary/completion workflow; FM-004's accepted selector handoff; current `FEATURES.yaml`; and done task handoffs through FM-021 and FM-025. These sources determine the allowed paths, wording boundary, and accepted-feature limit without a new product or architecture decision.
- FM-022's prior GUI-STATUS additions were reverted to baseline. Its `ready` lifecycle and download-history contract remain unchanged.

## GUI Status Correction Handoff

### Outcome

- Added the concise derived GUI status with the configured-base selector instructions and only accepted current React capabilities.
- Aligned coordinator PASS, direct-write, and completion-commit instructions with the global workflow; FM-022 remains unchanged.

### Files Modified

- `docs/frontend-migration/GUI-STATUS.md`
- `docs/frontend-migration/README.md`
- `.opencode/agent/migration-orchestrator.md`
- `docs/frontend-migration/{STATUS.md,tasks/FM-000-control-plane.md}`
- Scope confirmation: all task-attributable modifications are within `Files Allowed To Modify`.

### Verification Evidence

| Working directory | Command | Classification | Result |
|---|---|---|---|
| repository root | `node core/ui-react/scripts/validate-migration.mjs` | Affected: task metadata and lifecycle documentation changed. | Failed only on the pre-existing unrelated diagnostic: `FEATURES.yaml F-HISTORY-SEARCHES is unfinished without backlog ownership`; no out-of-scope registry edit was made. |
| repository root | `git diff --check` | Affected: task-owned documentation changed. | Passed after the final handoff update. |

### Verification Basis

- Baseline: `f6c74f22030b0abe5c27347ac9ba3440d48c8ec3`.
- The prior validator and diff-check evidence is affected by this correction's task metadata, lifecycle, and documentation changes; no command evidence is reused.
- No task-owned implementation or test file changed.

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Architecture Decisions

- None. No ADR REQUIRED.

### Temporary Exceptions And Debt

- None.
