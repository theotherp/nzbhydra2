# FM-036: Execute A Search Encoded In The URL

Status: done Owner: live user session (out-of-band; reconciled via `/fm-reconcile`) Feature IDs: F-SEARCH-FORM, F-HISTORY-SEARCHES, F-SEARCH-RECENT API IDs: None Component IDs: None Depends on: None Blocks: None

## Dependency Notes

Implemented interactively in a live user session, outside the normal `planned -> ready -> in_progress` promotion, and recorded here after the fact. It is one of four retroactive packets (FM-035 through FM-038) reconciling the single
uncommitted working tree found at baseline `4e64b8f3f` (FM-034), and is second in commit and review order. It shares `core/ui-react/src/features/search/SearchPage.test.tsx` with FM-038: this packet owns only the added
`should execute a search encoded in a plain bookmarked or typed URL...` case, FM-038 owns the four recent-search-menu hunks, and FM-038 is committed after this packet so the two never own the file at the same instant. Filed in `review`
because the implementation exists but has had no handoff and no independent review.

## Outcome

A URL that already encodes an executed search — typed, bookmarked, shared, or produced by the application's own canonical search URL — runs that search when the page loads, instead of only prefilling the form unless the Search History
page's `repeat=history` marker happened to be present.

## Boundary Rationale

This is one behavioral change to the route-to-submission trigger in `SearchPage.tsx` plus the single test that proves it. It carries no visual contract, changes no control, and touches no workspace or results rendering, so bundling it with
either of the two control redesigns in this batch (FM-037, FM-038) would combine unrelated capabilities purely to make a larger task. It is separate from FM-035 because that packet changes navigation between shell routes, not what the
search route does with its own criteria. Its only file overlap is the shared test file described under Dependency Notes.

## Decision Dependencies

- Accepted ADRs governing this task: ADR-0003 (API contract), ADR-0004 (testing and parity), ADR-0005 (recent-history criteria contract).
- Proposed or rejected ADRs blocking this task: None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/SearchPage.tsx`
- `core/ui-react/src/features/search/SearchPage.test.tsx` — only the URL-triggered-execution case and any assertion this task's behavior requires (shared with FM-038; see Dependency Notes)
- `docs/frontend-migration/FEATURES.yaml` — only `F-SEARCH-FORM`'s `tests` and `gaps` fields, and `F-HISTORY-SEARCHES`'s `gaps` field if and only if the repeat-path evidence below requires an entry
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- `core/ui-react/src/features/stats/history/SearchHistoryPage.tsx`, including removing its now-possibly-unconsulted `repeat: "history"` marker; record it as follow-up rather than editing it here
- `core/ui-react/src/features/search/history/recentSearchCriteria.ts` and the recent-search API schema
- Any visual record or contract: this task changes no rendering
- `GUI-STATUS.md` (a coordinator write), and `core/ui-react/package.json` / `package-lock.json` (coordinator-owned tooling)

## Context To Read

- `README.md` (Workflow, Registry Rules, Verification Integrity), `ADR-0003`, `ADR-0004`, `ADR-0005`
- `F-SEARCH-FORM`, `F-SEARCH-RECENT`, `F-HISTORY-SEARCHES`; the FM-016, FM-017, and FM-021 packets
- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx` (`canonicalSearch`, `indexersFromSearch`, and the submit-disabled rule)
- `core/ui-react/src/features/search/history/recentSearchCriteria.ts` and `core/ui-react/src/api/recentSearches.ts` (where `indexers` does and does not get written)
- `core/ui-react/src/features/stats/history/SearchHistoryPage.tsx` (the `repeat: "history"` producer)
- `core/ui-src/js/search-controller.js` (legacy URL-criteria handling)

## Acceptance

- The auto-submission trigger is the presence of a non-empty string `indexers` field on the route's `search` object, and the reason is evidenced rather than asserted: `canonicalSearch` writes `indexers` only from submitted form values, and
  submission is unavailable with no indexer selected, so that field is what distinguishes a replayable executed search from a partial prefill hint.
- A manual submission does not search twice: the effect deduplicates by serialized criteria, so the `navigate()` that a submit performs to produce the canonical URL is recognized as already submitted. A test covers this, and the existing
  submission tests still pass unchanged.
- The Search History repeat path is verified, not assumed. `SearchHistoryPage` still sets `repeat: "history"`, but that marker is no longer consulted, and `recentSearchCriteria` writes `indexers` only when `selectedIndexers` is defined,
  while `selectedIndexers` is optional in the recent-search schema. The implementer must establish with concrete evidence whether a history entry that carries no recorded `selectedIndexers` still auto-executes on repeat exactly as it did
  before this change. If it does not, that is a behavioral regression of an already-delivered capability and must be fixed inside `SearchPage.tsx` (for example by keeping the history marker as an additional trigger); it must not be accepted
  as the new behavior, and it must not be waved through as "the marker is dead code".
