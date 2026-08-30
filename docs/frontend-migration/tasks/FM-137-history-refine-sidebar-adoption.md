# FM-137: History Refine Sidebar Adoption

Status: planned Owner:
Feature IDs: F-HISTORY-SEARCHES, F-HISTORY-DOWNLOADS, F-HISTORY-NOTIFICATIONS
Component IDs: C-HISTORY-REFINE-BAR, C-REFINE-SURFACE, C-BROWSER-STORAGE
API IDs: None
Depends on: None
Blocks: None

## Outcome

The three history views abandon the horizontal bar and filter through FM-136's docked refine surface, so the app has
one refine concept (ADR-0046). Each page becomes a flex row — the surface as left sibling, then the existing vertical
stack (heading row with its non-filter controls, status/alerts, table). The five `HistoryDimension` kinds render as
the shell's sections; state stays server-side `HistoryFilterValues` via `C-HISTORY-REQUEST`, untouched. The docked
collapsed state persists under one key shared by all three views, `hydra.history.refine`; the sub-768px drawer never
persists. One packet: the pages, the registry truth, and the stale comments are one claim in several places.

## Decision Dependencies

ADR-0046 (`../history-refine-redesign.md`); ADR-0016 (empty selection filters nothing, no select-all/invert);
ADR-0011 (surface never an ancestor of table header cells); ADR-0038 (`TableScrollAffordance` + min-width floors).

## Files Allowed To Modify

- `core/ui-react/src/features/stats/history/{SearchHistoryPage,DownloadHistoryPage,NotificationHistoryPage}.tsx` (+
  their test files)
- `core/ui-react/src/features/stats/history/refine/**` (the bar becomes section renderer + surface wiring; the
  persistence helper lives here, reading storage only through `C-BROWSER-STORAGE`)
- `tests/system/tests/{search-history,downloads,notification-history}.spec.ts`
- `docs/frontend-migration/COMPONENTS.yaml` (`C-HISTORY-REFINE-BAR`; `C-REFINE-SURFACE`/`C-BROWSER-STORAGE` consumers),
  `FEATURES.yaml` (the three F-HISTORY-* records), this task packet, `../STATUS.md`

## Out Of Scope

- `SavedSearchesPage.tsx` (no filter surface today, gets none), stats pages, `SearchResults.tsx`/`RefineSidebar.tsx`,
  `C-HISTORY-REQUEST` (`api/history/filters.ts`, `request.ts`), any backend or filter-semantics change
- Shell-internal changes beyond what adoption strictly requires (contract questions go back through FM-136's record)

## Context To Read

`../history-refine-redesign.md` and ADR-0046; FM-136's shell and packet; `HistoryRefineBar.tsx` in full (the five
section renderers survive; the header/Collapse chrome does not); the three pages' `HistoryRefineBar` mounts and
heading rows; `api/history/filters.ts` (`activeHistoryFilterCount`); `FEATURES.yaml:1194-1216` (the selector family);
the spec files' refine interactions (e.g. `search-history.spec.ts:170-215,320-350` — the toggle-summary and mobile
assertions that must move); `domain/storage/browserStorage.ts`. Sticky offset: nothing sticky sits above the `/stats`
tab body (`AppShell.tsx:128` is `position="static"`, `StatsShell.tsx` pins nothing), so it is 0 — verify.

## Acceptance

- At ≥768px each history page shows the docked 248px column, collapsible to the 48px rail; below 768px a
  `variant="control"` "Refine" button with caret opens the drawer; exactly one branch in the DOM. Chrome geometry is
  FM-136's — no values restated in history files.
- All existing `history-refine-*` section/control ids and behaviors are unchanged (ADR-0016 included); the chrome ids
  keep resolving with parallel semantics — `history-refine-bar` on the surface container in both branches,
  `history-refine-toggle` on the docked collapse control and the compact opener (truthful `aria-expanded`),
  `history-refine-clear-all` in the header. New chrome ids follow the family, recorded in the F-HISTORY-* selectors.
- The active-filter summary ("No active filters" / "1 active filter" / "N active filters") renders in the shell's
  header summary slot — reachable expanded and rail-collapsed — and on the compact "Refine" toggle. The results
  sidebar gains no count (its files are out of scope).
- Collapsing the docked column on one history view leaves it collapsed on the others and across reload
  (`hydra.history.refine` via `readItem`/`writeItem`; absent or garbage payload defaults expanded), proven by a test
  spanning two pages. Drawer open state is never written to storage, proven by a test.
- No horizontal page scroll at 1280px or 390px; tables still scroll inside their `TableScrollAffordance` scrollers;
  the surface is a flex sibling of the table, never an ancestor of its header cells.
- `C-HISTORY-REFINE-BAR`'s responsibility is rewritten: chrome via `C-REFINE-SURFACE`; the retained rationale covers
  only state/options (server-side filtering, declared-not-derived options). The stale `HistoryRefineBar.tsx` comments
  die with the chrome: "deliberately shares no code" (superseded by ADR-0046) and the `:54-55` storage-key note, whose
  cited MAINTENANCE.md candidate FM-087 already discharged 2026-08-23 — no MAINTENANCE.md edit needed.
  `C-REFINE-SURFACE` and `C-BROWSER-STORAGE` gain the three F-HISTORY-* consumers.
- Spec updates preserve assertion strength: the "2 active filters" assertion targets where the summary now renders;
  mobile flows open the drawer before filling filters; the request-body proofs (filterModel round trips) stay intact.
- Screenshot strip per Visual Gate: each page expanded and rail-collapsed at 1280x800; drawer closed/open at 390x844
  for at least one page.

## Verification

- `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm test -- --run && npm run build &&
  npm run check:api && npm run knip && npm run validate:migration && npm run validate:focus-affordances` — all pass
- Root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search-history.spec.ts tests/downloads.spec.ts
  tests/notification-history.spec.ts` — all pass; `git diff --check` clean; changed files match the allowlist

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — cross-module adoption over three pages plus a registry-contract rewrite, persistence, and
  real-backend spec surgery whose assertions must move without weakening.
- Reviewer: `opus` — a shared component's consumer set and a recorded contract change; check the test-id claim against
  all 21 spec usages, not the handoff's summary.
- Fixer: `opus` — likely findings mix spec semantics and layout; judgment, not mechanics.

Implementer prompt: Start from `HistoryRefineBar.tsx`'s five section renderers — they survive nearly verbatim; only the
`Paper`/`Collapse`/grid chrome and the `gridColumn` spans (meaningless in one 248px column) go. Trap: mobile specs reach
filters directly today; they must open the drawer first, and `search-history.spec.ts:207`'s summary assertion no longer
holds against the desktop toggle. Prove shared-collapse persistence across two pages first — the only new state.
Reviewer prompt: Check hardest that no filterModel request-body assertion was weakened and ADR-0016 still holds; grep
the spec files and FEATURES lists yourself for selector survival. Confirm no history file restates FM-136's chrome values.
