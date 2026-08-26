# FM-102: In-Tab Fieldset Anchor Navigation

Status: ready Owner:
Feature IDs: F-CONFIG-SHELL, F-CONFIG-MAIN
Component IDs: C-CONFIG-FIELDS
API IDs: None
Depends on: None
Blocks: None

## Outcome

Long tabs stop being an endless scroll: the sidebar carries an "on this page" list of the active tab's fieldsets (Main
alone has ten: Hosting … Other) below its entries, headed with that tab's name per ADR-0028, each an anchor that scrolls
to its fieldset, with scrollspy marking the one currently in view. The list is DOM-driven — fieldsets register
themselves in a context when they mount — so conditionally rendered or advanced-hidden fieldsets are correct by
construction and no per-tab table can drift. Source:
owner backlog `docs/config-ui-improvements.md` §1.2, fed into design 2026-08-24; this packet is the contract,
implementers ignore that file per its banner.

## Decision Dependencies

- ADR-0028 — the anchor list is a sibling below the nav's `Tabs`, headed with the active tab's name, not a nested
  expansion of the active entry. Binding constraints carried into Acceptance below.

ADR-0014 also governs; route URLs unchanged — anchors are scroll targets, not hash routes.

## Files Allowed To Modify

- `core/ui-react/src/features/config/ConfigShell.tsx` + test and a new registration-context module + test directly in
  `core/ui-react/src/features/config/`
- `core/ui-react/src/features/config/ConfigNav.tsx` (+ `ConfigShell.test.tsx` coverage) — only the additive sibling list
  ADR-0028 requires, per Acceptance; the existing `Tabs`/`Tab` subtree is not edited
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
- `ConfigNav.tsx` in full — its `entries` `Tabs` block, the docked/`Drawer` `useMediaQuery` branch the list renders in
  once, and the doc comment recording why `Tabs` was kept (the reason ADR-0028 exists) — and FM-098's expander (an
  advanced fieldset registers as its collapsed expander, so the anchor still has a target)
- `/core/ui-react/AGENTS.md` *UI Conventions* (ADR-0014)

## Acceptance

- Per ADR-0028 the list renders as a sibling element *below* the nav's `Tabs`, headed with the active tab's name (so
  its scope is unambiguous sitting under all eight entries), listing the mounted fieldsets of the current tab in DOM
  order, labelled with their legends (`config-nav-anchor-<fieldset testid suffix>`). A tab whose body renders no
  fieldsets shows no list (and no heading). Registration/unregistration follows mount/unmount, so toggling advanced
  updates the list.
- ADR-0028's binding constraints: `ConfigNav.tsx`'s `Tabs`/`Tab` structure, its `tab`/`tablist` roles, `aria-selected`
  and every `config-tab-<path>` selector are unchanged — no `Tab` gains children, no element is interleaved among them,
  and the list is never a `Tabs` child. The same list renders in both the docked column and the mobile `Drawer` branch,
  keeping FM-097's one-copy-of-every-testid idiom: no anchor testid is mounted twice.
- Clicking an anchor scrolls its fieldset under the sticky bar (offset so the legend is visible, not hidden beneath the
  bar) without a route change; the anchor for the fieldset currently in the viewport carries a visible current marker
  (scrollspy via `IntersectionObserver` or scroll position — implementer's choice; jsdom-untestable parts belong in the
  system test).
- Keyboard: anchors are buttons/links in the Tab order; the current marker is not colour-only (e.g. `aria-current`).
- No sibling spec may need editing. `ConfigNav.tsx`/`ConfigFieldset.tsx` render on every tab and each anchor's
  accessible name duplicates a fieldset legend, so a role/text locator in any per-tab spec can newly match twice and
  trip strict mode; anchors therefore carry only `config-nav-anchor-*` testids and duplicate no `config-fieldset-*` id.
  A spec outside this allowlist needing a change is a `BLOCKED` report, not an edit.
- Tests: context unit tests (register/unregister/order); `config.spec.ts` adds: on Main, the list shows all ten legends
  with advanced on, fewer with advanced off; clicking "Logging" brings that fieldset into view; scrolling moves the
  current marker.
- Selectors recorded in `F-CONFIG-SHELL.selectors`; `C-CONFIG-FIELDS` responsibility notes the registration. ADR-0014:
  stock MUI list anatomy, no design literals.
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 Main with the headed anchor list below the nav
  entries and a mid-page current marker; mobile 390x844 (drawer) if layout differs.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration && npm run validate:focus-affordances` succeeds — except that the last is
  **red at base** on five known false positives (`../MAINTENANCE.md`), none of them in this packet's files. Report it
  *failed* with a base-comparison run on a pristine tree (stash or `git archive`) proving your finding set is
  byte-identical to base; a sixth finding is yours to fix. Never silence it by adding entries to the exemption list at
  `scripts/validate-focus-affordances.mjs:112` — that weakens a real gate to hide a matcher bug, and FM-111 refused
  exactly that workaround.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config tests/external-tools.spec.ts
  tests/notched-label-geometry.spec.ts` passes in full. Playwright's positional args are path filters, so `tests/config`
  selects `config.spec.ts` **and** all seven per-tab specs — the real blast radius of a nav rendered on every tab.
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
Reviewer prompt: Check hardest that no `*ConfigTab.tsx` was edited, that the `Tabs`/`Tab` subtree is byte-identical
(ADR-0028), and that the advanced-off list matches what FM-098 renders.
Distrust jsdom scrollspy claims entirely — require the system-test evidence.
