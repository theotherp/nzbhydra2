# FM-020: History And Stats Shell With Indexer Status

Status: planned Owner:
Feature IDs: F-STATS-SHELL, F-STATS-INDEXERS Component IDs: C-APP-SHELL, C-DATE-TIME API IDs: API-STATS-INDEXER-STATUSES Depends on: FM-019 Blocks: FM-021, FM-022, FM-023, FM-024

## Outcome

The React `/stats` area provides permission/configuration-aware canonical tabs and a complete indexer-status page with server-timezone-aware status dates and VIP warnings.

## Boundary Rationale

The shell needs one useful default route; indexer status is the bounded read-only default and establishes date-time behavior required by every later history page. Other tabs have independent paging or aggregate-stat contracts.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/router.tsx`, `core/ui-react/src/router.test.tsx`, and focused app navigation files under `core/ui-react/src/app/**`
- `core/ui-react/src/domain/date-time/**`, `core/ui-react/src/api/stats/**`, `core/ui-react/src/features/stats/**`
- `tests/system/tests/stats.spec.ts` and `tests/system/tests/search-history.spec.ts`
- The listed feature/component/API records only; this task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Search/download/notification history content, aggregate charts, saved-search behavior already owned by FM-019, or indexer configuration

## Context To Read

- `CONTEXT.md`; accepted ADRs; FM-004/FM-006/FM-008/FM-019 handoffs; listed records
- Legacy stats route definitions, `states/stats.html`, indexer status controller/template, bootstrap timezone/keepHistory/permissions, server endpoint and linked tests

## Acceptance

- Base-aware `/stats` and `/stats/indexers` preserve stats-role protection and expose canonical tabs; keep-history tabs follow safe config and unavailable routes retain migration fallback until implemented.
- `API-STATS-INDEXER-STATUSES` is runtime-validated and renders sorted state, disable times/reasons, limits/resets, and VIP expiry/warnings with accessible table/responsive behavior.
- `C-DATE-TIME` consistently parses epoch, numeric strings, offset timestamps, and server-zone-local values from bootstrap, with explicit invalid/absent behavior.
- Loading, empty, malformed-entry, request failure, and partial data states are intentional; navigation and status semantics are keyboard accessible.
- Unit/component tests exhaust date parsing and status rules; Playwright validates tab visibility/roles and deterministic statuses at desktop/mobile widths.
- Registry records identify concrete shell, date-time, feature, and endpoint evidence.

## Verification

- In `core/ui-react`: the complete npm quality/build/API/migration chain succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/stats.spec.ts tests/search-history.spec.ts` succeeds.
- Run `git diff --check`; inspect status, scope, and generated artifacts.

## Handoff

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.
