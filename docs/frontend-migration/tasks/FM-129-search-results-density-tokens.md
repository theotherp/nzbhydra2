# FM-129: Search-Results Density Tokens

Status: planned Owner:
Feature IDs: F-SEARCH-RESULTS, F-SEARCH-DOWNLOADS
Component IDs: None
API IDs: None
Depends on: FM-128
Blocks: None

## Outcome

The search-results feature stops carrying its design in raw px strings — the FM-039..FM-046 mock transliteration that
`core/ui-react/AGENTS.md` forbids ("Density via the theme, not per-instance font sizes/paddings"; "Never copy a mock's
inline CSS into `sx`"). Inventory (2026-08-29): 59 simple px-string literals plus 16 composite across `RefineSidebar.tsx`
(19), `SearchResults.tsx` (14), `ResultsPopovers.tsx` (11), `filterControls.tsx` (8), `SelectionMenu.tsx` (4),
`DownloadActions.tsx` (3). Of these, 31 sit in spacing-scale props (`px: "9px"`, `py: "7px"`, `mb: "9px"`, `gap: "6px"`,
`mx: "4px"`, ...) where MUI expects theme spacing units — a px string bypasses the 8px scale entirely; 21 are `fontSize`
literals over seven distinct values (`10.5px`, `11px`, `11.5px`, `12px`, `12.5px`, `13px`, `18px`), several restating the
theme's own `refineSurfaceLabel` (12px/0.7px) and `refineSectionLabel` (11px/0.6px) variants verbatim, and
`RefineSidebar.tsx:47` redeclares `theme.ts:250`'s `refineSectionGap = "22px"` as a local `SECTION_GAP`. One packet: the
port is a token question spanning six modules and `theme.ts`, and it changes rendering, so it carries one screenshot pass.

## Decision Dependencies

ADR-0014 (tokens and density live in `theme.ts`; deviating from the mock's pixels needs no justification), ADR-0015.

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/{RefineSidebar,SearchResults,filterControls,SelectionMenu,ResultsPopovers,DownloadActions}.tsx` (+ their test files where style-coupled)
- `core/ui-react/src/app/theme.ts`
- This task packet

## Out Of Scope

- Any behavior, `data-testid`, markup-structure, or copy change; any file outside the six plus `theme.ts`
- The composite border/shadow one-offs with site justifications (e.g. `SearchResults.tsx:1147`, `SelectionMenu.tsx:37`) —
  in scope only where a theme token already expresses them; do not invent tokens for single-use borders
- The unannotated-magnitude validation gate (a separate ledger candidate; this task unblocks it, does not build it)

## Context To Read

`core/ui-react/AGENTS.md:28-56` (*UI Conventions*); `theme.ts:539-565` (typography variants, `refineSectionGap:250`,
`controlHeight:192`, `controlFontSize:223`); the per-site inventory above (re-grep at start — FM-128 may have touched these
files); `SearchResults.tsx:100-106` (the local-constants rationale that partially survives); ADR-0014 in `DECISIONS.md`.

## Acceptance

- Zero quoted px literals remain in spacing-scale props across the six files:
  `grep -RnE '\b(gap|rowGap|columnGap|p|px|py|pl|pr|pt|pb|m|mx|my|ml|mr|mt|mb):\s*"[0-9.]+px"' src/features/search/results/`
  returns nothing. Values move to theme spacing units; snapping an odd value to the nearest 0.25 step (2px) is sanctioned —
  each snap is listed per-site in the handoff and judged by the strip.
- `fontSize`/`letterSpacing` literals that restate `refineSurfaceLabel`/`refineSectionLabel` consume the variant instead;
  the remaining repeated type roles (13px control/menu text is the largest, 8+ sites) become named `theme.ts` typography
  entries or exported constants consumed by name. A one-off genuinely local size may stay only as a named local constant
  with a justification comment, never an inline quoted literal — state the survivors and why in the handoff.
- `RefineSidebar.tsx` imports `refineSectionGap` instead of redeclaring `SECTION_GAP`.
- Rendering is equivalent or deliberately-and-listed different: before/after screenshot strip at 1280x800 and 390x844 of
  the results view (populated table, refine sidebar expanded, display popover open, selection bar visible) — the owner
  judges the deltas; nothing else moves.
- No `data-testid` or DOM-structure diff (assert via the unit suite passing unedited except style-coupled cases, named in
  the handoff).

## Verification

- `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm test -- --run && npm run build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` — all pass
- `core/ui-react`: the spacing-prop grep above returns zero matches
- Root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts tests/search.spec.ts` — all pass (both suites carry geometry assertions over these surfaces)
- Root: `git diff --check` clean; changed files match the allowlist

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a token-design question across six modules and the theme, not a mechanical rewrite; which values
  merge into one role is judgment the acceptance deliberately leaves open.
- Reviewer: `opus` — `theme.ts` is app-wide shared surface; reviewer tier must not be below the implementer's.
- Fixer: `sonnet` — post-verdict corrections are localized value fixes.

Implementer prompt: Re-run the inventory grep first — FM-128 lands before you. The trap: a new theme typography variant
leaks app-wide via `styleOverrides` ordering; prove `theme.ts` additions change nothing outside `features/search/results`
before capturing the strip. Snap spacing to the scale; do not chase pixel identity the mock never earned.
Reviewer prompt: Check hardest for app-wide bleed from `theme.ts` and for silently changed geometry the strip does not
show (compare the two system specs' geometry assertions at base and head). Distrust "equivalent" claims without the strip.
