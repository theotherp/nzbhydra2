# FM-103: Indexer List Table

Status: ready Owner:
Feature IDs: F-CONFIG-INDEXERS
Component IDs: C-CONFIG-FIELDS
API IDs: None
Depends on: None
Blocks: FM-104

## Outcome

The Indexers tab's vertical stack of button-rows becomes a proper list: a stock MUI table with columns for name (the
edit affordance, with the existing incomplete/caps/VIP markers), type, search-source scope, state, and priority; a text
filter over names; header sorting; and bulk enable/disable. Status stays visible on the list, not only inside the modal.
Source: owner backlog `docs/config-ui-improvements.md` §4.1 (list half; the preset gallery is FM-104), fed into design
2026-08-24; this packet is the contract, implementers ignore that file per its banner. The tab's transactional machinery
(`IndexersConfigTab.tsx` transactions, recheck, imports) is inherited untouched — this is the row surface only.

## Decision Dependencies

None (ADR-0014 governs; every edit still flows through `C-CONFIG-FORM`'s `setValue` with `shouldDirty`).

## Files Allowed To Modify

- In `core/ui-react/src/features/config/indexers/`: `IndexerRow.tsx` (may become `IndexerTable.tsx`),
  `IndexersConfigTab.tsx`, `indexerSettings.ts`, `IndexerStateSwitch.tsx`, their tests, and new list-surface files +
  tests in the same directory
- `tests/system/tests/config-indexers.spec.ts` — cases asserting the old stacked layout may be rewritten
- The `F-CONFIG-INDEXERS` record in `../FEATURES.yaml`
- This task packet, `../STATUS.md`, `../GUI-STATUS.md` if its derived row changes

## Out Of Scope

- `IndexerDialog.tsx`, `AddIndexerDialog.tsx` (FM-104), `CapsCheckDialog`, imports, presets — the dialogs and their
  transactions are consumed, never modified
- Persisting sort/filter; reordering entries in the config (display order only)

## Context To Read

- `IndexerRow.tsx` (the markers and per-row controls being carried over), `IndexersConfigTab.tsx:70-82,262-297` (the
  index-binding invariant: controls bind the entry's *configuration* index, never its display position — the table must
  keep this under sorting and filtering) and `indexerSettings.ts:71-140` (`orderedIndexers` — the initial sort —
  `indexerStateLabel`, `toggledIndexerState`, `isIndexerEnabled`)
- `IndexerDialog.tsx` (the "Enabled for search source" options the scope column reuses; the type values `searchModuleType`
  carries, e.g. `NEWZNAB`/`TORZNAB` — presets in `indexerPresets.ts`)
- `/core/ui-react/AGENTS.md` *UI Conventions* (ADR-0014)

## Acceptance

- Table (`config-indexers-table`), horizontally scrollable in its own container on narrow viewports, one row per entry:
  name button (testid `config-indexer-edit-<config index>` kept) opening the existing edit transaction, with the
  `Config incomplete` / `Caps check incomplete` / VIP chips and their testids carried over; type (from
  `searchModuleType`, human-cased); search-source scope as a compact labelled select bound to
  `indexers.<index>.enabledForSearchSource` with the dialog's same options (a direct form edit, dirty like any other);
  state via the existing `IndexerStateSwitch`; priority via the existing `NumberSetting`. Row testid
  `config-indexer-entry-<config index>` kept.
- Filter (`config-indexers-filter`): case-insensitive substring over names; filtering hides rows without touching the
  form. Sorting: initial order is `orderedIndexers` exactly; clicking name/state/priority headers sorts ascending/
  descending; sorted/filtered display never re-targets a control (a component test edits priority in a sorted+filtered
  view and asserts the correct config entry changed).
- Bulk actions: `config-indexers-enable-shown` / `config-indexers-disable-shown` set every *currently shown* row's state
  via `toggledIndexerState` in one form write; disabled when no rows shown. A disable never touches any other field.
- Empty state (`config-indexers-empty`) keeps its message and gains a hint naming the Add button (§5's empty-state note).
- The Add button, recheck buttons, and all dialog flows keep their selectors and behavior; every existing
  `config-indexers.spec.ts` scenario still passes, rewritten only where it asserted the stacked layout.
- `config.spec.ts` is **not** in the allowlist and must stay green unedited: FM-100's review-panel case (`:223-268`,
  again at `:704-730`) opens the Indexers tab and fills `config-input-indexers-0-score` directly, so that testid keeps
  its path binding and is visible on load with no filter, sort or expansion first. If it cannot, report `BLOCKED`.
- Tests: table rendering/sort/filter/bulk unit tests; `config-indexers.spec.ts` adds filter + bulk-disable + sorted-edit
  cases. Selector changes recorded in `F-CONFIG-INDEXERS.selectors`.
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 with mixed states/markers, one filtered view;
  mobile 390x844 showing the scroll container.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration && npm run validate:focus-affordances` succeeds — except that the last is
  **red at base** on five known false positives (`../MAINTENANCE.md`), one in a file this packet *may* edit
  (`IndexersConfigTab.test.tsx:565`) and two more in `indexers/ColorSetting{,.test}.tsx`, which it may not — so a
  pre-existing finding here is easy to mistake for one you caused. Report it *failed* with a base-comparison run on a
  pristine tree (stash or `git archive`) proving your finding set is byte-identical to base; a sixth finding is yours to
  fix. Never silence it by adding entries to the exemption list at `scripts/validate-focus-affordances.mjs:112` — that
  weakens a real gate to hide a matcher bug, and FM-111 refused exactly that workaround.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-indexers.spec.ts
  tests/config.spec.ts` passes in full — `config.spec.ts` drives this tab's priority field from the review panel and is
  the only thing that catches a re-homed or interaction-gated `config-input-indexers-0-score`.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — the display-order/config-index split under sort+filter+bulk writes is exactly where a subtle
  wrong-entry write hides, and the surface carries live form controls, not plain cells.
- Reviewer: `opus` — must adversarially probe the index-binding invariant and the bulk write's blast radius.
- Fixer: `opus` — same territory.

Implementer prompt: Start at `IndexersConfigTab.tsx:70-82` and `orderedIndexers`. Trap: `useWatch` array identity churns
on every keystroke in a row's priority field — memoize sort/filter derivation by value or typing in one cell re-sorts the
table under the cursor; defer re-sorting until blur. Prove first, in the real app, that editing priority in a sorted,
filtered table changes the right indexer and marks the form dirty once.
Reviewer prompt: Check hardest bulk disable against a filtered view (only shown rows change; other fields byte-equal)
and every carried-over testid. Distrust unit-level sort claims — demand the system-test sorted-edit case.
