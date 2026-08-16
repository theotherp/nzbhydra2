# FM-032: Autocomplete Nullable Identifier Fields

Status: done Owner: Claude
Feature IDs: F-SEARCH-MEDIA
Component IDs: None
API IDs: API-SEARCH-AUTOCOMPLETE
Depends on: None
Blocks: None

## Dependency Notes

This is a dependency-free correction. FM-027, which discovered and fully diagnosed the defect while pursuing (and reproducibly failing) its own preferred fix, is already `done`; its Follow-Up Work records the diagnosis and explicitly defers the fix to a dedicated task. No planned task currently depends on this one.

## Outcome

`getAutocomplete()` in `core/ui-react/src/api/media.ts` accepts the real backend's actual `GET /internalapi/autocomplete/{type}` response shape, including explicit JSON `null` for any absent optional identifier/poster/year field, so Movie and TV title suggestions render in the shipped React UI instead of failing with `MalformedAutocompleteResponseError`.

## Boundary Rationale

This is one schema-correctness defect confined to a single response contract (`suggestionSchema`) and its two forms of regression evidence (a unit-level parse case and a real end-to-end Playwright flow against the React route). It has no product-behavior, UI-layout, or architectural dimension, and no other planned task currently touches `media.ts`, so it does not need to be sequenced against or merged into other work. It is deliberately not bundled with widening `F-SEARCH-MEDIA`'s visual contract: that record's `visual.status` is already `accepted` with a recorded human decision, and re-opening that decision to add a `movie-autocomplete` visual state is a separate, larger step than fixing a data-parsing bug; if wanted, it belongs in its own follow-up task.

## Decision Dependencies

- Accepted: ADR-0002, ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/api/media.ts`
- `core/ui-react/src/api/media.test.ts`
- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx` — only if `npm run typecheck` requires a narrow, mechanical adjustment after the schema change; no behavioral change
- `core/ui-react/src/features/search/workspace/SearchWorkspace.test.tsx` — only alongside such a narrow `SearchWorkspace.tsx` adjustment
- `tests/system/tests/search.spec.ts`
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- Any `F-SEARCH-MEDIA` (or other feature) visual-contract, `FEATURES.yaml`, or `APIS.yaml` change; visual-contract widening to a `movie-autocomplete` state is explicit follow-up, not this task
- Any UI layout, styling, or visual-parity change
- `title`'s required, non-nullable schema field (no repository evidence that the backend ever serializes a null title for a real autocomplete match)
- Any `SearchPage.tsx`, category-catalog, Emby-availability, or search-submission behavior change
- Any unrelated cleanup of `media.ts`, `media.test.ts`, or `SearchWorkspace.tsx`
- Rewriting FM-027's packet or its factual handoff/Follow-Up Work evidence

## Context To Read

