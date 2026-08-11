# FM-011: Search Results Sorting And Filtering

Status: done Owner: OpenCode
Feature IDs: F-SEARCH-SORT-FILTER Component IDs: C-RESULT-TABLE API IDs: API-SEARCH-EXECUTE Depends on: FM-010 Blocks: FM-012, FM-013

## Outcome

React search results provide sortable columns, text/numeric/indexer/category/quick filters, and persisted table choices without corrupting malformed results or the core summary.

## Boundary Rationale

Sorting and filtering are one controlled TanStack Table capability over the FM-010 result set. They must update the same visible rows, rejection summary, and stored choices atomically; grouping, selection, paging, result actions, and server
preferences are separate decisions.

## Files Allowed To Modify

- `core/ui-react/package.json` and `core/ui-react/package-lock.json`, only to add `@tanstack/react-table` as a production dependency using the existing caret-range policy for TanStack packages
- `core/ui-react/src/api/search.ts` and `core/ui-react/src/api/search.test.ts`, only to preserve and test the existing search-response fields required by this task
- `core/ui-react/src/features/search/results/**`
- `tests/system/tests/results.spec.ts`
- The `F-SEARCH-SORT-FILTER`, `C-RESULT-TABLE`, and `API-SEARCH-EXECUTE` records only
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository. Context To Read is mandatory starting context, not a read allowlist. Do not modify files outside Files Allowed To Modify; escalate the exact path and reason if one is required.

## Out Of Scope

- New search submission, API endpoints, live updates, paging, grouping, row/bulk selection, downloads, and server-backed preferences
- Recreating legacy Angular table directives or adding a generic grid library

## Context To Read

- `CONTEXT.md`, `ADR-0002` through `ADR-0004`, and the FM-010 handoff
- `F-SEARCH-SORT-FILTER`, `C-RESULT-TABLE`, and `API-SEARCH-EXECUTE`
- `core/ui-src/js/search-results-controller.js` and `core/ui-src/js/directives/dataTableDirectives.js`
- `core/ui-src/html/states/search-results.html` and `tests/system/tests/results.spec.ts`

## Acceptance

- `C-RESULT-TABLE` uses TanStack Table primitives with explicit Hydra transformations; no second table/grid framework is introduced.
- `API-SEARCH-EXECUTE` response validation preserves valid `grabs`, `seeders`, `epoch`, and display `age` values needed by result sorting/filtering, treats absent or null optional counts as unavailable rather than corrupting an otherwise valid row, and retains FM-010 malformed-result handling; focused API tests cover this boundary.
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

- React results use controlled TanStack Table sorting plus explicit Hydra text, multi-select, numeric, and quick-filter transformations. Valid sortable response fields are retained; malformed rows remain excluded.
- Sorting/filter choices persist locally. Paging, grouping, selection, actions, and server-backed preferences remain excluded.
- Review corrections: active sort controls visibly state ascending or descending; selected source, quality, and other quick filters use legacy-compatible OR matching within each group; selected custom filters require every selected text and regex term to match. Quick-filter selection keys include both group and ID.

### Files Modified

- `core/ui-react/{package.json,package-lock.json,src/api/search.ts,src/api/search.test.ts,src/features/search/results/{SearchResults.tsx,SearchResults.test.tsx,resultTable.ts,resultTable.test.ts}}`
- `tests/system/tests/results.spec.ts`; `docs/frontend-migration/{FEATURES.yaml,COMPONENTS.yaml,APIS.yaml,tasks/FM-011-search-results-sort-filter.md}`.
- Scope confirmation: all task-attributable changes are within the packet allowlist; no unexpected generated artifacts are tracked.

### Toolchain

- Node `v26.6.0`; npm `11.18.0`; Maven `3.9.16`; Playwright Chromium.

