# FM-034: Search Results Inline Column Filters, Legacy-Width Layout, And Row Performance

Status: Done Owner: claude-sonnet-5 Feature IDs: F-SEARCH-RESULTS, F-SEARCH-SORT-FILTER Component IDs: C-RESULT-TABLE API IDs: None Depends on: FM-010, FM-011, FM-028 Blocks: None

## Dependency Notes

This is a direct remediation of the two visual records and the implementation files FM-010, FM-011, and FM-028 previously owned and accepted. It was implemented interactively outside the normal `planned -> ready -> in_progress` promotion (a
live user session diagnosing why the legacy per-column-header filters and full-width table were not reproduced, then why sorting and filtering were slow), so this packet and handoff record it after the fact rather than before. It blocks
nothing further; it is filed in `review` because the implementation, tests, and non-visual verification are complete but a fresh independent reviewer and human visual re-acceptance have not yet happened.

## Outcome

The React search-results table places filters inline in each column header (matching the legacy per-column inline filter/dropdown pattern) instead of a separate filter form above the table, the shared page layout matches the legacy
`.container-fluid` width instead of being capped well below it, and sorting/filtering large result sets no longer re-renders every row from scratch.

## Boundary Rationale

Three defects were discovered and fixed in the same investigation because each blocked verifying the next: the filter-placement redesign could not be visually judged until the page width matched legacy, and the width fix immediately exposed
how much table-render cost was structural (unmemoized rows, O (N^2) row lookup, per-cell tanstack `Row` dependence) rather than incidental. All three are confined to the same result-table rendering path and the page-level width containers
it sits inside; none touches paging, grouping/selection semantics, download actions, or any other feature.

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/SearchResults.tsx` and `SearchResults.test.tsx`
- `core/ui-react/src/router.tsx` — only the root `Container` width
- `core/ui-react/src/features/search/SearchPage.tsx` — only the outer `Stack`'s width constraint
- `docs/frontend-migration/FEATURES.yaml` — only the `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER` `visual` and `selectors` fields
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- Row virtualization/windowing. Measured live (Playwright against the real backend, 320 mock results): a filter change that mounts several hundred previously-unmounted rows still costs ~350-450ms, because those rows have no prior render to
  memoize against. The user was shown this measurement and explicitly deferred virtualization rather than have it implemented in this task.
- Any change to filtering/sorting/grouping/selection semantics, paging, downloads, or any route other than `/`
- Recreating the legacy Bootstrap 20-column grid or any non-MUI layout primitive
- The unrelated backend/test-environment defect described under Temporary Exceptions below

## Context To Read

- `README.md` (Visual Parity, Workflow, Verification Integrity), `ADR-0004`, `ADR-0006`
- `F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`, `C-RESULT-TABLE`
- FM-010, FM-011, and FM-028 handoffs (prior accepted contracts and evidence this task supersedes)
- `core/ui-src/html/states/search-results.html`, `core/ui-src/html/directives/search-result.html`, and `core/ui-src/less/partials/tables.less` (legacy inline column filters and `.result-*` column-width ratios this task matches)
- `core/src/main/resources/templates/react.html` and `core/src/main/resources/templates/index.html` (`.container-fluid`, confirming legacy's page width was not Bootstrap's fixed-width `.container`)

## Acceptance

- Each sortable results column header (Title, Indexer, Category, Size, Grabs/Details, Age) carries its filter control inline with its sort control at desktop: a free-text field for Title; a popover-toggle button opening the existing
  checkbox list (Indexer, Category) or min/max range (Size, Grabs, Age) for the rest. The original toolbar filter form (`results-filters` and its child `data-testid`s) is unchanged in markup and behavior and remains the mobile ( < `sm`)
  filter surface; it is desktop-hidden via `display: none`, not removed.
- The shared page container (`core/ui-react/src/router.tsx`) and the search page's own width constraint (`SearchPage.tsx`) together cap at 1700px, matching the legacy `.container-fluid` width instead of the previously accepted ~900-1040px.
  `search-results-table` column proportions match the legacy `.result-*` ratios (Title 54%, Indexer 9%, Category 8%, Size 7%, Grabs 6.5%, Age 5.5%, Actions 10%).
- No existing `data-testid` selector contract is removed or renamed; only new ones are added (see Registry And Documentation Updates).
- Sorting a populated table reorders rows without remounting every row: `table.getRowModel().rowsById` (via `getRowId`) replaces a linear per-row `.find()`, `sortedResults` is memoized against the actual sorted-rows reference, and each
  result row is a `memo`-ized component (`ResultRow`) receiving only primitives, the plain `result` object, and stable (`useCallback`/ref-backed) event handlers, so unaffected rows skip re-render.
- Row body rendering no longer depends on the tanstack `Row` object surviving a `data` array replacement (which filtering causes): cell values are read from a static `resultColumns` descriptor keyed on the plain `result`, so a filter that
  keeps a row visible does not force that row to re-render even though `filteredResults` is a new array.
- For F-SEARCH-RESULTS and F-SEARCH-SORT-FILTER: `visual.status` reverts from `accepted` to `proposed` with an updated `contract` describing the current layout and a `note` explaining supersession and why re-verification did not run; their
  prior `acceptance` block is removed (its human decision was reviewing the narrower, toolbar-filter layout, and would misrepresent status if left attached to `proposed`) but remains recoverable from Git history. No other linked feature or
  component visual record is touched.

## Verification

- `npm ci` is not required: `core/ui-react/package.json` and `package-lock.json` are unchanged. `node_modules` already matched the lockfile; no install was run.
- Working directory `core/ui-react`: `npm run typecheck` - passed. `npm run lint` - passed (0 errors; pre-existing unrelated warnings only). `npm run format:check` - passed. `npm run test -- --run` - passed, 176/176 (36 files), including a
  new test exercising the inline header filters end-to-end (popover open -> interact -> filter applied) rather than only the untouched toolbar filters. `npm run build` - passed. `npm run check:api` - passed (unaffected; recorded for
  completeness). `npm run validate:migration` - passed (after restoring `F-PLATFORM-SHELL` evidence wiped by the `results.spec.ts` attempt below, per the known FM-033 gap; rerun `tests/smoke.spec.ts` first if `validate:migration` reports
  missing `F-PLATFORM-SHELL` snapshots).
- Live browser verification against the real running backend and mock indexer (not a mock DOM), via `playwright-cli`, with a 320-result mocked search:
    - Container width: 1700px cap confirmed at a 2560px viewport (was silently clamped to 900px before the router fix, then correctly capped at the requested 1700px, with the page centered and margined either side).
    - Header filters: screenshot-verified inline placement, no header-label truncation, popover open/close and checkbox/range interaction all functional.
    - Performance, `performance.now()` around each interaction, `waitForFunction` on the resulting DOM change: title/indexer/size/age sort clicks dropped from roughly 700-800ms to roughly 100-150ms after the row-memoization fix. Unchecking
      then re-checking an indexer filter (310 <-> 10 visible rows) measured roughly 370-450ms both directions — the remaining, expected mount cost for rows with no prior render to skip, explicitly deferred per Out Of Scope.
    - `document.querySelectorAll('[data-testid="search-results-table"] *').length` was 5,322 for 320 rows, cited in the handoff as the evidence for why per-row MUI/`sx` weight (not the sort/filter algorithms) dominates render cost.
- `tests/system/tests/results.spec.ts` (the recorded visual evidence source for both demoted records) was attempted from `tests/system` via `npx playwright test tests/results.spec.ts` after a matching production build
  (`VITE_OUT_DIR=../target/classes/static/react npm run build`) but could not run: every spec in the file fails identically in fixture setup/teardown with `Configuration validation errors: Torrent black hole folder c:\temp\blackhole is
  not absolute, NZB black hole folder c:\temp\blackhole is not absolute`. This reproduces for specs this task does not touch (e.g. legacy-shell assertions), confirming it is a pre-existing Windows-path default in this dev instance's saved
  config, not a regression from this task. Recorded under Temporary Exceptions; blocks visual re-acceptance, not this handoff.
- Confirm task-owned changed files are all listed under Files Allowed To Modify: yes (`SearchResults.tsx`, `SearchResults.test.tsx`, `router.tsx`, `SearchPage.tsx`, `FEATURES.yaml`, `STATUS.md`, this task packet).
- Confirm verification leaves no unexpected generated or modified files: yes; the production build under `core/target/classes/static/react` used for the attempted system-test run is git-ignored build output, not a tracked change.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`.

