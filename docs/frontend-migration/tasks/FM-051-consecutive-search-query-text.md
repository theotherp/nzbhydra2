# FM-051: Consecutive Searches Submit Their Own Query Text

Status: done Owner:
Feature IDs: F-SEARCH-FORM
Component IDs: None
API IDs: None
Depends on: None
Blocks: None

## Dependency Notes

Dependency-free. The defect is pre-existing and was neither introduced nor touched by FM-049 or FM-050, both `done`; FM-050 owned `tests/system/tests/search.spec.ts` and `core/ui-react/src/features/search/history/RecentSearches.tsx`
and released them at completion, so no live task shares a file or a registry record with this one. No ADR is outstanding (see *Decision Dependencies*).

## Outcome

Submitting two distinct plain-text searches back-to-back in one `SearchWorkspace` session sends the **second** search's text — to `/internalapi/search` and to the URL the app navigates to — instead of silently resubmitting the first
search's text. Every URL shape the app writes today keeps its exact parameter set, and every deep link that works today keeps working, proven rather than assumed.

## Boundary Rationale

One user-observable defect with one cause, delivered whole because its three coupled sites cannot be reviewed apart. The text a search submits is decided in two modules — `SearchWorkspace.tsx`'s `canonicalSearch()` writes the URL and
`SearchPage.tsx`'s `submit()` builds the request — and today each decides independently with a `values.title || values.query` precedence chain. Fixing one and not the other leaves the URL and the request disagreeing, which is a second
bug, not half a fix. The regression tests, the deep-link proof, and the stale in-repo comment that documents the defect are the same deliverable.

**No new URL parameter, and no ADR.** The repository already determines the answer, so the designer did not choose one. The single visible search box (`data-testid="search-query"`, `SearchWorkspace.tsx:361-417`) registers to `title`
when the selected category's `searchType` maps to a media type and to `query` otherwise — one input, two form fields, selected by category. `category` is already in the URL. The URL is therefore **not** lossy: it carries the
discriminator; the writer and the request builder just ignored it in favour of a value-precedence chain. Legacy agrees literally: `core/ui-src/js/search-controller.js:418-419`'s `getSearchQuery()` returns `$scope.query` when a media
item is selected and otherwise `$scope.titleQuery` — the one box, unconditionally, with no fallback chain — and `:43` and `:50-52` are exactly the read rule `valuesFromSearch` already mirrors. Adding a distinct URL parameter would
change what the app writes, i.e. the deep-link contract, for a discriminator the URL already carries; it is rejected on that evidence, not on preference.

## Decision Dependencies

- Accepted: ADR-0002 (MUI-only; nothing here adds a control), ADR-0004 (test layering and no test weakened), ADR-0005 (the recent-search/history criteria contract feeds `valuesFromSearch` and must keep working), ADR-0006 (this task
  changes nothing visual and creates no acceptance).
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`
- `core/ui-react/src/features/search/workspace/SearchWorkspace.test.tsx`
- `core/ui-react/src/features/search/SearchPage.tsx`
- `core/ui-react/src/features/search/SearchPage.test.tsx`
- `tests/system/tests/search.spec.ts`
- `docs/frontend-migration/FEATURES.yaml` — the `F-SEARCH-FORM` record only, and only if reconciliation genuinely requires text. Its `visual` block must not be touched. The expected outcome is *byte-identical*: `tests` already lists
  all four test files, and this defect was never recorded as a `gaps` entry. Confirm it explicitly in the handoff either way.
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- Adding, renaming, or removing any URL search parameter, and any change to `canonicalSearch`'s emitted key set.
- Changing `valuesFromSearch`'s read behavior. Its mirror of a bare `query` param into the `title` default is load-bearing (it is what repopulates the visible box for a media-category deep link) and is legacy-faithful
  (`search-controller.js:43`). A deep-link criterion below pins it; do not "clean it up".
- `additionalQuery`'s precedence, visibility, or the fact that React renders that field for any media-type category while legacy hides and disables it without a selected item (`core/ui-src/html/states/search.html:95-102`). Keep
  `submit()`'s leading `values.additionalQuery ||` term exactly as it is; changing it would alter the identifier and history-repeat paths, which are not this defect.
- `AutoSubmitFromRoute`, its dedup, and how many `/internalapi/search` POSTs a manual submit ultimately produces. Once the URL genuinely changes on the second submit, that effect may re-fire with the same resolved criteria. Measure and
  record what you observe; do not change it, and do not build any assertion on a request *count*.
- `RecentSearches.tsx`, the FM-050 keyboard behavior, results, filters, styling, and any `data-testid` addition, removal, or rename.
- `APIS.yaml` (`API-SEARCH-EXECUTE`'s method, path, schema, and evidence are unchanged — only the value of one field is corrected) and `COMPONENTS.yaml` (no shared component is introduced; the derivation is a module-local exported
  pure function inside `F-SEARCH-FORM`'s existing `target`).
- Rewriting FM-049's or FM-050's handoff evidence.

## Context To Read

- `CONTEXT.md`; ADR-0002, ADR-0004, ADR-0005, ADR-0006; `core/ui-react/AGENTS.md`.
- `F-SEARCH-FORM` in `docs/frontend-migration/FEATURES.yaml`, and `API-SEARCH-EXECUTE` in `APIS.yaml`.
- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`: `valuesFromSearch` (`:155-197`), `canonicalSearch` (`:218-242`), the `mediaType` resolution (`:285-289`), the two `queryInput` branches (`:361-417`),
  `categoryChanged` (`:341-353`), `identifierFields`/`hasIdentifier` (`:955-965`).
