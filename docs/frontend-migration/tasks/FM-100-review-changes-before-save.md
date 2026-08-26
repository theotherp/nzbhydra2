# FM-100: Review Changes Before Save

Status: planned Owner:
Feature IDs: F-CONFIG-SHELL
Component IDs: C-CONFIG-FORM, C-CONFIG-SETTINGS-INDEX
API IDs: None
Depends on: FM-099
Blocks: None

## Outcome

The sticky bar's "N settings changed" summary becomes a button opening a review panel that lists every changed setting —
human label, tab/fieldset, old value → new value — computed client-side from `formState.dirtyFields` against the loaded
config, with Save and Close actions. Saving always rewrites the whole config and can trigger a restart, which is what
makes this panel valuable: it catches accidental edits before they are persisted. Source: owner backlog
`docs/config-ui-improvements.md` §3.2, fed into design 2026-08-24; this packet is the contract, implementers ignore that
file per its banner. Labels and section names come from `C-CONFIG-SETTINGS-INDEX` (FM-099), which is why this follows it.

## Decision Dependencies

None (the save contract `API-CONFIG-PUT` is untouched; this is presentation over existing client state).

## Files Allowed To Modify

- New directory `core/ui-react/src/features/config/reviewChanges/` (diff computation, panel component, tests)
- `core/ui-react/src/features/config/ConfigShell.tsx` + test (wiring the summary button and panel)
- `tests/system/tests/config.spec.ts` — add cases; existing cases stay green
- The `F-CONFIG-SHELL` record in `../FEATURES.yaml`; the `C-CONFIG-SETTINGS-INDEX` consumers list in `../COMPONENTS.yaml`
- This task packet, `../STATUS.md`, `../GUI-STATUS.md` if its derived row changes

## Out Of Scope

- Per-item revert from the panel (not requested; keep the panel read-only plus Save/Close)
- Any change to `useConfigSave.ts`, the validation dialogs/banner (FM-101), or the restart flow

## Context To Read

- `ConfigShell.tsx:88-113` (form + submit the panel's Save must call — the same `submit`, so `trigger()` still runs) and
  FM-097's dirty-count helper (the leaf-path walk this diff extends with values)
- `useConfigSave.ts:86-89` (the loaded config lives in the query cache under `CONFIG_QUERY_KEY` and in
  `formState.defaultValues` after every reset — the "old" side of the diff)
- `api/config/schema.ts:1-40` (sections are passthrough objects: a diff walker must tolerate keys the UI never modelled)
- `../COMPONENTS.yaml` `C-CONFIG-FORM` note on secret masking (`***UNCHANGED***`); `APIS.yaml` `API-CONFIG-PUT` note
- `/core/ui-react/AGENTS.md` *UI Conventions* (ADR-0014)

## Acceptance

- Clicking the dirty summary (`config-dirty-summary`, now a button) opens the panel (`config-review-changes`), a stock
  MUI `Dialog`; it lists one row per dirty leaf path: index label (falling back to the raw path for a path the index
  does not know), "Tab › Fieldset" origin, old and new values rendered as text (`config-review-entry-<path testid>`),
  booleans as on/off, empty as "(empty)".
- Secrets never display: a field whose current or old value is masked (`***UNCHANGED***`) or whose control is a secret
  kind shows "(hidden)" for both sides with a "changed" marker. The determination is a tested pure function.
- Array sections (indexers, downloaders, users, categories, notification entries, custom mappings, external tools) are
  summarized per entry — "Indexers: NZBGeek edited", "added", "removed" — by comparing old and new arrays keyed the way
  `API-CONFIG-PUT`'s marker resolution keys them (name; username for users), never field-by-field.
- The panel's Save invokes the shell's existing `submit` and closes on `"saved"`; Close changes nothing. Opening the
  panel never mutates form state (a test proves `formState` identical before/after open+close).
- Tests: diff-computation unit tests (scalars, nested, arrays added/removed/edited, masked secrets, unmodelled
  passthrough keys ignored gracefully); `config.spec.ts` adds: change a Main switch and an indexer priority → panel
  lists both correctly → Save from the panel persists.
- Selectors recorded in `F-CONFIG-SHELL.selectors`. ADR-0014: no design literals.
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 panel with a scalar change, an array summary, and
  a hidden secret row; mobile 390x844 if layout differs.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — the diff walker meets passthrough schemas, masked secrets, and RHF's array dirty quirks at once;
  a wrong "old value" here quietly misinforms every save.
- Reviewer: `opus` — must audit the secret-hiding function adversarially; a leak here displays credentials on screen.
- Fixer: `sonnet` — expected findings are rendering and labelling corrections.

Implementer prompt: Start from FM-097's dirty-leaf helper and `useConfigSave.ts:86-89`. Trap: after a save, `reset(saved)`
re-baselines `defaultValues` — always diff against the form's *current* defaults, never the initial fetch. Second trap:
`dirtyFields` can flag a path whose value equals its default (touched then reverted); drop value-equal rows so the panel
never lists a non-change. Prove the masked-secret row first: edit a proxy password and confirm no value renders anywhere.
Reviewer prompt: Check hardest for secret leakage through the "old value" side and through array summaries' legends.
Distrust the unit fixtures — drive a real config with masked fields end-to-end once.
