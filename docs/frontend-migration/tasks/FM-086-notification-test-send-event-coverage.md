# FM-086: Notification Test-Send Event Coverage

Status: planned Owner:
Feature IDs: F-CONFIG-NOTIFICATIONS Component IDs: None API IDs: API-NOTIFICATIONS-TEST Depends on: None Blocks: None

## Outcome

`GET /internalapi/notifications/test/{eventType}` works for every `NotificationEventType` the config tab offers. Today
`NotificationsWeb.NOTIFICATION_EVENTS` registers seven events but the enum has eight: `EXTERNAL_TOOL_CONFIGURATION`
falls into the `Unable to create test notification` throw and answers HTTP 500 — the backend defect FM-062 surfaced and
`STATUS.md` proposed as its own backend packet. The fix registers the missing event and pins the set's completeness against the enum so a ninth event type cannot silently reopen the gap. Backend-only, but an API-contract behavior change,
hence a packet rather than a quickfix.

## Decision Dependencies

None.

## Files Allowed To Modify

- `core/src/main/java/org/nzbhydra/notifications/NotificationsWeb.java`
- `core/src/main/java/org/nzbhydra/notifications/ExternalToolConfigResultEvent.java` (only if registration exposes a defect in its no-args instance, e.g. `getEventType` depending on state)
- One new/extended test class under `core/src/test/java/org/nzbhydra/notifications/`
- The `API-NOTIFICATIONS-TEST` record's `note` (drop the stale 500 sentence, name the completeness guard)
- This task packet and `docs/frontend-migration/STATUS.md`

## Out Of Scope

- The React notifications tab (done; its warning UI for unknown events stays as is); Apprise sending logic; the live in-app notification channel (FM-081); any other endpoint

## Context To Read

- `core/src/main/java/org/nzbhydra/notifications/NotificationsWeb.java:39-96` (the hand-listed set and the throw)
- `core/src/main/java/org/nzbhydra/notifications/ExternalToolConfigResultEvent.java` (existing event with a
  `getTestInstance()` — the registration is the missing piece, not the event class)
- `shared/mapping/src/main/java/org/nzbhydra/config/notification/NotificationEventType.java` (the eight values)
- `core/ui-react/src/features/config/notifications/` completeness test pattern (FM-062 asserted the frontend table against the same enum — mirror the idea server-side)

## Acceptance

- `NOTIFICATION_EVENTS` contains an event whose `getEventType()` is `EXTERNAL_TOOL_CONFIGURATION`; a test-send for it publishes that event's `getTestInstance()` and answers 2xx.
- A unit test asserts every `NotificationEventType` value resolves to exactly one registered `NotificationEvent`
  (completeness and no duplicates), so the test fails when a future enum value lacks a registration.
- A test covers the endpoint path for `EXTERNAL_TOOL_CONFIGURATION` (controller-level call of `testNotification` is sufficient; no HTTP layer required) proving no exception escapes.
- Existing behavior for the seven registered events is unchanged; an unknown event-type string still fails as before.
- No rendering change — no screenshot strip.

## Verification

- From repository root: `mvn -pl core -am test` succeeds; record the new test cases and results individually. Revert any fixture files `other/github-release-plugin` rewrites during the reactor run rather than committing them (known FM-069
  finding).
- In `core/ui-react`: `npm run validate:migration` succeeds (registry note change).
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — a one-registration backend fix plus a completeness test, with criteria that settle every question.
- Reviewer: `sonnet` — matches the implementer's tier for this contract change; the completeness test's strength is the one thing to judge.
- Fixer: `sonnet` — expected findings are mechanical.

Implementer prompt: Start at `NotificationsWeb.java:39` — the event class already exists with a `getTestInstance()`; registration is the whole fix. Trap: the no-args instance has a null `body` and Lombok `@Data` equality — confirm `Set`
membership behaves. Prove first the completeness test goes red before the registration lands. Reviewer prompt: Check hardest that the completeness test would fail for a missing registration (red-first evidence in the handoff); distrust a
test that iterates the set instead of the enum.