- `core/ui-react/src/features/search/SearchPage.tsx`: `initialValues` (`:74`), the remount key (`:374`), `submit()`'s request build (`:151-192`), `hasMediaIdentifiers` (`:563-571`), `AutoSubmitFromRoute` (`:485-524`).
- `core/ui-src/js/search-controller.js:20-62`, `:340-365`, `:418-430` — the legacy read rule, write rule, and `getSearchQuery()`. This is the authority for the fix.
- Existing round-trip contract coverage: `SearchWorkspace.test.tsx:43-100` (two `valuesFromSearch`/`canonicalSearch` tests) and `SearchPage.test.tsx:567-602` (the FM-036 bookmarked-URL execution case, with the `searchRequestCalls`/
  `searchRequestBody` helpers to reuse).
- FM-049's Handoff *Follow-Up Work* (`tasks/FM-049-...md:396-404`), which recorded this defect, and the workaround comment it caused at `tests/system/tests/search.spec.ts:717-722`.

## Acceptance

**The defect is fixed.** In one `SearchWorkspace` session with no intervening navigation, submitting `fm051 first query alpha` and then replacing the box's text with `fm051 second query beta` and submitting again must issue a search
whose `query` is `fm051 second query beta`, navigate to a URL whose `query` parameter is `fm051 second query beta`, and leave the box showing `fm051 second query beta`. Today all three say `fm051 first query alpha`.

**One discriminator, shared, not duplicated.** Both `canonicalSearch()` and `SearchPage.submit()` derive the non-identifier query text from a single exported pure function, and that function selects the field the visible `search-query`
input is registered to, using the *same* `mediaTypeForCategory(catalog.categories.find(...)?.searchType)` resolution the render uses at `SearchWorkspace.tsx:285-289` — not a new copy of the rule, and never a `title || query` fallback.
`SearchPage.tsx`'s local `hasMediaIdentifiers` and `SearchWorkspace.tsx`'s `hasIdentifier` are byte-equivalent predicates for the same five fields; collapse them to one exported predicate in the same change, since two modules deciding
the same thing independently is the defect's whole class. Passing the catalog into `canonicalSearch` is an acceptable and expected signature change; updating its existing call sites is mechanical.

**The URL contract is unchanged.** `canonicalSearch` emits the same parameter names, in the same cases, as it does at baseline `b5b1b7b38`: for a non-identifier search a single `query` and no `title`; for an identifier search
`query` (the additional query) plus `title` plus the identifier fields. Only the *value* selected for `query` changes, and only when `additionalQuery` is empty and no identifier is set. Prove the key set is unchanged rather than
asserting it.

**Deep-link back-compatibility is proven, not assumed.** Each of these must be exercised and must behave as it does today. The second is the one that pins `valuesFromSearch`'s mirror:

