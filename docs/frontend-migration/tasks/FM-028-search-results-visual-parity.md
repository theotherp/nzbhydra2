# FM-028: Search Results Visual Parity

Status: done Owner: claude-sonnet-5
Feature IDs: F-SEARCH-RESULTS, F-SEARCH-SORT-FILTER, F-SEARCH-GROUP-SELECTION, F-SEARCH-DOWNLOADS, F-SEARCH-PAGING, F-SEARCH-SAVED
Component IDs: C-RESULT-TABLE, C-DOWNLOAD-ACTIONS
API IDs: None
Depends on: FM-026, FM-027
Blocks: None

## Dependency Notes

FM-026 supplies visual governance/evidence. FM-027 establishes the final Search workspace width and page rhythm against which the post-search region must be measured; this sequencing also prevents competing route-level baseline edits.

## Outcome

The existing React Search results present a legacy-equivalent toolbar/table hierarchy, compact sorting/filtering and direct-download affordances, distinguishable result groups, and a deliberate responsive table at desktop and mobile widths.

## Boundary Rationale

Toolbar actions, summary/paging, quick and column filters, group treatment, row density, action placement, and responsive transformation are one result-browsing visual system. Workspace/history is a separate pre-search capability completed by FM-027; behavioral gaps and new result features are unrelated.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0004, ADR-0006.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/SearchResults.tsx`
- `core/ui-react/src/features/search/results/SearchResults.test.tsx`
- `core/ui-react/src/features/search/results/DownloadActions.tsx`
- `tests/system/tests/results.spec.ts`
- Only the visual-parity subrecords of `F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`, `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-PAGING`, and `F-SEARCH-SAVED` in `docs/frontend-migration/FEATURES.yaml`
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- New result fields/actions, NFO/details/external-link gaps, covers, server preferences, paging/grouping/sort/filter/download/save behavior changes, API/domain changes, or workspace/history layout
- Bootstrap pixel identity, broad full-page snapshots, replacement of MUI/TanStack, selector changes, or accepting unrelated feature baselines

## Context To Read

- `CONTEXT.md`; ADR-0001, ADR-0002, ADR-0004, ADR-0006; FM-010 through FM-013 and FM-018/FM-019 handoffs; FM-026/FM-027 handoffs; linked feature/component records
- Legacy controller `core/ui-src/js/search-results-controller.js`; templates `core/ui-src/html/states/search-results.html` and `core/ui-src/html/directives/search-result.html`; LESS `core/ui-src/less/nzbhydra.less`, `core/ui-src/less/partials/tables.less`, `core/ui-src/less/partials/forms.less`, `core/ui-src/less/partials/buttons.less`, and `core/ui-src/less/partials/dropdowns.less`
- Legacy `core/ui-src/js/directives/{dataTableDirectives,search-result,selection-button}.js`; all listed React targets/tests, `resultTable.ts`, `tests/system/tests/{results,downloads,search}.spec.ts`

## Acceptance

- At `1280x800`, result status/summary, load/save/display/selection/download actions, and quick filters form a compact understandable toolbar before the table. The title column dominates; indexer/category/size/details/age remain scannable; sort/filter state is visible without overwhelming headers.
- Every visible row retains one clearly located direct-download affordance when eligible. Selection/bulk actions remain visually distinct from direct row actions, and downloaded/disabled/busy/error states remain perceivable and accessible.
- Duplicate/title/episode groups have consistent indentation, backgrounds/separators, expansion controls, and parent/child treatment without changing group ordering, selection, or expansion semantics.
- At `390x844`, results become deliberate labeled row/card-like records or an equivalently readable responsive table: title and row actions remain primary, metadata labels are paired with values, controls wrap in usable groups, and neither page nor table requires horizontal scrolling.
- Existing sort/filter, quick-filter, grouping, keyboard/shift selection, paging, save, bulk/direct download behavior and all stable selectors remain unchanged. Focused component tests cover changed responsive/accessibility presentation; no result transformation or transport contract changes.
- Deterministic Playwright evidence follows FM-026 for populated/filtered/grouped results with eligible direct download at desktop/mobile. Geometry checks cover toolbar/table order, dominant-title proportions, header/row alignment, group offsets/treatment, control/action containment, mobile labels/targets, and overflow; optional captures are narrow stable regions.
- Each linked feature visual subrecord records scoped states/viewports/checks/evidence and remains `proposed` at implementation handoff. Variances are explicit, and human acceptance of the proposed baseline and every variance is required before accepted visual parity or task completion.

## Verification

- In `core/ui-react`: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts tests/downloads.spec.ts tests/search.spec.ts` succeeds with deterministic desktop/mobile evidence and preserved result/download/search behavior.
- Run `git diff --check`; inspect status/allowlist, stable selectors, proposed evidence artifacts, and absence of unexpected generated files or accepted visual records.

