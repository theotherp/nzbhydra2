# FM-013: Search Download Actions

Status: done Owner: OpenCode
Feature IDs: F-SEARCH-DOWNLOADS Component IDs: C-DOWNLOAD-ACTIONS, C-RESULT-TABLE API IDs: API-SEARCH-EXECUTE, API-DOWNLOAD-NZB, API-DOWNLOAD-TORRENT, API-DOWNLOAD-ADD-NZBS, API-DOWNLOAD-CHECK-DUPLICATE, API-DOWNLOAD-CATEGORIES,
API-DOWNLOAD-SAVE-SEND-TORRENTS, API-DOWNLOAD-SAVE-NZBS, API-DOWNLOAD-ZIP-PREPARE, API-DOWNLOAD-ZIP-FILE Depends on: FM-012 Blocks: F-HISTORY-DOWNLOADS migration
Decision Dependencies: ADR-0002, ADR-0003, ADR-0004

## Outcome

React search results support equivalent single and selected-result NZB, torrent, downloader, ZIP, black-hole, magnet, and copy-link workflows with duplicate-movie confirmation and intentional result-state updates.

## Boundary Rationale

All listed operations share selected results, downloader/category choice, duplicate checking, binary delivery, and post-action downloaded state. Splitting them would produce unsafe or unusable action variants; download history is a separate
route and consumer of the shared domain behavior.

## Files Allowed To Modify

- `core/ui-react/src/api/search.ts` and `core/ui-react/src/api/search.test.ts`, only to preserve and test the existing `downloadId`, `originalCategory`, and `downloadedAt` search-response fields required by FM-013; do not broaden the search contract
- `core/ui-react/src/api/transport.ts` and `core/ui-react/src/api/transport.test.ts`, only for required binary/download support
- `core/ui-react/src/domain/downloads/**`
- `core/ui-react/src/features/search/results/**`
- `tests/system/tests/downloads.spec.ts`
- The `F-SEARCH-DOWNLOADS`, `C-DOWNLOAD-ACTIONS`, `C-RESULT-TABLE`, and listed API records only; `API-SEARCH-EXECUTE` changes are limited to recording preservation/tests for those three response fields without changing its endpoint ownership or other contract claims
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository. Context To Read is mandatory starting context, not a read allowlist. Do not modify files outside Files Allowed To Modify; escalate the exact path and reason if one is required.

## Out Of Scope

- Download-history route migration, downloader configuration, live downloader status, `C-LIVE-TRANSPORT`/FM-014 records or implementation, generic file upload, and a general binary-client redesign
- Search paging, saved searches, NFO/details links, or an external-link abstraction

## Context To Read

- `CONTEXT.md`, `ADR-0002` through `ADR-0004`, and FM-005/FM-006/FM-012 handoffs
- `F-SEARCH-DOWNLOADS`, `C-DOWNLOAD-ACTIONS`, `C-RESULT-TABLE`, and all listed API records
- `core/ui-react/src/api/search.ts`, `core/ui-react/src/api/search.test.ts`, generated `SearchResultWebTO`, and server `SearchResultWebTO`, `AddFilesRequest`, and `DownloadIdentifier` contracts
- `core/ui-src/js/{nzb-download-service,downloader-categories-service,downloader-request-service}.js`
- `core/ui-src/js/directives/{addable-nzb,addable-nzbs,download-nzbs-button,download-nzbzip-button,copy-links-button,save-or-send-torrent}.js`
- `core/ui-src/html/directives/search-result.html` and `tests/system/tests/downloads.spec.ts`

## Acceptance

