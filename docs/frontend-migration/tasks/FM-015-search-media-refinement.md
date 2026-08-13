# FM-015: Search Media Refinement

Status: done Owner: OpenCode
Feature IDs: F-SEARCH-FORM, F-SEARCH-MEDIA Component IDs: C-CATEGORY-CATALOG API IDs: API-SEARCH-EXECUTE, API-SEARCH-AUTOCOMPLETE, API-SEARCH-EMBY-SERIES, API-SEARCH-EMBY-MOVIE Depends on: FM-014 Blocks: FM-017, FM-019

## Outcome

React movie and TV searches support accessible autocomplete, identifier-backed selection, additional title terms, season/episode criteria, and configured Emby availability feedback through canonical search URLs.

## Boundary Rationale

Autocomplete selection, identifier/request transformation, media-only refinement fields, URL restoration, and result availability all describe one selected media search. Indexer choice is independent of media identity; recent/saved searches
follow after this task establishes the complete reusable media criteria.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/api/search.ts`, `core/ui-react/src/api/search.test.ts`, and new focused media API files under `core/ui-react/src/api/**`
- `core/ui-react/src/domain/categories/catalog.ts` and `core/ui-react/src/domain/categories/catalog.test.ts`, only to preserve and test the backend `SafeCategory.searchType` contract needed by media refinement
- `core/ui-react/src/features/search/{SearchPage.tsx,SearchPage.test.tsx,workspace/**,results/**}`
- `tests/system/tests/search.spec.ts`
- The listed feature/API records only; this task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read and search the entire repository. Context To Read is mandatory starting context, not a read allowlist. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Indexer-selection controls, recent/saved searches, guided tour, paging, or new media providers/backend endpoints

## Context To Read

- `CONTEXT.md`; accepted ADRs; FM-010, FM-012, and FM-014 handoffs; listed registry records
- `core/ui-src/js/search-controller.js`, `core/ui-src/js/categories-service.js`, `SafeCategory`, relevant search/result templates, `SearchWeb`, autocomplete/Emby web contracts, generated types, and `tests/system/tests/search.spec.ts`

## Acceptance

- Movie/TV behavior is determined by the selected category's validated backend `SafeCategory.searchType` (`MOVIE` or `TVSEARCH`), not category display names. Those categories debounce and request `API-SEARCH-AUTOCOMPLETE`; loading, empty, malformed, and failure states are intentional and keyboard/screen-reader operable while preserving `additional-query`, `autocomplete-popup`, and
  `autocomplete-option` selectors.
- Selecting or clearing a suggestion coherently controls title, additional query, provider IDs, season/episode visibility, focus, and canonical URL state; editing a selected title clears stale identifiers.
- Search requests preserve supported TMDB, IMDb, TVDB, TVMaze/TVRage identifiers and media criteria through the validated API boundary without changing plain-search behavior.
- Configured Emby checks use the selected applicable ID and show non-blocking available/unavailable/error behavior without delaying authoritative search results.
- Focused tests cover category-catalog `searchType` preservation, transformations, keyboard selection, URL restore/repeat semantics, and Emby gating. Stale-response isolation explicitly covers deferred autocomplete completion after suggestion selection, category change, and shortening/invalidating the title below the request threshold. Playwright validates deterministic movie and TV flows in React and retained legacy coverage.
- Registry evidence records concrete targets/tests without claiming indexer, history, or saved-search parity.

## Verification

- In `core/ui-react`: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts` succeeds.
- Run `git diff --check` and inspect `git status --short`; confirm only allowed paths and no unexpected generated files.

## Task Designer Refinement

- Independent re-review established that display-name inference cannot satisfy the existing movie/TV outcome for configured category names. FM-015 already owns `C-CATEGORY-CATALOG` and requires category-driven autocomplete, TV refinement, canonical media criteria, and legacy parity; preserving `SafeCategory.searchType` is therefore necessary integration, not a new product or architecture decision.
- The narrow catalog source/test allowance above is the only added write scope. Focused stale-response acceptance now names the two still-missing invalidation boundaries so the existing isolation requirement is deterministic and reviewable.
- Decision sources: FM-015 Outcome, Boundary Rationale, existing Acceptance, and `C-CATEGORY-CATALOG` dependency; `SafeCategory.searchType`; legacy `categories-service.js` preserving safe-category objects; legacy `search-controller.js` using `category.searchType` for autocomplete, category transitions, canonical mode, and TV controls; ADR-0003 boundary validation; and ADR-0004 focused domain/component testing. No new API, UX, architecture, or migration decision is introduced.

## Handoff

At handoff, use `templates/handoff.md`, fill every section, and mark this task `review` only after required verification succeeds.

### Outcome

- React movie and TV search supports debounced accessible autocomplete, identifier-backed canonical criteria, additional terms, TV season/episode criteria, and non-blocking configured-Emby availability feedback.

### Files Modified

- `core/ui-react/src/api/media.{ts,test.ts}`, `core/ui-react/src/features/search/{SearchPage.tsx,workspace/SearchWorkspace.{tsx,test.tsx}}`, `tests/system/tests/search.spec.ts`.
- `docs/frontend-migration/{APIS.yaml,FEATURES.yaml,STATUS.md,tasks/FM-015-search-media-refinement.md}`.
- Scope confirmation: all task-owned modifications are within the packet allowlist; no unexpected generated files are tracked.

### Toolchain

- Node: `v26.6.0`
- Package manager: `npm 11.18.0`
- Other material tools: Maven `3.9.16`; Playwright Chromium.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed: 22 files / 92 tests. Existing ESLint Fast Refresh/RHF warnings, npm audit findings (1 moderate, 2 high), and Vite chunk-size warning remain. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts` | Passed: 8 Playwright tests, including retained legacy coverage and deterministic React movie/TV media flows. |
| repository root | `git diff --check` | Passed before documentation-only handoff update. |
| repository root | `git status --short` | Inspected before documentation-only handoff update; only task-owned allowed paths. |

### Verification Basis

- Baseline: `b9462723efd9a23866d1db96a4a374dad527f1d1`.
- Command coverage: React quality chain covers `core/ui-react/src/api/media.{ts,test.ts}`, `core/ui-react/src/features/search/{SearchPage.tsx,workspace/SearchWorkspace.{tsx,test.tsx}}`; GUI additionally covers `tests/system/tests/search.spec.ts`. Diff/status cover all task-owned paths.
- File-content manifest: `core/ui-react/src/api/media.ts: f358f8f3f8b49060170cf0922fbcdba6a76a38d47265767c7817aa9568e63575`; `core/ui-react/src/api/media.test.ts: 3c1e45993bf59afc95484f27bea195d1b93a8a9206580a772b5ac3294bf1075f`; `core/ui-react/src/features/search/SearchPage.tsx: 816da94598b9764f3562a0b8118046141f2cf8029326cb0ded0f02fc444ee8eb`; `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx: ff8a4b0e3dcce4d1273076f1124aedd9a178193cab51e3fb5630f53f958bb720`; `core/ui-react/src/features/search/workspace/SearchWorkspace.test.tsx: fa5683c9b5f65bc4d222d3ecc0250ca9928efc899a52d0cbfdee6888863dc941`; `tests/system/tests/search.spec.ts: 50029098f43bbe902784cc702f6117cde4dc89da32fe3c409aaceaaa146c98f4`.
- Completed after the last change to each command's listed files: yes.
- Task-owned changes after verification: documentation/lifecycle-only `docs/frontend-migration/{STATUS.md,tasks/FM-015-search-media-refinement.md}`.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- ADR-0001 preserves canonical base-aware routes; ADR-0002 uses existing MUI, React Hook Form, and local state; ADR-0003 validates untrusted autocomplete/Emby payloads through the handwritten API boundary; ADR-0004 provides unit/component and retained legacy/React Playwright evidence.
- ADR REQUIRED proposal triggered during this task: None.

### Assumptions

- Emby availability is applicable only when safe configuration exposes both Emby base URL and API key and the selected media includes the backend-supported TMDB movie or TVDB series identifier.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- Updated `F-SEARCH-FORM`, `F-SEARCH-MEDIA`, and API records `API-SEARCH-AUTOCOMPLETE`, `API-SEARCH-EMBY-SERIES`, and `API-SEARCH-EMBY-MOVIE` with implementation/test targets.

### Follow-Up Work

- FM-016 remains responsible for indexer-selection controls; FM-017/FM-019 consume the completed media criteria for history and saved searches.

## Correction Handoff

### Result

- Invalidated autocomplete generations for title edits, category changes, selection, and invalid/short media titles so deferred requests cannot restore stale suggestions.
- Emby availability now resets for each submission and only the active submission generation may publish availability. Focused coverage exercises available, unavailable, error, and stale-result states.
- Added identifier-backed URL restore/repeat coverage and corrected API registry evidence to name the focused component tests.

### Verification Evidence

| Working directory | Command | Classification | Result |
|---|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Affected: `SearchPage.{tsx,test.tsx}` and `workspace/SearchWorkspace.{tsx,test.tsx}` changed. | Passed: 22 files / 98 tests. Existing ESLint Fast Refresh/RHF warnings, npm audit findings (1 moderate, 2 high), and Vite chunk-size warning remain. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts` | Affected: corrected runtime files changed. | Passed: 8 Playwright tests. |
| repository root | `git diff --check` | Affected: task-owned implementation, test, and registry files changed. | Passed before this documentation-only correction handoff update. |
| repository root | `git status --short` | Re-inspected. | Only supplied FM-015 task-attributable allowed paths; no unexpected generated files. |

### Verification Basis

- Baseline: `b9462723efd9a23866d1db96a4a374dad527f1d1`.
- Reusable prior evidence: none of the prior React quality-chain or GUI evidence is reusable because their covered task-owned runtime/test files changed. The previously verified `core/ui-react/src/api/media.{ts,test.ts}` and `tests/system/tests/search.spec.ts` contents are unchanged, but both required commands also cover changed files and were rerun once.
- Corrected command coverage: React quality chain covers `core/ui-react/src/api/media.{ts,test.ts}`, `core/ui-react/src/features/search/{SearchPage.{tsx,test.tsx},workspace/SearchWorkspace.{tsx,test.tsx}}`; GUI covers the corrected search runtime and `tests/system/tests/search.spec.ts`; migration validation covers `APIS.yaml`. Diff/status cover all task-owned paths.
- File-content manifest: `core/ui-react/src/api/media.ts: f358f8f3f8b49060170cf0922fbcdba6a76a38d47265767c7817aa9568e63575`; `core/ui-react/src/api/media.test.ts: 3c1e45993bf59afc95484f27bea195d1b93a8a9206580a772b5ac3294bf1075f`; `core/ui-react/src/features/search/SearchPage.tsx: abddfdafe0b99922e85358ebbc78214d9c788ed63fa2802ac7e2cd99d8e605ad`; `core/ui-react/src/features/search/SearchPage.test.tsx: 2d65a91b16271a7501c69b92b246e32e1c41d10343574da79bda7023f57ff49d`; `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx: e8e0eec521429a9fe8b9a7885f42355c402130065508dfc8a37cf21a2b4d9586`; `core/ui-react/src/features/search/workspace/SearchWorkspace.test.tsx: 74e3d471afa519d4f58d0ad08b9c3483c7eabb3549fd97850a0f2d5041c25c30`; `tests/system/tests/search.spec.ts: 50029098f43bbe902784cc702f6117cde4dc89da32fe3c409aaceaaa146c98f4`.
- Completed after the last change to every covered implementation/test file: yes. Post-verification task-owned changes: this documentation-only correction handoff.

### Blockers

- None. No ADR required.

## Correction Handoff: Cycle 2/2

### Result

- `CategoryCatalog` now validates and preserves backend `SafeCategory.searchType`; `SearchWorkspace` maps only `MOVIE` and `TVSEARCH` to autocomplete and TV refinement behavior, independent of category display names.
- Added catalog and nonliteral Cinema/Series component coverage, plus deterministic deferred-response isolation after category change and title shortening below the autocomplete threshold. Prior selection isolation and Emby corrections remain intact.

### Verification Evidence

| Working directory | Command | Classification | Result |
|---|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Affected: catalog runtime/test and SearchWorkspace runtime/test changed; registry validation also covers updated `APIS.yaml`. | Passed: 23 files / 103 tests. Existing ESLint Fast Refresh/RHF warnings, npm audit findings (1 moderate, 2 high), Node localStorage experimental warnings, and Vite chunk-size warning remain. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts` | Affected: corrected React runtime files are packaged and exercised by the required search system test. | Passed: 8 Playwright tests. |
| repository root | `git diff --check` | Affected: task-owned implementation, tests, registry, and handoff changed. | Passed after all corrections and handoff update. |
| repository root | `git status --short` | Re-inspected. | Only supplied FM-015 task-attributable allowed paths; no unexpected generated files. |

### Verification Basis

- Baseline: `b9462723efd9a23866d1db96a4a374dad527f1d1`.
- Reusable prior evidence: none for the React quality chain or GUI command. The chain covers changed catalog and workspace runtime/test paths; GUI is affected because it packages and runs the corrected React runtime. Unchanged API, SearchPage, and Playwright files do not make either aggregate command reusable.
- Command coverage: React quality chain covers `core/ui-react/src/api/media.{ts,test.ts}`, `core/ui-react/src/domain/categories/catalog.{ts,test.ts}`, and `core/ui-react/src/features/search/{SearchPage.{tsx,test.tsx},workspace/SearchWorkspace.{tsx,test.tsx}}`; GUI covers the packaged runtime and `tests/system/tests/search.spec.ts`; migration validation covers `APIS.yaml`. Diff/status cover all task-owned paths.
- File-content manifest: `core/ui-react/src/api/media.ts: f358f8f3f8b49060170cf0922fbcdba6a76a38d47265767c7817aa9568e63575`; `core/ui-react/src/api/media.test.ts: 3c1e45993bf59afc95484f27bea195d1b93a8a9206580a772b5ac3294bf1075f`; `core/ui-react/src/domain/categories/catalog.ts: 390b45b0c48157012d78211a31f73965adf4511788a28e31cf918af6fbcc3def`; `core/ui-react/src/domain/categories/catalog.test.ts: 2524eaed76700528b752051a82a38fd5413c012e7849661ec8b1f3cc378b45e5`; `core/ui-react/src/features/search/SearchPage.tsx: abddfdafe0b99922e85358ebbc78214d9c788ed63fa2802ac7e2cd99d8e605ad`; `core/ui-react/src/features/search/SearchPage.test.tsx: 2d65a91b16271a7501c69b92b246e32e1c41d10343574da79bda7023f57ff49d`; `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx: f84a90173995721cd24caaec006172ff89dc869d8996608816059d096fcfe480`; `core/ui-react/src/features/search/workspace/SearchWorkspace.test.tsx: 6bcb1d399f20c1e0b933c33e44c080603482e54399e39099d4b997ee7099c539`; `tests/system/tests/search.spec.ts: 50029098f43bbe902784cc702f6117cde4dc89da32fe3c409aaceaaa146c98f4`.
- Completed after the last change to every covered implementation/test file: yes. Post-verification task-owned changes: this handoff only.

### Blockers

- None. No ADR required.

## Closure

- Done after FM-025 passed as the narrowly scoped remediation for FM-015 request-adaptation defects.
