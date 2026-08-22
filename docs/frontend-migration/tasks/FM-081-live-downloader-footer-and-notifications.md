# FM-081: Live Downloader Footer And In-App Notifications

Status: planned Owner:
Feature IDs: F-PLATFORM-LIVE-STATUS
Component IDs: C-DOWNLOADER-STATUS, C-LIVE-TRANSPORT, C-APP-SHELL, C-TOAST-SERVICE
API IDs: API-LIVE-SOCKJS, API-LIVE-DOWNLOADER-STATUS, API-LIVE-DOWNLOADER-CONNECT, API-LIVE-NOTIFICATIONS, API-LIVE-NOTIFICATION-READ
Depends on: None
Blocks: None

## Outcome

The React shell gains legacy's two cross-route live surfaces: the downloader-status footer (state, queue, rates
sparkline) and in-app notification toasts fed by `/topic/notifications`. Both are permanent shell subscribers of
`C-LIVE-TRANSPORT`'s one SockJS/STOMP connection and both render into the shell's bottom/toast layers, so they ship
together. This closes `F-PLATFORM-LIVE-STATUS`' last unmigrated capability (FM-062's noted follow-up).

## Decision Dependencies

ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015, ADR-0017 (visibility reads the reactive safe config),
ADR-0021 (chart layer precedent: `@mui/x-charts`, themed).

## Files Allowed To Modify

- `core/ui-react/src/app/status/**`, `core/ui-react/src/app/AppShell.tsx` (+ its test)
- `core/ui-react/src/api/live/**` (downloader-status + notifications message modules and their tests)
- `tests/system/tests/smoke.spec.ts` (absence/presence assertion only)
- The `F-PLATFORM-LIVE-STATUS`, `C-DOWNLOADER-STATUS`, `C-LIVE-TRANSPORT`, and `C-APP-SHELL` records; the five API records above
- This task packet and `docs/frontend-migration/STATUS.md`

## Out Of Scope

- Backend websocket behavior; the notification settings tab and history page (done); update banners (FM-080)

## Context To Read

- `core/ui-src/js/directives/downloaderStatusFooter.js` and `core/ui-src/html/directives/downloader-status-footer.html`
  (fields, state-icon mapping, 200-point rolling window, `lastUpdateForNow` self-advance, visibility buffering)
- `core/ui-src/js/directives/hydra-checks-footer.js:289-351` (toast mapping, overflow rule, mark-read acks)
- `core/ui-react/src/api/live/transport.ts` and `searchState.ts` (existing connection lifecycle and message-module pattern)
- `APIS.yaml`'s `API-LIVE-DOWNLOADER-CONNECT` note (legacy passes a callback where STOMP headers belong — send correctly here)

## Acceptance

- Downloader footer renders across routes iff the safe config's `downloading.showDownloaderStatus` and at least one
  enabled downloader exist (reactive per ADR-0017: saving config updates it without reload). It subscribes to
  `API-LIVE-DOWNLOADER-STATUS` and requests the initial state via `API-LIVE-DOWNLOADER-CONNECT` with proper STOMP
  headers.
- Footer content per legacy: downloader logo linking its URL (new tab), a state indicator with tooltip
  (Downloading/Paused/Offline/other), "{rate} • {remaining} • " only while downloading, "{n} in queue" unless offline,
  and the current title with percent (and remaining time when present); a message without `downloaderType` is ignored.
- The rate sparkline is a themed `@mui/x-charts` mini area chart over a rolling 200-point window seeded from
  `downloadingRatesInKilobytes`, appending `lastDownloadRate` per update; on `lastUpdateForNow` it self-advances once per
  second with the last known rate until the window is uniform, and stops advancing when fresh data arrives. A hidden tab
  must not grow memory unboundedly; on becoming visible the chart resumes cleanly. The chart is decorative — the textual
  state above is the accessible surface (ADR-0021's data-reachability intent).
- Notification toasts: iff the safe config's `notificationConfig.displayNotifications` and the session `maySeeAdmin`,
  subscribe to `API-LIVE-NOTIFICATIONS`; each message maps INFO/SUCCESS/WARNING/FAILURE to the matching toast severity,
  rendering the body as text with newlines as line breaks (never HTML). When a batch exceeds
  `displayNotificationsMax`, show instead one info toast "{n} notifications have piled up." linking `/stats/notifications`.
  Every handled notification with a defined id is acked via `API-LIVE-NOTIFICATION-READ`; undefined ids are skipped.
- Both subscriptions disconnect/clean up on unmount; a connection failure degrades silently (no footer, no toast storm).
- Selectors (new): `downloader-status-footer`, `downloader-status-state`, `downloader-status-queue`, recorded on
  `F-PLATFORM-LIVE-STATUS`; the feature's parity is reconciled once FM-079/FM-080/this task's portions are all in.
- Component tests (STOMP layer mocked, `searchState` pattern) cover visibility gating, state mapping, the rolling
  window + self-advance stop conditions, toast mapping, the overflow rule, ack behavior, and cleanup. Playwright asserts
  only footer absence on the shared instance (no downloader enabled) — it must not reconfigure downloaders. Registry
  evidence updated (five API adoptions). Screenshot strip per *Visual Gate*: the footer in downloading and offline
  states (component-driven capture acceptable), desktop plus mobile.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/smoke.spec.ts` succeeds.
- Confirm changed files match `Files Allowed To Modify`; `git diff --check` clean.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — live-transport lifecycle across two subscriptions, a stateful rolling chart, parity from dense
  legacy source.
- Reviewer: `opus` — extends `C-LIVE-TRANSPORT`'s shared usage; matches the implementer's tier.
- Fixer: `opus` — likely findings sit in lifecycle/cleanup and window semantics.

Implementer prompt: Start from `searchState.ts`'s message-module pattern, then map `downloaderStatusFooter.js`'s update
paths. Trap: legacy's `API-LIVE-DOWNLOADER-CONNECT` send passes a callback where headers belong — send a correct STOMP
frame and verify the initial-state reply actually arrives. Prove first the self-advance interval's two stop conditions.
Reviewer prompt: Check hardest subscription cleanup (route unmount, connection failure) and that no notification body is
ever rendered as HTML; distrust chart-behavior claims not pinned by fake-timer tests.
