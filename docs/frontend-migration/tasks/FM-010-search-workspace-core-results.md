# FM-010: Search Workspace And Core Results

Status: done Owner: OpenCode
Feature IDs: F-SEARCH-FORM, F-SEARCH-RESULTS Component IDs: C-CATEGORY-CATALOG, C-RESULT-TABLE API IDs: API-SEARCH-EXECUTE Depends on: FM-005, FM-006, FM-007, FM-009 Blocks: FM-011, FM-012, FM-013, FM-014

## Outcome

The React `/` route provides a usable basic search: configured category defaults and numeric criteria are URL-backed, a valid request executes through the shared transport, and core results render with intentional success, empty, failure,
and malformed-data states.

## Boundary Rationale

The form, request transformation, response validation, and first results presentation are one executable user workflow. Category lookup is shared with future configuration work, so this task establishes `C-CATEGORY-CATALOG`; richer media,
indexer-selection, history, live-progress, filtering, grouping, paging, and downloads remain separate capabilities.

## Files Allowed To Modify

- `core/ui-react/package.json` and `core/ui-react/package-lock.json`, only to add exact production dependencies `react-hook-form` and `zod` compatible with the declared React and TypeScript toolchain
- `core/ui-react/src/router.tsx` and `core/ui-react/src/router.test.tsx`
- `core/ui-react/src/api/search.ts` and `core/ui-react/src/api/search.test.ts`
- `core/ui-react/src/domain/categories/**`
- `core/ui-react/src/features/search/{SearchPage.tsx,SearchPage.test.tsx,workspace/**,results/**}`
- `tests/system/tests/search.spec.ts`
- The `F-SEARCH-FORM`, `F-SEARCH-RESULTS`, `C-CATEGORY-CATALOG`, `C-RESULT-TABLE`, and `API-SEARCH-EXECUTE` records only
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository. Context To Read is mandatory starting context, not a read allowlist. Do not modify files outside Files Allowed To Modify; escalate the exact path and reason if one is required.

## Out Of Scope

- Autocomplete/identifier refinement, selectable indexers, recent searches, guided tour, STOMP progress, paging, saved searches, sorting/filtering, grouping/selection, and downloads
- Spring mappings, generated OpenAPI types, and changes to the shared transport

## Context To Read

- `CONTEXT.md`, `ADR-0001` through `ADR-0004`, and FM-005 through FM-009 handoffs
- `F-SEARCH-FORM`, `F-SEARCH-RESULTS`, `C-CATEGORY-CATALOG`, `C-RESULT-TABLE`, and `API-SEARCH-EXECUTE`
- `core/ui-src/js/{categories-service,search-controller,search-request-service,search-service,search-results-controller}.js`
- `core/ui-src/html/{states/search.html,states/search-results.html,directives/search-result.html}` and `SearchWeb`

## Acceptance

- The canonical base-aware `/` React route replaces only its migration placeholder and preserves the legacy switch and Spring role protection.
- The form restores and updates valid query, category, age, and size criteria through canonical URL semantics; category defaults and size presets use validated `C-CATEGORY-CATALOG` data from bootstrap safe configuration.
- Submit generates a numeric request ID, uses `API-SEARCH-EXECUTE` through `C-API-TRANSPORT`, sends `loadAll: false`, and prevents an empty configured-indexer selection from issuing a search. Rich indexer controls remain absent.
- Core results preserve `search-query`, `search-submit`, `search-category-control`, `search-category-option-*`, `search-results`, `indexer-limit-warnings`, `search-results-summary`, `search-results-table`, `search-result-row`, and
  `search-result-title` selectors where rendered.
- Response-boundary validation intentionally handles request errors, no picked indexers, all-indexer failure, no results, quota warnings, rejected-result counts, and malformed or titleless entries without breaking rendering.
- Focused component tests cover URL/form/request transformation and every result state. Playwright exercises a React-selected shell with mocked indexers, confirms the request and displayed results, and compares preserved selectors with
  legacy at desktop and 390 px widths.
- Registry records identify concrete target/test evidence and no wider parity is claimed.

## Verification

