# FM-019: Saved Search Lifecycle

Status: done Owner: OpenCode
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
- `core/ui-react/src/domain/links/**`
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
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts` succeeds.
- Run `git diff --check`; inspect status, allowed scope, and generated artifacts.

## Handoff

### Outcome

- Added executed-search saving with duplicate-submission protection and accessible success/failure toast feedback.
- Added the base-aware canonical saved-search route with validated loading, empty, malformed, failure, list, reopen, confirm-delete, and post-success reconciliation behavior.

### Files Modified

- Saved-search API, criteria transformation, external-link policy, route/page, search result save action, and focused React tests under `core/ui-react/src`.
- `tests/system/tests/search.spec.ts`; the named feature/component/API registry records; this packet and `STATUS.md`.
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`; no generated production assets are tracked.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: Maven `3.9.16`, Playwright Chromium.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed: 29 files / 132 tests. Existing five non-failing lint warnings, npm audit findings (1 moderate, 3 high), Node localStorage warnings, and Vite chunk-size warning remain. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts` | Passed: Maven package and 11 Playwright tests, including React save/reopen/rerun/delete and legacy list comparison. |
| repository root | `git diff --check` | Passed before this documentation-only handoff/status update; rerun after it. |

### Verification Basis

- Baseline: `63bead300df2dd0ba8ef2e071b7bf7f76bf39e5b`.
- Command coverage: the React quality chain covers every listed React implementation/test file and registry validation; GUI additionally packages those runtime files and covers `tests/system/tests/search.spec.ts`; diff check covers all task-owned paths.
- File-content manifest: `core/ui-react/src/api/savedSearches.ts: 57d4d5196ba83f9765f9992ce758450bf044213a8a30557f3efe614529b2435b`; `core/ui-react/src/api/savedSearches.test.ts: 97be7f8c138756ef6dae91fd0f3cf8268129314e76e9f6204c14d23eec71eafc`; `core/ui-react/src/domain/links/externalLinks.ts: 378615769f311c8465cd58f023c963e27700af454d20b67312afaf08b9af9e5a`; `core/ui-react/src/domain/links/externalLinks.test.ts: 7df6b7d618eea6603a4e6c7759c0591ae5130c1a0ad303ef531ebfcc3185e7e2`; `core/ui-react/src/features/search/history/savedSearchCriteria.ts: 4d20bce2cf2cb649f11d0e87dc7cfe2f7c48ab0be759194cb66a6b868da54230`; `core/ui-react/src/features/search/history/savedSearchCriteria.test.ts: e1b26d1510e5c74708f4e48a0c72d0fb97b7c4f8a4c2f39b348b2fd2795283f6`; `core/ui-react/src/features/stats/history/SavedSearchesPage.tsx: d39f202c83db81a76ce5622ff59eec364e9108f29656b6cb2677502431d74f51`; `core/ui-react/src/features/stats/history/SavedSearchesPage.test.tsx: 7ae518091c1bf84be1ae40ad5425b9fdfa9dc3c3974e724baf0f36a1d5cc9fd5`; `core/ui-react/src/router.tsx: 8935c32ba0700a1b6910bff6e08dbe66ef78f98fb6d0424bdda09c29d00e3df0`; `core/ui-react/src/router.test.tsx: 1f1e7cf702fb56f21b7a8d382d0cbe3638e22c23f9dc29c24f0c36e49e562aec`; `core/ui-react/src/features/search/SearchPage.tsx: 268cf8e18d7ad35b7265e541143be6c6d58b19f84604df65712fbf91f7f2c79f`; `core/ui-react/src/features/search/results/SearchResults.tsx: 570485c69fc1aeefc4ddaf2a473f12d6ce055b50020023dea69785d112989eae`; `core/ui-react/src/features/search/results/SearchResults.test.tsx: 13039d464e7cafcfe322876730d65223980bfcceb373ac6f0970bba0dbd40df1`; `tests/system/tests/search.spec.ts: 37c0fbb19737133f63a6d16cf79a929e2ca38b68a9ceb1816ea123c7062ae4ca`.
- Completed after the last change to each command's listed files: yes.
- Task-owned changes after verification: documentation/lifecycle-only `docs/frontend-migration/{APIS.yaml,COMPONENTS.yaml,FEATURES.yaml,STATUS.md,tasks/FM-019-saved-search-lifecycle.md}`; final diff check is rerun after this update.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- ADR-0001 retains canonical base-aware routing and Spring route protection; ADR-0002 uses existing MUI, TanStack Router/Query, and feature-local state; ADR-0003 uses the existing handwritten transport with generated types as boundary references; ADR-0004 supplies domain, component, and browser/legacy parity coverage.
- ADR REQUIRED proposal triggered during this task: None.

### Assumptions

- The existing Spring mappings remain the authorization authority: `GET /internalapi/savedsearches` requires stats while create/delete retain their existing user role protection.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- Updated `F-SEARCH-SAVED`, `F-HISTORY-SAVED-SEARCHES`, `C-EXTERNAL-LINKS`, and all four assigned API records with concrete targets and tests, without claiming the remaining statistics shell is complete.

### Follow-Up Work

- None.

## Correction Handoff

### Result

- Retained every valid entry's original server index while isolating malformed saved-search records, so deletion targets the server row rather than its rendered position.
- Added credible accessible create-failure and delete-failure/retry coverage, plus browser verification that an unauthenticated request receives the Spring stats-role denial for the canonical route.
- Removed only the unrelated `F-CONFIG-NOTIFICATIONS` test-record hunk from `FEATURES.yaml`.

### Verification Evidence

| Working directory | Command | Classification | Result |
|---|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Affected: saved-search API/page runtime and focused React tests changed. | Passed: 29 files / 134 tests. Existing five non-failing lint warnings, npm audit findings (1 moderate, 3 high), Node localStorage warnings, and Vite chunk-size warning remain. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts` | Affected: corrected runtime and `search.spec.ts` changed. | Passed: Maven package and 12 Playwright tests, including saved-search lifecycle and a 403 stats-role denial. |
| repository root | `git diff --check` | Affected: task-owned implementation, tests, registries, and handoff changed. | Passed after this correction handoff update. |

