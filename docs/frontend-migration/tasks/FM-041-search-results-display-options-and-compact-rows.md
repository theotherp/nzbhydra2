# FM-041: Display Options Menu With Compact Rows And Recent-Result Highlighting

Status: planned Owner: Feature IDs: F-SEARCH-RESULTS, F-SEARCH-GROUP-SELECTION, F-SEARCH-SORT-FILTER Component IDs: C-RESULT-TABLE API IDs: None Depends on: FM-046 Blocks: FM-042

**Refined under ADR-0009 (2026-08-17):** this packet was originally scoped against ADR-0008's Option B (structure only, ADR-0007 palette/typography unchanged) and never implemented. ADR-0009 supersedes ADR-0008 and requires full
mock fidelity — palette, typography, and density, not structure alone. This packet's Outcome and Boundary Rationale still hold unchanged (a preferences menu, compact rows, and recency highlighting remain one coherent, separately
reviewable capability), so it is refined in place rather than replaced: its dependency is redirected from FM-040 to FM-046 (the mock-fidelity remediation of the same toolbar/selection region FM-040 built structurally), its
`Decision Dependencies` and `Out Of Scope` are updated to require rather than forbid the mock's palette/density values, and its Acceptance gains concrete mock color/spacing values below. Everything else — the menu contents, the
opt-in defaults, the non-adoption of the mock's single "Group duplicates" checkbox — is unchanged from the original packet's reasoning.

## Dependency Notes

