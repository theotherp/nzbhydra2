# FM-014: Search Live Progress

Status: done Owner: OpenCode
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

- Delivered a base-aware SockJS/STOMP live transport and request-scoped `/topic/searchState` parsing for React search. The request ID is allocated and its subscription is ready before `API-SEARCH-EXECUTE`; connection/subscribe timeout or errors visibly fall back to the authoritative HTTP result.
- The accessible `search-status-modal` renders live messages and indexer progress, including connection, parse, timeout, and shortcut failure alerts while the modal is open. It offers the shortcut only for a legacy-format positive result-count message, isolates other request IDs, and releases the matching subscription exactly once after completion, replacement, or unmount. Cancellation, downloader status, and notification channels remain excluded.

### Verification

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed after correction cycle 3: 21 files / 88 tests. `npm ci` reported 3 audit vulnerabilities (1 moderate, 2 high). Existing lint warnings only; Vite emitted its existing chunk-size warning. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts` | Passed after correction cycle 3: 7 Playwright tests, including deterministic React progress modal coverage and retained legacy coverage. |
| repository root | `git diff --check` | Passed. |
| repository root | `git status --short` | Only FM-014 allowed paths plus the three supplied unrelated external/user paths; no unexpected generated artifacts. |

### Verification Basis

- Baseline: `3069ef420c92945bd245d90c1e1ce75a6458c6a8`.
- Classification: the prior React quality-chain and GUI evidence are affected because `SearchPage.tsx` and `SearchPage.test.tsx` changed; both commands were rerun once after the final correction. `git diff --check` is affected and was rerun. `git status --short` is an inspection and was rerun. The React quality chain covers `package.json`, `package-lock.json`, `src/api/live/{transport,transport.test,searchState,searchState.test}.ts`, `src/api/{search,search.test}.ts`, and `src/features/search/{SearchPage,SearchPage.test}.tsx`; GUI covers `src/api/live/{transport,searchState}.ts`, `src/api/search.ts`, `src/features/search/SearchPage.tsx`, and `tests/system/tests/search.spec.ts`.
- File-content manifest: `core/ui-react/package.json: d5e3858d6491f80e69edad065f3b07826abca9a06a760c5a0c837c8140855862`; `core/ui-react/package-lock.json: d783a8486666e3e91cfa50074dae93fd2d63e4ecf045609299356474ba4edd36`; `core/ui-react/src/api/live/transport.ts: ac3d8151630dba4b1e5a47c14b002b9f17fe4f766df10785d55eb30792caeb06`; `core/ui-react/src/api/live/transport.test.ts: 7ea5bc3447c39e49f8ba661ff45efc3fa906c5a469768e79fb9c322cc4c7a0d5`; `core/ui-react/src/api/live/searchState.ts: ea8553d3dd05884f6975ffd437b0094beffd19ef4b5a157f01aeaee636592978`; `core/ui-react/src/api/live/searchState.test.ts: b81ecaa4d877051a67ebbb11a0fd19e03b0dc7186826123678ef930f45d5c1e7`; `core/ui-react/src/api/search.ts: 5bd348f0f2717bb6af6343a3b0d2f2961653ab987d9e5ac581a4b6594d8ba2b2`; `core/ui-react/src/api/search.test.ts: 176bcd670e839daf9dba43c8d0b78ec4fa803b30e91b97dfe44594421abb3b79`; `core/ui-react/src/features/search/SearchPage.tsx: 11959e748ed36880559a7f5af26321d4ccfc4433768686777b70b60b379f1cb0`; `core/ui-react/src/features/search/SearchPage.test.tsx: 29f69e1362a75496583b0946e73d27894dc41e2d6796e016145cef8bc6a243c6`; `tests/system/tests/search.spec.ts: f31a6dcdce14e7fa2500024bb594e4b3257c0906d8222df6f692998cf5ac3eca`.
- Completed after the last change to every listed implementation/test file: yes. The only post-quality-chain task-owned change is this handoff documentation; no implementation or test file changed afterward.

### Decisions

- Used a narrow registered `C-LIVE-TRANSPORT`, with one STOMP client per scoped subscription and a 1.5-second ready bound. STOMP reconnection is enabled while active; closure unsubscribes and force-deactivates exactly once.
- Parsed and filtered live state at the API boundary before feature delivery. The early-results condition matches the legacy modal's `/^[^0]\d+.*/` positive-count message rule; completed indexers alone, zero-result messages, and errors do not enable it. HTTP completion remains the source of truth; parse, connection, timeout, and shortcut failures leave the page usable with visible feedback.

### Dependency/toolchain decisions

- Runtime: exact `sockjs-client 1.6.1` and `@stomp/stompjs 7.3.0`, required by ADR-0002 and this transport. Development: exact `@types/sockjs-client 1.5.4`, required because SockJS does not ship usable declarations.
- Node `v26.6.0`; npm `11.18.0`; Maven `3.9.16`; Playwright Chromium.

### Assumptions

- The existing `/topic/searchState` payload fields and `{baseUrl}websocket` endpoint are the contract evidenced by `SearchWeb` and `WebSocketConfig`.

### Unresolved issues

- None.

### Follow-up

- Add cancellation only with the owning backend contract; reuse `C-LIVE-TRANSPORT` for downloader status and notifications in their respective tasks without expanding this task's scope.
