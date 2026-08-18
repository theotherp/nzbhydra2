# FM-044: Search Form Mock-Fidelity Restyle

Status: done Owner: migration-implementer Feature IDs: F-SEARCH-FORM, F-SEARCH-MEDIA, F-SEARCH-INDEXERS Component IDs: None API IDs: None Depends on: FM-043 Blocks: None

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
- `tests/system/tests/search.spec.ts` — only `F-SEARCH-FORM`'s, `F-SEARCH-MEDIA`'s, and `F-SEARCH-INDEXERS`'s own visual-evidence blocks, plus, inside another feature's existing block, the minimum actionability steps (opening
  `search-advanced-toggle`) that Playwright's visibility requirement makes unavoidable solely because Acceptance relocates the Age/Size fields into a panel that defaults to collapsed. Such a step may not add, remove, weaken, reorder,
  or re-scope any assertion, locator, fixture, or payload expectation belonging to another feature, and may not be used for any other kind of edit; every other change to another feature's block stays out of scope and must be escalated
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
- `uimock/NZBHydra Search.dc.html` — the search-bar row (`<div style="...background:#232a2c...">`), its category/season-episode/query/Advanced-toggle markup, and the Advanced disclosure block
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

## Task Designer Refinement

- Prompted by the independent review of the completed implementation, which found no implementation defect but a genuine internal inconsistency in this packet. The only change is to the `tests/system/tests/search.spec.ts` entry under
  `Files Allowed To Modify`. `Outcome`, `Boundary Rationale`, `Decision Dependencies`, `Out Of Scope`, `Context To Read`, `Acceptance`, and `Verification` are unchanged, as is the task's status.
- The inconsistency: Acceptance mandates that the existing Age/Size fields relocate into `search-advanced-panel` and default to collapsed, while keeping every field's `data-testid`, label, validation, and `register(...)` binding and
  removing no capability. `F-SEARCH-RECENT`'s existing behavioral test `should refill and repeat complete recent React search criteria` calls Playwright `.fill()` on those exact fields, and Playwright's actionability check requires
  visibility, so under the mandated collapsed default that pre-existing test cannot pass unless the disclosure is opened first. The former allowlist wording permitted no edit anywhere in that block, so the packet demanded a change whose
  only conforming realization it simultaneously forbade. The clarified wording authorizes exactly that unavoidable actionability step and nothing else; it narrows rather than broadens by naming the one permitted kind of edit and
  restating that another feature's assertions, locators, fixtures, and payload expectations remain untouchable.
- Decision sources, all pre-existing and authoritative: this packet's own Acceptance bullet mandating the collapsed-by-default relocation with no capability removed; Playwright's actionability semantics for `fill()` against the
  relocated fields in `tests/system/tests/search.spec.ts`'s `F-SEARCH-RECENT` block; and `README.md`'s Verification Integrity rule that tests may not be weakened, skipped, or suppressed to obtain a passing result, which forecloses
  deleting or disabling that test as an alternative. No new product, UX, architecture, API-contract, or migration decision is introduced, and no ADR is implicated.
- Consequence for the recorded handoff: the sub-file deviation disclosed under `Temporary Exceptions And Debt` is within scope under this wording. The handoff's factual record is left exactly as written; the deviation stands as
  accurate contemporaneous evidence of a packet defect, not as the justification for the refinement, which follows from the packet's own Acceptance independently of whether any implementation existed.
