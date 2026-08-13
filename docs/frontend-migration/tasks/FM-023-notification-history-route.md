# FM-023: Notification History Route

Status: planned Owner:
Feature IDs: F-HISTORY-NOTIFICATIONS Component IDs: C-DATE-TIME, C-EXTERNAL-LINKS API IDs: API-HISTORY-NOTIFICATIONS Depends on: FM-020 Blocks: None

## Outcome

Stats users can page, sort, and filter notification history with safe body/link rendering at canonical `/stats/notifications`.

## Boundary Rationale

The endpoint, event-type vocabulary, safe message presentation, filtering, and paging are one read-only route. Notification configuration/testing and live notifications are different admin/runtime capabilities.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/router.tsx`, `core/ui-react/src/router.test.tsx`
- `core/ui-react/src/api/history/**`, `core/ui-react/src/features/stats/history/**`, `core/ui-react/src/domain/links/**`
- Focused new Playwright coverage under `tests/system/tests/**`
- The listed feature/component/API records only; this task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Notification configuration/tests, live notification channel/read state, or history mutation

## Context To Read

- `CONTEXT.md`; accepted ADRs; FM-020 handoff; listed records
- Legacy notification history controller/template, notification service event vocabulary, history request service, `HistoryWeb`, `NotificationEntityTO`, and existing test conventions

## Acceptance

- Stats-protected route validates paged API data and has accessible loading, empty, malformed-entry, partial, and failure states.
- Server paging/sorting/filtering covers time and event type with the complete active event vocabulary and stable human-readable labels.
- Time uses `C-DATE-TIME`; title/body line breaks and URLs render as inert text/safe links without unrestricted HTML trust or executable schemes.
- Responsive semantic presentation remains keyboard operable and communicates total/page state.
- Focused tests cover request transformation, event labels, body/link safety, paging, filters, and failures; deterministic Playwright covers populated/filter/empty behavior in React and legacy where available.
- Registry evidence records concrete route/API adoption without claiming configuration or live parity.

## Verification

- In `core/ui-react`: the complete npm quality/build/API/migration chain succeeds.
- From repository root: run the focused notification-history Playwright spec through `python3 misc/run_gui_systemtest.py --runtime wsl -- <spec>` successfully.
- Run `git diff --check`; inspect status, allowed scope, and generated artifacts.

## Handoff

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.
