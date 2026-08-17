# FM-041: Display Options Menu With Compact Rows And Recent-Result Highlighting

Status: planned Owner: Feature IDs: F-SEARCH-RESULTS, F-SEARCH-GROUP-SELECTION, F-SEARCH-SORT-FILTER Component IDs: C-RESULT-TABLE API IDs: None Depends on: FM-040 Blocks: FM-042

## Dependency Notes

Third packet of the ADR-0008 structural-redesign batch. It depends on FM-040 because it places a new control into the toolbar FM-040 restructures and relocates the grouping toggles that FM-040's `F-SEARCH-GROUP-SELECTION` re-proposal
describes; landing them in the other order would demote and re-describe the same record twice. It also surfaces FM-039's sidebar-visibility state as a menu entry, so FM-039 must exist first. It blocks FM-042, whose sticky offsets and
scrolled evidence depend on the row height that compact mode changes.

## Outcome

Display preferences for the results list are gathered into one "Display options" menu — the two existing grouping toggles, plus new opt-in compact row density, opt-in highlighting of results newer than three days, and a shortcut for the
Refine sidebar — each persisted with the existing sort and filter choices.

## Boundary Rationale

A menu of preferences that does not change anything is not a reviewable capability, and a density or recency treatment with no way to turn it on is not either; the menu, the two new preferences it exposes, and their row-level rendering are
one deliverable. It is separate from FM-040 because selection and download actions are a different capability with different records, and separate from FM-042 because sticky positioning is unconditional layout behavior rather than a user
preference, with a different failure mode and a different evidence state.

## Decision Dependencies

- Accepted ADRs governing this task: ADR-0002 (MUI-only presentation), ADR-0004 (testing and parity), ADR-0006 (semantic visual parity), ADR-0007 (branded theme tokens and the `dark-dyschromatopsia` variant), ADR-0008 (mock adopted for structure and density only; palette and typography unchanged).
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

- `core/ui-react/src/app/theme.ts`, including its `components.styleOverrides`. A global density, radius, or padding change would restyle every route and invalidate accepted visual records outside the search page; ADR-0008's Option B
  consequences leave `theme.ts` untouched, so compact density is expressed with feature-local styling only. If that proves impossible, stop and escalate rather than editing the theme
- Every palette, typography, and font value from the mock (`oklch` teal/cyan, IBM Plex Sans/Mono)
- Adopting the mock's single "Group duplicates" checkbox. React already groups duplicates unconditionally with per-group expansion (`groupResults`, `visibleGroupedResults`), and the two existing toggles are strictly more capable; this is a
  deliberate non-adoption to be restated in the handoff, not an oversight
- Changing grouping, filtering, sorting, selection, or download semantics; changing the default rendering of the results list (both new preferences default off)
- Sticky positioning (FM-042); server-backed preference storage; any route other than `/`

## Context To Read

- `README.md` (Visual Parity, Workflow, Registry Rules, Verification Integrity), `ADR-0002`, `ADR-0004`, `ADR-0006`, `ADR-0007`, `ADR-0008`
- `F-SEARCH-RESULTS`, `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-SORT-FILTER`, `C-RESULT-TABLE`, and the FM-012, FM-034, FM-039 and FM-040 packets
- `core/ui-react/src/features/search/results/SearchResults.tsx` (the grouping toggles, the `hydra.search-results.table` persistence, the memoized `ResultRow`) and `resultTable.ts` (`ageInDays`)
- `core/ui-react/src/app/theme.ts` — read only, to confirm which token layer must not be touched and how the `dark-dyschromatopsia` variant composes
- `/tmp/hydra mock/Awaiting responses for direction/NZBHydra Search.dc.html` — the display-options popover and the `padY`/`isNew` row treatment only, for structure; its inline colors and fonts are not authoritative
- `tests/system/tests/results.spec.ts` and `tests/system/tests/visualEvidence.ts`

## Acceptance

