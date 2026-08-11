# FM-011: Search Results Sorting And Filtering

Status: planned Owner:
Feature IDs: F-SEARCH-SORT-FILTER Component IDs: C-RESULT-TABLE API IDs: none Depends on: FM-010 Blocks: FM-012, FM-013

## Outcome

React search results provide sortable columns, text/numeric/indexer/category/quick filters, and persisted table choices without corrupting malformed results or the core summary.

## Boundary Rationale

Sorting and filtering are one controlled TanStack Table capability over the FM-010 result set. They must update the same visible rows, rejection summary, and stored choices atomically; grouping, selection, paging, result actions, and server
preferences are separate decisions.

## Files Allowed To Modify

- `core/ui-react/package.json` and `core/ui-react/package-lock.json`, only to add `@tanstack/react-table` as a production dependency using the existing caret-range policy for TanStack packages
- `core/ui-react/src/features/search/results/**`
- `tests/system/tests/results.spec.ts`
- The `F-SEARCH-SORT-FILTER` and `C-RESULT-TABLE` records only
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository. Context To Read is mandatory starting context, not a read allowlist. Do not modify files outside Files Allowed To Modify; escalate the exact path and reason if one is required.

## Out Of Scope

- New search submission, API endpoints, live updates, paging, grouping, row/bulk selection, downloads, and server-backed preferences
- Recreating legacy Angular table directives or adding a generic grid library

## Context To Read

- `CONTEXT.md`, `ADR-0002`, `ADR-0004`, and the FM-010 handoff
- `F-SEARCH-SORT-FILTER` and `C-RESULT-TABLE`
- `core/ui-src/js/search-results-controller.js` and `core/ui-src/js/directives/dataTableDirectives.js`
- `core/ui-src/html/states/search-results.html` and `tests/system/tests/results.spec.ts`

## Acceptance

- `C-RESULT-TABLE` uses TanStack Table primitives with explicit Hydra transformations; no second table/grid framework is introduced.
- Title, indexer, category, size, grabs/seeders, and age have accessible sort controls with compatible defaults and visible sort state; initial URL sort criteria remain supported where FM-010 exposes them.
- Title text filtering supports words, `!` exclusions, and slash-delimited regular expressions; invalid expressions are non-matches and do not throw.
- Indexer/category multi-filter and size/grabs/age numeric ranges filter rendered rows intentionally; clearing a numeric filter removes both bounds and restores applicable rows.
- Safe-configured source, quality, other, and custom quick filters render only when enabled, preserve preselection, and never treat invalid configured regular expressions as matches.
- Existing sort/filter `data-testid` contracts remain stable. Unit/component tests cover transformations and accessibility; Playwright runs deterministic legacy and React sort/filter flows.
- The result summary and selection state remain coherent after filtering; grouping, paging, and actions remain unimplemented rather than approximated.

## Verification

- In `core/ui-react`: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/results.spec.ts` succeeds with React coverage for every accepted filter/sort behavior.
- From repository root: `git diff --check` and `git status --short`; confirm all changed/generated paths are allowed and report unexpected artifacts.

## Handoff

### Result

Record delivered sorting/filtering parity and exclusions.

### Verification

Use `templates/handoff.md`; record commands, results, scope check, and SHA-256 verification basis.

### Decisions

Record persistence and malformed-data handling decisions.

### Dependency/toolchain decisions

Record dependencies, versions, and actual Node/npm versions, or `None`.

### Assumptions

Record material assumptions, or `None`.

### Unresolved issues

Record deferred or blocked work, or `None`.

### Follow-up

Record bounded follow-up proposals, or `None`.