- `?query=X&category=<non-media>&indexers=...` — box shows `X`, the executed request's `query` is `X`.
- `?query=X&category=<media, e.g. searchType MOVIE>&indexers=...` — box shows `X`, the executed request's `query` is `X`. This works only because `valuesFromSearch` mirrors `query` into `title`; if that mirror is removed this case
  regresses to an empty search, which is the failure mode this criterion exists to catch.
- `?query=X&title=T&imdbId=tt...&category=<media>&indexers=...` — title `T`, additional query `X`; request carries `title: T` and `query: X` exactly as today.
- A Search History repeat (`repeat: "history"`) and a recent-search Repeat both still submit their recorded criteria unchanged, including an entry that records a `title` and a `query` but no identifier.

**A regression test that fails before the fix and passes after, at two layers, for two different reasons.**

- **Component (`SearchPage.test.tsx`) — the deterministic gate.** The router is mocked there (`useSearch` returns a mutable `router.search`, `useNavigate` a `vi.fn()`), so the test must reproduce the round trip explicitly: submit the
  first query, take the object the mocked `navigate` was called with, assign it to `router.search`, re-render so the `key={JSON.stringify(initialValues)}` remount happens, type the second query into `search-query`, submit, and assert
  the request issued for that submission carries the second text. That is precisely what the real router does, it is fast and deterministic, and it is where the write/read/derive chain is observable in isolation.
- **System (`tests/system/tests/search.spec.ts`) — the required real-browser evidence.** The defect is produced by a real navigation and the remount it triggers; the component layer only simulates that. One new `test(...)` submits both
  queries in **one session with no intervening `page.goto`**, asserts the `postDataJSON().query` of the first `/internalapi/search` POST issued after the second submit, asserts `page.url()` carries the second query, asserts the box
  still shows it, and covers the deep-link cases above that need a real address bar. Assert request *content*, never a request count.
- Exhaustive pure-function cases go in `SearchWorkspace.test.tsx` per ADR-0004, including the exact defect input (non-media category, `query: "beta"`, stale mirrored `title: "alpha"` → `"beta"`) and its media-category mirror
  (`title: "alpha"`, stale `query: "beta"` → `"alpha"`).
- **Record the pre-fix failure.** Run the new assertions against the unfixed source, record each exact failure message, then restore and confirm the source file byte-identical by SHA-256 before the passing run. A test that was never
  observed red does not satisfy this criterion.

**No test is removed, skipped, weakened, or ignored (ADR-0004).** All new coverage is additive. Two existing `SearchWorkspace.test.tsx` round-trip assertions pass a `category: "Cinema"` (`searchType: "MOVIE"`) values object with text
in `query` and an empty `title` — a combination the form cannot produce, and which the corrected derivation reads differently. Where that happens you may change the *input* to the reachable equivalent that preserves the assertion's
intent; you may not delete or loosen the assertion, and the handoff must name the test, the old and new input, and why the original was unreachable.

**The stale in-repo comment is corrected.** `tests/system/tests/search.spec.ts:717-722` tells the reader this defect exists and that FM-050's fixture works around it with a full navigation. Keep the `page.goto` — FM-050's recorded
verification basis was established with it and this task does not re-open that evidence — and rewrite the comment to state what is then true: the defect is fixed by FM-051 and the navigation is retained only because FM-050's evidence
was recorded against this fixture. Change no assertion in that test.

**No `data-testid` is added, removed, or renamed**, and no visual lifecycle moves: `F-SEARCH-FORM` stays `visual.status: proposed` with the acceptance outstanding since FM-044 neither withdrawn nor re-dated. Nothing here is visual
work, so no ADR-0006 contract state, viewport, geometry check, snapshot, or variance is added or changed, and no capture is produced.

## Verification

Prerequisites: `tests/system` runs against a **real JVM backend plus mockserver**, not a Vite dev server — the documented launcher builds the `core` and `mockserver` exec JARs with Maven and starts the sonarr/radarr Docker fixtures.
Maven, a JDK, Docker, and installed Playwright Chromium browsers must all be available. Record any command as blocked if the environment cannot provide them; never imply it passed. Keep any scratch spec under the git-ignored
`tests/system/.playwright-cli/` and confirm it is gone at handoff.

