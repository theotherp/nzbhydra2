# FM-054: Results Area Token-Fidelity Cleanup

Status: planned Owner:
Feature IDs: F-SEARCH-RESULTS, F-SEARCH-SORT-FILTER, F-SEARCH-GROUP-SELECTION, F-SEARCH-DOWNLOADS, F-SEARCH-RECENT
Component IDs: C-RESULT-TABLE, C-DOWNLOAD-ACTIONS
API IDs: None
Depends on: None
Blocks: None

## Outcome

The search results area follows ADR-0014: no color/font/radius literals in feature code, no restyled component internals, no
per-feature style-token files. Behavior, `data-testid` values, and the rendered design language (dark surfaces, hairlines, teal
accents, density) are unchanged in substance — only where the values come from changes. This is one task because the files share
one style vocabulary; splitting per file would re-audit the same tokens repeatedly.

## Decision Dependencies

ADR-0014, ADR-0015 (`../DECISIONS.md`).

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/**` and `core/ui-react/src/features/search/history/RecentSearches.tsx`
- `core/ui-react/src/app/theme.ts` and `core/ui-react/src/app/theme.test.ts` (only to add shared tokens/overrides a second
  consumer genuinely needs — extend `palette.surfaces` or a component override rather than inventing new local constants)
- `core/ui-react/scripts/validate-focus-affordances.mjs` (only to REMOVE entries from `pendingFm054Cleanup` as files are
  cleaned; the set must be empty when this task completes)
- Component tests for the touched files; `tests/system/tests/results.spec.ts` only if a selector's computed-style assertion
  pins a literal this cleanup moves into the theme
- This task packet

## Out Of Scope

- Any behavior, `data-testid`, ordering, or capability change; any new decision entry
- The search workspace (already converted), the shell, and all non-search routes

## Context To Read

- `/core/ui-react/AGENTS.md` *UI Conventions* and `SearchWorkspace.tsx` as the reference conversion
- `refineStyles.ts`, `toolbarStyles.ts`, `displayStyles.ts`, `filterControls.tsx`, `DownloadActions.tsx`,
  `RefineSidebar.tsx`, `SearchResults.tsx`, `RecentSearches.tsx`

## Acceptance

- `refineStyles.ts`, `toolbarStyles.ts`, `displayStyles.ts` are deleted; their consumers use theme tokens or stock components.
- No `#hex`/`rgba()`/`oklch()`/font-family/bespoke-radius literals remain in the allowed feature files;
  `pendingFm054Cleanup` in `validate-focus-affordances.mjs` is empty and the guard passes.
- Local `.MuiOutlinedInput-notchedOutline` recolors are removed (the theme's hairline default now covers them); no
  suppression of any input border is introduced (ADR-0015).
- Selects and text inputs in the touched files are stock `TextField`/`TextField select` (labels visible where the control has
  room; `aria-label` retained otherwise); `Menu`s take their surface from the theme.
- All existing component tests pass unweakened; `npm run test`, `typecheck`, `lint`, `format:check`, `build`,
  `validate:migration`, `validate:focus-affordances` pass in `core/ui-react`.
- A screenshot strip of the results toolbar, refine sidebar (docked + mobile drawer), download actions row, display-options
  popover, and recent-searches menu at desktop 1280x800 (plus mobile 390x844 where layout differs), referenced in the handoff.
- Real-backend `tests/system` run: `results.spec.ts`, `search.spec.ts`, and `focus-indication.spec.ts` pass in full.

## Verification

- `core/ui-react`: the command list above, each recorded with its result.
- `tests/system`: `npx tsc --noEmit`; the three spec files above against the real backend (see the bring-up recipe in the
  FM-053-era handoffs or ask the coordinator).
- Confirm changed files match the allowlist and no stray generated files remain.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`
(checking the UI conventions and actually looking at the screenshots); the coordinator marks `done` and deletes this packet.
