# FM-027: Search Workspace And History Visual Parity

Status: done Owner: gpt-5.6-terra
Feature IDs: F-SEARCH-FORM, F-SEARCH-MEDIA, F-SEARCH-INDEXERS, F-SEARCH-RECENT
Component IDs: C-CATEGORY-CATALOG
API IDs: API-SEARCH-EXECUTE, API-HISTORY-RECENT-SEARCHES
Depends on: FM-026
Blocks: FM-028

## Dependency Notes

FM-026 defines the visual registry and evidence workflow. FM-028 follows because results evidence must measure the final workspace/results page composition and both tasks reconcile the same route-level visual baseline.

## Outcome

The existing React Search workspace presents category, query/refinement, age/size filters, indexer selection, recent history, and submission with legacy-equivalent semantic hierarchy and responsive density, while recent searches use a legacy-like dropdown and retain refill, repeat, and drag reuse.

## Boundary Rationale

These controls form one pre-search workspace and share its responsive grid, density, and history-entry interaction boundary; splitting them would leave a visibly incoherent form. Results are a separate post-search table/toolbar capability with its own responsive geometry and are sequenced in FM-028.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0004, ADR-0005, ADR-0006.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/SearchPage.tsx`
- `core/ui-react/src/features/search/SearchPage.test.tsx`
- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`
- `core/ui-react/src/features/search/workspace/SearchWorkspace.test.tsx`
- `core/ui-react/src/features/search/history/RecentSearches.tsx`
- `tests/system/tests/search.spec.ts`
- Only the visual-parity subrecords of `F-SEARCH-FORM`, `F-SEARCH-MEDIA`, `F-SEARCH-INDEXERS`, and `F-SEARCH-RECENT` in `docs/frontend-migration/FEATURES.yaml`
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Search/results behavior, request/API/persistence changes, new feature gaps, guided tour, result toolbar/table styling, or acceptance of unrelated Search visual records
- Recreating Bootstrap pixels, changing MUI as the visual system, changing existing stable selectors, or weakening refill/repeat/drag/indexer/media behavior

## Context To Read

- `CONTEXT.md`; ADR-0001, ADR-0002, ADR-0004 through ADR-0006; FM-010, FM-015 through FM-017, and FM-025 handoffs; FM-026 handoff; linked registry records
- Legacy controller `core/ui-src/js/search-controller.js`; templates `core/ui-src/html/states/search.html` and `core/ui-src/html/search-searchhistory-dropdown.html`; LESS `core/ui-src/less/nzbhydra.less`, `core/ui-src/less/partials/forms.less`, and `core/ui-src/less/partials/dropdowns.less`
- Legacy `core/ui-src/js/search-history-service.js` and `core/ui-src/js/directives/multiselect-dropdown.js`; all listed React targets/tests and `tests/system/tests/search.spec.ts`

## Acceptance

- At `1280x800`, the bounded workspace visibly prioritizes category then primary query, groups media refinement and paired age/size ranges, keeps eligible indexer and history tools coherent, and gives submission a clear terminal action with density comparable to the legacy workspace.
- At `390x844`, controls reflow in a deliberate single-column hierarchy with usable full-width actions, paired controls only where readable, anchored menus, visible labels/focus, and no page or control horizontal overflow.
- Recent searches render behind a compact history trigger as a legacy-like anchored dropdown/menu rather than an always-expanded page section. Loading/empty/failure states remain accessible; entries remain legible and expose explicit refill/repeat alternatives while pointer drag-to-refill continues to work.
- Dropdown and checkbox indexer presentations, category/media transitions, autocomplete, URL criteria, submission, recent refill/repeat/drag, and all existing stable selectors retain their established behavior. Component tests cover the changed menu/accessibility interactions; no API or domain contract changes.
- Deterministic Playwright evidence uses FM-026 conventions for normal dropdown-indexer workspace, checkbox-indexer workspace, an open populated recent-history menu, and relevant media refinement at desktop/mobile. Geometry assertions cover order/alignment, widths/gaps, menu containment, target usability, and overflow; narrow region captures are proposed only where stable and useful.
- Each linked feature visual subrecord identifies scoped states/viewports/checks/evidence and remains `proposed` (not accepted) at implementation handoff. Any semantic variance is explicit. The proposed baseline and every variance require human acceptance before the coordinator may record accepted visual parity and mark this task done.

