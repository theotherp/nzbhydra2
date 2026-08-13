# FM-021: Search History Route

Status: planned Owner:
Feature IDs: F-HISTORY-SEARCHES Component IDs: C-DATE-TIME, C-CATEGORY-CATALOG API IDs: API-HISTORY-SEARCHES, API-HISTORY-SEARCH-DETAILS, API-SEARCH-REDIRECT-RID Depends on: FM-017, FM-020 Blocks: None

## Outcome

Stats users can page, sort, filter, inspect, refresh, and repeat searches on canonical `/stats/searches` with the existing stable selectors.

## Boundary Rationale

The paged list, request filters, detail dialog, and repeat action operate on one history record contract and together make the route useful. Recent search supplies shared criteria mapping; other history tables have distinct DTOs/actions.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/router.tsx`, `core/ui-react/src/router.test.tsx`
- New search-history API/domain/UI files under `core/ui-react/src/api/**` and `core/ui-react/src/features/stats/history/**`
- Shared recent-history criteria transformation files introduced by FM-017, only for reuse required by repeat
- `tests/system/tests/search-history.spec.ts`
- The listed feature/component/API records only; this task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Saved/download/notification history, history mutation, or aggregate statistics

## Context To Read

- `CONTEXT.md`; accepted ADRs; FM-017/FM-020 handoffs; listed records
- Legacy search history controller/service/templates, history request factory, `HistoryWeb`, DTO/details contracts, and system tests

## Acceptance

- The route preserves stats authorization and stable `search-history-*` selectors; loading, empty, malformed, partial, and failure states are accessible.
- Server paging/sorting/filtering covers time, query, category, source, optional user agent, username, and IP according to safe-config visibility, with refresh retaining current controls.
- Rows render complete criteria and safe identifier links; date/time uses `C-DATE-TIME` and no server content is trusted as HTML.
- Repeat maps all supported criteria into canonical search state and executes with currently eligible indexers; details validate and show related indexer searches including response times.
- Focused tests cover request transformation, visibility rules, paging/filter combinations, details, and repeat; Playwright extends existing deterministic row/repeat/details flows to React and legacy comparison.
- Registry evidence records full route adoption.

## Verification

- In `core/ui-react`: the complete npm quality/build/API/migration chain succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search-history.spec.ts` succeeds.
- Run `git diff --check`; inspect status, allowed scope, and generated artifacts.

## Handoff

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.
