# FM-089: Refine Section Collapse Persistence

Status: planned Owner:
Feature IDs: F-SEARCH-SORT-FILTER Component IDs: None API IDs: None Depends on: None Blocks: None

## Outcome

The refine sidebar's Category and Indexer sections remember their expand/collapse state across page reloads. Today
`categoryOpen`/`indexerOpen` are plain `useState(true)` in `RefineSidebar.tsx` and always reset to expanded; the owner
asked for persistence (2026-08-23, `../MAINTENANCE.md` Open candidates). The two booleans join the *existing*
`hydra.search-results.table` localStorage payload (`StoredChoices` in `SearchResults.tsx`), which already persists this
same sidebar's `sidebarCollapsed` — no second storage key or mechanism is invented. Decision source: `F-SEARCH-SORT-FILTER`
is named "…and persisted choices" and `SearchResults.tsx`'s `StoredChoices`/`loadChoices`/`getStorage` pattern (FM-045
lineage) already governs exactly this surface's persisted preferences.

## Decision Dependencies

None (the storage mechanism is settled by the existing `StoredChoices` pattern; ADR-0009 governs the sidebar itself).

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/RefineSidebar.tsx`, `core/ui-react/src/features/search/results/SearchResults.tsx`
- `core/ui-react/src/features/search/results/RefineSidebar.test.tsx`, `core/ui-react/src/features/search/results/SearchResults.test.tsx`
- `tests/system/tests/results.spec.ts` — only to add a reload-persistence case; existing cases stay untouched
- The `F-SEARCH-SORT-FILTER` record in `../FEATURES.yaml`
- This task packet and `../STATUS.md`

## Out Of Scope

- A new storage key, a cookie mechanism, or any shared persistence utility — the state folds into `hydra.search-results.table`
- The drawer's `refineDrawerOpen` (deliberately transient — see its rationale comment in `SearchResults.tsx`) and the
  persisted `sidebarCollapsed` semantics; `filterControls.tsx` (FM-088's file); any rendering/layout change
- Search-scoped filter semantics (`SearchScopedFilter` handling stays as-is)

## Context To Read

- `SearchResults.tsx`: `STORAGE_KEY`, `StoredChoices`, `loadChoices()` (guarded parse), the `useEffect` writer, `getStorage()`,
  and how `sidebarCollapsed` initializes from `choices` — the pattern to copy exactly
- `RefineSidebar.tsx`: `categoryOpen`/`indexerOpen`, `RefineCollapsibleList`, and the prop-lifting precedent in the
  `drawerOpen`/`collapsed` prop docs (state owned by `SearchResults.tsx`, sidebar stays presentational)
- FM-087's precedent for guarded single-preference persistence (`nzbhydra.search.advancedOpen`) — context only; this task
  uses the blob because the blob already owns this surface

## Acceptance

- `categoryOpen`/`indexerOpen` ownership lifts to `SearchResults.tsx` (matching `sidebarCollapsed`/`drawerOpen`'s lifts) and
  is passed to `RefineSidebar` as props; `RefineSidebar` keeps no `useState` for them.
- Both booleans initialize from `loadChoices()` with default `true` (today's behavior) when absent, malformed, or when
  storage is unavailable; they are written through the existing single `useEffect` writer into the same `StoredChoices`
  payload (new optional keys, names consistent with the existing ones, e.g. `refineCategoryOpen`/`refineIndexerOpen`).
- A payload written by the previous shape (without the new keys) still loads cleanly — proven by a test feeding the old
  JSON through `loadChoices`.
- The preference applies to both refine branches (docked column and below-768px drawer), since both render the same
  `sections` — proven for the docked branch by component test; the drawer branch needs no separate persistence test.
- Component tests: collapse Category, unmount/remount (fresh `SearchResults` over the same storage), section stays
  collapsed while Indexer stays expanded; blocked-storage fallback renders both expanded without throwing.
- System test: collapse one section, `page.reload()`, re-run the search, assert the section's toggle has
  `aria-expanded="false"` and the other `"true"`.
- No visual change in any state already capturable — no Visual Gate strip required unless layout is touched (it must not be).

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts` passes in full,
  including the new reload-persistence case.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — mechanical adoption of the `sidebarCollapsed` persistence pattern demonstrated in the same file,
  with acceptance criteria settling key names, defaults, and ownership.
- Reviewer: `sonnet` — the `StoredChoices` shape change is prescribed and backward-compatibility is pinned by a test.
- Fixer: `sonnet` — expected findings are test-mechanical.

Implementer prompt: Start at `SearchResults.tsx`'s `StoredChoices`/`loadChoices`/writer trio and copy that shape exactly.
Trap: the writer `useEffect`'s dependency array must gain the two new values or a toggle right before navigation is lost;
also don't conflate these with the transient `refineDrawerOpen`, whose comment explains why it must stay unpersisted.
Prove first that an old-shape stored payload still loads with both sections defaulting to expanded.
Reviewer prompt: Check hardest that ownership actually moved (no residual `useState` in `RefineSidebar.tsx`) and that the
writer's dependency list covers the new keys. Distrust a green system test that never re-runs a search after reload — the
sidebar only renders with results present.