### Verification Basis

- Baseline: `63bead300df2dd0ba8ef2e071b7bf7f76bf39e5b`.
- Reusable prior evidence: none for the React quality chain or GUI because each covers task-owned files corrected in this cycle. The prior route, external-link, criteria, and result-save evidence remains valid for byte-identical files, but both aggregate commands were affected and rerun.
- Command coverage: the React chain covers all task-owned React runtime/test files and migration registries; GUI packages corrected React runtime and executes `tests/system/tests/search.spec.ts`; diff check covers all task-owned paths.
- File-content manifest: `core/ui-react/src/api/savedSearches.ts: 44e58bc5b12a34396f10bd8cc4bff38dddcba3cc8ad4d40293b22e0c5e690dec`; `core/ui-react/src/api/savedSearches.test.ts: 545f9c2dd598293cc7712806e4486dc4983f249e301fa1bd4758253592df6cf6`; `core/ui-react/src/domain/links/externalLinks.ts: 378615769f311c8465cd58f023c963e27700af454d20b67312afaf08b9af9e5a`; `core/ui-react/src/domain/links/externalLinks.test.ts: 7df6b7d618eea6603a4e6c7759c0591ae5130c1a0ad303ef531ebfcc3185e7e2`; `core/ui-react/src/features/search/history/savedSearchCriteria.ts: 4d20bce2cf2cb649f11d0e87dc7cfe2f7c48ab0be759194cb66a6b868da54230`; `core/ui-react/src/features/search/history/savedSearchCriteria.test.ts: e1b26d1510e5c74708f4e48a0c72d0fb97b7c4f8a4c2f39b348b2fd2795283f6`; `core/ui-react/src/features/stats/history/SavedSearchesPage.tsx: d86cdc803c4a8c347e7a8bdc9ade634892c37001fce63dce35489383a197dc14`; `core/ui-react/src/features/stats/history/SavedSearchesPage.test.tsx: b2dfdb9cf4fa04672605aec5475451f7662cddbe1f0e44428e1fb5ceda87115a`; `core/ui-react/src/router.tsx: 8935c32ba0700a1b6910bff6e08dbe66ef78f98fb6d0424bdda09c29d00e3df0`; `core/ui-react/src/router.test.tsx: 1f1e7cf702fb56f21b7a8d382d0cbe3638e22c23f9dc29c24f0c36e49e562aec`; `core/ui-react/src/features/search/SearchPage.tsx: 268cf8e18d7ad35b7265e541143be6c6d58b19f84604df65712fbf91f7f2c79f`; `core/ui-react/src/features/search/SearchPage.test.tsx: b0d1ece6ef88b91d45b1860e6aa71bfe64a71d2536a79926a768815dcba54f37`; `core/ui-react/src/features/search/results/SearchResults.tsx: 570485c69fc1aeefc4ddaf2a473f12d6ce055b50020023dea69785d112989eae`; `core/ui-react/src/features/search/results/SearchResults.test.tsx: 13039d464e7cafcfe322876730d65223980bfcceb373ac6f0970bba0dbd40df1`; `tests/system/tests/search.spec.ts: 76d5f62f66d0653b0ad398491b3bfbf62b52209474e8cbc71b483fd73ee2f18e`.
- Completed after the last change to every covered implementation/test file: yes. Final diff check covers this handoff update.

### Scope And Status

- Node `v26.7.0`; npm `11.19.0`. No dependencies changed.
- All task-attributable files remain within the refined allowlist. The task remains `review` after passing corrected verification; no self-review was performed.

## Registry Ownership Correction Handoff

### Result

- Added deferred-backlog ownership to `F-SEARCH-SAVED`, `F-HISTORY-SAVED-SEARCHES`, and `C-EXTERNAL-LINKS` without claiming their remaining parity is complete.
- Reopened FM-019 to `review`; prior implementation and browser evidence remains reusable because no implementation or test file changed.

### Verification Evidence

| Working directory | Command | Classification | Result |
|---|---|---|---|
| repository root | `node core/ui-react/scripts/validate-migration.mjs` | Affected: this registry-only correction changes records validated by the command. | Passed. |
| repository root | `git diff --check` | Affected: registry, status, and handoff documentation changed. | Passed. |

### Verification Basis

- Prior React quality-chain and GUI/browser evidence is reusable: every task-owned implementation and test file in the prior verification basis is unchanged.
- This correction changes only the three FM-019-owned registry records, `STATUS.md`, and this task handoff. No API record, source, or test changed.
