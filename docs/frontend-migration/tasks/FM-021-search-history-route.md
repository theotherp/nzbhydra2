# FM-021: Search History Route

Status: done Owner: OpenCode
Feature IDs: F-HISTORY-SEARCHES Component IDs: C-DATE-TIME, C-CATEGORY-CATALOG API IDs: API-HISTORY-SEARCHES, API-HISTORY-SEARCH-DETAILS, API-SEARCH-REDIRECT-RID Depends on: FM-017, FM-020 Blocks: None

## Outcome

Stats users can page, sort, filter, inspect, refresh, and repeat searches on canonical `/stats/searches` with the existing stable selectors.

## Boundary Rationale

The paged list, request filters, detail dialog, and repeat action operate on one history record contract and together make the route useful. Recent search supplies shared criteria mapping; other history tables have distinct DTOs/actions.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/router.tsx`, `core/ui-react/src/router.test.tsx`
- `core/ui-react/src/features/search/SearchPage.tsx`, `core/ui-react/src/features/search/SearchPage.test.tsx`, only to route search-history repeat through the existing canonical submission lifecycle
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
- Repeat maps all supported criteria into canonical search state and executes with currently eligible indexers; history rows lacking ADR-0005 criteria use canonical default indexers and age/size values. Details validate and show related indexer searches including response times.
- Focused tests cover request transformation, visibility rules, paging/filter combinations, details, and repeat; Playwright extends existing deterministic row/repeat/details flows to React and legacy comparison.
- Registry evidence records full route adoption.

## Verification

- In `core/ui-react`: the complete npm quality/build/API/migration chain succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search-history.spec.ts` succeeds.
- Run `git diff --check`; inspect status, allowed scope, and generated artifacts.

## Handoff

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Blocked Handoff

### Outcome

- No implementation was made. The required repeat action cannot execute a search through the existing React search lifecycle within this packet's write boundary.

### Files Modified

- `docs/frontend-migration/tasks/FM-021-search-history-route.md`
- `docs/frontend-migration/STATUS.md`
- Scope confirmation: no implementation or registry files were changed; the lifecycle and blocker record are within `Files Allowed To Modify`.

### Toolchain

- Node: `not used`
- Package manager: `not used`
- Other material tools: `none`

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| repository root | `git status --short && git rev-parse HEAD` | Passed before lifecycle edits: clean at supplied baseline `14f7e409cb25c1917c040f9a6943bb5a986d07ce`. |

### Verification Basis

- Baseline: `14f7e409cb25c1917c040f9a6943bb5a986d07ce`.
- Command coverage: None; no implementation or test file was changed.
- File-content manifest: None.
- Completed after the last change to each command's listed files: `yes`; no implementation or test files exist for this blocked attempt.
- Task-owned changes after verification: documentation/lifecycle-only `docs/frontend-migration/{STATUS.md,tasks/FM-021-search-history-route.md}`.

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Architecture Decisions

- Reviewed and followed ADR-0001 through ADR-0005; none supplies a permitted search-execution handoff from the stats route to `SearchPage`.
- ADR REQUIRED: None. This is a task-scope/prohibited-write blocker, not an unresolved architectural decision.

### Assumptions

- None.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `F-HISTORY-SEARCHES`, `C-DATE-TIME`, `C-CATEGORY-CATALOG`, `API-HISTORY-SEARCHES`, `API-HISTORY-SEARCH-DETAILS`, and `API-SEARCH-REDIRECT-RID`: intentionally unchanged because no route adoption was implemented.

### Follow-Up Work

- Refine FM-021's `Files Allowed To Modify` to include the existing `core/ui-react/src/features/search/SearchPage.tsx` and its focused test, or supply a pre-existing supported search-execution handoff. `SearchPage` owns the only current submission lifecycle: its `submit` function creates the canonical request, subscribes live state, posts to `internalapi/search`, and renders results. Its URL-state handling (`valuesFromSearch(refillCriteria ?? search, catalog)`) only populates form values; no effect executes a search from route criteria. The stats route can navigate with `recentSearchCriteria`, but cannot satisfy acceptance “Repeat maps all supported criteria into canonical search state and executes” without changing that prohibited file.

