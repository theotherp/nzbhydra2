# FM-045: Single Refine-Sidebar Filter Surface With Toggle-Row Category/Indexer

Status: planned Owner: Feature IDs: F-SEARCH-SORT-FILTER, F-SEARCH-RESULTS Component IDs: C-RESULT-TABLE API IDs: None Depends on: FM-043 Blocks: FM-046

## Dependency Notes

Depends on FM-043 for real palette/typography/density tokens. It blocks FM-046 (toolbar/bulk-actions remediation) because both own `core/ui-react/src/features/search/results/SearchResults.tsx`, which README's Parallel Work rules
forbid two concurrent tasks from owning; this task goes first because it removes the inline column-header filter controls FM-046's own header-cell layout would otherwise still have to coexist with. This is a **remediation-plus-removal**
pass over FM-039's already-`done` sidebar, not a rebuild: FM-039's filter-state wiring, per-item counts, and download-type derivation are sound and reused; what changes is the sidebar's palette/density/control shape and, per the
repository owner's explicit "no inline filters" direction (ADR-0009), the removal of FM-034's inline per-column-header filters and the mobile `results-filters` row so the sidebar becomes the sole filter surface at every viewport.

## Outcome

Every result filter — quality, title, category, indexer, size, age, grabs/seeders, download type — is reachable from exactly one surface, the `refine-sidebar`, at every viewport; FM-034's inline column-header filter popovers and the
mobile-only `results-filters` toolbar row are retired; and the sidebar's Category/Indexer lists render as the mock's flat, full-width toggle rows instead of a checkbox list, restyled to the mock's palette and density throughout.

## Boundary Rationale

Consolidating the filter surface, converting the Category/Indexer control shape, and restyling the sidebar to the new palette/density are one capability change: removing the inline filters without the sidebar already being the
complete, reachable-at-every-viewport, correctly-styled replacement would leave users with fewer ways to filter than before, which ADR-0009's own "preserve every filtering capability" instruction forbids. None of the three parts is
independently reviewable — the removal is only safe once the replacement surface is proven complete, and the toggle-row shape is the same sidebar this task must already touch for density. It is separate from FM-046 because selection
and download actions are a different capability on different feature records, and separate from FM-041/FM-042 (display preferences, sticky positioning) because neither changes what is filterable or how.

## Decision Dependencies

- Accepted ADRs governing this task: ADR-0002 (MUI-only presentation), ADR-0004 (testing and parity), ADR-0006 (semantic visual parity), ADR-0007 (historical; superseded for palette/typography/density by ADR-0009), ADR-0008
  (historical; its Option B "keep the inline filters, structure only" reading is reversed by ADR-0009), ADR-0009 (full mock fidelity, including the single-filter-surface and toggle-row requirements).
- Proposed or rejected ADRs blocking this task: None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/SearchResults.tsx`, `SearchResults.test.tsx`, `RefineSidebar.tsx`, `RefineSidebar.test.tsx`, `filterControls.tsx`, `resultTable.ts`, `resultTable.test.ts`, and new feature-scoped sibling
  modules and tests under `core/ui-react/src/features/search/results/`
- `tests/system/tests/results.spec.ts` — this task's own visual-evidence block, plus the three pre-existing tests that interact with the controls this task removes (`"should sort and filter deterministic results in the React
  shell"`, `"should sort every column and filter deterministic React results"`, `"should provide deterministic React results visual evidence across desktop and mobile"`, all documented as pre-existing debt in FM-039's and FM-040's
  own handoffs), updated only to target the sidebar's equivalent controls — no other test or assertion in the file