- `C-DOWNLOAD-ACTIONS` owns typed result-to-operation transformations and invokes every listed API only through the base-aware transport. Direct NZB/torrent browser transfers and copied links use a narrowly scoped transport-owned primitive that resolves application-base-relative transfer URLs; feature code does not construct application/API URLs.
- `API-SEARCH-EXECUTE` validation preserves valid optional `downloadId`, `originalCategory`, and `downloadedAt` values, with focused API tests covering present and absent/null values. Download operations prefer `downloadId` over `searchResultId`, preserve `originalCategory`, and map the existing response `category` to `AddFilesRequest.SearchResult.mappedCategory`; they do not invent a `mappedCategory` search-response field.
- Every visible result row renders exactly one direct-download action in its intended action location, never one copy per data cell. Single-result actions preserve direct NZB/torrent downloads and selected-result actions cover downloader send, ZIP, black-hole, torrent/magnet save-or-send, and copy-link behavior when configured and permitted.
- Downloader and category choices use validated server responses; duplicate-movie checks show an accessible confirmation before a requested send, and cancelling that confirmation issues no downloader-send request and causes no downloaded/selection-state change.
- The adopted categories, duplicate-check, action, and ZIP response payloads are runtime-validated at the downloads domain boundary before use. Authorization, unavailable configuration, category-loading failure, request failure, cancellation, and malformed response states have accessible feedback through existing dialog/toast conventions; category failure is not represented as a successful empty category list, and unsafe actions preserve the CSRF contract.
- Successful actions update only affected local downloaded/selection state according to legacy behavior and do not silently remove unrelated selections.
- Domain/component tests cover every listed workflow, request construction, runtime payload rejection, category-load failure feedback, exactly one direct action per visible row, and duplicate-confirmation cancellation with no send or state update. Playwright exercises every listed workflow that the deterministic system-test configuration makes genuinely available in React and retains legacy comparison coverage. The handoff names each workflow exercised at each tier and records the exact missing fixture/configuration for any workflow that cannot be made available; no optional downloader workflow is silently omitted or skipped.
- Registry records identify concrete targets, tests, and validated contract quality without claiming download-history parity.

## Verification