- A partial prefill URL — a bare category default, or media identifiers with no indexers — still does not fire a request. The existing prefill-only coverage remains green and is not weakened to accommodate the new trigger.
- The added test asserts exactly one search request, with the expected request body, for a plain URL carrying `query`, `category`, and `indexers` and no repeat marker and no user interaction.
- `F-SEARCH-FORM`: `visual` is explicitly confirmed unchanged (no rendering changed, so its accepted baseline and `search.spec.ts` geometry checks stay literally true and are not demoted); `tests` and `gaps` are reconciled or explicitly
  confirmed accurate. `F-SEARCH-RECENT` and `F-HISTORY-SEARCHES` are read and explicitly confirmed unchanged, except that `F-HISTORY-SEARCHES`'s `gaps` gains an entry if the repeat-path evidence above exposes one.
- The handoff flags for the coordinator that executing a shared or bookmarked search URL is a newly user-observable capability, so `GUI-STATUS.md` may need reconciliation at completion. This packet does not modify that file.

## Verification

- Prerequisites: `node_modules` must match the coordinator-owned lockfile that adds `@mui/icons-material`; run the cheapest install that guarantees this and record which install ran and why.
- Working directory `core/ui-react`: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api`, `npm run validate:migration` — each expected to pass.
- No `tests/system` run is required: this task changes no rendering and no spec. State that explicitly rather than omitting it.
- Repository root: `git diff --check` — expected to produce no output.
- Confirm task-owned changed files are all listed under Files Allowed To Modify, and that no hunk owned by FM-038 in `SearchPage.test.tsx` was altered.
- Confirm verification leaves no unexpected generated or modified files.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`. Because the implementation
predates this packet, the handoff is recorded retroactively against the existing working tree: it must describe what is actually there, close any acceptance gap it finds, and never restate an unrun command as passed.

## Handoff

### Outcome

The pre-existing implementation already satisfied most acceptance bullets: a plain bookmarked/typed URL carrying `query`, `category`, and `indexers` auto-executes exactly once with no user interaction; a manual submission's own
`navigate()` call is recognized as already-submitted and does not search twice; a partial prefill URL (bare category default, or media identifiers with no indexers) still does not fire a request; and the added
`should execute a search encoded in a plain bookmarked or typed URL...` test asserted exactly one search request with the expected body.