- `docs/frontend-migration/FEATURES.yaml` — only `F-SEARCH-SORT-FILTER` and `F-SEARCH-RESULTS`'s `visual`, `selectors`, and `tests` fields
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- `core/ui-react/src/app/theme.ts` (FM-043's territory; read its tokens, do not edit them)
- `results-toolbar`'s own selection/download/bulk-actions regions and the `DownloadActions.tsx` restyle (FM-046)
- The display-options menu, compact rows, recency highlighting, and sticky positioning (FM-041, FM-042)
- Changing `ResultFilters`' shape, `filterResults` semantics, sort logic, grouping, selection, or download behavior beyond what removing/relocating a control's *surface* requires; every filter dimension that exists today must still
  exist and still drive the exact same shared state
- The search form (FM-044); any route other than `/`

## Context To Read

- `README.md` (Visual Parity, Workflow, Registry Rules, Verification Integrity), `ADR-0002`, `ADR-0004`, `ADR-0006`, `ADR-0007`, `ADR-0008` (historical), `ADR-0009`
- `F-SEARCH-SORT-FILTER`, `F-SEARCH-RESULTS`, `C-RESULT-TABLE`, and the FM-011, FM-034, and FM-039 packets (the inline-filter and sidebar contracts this task removes/replaces)
- `core/ui-react/src/app/theme.ts` (read only, post-FM-043)
- `core/ui-react/src/features/search/results/SearchResults.tsx` in full — `renderHeaderFilter`/`HeaderFilterMenu` (the inline popovers being removed), the `results-filters` mobile `Stack`, the `results-quick-filters` row, and
  `TABLE_MIN_WIDTH`'s existing rationale (Assumptions in the FM-039 handoff)
- `core/ui-react/src/features/search/results/RefineSidebar.tsx` and `filterControls.tsx` in full (`MultiFilter`'s checkbox rendering being replaced, `NumericFilter`'s `stacked` mode being kept)
- `/tmp/hydra mock/Awaiting responses for direction/NZBHydra Search.dc.html` — the `<aside>` block's Category/Indexer row markup and its `rowStyle`/`chip` styling functions, for the toggle-row's exact colors and padding
- `tests/system/tests/results.spec.ts` and `tests/system/tests/visualEvidence.ts`

## Acceptance

- FM-034's inline per-column-header filter popovers (`HeaderFilterMenu` and every `header-filter-*`/`number-filter-*-header-*` control) are removed from the table header; sortable header cells keep only their sort button/indicator
  (`sort-{column}`, `aria-sort`, accessible name) — this simplifies the header row, which the header row's own `42px` mock height (FM-042's territory) benefits from but does not require here.
- The mobile-only `results-filters` toolbar row (`freetext-filter-title`, `filter-toggle-indexer`, `filter-toggle-category`, and the three mobile `NumericFilter`s) and the `results-quick-filters` mobile-only row are removed; the
  `refine-sidebar`'s own Quality section already covers quick filters at every viewport (superseding the toolbar row FM-039 kept mobile-only).
- The `refine-sidebar` becomes reachable and fully usable at every viewport, not only `sm` and up: below `sm`, `refine-sidebar-toggle` opens the sidebar as a MUI `Drawer` (or equivalent overlay) rather than a permanently docked
  256px column, so it never competes with the table for width, while presenting the identical Quality/Title/Category/Indexer/Size/Age/Grabs/Type sections and binding the same `ResultFilters` state as at desktop. No filtering
  capability available before this task is unreachable at any viewport after it — this is verified, not assumed, by a mobile-viewport component or Playwright test exercising at least the title and one list filter through the
  mobile-opened sidebar.
