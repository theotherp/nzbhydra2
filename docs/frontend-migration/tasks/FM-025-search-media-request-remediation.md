# FM-025: Search Media Request Remediation

Status: done Owner: OpenCode
Feature IDs: F-SEARCH-FORM, F-SEARCH-MEDIA Component IDs: C-CATEGORY-CATALOG API IDs: API-SEARCH-EXECUTE, API-SEARCH-EMBY-SERIES, API-SEARCH-EMBY-MOVIE Depends on: FM-014; consumes the failed FM-015 implementation candidate at baseline `b9462723efd9a23866d1db96a4a374dad527f1d1` Blocks: FM-016, FM-017

## Outcome

The FM-015 candidate submits TV refinement criteria without requiring a selected autocomplete identifier and chooses Emby availability requests from the selected category's validated media type and applicable selected identifier.

## Boundary Rationale

Search payload construction and post-search Emby selection are the two failed request-adaptation defects in the same FM-015 media submission lifecycle and share the selected category/media state. Their focused regression tests make this one narrowly reviewable remediation. FM-015 catalog, URL, autocomplete, and availability lifecycle behavior is preserved rather than reopened; indexer selection and recent-search reuse remain separate dependent capabilities.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/SearchPage.tsx`
- `core/ui-react/src/features/search/SearchPage.test.tsx`
- The `F-SEARCH-FORM` and `F-SEARCH-MEDIA` records in `docs/frontend-migration/FEATURES.yaml`, only for verified remediation evidence
- The `API-SEARCH-EXECUTE`, `API-SEARCH-EMBY-SERIES`, and `API-SEARCH-EMBY-MOVIE` records in `docs/frontend-migration/APIS.yaml`, only for verified remediation evidence
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read and search the entire repository. Context To Read is mandatory starting context, not a read allowlist. Do not modify files outside Files Allowed To Modify; in particular, do not reopen FM-015 catalog, workspace, media API, or Playwright files.

## Out Of Scope

- Changing category-catalog `searchType` validation, form fields, canonical URL semantics, autocomplete behavior, Emby transport/API validation, result rendering, or backend endpoints
- Indexer selection, recent/saved searches, paging, or broad FM-015 cleanup/refactoring
- Weakening or replacing FM-015 tests; only focused regression coverage may be added

## Context To Read

- `CONTEXT.md`; ADR-0001 through ADR-0004; FM-014 handoff; all FM-015 handoffs and its current task-attributable diff from baseline `b9462723efd9a23866d1db96a4a374dad527f1d1`; FM-016 and FM-017
- Listed feature/component/API records; `core/ui-react/AGENTS.md`; `SearchPage.tsx` and its focused tests; search request and media API boundaries; category catalog contract
- Legacy `search-controller.js` submission/category behavior, `search-service.js`, `search-results-controller.js` Emby mode behavior, and backend `EmbyWeb`

## Acceptance

- For a selected category whose validated `SafeCategory.searchType` is `TVSEARCH`, submitting an unselected typed title with valid season and episode sends that title/query plus season and episode to `API-SEARCH-EXECUTE`, even when every media identifier is absent.
- Plain non-media (`SEARCH` and other non-movie/TV search types) request payload behavior remains unchanged; media-only fields are not newly emitted for those searches.
- When Emby is configured and a suggestion is selected, availability derives both endpoint/type and ID from the selected category's validated `searchType`: `MOVIE` uses the movie endpoint with TMDB, and `TVSEARCH` uses the series endpoint with TVDB. A selected TV suggestion carrying both TMDB and TVDB IDs uses the TV endpoint and TVDB ID.
- Emby remains post-search, non-blocking, error-tolerant, and stale-submission-safe. Existing FM-015 catalog `searchType`, canonical URL, identifier/autocomplete, and selection-clearing behavior remains unchanged.
- Focused component tests assert the exact `API-SEARCH-EXECUTE` payload for unselected typed TV season/episode and unchanged plain search, and assert the exact endpoint/query used for the dual-ID selected-TV Emby case. Existing FM-015 focused tests continue to pass without removal, skipping, or weakened assertions.
- Registry evidence, if changed, names only passing focused tests and does not claim FM-016/FM-017 capability completion.

## Verification

- In `core/ui-react`: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: run `git diff --check`; inspect `git status --short` and `git diff --name-only b9462723efd9a23866d1db96a4a374dad527f1d1`; confirm task changes are within this allowlist, pre-existing FM-015-attributable files outside it were not changed by FM-025, and no unexpected generated files exist.
- Record SHA-256 values for both task-owned implementation/test files after their last change. If the full quality chain cannot run for an environmental reason, record the exact failed command and environment evidence; do not mark the task `review` or unblock dependents.

## Handoff

At handoff, use `templates/handoff.md` and fill every section. Additionally record: the exact TV and plain-search request payloads asserted; the exact dual-ID TV Emby URL asserted; confirmation that the selected category's validated `searchType` is the decision source; regression results for preserved FM-015 URL/autocomplete/non-blocking/stale-safe behavior; the baseline and final SHA-256 manifest; and explicit write-scope compliance. Mark this task `review` only after all verification succeeds. FM-016 and FM-017 remain blocked until fresh review passes and the coordinator marks FM-025 `done`.

## Implementation Handoff

### Outcome

- The remediation uses the selected catalog category's validated `searchType` to include valid unselected TV season/episode criteria and to select Emby endpoint/identifier pairs.
- The exact unselected TV payload asserted is `{query: "Example Show", category: "Series", indexers: ["Configured"], loadAll: false, searchRequestId: number, season: 2, episode: "5"}`. The unchanged plain-search assertion is `{query: "query", category: "All", minage: 2, maxsize: 50, indexers: ["Configured"], loadAll: false, searchRequestId: number}` with no media-only fields.
- The exact dual-ID selected-TV Emby URL asserted is `http://localhost:3000/hydra/internalapi/emby/isSeriesAvailable?tvdbId=7`; the TV category's `TVSEARCH`, rather than the co-present TMDB ID, is the decision source.
- Existing FM-015 URL, autocomplete, non-blocking Emby, and stale-generation behavior passed the focused and full test suites; retained Playwright movie/TV autocomplete flows passed.