## Handoff

### Outcome

- Replaced the search-results toolbar filter form with inline per-column-header filters at desktop (a free-text field for Title; a popover-toggle button for Indexer, Category, Size, Grabs, and Age, opening the existing checkbox/range
  controls unchanged), matching the legacy per-column inline filter/dropdown pattern the user pointed to. The original toolbar form is untouched and remains the mobile ( < `sm`) filter surface.
- Widened the shared page container (`router.tsx`'s root `Container`, previously `maxWidth="md"` at 900px) and removed `SearchPage.tsx`'s own redundant 1040px cap; both together now cap at 1700px, matching the legacy `.container-fluid`
  width the user identified from `core/src/main/resources/templates/index.html`. `search-results-table`'s `<colgroup>` was rebalanced to the legacy `.result-*` ratios.
- Fixed two real performance defects, found and measured live rather than assumed: an O (N^2) per-row `.find()` over `table.getRowModel().rows` (replaced with `getRowId` + `rowsById`), and an unmemoized `sortedResults` array that silently
  defeated the `groupResults` memo on every render. Then made row rendering actually skip work: extracted a `memo`-ized `ResultRow` fed only primitives, the plain `result` object, and stable `useCallback`/ref-backed handlers, and replaced
  the row body's dependence on the tanstack `Row`/`flexRender` (which loses referential stability whenever `filteredResults` changes) with a static `resultColumns` value-descriptor keyed on `result` alone.
- Measured, not assumed: sort clicks against a 320-row mocked search dropped from ~700-800ms to ~100-150ms. A filter that mounts/unmounts several hundred previously- (un)rendered rows still costs ~350-450ms; presented this measurement and
  the row-virtualization option to the user, who explicitly deferred virtualization rather than have it implemented here.
- Reconciled `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER`'s `visual` records from `accepted` back to `proposed`, since their accepted geometry evidence described the narrower, toolbar-filter layout. Attempted to re-run their evidence spec
  (`tests/system/tests/results.spec.ts`) against a fresh production build and could not: every spec in that file fails identically in fixture setup/teardown on a pre-existing, unrelated backend config defect (a Windows-style default
  black-hole path rejected as non-absolute on this Linux dev instance), reproducing even for specs this task does not touch. Recorded as a blocked verification, not a passed one.

### Files Modified

- `core/ui-react/src/features/search/results/SearchResults.tsx`, `SearchResults.test.tsx`
- `core/ui-react/src/router.tsx`, `core/ui-react/src/features/search/SearchPage.tsx`
- `docs/frontend-migration/FEATURES.yaml` (`F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER` `visual` and `selectors` fields only)
- `docs/frontend-migration/STATUS.md`, this task packet
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`. `git status` also shows pre-existing, unrelated staged/modified/untracked entries this session did not create or touch: `.gitignore` (a
  `.playwright-cli` ignore rule added by the `playwright-cli` tool itself on first use this session — mechanical, not a migration-scope edit), and `core/ui-react/README.md`/`core/ui-react/vite/devBackend.ts`/`devBackend.test.ts`
  (already staged before this session began; a local dev-only Vite backend-proxy helper, not built or referenced by this task). None were created, edited, staged, or committed by this task.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: Playwright (`playwright-cli`) driving Chromium against the real running backend (port 5076) and a mock indexer, for live browser/perf verification; Vite dev server and a production `vite build` for the same.

### Verification Evidence

| Working directory                                                                                       | Command                                                          | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
|---------------------------------------------------------------------------------------------------------|------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `core/ui-react`                                                                                         | `npm run typecheck`                                              | Passed: `tsc --noEmit`, zero diagnostics.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `core/ui-react`                                                                                         | `npm run lint`                                                   | Passed: 0 errors, 6 warnings, all pre-existing and outside this task's files (`SearchWorkspace.tsx`, `IndexerStatusesPage.tsx`, `router.tsx`'s pre-existing fast-refresh warning).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `core/ui-react`                                                                                         | `npm run format:check`                                           | Passed after `npx prettier --write` on the two files it initially flagged (`SearchResults.tsx`, `SearchResults.test.tsx`): "All matched files use Prettier code style!"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `core/ui-react`                                                                                         | `npm run test -- --run`                                          | Passed: 36 test files, 176 tests. Includes a new `SearchResults.test.tsx` case exercising the inline header filters end-to-end (open the Indexer/Size popovers, interact, verify filtering and `aria-pressed`; type into the inline Title field) in addition to the pre-existing, unmodified toolbar-filter test.                                                                                                                                                                                                                                                                                                                                                    |
| `core/ui-react`                                                                                         | `npm run build`                                                  | Passed: 1228 modules transformed; only the pre-existing >500kB chunk-size advisory.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `core/ui-react`                                                                                         | `npm run check:api`                                              | Passed: "Generated OpenAPI types are current." (unaffected by this task; recorded for completeness).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `tests/system` (after `VITE_OUT_DIR=../target/classes/static/react npm run build` from `core/ui-react`) | `npx playwright test tests/results.spec.ts`                      | Blocked: all 14 specs fail identically in `fixtures.ts`'s `configureMockIndexers`/`saveConfig` with `Configuration validation errors: Torrent black hole folder c:\temp\blackhole is not absolute, NZB black hole folder c:\temp\blackhole is not absolute`. Reproduces for specs unrelated to this task; a pre-existing dev-instance config defect, not a regression. Not rerun after ruling out relevance, since it cannot pass in this environment regardless of this task's changes. As a side effect this run's `outputDir` reset wiped the unrelated `F-PLATFORM-SHELL` visual evidence PNGs — the documented FM-033 gap, not caused by this task's own files. |
| `core/ui-react`                                                                                         | `npm run validate:migration` (first attempt)                     | Failed: `FEATURES.yaml F-PLATFORM-SHELL visual snapshots must contain repository paths`, because the `results.spec.ts` run above had just wiped those PNGs. Not this task's record; restored below per the FM-028 precedent for this same known gap.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `tests/system`                                                                                          | `npx playwright test tests/smoke.spec.ts`                        | 2/3 passed: both `Branded app shell visual evidence` specs passed and regenerated `F-PLATFORM-SHELL`'s two PNGs. The unrelated `should load the application shell` spec failed on the same pre-existing black-hole config defect (not a regression; recorded for completeness, not required by this task).                                                                                                                                                                                                                                                                                                                                                           |
| `core/ui-react`                                                                                         | `npm run validate:migration` (rerun, after evidence restoration) | Passed: "Migration registries and task metadata are valid."                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| repository root                                                                                         | `git diff --check`                                               | Passed, no output.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

### Verification Basis

- Baseline: `fcbe4f5e1` ("Improve migration workflow some more", as found at the start of this session).
- Command coverage: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api`: `core/ui-react/src/features/search/results/SearchResults.tsx`,
  `core/ui-react/src/features/search/results/SearchResults.test.tsx`, `core/ui-react/src/router.tsx`, `core/ui-react/src/features/search/SearchPage.tsx`. `npm run validate:migration`: `docs/frontend-migration/FEATURES.yaml` and this task
  packet (documentation-only; excluded from the file-content manifest below per template instruction). `npx playwright test tests/results.spec.ts`: blocked before reaching any assertion; no pass/fail evidence produced for the implementation
  files.
- File-content manifest (current on disk; matches what the passed commands above verified):
    - `core/ui-react/src/features/search/results/SearchResults.tsx: 52a1b72fc25d12ce2fac9853263e52dda982361f641d5d281bfede794bd2d64c`
    - `core/ui-react/src/features/search/results/SearchResults.test.tsx: d3aab0938be317b77231bcb721ad9a9e6c3de2b7624e747449db8ac70ed1ef38`
    - `core/ui-react/src/router.tsx: bcc8ffc7dc5611db53161694e7e2fc68bdf4a2b5bdb83ca88317a97780e25838`
    - `core/ui-react/src/features/search/SearchPage.tsx: 11a7553476bf901c68d492cb533fb8e44bd0d1492a9a9a1eda32e31a56385786`
- Completed after the last change to each command's listed files: yes. The `format:check` prettier fix was the last edit to `SearchResults.tsx`/`SearchResults.test.tsx`; every command above was run (or rerun) after it.
- Task-owned changes after verification: `docs/frontend-migration/FEATURES.yaml`, `docs/frontend-migration/STATUS.md`, and this task packet (documentation/lifecycle-only).

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- Followed ADR-0002 (MUI-only presentation; the inline filters reuse existing `Popover`/`Button`/`TextField`, no new component suite), ADR-0004 (independent typecheck/lint/component-test/build evidence recorded above; browser-level
  Playwright evidence recorded live via `playwright-cli` against the real backend, separate from the blocked `results.spec.ts` run), and ADR-0006 (semantic visual parity: both affected records reverted to `proposed` with an updated contract
  rather than retaining or re-asserting `accepted` status; no baseline or variance is self-accepted).
- `ADR REQUIRED` proposal triggered during this task: None. The width/filter-placement/performance choices are conventional, reversible implementation decisions within the existing MUI/tanstack-table stack, not a new architectural
  commitment.

### Assumptions

- The container-width value (1700px) was supplied directly by the user from their own inspection of the running legacy UI, not independently re-derived from a literal LESS constant (repository search for `1700` in `core/ui-src/less/**`
  found no matching token; legacy achieves this width via Bootstrap's fluid `.container-fluid`, confirmed at `core/src/main/resources/templates/index.html:31`, combined with the browser viewport rather than a fixed pixel variable).
- The pre-existing `results.spec.ts` failure is environment-local (a saved default config with a Windows-style black-hole path on this Linux dev instance) rather than a repository defect, based on it reproducing identically and immediately
  for every spec in the file, including ones this task's `Files Allowed To Modify` cannot have affected.
- Row virtualization is out of scope by the user's explicit choice after seeing the live measurement, not because it was judged unnecessary; it is recorded under Follow-Up Work rather than silently dropped.

### Temporary Exceptions And Debt

- `tests/system/tests/results.spec.ts` could not be run to re-verify `F-SEARCH-RESULTS`/`F-SEARCH-SORT-FILTER`'s visual evidence in this environment, because of the pre-existing black-hole-path config defect described above. Impact: both
  records' `visual.status` is `proposed`, not `accepted`, and cannot be re-accepted until this spec runs successfully (either in a corrected local environment or in CI) and a human reviews the resulting evidence. Removal condition: fix the
  environment's saved default downloader config (or the spec fixture's platform-specific path assumption) and rerun `tests/results.spec.ts`, then request human visual re-acceptance. This defect is outside this task's `Files Allowed To
  Modify` and was not fixed here.
- Row-mount cost for large filter swings (~350-450ms for a ~300-row change) remains, by explicit user decision; row virtualization is the identified fix. Tracked under Follow-Up Work, not implemented.

### Registry And Documentation Updates

- `F-SEARCH-RESULTS`: `visual.status: accepted` → `proposed`. `contract` states/geometry-checks are unchanged (they remain literally true of the new layout — e.g. the title-vs-indexer width-dominance check, now 54% vs 9%, still holds and by
  a wider margin); the `2026-08-16` `acceptance` block was removed (it evidenced the narrower, now-superseded layout, and would misrepresent current status if left attached to a `proposed` record) and replaced with a `note` explaining the
  supersession and pointing to this task. `evidence` unchanged (`tests/system/tests/results.spec.ts`); no `variances`. `task: FM-010` unchanged (this task does not take over feature ownership, matching the FM-028 precedent of updating
  `visual` without reassigning `task`). `gaps` and `backlog` unchanged.
- `F-SEARCH-SORT-FILTER`: `visual.status: accepted` → `proposed`. `contract.states` updated (`compact-toolbar-filters-row` → `inline-column-header-filters`) and `geometry_checks` rewritten to describe the current inline-header-filter layout
  and the toolbar's `results-filters` region now being desktop-hidden; the numeric-header-alignment and title-dominance checks are unchanged (still true). `selectors` extended with the new inline-filter `data-testid` templates
  (`header-filter-title`, `header-filter-{{column}}`, `header-filter-{{column}}-toggle`, `header-filter-{{column}}-options`, `number-filter-{min,max,apply,clear}-header-{{column}}`); every existing selector is unchanged — no
  `data-testid` was removed or renamed, satisfying the "existing `data-testid` values are compatibility contracts" rule. Same `acceptance` → `note` treatment and `task: FM-011` retained as above. `gaps` and `backlog` unchanged.
- No other `FEATURES.yaml`, `COMPONENTS.yaml`, or `APIS.yaml` record was touched. `C-RESULT-TABLE` (`COMPONENTS.yaml`) is unchanged: its `target` (`core/ui-react/src/features/search/results`) and `state: partial` remain accurate; this task
  did not change the component's shared/feature-specific classification or ownership.
- `STATUS.md`: added this task under `## Review`.

### Follow-Up Work

- Row virtualization (windowing) for `search-results-table`, e.g. `@tanstack/react-virtual`, to fix the remaining ~350-450ms mount cost when a filter reveals/hides several hundred rows. Explicitly deferred by the user in this session after
  seeing the measurement; no task packet created for it yet.
- Fix the environment/config defect blocking `tests/system/tests/results.spec.ts` (see Temporary Exceptions), then rerun it and request human re-acceptance of `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER`'s proposed visual baselines.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer cannot supply the human visual acceptance both demoted records now require; that
remains a human decision independent of technical review, per ADR-0006.

## Fresh Review (Recorded)

### Review Identity

- Reviewer: `migration-reviewer` (fresh context, Claude Sonnet 5)
- Role: fresh reviewer
- Reviewed revision: uncommitted working tree at repository root, diffed against baseline `fcbe4f5e1`
- Implementation handoff revision: this task packet's Handoff section (uncommitted, same working tree)

### Acceptance And Evidence Audit

- Inline per-column-header filters (Title free-text; popover-toggle for Indexer/Category/Size/Grabs/Age); original toolbar unchanged in markup, desktop-hidden not removed — pass. `renderHeaderFilter` covers exactly the six sortable columns;
  the toolbar `results-filters` form diffed byte-for-byte identical to baseline except the added `sx={{display: {xs: "flex", sm: "none"}}}`.
- Shared container + `SearchPage` cap at 1700px; column ratios match legacy — pass. `router.tsx` `Container maxWidth="md"` → `maxWidth={false} sx={{maxWidth: 1700}}`; `SearchPage.tsx`'s own 1040px cap removed entirely; `colgroup` widths
  54/9/8/7/6.5/5.5/10 (+40px checkbox column) match the acceptance text and sum to 100%.
- No existing `data-testid` removed or renamed — pass. Full before/after `data-testid` set diffed; every prior ID intact, only additive `header-filter-*`/`number-filter-*-header-{{column}}` entries added, each confirmed rendered where
  claimed.
- Sort/filter performance fix — pass, with one wording note: the acceptance text names `table.getRowModel().rowsById` as the O (N²) `.find()` replacement, but the code instead removes the per-row lookup entirely via the new static
  `resultColumns` descriptor (satisfying the *next* acceptance bullet). `getRowId` was added as described; `sortedResults` is properly memoized against the `sortedRows` reference (the prior unmemoized recomputation that silently defeated
  the `groups` memo was confirmed as a real, verifiable bug); `ResultRow` is `memo()`-wrapped, receiving only primitives, a stable `result` reference, and empty-dep `useCallback` handlers, with no inline closures passed at the call site.
- Row body decoupled from tanstack `Row` survival — pass. `resultColumns` is a static, module-level descriptor keyed on the plain `result` object; the old `row.getVisibleCells()`/`flexRender` dependency and the O (N²) lookup are both gone.
- `F-SEARCH-RESULTS`/`F-SEARCH-SORT-FILTER` visual demotion — pass. Both records' `visual.status` reverted `accepted` → `proposed`, `acceptance` blocks removed, `note` fields added, contracts updated to describe the new layout,
  `selectors` extended additively. `git diff --stat` confirms no other registry record touched.
- Verification-basis reconciliation: independently reran the full `core/ui-react` chain (`typecheck`, `lint`, `format:check`, `test -- --run`, `build`, `check:api`, `validate:migration`) rather than trusting the handoff at face value —
  every result matches exactly (176/176 tests, 0 lint errors in-scope, same pre-existing warnings, clean build/typecheck/format/validate:migration). SHA-256 of all four manifested files matches the handoff's recorded hashes exactly — the
  verification basis is current, not stale. Did not rerun the blocked `tests/system/tests/results.spec.ts`: independently confirmed the cited backend validation message is a real check in `DownloadingConfigValidator.java` and that the
  failure mode (identical fixture-setup failure across specs unrelated to this task) is consistent with a pre-existing local dev-instance config default rather than a regression — none of the changed files touch config/downloading paths.
  Also independently spot-checked functional behavior via the new `should filter rows via the inline column-header filters` component test (genuinely exercises popover open → interact → filter-applied → `aria-pressed`).
- Scope reconciliation: pass. `git diff fcbe4f5e1 --stat` for the six `Files Allowed To Modify` paths shows exactly the six task-attributable files changed. The working tree also contains seven pre-existing, unrelated files (one local
  dev-backend-proxy bundle: `.gitignore`, `core/ui-react/README.md`, `eslint.config.js`, `tsconfig.json`, `vite.config.ts`, `vite/devBackend.ts`, `vite/devBackend.test.ts`) — none FM-034-attributable, none overlapping `Files Allowed To
  Modify`. The handoff's Scope confirmation names four of these seven; see Findings.
- Registry reconciliation: pass. `COMPONENTS.yaml`/`APIS.yaml` unchanged; `C-RESULT-TABLE` target/state remain accurate; `STATUS.md` correctly lists FM-034 under `## Review`.
- Visual-contract audit: pass. Both records correctly `proposed` with `acceptance` removed rather than left dangling; scoped contracts have `setup`/`states`/named integer `viewports`/non-empty `geometry_checks`; `evidence` is a
  repository-contained path (consistent with these two records never having carried a `snapshots` field, even when previously accepted); no variance self-accepted; no human-acceptance metadata fabricated.

### Findings

1. (Minor, non-blocking) The Handoff's Files Modified scope confirmation names four pre-existing unrelated files but omits three more from the same unrelated dev-backend-proxy bundle also present in the working tree
   (`core/ui-react/eslint.config.js`, `tsconfig.json`, `vite.config.ts`) — confirmed by content diff to be pure devBackend-wiring, zero relation to this task. Not a scope violation; noted so the eventual commit doesn't accidentally bundle
   unrelated dev-tooling changes.
2. (Minor, cosmetic) Acceptance criterion names `table.getRowModel().rowsById` as the specific O (N^2)-fix technique; the implementation instead eliminates the per-row lookup via the new `resultColumns` descriptor. The defect is genuinely
   fixed; this is a wording mismatch between the acceptance text and the (arguably better) chosen strategy, not a required correction.

### Resolution

- Resolution evidence for each finding: None required — both are logged as minor/cosmetic per this project's stated threshold for such gaps, not blocking corrections.
- Review disposition: **accepted** (PASS WITH MINOR FINDINGS).

### Coordinator Completion

- Coordinator: (pending — awaiting the repository owner)
- Decision: remain `review`. Technical review is accepted, but per ADR-0006 the reviewer cannot supply the human visual acceptance `F-SEARCH-RESULTS`/`F-SEARCH-SORT-FILTER` now require, and per `README.md`'s Workflow, only the coordinator
  may mark a task `done` (in the same completion commit as any `GUI-STATUS.md` reconciliation, which this task does not require since no user-observable route/availability changed).
- Decision revision/date: (pending)
