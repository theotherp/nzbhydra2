# FM-092: Indexer Colour Picker And Clear Button

Status: planned Owner:
Feature IDs: F-CONFIG-INDEXERS
Component IDs: None
API IDs: None
Depends on: None
Blocks: None

## Outcome

The indexer edit dialog's Color setting regains legacy's picker and clear affordances (`color-control.html`): beside the
existing free-text field, a picker button lets the admin choose a colour visually and a clear button empties the value —
closing `F-CONFIG-INDEXERS`' only unmigrated gap. The picker is the browser's native colour input (no library — ADR-0002
binds the stack, and stock browser controls are not a second component suite). Decision source: the recorded
`F-CONFIG-INDEXERS` gap line and the code comment at `IndexerDialog.tsx:645-651` deferring exactly this control.

## Decision Dependencies

None (ADR-0002 forbids a picker library; ADR-0014 governs the control's anatomy).

## Files Allowed To Modify

- `core/ui-react/src/features/config/indexers/IndexerDialog.tsx` and, if a small colour-field composite is extracted,
  one new module and test beside it in the same directory
- `core/ui-react/src/features/config/indexers/IndexersConfigTab.test.tsx` and the new module's colocated test
- `tests/system/tests/config-indexers.spec.ts` — add cases only; existing cases stay untouched
- The `F-CONFIG-INDEXERS` record in `../FEATURES.yaml`
- This task packet, `../STATUS.md`, `../GUI-STATUS.md` if its derived row changes

## Out Of Scope

- The stored value's format or the config schema — the model keeps holding legacy's `rgb(r,g,b)` string or `null`
- Displaying the colour anywhere outside this dialog (results/row tinting is a separate, undecided question)
- `C-CONFIG-FIELDS` shared field types — the composite stays feature-local unless a second consumer already exists

## Context To Read

- `core/ui-src/html/config/color-control.html` and `formly-config.js:290-322` (`colorInput`): model format comment
  `rgb(116,18,18)`, the rgba(…,0.5) display conversion, and `clear()` setting the model to `null`
- `IndexerDialog.tsx`'s Color `TextSetting` and its explanatory comment; `draftFieldPath("color")`
- `/core/ui-react/AGENTS.md` *UI Conventions* (ADR-0014) — no colour literals, stock anatomy, adornments over restyling

## Acceptance

- Picking a colour writes the model as legacy's `rgb(r,g,b)` string (no spaces, no alpha); the text field reflects it
  and stays freely editable; a valid `rgb(...)` value seeds the picker (hex conversion is internal only, never stored).
- The clear button sets the value to `null` (empty field), matching legacy `clear()`; it is disabled or hidden only if
  legacy's always-visible behavior is deliberately deviated from, and any such deviation is a `deliberate -` gap line.
- The current colour is visible in the closed control (e.g. a swatch adornment); legacy's field-background tint with
  0.5 alpha is not reproduced (ADR-0014 — record as a `deliberate -` gap line). No colour/font/radius literals in
  feature code beyond binding the user's own chosen value to the swatch.
- Both new controls carry accessible names and testids following the existing dialog convention (e.g.
  `config-indexer-color-picker`, `config-indexer-color-clear`), recorded in `F-CONFIG-INDEXERS.selectors`.
- Component tests cover: pick → `rgb(...)` written; clear → `null`; malformed/empty text value never crashes the picker
  seed. System test: open an indexer's edit dialog, set a colour via the text field, clear it, submit, and assert the
  committed entry's value round-trips (no caps-check side effects added).
- `F-CONFIG-INDEXERS`: the `unmigrated -` colour gap line is removed, the dialog's deferring comment updated, and parity
  flips to `done` (every remaining gap line is `deliberate -`).
- Screenshot strip per `../README.md` *Visual Gate*: the Color row closed with a value, and with the native picker open
  where capturable (desktop 1280x800; mobile 390x844 if the row lays out differently).

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-indexers.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — one dialog row in one module; the format contract, control anatomy, and registry flip are all
  settled above.
- Reviewer: `sonnet` — feature-local change with a prescribed data contract.
- Fixer: `sonnet` — expected findings are mechanical.

Implementer prompt: Start at `formly-config.js:290-322`, then the Color `TextSetting` in `IndexerDialog.tsx`. Trap: the
native input cannot represent "no colour" — never let its default `#000000` leak into the model on mount or on clear;
only an explicit pick writes. Prove first that clear yields `null` (not `""` and not black) in the committed entry.
Reviewer prompt: Check hardest the stored-format invariant (`rgb(r,g,b)` or `null`, nothing else reaches the config PUT)
and that no colour literal entered feature code. Distrust a system test that asserts the field text but never the
submitted entry's value.
