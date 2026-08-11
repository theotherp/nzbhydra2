# FM-013: Search Download Actions

Status: planned Owner:
Feature IDs: F-SEARCH-DOWNLOADS Component IDs: C-DOWNLOAD-ACTIONS, C-RESULT-TABLE API IDs: API-DOWNLOAD-NZB, API-DOWNLOAD-TORRENT, API-DOWNLOAD-ADD-NZBS, API-DOWNLOAD-CHECK-DUPLICATE, API-DOWNLOAD-CATEGORIES,
API-DOWNLOAD-SAVE-SEND-TORRENTS, API-DOWNLOAD-SAVE-NZBS, API-DOWNLOAD-ZIP-PREPARE, API-DOWNLOAD-ZIP-FILE Depends on: FM-012 Blocks: F-HISTORY-DOWNLOADS migration

## Outcome

React search results support equivalent single and selected-result NZB, torrent, downloader, ZIP, black-hole, magnet, and copy-link workflows with duplicate-movie confirmation and intentional result-state updates.

## Boundary Rationale

All listed operations share selected results, downloader/category choice, duplicate checking, binary delivery, and post-action downloaded state. Splitting them would produce unsafe or unusable action variants; download history is a separate
route and consumer of the shared domain behavior.

## Files Allowed To Modify

- `core/ui-react/src/api/transport.ts` and `core/ui-react/src/api/transport.test.ts`, only for required binary/download support
- `core/ui-react/src/domain/downloads/**`
- `core/ui-react/src/features/search/results/**`
- `tests/system/tests/downloads.spec.ts`
- The `F-SEARCH-DOWNLOADS`, `C-DOWNLOAD-ACTIONS`, `C-RESULT-TABLE`, and listed `API-DOWNLOAD-*` records only
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository. Context To Read is mandatory starting context, not a read allowlist. Do not modify files outside Files Allowed To Modify; escalate the exact path and reason if one is required.

## Out Of Scope

- Download-history route migration, downloader configuration, live downloader status, generic file upload, and a general binary-client redesign
- Search paging, saved searches, NFO/details links, or an external-link abstraction

## Context To Read

- `CONTEXT.md`, `ADR-0002` through `ADR-0004`, and FM-005/FM-006/FM-012 handoffs
- `F-SEARCH-DOWNLOADS`, `C-DOWNLOAD-ACTIONS`, `C-RESULT-TABLE`, and all listed API records
- `core/ui-src/js/{nzb-download-service,downloader-categories-service,downloader-request-service}.js`
- `core/ui-src/js/directives/{addable-nzb,addable-nzbs,download-nzbs-button,download-nzbzip-button,copy-links-button,save-or-send-torrent}.js`
- `core/ui-src/html/directives/search-result.html` and `tests/system/tests/downloads.spec.ts`

## Acceptance

- `C-DOWNLOAD-ACTIONS` owns typed result-to-operation transformations and invokes every listed API only through the base-aware transport or a narrowly added binary primitive.
- Single-result actions preserve direct NZB/torrent downloads and selected-result actions cover downloader send, ZIP, black-hole, torrent/magnet save-or-send, and copy-link behavior when configured and permitted.
- Downloader and category choices use the server response; duplicate-movie checks show an accessible confirmation before a requested send and cancel produces no side effect.
- Authorization, unavailable configuration, request failure, cancellation, and malformed response states have accessible feedback through existing dialog/toast conventions; unsafe actions preserve the CSRF contract.
- Successful actions update only affected local downloaded/selection state according to legacy behavior and do not silently remove unrelated selections.
- Component tests cover request construction and confirmations; Playwright validates each available workflow against configured mock downloaders in React and retains legacy comparison coverage. No test is skipped for unavailable optional
  downloader types; report a fixture gap instead.
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
