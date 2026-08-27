# FM-116: Result Fetch Size Wording

Status: planned Owner:
Feature IDs: F-CONFIG-SEARCHING
Component IDs: C-CONFIG-SETTINGS-INDEX
API IDs: None
Depends on: None
Blocks: None

## Outcome

`searching.loadLimitInternal` keeps working exactly as it does and starts describing itself honestly. Today the
Searching tab labels it `"Display..."` with the help "Determines the number of results shown on one page" — legacy's
meaning, where `search-results-controller.js:9` read it into `$scope.limitTo` and paginated the rendered title groups
by it. React has no client-side page size. What the setting actually governs is the **fetch** size:
`SearchRequestFactory.java:26-30` substitutes it whenever an internal search arrives without an explicit `limit`, and
`SearchPage.tsx:166-196` never sends one, so it decides how many results each request retrieves — and the results view
then pages through whatever it fetched. An admin reading the current text and lowering the value to tidy up a long
page instead makes Hydra fetch fewer results and hit indexer APIs differently.

Text only. No Java, no persisted value, no search behaviour, no selector, no schema. Three surfaces state the wrong
thing about this one setting and they are corrected together, because leaving any of them is leaving the same defect.

## Decision Dependencies

- ADR-0032 — supersedes ADR-0031 and is the whole contract here: the setting stays, stays editable, keeps its
  `C-CONFIG-SETTINGS-INDEX` entry, and only the wording changes. ADR-0031's removal directive has no force; do not
  act on it if you meet it while reading.

## Files Allowed To Modify

- `core/ui-react/src/features/config/searching/SearchingConfigTab.tsx` — **only** the `label` and `help` of the
  `searching.loadLimitInternal` `NumberSetting` at `:276-284`, and the stale "Will still be paged according to the
  limit set above" clause in the `searching.loadAllCachedOnInternal` `SwitchSetting`'s `help` at `:270-275`. Every
  prop other than those strings is frozen — `advanced`, `maximum={500}`, `required`, `unit`, `name`, the fieldset,
  row order, and every other setting on the tab.
- `core/ui-react/src/features/config/searching/SearchingConfigTab.test.tsx` — **only** assertions that quote the
  changed strings. `:48`'s fixture value, `:217`'s advanced-hidden key list, and the `:634-641` above-500 refusal case
  all stay: they key on the path and the test id, not the words, and none may be deleted or weakened.
- `core/ui-react/src/features/config/settingsSearch/settingsIndex.ts` — **only** the `label` and `help` of the
  `searching.loadLimitInternal` entry at `:738-743`. The entry itself, its `path`, its `advanced: true`, its fieldset
  and its position stay.
- `core/ui-react/src/features/config/settingsSearch/settingsIndexDrift.test.tsx` — **only** if a fixture quotes the
  changed strings. Both drift directions and the `advanced`/`fieldset` column checks stay as strict as they are.
- `tests/system/tests/results.spec.ts` — **only** the FM-094 comment block at `:266-279`, which asserts "React
  ignores it" and leaves the now-answered open question. Comment text only: no `test(`, locator, or assertion in that
  file may change.
- This task packet and `../STATUS.md`

## Out Of Scope

- **All Java**, and `core/src/main/resources/config/baseConfig.yml`, both native-image metadata files, and every
  `ConfigMigration` step. ADR-0032 freezes them by name.
- `core/openapi.json` and `src/api/generated/openapi.ts` — a text change in React cannot reach a schema generated from
  the Java model; both must be byte-identical afterwards, but that is a containment check, not this packet's evidence.
- Changing the value, the 500 maximum, the `advanced` gating, the `unit`, the control kind, or the results view's
  paging. Nothing about behaviour moves — if a test that asserts behaviour needs editing, you have changed too much.
