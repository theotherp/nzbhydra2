# FM-018: Search Result Paging

Status: done Owner: OpenCode
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
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts` succeeds.
- Run `git diff --check`; inspect status, scope, and generated artifacts.

## Handoff

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Handoff

### Outcome

- Added validated continuation metadata, cache-offset-based load-more/load-all requests, duplicate-safe response merging, and accessible continuation control states. Existing result filtering, sorting, grouping, expansion, and valid selection state remain feature-local state across merged batches.

### Files Modified

- `core/ui-react/src/api/{search.ts,search.test.ts}`; `core/ui-react/src/features/search/{SearchPage.tsx,SearchPage.test.tsx,results/SearchResults.tsx,results/SearchResults.test.tsx}`; `tests/system/tests/results.spec.ts`.
- `docs/frontend-migration/{FEATURES.yaml,COMPONENTS.yaml,APIS.yaml,STATUS.md,tasks/FM-018-search-result-paging.md}`.
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`; no generated artifacts were tracked.

### Toolchain

- Node: `v26.6.0`
- Package manager: `npm 11.18.0`
- Other material tools: Python `3`; GUI runner used Node `v26.7.0` and Playwright Chromium.

### Verification Evidence

| Working directory | Command                                                                                                                                                            | Result                                                                                                                                                                                   |
|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `core/ui-react`   | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed: 25 files / 117 tests, build, API check, and migration validation. Existing five lint warnings, four npm audit findings (1 moderate, 3 high), and Vite chunk-size warning remain. |
| repository root   | `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts`                                                                                      | Superseded stale invocation: blocked before tests because `wsl` is no longer a valid runtime choice.                                                                                     |
| repository root   | `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts`                                                                                      | Passed: 12 Playwright tests, including deterministic React load-more/load-all requests at advancing cache offsets.                                                                       |
| repository root   | `git diff --check`                                                                                                                                                 | Passed.                                                                                                                                                                                  |
| repository root   | `git status --short`                                                                                                                                               | Inspected; only task-owned allowed paths are present.                                                                                                                                    |

### Verification Basis

- Baseline: `c9ec49451356252ac7b917ea842ad546c560712c`.
- Command coverage: the React quality command covers `core/ui-react/src/api/{search.ts,search.test.ts}`, `core/ui-react/src/features/search/{SearchPage.tsx,SearchPage.test.tsx,results/SearchResults.tsx,results/SearchResults.test.tsx}`; its passed evidence is reused because this manifest remains byte-identical. The corrected GUI command covers those runtime files and `tests/system/tests/results.spec.ts`. Diff/status cover all task-owned paths.
- File-content manifest: `core/ui-react/src/api/search.ts: a0693daf7181ca0cef59ebacd2a6f48ee607c1a2913c2c479191a80aaa6569f1`; `core/ui-react/src/api/search.test.ts: 954bc0c9e1dfb5b377d364adf72812f92034ce1efe699823af9ae921f6d32da7`; `core/ui-react/src/features/search/SearchPage.tsx: 51d7027256765b3cdab2518322460398a0ca9f6604989facde85c86132011cef`; `core/ui-react/src/features/search/SearchPage.test.tsx: f665f746e34ae3ad6b77604dc511266772459cd44ced13d42e5bcd8a9abba260`; `core/ui-react/src/features/search/results/SearchResults.tsx: d085a05be82397a4cc72f04358d33da24b5c6d496a4afcfa220736e2401acc87`; `core/ui-react/src/features/search/results/SearchResults.test.tsx: 11b0fd04a1060bf5b26efb7c9deb9bd6109816ab92e759851c047981f3f4261e`; `tests/system/tests/results.spec.ts: 443cf4c7aeb568f2a01c09f906822e98af4d04c20a244fcdf47914a2c6cd6bb0`.
- Completed after the last change to each command's listed files: quality command `yes`; corrected GUI command `yes`; diff/status `yes`.
- Task-owned changes after verification: documentation/lifecycle-only `docs/frontend-migration/{FEATURES.yaml,COMPONENTS.yaml,APIS.yaml,STATUS.md,tasks/FM-018-search-result-paging.md}`. No implementation or test file changed after this basis.

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Architecture Decisions

- ADR-0002: retained MUI and feature-local TanStack result-table state. ADR-0003: extended only the handwritten validated search boundary. ADR-0004: added API, component, and deterministic Playwright coverage.
- ADR REQUIRED: None.

### Assumptions

- A valid server continuation advances when `offset + limit` exceeds the last backend cache position; a non-advancing response is terminal to prevent repeated requests.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- Updated `F-SEARCH-RESULTS`, `F-SEARCH-PAGING`, `C-RESULT-TABLE`, and `API-SEARCH-EXECUTE` only.

