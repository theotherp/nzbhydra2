# FM-127: Informational-Only Toasts

Status: planned Owner:
Feature IDs: F-PLATFORM-LIVE-STATUS
Component IDs: C-TOAST-SERVICE
API IDs: None
Depends on: None
Blocks: None

## Outcome

ADR-0037 is enforced by the type system: no caller can hand a toast an interactive node. `toasts.ts:10-12`'s `ToastBody`
union currently admits `content: React.ReactNode`, rendered verbatim at `ToastProvider.tsx:211-215`; its sole consumer is
`NotificationToasts.tsx:79-95`'s persistent pile-up toast, whose MUI `Link component={RouterLink}` is exactly the actionable
content ADR-0037 forbids (untabbable over any open modal — the focus half FM-115 deliberately left). After this task the
toast type carries only non-interactive bodies, the pile-up toast is plain text that names its destination, and the
registries state the settled contract instead of carrying it as an open gap. One packet because the shared type, its one
rich-content consumer, and both registry records must change together to keep any of them true.

## Decision Dependencies

ADR-0037 (governs this task; forbids relaxing `FocusTrap` or changing modal focus behavior as a workaround).

## Files Allowed To Modify

- `core/ui-react/src/components/toasts/{toasts.ts,ToastProvider.tsx,ToastProvider.test.tsx}`
- `core/ui-react/src/app/status/{NotificationToasts.tsx,NotificationToasts.test.tsx}`
- `docs/frontend-migration/COMPONENTS.yaml`, `docs/frontend-migration/FEATURES.yaml`, this task packet

## Out Of Scope

- Any `FocusTrap`, `ModalManager`, or dialog change (ADR-0037 binding constraint)
- FM-115's announcement mechanism (`Portal` + `MutationObserver`) — must survive byte-identical in behavior
- Any new navigation affordance replacing the dropped link (notification history is reachable as before)

## Context To Read

ADR-0037; `toasts.ts` in full; `ToastProvider.tsx:141-144` (the doc comment that carried this as an open decision — update
it to cite ADR-0037); `NotificationToasts.tsx:76-95`; `NotificationToasts.test.tsx:12-25` (the router mock that becomes
removable) and `:218-238`; `ToastProvider.test.tsx:172-212`; `COMPONENTS.yaml:107-124`; `FEATURES.yaml`
`F-PLATFORM-LIVE-STATUS` (`parity`/`gaps` at 1558-1582).

## Acceptance

- `Toast` accepts no React element anywhere: the `content` arm of `ToastBody` is removed (or replaced by a shape that is
  provably non-interactive, e.g. strings only) so passing an element is a compile error, not a policy. `message` semantics
  (`ToastText`, newlines-to-breaks, never HTML) unchanged.
- The pile-up toast becomes a `message` toast: still `persistent: true`, still `testId: "notification-toast"`, its text
  states the count and names the notification history as the place to view them — no link, no button. Its unit test
  asserts the text and that the rendered toast contains no anchor or button besides the Alert's own close control.
- `ToastProvider.test.tsx`'s rich-content case (172-212) is removed or rewritten only insofar as it tested the removed
  capability; every other assertion it carried (close reporting, stacking) survives somewhere. The reviewer verifies the
  test diff removes nothing beyond the capability ADR-0037 retires.
- Registries: `C-TOAST-SERVICE.responsibility` drops "optional rich content" and replaces its known-gap sentence with the
  ADR-0037 outcome; set `state` to `done` unless the handoff names another recorded reason it stays `partial`.
  `F-PLATFORM-LIVE-STATUS.gaps` gains a `deliberate - ADR-0037 ...` entry for the dropped pile-up link (the record never
  claimed the link worked — the entry records the capability reduction, not a regression).
- Screenshot strip per Visual Gate: the pile-up toast at 1280x800 (raise it with a mocked notification batch); mobile only
  if its layout differs.

## Verification

- `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm test -- --run && npm run build && npm run check:api && npm run validate:migration` — all pass
- `core/ui-react`: demonstrate the compile error — a scratch (uncommitted) call passing an element to `showToast` fails `typecheck`; record the error text in the handoff
- Root: `git diff --check` clean; changed files match the allowlist; no `tests/system` file touched (no spec exercises the toast link — confirm and record)

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — one shared type narrowed, one consumer, acceptance criteria settle the open questions.
- Reviewer: `opus` — a shared-component contract changes; reviewer tier must not be below the implementer's, and the test
  removal needs adversarial reading.
- Fixer: `sonnet` — expected findings are mechanical (wording, registry phrasing).

Implementer prompt: Start from ADR-0037 and `toasts.ts`. The trap: deleting more test coverage than the retired capability
justifies — map every removed assertion to the removed `content` arm first. Prove the compile-error claim before touching
the registries.
Reviewer prompt: Check hardest that FM-115's portal/observer behavior is untouched and that the test diff removes only
rich-content coverage. Distrust the handoff's `state: done` claim — re-derive it from the record's remaining gaps.
