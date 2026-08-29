# FM-131: Custom Mappings Advanced Disclosure

Status: planned Owner:
Feature IDs: F-CONFIG-SEARCHING
Component IDs: C-CONFIG-FIELDS
API IDs: None
Depends on: FM-130
Blocks: None

## Outcome

The last silently-vanishing editable surface joins FM-098's disclosure convention, and the recorded disclosure boundary
becomes accurate. `CustomMappingsSection.tsx:78-80` self-gates with `if (!showAdvanced) return null` and mounts at
`SearchingConfigTab.tsx:268` as a tab-level sibling between two fieldsets — so with the advanced toggle off, a whole
editable section (not prose) disappears with no expander announcing it, exactly the pre-FM-098 behavior the rest of config
no longer has. `COMPONENTS.yaml:374` documents the boundary as "an advanced `HelpBlock`, and an advanced row outside any
fieldset, are the documented boundary" — FM-098's reviewer found this section is a third, undocumented case. After this
task the Searching tab announces the hidden section by name and reveals it in place, the same affordance a wholly-advanced
fieldset already has (`ConfigFieldset.tsx:223-249`), and the `C-CONFIG-FIELDS` note plus `settingsIndex.ts`'s stale
"nothing can gate it behind an advanced expander" comment (722-730) say what is now true. One packet: the reveal behavior,
the index entry, and the registry note are one claim in three places.

## Decision Dependencies

None (ADR-0014 applies; FM-098's disclosure convention is the governing precedent, via `C-CONFIG-FIELDS`).

## Files Allowed To Modify

- `core/ui-react/src/features/config/searching/{CustomMappingsSection.tsx,SearchingConfigTab.tsx}` (+ their test files)
- `core/ui-react/src/features/config/settingsSearch/{settingsIndex.ts,settingsIndexDrift.test.tsx}`
- `tests/system/tests/config-searching.spec.ts`
- `docs/frontend-migration/COMPONENTS.yaml` (`C-CONFIG-FIELDS` note only), `docs/frontend-migration/FEATURES.yaml`
  (`F-CONFIG-SEARCHING` only), this task packet

## Out Of Scope

- Any change to the section's editing behavior, its dialog, or its existing selectors (`FEATURES.yaml:617-627` unchanged)
- Other tabs; `ConfigFieldset` internals beyond what reuse requires (prefer wrapping over reimplementing)
- Settings-search offering/hiding of hits (ADR-0039's separate quickfix); note interactions in the handoff only

## Context To Read

`CustomMappingsSection.tsx` in full; `SearchingConfigTab.tsx:246-300`; `ConfigFieldset.tsx:109-124,208-249` and
`advancedFields.ts` (the disclosure machinery); `settingsIndex.ts:120-128,722-730` and `settingsIndexDrift.test.tsx:419-451`;
`COMPONENTS.yaml:370-374`; `FEATURES.yaml:595-630`; FM-130's declared label-derived testid convention (its packet or the
updated `C-CONFIG-FIELDS` record).

## Acceptance

- Toggle off: the Searching tab renders a named, operable affordance for the hidden Custom mappings section (the
  wholly-advanced-fieldset treatment — "<label> — advanced, hidden" — or behaviorally identical), which reveals the section
  in place. Toggle on: rendering and behavior unchanged from today. Escape/collapse semantics match the existing
  `AdvancedExpander`.
- New label-derived ids follow FM-130's declared convention (spaces preserved, e.g. `config-fieldset-custom mappings` if
  wrapped in a `ConfigFieldset`); every pre-existing custom-mapping selector keeps resolving.
- `settingsIndex.ts`'s section entry reflects the gating (and its 723-725 comment is corrected); the drift test — whose
  advanced check currently runs over rows only, letting sections escape — covers this section's gated state in at least
  one direction, or the handoff explains precisely why it cannot.
- Unit tests: hidden-state affordance present with toggle off; reveal works; section absent claim (`return null` with no
  affordance) observed red against the unfixed code for the new affordance test.
- `COMPONENTS.yaml:374`'s boundary sentence is rewritten to the now-true boundary (HelpBlock and fieldset-less advanced
  *rows* stay hidden outright; no editable section does); `F-CONFIG-SEARCHING` selectors/prose name the new affordance.
- Screenshot strip per Visual Gate: Searching tab with toggle off (affordance visible) and after reveal, 1280x800 and
  390x844.

## Verification

- `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm test -- --run && npm run build && npm run check:api && npm run validate:migration` — all pass
- Root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-searching.spec.ts tests/config.spec.ts` — all pass (`config.spec.ts` unedited; note `config-searching.spec.ts:61`'s advanced-toggle helper gates every test there)
- Root: `git diff --check` clean; changed files match the allowlist

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — the disclosure mechanism exists and is documented; this adopts it for one section with settled
  acceptance criteria.
- Reviewer: `opus` — it changes reveal behavior on a tab and edits a shared component's contract note; reviewer tier at
  least matches, and the drift-test escape needs independent checking.
- Fixer: `sonnet` — expected findings are localized.

Implementer prompt: Start from `ConfigFieldset.tsx:223-249` — the affordance you need already exists; wrapping beats
rebuilding. The trap: the section owns its heading and its `RepeatSection`-adjacent layout, so a naive `ConfigFieldset`
wrap can double the heading. Prove first that toggle-on rendering is pixel-stable before touching the index.
Reviewer prompt: Check hardest that no pre-existing custom-mapping selector or `config-searching.spec.ts` flow broke, and
that the rewritten boundary sentence is exhaustively true — grep for other `useShowAdvanced` self-gates before believing it.
