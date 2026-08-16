# FM-028: Search Results Visual Parity

Status: planned Owner:
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
