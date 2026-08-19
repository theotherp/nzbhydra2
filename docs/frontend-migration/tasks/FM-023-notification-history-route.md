# FM-023: Notification History Route

Status: planned Owner:
Feature IDs: F-HISTORY-NOTIFICATIONS Component IDs: C-DATE-TIME, C-EXTERNAL-LINKS, C-HISTORY-REFINE-BAR, C-HISTORY-REQUEST API IDs: API-HISTORY-NOTIFICATIONS Depends on: FM-056 Blocks: None

## Outcome

Stats users can page, sort, and filter notification history with safe body/link rendering at canonical `/stats/notifications`.

## Boundary Rationale

The endpoint, event-type vocabulary, safe message presentation, filtering, and paging are one read-only route. Notification configuration/testing and live notifications are different admin/runtime capabilities.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0016 (multi-select semantics).
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/router.tsx`, `core/ui-react/src/router.test.tsx`
- `core/ui-react/src/api/history/**`, `core/ui-react/src/features/stats/history/**`, `core/ui-react/src/domain/links/**`; inside `refine/**` and the shared request wrapper only additive, non-forking extensions that keep FM-056's and FM-057's
  tests passing unmodified
- Focused new Playwright coverage under `tests/system/tests/**`
- The listed feature/component/API records only; this task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Notification configuration/tests, live notification channel/read state, or history mutation
- A route-local filter surface or route-local `HistoryRequest`/paged-response handling: this route consumes `C-HISTORY-REFINE-BAR` and `C-HISTORY-REQUEST`, and does not restyle, fork, or re-implement them
- Changes to `/stats/downloads` or `/stats/searches`

## Context To Read

- `CONTEXT.md`; accepted ADRs (including ADR-0014 and `README.md` *Visual Gate*); FM-020 handoff; FM-056's packet and handoff; listed records
- Legacy notification history controller/template (`core/ui-src/html/states/notification-history.html`: `time-filter` plus `checkboxes-filter column="NOTIFICATION_EVENT_TYPE"` with invert), notification service event vocabulary, `History`'s
  filter kinds, `HistoryWeb`, `NotificationEntityTO`, and existing test conventions

## Acceptance

- Stats-protected route validates paged API data and has accessible loading, empty, malformed-entry, partial, and failure states.
- Server paging/sorting/filtering covers time and event type with the complete active event vocabulary and stable human-readable labels. Filtering is presented by `C-HISTORY-REFINE-BAR` alone — a time range and a multi-select event-type
  dimension, no filter control in or above the table header — and the request/paged-response goes through `C-HISTORY-REQUEST` (`NOTIFICATION_EVENT_TYPE` as a `checkboxes` filter), adding no third history request path. The event-type dimension
  inherits the shared bar's ADR-0016 multi-select semantics that FM-056 ships (nothing preselected, empty selection sends no `NOTIFICATION_EVENT_TYPE` entry, no invert control); legacy's preselect-all plus invert model is not carried forward.
- Time uses `C-DATE-TIME`; title/body line breaks and URLs render as inert text/safe links without unrestricted HTML trust or executable schemes.
- Responsive semantic presentation remains keyboard operable and communicates total/page state.
- Focused tests cover request transformation, event labels, body/link safety, paging, filters, and failures; deterministic Playwright covers populated/filter/empty behavior in React and legacy where available.
- Screenshot strip per `README.md` *Visual Gate*: `/stats/notifications` populated, filtered, and empty at 1280x800 plus 390x844.
- Registry evidence records concrete route/API adoption (including the two shared component records' consumer lists) without claiming configuration or live parity.

## Verification

- In `core/ui-react`: the complete npm quality/build/API/migration chain succeeds.
- From repository root: run the focused notification-history Playwright spec through `python3 misc/run_gui_systemtest.py --runtime local -- <spec>` successfully.
- Run `git diff --check`; inspect status, allowed scope, and generated artifacts.

## Handoff

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a whole new route whose event vocabulary and filter behavior are reconstructed from the legacy AngularJS template, whose title/body rendering must stay inert, and which consumes two shared abstractions it is forbidden to fork.
- Reviewer: `opus` — at least the implementer's tier because the route may extend the shared bar and wrapper, and the safety claim about body and link rendering needs adversarial reading rather than a checklist.
- Fixer: `opus` — likely findings are event-vocabulary parity or link-safety gaps, both judgments against legacy source rather than mechanical edits.

Implementer prompt: Start at FM-056's shipped `refine/**` and wrapper API, then the legacy template and the notification event enum. Trap: the bar shows humanized event labels but `NOTIFICATION_EVENT_TYPE` filters and sorts on the enum constants — legacy keeps both (`notification-history-controller.js:44-48` pairs `humanize(key)` with `id: key`); send the constants, never the labels. Prove first that the route's request reaches the backend through the shared wrapper with no route-local body building.
Reviewer prompt: Check hardest that titles and bodies carrying markup, `javascript:`, or `data:` URLs render inert, and that the event labels cover the complete active vocabulary. Distrust screenshots as evidence of the empty, malformed, and failure states.