- Category and Indexer render as the mock's toggle rows, not a checkbox list: each entry is a full-width clickable row (no visible `<input type="checkbox">`) with `8px` border radius, `7px 9px` padding, `1px` row gap; an active
  (selected) row's background is `oklch(0.75 0.1 190 / 0.12)` with `#eef1f0` text, an inactive row is transparent with `#b7bdbc` text; the entry label sits left and its loaded-result count sits right in IBM Plex Mono `#6b7472`
  (unchanged counting semantics from FM-039: computed over all loaded results, not the filtered subset). The row itself, not a nested checkbox, carries the click handler and `aria-pressed` (or `role="option"`/`aria-selected`, an
  implementer's routine accessibility-pattern choice, recorded in the handoff) so keyboard and assistive-technology users retain an equivalent, real toggle affordance.
- `filterControls.tsx`'s `MultiFilter` (checkbox-list rendering) is replaced by a new toggle-row component used by the sidebar's Category/Indexer sections; confirm via repository-wide search whether `MultiFilter` has any remaining
  caller after the inline/mobile removals above and either delete it or keep it only if a real caller remains — do not leave dead exported code. `NumericFilter`'s `stacked` mode (Size/Age/Grabs in the sidebar) is unchanged in
  behavior; its non-`stacked` mode is removed the same way if no caller remains after the inline/mobile removals, confirmed rather than assumed.
- One filter state, one surface: the sidebar's controls continue to bind `ResultFilters` exactly as FM-039 left them; `filterResults`, `defaultFilters`, and the download-type derivation are unchanged. `refine-clear-all` still resets
  every result-side filter without touching sort, grouping, selection, or paging.
- The three pre-existing `results.spec.ts` tests named in Files Allowed To Modify are rewritten to interact with the sidebar's equivalent controls (`refine-filter-title`, the Indexer toggle row) instead of the removed
  `freetext-filter-title`/`filter-toggle-indexer`, resolving the pre-existing mobile-viewport gap FM-039's and FM-040's handoffs both documented as inherited debt — confirm and record this resolution explicitly rather than treating
  it as incidental.
- No existing `data-testid` outside the ones this task explicitly removes is renamed; every new one (the toggle-row entries' own testids, any new Drawer-related ids) is added to `F-SEARCH-SORT-FILTER`'s `selectors`, and every
  removed one (`header-filter-*`, `number-filter-*-header-*`, `freetext-filter-title`, `filter-toggle-indexer`, `filter-toggle-category`, `results-filters`, `results-quick-filters`) is deleted from the same list with the removal
  disclosed in the handoff and `note`, per README's compatibility-contract rule ("unless a task explicitly replaces them").
- Registry reconciliation: `F-SEARCH-SORT-FILTER` and `F-SEARCH-RESULTS` (both already `proposed`) get updated `contract`s reflecting the new mock palette/density/toggle-row states and the removed inline-filter/mobile-row states;
  never fabricate or re-date human acceptance.
- Visual contract (ADR-0006), asserted in `results.spec.ts`. States: `refine-sidebar-only-surface`, `refine-toggle-row-category-indexer`, `refine-sidebar-mobile-drawer`. Viewports: desktop 1280x800, mobile 390x844. Geometry checks:
    - no inline filter control renders in the table header at either viewport, and the header row's height is measurably shorter than before this task at the same viewport;
    - at desktop the sidebar and table both render overflow-free, exactly as FM-039 required, with every Category/Indexer row rendering as a single non-checkbox clickable element with no scrollWidth overflow;
    - a selected toggle row's computed background color differs measurably from an unselected row's;
    - at mobile, opening `refine-sidebar-toggle` renders every filter section with no page horizontal overflow, and closing it restores the table to its full mobile width with no residual gap.
  Evidence: `tests/system/tests/results.spec.ts` plus narrow captures at `visual-evidence/F-SEARCH-SORT-FILTER/toggle-row-sidebar-desktop.png` and `refine-sidebar-mobile-drawer.png`.

## Verification

- `npm ci` only if `package.json`/`package-lock.json` change; otherwise the cheapest install that guarantees `node_modules` matches the lockfile. Record which install ran.
- Working directory `core/ui-react`: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api`, `npm run validate:migration` — each expected to pass.
- Working directory `tests/system`: `npx tsc --noEmit` — expected to pass (this task changes a spec).
- Working directory `tests/system`, after `VITE_OUT_DIR=../target/classes/static/react npm run build` from `core/ui-react`: `npx playwright test tests/results.spec.ts`, expected to produce the proposed contracts' evidence, with the
  three previously-documented pre-existing failures now passing (see Acceptance) rather than merely re-recorded as blocked.
- Repository root: `git diff --check` — expected to produce no output.
- Confirm task-owned changed files are all listed under Files Allowed To Modify, and that no other spec's fixtures or assertions were altered.
- Confirm verification leaves no unexpected generated or modified files; the git-ignored production build under `core/target/classes/static/react` is build output, not a tracked change.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer must specifically confirm no filtering capability available before this
task became unreachable after it, at every viewport — this is the highest-risk regression this task can introduce. The reviewer cannot supply the human visual acceptance the affected records require; that remains a human decision
independent of technical review, per ADR-0006.
