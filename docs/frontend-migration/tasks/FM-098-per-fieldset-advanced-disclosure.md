# FM-098: Per-Fieldset Advanced Disclosure

Status: ready Owner:
Feature IDs: F-CONFIG-MAIN, F-CONFIG-SHELL
Component IDs: C-CONFIG-FIELDS
API IDs: None
Depends on: None
Blocks: FM-099

## Outcome

Hidden advanced settings become discoverable: with the global advanced toggle off, a fieldset containing advanced rows no
longer drops them silently — it renders a "N advanced settings hidden" expander that reveals them for that fieldset; each
advanced row carries a small inline "Advanced" chip so revealed rows are tellable from ordinary ones. The global toggle
keeps its exact semantics (all advanced shown everywhere) — the owner's stated first preference among the options in
`docs/config-ui-improvements.md` §1.4, fed into design 2026-08-24; this packet is the contract, implementers ignore that
file per its banner. Scope is `C-CONFIG-FIELDS` only, so all eight tabs inherit it. The preference stays in
`localStorage` — persisting it server-side needs a decision entry first and is deliberately excluded.

## Decision Dependencies

None (ADR-0014 governs; the localStorage mechanism of `advancedFields.ts` is unchanged).

## Files Allowed To Modify

- In `core/ui-react/src/features/config/components/`: `ConfigFieldset.tsx`, `SettingRow.tsx`, `HelpBlock.tsx`,
  `settings.ts`, `RepeatSection.tsx` (only if its rows gate on advanced), `configFields.test.tsx`, new files for the
  disclosure context + tests
- `core/ui-react/src/features/config/advancedFields.ts` + test
- `tests/system/tests/config-main.spec.ts` — add cases; existing cases stay green
- The `C-CONFIG-FIELDS` record in `../COMPONENTS.yaml`; the `F-CONFIG-MAIN` record in `../FEATURES.yaml`
- This task packet, `../STATUS.md`, `../GUI-STATUS.md` if its derived row changes

## Out Of Scope

- The global toggle's placement and storage key (`SHOW_ADVANCED_STORAGE_KEY`), settled by FM-097
- Server-side persistence of any preference (`GenericStorageWeb` — needs a `DECISIONS.md` entry first; not this task)
- Tab bodies: no `*ConfigTab.tsx` may need edits — if one does, the mechanism is wrong; escalate

## Context To Read

- `SettingRow.tsx:48-51` and `ConfigFieldset.tsx:23-26` (the two `return null` gates being replaced),
  `advancedFields.ts` (context + storage), `SettingRow.tsx:27-29` (why unmounting hidden rows is safe:
  `shouldUnregister: false` — the disclosure must keep that property)
- `CategoriesConfigTab.tsx:77-90` (an *advanced fieldset* and an advanced `HelpBlock` — both whole-block advanced, not
  rows-in-a-fieldset) and `MainConfigTab.tsx` (the densest mix of advanced rows)
- `/core/ui-react/AGENTS.md` *UI Conventions* (ADR-0014)

## Acceptance

- Global toggle on: everything renders exactly as today; no expander appears anywhere.
- Global toggle off: a fieldset whose children include advanced rows renders its non-advanced rows plus one expander
  (`config-advanced-expander-<fieldset testid suffix>`) reading "N advanced settings hidden" with the true count;
  expanding reveals those rows in place (collapse reverses it); expansion state is per-fieldset component state, not
  persisted. The count comes from advanced rows registering in a fieldset-provided context — a hidden `SettingRow` stays
  mounted (rendering nothing) so registration and the form value both survive, preserving the `shouldUnregister: false`
  invariant.
- A fieldset that is *itself* advanced (`ConfigFieldset advanced`, e.g. Categories) renders as a collapsed expander
  titled with its label ("Categories — advanced, hidden"), same selector scheme, instead of vanishing. An advanced
  `HelpBlock` or advanced row outside any fieldset keeps today's behavior (hidden entirely) — a documented boundary, not
  a gap.
- Every advanced row renders a small "Advanced" `Chip` beside its control whenever visible (toggle on or revealed);
  `SettingRow`'s existing anatomy (help, error, tooltip, testids) is otherwise unchanged.
- Tests: `configFields.test.tsx` covers count correctness, reveal/collapse, the advanced-fieldset case, value survival
  across hide/reveal, and chip presence; `config-main.spec.ts` adds: toggle off → Hosting shows an expander → expand →
  an advanced field is editable and its edit survives collapse and save.
- Selectors recorded on `F-CONFIG-MAIN` (scheme note) and the `C-CONFIG-FIELDS` responsibility updated. ADR-0014: stock
  MUI disclosure (`Collapse`/`Button`), no design literals.
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 of Main with toggle off — collapsed expanders —
  and one fieldset expanded showing chips; mobile 390x844 if layout differs.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-main.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — changes the shared field vocabulary's hiding contract, whose form-registration invariant is easy
  to break invisibly.
- Reviewer: `opus` — shared-component change; must reason about all eight consuming tabs, not the tested two.
- Fixer: `opus` — same invariant territory.

Implementer prompt: Start at `SettingRow.tsx:48-51` and `ConfigFieldset.tsx:23-26`. Trap: registration via effect in a
component that returns null still runs — but conditional rows (`useWatch`-gated, e.g. Apprise URL) unmount entirely, so
counts must tolerate churn; never memoize the count across renders. Prove first that a value edited in a revealed row
survives collapse → tab switch → save, in the real app.
Reviewer prompt: Check hardest that no tab file needed edits and that toggle-on rendering is pixel-identical (diff the
strip against a pre-change capture). Distrust the count logic in jsdom alone — verify against Main's real fieldsets.
