# FM-099: Settings Search

Status: ready Owner:
Feature IDs: F-CONFIG-SHELL
Component IDs: C-CONFIG-SETTINGS-INDEX, C-CONFIG-FIELDS
API IDs: None
Depends on: None
Blocks: FM-100, FM-101

## Outcome

One search field in the sticky bar filters every setting across all eight tabs by label and help text, results grouped by
section; picking a result navigates to the tab, scrolls to the setting's row, reveals it if it is advanced-hidden, and
briefly highlights it. Source: owner backlog `docs/config-ui-improvements.md` §1.3, fed into design 2026-08-24; this
packet is the contract, implementers ignore that file per its banner. The tabs define fields as JSX, not data, so the
searchable metadata is a new hand-maintained index module — `C-CONFIG-SETTINGS-INDEX` — kept honest by a two-directional
drift test against the rendered tabs. Purely client-side; no API work.

## Decision Dependencies

None.

## Files Allowed To Modify

- New directory `core/ui-react/src/features/config/settingsSearch/` (index module, search UI, navigation/reveal helper,
  tests)
- `core/ui-react/src/features/config/ConfigShell.tsx` + test (mounting the field in the sticky bar) and the FM-098
  disclosure files only where a programmatic-reveal hook must be exported
- `tests/system/tests/config.spec.ts` — add cases; existing cases stay green
- The `C-CONFIG-SETTINGS-INDEX` record in `../COMPONENTS.yaml` (created `planned` with this packet; implementer marks it
  `done`); the `F-CONFIG-SHELL` record in `../FEATURES.yaml`
- This task packet, `../STATUS.md`, `../GUI-STATUS.md` if its derived row changes

## Out Of Scope

- Editing any tab body or field definition; ranking cleverness (substring match, case-insensitive, is enough)
- Searching dialog-internal fields (indexer/downloader/external-tool editors, custom-mapping dialog): entries point at
  what a tab renders directly; list sections are indexed as one entry per section (e.g. "Indexers"), not per entry field

## Context To Read

- `components/settings.ts` (`settingRowTestId` — the anchor a result scrolls to), every `*ConfigTab.tsx` and
  `*Settings.ts` under `features/config/` (the labels/help being indexed), `configTabs.ts` (section names/hrefs)
- FM-098's disclosure context (the reveal mechanism a hit behind an advanced gate must drive)
- `/core/ui-react/AGENTS.md` *UI Conventions* (ADR-0014)

## Acceptance

- Index: one record per directly rendered setting row across all eight tabs — `{path, label, helpText, tab, fieldset,
  advanced, conditional}` — `conditional: true` for rows whose rendering depends on another field's value (e.g.
  `notificationConfig.appriseApiUrl`). List sections contribute one navigable entry each.
- Drift test (the load-bearing part): for each tab, render it with advanced shown over a fixture config chosen so
  non-conditional rows all render; assert (a) every non-conditional index entry's `config-setting-<path>` testid is in
  the DOM, and (b) every rendered `config-setting-*` testid is in the index — so an FM task adding a setting without
  indexing it fails this test by name.
- UI: a search field (`config-search`) in FM-097's sticky bar; stock MUI `Autocomplete` grouped by tab label, each
  option showing label + fieldset, advanced options marked. Matching is case-insensitive substring over label and help
  text. Selecting navigates to the tab's route, scrolls the row into view, reveals it first when hidden behind an
  advanced gate (drive FM-098's per-fieldset reveal; the global toggle's stored preference is not modified), and
  applies a temporary highlight from theme palette tokens that clears on its own — no colour literals (ADR-0014).
- Keyboard: the Autocomplete's stock listbox navigation suffices; the field is reachable by Tab; no custom key handling.
- Tests: index-module unit tests (matching, grouping, advanced flagging), the drift test, a `ConfigShell.test.tsx` case
  for navigate-on-select; `config.spec.ts` adds: search a Searching-tab setting from Main → lands on Searching with the
  row visible; search an advanced Main setting with the toggle off → row revealed and highlighted.
- Selectors (`config-search`, option/testid scheme) recorded in `F-CONFIG-SHELL.selectors`.
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 with open grouped results, and the landed-on
  highlighted row; mobile 390x844 if layout differs.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — builds a new registered shared abstraction whose value is the completeness of a hand-built index
  over ~200 fields and a drift test that must actually bite.
- Reviewer: `opus` — new shared component; must spot-check index completeness against the tabs, not trust the test alone.
- Fixer: `sonnet` — expected findings are missed/mislabelled index entries, mechanical to fix.

Implementer prompt: Start at `components/settings.ts` and one dense tab (`MainConfigTab.tsx`). Build the drift test
before the index — it then writes the index for you row by row. Trap: `RepeatSection` entries render `config-setting-*`
testids for entry fields with numeric indices; the drift test must exclude those or direction (b) false-positives.
Prove first that reveal-then-scroll works for an advanced field with the global toggle off, in the real app.
Reviewer prompt: Check hardest direction (b) of the drift test — that it really fails on an unindexed rendered row (ask
for the mutation evidence). Distrust helpText coverage: sample five settings per tab against their JSX by hand.
