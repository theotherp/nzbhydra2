# FM-014: Search Live Progress

Status: planned Owner:
Feature IDs: F-SEARCH-PROGRESS Component IDs: C-LIVE-TRANSPORT API IDs: API-SEARCH-SHORTCUT, API-LIVE-SOCKJS, API-LIVE-SEARCH-STATE Depends on: FM-010 Blocks: F-PLATFORM-LIVE-STATUS

## Outcome

React search displays live search progress with a shortcut to currently available results through a reusable base-aware SockJS/STOMP transport.

## Boundary Rationale

Live search state gives an FM-010 request its progress and early-results lifecycle. The connection lifecycle is shared with future application status channels as `C-LIVE-TRANSPORT`; media refinement, which has independent request and
presentation behavior, remains a separate task.

## Files Allowed To Modify

- `core/ui-react/package.json` and `core/ui-react/package-lock.json`, only to add exact production dependencies `sockjs-client` and `@stomp/stompjs`; add `@types/sockjs-client` only if the selected SockJS package does not provide usable
  TypeScript declarations
- `core/ui-react/src/api/live/**`
- `core/ui-react/src/api/search.ts` and `core/ui-react/src/api/search.test.ts`, only for `API-SEARCH-SHORTCUT`
- `core/ui-react/src/features/search/{SearchPage.tsx,SearchPage.test.tsx,workspace/**}`
- `tests/system/tests/search.spec.ts`
- The `F-SEARCH-PROGRESS`, `C-LIVE-TRANSPORT`, and listed API records only
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository. Context To Read is mandatory starting context, not a read allowlist. Do not modify files outside Files Allowed To Modify; escalate the exact path and reason if one is required.

## Out Of Scope

- Media autocomplete and identifier refinement, indexer-selection controls, recent searches, guided tour/demo lifecycle, paging, result-table changes, downloader status, notifications, and a global client store
- Backend STOMP routing, generated API type edits, or an unrestricted WebSocket abstraction

## Context To Read

- `CONTEXT.md`, `ADR-0002` through `ADR-0004`, and FM-005/FM-006/FM-010 handoffs
- `F-SEARCH-PROGRESS`, `C-LIVE-TRANSPORT`, and all listed API records
- `core/ui-src/js/search-controller.js`, `core/ui-src/js/search-service.js`, and `core/ui-src/html/search-state.html`
- `SearchWeb`, `MediaInfoWeb`, current WebSocket configuration, and `tests/system/tests/search.spec.ts`

## Acceptance

- `C-LIVE-TRANSPORT` derives `{baseUrl}websocket`, uses SockJS and STOMP without root-relative URLs, manages connect/reconnect/subscription cleanup, and exposes typed scoped subscriptions without a global store.
- Before calling `API-SEARCH-EXECUTE`, the client allocates its request ID and establishes a `/topic/searchState` subscription scoped to that ID so that the synchronous initial server state cannot be missed. A bounded
  connection/subscription timeout proceeds with the HTTP search and visible live-progress-unavailable feedback rather than blocking search submission.
- A submitted search opens an accessible `search-status-modal`, ignores messages for other request IDs, renders progress/messages, requests the legacy shortcut through `API-SEARCH-SHORTCUT`, and offers early results only after a
  result-bearing progress state. Close/unmount releases the subscription exactly once.
- Connection, parse, timeout, and shortcut failures retain a usable search/result page with visible feedback; the completed HTTP response remains authoritative for FM-010 results.
- Unit/component tests cover subscription lifecycle, cross-request isolation, shortcut, early results, and failures. Playwright exercises deterministic progress in React while preserving equivalent legacy selector coverage.
- Registry records identify the new live transport and adopted API targets/tests; downloader-status and notification channels remain unimplemented.

## Verification

- In `core/ui-react`: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts` succeeds with deterministic React STOMP progress coverage.
- From repository root: `git diff --check` and `git status --short`; confirm all changed/generated paths are allowed and report unexpected artifacts.

## Handoff

### Result

Record delivered progress behavior and exclusions.

### Verification

Use `templates/handoff.md`; record commands, results, scope check, and SHA-256 verification basis.

### Decisions

Record connection lifecycle and request-state decisions.

### Dependency/toolchain decisions

Record dependencies, versions, and actual Node/npm versions, or `None`.

### Assumptions

Record material assumptions, or `None`.

### Unresolved issues

Record deferred or blocked work, or `None`.

### Follow-up

Record bounded follow-up proposals, or `None`.