### Blocker

- **BLOCKED: prohibited write required for acceptance.** FM-021 allows reuse of the FM-017 criteria transformation but does not allow modifying `core/ui-react/src/features/search/SearchPage.tsx` or its focused test. Repository evidence: `SearchPage.tsx` lines 111–234 contain the sole `submit` lifecycle that executes a search; lines 65–74 consume URL criteria only as initial form values, with no URL-driven execution path. The route/history files allowed by FM-021 can navigate to `/` with criteria but cannot execute the required search or present its result. Adding a second executor in history would duplicate the established search runtime boundary and still leave result rendering in `SearchPage`.

## Task Designer Scope Refinement

- Added only `core/ui-react/src/features/search/SearchPage.tsx` and its focused `SearchPage.test.tsx` to `Files Allowed To Modify`, restricted to routing search-history repeat through the existing canonical submission lifecycle. All exclusions and acceptance criteria remain unchanged.
- Decision sources: FM-021's Outcome and repeat Acceptance; FM-017's accepted and tested pattern in which recent repeat calls `SearchPage.submit`; ADR-0005's direction that FM-021 consume FM-017's shared criteria transformation; current `SearchPage.tsx`, where URL criteria initialize the form but `submit` exclusively owns canonical navigation, eligible-indexer guarding, live-state subscription, `API-SEARCH-EXECUTE`, and result state; and `tests/system/tests/search-history.spec.ts`, which requires the repeat click to issue `POST /internalapi/search` and render its result.
- The blocked handoff above remains factual evidence from the prior attempt. Its prohibited-write blocker is resolved by this packet refinement, but FM-021 remains `blocked` until a fresh implementer explicitly resumes it; no implementation or architectural decision was made here.

## Current Blocked Handoff

### Outcome

- Implemented the React route, typed history transport, controls, detail dialog, and canonical SearchPage repeat trigger, but final verification is not complete.

### Files Modified

- React route/API/history UI and focused tests; `tests/system/tests/search-history.spec.ts`; allowed linked registries, lifecycle records, and this packet.
- Scope confirmation: all task-attributable paths are within `Files Allowed To Modify`.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: Maven/Playwright managed by `misc/run_gui_systemtest.py`.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm run typecheck && npm run lint` | Passed with six pre-existing non-failing warnings. |
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Typecheck, lint, format, 35 files/151 tests, build, and API check passed; `validate:migration` failed on unowned `F-STATS-SHELL`, `F-STATS-INDEXERS`, and FM-022--FM-024 STATUS ownership records. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/search-history.spec.ts` | Failed: legacy 2/2 passed; React history row response is treated as malformed and the deterministic row is unavailable (three attempts). |

### Verification Basis

- Baseline: `14f7e409cb25c1917c040f9a6943bb5a986d07ce`.
- Command coverage: no passing final basis exists; final React runtime, tests, and system test require correction and rerun.
- File-content manifest: not recorded because required verification is failing.
- Completed after the last change to each command's listed files: `no`.
- Task-owned changes after verification: implementation and test paths remain pending final verification.

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Architecture Decisions

- Followed ADR-0001 through ADR-0005; no ADR REQUIRED.

### Assumptions

- None.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- Updated `F-HISTORY-SEARCHES`, `C-CATEGORY-CATALOG`, `C-DATE-TIME`, `API-HISTORY-SEARCHES`, `API-HISTORY-SEARCH-DETAILS`, and `API-SEARCH-REDIRECT-RID` adoption evidence. `C-DATE-TIME` implementation remains unchanged.

### Follow-Up Work

- Diagnose the live `POST /internalapi/history/searches` row shape (the React parser cannot currently retain any returned rows despite HTTP 200) and rerun the full chain and GUI verification. Resolve the unowned migration-validator records with their owners or an explicit scope refinement.

### Blocker

