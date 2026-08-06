# FM-001: Inventory Baseline

Status: ready Owner:
Feature IDs: all Component IDs: all API IDs: all Depends on: FM-000 Blocks: FM-002, FM-004, FM-005, FM-006, FM-007, FM-008

## Outcome

Expand the initial registries into a reliable parity and contract inventory covering every legacy route and reusable behavior without implementing React code.

## Allowed Files

- `docs/frontend-migration/FEATURES.yaml`
- `docs/frontend-migration/COMPONENTS.yaml`
- `docs/frontend-migration/APIS.yaml`
- `docs/frontend-migration/STATUS.md`
- This task packet
- `tests/system/UI_API_CONTRACT_INVENTORY.md` only to replace stale claims with a pointer
- `tests/system/SYSTEM_TEST_COVERAGE_PLAN.md` only to replace stale claims with a pointer

## Out Of Scope

- React scaffolding or implementation
- Backend or legacy frontend changes
- Detailed implementation task creation

## Context To Read

- `CONTEXT.md`
- `ADR-0002`, `ADR-0003`, and `ADR-0004`
- `core/ui-src/js/nzbhydra.js`
- `tests/system/UI_API_CONTRACT_INVENTORY.md`
- `tests/system/SYSTEM_TEST_COVERAGE_PLAN.md`

## Acceptance

- Every AngularJS route has a feature record with roles, legacy sources, tests, and target area.
- Search and configuration are decomposed into behavior-level feature records suitable for acceptance tracking.
- Reusable directives/services are classified as MUI usage, shared Hydra components, or feature-specific code.
- Active legacy HTTP and STOMP operations have API records; stale calls are clearly marked unverified rather than adopted.
- Existing Playwright selectors and coverage gaps are linked without copying test bodies.
- Duplicate IDs and duplicate active method/path API records are absent.

## Verification

- Parse all three YAML registries.
- Search every route state and direct `internalapi` reference against the inventory.
- Confirm the diff contains documentation only.

## Handoff

Record inventory totals, unresolved legacy calls, known coverage gaps, verification evidence, and proposed bounded follow-up tasks. Mark this task `review` when complete.