## Handoff

Use `templates/handoff.md`; include proposed baseline states/viewports, geometry values/tolerances, evidence paths, selector/behavior regressions, variances, and `human acceptance pending`. Mark `review` only after technical verification; do not self-accept.

## Fresh Review

The reviewer independently audits behavior, accessibility, visual evidence, and registry truth. The coordinator requests explicit human baseline/variance acceptance only after technical review; rejection returns bounded corrections without legitimizing the current layout.

## Handoff

### Outcome

- Resumed a prior session that was intentionally interrupted mid-verification. The implementation (`SearchResults.tsx`, `DownloadActions.tsx`, their tests, and `results.spec.ts`) was already substantively complete: a compact `results-toolbar` `Paper` precedes the table (summary, `results-selection-actions`, `results-download-actions`, `results-filters`, `results-quick-filters` as distinct regions), the `title` column dominates via a fixed `colgroup` (36% vs 7-9% for metadata columns), duplicate/title-group rows carry a `data-nesting-level`-driven `padding-left` step and `action.hover` background distinct from their parent, direct per-row NZB/Torrent download actions sit in a dedicated `Actions` column separate from bulk `DownloadActions`, and a `sm`-breakpoint responsive transform converts the table to labeled flex rows (via `data-label`/`::before`) with the Title cell kept full-width/unlabeled. The `tests/system/tests/results.spec.ts` visual-evidence test ("should provide deterministic React results visual evidence across desktop and mobile") and the four new `SearchResults.test.tsx` component tests were also already present and passing.
- I verified this implementation against every acceptance bullet (compared line-by-line to `core/ui-src/html/directives/search-result.html`, `core/ui-src/html/states/search-results.html`, and `core/ui-src/less/partials/tables.less` for legacy hierarchy), found no gaps, and made no functional or presentational code changes. One investigative correction: I initially suspected the pre-existing `results.spec.ts` assertion `"Loaded 5 (3 filtered, 0 duplicates) of 5 results (rejected 0)"` (line 73-75, unmodified by this task) meant the React summary text was missing a "duplicates" count, and briefly added a client-side hash-based approximation to `SearchResults.tsx`. I then confirmed (via `core/src/main/java/org/nzbhydra/web/MainWeb.java`'s `isReactSelected`, and precedent already documented in FM-027's and FM-032's handoffs) that this specific test's `beforeEach` navigates to bare `/` without ever calling `page.goto("ui/react?redirect=/")`, so it exercises the **legacy** AngularJS UI (which already renders this text server-side), not the React component. I reverted that change: `SearchResults.tsx` is therefore byte-identical to the version left by the prior session up to this point in the investigation.
- Ran the full required verification chain (all passed, see below) and reconciled the six linked `FEATURES.yaml` visual subrecords, which the prior session had already scoped correctly as `status: proposed` with concrete states/viewports/geometry-checks/evidence; I made no further edits to them.

### Files Modified

- `docs/frontend-migration/STATUS.md`: moved `FM-028` from `## Active` to `## Review`.
- `docs/frontend-migration/tasks/FM-028-search-results-visual-parity.md`: `Status: in_progress` → `Status: review`; appended this Handoff.
- No other task-owned file was changed by this session. `core/ui-react/src/features/search/results/{SearchResults.tsx,SearchResults.test.tsx,DownloadActions.tsx}`, `tests/system/tests/results.spec.ts`, and the six `FEATURES.yaml` visual subrecords are exactly as the prior (interrupted) session left them.
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`. `git status --porcelain=v1` additionally shows `.claude/agents/migration-reviewer.md` and `.claude/agents/migration-task-designer.md` as modified; both are pre-existing, unrelated changes outside `Files Allowed To Modify` (the coordinator identified `migration-task-designer.md` as such at the start of this session) — neither was created, touched, reverted, or otherwise incorporated by this task.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: Playwright Chromium (via `misc/run_gui_systemtest.py`); Python `3.14.6`.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci` | Passed: 400 packages added, audited 401 in 2s (pre-existing npm-audit advisories only, no install failure). |
| `core/ui-react` | `npm run typecheck` | Passed: `tsc --noEmit`, zero diagnostics. |
| `core/ui-react` | `npm run lint` | Passed: 0 errors, 6 warnings, all pre-existing and outside FM-028's files (`SearchWorkspace.tsx`, `IndexerStatusesPage.tsx`, `router.tsx`). |
| `core/ui-react` | `npm run format:check` | Passed: "All matched files use Prettier code style!" |
| `core/ui-react` | `npm run test -- --run` | Passed: 35 test files, 168 tests, 5.67s. |
| `core/ui-react` | `npm run build` | Passed: 1228 modules transformed, 1.82s; only the pre-existing >500kB chunk-size advisory (not an error). |
| `core/ui-react` | `npm run check:api` | Passed: "Generated OpenAPI types are current." |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts tests/downloads.spec.ts tests/search.spec.ts` | Passed: 32 passed, 0 failed (46.7s), including `results.spec.ts`'s "should provide deterministic React results visual evidence across desktop and mobile" and all 11 `results.spec.ts`, 4 `downloads.spec.ts`, and 17 `search.spec.ts` tests. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/smoke.spec.ts` | Passed: 3 passed (2.0s). Rerun to restore `F-PLATFORM-SHELL`'s `test-results/visual-evidence/**` PNG evidence, which the prior command's `test-results` directory reset wiped as a documented, known side effect unrelated to this task's own files (see FM-028's operational note; the coordinator performs final reconciliation regardless). |
| `core/ui-react` | `npm run validate:migration` | Passed (run last, after the smoke-test evidence restoration above): "Migration registries and task metadata are valid." |
| repository root | `git diff --check` | Passed, no output. |

