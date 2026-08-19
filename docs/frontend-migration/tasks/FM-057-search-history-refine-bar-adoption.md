# FM-057: Search History Adopts The Shared Refine Bar

Status: planned Owner:
Feature IDs: F-HISTORY-SEARCHES Component IDs: C-HISTORY-REFINE-BAR, C-HISTORY-REQUEST, C-CATEGORY-CATALOG API IDs: API-HISTORY-SEARCHES Depends on: None Blocks: None

## Outcome

Stats users refine search history through the same refine bar as download history, and `/stats/searches` loses its own filter-control row and its own `HistoryRequest` builder: `searchHistory.ts` requests and paged responses go through
`C-HISTORY-REQUEST`, leaving exactly one history request path in the application.

## Boundary Rationale

A second, independently reviewable route capability with its own filter vocabulary (query, category, user agent), its own repeat/details behavior, and its own tests and evidence. It is separated from FM-056 by a genuine dependency — the shared
component and wrapper must exist and be reviewed first — not by layer; the route, its UI state, its API adaptation, its tests, and its registry evidence all ship here together.

## Decision Dependencies

- Accepted: ADR-0002, ADR-0003, ADR-0004, ADR-0009, ADR-0014, ADR-0015, ADR-0016 (multi-select semantics).
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/stats/history/SearchHistoryPage.tsx`, `core/ui-react/src/features/stats/history/SearchHistoryPage.test.tsx`
- `core/ui-react/src/api/searchHistory.ts`, `core/ui-react/src/api/searchHistory.test.ts`
- `core/ui-react/src/features/stats/history/refine/**` and `core/ui-react/src/api/history/**`, only for additive, non-forking extensions FM-056's shipped API genuinely lacks (any change here must keep FM-056's tests passing unmodified)
- `tests/system/tests/search-history.spec.ts`
- The `F-HISTORY-SEARCHES`, `C-HISTORY-REFINE-BAR`, `C-HISTORY-REQUEST`, and `API-HISTORY-SEARCHES` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Search-history details dialog content, repeat/refill criteria (`recentSearchCriteria`), saved searches, notification history, sorting/paging semantics, and the download-history route (FM-056 owns it; it must not be edited here)
- Persisting bar or filter state, URL-synced filters, and new filter dimensions

## Context To Read

- FM-056's packet and handoff, `README.md` *Visual Gate*, `/core/ui-react/AGENTS.md` *UI Conventions*, and the listed registry records
- `core/ui-src/html/states/search-history.html` (legacy per-column vocabulary, including `checkboxes-filter column="category_name"`) and `dataTableDirectives.js`
- `org.nzbhydra.historystats.History`/`HistoryWeb`, `core/ui-react/src/api/searchHistory.ts`, `src/domain/categories/catalog.ts`, `tests/system/tests/search-history.spec.ts`

## Acceptance

- `/stats/searches` renders the `C-HISTORY-REFINE-BAR` surface and no other filter control; every dimension the route ships today keeps its accessible label — After, Before, Query, Category, Source, User agent, Username, IP address — with
  username/IP still gated on `logging.historyUserInfoType` and the user-agent filter still reachable only while user agents are shown.
- Category becomes multi-select over `C-CATEGORY-CATALOG` (legacy `checkboxes-filter column="category_name"`), sent as one `checkboxes` filter on `category_name` under the shared bar's ADR-0016 multi-select semantics that FM-056 already ships
  (nothing preselected, empty selection sends no `category_name` entry, no invert control) — inherited, not re-implemented here; every other dimension keeps its current kind and server column.
- The "Show user agents" control stays a table-display control outside the bar's dimension model, with its current behavior of clearing the user-agent filter when switched off.
- `searchHistory.ts` no longer builds a `filterModel`/`sortModel` or validates the paged envelope itself: it declares its dimensions to `C-HISTORY-REQUEST` and keeps only its entry-level Zod parsing and the details endpoint. No second history
  request builder remains anywhere in `core/ui-react`.
- Parity holds: filter changes return to page 1, `Clear all` empties every dimension and returns to page 1, refresh/paging/sorting, repeat, details, malformed-entry and failure states are unchanged, and the route's existing `search-history-*` selectors keep their meaning;
  new bar controls carry `data-testid`s recorded in `F-HISTORY-SEARCHES`.
- Tests: request-building tests for the route's dimensions (including multi-select category); component tests for filtering, clear-all, page reset, the user-agent toggle, and gated username/IP; `search-history.spec.ts` filters through the bar
  against the real backend and asserts a successful (non-400) filtered request.
- Screenshot strip per `README.md` *Visual Gate*: `/stats/searches` collapsed, expanded, and with active filters at 1280x800 plus 390x844.
- Registry evidence: `F-HISTORY-SEARCHES` tests/selectors, `API-HISTORY-SEARCHES` target/test evidence, and the two `C-*` consumer lists record the adoption without claiming notification-history parity.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search-history.spec.ts` succeeds, and `tests/downloads.spec.ts` still passes unchanged.
- Run `git diff --check`; confirm changed files match Files Allowed To Modify and no generated artifacts are left behind.

## Handoff / Review

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — FM-056 has already demonstrated the bar and the wrapper on a live route, every dimension here keeps its existing kind and server column, and the work is declaring this route's dimensions and deleting the second builder.
- Reviewer: `opus` — the packet permits additive extension of the shared bar and wrapper, and only judgment separates a real gap in FM-056's API from a route-shaped fork of it.
- Fixer: `sonnet` — matches the implementer for what should be mechanical findings; raise it if review shows the shared API was forked rather than declared against.

Implementer prompt: Start at FM-056's handoff and the shipped `refine/**` API, then the legacy `search-history.html` for the category vocabulary. Trap: widening the shared component with a prop for this route's shape when route-local state already carries it. Prove first that FM-056's tests still pass untouched after your `refine/**` and `api/history/**` edits.
Reviewer prompt: Check hardest for any surviving second request path in `core/ui-react` and for edits to shared files that FM-056's API did not actually lack. Distrust the handoff's "additive" wording; read the diff against FM-056's shipped API.
