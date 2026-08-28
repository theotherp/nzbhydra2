# FM-120: Config Nav Subsection Flicker

Status: planned Owner:
Feature IDs: F-CONFIG-SHELL
Component IDs: C-CONFIG-FIELDS (the `ConfigFieldset` registration half)
API IDs: None
Depends on: None
Blocks: None

> Dependency discharged, not dropped: this task was written `Depends on: FM-117`, and FM-117 was accepted
> 2026-08-28 at `0c6af3e32` (packet archived at `cac90200e`). The field reads `None` only because the
> registry validator requires dependencies to name a live packet. FM-117's theme work is in the baseline.

## Outcome

The left nav's "on this page" anchor list stops disappearing for a frame when switching config sections. Established
root cause: `ConfigNav.tsx:160-162` renders `null` for the whole list — heading included — whenever the registry is
empty; the registry is `useState` in `ConfigShell` (`fieldsetNav.ts:82-113`, consumed via `useFieldsetNav()`); and
`ConfigFieldset.tsx:82-90` holds the fieldset DOM node in *state* set from a callback ref (`ref={setFieldsetNode}`,
`:149`), the registering effect bailing while it is null. A section change therefore commits and **paints** a frame in
which the outgoing tab's entries have unregistered and the incoming tab's have not yet registered. Aggravating factors
in scope to consider: `useScrollspy` (`ConfigNav.tsx:391-466`) re-runs wholesale on each new `fieldsets` identity, and
the registry living in `ConfigShell` re-renders the whole shell on every registration.

## Decision Dependencies

None recorded. Depends on FM-117 only for file serialization: if FM-117's ADR-0036 ground resolution takes the Paper
direction it edits `ConfigShell.tsx`, which this packet also touches — and this packet's evidence should be captured on
the settled field treatment.

## Files Allowed To Modify

- `core/ui-react/src/features/config/ConfigNav.tsx`, `fieldsetNav.ts`, `ConfigShell.tsx`,
  `components/ConfigFieldset.tsx`
- `core/ui-react/src/features/config/fieldsetNav.test.tsx`, `ConfigShell.test.tsx`, and a new focused test file in
  the same directory if the timing proof needs one
- `tests/system/tests/config.spec.ts` — add-only, if an E2E demonstration is added on top of the required unit proof
- This task packet and `../STATUS.md`

## Out Of Scope

- The list's structure, heading, ARIA, and selectors — ADR-0028's shape (`config-nav`, sibling below the `Tabs`) is
  frozen; this packet changes *when* it is empty, not what it is.
- `settingsIndex.ts` / settings search; every config tab body.
- Reverting the callback-ref-into-state mechanism blindly — see Acceptance; `ConfigFieldset.tsx:54-80` documents the
  Collapse/`unmountOnExit` detached-node bug it exists to prevent.

## Context To Read

- `ConfigFieldset.tsx:54-90` in full — the documented reason the node lives in state (react-transition-group keeps
  the child through `EXITING`; a ref snapshot outlives its node and leaves an anchor pointing at a detached element
  whose rect is all zeroes). **That documented reason must still hold after the fix**; this is not a blind revert.
- `fieldsetNav.ts:82-113` (registry state, register/unregister, `orderByDomPosition`) and its test file's harness.
- `ConfigNav.tsx:155-165` (the null render and its "absent for a tab whose body mounted no `ConfigFieldset`"
  rationale — genuinely fieldset-less tabs must still show no stale list) and `:388-466` (`useScrollspy`).
- The `C-CONFIG-FIELDS` record's FM-102 paragraph in `../COMPONENTS.yaml` — the registration contract being adjusted.

## Acceptance

- Switching between two config sections never paints a frame in which the anchor list (or its heading) is absent or
  shows the outgoing tab's entries under the incoming tab's name. A tab that genuinely mounts no `ConfigFieldset`
  still renders no list, exactly as `ConfigNav.tsx:160-162` intends today.
- The mechanism `ConfigFieldset.tsx:54-80` exists for still holds, and is re-proven, not assumed: a collapsed
  advanced fieldset withdraws its entry immediately, and no entry ever points at a detached node (the
  all-zeroes-rect bug must have a test or an explicit argument in the handoff for why it cannot recur).
- **The fix is proven by a test that fails on the current code.** This is a timing bug: a test that only passes after
  the change is worthless, because an assertion made after settle is green either way. A viable shape — not mandated —
  is a `MutationObserver` (or layout-effect probe) on the nav container recording an empty/removed-children frame
  during a tab switch; whatever shape is chosen, the handoff shows it red at base and green after.
- If `useScrollspy`'s wholesale re-run or the shell-wide re-render per registration is changed, each change carries
  its own test; if left alone, the handoff says why (they aggravate, but the paint-of-empty-frame is the defect).
- Screenshot strip per `../README.md` *Visual Gate* only if the settled rendering changes; a timing fix with
  identical settled frames instead records that explicitly, with the failing-then-passing test as the evidence.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run
  build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` pass; `npm run knip`
  reports only its known pre-existing finding; compare counts against a pristine-base run before claiming a delta.
- The new timing test, run against a pristine base tree (stash or `git worktree`), **fails**; the handoff quotes both
  runs' output.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config.spec.ts` passes.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — small diff, hard problem: React commit/paint timing across three cooperating modules, where
  the obvious fixes re-open a documented bug and a naive test proves nothing.
- Reviewer: `opus` — at least the implementer's tier; must judge whether the red-first test actually observes paint
  timing rather than settled state, and whether the detached-node bug can recur.
- Fixer: `opus` — any finding here is by nature a timing argument, not a mechanical edit.

Implementer prompt: Read `ConfigFieldset.tsx:54-80` before forming a plan — the state-held node is a fix for a real
bug, and your change must keep its guarantee while closing the empty-paint window (deferring the *list's* emptiness,
not resurrecting ref snapshots, is the promising axis). Trap: `flushSync`/`useLayoutEffect` band-aids that move the
window instead of closing it. Prove the empty painted frame red at base before writing any fix.
Reviewer prompt: Check hardest what the new test actually observes — if it asserts after settle it is green on the
broken code too; demand the quoted red run on pristine base. Distrust any change to `ConfigFieldset`'s registration
until you can restate why the detached-node bug still cannot happen.
