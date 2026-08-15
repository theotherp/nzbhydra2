# FM-000: Migration Control Plane

Status: done Owner: Feature IDs: all initial records Component IDs: all initial records API IDs: all initial records Depends on: None Blocks: FM-001

## Outcome

Provide durable, checked-in migration context so future agents do not depend on conversation history.

## Acceptance

- Reading order, ownership, task lifecycle, and context limits are documented.
- Initial ADRs record placement, stack, API, and parity decisions.
- Machine-readable feature, component, and API registries exist with permanent IDs.
- Initial tasks through the first vertical slice and packaging validation are bounded.
- Scoped instructions exist for future `core/ui-react` work.
- Migration status validation follows the documented lifecycle: `ready` packets are listed under `STATUS.md` Upcoming, while dependency-ready `planned` packets that have not been promoted remain omitted without error.

## Correction Boundary Rationale

The defect is in enforcement of the migration control plane, not in FM-020 registry reconciliation or FM-021 product work. FM-002 originally introduced the validator, but the conflicting lifecycle check was added later as governance enforcement; reopening FM-000 with one exact script path is narrower than reopening FM-002's `core/ui-react/**` scaffold scope.

## Files Allowed To Modify

- `core/ui-react/scripts/validate-migration.mjs`
- This task packet and `docs/frontend-migration/STATUS.md`

## Context To Read

- `docs/frontend-migration/README.md`, especially Workflow, Creating Task Batches, and Context Discipline
- Current `STATUS.md`; FM-020 through FM-024 lifecycle metadata and handoffs
- Current validator and its Git provenance in FM-002 and the later migration-governance change

## Explicit Scope Boundaries

- Correct only the planned-task/Upcoming lifecycle rule; preserve all other registry, task-reference, dependency, path, backlog, API-evidence, and status-section checks.
- Do not modify FM-020 metadata, FM-021 task-attributable work, any other task packet, registries, runtime UI code, tests, package metadata, or generated files.
- Do not implement a new scheduler, infer product priority beyond recorded lifecycle state, or redesign task dependencies.

## Verification

- From repository root, run `node core/ui-react/scripts/validate-migration.mjs`; it must emit no lifecycle error requiring dependency-ready planned FM-023 or FM-024 to appear under Upcoming. The separately owned FM-020 registry-metadata diagnostics may keep this aggregate command nonzero until that correction lands and must be reported, not suppressed.
- Confirm the validator still requires every `ready`, `in_progress`, `review`, and `blocked` packet in its mapped `STATUS.md` section and still rejects lifecycle packets listed in an incompatible section.
- Run `git diff --check` and inspect task-attributable status/scope; only the three exact allowed paths may change.

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