Third packet of the batch. It depends on FM-046 (not the original FM-040) because FM-046 is the mock-fidelity remediation of the same toolbar FM-040 built structurally: this task places a new control into that toolbar and
relocates the grouping toggles FM-040's `F-SEARCH-GROUP-SELECTION` re-proposal describes, and doing so against FM-046's final palette/density shape avoids restyling the same region twice. It also surfaces FM-045's sidebar-visibility
state (the "Show refine sidebar" entry now also controls FM-045's mobile drawer, not only a desktop collapse), so FM-045 must exist first — satisfied transitively through FM-046's own dependency on FM-045. It blocks FM-042, whose
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
- Sticky positioning (FM-042); server-backed preference storage; any route other than `/`

## Context To Read

- `README.md` (Visual Parity, Workflow, Registry Rules, Verification Integrity), `ADR-0002`, `ADR-0004`, `ADR-0006`, `ADR-0007` (historical), `ADR-0008` (historical), `ADR-0009`
- `F-SEARCH-RESULTS`, `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-SORT-FILTER`, `C-RESULT-TABLE`, and the FM-012, FM-034, FM-045, and FM-046 packets
- `core/ui-react/src/features/search/results/SearchResults.tsx` (the grouping toggles, the `hydra.search-results.table` persistence, the memoized `ResultRow`) and `resultTable.ts` (`ageInDays`)
- `core/ui-react/src/app/theme.ts` — read only, to confirm the tokens FM-043 landed and how the `dark-dyschromatopsia` variant composes
- `/tmp/hydra mock/Awaiting responses for direction/NZBHydra Search.dc.html` — the display-options popover (`showDisplayMenu` block) and the `padY`/`isNew` row-treatment logic in the `renderVals()` script, for both structure and the
  exact color/spacing values now in scope
- `tests/system/tests/results.spec.ts` and `tests/system/tests/visualEvidence.ts`

## Acceptance

- A `display-options-toggle` control in the results toolbar opens a `display-options` popover containing: the two existing grouping toggles ("Group torrent and Usenet results" and "Group TV episodes") relocated with unchanged labels and
  behavior, "Compact rows", "Highlight recent", and a "Show refine sidebar" entry bound to the same sidebar-visibility state FM-045 already persists (the sidebar's own toggle, and FM-045's mobile drawer trigger, remain; all three drive
  one state, asserted by a test). The toggle exposes `aria-haspopup` and `aria-expanded`, and every entry exposes its checked state and an accessible name. The popover renders on the mock's surface: `#2a3133` background, `11px` border
  radius, `min-width: 220px`, matching the results-toolbar's other popovers (FM-046).
- Compact rows is opt-in and defaults off, so the current default row density and every accepted default-state geometry check remain valid. When enabled it sets the table row's vertical padding to the mock's compact value (`7px`,
  down from the mock's normal `11px`, both now the actual target values rather than approximations) and tightens the row-action controls proportionally, using feature-local styling only.
- Highlight recent is opt-in and defaults off. The mock defaults it on; that is deliberately not adopted, because changing the default rendering would invalidate accepted default-state baselines that only a human may re-accept under
  ADR-0006. Record the non-adoption and its reason in the handoff.
- When enabled, results whose age is at most three days are visually flagged, computed from the existing `epoch` through `resultTable.ts`'s `ageInDays` (results without `epoch` are never flagged). The flag uses at least two non-hue
  computed properties together — matching the mock's own combination of an accent-teal age-column text color (`primary.light`/`oklch(0.82 0.1 190)`, replacing the default `#9aa2a1`-equivalent muted tone) and a left-edge accent stripe
  (an inset box-shadow or border in `oklch(0.75 0.1 190 / 0.4)`) — so the flag remains distinguishable under the `dark-dyschromatopsia` theme variant, which does not rely on hue alone. Covered by unit tests for the age predicate and a
  component test for the rendered flag's non-hue property.
- All three new preferences persist in the existing `hydra.search-results.table` localStorage payload alongside sorting and filters. No server-backed storage is introduced and `F-SEARCH-SORT-FILTER`'s `server-backed preferences` gap stays
  open and unchanged.
- Row rendering stays memoized as FM-034 left it: the new preferences reach `ResultRow` as primitives, and enabling either preference must not reintroduce a per-row recomputation or defeat the existing memoization. State this with the
  reasoning in the handoff.
- No existing `data-testid` is removed or renamed; new ones are added to the affected records' `selectors`.
- Registry reconciliation: `F-SEARCH-GROUP-SELECTION`'s contract is updated for the relocated grouping toggles (it is `proposed` after FM-040/FM-046; do not re-demote or re-accept it), `F-SEARCH-SORT-FILTER`'s persisted-choices
  contract gains the three new preferences, and `F-SEARCH-RESULTS` gains the density and recency states, all against the FM-043 mock palette. Compact rows and recency highlighting have no legacy equivalent — confirm against
  `core/ui-src/js/search-results-controller.js` and `core/ui-src/html/directives/search-result.html` rather than assuming — and are recorded as `proposed` variances. Never fabricate or re-date human acceptance.
- Visual contract (ADR-0006), asserted in `results.spec.ts`. States: `display-menu-open`, `compact-rows-enabled`, `recent-highlight-enabled`. Viewports: desktop 1280x800, mobile 390x844. Geometry checks:
    - the open menu renders fully within the viewport with no page horizontal overflow at both viewports, on the mock's `#2a3133`/`11px`-radius surface;
    - with both preferences off, the results table's height for a fixed visible row count is unchanged from the pre-task baseline;
    - enabling Compact rows measurably reduces the table's height for that same row count (row padding moving from `11px` to `7px`) while every row's title cell stays free of scrollWidth overflow at both viewports;
    - with Highlight recent enabled, a result at most three days old differs from an older result in at least two non-hue computed properties (text color and stripe/border presence), and the flag adds no horizontal overflow to the row.
  This task's own evidence fixture gains one deliberately older result so the recency distinction is assertable; update only that block's own counts and leave every other spec's fixtures and assertions untouched. Evidence:
  `tests/system/tests/results.spec.ts` plus narrow captures at `visual-evidence/F-SEARCH-RESULTS/display-options-desktop.png` and `compact-rows-desktop.png`.

## Verification

- `npm ci` only if `package.json`/`package-lock.json` change; otherwise the cheapest install that guarantees `node_modules` matches the lockfile. Record which install ran.
- Working directory `core/ui-react`: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api`, `npm run validate:migration` — each expected to pass.
- Working directory `tests/system`: `npx tsc --noEmit` — expected to pass (this task changes a spec).
- Working directory `tests/system`, after `VITE_OUT_DIR=../target/classes/static/react npm run build` from `core/ui-react`: `npx playwright test tests/results.spec.ts`, expected to produce the proposed contracts' evidence.
- Repository root: `git diff --check` — expected to produce no output.
- Confirm task-owned changed files are all listed under Files Allowed To Modify, and that no other spec's fixtures or assertions were altered.
- Confirm verification leaves no unexpected generated or modified files; the git-ignored production build under `core/target/classes/static/react` is build output, not a tracked change.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer cannot supply the human visual acceptance the affected records require; that
remains a human decision independent of technical review, per ADR-0006.