- The unrelated pre-existing `Refill` failure in that same test (introduced by FM-038, `b949b6fe0`) remains outside this packet, as the existing `Follow-Up Work` entry records. Nothing here authorizes repairing it.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`.

### Outcome

The search workspace now reads at the mock's density and palette. The category select, an optional compact season/episode pair, the query field with its embedded Search button, and a new `Advanced` disclosure toggle sit in one
`#232a2c` search-bar row (`14px 18px` padding, `10px` control gap, `11px` control radius) that is visually distinct from both the page background and the workspace card below it. The query field is the mock's single joined control: a
`#1c2224` rounded field with a leading search glyph and the teal `primary.main` Search button at its trailing edge, labelled "Search" in sentence case from FM-043's `textTransform: "none"`. The autocomplete popup is now anchored under
that field on the mock's `#2a3133`/`11px` suggestion surface. The Age/Size ranges moved out of the always-visible `workspace-ranges` grid into a `search-advanced-panel` that the new `search-advanced-toggle` opens, defaulting to
collapsed. The `IndexerSelectionButton` split button, its dropdown menu, and the checkbox-mode indexer list carry the same control surfaces even though the mock does not show them. No `data-testid`, accessible label, validation rule,
`register(...)` binding, action, icon, or ARIA relationship was removed or renamed; the season/episode and Age/Size fields keep their exact previous accessible names, now carried by `aria-label` instead of a visible caption the mock's
40-74px fields cannot hold.

### Deliberate Structural Adoptions

Both are called out explicitly because they are structure, not color:

1. **Advanced disclosure relocation.** The Age/Size ranges were always visible; they are now inside `search-advanced-panel`, revealed by `search-advanced-toggle` (`aria-expanded`, `aria-controls`), collapsed by default. This adopts the
   mock's own disclosure block (`<sc-if value="{{ showAdvanced }}">`, `margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06)`) and the mock's `Age (days)` / `Size (MB)` uppercase group captions over bare 74px
   monospace min/max inputs. The panel stays mounted and is hidden with `display: none`, so every field remains addressable and programmatically settable; only its default visibility and container changed. No capability was removed.
2. **Extending the mock's language to the indexer split button.** The mock has no indexer bulk-action control at all. Per ADR-0009's own named example, `IndexerSelectionButton` and its menu were restyled onto the row's `#2a3133`
   control surface with the mock's `11px` menu radius, teal hover/active affordances, and the theme's button radius and `textTransform: "none"`. The checkbox-mode indexer list was densified the same way. Its action set, order, icons,
   `aria-haspopup`, `aria-expanded`, `role="menu"`, and `role="menuitem"` are byte-for-byte unchanged, and its FM-037 structural claim is not re-litigated.

### Files Modified

- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`, `SearchWorkspace.test.tsx`
- `tests/system/tests/search.spec.ts`
- `docs/frontend-migration/FEATURES.yaml` (only `F-SEARCH-FORM`, `F-SEARCH-MEDIA`, `F-SEARCH-INDEXERS` `visual`/`selectors`/`tests`)
- `docs/frontend-migration/STATUS.md` and this task packet
- Scope confirmation: every task-owned modification is within `Files Allowed To Modify`, with one disclosed sub-file deviation recorded under *Temporary Exceptions And Debt* below. The working tree carried no pre-existing unrelated
  change: the tree was clean at `68e4e2f9a` apart from the coordinator's own FM-044 lifecycle writes to this packet and `STATUS.md`, which this handoff builds on. Untracked/ignored outputs only: the regenerated
  `tests/system/visual-evidence/F-SEARCH-FORM/*.png` captures (git-ignored via `tests/.gitignore:33`, the same status as FM-039's and FM-043's captures) and the git-ignored production build under `core/target/classes/static/react`.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: `Playwright (tests/system, chromium)` via `misc/run_gui_systemtest.py --runtime local`; Maven `mvn` (invoked by that launcher); Docker (sonarr/radarr fixtures, started by that launcher)

### Verification Evidence

| Working directory | Command | Result |
|-------------------|---------|--------|
| `core/ui-react` | **No install ran.** `npm ls --depth=0` (exit `0`, no `missing`/`invalid`) plus `git status --porcelain package.json package-lock.json` (empty) | Passed. This task changes neither `package.json` nor `package-lock.json` and `node_modules` already matched the lockfile, so per the packet and the README's install exception the cheapest correct install is none. `npm ci` was deliberately **not** run. |
| `core/ui-react` | `npm run typecheck` | Passed (no output). |
| `core/ui-react` | `npm run lint` | Passed: `0 errors, 7 warnings` — the identical pre-existing warning set FM-043 recorded (4 `react-refresh/only-export-components` plus 1 `react-hooks/incompatible-library` in `SearchWorkspace.tsx`, 1 in `IndexerStatusesPage.tsx`, 1 in `router.tsx`). Count and kind unchanged by this task; nothing suppressed. |
| `core/ui-react` | `npm run format:check` | Passed for task-owned files after `npx prettier --write src/features/search/workspace/SearchWorkspace.tsx src/features/search/workspace/SearchWorkspace.test.tsx` (the test file was already clean). The report is back to the same 11 pre-existing, out-of-scope files FM-043 recorded: `.playwright-cli/*.yml` x5, `README.md`, `src/features/search/SearchPage.tsx`, `src/router.tsx`, `tsconfig.json`, `vite/devBackend.test.ts`, `vite/devBackend.ts`. |
| `core/ui-react` | `npm run test -- --run` | **Passed: 38 files, 212/212 tests** (210 before, plus this task's two new `SearchWorkspace.test.tsx` cases). Nothing skipped, deleted, weakened, or suppressed. `SearchPage.test.tsx`'s existing `getByLabelText("Minimum age (days)")`/`("Season")` cases pass unchanged against the relocated, `aria-label`-named fields. |
| `core/ui-react` | `npm run build` | Passed: `assets/index.css` 12.30 kB, `assets/index.js` 1,005.68 kB (gzip 307.04 kB), `built in 2.02s`. |
| `core/ui-react` | `npm run check:api` | Passed ("Generated OpenAPI types are current."). |
| `core/ui-react` | `npm run validate:migration` | Passed ("Migration registries and task metadata are valid.") on the final tree. Run last, because the two `F-SEARCH-FORM` `snapshots` paths must exist on disk, which they only do after the Playwright run below. |
| `tests/system` | `npx tsc --noEmit` | Passed (exit `0`, no output). |
| `core/ui-react` | `VITE_OUT_DIR=../target/classes/static/react npm run build` | Passed; emits the same unhashed `index.css`/`index.js` entry pair into the git-ignored production output the system test serves. Re-run after the baseline comparison below so the served bundle is the final implementation. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/search.spec.ts` (the documented real-backend launcher: Maven-built `core`/`mockserver` exec JARs plus the sonarr/radarr Docker fixtures; `vite dev` was not used) | **13 of 14 passed; 1 failed, and that failure is pre-existing and unrelated — proven, not asserted (next row).** Everything this task owns passed, including `should provide deterministic React workspace visual evidence across desktop and mobile` (4.4 s), which carries all three affected records' contracts, and `should submit the explicit React indexer selection in both presentations` (4.2 s), which exercises the restyled split button end to end. The one failure is `should refill and repeat complete recent React search criteria` at `expect(getByRole('menuitem', {name: 'Refill'}).first()).toBeVisible()` — `element(s) not found`. |
| repository root | **Pre-existing-failure proof.** `git stash push` (working tree reduced to a clean `68e4e2f9a`, verified by `git status --porcelain` being empty), then `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 600 -- tests/search.spec.ts --grep "refill and repeat"`, then `git stash pop` | **Failed identically at baseline: `1 failed`, `Locator: getByRole('menuitem', { name: 'Refill' }).first()`, `element(s) not found`.** The assertion has been broken since FM-038 (`b949b6fe0`), which turned the refill control into an icon `button` nested inside a `menuitem` whose accessible name is `Repeat: <description>` — and whose own diff to `search.spec.ts` changed only the menu-width bound, leaving these two `menuitem`/`Refill` lines untouched (`git show b949b6fe0 -- tests/system/tests/search.spec.ts`). The current component's unit tests already address it correctly as `getByRole("button", {name: /^Refill:/})`. This belongs to `F-SEARCH-RECENT`'s behavioral block, which this packet's `Files Allowed To Modify` does not cover, so it is reported rather than repaired; see *Follow-Up Work*. All working-tree files were byte-compared against a pre-stash backup after `git stash pop` and are identical. |
| repository root | `git diff --check` | Passed (no output). |
| repository root | `git status --porcelain` | Passed: exactly the six task-owned modified paths, no unexpected generated or modified file. The `core/target/classes/static/react` build output and the `tests/system/visual-evidence/**` captures are both git-ignored. |
| `tests/system` | Narrow visual captures | Produced: `visual-evidence/F-SEARCH-FORM/search-bar-density-desktop.png` (6,487 B) and `-mobile.png` (6,607 B), both written by the passing visual-evidence test and both referenced from `F-SEARCH-FORM`'s `snapshots`. |

Geometry coverage actually asserted by the passing visual-evidence test, per the packet's Acceptance list: no horizontal overflow of the search-bar row or page at 1280x800 and 390x844 and an opaque row background differing from the
page's `background.default`; the Advanced panel hidden with `aria-expanded=false` while collapsed and the row measurably taller once expanded, with all four relocated Age/Size fields visible and free of `scrollWidth` overflow; the
season/episode pair narrower than half the full-width `additional-query` field and both inputs driven by real keyboard focus and typing; and the indexer split button contained in `workspace-indexers` with its open menu overflow-free at
both viewports.

### Verification Basis

- Baseline: `68e4e2f9a`.
- Command coverage:
  - `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `VITE_OUT_DIR=... npm run build`: `SearchWorkspace.tsx`, `SearchWorkspace.test.tsx`.
  - `tests/system` `npx tsc --noEmit` and the Playwright run: `SearchWorkspace.tsx`, `SearchWorkspace.test.tsx`, `tests/system/tests/search.spec.ts`.
  - `npm run validate:migration`: `docs/frontend-migration/FEATURES.yaml` (plus this packet's `Status` line and `STATUS.md`, which are lifecycle documentation and were finalized before it ran).
  - `npm run check:api`, `git diff --check`: no task-owned implementation or test file affects them beyond the three above.
- File-content manifest (SHA-256):
  - `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`: `993d91d3f5a4da65a99cc0d7437da6fc7839c0a381de1a71c0f16e98d4c323ca`
  - `core/ui-react/src/features/search/workspace/SearchWorkspace.test.tsx`: `1ca676f5c9034625768db9258a07584c67c4872b1c2faf2f8b8ba077eb6a1398`
  - `tests/system/tests/search.spec.ts`: `fb378e3b06de2e64da91f913ff957eddd202bf626948a7311a858bfad6b1a4c0`
  - `docs/frontend-migration/FEATURES.yaml`: `08b56afa1ce5044aefb352f458acd847b8b81e5049811dc3125b71a1d045cb65`
- Completed after the last change to each command's listed files: `yes` for every command. The `git stash`/`git stash pop` baseline comparison restored all four files byte-identically (verified by `diff` against a pre-stash backup), so
  no file changed after its command's evidence was produced.
- Task-owned changes after verification: this packet's `Handoff` section and `Status: in_progress` -> `Status: review`, and `STATUS.md`'s section move — documentation and lifecycle only. `docs/frontend-migration/FEATURES.yaml` and
  `STATUS.md` were both final before the last `npm run validate:migration`, which is the only command their contents affect.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: `None`.
- Development dependencies added, removed, or changed: `None`.

### Architecture Decisions

- ADR-0002 (MUI-only presentation): every new control is MUI — `InputBase` for the bare query, season/episode, and range inputs; `Box`/`Paper`/`Button`/`Typography` for the row, disclosure, and suggestion surfaces. No new component
  system, no raw HTML form control, no CSS framework.
- ADR-0004 / ADR-0006: behavioral, accessibility, and visual gates kept independent. Two new component tests cover the disclosure's behavior and the row's composition; the visual contracts are `proposed` evidence only, and nothing in
  this handoff treats the passing behavioral or geometry assertions as human visual acceptance.
- ADR-0007 / ADR-0009: ADR-0007's legacy-grey tokens are superseded for this surface. Everything the theme already carries (teal `primary.main`, IBM Plex Sans/Mono via `monoFontFamily`, the button radius, `textTransform: "none"`) is
  consumed from `theme.ts` rather than restated; only the mock's five row-local surface literals (`#232a2c`, `#2a3133`, `#1c2224`, the three `rgba(255,255,255,…)` hairlines, `11px`) are defined locally, with a sourcing comment, because
  the mock uses them for this one row and `theme.ts` is FM-043's file and out of scope here. ADR-0009's instruction to extend the mock's language to elements it omits is applied to the indexer split button, as recorded above.
- `ADR REQUIRED` proposal triggered: `None`.

### Assumptions

- The mock's `<sc-if>`/`{{ }}` markup is a prototype template, not shippable code; its measured values (`#232a2c`, `14px 18px`, `10px`, `11px`, `#1c2224`, `#2a3133`, `74px`/`34px` inputs, `Age (days)`/`Size (MB)` captions) are the
  contract, its templating is not.
- The packet's `~40–60px` season/episode width supersedes the mock's literal `34px`; `40px` was chosen as the narrowest value inside that range, which keeps the pair comfortably under half the `additional-query` width at 390px.
- Preserving `getByLabelText`/`getByLabel` call sites outside this task's write scope (`SearchPage.test.tsx`, `search.spec.ts`) requires the relocated and compacted fields to keep their exact accessible names. `aria-label` was used
  where the mock has no visible caption, and the category `InputLabel` is clipped rather than removed so MUI's `aria-labelledby` name computation for that `combobox` is untouched.
- `COMPONENTS.yaml` and `APIS.yaml` were searched before writing any shared code; nothing shared was introduced, so neither registry needed a new ID. Both are unchanged.

### Temporary Exceptions And Debt

- **Disclosed sub-file scope deviation, requiring coordinator ratification.** `Files Allowed To Modify` limits `tests/system/tests/search.spec.ts` to `F-SEARCH-FORM`/`F-SEARCH-MEDIA`/`F-SEARCH-INDEXERS`'s *visual-evidence* blocks.
  Two lines were also added to `F-SEARCH-RECENT`'s behavioral test `should refill and repeat complete recent React search criteria`: a `getByTestId("search-advanced-toggle").click()` before it fills Minimum age / Maximum size, and one
  after its `Refill` click (refilling remounts the workspace, so the disclosure re-collapses). Reason: the packet mandates that those exact fields default to collapsed, and Playwright's `fill()` requires visibility, so that test cannot
  pass without opening the disclosure first — the packet's narrowing did not anticipate the consequence of its own Acceptance bullet. **No assertion was changed, weakened, or removed**; both additions are actionability steps only, and
  the test's payload assertions (`minage: 2`, `maxsize: 50`) passed unchanged, proving the relocated fields still bind. Impact: one behavioral test of another feature contains two task-attributable lines. Removal condition: none needed
  — the lines are permanent and correct; they only need the coordinator to confirm the scope reading. Note that the second of the two lines was **not executed** by the run, because the pre-existing `Refill` failure above aborts the
  test before reaching it; the same refill-then-read-relocated-values path is covered at unit level by `SearchPage.test.tsx`'s passing `Minimum age (days)`/`Maximum size (MB)` assertions after a refill.
- No other workaround, suppression, or weakened check.

### Registry And Documentation Updates

- **`F-SEARCH-FORM`** — `visual.status` demoted `accepted` -> `proposed`; the prior 2026-08-16 `acceptance` block removed (recoverable from Git history) and replaced by a `note` naming FM-044 and exactly what changed, following the
  FM-034/FM-037/FM-039/FM-040 precedent. Contract `states` are now `search-bar-row-density`, `advanced-panel-collapsed`, `advanced-panel-expanded`, `terminal-submission`; `viewports` unchanged (desktop 1280x800, mobile 390x844);
  `geometry_checks` rewritten to the six checks the spec actually asserts; `evidence` unchanged (`tests/system/tests/search.spec.ts`); `snapshots` added for the two narrow captures; `variances: []` — none recorded, so no variance
  disposition is pending. `selectors` gained `search-advanced-toggle` and `search-advanced-panel`; `tests` gained `SearchWorkspace.test.tsx`. `target`, `parity`, `gaps`, `task`, and `backlog` intentionally unchanged (outside this
  packet's field scope and still accurate). **Human acceptance pending** — no human decision was recorded, and none was implied by the passing technical gates.
- **`F-SEARCH-MEDIA`** — `visual.status` demoted `accepted` -> `proposed` on the same pattern, prior 2026-08-16 `acceptance` removed and replaced by a `note`. `states` now `tv-title-refinement`, `paired-season-episode-compact`;
  `viewports` unchanged; `geometry_checks` rewritten for the compact pair; `evidence` unchanged; `variances: []`. `selectors` gained `season-episode-pair`. `tests` intentionally unchanged (already lists both relevant specs). `target`,
  `parity`, `gaps`, `task`, `backlog` intentionally unchanged. **Human acceptance pending.**
- **`F-SEARCH-INDEXERS`** — already `proposed` since FM-037 and left `proposed`; only its existing `note` was extended to record FM-044's palette/density restyle of the split button, its menu, and the checkbox list, and to state
  explicitly that no action, order, icon, or ARIA semantics changed and that FM-037's structural claim is not re-litigated. `contract` (states, viewports, geometry checks), `evidence`, `variances`, `selectors`, `tests`, `target`,
  `parity`, `gaps`, `task`, and `backlog` all intentionally unchanged; the existing checks were re-evidenced by this task's own run. **Human acceptance pending.**
- `COMPONENTS.yaml`, `APIS.yaml`: intentionally unchanged — no shared component or API wrapper was created, changed, or newly consumed. `C-CATEGORY-CATALOG`'s and `C-API-TRANSPORT`'s existing `F-SEARCH-FORM`/`F-SEARCH-INDEXERS`
  consumer entries remain correct.
- `STATUS.md`: FM-044 moved from `Upcoming` to `Review`, and the ADR-0009 batch paragraph updated to record the outstanding human visual acceptance and the pre-existing unrelated spec failure.
- `GUI-STATUS.md`: intentionally unchanged by this agent — reconciling it is the coordinator's own write after review, per the README's workflow step 9. No user-observable React availability or GUI-selection behavior changed here.

### Follow-Up Work

- **Repair the pre-existing `F-SEARCH-RECENT` spec breakage** (proposed, not performed; outside this packet's scope). `tests/system/tests/search.spec.ts`'s `should refill and repeat complete recent React search criteria` asserts and
  clicks `getByRole("menuitem", {name: "Refill"})`, which FM-038 made unmatchable when it moved refill into an icon `button` inside the `Repeat: <description>` `menuitem`. The one-line fix is `getByRole("button", {name: /^Refill:/})`,
  matching what `SearchPage.test.tsx` already does. This needs a small corrective packet owning `F-SEARCH-RECENT`'s block in that spec.
- **`RefineSidebar` toggle-row conversion** — named by this packet's Out Of Scope as an optional, out-of-batch follow-up and deliberately **not** performed here: ADR-0009's toggle-row Category/Indexer multiselect for
  `core/ui-react/src/features/search/results/RefineSidebar.tsx` (currently a checkbox list from FM-039) belongs to the FM-046 remediation pass, not to the search form.
- **Replace the search form's indexer-selection mechanism with the mock's chip row** — deliberately not done, per Out Of Scope: the mock's chips have no equivalent of group actions, reset-to-preselection, or usenet/torznab bulk
  selection, so adopting them literally would remove capability.
- **Human visual acceptance** of all three records' new baselines, per ADR-0006. Independent of technical review; not suppliable by any agent.
- **Optional:** the row-local mock literals (`#232a2c`, `#2a3133`, `#1c2224`) could move into `theme.ts` as named surface tokens once a second consumer exists — likely FM-045/FM-046, whose sidebar and toolbar use the same two control
  surfaces. Not done here because `theme.ts` is out of scope and a single-consumer token is speculative.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer cannot supply the human visual acceptance the affected records require;
that remains a human decision independent of technical review, per ADR-0006.
