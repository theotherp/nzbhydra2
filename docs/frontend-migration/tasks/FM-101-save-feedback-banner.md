# FM-101: Save Feedback Banner

Status: planned Owner:
Feature IDs: F-CONFIG-SHELL
Component IDs: C-CONFIG-FORM, C-CONFIG-SETTINGS-INDEX
API IDs: API-CONFIG-PUT
Depends on: FM-099
Blocks: None

## Outcome

Save feedback stops being modal: the "Config validation failed" and "warnings" acknowledge dialogs
(`useConfigSave.ts:66-84,91-100`) become a persistent banner region at the top of the config area — errors stay until the
next save attempt or dismissal, warnings are dismissible, the success toast stays. The client-side pre-submit rejection
("Config invalid" toast, `ConfigShell.tsx:100-106`) becomes a banner listing each invalid setting by its index label,
navigating to the field on click — client-side errors carry field paths, so this half of inline validation needs no
backend. Source: owner backlog `docs/config-ui-improvements.md` §3.3 short-term, fed into design 2026-08-24; this packet
is the contract, implementers ignore that file per its banner. Server messages remain flat strings by contract — the
banner renders them verbatim; attaching them to fields is the excluded long-term half (see Out Of Scope).

## Decision Dependencies

None (`API-CONFIG-PUT`'s response shape is consumed as-is; ADR-0014 governs the banner).

## Files Allowed To Modify

- `core/ui-react/src/features/config/useConfigSave.ts` + test, `ConfigShell.tsx` + test, and a new banner component +
  test directly in `core/ui-react/src/features/config/`
- `tests/system/tests/config.spec.ts` — existing dialog-based cases may be rewritten to the banner; nothing else
- The `F-CONFIG-SHELL` record in `../FEATURES.yaml`; the `API-CONFIG-PUT` note in `../APIS.yaml` if its UI-mapping
  sentence changes
- This task packet, `../STATUS.md`, `../GUI-STATUS.md` if its derived row changes

## Out Of Scope

- Structured server validation with field paths (backend contract change — requires a `DECISIONS.md` entry first; the
  decision must settle the response shape, path vocabulary, and compatibility for external API callers; do not start it)
- The restart-required dialog (`useConfigSave.ts:108-120`) and the unsaved-changes dialog — both stay modal (they demand
  an answer, unlike a report); the save-blocked-while-dirty API-help toast; FM-100's panel

## Context To Read

- `useConfigSave.ts` in full (the outcome contract `ConfigSaveOutcome` must survive: errors still mean "rejected" and a
  dirty form; warnings still mean "saved") and `ConfigShell.tsx:94-113`
- `F-CONFIG-SHELL.selectors` in `../FEATURES.yaml` (`config-validation-errors` / `config-validation-warnings` — testids
  this packet explicitly re-homes from dialogs to banners, an authorized selector replacement)
- FM-099's navigation/reveal helper (what a clicked invalid-field entry drives)
- `/core/ui-react/AGENTS.md` *UI Conventions* (ADR-0014)

## Acceptance

- Server rejection: the form stays dirty, nothing resets (unchanged), and an error `Alert` region (keeping testid
  `config-validation-errors`) renders every `errorMessages` entry verbatim plus the "Warning (may be ignored):" lines,
  above the tab body and below the sticky bar so it is visible on every tab. It persists across tab switches, clears on
  the next save attempt, and is dismissible.
- Warnings-only save: the config is saved and the form resets (unchanged); a dismissible warning `Alert` (testid
  `config-validation-warnings`) says the config was already saved, matching the current wording. Success toast and
  restart dialog behavior unchanged; `submit`'s returned outcomes unchanged so the unsaved-changes blocker still works
  (`ConfigShell.tsx:131-133` relies on `"saved"`).
- Client-side rejection: instead of the toast alone, the error banner lists each field from `formState.errors` as
  "<Tab> › <label>: <message>" (label via `C-CONFIG-SETTINGS-INDEX`, raw path fallback), each entry a link that
  navigates/reveals/highlights the field via FM-099's helper. Entries testid `config-invalid-field-<path testid>`.
- A transport failure keeps its toast (`saveFailureMessage`) — a network blip is not config feedback.
- Tests: `useConfigSave` unit tests updated from dialog-mock to banner-state assertions for all four outcomes;
  `config.spec.ts` rewrites the dialog assertions to the banner and adds the click-through from an invalid-field entry
  to its revealed control.
- Registry: `F-CONFIG-SHELL.selectors` updated (re-homed + new ids, with a comment naming this packet as the authority).
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 server-error banner, warnings banner, and
  client-side invalid list; mobile 390x844 if layout differs.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — rewires the save pipeline's user contract across four outcomes without disturbing the blocker's
  reliance on them.
- Reviewer: `opus` — `C-CONFIG-FORM` contract change; must re-derive every outcome path against `ConfigWeb` semantics.
- Fixer: `sonnet` — expected findings are wording/state-clearing details.

Implementer prompt: Start at `useConfigSave.ts`'s outcome mapping and keep `ConfigSaveOutcome` frozen. Trap: the dialogs
were `await`ed, sequencing the restart prompt *after* acknowledgement — banners don't block, so make the restart dialog
still appear after a warnings-only save without racing the reset. Prove first that a rejected save leaves the form dirty
with the banner surviving a tab switch, against a real backend rejection.
Reviewer prompt: Check hardest the blocker interaction (save-from-dialog path returns "saved") and that no error string
is truncated or HTML-interpreted. Distrust rewritten spec assertions — confirm they still assert the same server truths.
