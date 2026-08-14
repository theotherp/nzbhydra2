# FM-017: Recent Search Reuse

Status: done Owner: OpenCode
Feature IDs: F-SEARCH-RECENT, F-SEARCH-FORM, F-SEARCH-MEDIA, F-SEARCH-INDEXERS Component IDs: C-CATEGORY-CATALOG API IDs: API-HISTORY-RECENT-SEARCHES, API-SEARCH-EXECUTE Depends on: FM-016, FM-025 Blocks: FM-019, FM-021

## Outcome

The React search page lists recent searches and can refill or immediately repeat their complete supported criteria, including drag-to-refill where the platform supports it.

## Boundary Rationale

Recent retrieval, safe request parsing, criteria transformation, refill/repeat behavior, and accessible drag alternative form one reuse workflow. It follows media/indexer work so it can round-trip the complete form; the full stats history
route is a separate role-protected paging capability.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- New recent-history API/domain files under `core/ui-react/src/api/**` and `core/ui-react/src/features/search/history/**`
- `core/ui-react/src/features/search/{SearchPage.tsx,SearchPage.test.tsx,workspace/**}`
- `core/src/main/java/org/nzbhydra/searching/db/SearchEntity.java`
- `core/src/main/java/org/nzbhydra/searching/Searcher.java`
- One new additive Flyway migration under `core/src/main/resources/migration/**`
- `shared/mapping/src/main/java/org/nzbhydra/searching/db/SearchEntityTO.java`
- `core/src/test/java/org/nzbhydra/searching/{SearchEntityTest.java,SearcherUnitTest.java}`
- Generated contract artifacts `core/openapi.json` and `core/ui-react/src/api/generated/openapi.ts`; do not edit either manually
- `tests/system/tests/search-history.spec.ts` and `tests/system/tests/search.spec.ts`
- The listed feature/API records only; this task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Stats search-history route, saved searches, server history deletion, guided tour, or changes to existing history rows beyond backward-compatible nullable criteria storage
- Changing search execution, indexer eligibility/preselection, age/size default, history ordering/deduplication, authentication, or endpoint path semantics

## Context To Read

- `CONTEXT.md`; ADR-0001 through ADR-0005; FM-015/FM-016/FM-025 handoffs; listed records; FM-019/FM-021 planned packets
- Legacy `search-controller.js`, `search-history-service.js`, recent dropdown template; `SearchRequest`, `Searcher`, `SearchEntity`, `SearchEntityTO`, `History`, `HistoryWeb`; Flyway schema; OpenAPI generation/check scripts; and linked Java/React/system tests

## Acceptance

- `API-HISTORY-RECENT-SEARCHES` is called through shared transport only when no search is active; malformed entries are isolated and loading/empty/failure states are accessible.
- Newly executed searches durably retain and expose nullable `minAge`, `maxAge`, `minSize`, `maxSize`, and selected-indexer criteria through `API-HISTORY-RECENT-SEARCHES`; the additive schema migration leaves existing history usable, and generated OpenAPI/TypeScript contracts represent the response fields without manual generated-file edits.
- Recent entries safely describe category, query/title, identifiers, season/episode, and source. Age, size, and selected indexers are not displayed inline or in a tooltip because the current React dropdown has no established tooltip convention.
- Refill and repeat use one tested transformation into canonical React search state and preserve all present supported criteria. For entries lacking the new fields, the transformation omits those criteria so the existing FM-016 preselection and normal canonical age/size initialization apply rather than inventing literal fallback values; present indexers are reconciled against current eligibility, and repeat executes through the existing submission lifecycle.
- Pointer drag-to-refill works without making drag the only interaction; keyboard/touch users have an equivalent explicit action.
- Focused Java tests prove request-to-entity persistence and entity-to-DTO mapping for all five new criteria plus compatibility when they are absent. React tests cover payload validation, every criteria mapping, unavailable-indexer reconciliation, and absent-field defaults; Playwright creates a non-default age/size/indexer search, observes it in recent history, refills, and repeats it in React while retaining legacy coverage.
- Registry evidence records concrete adoption without claiming full history-route parity.