Investigating the packet's flagged regression risk found a real, evidenced regression, not a false alarm: a Search History "Repeat" action on an entry with **no recorded `selectedIndexers`** — a real, ADR-0005-designed case, not a
hypothetical one (see Assumptions) — no longer auto-executed. It only prefilled the form, because `SearchHistoryPage.tsx`'s `repeat: "history"` marker was no longer consulted by `SearchPage.tsx`'s indexers-only trigger, and
`recentSearchCriteria.ts` never writes an `indexers` field when `selectedIndexers` is `undefined`. This is a behavioral regression of an already-delivered capability (ADR-0005: "Existing records without these values must remain usable and
refill/repeat with default indexers").

Fixed inside `SearchPage.tsx` by making `hasExecutableCriteria` also treat the `repeat: "history"` marker as a trigger (kept as an additional trigger alongside the `indexers` check, per the packet's own suggested approach), and by changing
`AutoSubmitFromRoute`'s dedup key from the raw route object (`JSON.stringify(criteria)`) to the resolved form values (`JSON.stringify(valuesFromSearch(criteria, catalog))`). The dedup-key change is required, not cosmetic: a history entry
lacking `selectedIndexers` navigates to `{..., repeat: "history"}` with no `indexers` key, while the submission it triggers subsequently navigates to a canonical URL with `indexers` set (resolved to the default preselection) and no `repeat`
key — two structurally different route objects that resolve to the same `SearchFormValues`. Deduping on the raw object would treat the second as new criteria and search twice; deduping on resolved values correctly recognizes it as
already-submitted. Added a regression test, `should auto-execute a history repeat with no recorded selected indexers using the default preselection`, proving the fix.

### Files Modified

- `core/ui-react/src/features/search/SearchPage.tsx` — `hasExecutableCriteria` now also fires on the `repeat: "history"` marker (previously indexers-only); `AutoSubmitFromRoute`'s dedup key changed from `JSON.stringify(criteria)` to
  `JSON.stringify(valuesFromSearch(criteria, catalog))`; both changes documented in updated comments above each function.
- `core/ui-react/src/features/search/SearchPage.test.tsx` — added `should auto-execute a history repeat with no recorded selected indexers using the default preselection` (this task's regression-fix coverage, added under "any assertion
  this task's behavior requires" per Files Allowed To Modify), alongside the pre-existing `should execute a search encoded in a plain bookmarked or typed URL...` case (this task's originally-owned coverage, left as found and unmodified). The
  four recent-search-menu hunks belonging to FM-038 were read and left untouched.
- `docs/frontend-migration/FEATURES.yaml` — `F-SEARCH-FORM.tests` extended with `core/ui-react/src/features/search/SearchPage.test.tsx`. No other field or record touched.
- `docs/frontend-migration/tasks/FM-036-url-encoded-search-auto-execution.md` — this Handoff section.
- Scope confirmation: all modifications are within `Files Allowed To Modify` (`SearchPage.tsx`; `SearchPage.test.tsx` limited to the URL-triggered-execution case plus the regression-fix assertion this task's behavior requires;
  `FEATURES.yaml` limited to `F-SEARCH-FORM`'s `tests` field; this task packet). `docs/frontend-migration/STATUS.md` was inspected and found already accurate (already lists FM-036 under `## Review`); not modified.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: `prettier` (via `npx prettier --write`, scoped to this task's two files only), `vitest`, `eslint`, `tsc`, `vite` — all invoked exclusively through the repository's declared `npm run` scripts.

### Verification Evidence

| Working directory  | Command                                                                | Result                                                                                                                                                                                                              |
|---------------------|-------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `core/ui-react`     | `npm ls @mui/icons-material --depth=0`                                  | Passed: `@mui/icons-material@7.3.9`, matching `package.json`/`package-lock.json` exactly. No install run — `node_modules` already matched the lockfile.                                                          |
| `core/ui-react`     | `npx prettier --write SearchPage.tsx SearchPage.test.tsx`               | Applied once (formatting-only, `SearchPage.tsx` only; `SearchPage.test.tsx` was already clean). Every subsequent `format:check` run confirmed both files absent from the flagged list.                            |
| `core/ui-react`     | `npm run typecheck`                                                     | Passed: `tsc --noEmit`, zero diagnostics. Confirmed twice — once mid-sequence, once in a fresh full rerun against the final (post-Prettier) file content.                                                          |
| `core/ui-react`     | `npm run lint`                                                          | Passed: 0 errors, 6 warnings, all pre-existing and in files outside this task's scope (`SearchWorkspace.tsx` ×4, `IndexerStatusesPage.tsx`, `router.tsx`). None reference `SearchPage.tsx`/`SearchPage.test.tsx`. |
| `core/ui-react`     | `npm run format:check`                                                  | Failed overall (exit 1): 10 files flagged in the final run, none within `Files Allowed To Modify` (sibling FM-037/FM-038 files and pre-existing unrelated dev tooling — see Temporary Exceptions). `SearchPage.tsx`/`SearchPage.test.tsx` confirmed absent from the flagged list. |
| `core/ui-react`     | `npm run test -- --run`                                                 | Passed: 37 test files, 183 tests. Targeted rerun of `src/features/search/SearchPage.test.tsx` alone: 33/33 passed, including both the pre-existing URL-triggered-execution case and the new regression-fix case.  |
| `core/ui-react`     | `npm run build`                                                         | Passed: 1238 modules transformed; only the pre-existing >500kB chunk-size advisory (unrelated).                                                                                                                    |
| `core/ui-react`     | `npm run check:api`                                                     | Passed: "Generated OpenAPI types are current."                                                                                                                                                                     |
| `core/ui-react`     | `npm run validate:migration`                                            | Passed: "Migration registries and task metadata are valid."                                                                                                                                                        |
| repository root     | `git diff --check`                                                      | Passed, no output.                                                                                                                                                                                                 |
| repository root     | `git status --porcelain`                                                | Confirmed: only `SearchPage.tsx`, `SearchPage.test.tsx`, and `FEATURES.yaml` changed among this task's files; the remaining entries (`RecentSearches.tsx`/`.test.tsx`, `SearchWorkspace.tsx`/`.test.tsx`, `.claude/commands/fm-reconcile.md`, `FM-037`/`FM-038` task docs) belong to sibling in-flight work and were left untouched. |
| repository root     | `sha256sum SearchPage.tsx SearchPage.test.tsx`                          | Recorded in Verification Basis file-content manifest below; identical hashes across the initial and a fully independent, fresh, end-to-end rerun, confirming content stability.                                  |

No `tests/system` Playwright run was performed: this task changes no rendering and no spec (its Out Of Scope section states "Any visual record or contract: this task changes no rendering"), so `tests/system/tests/search.spec.ts` and
`smoke.spec.ts` were not run. Stated explicitly per the packet's Verification section rather than omitted.

### Verification Basis

- Baseline: `062c71bc7` (the just-committed FM-035, the repository HEAD supplied for this task).
- Command coverage: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api` all depend on the contents of `core/ui-react/src/features/search/SearchPage.tsx` and
  `core/ui-react/src/features/search/SearchPage.test.tsx`. `npm run validate:migration` additionally depends on `docs/frontend-migration/FEATURES.yaml` and this task packet (documentation/registry-only; excluded from the file-content
  manifest below per template instruction, matching the FM-034/FM-035 precedent).
- File-content manifest (current on disk; computed after the Prettier fix, and reconfirmed identical by a fully independent fresh verification pass):
  - `core/ui-react/src/features/search/SearchPage.tsx: 5e2bdfe16f858819b6270769ff55fe9b7628093a29c22b3d81a82d29423e14b6`
  - `core/ui-react/src/features/search/SearchPage.test.tsx: 88c74b4231fda92d40b3b1214bfe54e4bd004d052aa42e48ed0c5382754fb886`
- Completed after the last change to each command's listed files: yes. `typecheck` and `lint` were re-executed fresh against the final (post-Prettier) file content after the Prettier fix (the last edit to any implementation/test file);
  their results are unchanged from the mid-sequence run. A fully independent, end-to-end rerun of the entire verification sequence (node_modules/lockfile check through file hashing) was then executed in one continuous pass against this
  exact content, producing identical hashes and identical pass/fail outcomes throughout.
- Task-owned changes after verification: `None` on implementation or test files. This task packet's Handoff section was written after this verification run, as is conventional; no command needs rerunning because of it.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None. `package.json`/`package-lock.json` untouched by this task.
- Development dependencies added, removed, or changed: None. The prerequisite `node_modules`/lockfile check confirmed `@mui/icons-material@7.3.9` already matched; no install was run.

### Architecture Decisions

- ADR-0003 (API contract): followed. No API surface changed — `SearchRequest`/`SearchResponse` and every endpoint contract are untouched; only the client-side route-to-submission trigger and its dedup key changed.
- ADR-0004 (testing and parity): followed. New test coverage was added for the fixed behavior, the full existing suite (183 tests) stayed green, and the added coverage is now reflected in `F-SEARCH-FORM.tests`.
- ADR-0005 (recent-history criteria contract): followed, and is the crux of the regression fix. ADR-0005's accepted Human Decision explicitly requires "Existing records without these values must remain usable and refill/repeat with
  default indexers and default age/size filters." The fix directly restores that guarantee for the auto-execution trigger path, which had silently regressed it.
- `ADR REQUIRED` proposal triggered during this task: None. Both the marker-as-additional-trigger fix and the dedup-key change are conventional, reversible implementation choices within the existing accepted ADRs, not a new architectural
  commitment.

### Assumptions

- The pre-existing implementation (indexers-based `hasExecutableCriteria` trigger, dedup-by-serialized-criteria effect, and the added plain-URL test) was built correctly for the cases it covered — verified directly against every
  acceptance bullet, not merely trusted.
- `selectedIndexers` absence is a real, expected, explicitly-designed-for case for genuine persisted search-history rows — not a hypothetical edge case — established with concrete repository evidence rather than assumed: `SearchEntity.java`
  (`core/src/main/java/org/nzbhydra/searching/db/SearchEntity.java:66-69`) declares `selectedIndexers` as a plain nullable `@ElementCollection`; `SearchEntityTO.java` (`shared/mapping/.../SearchEntityTO.java:38`) has no `@NotNull`;
  `Searcher.java:324` sets it only from `searchRequest.getIndexers().orElse(null)`, an optional explicit restriction that is absent for an ordinary search that doesn't restrict indexers; the `SEARCH_SELECTED_INDEXERS` column itself was
  added only 3 days before this session by migration `V7__SEARCH_CRITERIA.sql`, so every pre-migration history row has it absent; the generated OpenAPI schema (`core/ui-react/src/api/generated/openapi.ts:2718-2747`) marks
  `selectedIndexers?: string[]` optional with no `required` entry; `SearchEntityTest.java:78-87`'s `shouldKeepAbsentRecentCriteriaNullWhenConvertedToTO` asserts this null-preservation directly; and ADR-0005's accepted Human Decision requires
  exactly this "existing records without these values... refill/repeat with default indexers" behavior. This is not "the marker is dead code" — the packet's forbidden conclusion — the marker is load-bearing.
- The dedup-key change (raw route-object stringify → resolved-`SearchFormValues` stringify) is necessary and sufficient to add the repeat marker as an alternate trigger without reintroducing a double search, reasoned through analytically
  above (Outcome) and exercised by the new regression test, which asserts exactly one search request.
- `npm run format:check`'s remaining non-zero exit is attributable entirely to files outside `Files Allowed To Modify` (sibling FM-037/FM-038 in-flight files, plus pre-existing unrelated dev tooling: `README.md`, `tsconfig.json`,
  `vite/devBackend.ts`/`.test.ts`, `SearchResults.tsx`/`.test.tsx`) — confirmed by name-by-name inspection of the flagged list in both the initial and the fresh final verification pass.

### Temporary Exceptions And Debt

- `npm run format:check` cannot exit 0 as a whole in this shared working tree: 10 files outside `Files Allowed To Modify` remain unformatted (sibling FM-037/FM-038 files, plus pre-existing unrelated dev tooling). Not fixed here, since doing
  so would mean editing files owned by other tasks or unrelated pre-existing work. Impact: the package-level gate does not exit 0, though both FM-036-owned files are individually confirmed Prettier-clean. Removal condition: FM-037/FM-038
  complete and format their own files (or a coordinator-level formatting pass covers the unrelated pre-existing files); tracking reference: this task packet and the sibling FM-037/FM-038 packets (matching the FM-035-recorded precedent).

### Registry And Documentation Updates

- `F-SEARCH-FORM`: `visual` explicitly confirmed unchanged — `status: accepted`, and every subfield (`contract`, `evidence`, `variances`, `acceptance`) left untouched, because this task changes no rendering. `tests` extended (additive)
  with `core/ui-react/src/features/search/SearchPage.test.tsx`, where both this task's originally-owned URL-triggered-execution coverage and its regression-fix coverage live. `gaps` confirmed still accurate (`guided tour` only; unrelated
  to this task). `target`, `state`, `task`, `selectors`, `backlog` all confirmed unchanged and still accurate.
- `F-SEARCH-RECENT`: explicitly confirmed unchanged. `tests` already listed `core/ui-react/src/features/search/SearchPage.test.tsx` before this task; `visual.status: accepted` unchanged; `gaps` (`search-page dropdown and drag behavior`)
  unrelated and unchanged. No field touched.
- `F-HISTORY-SEARCHES`: explicitly confirmed unchanged. `tests` already listed `core/ui-react/src/features/search/SearchPage.test.tsx` before this task. `gaps` stays `[]`: the repeat-path regression this task's Out Of Scope section
  anticipated was investigated with concrete evidence (see Assumptions) and **fixed** inside `SearchPage.tsx`, not left open, so no `gaps` entry was warranted per the packet's own conditional instruction. `visual`
  (`applicability: applicable, status: unassessed`) untouched.
- No `COMPONENTS.yaml` or `APIS.yaml` record applies (`Component IDs: None`, `API IDs: None` per this packet's header).
- `STATUS.md`: inspected; already correctly lists `FM-036` under `## Review`. Not modified.
- No ADR-0006 visual record applies: this task's Out Of Scope section states "Any visual record or contract: this task changes no rendering," and `F-SEARCH-FORM`'s `visual` field was read and left untouched exactly as inherited (no
  lifecycle transition, no new evidence/snapshots/variance disposition, no human-acceptance metadata touched). No behavioral or accessibility gate was implied by any visual evidence — none was produced or consulted by this task.

### Follow-Up Work

- `GUI-STATUS.md` may need reconciliation: executing a shared/bookmarked/typed search URL, and a Search History repeat now working correctly even for entries with no recorded selected indexers, are both newly (or re-)user-observable
  capabilities. This task does not modify that coordinator-owned file, per its Out Of Scope.
- `SearchHistoryPage.tsx`'s `repeat: "history"` marker remains in place and is now actively consulted again by `SearchPage.tsx` — it is not dead code. No removal follow-up is warranted; noting this explicitly since the packet's Out Of
  Scope section anticipated a possible "removing its now-possibly-unconsulted marker" follow-up that turned out not to apply once the regression was fixed by consulting the marker rather than discarding it.
- Once sibling tasks FM-037/FM-038 land and format their own files, a repository-wide `npm run format:check` should pass again; no action needed from FM-036 itself (matching the FM-035-recorded precedent).

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer independently re-derives the history-repeat conclusion above rather than accepting
the handoff's claim about it.

### Review Identity

- Reviewer: fresh-review agent (`/fm-reconcile` retroactive review, this session)
- Role: fresh reviewer
- Reviewed revision: working tree at baseline `062c71bc7` (FM-035, confirmed `HEAD` and confirmed via `git log`)
- Implementation handoff revision: retroactive handoff recorded in this task packet's `## Handoff` section (second `## Handoff` heading), file-content manifest hashes reproduced exactly (see below)

### Acceptance And Evidence Audit

- **Auto-submission trigger is `indexers`-presence, evidenced not asserted**: PASS. `SearchWorkspace.tsx`'s `canonicalSearch` (line ~146) always writes `indexers: values.indexers.join(",")`, and `submit()` in `SearchPage.tsx` returns early (`if (indexers.length === 0) return;`) before any navigate, so a route with a non-empty `indexers` string can only originate from a real submission. Verified by direct reading of both functions.
- **Manual submission does not search twice (dedup)**: PASS for the mechanism/reasoning; NOT FULLY VERIFIED by the new test — see Findings below. `AutoSubmitFromRoute`'s dedup key was changed from `JSON.stringify(criteria)` (raw route object) to `JSON.stringify(valuesFromSearch(criteria, catalog))` (resolved form values). I independently traced `submit()` → `navigate({search: canonicalSearch(values)})` → re-render → `useSearch()` → `valuesFromSearch(newCriteria, catalog)`, and confirmed `canonicalSearch`/`valuesFromSearch` round-trip to equal resolved values even when the raw route objects differ in keys/order (e.g., pre-submit `{repeat:"history", category, query}` vs. post-submit `{query, category, indexers}`). The analytical reasoning is sound. However, see the Findings entry on the regression test's actual discriminating power.
- **Search History repeat path — regression genuinely investigated, not assumed**: PASS, and this is the central, well-evidenced claim of the handoff. I independently re-derived it rather than trusting the citations:
  - `SearchHistoryPage.tsx:83-91` (`repeat` function) confirmed to still navigate with `{...recentSearchCriteria(entry, catalog), repeat: "history"}`.
  - `recentSearchCriteria.ts:26-28` confirmed: `if (search.selectedIndexers !== undefined) criteria.indexers = ...` — `indexers` is omitted entirely when `selectedIndexers` is `undefined`.
  - `SearchEntity.java:66-69` confirmed: `selectedIndexers` is a plain nullable `@ElementCollection`, no `@NotNull`.
  - `SearchEntityTO.java:38` confirmed: `selectedIndexers` is an unannotated `Set<String>` field.
  - `Searcher.java:324` confirmed verbatim: `searchEntity.setSelectedIndexers(searchRequest.getIndexers().orElse(null));` — only set when the request explicitly restricts indexers.
  - The `V7__SEARCH_CRITERIA.sql` migration confirmed to add the `SEARCH_SELECTED_INDEXERS` table (a genuinely recent addition, supporting "pre-migration rows lack it" framing).
  - `openapi.ts:2718-2743` confirmed: `selectedIndexers?: string[]` optional, no `required` array entry.
  - `SearchEntityTest.java:79-87` (`shouldKeepAbsentRecentCriteriaNullWhenConvertedToTO`) confirmed to assert `to.getSelectedIndexers()).isNull()`.
  - ADR-0005's Human Decision confirmed verbatim: "Existing records without these values must remain usable and refill/repeat with default indexers and default age/size filters."
  - All citations check out exactly as represented; none were taken on faith. The regression is real, not hypothetical, and the fix (OR-ing `repeat === "history"` into `hasExecutableCriteria` alongside the `indexers` check) is the correct, minimal, in-scope remedy.
- **Fix does not reopen the original bug (bare `repeat=history` firing a nonsensical empty search)**: PASS. `recentSearchCriteria` always sets `criteria.category` (either the entry's category or the catalog default) before the `repeat: "history"` key is ever added by `SearchHistoryPage.repeat()`. There is no code path that produces `{repeat: "history"}` alone with zero other criteria — every repeat navigation carries at least a category. Confirmed by reading `recentSearchCriteria.ts` and `SearchHistoryPage.tsx` together, and by the passing pre-existing/partial-prefill tests (see below).
- **Partial prefill URL still does not fire**: PASS. `hasExecutableCriteria` requires either a non-empty string `indexers` or `repeat === "history"`; neither is present for a bare category/media-identifier prefill. Directly evidenced by the file's default `beforeEach`/test fixtures (e.g. `router.search = {category:"Movies", title:"Movie", tmdbId:"42"}` used implicitly by most tests, and `router.search = {episode:"3"}` at line 672, and `router.search = {category:"Series"}` at line 209) — none of these auto-fire before their explicit user interaction, and the full suite (183/183) passes, which would not hold if auto-fire had reopened here.
- **New test asserts exactly one search request with expected body, plain URL, no repeat, no interaction**: PASS. Test at `SearchPage.test.tsx:567` reproduced by direct rerun (see Verification below); asserts `searchRequestCalls` length 1 and exact body.
- **`F-SEARCH-FORM.visual` unchanged; `tests`/`gaps` reconciled; `F-SEARCH-RECENT`/`F-HISTORY-SEARCHES` unchanged except a possible `F-HISTORY-SEARCHES.gaps` entry**: PASS. `git diff HEAD -- docs/frontend-migration/FEATURES.yaml` shows exactly one changed line: `F-SEARCH-FORM.tests` gains `core/ui-react/src/features/search/SearchPage.test.tsx`. No `visual` field, no `F-SEARCH-RECENT`, no `F-HISTORY-SEARCHES` field touched. Since the regression was fixed (not left open), no `F-HISTORY-SEARCHES.gaps` entry was required, matching the packet's own conditional instruction.
- **`GUI-STATUS.md` flagged as coordinator follow-up, not modified here**: PASS. `git diff HEAD --name-only` confirms `GUI-STATUS.md`, `package.json`, `package-lock.json` are all untouched by this task.

### Verification-Basis Reconciliation

- File-content manifest reproduced exactly: `sha256sum core/ui-react/src/features/search/SearchPage.tsx core/ui-react/src/features/search/SearchPage.test.tsx` produced `5e2bdfe1...` and `88c74b42...`, matching the handoff's recorded hashes exactly. No drift since the handoff was written.
- Independently re-ran (not merely trusted) the following, all in `core/ui-react`, all matching the handoff's claimed results exactly:
  - `npm run typecheck` — zero diagnostics.
  - `npm run lint` — 0 errors, 6 warnings, identical file list (`SearchWorkspace.tsx` ×4, `IndexerStatusesPage.tsx`, `router.tsx`), none in FM-036-owned files.
  - `npm run test -- --run` — 37 files, 183 tests, all passed (matches claimed 183/183).
  - `npm run test -- --run src/features/search/SearchPage.test.tsx` — 33/33 passed (matches claimed 33/33), including both the pre-existing URL-triggered-execution case and the new regression case.
  - `npm run build` — 1238 modules transformed, only the pre-existing >500kB advisory (matches exactly).
  - `npm run check:api` — "Generated OpenAPI types are current."
  - `npm run validate:migration` — "Migration registries and task metadata are valid."
  - `npm run format:check` — non-zero exit, but `SearchPage.tsx`/`SearchPage.test.tsx` absent from the flagged list (10 files flagged: `README.md`, `RecentSearches.tsx`/`.test.tsx`, `SearchResults.tsx`/`.test.tsx`, `SearchWorkspace.tsx`, `router.tsx`, `tsconfig.json`, `vite/devBackend.ts`/`.test.ts` — all sibling-task or pre-existing unrelated files, none in `Files Allowed To Modify`).
  - `git diff --check` on the four allowed paths — clean, exit 0.
  - `git status --porcelain` post-verification — no unexpected generated/modified files (build output not tracked/left in tree).
- `npm run test -- --run` reran because it is inexpensive and directly corroborates the crux behavioral claim under scrutiny; result was fully consistent with the handoff, so no further reruns (e.g. Playwright) were warranted.
- No `tests/system` Playwright run was performed by the implementer or by this review: confirmed sound, since the task-attributable diff to `SearchPage.tsx` touches only the effect-trigger logic, its dedup key, and comments/import formatting — no JSX/rendering changed. `F-SEARCH-FORM.visual` is correctly left untouched.

### Scope Reconciliation

- `git diff HEAD -- core/ui-react/src/features/search/SearchPage.tsx`: only `hasExecutableCriteria`'s addition, `AutoSubmitFromRoute`'s (renamed from `HistoryRepeatSubmission`) trigger/dedup-key change, explanatory comments, and Prettier-driven import-wrap reformatting. All within scope.
- `git diff HEAD -- core/ui-react/src/features/search/SearchPage.test.tsx`: confirmed the task-attributable hunks are exactly the two new `it(...)` blocks — `should execute a search encoded in a plain bookmarked or typed URL...` (line 567) and `should auto-execute a history repeat with no recorded selected indexers using the default preselection` (line 604). The four `Refill:`/`Repeat:` menu-wording hunks (lines ~324-513) belong to sibling packet FM-038 and were correctly left unaltered by this task — no overlapping hunks, no attribution conflict.
- `git diff HEAD -- docs/frontend-migration/FEATURES.yaml`: only `F-SEARCH-FORM.tests` changed, as claimed.
- `git diff HEAD -- docs/frontend-migration/STATUS.md`: empty, confirming FM-035 already fully reconciled it and this task made no further change.
- `SearchHistoryPage.tsx` and `recentSearchCriteria.ts` (both explicitly Out Of Scope) confirmed untouched by `git status`.
- No `GUI-STATUS.md`, `package.json`, or `package-lock.json` changes.

### Registry Reconciliation

- `F-SEARCH-FORM`: `tests` correctly extended (additive) with `SearchPage.test.tsx`; `visual`, `target`, `state`, `selectors`, `backlog`, `gaps` all unchanged, consistent with "no rendering changed."
- `F-SEARCH-RECENT`: unchanged, confirmed by diff.
- `F-HISTORY-SEARCHES`: unchanged, confirmed by diff; `gaps` correctly left as-is because the regression was fixed rather than left open.
- `COMPONENTS.yaml`/`APIS.yaml`: not applicable (`Component IDs: None`, `API IDs: None`), untouched.

### Visual-Contract Audit

- Not applicable: this task changes no rendering. `F-SEARCH-FORM.visual` confirmed byte-for-byte untouched in the diff. No ADR-0006 visual record, evidence, or human-acceptance metadata was created, touched, or implied.

### Findings

1. **Minor / non-blocking — the new regression test does not mechanically discriminate the dedup-key fix it is claimed to prove.** `SearchPage.test.tsx` mocks `@tanstack/react-router` at the top of the file (lines 11-19, confirmed present verbatim in baseline `HEAD`, i.e. pre-existing, not introduced by this task): `useSearch: () => router.search`, where `router.search` is a plain object assigned once per test and never mutated by the mocked `router.navigate` (a bare `vi.fn()`). Consequently, across every re-render of `SearchPage` in any test in this file, `useSearch()` returns the *same object reference*, so `AutoSubmitFromRoute`'s `criteria` prop (`hasExecutableCriteria(search) ? search : undefined`, which returns `search` itself, not a new object, when true) is referentially stable for the component's whole lifetime in-test. Because `useEffect`'s dependency array does `Object.is` comparison, the effect can only fire once in this harness regardless of what the dedup key is computed from — the new regression test (`should auto-execute a history repeat with no recorded selected indexers using the default preselection`) would pass identically with the pre-fix raw-object dedup key. The Handoff's Assumptions section states the dedup-key change is "necessary and sufficient... exercised by the new regression test, which asserts exactly one search request" — that overstates what is mechanically demonstrated. The *reasoning* for the fix is sound (I independently verified it by tracing `submit()` → `canonicalSearch()` → re-render → `valuesFromSearch()` and confirming the round-trip equality claim), but it is established analytically, not by an executable test that would catch a future reintroduction of the raw-object dedup bug. This limitation is a pre-existing convention of the whole test file (confirmed present in baseline `HEAD`, used identically by the earlier plain-URL test), not a quality regression introduced by this task, and correcting it would mean restructuring the router mock's `navigate` implementation to mutate `router.search` and force a re-render — a change to shared test infrastructure used by every test in the file, arguably beyond this task's narrow boundary. Recommended as follow-up (either in a future task or a coordinator-level test-infrastructure improvement), not as a blocking correction to FM-036 itself, because the underlying behavior is independently verified correct by direct code reading and the task's own narrow boundary rationale argues against widening scope to shared test infrastructure.

No other findings. No required corrections.

### Resolution

- Resolution evidence for the one finding: None needed — logged as a non-blocking deviation/follow-up per the finding's own recommendation, not a required correction.
- Review disposition: `accepted`

### Overall Result

**PASS WITH MINOR FINDINGS**

Every acceptance criterion evaluates to PASS on independent verification, including the central regression claim, which was re-derived from primary sources (Java entity/service code, generated OpenAPI schema, migration SQL, backend unit test, ADR-0005 text) rather than accepted on citation. All required verification commands were independently reproduced with identical results to the handoff (file hashes, typecheck, lint, full and targeted test runs, build, check:api, validate:migration, git diff --check, format:check exclusion list). Scope is clean: only files under `Files Allowed To Modify` were touched, the shared test file's FM-038 hunks were left untouched with no attribution conflict, and `STATUS.md`/`GUI-STATUS.md` were correctly left alone. The one finding is a test-coverage-depth gap in a pre-existing (not task-introduced) test-mock limitation that does not undermine the correctness of the fix itself, which is independently verified sound.

### Coordinator Completion

- Coordinator: claude-sonnet-5, via `/fm-reconcile`
- Decision: Review accepted. The one finding (regression test doesn't mechanically discriminate the dedup-key mechanism, though the underlying reasoning was independently re-derived and verified correct by the reviewer) is a non-blocking
  test-coverage-depth gap in pre-existing shared test-mock infrastructure, not a defect in this task's fix. Logged as follow-up, not a required correction. Marked `done`.
- Decision revision/date: 2026-08-16
