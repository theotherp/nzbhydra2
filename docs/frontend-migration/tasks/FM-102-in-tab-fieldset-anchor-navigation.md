# FM-102: In-Tab Fieldset Anchor Navigation

Status: planned Owner:
Feature IDs: F-CONFIG-SHELL, F-CONFIG-MAIN
Component IDs: C-CONFIG-FIELDS
API IDs: None
Depends on: FM-097
Blocks: None

## Outcome

Long tabs stop being an endless scroll: the sidebar's active section expands to an "on this page" list of the tab's
fieldsets (Main alone has ten: Hosting … Other), each an anchor that scrolls to its fieldset, with scrollspy marking the
one currently in view. The list is DOM-driven — fieldsets register themselves in a context when they mount — so
conditionally rendered or advanced-hidden fieldsets are correct by construction and no per-tab table can drift. Source:
owner backlog `docs/config-ui-improvements.md` §1.2, fed into design 2026-08-24; this packet is the contract,
implementers ignore that file per its banner.

## Decision Dependencies

None (ADR-0014 governs; route URLs unchanged — anchors are scroll targets, not hash routes).

## Files Allowed To Modify

- `core/ui-react/src/features/config/ConfigShell.tsx` + test, the FM-097 sidebar files, and a new registration-context
  module + test directly in `core/ui-react/src/features/config/`
- `core/ui-react/src/features/config/components/ConfigFieldset.tsx` and `configFields.test.tsx` (self-registration only)
- `tests/system/tests/config.spec.ts` — add cases; existing cases stay green
- The `F-CONFIG-SHELL` record in `../FEATURES.yaml`; the `C-CONFIG-FIELDS` record in `../COMPONENTS.yaml`
- This task packet, `../STATUS.md`, `../GUI-STATUS.md` if its derived row changes

## Out Of Scope

- Tab bodies (no `*ConfigTab.tsx` edits — registration lives inside `ConfigFieldset`); hash-fragment URLs; collapsible
  fieldsets (FM-098 owns advanced disclosure; a non-advanced fieldset never collapses); sections that render no
  `ConfigFieldset` at their top level showing an empty list is acceptable

## Context To Read

- `ConfigFieldset.tsx` (the mount point that registers; its `data-testid="config-fieldset-<label>"` is the anchor id
  source) and `MainConfigTab.tsx` (the ten-fieldset case)
- FM-097's sidebar component (where the expanded list renders) and FM-098's expander (an advanced fieldset registers as
  its collapsed expander, so the anchor still has a target)
- `/core/ui-react/AGENTS.md` *UI Conventions* (ADR-0014)

## Acceptance

- The active sidebar entry expands to list the mounted fieldsets of the current tab, in DOM order, labelled with their
  legends (`config-nav-anchor-<fieldset testid suffix>`); other entries stay unexpanded. A tab whose body renders no
  fieldsets shows no list. Registration/unregistration follows mount/unmount, so toggling advanced updates the list.
- Clicking an anchor scrolls its fieldset under the sticky bar (offset so the legend is visible, not hidden beneath the
  bar) without a route change; the anchor for the fieldset currently in the viewport carries a visible current marker
  (scrollspy via `IntersectionObserver` or scroll position — implementer's choice; jsdom-untestable parts belong in the
  system test).
- Keyboard: anchors are buttons/links in the Tab order; the current marker is not colour-only (e.g. `aria-current`).
- Tests: context unit tests (register/unregister/order); `config.spec.ts` adds: on Main, the list shows all ten legends
  with advanced on, fewer with advanced off; clicking "Logging" brings that fieldset into view; scrolling moves the
  current marker.
- Selectors recorded in `F-CONFIG-SHELL.selectors`; `C-CONFIG-FIELDS` responsibility notes the registration. ADR-0014:
  stock MUI list anatomy, no design literals.
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 Main with the expanded anchor list and a mid-page
  current marker; mobile 390x844 (drawer) if layout differs.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — a registration context plus a list, with the pattern (FM-098's registration) already in the
  tree by then and acceptance settling the open questions.
- Reviewer: `sonnet` — additive shared-component touch, no selector re-homing.
- Fixer: `sonnet` — mechanical.

Implementer prompt: Start at `ConfigFieldset.tsx` and FM-098's registration context — reuse its shape, don't invent a
second idiom. Trap: registration order must be DOM order, but effect order across siblings is mount order — derive order
from element position, not registration sequence, or conditional fieldsets appear at the end. Prove the sticky-bar scroll
offset first in the real app; jsdom cannot.
Reviewer prompt: Check hardest that no `*ConfigTab.tsx` was edited and the advanced-off list matches what FM-098 renders.
Distrust jsdom scrollspy claims entirely — require the system-test evidence.
