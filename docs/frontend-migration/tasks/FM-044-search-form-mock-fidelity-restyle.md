# FM-044: Search Form Mock-Fidelity Restyle

Status: planned Owner: Feature IDs: F-SEARCH-FORM, F-SEARCH-MEDIA, F-SEARCH-INDEXERS Component IDs: None API IDs: None Depends on: FM-043 Blocks: None

## Dependency Notes

Depends on FM-043 for real palette/typography/density tokens (`theme.ts`) to restyle against; without it this task would invent its own colors, which FM-043's own Boundary Rationale forbids. It does not block or get blocked by any other
packet in this batch: the search form lives in `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`, a file no results-page packet (FM-045, FM-046, FM-041, FM-042) touches, so it may run any time after FM-043 completes,
including in parallel with FM-045. This is the first packet to restyle the search form at all — FM-039 through FM-042's entire batch was results-page-only — and the first to extend mock fidelity to something the mock does not
explicitly show (the indexer bulk-selection split button), per the repository owner's own instruction to follow "the overall design of the mockup" for such gaps.

## Outcome

The search workspace — category, season/episode, the query input and its Search button, title/media autocomplete, and an `Advanced` disclosure holding the age/size ranges — reads at the mock's density and palette instead of ADR-0007's
legacy-grey/green tokens, and the indexer bulk-selection split button (FM-037) and checkbox-mode indexer list are restyled to the same design language even though the mock does not show them.

## Boundary Rationale

The search form is one user-facing region rendered by one component (`SearchWorkspace.tsx`) and one product capability (`F-SEARCH-FORM`, with `F-SEARCH-MEDIA` and `F-SEARCH-INDEXERS` as its media-refinement and indexer-selection
sub-capabilities); its category control, query field, media refinement, indexer selection, and range inputs all change together because they share one container, one grid, and one visual language, and none of the restyled controls is
reviewable in isolation from the others. It is separate from every results-page packet because the search form and the results table are different routes' worth of visual real estate sharing only the global shell tokens FM-043 already
defines, and separate from FM-043 itself because a token definition is not a reviewable capability without a real consumer restyled against it.

## Decision Dependencies

- Accepted ADRs governing this task: ADR-0002 (MUI-only presentation), ADR-0004 (testing and parity), ADR-0006 (semantic visual parity), ADR-0007 (branded theme tokens; superseded by ADR-0009 for palette/typography/density), ADR-0009
  (full mock fidelity, including extending its design language to elements the mock omits).
