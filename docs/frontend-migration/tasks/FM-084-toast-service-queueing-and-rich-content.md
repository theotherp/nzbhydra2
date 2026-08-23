# FM-084: Toast Service Queueing And Rich Content

Status: planned Owner:
Feature IDs: F-PLATFORM-LIVE-STATUS Component IDs: C-TOAST-SERVICE API IDs: None Depends on: None Blocks: None

## Outcome

`C-TOAST-SERVICE` grows from a single replace-on-arrival Snackbar into the app's one toast surface: concurrent toasts stack instead of replacing each other (legacy growl's behavior, lost in the current provider and compensated per-feature
since), a toast may carry rich content (multi-line text, an internal link) and be persistent (no auto-hide), and an open toast never blocks a dialog's action buttons. `NotificationToasts`' private Snackbar stack — built only because the
shared service couldn't queue or render rich content (its documented gap) — folds onto the widened service, as do FM-079's VIP-expiry toasts, which today replace one another when several indexers expire. This is the packet proposed by the
FM-081 handoff and compounded across FM-065/FM-079's observations.

## Decision Dependencies

ADR-0002, ADR-0014.

## Files Allowed To Modify

- `core/ui-react/src/components/toasts/**`
- `core/ui-react/src/app/status/NotificationToasts.tsx` (+ its test), `core/ui-react/src/app/status/StartupChecks.tsx`
  (+ its test, only if the VIP-toast call site must change shape)
- `core/ui-react/src/app/AppShell.test.tsx` (only if provider wiring assertions move)
- The `C-TOAST-SERVICE` record and `F-PLATFORM-LIVE-STATUS`'s gap lines
- This task packet and `docs/frontend-migration/STATUS.md`

## Out Of Scope

- Changing any caller's toast wording or severity; the live-notification subscription/ack logic (only its rendering moves); `C-LIVE-TRANSPORT`; new toast consumers

## Context To Read

- `core/ui-react/src/components/toasts/ToastProvider.tsx` (current single-toast replace behavior, 5s lifetime)
- `core/ui-react/src/app/status/NotificationToasts.tsx` (the stack semantics to absorb: per-toast dismiss, persistent pile-up notice with an internal `/stats/notifications` link, newline-to-line-break text rendering — never HTML)
- `core/ui-react/src/app/status/StartupChecks.tsx` + `vipExpiry.ts` (VIP toasts per expiring indexer)
- `STATUS.md`'s FM-065 entry (a long toast overlapped `DialogActions`, leaving Cancel/Submit unclickable) and FM-081's proposal; legacy growl config in `core/ui-src/js/nzbhydra.js` (ttl 5000, position) for stacking parity intent

## Acceptance

- `showToast` keeps its existing call signature working unchanged for current callers (severity + message string) and gains: optional rich `content` (React node rendered inside the Alert; bodies remain text, never HTML), optional
  `persistent: true` (no auto-hide, dismissible), and per-toast `onClose` notification so `NotificationToasts` can keep acking exactly as it does today.
- Two toasts raised while one is visible all display, stacked without overlap, each with its own 5s lifetime and close button; order is arrival order. A test raises three (mixed persistent/transient) and asserts all render and dismiss
  independently.
- With a modal dialog open, a visible toast never intercepts pointer input aimed at the dialog's `DialogActions`:
  proven by a test that renders a dialog plus a long-message toast and asserts the action button receives the click (the FM-065 reproduction, closed).
- `NotificationToasts` renders through the shared service — no private `Snackbar` remains in `app/status` — preserving its proven behaviors under its existing tests: batch overflow pile-up notice (persistent, links `/stats/notifications`),
  newline handling, ack-on-handle. `F-PLATFORM-LIVE-STATUS`'s "bypasses C-TOAST-SERVICE" gap line is removed.
- Multiple VIP-expiry toasts in one startup check all display (test: two expiring indexers → two toasts).
- Existing `data-testid`s used by tests/specs keep working or are updated within allowed files; no selector contract outside them changes.
- Screenshot strip per `../README.md` *Visual Gate*: three stacked toasts, and a toast over an open dialog showing the clickable actions, desktop 1280x800 + mobile 390x844.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/smoke.spec.ts` passes (shell still clean).
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a shared-component contract widening with cross-module consumers and behavior-preservation obligations on an already-reviewed surface.
- Reviewer: `opus` — shared component change; at least the implementer's tier.
- Fixer: `opus` — findings will likely involve consumer regressions, not mechanical fixes.

Implementer prompt: Start from `NotificationToasts.tsx` — its stack is the semantics the service must absorb; port it rather than reinventing it in the provider. Traps: each MUI `Snackbar` is its own fixed overlay, so naive stacking
overlaps; jsdom cannot prove pointer interception, so scope the overlap proof honestly. Prove first that every existing `showToast` caller's tests pass unmodified. Reviewer prompt: Check hardest that NotificationToasts' ack/overflow tests
still pin the same behavior after the move, and that no body string can reach an HTML sink; distrust the overlap fix if its test would pass with the old provider.
