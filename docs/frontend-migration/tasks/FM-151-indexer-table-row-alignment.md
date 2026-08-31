# FM-151: Indexer Config Table Row Alignment

Status: planned Owner:
Feature IDs: F-CONFIG-INDEXERS
Component IDs: C-CONFIG-FIELDS
API IDs: None
Depends on: None
Blocks: None

## Outcome

Owner request 2026-08-31: in the indexer list's wide layout, a row's five cells (Indexer, Type, Used for, State, Priority) do
not sit on one line — three cells wrap their control in `SettingRow` (which adds `mb: 2.5` plus help/error `FormHelperText`
below the control), the name cell is a `Button` stack and Type is bare `Typography`, and cell vertical alignment differs. After
this task the five cells' primary content (name button text, type text, select text, switch, priority input) shares one
vertical centerline per row. One packet: a single visual defect in one table, fixed at its actual causes.

## Decision Dependencies

None.

## Files Allowed To Modify

- core/ui-react/src/features/config/indexers/{IndexerTable.tsx,IndexersConfigTab.test.tsx}
- core/ui-react/src/features/config/components/SettingRow.tsx — ONLY to add an opt-in (prop or context) that suppresses the
  bottom margin and/or relocates helper text; default behavior byte-identical for every existing consumer
- This task packet and docs/frontend-migration/FEATURES.yaml (F-CONFIG-INDEXERS only)

## Out Of Scope

- No rendering change on any other config tab: `SettingRow`'s default path is unchanged, proven by the untouched, passing
  `settingsIndexDrift.test.tsx` and the other tabs' suites.
- No field, column, testid, or behavior change; the compact (< sm) stacked layout stays a stack (it just must not regress).
- Do not run concurrently with FM-155 (`settingsIndexDrift.test.tsx` mounts every config tab).

## Context To Read

- `IndexerTable.tsx:378-516` (row component; which cells use `SettingRow`-wrapped controls vs bare elements)
- `SettingRow.tsx:88-140` (`mb: 2.5`, help/error `FormHelperText` below the control)
- `IndexerStateSwitch.tsx` and `NumberSetting`/`SelectSetting` in C-CONFIG-FIELDS; `/core/ui-react/AGENTS.md` *UI Conventions*

## Acceptance

- In the wide layout, every row's five cells vertically center their primary control on one shared line, including a row that
  renders help text under State and incomplete/VIP chips under the name — helper text and chips may hang below without
  dragging their cell's control off the centerline.
- The mechanism is table-scoped: either cell-level styling in `IndexerTable.tsx`, the `SettingRow` opt-in above, or both. No
  `C-CONFIG-FIELDS` control loses its help text, error wiring, or `aria-describedby` on this table or anywhere else.
- A component test pins the opt-in's contract (whatever shape it takes): defaults preserve current output; the table's usage
  applies it. No geometry matrix — visual judgment is the owner's via the strip.
- Screenshot strip (Visual Gate): desktop 1280x800 wide table with ≥ 2 rows, at least one carrying chips + help text; mobile
  390x844 compact stack; a before/after pair of the wide layout for the owner's call.

## Verification

- core/ui-react: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run knip`,
  `npm run validate:migration`, `npm run validate:focus-affordances` — all green
- tests/system: `npx playwright test tests/config-indexers.spec.ts tests/config.spec.ts` against a real backend — green, unedited
- Confirm changed files match `Files Allowed To Modify`

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks `review`; a fresh reviewer fills `../templates/review.md`; only the
coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — one table, causes already diagnosed, mechanism fenced to an opt-in.
- Reviewer: `sonnet` — at least the implementer's tier for the shared `SettingRow` opt-in; verifies the default path is
  byte-identical.
- Fixer: `sonnet` — implementer's tier.

Implementer prompt: Start at `IndexerTableRow` and render it wide with a help-bearing State cell before touching code. The
trap: fixing alignment by stripping `SettingRow` from the three controls loses help/error/aria wiring — suppress the offsets,
don't remove the wrapper. Prove first that no other tab's DOM changes (diff one other tab's rendered output before/after).
Reviewer prompt: Check hardest that `SettingRow`'s default output is unchanged everywhere else; distrust "aligned" without a
capture showing a chip-bearing name cell and help-bearing State cell on one centerline.
