# FM-045: Single Refine-Sidebar Filter Surface With Toggle-Row Category/Indexer

Status: done Owner: migration-implementer Feature IDs: F-SEARCH-SORT-FILTER, F-SEARCH-RESULTS Component IDs: C-RESULT-TABLE API IDs: None Depends on: FM-043 Blocks: FM-046

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
- `uimock/NZBHydra Search.dc.html` — the `<aside>` block's Category/Indexer row markup and its `rowStyle`/`chip` styling functions, for the toggle-row's exact colors and padding
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
- No existing `data-testid` outside the ones this task explicitly removes is renamed; every new one (the toggle-row entries' own testids, any new Drawer-related ids) is added to `F-SEARCH-SORT-FILTER`'s `selectors`. For each one this
  task removes from the React target (`header-filter-*`, `number-filter-*-header-*`, `freetext-filter-title`, `filter-toggle-indexer`, `filter-toggle-category`, `results-filters`, `results-quick-filters`), the entry is deleted from
  the same list **unless the identical selector remains live in the legacy AngularJS view this record also documents through its own `legacy_sources`** — `core/ui-src/html/states/search-results.html` and
  `core/ui-src/html/dataTable/columnFilterFreetext.html`, still exercised by passing legacy-shell tests in `tests/system/tests/results.spec.ts` — in which case the entry is retained, because deleting it would make the record
  factually false about the still-live legacy side. Concretely: `header-filter-*` and `number-filter-*-header-*` are React-only and are deleted; the `freetext-filter-*` and `filter-toggle-*` entries are legacy-live and are kept.
  Either way the React-side removal is disclosed in the handoff and the record's `note`, per README's compatibility-contract rule ("unless a task explicitly replaces them").
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

### Outcome

The `refine-sidebar` is now the only result-filter surface, at every viewport. FM-034's inline per-column-header filter popovers (`HeaderFilterMenu`, every `header-filter-*` and `number-filter-*-header-*` control) and the mobile-only
`results-filters` / `results-quick-filters` toolbar rows are gone; each sortable header cell keeps exactly one button, its `sort-{column}` control, with its `aria-sort` and `aria-label` unchanged. At `sm` and up the sidebar is the
mock's 248px docked column; below `sm` the same `refine-sidebar-toggle` opens the identical sections in a MUI `Drawer`, so nothing competes with the table for width and no filter dimension is unreachable at any viewport. Category and
Indexer render as the mock's flat toggle rows — a full-width `button` per entry (8px radius, `7px 9px` padding, 1px row gap, `oklch(0.75 0.1 190 / 0.12)` / `#eef1f0` when pressed, transparent / `#b7bdbc` when not, the loaded-result
count right-aligned in IBM Plex Mono `#6b7472`), with `aria-pressed` on the row itself and no `input[type=checkbox]` anywhere. The whole panel carries the mock's palette, typography, and density: `#8a9291` "REFINE" caption, teal
`Clear all`, 11px uppercase section captions, `chip()`-styled Quality and Type pills, and recessed `#1c2224` inputs. `ResultFilters`, `filterResults`, `defaultFilters`, the download-type derivation, the per-item counting semantics, and
`refine-clear-all`'s reset scope are all unchanged.

### Deliberate Structural Decisions

1. **Below-`sm` drawer, chosen in JavaScript.** Which of the two presentations renders is decided by `useMediaQuery(theme.breakpoints.down("sm"))`, not by CSS `display`. Exactly one copy of every control exists in the DOM at a time, so
   no duplicate `data-testid` or accessible name is ever present — the specific defect that made the three pre-existing `results.spec.ts` tests fail, where a below-`sm`-only row was in the DOM but invisible at a desktop viewport. The
   drawer's open state is deliberately *not* the persisted `sidebarCollapsed` preference (which describes the docked desktop column): reusing it would pop an overlay open over the results for a desktop user who then loads the same page
   on a phone.
