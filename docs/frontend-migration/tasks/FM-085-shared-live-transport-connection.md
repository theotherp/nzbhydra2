# FM-085: Shared Live-Transport Connection

Status: planned Owner:
Feature IDs: F-PLATFORM-LIVE-STATUS, F-SEARCH-PROGRESS Component IDs: C-LIVE-TRANSPORT API IDs: API-LIVE-SOCKJS Depends on: None Blocks: None

## Outcome

`C-LIVE-TRANSPORT` multiplexes all concurrent subscriptions over one SockJS/STOMP client instead of opening one client and socket per `subscribe()` call — the consolidation packet FM-081's handoff proposed when it moved the component to
`done` with that caveat. Today an idle admin session holds three server websocket sessions (downloader status, notifications, plus one more per in-flight search); afterwards it holds one, with the public `LiveTransport` interface and every
consumer unchanged. This is a runtime-boundary consolidation with observable server-side session semantics, which is why it is a packet rather than a refactor.

## Decision Dependencies

ADR-0002, ADR-0003, ADR-0004.

## Files Allowed To Modify

- `core/ui-react/src/api/live/transport.ts` (+ its test)
- Other `core/ui-react/src/api/live/*.test.ts` and `core/ui-react/src/app/status/*.test.tsx` files only where a test fabricates transport internals that the consolidation changes — consumer production code must not change
- The `C-LIVE-TRANSPORT` and `API-LIVE-SOCKJS` records
- This task packet and `docs/frontend-migration/STATUS.md`

## Out Of Scope

- Any change to the `LiveTransport`/`LiveSubscription`/`LiveSend` types or to consumer production code (`SearchPage.tsx`, `DownloaderStatusFooter`, `NotificationToasts`, message modules); backend websocket behavior; reconnect-policy tuning
  beyond what consolidation itself requires

## Context To Read

- `core/ui-react/src/api/live/transport.ts` (per-subscribe client lifecycle: ready timeout, `onReady` re-invocation after reconnect, failure isolation, `deactivate({force: true})` on close)
- `core/ui-react/src/api/live/{searchState,downloaderStatus,notifications}.ts` and their consumers' cleanup paths — the behaviors that must survive unchanged
- `NotificationsWeb.java:98-133` (server schedules per-topic work on subscribe and cancels when the last session unsubscribes — per-destination STOMP unsubscribe must still reach the server)

## Acceptance

- Concurrent `subscribe()` calls share one STOMP client and one SockJS socket; the connection opens lazily on the first subscription and deactivates when the last open subscription closes. A later subscribe after full close reconnects. A
  test asserts exactly one socket exists across three concurrent subscriptions and that close-order permutations always end with the client deactivated.
- Per-subscription semantics are preserved, each proven by a test: the ready timeout rejects only the timed-out subscribe (an established connection short-circuits the wait for later subscribers); `onReady` fires per subscription on first
  subscribe and again for every subscription after a reconnect; a parse failure or unavailability reaches only that subscription's `onUnavailable`; closing one subscription sends a STOMP unsubscribe for its destination without disturbing
  the others (the server cancels its notification scheduler on unsubscribe — see Context).
- A transient subscription cycle (search progress: subscribe, finish, close) while permanent subscriptions are live neither drops nor re-creates the shared connection — pinned by a test.
- Reconnect behavior: when the connection drops, every open subscription is resubscribed and its `onReady` re-invoked once the connection returns, matching today's per-client behavior.
- No consumer production file changes; all existing `api/live` and `app/status` tests pass, modified only where they reached into transport internals.
- Registry: `C-LIVE-TRANSPORT`'s record notes the single-connection model; `API-LIVE-SOCKJS` evidence updated. No rendering change — no screenshot strip.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts tests/smoke.spec.ts` passes (live search progress against the real backend still works).
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — shared runtime-boundary lifecycle with reference counting, reconnect fan-out, and failure-isolation invariants across three consumers.
- Reviewer: `opus` — a shared component's connection contract; at least the implementer's tier.
- Fixer: `opus` — likely findings are lifecycle races, not mechanical edits.

Implementer prompt: Start from the current `subscribe()`'s settled/closed flags — those states become per-subscription while activation becomes shared. Trap: a shared client's `onConnect` fires on reconnect too — dedupe resubscription so
nothing double-subscribes, and don't let the ready-timeout reject subscribers joining an already-open connection. Prove first the close-order permutation test: any order of closes ends with zero sockets. Reviewer prompt: Check hardest
reconnect fan-out (per-subscription `onReady`, no double delivery) and that closing one subscription STOMP-unsubscribes its destination; distrust single-socket claims proven by one happy path.
