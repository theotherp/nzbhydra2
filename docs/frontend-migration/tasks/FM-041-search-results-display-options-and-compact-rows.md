# FM-041: Display Options Menu With Compact Rows And Recent-Result Highlighting

Status: done Owner: Feature IDs: F-SEARCH-RESULTS, F-SEARCH-GROUP-SELECTION, F-SEARCH-SORT-FILTER Component IDs: C-RESULT-TABLE API IDs: None Depends on: FM-046 Blocks: FM-042

**Refined under ADR-0009 (2026-08-17):** this packet was originally scoped against ADR-0008's Option B (structure only, ADR-0007 palette/typography unchanged) and never implemented. ADR-0009 supersedes ADR-0008 and requires full
mock fidelity — palette, typography, and density, not structure alone. This packet's Outcome and Boundary Rationale still hold unchanged (a preferences menu, compact rows, and recency highlighting remain one coherent, separately
reviewable capability), so it is refined in place rather than replaced: its dependency is redirected from FM-040 to FM-046 (the mock-fidelity remediation of the same toolbar/selection region FM-040 built structurally), its
`Decision Dependencies` and `Out Of Scope` are updated to require rather than forbid the mock's palette/density values, and its Acceptance gains concrete mock color/spacing values below. Everything else — the menu contents, the
opt-in defaults, the non-adoption of the mock's single "Group duplicates" checkbox — is unchanged from the original packet's reasoning.

**Refined again (2026-08-17), sidebar-shortcut scope only:** a fresh implementer correctly found the previous wording of Acceptance's first bullet ("all three drive one state") unsatisfiable in scope. Two repository facts settle it:
FM-045 owns the below-`sm` drawer as a deliberately local, unpersisted `drawerOpen` (`RefineSidebar.tsx:94-100`) whose compact branch reads neither `collapsed` nor `onToggleCollapsed`, so `SearchResults.tsx` has no prop to reach it
through; and `refine-sidebar-toggle` is one `data-testid` shared by both branches, exactly one of which is ever mounted, so there were never three controls — only the menu entry plus whichever `refine-sidebar-toggle` the live viewport
renders. The resolution is a **mechanical state lift**, not a state unification, spelled out in Acceptance and fenced in Out Of Scope. Outcome, Boundary Rationale, and both deliberate non-adoptions are unchanged.

## Dependency Notes

Third packet of the batch. It depends on FM-046 (not the original FM-040) because FM-046 is the mock-fidelity remediation of the same toolbar FM-040 built structurally: this task places a new control into that toolbar and
relocates the grouping toggles FM-040's `F-SEARCH-GROUP-SELECTION` re-proposal describes, and doing so against FM-046's final palette/density shape avoids restyling the same region twice. It also adds a second entry point to FM-045's
refine-surface visibility affordance (the "Show refine sidebar" entry shows/hides the docked column at `sm` and up and opens/closes the same drawer below `sm`, without changing what either mechanism persists), so FM-045 must exist
first — satisfied transitively through FM-046's own dependency on FM-045. It blocks FM-042, whose
sticky offsets and scrolled evidence depend on the row height that compact mode changes.

## Outcome

Display preferences for the results list are gathered into one "Display options" menu — the two existing grouping toggles, plus new opt-in compact row density, opt-in highlighting of results newer than three days, and a shortcut for
the Refine sidebar — each persisted with the existing sort and filter choices, rendered at the mock's palette and density rather than ADR-0007's legacy-grey/green tokens.

## Boundary Rationale

A menu of preferences that does not change anything is not a reviewable capability, and a density or recency treatment with no way to turn it on is not either; the menu, the two new preferences it exposes, and their row-level rendering are
one deliverable. It is separate from FM-046 because selection and download actions are a different capability with different records, and separate from FM-042 because sticky positioning is unconditional layout behavior rather than a user
preference, with a different failure mode and a different evidence state.

## Decision Dependencies

- Accepted ADRs governing this task: ADR-0002 (MUI-only presentation), ADR-0004 (testing and parity), ADR-0006 (semantic visual parity), ADR-0007 (historical; superseded for palette/typography/density by ADR-0009), ADR-0008
  (historical; superseded), ADR-0009 (full mock fidelity — palette, typography, and density, not structure alone; the `dark-dyschromatopsia` variant continues to compose with whatever base palette FM-043 lands).