### Verification

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Refreshed after the custom-filter correction: passed 18 files / 51 tests, production build, API check, and migration validation. Lint reported only existing Fast Refresh/RHF warnings plus TanStack Table's incompatible-library warning; `npm ci` reported 3 audit vulnerabilities (1 moderate, 2 high); Vite reported the existing chunk-size warning. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/results.spec.ts` | Refreshed after the custom-filter correction: passed 9 Playwright tests. The deterministic React flow covers every sortable column, visible ascending/descending state, indexer/category/grabs/age filters, and configured/preselected quick filters. |
| repository root | `git diff --check` | Passed. |
| repository root | `git status --short` | Inspected; all 13 task-attributable paths are allowed, including two new result-table source/test files. |

### Verification Basis

- Baseline: `10fb2e884b5a43b88ac99ad00539a87216bef4d0`.
- Classification: the prior quality-chain evidence was affected by `SearchResults.tsx`, `resultTable.ts`, and `resultTable.test.ts`; it was refreshed. The prior GUI evidence was affected by the runtime `resultTable.ts` change; it was refreshed. Diff/status evidence was affected by this handoff update; it was refreshed. No command evidence was reused for this correction.
- Command coverage: the React quality command covers `core/ui-react/package.json`, `core/ui-react/package-lock.json`, `core/ui-react/src/api/search.ts`, `core/ui-react/src/api/search.test.ts`, and all four `core/ui-react/src/features/search/results/*` implementation/test files. The GUI command additionally covers `tests/system/tests/results.spec.ts` and the React result implementation. Diff/status cover every task-owned path. Registry and packet documentation are excluded from implementation/test coverage.
- File-content manifest: `core/ui-react/package.json: 25da5897abda72cee61d0c936c0d4036e8d7f0db1bd07713338e4d95d8c61d73`; `core/ui-react/package-lock.json: 15c1ce0d90074f22f4c486be2ff1491175233db97f8a16dc768091a4cbf28eca`; `core/ui-react/src/api/search.ts: 9100c12dcb6d7ab1a2375f868578276083be376a97f997e9bbb519e741d3a215`; `core/ui-react/src/api/search.test.ts: b53e146927d408780fb638eb55dc0ba08b4525394eb69504ee416d0ffade9085`; `core/ui-react/src/features/search/results/SearchResults.tsx: 1842f3a2e2d4f76974fc317d72221eb00d192f3ebdb966ccdc181e2a990d7b32`; `core/ui-react/src/features/search/results/SearchResults.test.tsx: c64e2baba0d36f8f7d6a585a8c101dcab7cb0611a6c13c8aacae51ceb4d79d69`; `core/ui-react/src/features/search/results/resultTable.ts: ec560694f47a0ef16556fd77fb0750284b73d3f6283741f1db2a513d081f422b`; `core/ui-react/src/features/search/results/resultTable.test.ts: 072ae34d0f8d9b180a9c20cb4f41419c00fe19f641c509568d30236827a9f291`; `tests/system/tests/results.spec.ts: 079c97972fad143f16115fdd465fbb2ea8964719d79e81f788882f7b7143b347`.
- Completed after the last change to every listed implementation/test file: yes. Task-owned changes after verification: this packet handoff only; no implementation or test file changed after this basis was captured.

### Decisions

- TanStack Table owns controlled sorting and semantic table row rendering; explicit feature-local transformations apply Hydra title, multi-select, numeric, and quick filters before rows reach the table.
- Sorting and filters persist in browser local storage only. Unavailable optional `grabs` and `seeders` remain valid rows and do not match an active numeric range.

### Dependency Decisions

- Runtime: `@tanstack/react-table` is required by ADR-0002 and this task for controlled result-table primitives.
- Development: None.

### Architecture Decisions

- Followed ADR-0002 with MUI presentation and TanStack Table primitives, ADR-0003 with a focused API boundary validation update, and ADR-0004 with transformation, component, and Playwright coverage.
- ADR REQUIRED: None.

### Assumptions

- The page bootstrap payload remains available at `window.__NZBHYDRA_BOOTSTRAP__`; quick-filter controls are rendered only from its safe `searching` configuration.

### Unresolved issues

- None.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- Updated `F-SEARCH-SORT-FILTER`, `C-RESULT-TABLE`, and `API-SEARCH-EXECUTE` only.

### Follow-up

- Server-backed table preferences remain owned by `C-SERVER-PREFERENCES` and are not introduced by this task.
