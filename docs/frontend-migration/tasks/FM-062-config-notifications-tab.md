# FM-062: Config Notifications Tab

Status: planned Owner:
Feature IDs: F-CONFIG-NOTIFICATIONS Component IDs: C-CONFIG-FIELDS, C-CONFIG-FORM, C-TOAST-SERVICE API IDs: API-NOTIFICATIONS-TEST, API-CONFIG-PUT Depends on: FM-059 Blocks: None

## Outcome

Admins configure notifications at `/config/notifications` in React: the Apprise transport and GUI display settings, and per-event notification entries added from an event-type menu, each with its own URLs, title and body templates, message
type, per-event template help, and a test-send action.

## Boundary Rationale

An independent product capability over `NotificationConfig` whose list section is not the generic one: entries are created from an event-type vocabulary that only exists in legacy JavaScript, each seeded with that event's default templates
and help text. Reconstructing that vocabulary is the work, and it belongs with the surface that uses it. It depends on FM-059 only for the field vocabulary.

## Decision Dependencies

- Accepted: ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/config/notifications/**`
- `core/ui-react/src/features/config/components/**`, only for additive, non-forking extensions FM-059's vocabulary genuinely lacks (a multiline text setting is expected); earlier packets' tests must keep passing unmodified
- `core/ui-react/src/api/config/**`, only additively for the test-notification endpoint
- FM-058's config shell/form files and `core/ui-react/src/router.tsx` (+ `router.test.tsx`), only to mount the Notifications tab body
- `tests/system/tests/config-notifications.spec.ts`
- The `F-CONFIG-NOTIFICATIONS`, `C-CONFIG-FIELDS`, and `API-NOTIFICATIONS-TEST` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- The notification history route (`F-HISTORY-NOTIFICATIONS`), the live in-app notification channel, and the footer's notification display
- Apprise itself and any backend notification behavior

## Context To Read

- FM-058 and FM-059 packets and handoffs, `/core/ui-react/AGENTS.md` *UI Conventions*, and the listed registry records
- `core/ui-src/js/config/config-fields-service.js:2376-2545` (the whole tab and the `notificationSection` entries), `core/ui-src/js/config/formly-config.js` `notificationSection` and `button-test-notification.html`,
  `core/ui-src/html/states/config.html` (`notificationRepeatSection.html`), `core/ui-src/js/notifications-service.js` (the complete event-type table)
- `NotificationConfig.java`, `NotificationConfigEntry.java`, `NotificationEventType`, and `core/ui-react/src/features/stats/history/NotificationHistoryPage.tsx` for the humanized-label vocabulary already in React

## Acceptance

- `/config/notifications` renders the intro help block and the Main fieldset exactly as legacy has it: Apprise type (None/API/CLI), the API URL shown only for `API`, the CLI runnable file field shown only for `CLI`, display notifications,
  max shown notifications and the message filter chips shown only while display is on, and the two indexer warning thresholds. Hidden fields keep their values.
- Entries are added from an "Add new notification" menu listing every event type, and a new entry is seeded from that event's defaults — title template, body template, and message type — taken from the legacy event table
  (`notifications-service.js`). The reconstructed table lives in one module, is unit-tested against every `NotificationEventType` constant the backend defines, and fails loudly rather than silently for an event type it does not know.
- Each entry shows its event's humanized name as its heading, and its fields: Apprise URLs, title template, a multiline body template (required), and message type (Info/Success/Warning/Failure). The template help under the title and body
  fields is the per-event help from the same table, so it changes with the entry's event type.
- Removing an entry marks the form dirty and takes effect on save; entry order is preserved.
- The test action sends `API-NOTIFICATIONS-TEST` for the entry's event type and reports success or failure to the user; its affordance carries legacy's guidance that the config must be saved first
  (`config.html` `button-test-notification.html`, `notifications-service.js:91`). The action never mutates the form.
- New `data-testid` values are recorded in `F-CONFIG-NOTIFICATIONS.selectors`.
- Tests: component tests for the Apprise-type-driven visibility, adding an entry per event type with the correct seeded templates, removal, and the test action's success and failure paths; `tests/system/tests/config-notifications.spec.ts`
  (using the `hydra` fixture, which restores the instance config) adds an entry, saves against the real backend, reloads, and proves the entry and its templates persisted.
- Screenshot strip per `../README.md` *Visual Gate*: `/config/notifications` with Apprise off, with the API transport selected, and with two entries of different event types, at 1280x800 and 390x844.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-notifications.spec.ts` succeeds, and `tests/config.spec.ts` and `tests/notification-history.spec.ts` still pass unchanged.
- Run `git diff --check`; confirm changed files match Files Allowed To Modify and no generated artifacts are left behind.

## Handoff / Review

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — the event-type table (default templates, help text, message type per event) exists only as legacy JavaScript and must be reconstructed and reconciled against the backend enum, not transcribed from a field list.
- Reviewer: `opus` — at least the implementer's tier because the reconstructed table is shared with the entry editor and the test action, and a missing or mismatched event type is invisible until a user needs that notification.
- Fixer: `sonnet` — once the table is right, expected findings are visibility conditions, labels, or a missing test-action state.

Implementer prompt: Start at `notifications-service.js` and enumerate `NotificationEventType` on the Java side before writing the table; the two lists must be proven equal by a test, not by reading. Trap: seeding a new entry from a generic
default instead of the event's own templates. Prove the add-entry-per-event-type path first — it is where a missing event silently disappears.
Reviewer prompt: Check hardest that every backend event type is offered and correctly seeded, and that the test action cannot dirty the form. Distrust a component test that adds only one event type.
