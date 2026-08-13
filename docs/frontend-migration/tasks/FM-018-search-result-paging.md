# FM-018: Search Result Paging

Status: planned Owner:
Feature IDs: F-SEARCH-RESULTS, F-SEARCH-PAGING Component IDs: C-RESULT-TABLE API IDs: API-SEARCH-EXECUTE Depends on: FM-014 Blocks: None

## Outcome

React search results can load the next server batch or all remaining results without repeating cache offsets, duplicating rows, or corrupting current sort/filter/group/selection state.

## Boundary Rationale

Continuation request construction, backend-offset tracking, response merge/deduplication, controls, and state reconciliation are atomic paging behavior. It is independent of form enrichment but depends on the established search/results/live
baseline.

## Decision Dependencies

- Accepted: ADR-0002, ADR-0003, ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/api/search.ts` and `core/ui-react/src/api/search.test.ts`
- `core/ui-react/src/features/search/{SearchPage.tsx,SearchPage.test.tsx,results/**}`
- `tests/system/tests/results.spec.ts`
- The `F-SEARCH-RESULTS`, `F-SEARCH-PAGING`, `C-RESULT-TABLE`, and `API-SEARCH-EXECUTE` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- New pagination API, search-form behavior, saved searches, or virtual scrolling

## Context To Read

- `CONTEXT.md`; accepted ADRs; FM-010 through FM-014 handoffs; listed records
- Legacy `search-results-controller.js` paging/offset logic, `search-service.js`, server search cache/request contracts, and result tests

## Acceptance

- Validation preserves server `offset`, `limit`, processed/available counts, `hasMoreResults`, and total-known metadata needed to determine continuation safely.
- Load-more uses the backend cache position, not visible/deduplicated row count; load-all requests the remaining work and both paths advance monotonically.
- Merging deduplicates by result identity while preserving newly returned valid data and current filtering, sorting, grouping, expansion, and valid visible selection semantics.
- Controls expose loading, disabled/exhausted, partial/malformed, and request-failure states accessibly and prevent concurrent duplicate continuation requests.
- Unit/component tests cover duplicate-heavy batches, unknown totals, zero-growth termination, partial failures, and state reconciliation; Playwright proves load-more and load-all with deterministic responses.
- Registry evidence records paging parity without changing endpoint ownership.

## Verification

- In `core/ui-react`: the complete npm quality/build/API/migration chain succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/results.spec.ts` succeeds.
- Run `git diff --check`; inspect status, scope, and generated artifacts.

## Handoff

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.
