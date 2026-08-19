# FM-056: Shared History Refine Bar (Download History Adoption)

Status: planned Owner:
Feature IDs: F-HISTORY-DOWNLOADS Component IDs: C-HISTORY-REFINE-BAR, C-HISTORY-REQUEST API IDs: API-HISTORY-DOWNLOADS Depends on: None Blocks: FM-057, FM-023

## Outcome

Stats users refine download history through one refine bar above the table instead of the per-dimension control row, and the route's requests go through a shared history request/response wrapper serving every `HistoryWeb` endpoint. Surface and
transport ship together because the bar's dimension vocabulary *is* the wrapper's filter-model vocabulary; proving both against one live route is what makes FM-057 and FM-023 adoptions rather than redesigns.

## Boundary Rationale

The shared component, the shared wrapper, and their first consumer are one reviewable capability: a shared abstraction with no consumer cannot be reviewed, and a second route adopting it (FM-057) is an independent user capability with its own
filter vocabulary, tests, and evidence. `RefineSidebar.tsx` is deliberately not reused (see Out Of Scope).

## Decision Dependencies

- Accepted: ADR-0002, ADR-0003, ADR-0004, ADR-0009 (refine surface as the sole filter surface), ADR-0014, ADR-0015, ADR-0016 (multi-select semantics).
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/stats/history/refine/**` (new), `core/ui-react/src/features/stats/history/DownloadHistoryPage.tsx`, `core/ui-react/src/features/stats/history/DownloadHistoryPage.test.tsx`
- `core/ui-react/src/api/history/**`; `tests/system/tests/downloads.spec.ts`
- `core/ui-react/src/app/theme.ts`, only to add the tokens/component defaults the bar consumes (ADR-0014: no literals in feature code)
- The `F-HISTORY-DOWNLOADS`, `C-HISTORY-REFINE-BAR`, `C-HISTORY-REQUEST`, and `API-HISTORY-DOWNLOADS` records only
- `docs/frontend-migration/MAINTENANCE.md`, only to strike the discharged `isBoolean: false` open candidate
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Editing, extracting from, or re-pointing `core/ui-react/src/features/search/results/RefineSidebar.tsx`, `filterControls.tsx`, or `C-RESULT-TABLE`: the history bar matches that surface's token and structure language through `theme.ts`, it does not
  share its code. Its state (`ResultFilters`, results-derived options, client-side filtering, the FM-055 sticky-toolbar offset, ADR-0011 constraints) has no counterpart in server-side history filtering.
- Persisting the bar's collapsed state or any filter in storage or the URL (needs the storage-key decision recorded under `MAINTENANCE.md` *Open candidates*), sorting/paging semantics, new filter dimensions, or backend changes.

## Context To Read

- `README.md` *Visual Gate*, `/core/ui-react/AGENTS.md` *UI Conventions*, ADR-0009/0014/0015/0016, and the listed registry records
- `org.nzbhydra.historystats.History` (the five filter kinds: `freetext`, `checkboxes`, `boolean`, `numberRange`, `time`), `HistoryWeb`, `HistoryRequest`, `FilterDefinition`, and `MAINTENANCE.md`'s `1fd40c659` entry
- `core/ui-src/html/states/download-history.html` (legacy per-column filter vocabulary), `download-history-controller.js` (indexer/status option lists) and `dataTableDirectives.js`
- `core/ui-react/src/features/search/results/RefineSidebar.tsx` as the token/structure reference only; `src/api/history/downloads.ts`; `src/api/searchHistory.ts` (the second builder FM-057 folds in); `src/bootstrap.ts`; `src/app/theme.ts`

## Acceptance

- `/stats/downloads` renders exactly one filter surface: a labelled refine bar above the table, collapsible via a control that states how many filters are active. No filter control remains in or above the table header. Collapse state is
  component-local.
- The bar exposes every dimension the route ships today with its current accessible label — After, Before, Indexer, Title, Result, Source, Minimum age (days), Maximum age (days), Username, IP address — with username/IP still gated on
  `logging.historyUserInfoType`.
- `Result` (legacy `checkboxes-filter column="status"`) and `Indexer` (legacy `column="name"`) are multi-select `checkboxes` dimensions on those columns — indexer's current freetext contains-match (`downloads.ts` `text("name", …)`) goes away;
  every other dimension keeps its current kind and server column. Indexer options are the configured indexer names from `bootstrap.safeConfig.indexers[].name` (the page already receives `bootstrap`), sorted case-insensitively and not filtered
  by `showOnSearch`/category — legacy builds `indexersForFiltering` the same way (`download-history-controller.js:21-24`), so no new endpoint and no new `APIS.yaml` record is introduced.
- Multi-select semantics (ADR-0016) are stated once here as `C-HISTORY-REFINE-BAR`'s contract and inherited by FM-057/FM-023 rather than restated: nothing is selected initially; an empty selection means no filter (all entries show) and
  contributes no `filterModel` entry at all — never a value list enumerating every option; selecting values narrows to exactly those; there is no preselect-all state and no invert control.
- The component's public API is the five `History.java` filter kinds, not a per-route control list, so FM-023 can declare event types (multi-select) and a time range without changing it.
- Controls are stock MUI with visible labels; feature code carries no color, font-family, or radius literal. The bar matches the search refine surface's language (`RefineSidebar.tsx` post-FM-054) through `theme.ts`: section label 11px/600/`0.6px`
  letter-spacing uppercase in `palette.surfaces.mutedText`; surface header label 12px/600/`0.7px` uppercase in `text.secondary`; `22px` between sections; selection chips at `pillRadius` (7) in `monoFontFamily` 12px, active state background
  `alpha(primary.main, 0.16)`, border `alpha(primary.main, 0.45)`, text `primary.light`.
- `C-HISTORY-REQUEST` builds the whole `HistoryRequest` body (`page`, `limit`, `filterModel`, `sortModel`, `distinct`, `onlyCurrentUser`) from declared dimensions and validates the paged envelope (`content` array, integer `totalElements`,
  per-entry validation with a `malformedCount`). It sends no `isBoolean` property (boxed and unread since `1fd40c659`); the padding disappears from `downloads.ts` and its `MAINTENANCE.md` candidate is struck.
- Parity holds: any filter change returns to page 1, `Clear all` empties every dimension and returns to page 1, refresh/paging, sorting, entry rendering, and `download-history-refresh|table|row|indexer|status` are unchanged; new bar controls
  carry `data-testid`s recorded in `F-HISTORY-DOWNLOADS`.
- Tests: per-kind request-building and envelope-validation unit tests, including that an empty multi-select emits no `filterModel` entry and a selection emits exactly the chosen values; component tests for each control kind, clear-all, active
  count, page reset, and gated username/IP; `downloads.spec.ts` filters through the bar against the real backend and asserts a successful (non-400) filtered request.
- Screenshot strip per `README.md` *Visual Gate*: `/stats/downloads` collapsed, expanded, and with active filters at 1280x800 plus 390x844.
- Registry evidence: both `C-*` records move off `planned` with real targets/consumers; `F-HISTORY-DOWNLOADS` selectors/tests and `API-HISTORY-DOWNLOADS` evidence reflect the shipped surface without claiming FM-057/FM-023 adoption.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/downloads.spec.ts` succeeds.
- Run `git diff --check`; confirm changed files match Files Allowed To Modify and no generated artifacts are left behind.

## Handoff / Review

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — creates two shared abstractions at once, a bar whose public API is `History.java`'s five filter kinds and a wrapper that owns every history request body and envelope, while holding legacy download-history dimension parity.
- Reviewer: `opus` — at least the implementer's tier because this packet defines both shared component contracts; whether the bar's API is per-kind rather than per-route is what decides if FM-057 and FM-023 stay adoptions.
- Fixer: `opus` — expected findings land in the shape of the shared API or the token mapping, not in one route's markup.

Implementer prompt: Start at `RefineSidebar.tsx` for token and structure language and `History.java` for the kind vocabulary; the sidebar is a reference to match, never a source to extract from. Trap: shaping the bar around download history's control list, which forces FM-023 to modify the component. Prove first that one declared dimension produces a body the live backend answers with 200 before building the rest of the surface.
Reviewer prompt: Check hardest that nothing route-specific leaked into `refine/**` or `api/history/**` and that every literal lives in the theme. Distrust a green `downloads.spec.ts` as proof of the filtered path — read the assertion and confirm it exercises a filtered request.