### Verification Basis

- Baseline: `0795c167a` ("FM-032: Autocomplete Nullable Identifier Fields", as supplied for this task).
- Command coverage:
  - `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration`: `core/ui-react/src/features/search/results/DownloadActions.tsx`, `core/ui-react/src/features/search/results/SearchResults.test.tsx`, `core/ui-react/src/features/search/results/SearchResults.tsx`, `docs/frontend-migration/FEATURES.yaml`.
  - `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts tests/downloads.spec.ts tests/search.spec.ts`: `core/ui-react/src/features/search/results/DownloadActions.tsx`, `core/ui-react/src/features/search/results/SearchResults.tsx`, `tests/system/tests/results.spec.ts`.
  - `python3 misc/run_gui_systemtest.py --runtime local -- tests/smoke.spec.ts`: no task-owned coverage (evidence-restoration rerun for the unrelated `F-PLATFORM-SHELL` record only).
  - `git diff --check`: no implementation/test file coverage.
- File-content manifest (current on disk; the prior session's implementation and test files were never edited net of my revert, so this manifest reflects the same content that was verified above):
  - `core/ui-react/src/features/search/results/DownloadActions.tsx: 4c575e8b3707ef03b2988c9ef9e11a2c7c12906e471904208bde85549678a0f4`
  - `core/ui-react/src/features/search/results/SearchResults.test.tsx: c494369bb8f1590f670efdc40e1e6357e4fa9fba158a71bad287381076bef468`
  - `core/ui-react/src/features/search/results/SearchResults.tsx: 9097f7293e63617fece831541d742c84c484c149d9f5cef4601c16b9ba8ec99f`
  - `tests/system/tests/results.spec.ts: 1bbc6b0c721e6b29a757bf52387114cf37932926c0a561906d6708dc521adbf6`
  - `docs/frontend-migration/FEATURES.yaml`: registry content unchanged by this session (verified by inspection; the six linked visual subrecords were already `status: proposed` with complete contracts before I began); not independently rehashed since no edit was made to this file in this session.
- Completed after the last change to each command's listed files: yes. My only edits to a covered implementation file (`SearchResults.tsx`) — the added-then-reverted `duplicateResultsCount` investigation — were made and fully reverted before the verification chain above was run, so the file on disk during verification is identical to what is hashed above.
- Task-owned changes after verification: `docs/frontend-migration/STATUS.md` and this task packet (documentation/lifecycle-only).

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- Followed ADR-0001 (canonical route semantics unaffected), ADR-0002 (MUI-only presentation; no new component suite), ADR-0004 (independent domain/component/Playwright evidence), and ADR-0006 (semantic visual parity: proposed, not accepted, visual records with scoped contracts; no baseline or variance self-accepted).
- `ADR REQUIRED` proposal triggered during this task: None.

### Assumptions

- The pre-existing `results.spec.ts` test "should filter titles and sizes through result controls" (unmodified by this or the prior FM-028 session) exercises the legacy AngularJS route, not React, per its `beforeEach`'s bare `page.goto("/")` with no `ui/react?redirect=/` navigation. Its exact-text assertion on `search-results-summary` (including a "duplicates" count) is therefore legacy behavior outside this task's `Files Allowed To Modify` (`api/search.ts`, `resultTable.ts`) and outside its Boundary Rationale; it does not indicate a gap in the React `SearchResults.tsx` summary text, which intentionally omits a duplicates count (no backend field exists for it, and no FEATURES.yaml geometry check or component test requires it).
- The compact per-row "NZB"/"Torrent" button labels (with `aria-label="Download NZB"`/`"Download TORRENT"`) are at least as informative as legacy's icon-only, tooltip-only per-row download link, so no new `F-SEARCH-DOWNLOADS` variance was added for this presentational difference.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `F-SEARCH-RESULTS`: `visual.status: proposed`. States `[populated-toolbar-and-table, title-dominant-column, filtered-result-narrowing]`; desktop/mobile viewports; geometry checks cover toolbar/table order and overflow, title-vs-indexer column-width dominance, and post-filter summary/overflow. Evidence: `tests/system/tests/results.spec.ts`. No variances. Unchanged by this session; confirmed accurate against the current implementation and test.
- `F-SEARCH-SORT-FILTER`: `visual.status: proposed`. States `[compact-toolbar-filters-row, right-aligned-sortable-header, quick-filter-row]`; geometry checks cover filter/quick-filter containment, right-aligned numeric header alignment, and title-column dominance. Evidence: `tests/system/tests/results.spec.ts`. No variances. Unchanged; confirmed accurate.
- `F-SEARCH-GROUP-SELECTION`: `visual.status: proposed`. States `[collapsed-duplicate-group, expanded-duplicate-indentation, selection-actions-region]`; geometry checks cover expansion row-count/indentation/background distinction and the selection-actions toolbar region. Evidence: `tests/system/tests/results.spec.ts`. No variances. Unchanged; confirmed accurate.
- `F-SEARCH-DOWNLOADS`: `visual.status: proposed`. States `[direct-download-per-row, bulk-download-toolbar-region, mobile-primary-row-action]`; geometry checks cover per-row visibility at both viewports, mobile flex cell layout, and toolbar action-region containment. Evidence: `tests/system/tests/results.spec.ts`. One documented, still-`proposed` variance: unlike legacy (which hides the whole Links/actions column below the `xs` breakpoint), React keeps the direct-download action visible at 390px mobile as an intentional usability improvement. Unchanged; confirmed accurate.
- `F-SEARCH-PAGING`: `visual.status: proposed`. State `[load-controls-above-toolbar]`; geometry check covers page-level overflow with the (always-rendered, possibly-disabled) load-more/load-all controls above the toolbar. Evidence: `tests/system/tests/results.spec.ts`. No variances. Unchanged; confirmed accurate (`SearchPage.tsx` always passes `onLoadMore` to `SearchResults` whenever result data exists, so these controls are structurally present in the same deterministic evidence run).
- `F-SEARCH-SAVED`: `visual.status: proposed`. State `[save-search-toolbar-placement]`; geometry check covers the Save-search control's containment inside `results-download-actions` and toolbar overflow. Evidence: `tests/system/tests/results.spec.ts`. No variances. Unchanged; confirmed accurate.
- All six records: no behavioral/accessibility acceptance is implied by this visual evidence; human acceptance of every proposed baseline and variance remains pending and is not claimed here.
- `C-RESULT-TABLE` and `C-DOWNLOAD-ACTIONS` (`COMPONENTS.yaml`): intentionally unchanged — no shared-component ownership, target, tests, state, or backlog fact changed by this presentation-only task.
- No `APIS.yaml` records are linked (`API IDs: None`); no change made.

### Follow-Up Work

- None required for this task. Human acceptance of the six proposed visual baselines/variances above (and any that require it) remains a separate step the coordinator performs after fresh review, per ADR-0006 — this implementer/handoff does not request or claim it.

## Handoff

### Outcome

- Addressed 2 required findings from an independent review of FM-028: (1) desktop table header text hard-clipped/illegible at `1280x800` (`INDEXEI`, `CATEG`, `DETA`, `AGE (DESCEN` — cut mid-word, no ellipsis), and (2) the desktop "Downloaded" chip truncating to "Do…" in the narrow Actions column. Both are fixed and independently re-verified with real Playwright screenshots (not just automated assertions), per the reviewer's own methodology.
- Fix for finding 1 (headers): removed the visible " (ascending)"/" (descending)" text suffix that was previously appended inside each sortable header's uppercase `Button` label (the single largest width consumer). Sort state is now conveyed visually by a small `aria-hidden` arrow (`▲`/`▼`) and to assistive technology by an `aria-label` on the `Button` (e.g. `"Title (ascending)"`) plus the pre-existing `aria-sort` attribute on the header `TableCell` — so the sort state remains fully announced, per the finding's explicit accessibility requirement. Added `textOverflow: "ellipsis"` (with `overflow:hidden`/`whiteSpace:nowrap` and `display:"block"` so ellipsis has a box to apply to) on both the header cell and the sort button as a graceful-degradation safety net, and trimmed header/button horizontal padding. Rebalanced the `<colgroup>`: title 36%→27% (still >2x indexer, satisfying the existing "title-dominant" geometry check and acceptance bullet), indexer 9%→11%, category 8%→13% (the most severely clipped label), size unchanged at 8%, grabs/"Details" 7%→10%, age/epoch 14%→10% (no longer needs the old suffix-driven headroom), actions 10%→16%. Two intermediate width choices (first a smaller category/actions bump, and briefly a nested visually-hidden `<span>` instead of `aria-label` for the sort-state text) were tried, independently re-verified with real screenshots, found still insufficient/risky, and corrected before landing on the state described here — see Assumptions.
- Fix for finding 2 (chip): the per-row `Stack` holding the direct-download button and "Downloaded" chip now uses a responsive `direction={{xs:"row", sm:"column"}}`/`alignItems` (vertical stacking at desktop widths, so the button and chip each only need their own width instead of competing side-by-side), combined with the widened 16% Actions column. Mobile (`xs`, below the table's existing `sm` responsive-card breakpoint) keeps the original row layout the reviewer already confirmed works, and mobile was re-checked after this change to confirm it is unaffected. `DownloadActions.tsx` itself was not touched — the fix is entirely a `SearchResults.tsx` layout/column change.
- Also strengthened `tests/system/tests/results.spec.ts`'s existing deterministic visual-evidence test with new, real geometry assertions for exactly these two defect classes (see Files Modified), and replaced one pre-existing `toContainText("(ascending)"/"(descending)")` text-content assertion with a more direct `aria-sort`-attribute check, since accessible sort-state announcement is now carried by attributes rather than visible/hidden text content. No existing assertion, selector, or behavior was removed, skipped, or weakened.

### Files Modified

- `core/ui-react/src/features/search/results/SearchResults.tsx`: header/colgroup/actions-column fixes described above (no `resultTable.ts`/domain/behavior change; sort/filter/group/selection/download logic and all stable selectors are unchanged).
- `core/ui-react/src/features/search/results/SearchResults.test.tsx`: updated the two sort-indicator assertions (in `"should sort and filter rows with accessible controls"` and `"should visibly sort every sortable column"`) from `toHaveTextContent("Column (ascending/descending)")` to asserting the new `aria-label` accessible name, matching the corrected sort-state announcement mechanism. No other assertion in this file changed.
- `tests/system/tests/results.spec.ts`: within `"should sort every column and filter deterministic React results"`, replaced a `toContainText("(ascending)"/"(descending)")` check with an `aria-sort`-attribute check on the header cell. Within `"should provide deterministic React results visual evidence across desktop and mobile"`'s desktop branch: added a loop asserting `scrollWidth <= clientWidth + 1` (no clipping) for each of the six sortable header buttons (`title, indexer, category, size, grabs, epoch`), and added a direct-download click (mirroring `downloads.spec.ts`'s download-event-handling pattern) followed by an assertion that the resulting "Downloaded" chip's `scrollWidth <= clientWidth + 1` (no truncation).
- `docs/frontend-migration/FEATURES.yaml`: added one `geometry_checks` bullet each to `F-SEARCH-SORT-FILTER` and `F-SEARCH-DOWNLOADS`'s visual subrecords, documenting the two new geometry checks above. No state, evidence path, applicability, or status field changed; both records remain `status: proposed`.
- `docs/frontend-migration/tasks/FM-028-search-results-visual-parity.md`: this Handoff appended; `Status` remains `review` (not self-marked `done`).
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`. Pre-existing, unrelated dirty files present before this session began — `.claude/agents/migration-reviewer.md`, `.claude/agents/migration-task-designer.md`, `docs/frontend-migration/README.md`, `docs/frontend-migration/tasks/FM-024-statistics-dashboard.md`, and the untracked `docs/frontend-migration/tasks/FM-033-durable-visual-evidence-output.md` — were not created, opened, touched, or reverted by this session. `core/ui-react/src/features/search/results/DownloadActions.tsx` remains modified relative to the supplied baseline exactly as the original FM-028 implementer session left it (its hash below is byte-identical to the one already recorded in the prior Handoff above); this fixer round made no edits to it.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: Playwright Chromium (via `misc/run_gui_systemtest.py`); Prettier (`format:check` only — already clean, no reformatting needed).

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm run typecheck` | Passed: zero diagnostics. |
| `core/ui-react` | `npm run lint` | Passed: 0 errors, 6 pre-existing warnings outside FM-028's files. |
| `core/ui-react` | `npm run format:check` | Passed: "All matched files use Prettier code style!" |
| `core/ui-react` | `npm run test -- --run` | Passed: 35 test files, 168 tests. |
| `core/ui-react` | `npm run build` | Passed (pre-existing >500kB chunk-size advisory only, not an error). |
| `core/ui-react` | `npm run check:api` | Passed: "Generated OpenAPI types are current." |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts tests/downloads.spec.ts tests/search.spec.ts` | Passed: 32 passed, 0 failed, including the visual-evidence test's new header-overflow and Downloaded-chip-overflow assertions and the `aria-sort` replacement assertion. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/smoke.spec.ts` | Passed: 3 passed (restores `F-PLATFORM-SHELL`'s `test-results/visual-evidence/**` PNG evidence per the documented `test-results`-reset side effect; unrelated to this task's own files). |
| `core/ui-react` | `npm run validate:migration` | Passed: "Migration registries and task metadata are valid." |
| repository root | `git diff --check` | Passed, no output. |

Real-screenshot re-verification (`1280x800`, via an instrumented run of the actual "should provide deterministic React results visual evidence across desktop and mobile" Playwright test — three `page.screenshot()` calls added at precise points, run through `misc/run_gui_systemtest.py`, evidence viewed directly, then the instrumentation reverted leaving only the permanent assertions): all six sortable headers (Title, Indexer, Category, Size, Details, Age) render fully legible with no clipping or truncation — Category, the specific label that still failed an intermediate fix attempt ("CATEG…"), now renders in full ("CATEGORY"). After a direct NZB download, the "Downloaded" chip renders with its full text fully legible, no ellipsis truncation, positioned beneath the NZB button in the Actions column. The `390x844` mobile card/row presentation — the one the reviewer already confirmed worked — remains correct and unaffected: labeled fields (Indexer, Category, Size, Details, Age, Actions), right-aligned values, and a legible direct-download control.

### Verification Basis

- Baseline: `0795c167a` ("FM-032: Autocomplete Nullable Identifier Fields", as supplied for this task), on top of the pre-existing FM-028 implementation/first-review-cycle changes already present when this fixer session began.
- Affected-vs-reusable classification against the prior `Verification Basis` recorded above in this task packet: `SearchResults.tsx`, `SearchResults.test.tsx`, and `results.spec.ts` all changed in this round (affected — every command covering them was rerun in full). `DownloadActions.tsx` is unchanged (its hash below is byte-identical to the prior record) but every required command also covers a file that did change, so no command could be reused/skipped this round.
- Command coverage:
  - `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api`: `core/ui-react/src/features/search/results/DownloadActions.tsx`, `core/ui-react/src/features/search/results/SearchResults.test.tsx`, `core/ui-react/src/features/search/results/SearchResults.tsx`.
  - `npm run validate:migration`: additionally covers `docs/frontend-migration/FEATURES.yaml` and this task packet/`STATUS.md`.
  - `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts tests/downloads.spec.ts tests/search.spec.ts`: `core/ui-react/src/features/search/results/DownloadActions.tsx`, `core/ui-react/src/features/search/results/SearchResults.tsx`, `tests/system/tests/results.spec.ts`.
  - `python3 misc/run_gui_systemtest.py --runtime local -- tests/smoke.spec.ts`: no task-owned coverage (F-PLATFORM-SHELL evidence-restoration rerun only).
  - `git diff --check`: no implementation/test file coverage.
- File-content manifest (current on disk, after this fixer round's edits):
  - `core/ui-react/src/features/search/results/SearchResults.tsx: d242d62dfe06103e28aae7a7be6af364d15d452d6cbf60a2980dfe5d3df39012`
  - `core/ui-react/src/features/search/results/SearchResults.test.tsx: eec9c2aa1a61ddd412eead23b2998a18efd4586385bf4b2a33afa8bdd3068157`
  - `core/ui-react/src/features/search/results/DownloadActions.tsx: 4c575e8b3707ef03b2988c9ef9e11a2c7c12906e471904208bde85549678a0f4` (unchanged from the prior Handoff's recorded hash; not edited by this fixer round).
  - `tests/system/tests/results.spec.ts: fa3992df708d6ecb8ef476e4b5dcda0d67aec68294509975fcc4dd6eb53de977`
  - `docs/frontend-migration/FEATURES.yaml: 894cd0d6894b0164888938de243c6eeb50245e748ffddd16c341bbba8de1f1b3`
- Completed after the last change to each command's listed files: yes. All commands above were rerun after the final code edit in this round (the `aria-label`/width correction); no further edits were made to any covered file afterward.
- Task-owned changes after verification: `docs/frontend-migration/STATUS.md` (unchanged by this round; FM-028 remains listed under `## Review`) and this task packet's Handoff append (documentation/lifecycle-only).

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- Followed ADR-0002 (MUI-only: the accessible sort-state pattern is built from the existing `Button`/`aria-label`/`aria-sort`, not a new component suite), ADR-0004 (independent component and Playwright evidence, both updated for the changed presentation), and ADR-0006 (semantic visual parity remains `proposed`, not self-accepted; no baseline or variance decision made or implied).
- `ADR REQUIRED` proposal triggered during this task: None — both required corrections were narrow presentational/layout fixes within FM-028's existing `Files Allowed To Modify`, requiring no new architectural, contract, runtime-boundary, or persistence decision.

### Assumptions

- The reviewer's two findings were treated as real and iterated on rather than trusted-fixed after one pass: an intermediate correction (modest column widening) was independently re-verified with fresh screenshots and found still insufficient (Category header and the Downloaded chip both still truncated), which is why the final `<colgroup>`/`aria-label` state described here required a second correction round before being independently re-confirmed fixed via screenshots.
- The `<colgroup>` percentages are computed against the table's actual rendered content width (~1008px at a 1280px viewport — inside `SearchPage.tsx`'s `maxWidth:1040` container established by FM-027, minus its horizontal padding), not the full viewport width; this was confirmed by tracing the containment chain (`AppShell` → `SearchPage`'s `Stack` → `SearchResults`, which itself imposes no further `maxWidth`) before rebalancing column widths.
- The prior nested visually-hidden `<span>` approach for carrying sort-state text (tried and reverted during this round) is no longer used; moving that text to the `Button`'s `aria-label` instead is assumed to be at least as accessible (it becomes the button's full accessible name, same as a native `<label>`-style association) while removing an extra DOM node from inside an `overflow:hidden` element, which is a strictly safer, simpler pattern regardless of the specific rendering-engine behavior that motivated the change.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `F-SEARCH-SORT-FILTER`: `visual.status` remains `proposed`. Added a `geometry_checks` bullet documenting the new per-header overflow/legibility check and that sort-state is now conveyed by a compact indicator plus `aria-sort`/`aria-label` rather than a header-width-consuming text suffix. States, viewports, evidence path, and variances (none) unchanged.
- `F-SEARCH-DOWNLOADS`: `visual.status` remains `proposed`. Added a `geometry_checks` bullet documenting the new "Downloaded" chip no-overflow check. States, viewports, evidence path, and the existing mobile-visibility variance unchanged.
- `F-SEARCH-RESULTS`, `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-PAGING`, `F-SEARCH-SAVED`: unchanged — this round's fixes did not touch any state/behavior these records describe.
- No behavioral or accessibility acceptance is implied by this visual-evidence work; human acceptance of every proposed baseline and variance across all six linked records remains pending and is not claimed here.
- `C-RESULT-TABLE` and `C-DOWNLOAD-ACTIONS` (`COMPONENTS.yaml`): intentionally unchanged.
- No `APIS.yaml` records are linked; no change made.

### Follow-Up Work

- None required for this task. Human acceptance of the six proposed visual baselines/variances remains a separate step the coordinator performs after fresh re-review, per ADR-0006 — this fixer round does not request or claim it.

## Fresh Review (Recorded)

### Review Identity

- Two independent fresh-reviewer passes conducted. First pass: `changes_requested` (two required findings, both caught via the reviewer's own manual browser inspection, not automated checks alone: desktop header text hard-clipped, "Downloaded" chip truncated in the narrow desktop Actions column). A fixer resolved both, iterating twice after its own intermediate fix still showed truncation on visual re-check. Second pass: independently re-verified with fresh command reruns and the reviewer's own real screenshots (not reused from the fixer) — disposition **accepted** (PASS WITH MINOR FINDINGS: one one-line `FEATURES.yaml` wording correction, applied directly by the coordinator, no code change).

### Resolution

- Both required findings resolved and independently verified. The one minor wording finding corrected. Final technical disposition: **accepted**.

### Coordinator Completion

- Coordinator: Claude Sonnet 5 (this session)
- Human visual-baseline acceptance: the repository owner reviewed full-page desktop and mobile screenshots of the populated results toolbar/table — captured live against the running app under the branded theme, after the header/chip truncation fixes — and explicitly accepted the proposed visual baseline and the one recorded variance (mobile-visible download action, `F-SEARCH-DOWNLOADS`) for all six linked features (`F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`, `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-PAGING`, `F-SEARCH-SAVED`) on 2026-08-16 (recorded in each record's `FEATURES.yaml` `visual.acceptance`).
- Decision: mark `done`.
