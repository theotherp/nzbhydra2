# FM-104: Indexer Preset Gallery

Status: planned Owner:
Feature IDs: F-CONFIG-INDEXERS
Component IDs: None
API IDs: None
Depends on: FM-103
Blocks: None

## Outcome

Adding an indexer stops hiding the presets behind two anchor menus: `AddIndexerDialog` becomes a searchable gallery —
the presets rendered as a filterable, grouped grid (Usenet / Torrents / special entries), each preset a directly
clickable item, with the custom newznab/torznab entries and the Jackett/Prowlarr importers visibly separated as today.
Source: owner backlog `docs/config-ui-improvements.md` §4.1 (preset-selection half), fed into design 2026-08-24; this
packet is the contract, implementers ignore that file per its banner. Selection semantics are inherited exactly: picking
a preset only seeds a new entry via the existing `onSelect` → `selectPreset` path (`IndexersConfigTab.tsx:174-184`),
including the may-only-exist-once refusal; the importers keep opening their own dialog.

## Decision Dependencies

None (ADR-0014 governs; preset data in `indexerPresets.ts` is read-only for this task).

## Files Allowed To Modify

- `core/ui-react/src/features/config/indexers/AddIndexerDialog.tsx` + its test coverage (in
  `IndexersConfigTab.test.tsx` or a new `AddIndexerDialog.test.tsx`)
- `tests/system/tests/config-indexers.spec.ts` — cases driving the old menus may be rewritten
- The `F-CONFIG-INDEXERS` record in `../FEATURES.yaml`
- This task packet, `../STATUS.md`, `../GUI-STATUS.md` if its derived row changes

## Out Of Scope

- `indexerPresets.ts` values (parity data — verbatim from legacy; a gallery needing new metadata fields must derive them
  at render time from `label`/`slug`/`seed`, not edit the presets), `IndexersConfigTab.tsx`, `IndexerDialog.tsx`,
  `IndexerImportDialog.tsx`, import behavior, `isAddingAllowed` semantics

## Context To Read

- `AddIndexerDialog.tsx` (the two `Menu` anchors and group structure being replaced; `ADD_INDEXER_DIALOG_TEST_ID`),
  `indexerPresets.ts` (`NEWZNAB_PRESETS`, `TORZNAB_PRESETS`, `SPECIAL_PRESETS`, `CUSTOM_*_PRESET`, `slug`),
  `indexerImport.ts` (`INDEXER_IMPORT_ORDER`)
- `IndexersConfigTab.tsx:174-184` (`selectPreset` — the unchanged consumer)
- `/core/ui-react/AGENTS.md` *UI Conventions* (ADR-0014)

## Acceptance

- The dialog (testid `config-indexer-add-dialog` kept, widened to `maxWidth="md"`) renders every preset from the three
  existing groups as a clickable item under Usenet / Torrents / Special headings, in the arrays' order; each item keeps
  the testid scheme `config-indexer-preset-<group>-<slug>` so existing selectors keep resolving where they exist. The
  custom newznab/torznab entries render first in their groups, visually distinguished as the blank-entry choices.
- A filter field (`config-indexer-preset-filter`, autofocused) narrows all groups by case-insensitive substring on the
  label; a group with no matches hides its heading; no matches at all shows an explicit empty line. Filtering never
  reorders.
- The importer entries ("Read from Jackett/Prowlarr", testids kept) stay in a separated section, never filtered out by a
  preset filter (they are tools, not presets — hide them only when the filter also misses their labels).
- Clicking an item calls `onSelect(preset)` / `onImport(source)` exactly as today; Escape/backdrop cancel unchanged.
  Keyboard: items are buttons in the Tab order; the stock focus ring applies (ADR-0015).
- Tests: component tests for grouping, filtering, custom-first ordering, and callback wiring; `config-indexers.spec.ts`
  rewrites the menu-driven add to the gallery (filter to a preset, pick it, land in the edit dialog) and keeps every
  downstream assertion (seeded fields, once-only refusal) untouched.
- Selector changes recorded in `F-CONFIG-INDEXERS.selectors`. ADR-0014: stock MUI (`Dialog`, `TextField`, list/grid
  primitives), no design literals.
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 gallery unfiltered and filtered; mobile 390x844.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-indexers.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — one dialog file, unchanged callbacks, acceptance settles layout and ordering.
- Reviewer: `sonnet` — no shared component or contract change; verifies selector continuity and untouched semantics.
- Fixer: `sonnet` — mechanical.

Implementer prompt: Start at `AddIndexerDialog.tsx` and `indexerPresets.ts`'s group exports. Trap: some preset testids
are asserted today only for the menu-rendered path — grep `config-indexer-preset-` across `tests/` before renaming
anything. Prove first that picking a filtered preset seeds the same entry fields as the old menu did (compare the edit
dialog's values).
Reviewer prompt: Check hardest that `indexerPresets.ts` is byte-untouched and `selectPreset`'s refusal path still fires
for a once-only preset. Distrust layout-only component tests — require the system-test add flow end-to-end.