## Verification

- Relevant Java tests for `Searcher` persistence and `SearchEntity` DTO conversion succeed through an existing IntelliJ run configuration; if no such configuration exists, stop and request one rather than substituting an unapproved command.
- Regenerate `core/openapi.json` through the established Springdoc process, then in `core/ui-react` run `npm run generate:api` and the complete npm quality/build/API/migration chain; generation is reproducible and the generated response contains all five nullable criteria fields.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts tests/search-history.spec.ts` succeeds.
- Run `git diff --check`; inspect status, allowed scope, the single additive Flyway migration, and unexpected generated files.

## Handoff

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Resumed Blocked Handoff

### Outcome

- Focused Java tests now pass and OpenAPI generation plus the React quality chain pass. The final GUI command remains failing: after a configured search the recent-history request returns HTTP 200 but lacks the newly created `recent criteria` entry, so React has no Refill action.

### Files Modified

- Task-attributable implementation paths are limited to the packet allowlist: the listed `SearchEntity`, `Searcher`, DTO, focused Java tests, additive `V7__SEARCH_CRITERIA.sql`, React recent-search files, `SearchPage`, `SearchWorkspace`, focused React tests, and `tests/system/tests/search.spec.ts`.
- Scope confirmation: no task-attributable implementation change is outside `Files Allowed To Modify`; supplied ADR/planning paths are preserved and not claimed as implementation work.

### Toolchain

- Node: not recorded for final verification.
- Package manager: not recorded for final verification.
- Other material tools: IntelliJ JUnit configuration `Run all tests in core` did not return within 300 seconds.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm run typecheck && npm run test -- --run` | Passed before later test-formatting corrections: 25 files / 114 tests. Not final evidence. |
| IDE | `Run all tests in core` | Blocked: existing configuration exceeded the 300-second MCP wait and left a Java test process running; no focused existing `Searcher`/`SearchEntity` configuration is available. |
| IDE | `SearcherUnitTest` | Passed: 5 passed, 3 skipped, 0 failed. |
| IDE | `SearchEntityTest` | Passed: 3 passed, 0 failed. |
| repository root | `mvn -pl core org.springdoc:springdoc-openapi-maven-plugin:generate` | Passed; `core/openapi.json` regenerated and includes all five criteria fields. |
| `core/ui-react` | `npm run generate:api` twice, then `git diff --exit-code -- src/api/generated/openapi.ts` | Passed; generated types contain all five fields and are reproducible. |
| `core/ui-react` | `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed: 25 files / 114 tests; existing non-failing warnings remain. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts tests/search-history.spec.ts` | Failed three times: 11/12 passed; the new recent-search test cannot find Refill. The endpoint response is 200 but does not contain the newly executed search. |
| repository root | `git diff --check` | Passed after the latest task-owned edit. |

### Verification Basis

- Baseline: `0b9940f78414a98be2ade79c362384ed088a98f1`.
- Command coverage: no final verification basis exists because the required GUI verification fails and `tests/system/tests/search.spec.ts` changed after the successful React chain.
- File-content manifest: not recorded; final verification is pending.
- Completed after the last change to each command's listed files: no.
- Task-owned changes after verification: `tests/system/tests/search.spec.ts` changed for GUI diagnosis; all affected verification must be rerun after a fix.

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Architecture Decisions

- ADR-0001 through ADR-0005 were read and followed; ADR-0005's nullable storage/response and default-on-absence criteria behavior is implemented locally.
- ADR REQUIRED: None.

### Assumptions

- `SearchRequest`'s optional criteria and indexer set are the authoritative newly executed criteria, and `valuesFromSearch` provides the prescribed absent-field defaults.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- None beyond lifecycle state; supplied API/ADR planning refinements are preserved as pre-invocation work.

### Follow-Up Work

