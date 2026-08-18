# FM-046: Results Toolbar And Bulk-Actions-Bar Mock-Fidelity Remediation

Status: done Owner: migration-implementer Feature IDs: F-SEARCH-GROUP-SELECTION, F-SEARCH-DOWNLOADS, F-SEARCH-SAVED, F-SEARCH-RESULTS Component IDs: C-RESULT-TABLE, C-DOWNLOAD-ACTIONS API IDs: None Depends on: FM-045 Blocks: FM-041

## Dependency Notes

Depends on FM-045 because both own `SearchResults.tsx`, which README's Parallel Work rules forbid two concurrent tasks from owning, and because FM-045 removes the inline column-header filters and shortens the header row this task's
own toolbar/table-header measurements should be taken against, not the pre-removal layout. It blocks FM-041 (the display-options menu, compact rows, and the "Show refine sidebar" entry) because that packet adds a further control
into the toolbar region this task restyles and needs its final palette/density shape, not an intermediate one, to avoid being redone. This is a **remediation** pass over FM-040's already-`done` selection/bulk-actions work, not a
rebuild: FM-040's tri-state-checkbox/caret-menu/bulk-actions-bar structure and interaction logic are sound and reused; only the visual layer changes.

## Outcome

The results toolbar's summary line, the tri-state select-all checkbox and its caret menu, the bulk-actions bar's "Send to downloader"/ZIP buttons, and the download-actions region (downloader select, black-hole, copy-links, Save
search) read at the mock's density and palette instead of ADR-0007's legacy-grey/green tokens, with no change to what any of them does.

## Boundary Rationale

The toolbar's summary, selection affordances, and download actions all render inside the same `results-toolbar` region and the same restyle pass that touches one touches the others' surrounding container, so reviewing them
separately would mean re-reviewing shared spacing/background changes multiple times. It is separate from FM-045 because filtering and selection/download are different capabilities on different feature records (FM-040 already
established this split; this task preserves it), and separate from FM-041 because display preferences are a different, later-added control in the same region, and from FM-042 because sticky positioning is unconditional layout
behavior with its own distinct failure mode, not a color or density change.

## Decision Dependencies

- Accepted ADRs governing this task: ADR-0002 (MUI-only presentation), ADR-0004 (testing and parity), ADR-0006 (semantic visual parity), ADR-0007 (historical; superseded for palette/typography/density by ADR-0009), ADR-0008
  (historical; superseded), ADR-0009 (full mock fidelity).