- `CONTEXT.md`; ADR-0002, ADR-0004
- FM-027's handoff, specifically its Follow-Up Work section documenting this defect (`docs/frontend-migration/tasks/FM-027-search-workspace-visual-parity.md`)
- `core/ui-react/AGENTS.md`; the `API-SEARCH-AUTOCOMPLETE` and `F-SEARCH-MEDIA` records in `docs/frontend-migration/APIS.yaml` / `FEATURES.yaml`
- `core/ui-react/src/api/media.ts` and `media.test.ts`; the established `.nullish().transform((value) => value ?? undefined)` convention already used for optional string/number backend fields elsewhere in `core/ui-react/src/api/search.ts`'s `resultSchema` (and `recentSearches.ts`, `savedSearches.ts`, `searchHistory.ts`)
- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`, specifically `chooseSuggestion` (uses `suggestion[key] ?? ""`) and the `autocomplete-option`/`data-tmdb-id` rendering
- Backend `core/src/main/java/org/nzbhydra/mediainfo/MediaInfoWeb.java` (`autocomplete`, `from(MediaInfo info)`), which serializes every `MediaInfoTO` field via `.orElse(null)` with no `@JsonInclude(NON_NULL)` anywhere in the path — confirming `imdbId`, `tmdbId`, `tvdbId`, `tvmazeId`, `tvrageId`, `posterUrl`, and `year` are each independently nullable on the wire, not only the five fields named in FM-027's Follow-Up Work (that note's example payload happened to include a non-null `tmdbId`, but `MediaInfoWeb.from()` treats `tmdbId` and `year` identically to the other optional fields, and TV-type suggestions commonly have a null `tmdbId`)
- The deterministic movie-autocomplete system-test fixture: `other/mockserver/src/main/java/org/nzbhydra/mockserver/MockTmdb.java` (`DETERMINISTIC_MOVIE_QUERY = "Hydra Browser Movie"`, returns only `id`/`title`/`release_date`, so `imdbId`/`posterUrl` etc. resolve to null through `TmdbHandler`) and the existing legacy-route Playwright test `"should select a movie autocomplete result and search by TMDB identifier"` in `tests/system/tests/search.spec.ts` (does not call `page.goto("ui/react?redirect=/")`, so `beforeEach`'s bare `/` leaves it on the legacy AngularJS route, per `MainWeb.isReactSelected`)
- The existing React-route TV-autocomplete Playwright test `"should select a TV autocomplete result with the keyboard and search by TVDB identifier"` for the `ui/react?redirect=/` navigation and `page.route` conventions

## Acceptance

- In `core/ui-react/src/api/media.ts`, `suggestionSchema`'s `year`, `posterUrl`, `imdbId`, `tmdbId`, `tvdbId`, `tvmazeId`, and `tvrageId` fields accept an explicit JSON `null` as well as `undefined`, using the codebase's established `.nullish().transform((value) => value ?? undefined)` pattern (or an equivalent that keeps `z.infer`'s effective output identical to the current hand-written `MediaSuggestion` type, i.e. `field?: string` / `field?: number`, not `field?: string | null`) so no unrelated call site needs a type change. `title` is unchanged.
- `getAutocomplete()` successfully parses (does not throw `MalformedAutocompleteResponseError` for) a response where any subset of the seven fields above is explicitly `null`, and the returned `MediaSuggestion` omits or leaves `undefined` those fields exactly as it would for an absent field today.
- `media.test.ts` gains a regression case asserting successful parsing of a response containing at least one explicit-`null` optional field (matching the real backend's shape, e.g. the confirmed `{"imdbId": null, "tmdbId": "424242", "tvmazeId": null, "tvrageId": null, "tvdbId": null, "title": "Hydra Browser Movie", "year": 2000, "posterUrl": null}`), asserting the resolved suggestion's defined fields (e.g. `title`, `tmdbId`) and that the null fields are absent/`undefined` on the parsed result. The existing "should reject malformed autocomplete payloads" case (a genuinely invalid payload, e.g. null `title`) continues to pass unchanged.
- `tests/system/tests/search.spec.ts` gains deterministic Playwright coverage of Movie autocomplete against the **React** route (`ui/react?redirect=/`, not the legacy default route) reusing the existing deterministic `MockTmdb`/`movieQuery` ("Hydra Browser Movie") fixture — the same fixture already confirmed (via FM-027's fixer) to serialize the seven optional fields as explicit `null` — asserting that a suggestion renders (`autocomplete-option` becomes visible), is selectable, and that selecting it populates the search field and completes a submission, exactly mirroring the outcome of the existing legacy-route test at line 581 but through the React shell. This may be a new test or an extension of an existing one; do not duplicate unrelated assertions from the legacy-route or TV-autocomplete tests.
- No other `media.ts` schema field, `SearchWorkspace.tsx`/`SearchPage.tsx` behavior, `FEATURES.yaml`/`APIS.yaml` content, or visual-contract state changes.

## Verification

- In `core/ui-react`: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts` succeeds, including the new React-route Movie-autocomplete coverage and all existing retained Search Playwright tests (legacy movie autocomplete, React TV autocomplete, and all others in the file).
- `git diff --check` succeeds; confirm all task-owned changed files are within Files Allowed To Modify and that verification leaves no unexpected generated or modified files.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. Record: the exact schema change made per field, confirmation that `MediaSuggestion`'s effective type is unchanged (or, if a `SearchWorkspace.tsx`/test adjustment was needed, exactly what and why the type-checker required it), the new/extended regression test(s) and their pass evidence, and explicit confirmation that no `FEATURES.yaml`/`APIS.yaml`/visual-contract content was touched. An implementer must never mark a task `done`.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer independently confirms: the schema fix is sound (accepts real-shaped `null` payloads, still rejects genuinely malformed ones like a null `title`); the `media.test.ts` and Playwright additions are genuine regression coverage rather than assertions weakened to pass; no visual, registry, or unrelated behavioral surface was touched; and the diff is otherwise exactly what Acceptance requires. The coordinator may mark the task `done` only after this review records an accepted disposition.