- Removing the setting, or re-opening whether it should exist. That was ADR-0031 and it is superseded.
- The three test-data configs carrying the key, and `SafeSearchingConfig` publishing a value no React code reads
  (true, and a ledger follow-up, not this packet's business).

## Context To Read

- `../DECISIONS.md` ADR-0032 in full, including its recorded lesson; ADR-0031 above it for context only
- `core/.../searching/searchrequests/SearchRequestFactory.java:26-30` and its callers `SearchWeb.java:159`
  (`SearchSource.INTERNAL`) / `ExternalApi.java:336` (`SearchSource.API`, hardcoded 100) — what the setting really does
- `features/search/SearchPage.tsx:166-196` (the request literal carries no `limit`, which is why the server
  substitutes the setting), `:294-335` and `SearchResults.tsx:490-494` (the load-more cursor built from the response's
  `limit`) — the reason "fetched per request" is accurate and "shown on one page" is not
- `SearchingConfigTab.tsx:270-284` (both strings, and note the switch sits *above* the number field, so "the limit set
  above" is stale in position as well as in meaning) and `settingsIndex.ts:738-743` (the copy that must stay in sync)
- Legacy, for what the old wording described: `git show 4642eed5b^:core/ui-src/js/search-results-controller.js:9`
- `/core/ui-react/AGENTS.md` *UI Conventions* (ADR-0014) — a visible label is not optional and this one stays visible

## Acceptance

- The label no longer reads `"Display..."`. It names the thing being limited — results fetched per request — and
  stands on its own in the settings-search result list, where it appears without its fieldset for context.
- The help says how many results are retrieved from indexers per request, keeps the two facts the current text gets
  right (that a higher value may cause more API hits because indexers are queried until the number is matched or
  exhausted, and that the limit is 500), and **must not** state or imply that the value caps what is displayed, what
  fits on a page, or how the results view paginates — the results view pages through whatever was fetched. Do not
  simply reword around the old claim; drop it.
- The `settingsIndex.ts` entry's `label` and `help` are byte-identical to the rendered ones, so the drift test passes
  because they agree, not because it stopped looking. Searching the settings search for the new label finds the row,
  and the row still navigates to it on the Searching tab.
- `loadAllCachedOnInternal`'s help no longer points "above" at a field rendered below it, and no longer describes this
  setting as a display page size. Its own meaning — loading all results already retrieved — is unchanged.
- `results.spec.ts:266-279`'s comment states what is true: React sends no `limit`, the server substitutes this setting,
  and the FM-094 question it left open is answered by ADR-0032. The deleted legacy test stays deleted and the
  surrounding cases are untouched.
- No behaviour changes anywhere: same value, same 500 ceiling, same `advanced` gating, same test ids, same request.
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 and mobile 390x844 of the Searching tab's
  "Result display" fieldset with advanced on, showing both corrected strings; plus one capture of the settings-search
  result row for the new label, which is where the label has to work hardest.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run
  build && npm run check:api && npm run validate:migration` succeeds. Lint is 14 warnings / 0 errors at base; a
  fifteenth is yours. `npm run knip` reports its two known pre-existing findings (`NO_ADVANCED_DISCLOSURE`,
  `RepeatSection`'s dead barrel export) and no third.
- Name in the handoff that `settingsIndexDrift.test.tsx`, `SearchingConfigTab.test.tsx` and `ConfigShell.test.tsx`'s
  settings-search cases pass, with before/after totals. Changing a label on both sides at once is exactly the change
  that keeps a drift test green while breaking what it was meant to protect, so also state that you confirmed it
  still fails when only one side is edited.
- `npm run validate:focus-affordances` is **red at base** on five known false positives (`../MAINTENANCE.md`), none in
  this packet's files. Report it *failed*, with a base-comparison run on a pristine tree (stash or `git archive`)
  proving your finding set is byte-identical to base; a sixth finding is yours. Never silence it by adding entries to
  the exemption list at `scripts/validate-focus-affordances.mjs:112` — FM-111 refused exactly that workaround.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-searching.spec.ts
  tests/config.spec.ts` passes in full, both unedited. `config-searching.spec.ts` renders the tab; `config.spec.ts`
  covers settings search and the "on this page" anchor list, the two surfaces that consume the changed label. A
  failure in either is a defect here, not a reason to adjust them. `results.spec.ts` needs no run — only a comment in
  it changes — but say so explicitly rather than leaving it unmentioned.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no Java, metadata, or generated-API file in
  the diff at all, and no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — four strings in one module, kept in sync across a pair of files this tree already pairs, with
  the required and forbidden claims spelled out above. No shared component, contract, or registry record.
- Reviewer: `sonnet` — matches the implementer's tier; nothing shared changes. The one thing to judge is whether the
  new wording is true, not whether the diff is small.
- Fixer: `sonnet` — expected findings are wording.

Implementer prompt: Read ADR-0032 and `SearchRequestFactory.java:26-30` before drafting a word — the wording has to be
true, and that is the only place the truth is. Trap: the label and help exist twice, in the tab and in
`settingsIndex.ts`, and the drift test compares them, so editing one side turns a real gate red and editing both
carelessly keeps it green while the text stays wrong. Second trap: ADR-0031 sits directly above ADR-0032 and says to
delete this setting; it is superseded.
Reviewer prompt: Check hardest that no claim about display or page size survives in either string, and that behaviour
is provably untouched — value, ceiling, gating, test ids, request shape. Distrust a green drift test until the
handoff shows it still fails on a one-sided edit.