## Verification

- In `core/ui-react`: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts` succeeds with deterministic desktop/mobile React and legacy-reference evidence.
- Run `git diff --check`; inspect status/allowlist, stable selectors, proposed evidence artifacts, and absence of unexpected generated files or accepted visual records.

## Handoff

Use `templates/handoff.md`; include the proposed baseline states/viewports, geometry values/tolerances, evidence paths, behavior/selector regression results, variances, and explicit `human acceptance pending`. Mark `review` only after technical verification; do not self-accept the visual proposal.

## Fresh Review

The reviewer audits behavioral, accessibility, and visual gates independently. After accepted technical review, the coordinator obtains explicit human acceptance or rejection of the proposed baseline/variances before completion.

## Handoff

### Outcome

- Implemented the MUI workspace hierarchy, compact anchored recent-search menu, and deterministic desktop/mobile geometry coverage. Visual records for the four linked features are proposed only; human acceptance is pending.
- Reviewer-fix continuation (this pass): addressed four required findings from an independent fresh review. (1) Gave each recent-search `Refill`/`Repeat` `MenuItem` a per-entry accessible name (`aria-label={"Refill: " + description}` / `"Repeat: " + description}`) so assistive-technology users can distinguish entries when more than one recent search is present; stable `data-testid`/role selector contracts are unchanged. (2) Updated the Playwright and Vitest assertions that targeted the old bare `"Refill"`/`"Repeat"` accessible names so they still identify the same elements under the new per-entry names, and fixed a resulting Playwright strict-mode violation (`getByText(/Query: recent criteria/)` now matches two duplicated per-item descriptions) by scoping that assertion to `.first()` without weakening what it asserts. (3) Reconciled the stale Verification Evidence/Basis below to match the files actually on disk (fresh SHA-256 manifest, accurate Vitest count, accurate `format:check` result) after normalizing formatting drift in `SearchPage.test.tsx`, `RecentSearches.tsx`, and `tests/system/tests/search.spec.ts` with Prettier. (4) Attempted the preferred fix for the `F-SEARCH-MEDIA` registry overclaim (adding a deterministic movie-autocomplete Playwright state under `prepareVisualEvidence`/`expectVisualGeometry`, selecting the Movie category and driving the real `/internalapi/autocomplete/MOVIE` round trip); this reproducibly failed in the React app (see Follow-Up Work) for a reason outside this task's `Files Allowed To Modify`, so the sanctioned fallback was used instead: `F-SEARCH-MEDIA`'s visual `states`/`geometry_checks` were narrowed back to only `tv-title-refinement` and `season-episode-pair`, which is what `tests/system/tests/search.spec.ts` actually evidences deterministically; the unevidenced `movie-autocomplete` state claim was removed.

### Files Modified

- This pass: `core/ui-react/src/features/search/{SearchPage.test.tsx,history/RecentSearches.tsx}`, `tests/system/tests/search.spec.ts`, `docs/frontend-migration/{FEATURES.yaml,tasks/FM-027-search-workspace-visual-parity.md}`.
- Unchanged in this pass (from the prior implementation handoff): `core/ui-react/src/features/search/{SearchPage.tsx,workspace/SearchWorkspace.tsx,workspace/SearchWorkspace.test.tsx}`, `docs/frontend-migration/STATUS.md` (confirmed identical by SHA-256/inspection; `STATUS.md` already correctly lists FM-027 under `## Review`).
- Scope confirmation: all task-owned changes in this pass are within `Files Allowed To Modify`; pre-existing FM-026/FM-028/FM-029/FM-030 and unrelated `.claude`/`.opencode` working-tree changes present before this pass were not modified, reformatted, or reverted.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: Playwright Chromium; Maven `3.9.16`.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm run typecheck` | Passed. Reused from the pre-fix pass in this continuation: unaffected, since `SearchPage.tsx`, `SearchWorkspace.tsx`, and `SearchWorkspace.test.tsx` were unchanged and the type-relevant edits to `SearchPage.test.tsx`/`RecentSearches.tsx` were included in that pass. |
| `core/ui-react` | `npm run lint` | Passed: 6 warnings, 0 errors (all 6 pre-existing and unrelated to task-owned files: 3 `react-refresh/only-export-components` in `SearchWorkspace.tsx`, 1 `react-hooks/incompatible-library` in `SearchWorkspace.tsx`, 1 `react-refresh/only-export-components` each in `IndexerStatusesPage.tsx` and `router.tsx`). Reused: unaffected by this pass's edits. |
| `core/ui-react` | `npm run format:check` | Passed: "All matched files use Prettier code style!" Rerun after `npx prettier --write` normalized `SearchPage.test.tsx` and `RecentSearches.tsx` (finding 3); `tests/system/tests/search.spec.ts` (outside `core/ui-react`'s Prettier scope, no local config) was separately normalized with `npx prettier --config core/ui-react/.prettierrc.json --write` and reconfirmed clean with `--check` after the finding-4 revert. |
| `core/ui-react` | `npm run test -- --run` | Passed: 35 Vitest files, 157 tests (was 153; 4 tests added by the aria-label-matcher updates net of no removals — the stale packet claim of 153 is corrected here). Reused from the pre-fix pass: unaffected by the later `search.spec.ts`/`FEATURES.yaml`-only changes. |
| `core/ui-react` | `npm run build` | Passed: 1228 modules transformed, built in 1.89s (only the pre-existing >500kB chunk-size advisory, not an error). Reused: unaffected. |
| `core/ui-react` | `npm run check:api` | Passed: "Generated OpenAPI types are current." Reused: unaffected. |
| `core/ui-react` | `npm run validate:migration` | Passed both times it was run in this pass: once against the intermediate (finding-4-preferred-attempt) `FEATURES.yaml`, and again — the result recorded here — against the final narrowed `F-SEARCH-MEDIA` visual contract: "Migration registries and task metadata are valid." Rerun because `FEATURES.yaml` changed. |
| `tests/system` | `npx tsc --noEmit` | Passed, no output. Rerun because `search.spec.ts` changed. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts` | Rerun because `search.spec.ts` changed (affected). First rerun (with the finding-4-preferred movie-autocomplete state added) failed 1 of 13: "should provide deterministic React workspace visual evidence across desktop and mobile" timed out waiting for `autocomplete-option` after selecting the Movie category and driving a real backend autocomplete round trip — root-caused to a pre-existing defect outside this task's scope (see Follow-Up Work), not a flake. After reverting that state per the finding-4 fallback, final rerun passed all 13 Playwright tests, 0 failed (21.0s), including the previously-failing test (now passing without the movie-autocomplete block), "should refill and repeat complete recent React search criteria" (finding 2's target), "should select a movie autocomplete result and search by TMDB identifier" (legacy-UI reference coverage, unaffected), and "should select a TV autocomplete result with the keyboard and search by TVDB identifier". |
| repository root | `git diff --check` | Passed, no output. |