- Diagnose why `POST /internalapi/history/searches/forsearching` omits the just-persisted search in the managed GUI runtime despite the successful search and 200 response. Rerun the React quality chain and GUI command after any implementation/test correction. The task may not move to review until the GUI run passes.

## Current Blocked Handoff

### Outcome

- The resumed API-schema correction now accepts nullable optional fields returned by `SearchEntityTO`, so otherwise valid recent-search entries are no longer discarded when the backend serializes absent fields as `null`.
- Required final browser and React-chain verification cannot run in this checkout's current tooling environment.

### Files Modified

- Resumed task-attributable implementation: `core/ui-react/src/api/recentSearches.{ts,test.ts}`.
- Resumed task-attributable lifecycle/documentation: `docs/frontend-migration/{STATUS.md,tasks/FM-017-search-recent-history.md}`.
- Scope confirmation: all current task-attributable changes are within `Files Allowed To Modify`; unrelated staged load-test deletions and `.idea` changes were not modified.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| IDE | `SearchEntityTest` | Passed: 3 passed, 0 failed. |
| IDE | `SearcherUnitTest` | Passed: 5 passed, 3 skipped, 0 failed. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts tests/search-history.spec.ts` | Blocked before tests: the current runner accepts only `auto`, `existing`, or `local` for `--runtime`; it rejects required `wsl`. |
| repository root | `node --version && npm --version` | Blocked for React verification: `v22.22.1` / `9.2.0`, while `core/ui-react/package.json` declares Node `>=26.0.0 <27` and npm `11.18.0`. |
| repository root | `git diff --check` | Passed after the blocked-handoff update. |

### Blocker

- **BLOCKED: unavailable verification infrastructure.** The exact packet GUI command is rejected by the current unallowlisted runner interface, and no declared Node/npm toolchain is installed locally for the required React quality/build/API/migration chain. Changing `misc/run_gui_systemtest.py`, bypassing the packet command with another runtime mode, or running the npm chain under Node 22 would violate the packet and toolchain rules.
- Resolution: restore a runner that accepts the required `--runtime wsl` command and provide Node 26 with npm 11.18.0, then rerun the complete packet verification. No ADR is required.

## Task Designer Verification Refinement

- The GUI verification command now uses `--runtime local`. HEAD `b91446330b6118175660ae9e58d5387f7e5beec7` deliberately renamed the runner's managed-current-JVM mode from `wsl` to `local` without changing FM-017's Playwright scope, so the prior packet invocation was stale rather than an unavailable-infrastructure requirement.
- The Current Blocked Handoff remains factual invocation evidence, but its runner-restoration resolution is superseded by this refinement. Acceptance and verification strength are unchanged: the corrected GUI command and all other packet verification must still pass on the final task-owned revision.
- The task remains `blocked` solely because the available Node `v22.22.1` and npm `9.2.0` cannot validly run the React chain declared for Node `>=26.0.0 <27` and npm `11.18.0` by `core/ui-react/package.json` and its lockfile. Provide that declared toolchain, then rerun the complete React and corrected GUI verification; do not downgrade or bypass the declarations.
- Decision sources: the FM-017 Outcome and Acceptance; ADR-0004; `README.md` Verification Integrity and Dependencies And Toolchain; current `misc/run_gui_systemtest.py` runtime choices and managed-local behavior; commit `b91446330b6118175660ae9e58d5387f7e5beec7`; and `core/ui-react/{package.json,package-lock.json}`.

## Final Implementation Handoff

### Outcome

- Recent searches retain complete nullable criteria, validate null-bearing responses, and support accessible refill, repeat, and drag-to-refill in React.

### Files Modified

- Backend contract/persistence: `SearchEntity`, `Searcher`, `SearchEntityTO`, `V7__SEARCH_CRITERIA.sql`, focused Java tests, and generated `core/openapi.json`.
- React: generated OpenAPI types, `recentSearches.{ts,test.ts}`, search-page/workspace integration, and new recent-history criteria/UI files; `tests/system/tests/search.spec.ts`.
- Coordination: `APIS.yaml`, `STATUS.md`, and this packet.
- Scope confirmation: all task-attributable changes are within `Files Allowed To Modify`; supplied `.idea`, package-manifest/lockfile, and staged load-test changes were not modified or claimed. No unexpected generated files remain.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: IntelliJ JUnit runner; Maven Springdoc `1.5`; Playwright Chromium.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| IDE | `SearchEntityTest` | Passed: 3 passed, 0 failed. |
| IDE | `SearcherUnitTest` | Passed: 5 passed, 3 skipped, 0 failed. |
| repository root | `mvn -pl core org.springdoc:springdoc-openapi-maven-plugin:generate` | Passed after the local application was available; regenerated `core/openapi.json`. |
| `core/ui-react` | `npm run generate:api` twice | Passed; both generated `openapi.ts` SHA-256 values were `9d7918ed58db747498888b99fcc2270fe11509a5b695666fc83eb3dc369b02f1`. |
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed: 25 files / 114 tests. Existing five lint warnings, npm audit findings, Node localStorage warnings, and Vite chunk-size warning remain non-failing. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts tests/search-history.spec.ts` | Passed: Maven package and 12 Playwright tests, including recent criteria refill/repeat. |
| repository root | `git diff --no-ext-diff --check` | Passed. |

