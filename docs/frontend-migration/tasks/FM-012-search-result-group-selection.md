# FM-012: Search Result Grouping And Selection

Status: done Owner: OpenCode
Feature IDs: F-SEARCH-GROUP-SELECTION Component IDs: C-RESULT-TABLE API IDs: API-SEARCH-EXECUTE Depends on: FM-011 Blocks: FM-013
Decision Dependencies: ADR-0002, ADR-0003, ADR-0004

## Outcome

React search results provide duplicate, title, and eligible episode grouping with expansion, row selection, invert/select-all/deselect-all controls, and shift-selection semantics.

## Boundary Rationale

Grouping defines visible rows and selection defines the bulk-action input, so both must operate over one explicit domain result model. Downloading is separate because it adds binary/network side effects after this task makes the selection
set trustworthy.

## Files Allowed To Modify

- `core/ui-react/src/api/search.ts` and `core/ui-react/src/api/search.test.ts`, only to preserve and test the existing search-response fields required by this task
- `core/ui-react/src/features/search/SearchPage.tsx` and `core/ui-react/src/features/search/SearchPage.test.tsx`, only to preserve the existing requested-episode route state through submission, pass that state explicitly to results, and test that integration
- `core/ui-react/src/features/search/results/**`
- `tests/system/tests/results.spec.ts`
- The `F-SEARCH-GROUP-SELECTION`, `C-RESULT-TABLE`, and `API-SEARCH-EXECUTE` records only
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository. Context To Read is mandatory starting context, not a read allowlist. Do not modify files outside Files Allowed To Modify; escalate the exact path and reason if one is required.

## Out Of Scope

- Download actions, paging, saved searches, server preferences, external links, covers, NFO, and Emby availability
- Changes to sorting/filtering semantics except integration required to preserve the FM-011 filtered result set
- Adding season/episode form controls, changing the search-request/API contract, or modifying `core/ui-react/src/features/search/workspace/**`; broader media-search capability remains outside FM-012

## Context To Read

- `CONTEXT.md`, `ADR-0002` through `ADR-0004`, and FM-010/FM-011 handoffs
- `F-SEARCH-GROUP-SELECTION`, `C-RESULT-TABLE`, and `API-SEARCH-EXECUTE`
- `core/ui-react/src/api/search.ts`, `core/ui-react/src/api/search.test.ts`, and the generated `SearchResultWebTO` type
- `core/ui-react/src/features/search/{SearchPage.tsx,SearchPage.test.tsx,workspace/SearchWorkspace.tsx,workspace/SearchWorkspace.test.tsx}`
- `core/ui-src/js/search-results-controller.js`, `core/ui-src/js/directives/search-result.js`, and `core/ui-src/js/directives/selection-button.js`
- `core/ui-src/html/{states/search-results.html,directives/search-result.html}` and `tests/system/tests/results.spec.ts`

## Acceptance

- Explicit result-domain logic groups by normalized title and duplicate hash, preserves the torrent/Usenet grouping choice, and applies eligible TV episode grouping only when no episode is requested. Search submission preserves an existing requested-episode route criterion during canonical navigation and passes its presence explicitly from the route/search-state owner to result grouping; result rendering must not infer this state from `window.location`.
- `API-SEARCH-EXECUTE` response validation preserves valid optional `hash`, `downloadType`, `showtitle`, `season`, and `episode` values needed by grouping, while absent grouping metadata and malformed results retain the established FM-010/FM-011 handling; focused API tests cover this boundary.
- Collapsed groups expose deterministic expansion controls; duplicate/title/episode group rendering remains keyboard operable and does not create duplicate visible row identities.
- Row checkboxes, select all, deselect all, invert selection, and shift-selection operate over current visible filtered ordering. Filtering removes selections no longer visible.
- `search-result-row` remains stable, and each visible row retains result ID/title data contracts needed by system tests.
- Pure grouping and selection transformations have exhaustive unit tests, including malformed/titleless values and grouped duplicate boundaries. A focused SearchPage integration test proves requested-episode route state survives submission and disables episode grouping. Component tests use actual keyboard input for row checkboxes and bulk-selection buttons, including keyboard shift-range selection; mouse-click-only coverage does not satisfy this criterion. Playwright deterministically validates group expansion and bulk selection in both legacy and React shells.
- No download endpoint or action is called by this task; selected rows are exposed only as local result-table state for FM-013.

## Verification

