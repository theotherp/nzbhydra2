# FM-017: Recent Search Reuse

Status: blocked Owner:
Feature IDs: F-SEARCH-RECENT, F-SEARCH-FORM, F-SEARCH-MEDIA, F-SEARCH-INDEXERS Component IDs: C-CATEGORY-CATALOG API IDs: API-HISTORY-RECENT-SEARCHES, API-SEARCH-EXECUTE Depends on: FM-016, FM-025 Blocks: FM-019, FM-021

## Outcome

The React search page lists recent searches and can refill or immediately repeat their complete supported criteria, including drag-to-refill where the platform supports it.

## Boundary Rationale

Recent retrieval, safe request parsing, criteria transformation, refill/repeat behavior, and accessible drag alternative form one reuse workflow. It follows media/indexer work so it can round-trip the complete form; the full stats history
route is a separate role-protected paging capability.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- New recent-history API/domain files under `core/ui-react/src/api/**` and `core/ui-react/src/features/search/history/**`
- `core/ui-react/src/features/search/{SearchPage.tsx,SearchPage.test.tsx,workspace/**}`
- `tests/system/tests/search-history.spec.ts` and `tests/system/tests/search.spec.ts`
- The listed feature/API records only; this task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Stats search-history route, saved searches, server history deletion, or guided tour

## Context To Read

- `CONTEXT.md`; accepted ADRs; FM-015/FM-016 handoffs; listed records
- Legacy `search-controller.js`, `search-history-service.js`, recent dropdown template, `SearchEntityTO`, `HistoryWeb`, and linked system tests

## Acceptance

- `API-HISTORY-RECENT-SEARCHES` is called through shared transport only when no search is active; malformed entries are isolated and loading/empty/failure states are accessible.
- Recent entries describe category, query/title, identifiers, season/episode, age/size, and source criteria without unsafe HTML.
- Refill and repeat use one tested transformation into canonical React search state, preserve supported criteria, and reconcile unavailable indexers; repeat executes through the existing submission lifecycle.
- Pointer drag-to-refill works without making drag the only interaction; keyboard/touch users have an equivalent explicit action.
- Focused tests cover payload validation and every criteria mapping; Playwright creates a search, observes it in recent history, refills, and repeats in React while retaining legacy coverage.
- Registry evidence records concrete adoption without claiming full history-route parity.

## Verification

- In `core/ui-react`: the complete npm quality/build/API/migration chain succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts tests/search-history.spec.ts` succeeds.
- Run `git diff --check`; inspect status, allowed scope, and unexpected generated files.

## Handoff

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.