### Verification Basis

- Baseline: `0b9940f78414a98be2ade79c362384ed088a98f1`.
- Command coverage: focused Java tests cover `SearchEntity`, `Searcher`, and their tests; Springdoc/generation cover Java/DTO contract, `core/openapi.json`, and generated `openapi.ts`; the React chain covers all React implementation/tests; GUI covers packaged backend/React behavior and `tests/system/tests/search.spec.ts`; diff check covers all task-owned paths.
- File-content manifest: `core/openapi.json: 73094555b08e616a85612a5c9d0b69b211fb44217fa2b6f88336422ebd2d3ecd`; `core/src/main/java/org/nzbhydra/searching/Searcher.java: b2bf21cc6d1f6d6a6b636742d3f9431b733ae493022ef3994d37fa2f42366457`; `core/src/main/java/org/nzbhydra/searching/db/SearchEntity.java: 18dfdbe576f9b5b8e7de02db38d06aeb3e1260f0f3f386d56b0a90e544b94d41`; `core/src/main/resources/migration/V7__SEARCH_CRITERIA.sql: 2dbe38c2347155110a933b2ab48f059ddd83f97c18590aa481901d825e91dfa0`; `core/src/test/java/org/nzbhydra/searching/SearchEntityTest.java: 7cd531e031b9a7e2ff29a52f2b840ad4e655fdeb1e214cf059b7e0cc1b66c04d`; `core/src/test/java/org/nzbhydra/searching/SearcherUnitTest.java: b5816c7b8fa2df95fcea7d63b6eccc50a04531935305585f2e574c103cd86f06`; `core/ui-react/src/api/generated/openapi.ts: 9d7918ed58db747498888b99fcc2270fe11509a5b695666fc83eb3dc369b02f1`; `core/ui-react/src/api/recentSearches.ts: 46729c41a9c2b0a31d875827666fedddf5e935ab4b81d1f5b454ec307c51f88e`; `core/ui-react/src/api/recentSearches.test.ts: 9ff9ab1b6dec47c5c3db4c116e480dec3dd617235e96655b89eb08eae127fa72`; `core/ui-react/src/features/search/SearchPage.tsx: 9c3a12c35fc7b6a14b2c9a38932480338e557ee0bb7026ca2b2ebe08b56acefb`; `core/ui-react/src/features/search/SearchPage.test.tsx: de2545607843fae40f878d3608de521a253b9a91effb8df430c541497a3b0c09`; `core/ui-react/src/features/search/history/RecentSearches.tsx: f6d6e2635b7502e2ac13f5d23179b55aeeb5981af27e39f0691d5111b783a93f`; `core/ui-react/src/features/search/history/recentSearchCriteria.ts: 4d655dc5d078e4cbb724a937a3a5b79547329365d09a705cdd005b80e649bed6`; `core/ui-react/src/features/search/history/recentSearchCriteria.test.ts: 72fc75a41e7c5c98972dd809096e167dbf8910f820bd679dd3f58460cd17a89a`; `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx: fb2f4e908f82f8cc588d7155bd5ea67a94bda1698225e53264ae114903971957`; `shared/mapping/src/main/java/org/nzbhydra/searching/db/SearchEntityTO.java: 86da7e146a1b59d6a359ba6bc12805313fd9cefbf027ca30420cfddc2dabe7e2`; `tests/system/tests/search.spec.ts: 212b46905d4230d66da951bf377bff5d0b1ca009f74c3b055f965e38a4fc3d39`.
- Completed after the last change to each command's listed implementation/test file: yes.
- Task-owned changes after verification: documentation/lifecycle-only `docs/frontend-migration/{STATUS.md,tasks/FM-017-search-recent-history.md}`.

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Architecture Decisions