- **BLOCKED: required verification failing.** The deterministic React browser flow receives history data but reports all entries malformed, preventing row/repeat/details acceptance; separately, `validate:migration` requires writes to unowned `F-STATS-SHELL`, `F-STATS-INDEXERS`, and FM-022--FM-024 lifecycle records. No prohibited writes were made.

## Required Browser-Failure Correction Handoff

### Outcome

- The history parser now accepts signed Java `int` IDs, matching the HTTP-200 rows emitted by `SearchEntityTO`. List rows therefore render, repeat, and fetch details using their valid signed IDs.

### Files Modified

- Resumed FM-021 route/API/history UI, focused tests, router/search lifecycle integration, `tests/system/tests/search-history.spec.ts`, linked registries, lifecycle records, and this packet.
- Correction: `core/ui-react/src/api/searchHistory.{ts,test.ts}`.
- Scope confirmation: all task-attributable changes are within `Files Allowed To Modify`.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: Maven/Playwright managed by `misc/run_gui_systemtest.py`.

### Verification Evidence

| Working directory | Command | Classification | Result |
|---|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Affected: parser and focused API test changed; prior aggregate evidence was failing. | Passed: 35 files / 153 tests; six existing non-failing lint warnings, npm audit findings, localStorage warnings, and Vite chunk-size warning remain. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/search-history.spec.ts` | Affected: packaged history parser and browser suite changed; prior browser evidence was failing. | Passed: Maven package and all 3 search-history Playwright tests, including React repeat and details. |
| repository root | `git diff --check` | Affected: task packet/status changed after prior diff check. | Passed after this handoff update. |

### Verification Basis

- Baseline: `14f7e409cb25c1917c040f9a6943bb5a986d07ce`.
- Command coverage: the React chain covers FM-021 React runtime and focused tests; the browser command packages the React runtime and executes `tests/system/tests/search-history.spec.ts`; diff check covers all task-attributable paths.
- File-content manifest: `core/ui-react/src/router.tsx: cab7a3e1789b6a04d58e7367019434b2cd68cbd53a4aabc15c8b261dbf0da95f`; `core/ui-react/src/router.test.tsx: a513d243398854e1f7f260fe8b7a97afe5ce51d33fd40d9a36fed9993b2ab013`; `core/ui-react/src/features/search/SearchPage.tsx: 6e9f1f4d6f272c58ed06a29a47c5e4a7c9fb260bc3c79d1d443da0b67068f88b`; `core/ui-react/src/features/search/SearchPage.test.tsx: d6678f20a6dbd5c060922623956355aa726416faab331abba11e3747aa92c867`; `core/ui-react/src/api/searchHistory.ts: 81ddb848ab7f693a075e3aca8255fa12e0eebf8bd38295b77bcf40eed6775a20`; `core/ui-react/src/api/searchHistory.test.ts: 3a5e2ba0be46b6983c87caccb15461b843e3cdccbc51664b81bdf407a1fdde1a`; `core/ui-react/src/features/stats/history/SearchHistoryPage.tsx: 377ad4d3265844f2fa7fa6d0a5dbfbf44044d941cd092fd35ec72f2812cf5ce7`; `core/ui-react/src/features/stats/history/SearchHistoryPage.test.tsx: 0ddf1f871ba277f35ac18d113b308ef8c8423223366ff4978c88e3fc50616c66`; `tests/system/tests/search-history.spec.ts: 23acf2fc1066323d5a3ad1a49ab973e94d537219b46930589df1d38c65712641`.
- Completed after the last change to each command's listed implementation and test file: yes.
- Task-owned changes after verification: documentation/lifecycle-only `docs/frontend-migration/{STATUS.md,tasks/FM-021-search-history-route.md}`; diff check is rerun after this handoff update.

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Architecture Decisions

- Followed ADR-0001 through ADR-0005; existing handwritten boundary validation now reflects Java `int` identifier semantics. ADR REQUIRED: None.

### Assumptions

- The backend's signed IDs are valid because `SearchEntityTO.id` is a Java `int` and the live HTTP-200 response contained negative IDs.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `F-HISTORY-SEARCHES`, `C-DATE-TIME`, `C-CATEGORY-CATALOG`, `API-HISTORY-SEARCHES`, `API-HISTORY-SEARCH-DETAILS`, and `API-SEARCH-REDIRECT-RID`: existing FM-021 target/test/state/task/selector/backlog evidence remains accurate; only lifecycle status and this correction basis changed.

### Follow-Up Work

- None.

## Review Finding Correction Handoff

### Outcome

- Each search-history row now presents every persisted age, size, and selected-indexer criterion with visible definition-list labels and values. Absent legacy criteria remain omitted; a persisted empty selected-indexer list renders `None`.
- Focused component coverage verifies all five criteria and their `dt`/`dd` semantics. The existing browser flow was rerun because the packaged history-page runtime changed.

### Files Modified

- `core/ui-react/src/features/stats/history/SearchHistoryPage.tsx`
- `core/ui-react/src/features/stats/history/SearchHistoryPage.test.tsx`
- `docs/frontend-migration/tasks/FM-021-search-history-route.md`
- Scope confirmation: correction changes are within `Files Allowed To Modify`. Existing concurrent FM-000, FM-020, and FM-022 changes were not modified.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: Maven/Playwright managed by `misc/run_gui_systemtest.py`.

### Verification Evidence

| Working directory | Command | Classification | Result |
|---|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Affected: the history-page runtime and focused component test changed. | Passed: 35 files / 153 tests. Six existing non-failing lint warnings, npm audit findings, localStorage warnings, and the Vite chunk-size warning remain. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/search-history.spec.ts` | Affected: the history-page runtime is packaged into the browser target. | Passed: Maven package and all 3 Playwright search-history tests. |
| repository root | `git diff --check` | Affected: correction source/test files changed. | Passed before this handoff update; rerun after this update. |

