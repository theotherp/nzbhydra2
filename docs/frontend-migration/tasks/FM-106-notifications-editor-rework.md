# FM-106: Notifications Editor Rework

Status: ready Owner:
Feature IDs: F-CONFIG-NOTIFICATIONS
Component IDs: C-CONFIG-FIELDS
API IDs: API-NOTIFICATIONS-TEST
Depends on: None
Blocks: None

## Outcome

Editing a notification stops requiring the variable vocabulary to be memorized out of help prose: the entries list
becomes an accordion per configured event, and inside each entry the title/body template fields gain insertable variable
chips, a live preview rendered from that event's sample values, and an inline result for the existing test-send button.
Source: owner backlog `docs/config-ui-improvements.md` §4.5, fed into design 2026-08-24; this packet is the contract,
implementers ignore that file per its banner. The variables and sample values exist authoritatively server-side — each
`*NotificationEvent.java` declares `getVariablesWithContent()` and `getTestInstance()` — so the client gains per-event
variable/sample data in `notificationEvents.ts`, asserted complete against those sources the way FM-062 asserts the
event list against the `NotificationEventType` enum.

## Decision Dependencies

None (no API change: `API-NOTIFICATIONS-TEST` is consumed as-is; the preview is client-side substitution).

## Files Allowed To Modify

- In `core/ui-react/src/features/config/notifications/`: `NotificationsConfigTab.tsx`, `NotificationEntryFields.tsx`,
  `notificationEvents.ts`, `notificationsSettings.ts`, their tests, and new preview/chips files + tests
- `core/ui-react/src/features/config/components/RepeatSection.tsx` + `configFields.test.tsx` only if the accordion mode
  is added there as an opt-in (existing consumers byte-identical); otherwise the section is owned locally like
  FM-063/064's lists
- `tests/system/tests/config-notifications.spec.ts` — cases asserting the stacked layout may be rewritten
- The `F-CONFIG-NOTIFICATIONS` record in `../FEATURES.yaml`; `C-CONFIG-FIELDS` in `../COMPONENTS.yaml` if opt-in taken
- This task packet, `../STATUS.md`, `../GUI-STATUS.md` if its derived row changes

## Out Of Scope

- The Main fieldset's settings (`NotificationsConfigTab.tsx:62-125`), Apprise transport semantics, any backend change
  (the test endpoint registers all event types since FM-086 — see `API-NOTIFICATIONS-TEST`'s note), and any server-side
  template rendering

## Context To Read

- `NotificationEntryFields.tsx` (fields, unknown-event guard, `TestNotificationAction` — the toast pair the inline
  result replaces), `notificationEvents.ts` (per-event templates + `templateHelp`, including its documented `$title`
  typo lines 62-66 — the chip data must come from the backend variable names, not from parsing that prose),
  `notificationsSettings.ts` (`notificationEntryPath`, guidance text)
- `core/src/main/java/org/nzbhydra/notifications/*NotificationEvent.java` (`getVariablesWithContent`,
  `getTestInstance` — variable names and the sample values the preview mirrors)
- `/core/ui-react/AGENTS.md` *UI Conventions* (ADR-0014)

## Acceptance

- Entries render as one stock MUI `Accordion` per entry, summary = the existing event legend plus the entry's message
  type; expanded = the existing fields. Add/remove behavior and their selectors are preserved or explicitly re-recorded
  in `F-CONFIG-NOTIFICATIONS.selectors`; the unknown-event warning entry stays editable and keeps its testid.
- `notificationEvents.ts` gains per-event `variables: readonly string[]` and `sampleValues: Readonly<Record<string,
  string>>`; a source-assertion test (FM-062's technique) parses the backend event classes and fails naming any event
  whose variable set or sample values drifted. The unknown-event case renders no chips and no preview.
- Chips: under each template field, one chip per variable (`config-notification-variable-<index>-<name>`); clicking
  inserts `$name$` at the caret of the associated field via the form API (marking it dirty); chips are buttons, not
  colour-coded meaning.
- Preview (`config-notification-preview-<index>`): rendered title and body with each `$name$` replaced by the sample
  value, updating as the admin types; unknown `$...$` tokens render literally (the backend does the same — substitution
  only replaces known variables). A tested pure function owns the substitution.
- Test send: the button keeps its testid and guidance; the outcome renders inline next to it (`config-notification-
  test-result-<index>`: success or failure wording matching the current toasts) instead of toast-only, clearing when
  the entry's fields change.
- Tests: substitution + chip-insertion + accordion unit tests, the backend-drift test; `config-notifications.spec.ts`
  rewrites layout-bound cases and adds: expand an entry, insert a variable chip, see it in the preview, save.
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 accordion overview and one expanded entry with
  chips, preview, and an inline test result; mobile 390x844.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-notifications.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — reconstructs variable/sample data from backend Java sources with a drift test, plus caret-level
  editor behavior inside RHF-bound fields.
- Reviewer: `opus` — the variable data is a parity reconstruction; must check it against the Java, not the TS.
- Fixer: `sonnet` — expected findings are wording/selector-level.

Implementer prompt: Start at `notificationEvents.ts:52-110` and two backend event classes. Trap: the `templateHelp`
prose contains known typos (`$title` unclosed) kept deliberately for parity — never scrape it for variable names; the
Java constants are the source. Second trap: caret insertion into an RHF-controlled input must go through
`setValue`/`onChange`, not DOM mutation, or the form never sees it. Prove chip-insert-then-preview first in the real app.
Reviewer prompt: Check hardest the drift test actually parses all backend event classes (count them) and that the
accordion did not break add-from-menu seeding. Distrust the sample values — diff three against `getTestInstance` by hand.