- In `core/ui-react`: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/downloads.spec.ts` succeeds with React workflow coverage.
- From repository root: `git diff --check` and `git status --short`; confirm all changed/generated paths are allowed and report unexpected artifacts.

## Handoff

### Result

Record delivered action variants and configuration-gated exclusions.

### Verification

Use `templates/handoff.md`; record commands, results, scope check, and SHA-256 verification basis.

### Decisions

Record binary transport and post-action state decisions.

### Dependency/toolchain decisions

Record dependencies, versions, and actual Node/npm versions, or `None`.

### Assumptions

Record material assumptions, or `None`.

### Unresolved issues

Record deferred or blocked work, or `None`.

### Follow-up

Record bounded follow-up proposals, or `None`.

## Task Designer Refinement

- The implementer blocker is resolved by the constrained `api/search.{ts,test.ts}` and `API-SEARCH-EXECUTE` allowances above. This keeps the API-boundary adaptation with the download capability that requires it and does not authorize unrelated search-contract work.
- Decision source: FM-013 Outcome and existing transformation/state acceptance; accepted ADR-0003 and ADR-0004; server `SearchResultWebTO` fields `downloadId`, `originalCategory`, and `downloadedAt`; `AddFilesRequest.SearchResult`; `DownloadIdentifier`; and legacy `addable-nzb.js` identifier/category/state behavior. The server response has `category`, not `mappedCategory`; legacy evidence authoritatively maps that value into the operation's `mappedCategory` field.
- FM-012 is done, so the refined task is dependency-ready. No product, UX, architecture, or external API decision changed, and no ADR is required.
- Review-failure refinement: the existing Outcome, ADR-0003 boundary-validation/base-aware file-transfer decision, ADR-0004 exhaustive domain/component/Playwright strategy, `C-API-TRANSPORT`, the task-listed API records, and legacy direct/copy/category/duplicate workflows require the clarified one-action rendering, transport-owned browser-transfer URL resolution, runtime validation/error feedback, and workflow-by-workflow test evidence above. These changes add no endpoint, product behavior, or shared runtime boundary.
- `C-LIVE-TRANSPORT` remains `planned` under FM-014. Its post-baseline `planned` to `partial` hunk had no corresponding FM-014 implementation, is outside this packet's allowed records, and is excluded from FM-013 corrective scope.

## Handoff

### Outcome

- Added typed download-operation construction, configured downloader/category selection, duplicate-movie confirmation, black-hole/torrent, ZIP, copy-link, and direct NZB/torrent actions to React search results.
- Operations prefer `downloadId`, preserve `originalCategory`, map response `category` to `mappedCategory`, and update only successful affected downloaded/selection state.

### Files Modified

- `core/ui-react/src/api/{search,transport}.{ts,test.ts}`; `core/ui-react/src/domain/downloads/**`; `core/ui-react/src/features/search/results/{DownloadActions,SearchResults}.{tsx,test.tsx}`; `tests/system/tests/downloads.spec.ts`.
- `docs/frontend-migration/{FEATURES,COMPONENTS,APIS}.yaml`, `STATUS.md`, and this packet.
- Scope confirmation: all task-owned modifications are allowed. Declared unrelated changes remain in `core/ui-src/js/search-results-controller.js` and `core/src/main/resources/static/js/nzbhydra.js`; this task did not modify them.

### Toolchain

- Node: `v26.6.0`
- Package manager: `npm 11.18.0`
- Other material tools: Maven `3.9.16`; Playwright Chromium.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed: 19 files / 62 tests; existing lint warnings, 3 npm audit findings, and Vite chunk-size warning remain. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/downloads.spec.ts` | Passed: 3 Playwright workflows, including React selected-result SABnzbd send. |
| repository root | `git diff --check` | Passed. |
| repository root | `git status --short` | Inspected; task-owned paths allowed and no unexpected task artifacts. |

### Verification Basis

- Baseline: `8a058b45f1d1650766e6a7def964458656d0c50f`.
- Command coverage: React quality covers `core/ui-react/src/api/search.{ts,test.ts}`, `core/ui-react/src/api/transport.{ts,test.ts}`, `core/ui-react/src/domain/downloads/{actions,actions.test}.ts`, and `core/ui-react/src/features/search/results/{DownloadActions,SearchResults}.{tsx,test.tsx}`. GUI additionally covers `tests/system/tests/downloads.spec.ts`. Diff/status cover all task-owned paths.
- File-content manifest: `core/ui-react/src/api/search.ts: 0a4b8a3284087fa5181d25a320afea4686d737e224339a96c15adae62c42519d`; `core/ui-react/src/api/search.test.ts: 5ef20b1900d53273a0ad237126e04efc1547bb3e177f2e91763b4be37ed191d8`; `core/ui-react/src/api/transport.ts: 267a7361365a09f476affd2b0e9c73bf0ca0cfe0f2990ffde7959f1efd4d99ff`; `core/ui-react/src/api/transport.test.ts: e23840c5f2ec5a0ac3fc03e7a6fd10e0db74490379c0771f444170f015e72c64`; `core/ui-react/src/domain/downloads/actions.ts: fc9c358a8edacce836a1461aef6d9dcdaf844975ac6ce50b2b1c11ed8c0f4e3f`; `core/ui-react/src/domain/downloads/actions.test.ts: a4f2f642b389bbfdf18dd5ef05f3eb6a6c2f1ff639ab5223b85ee2bf1dbb623a`; `core/ui-react/src/features/search/results/DownloadActions.tsx: ba801b0a0ebc3f31d98f6d267aabaa44c1d26c6998d5ab089c1dcfca3d5d1ba7`; `core/ui-react/src/features/search/results/SearchResults.tsx: 72b2408ef3c5ad11c6c28300e668e62cd9831860e4cc1ebcfcdfd601575c152f`; `core/ui-react/src/features/search/results/SearchResults.test.tsx: 112705f75d49e73b87940d6a326d06eb985552ddcc9c6d6fdf9ee7e6265a1a73`; `tests/system/tests/downloads.spec.ts: 47c73db12fc325dbfc390454a939d89479efcddd19ddcc86dc15996e7154032b`.
- Completed after the last change to each command's listed files: yes.
- Task-owned changes after verification: documentation/lifecycle-only `docs/frontend-migration/STATUS.md` and this packet handoff.

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Architecture Decisions

- ADR-0002: existing MUI controls and typed feature/domain actions. ADR-0003: handwritten boundary validation and base-aware binary transfer with CSRF. ADR-0004: domain, component/accessibility, and Playwright coverage.
- ADR REQUIRED: None.

### Assumptions

- Successful `addedIds` identify the numeric portion of an operation identifier, matching server `DownloadIdentifier` and legacy action behavior.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- Updated `F-SEARCH-DOWNLOADS`, `C-DOWNLOAD-ACTIONS`, `C-RESULT-TABLE`, `API-SEARCH-EXECUTE`, and task-listed download API records.

### Follow-Up Work

- Download history remains deferred to `F-HISTORY-DOWNLOADS`.

## Correction Handoff

### Result

- Direct NZB/torrent actions now render once in each visible row title/action location rather than once per table cell.
- Download-domain boundaries validate categories, duplicate checks, action results, and ZIP preparation responses; unavailable downloader configuration, category load failures, and malformed/request failures have accessible feedback.
- Browser transfer and copied-link URLs use the narrow `ApiTransport.browserTransferUrl` base-aware primitive.

### Verification Correction

- Affected and passed: React quality chain from `core/ui-react` (`npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration`): 19 files / 68 tests. Existing five lint warnings, three npm audit findings, and Vite chunk-size warning remain.
- Affected and passed: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/downloads.spec.ts`: 4 Playwright workflows, including React selected SABnzbd send and React direct NZB browser transfer.
- Affected and passed: `git diff --check`; `git status --short` was inspected for scope.
- Deterministic system-test configuration supplies one NZB result and SABnzbd only. It has no configured black-hole, ZIP, torrent, or magnet endpoint/result fixture, so direct torrent, ZIP, black-hole, torrent/magnet save-or-send, and copy-link cannot be exercised by this Playwright fixture. They are covered at domain/component tier where deterministic configuration is not required; no workflow is skipped.

### Verification Basis

- Baseline: `8a058b45f1d1650766e6a7def964458656d0c50f`.
- React quality and GUI evidence are affected and were run after the final implementation/test changes. Diff/status are affected and were run after all task changes.
- Reusable prior evidence: API search-field preservation (`api/search.{ts,test.ts}`) is byte-identical to the prior basis; all other task-owned implementation/test coverage was affected by this correction.
- File-content manifest: `core/ui-react/src/api/search.ts: 0a4b8a3284087fa5181d25a320afea4686d737e224339a96c15adae62c42519d`; `core/ui-react/src/api/search.test.ts: 5ef20b1900d53273a0ad237126e04efc1547bb3e177f2e91763b4be37ed191d8`; `core/ui-react/src/api/transport.ts: a061a272144f7a549ea87d044bf2550a7adcad1d5dacd0b92986e35a8bc136af`; `core/ui-react/src/api/transport.test.ts: 567edc682675845ae5cdd3aa50a9518e8a8e3d62382e78b132667137ed3abf9b`; `core/ui-react/src/domain/downloads/actions.ts: 29879371c9f44aa76fd0e242560d04cbb63435a6ad1e66f755dbee56ca88e1ff`; `core/ui-react/src/domain/downloads/actions.test.ts: 690a4185d1bd7b0624bbd2b3d7ea2507fffa20150c7753a19aa2460dacbae043`; `core/ui-react/src/features/search/results/DownloadActions.tsx: 27827fb892684b0f9163ce4121b26a9f5388ba47785453f767e6a2a862f973d2`; `core/ui-react/src/features/search/results/SearchResults.tsx: 01431bb25caa42c7d7d835768877ef15a28b2c725e837390b9d57860a3984dc7`; `core/ui-react/src/features/search/results/SearchResults.test.tsx: 29bf639eb7feb667a6bbc5d27e421dd5205663a963fffecfd1ca7548a615fc04`; `tests/system/tests/downloads.spec.ts: 929661595ad4a049a0b3ad29720c4bd4736c89daba6918cced90656afabb9ace`.
- Task-owned changes after verification: this documentation-only correction handoff.

### Scope And Attribution

- Task-owned files remain within the packet allowlist; `C-DOWNLOAD-ACTIONS` is partial and `C-LIVE-TRANSPORT` remains baseline `planned`/FM-014.
- Pre-existing unrelated files encountered and untouched: `core/ui-src/js/search-results-controller.js`; `core/src/main/resources/static/js/nzbhydra.js`.
- No attribution overlap or ambiguity; no files were staged, committed, or pushed.

## Correction Cycle 2 Handoff

### Result

- A successful ZIP preparation payload must now include a non-empty `zipFilepath`; malformed responses neither transfer nor update downloaded/selection state and show error feedback.
- Selected TORBOX results are sent only to a TORBOX downloader. SABnzbd/NZBGet-compatible sends exclude TORBOX results, and an all-incompatible selection receives accessible feedback without a duplicate-check or send request.
- Focused component workflows now exercise black-hole NZB, torrent/magnet, ZIP preparation plus binary transfer, and copied links, in addition to retained duplicate-confirmation send/cancel behavior.

### Verification Correction

- Superseded: the prior correction's React quality and GUI evidence covered implementation/test content changed in this cycle.
- Affected and passed: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` from `core/ui-react`: 19 files / 74 tests. Existing five lint warnings, three npm audit findings, and Vite chunk-size warning remain.
- Affected and passed: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/downloads.spec.ts`: 4 Playwright workflows, including React selected SABnzbd send and React direct NZB browser transfer.
- Affected and passed after all task-owned changes: `git diff --check`; `git status --short` inspected for scope.
- The deterministic GUI fixture provides an NZB result and SABnzbd only; it has no black-hole, ZIP, torrent/magnet, or TORBOX endpoint/result fixture. Those workflows are credibly covered by focused React component tests; the GUI command retains every genuinely available workflow.

### Verification Basis

- Baseline: `8a058b45f1d1650766e6a7def964458656d0c50f`.
- React quality is affected because `core/ui-react/src/domain/downloads/{actions,actions.test}.ts`, `core/ui-react/src/features/search/results/DownloadActions.tsx`, and `SearchResults.test.tsx` changed. GUI is affected by the React implementation/test revision. Diff/status are affected by all task-owned changes.
- Reusable prior evidence: `core/ui-react/src/api/search.{ts,test.ts}`, `core/ui-react/src/api/transport.{ts,test.ts}`, `core/ui-react/src/features/search/results/SearchResults.tsx`, and `tests/system/tests/downloads.spec.ts` are byte-identical to the prior basis; they remain covered by the rerun React quality chain, and the unchanged Playwright specification was rerun as required for the changed runtime.
- File-content manifest: `core/ui-react/src/api/search.ts: 0a4b8a3284087fa5181d25a320afea4686d737e224339a96c15adae62c42519d`; `core/ui-react/src/api/search.test.ts: 5ef20b1900d53273a0ad237126e04efc1547bb3e177f2e91763b4be37ed191d8`; `core/ui-react/src/api/transport.ts: a061a272144f7a549ea87d044bf2550a7adcad1d5dacd0b92986e35a8bc136af`; `core/ui-react/src/api/transport.test.ts: 567edc682675845ae5cdd3aa50a9518e8a8e3d62382e78b132667137ed3abf9b`; `core/ui-react/src/domain/downloads/actions.ts: 13b0e1d1f25b77aea8f1815d01202c8dc93d1830fd86a986a01ef135e1e1cf8d`; `core/ui-react/src/domain/downloads/actions.test.ts: 8828d6baec96605faffac4e659da61ecf8e3580c31074d1ee9bd7228ace42cbc`; `core/ui-react/src/features/search/results/DownloadActions.tsx: f6f78614248c654a68dea0762d03f16d9265204ffd7fb654bda59c81ea092cb9`; `core/ui-react/src/features/search/results/SearchResults.tsx: 01431bb25caa42c7d7d835768877ef15a28b2c725e837390b9d57860a3984dc7`; `core/ui-react/src/features/search/results/SearchResults.test.tsx: 18d61c991975bfe974c9842ae75fc96e88b5c1380d84fba0f79bf4d0e22a127b`; `tests/system/tests/downloads.spec.ts: 929661595ad4a049a0b3ad29720c4bd4736c89daba6918cced90656afabb9ace`.
- Completed after the last change to every listed implementation/test file: yes. Task-owned changes after verification: this documentation-only handoff.

### Scope And Attribution

- Task-attributable files modified in this cycle: `core/ui-react/src/domain/downloads/actions.ts`, `core/ui-react/src/domain/downloads/actions.test.ts`, `core/ui-react/src/features/search/results/DownloadActions.tsx`, `core/ui-react/src/features/search/results/SearchResults.test.tsx`, and this allowed task packet.
- Pre-existing unrelated files encountered and untouched: `core/ui-src/js/search-results-controller.js`; `core/src/main/resources/static/js/nzbhydra.js`.
- No attribution overlap or ambiguity. No files were staged, committed, or pushed.

## Correction Cycle 3 Handoff

### Result

- The direct-torrent component test now proves each torrent row has exactly one action with a base-aware `gettorrent/user/{id}` link.
- The test proves `downloadId` is preferred (`torrent-download-id`) and separately proves fallback to `searchResultId` (`torrent-result-id`).

### Verification Correction

- Affected and passed once: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` from `core/ui-react`: 19 files / 74 tests. Existing five lint warnings, three npm audit findings, and Vite chunk-size warning remain.
- Reused GUI evidence: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/downloads.spec.ts` previously passed 4 workflows. All runtime files and `tests/system/tests/downloads.spec.ts` covered by its prior basis are byte-identical; this correction changes only the component test.
- Affected and passed after this correction: `git diff --check`; `git status --short` inspected for scope.

### Verification Basis

- Baseline: `8a058b45f1d1650766e6a7def964458656d0c50f`.
- React quality is affected because `core/ui-react/src/features/search/results/SearchResults.test.tsx` changed and was run after its final revision. GUI is reusable because every covered runtime/system-test file is byte-identical to Correction Cycle 2. Diff/status are affected by this correction.
- File-content manifest: `core/ui-react/src/api/search.ts: 0a4b8a3284087fa5181d25a320afea4686d737e224339a96c15adae62c42519d`; `core/ui-react/src/api/search.test.ts: 5ef20b1900d53273a0ad237126e04efc1547bb3e177f2e91763b4be37ed191d8`; `core/ui-react/src/api/transport.ts: a061a272144f7a549ea87d044bf2550a7adcad1d5dacd0b92986e35a8bc136af`; `core/ui-react/src/api/transport.test.ts: 567edc682675845ae5cdd3aa50a9518e8a8e3d62382e78b132667137ed3abf9b`; `core/ui-react/src/domain/downloads/actions.ts: 13b0e1d1f25b77aea8f1815d01202c8dc93d1830fd86a986a01ef135e1e1cf8d`; `core/ui-react/src/domain/downloads/actions.test.ts: 8828d6baec96605faffac4e659da61ecf8e3580c31074d1ee9bd7228ace42cbc`; `core/ui-react/src/features/search/results/DownloadActions.tsx: f6f78614248c654a68dea0762d03f16d9265204ffd7fb654bda59c81ea092cb9`; `core/ui-react/src/features/search/results/SearchResults.tsx: 01431bb25caa42c7d7d835768877ef15a28b2c725e837390b9d57860a3984dc7`; `core/ui-react/src/features/search/results/SearchResults.test.tsx: ffc737421876e44d56fefecc45a3f7283ea015653f5c315cf871bb4d36ef0801`; `tests/system/tests/downloads.spec.ts: 929661595ad4a049a0b3ad29720c4bd4736c89daba6918cced90656afabb9ace`.
- Task-owned changes after verification: this documentation-only handoff.

### Scope And Attribution

- Task-attributable files modified in this cycle: `core/ui-react/src/features/search/results/SearchResults.test.tsx` and this allowed FM-013 packet.
- Pre-existing unrelated files encountered and untouched: `core/ui-src/js/search-results-controller.js`; `core/src/main/resources/static/js/nzbhydra.js`.
- No attribution overlap or ambiguity. No files were staged, committed, or pushed.

## Correction Cycle 4 Handoff

### Result

- ZIP preparation and NZB black-hole operations now select only results whose `downloadType` is exactly `NZB`; TORBOX remains eligible only for a TORBOX downloader send.
- Focused component coverage proves an all-TORBOX selection disables ZIP, sends no black-hole request, and remains selected without a downloaded-state update. Prior direct-torrent evidence is unchanged.

### Verification Correction

- Superseded: Correction Cycle 3 React and GUI evidence because the results action runtime and component test changed.
- Affected and passed once: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` from `core/ui-react`: 19 files / 75 tests. Existing five lint warnings, three npm audit findings, and Vite chunk-size warning remain.
- Affected and passed once: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/downloads.spec.ts`: 4 Playwright workflows, including React selected SABnzbd send and React direct NZB browser transfer.
- Affected and passed after all task-owned changes: `git diff --check`; `git status --short` inspected for scope.
- The deterministic GUI fixture provides an NZB result and SABnzbd only; it has no black-hole, ZIP, torrent/magnet, or TORBOX endpoint/result fixture. The TORBOX exclusion is covered by the focused React component test; GUI retains every genuinely available workflow.

### Verification Basis

- Baseline: `8a058b45f1d1650766e6a7def964458656d0c50f`.
- React quality and GUI are affected because `core/ui-react/src/features/search/results/DownloadActions.tsx` changed; React quality is also affected by `SearchResults.test.tsx`. The GUI specification is unchanged but the runtime it covers changed. Diff/status are affected by all task-owned changes.
- Reusable prior evidence: API search and transport files, download-domain files, `SearchResults.tsx`, and `tests/system/tests/downloads.spec.ts` are byte-identical to Correction Cycle 3; the rerun React and GUI commands also cover their applicable unchanged content.
- File-content manifest: `core/ui-react/src/api/search.ts: 0a4b8a3284087fa5181d25a320afea4686d737e224339a96c15adae62c42519d`; `core/ui-react/src/api/search.test.ts: 5ef20b1900d53273a0ad237126e04efc1547bb3e177f2e91763b4be37ed191d8`; `core/ui-react/src/api/transport.ts: a061a272144f7a549ea87d044bf2550a7adcad1d5dacd0b92986e35a8bc136af`; `core/ui-react/src/api/transport.test.ts: 567edc682675845ae5cdd3aa50a9518e8a8e3d62382e78b132667137ed3abf9b`; `core/ui-react/src/domain/downloads/actions.ts: 13b0e1d1f25b77aea8f1815d01202c8dc93d1830fd86a986a01ef135e1e1cf8d`; `core/ui-react/src/domain/downloads/actions.test.ts: 8828d6baec96605faffac4e659da61ecf8e3580c31074d1ee9bd7228ace42cbc`; `core/ui-react/src/features/search/results/DownloadActions.tsx: b99187a888294de60c9147c989f1ca391137e7f95b6760610a0dc0da759b5ed7`; `core/ui-react/src/features/search/results/SearchResults.tsx: 01431bb25caa42c7d7d835768877ef15a28b2c725e837390b9d57860a3984dc7`; `core/ui-react/src/features/search/results/SearchResults.test.tsx: 87fa7b28ff3fb03200949517695fddc36bf0433b9b016e51ea9a5f449aa236e1`; `tests/system/tests/downloads.spec.ts: 929661595ad4a049a0b3ad29720c4bd4736c89daba6918cced90656afabb9ace`.
- Completed after the last change to every listed implementation/test file: yes. Task-owned changes after verification: this documentation-only handoff.

### Scope And Attribution

- Task-attributable files modified in this cycle: `core/ui-react/src/features/search/results/DownloadActions.tsx`, `core/ui-react/src/features/search/results/SearchResults.test.tsx`, and this allowed FM-013 packet.
- Pre-existing unrelated files encountered and untouched: `core/ui-src/js/search-results-controller.js`; `core/src/main/resources/static/js/nzbhydra.js`.
- No attribution overlap or ambiguity. No files were staged, committed, or pushed.