- Proposed or rejected ADRs blocking this task: None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/SearchResults.tsx`, `SearchResults.test.tsx`, `DownloadActions.tsx`, and new feature-scoped sibling modules and tests under `core/ui-react/src/features/search/results/`
- `tests/system/tests/results.spec.ts` — only this task's own visual-evidence block
- `docs/frontend-migration/FEATURES.yaml` — only `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-SAVED`, and `F-SEARCH-RESULTS`'s `visual`, `selectors`, and `tests` fields
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- `core/ui-react/src/app/theme.ts` and `core/ui-react/src/domain/downloads/**` (unchanged, as FM-040 also left them)
- `refine-sidebar` and every filter control (FM-045's territory; already restyled by the time this task runs)
- The display-options menu, compact rows, recency highlighting (FM-041), and sticky positioning (FM-042)
- Changing selection semantics, download request/response behavior, `selectVisibleResults`, `selectionStatus`, or any existing bulk capability (downloader select, downloader-category select, black-hole/save, copy-links, Save search)
  — restyle only
- Replacing the tri-state checkbox with a non-MUI control: restyle the existing MUI `Checkbox` (custom `icon`/`checkedIcon`/`indeterminateIcon` and `sx` sizing) to match the mock's small square, per ADR-0002's MUI-only boundary

## Context To Read

- `README.md` (Visual Parity, Workflow, Registry Rules, Verification Integrity), `ADR-0002`, `ADR-0004`, `ADR-0006`, `ADR-0007`, `ADR-0008` (historical), `ADR-0009`
- `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-SAVED`, `F-SEARCH-RESULTS`, `C-RESULT-TABLE`, `C-DOWNLOAD-ACTIONS`, and the FM-012, FM-013, FM-019, and FM-040 packets
- `core/ui-react/src/app/theme.ts` (read only, post-FM-043)
- `core/ui-react/src/features/search/results/SearchResults.tsx` (`SelectionMenu`, `results-toolbar`, `search-results-summary`) and `DownloadActions.tsx` in full
- `uimock/NZBHydra Search.dc.html` — the sticky toolbar block (`<div style="position:sticky;top:0...">`, ignore the sticky positioning itself — that is FM-042's scope) and the grid header's
  first column (`toggleAll`/`toggleSelMenu`/`showSelMenu` block) for exact colors, padding, and control shapes; note the `renderVals()` script's `chip`/`rowStyle`/selection color functions for the exact hex/oklch values used
- `tests/system/tests/results.spec.ts` and `tests/system/tests/visualEvidence.ts`

## Acceptance

- `results-toolbar` renders on a flat background (no elevated `Paper` surface/border), matching the mock's borderless bar, with `16px 0 14px` padding; `search-results-summary` keeps its existing loaded/filtered/available/rejected
  wording, with the `· N selected` fragment rendered in `primary.main` (the new teal), matching the mock's accent treatment.
- The tri-state select-all checkbox (header and mobile-reachable toolbar copy) renders as a small (`17x17px`) square with `5px` border radius: checked is filled `primary.main` with a check mark, indeterminate shows a dash, unchecked
  is transparent with a neutral `rgba(255,255,255,0.25)`-equivalent border — implemented via MUI `Checkbox`'s `icon`/`checkedIcon`/`indeterminateIcon` and `sx`, not a bespoke control (ADR-0002). The caret's `role="menu"` renders on the
  mock's popover surface (`#2a3133`, `9px` radius, drop shadow) with unchanged `Select all`/`Deselect all`/`Invert selection` entries, order, and outcomes.
- "Send to downloader" renders with `primary.main` background and `primary.contrastText` (or an equivalent dark-on-teal color) when enabled, `8px` border radius, `8px 14px` padding, `13px` font at weight `600`; when disabled it
  renders on the mock's neutral `#2a3133`-equivalent surface with muted text — using the control's real `disabled` semantics (unchanged from FM-040), not opacity alone. The NZB ZIP action renders as the mock's secondary outlined
  button (neutral surface, `1px` border, same radius/padding scale) in both states.
- `results-download-actions` (downloader select, downloader-category select, black-hole/save, copy-links, Save search) restyles to the same surfaces/radii/typography without any change to which controls are present, their order,
  or their behavior.
- No existing `data-testid` is removed or renamed; no new one changes any accessibility affordance already verified by FM-040's component tests (`aria-haspopup`, `aria-expanded`, `role="menu"`/`"menuitem"`, `indeterminate`,
  `disabled`) — confirm these still pass, not merely assume the restyle preserves them.
- Registry reconciliation: `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-SAVED`, and `F-SEARCH-RESULTS` (all already `proposed` since FM-040) get their `note`s and `contract`s extended to record the new mock
  palette/density, without re-litigating FM-040's own structural claims; never fabricate or re-date human acceptance.
- Visual contract (ADR-0006), asserted in `results.spec.ts`. States: `toolbar-mock-density`, `tri-state-checkbox-mock-square`, `bulk-actions-mock-buttons`. Viewports: desktop 1280x800, mobile 390x844. Geometry checks:
    - the toolbar renders with no elevated-surface border/shadow and no horizontal overflow at either viewport;
    - the tri-state checkbox's rendered bounding box is within a few pixels of the mock's `17x17px` target at both checked and unchecked states, with no scrollWidth overflow;
    - the enabled "Send to downloader" button's computed background color differs measurably from its disabled-state background color, and both differ from the page background;
    - the caret menu renders fully within the viewport with no page horizontal overflow at both viewports.
  Evidence: `tests/system/tests/results.spec.ts` plus narrow captures at `visual-evidence/F-SEARCH-GROUP-SELECTION/toolbar-mock-density-desktop.png` and `-mobile.png`.

## Verification

- `npm ci` only if `package.json`/`package-lock.json` change; otherwise the cheapest install that guarantees `node_modules` matches the lockfile. Record which install ran.
- Working directory `core/ui-react`: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api`, `npm run validate:migration` — each expected to pass.
- Working directory `tests/system`: `npx tsc --noEmit` — expected to pass (this task changes a spec).
- Working directory `tests/system`, after `VITE_OUT_DIR=../target/classes/static/react npm run build` from `core/ui-react`: `npx playwright test tests/results.spec.ts` and `npx playwright test tests/downloads.spec.ts`, expected to
  produce the proposed contracts' evidence.
- Repository root: `git diff --check` — expected to produce no output.
- Confirm task-owned changed files are all listed under Files Allowed To Modify, and that no other spec's fixtures or assertions were altered.
- Confirm verification leaves no unexpected generated or modified files; the git-ignored production build under `core/target/classes/static/react` is build output, not a tracked change.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`.

### Outcome

`results-toolbar` now renders on a flat background at the mock's own `16px 0 14px` padding instead of an elevated `Paper` (border/shadow removed); `search-results-summary` keeps its existing loaded/filtered/available/rejected wording
and gains an additive `· N selected` fragment in `primary.main` once something is selected. The tri-state select-all checkbox (both the header's `header-selection-menu` copy and the mobile-reachable `toolbar-selection-menu` copy) now
renders as a small 17x17px, 5px-radius square through MUI `Checkbox`'s `icon`/`checkedIcon`/`indeterminateIcon` props plus `sx` sizing (ADR-0002): filled `primary.main` with a check mark when checked, a dash when indeterminate,
transparent with a `rgba(255,255,255,0.25)` border when unchecked. The caret's `role="menu"` now opens on the mock's `#2a3133` popover surface with a 9px radius and drop shadow, with the same `Select all`/`Deselect all`/`Invert
selection` entries, order, and outcomes. "Send to downloader" renders filled `primary.main`/`primary.contrastText` when enabled (8px radius, `8px 14px` padding, 13px/600 text) and on the mock's neutral `#2a3133` surface with muted text
when `disabled` (real control semantics, not opacity); the NZB ZIP action renders as the mock's secondary outlined button (neutral surface, 1px border, `8px 12px` padding) in both states. `results-download-actions` (downloader select,
downloader-category select, black-hole/save, copy-links, Save search) restyles to the same neutral surface/radius/typography, with no change to which controls are present, their order, or their behavior. FM-040's tri-state-
checkbox/caret-menu/bulk-actions-bar structure and interaction logic are reused unchanged; every existing accessibility affordance (`aria-haspopup`, `aria-expanded`, `role="menu"`/`"menuitem"`, `indeterminate`, `disabled`) still passes
its existing component-test coverage unmodified. No `data-testid` was removed or renamed.

### Files Modified

- `core/ui-react/src/features/search/results/SearchResults.tsx` — `results-toolbar` container (`Paper` → flat `Box`), `search-results-summary`'s additive `· N selected` fragment, the tri-state select-all checkbox's square icon
  components and `sx` sizing, and the caret menu's popover `slotProps`.
- `core/ui-react/src/features/search/results/DownloadActions.tsx` — "Send to downloader" (primary) and NZB ZIP (secondary) button styles, and the `results-download-actions` region's Select/Button restyle.
- `core/ui-react/src/features/search/results/toolbarStyles.ts` (new) — shared mock-sourced surface/color constants for this region, following `refineStyles.ts`'s established pattern (including its `*token*` `.gitignore`-avoidance
  naming rationale).
- `core/ui-react/src/features/search/results/SearchResults.test.tsx` — two additional assertions inside the existing bulk-actions gating test, confirming `search-results-summary` carries no `selected` text with nothing selected and
  carries `1 selected` once something is.
- `tests/system/tests/results.spec.ts` — one new visual-evidence test, this task's own block: `should render the results toolbar and bulk-actions bar at the mock's density with a square tri-state checkbox and styled buttons`. No
  other test in this file was touched (pure addition; `git diff --stat` shows only insertions).
- `docs/frontend-migration/FEATURES.yaml` — `visual` `note`/`contract` extensions (states, geometry_checks, and for `F-SEARCH-GROUP-SELECTION` a new `snapshots` entry) on `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`,
  `F-SEARCH-SAVED`, and `F-SEARCH-RESULTS` only, per Files Allowed To Modify.
- `docs/frontend-migration/STATUS.md` and this task packet — lifecycle bookkeeping (`ready` → `in_progress` → `review`; `Upcoming` → `Active` → `Review`; batch-narrative sentence).

Scope confirmation: every task-owned path above is listed under Files Allowed To Modify. No `COMPONENTS.yaml`, `APIS.yaml`, `theme.ts`, `RefineSidebar.tsx`/filter-control file, or FM-041/FM-042 territory was touched.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: Playwright (`tests/system`, chromium) via `misc/run_gui_systemtest.py --runtime local` (documented real-backend launcher); Maven `mvn` (invoked by that launcher); Docker (sonarr/radarr fixtures, started by
  that launcher).

### Verification Evidence

| Working directory | Command | Result |
|-------------------|---------|--------|
| `core/ui-react` | **No install ran.** `node_modules` already matched the lockfile (neither `package.json` nor `package-lock.json` changed by this task); the launcher's own internal `npm ci` during its Maven build (below) additionally confirmed a clean install succeeds. | Passed. |
| `core/ui-react` | `npm run typecheck` | Passed (exit `0`, no output). |
| `core/ui-react` | `npm run lint` | Passed: `0 errors, 7 warnings` — the identical pre-existing warning set FM-043/FM-044/FM-045 all recorded (3 `react-refresh/only-export-components` in `SearchWorkspace.tsx`, 1 `react-hooks/incompatible-library` in `SearchWorkspace.tsx`, 1 `react-refresh/only-export-components` each in `IndexerStatusesPage.tsx` and `router.tsx`, 1 `react-hooks/exhaustive-deps` in `SearchPage.tsx`). Count and kind unchanged by this task; nothing suppressed or disabled. |
| `core/ui-react` | `npm run format:check` | Passed for task-owned files. The report lists the same 11 pre-existing, out-of-scope files FM-043/FM-044/FM-045 recorded (`.playwright-cli/*.yml` x5, `README.md`, `src/features/search/SearchPage.tsx`, `src/router.tsx`, `tsconfig.json`, `vite/devBackend.test.ts`, `vite/devBackend.ts`); none of this task's files. |
| `core/ui-react` | `npm run test -- --run` | Passed: **38 files, 214/214 tests** (same totals as the FM-045 baseline; this task added assertions inside an existing test rather than a new case). Nothing skipped, deleted, weakened, or suppressed. |
| `core/ui-react` | `npm run build` | Passed: `dist/assets/index.css` 12.30 kB, `dist/assets/index.js` 1,008.14 kB (gzip 308.33 kB), built in ~1.9s. |
| `core/ui-react` | `npm run check:api` | Passed ("Generated OpenAPI types are current."). |
| `core/ui-react` | `npm run validate:migration` | Passed ("Migration registries and task metadata are valid.") on the final tree, run last because `F-SEARCH-GROUP-SELECTION`'s two new `snapshots` paths must exist on disk (they only do after the Playwright run below) and because it cross-checks this packet's `Status` against `STATUS.md`'s section. |
| `tests/system` | `npx tsc --noEmit` | Passed (exit `0`, no output). |
| `core/ui-react` | `VITE_OUT_DIR=../target/classes/static/react npm run build` | Passed; emits the same unhashed `index.css`/`index.js` entry pair into the git-ignored production output the system test serves. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/results.spec.ts tests/downloads.spec.ts` (the documented real-backend launcher: Maven-built `core`/`mockserver` exec JARs — which itself reran `npm ci` + the `VITE_OUT_DIR` build inside `core`'s `generate-resources` phase — plus the sonarr/radarr Docker fixtures) | **Passed: 21 of 21, `21 passed (31.7s)`, zero failures.** All 17 pre-existing `results.spec.ts` cases (including the three visual-evidence tests owned by FM-045/FM-040/FM-010) and all 4 `downloads.spec.ts` cases passed unchanged, plus this task's own new case, `should render the results toolbar and bulk-actions bar at the mock's density with a square tri-state checkbox and styled buttons` (1.7s). |
| repository root | `git diff --check` | Passed (no output). |
| repository root | `git status --porcelain` | Passed: exactly the six task-owned modified paths plus the one new untracked module (`toolbarStyles.ts`), and no unexpected generated or modified file. `core/target/classes/static/react` and `tests/system/visual-evidence/**` are both git-ignored; `misc/.gui-systemtest-runs/<run>` was removed automatically on the launcher's successful exit. |
| `tests/system` | Narrow visual captures | Produced by the passing new test and referenced from `F-SEARCH-GROUP-SELECTION`'s `snapshots`: `visual-evidence/F-SEARCH-GROUP-SELECTION/toolbar-mock-density-desktop.png` (17,393 B) and `toolbar-mock-density-mobile.png` (19,096 B). An additional, non-registry-referenced capture, `toolbar-mock-density-desktop-bulk-actions.png`, documents the bulk-actions bar's own enabled/disabled button contrast at the same run. |

Geometry actually asserted by the new passing test, per the packet's Acceptance list: `results-toolbar`'s computed `box-shadow` is `none` and `border-top-width` is `0px` (no elevated Paper surface), with computed `padding-top`/
`padding-bottom` of `16px`/`14px`, overflow-free at both 1280x800 and 390x844; the select-all checkbox's rendered bounding box is within `[14, 20]` px on each axis (a few-pixel tolerance around the mock's 17x17px target) at both its
unchecked and checked states, with no `scrollWidth` overflow of its own box, at both viewports; `search-results-summary` carries the `· N selected` text once selected; the enabled `send-to-downloader` button's computed background
differs measurably from both its own disabled-state background and the page background; and the caret menu's `Paper` ancestor renders on the mock's `rgb(42, 49, 51)` (`#2a3133`) popover surface, fully within the viewport with no page
horizontal overflow, at both viewports.

### Verification Basis

- Baseline: `c95558c70f12b1f8f388499e6047dae5a9aa752a`.
- Command coverage:
  - `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `VITE_OUT_DIR=... npm run build`: `SearchResults.tsx`, `SearchResults.test.tsx`, `DownloadActions.tsx`, `toolbarStyles.ts`.
  - `tests/system` `npx tsc --noEmit` and the Playwright run: the four files above plus `tests/system/tests/results.spec.ts`.
  - `npm run validate:migration`: `docs/frontend-migration/FEATURES.yaml` (plus this packet's `Status` line and `STATUS.md`, lifecycle documentation finalized before it ran).
  - `npm run check:api`, `git diff --check`: no task-owned implementation or test file affects them beyond the ones above.
- File-content manifest (SHA-256):
  - `core/ui-react/src/features/search/results/SearchResults.tsx`: `8d7ed385e0cffafa50035415b46257748104094d9fcd5b581f46bbf50827ebcc`
  - `core/ui-react/src/features/search/results/SearchResults.test.tsx`: `98338d756291d7e441b54b3dbee6486801f150438dd849c8b91cd8e2830a71cd`
  - `core/ui-react/src/features/search/results/DownloadActions.tsx`: `a34d1e6b992aed55967c80209b73bf8ab45089f146bf0b79aa11da2e84a26e7e`
  - `core/ui-react/src/features/search/results/toolbarStyles.ts`: `92167627b26afcdb82fbefd02326d2530a0b84f3c371269511a3dbdb44f49670`
  - `tests/system/tests/results.spec.ts`: `c82e56376e23e3e115a65fa93e03c427d559e76b87f5920fa0b138a2c1c047bc`
  - `docs/frontend-migration/FEATURES.yaml`: `5ea1ba6b94f52215ecf28e7a59c1fa34193c310bb62eabe91b47ca86d15dec28`
- Completed after the last change to each command's listed files: `yes` for every command. `SearchResults.test.tsx` gained its two additional assertions after the Playwright run recorded above; that file does not affect the Playwright
  run (it is not built into the production bundle the browser tests exercise) or any command already run before it, so `npm run test -- --run` was rerun afterwards (recorded above) and no other command needed rerunning.
- Task-owned changes after verification: this packet's `Handoff` section and its `Status: in_progress` → `Status: review` line, plus `STATUS.md`'s section move — documentation and lifecycle only. `docs/frontend-migration/FEATURES.yaml`
  was final before the last `npm run validate:migration`, which is the only command its contents affect.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: `None`.
- Development dependencies added, removed, or changed: `None`.

### Architecture Decisions

- **ADR-0009** (full mock fidelity) governs this task: every palette/density value restyled here (`#2a3133` popover/control surface, `9px`/`8px` radii, `primary.main`/`primary.contrastText`, the `17x17px` checkbox) is read from the
  mock's sticky-toolbar and grid-header-first-column blocks in `uimock/NZBHydra Search.dc.html`, not invented, and is documented at its source in the new `toolbarStyles.ts`, mirroring `refineStyles.ts`'s established
  pattern.
- **ADR-0002** (MUI-only presentation): the tri-state checkbox restyle uses MUI `Checkbox`'s own `icon`/`checkedIcon`/`indeterminateIcon`/`sx` extension points, not a bespoke non-MUI control, per the packet's Out Of Scope instruction.
  Every other control restyled is an existing MUI `Button`/`Select`/`Menu`, restyled through `sx`/`slotProps`, not replaced.
- **ADR-0004** (testing and parity): the restyle is verified by rerunning FM-040's existing component-test coverage of every accessibility affordance unmodified (all pass), plus this task's own new Playwright geometry/contrast
  assertions.
- **ADR-0006** (semantic visual parity): a new proposed visual contract (states `toolbar-mock-density`, `tri-state-checkbox-mock-square`, `bulk-actions-mock-buttons`) is recorded with deterministic setup, geometry checks, evidence,
  and narrow snapshots; no baseline or variance was set to `accepted` by this implementation, and human visual acceptance remains outstanding, independent of the passing technical verification above.
- No ADR proposal was triggered.

### Assumptions

- The `· N selected` fragment specified for `search-results-summary` is additive alongside the existing, separately-`data-testid`'d `results-selected-count` inside `results-bulk-actions` (unchanged, still passing its own tests) rather
  than a replacement for it: removing or relocating `results-selected-count` would conflict with "no existing `data-testid` is removed or renamed" and with F-SEARCH-DOWNLOADS's already-`proposed` geometry check that names it
  explicitly. Both now render the same count from the same `selected` state, so they cannot drift.
- `results-download-actions`' downloader/category `Select` controls and the Save search/black-hole/copy-links `Button`s have no literal 1:1 mock element (the mock never depicts a results-toolbar downloader select); "restyles to the
  same surfaces/radii/typography" was read as applying the region's own established design language (the `#2a3133` control surface, `8px` radius, `13px` type already used by the ZIP button and the caret popover) rather than
  inventing unreviewed new values, consistent with `SearchWorkspace.tsx`'s own `controlSurface` precedent for a control the mock also does not literally depict.
- The pre-existing `results-download-actions` downloader-category `Select` renders visually narrow with only its chevron when its current value is the empty-string "Use downloader default" option (observed in the captured
  screenshots) — a pre-existing MUI `Select` rendering characteristic of the unmodified `<Select value={category ?? ""}>` structure, not something this task's `sx`-only restyle (background/border/radius/font, no width/overflow
  rules) introduced or could regress. Left unchanged as out of this restyle-only task's scope; noted under Follow-Up Work.

### Temporary Exceptions And Debt

- `None`.

### Registry And Documentation Updates

- `F-SEARCH-GROUP-SELECTION`: `visual.note` extended (FM-046 palette/density change described, FM-040's structural claims not re-litigated); `contract.states` gained `toolbar-mock-density`/`tri-state-checkbox-mock-square`;
  `contract.geometry_checks` gained two bullets (checkbox square geometry, caret popover surface/overflow); `contract.snapshots` added (new field) with the two required narrow captures; `evidence` unchanged (already
  `tests/system/tests/results.spec.ts`). `selectors`/`tests`/`target`/`task`/`gaps`/`backlog` intentionally unchanged (no selector added, removed, or renamed by this restyle).
- `F-SEARCH-DOWNLOADS`: `visual.note` extended (button/select restyle described); `contract.states` gained `bulk-actions-mock-buttons`; `contract.geometry_checks` gained one bullet (enabled-vs-disabled background contrast).
  `selectors`/`tests`/`target`/`task`/`gaps`/`backlog` intentionally unchanged.
- `F-SEARCH-SAVED`: `visual.note` extended (results-download-actions region restyle described, Save search's placement/order/behavior confirmed unchanged); `contract.states` gained `toolbar-mock-density`; `contract.geometry_checks`
  gained one bullet (flat toolbar background, consistent control surface). `selectors`/`tests`/`target`/`task`/`gaps`/`backlog` intentionally unchanged.
- `F-SEARCH-RESULTS`: `visual.note` extended (results-toolbar container's flat-background change and the summary's additive fragment described); `contract.states` gained `toolbar-mock-density`; `contract.geometry_checks` gained one
  bullet (box-shadow/border/padding assertion). `selectors`/`tests`/`target`/`task`/`gaps`/`backlog` intentionally unchanged.
- `COMPONENTS.yaml`/`APIS.yaml`: not modified (out of this packet's Files Allowed To Modify; no new shared component or API wrapper was introduced — `toolbarStyles.ts` is feature-local, following `refineStyles.ts`'s own precedent for
  staying out of the shared registry).
- For ADR-0006 visual records: all four records' `applicability` stays `applicable` and `status` stays `proposed` (none was `accepted`, so no lifecycle transition occurred). Scoped states/viewports/geometry, evidence, and the two new
  narrow snapshots are recorded as above. No variance was added, removed, or changed status by this task. **Human visual acceptance remains outstanding** for all four records, independent of the passing technical/accessibility
  verification recorded above; this implementation proposes evidence only and does not set or imply acceptance.

### Follow-Up Work

- The `results-download-actions` downloader-category `Select`'s empty-value ("Use downloader default") rendering collapses to a narrow chevron-only control instead of showing its placeholder label text, observed in this task's own
  captured screenshots. Pre-existing MUI `Select` behavior unrelated to this task's `sx`-only change (cosmetic; the control's value/behavior is unaffected) — a small, low-priority follow-up to consider giving the `Select` a
  `displayEmpty`/minimum width if this proves visually confusing in practice.
- `None` beyond the above.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer cannot supply the human visual acceptance the affected records require;
that remains a human decision independent of technical review, per ADR-0006.