- Proposed or rejected ADRs blocking this task: None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`, `SearchWorkspace.test.tsx`
- `tests/system/tests/search.spec.ts` — only `F-SEARCH-FORM`'s, `F-SEARCH-MEDIA`'s, and `F-SEARCH-INDEXERS`'s own visual-evidence blocks
- `docs/frontend-migration/FEATURES.yaml` — only `F-SEARCH-FORM`'s, `F-SEARCH-MEDIA`'s, and `F-SEARCH-INDEXERS`'s `visual`, `selectors`, and `tests` fields
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- `core/ui-react/src/app/theme.ts` and `AppShell.tsx` (FM-043's territory; read their tokens, do not edit them)
- `core/ui-react/src/features/search/SearchPage.tsx`, `results/**`, `history/**` — every other search-page region and every other route
- Replacing the dropdown/checkbox indexer-selection *mechanism* with the mock's minimal indexer-chip row: the mock's chips have no equivalent of the existing controls' group actions, reset-to-preselection, or usenet/torznab bulk
  selection, so replacing them would remove capability. Restyle the existing controls; do not build a second, competing indexer-selection surface
  from `RefineSidebar`'s own toggle-row conversion — flag as optional, out-of-batch follow-up in the handoff rather than performing it here
- Season/episode: adopt the mock's compact, inline-paired visual treatment (see Acceptance); do not merge the two into a single combined input or change their underlying form fields, validation, or `data-testid`s
- Server-backed preference storage, autocomplete request/response behavior, guided tour, and category/media domain logic (`domain/categories`, `api/media`) — restyle only, no behavioral change

## Context To Read

- `README.md` (Visual Parity, Workflow, Registry Rules, Verification Integrity), `ADR-0002`, `ADR-0004`, `ADR-0006`, `ADR-0007`, `ADR-0009`
- `F-SEARCH-FORM`, `F-SEARCH-MEDIA`, `F-SEARCH-INDEXERS`, and the FM-016, FM-025, and FM-037 packets (the accepted/proposed contracts and the split-button precedent this task restyles)
- `core/ui-react/src/app/theme.ts` (read only, post-FM-043, for the tokens this task must consume rather than reinvent)
- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx` in full (the `workspace-primary` grid, `workspace-media-refinement`, `workspace-indexers`, `workspace-ranges`, `workspace-actions`, `IndexerSelectionButton`)
- `/tmp/hydra mock/Awaiting responses for direction/NZBHydra Search.dc.html` — the search-bar row (`<div style="...background:#232a2c...">`), its category/season-episode/query/Advanced-toggle markup, and the Advanced disclosure block
  only, for structure, density, and color values
- `tests/system/tests/search.spec.ts` and `tests/system/tests/visualEvidence.ts`

## Acceptance

- The search-bar row (category select, season/episode, query input/button, `Advanced` toggle) renders on its own surface distinct from the page background, using the mock's `#232a2c` row background, `14px 18px` padding, and
  `10px` control gap, with the category select and query input at the mock's `11px` border radius.
- Season and episode render as a compact, inline-paired control (not two independently-labeled full-width `TextField`s stacked in a grid): small (`~40–60px`) centered, monospace-font (IBM Plex Mono, from FM-043) inputs with short
  adjacent "S"/"E" labels, matching the mock's paired treatment. The underlying `season`/`episode` form fields, their numeric-only/free-text validation, and their existing `register(...)` bindings are unchanged; only presentation and
  layout change.
- The query input and its Search button render as the mock's single visually-joined control: a rounded (`11px`) input field on the row's own `#1c2224` fill, with the Search button embedded at its trailing edge using
  `primary.main` (the new teal) as its background and the theme's new `textTransform: "none"` button styling from FM-043 (button text reads "Search", not "SEARCH").
- The autocomplete popup (`autocomplete-popup`) and its options restyle to the row's `#2a3133`/`11px`-radius surface, matching the mock's suggestion-panel treatment; every existing `data-testid`, keyboard interaction (arrow
  navigation, Enter-to-select, Escape-to-dismiss), and loading/empty/error `Alert` state is unchanged in behavior.
- A new `search-advanced-toggle` button (matching the mock's chevron-labeled "Advanced" toggle) shows/hides a `search-advanced-panel` region; the existing Age/Size range fields (`workspace-ranges`, currently always visible) relocate
  into this panel, defaulting to collapsed. This is a deliberate structural adoption of the mock's own disclosure pattern, not merely a color change — record it explicitly in the handoff as such. Every relocated field keeps its exact
  current `data-testid`, label text, validation, and `register(...)` binding; no capability is removed, only its default visibility and container change. The toggle exposes `aria-expanded`.
- The indexer bulk-action split button (`IndexerSelectionButton`, FM-037) and the checkbox-mode indexer list restyle to the new palette/density (button/menu surfaces on `#2a3133`, `primary.main` teal for active/hover affordances,
  the theme's new button radius and `textTransform: "none"`) with no change to its action set, order, icons, or accessibility (`aria-haspopup`, `aria-expanded`, `role="menu"`/`"menuitem"`) — this is the ADR-0009-named example of
  extending the mock's design language to a control the mock itself does not show.
- No existing `data-testid` is removed or renamed; every new one (`search-advanced-toggle`, `search-advanced-panel`, and any control-specific ones introduced for the season/episode pair) is added to the affected records' `selectors`.
- Registry reconciliation: `F-SEARCH-FORM` and `F-SEARCH-MEDIA` (currently `accepted`) are demoted to `proposed` — their accepted geometry evidenced the FM-031 branded theme's colors and the always-visible age/size layout, both of
  which this task changes — with a `note` naming this task and what changed, following the FM-034/037/039/040 precedent; never fabricate or re-date acceptance. `F-SEARCH-INDEXERS` (already `proposed` since FM-037) gets its `note`
  extended to record the palette/density restyle without re-litigating FM-037's own structural claim.
- Visual contract (ADR-0006), asserted in `search.spec.ts`. States: `search-bar-row-density`, `advanced-panel-collapsed`, `advanced-panel-expanded`, `paired-season-episode-compact`. Viewports: desktop 1280x800, mobile 390x844.
  Geometry checks:
    - the search-bar row and page have no horizontal overflow at either viewport, and the row's computed background color differs from the page's `background.default`;
    - collapsed, the Advanced panel is not rendered/visible and the row's height is measurably shorter than expanded; expanded, every relocated Age/Size field is visible with no scrollWidth overflow;
    - the season/episode pair's combined bounding-box width is less than half of a single legacy-style full-width labeled `TextField`'s width, and both inputs remain individually operable via keyboard;
    - the indexer split button and its open dropdown menu render with no menu or page horizontal overflow at both viewports, matching the mock's control surfaces.
  Evidence: `tests/system/tests/search.spec.ts` plus narrow captures at `visual-evidence/F-SEARCH-FORM/search-bar-density-desktop.png` and `-mobile.png`.

## Verification

- `npm ci` only if `package.json`/`package-lock.json` change; otherwise the cheapest install that guarantees `node_modules` matches the lockfile. Record which install ran.
- Working directory `core/ui-react`: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api`, `npm run validate:migration` — each expected to pass.
- Working directory `tests/system`: `npx tsc --noEmit` — expected to pass (this task changes a spec).
- Working directory `tests/system`, after `VITE_OUT_DIR=../target/classes/static/react npm run build` from `core/ui-react`: `npx playwright test tests/search.spec.ts`, expected to produce the proposed contracts' evidence.
- Repository root: `git diff --check` — expected to produce no output.
- Confirm task-owned changed files are all listed under Files Allowed To Modify, and that no other spec's fixtures or assertions were altered.
- Confirm verification leaves no unexpected generated or modified files; the git-ignored production build under `core/target/classes/static/react` is build output, not a tracked change.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer cannot supply the human visual acceptance the affected records require;
that remains a human decision independent of technical review, per ADR-0006.