### Verification Basis

- Baseline: `5a2eddca72abd60f331d268a10bd900a6204434f`.
- Command-affected classification for this fix pass: `typecheck`/`lint`/`test`/`build`/`check:api` are reusable from earlier in this pass (their covered files — `SearchPage.tsx`, `SearchWorkspace.tsx`, `SearchWorkspace.test.tsx`, and the finding-1/finding-3 edits to `SearchPage.test.tsx`/`RecentSearches.tsx` — did not change again afterward); `format:check`, `validate:migration`, the `tests/system` `tsc --noEmit`, the Playwright system test, and `git diff --check` are affected by the later `search.spec.ts`/`FEATURES.yaml` finding-4 edit-then-revert and were rerun against the final state.
- Final task-owned file manifest (SHA-256, current on disk): `SearchPage.tsx: 00fbf85eb55c4a44aebac5d9ad4b98a266e27968c32a709c2e9069205d01eccb` (unchanged from the prior handoff); `SearchPage.test.tsx: d09cca24b52bc579d399260b4f075ef254f2a39344b8cbd99111254d40146d73`; `workspace/SearchWorkspace.tsx: 8f86a023c37619339fd45761009dde537775caba8596a46a6d5e5cd8165aaa1a` (unchanged); `workspace/SearchWorkspace.test.tsx: 0bdc06be443686991d9e27cea68777be48cb4c404d51b4ca4152a418e490f59c` (unchanged); `history/RecentSearches.tsx: 5c8225b9ff28ca879d0fe5d5ce33981082ab5c00d669d65888c72760e0e8e32e`; `tests/system/tests/search.spec.ts: f3035c586dacc807a84ccda36d9892e30bd8231d01e4603ebae68df9b6ae15b9`. These replace the prior handoff's stale manifest, which no longer matched the files on disk (finding 3).
- Completed after the last change to each command's listed files: yes for every row above, including the two rerun-after-revert rows (`validate:migration`, Playwright system test, `tsc --noEmit`, `git diff --check`), which were run again after the finding-4 fallback edit so their evidence reflects the final `search.spec.ts`/`FEATURES.yaml` content, not the intermediate failing attempt.
- Task-owned changes after the final passing verification: none: the manifest above and the final `FEATURES.yaml`/task-packet text are exactly what the final commands verified.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- Followed ADR-0001, ADR-0002, ADR-0004, ADR-0005, and ADR-0006: canonical route behavior, MUI-only presentation, preserved criteria/history behavior, independent visual evidence, and human-only visual acceptance.
- ADR REQUIRED proposal triggered during this task: None. The `F-SEARCH-MEDIA` movie-autocomplete gap encountered in this pass is a concrete, uncontroversial bug fix (a Zod schema needs `.nullable()` on fields the real backend serializes as explicit JSON `null`), not an unresolved architectural choice; it is reported as scope-blocked Follow-Up Work rather than an ADR question, since it needs a write outside this task's `Files Allowed To Modify` (`core/ui-react/src/api/media.ts`), not a decision among viable design options.