- Working directory: `/home/sist/projects/nzbhydra2/core/ui-react`
- `npm run typecheck` — succeeds with no errors.
- `npm run lint` — passes with no errors or new warnings.
- `npm run format:check` — passes. If it fails, prove the failure reproduces on a clean baseline tree and touches no file in this packet's scope; never reformat a file this task does not own.
- `npm run test` — the full vitest suite passes, with the new `SearchPage.test.tsx` and `SearchWorkspace.test.tsx` cases among it; record the file and test tallies.
- `npm run build` — succeeds.
- `npm run check:api` — passes.
- `npm run validate:migration` — prints `Migration registries and task metadata are valid.` and exits 0, with FM-051 placed in the `STATUS.md` section its status requires.
- Working directory: `/home/sist/projects/nzbhydra2/tests/system`
- `npx tsc --noEmit` — succeeds with no errors.
- `npx prettier --check .` — passes. Clean since `ba4acd521`, so a failure here is this task's own and is fixed by formatting only the lines it added.
- Working directory: `/home/sist/projects/nzbhydra2`
- `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/search.spec.ts` — the whole file passes: **16 tests** (the 15 standing after FM-050, plus this packet's one new block). Record per-test results, not just
  the summary. A `--grep`-narrowed run does not satisfy this; narrowed runs used while iterating are recorded as such.
- Record the pre-fix failure separately: the failing run against the unfixed source, each new assertion's exact failure message, and the SHA-256 proving byte-identical restoration before the passing runs above.
- `git diff --check` — no whitespace errors.
- `git diff --stat` — exactly the four `core/ui-react` files, `tests/system/tests/search.spec.ts`, `docs/frontend-migration/STATUS.md`, this packet, and `docs/frontend-migration/FEATURES.yaml` only if reconciliation required it.
  Anything else is out of scope and an escalation.
- `git diff -- core/ui-react/src/features/search/history/ docs/frontend-migration/APIS.yaml docs/frontend-migration/COMPONENTS.yaml` — empty.
- Confirm task-owned changed files are all listed under Files Allowed To Modify.
- Confirm verification leaves no unexpected generated or modified files — no Playwright report, trace, scratch spec, or stray screenshot.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`.

### Outcome

Submitting two distinct plain-text searches back-to-back in one `SearchWorkspace` session now sends the **second** search's own text — to `/internalapi/search`, to the URL the app navigates to, and the box keeps showing it — instead
of silently resubmitting the first search's text. The fix is one exported pure function, `nonIdentifierQueryText(values, catalog)` in `SearchWorkspace.tsx`, used by both `canonicalSearch()` (the URL writer) and `SearchPage.submit()`
(the request builder): it selects the field the visible `search-query` input is actually registered to (`title` for a media category, `query` otherwise, via the same `mediaTypeForCategory(catalog.categories.find(...)?.searchType)`
resolution the render already used), and never falls back to the sibling field. `SearchPage.tsx`'s local `hasMediaIdentifiers` and `SearchWorkspace.tsx`'s `hasIdentifier` — byte-equivalent five-field predicates — are collapsed into one
exported `hasIdentifier`. `canonicalSearch` gained a `catalog` parameter (a signature change, not a URL change); its emitted parameter key set is unchanged from baseline `b5b1b7b38` and only the *value* selected for `query` changes.
`categoryChanged`'s second manifestation (clears `title` but never `query`, so switching from a non-media to a media category and submitting an empty box could send a stale `query`) needed no separate code change: the shared
derivation never reads `query` for a media category, so the one-function fix already covers it. `additionalQuery`'s pre-existing precedence in `submit()`, and its absence from `canonicalSearch`'s URL for a no-identifier search, is
untouched, per Out Of Scope. All four required deep-link cases are exercised and pass, including the media-category bare-`query` deep link that pins `valuesFromSearch`'s mirror as load-bearing. The stale in-repo comment at
`tests/system/tests/search.spec.ts` (recorded under FM-049's Follow-Up Work) now says the defect is fixed; the `page.goto` it sits beside is kept, since FM-050's recorded verification basis depends on it.

### Files Modified

- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx` — added the exported `nonIdentifierQueryText(values, catalog)` derivation and the `mediaTypeForCategoryName(catalog, categoryName)` helper it and the render's own
  `mediaType` computation both call (one copy of the resolution rule, not two); `canonicalSearch` takes a `catalog` parameter and uses `nonIdentifierQueryText` instead of `values.title || values.query`; `hasIdentifier` is now exported.
  No `data-testid`, no visual/layout change, no rendering change.
- `core/ui-react/src/features/search/SearchPage.tsx` — `submit()`'s request-query derivation now calls the shared `nonIdentifierQueryText(values, catalog)` instead of its own `values.title || values.query` chain (the leading
  `values.additionalQuery ||` term is untouched); its local `hasMediaIdentifiers` is removed and every call site now uses the imported `hasIdentifier`; `canonicalSearch(values)` call site updated to `canonicalSearch(values, catalog)`.
