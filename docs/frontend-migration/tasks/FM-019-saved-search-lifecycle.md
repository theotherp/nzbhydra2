# FM-019: Saved Search Lifecycle

Status: planned Owner:
Feature IDs: F-SEARCH-SAVED, F-HISTORY-SAVED-SEARCHES, F-SEARCH-FORM, F-SEARCH-MEDIA Component IDs: C-CATEGORY-CATALOG, C-EXTERNAL-LINKS API IDs: API-SEARCH-SAVED-CREATE, API-SEARCH-SAVED-LIST, API-SEARCH-SAVED-DELETE,
API-SEARCH-REDIRECT-RID Depends on: FM-017 Blocks: FM-020

## Outcome

Users can save the executed React search and stats-authorized users can list, reopen, and delete saved searches at canonical `/stats/saved-searches`.

## Boundary Rationale

Creation is only verifiable as a durable capability with listing, reuse, and deletion, all sharing one criteria transformation. The task follows complete media/recent criteria; other history pages have independent paging APIs and records.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/router.tsx`, `core/ui-react/src/router.test.tsx`
- New saved-search API/domain/UI files under `core/ui-react/src/api/**`, `core/ui-react/src/features/search/**`, and `core/ui-react/src/features/stats/history/**`
- `tests/system/tests/search.spec.ts`
- The listed feature/component/API records only; this task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Other stats tabs/history endpoints, editing saved entries, or changing persistence/order semantics

## Context To Read

- `CONTEXT.md`; accepted ADRs; FM-008 and FM-015 through FM-017 handoffs; listed records
- Legacy result save action, `saved-searches-controller.js`/template, `SavedSearchesWeb`, `SavedSearchRequest`, generated types, and search tests

## Acceptance

- Save is enabled only for an executed search, posts the validated complete request through shared transport, and gives accessible success/failure feedback without duplicate accidental submission.
- Base-aware canonical `/stats/saved-searches` retains Spring stats-role protection and intentionally renders loading, empty, malformed, failure, and populated states.
- Rows safely present all criteria; reopen uses the shared canonical transformation and delete confirms intent, calls the indexed endpoint, and reconciles server order only after success.
- TVRage redirect links use `API-SEARCH-REDIRECT-RID`; all external links follow the existing safe URL policy without HTML trust.
- Tests cover create/list/reopen/delete, role routing, criteria round trips, stale indices, and failures; Playwright saves, opens, reruns, and deletes a deterministic search in React with legacy comparison.
- Registry evidence records both feature records and four API contracts without claiming the remaining stats shell complete.

## Verification

- In `core/ui-react`: the complete npm quality/build/API/migration chain succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts` succeeds.
- Run `git diff --check`; inspect status, allowed scope, and generated artifacts.

## Handoff

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.