- In `core/ui-react`: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/results.spec.ts` succeeds with deterministic legacy-shell and React-shell group-expansion and bulk-selection coverage.
- From repository root: `git diff --check` and `git status --short`; confirm all changed/generated paths are allowed and report unexpected artifacts.

## Handoff

### Result

Record grouping/selection behavior and exclusions.

### Verification

Use `templates/handoff.md`; record commands, results, scope check, and SHA-256 verification basis.

### Decisions

Record grouping keys, ordering, and selection semantics.

### Dependency/toolchain decisions

Record dependencies, versions, and actual Node/npm versions, or `None`.

### Assumptions

Record material assumptions, or `None`.

### Unresolved issues

Record deferred or blocked work, or `None`.

### Follow-up

Record bounded follow-up proposals, or `None`.

## Task Designer Refinement

- The pre-implementation blocker below is resolved by the constrained API source/test and `API-SEARCH-EXECUTE` registry allowances above. These fields are existing `SearchResultWebTO` response properties consumed by the legacy grouping behavior, so preserving them is part of this task's original grouping outcome rather than a new API or architecture decision.
- Independent review found that the original result-only write scope could not satisfy the accepted rule that episode grouping is disabled for a search with an episode criterion: FM-010's `SearchPage` owns route state and canonical submission navigation, while legacy `SearchResultsController` derives eligibility from `$stateParams.episode`. The narrowly added `SearchPage.{tsx,test.tsx}` allowance is therefore required integration for the existing FM-012 outcome, not F-SEARCH-MEDIA expansion. `workspace/**` remains disallowed because no form-schema or UI change is needed.
- ADR-0004 and the existing keyboard/parity acceptance require interaction evidence rather than mouse-only component simulation and React-only Playwright coverage. The clarified component and dual-shell criteria change no implementation scope.
- Decision source for every contract change: FM-012 Outcome and original episode-grouping acceptance; FM-010's established `SearchPage` route/submission ownership and canonical URL contract; legacy `core/ui-src/js/search-results-controller.js` lines 175-177; `F-SEARCH-GROUP-SELECTION`/`C-RESULT-TABLE`; and accepted ADR-0004. No new product, API, architecture, or migration decision is introduced.

## Handoff

### Outcome

- React results now group normalized titles, duplicate hashes, and eligible TV episodes, with a torrent/Usenet grouping control. Collapsed groups provide keyboard-operable expansion controls.
- Selection is local result-table state only: row, visible select-all, deselect-all, invert, and shift-range selection work over current filtered/sorted visible rows. Filtering clears selections no longer in the filtered result set. No download endpoint or action is invoked.

### Files Modified

- `core/ui-react/src/api/search.{ts,test.ts}`; `core/ui-react/src/features/search/results/{SearchResults.tsx,SearchResults.test.tsx,resultTable.ts,resultTable.test.ts}`; `tests/system/tests/results.spec.ts`.
- `docs/frontend-migration/{FEATURES.yaml,COMPONENTS.yaml,APIS.yaml,STATUS.md,tasks/FM-012-search-result-group-selection.md}`.
- Scope confirmation: all task-attributable modifications are within `Files Allowed To Modify`; no unexpected generated artifacts are tracked.

### Toolchain

- Node: `v26.6.0`
- Package manager: `npm 11.18.0`
- Other material tools: Maven `3.9.16`; Playwright Chromium.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed: 18 files / 56 tests, production build, API check, and migration validation. Lint has only the existing React Compiler Fast Refresh/RHF/TanStack compatibility warnings; `npm ci` reports 3 audit vulnerabilities (1 moderate, 2 high); Vite reports the existing chunk-size warning. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/results.spec.ts` | Passed: 10 Playwright tests, including legacy coverage plus React duplicate expansion and visible bulk selection. |
| repository root | `git diff --check` | Passed. |
| repository root | `git status --short` | Inspected; all 12 task-attributable paths are allowed and no unexpected artifacts are tracked. |

### Verification Basis

- Baseline: `fdead85a0acf0b78b26223d69ef98cf48c93f2b1`.
- Command coverage: the React quality command covers `core/ui-react/src/api/search.ts`, `core/ui-react/src/api/search.test.ts`, and all four task-owned `core/ui-react/src/features/search/results/*` files. The GUI command additionally covers `tests/system/tests/results.spec.ts` and those runtime files. Diff/status cover all task-owned paths.
- File-content manifest: `core/ui-react/src/api/search.ts: 0c27fa93bc0e020ddd6bfb94e138d9e062ec29908ac661aeff4ccbc73a2ab0dd`; `core/ui-react/src/api/search.test.ts: e017c2ba3e8b5d34e1483cd5a3a7c6867228ff7c9c937e4001b208b20ffec8b9`; `core/ui-react/src/features/search/results/SearchResults.tsx: eed396b6ea9e99753205d6f9fff88065a52fa0cfa0a85d4132a3e9f426638d02`; `core/ui-react/src/features/search/results/SearchResults.test.tsx: 7c0023b191786da49ef3db97d6e068ea52203b9473b73b93ad9ee86eadc443c1`; `core/ui-react/src/features/search/results/resultTable.ts: 4012a056299eb2dd0310942bd099afd39d32fc1d71f8f1b4d50389f836c0b615`; `core/ui-react/src/features/search/results/resultTable.test.ts: 45befef5e3ec5f566bd928c399dde7139fae4da73483530df8cfdd99fee9c63c`; `tests/system/tests/results.spec.ts: 98f33ebd4cc5ab328eca9327c75c4f3e8a35ad9dec527728a1ec8bfa742f9e73`.
- Completed after the last change to each command's listed files: yes.
- Task-owned changes after verification: documentation/lifecycle-only `docs/frontend-migration/STATUS.md` and this packet handoff; no implementation or test file changed after this basis.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- ADR-0002: MUI controls and TanStack Table retain explicit Hydra grouping/selection domain logic. ADR-0003: the handwritten API boundary validates grouping metadata without editing generated types. ADR-0004: pure transformations, component interaction/accessibility, and Playwright shell parity are covered.
- ADR REQUIRED: None.

### Assumptions

- An `episode` query parameter indicates an explicitly requested episode and disables automatic TV episode grouping, matching legacy behavior.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- Updated `F-SEARCH-GROUP-SELECTION`, `C-RESULT-TABLE`, and `API-SEARCH-EXECUTE` only.

### Follow-Up Work

- FM-013 owns consuming the exposed local selection state for download actions.

## Correction Handoff

### Result

- SearchPage now preserves a string `episode` route criterion during canonical submission navigation and explicitly passes its presence to SearchResults. SearchResults no longer inspects `window.location` for grouping eligibility.
- Focused SearchPage coverage proves that an episode request is retained and leaves same-episode TV rows ungrouped. Result-table interaction coverage now uses keyboard Enter/Space and includes keyboard shift-range selection.
- The Playwright spec uses a deterministic intercepted grouped response for React and legacy group-expansion/bulk-selection flows. The legacy fixture remains unable to produce the required duplicate-expansion control.

### Verification Correction

- Affected and passed: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` (18 files / 57 tests). Existing lint warnings, npm audit findings, and Vite chunk-size warning remain.
- Affected and blocked: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/results.spec.ts`. Ten of eleven Playwright tests pass, including React group expansion/bulk selection. The final legacy test intercepts the same deterministic grouped response but times out waiting for `.duplicate-expand-toggle`; its page snapshot reports `No indexers were picked for this search`. The response now includes the required `indexerSearchMetaDatas`, so the prior field-name mismatch is not the remaining cause. See the final run at `misc/.gui-systemtest-runs/20260812_144221_109788`.
- Affected and passed: `git diff --check fdead85a0acf0b78b26223d69ef98cf48c93f2b1`.
- Reusable prior evidence: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` remains reusable: every React implementation/test file covered by it is byte-identical to the prior passed 18-file/57-test basis. API/search-result transformation evidence is also unchanged. `git status --short` was re-inspected and lists only allowed task-owned paths.

### Verification Basis

- Baseline: `fdead85a0acf0b78b26223d69ef98cf48c93f2b1`.
- Affected quality-chain files: `core/ui-react/src/features/search/SearchPage.tsx`, `core/ui-react/src/features/search/SearchPage.test.tsx`, `core/ui-react/src/features/search/results/SearchResults.tsx`, and `core/ui-react/src/features/search/results/SearchResults.test.tsx`; all were verified before this handoff update.
- Affected GUI files: the preceding React runtime files and `tests/system/tests/results.spec.ts`; GUI verification remains blocked as recorded above.
- SHA-256: `api/search.ts 0c27fa93bc0e020ddd6bfb94e138d9e062ec29908ac661aeff4ccbc73a2ab0dd`; `api/search.test.ts e017c2ba3e8b5d34e1483cd5a3a7c6867228ff7c9c937e4001b208b20ffec8b9`; `SearchPage.tsx f850bb2666f53c9d92397c8c2a3b39741b352fcee9bfe17d2fdb109b20d7bb84`; `SearchPage.test.tsx af452a1f5a0e87b9625dce42b874aee2f48aa4a4e1188d9455738f91beda6548`; `SearchResults.tsx 86d522205d0f757b9331caf08a9afe940eee5307f80f159cfce78515ba2f3e0e`; `SearchResults.test.tsx 7c1304f114ee06c190e1e06c5a2b41810298d0698e534186c023a3a7307886dd`; `resultTable.ts 4012a056299eb2dd0310942bd099afd39d32fc1d71f8f1b4d50389f836c0b615`; `resultTable.test.ts 45befef5e3ec5f566bd928c399dde7139fae4da73483530df8cfdd99fee9c63c`; `results.spec.ts dc7ab8f6689c925789581173f566e9097c66c0b421d8ff7f1e653934da86e288`.
- Completed after the last change to each command's covered implementation/test files: React quality chain yes; GUI no (failed final required run); diff check yes. Task-owned changes after the final GUI run: this handoff only.

### Unresolved Issues

- BLOCKED: required legacy-shell Playwright expansion/bulk-selection evidence does not pass. This correction cycle is exhausted. No architecture decision or ADR is required; the remaining fixture/rendering failure must be investigated in a new authorized correction cycle while staying within `tests/system/tests/results.spec.ts`.