### Files Modified

- `core/ui-react/src/features/search/SearchPage.tsx`
- `core/ui-react/src/features/search/SearchPage.test.tsx`
- `docs/frontend-migration/{FEATURES.yaml,APIS.yaml,STATUS.md}` and this task packet
- Scope confirmation: all FM-025-owned modifications are within `Files Allowed To Modify`; resumed FM-015 and FM-025 planning changes are preserved and not claimed as FM-025 implementation work.

### Toolchain

- Node: `v26.6.0`
- Package manager: `npm 11.18.0`
- Other material tools: Maven `3.9.16`; Playwright Chromium

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed: 23 files / 105 tests. Existing lint warnings (Fast Refresh/React Hook Form), npm audit findings (1 moderate, 2 high), Node localStorage experimental warnings, and Vite chunk-size warning remain. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts` | Passed: Maven package build and 8 Playwright search tests, including retained movie/TV autocomplete flows. |
| repository root | `git diff --no-ext-diff --check` | Passed. |
| repository root | `git status --short` and `git diff --no-ext-diff --name-only b9462723efd9a23866d1db96a4a374dad527f1d1` | Inspected: only supplied resumed FM-015/planning paths and FM-025 allowlisted paths; no unexpected generated files. |

### Verification Basis

- Baseline: `b9462723efd9a23866d1db96a4a374dad527f1d1`.
- Command coverage: the React quality chain and GUI command cover `core/ui-react/src/features/search/SearchPage.tsx` and `core/ui-react/src/features/search/SearchPage.test.tsx`; migration validation also covers the updated registries. `git diff --check` and status/name inspection cover all task-owned paths.
- File-content manifest: `core/ui-react/src/features/search/SearchPage.tsx: f49ec4bf1d0c0e22fc235995bfb813c98dbddb8740a0d65db578c610fd26d233`; `core/ui-react/src/features/search/SearchPage.test.tsx: 7064e690171ac7020b11aa34ddc430f3d38ebb74a99430e27543d50c99493aec`.
- Completed after the last change to each command's listed implementation/test file: yes.
- Task-owned changes after verification: this packet and `STATUS.md` lifecycle/handoff documentation only; no implementation or test file changed after the recorded basis.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- ADR-0001 preserves canonical routes; ADR-0002 retains React Hook Form/MUI/local feature state; ADR-0003 retains the existing handwritten validated transport boundary; ADR-0004 uses focused component coverage for request adaptation.
- ADR REQUIRED proposal triggered during this task: None. The packet explicitly consumes the failed FM-015 candidate and lists no blocking decision dependencies.

### Assumptions

- `CategoryCatalog` has already validated `SafeCategory.searchType`; the selected category is therefore the authoritative media mode, consistent with the legacy controller and Emby result behavior.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- F-SEARCH-FORM, F-SEARCH-MEDIA, API-SEARCH-EXECUTE, API-SEARCH-EMBY-SERIES, and API-SEARCH-EMBY-MOVIE identify the focused remediation coverage without claiming FM-016/FM-017 completion.

### Follow-Up Work

- FM-016 and FM-017 remain blocked pending fresh review and coordinator completion of FM-025.