### Assumptions

- MUI's 36px standard medium button height remains a usable mobile action; the responsive form keeps the action full-width within its 310px content region at the fixed 390px viewport.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `F-SEARCH-FORM`, `F-SEARCH-INDEXERS`, and `F-SEARCH-RECENT`: unchanged in this pass; remain `unassessed -> proposed` with their deterministic desktop/mobile states, geometry checks, and `tests/system/tests/search.spec.ts` evidence as previously proposed. Human acceptance remains pending.
- `F-SEARCH-MEDIA`: visual contract corrected in this pass (finding 4). `states` narrowed from `[movie-autocomplete, tv-title-refinement, season-episode-pair]` to `[tv-title-refinement, season-episode-pair]`; `geometry_checks` narrowed to match (dropped the movie-autocomplete-specific check). Still `status: proposed`, still evidenced by `tests/system/tests/search.spec.ts`, no snapshots, no variances, human acceptance pending. This removes an evidence overclaim: the record no longer names a state that only had non-deterministic (legacy-UI, no fixed viewport, no geometry assertion) coverage.
- Linked target, behavioral parity, tests, task owners, gaps, selectors, and backlog records are intentionally unchanged because this packet permits only visual subrecords. `C-CATEGORY-CATALOG`, `API-SEARCH-EXECUTE`, and `API-HISTORY-RECENT-SEARCHES` are intentionally unchanged.
- Visual evidence does not imply behavioral or accessibility acceptance.

### Follow-Up Work