### Follow-Up Work

- None.

## Task Designer Verification Refinement

- The GUI verification command now uses `--runtime local`. Commit `b91446330b6118175660ae9e58d5387f7e5beec7` deliberately renamed the runner's managed-current-JVM mode from `wsl` to `local` without changing the Playwright scope or managed-runtime behavior.
- The implementation handoff remains factual invocation evidence, but its runner-restoration alternative is superseded. Verification strength is unchanged: the corrected command must still pass against the final task-owned revision before FM-018 moves to review.
- The task returns to `in_progress` because the stale command was its only recorded blocker and the corrected GUI verification remains outstanding.
- Decision sources: the FM-018 Outcome and Acceptance; ADR-0004; `README.md` Verification Integrity; current `misc/run_gui_systemtest.py` runtime choices and managed-local behavior; and commit `b91446330b6118175660ae9e58d5387f7e5beec7`.

## Correction Handoff

### Outcome

- Load-all accepts Searcher's terminal `offset: 0`, `limit: 0` response and disables further continuation after it merges.
- Paging feedback and safe controls render without valid rows. Unknown-total metadata and merged continuation state have focused coverage; Playwright uses the server's terminal load-all shape.

### Verification Evidence

| Classification | Working directory | Command | Result |
|---|---|---|---|
| affected | `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed: 25 files / 120 tests, build, API check, and migration validation. Existing five lint warnings, four npm audit findings (1 moderate, 3 high), and Vite chunk-size warning remain. |
| affected | repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts` | Passed: 12 Playwright tests, including terminal load-all response handling. |
| affected | repository root | `git diff --check` and `git status --short` | Passed and inspected after this handoff update. |

### Verification Basis

- Baseline: `c9ec49451356252ac7b917ea842ad546c560712c`.
- The React quality chain is affected by corrected runtime and test files. GUI is affected by those runtime files and `tests/system/tests/results.spec.ts`. Diff/status are affected by task documentation. No required command evidence is reusable; unchanged `search.ts` remains covered by the rerun chain.
- SHA-256: `core/ui-react/src/api/search.ts: a0693daf7181ca0cef59ebacd2a6f48ee607c1a2913c2c479191a80aaa6569f1`; `core/ui-react/src/api/search.test.ts: 471fb719617e3a75035a22717c757e29dbc398e1d8f9a8f91a40b479494380b2`; `core/ui-react/src/features/search/SearchPage.tsx: 7250ba00ea05912e48deb677db8553e3df619cd113a1feb58c394e5876646b1d`; `core/ui-react/src/features/search/SearchPage.test.tsx: bf5eadec65059638fdb9c15dc52f3ede9f537796dc74fbc9191e965f527f8132`; `core/ui-react/src/features/search/results/SearchResults.tsx: 27462c48cf8ce8f3abce80226b863d09faa49ff7afa744c5d3e218e9d0a13f1c`; `core/ui-react/src/features/search/results/SearchResults.test.tsx: 57ebd8bfadfcf7c5ed8245ed28a0dc5bb01e7e9fa6dbf0fb319c96a03a385c43`; `tests/system/tests/results.spec.ts: 6fc1b484dce96d6a0c5a7454526919fecc90c7ad7076155d3b98f32a5a63463e`.
- Node `v26.6.0`, npm `11.18.0`; GUI runner used Node `v26.7.0` and Playwright Chromium.

### Scope And Attribution

- Task-attributable files remain exactly within the FM-018 allowlist; no generated artifacts are tracked.
- Pre-invocation snapshot was empty. No unrelated pre-existing files, staged files, overlap, or attribution ambiguity were encountered. Nothing was staged, committed, or pushed.

## Correction Cycle 2 Handoff

### Outcome

- Paging-local exhausted, error, and loading state now resets when a new search request replaces the prior response while preserving that state across continuation merges.
- Focused coverage proves a second search can continue after a terminal load-all response and that merged rows retain active sort, filter, duplicate expansion, and valid selection state.

### Verification Evidence

| Classification | Working directory | Command | Result |
|---|---|---|---|
| affected | `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed: 25 files / 122 tests, build, API check, and migration validation. Existing five lint warnings, four npm audit findings (1 moderate, 3 high), and Vite chunk-size warning remain. |
| affected | repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts` | Passed: 12 Playwright tests, including deterministic React continuation coverage. |
| affected | repository root | `git diff --check` and `git status --short` | Passed and inspected after this handoff update. |

### Verification Basis