- Proposed or rejected ADRs blocking this task: None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/SearchResults.tsx`, `SearchResults.test.tsx`, `resultTable.ts`, `resultTable.test.ts`, and new feature-scoped sibling modules and tests under `core/ui-react/src/features/search/results/`
- `core/ui-react/src/features/search/results/RefineSidebar.tsx` and `RefineSidebar.test.tsx` — **only** to lift FM-045's existing local `drawerOpen` state into `SearchResults.tsx` as a controlled prop pair (and to update the test
  harness's props accordingly). Nothing else in this file is in scope: not its `compact` branch decision, its palette/density/section markup, its `data-testid`s, its accessible names, or its `collapsed`/`onToggleCollapsed` docked
  behavior. Every existing assertion in `RefineSidebar.test.tsx` must still hold with its original expectations — only the harness's prop plumbing may change
- `tests/system/tests/results.spec.ts` — only this task's visual-evidence block, including its own route fixture
- `docs/frontend-migration/FEATURES.yaml` — only `F-SEARCH-RESULTS`, `F-SEARCH-GROUP-SELECTION`, and `F-SEARCH-SORT-FILTER`'s `visual`, `selectors`, and `tests` fields
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- `core/ui-react/src/app/theme.ts` itself (FM-043's territory; read its tokens, do not edit them). Unlike the original ADR-0008-era version of this packet, this task **does** apply the mock's palette/typography/density — via
  feature-local styling only, matching how FM-045/FM-046 restyled the sidebar/toolbar, so a route-wide theme edit is still never required here
- Adopting the mock's single "Group duplicates" checkbox. React already groups duplicates unconditionally with per-group expansion (`groupResults`, `visibleGroupedResults`), and the two existing toggles are strictly more capable; this is a
  deliberate non-adoption to be restated in the handoff, not an oversight
- Changing grouping, filtering, sorting, selection, or download semantics; changing the default rendering of the results list (both new preferences default off)
- Merging the below-`sm` drawer's open state into the persisted `sidebarCollapsed` preference, and any mount-time guard that forces one from the other. The drawer stays unpersisted and initially closed exactly as FM-045 left it; only
  the state's *owner* moves. Persisting overlay openness, or writing a phone visit's value back into a desktop user's stored preference, is a product decision outside this packet — it would need an ADR, not an implementer choice
- FM-045's own `refine-sidebar-mobile-drawer` evidence block in `tests/system/tests/results.spec.ts` (~lines 1038-1100) and its `visual-evidence/F-SEARCH-SORT-FILTER/refine-sidebar-mobile-drawer.png` capture. The lift is
  behavior-identical from that block's perspective — it drives `refine-sidebar-toggle`, `refine-sidebar-close`, and `aria-expanded` and asserts the same values — so it must stay byte-identical. That capture is recorded as clipped and
  is pending human ADR-0006 acceptance; do not recapture it, re-date it, or touch its acceptance metadata
- Sticky positioning (FM-042); server-backed preference storage; any route other than `/`

## Context To Read

- `README.md` (Visual Parity, Workflow, Registry Rules, Verification Integrity), `ADR-0002`, `ADR-0004`, `ADR-0006`, `ADR-0007` (historical), `ADR-0008` (historical), `ADR-0009`
- `F-SEARCH-RESULTS`, `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-SORT-FILTER`, `C-RESULT-TABLE`, and the FM-012, FM-034, FM-045, and FM-046 packets
- `core/ui-react/src/features/search/results/SearchResults.tsx` (the grouping toggles, the `hydra.search-results.table` persistence including `sidebarCollapsed`, `prefersExpandedSidebarByDefault()`, the `RefineSidebar` call site, and the
  memoized `ResultRow`) and `resultTable.ts` (`ageInDays`)
- `core/ui-react/src/features/search/results/RefineSidebar.tsx` lines 88-110 and 294-362 (the `compact` branch decision, the local `drawerOpen` and its in-file rationale, and the two branches' shared `refine-sidebar-toggle` id) and
  `RefineSidebar.test.tsx`'s `Harness` — the state being lifted and the assertions that must keep passing unchanged
- `core/ui-react/src/app/theme.ts` — read only, to confirm the tokens FM-043 landed and how the `dark-dyschromatopsia` variant composes
- `/tmp/hydra mock/Awaiting responses for direction/NZBHydra Search.dc.html` — the display-options popover (`showDisplayMenu` block) and the `padY`/`isNew` row-treatment logic in the `renderVals()` script, for both structure and the
  exact color/spacing values now in scope
- `tests/system/tests/results.spec.ts` and `tests/system/tests/visualEvidence.ts`

## Acceptance

- A `display-options-toggle` control in the results toolbar opens a `display-options` popover containing: the two existing grouping toggles ("Group torrent and Usenet results" and "Group TV episodes") relocated with unchanged labels and
  behavior, "Compact rows", "Highlight recent", and a "Show refine sidebar" entry (the mock's `showFilters` checkbox, which gates whether its `<aside>` renders at all). The toggle exposes `aria-haspopup` and `aria-expanded`, and every
  entry exposes its checked state and an accessible name. The popover renders on the mock's surface: `#2a3133` background, `11px` border radius, `min-width: 220px`, matching the results-toolbar's other popovers (FM-046).
- The "Show refine sidebar" entry is a second entry point to the refine surface's existing visibility affordance, not a new state. There is exactly **one** live mechanism per viewport branch, because `RefineSidebar` mounts exactly one
  branch: at `sm` and up the persisted `sidebarCollapsed` (the docked column, shown/hidden by `refine-sidebar-toggle`), and below `sm` FM-045's unpersisted `drawerOpen` (the same `refine-sidebar-toggle` id, rendering the drawer
  trigger). The entry reads and writes whichever mechanism is live, so its checked state always answers "is the refine surface currently shown" and never disagrees with the live `refine-sidebar-toggle`'s `aria-expanded`. Required shape:
  `drawerOpen` is lifted out of `RefineSidebar.tsx` into `SearchResults.tsx` as a controlled prop pair, still initialized closed and still absent from the `hydra.search-results.table` payload; `SearchResults` resolves the live branch
  from the same `theme.breakpoints.down("sm")` query `RefineSidebar` uses. Prefer exporting that query as one shared hook from `RefineSidebar.tsx` over duplicating the string, so the two cannot drift; an equivalent arrangement that
  keeps a single definition is an acceptable implementer choice, recorded in the handoff.