- Followed ADR-0001 through ADR-0005: canonical React route, approved stack and handwritten transport, generated types, layered verification, and nullable persisted recent-history criteria with default-on-absence behavior.
- ADR REQUIRED: None.

### Assumptions

- Backend optional `SearchEntityTO` values serialize as `null`; converting them to absent UI fields preserves canonical defaults for legacy records.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `API-HISTORY-RECENT-SEARCHES` records the adopted nullable-criteria contract; task and status lifecycle updated to review.

### Follow-Up Work

- None.

## Correction Handoff: Cycle 1/3

### Outcome

- Recent-search response validation retains the backend `source` enum, and every rendered recent entry now describes it as Internal, API, or the safe fallback Unknown.
- Focused API validation coverage retains `API`; SearchPage component coverage renders `Source: Internal` for a recent entry.

### Files Modified

- `core/ui-react/src/api/recentSearches.{ts,test.ts}`
- `core/ui-react/src/features/search/{SearchPage.test.tsx,history/RecentSearches.tsx}`
- This task packet handoff.
- Scope confirmation: all fixer changes and resumed task-attributable paths are within `Files Allowed To Modify`. Supplied `.idea`, package-manifest/lockfile, and staged load-test deletions were not modified or claimed.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: Maven `3.9.16`; Playwright Chromium.

### Verification Evidence

| Working directory | Command | Classification | Result |
|---|---|---|---|
| IDE | `SearchEntityTest` | Reusable: all Java implementation/test files match the prior manifest. | Passed prior: 3 passed, 0 failed. |
| IDE | `SearcherUnitTest` | Reusable: all Java implementation/test files match the prior manifest. | Passed prior: 5 passed, 3 skipped, 0 failed. |
| repository root | `mvn -pl core org.springdoc:springdoc-openapi-maven-plugin:generate` and `npm run generate:api` twice | Reusable: Java/DTO/OpenAPI/generated-type inputs and manifest values are unchanged. | Passed prior; generated `openapi.ts` remains reproducible at `9d7918ed58db747498888b99fcc2270fe11509a5b695666fc83eb3dc369b02f1`. |
| `core/ui-react` | `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Affected: recent-search API/UI runtime and focused tests changed. | Passed: 25 files / 114 tests. Existing five non-failing lint warnings, Node localStorage warnings, and Vite chunk-size warning remain. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts tests/search-history.spec.ts` | Affected: packaged recent-entry rendering changed. | Passed: Maven package and 12 Playwright tests, including recent-criteria refill/repeat. |
| repository root | `git diff --no-ext-diff --check` | Affected: task-owned implementation, tests, and this handoff changed. | Passed after this final handoff update. |

### Verification Basis

