# FM-113: Blank Category Save Refusal

Status: ready Owner:
Feature IDs: F-CONFIG-CATEGORIES
Component IDs: None
API IDs: None
Depends on: None
Blocks: None

## Outcome

`PUT /internalapi/config` **refuses** a config containing a nameless category instead of throwing on it. Today
`CategoriesConfig.setCategories` sorts with `Comparator.comparing(Category::getName)` over entries whose `name` may be
null, and `Category.name` carries no bean-validation annotation — so the throw happens inside Jackson's `@RequestBody`
binding of `BaseConfig`, *before* `ConfigWeb.setConfig`'s body and therefore before `CategoriesConfigValidator` can say
anything. The comparator fix and the refusal belong together: the comparator alone turns a crash into a silent accept
of a nameless category, and the refusal alone is unreachable code.

**This is API hardening, not an everyday-crash fix — read this before believing any urgency framing.** The React tab
cannot reach it. `CategoryEntryFields.tsx:36-42` marks Name `required`, `settings.ts:146` turns that into an RHF
`{required: "This field is required"}` rule, and `ConfigShell.tsx:205-212` returns `"rejected"` from `form.trigger()`
before issuing any PUT — FM-107 states it outright at `CategoriesTable.tsx:67-71` ("`name` is `required`, so a blank
one blocks the save"). The typed-then-cleared `""` route is closed the same way: RHF rejects `""` long before
`Jackson.JSON_MAPPER`'s `EmptyStringToNullDeserializer` could map it to null. What remains reachable is every *other*
caller of the endpoint — scripts, hand-crafted requests, and restored or hand-edited `nzbhydra.yml` files — which is
worth fixing on its own terms and is the whole of this packet's value.

**Why the ledger claimed otherwise, recorded so nobody re-derives it.** The entry said "adding a category and saving
before typing a name throws", and the batch shortlist ranked this first as "reachable by an ordinary action on an
ordinary day". The *data shape* is real — `defaultCategoryEntry()` seeds `name: null`, verbatim from legacy's
`defaultModel` — so the premise looked sound. What was never checked is the client gate standing between that shape
and the server. A "the UI can reach this" claim needs the submit path walked, not just the model inspected.

## Decision Dependencies

None. The refusal uses `ConfigValidationResult.errorMessages`, the flat-string channel
`CategoriesConfigValidator` already speaks for every other category problem. A **field-attributed** message is
explicitly *not* in scope: that channel does not exist and creating it is the unmade structured-validation decision.

## Files Allowed To Modify

- `shared/mapping/src/main/java/org/nzbhydra/config/category/CategoriesConfig.java` — **only** `setCategories`'
  null-safety. The sort's existing ordering for named entries, the field set, `withoutAll`, `toString`, and
  `Category.java` (untouched — no annotation added there) are frozen.
- `core/src/main/java/org/nzbhydra/config/validation/CategoriesConfigValidator.java` — the new nameless-category error
  and null-guarding the two existing unguarded dereferences named in Acceptance. Existing messages, their wording, and
  the `restartNeeded` flag are frozen.
- A new test class under `shared/mapping/src/test/java/org/nzbhydra/config/category/` (first file in that test package)
- `core/src/test/java/org/nzbhydra/config/CategoriesConfigTest.java` — **add-only** cases; no existing case deleted,
  retargeted, or weakened to make a case pass.
- `tests/system/tests/config-categories.spec.ts` — **add-only** one end-to-end refusal case
- The `F-CONFIG-CATEGORIES` record in `../FEATURES.yaml`
- This task packet and `../STATUS.md`

## Out Of Scope

- Every file under `core/ui-react/`. In particular **do not relax or remove Name's `required`** at
  `CategoryEntryFields.tsx:36-42` to make a UI route to the server exist. It is out of the allowlist, it is a UX
  regression, and FM-107 depends on it (`CategoriesTable.tsx:67-71` keeps collapsed rows mounted precisely so that
  refusal has somewhere to render). Also unchanged: `defaultCategoryEntry()`'s `name: null`, and any new error
  rendering — `ConfigFeedbackBanner` already renders `errorMessages`.
- Extending `ConfigValidationResult` with a field/path channel, and any change to `ConfigWeb`, `BaseConfigValidator`,
  `Jackson.java`, or the mapper features (`FAIL_ON_UNKNOWN_PROPERTIES` stays at its default).
- `setCategories` mutating its caller's list in place, and `Category.equals`/`hashCode` collapsing all null-named
  entries to one — both real, both wider than this defect. Do not fix them here.

## Context To Read

- `shared/mapping/.../category/CategoriesConfig.java` (`setCategories`) and `category/Category.java` (`name` is a bare
  `protected String`, no `jakarta.validation` import; `equals`/`hashCode` are name-only and null-safe)
- `core/.../validation/ConfigValidator.java` (the interface) and `ConfigValidationResult.java` (`errorMessages` is a
  flat `List<String>` deduped through a `HashSet`; there is no field channel)
- `core/.../validation/CategoriesConfigValidator.java` in full — `doesValidate`, and the existing prose convention
  `Category "X" does not have any newznab categories configured`, which the new message must match in register
- `core/.../ConfigWeb.java`'s `@PutMapping("/internalapi/config")` — why validation is too late today
- `core/.../Jackson.java` (`JSON_MAPPER`'s `EmptyStringToNullDeserializer`; `YAML_MAPPER` used by
  `ConfigReaderWriter.save`, whose `convertValue` re-enters `setCategories` on the write path)
- The four sites the Outcome names as the client gate, read-only — confirm it for yourself rather than taking the
  Outcome's word, since the whole shape of this packet follows from it
- `tests/system/tests/fixtures.ts:189-199` — `putConfig`'s request shape, `internalRequest`, and the
  `ConfigValidationResult` it returns; this is the boundary the end-to-end case works at
- `core/ui-react/src/features/config/categories/categoriesSettings.ts` (`defaultCategoryEntry`, `categoryEntryLegend`'s
  "New category") — the shape that produces a null name; read only, not edited
- `shared/mapping/src/test/java/org/nzbhydra/historystats/FilterDefinitionJacksonTest.java` — the round-trip test
  convention to mirror (JUnit 5, AssertJ, a bare Jackson 3 `ObjectMapper`, inline JSON literals, the 2026 licence header)

## Acceptance

- Deserializing a `CategoriesConfig` whose `categories` contain one or more null-named entries no longer throws.
  Ordering for entries that *do* have names is unchanged; null-named entries sort deterministically to one end (state
  which in the handoff) so a save is byte-stable across repeated round trips.
- `CategoriesConfigValidator.validateConfig` returns `ok: false` with an error message naming the offending row when
  any category has a null or blank name, in the register the file's existing messages use. The message identifies the
  row by position (it has no name to quote) — no field path, no structured attribution.
- The two unguarded dereferences in that same validator are null-guarded so the new path cannot itself throw:
  `x.getName().equals(...)` in the default-category check, and `x.getNewznabCategories().stream()` (whose sibling line
  already tolerates a null list).
- Round-trip tests in the new `shared/mapping` class: a categories payload with a null-named entry deserializes;
  one with a mix of named and null-named entries deserializes and orders as stated; an all-named payload keeps exactly
  today's order. Each observed failing against the unfixed comparator before the fix lands (record how, e.g. `git
  stash` on the source hunk) — a green-only test proves nothing here.
- Add-only `CategoriesConfigTest` cases: a null-named category is refused with the message; a blank (`""`) name is
  refused identically; the pre-existing valid configuration still validates clean.
- End-to-end in `config-categories.spec.ts`, **at the API boundary, not through the tab**: one add-only case that PUTs
  a config containing a null-named category directly — the shape `fixtures.ts:189-199`'s internal `putConfig` uses —
  and asserts `ok: false` carrying the new message. This is the criterion that proves the two halves connect against
  the real backend, and it is red before the fix, where the same request answers 500. Do **not** drive this through
  the UI: `ConfigShell.tsx:209`'s `form.trigger()` refuses a blank Name before any PUT is issued, so a click-and-save
  case can never exercise the server, and one asserting "This field is required" would be green before *and* after the
  fix while appearing to prove it.
- You may additionally assert the tab's own client-side refusal, but only when its test name and an at-site comment
  say plainly that it covers the **client half** and exercises no server behaviour. An unlabelled client assertion
  sitting beside the API case is how a later reader concludes the server was tested when it was not.
- `F-CONFIG-CATEGORIES` records the refusal as a comment paragraph naming this packet and the fact that a nameless
  category is rejected server-side, so a later task cannot remove it as unexplained (`F-CONFIG-AUTH`'s recorded
  username-uniqueness refusal is the shape). `parity`, `gaps`, and the `selectors` list are unchanged — no selector
  is added, renamed, or moved.
- No rendering change — no screenshot strip. The banner is FM-101's, already shipped, and renders an existing channel.

## Verification

- From repository root: `mvn --batch-mode test -pl shared/mapping -DskipTests=false` and `mvn --batch-mode test -pl
  core -DskipTests=false` both succeed; record each new test case and its result individually. The environment's
  `~/.mvn/maven.config` sets `-DskipTests`, so the explicit override is required or the run silently proves nothing.
  Because `core` consumes the edited `shared/mapping`, `mvn --batch-mode clean install -DskipTests` first so the core
  run compiles against the fixed setter rather than a stale jar. Revert any fixture files
  `other/github-release-plugin` rewrites during a reactor run rather than committing them (known FM-069 finding).
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-categories.spec.ts` passes
  in full against the rebuilt server. The blast radius is the config save path shared by all eight tabs, so also run
  `tests/config-main.spec.ts tests/config-searching.spec.ts` unedited in the same invocation, proving a save that
  *should* succeed still does — the new refusal must not reject a valid config. A failure in either is a defect in the
  new validator branch, never a reason to edit those specs. Record the new case's pre-fix result too: run it against
  the unfixed server once and quote the 500 it answers, so the handoff evidences a real behaviour change rather than a
  test that was always going to be green.
- In `core/ui-react`: `npm run validate:migration` succeeds (registry change). The remaining `core/ui-react` gates and
  `validate:focus-affordances` are not run — no file under `core/ui-react/` is edited; record that as skipped, not passed.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — spans two Maven modules and a Playwright spec, and the failure is in Jackson binding rather
  than application code, so reproducing it red-first is the hard part, not the null check.
- Reviewer: `opus` — at least the implementer's tier; changes an API's refusal behaviour and writes a registry
  record. Judge the red-first evidence, not the green run.
- Fixer: `sonnet` — expected findings are message wording, ordering statements and test placement.

Implementer prompt: Start at `CategoriesConfig.setCategories` and `ConfigWeb.setConfig` — read them together and you
see why the validator never gets a turn. Trap: `CategoriesConfigTest` builds its list with `getCategories().add(...)`,
so it never calls the broken setter; a case written that way stays green against the bug. Second trap: the write path
re-enters the setter via `ConfigReaderWriter.save`'s `convertValue`, so unstable null-ordering churns `nzbhydra.yml`.
Prove the NPE first, from a JSON payload through the mapper. Do not go looking for a UI route to the server — the
Outcome explains why there is none, and the end-to-end case works at the API boundary by design, not by shortcut.
Reviewer prompt: Check hardest that each new test was observed failing before the fix, and that the end-to-end case
PUTs directly and asserts the message rather than merely a non-500. Distrust any ordering claim not pinned by a test,
and any UI-driven case presented as evidence the server refused.