2. **Accessibility pattern for the toggle rows: `aria-pressed` on a real `button`** (the packet's stated implementer's choice, recorded here). Each row is an independently operable toggle with no roving focus, no active-descendant
   management, and no single-selection semantics, which is the toggle-button pattern rather than `role="option"`/`aria-selected` in a `listbox`; it is also the pattern the sidebar's own Quality and Type pills already use, so the panel
   exposes one consistent affordance. Keyboard operation, focus ring (`:focus-visible` from `MuiCssBaseline`), and Enter/Space activation are MUI `Button` defaults.
3. **Header cell vertical padding.** With the inline controls gone, the header row's remaining height came from MUI's default 16px `TableCell` padding, not from the removed controls (the sort `Button` and the old `TextField` are the
   same height). The packet's own geometry check requires the header row to be *measurably shorter than before*, so the header cells' `py` was set to the 6px the body cells already use. The mock's exact 42px header height and its
   sticky positioning remain FM-042's scope and were not pursued.
4. **Dead code removed, confirmed rather than assumed.** A repository-wide search after the removals found no remaining caller of `MultiFilter` (its only callers were the header popovers, the mobile row, and FM-039's
   `RefineCollapsibleList`) and no remaining caller of `NumericFilter`'s non-`stacked` mode (only the header popovers and the mobile row). `MultiFilter` is deleted; `NumericFilter` now has only the former `stacked` rendering and its
   `stacked` prop is gone, with `testIdPrefix` promoted from optional to required because all three surviving call sites pass it. `filterControls.tsx` exports exactly the two controls the sidebar renders.

### Files Modified

- `core/ui-react/src/features/search/results/SearchResults.tsx`, `SearchResults.test.tsx`, `RefineSidebar.tsx`, `RefineSidebar.test.tsx`, `filterControls.tsx`, and one new feature-scoped sibling module,
  `refineStyles.ts`