- A `display-options-toggle` control in the results toolbar opens a `display-options` popover containing: the two existing grouping toggles ("Group torrent and Usenet results" and "Group TV episodes") relocated with unchanged labels and
  behavior, "Compact rows", "Highlight recent", and a "Show refine sidebar" entry bound to the same sidebar-visibility state FM-039 already persists (the sidebar's own toggle remains; both drive one state, asserted by a test). The toggle
  exposes `aria-haspopup` and `aria-expanded`, and every entry exposes its checked state and an accessible name.
- Compact rows is opt-in and defaults off, so the current default row density and every accepted default-state geometry check remain valid. When enabled it measurably tightens row vertical padding and the row-action controls, using
  feature-local styling only.
- Highlight recent is opt-in and defaults off. The mock defaults it on; that is deliberately not adopted, because changing the default rendering would invalidate accepted default-state baselines that only a human may re-accept under
  ADR-0006. Record the non-adoption and its reason in the handoff.
- When enabled, results whose age is at most three days are visually flagged, computed from the existing `epoch` through `resultTable.ts`'s `ageInDays` (results without `epoch` are never flagged), and the flag remains distinguishable under
  the `dark-dyschromatopsia` theme variant — it must not rely on hue alone. Covered by unit tests for the age predicate and a component test for the rendered flag.
- All three new preferences persist in the existing `hydra.search-results.table` localStorage payload alongside sorting and filters. No server-backed storage is introduced and `F-SEARCH-SORT-FILTER`'s `server-backed preferences` gap stays
  open and unchanged.
- Row rendering stays memoized as FM-034 left it: the new preferences reach `ResultRow` as primitives, and enabling either preference must not reintroduce a per-row recomputation or defeat the existing memoization. State this with the
  reasoning in the handoff.
- No existing `data-testid` is removed or renamed; new ones are added to the affected records' `selectors`.
- Registry reconciliation: `F-SEARCH-GROUP-SELECTION`'s contract is updated for the relocated grouping toggles (it is `proposed` after FM-040; do not re-demote or re-accept it), `F-SEARCH-SORT-FILTER`'s persisted-choices contract gains the
  three new preferences, and `F-SEARCH-RESULTS` gains the density and recency states. Compact rows and recency highlighting have no legacy equivalent — confirm against `core/ui-src/js/search-results-controller.js` and
  `core/ui-src/html/directives/search-result.html` rather than assuming — and are recorded as `proposed` variances. Never fabricate or re-date human acceptance.
- Visual contract (ADR-0006), asserted in `results.spec.ts`. States: `display-menu-open`, `compact-rows-enabled`, `recent-highlight-enabled`. Viewports: desktop 1280x800, mobile 390x844. Geometry checks:
    - the open menu renders fully within the viewport with no page horizontal overflow at both viewports;
    - with both preferences off, the results table's height for a fixed visible row count is unchanged from the pre-task baseline;
    - enabling Compact rows measurably reduces the table's height for that same row count while every row's title cell stays free of scrollWidth overflow at both viewports;
    - with Highlight recent enabled, a result at most three days old differs from an older result in at least one non-hue computed property, and the flag adds no horizontal overflow to the row.
  This task's own evidence fixture gains one deliberately older result so the recency distinction is assertable; update only that block's own counts and leave every other spec's fixtures and assertions untouched. Evidence:
  `tests/system/tests/results.spec.ts` plus narrow captures at `visual-evidence/F-SEARCH-RESULTS/display-options-desktop.png` and `compact-rows-desktop.png`.

## Verification

- `npm ci` only if `package.json`/`package-lock.json` change; otherwise the cheapest install that guarantees `node_modules` matches the lockfile. Record which install ran.
- Working directory `core/ui-react`: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api`, `npm run validate:migration` — each expected to pass.
- Working directory `tests/system`: `npx tsc --noEmit` — expected to pass (this task changes a spec).
- Working directory `tests/system`, after `VITE_OUT_DIR=../target/classes/static/react npm run build` from `core/ui-react`: `npx playwright test tests/results.spec.ts`, expected to produce the proposed contracts' evidence. Per FM-034 this
  suite currently fails in this environment during fixture setup on a pre-existing, unrelated black-hole-path config defect. If that reproduces, record the run as blocked with the evidence that it is pre-existing, leave the visual records
  `proposed`, and log it under Temporary Exceptions And Debt with a removal condition. Never report a blocked run as passed. If a run wipes `F-PLATFORM-SHELL`'s evidence PNGs (the known FM-033 gap) and `validate:migration` then fails, rerun
  `tests/smoke.spec.ts` to restore them and record that this happened.
- Repository root: `git diff --check` — expected to produce no output.
- Confirm task-owned changed files are all listed under Files Allowed To Modify, and that no other spec's fixtures or assertions were altered.
- Confirm verification leaves no unexpected generated or modified files; the git-ignored production build under `core/target/classes/static/react` is build output, not a tracked change.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer cannot supply the human visual acceptance the affected records require; that
remains a human decision independent of technical review, per ADR-0006.