### Verification Basis

- Baseline: `14f7e409cb25c1917c040f9a6943bb5a986d07ce`.
- The prior React-chain and browser evidence is not reusable because `SearchHistoryPage.tsx` is a task-owned runtime file and `SearchHistoryPage.test.tsx` is a task-owned focused test. All other task-owned implementation/test files match the prior verification basis.
- File-content manifest: `core/ui-react/src/router.tsx: cab7a3e1789b6a04d58e7367019434b2cd68cbd53a4aabc15c8b261dbf0da95f`; `core/ui-react/src/router.test.tsx: a513d243398854e1f7f260fe8b7a97afe5ce51d33fd40d9a36fed9993b2ab013`; `core/ui-react/src/features/search/SearchPage.tsx: 6e9f1f4d6f272c58ed06a29a47c5e4a7c9fb260bc3c79d1d443da0b67068f88b`; `core/ui-react/src/features/search/SearchPage.test.tsx: d6678f20a6dbd5c060922623956355aa726416faab331abba11e3747aa92c867`; `core/ui-react/src/api/searchHistory.ts: 81ddb848ab7f693a075e3aca8255fa12e0eebf8bd38295b77bcf40eed6775a20`; `core/ui-react/src/api/searchHistory.test.ts: 3a5e2ba0be46b6983c87caccb15461b843e3cdccbc51664b81bdf407a1fdde1a`; `core/ui-react/src/features/stats/history/SearchHistoryPage.tsx: ab7544ee186a0f67a29ab96334eb20009f16c9fffe2cfa7aad343a8705fc645f`; `core/ui-react/src/features/stats/history/SearchHistoryPage.test.tsx: 0ac4459331e4c965c84827ee6efa03d325ea45f2d1ea56c59efb19a7d1dc9bc6`; `tests/system/tests/search-history.spec.ts: 23acf2fc1066323d5a3ad1a49ab973e94d537219b46930589df1d38c65712641`.
- Completed after the last change to every covered implementation/test file: yes. This handoff update is documentation-only; the final diff check follows it.

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Architecture Decisions

- Followed ADR-0001 through ADR-0005. No ADR REQUIRED.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `F-HISTORY-SEARCHES` remains `partial` with `gaps: []` after corrected React-chain and browser verification; its target, test evidence, selectors, and task ownership remain accurate.
- Status remains `review`; no self-review was performed.