- `tests/system/tests/results.spec.ts`
- `docs/frontend-migration/FEATURES.yaml` (only `F-SEARCH-SORT-FILTER` and `F-SEARCH-RESULTS`'s `visual` and `selectors` fields)
- `docs/frontend-migration/STATUS.md` and this task packet
- `resultTable.ts` / `resultTable.test.ts`: intentionally **unchanged**. Nothing in the filter-state model, `filterResults`, `defaultFilters`, or the download-type derivation needed to change, which is exactly what the packet's "one
  filter state, one surface" criterion requires.
- Scope confirmation: every task-owned modification is within `Files Allowed To Modify`, with one disclosed scope-reading decision recorded under *Temporary Exceptions And Debt*. The working tree was completely clean at
  `89286c376` when this task started, so there is no pre-existing user change to preserve or separate. Untracked/ignored outputs only: the regenerated `tests/system/visual-evidence/F-SEARCH-SORT-FILTER/*.png` captures (git-ignored via
  `tests/.gitignore`) and the git-ignored production build under `core/target/classes/static/react`.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: `Playwright (tests/system, chromium)` via `misc/run_gui_systemtest.py --runtime local`; Maven `mvn` (invoked by that launcher); Docker (sonarr/radarr fixtures, started by that launcher)

### Verification Evidence

| Working directory | Command | Result |
|-------------------|---------|--------|
| `core/ui-react` | **No install ran.** `npm ls --depth=0` (exit `0`, no `missing`/`invalid`) plus `git status --porcelain package.json package-lock.json` (empty) | Passed. This task changes neither `package.json` nor `package-lock.json` and `node_modules` already matched the lockfile, so per the packet and README's install exception the cheapest correct install is none. `npm ci` was deliberately **not** run. |
| `core/ui-react` | `npm run typecheck` | Passed (exit `0`, no output). |
| `core/ui-react` | `npm run lint` | Passed: `0 errors, 7 warnings` — the identical pre-existing warning set FM-043 and FM-044 both recorded (3 `react-refresh/only-export-components` plus 1 `react-hooks/incompatible-library` in `SearchWorkspace.tsx`, 1 in `IndexerStatusesPage.tsx`, 1 in `router.tsx`, 1 `react-hooks/exhaustive-deps` in `SearchPage.tsx`). Count and kind unchanged by this task; nothing suppressed or disabled. |
| `core/ui-react` | `npm run format:check` | Passed for task-owned files after `npx prettier --write` on the five changed `src/features/search/results/*` files. The report is back to the same 11 pre-existing, out-of-scope files FM-043/FM-044 recorded: `.playwright-cli/*.yml` x5, `README.md`, `src/features/search/SearchPage.tsx`, `src/router.tsx`, `tsconfig.json`, `vite/devBackend.test.ts`, `vite/devBackend.ts`. |
| `core/ui-react` | `npm run test -- --run` | **Passed: 38 files, 214/214 tests** (212 before this task). `RefineSidebar.test.tsx` grew from 11 to 12 cases (toggle-row shape, filtered-outcome binding, and the required mobile-viewport drawer case); `SearchResults.test.tsx` keeps its case count, with the inline-header-filter case replaced by an inline-controls-absent case and the sync case rewritten as a single-surface case covering all eight filter dimensions. Nothing skipped, deleted, weakened, or suppressed. |
| `core/ui-react` | `npm run build` | Passed: `assets/index.css` 12.30 kB, `assets/index.js` 1,006.34 kB (gzip 307.86 kB), `built in 1.90s`. |
| `core/ui-react` | `npm run check:api` | Passed ("Generated OpenAPI types are current."). |
| `core/ui-react` | `npm run validate:migration` | Passed ("Migration registries and task metadata are valid.") on the final tree. Run last, because `F-SEARCH-SORT-FILTER`'s two `snapshots` paths must exist on disk, which they only do after the Playwright run below, and because it cross-checks this packet's `Status` against `STATUS.md`'s section. |
| `tests/system` | `npx tsc --noEmit` | Passed (exit `0`, no output). Re-run after the final one-line fixture correction below. |
| `core/ui-react` | `VITE_OUT_DIR=../target/classes/static/react npm run build` | Passed; emits the same unhashed `index.css`/`index.js` entry pair into the git-ignored production output the system test serves. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/results.spec.ts` (the documented real-backend launcher: Maven-built `core`/`mockserver` exec JARs plus the sonarr/radarr Docker fixtures; `vite dev` was not used) | **Passed: 16 of 16, `16 passed (21.4s)`, zero failures.** This includes all three previously-documented pre-existing failures, now **passing against the sidebar's equivalent controls** rather than re-recorded as blocked: `should sort and filter deterministic results in the React shell` (1.0s), `should sort every column and filter deterministic React results` (1.8s), and `should provide deterministic React results visual evidence across desktop and mobile` (1.5s). This task's own rewritten visual-evidence block, `should provide deterministic refine-sidebar visual evidence across desktop and mobile`, passed (2.2s), as did the three legacy-shell tests that still drive the legacy `freetext-filter-title`/`filter-toggle-size` controls, proving those legacy selectors are untouched. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 600 -- tests/results.spec.ts --grep "refine-sidebar visual evidence"`, run **before** any implementation edit against the clean `89286c376` tree with a temporary measurement-only edit to `results.spec.ts` (this task's own allowed file), then reverted with `git checkout` | **Baseline measurement, passed:** `1 passed (2.5s)`, printing `BASELINE_HEADER_ROW_HEIGHT 63.25 51.5` — the pre-FM-045 desktop header row height (63.25px) and first data row height (51.5px) at 1280x800. This is the number the new geometry check compares against, so "measurably shorter than before this task" is measured, not asserted. `git status --porcelain` after the revert showed only the two lifecycle documentation files. |
| repository root | `git diff --check` | Passed (no output). |
| repository root | `git status --porcelain` | Passed: exactly the nine task-owned paths plus the one new untracked module, and no unexpected generated or modified file. The `core/target/classes/static/react` build output and `tests/system/visual-evidence/**` captures are both git-ignored. |
| `tests/system` | Narrow visual captures | Produced by the passing visual-evidence test and both referenced from `F-SEARCH-SORT-FILTER`'s `snapshots`: `visual-evidence/F-SEARCH-SORT-FILTER/toggle-row-sidebar-desktop.png` (30,928 B) and `refine-sidebar-mobile-drawer.png` (30,136 B). |

Geometry actually asserted by the passing visual-evidence test, per the packet's Acceptance list: no `header-filter-*`, `number-filter-*-header-*`, `freetext-filter-title`, `filter-toggle-indexer`, or `filter-toggle-category` element
exists at either viewport; the desktop header row measures below both the 63.25px baseline and a 52px absolute bound; the sidebar and table both render overflow-free at desktop with the sidebar's right edge at or left of the table's
left edge and the title header still more than twice the indexer header's width; every Category and Indexer entry is a single `BUTTON` with `aria-pressed` and no `scrollWidth` overflow, with zero `input[type=checkbox]` in either list;
a pressed row's computed `backgroundColor` differs from the same row's unpressed value, and the toggle actually changes the visible row count; collapsing the sidebar widens the table with no residual gap; and at mobile no docked
sidebar, `results-filters`, or `results-quick-filters` renders, opening the drawer shows all eight filter sections with no page horizontal overflow, the title filter and an indexer toggle row both narrow the visible rows from inside
the drawer, and closing it restores the table's width and x-position exactly.

### Verification Basis

- Baseline: `89286c376`.
- Command coverage:
  - `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `VITE_OUT_DIR=... npm run build`: `SearchResults.tsx`, `SearchResults.test.tsx`, `RefineSidebar.tsx`, `RefineSidebar.test.tsx`,
    `filterControls.tsx`, `refineStyles.ts` (and `resultTable.ts` / `resultTable.test.ts`, unchanged, listed for completeness because the same suite covers them).
  - `tests/system` `npx tsc --noEmit` and the Playwright run: the six files above plus `tests/system/tests/results.spec.ts`.
  - `npm run validate:migration`: `docs/frontend-migration/FEATURES.yaml` (plus this packet's `Status` line and `STATUS.md`, which are lifecycle documentation and were finalized before it ran).
  - `npm run check:api`, `git diff --check`: no task-owned implementation or test file affects them beyond the ones above.
- File-content manifest (SHA-256):
  - `core/ui-react/src/features/search/results/SearchResults.tsx`: `55b71d83e4f090a5b73b60ecf325b10e3e91097267dee3ba1d208947d1212906`
  - `core/ui-react/src/features/search/results/SearchResults.test.tsx`: `8afa4bb6e8d1913b6432cca524b44c141ad6cc34db62785507eb7761a6c9720e`
  - `core/ui-react/src/features/search/results/RefineSidebar.tsx`: `56f1c7d205073c6c7e63e8f0c1b6f87086bbb226a6e8cbd216e18d0166ac925d`
  - `core/ui-react/src/features/search/results/RefineSidebar.test.tsx`: `6db63c91034431e842595370ccd2749f90471e7198c7ba7c1759ac481f18b166`
  - `core/ui-react/src/features/search/results/filterControls.tsx`: `c3fa5b227c8912688fa5598958946a4157d5e51972cfe47e925f395c96362615`
  - `core/ui-react/src/features/search/results/refineStyles.ts`: `53cf83578bb387e33181e47f1025462894aab0078e6a16c6f23fa9217a2a8347`
  - `core/ui-react/src/features/search/results/resultTable.ts`: `18f0ef7b2d87a6b66d13206019568f9c0c189e2edbb4c3e72581468572ad46a9` (unchanged from baseline)
  - `core/ui-react/src/features/search/results/resultTable.test.ts`: `5d185adf783ac21f632f5f855cdd3abffc636c38eab18a4a7c87f010520567f1` (unchanged from baseline)
  - `tests/system/tests/results.spec.ts`: `e81c198ea3a02a40ef772e917b9fa69b0122d469acd1404228cd4d8820559d5e`
  - `docs/frontend-migration/FEATURES.yaml`: `0a76b92046db2f9bc6dbafe0159800c71da1e969dd9c19668e33f08c3f78d097`
- Completed after the last change to each command's listed files: `yes` for every command. One correction was made after an earlier full pass — restoring a stray-dropped `age: "3 days"` fixture line in `results.spec.ts` — and both
  commands whose evidence that file affects (`tests/system` `npx tsc --noEmit` and the Playwright run) were rerun afterwards; the table above records only those reruns. The `core/ui-react` commands are unaffected by that file and were
  not rerun. The production bundle was rebuilt before the recorded Playwright run and no implementation file changed after it.
- Task-owned changes after verification: this packet's `Handoff` section and its `Status: in_progress` -> `Status: review` line — documentation and lifecycle only. `docs/frontend-migration/FEATURES.yaml` and `STATUS.md` were both final
  before the last `npm run validate:migration`, which is the only command their contents affect; the `Status` flip to `review` was required *by* that validator (it rejects an `in_progress` packet listed under `STATUS.md`'s Review
  section), so the final validator run above is the one that observed `review`.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: `None`.
- Development dependencies added, removed, or changed: `None`.

### Architecture Decisions

- **ADR-0009** (full mock fidelity) governs this task and reverses ADR-0008's Option B "keep the inline filters" reading. Applied literally: the sidebar is the sole filter surface, Category/Indexer are toggle rows, and the panel takes
  the mock's palette/typography/density. The mock's `<aside>` values live in a new feature-scoped `refineStyles.ts` with a sourcing comment, exactly as FM-044 kept the mock's search-bar-row literals local; everything the theme already
  carries (the brand teal, `monoFontFamily`, the 8px radius, `textTransform: "none"`) is consumed from `theme.ts`, which was read but not edited.
- **ADR-0002** (MUI-only presentation): every new control is MUI — `Button` for the toggle rows and pills, `TextField` for the recessed inputs, `Drawer` for the below-`sm` presentation, `Stack`/`Box`/`Typography` for layout. No new
  component system and no raw HTML form control.
- **ADR-0004 / ADR-0006**: behavioral, accessibility, and visual gates kept independent. The visual records stay `proposed` with evidence only; nothing here treats a passing behavioral or geometry assertion as human visual acceptance.
- **ADR-0007** is historical for this surface; its legacy-grey tokens are superseded by ADR-0009 for the sidebar.
- `ADR REQUIRED` proposal triggered: `None`.

### Assumptions

- The mock's `<sc-if>`/`{{ }}` markup is a prototype template, not shippable code; its measured values (`248px`, `18px 16px 40px`, `22px` section gaps, `rowStyle()`'s and `chip()`'s exact colors, `7px 9px`, `1px`, `11.5px` monospace
  counts, `#1c2224` inputs) are the contract, its templating is not.
- The mock's `<aside>` has no collapse control and no Size/Age/Grabs Apply/Clear buttons. Both are pre-existing capability (`refine-sidebar-toggle` from FM-039; `number-filter-{apply,clear}-refine-*` from FM-034's shared control) and
  were kept and restyled rather than dropped, since removing them would remove capability the packet forbids removing.
- `NumericFilter`'s two fields now carry the mock's `min`/`max` placeholders instead of MUI floating `Min`/`Max` labels, which two side-by-side fields in a ~216px panel cannot hold. Their accessible names are `Size (MB) minimum`,
  `Age (days) maximum`, and so on — the exact names the removed non-`stacked` mode used, and strictly more specific than the three-times-repeated bare `Min`/`Max` they replace. Verified by repository-wide search that no test, spec, or
  registry selector depended on the `Min`/`Max` names.
- `COMPONENTS.yaml` and `APIS.yaml` were searched before writing any new module; `refineStyles.ts` is a feature-scoped constants module with a single feature's two consumers, not a shared abstraction, so neither registry needed a new
  ID. Both are unchanged.
- The new module is named `refineStyles.ts` rather than the obvious `refineTokens.ts` because the repository's root `.gitignore` carries a blanket `*token*` rule that silently excludes any such path from version control (confirmed with
  `git check-ignore -v`). The reason is recorded in the file's own header comment so it is not "corrected" later.

