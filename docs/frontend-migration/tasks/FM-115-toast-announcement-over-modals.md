# FM-115: Toast Announcement Over Modals

Status: planned Owner:
Feature IDs: F-PLATFORM-LIVE-STATUS, F-CONFIG-SHELL
Component IDs: C-TOAST-SERVICE
API IDs: None
Depends on: None
Blocks: None

## Outcome

Every toast is announced to assistive technology, including while a MUI modal is open. `@mui/material` 7.3.9's
`Snackbar` contains no `Portal` (`grep -c Portal node_modules/@mui/material/Snackbar/Snackbar.js` → 0) and has neither
a `container` prop nor a portal slot, so `ToastProvider`'s overlay renders in-tree under `#root` at `App.tsx:48-50` —
one of the `container.children` that `ModalManager.add`'s `ariaHiddenSiblings` marks `aria-hidden="true"` when any
`Modal`/`Dialog`/`Drawer` opens. Every toast raised while a dialog is up is therefore announced to nobody, and it is
always broken where a dialog raises its own toast: `ExternalToolDialog.tsx`, `DownloaderDialog.tsx`,
`IndexerDialog.tsx`. Wrapping the layer in a `Portal` is the only available route. App-wide WCAG 4.1.3, and one
shared component owns it, so it is one packet rather than one per dialog.

**This packet delivers the announcement half only.** The focus half — a persistent toast's controls being untabbable
because the modal's `FocusTrap` owns focus regardless of DOM position — is cross-module and is recorded, not fixed;
see *Out Of Scope*.

## Decision Dependencies

None. ADR-0014's stock-MUI rule governs the rendering; nothing here changes a contract or a decision.

## Files Allowed To Modify

- In `core/ui-react/src/components/toasts/`: `ToastProvider.tsx` — the layer's DOM position and whatever bookkeeping
  the chosen mechanism needs; the `Toast`/`ToastBody`/`ToastSeverity` types in `toasts.ts` are **frozen** (no new
  action field), as are `anchorOrigin`, `TOAST_LIFETIME_MS`, `TOAST_MAX_WIDTH`, stacking order, the per-alert timer
  and its `persistent` early-return, `pointerEvents` transparency and its FM-065 justification comment, and the
  `toasts` / `toast.testId ?? "toast"` test ids. `ToastProvider.test.tsx` — new reachability cases plus the stale
  comment at `:141-143` recording this defect as unfixed follow-up work; existing cases are **add-only** (none
  deleted, retargeted or weakened), and the testid-instead-of-role query in the dialog case may become a role query
  only if it passes for the right reason.
- `core/ui-react/src/features/config/ConfigShell.tsx` — **only** the overstated sentence at `:404-412` ("could be
  neither announced nor clicked"), which claims more than FM-101 established. No code change: the `Portal` at
  `:416-447`, `RAISED_REPORT_SX`, `config-validation-errors` and the dismiss path are frozen.
- The `C-TOAST-SERVICE` record in `../COMPONENTS.yaml`
- This task packet and `../STATUS.md`

## Out Of Scope

- **The focus half, deliberately.** `Toast` has no action field, but `content` takes arbitrary nodes and
  `NotificationToasts.tsx:82-92` puts a `RouterLink` inside a `persistent: true` toast, so an actionable persistent
  toast over a modal is real, not hypothetical. Making it tabbable means either relaxing `FocusTrap` on every dialog
  or rendering toasts inside the open modal — both cross-module changes to modal behaviour app-wide. It is carried as
  an open item under `../MAINTENANCE.md`'s *Needs a `DECISIONS.md` entry first*, which states the three options; record
  the gap on `C-TOAST-SERVICE` too, but do not fix it and do not add an action field to make it look fixed. Adding a
  toast family to `focus-indication.spec.ts` is that half's evidence, not this one's.
- Every toast *caller* (the ~25 modules calling `useToasts`), `NotificationToasts.tsx`, `toasts.ts`, and every dialog
  component. The fix is in the layer, not in what raises toasts — if a caller needs editing, the mechanism is wrong.
- `FEATURES.yaml:898`'s stale "shows one toast at a time" claim (contradicted by FM-084's stacking) — a real
  inaccuracy, logged separately, not this packet's record.

## Context To Read

- `components/toasts/ToastProvider.tsx` in full and `components/toasts/toasts.ts` (the exact `Toast` shape:
  `onClose?`, `persistent?`, `severity`, `testId?`, and the `message`-XOR-`content` body)
- `src/App.tsx:48-50` — note the path is `src/App.tsx`, not `src/app/App.tsx`
- `node_modules/@mui/material/Modal/ModalManager.js` — `add()` calls `getHiddenSiblings(container)` then
  `ariaHiddenSiblings(container, modal.mount, modal.modalRef, hiddenSiblings, true)`, iterating `container.children`
  **at modal-open time** with no opt-out attribute. The trap: a portal that already exists when the modal opens is
  hidden just like the in-tree layer, so mounting under `document.body` is necessary and not sufficient.
- `features/config/ConfigShell.tsx:404-447` — FM-101's precedent and its limit. It escapes the sweep only because
  `{reviewOpen && hasErrorReport && <Portal>}` mounts *after* the panel; a general toast layer cannot rely on that.
  `Portal` from `@mui/material` is the repository's only portal precedent — no `react-dom` `createPortal` in `src`.