- Baseline: `0b9940f78414a98be2ade79c362384ed088a98f1`.
- Command coverage and reuse: Java tests cover `SearchEntity`, `Searcher`, and focused Java tests; Springdoc/generation cover Java/DTO contract, `core/openapi.json`, and generated `openapi.ts`; all are reusable because their verified manifest values are unchanged. The React quality chain covers task-owned React runtime/test files and was rerun. GUI packages and exercises the corrected React recent-entry runtime plus `tests/system/tests/search.spec.ts` and was rerun. Diff check covers all task-owned paths and is rerun after this handoff update.
- File-content manifest: `core/openapi.json: 73094555b08e616a85612a5c9d0b69b211fb44217fa2b6f88336422ebd2d3ecd`; `core/src/main/java/org/nzbhydra/searching/Searcher.java: b2bf21cc6d1f6d6a6b636742d3f9431b733ae493022ef3994d37fa2f42366457`; `core/src/main/java/org/nzbhydra/searching/db/SearchEntity.java: 18dfdbe576f9b5b8e7de02db38d06aeb3e1260f0f3f386d56b0a90e544b94d41`; `core/src/main/resources/migration/V7__SEARCH_CRITERIA.sql: 2dbe38c2347155110a933b2ab48f059ddd83f97c18590aa481901d825e91dfa0`; `core/src/test/java/org/nzbhydra/searching/SearchEntityTest.java: 7cd531e031b9a7e2ff29a52f2b840ad4e655fdeb1e214cf059b7e0cc1b66c04d`; `core/src/test/java/org/nzbhydra/searching/SearcherUnitTest.java: b5816c7b8fa2df95fcea7d63b6eccc50a04531935305585f2e574c103cd86f06`; `core/ui-react/src/api/generated/openapi.ts: 9d7918ed58db747498888b99fcc2270fe11509a5b695666fc83eb3dc369b02f1`; `core/ui-react/src/api/recentSearches.ts: 47cdf1d44d4f2bdde84aa9c71137de5c0b1fc300cda691e16aec2db4d7477390`; `core/ui-react/src/api/recentSearches.test.ts: a54f95f62ccbc14b98f6cd65c6109043bd67bc1cc9d6d38c0010a9712a2fcfd9`; `core/ui-react/src/features/search/SearchPage.tsx: 9c3a12c35fc7b6a14b2c9a38932480338e557ee0bb7026ca2b2ebe08b56acefb`; `core/ui-react/src/features/search/SearchPage.test.tsx: f88d1b25859bfe8747a8caa735c1c1747366d54454bc77d3f4070b124fcd4199`; `core/ui-react/src/features/search/history/RecentSearches.tsx: 366dc506d4150087e67d237e243825eda8f5c461bd32e1ccce0822e9dae8f322`; `core/ui-react/src/features/search/history/recentSearchCriteria.ts: 4d655dc5d078e4cbb724a937a3a5b79547329365d09a705cdd005b80e649bed6`; `core/ui-react/src/features/search/history/recentSearchCriteria.test.ts: 72fc75a41e7c5c98972dd809096e167dbf8910f820bd679dd3f58460cd17a89a`; `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx: fb2f4e908f82f8cc588d7155bd5ea67a94bda1698225e53264ae114903971957`; `shared/mapping/src/main/java/org/nzbhydra/searching/db/SearchEntityTO.java: 86da7e146a1b59d6a359ba6bc12805313fd9cefbf027ca30420cfddc2dabe7e2`; `tests/system/tests/search.spec.ts: 212b46905d4230d66da951bf377bff5d0b1ca009f74c3b055f965e38a4fc3d39`.
- Completed after the last change to each command's listed implementation/test file: yes for reusable evidence, React quality chain, and GUI; diff check is rerun after this documentation update.
- Task-owned changes after verification: this documentation-only handoff update before the final diff check.

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Architecture Decisions

- ADR-0001 through ADR-0005 remain followed: React uses the existing base-aware handwritten transport and Zod boundary, MUI rendering, layered verification, and the accepted recent-history contract.
- ADR REQUIRED: None.

### Assumptions

- `SearchEntityTO.source` is the accepted `INTERNAL` or `API` enum when present; missing/null values are rendered as `Unknown` rather than displaying unvalidated data.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- This correction handoff records the source-description correction and verification classification. Registry adoption remains unchanged.

### Follow-Up Work

- None.
