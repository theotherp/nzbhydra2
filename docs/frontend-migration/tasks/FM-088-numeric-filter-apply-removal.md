# FM-088: Numeric Filter Apply Removal And Inline Clear

Status: planned Owner:
Feature IDs: F-SEARCH-SORT-FILTER Component IDs: None API IDs: None Depends on: None Blocks: None

## Outcome

The refine sidebar's three `NumericFilter` instances (Size, Age, Grabs/seeders) lose their dead "Apply" button — the
min/max fields already commit on every keystroke via `SearchResults.tsx`'s `updateRange`, and the button has no `onClick`
— and their "Clear" action moves from the second row up beside the min/max fields as an icon-only control, so each
numeric section is a single row and the sidebar loses its only do-nothing affordance. Owner-requested 2026-08-23
(`../MAINTENANCE.md`, Open candidates). One component, one registry record, one visual surface: one task.

## Decision Dependencies

ADR-0009, ADR-0014.

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/filterControls.tsx`
- `core/ui-react/src/features/search/results/SearchResults.test.tsx`, `core/ui-react/src/features/search/results/RefineSidebar.test.tsx`
- `tests/system/tests/results.spec.ts` — only if a refine-sidebar assertion or capture is invalidated; see the legacy note below
- The `F-SEARCH-SORT-FILTER` record in `../FEATURES.yaml`
- This task packet and `../STATUS.md`

## Out Of Scope

- `RefineSidebar.tsx`, `SearchResults.tsx` production code — `updateRange`/`clearRange` and the `NumericFilter` prop
  contract (`onChange`/`onClear`) are unchanged; only `filterControls.tsx`'s rendering changes
- **The legacy-UI system test** "should filter titles and sizes through result controls" (`results.spec.ts:52-87`): its
  `number-filter-apply-size` click at line 77 targets the *AngularJS* UI at `/`
  (`core/ui-src/html/dataTable/columnFilterNumberRange.html:24`; its sibling selectors `freetext-filter-title` and
  `.toggle-column-filter` exist only in `core/ui-src`). It is unaffected by this change and must not be edited.
  `../MAINTENANCE.md`'s open-candidate claim that this task must update that line is stale — record the correction in the handoff.
- Legacy `core/ui-src` sources; any other refine-sidebar section

## Context To Read

- `filterControls.tsx` `NumericFilter` (current two-row layout, `numericFieldSx`); `RefineSidebar.tsx`'s three call sites
  (`testIdPrefix` `refine-size`/`refine-age`/`refine-grabs`) and `EXPANDED_WIDTH = 248`
- `/core/ui-react/AGENTS.md` *UI Conventions*; `@mui/icons-material` is the established icon source (e.g. `SystemTasksTab.tsx`)
- `results.spec.ts:277,444,448` — React clear clicks on `number-filter-clear-refine-*`, which must keep passing unchanged

## Acceptance

- No React DOM node carries a `number-filter-apply-*` test id; `grep -rn "number-filter-apply" core/ui-react/src` returns
  nothing. The `F-SEARCH-SORT-FILTER` selectors entry `number-filter-apply-{{column}}` is removed (it remains a
  legacy-only selector; if the record's conventions call for noting legacy-only selectors, a comment is acceptable).
- Each `NumericFilter` renders one row: min field, max field, then an icon-only clear control (MUI `IconButton` with an
  `@mui/icons-material` glyph, e.g. `Close`/`Backspace`-family) to the right of the max field. The second button row is gone.
- The clear control keeps `data-testid="number-filter-clear-{testIdPrefix}"` (so `results.spec.ts`'s
  `number-filter-clear-refine-*` clicks pass without edits), keeps `disabled` when both bounds are empty, keeps calling
  `onClear(name)`, and gains an `aria-label` naming the section (e.g. "Clear Size (MB) filter" from the existing `label` prop).
- The sidebar's overall width is unchanged: `EXPANDED_WIDTH` stays 248 and the single row fits inside the existing padding
  with no horizontal overflow — the min/max fields absorb the icon's width via their existing `flex: 1`.
- No color/font/radius literals beyond what `filterControls.tsx` already carries under ADR-0014; the icon button uses
  theme-derived styling only.
- Component tests updated: the clear behavior/disabled tests keep passing against the new structure, and a test asserts
  the apply test id is absent from the rendered sidebar.
- Screenshot strip per `../README.md` *Visual Gate*: the refine sidebar's numeric sections at desktop 1280x800 (docked)
  and mobile 390x844 (drawer), one state with values entered showing the enabled clear icon.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts` passes in full —
  including the untouched legacy test at line 52 and the React clear clicks at lines 277/444/448.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — a one-component layout change following patterns the file already demonstrates; the packet settles
  the one non-obvious question (legacy vs. React test ids).
- Reviewer: `sonnet` — registry selector removal is prescribed exactly; the diff is small and mechanically checkable.
- Fixer: `sonnet` — expected findings are layout/test mechanics.

Implementer prompt: Start at `filterControls.tsx`'s `NumericFilter` and its three `RefineSidebar.tsx` call sites. Trap: the
grep hit for `number-filter-apply-size` in `results.spec.ts:77` is a *legacy AngularJS* test — do not "fix" it; the React
ids all carry the `refine-` prefix. Prove first that no test anywhere references `number-filter-apply-refine-*`.
Reviewer prompt: Check hardest that the legacy test at `results.spec.ts:52-87` is untouched and still green, and that the
clear control's test id, disabled rule, and `onClear` wiring are byte-equivalent. Distrust the strip if it shows only the
desktop branch — the drawer renders the same component and must fit too.