### Temporary Exceptions And Debt

- **Disclosed scope reading, requiring coordinator ratification.** `Files Allowed To Modify` licenses "this task's own visual-evidence block, plus the three pre-existing tests" in `results.spec.ts`. This task's visual contract defines
  the states `refine-sidebar-only-surface`, `refine-toggle-row-category-indexer`, and `refine-sidebar-mobile-drawer` and replaces `F-SEARCH-SORT-FILTER`'s two `snapshots` — i.e. it supersedes the sidebar's existing visual-evidence
  block, `"should provide deterministic refine-sidebar visual evidence across desktop and mobile"` (FM-039's). That block was therefore rewritten in place as this task's own, rather than added beside it. This is not optional: the
  existing block asserts `await expect(page.getByTestId("results-filters")).toBeVisible()` at mobile and a docked mobile sidebar, both of which this task's Acceptance explicitly removes, so leaving it untouched would have left a
  guaranteed failure. No other test or assertion in the file was changed: the three named tests were retargeted at the sidebar's equivalent controls, and the two other visual-evidence blocks
  (`F-SEARCH-RESULTS`'s and `F-SEARCH-GROUP-SELECTION`'s) were left byte-identical apart from the one `freetext-filter-title` -> `refine-filter-title` retarget the packet mandates in the first of them.
- **Superseded narrow captures left on disk.** `tests/system/visual-evidence/F-SEARCH-SORT-FILTER/refine-sidebar-desktop.png` and `refine-sidebar-mobile.png` (FM-039's, no longer referenced by any record) remain in the git-ignored
  evidence directory because deleting them is outside this task's write scope. Impact: none on any gate; a reader could mistake them for current evidence. Removal condition: any later task owning that directory, or a coordinator
  cleanup. No tracked file references them.
- No other workaround, suppression, or weakened check. Nothing was skipped, deleted, or marked as expected-to-fail.

### Registry And Documentation Updates

- **`F-SEARCH-SORT-FILTER`** — stays `visual.status: proposed` (it was already `proposed`; no acceptance existed to demote). Its `note` is replaced with FM-045's, naming what changed and disclosing every selector removal. `contract`
  rewritten: `setup` describes this task's three-result deterministic fixture; `states` are now `refine-sidebar-only-surface`, `refine-toggle-row-category-indexer`, `refine-sidebar-mobile-drawer`, `right-aligned-sortable-header`,
  `refine-sidebar-expanded`, `refine-sidebar-collapsed`, `refine-counts-and-type-chips` (`inline-column-header-filters` and `quick-filter-row` removed with the surfaces they described); `viewports` unchanged (desktop 1280x800, mobile
  390x844); `geometry_checks` rewritten to the nine checks the spec actually asserts; `evidence` unchanged; `snapshots` replaced by `toggle-row-sidebar-desktop.png` and `refine-sidebar-mobile-drawer.png`. A second `variance` is added
  (`proposed`) recording that the React target no longer offers per-column-header filters where the legacy view still does, and why that is not a lost capability. `selectors`: removed `header-filter-title`,
  `header-filter-{{column}}`, `header-filter-{{column}}-toggle`, `header-filter-{{column}}-options`, and the four `number-filter-{min,max,apply,clear}-header-{{column}}` entries; added `refine-sidebar-drawer`, `refine-sidebar-close`,
  `refine-category-option`, `refine-indexer-option`. **Deliberate deviation from the packet's literal removal list, disclosed:** `freetext-filter-{{column}}`, `filter-toggle-indexer`, `filter-toggle-category`, and
  `filter-toggle-{size,grabs,age}` were **kept**, because each is still a live selector of the *legacy* AngularJS search-results view this same record documents (`core/ui-src/html/states/search-results.html` lines 296/305/314,
  `core/ui-src/html/dataTable/columnFilterFreetext.html`) and is still exercised by three passing legacy-shell tests in `results.spec.ts`; deleting them would have made the record factually wrong about the legacy side. Their removal
  from the *React* target is stated explicitly in the `note` instead. (`results-filters` and `results-quick-filters`, also named by the packet, were never in this record's `selectors` list.) `tests`, `target`, `parity`, `gaps`, `task`,
  and `backlog` intentionally unchanged and still accurate. **Human acceptance pending.**
- **`F-SEARCH-RESULTS`** — stays `visual.status: proposed`. `note` replaced with FM-045's (simplified header row; retired mobile filter rows; no row/cell/summary/selection change). `states` gained `simplified-sortable-header` and
  `refine-sidebar-mobile-drawer`; `geometry_checks` updated: the category/indexer row check now says "single non-checkbox clickable element", the stale "at mobile the sidebar is collapsed, results-filters is visible" check is replaced
  by the drawer check, and a header-row check is added. `setup`, `viewports`, `evidence`, `variances`, `selectors`, `tests`, `target`, `parity`, `gaps`, `task`, `backlog` intentionally unchanged. **Human acceptance pending.**
- **`C-RESULT-TABLE`** (`COMPONENTS.yaml`, not in this task's write scope) — explicitly confirmed unchanged and still accurate: `responsibility` still reads "... paging, grouping, filtering, sorting, selection, and presentation using
  TanStack primitives" (filtering moved surface, not owner), `legacy` and `target` (`core/ui-react/src/features/search/results`, the directory this task edits) are unchanged, `consumers` still lists `F-SEARCH-RESULTS` and
  `F-SEARCH-SORT-FILTER`, `classification: feature_specific` and `state: partial` are unchanged, and its `task: FM-012` / `backlog: deferred` ownership is unchanged — the remaining partial-parity gap is not one this task closes or
  widens. No edit was required, and none was made.
- `APIS.yaml`: intentionally unchanged — no API wrapper was created, changed, or newly consumed.
- `STATUS.md`: FM-045 moved to `Review`, and the ADR-0009 batch paragraph updated to record what landed, the resolved inherited debt, and the outstanding human visual acceptance.
- `GUI-STATUS.md`: intentionally unchanged by this agent — reconciling it is the coordinator's own write after review, per README workflow step 9. React availability and GUI-selection behavior did not change.

### Follow-Up Work

- **Human visual acceptance** of `F-SEARCH-SORT-FILTER`'s and `F-SEARCH-RESULTS`'s proposed baselines and of both `F-SEARCH-SORT-FILTER` variances, per ADR-0006. Independent of technical review; not suppliable by any agent.
- **FM-046** now has a simpler header row to work against, as this packet's Boundary Rationale intended, and still owns the toolbar's selection/download regions and the `DownloadActions` restyle.
- **FM-042**'s sticky header can adopt the mock's exact 42px header height on top of the 6px header padding this task introduced; deliberately not pursued here.
- **Optional:** `refineStyles.ts`'s `#1c2224` recessed input surface and `rgba(255,255,255,0.1)` control hairline duplicate two literals FM-044 defined locally in `SearchWorkspace.tsx`. A second consumer now exists, so promoting just
  those two into `theme.ts` as named surface tokens is defensible for whichever later packet owns that file. Not done here: `theme.ts` is explicitly out of scope.
- **The `Apply` buttons in the sidebar's Size/Age/Grabs sections still have no `onClick`** (filtering is live as you type; FM-034 shipped them that way and FM-039 carried them into the sidebar). Retained byte-for-byte because removing
  a control is a capability change this packet's Out Of Scope forbids, and `number-filter-apply-{{column}}` is a registry selector. Worth a decision in a later packet: either wire them or retire them with their selector.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer must specifically confirm no filtering capability available before this
task became unreachable after it, at every viewport — this is the highest-risk regression this task can introduce. The reviewer cannot supply the human visual acceptance the affected records require; that remains a human decision
independent of technical review, per ADR-0006.