- Baseline: `c9ec49451356252ac7b917ea842ad546c560712c`.
- Classification: the React quality chain is affected by changed `SearchPage.tsx`, `SearchPage.test.tsx`, `SearchResults.tsx`, and `SearchResults.test.tsx`; the GUI command is affected by the changed runtime files, although `tests/system/tests/results.spec.ts` is unchanged. Diff/status are affected by this handoff update. No required command evidence is reusable because each applicable command's covered task-owned implementation/test manifest changed.
- Command coverage: the React quality command covers `core/ui-react/src/api/{search.ts,search.test.ts}`, `core/ui-react/src/features/search/{SearchPage.tsx,SearchPage.test.tsx,results/SearchResults.tsx,results/SearchResults.test.tsx}`. The GUI command covers the runtime `SearchPage.tsx` and `results/SearchResults.tsx` plus `tests/system/tests/results.spec.ts`. Diff/status cover all task-owned paths.
- SHA-256: `core/ui-react/src/api/search.ts: a0693daf7181ca0cef59ebacd2a6f48ee607c1a2913c2c479191a80aaa6569f1`; `core/ui-react/src/api/search.test.ts: 471fb719617e3a75035a22717c757e29dbc398e1d8f9a8f91a40b479494380b2`; `core/ui-react/src/features/search/SearchPage.tsx: ae89a2608421296e75cf44ac2ef6fd3c1326b8281413a2fe0e921b5baad316e9`; `core/ui-react/src/features/search/SearchPage.test.tsx: 7d89952541e4f5166ac56c5cfcf583769b2d5bfb20af307a7371563a02032b96`; `core/ui-react/src/features/search/results/SearchResults.tsx: 89ac585754e2913b6de4a12dc4898a6ea101925b65f88bfee3722d3e0b6ab8bf`; `core/ui-react/src/features/search/results/SearchResults.test.tsx: 901afa722734bf442adc114941fd32076556934305c26bee973a977d28cd0346`; `tests/system/tests/results.spec.ts: 6fc1b484dce96d6a0c5a7454526919fecc90c7ad7076155d3b98f32a5a63463e`.
- Toolchain: Node `v26.7.0`; npm `11.19.0`; GUI runner used Node `v26.7.0` and Playwright Chromium.
- Completed after the last change to each command's listed files: quality command `yes`; GUI command `yes`; diff/status `yes`.
- Task-owned changes after verification: documentation/lifecycle-only `docs/frontend-migration/tasks/FM-018-search-result-paging.md`.

### Scope And Attribution

- Task-attributable files remain exactly within the FM-018 allowlist; no generated artifacts are tracked.
- Pre-invocation snapshot was clean. No unrelated pre-existing files, staged files, overlap, or attribution ambiguity were encountered. Nothing was staged, committed, or pushed.

## Correction Cycle 3 Handoff

### Outcome

- A ready initial/non-load-all response with `offset: 0`, `limit: 0`, and remaining results is now reported as an invalid paging cursor and cannot issue a repeated offset-zero continuation request.
- The equivalent terminal response remains accepted only after an explicit load-all request; focused component and page integration coverage distinguish the two cases.

### Verification Evidence

| Classification | Working directory | Command | Result |
|---|---|---|---|
| affected | `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed: 25 files / 124 tests, build, API check, and migration validation. Existing five lint warnings, four npm audit findings (1 moderate, 3 high), and Vite chunk-size warning remain. |
| affected | repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts` | Passed: 12 Playwright tests. |
| affected | repository root | `git diff --check` and `git status --short` | Passed and inspected after this handoff update. |

### Verification Basis

- Baseline: `c9ec49451356252ac7b917ea842ad546c560712c`.
- Classification: React quality is affected by `SearchPage.test.tsx`, `SearchResults.tsx`, and `SearchResults.test.tsx`; GUI is affected by the `SearchResults.tsx` runtime change. Diff/status are affected by this handoff. No required evidence is reusable because every required command covers changed task-owned implementation or test content.
- Command coverage: React quality covers `core/ui-react/src/api/{search.ts,search.test.ts}`, `core/ui-react/src/features/search/{SearchPage.tsx,SearchPage.test.tsx,results/SearchResults.tsx,results/SearchResults.test.tsx}`. GUI covers `SearchPage.tsx`, `results/SearchResults.tsx`, and `tests/system/tests/results.spec.ts`. Diff/status cover all task-owned paths.
- SHA-256: `core/ui-react/src/api/search.ts: a0693daf7181ca0cef59ebacd2a6f48ee607c1a2913c2c479191a80aaa6569f1`; `core/ui-react/src/api/search.test.ts: 471fb719617e3a75035a22717c757e29dbc398e1d8f9a8f91a40b479494380b2`; `core/ui-react/src/features/search/SearchPage.tsx: ae89a2608421296e75cf44ac2ef6fd3c1326b8281413a2fe0e921b5baad316e9`; `core/ui-react/src/features/search/SearchPage.test.tsx: 0cdcc609cd788a385840585db11ecf3bfd50c4a692617292a939eb13725af5d4`; `core/ui-react/src/features/search/results/SearchResults.tsx: 65fbedc026f2ca2d4351157b0c810f55269aa540767d3c2a9a6268d95f3c0fbe`; `core/ui-react/src/features/search/results/SearchResults.test.tsx: a0ad80d42a8fe4f2d10499ff78f16e5e7e87a989c530542a1b85c0c602b2acb1`; `tests/system/tests/results.spec.ts: 6fc1b484dce96d6a0c5a7454526919fecc90c7ad7076155d3b98f32a5a63463e`.
- Toolchain: Node `v26.7.0`, npm `11.19.0`; GUI runner used Node `v26.7.0` and Playwright Chromium.
- Completed after the last change to each covered implementation/test file: quality `yes`; GUI `yes`; diff/status `yes`. The final task change is this handoff.

