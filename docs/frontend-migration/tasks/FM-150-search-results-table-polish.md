# FM-150: Results Table Polish — Narrower Age/Size, Icon Expand Controls, Inline Icon Download

Status: planned Owner:
Feature IDs: F-SEARCH-RESULTS, F-SEARCH-GROUP-SELECTION, F-SEARCH-DOWNLOADS
Component IDs: C-RESULT-TABLE, C-DOWNLOAD-ACTIONS
API IDs: None
Depends on: None
Blocks: None

## Outcome

Three owner-requested (2026-08-31) density/alignment changes to the search results table, one packet because all three reshape
the same rows: Age and Size give width to Title; the "Expand group"/"Expand duplicates" text buttons become icon buttons with
title x-alignment preserved across rows; the NZB/Torrent text download button becomes a small icon button on the same line as
the other action icons. Do not run concurrently with FM-153 — both suites exercise `features/search/results`.

## Decision Dependencies

None.

## Files Allowed To Modify

- core/ui-react/src/features/search/results/{SearchResults.tsx,ResultRow.tsx,DownloadActions.tsx}
- core/ui-react/src/features/search/results/*.test.tsx
- core/ui-react/src/app/theme.ts — ONLY if the `control` variant's doc comment (~line 107, "each result row's NZB/Torrent
  link") goes stale; comment text only, no token or override change
- tests/system/tests/results.spec.ts, tests/system/tests/search.spec.ts (assertion updates for the new anatomy only)
- This task packet and docs/frontend-migration/FEATURES.yaml (linked records' selectors/gaps only)

## Out Of Scope

- `DownloadHistoryPage`'s use of `DirectDownloadActions` keeps today's text-button anatomy — give the icon form to the results
  row via an opt-in prop (or equivalent) defaulting to current rendering; `DownloadHistoryPage.test.tsx` passes unedited.
- No column added/removed, no sort/filter/selection behavior change, no `ResultDetailLinks.tsx` change.

## Context To Read

- `SearchResults.tsx:1199-1239` (colgroup + measurement comment), `:1106-1126` (compact-rows density overrides)
- `ResultRow.tsx:232` (title `pl: 2 + nestingLevel * 2`), `:237-296` (expand buttons), `:329-360` (Actions cell)
- `DownloadActions.tsx:439-465` (`DirectDownloadActions`); `ResultDetailLinks.tsx` (the icon-button anatomy to match)
- `/core/ui-react/AGENTS.md` *UI Conventions*; C-DOWNLOAD-ACTIONS and C-RESULT-TABLE in COMPONENTS.yaml

## Acceptance

- Colgroup (owner values, at the comment's 1280x800 basis of 1% ≈ 9px): Age `8%` → `5%` (−27px ≈ the requested 25px), Size
  `9%` → `8%` (−9px ≈ the requested 10px), Title `35%` → `39%`; all other cols and the 40px checkbox col unchanged; sum stays
  100%. The comment block is rewritten to record the 2026-08-31 owner request as the new basis — including that Age's `9999d`
  and Size's `999.99 GB` worst cases no longer fit at these widths (realistic values do); do not silently keep the old
  worst-case rationale.
- Both expand controls are icon-only `IconButton size="small"` with `fontSize="small"` icons (the `ResultDetailLinks.tsx`
  anatomy), keeping `aria-expanded` and accessible names exactly "Expand group"/"Collapse group"/"Expand duplicates"/
  "Collapse duplicates" (tooltips carry the same text) — existing `getByRole("button", {name: ...})` tests in
  `SearchResults.test.tsx` and `results.spec.ts` keep resolving.
- When any rendered row shows either expand control, every row reserves the width of the widest control set any row renders
  (a row can carry both), so title text starts at the same x for rows at the same nesting level whether or not they carry
  controls; the nesting indent stacks on top of that reservation. When no row shows a control, nothing is reserved. Proven by
  a component test asserting the reservation element renders (or not) per these rules, plus the screenshot strip.
- The download control is an `IconButton size="small"` with a `fontSize="small"` download icon on the same single line as the
  `ResultDetailLinks` icons at sm+ (the Actions `Stack` no longer pushes it to its own row); NZB vs Torrent is distinguished
  by tooltip and the existing `Download NZB`/`Download TORRENT` aria-labels; `data-testid` `download-nzb`/`download-torrent`
  stay on the actionable anchor element with the same `href`/`download`/`onClick` semantics.
- Compact-rows density still applies to the new icon buttons (extend the `:1106-1126` descendant overrides if the
  `.MuiButton-root` rules no longer reach them).
- `F-SEARCH-RESULTS`/`F-SEARCH-GROUP-SELECTION` selectors/gaps updated where anatomy notes change; no testid renamed.
- Screenshot strip (Visual Gate): desktop 1280x800 — default table, compact rows, and a result set showing rows with and
  without expand controls (titles aligned) plus an expanded group; mobile 390x844 card layout.

## Verification

- core/ui-react: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run knip`,
  `npm run validate:migration`, `npm run validate:focus-affordances` — all green, lint warnings not increased
- tests/system: `npx playwright test tests/results.spec.ts tests/search.spec.ts` against a real backend — green
- Confirm changed files match `Files Allowed To Modify`; `DownloadHistoryPage.test.tsx` byte-identical and green

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks `review`; a fresh reviewer fills `../templates/review.md`; only the
coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — changes a two-consumer shared component (`DirectDownloadActions`) and an alignment invariant across
  heterogeneous rows; the colgroup comment rework requires judgment, not transcription.
- Reviewer: `opus` — at least the implementer's tier (shared component); must re-derive the x-alignment claim from renders.
- Fixer: `sonnet` — expected findings are selector/registry/px bookkeeping.

Implementer prompt: Start at `ResultRow.tsx:237-296` and the colgroup comment. The trap: `DirectDownloadActions` also renders
on `/history` — the icon form must be opt-in from the results row, not the new default. Prove first, with a rendered mixed
result set, that titles at one nesting level share an x coordinate before polishing anything else.
Reviewer prompt: Distrust the alignment claim until you see a capture with expand-bearing and bare rows side by side; check
the rewritten measurement comment doesn't still assert the old worst-case fits, and that `/history` rendering is untouched.