- `features/config/ConfigShell.test.tsx:1670-1870` — the `ariaHiddenAncestor` helper and, at `:1715-1718`, the control
  assertion that the shell *is* hidden. Copy that shape: a reachability test without it proves nothing.
- `app/status/NotificationToasts.tsx:78-95` and `/core/ui-react/AGENTS.md` *UI Conventions* (ADR-0014)

## Acceptance

- The toast layer renders outside every subtree `ModalManager` marks `aria-hidden`, in **both** orders, each pinned by
  its own test asserting the ancestor chain — not mere presence, and each paired with a control assertion that the
  app subtree really is hidden in that scenario:
  (a) a toast raised while a dialog is already open;
  (b) a toast raised **before** a dialog opens and still on screen when it does — the `persistent` case, which the
  FM-101 precedent does not cover and which a naive always-mounted portal fails.
- A toast raised from *inside* its own dialog (the `ExternalToolDialog` / `DownloaderDialog` / `IndexerDialog` shape)
  is announced. One test may stand for all three if it exercises the same nesting.
- With no modal open, the layer's rendering, stacking order, per-toast lifetimes, `persistent` behaviour, pointer
  transparency, severity mapping and both test ids are byte-for-byte what they are today. Toasts remain clickable over
  a modal, as they already are (`zIndex.snackbar` 1400 over `Dialog`'s 1300).
- `ToastProvider.test.tsx:141-143`'s comment no longer describes the defect as unfixed follow-up work, and
  `ConfigShell.tsx:404-412`'s no longer claims the raised entries can be *clicked* — it may claim announcement and
  accessibility-tree reachability, which is what the ancestor-chain tests establish.
- `C-TOAST-SERVICE`'s `responsibility` gains (i) the reachability rule — the layer is announced independently of any
  open modal — and (ii) one sentence recording the unfixed focus half and why it is cross-module, so it survives as a
  known gap. `state` stays `partial` for exactly that reason. No new ID, no consumer added or removed.
- No visual change is intended. Capture a strip anyway per `../README.md` *Visual Gate* — desktop 1280x800 and mobile
  390x844, one toast over an open dialog — because the layer's DOM parent moves and stacking is what that breaks.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run
  build && npm run check:api && npm run validate:migration` succeeds. `npm run knip` reports its two known
  pre-existing findings (`NO_ADVANCED_DISCLOSURE`, `RepeatSection`'s dead barrel export) and no third. Lint is 14
  warnings / 0 errors at base; a fifteenth is yours.
- **The full unit suite is the filter, deliberately.** The layer's DOM parent changes for every one of its ~25
  consumers, so a per-file run cannot prove the blast radius. Report totals before and after, and check by name that
  these still pass unedited: `app/status/NotificationToasts.test.tsx`, `app/AppShell.test.tsx`,
  `app/status/StartupChecks.test.tsx`, `features/config/ConfigShell.test.tsx`,
  `features/config/indexers/IndexersConfigTab.test.tsx`, `.../downloading/DownloadingConfigTab.test.tsx`,
  `.../external-tools/ExternalToolsConfigTab.test.tsx`, `features/search/results/SearchResults.test.tsx`,
  `features/search/SearchPage.test.tsx`, `features/auth/LoginPage.test.tsx`,
  `features/system/tasks/SystemTasksTab.test.tsx`, `.../bugreport/SystemBugreportTab.test.tsx` and
  `services/updates/useUpdateInstaller.test.tsx`. A failure in any is a defect in this change, never a reason to edit
  that file — none is in the allowlist.
- `npm run validate:focus-affordances` is **red at base** on five known false positives (`../MAINTENANCE.md`), none in
  this packet's files. Report it *failed*, with a base-comparison run on a pristine tree (stash or `git archive`)
  proving your finding set is byte-identical to base; a sixth finding is yours. Never silence it by adding entries to
  the exemption list at `scripts/validate-focus-affordances.mjs:112` — FM-111 refused exactly that workaround.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/external-tools.spec.ts
  tests/config-downloading.spec.ts tests/config-indexers.spec.ts tests/results.spec.ts` passes in full, all four
  unedited. The first three are the dialogs that raise their own toasts — the always-broken state — and
  `results.spec.ts:3228-3234` is the only system assertion that reaches a toast by role rather than by text, so it is
  the one that would catch a broken overlay. A failure in any is a defect in this change.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a shared component consumed app-wide, where the mechanism must defeat a third-party sweep in
  two orderings and the naive fix passes one of them.
- Reviewer: `opus` — at least the implementer's tier; shared component plus a registry record. Judge the
  predates-the-modal case and the control assertions, not the green totals.
- Fixer: `sonnet` — expected findings are comment wording, registry phrasing and test placement.

Implementer prompt: Read `ModalManager.add` and `ariaHiddenSiblings` before writing anything — the sweep runs at
modal-open time over `container.children` and honours no opt-out attribute, so "put it in a Portal" is half an answer.
Trap: FM-101's portal works only because it mounts after the panel; copying it verbatim fails case (b). Second trap: a
test asserting the toast merely exists, or querying it by test id, stays green against the bug. Prove case (b) red first.
Reviewer prompt: Check hardest that case (b) was observed failing before the fix and that no toast caller was edited.
Distrust any test omitting the "the shell really is hidden" control assertion, and verify the corrected comments claim
only what the tests establish.