- In `core/ui-react`: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts` succeeds after its React coverage is added.
- From repository root: `git diff --check` and `git status --short`; inspect all task-owned paths, confirm scope compliance, and report unexpected generated files.

## Handoff

### Outcome

- The React base-aware canonical `/` route now has basic search with bootstrap-validated categories, URL-backed criteria, configured preselected indexers, numeric request IDs, and `loadAll: false` requests through the shared transport.
- Core results handle valid rows, empty, all-indexer failure, no picked indexers, request failure, quota warnings, rejected counts, malformed envelopes, and skipped malformed/titleless entries. Autocomplete, selectable indexers, history, live progress, paging, sorting/filtering, grouping, and downloads remain excluded.

### Files Modified

- `core/ui-react/{package.json,package-lock.json,src/router*,src/api/search*,src/domain/categories/catalog.ts,src/features/search/**}`, `tests/system/tests/search.spec.ts`, named registry records, `STATUS.md`, and this packet.
- Scope confirmation: all task-attributable modifications are allowed; no pre-invocation changes or unexpected generated files exist; all task files are unstaged.

### Toolchain

- Node `v26.6.0`; npm `11.18.0`; Maven `3.9.16`; Playwright Chromium.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed after correction: 17 files / 42 tests. Non-failing Fast Refresh/RHF compiler and Vite chunk-size warnings only. `npm ci` reported 3 audit vulnerabilities (1 moderate, 2 high). |
| repository root | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts` | Passed: 6 tests, including React selected-shell mocked indexers, legacy selector comparison, and 390px overflow. |
| repository root | `git diff --check` | Passed. |

### Verification Basis

- Baseline: `85b53a5d23ae8fb586db8530f67902975ccfafb1`. Quality covers all listed React implementation/tests; GUI covers `tests/system/tests/search.spec.ts` plus the search implementation; diff check covers all task changes. Completed after the correction implementation/test changes: yes. Post-verification changes are documentation-only.
- SHA-256: `package.json 23996fa5ac74ce5562803a5764df525dc9a2f35cf7134264705a74372a5c4c8a`; `package-lock.json 9b3149fa2dc29de0c41154ba6728e1510b9174da71b5df53b4ff2d384c30ba74`; `router.tsx 35fe1208ff8c600350cc1571edd28ef0cfdbb99422449257238564da784a64cb`; `router.test.tsx 61cbafbe68258054d45e639257e658df1ca73f2b1a71aeea74efd3fd924848c2`; `api/search.ts eca90b41a3d9a5be9fb9d7a98ba457ed35fc66f62c5b98d22476b8ed3190b3a9`; `api/search.test.ts 7bbc1717dea2ea8dda42104ca5e6c073fc0b98f34f2e853ed16cb56ee43b6459`; `domain/categories/catalog.ts a76a337e3caaa6d7ce62961f784ac9ff07efdfa2dabef4a9922753c628e14bae`; `SearchPage.tsx 5ea2ceb6a12f0a31ac7ce1481839306bd3c66de9e6e07fc5c0d6b800699887fb`; `SearchPage.test.tsx ff83dcc2cf38ec2951bfba32c0b5e6eee5ef28e6a20d0822e022e4a4540c83f1`; `SearchWorkspace.tsx 91de140f3b9a42531c3ec79697f00b9e6eaedf07ba9b47eccddacccc1043a52b`; `SearchWorkspace.test.tsx c8338c9b8e1089e49f4381550e1d486dd48a70dfb112be787053326123bdb342`; `SearchResults.tsx 79e99ea9dd1f7bddcc1919f2e9f56d40860fd5a859d80ff00bbea43b5e209ffe`; `SearchResults.test.tsx 628ac96ade16b2ba51cada6b0e3799f275d2655b7400ec79ee7ecf5fddfd7392`; `tests/system/tests/search.spec.ts 326cef32ce8fcc3011cb130e894279fee0f2a2b97a8ad06a6dc53b6ab033c948`.

### Dependency Decisions

- Runtime: exact `react-hook-form 7.85.0` for form state and `zod 4.4.3` for validation. Development: None.

### Assumptions

- Safe-config `preselect` is the basic-search configured selection; absent/invalid configuration produces no selectable indexers and no request.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- Updated only `F-SEARCH-FORM`, `F-SEARCH-RESULTS`, `C-CATEGORY-CATALOG`, `C-RESULT-TABLE`, and `API-SEARCH-EXECUTE` with concrete targets/tests.

### Follow-Up Work

- FM-011 through FM-014 retain sorting/filtering, grouping/selection, downloads, and live progress.