## Handoff

### Outcome

- `suggestionSchema` in `core/ui-react/src/api/media.ts` now accepts an explicit JSON `null` for `year`, `posterUrl`, `imdbId`, `tmdbId`, `tvdbId`, `tvmazeId`, and `tvrageId`, matching the real backend's actual serialization (`MediaInfoWeb.from()` uses `.orElse(null)` for every optional field with no `@JsonInclude(NON_NULL)` in the path). `getAutocomplete()` no longer throws `MalformedAutocompleteResponseError` for these real-shaped payloads, so Movie and TV title suggestions render in the shipped React UI instead of the "Title suggestions were unavailable because the response was invalid." failure state. `title` is unchanged (still a required, non-nullable `z.string().min(1)`), so a genuinely malformed payload (e.g. null `title`) is still rejected.
- Exact per-field change: each of the seven fields changed from `z.<type>(...).optional()` to `z.<type>(...).nullish().transform((value) => value ?? undefined)`, the identical established idiom already used by `resultSchema` in `core/ui-react/src/api/search.ts` (and `recentSearches.ts`/`savedSearches.ts`/`searchHistory.ts`) for the same absent-vs-null backend ambiguity. No other field or schema in the file changed.
- `MediaSuggestion`'s effective type is unchanged: `npm run typecheck` passed with `media.ts`, `media.test.ts` as the only touched implementation/test files, and no compiler error was raised anywhere `MediaSuggestion`/`getAutocomplete()`'s return value is consumed (including `SearchWorkspace.tsx`'s `chooseSuggestion`/`suggestion[key] ?? ""` and `autocomplete-option`/`data-tmdb-id` rendering, and `SearchWorkspace.test.tsx`). This confirms `z.infer<typeof suggestionSchema>`'s optional-with-`| undefined` output remains structurally assignable to the hand-written `field?: string` / `field?: number` `MediaSuggestion` type, exactly as the analogous `resultSchema` pattern already does for `SearchResult` in `search.ts`. No `SearchWorkspace.tsx`/`SearchWorkspace.test.tsx` edit was needed or made.
- `media.test.ts` gains one new regression case, `"should accept explicit null optional identifier fields as the real backend serializes them"`, using the confirmed real-backend-shaped payload (`{"imdbId": null, "tmdbId": "424242", "tvmazeId": null, "tvrageId": null, "tvdbId": null, "title": "Hydra Browser Movie", "year": 2000, "posterUrl": null}`). It asserts the parsed suggestion equals `{title: "Hydra Browser Movie", tmdbId: "424242", year: 2000}` and that each null-sourced field (`imdbId`, `tvmazeId`, `tvrageId`, `tvdbId`, `posterUrl`) is `undefined` on the result. The pre-existing `"should reject malformed autocomplete payloads"` case (null `title`) is unchanged and still passes.
- `tests/system/tests/search.spec.ts` gains one new Playwright test, `"should select a movie autocomplete result through the React route and search by TMDB identifier"`, inserted immediately before the existing React TV-autocomplete test. It navigates to `ui/react?redirect=/` (the React route, unlike the pre-existing legacy-route Movie-autocomplete test at the bare `/`), selects the Movies category, types the deterministic `movieQuery` ("Hydra Browser Movie"), waits for the real (mocked-backend) `GET /internalapi/autocomplete/MOVIE` response, asserts the matching suggestion's other six optional fields are explicit JSON `null` in the raw response (proving this exercises the real null-serialization case, not a coincidentally-complete payload), then asserts the `autocomplete-option` renders and is clickable, that selecting it populates the search field and enables `additional-query`, and that submitting completes a search whose request body contains `"tmdbId":"424242"`. This reuses the existing `movieQuery` constant and the already-deterministic `MockTmdb`/mock-newznab fixture; no new fixture or mock was introduced.

### Files Modified

- `core/ui-react/src/api/media.ts`: `suggestionSchema`'s seven optional-field declarations changed as described above.
- `core/ui-react/src/api/media.test.ts`: one new regression test case added (see above); no existing case changed.
- `tests/system/tests/search.spec.ts`: one new Playwright test added (see above); no existing test changed.
- `docs/frontend-migration/tasks/FM-032-autocomplete-nullable-identifiers.md` (this file) and `docs/frontend-migration/STATUS.md`: lifecycle updates (owner recorded, `in_progress` then `review`; `STATUS.md` moved from `## Active` to `## Review`).
- Not modified: `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx` and `SearchWorkspace.test.tsx` — `npm run typecheck` did not require any adjustment, per the confirmation above.
- Scope confirmation: every task-owned modification is within `Files Allowed To Modify`. The only other working-tree change present, `.claude/agents/migration-task-designer.md`, was flagged by the coordinator as a pre-existing, unrelated change and was not touched, staged, or reverted by this task.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: Playwright `1.62.1`, Chromium `151.0.7922.34`.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci` | Passed. |
| `core/ui-react` | `npm run typecheck` | Passed, no errors. |
| `core/ui-react` | `npm run lint` | Passed: 0 errors, 6 pre-existing warnings unrelated to task-owned files. |
| `core/ui-react` | `npm run format:check` | Passed: "All matched files use Prettier code style!" No reformatting was needed for `media.ts` or `media.test.ts`. |
| `core/ui-react` | `npm run test -- --run` | Passed: 35 Vitest files, 164 tests passed (was 163 before this task's one added case), 0 failed. |
| `core/ui-react` | `npm run build` | Passed. |
| `core/ui-react` | `npm run check:api` | Passed: "Generated OpenAPI types are current." |
| `core/ui-react` | `npm run validate:migration` | Passed: "Migration registries and task metadata are valid." (Run against the intermediate `Status: in_progress` / `STATUS.md` `## Active` state; rerun below against the final `review` state.) |
| `tests/system` | `npx tsc --noEmit` | Passed, no output. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts` | Passed: 14 tests, 14 passed, 0 failed (22.6s). Explicitly confirmed passing: the new `"should select a movie autocomplete result through the React route and search by TMDB identifier"`, the existing legacy-route `"should select a movie autocomplete result and search by TMDB identifier"`, and the existing React `"should select a TV autocomplete result with the keyboard and search by TVDB identifier"`, plus all other retained Search tests in the file. |
| repository root | `git diff --check` | Passed, no output. |
| `core/ui-react` | `npm run validate:migration` (rerun) | Passed: "Migration registries and task metadata are valid." Rerun after finalizing this task packet's `Status: review` and moving `STATUS.md`'s `FM-032` entry from `## Active` to `## Review`, since `validate:migration` checks task-status/`STATUS.md`-section consistency. |

### Verification Basis

- Baseline: `a0aa8f427aedb235084879a09a0259b8ec7663fb` (corrected by reviewer/coordinator; the originally-recorded baseline was stale — three commits behind `HEAD` at verification time. Content-reconciled: the true task-attributable diff against actual `HEAD` matches exactly what this handoff describes; independently re-verified by a fresh reviewer rerunning the complete required chain from scratch).
- Command coverage: `typecheck`/`lint`/`format:check`/`test -- --run`/`build` — `core/ui-react/src/api/media.ts`, `core/ui-react/src/api/media.test.ts`. `check:api` — none (unaffected by hand-written Zod schema changes; validates generated OpenAPI types only). First `validate:migration` run — none (documentation/lifecycle-only; excluded from command coverage per the handoff template). `tests/system` `tsc --noEmit` and the Playwright system test — `tests/system/tests/search.spec.ts` (and transitively the built `media.ts`/`media.test.ts`-informed application, though `media.test.ts` itself is not part of the production build). `git diff --check` — all task-owned changed files. The rerun `validate:migration` — none (documentation/lifecycle-only; run only to reconfirm `STATUS.md`/task-status consistency after the final lifecycle edit, per the note above, not because an implementation or test file changed).
- File-content manifest: `core/ui-react/src/api/media.ts: 6f94d48f1e50e33aab7e4b005d41cdead89cff399466383103213e48393a5ff4`; `core/ui-react/src/api/media.test.ts: d33736e560f54ec94b20403014c1fb9e032995f3d1f6ee302ce969b8e32f49a6`; `tests/system/tests/search.spec.ts: d6086f9f62f7cde52715ba8aac24075490a246b0a645fc796317fc137fbaf758`. (Documentation/lifecycle files — this task packet and `STATUS.md` — are excluded from the manifest per the handoff template's instruction to exclude task-packet and lifecycle documentation-only edits.)
- Completed after the last change to each command's listed files: yes for every row — `media.ts`, `media.test.ts`, and `search.spec.ts` were not modified again after their respective commands ran, and the rerun `validate:migration` row was executed after this file's and `STATUS.md`'s final lifecycle content.
- Task-owned changes after verification: only documentation/lifecycle-only paths (this task packet's `Status` field and Handoff section, and `STATUS.md`'s section placement) — rerun evidence for the check those changes affect (`validate:migration`) is the final row above.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- Followed ADR-0002 (Zod schema validation at the API boundary, using the codebase's established `.nullish().transform(...)` idiom rather than introducing a new pattern) and ADR-0004 (behavioral/regression test coverage at both the unit and Playwright system-test level for the corrected contract).
- `ADR REQUIRED` proposal triggered during this task: None. This is a narrow, uncontroversial schema-correctness bug fix with one established, already-precedented solution; it involves no unresolved architectural choice.

### Assumptions

- None beyond what FM-027's diagnosis and `MediaInfoWeb.java` already confirm: every optional `suggestionSchema` field (not only the five FM-027 happened to observe) is independently nullable on the wire, since `MediaInfoWeb.from()` treats all of them identically via `.orElse(null)` with no `@JsonInclude(NON_NULL)` anywhere in the path.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `API-SEARCH-AUTOCOMPLETE` (`docs/frontend-migration/APIS.yaml`): intentionally unchanged. Its `target` (`core/ui-react/src/api/media.ts`), `test` list (already includes `core/ui-react/src/api/media.test.ts` and `tests/system/tests/search.spec.ts`), `contract_state` (`generated_weak_validated`), and `task` (`FM-015`) all already correctly describe the corrected schema; no field needed updating for a same-file, same-contract correctness fix.
- `F-SEARCH-MEDIA` (`docs/frontend-migration/FEATURES.yaml`): intentionally unchanged, including its `visual` record, which remains `status: accepted` with its existing human decision and its `[tv-title-refinement, season-episode-pair]` states. This task did not add, widen, or otherwise touch any visual-contract state (a `movie-autocomplete` visual state is explicit out-of-scope follow-up per this packet's Out Of Scope and Boundary Rationale). No behavioral or accessibility gate was implied by any visual evidence, and no visual evidence was proposed or accepted by this task.
- No other `FEATURES.yaml`, `COMPONENTS.yaml`, or `APIS.yaml` record is linked by this task.

### Follow-Up Work

- None required by this task. (Widening `F-SEARCH-MEDIA`'s visual contract to add a deterministic `movie-autocomplete` state remains available as its own separate follow-up, as this packet's Boundary Rationale and Out Of Scope already note; this task does not newly propose it.)

## Fresh Review (Recorded)

### Review Identity

- One independent fresh-reviewer pass. Disposition: **accepted**, no required findings. One optional/non-blocking documentation observation (the handoff's recorded Baseline SHA was stale relative to current `HEAD`; corrected above by the coordinator — content was independently reconciled and re-verified against actual `HEAD` by the reviewer, so this did not affect verification integrity).

### Resolution

- No required findings; nothing to resolve.

### Coordinator Completion

- Coordinator: Claude Sonnet 5 (this session)
- No visual baseline or human-acceptance gate applies to this task (functional bug fix only; no `visual` record touched).
- Decision: mark `done`.