- `core/ui-react/src/features/search/workspace/SearchWorkspace.test.tsx` — additive: a `nonIdentifierQueryText` `describe` block with five exhaustive pure-function cases (the exact defect input and its media-category mirror, both
  from ADR-0004; the two empty-box/stale-sibling-field cases; a TV-category parity case); a `canonicalSearch`-level test exercising the same defect/mirror pair end to end; a real-component test reproducing the `categoryChanged`
  manifestation (type in "All", switch to "Cinema", submit an empty box, assert the submitted `query` is `""` and `canonicalSearch` of that submission omits `query` entirely). Two existing round-trip assertions (`:57-107`, category
  `Cinema` with text in `query` and an empty `title` — a combination the form cannot produce, since the visible box for a media category registers only to `title`) had their *input* changed to the reachable equivalent (`title`/`query`
  swapped); their assertions are byte-identical to before. All `canonicalSearch(...)` call sites updated to pass `catalog`.
- `core/ui-react/src/features/search/SearchPage.test.tsx` — additive: the required component-layer regression test (submit "alpha", feed the recorded `navigate` argument back into `router.search`, re-render to trigger the real
  `key={JSON.stringify(initialValues)}` remount, submit "beta", assert the request/URL/box all show "beta" — matched by request *content*, never a count, since fixing this defect lets `AutoSubmitFromRoute` genuinely re-fire); the
  media-category bare-`query` deep-link case; the identifier-plus-`title`-plus-`additionalQuery` deep-link case; a Search-History-repeat case with a `title` and a `query` but no identifier, pinning the preserved `additionalQuery`
  precedence disagreement between `submit()` and `canonicalSearch` byte-for-byte. No existing test edited.
- `tests/system/tests/search.spec.ts` — additive: one new `test(...)` submitting two distinct plain-text searches in one session with no intervening `page.goto`, asserting the second `/internalapi/search` POST's body, `page.url()`,
  and the box value, matched by request content (never a count); it explicitly selects React first (`page.goto("ui/react?redirect=/")`) before interacting, matching the pattern every `results.spec.ts` test and the ADR-0012 test
  above already use — see *Assumptions* for why this was necessary. The stale comment at the ADR-0012 test's own navigation is corrected to state the defect is fixed; no assertion in that test changed.
- `docs/frontend-migration/STATUS.md` — FM-051 moved from `## Upcoming` to `## Review`; its narrative paragraph rewritten from the design-time "planned" framing to describe the completed implementation and verification.
- `docs/frontend-migration/tasks/FM-051-consecutive-search-query-text.md` — `Status: ready` → `Status: review`; this Handoff filled in.
- `docs/frontend-migration/FEATURES.yaml` — confirmed unchanged (see *Registry And Documentation Updates*); not touched.

Scope confirmation: every task-owned modification listed above is within `Files Allowed To Modify`. `git diff --stat` shows exactly these six tracked files (the packet itself is the seventh, untracked-at-baseline file also listed
under `Files Allowed To Modify`); `git diff -- core/ui-react/src/features/search/history/ docs/frontend-migration/APIS.yaml docs/frontend-migration/COMPONENTS.yaml` is empty.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: Maven `3.9.12`; JDK/GraalVM CE `25.0.4`; Docker `29.7.2`; Playwright (per `tests/system/package.json`), Chromium installed.

### Verification Evidence