- **Resolved by coordinator (2026-08-16):** a dedicated follow-up task will be designed to fix `core/ui-react/src/api/media.ts`'s `suggestionSchema` (the bug described below), since it is a genuine functional defect (not just a visual-evidence gap) affecting real Movie/TV autocomplete usage.
- **Scope-blocked defect found while pursuing finding 4's preferred fix, needs a dedicated remediation task or an explicitly authorized out-of-allowlist correction:** `core/ui-react/src/api/media.ts`'s `suggestionSchema` declares `posterUrl`/`imdbId`/`tvdbId`/`tvmazeId`/`tvrageId` as `z.string().min(1).optional()`. Zod's bare `.optional()` accepts `undefined` but rejects an explicit JSON `null`. The real `GET /internalapi/autocomplete/{type}` backend (`MediaInfoWeb`/`MediaInfoTO` in `core/src/main/java/org/nzbhydra/mediainfo`) always serializes every `MediaInfoTO` field, with no `@JsonInclude(NON_NULL)` anywhere in that path, so any absent optional field comes back as an explicit `null` (confirmed via the deterministic system-test mock: the `MOVIE` suggestion for `"Hydra Browser Movie"`/tmdbId `424242` serializes as `{"imdbId": null, "tmdbId": "424242", "tvmazeId": null, "tvrageId": null, "tvdbId": null, "title": "Hydra Browser Movie", "year": 2000, "posterUrl": null}`). Reproduced directly: adding a deterministic Playwright state that selects the Movie category and types a title in the **React** app (not the legacy AngularJS app, which does not use this Zod schema at all) causes `getAutocomplete()` to throw `MalformedAutocompleteResponseError`, and `SearchWorkspace.tsx` shows "Title suggestions were unavailable because the response was invalid." instead of any suggestions — confirmed via the Playwright accessibility snapshot at the point of failure. This appears to be a pre-existing defect (not introduced by FM-027) that likely also affects real (non-mocked) Movie/TV autocomplete usage in the shipped React UI whenever the backend omits any optional identifier/poster field, which is common. It was never caught before because: (a) the only existing Movie-autocomplete Playwright coverage (`tests/system/tests/search.spec.ts`, "should select a movie autocomplete result and search by TMDB identifier") runs against the default bare `/` route, which serves the **legacy** AngularJS shell (confirmed via `MainWeb.isReactSelected`, which returns `false` with no `nzbhydra-ui` cookie), not React; (b) the existing React TV-autocomplete Playwright test mocks the network response directly via `page.route(...)`, never exercising the real backend payload shape; and (c) `core/ui-react/src/api/media.test.ts` and `SearchWorkspace.test.tsx` only exercise `getAutocomplete`/`autocomplete` with hand-written payloads that never include an explicit `null` field. Recommended fix: change the affected `suggestionSchema` fields to `.nullable().optional()` (or `.nullish()`) in `core/ui-react/src/api/media.ts`, and add a `media.test.ts` regression case with an explicit-`null` optional field. This task did not make that change because `core/ui-react/src/api/media.ts` and `media.test.ts` are outside FM-027's `Files Allowed To Modify`; per finding 4's own sanctioned fallback, this task instead narrowed `F-SEARCH-MEDIA`'s visual contract to the states that are actually deterministically evidenced. Human acceptance of the proposed visual baseline remains pending regardless of this follow-up.

## Fresh Review (Recorded)

### Review Identity

- Two independent fresh-reviewer passes conducted. First pass: `changes_requested` (four required findings: recent-search menu accessible-name collision, a resulting Playwright strict-mode failure, a stale Verification Basis, and an `F-SEARCH-MEDIA` registry overclaim). A fixer resolved all four, discovering and documenting the `media.ts` autocomplete-schema defect above as scope-blocked follow-up rather than fixing it out-of-allowlist. Second pass: independently re-verified every fix (recomputed SHA-256 manifest, reran the full required chain, reran the system-test suite) — disposition **accepted**, no further findings.

### Resolution

- All required findings from both passes resolved. Final technical disposition: **accepted**.

### Coordinator Completion

- Coordinator: Claude Sonnet 5 (this session)
- Human visual-baseline acceptance: the repository owner reviewed desktop screenshots of the search workspace, populated recent-search menu, TV media refinement, and both dropdown/checkbox indexer presentations — captured live against the running app under the FM-031 branded theme — and explicitly accepted the proposed visual baseline for `F-SEARCH-FORM`, `F-SEARCH-MEDIA`, `F-SEARCH-INDEXERS`, and `F-SEARCH-RECENT` on 2026-08-16 (recorded in each record's `FEATURES.yaml` `visual.acceptance`).
- The `F-SEARCH-MEDIA` movie-autocomplete Zod-schema defect is tracked as separate follow-up work (see above), not a blocker for this task's own visual-parity acceptance.
- Decision: mark `done`.
