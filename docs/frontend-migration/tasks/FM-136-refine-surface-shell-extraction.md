# FM-136: Refine Surface Shell Extraction

Status: planned Owner:
Feature IDs: F-SEARCH-SORT-FILTER
Component IDs: C-REFINE-SURFACE (new), C-HISTORY-REFINE-BAR (unchanged this task)
API IDs: None
Depends on: None
Blocks: FM-137

## Outcome

ADR-0046's shared refine-surface chrome exists as one component, and the results page consumes it at strict parity. The
docked/rail/drawer switching, header row, widths, paddings, and stickiness currently authored inside
`RefineSidebar.tsx` move to a new shell in `core/ui-react/src/components/refine/` (registered `C-REFINE-SURFACE`,
`classification: shared_hydra`), which takes its sections, clear-all wiring, an optional sticky offset, an optional
header summary slot, and per-consumer test ids / accessible labels as props and owns no filter state.
`RefineSidebar.tsx` keeps `ResultFilters`, its quick filters, collapsible category/indexer lists, and the measured
`toolbarHeight` coupling, and hands only the chrome to the shell. Extraction and parity are one task: the shell's
contract is only proven right by its first consumer rendering identically.

## Decision Dependencies

ADR-0046 (accepted 2026-08-29; full design `../history-refine-redesign.md`). Also binding: ADR-0011 (sidebar is a flex
sibling, never an ancestor of table header cells), ADR-0014 (theme tokens; no per-feature style files).

## Files Allowed To Modify

- `core/ui-react/src/components/refine/**` (new: shell component + its test)
- `core/ui-react/src/features/search/results/{RefineSidebar.tsx,RefineSidebar.test.tsx}`
- `core/ui-react/src/features/search/results/{SearchResults.tsx,SearchResults.test.tsx}` (import paths/comments only —
  zero behavioral or rendered-output diff)
- `docs/frontend-migration/COMPONENTS.yaml` (new `C-REFINE-SURFACE` record only), this task packet, `../STATUS.md`

## Out Of Scope

- Any visible change, test-id change, or filter-behavior change on the results page (strict parity per ADR-0046)
- The history views, `HistoryRefineBar.tsx`, `C-HISTORY-REFINE-BAR`'s record, and the `hydra.history.refine`
  persistence — all FM-137
- New theme tokens (`refineSurfaceLabel`/`refineSectionLabel`/`refineChip`/`refineSectionGap` already cover the chrome)

## Context To Read

`../history-refine-redesign.md` and ADR-0046; `RefineSidebar.tsx` in full (FM-129 padding note :41-53,
`useCompactRefineSurface` rationale :62-89, FM-055 sticky/scroll comment :439-467); `SearchResults.tsx:39,258` — the
hook's only external consumer; `EXPANDED_WIDTH`/`COLLAPSED_WIDTH` are module-local despite `RefineSidebar.tsx:55-58`'s
stale "Exported so..." comment, which this extraction corrects; `app/theme.ts:266-273`; `COMPONENTS.yaml:301-315`
(`C-HISTORY-REFINE-BAR`, the future consumer the prop surface must not preclude: header summary slot, sticky offset,
own test ids); FM-110's outerHTML parity-probe precedent (`STATUS.md`); `core/ui-react/AGENTS.md` UI Conventions.

## Acceptance

- The shell states the chrome once, with today's exact values: expanded column 248px / collapsed rail 48px; padding
  `{pb: 5, pt: 2.25, px: 2}` expanded, `{pb: 2.25, pt: 2.25, px: 1}` collapsed; `width 150ms ease-in-out, padding
  150ms ease-in-out` transition; drawer width `min(280px, 88vw)` (248 + 32); branch switch at
  `theme.breakpoints.down(768)` via `useCompactRefineSurface`, which moves into the shell module (a re-export may keep
  `SearchResults.tsx`'s import path alive). Exactly one branch (docked or drawer) exists in the DOM at a time.
- The shell owns no filter state and imports nothing from `features/`; sections, clear-all, summary, sticky offset,
  labels, and test ids arrive as props. Its own focused unit test covers branch switching, the one-branch-in-DOM rule,
  collapsed-rail header (toggle only, no label), and the sticky-offset prop reaching `top`/`maxHeight`.
- Parity is proven, not asserted: an FM-110-style probe captures the rendered `refine-sidebar` `outerHTML` for the
  docked expanded, docked collapsed, and drawer branches at baseline and after the refactor, and diffs byte-identical
  (emotion class hashes included). `RefineSidebar.test.tsx` passes with no assertion weakened.
- All existing selectors resolve unchanged (`refine-sidebar`, `-toggle`, `-drawer`, `-close`, `refine-clear-all`,
  every `refine-*` section id); `F-SEARCH-SORT-FILTER` needs no edit. `COMPONENTS.yaml` gains `C-REFINE-SURFACE`
  (`shared_hydra`, target `core/ui-react/src/components/refine`, consumers `F-SEARCH-SORT-FILTER`; responsibility
  names chrome-only ownership and the domain-owned-state boundary).
- Screenshot strip per Visual Gate showing the results refine sidebar unchanged: expanded and collapsed at 1280x800,
  drawer open at 390x844.

## Verification

- `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm test -- --run && npm run build &&
  npm run check:api && npm run knip && npm run validate:migration && npm run validate:focus-affordances` — all pass
- Root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts tests/results.spec.ts` — all pass
  with both spec files unedited (that they need no edit is itself parity evidence)
- Root: `git diff --check` clean; changed files match the allowlist

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a new shared abstraction plus a byte-parity refactor; the prop surface must serve a consumer
  (history) that does not exist yet.
- Reviewer: `opus` — shared-component introduction; the parity probe needs independent reproduction.
- Fixer: `opus` — parity findings are rarely mechanical; a wrong fix ships a visible results-page change.

Implementer prompt: Start from `RefineSidebar.tsx:433-501` (the docked branch); move comments with the code they
explain — FM-055's sticky rationale and FM-129's padding note survive where the values now live. Trap: `EXPANDED_WIDTH`'s
doc comment claims an export/consumer relationship that no longer exists. Prove the outerHTML parity probe green first.
Reviewer prompt: Rerun the parity probe from baseline yourself (`git show` into a scratch render). Check hardest that the
shell imports nothing from `features/` and no prop default changed a rendered attribute, `aria-*` included. Distrust
"tests pass" as parity evidence; the probe is the evidence.