| Working directory  | Command                                                                         | Result                                                                                    |
|---------------------|----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| `core/ui-react`     | `npm run typecheck`                                                             | Passed, no errors.                                                                          |
| `core/ui-react`     | `npm run lint`                                                                   | Passed, 0 errors, 10 warnings (baseline: 8; see *Temporary Exceptions And Debt*).            |
| `core/ui-react`     | `npm run format:check`                                                          | Passed after formatting the two lines this task added in `SearchPage.test.tsx` and `search.spec.ts` with `prettier --write` (no other file touched). |
| `core/ui-react`     | `npm run test`                                                                   | Passed: 38 files, 247 tests (`SearchWorkspace.test.tsx` 19, `SearchPage.test.tsx` 37, both up from their prior counts by exactly this task's new cases). |
| `core/ui-react`     | `npm run build`                                                                  | Passed.                                                                                     |
| `core/ui-react`     | `npm run check:api`                                                              | Passed: "Generated OpenAPI types are current."                                              |
| `core/ui-react`     | `npm run validate:migration`                                                    | Passed: "Migration registries and task metadata are valid."; FM-051 confirmed placed under `## Review` in `STATUS.md`. |
| `tests/system`      | `npx tsc --noEmit`                                                               | Passed, no errors.                                                                          |
| `tests/system`      | `npx prettier --check .`                                                        | Passed after formatting the added lines in `search.spec.ts` with `prettier --write` (clean since `ba4acd521`, no other file touched). |
| repo root           | `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/search.spec.ts` | Passed, whole file, no `--grep`: **16 passed (30.5s)**, exit 0. Per-test results in *Verification Basis*. |
| repo root           | `git diff --check`                                                              | Clean, no whitespace errors.                                                                 |
| repo root           | `git diff --stat`                                                               | Exactly the four `core/ui-react` files, `tests/system/tests/search.spec.ts`, `docs/frontend-migration/STATUS.md`, and this packet — matches *Files Modified*. `FEATURES.yaml` not in the diff, confirming it was left unchanged. |
| repo root           | `git diff -- core/ui-react/src/features/search/history/ docs/frontend-migration/APIS.yaml docs/frontend-migration/COMPONENTS.yaml` | Empty.                                                                                       |

Not run: none of the required commands were skipped. Docker/Maven/JDK/Playwright were all available; nothing is recorded as blocked.

### Verification Basis

- Baseline: `b5b1b7b38067d0f5694ab7c1228d32a78fdde700`.
- Command coverage:
  - `typecheck`/`lint`/`format:check`/`build`/`check:api` — all four `core/ui-react` implementation/test files below.
  - `test` — all four `core/ui-react` implementation/test files below (the whole suite also covers every other unrelated file, unaffected by this task).
  - `validate:migration` — `STATUS.md` and this task packet.
  - `tests/system`'s `tsc --noEmit`/`prettier --check .`/the whole-file Playwright run — `tests/system/tests/search.spec.ts`, plus the two `core/ui-react` source files it exercises through the built JAR.
- File-content manifest (SHA-256, current on-disk content):
  - `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`: `9d355a5c400e683523defac31cc0ffbc23caee59cc03480c33ff0959e49f4129`
  - `core/ui-react/src/features/search/workspace/SearchWorkspace.test.tsx`: `d49cda63ffa4c612bbc322a22346632dfc312dbbc0b3a274574707069a4df8ef`
  - `core/ui-react/src/features/search/SearchPage.tsx`: `24903937843b7d61cfc1a447bb794d451810d5e1c41023110297efbd78736734`
  - `core/ui-react/src/features/search/SearchPage.test.tsx`: `75996305d8e475e82ae7f3e027f6f3ec92d18732cab4083b7e6bac4b97674fc6`
  - `tests/system/tests/search.spec.ts`: `1e018851e176bd1d938b05bcf924e1a81d8d24bbbeed1a76adc8e574fe5a358a`
  - `docs/frontend-migration/STATUS.md`: `2e52b3b40bb3ec6490559091bd9d16aa4b650dd163846c4c05052957fd324b02`
  - `docs/frontend-migration/tasks/FM-051-consecutive-search-query-text.md`: recomputed after this Handoff was written; not meaningful to pin (task-packet self-reference).
  - `docs/frontend-migration/FEATURES.yaml`: unchanged from baseline; not touched, no entry needed.
- Completed after the last change to each command's listed files: yes for all rows above; every command was rerun after the final edit to its listed files, and the whole-file Playwright run above is the run performed against the
  final, restored, byte-identical-to-fixed source (see the fail-first record below).
- Task-owned changes after verification: none. No implementation or test file was edited after the SHA-256 values above were recorded.

**Fail-first record (both layers), required by Acceptance.**

- *Component layer.* With `SearchWorkspace.tsx` and `SearchPage.tsx` reverted to baseline `b5b1b7b38` (confirmed by SHA-256: `bb1049303d12e93ca652f6c345d9e09f47be265302f4bce443cdd7b3e6bb75e7` and
  `79f46f8f3e1e5f3ca9e792ac2888b1fbff1d1fc6837b7bda48e66c18b395b1bc` respectively) and the new tests already in place, `npx vitest run` on the two test files produced **8 failures**: `TypeError: nonIdentifierQueryText is not a
  function` at each of the five new `nonIdentifierQueryText` pure-function cases; `AssertionError: expected { query: 'alpha', … } to deeply equal { … query: 'beta' … }` at the `canonicalSearch`-level mirror test; `AssertionError:
  expected 'fm051 stale all query' to be undefined` at the `categoryChanged` empty-box regression case; and a `waitFor` timeout (`expected secondRequest to be defined`) at the `SearchPage.test.tsx` consecutive-search test. The other
  three new `SearchPage.test.tsx` deep-link cases passed even against unfixed source — expected, since they exercise the pre-existing round trip rather than the value-precedence defect itself (see *Assumptions*). The two source
  files were then restored from a pre-revert copy and confirmed byte-identical to the fixed versions above by SHA-256 before the passing 56/56 run was recorded.
- *System layer.* With the same two files reverted to baseline, the new `search.spec.ts` block (whole file, `--grep FM-051` used only for this iteration, not as final evidence) genuinely failed: `Error: page.waitForResponse: Test
  timeout of 30000ms exceeded` waiting for the second search's own query text — the actual JVM logs for that run show both searches executing with `query=fm051 first query alpha`, confirming the resubmission defect. The two files
  were restored and confirmed byte-identical by SHA-256 (same hashes as above) before the passing whole-file run (16/16) was recorded. See *Assumptions* for a real mistake caught by this same fail-first discipline before it could
  contaminate the evidence.

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Architecture Decisions

- ADR-0002 (MUI-only): followed; no control was added, changed, or substituted.
- ADR-0004 (test layering and no test weakened): followed; all new coverage is additive at all three layers, the two changed test *inputs* are justified above and in the test file's own comments, and no existing assertion was
  deleted or loosened.
- ADR-0005 (recent-search/history criteria contract): followed; the Search-History-repeat and recent-search-repeat deep-link cases confirm `valuesFromSearch`/`recentSearchCriteria` continue to feed the form correctly.
- ADR-0006 (visual): followed; nothing here is visual work, no state/viewport/geometry/snapshot/variance was added or changed, and no capture was produced.
- `ADR REQUIRED`: None triggered. The packet's own *Boundary Rationale* already established, with repository evidence, that no new URL parameter or ADR is needed; this implementation did not reopen that question.

### Assumptions

- The task packet's own framing ("component layer... where the mocked router makes the write/read/derive chain observable") was followed literally for `SearchPage.test.tsx`. No assumption was needed there beyond what the packet
  already specified.
- **A genuine implementer mistake, caught and corrected by the fail-first discipline itself.** The first draft of the new `search.spec.ts` test relied solely on the shared `describe`'s `beforeEach`, which only does a bare
  `page.goto("/")`. `MainWeb.isReactSelected` (`core/src/main/java/org/nzbhydra/web/MainWeb.java`) defaults to the **legacy** AngularJS shell whenever the `nzbhydra-ui` cookie is absent, which it is for a fresh Playwright context —
  and legacy's own `getSearchQuery()` (`search-controller.js:418-419`) already has no fallback chain, so it does not have this defect. The first draft therefore passed even against unfixed React source, for the wrong reason. This
  was caught only because the fail-first run against reverted source was actually performed and its result inspected rather than assumed: it passed in 2.9s (far too fast for the intended 30s-timeout failure), instrumentation
  (`page.context().cookies()`, a `workspace-primary` testid probe) confirmed zero React markers and no `nzbhydra-ui` cookie, and cross-checking two other already-passing tests in the same file confirmed this is an established,
  intentional pattern in this suite (`results.spec.ts` re-selects React explicitly in nearly every test; `search.spec.ts`'s own "should render the React search workspace..." test deliberately exercises legacy first, then explicitly
  calls `page.goto("ui/react?redirect=/")` before its React-specific assertions) — not a suite-wide defect worth escalating. The test was corrected to explicitly select React first, matching that established convention, before any
  passing evidence was recorded. All debug instrumentation used to diagnose this was removed before the final runs; `should search configured indexers and render their results` and `should render the React search workspace...` are
  confirmed byte-identical to their pre-investigation state.
- Indexer names in the real-backend fixtures are `Mock1`/`Mock2` (via `hydra.configureMockIndexers(["1","2"])`), not the unit-test catalog's `Mock`; the new system test asserts on request/URL/box content only, never on indexer names.

### Temporary Exceptions And Debt

- `npm run lint` gained two new `react-refresh/only-export-components` warnings (0 errors either way; 8 → 10 total), at the declaration lines of the two new exports `nonIdentifierQueryText` and `hasIdentifier` in
  `SearchWorkspace.tsx`. This is the same pre-existing warning class the file already carried for `valuesFromSearch`/`canonicalSearch`/`searchFormSchema` (a file that exports both a component and pure functions trips this rule per
  export), not a new rule or a newly-introduced problem class. It is the direct, unavoidable consequence of this task's own Acceptance criterion — "a module-local exported pure function inside `F-SEARCH-FORM`'s existing `target`"
  — which explicitly forbids moving the derivation into a new shared file (`COMPONENTS.yaml` is Out Of Scope). No lint rule was disabled, suppressed, or weakened to hide this; it is reported here instead. Impact: cosmetic only (0
  errors, Fast Refresh already degraded for this file's existing exports); removal condition: if `SearchWorkspace.tsx` is ever split so pure-function exports live in a non-component file, which is out of this task's scope.

### Registry And Documentation Updates

- `docs/frontend-migration/FEATURES.yaml`, `F-SEARCH-FORM`: confirmed unchanged, not edited. `target`, `tests` (already lists all four touched/added test files: `SearchPage.test.tsx`, `SearchWorkspace.test.tsx`,
  `tests/system/tests/smoke.spec.ts`, `tests/system/tests/search.spec.ts`), `state`/`parity`, `task` (`FM-016`), `gaps` (`[ guided tour ]`, unrelated to this defect and never listing it), `selectors` (unchanged — no `data-testid`
  added, removed, or renamed), and `backlog` are all byte-identical to baseline. This defect was never recorded as a `gaps` entry and remains unrecorded there now that it is fixed, consistent with the packet's stated expectation.
- `APIS.yaml` (`API-SEARCH-EXECUTE`): unchanged, not edited — confirmed by the empty `git diff` above.
- `COMPONENTS.yaml`: unchanged, not edited — confirmed by the empty `git diff` above. No shared component was introduced.
- ADR-0006 visual records: not applicable. `F-SEARCH-FORM` stays `visual.status: proposed`, its acceptance outstanding since FM-044, neither withdrawn nor re-dated. No state, viewport, geometry check, evidence, snapshot, or variance
  was added, changed, or accepted. No behavioral or accessibility gate is implied by any of this task's verification.

### Follow-Up Work

- None required by this task. Nothing outside its scope was found to need a maintenance candidate or a proposed packet: the one thing that looked like a suite-wide concern during implementation (the shared `beforeEach`'s bare
  `page.goto("/")` reaching legacy by default) turned out, on inspection, to be an established and intentional convention already handled correctly by every other test that needs React specifically — not a defect. See *Assumptions*
  for the full investigation.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`.

The reviewer's obligations here: confirm the pre-fix failure was genuinely observed and that the restored source is byte-identical; confirm the fix uses one shared derivation and one shared identifier predicate rather than two
corrected copies; confirm `canonicalSearch`'s emitted parameter key set is unchanged against baseline `b5b1b7b38` rather than merely claimed unchanged; confirm every deep-link case was exercised, in particular the media-category
`?query=` case that pins `valuesFromSearch`'s mirror; confirm no existing assertion was deleted or loosened and that any changed test input is justified as unreachable; confirm no assertion depends on a request count; and confirm no
`data-testid` and no `F-SEARCH-FORM` visual field changed. A reviewer may not accept or re-date any ADR-0006 visual acceptance.
