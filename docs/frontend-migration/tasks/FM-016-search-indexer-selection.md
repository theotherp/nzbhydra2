# FM-016: Search Indexer Selection

Status: done Owner: OpenCode
Feature IDs: F-SEARCH-FORM, F-SEARCH-INDEXERS Component IDs: C-CATEGORY-CATALOG API IDs: API-SEARCH-EXECUTE Depends on: FM-025 Blocks: FM-017

## Outcome

React search users who may choose indexers can select eligible individual sources, types, and groups, restore configured/URL selections, and submit exactly that selection.

## Boundary Rationale

Eligibility, selection controls, URL serialization, and request construction must change together to make source selection truthful. Media refinement precedes this because both own the form/request model; recent-search reuse follows because
it must refill the final selection semantics.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/{SearchPage.tsx,SearchPage.test.tsx,workspace/**}`
- `core/ui-react/src/domain/categories/**`
- `tests/system/tests/search.spec.ts`
- The `F-SEARCH-FORM`, `F-SEARCH-INDEXERS`, `C-CATEGORY-CATALOG`, and `API-SEARCH-EXECUTE` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Indexer configuration, result filtering/status, recent searches, or changing search endpoint semantics

## Context To Read

- `CONTEXT.md`; accepted ADRs; FM-010 and FM-015 handoffs; listed records
- Legacy `search-controller.js`, `multiselect-dropdown.js`, `states/search.html`, bootstrap safe config/permissions, and search tests

## Acceptance

- Controls appear only when session/bootstrap permission permits and include category-eligible `showOnSearch` sources with disabled/unavailable behavior preserved.
- Dropdown and configured checkbox presentations support individual selection, all/none/invert, preselection reset, Usenet/Torznab type selection, and named groups with accessible state.
- Category changes reconcile eligibility without retaining hidden invalid selections; explicit canonical `indexers` criteria restore valid selections, while absent criteria use preselection.
- Submission serializes canonical selection and sends exactly those indexers; zero selection issues no search and gives accessible feedback.
- Component/domain tests cover permissions, eligibility, every bulk action, category transitions, and URL/request round trips; Playwright exercises both configured presentations and legacy-equivalent selection.
- Registry records identify concrete target/test evidence.

## Verification

- In `core/ui-react`: full quality chain `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts` succeeds.
- Run `git diff --check`; inspect status for allowed scope and unexpected generated files.

## Handoff

### Outcome

- React search now derives category-eligible `showOnSearch` indexers from safe configuration, restoring valid canonical `indexers` criteria or category preselection when absent.
- Permission-gated MUI dropdown and checkbox presentations support accessible individual selection, all/none/invert, preselection reset, Usenet/Torznab, and named-group actions. Searches submit exactly the selected names; zero selection announces feedback without issuing a request.

### Files Modified

- `core/ui-react/src/domain/categories/catalog.{ts,test.ts}`.
- `core/ui-react/src/features/search/{SearchPage.{tsx,test.tsx},workspace/SearchWorkspace.{tsx,test.tsx}}`.
- `tests/system/tests/search.spec.ts`.
- `docs/frontend-migration/{APIS.yaml,COMPONENTS.yaml,FEATURES.yaml,STATUS.md,tasks/FM-016-search-indexer-selection.md}`.
- Scope confirmation: all resumed and current FM-016 changes are in the packet allowlist; no unrelated pre-existing paths, unexpected generated files, staging, commits, or pushes were introduced.

### Toolchain

- Node: `v26.6.0`
- Package manager: `npm 11.18.0`
- Other material tools: Maven `3.9.16`, Java `26.0.2`, Playwright Chromium.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Affected by the `SearchWorkspace` component-test correction; rerun and passed: 23 files / 109 tests. Existing React Hook Form/Fast Refresh lint warnings, Node localStorage experimental warnings, Vite chunk-size warning, and `npm ci` audit report (1 moderate, 2 high) remain non-failing. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts` | Reusable prior evidence: passed 9 Playwright tests, including explicit React dropdown and checkbox selection submissions. The correction changes only a component test; all packaged runtime files and `tests/system/tests/search.spec.ts` remain byte-identical to the prior GUI verification basis. |
| repository root | `git diff --check` | Affected by the correction and handoff update; rerun and passed. |
| IDE | inspections for task implementation/test files | Passed: no errors. |

### Verification Basis

- Baseline: `a3f76bf136b7db5ee9a2117c20243db854a73112`.
- Command coverage and classification: the React quality chain covers `core/ui-react/src/domain/categories/catalog.{ts,test.ts}`, `core/ui-react/src/features/search/SearchPage.{tsx,test.tsx}`, and `core/ui-react/src/features/search/workspace/SearchWorkspace.{tsx,test.tsx}`; it was affected and rerun because `SearchWorkspace.test.tsx` changed. GUI covers packaged runtime files `catalog.ts`, `SearchPage.tsx`, `SearchWorkspace.tsx`, plus `tests/system/tests/search.spec.ts`; it is reusable because none changed. Diff check covers all task-owned files; it was affected and rerun.
- File-content manifest: `core/ui-react/src/domain/categories/catalog.ts: fa20c36d3990a9caf1af739fcdfee928e997d4967037285b38a4e977c677504c`; `core/ui-react/src/domain/categories/catalog.test.ts: 1399385d923a283f1f9977e2d024d5e9ad81edae9e99a1033495c8dcbb7f659f`; `core/ui-react/src/features/search/SearchPage.tsx: 73514d21105e80fb5270fee5ad00b433e2553f28e88dca3203ac2b57db94257c`; `core/ui-react/src/features/search/SearchPage.test.tsx: f0ad66fa4e133a66315e6b34c94e5af9ffa14d434ddb2a6d6b1871171d989105`; `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx: c7d0b788466d5f8f36c52421370e2afa094375981cd2aa2fdf84b94dfc613959`; `core/ui-react/src/features/search/workspace/SearchWorkspace.test.tsx: 0bdc06be443686991d9e27cea68777be48cb4c404d51b4ca4152a418e490f59c`; `tests/system/tests/search.spec.ts: 7c210e70f856169ec9c214c648ad9bacf8627ee79a68e6da4bf1581730030d54`.
- Completed after the last change to each command's listed files: React quality chain and diff check, yes; GUI reusable from prior evidence because every covered runtime/system-test file is unchanged.
- Task-owned changes after verification: documentation-only `docs/frontend-migration/tasks/FM-016-search-indexer-selection.md` handoff refresh.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- ADR-0001 retains the canonical route and selected React shell; ADR-0002 uses existing MUI and React Hook Form; ADR-0003 retains the existing handwritten search transport; ADR-0004 supplies domain/component and Playwright parity evidence.
- ADR REQUIRED proposal triggered during this task: None.

### Assumptions

- The safe-config `showOnSearch` value is the backend eligibility signal; category eligibility and `preselect` preserve the corresponding legacy selection rules.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- Updated `F-SEARCH-FORM`, `F-SEARCH-INDEXERS`, `C-CATEGORY-CATALOG`, and `API-SEARCH-EXECUTE` with concrete implementation and test evidence.

### Follow-Up Work

- FM-017 may consume canonical `indexers` criteria for recent-search refill; it is otherwise outside this task.
