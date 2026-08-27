# FM-121: Stats Shell Layout Route And Caching

Status: in_progress Owner:
Feature IDs: F-STATS-SHELL, F-STATS-MAIN
Component IDs: C-APP-SHELL (router wiring only)
API IDs: API-STATS-QUERY
Depends on: None
Blocks: None

## Outcome

Switching stats/history tabs stops remounting the shell and refetching everything. Three parts, one capability:
(1) structural — `router.tsx` renders `StatsShell` separately in seven sibling routes (`:66-71`, `:79-84`, `:92-97`,
`:105-110`, `:137-142`, `:150-152`, and the `:244-246` wrapper), because `StatsShell`
(`features/stats/StatsShell.tsx:12-38`) takes `children`, not an `Outlet` — so the shell and its tab bar unmount and
remount on every tab switch; collapse them into one parent layout route with `<Outlet/>`, mirroring
`features/config/routes.tsx:69-88`. (2) `App.tsx:31` creates `new QueryClient()` with no `defaultOptions`, so
`staleTime` is 0 and every remount refetches; set a sensible default and justify the number in the handoff.
(3) `StatsDashboardPage.tsx` holds `stats`/`status`/`hasLoadedOnce` in `useState` (`:78-80`) fetched from a
`useEffect` (`:130`) and shows a full-page Loading (`:185-187`) on every visit because no cache bridges it; move it
into react-query.

## Decision Dependencies

Owner decision "layout route + caching", made in conversation for this batch (recorded here and in this packet's
design instruction; no separate ADR exists). No other recorded decision governs.

## Files Allowed To Modify

- `core/ui-react/src/router.tsx`, `App.tsx`, `features/stats/StatsShell.tsx` (a new `features/stats/routes.tsx` in
  the config pattern is allowed), `features/stats/dashboard/StatsDashboardPage.tsx`
- Their tests: `router.test.tsx`, `App.test.tsx`, `features/stats/StatsShell.test.tsx`,
  `features/stats/dashboard/StatsDashboardPage.test.tsx`
- Narrow edits to other `useQuery` call sites **only** to pin an explicit per-query option where the new default
  would change semantics that matter (the consumer audit below); no other logic in those files
- `tests/system/tests/stats.spec.ts` — add-only
- The `F-STATS-SHELL` / `F-STATS-MAIN` records in `../FEATURES.yaml`, this task packet, and `../STATUS.md`

## Out Of Scope

- The history pages' first-load spinners as such: `DownloadHistoryPage.tsx:104`, `SearchHistoryPage.tsx:127`,
  `NotificationHistoryPage.tsx:82`, `SavedSearchesPage.tsx:59-67`, `IndexerStatusesPage.tsx:50` all clear themselves
  once parts (1)+(2) keep their caches alive across a tab switch. `placeholderData: keepPreviousData` is already set
  on three of them (`DownloadHistoryPage.tsx:81-86`) for filter keystrokes and cannot help across a remount — do not
  "fix" that; leave their query logic alone.
- Route paths, guards, and defaults: every `/stats/*` URL, `loginGuard(bootstrap, "stats")`, the bare `/stats` alias
  resolving to indexer statuses, and the `stats/$tab` placeholder fallback all behave exactly as today.
- Tab bar markup and selectors; the config routes.

## Context To Read

- `router.tsx:55-160` and `:238-250` (the seven `StatsShell` usages, the `/stats` alias comment at `:131`, the
  `stats/$tab` fallback) and `features/config/routes.tsx:60-90` (the parent-route pattern, TanStack Router).
- `../APIS.yaml` `API-STATS-QUERY` (`:25`) — the dashboard's held `StatsResult` is **merged field-by-field per
  family, never replaced wholesale**, one bad family cannot fail the dashboard, and toggling one family fetches only
  that family (`StatsDashboardPage.tsx:126-134`). The react-query move must preserve all of that.
- The 16 `useQuery` consumers (grep `useQuery(` under `src/`) for the staleTime audit — config's `ConfigShell.tsx`
  and the system tabs (logs, updates, backups, tasks, news, about) included.

## Acceptance

- One parent `/stats` layout route renders `StatsShell` once with `<Outlet/>`; the tab bar's DOM node survives a tab
  switch (assert node identity or absence of remount, red at base). All seven current routes become children; every
  URL, guard, alias, and fallback resolves exactly as before (`router.test.tsx`'s existing cases keep passing with at
  most mechanical updates).
- The `QueryClient` gains a default `staleTime` chosen and justified in the handoff (staleness tolerance of history
  and system data, not a number copied from a tutorial). Within it, revisiting a stats tab renders cached data with
  no spinner and no immediate refetch; a unit test counts fetches across two visits and is shown red at base (two)
  and green after (one).
- The consumer audit is in the handoff: every `useQuery` call site listed with either "default is fine because …" or
  the explicit per-query option pinned here. Refresh affordances and filter-driven refetches keep working.
- The dashboard holds its state in react-query with `API-STATS-QUERY`'s semantics intact: per-family merge (never
  wholesale replace), single-family toggle fetches only that family, malformed-family reporting, and the explicit
  Refresh all behave as today — its existing tests keep proving so — and returning to `/stats/stats` within
  `staleTime` shows content, not `Loading`.
- Red-first/mutation evidence for the central claims (shell survival, single fetch, dashboard merge), per
  `../MAINTENANCE.md`'s green-either-way fixture lesson.
- Screenshot strip per `../README.md` *Visual Gate* only if settled rendering changes; otherwise record that the
  frames are identical and let the red-first tests carry the evidence.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run
  build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` pass; `npm run knip`
  reports only its known pre-existing finding; compare counts against a pristine-base run before claiming a delta.
- The remount and fetch-count tests, run against a pristine base tree, fail; the handoff quotes both runs.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/stats.spec.ts
  tests/search-history.spec.ts tests/downloads.spec.ts tests/notification-history.spec.ts` passes (the last three
  unedited — they prove the history pages against the new routing and cache defaults).
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — cross-module: router topology, an app-wide cache default with sixteen consumers to audit, and
  a stateful dashboard whose merge semantics are a recorded API contract.
- Reviewer: `opus` — at least the implementer's tier; the staleTime default and the dashboard rewrite both change
  behavior a green suite can miss.
- Fixer: `sonnet` — expected findings are audit gaps, test counts, and route-table mechanics.

Implementer prompt: Start from `features/config/routes.tsx` — the layout-route pattern is already in this codebase,
TanStack flavor; do not import react-router idioms. Trap one: the `/stats` alias and `stats/$tab` fallback must keep
resolving (`router.tsx:131`'s comment). Trap two: the dashboard's `StatsResult` merges per family
(`APIS.yaml` API-STATS-QUERY) — a naive `useQuery` that replaces the object wholesale silently breaks family toggles.
Prove the shell remount red first.
Reviewer prompt: Check hardest the dashboard's merge and single-family-toggle behavior against `APIS.yaml`'s note, and
the staleTime audit's claims for config and logs. Distrust the fetch-count test unless its base run is quoted red.