- Asserted by two tests, not one: at `sm` and up, toggling the entry collapses/expands the docked sidebar, is reflected by `refine-sidebar-toggle`'s `aria-expanded` and by the entry's own checked state, and round-trips through
  `sidebarCollapsed` in localStorage; below `sm`, toggling the entry opens and closes the same `refine-sidebar-drawer` FM-045's trigger opens, with `refine-sidebar-close` and the trigger still working unchanged, and the drawer still
  closed on first render even when `sidebarCollapsed: false` is already stored. Record in the handoff that the two mechanisms are deliberately not unified, quoting FM-045's `RefineSidebar.tsx` rationale.
- Compact rows is opt-in and defaults off, so the current default row density and every accepted default-state geometry check remain valid. When enabled it reduces every body cell's vertical padding from the table's existing
  non-compact `6px` (FM-034's body-cell value, which FM-045 also aligned the header cells to) to `4px`, and tightens the row-action controls proportionally, using feature-local styling only. The mock's own `padY` literals are `7px`
  compact against `11px` normal; they are not usable verbatim, because React's non-compact rows already sit below the mock's normal value, so applying `7px` here would *increase* row padding and contradict this bullet's own
  unchanged-default requirement and the reduced-height check below. The target instead keeps the mock's 7:11 proportion against React's denser baseline (`6 * 7 / 11 = 3.8 -> 4px`), with both mock literals recorded alongside the values
  actually used.
- Highlight recent is opt-in and defaults off. The mock defaults it on; that is deliberately not adopted, because changing the default rendering would invalidate accepted default-state baselines that only a human may re-accept under
  ADR-0006. Record the non-adoption and its reason in the handoff.
- When enabled, results whose age is at most three days are visually flagged, computed from the existing `epoch` through `resultTable.ts`'s `ageInDays` (results without `epoch` are never flagged). The flag uses at least two non-hue
  computed properties together — matching the mock's own combination of an accent-teal age-column text color (`primary.light`/`oklch(0.82 0.1 190)`, replacing the default `#9aa2a1`-equivalent muted tone) and a left-edge accent stripe
  (an inset box-shadow or border in `oklch(0.75 0.1 190 / 0.4)`) — so the flag remains distinguishable under the `dark-dyschromatopsia` theme variant, which does not rely on hue alone. Covered by unit tests for the age predicate and a
  component test for the rendered flag's non-hue property.
- Both genuinely new preferences (compact rows, highlight recent) are added to the existing `hydra.search-results.table` localStorage payload alongside sorting, filters, and the `sidebarCollapsed`
  key FM-039/FM-045 already persist there (`SearchResults.tsx`'s persist effect) — the sidebar shortcut adds no new key. The below-`sm` `drawerOpen` state is deliberately **not** added to the payload. No server-backed storage is
  introduced and `F-SEARCH-SORT-FILTER`'s `server-backed preferences` gap stays open and unchanged.
- Row rendering stays memoized as FM-034 left it: the new preferences reach `ResultRow` as primitives, and enabling either preference must not reintroduce a per-row recomputation or defeat the existing memoization. State this with the
  reasoning in the handoff.
- No existing `data-testid` is removed or renamed; new ones are added to the affected records' `selectors`.
- Registry reconciliation: `F-SEARCH-GROUP-SELECTION`'s contract is updated for the relocated grouping toggles (it is `proposed` after FM-040/FM-046; do not re-demote or re-accept it), `F-SEARCH-SORT-FILTER`'s persisted-choices
  contract gains the two new preferences and the sidebar shortcut, and `F-SEARCH-RESULTS` gains the density and recency states, all against the FM-043 mock palette. `F-SEARCH-SORT-FILTER` additionally gains one `proposed` variance
  recording that the mock's single `showFilters` boolean is realized as two per-branch mechanisms — a persisted docked-collapse preference at `sm` and up and a transient, unpersisted drawer-open state below `sm` — and carrying FM-045's
  reason (a persisted expanded preference must not pop an overlay over the results when a desktop user reopens the page on a phone; the mock has no responsive branch, so it never had to answer this). Its existing
  `refine-sidebar-expanded`, `refine-sidebar-collapsed`, and `refine-sidebar-mobile-drawer` states already record these as distinct states and stay as they are. Compact rows and recency highlighting have no legacy equivalent — confirm against
  `core/ui-src/js/search-results-controller.js` and `core/ui-src/html/directives/search-result.html` rather than assuming — and are recorded as `proposed` variances. Never fabricate or re-date human acceptance.
- Visual contract (ADR-0006), asserted in `results.spec.ts`. States: `display-menu-open`, `compact-rows-enabled`, `recent-highlight-enabled`, `sidebar-shortcut-toggled`. Viewports: desktop 1280x800, mobile 390x844. Geometry checks:
    - the open menu renders fully within the viewport with no page horizontal overflow at both viewports, on the mock's `#2a3133`/`11px`-radius surface;
    - the "Show refine sidebar" entry's checked state matches the live `refine-sidebar-toggle`'s `aria-expanded` at both viewports before and after toggling it, and toggling it from the menu produces the same rendered outcome the live
      `refine-sidebar-toggle` produces: at desktop the docked sidebar's width changes and the table's bounding-box width changes by the same delta with no residual gap; at mobile `refine-sidebar-drawer` appears and disappears and the
      closed table width returns to exactly its previous value, with no page horizontal overflow in any of the four combinations;
    - with both preferences off, the results table's height for a fixed visible row count is unchanged from the pre-task baseline;
    - enabling Compact rows measurably reduces the table's height for that same row count (every body cell's computed vertical padding moving from the existing `6px` to `4px` — the mock's 7:11 compact ratio applied to React's denser
      baseline, per the Acceptance bullet above) while every row's title cell stays free of scrollWidth overflow at both viewports;
    - with Highlight recent enabled, a result at most three days old differs from an older result in at least two non-hue computed properties (text color and stripe/border presence), and the flag adds no horizontal overflow to the row.
  This task's own evidence fixture gains one deliberately older result so the recency distinction is assertable; update only that block's own counts and leave every other spec's fixtures and assertions untouched. Evidence:
  `tests/system/tests/results.spec.ts` plus narrow captures at `visual-evidence/F-SEARCH-RESULTS/display-options-desktop.png` and `compact-rows-desktop.png`.

## Verification

- `npm ci` only if `package.json`/`package-lock.json` change; otherwise the cheapest install that guarantees `node_modules` matches the lockfile. Record which install ran.
- Working directory `core/ui-react`: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api`, `npm run validate:migration` — each expected to pass.
- Working directory `tests/system`: `npx tsc --noEmit` — expected to pass (this task changes a spec).
- Working directory `tests/system`, after `VITE_OUT_DIR=../target/classes/static/react npm run build` from `core/ui-react`: `npx playwright test tests/results.spec.ts`, expected to produce the proposed contracts' evidence.
- Repository root: `git diff --check` — expected to produce no output.
- Confirm task-owned changed files are all listed under Files Allowed To Modify, and that no other spec's fixtures or assertions were altered — specifically that FM-045's `refine-sidebar-mobile-drawer` block in `results.spec.ts`
  (~lines 1038-1100) is unchanged, and that every pre-existing assertion in `RefineSidebar.test.tsx` kept its original expected values.
- Confirm verification leaves no unexpected generated or modified files; the git-ignored production build under `core/target/classes/static/react` is build output, not a tracked change.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`.

### Outcome

Every display preference for the results list is now chosen in one `display-options` popover opened by a `display-options-toggle` in the results toolbar, on the mock's `#2a3133`/`11px`/`220px` surface: the two grouping toggles
relocated from the inline toolbar row with unchanged labels, defaults, and behavior; new opt-in "Compact rows" and "Highlight recent" preferences, both persisted in the existing `hydra.search-results.table` payload and both defaulting
**off**; and a "Show refine sidebar" entry that reads and writes whichever per-viewport refine-surface mechanism is live. Compact rows moves every body cell's vertical padding from `6px` to `4px` and tightens the row's own
checkbox/action/expand controls. Highlight recent flags a result at most three days old (via `resultTable.ts`'s newly exported `ageInDays`/`isRecentResult`; a result with no `epoch` is never flagged) with two independent properties -- an
accent-teal `primary.light` age-column color and a left-edge inset accent stripe. FM-045's below-`sm` `drawerOpen` was lifted verbatim into `SearchResults.tsx` as a controlled prop pair, still initialized closed and still unpersisted.

### Files Modified

- `core/ui-react/src/features/search/results/SearchResults.tsx` (display-options popover, two new persisted preferences, compact density, recency flag, lifted `refineDrawerOpen`, `data-compact-rows`)
- `core/ui-react/src/features/search/results/displayStyles.ts` (new; feature-local mock surface/density values)
- `core/ui-react/src/features/search/results/resultTable.ts` (`ageInDays` exported, `RECENT_RESULT_MAX_AGE_DAYS`, `isRecentResult`)
- `core/ui-react/src/features/search/results/RefineSidebar.tsx` (state lift only: `drawerOpen`/`onDrawerOpenChange` props, exported `useCompactRefineSurface`)
- `core/ui-react/src/features/search/results/SearchResults.test.tsx`, `resultTable.test.ts`, `RefineSidebar.test.tsx` (new coverage; `RefineSidebar.test.tsx` only gains the harness's prop plumbing)
- `tests/system/tests/results.spec.ts` (one new evidence block with its own route fixture, plus its helpers)
- `docs/frontend-migration/FEATURES.yaml` (`F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`, `F-SEARCH-GROUP-SELECTION` `visual`/`selectors`/`tests` only), `docs/frontend-migration/STATUS.md`, this packet
- Untracked, git-ignored run output (not a tracked change): `tests/system/visual-evidence/F-SEARCH-RESULTS/display-options-desktop.png`, `compact-rows-desktop.png` (`tests/.gitignore:33` ignores `system/visual-evidence`), and the
  production build under `core/target/classes/static/react`
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`. `RefineSidebar.tsx`'s diff is exactly the permitted lift (its `compact` branch decision, markup, palette, `data-testid`s, accessible names, and
  docked `collapsed`/`onToggleCollapsed` behavior are untouched); every pre-existing `RefineSidebar.test.tsx` assertion keeps its original expected values; FM-045's `refine-sidebar-mobile-drawer` block in `results.spec.ts` and its
  capture are byte-identical.

### Toolchain

- Node: `v26.7.0` (manifest requires `>=26.0.0 <27`)
- Package manager: `npm 11.19.0` (manifest pins `npm@11.19.0`)
- Other material tools: Playwright `1.62.1` with bundled Chromium; Maven (via `misc/run_gui_systemtest.py`, which built and started the JVM core and mockserver); Docker (sonarr/radarr containers the runner manages)

### Verification Evidence

| Working directory | Command                                                                        | Result                                                                                                                                                                                                                                                                                                                       |
|-------------------|--------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| repository root   | install                                                                        | Not run. `package.json`/`package-lock.json` unchanged in both projects and `node_modules` already matched the lockfiles (`core/ui-react` and `tests/system` both resolved and ran their pinned toolchains).                                                                                                                    |
| `core/ui-react`   | `npm run typecheck`                                                            | Passed (no output).                                                                                                                                                                                                                                                                                                          |
| `core/ui-react`   | `npm run lint`                                                                 | Passed: `8 problems (0 errors, 8 warnings)`. Seven warnings are pre-existing; one is new -- `RefineSidebar.tsx:55 react-refresh/only-export-components` for the exported `useCompactRefineSurface` hook, the arrangement this packet recommends. Same warning class as four other files already in the repository.              |
| `core/ui-react`   | `npm run format:check`                                                         | **Failed, pre-existing and unrelated.** Reports exactly the same 11 files on a clean baseline tree at `6507a5ed6` (verified by stashing this task's changes and rerunning): `README.md`, `src/features/search/SearchPage.tsx`, `src/router.tsx`, `tsconfig.json`, `vite/devBackend.ts`, `vite/devBackend.test.ts`, and five git-ignored `.playwright-cli/*.yml` artifacts. None is in `Files Allowed To Modify`. Every task-owned file passes: `npx prettier --check src/features/search/results/` reports "All matched files use Prettier code style!". |
| `core/ui-react`   | `npm run test -- --run`                                                        | Passed: 38 files, 223 tests (was 38/211 at baseline; +12 new).                                                                                                                                                                                                                                                                |
| `core/ui-react`   | `npm run build`                                                                | Passed (`✓ built in 1.89s`; the pre-existing >500 kB chunk-size advisory is unchanged).                                                                                                                                                                                                                                       |
| `core/ui-react`   | `npm run check:api`                                                            | Passed: "Generated OpenAPI types are current."                                                                                                                                                                                                                                                                               |
| `core/ui-react`   | `npm run validate:migration`                                                   | Passed: "Migration registries and task metadata are valid."                                                                                                                                                                                                                                                                  |
| `tests/system`    | `npx tsc --noEmit`                                                             | Passed (no output).                                                                                                                                                                                                                                                                                                          |
| `core/ui-react`   | `VITE_OUT_DIR=../target/classes/static/react npm run build`                     | Passed; the runner below rebuilt the same bundle again immediately before the Playwright invocation.                                                                                                                                                                                                                          |
| repository root   | `python3 misc/run_gui_systemtest.py --test-timeout 1500 -- tests/results.spec.ts` | Passed: **18/18** (`18 passed (37.8s)`), including the new `should provide deterministic display-options, compact-row, recency, and sidebar-shortcut visual evidence across desktop and mobile` and all 17 pre-existing tests. Real JVM backend plus mockserver started by the runner; produced both proposed-contract captures. |
| repository root   | `git diff --check`                                                             | Passed (no output).                                                                                                                                                                                                                                                                                                          |

Observed but not this task's to fix: `tests/system/tests/search.spec.ts` still carries the pre-existing, unrelated FM-038 failure (`getByRole("menuitem", {name: "Refill"})` against what is now a nested icon `button`). That spec is
outside `Files Allowed To Modify` and was not run or modified here.

### Verification Basis

- Baseline: `6507a5ed6bb0e40aac29c41b5ef20683d6f2c34f` (FM-046, `done`), the revision supplied for this task; the working tree was clean at it and carried no unrelated pre-existing user changes.
- Command coverage:
  - `npm run typecheck`, `npm run lint`, `npm run test -- --run`, `npm run build`: `SearchResults.tsx`, `SearchResults.test.tsx`, `RefineSidebar.tsx`, `RefineSidebar.test.tsx`, `resultTable.ts`, `resultTable.test.ts`,
    `displayStyles.ts`.
  - `npm run format:check`: the same seven files (all pass individually; the command's failure is caused only by the untouched pre-existing paths listed above).
  - `npm run check:api`: none of this task's files affect it (no generated API types changed).
  - `npm run validate:migration`: `docs/frontend-migration/FEATURES.yaml` plus the two capture files it now references.
  - `tests/system` `npx tsc --noEmit` and the Playwright run: `tests/system/tests/results.spec.ts` plus all seven implementation/test files above (the Playwright run exercises the built bundle).
- File-content manifest:
  - `core/ui-react/src/features/search/results/SearchResults.tsx`: `db441d8846715971c64307d369c5c6e49d0086fd6b8d42fb00479a55f04364c0`
  - `core/ui-react/src/features/search/results/SearchResults.test.tsx`: `de22969f491212178a17d0923c6582e56bca803b35a57a677ede5cfdceef9d14`
  - `core/ui-react/src/features/search/results/RefineSidebar.tsx`: `0808cf381adefe45bcf6fcaca81f44a63dea0e5385eb4999d924ed05505d67eb`
  - `core/ui-react/src/features/search/results/RefineSidebar.test.tsx`: `91439323427fbc71e75e2e2246223b64d9ab6812ffc9261c5cd7578a26bca708`
  - `core/ui-react/src/features/search/results/resultTable.ts`: `b23d0b801ac1c84ab0b125b76789f5dbbc9fe0c0140beb348f46513b8399cfe0`
  - `core/ui-react/src/features/search/results/resultTable.test.ts`: `b582209b2fa8f0ff23d558ce493ba2ef41dd9b93af234f1898287b14f163b6ee`
  - `core/ui-react/src/features/search/results/displayStyles.ts`: `cc24a2f6ce1d4d057335d7ca3f4e7050a8b2879687b020dd299d2e76a3bf0fda`
  - `tests/system/tests/results.spec.ts`: `8d662f6070a38128e18b8f42a40b0f81b4630a2cb31649789266b0533f6310e1`
  - `docs/frontend-migration/FEATURES.yaml`: `9d0ac1752a2117505688cc04f9ef725c06414849b38e86a6a57be9904ca40e17`
- Completed after the last change to each command's listed files: `yes` for every command. The Playwright run was the last expensive command and ran against these exact contents; the seven `core/ui-react` commands were all rerun
  afterwards against the same contents.
- Task-owned changes after verification: `docs/frontend-migration/STATUS.md` and this packet's Handoff/lifecycle text only. `FEATURES.yaml` was finalized before `validate:migration` and is unchanged since.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: `None`.
- Development dependencies added, removed, or changed: `None`.

### Architecture Decisions

- ADR-0002 (MUI-only presentation): the popover is MUI `Popover` + `FormGroup` + `FormControlLabel`/`Checkbox`, the density and recency treatments are `sx` on existing MUI `Table`/`TableCell`. No bespoke or third-party control.
- ADR-0004 (testing and parity): domain coverage in `resultTable.test.ts` (age predicate), component/accessibility coverage in `SearchResults.test.tsx` (popover semantics, relocated grouping behavior, density flag, recency flag's
  non-hue property, persistence payload, both sidebar-shortcut branches), and browser evidence in `results.spec.ts` -- three independent layers, none substituting for another.
- ADR-0006 (semantic visual parity): one new scoped visual contract per affected record with deterministic setup, named viewports, geometry checks, evidence, two narrow captures, and `proposed` variances. No record was accepted and no
  acceptance metadata was created, re-dated, or touched.
- ADR-0009 (full mock fidelity): the popover's surface, caption, entry, and divider values and the recency colors are the mock's own, kept feature-local (`displayStyles.ts`) exactly as FM-045/FM-046 kept theirs; `theme.ts` untouched.
  The recency age color is consumed as `primary.light` so the `dark-dyschromatopsia` variant composes with it.
- ADR-0010 (production CSS delivery): no CSS emission change; `VITE_OUT_DIR` build and `validate-production-assets` unaffected.
- ADR-0007 / ADR-0008: historical, superseded; not followed for palette/density.
- `ADR REQUIRED` proposal triggered during this task: `None`. In particular the two per-branch refine-surface mechanisms were deliberately **not** merged and no mount-time guard was added, as the packet's Out Of Scope requires; the
  divergence from the mock's single `showFilters` boolean is recorded as a `proposed` variance instead.

### Assumptions

- **Compact row padding is `4px`, not the mock's literal `7px`.** The mock's `padY` is `compact ? '7px' : '11px'`, but React's non-compact body cells already sit at `6px` (FM-045, `SearchResults.tsx` at the baseline commit), and this
  packet also requires the default row density and the pre-task table height to stay exactly as they were. Applying `7px` to the compact state would therefore have *increased* row padding and made "enabling Compact rows measurably
  reduces the table's height" false. Compact keeps the mock's own 7:11 proportion against React's denser non-compact value instead (`6 * 7 / 11 = 3.8 -> 4px`). Both mock literals are recorded in `displayStyles.ts` next to the values
  actually used, and the affected registry geometry checks state the real `6px -> 4px` figures. This is the one numeric deviation from the packet's Acceptance text and is called out again under Follow-Up Work.
- "With both preferences off, the table's height is unchanged from the pre-task baseline" is evidenced without a second Playwright run against baseline code: the spec asserts that the body cells' computed vertical padding is exactly
  the `6px` the pre-task source set, and that the table's height for the same four rows returns to *exactly* its pre-toggle value after Compact rows is switched on and off. Recording a hardcoded baseline pixel height would have
  required building and running the previous revision, which the packet does not ask for.
- The recency stripe is drawn on the row's **first cell** rather than the `<tr>`: MUI `Table`'s `border-collapse: collapse` suppresses row-level box shadows in Chromium. It is an inset shadow rather than a border so it consumes no
  layout width, which is what keeps the "flag adds no horizontal overflow" check true.
- The row's compact density is a descendant `sx` rule on the one `Table` rather than a per-row prop, so `data-compact-rows` on the table is what the jsdom component test reads (jsdom's `getComputedStyle` does not resolve
  specificity-ordered descendant rules from an emotion class -- measured: it returned MUI's base `16px`). The rendered `6px -> 4px` padding and the height reduction are asserted in Chromium instead.
- Below `sm`, the display-options popover cannot be opened while the refine `Drawer` is open, because the drawer is modal and its backdrop legitimately intercepts pointer events for the whole page beneath it (this also applies to
  FM-045's own `refine-sidebar-toggle`, which its existing spec likewise never clicks while the drawer is open). The menu entry therefore closes the popover when used, and the browser evidence exercises entry-open plus
  `refine-sidebar-close`-close, plus trigger-open plus close-button-close. The entry's *closing* direction is covered at desktop in the browser and at mobile by `SearchResults.test.tsx`, which drives the same state without a pointer.
- The `display-options-toggle`'s open-state text color is the theme's `text.primary` (`#d6dad9`) rather than the mock's literal `#eef1f0` for that one state; its closed state is the mock's own `#c9cfce`. A theme token was preferred
  over a fifth near-identical literal.
- `tests/system/visual-evidence` is git-ignored (`tests/.gitignore:33`), so this task's two captures -- like FM-045's and FM-046's -- exist only in a working tree that has run the spec. Recorded as a pre-existing repository condition,
  not changed here; see Follow-Up Work.

### Temporary Exceptions And Debt

`None`. No suppression, skip, downgrade, compatibility flag, or fallback implementation was introduced; the one failing verification command (`format:check`) fails identically on the untouched baseline tree and only on paths outside
this task's write scope.

### Registry And Documentation Updates

- `F-SEARCH-RESULTS` (`FEATURES.yaml`): `target` unchanged; `tests` updated (adds `SearchResults.test.tsx` and `resultTable.test.ts`, which now carry this record's density/recency coverage); `parity: partial` and `gaps: []` unchanged;
  `selectors` gains `display-options-toggle`, `display-options` (no selector removed or renamed); `task: FM-010` and `backlog` intentionally unchanged. `visual`: `applicability: applicable`, lifecycle stays `proposed` (no transition;
  it was already `proposed`), note extended for the two opt-in row treatments and their opt-out defaults, `setup` extended with this block's own fixture, four states added (`display-menu-open`, `compact-rows-enabled`,
  `recent-highlight-enabled`, `sidebar-shortcut-toggled`), viewports unchanged (desktop 1280x800, mobile 390x844), six geometry checks added, `evidence` unchanged (`results.spec.ts`), new `snapshots`
  (`display-options-desktop.png`, `compact-rows-desktop.png`), two new `proposed` variances (compact density and recency flagging have no legacy equivalent). **Human acceptance pending.**
- `F-SEARCH-SORT-FILTER`: `target`, `tests`, `parity`, `task`, `backlog`, and the `server-backed preferences` gap all intentionally unchanged (no server-backed storage introduced); `selectors` gains `display-options-toggle`,
  `display-options`. `visual`: stays `proposed`, note extended for the popover and the two new persisted keys, `setup` extended, states `display-menu-open` and `sidebar-shortcut-toggled` added, four geometry checks added, existing
  `snapshots` untouched, and exactly one new `proposed` variance recording that the mock's single `showFilters` boolean is realized as two per-branch mechanisms with FM-045's rationale. Its `refine-sidebar-expanded`,
  `refine-sidebar-collapsed`, and `refine-sidebar-mobile-drawer` states are unchanged. **Human acceptance pending.**
- `F-SEARCH-GROUP-SELECTION`: `target`, `tests`, `parity`, `gaps`, `task`, `backlog` intentionally unchanged; `selectors` gains `display-options-toggle`, `display-options`. `visual`: stays `proposed` (not re-demoted, not re-accepted),
  note extended for the relocated grouping toggles -- including the finding that the legacy AngularJS view already renders them in its own `id="display-options"` "Display options" dropdown
  (`core/ui-src/js/search-results-controller.js`'s `optionsOptions`), so the relocation moves *toward* legacy parity; one state added (`display-menu-grouping-toggles`), the `results-selection-actions` geometry check reworded and one
  check added; existing variance and snapshots untouched. **Human acceptance pending.**
- `C-RESULT-TABLE` (`COMPONENTS.yaml`): explicitly confirmed unchanged -- responsibility, legacy sources, target, consumers, classification, `state: partial`, `task: FM-012`, and `backlog` all still accurate; this task added display
  preferences inside the same component boundary and introduced no new shared component or API wrapper (`COMPONENTS.yaml` and `APIS.yaml` are outside this task's write scope and needed no change).
- `APIS.yaml`: no API IDs are linked by this task and none changed.
- `STATUS.md`: FM-041 moved to `Review` with a summary of what landed and what remains outstanding.
- ADR-0006 confirmation: the visual evidence establishes no behavioral or accessibility claim. Behavioral/accessibility gates are carried independently by `SearchResults.test.tsx`, `resultTable.test.ts`, `RefineSidebar.test.tsx`, and
  the non-visual assertions in `results.spec.ts`.

### Deliberate Non-Adoptions From The Mock

- The mock's single "Group duplicates" checkbox is **not** adopted. React already groups duplicates unconditionally with per-group expansion (`groupResults`, `visibleGroupedResults`), and the two existing toggles are strictly more
  capable. Deliberate, per this packet's Out Of Scope.
- "Highlight recent" defaults **off**, although the mock defaults `highlightRecent: true`. Changing the default rendering of the results list would invalidate accepted default-state baselines that only a human may re-accept under
  ADR-0006.
- The mock's own `padY` literals are not used verbatim; see the compact-padding assumption above.
- The two per-viewport refine-surface mechanisms are deliberately **not** unified, quoting FM-045's in-file rationale (still present, verbatim, in `RefineSidebar.tsx`): "Deliberately not the persisted `collapsed` preference: that
  preference describes the docked desktop column, and reusing it here would pop an overlay open over the results the moment a desktop user with an expanded sidebar opened the same page on a phone. The drawer always starts closed and is
  opened on demand." A mount-time guard forcing one from the other would additionally rewrite a desktop user's stored preference, because `SearchResults.tsx`'s persist effect writes on every `sidebarCollapsed` change.

### Memoization Note (FM-034)

`ResultRow` stays memoized exactly as FM-034 left it, and neither new preference reintroduces per-row work. "Compact rows" never reaches `ResultRow` at all -- it is one descendant `sx` rule on the single `Table`, so flipping it
re-renders the parent and restyles every row through CSS without changing any `ResultRow` prop, and `memo` skips all of them. "Highlight recent" reaches `ResultRow` as one already-resolved `recent: boolean`, computed in the parent's
existing row `flatMap` (which iterates those rows regardless) from `isRecentResult(result)`; the row itself performs no age computation, and because the prop is a primitive, `memo`'s shallow comparison still short-circuits every row
whose flag did not change. No new object, array, or inline-function prop was added to `ResultRow`.

### Follow-Up Work

- Task-designer reconciliation of this packet's compact-padding figures: its Acceptance and visual contract name the mock's literal `7px`/`11px`, which cannot coexist with "the default row density is unchanged" now that FM-045 landed
  `6px`. The registry now records the real `6px -> 4px`; the packet text should be corrected on its next touch so the two cannot disagree.
- `tests/system/visual-evidence` is git-ignored, so every record's `snapshots` path (FM-045's, FM-046's, and now FM-041's) is validated by `validate:migration` only against a working tree that has run the specs. Deciding whether
  ADR-0006's "repository-contained evidence" requires committing these captures -- or whether `validate:migration` should stop treating ignored paths as repository paths -- is a coordinator/designer decision, not an implementer's, and
  `tests/.gitignore` is outside this task's scope.
- `compact-rows-desktop.png` shows the table's viewport-visible left portion (Select, Title, Indexer, Category) because the results table's `1320px+` minimum width exceeds the 1280px desktop viewport and scrolls inside its own
  wrapper, so no single desktop capture can show the Age and Actions columns. The row density the capture exists to evidence is fully visible; whoever performs the ADR-0006 acceptance for `compact-rows-enabled` should read the Age/
  Actions treatment from the spec's assertions rather than from the image.
- The pre-existing `npm run format:check` failure (`README.md`, `src/features/search/SearchPage.tsx`, `src/router.tsx`, `tsconfig.json`, `vite/devBackend.ts`, `vite/devBackend.test.ts`) has no owning task and blocks every future
  task's verification chain from reporting a clean pass. A small corrective packet running `prettier --write` over those paths would clear it.
- The pre-existing `tests/system/tests/search.spec.ts` FM-038 `menuitem`/`Refill` failure is still unowned; FM-044's handoff already proposed a corrective packet.
- The new `react-refresh/only-export-components` warning on `RefineSidebar.tsx:55` could be removed by moving `useCompactRefineSurface` into its own tiny module; that is the "equivalent arrangement" this packet permits, and was not
  taken because the packet explicitly recommends exporting the hook from `RefineSidebar.tsx`.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer cannot supply the human visual acceptance the affected records require; that
remains a human decision independent of technical review, per ADR-0006.
