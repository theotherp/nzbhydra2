# FM-007: OpenAPI Types And First Endpoint

Status: planned Owner:
Feature IDs: F-PLATFORM-SHELL Component IDs: C-API-TRANSPORT API IDs: selected by the task owner from APIS.yaml Depends on: FM-001, FM-002, FM-005 Blocks: FM-008

## Outcome

Generate reproducible TypeScript API types and adopt one simple read-only endpoint through the shared transport without generating a second client architecture.

## Files Allowed To Modify

- React API generation configuration, generated types, and focused tests
- Java/OpenAPI annotations for the selected endpoint only
- React package scripts and lockfile
- Relevant API registry records
- `docs/frontend-migration/STATUS.md`
- This task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Whole-spec cleanup
- Generated transport or React Query hooks
- Binary, multipart, login/logout, or STOMP operations
- Feature page implementation

## Context To Read

- `ADR-0003` and `ADR-0004`
- `core/openapi.json`
- The selected API's Java contract and legacy caller

## Acceptance

- Generation is deterministic and available through one package script.
- Generated files carry a no-manual-edit marker.
- The selected operation has stable method/path semantics and useful response typing.
- Runtime calls use `C-API-TRANSPORT`, not generator defaults.
- CI or a focused check detects stale generated types.
- The API registry records contract quality, target caller, and test evidence.

## Verification

- Regenerate and prove a clean diff on a second run.
- React typecheck, lint, unit tests, and build.
- Focused backend contract test if Java metadata changes.

## Handoff

Record generator/version, selected endpoint, source contract corrections, verification, and remaining spec weaknesses. Mark this task `review` when complete.