### Scope And Attribution

- Task-attributable files remain exactly within the FM-018 allowlist; no generated artifacts are tracked.
- Pre-existing modified files: none. No overlap or attribution ambiguity was encountered. Nothing was staged, committed, or pushed.

## Correction Cycle 4 Handoff

### Outcome

- SearchPage continuation coverage now exercises a normal `offset: 0`, `limit: 1` response followed by a non-load-all request at `offset: 1` whose response resets to `offset: 0`, `limit: 0` while still reporting remaining results.
- The correction proves the accessible non-advancing-cursor feedback, disables both continuation controls, and prevents repeated Load more/Load all clicks from issuing a third request. The explicit load-all terminal `0/0` coverage remains passing.

### Verification Evidence

| Classification | Working directory | Command | Result |
|---|---|---|
| affected | `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed: 25 files / 124 tests, build, API check, and migration validation. Existing five lint warnings, four npm audit findings (1 moderate, 3 high), and Vite chunk-size warning remain. |
| affected | repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts` | Passed: 13 Playwright tests, including the deterministic React non-load-all `0/0` continuation response. |
| affected | repository root | `git diff --check` and `git status --short` | Passed and inspected after this handoff update. |

### Verification Basis

- Baseline: `c9ec49451356252ac7b917ea842ad546c560712c`.
- Classification before verification: the React quality chain was affected by `SearchPage.test.tsx`; the GUI command was affected by `tests/system/tests/results.spec.ts`; diff/status were affected by this handoff. No required evidence was reusable because each command covers a changed task-owned test or documentation path.
- Command coverage: React quality covers `core/ui-react/src/api/{search.ts,search.test.ts}`, `core/ui-react/src/features/search/{SearchPage.tsx,SearchPage.test.tsx,results/SearchResults.tsx,results/SearchResults.test.tsx}`. GUI covers runtime `SearchPage.tsx` and `results/SearchResults.tsx` plus `tests/system/tests/results.spec.ts`. Diff/status cover all task-owned paths.
- SHA-256: `core/ui-react/src/api/search.ts: a0693daf7181ca0cef59ebacd2a6f48ee607c1a2913c2c479191a80aaa6569f1`; `core/ui-react/src/api/search.test.ts: 471fb719617e3a75035a22717c757e29dbc398e1d8f9a8f91a40b479494380b2`; `core/ui-react/src/features/search/SearchPage.tsx: ae89a2608421296e75cf44ac2ef6fd3c1326b8281413a2fe0e921b5baad316e9`; `core/ui-react/src/features/search/SearchPage.test.tsx: 4e69c4176612752747b12d3b186a6f716f2e84680c73bb48804499d44f81d766`; `core/ui-react/src/features/search/results/SearchResults.tsx: 65fbedc026f2ca2d4351157b0c810f55269aa540767d3c2a9a6268d95f3c0fbe`; `core/ui-react/src/features/search/results/SearchResults.test.tsx: a0ad80d42a8fe4f2d10499ff78f16e5e7e87a989c530542a1b85c0c602b2acb1`; `tests/system/tests/results.spec.ts: 80eda4aa7838833df64a3d0a7c7f008fd8bc01551fe8ba23268ba9a1e11550aa`.
- Toolchain: Node `v26.7.0`, npm `11.19.0`; GUI runner used Node `v26.7.0` and Playwright Chromium.

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Architecture Decisions

- ADR REQUIRED: None.

### Temporary Exceptions And Debt

- None.

### Scope And Attribution

- Task-attributable files modified in this correction: `core/ui-react/src/features/search/SearchPage.test.tsx`, `tests/system/tests/results.spec.ts`, and this allowed task packet.
- Pre-existing modified files: none. No overlap or attribution ambiguity was encountered. Nothing was staged, committed, or pushed.
