# FM-001: Inventory Baseline

Status: done Owner: OpenCode
Feature IDs: all Component IDs: all API IDs: all Depends on: FM-000 Blocks: FM-002, FM-004, FM-005, FM-006, FM-007, FM-008

## Outcome

Expand the initial registries into a reliable parity and contract inventory covering every legacy route and reusable behavior without implementing React code.

## Files Allowed To Modify

- `docs/frontend-migration/FEATURES.yaml`
- `docs/frontend-migration/COMPONENTS.yaml`
- `docs/frontend-migration/APIS.yaml`
- `docs/frontend-migration/STATUS.md`
- This task packet
- `tests/system/UI_API_CONTRACT_INVENTORY.md` only to replace stale claims with a pointer
- `tests/system/SYSTEM_TEST_COVERAGE_PLAN.md` only to replace stale claims with a pointer

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify.

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
- Search the entire repository for AngularJS route/state definitions.
- Search the entire legacy frontend source tree for HTTP, internalapi, and STOMP operations.
- Reconcile every discovered operation against APIS.yaml.
- Confirm the diff contains documentation only.

## Handoff

Record inventory totals, unresolved legacy calls, known coverage gaps, verification evidence, and proposed bounded follow-up tasks. Mark this task `review` when complete.

- Totals: 40 feature records cover all 29 AngularJS states; 17 target component/service records plus grouped legacy classifications; 105 active API/STOMP registry records; 9 unverified legacy calls. The active registry count was parsed from
  the 105 entries under `apis`; all 105 distinct direct JS/HTML legacy API strings reconcile to those active or unverified records.
- Unverified: active migration URL/files/messages calls have no current backend mapping. Unused or non-emitted references remain recorded for connection tests, admin probing, the stale NZB filter, old RID redirect, and disabled error
  logging.
- Coverage gaps: auth and role routing, configured URL bases, most configuration sections and transaction semantics, system routes, live channels, search paging/grouping/bulk actions, saved-search lifecycle, and stable configuration
  selectors.
- Verification: all three YAML registries parsed; IDs and active method/path pairs are unique; every router state and 105 distinct direct JS/HTML API strings are represented by the 105 active registry records or 9 unverified records; linked
  sources/tests and component consumers resolve; IntelliJ
  inspections and project build passed; diff is documentation-only and limited to allowed files.
- Follow-up proposals: add focused parity coverage for authentication/deployment, search behaviors, configuration transactions, history/statistics, and system/live workflows; resolve or remove the legacy migration UI before adopting its
  calls.
