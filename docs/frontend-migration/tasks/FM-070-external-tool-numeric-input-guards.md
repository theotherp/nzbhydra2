# FM-070: External-Tool Numeric Input Guards

Status: planned Owner:
Feature IDs: F-CONFIG-EXTERNAL-TOOLS Component IDs: None API IDs: API-CONFIG-EXTERNAL-CONFIGURE Depends on: None Blocks: None

## Outcome

Configuring an external tool no longer breaks on the two text fields NZBHydra parses as numbers. A cleared "Minimum seeders" configures the tool with the documented default of `1`; a non-numeric "Minimum seeders" or "Categories" is rejected on the field
in the dialog, and reported by name if it reaches the server anyway (a saved entry, an automatic sync, a non-UI client). Today clearing the field makes `Integer.parseInt("")` throw at `ExternalTools:266`, the blanket handler (`:137-140`) turns it into
`Unexpected error: For input string: ""`, the admin sees only `Failed to configure NZBHydra in Sonarr`, and every later sync of that saved entry fails the same way (`ExternalToolsSyncService:166`) with a notification that names no field.

## Boundary Rationale

One user-observable result — "an unparseable numeric field tells you which field is wrong" — needs both halves: the client guard is what the admin sees, the server guard protects the saved entry's background sync, which no client-side check reaches.
Splitting them ships either a validator with no proof the live defect is closed or a Java guard nothing surfaces. `categories` rides along as the same defect in the same call path (`mapCategories:327-332` parses comma-split tokens with `Integer::parseInt`,
so `"5030, 5040"` — a space — throws exactly like `"abc"`), not because it is nearby in the file. The verbose connection-test message FM-065 escalated alongside this defect is deliberately **not** here: it lives in shared `WebAccessException`/`WebAccess`
code with indexer and Prowlarr call sites and awaits an owner decision (see `STATUS.md`).

## Decision Dependencies

- None.

## Files Allowed To Modify

- `core/src/main/java/org/nzbhydra/externaltools/ExternalTools.java`
- `core/src/test/java/org/nzbhydra/externaltools/ExternalToolsTest.java` **additively only** — the existing case may not be changed, relaxed, or removed
- `core/ui-react/src/features/config/external-tools/{externalToolsSettings.ts,ExternalToolDialog.tsx,ExternalToolsConfigTab.test.tsx}` (the test file additively only)
- `tests/system/tests/external-tools.spec.ts` **additively only**, plus new files under `tests/system/visual-evidence/F-CONFIG-EXTERNAL-TOOLS/`
- The `F-CONFIG-EXTERNAL-TOOLS` record in `docs/frontend-migration/FEATURES.yaml` only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- `WebAccessException.java`, `WebAccess.java`, `ExternalToolsWeb.java` — FM-065's other escalation, pending an owner decision. Do not touch the connection-test message here, even though `external-tools.spec.ts` is in the allowlist.
- `executeConfigurationRequest:247` sends `animeCategories` as a raw comma-separated **String** where Sonarr's field expects a list of numbers (`categories` goes through `mapCategories`, `animeCategories` does not). Real, pre-existing, identical in
  legacy, unverifiable without a live Sonarr contract check: record it in the handoff as a follow-up candidate, do not fix it. The remaining text fields (`seedRatio`, `seedTime`, both seed times, `earlyDownloadLimit`) are never parsed by Hydra at all.
- No new backend config validator (`config/validation/**`), no `ExternalToolConfig`/`AddRequest` change, no restructuring of `addNzbhydraAsIndexer`'s blanket `catch`, no new `data-testid` or toast text, and no `C-CONFIG-FIELDS` change (`TextSetting`
  already takes a `validate` prop — `components/settings.ts:44`, `TextSetting.tsx:31`). The dialog does not start reading `API-CONFIG-EXTERNAL-MESSAGES`; legacy does not either (`formly-external-tools.js:593-609`).

## Context To Read

- `core/src/main/java/org/nzbhydra/externaltools/ExternalTools.java`: `:266` (the guard), `:327-332` (`mapCategories`), `:137-140` (the blanket catch that hides the throw), `:176-209` (`failOnUnknownVersion` — the module's "add a message, then throw"
  convention; the blanket catch then appends a second `Unexpected error: ...` line, which is existing shape, not a defect to fix). Then `ExternalToolsSyncService.java:79-92` and `:166` — the background path a saved bad value breaks
- `shared/mapping/.../config/ExternalToolConfig.java:52-57` (`minimumSeeders = "1"`, `categories = ""`) and `:66-90` (`prepareForSaving` refills empty categories) — the evidence that blank means "default", not "error"; and
  `core/ui-react/src/api/config/externalTools.ts:110`, `:131-133`, where `text()` forwards `""` verbatim, which is how a cleared field reaches Java
- `core/ui-react/src/features/config/main/mainSettings.ts:77-104` — `patternValidator` precedent to copy; `components/settings.ts:164-179` for why an empty value always passes; `ExternalToolDialog.tsx:392-398` and `:431-438` (the two controls);
  `externalToolsSettings.ts:59-68` (`DEFAULT_CATEGORIES`)
- `core/src/test/java/org/nzbhydra/indexers/capscheck/ProwlarrConfigRetrieverTest.java:27-60` — the `@Mock`/`@InjectMocks` pattern for driving a `WebAccess` collaborator without a Spring context; and `tests/system/tests/external-tools.spec.ts:367-450`
  (the viewport loop the new capture joins) with `tests/system/tests/fixtures.ts:192-204` (every mock indexer is `NEWZNAB`)

## Acceptance

- Blank is the default, not an error: `minimumSeeders` of `""`, `"   "`, or absent all post the JSON number `1`, exactly as `null` does today (null behaviour unchanged). Non-numeric is named: `"abc"` adds `Error: Minimum seeders must be a whole number
  but was "abc"` to `getMessages()`, returns `false` from `addNzbhydraAsIndexer`, and sends no `postToUrl` for that entry.
- `mapCategories` becomes lenient about spacing, strict about content: `"5030, 5040"` and `"5030,5040,"` both map to `[5030, 5040]` (tokens trimmed, empty tokens dropped); `null`/`""` still map to an empty list; `"5030,abc"` adds `Error: Categories must
  be comma-separated whole numbers but "5030,abc" contains "abc"` and returns `false` without posting. For none of these inputs does any `getMessages()` line contain `For input string`.
- The dialog blocks both values on the existing `draft.trigger()` path — no new surface, just its "Config invalid. Please check your settings." toast and the field's error text: `minimumSeedersValidator` (`/^\d+$/`, message `` `${value} is not a whole
  number` ``) and `categoriesValidator` (`/^\d+(,\s*\d+)*$/`, message `` `${value} is not a comma-separated list of category IDs` ``), built in `externalToolsSettings.ts` from the shared `patternValidator` and passed to the two `TextSetting`s. Neither
  field becomes `required` — empty stays valid on both sides.
- JVM tests (additive, `ExternalToolsTest.java`) driven through the public `addNzbhydraAsIndexer` with mocked `WebAccess`/`ConfigProvider`, never a private helper — a helper-only test passes while the caller still parses raw input: capture the posted body
  and assert `minimumSeeders` for `""`, `"   "`, `null`, `"5"`, then the messages and the absent post for `"abc"` and `"5030,abc"`. Component tests (additive, `ExternalToolsConfigTab.test.tsx`): an entry whose "Minimum seeders" is `abc` fires no
  `configure` request on submit and shows the field error; one whose "Minimum seeders" is empty still submits.
- System test (additive, `external-tools.spec.ts`): one case configures a torrent entry with "Minimum seeders" cleared and asserts the `configure` response is `true`, using add type Single — the fixture's mock indexers are all newznab, so Per-indexer
  never reaches the torznab branch that parses the field. Record the same case observed failing against the pre-fix jar. Screenshot strip (`../README.md` *Visual Gate*), captured inside the existing viewport loop:
  `external-tools-invalid-seeders-{desktop,mobile}.png` at 1280x800 and 390x844, showing "Minimum seeders" holding `abc` with its error text rendered under the control.
- `F-CONFIG-EXTERNAL-TOOLS` gains exactly one `gaps` line: `deliberate - the dialog rejects a non-numeric "Minimum seeders" or "Categories" before submitting, where legacy sent any text and let the backend fail`. No other registry record changes;
  `API-CONFIG-EXTERNAL-CONFIGURE`'s note stays true (`false` still means the server ran and refused).

## Verification

- From repository root: `mvn -pl core -am test` succeeds; record each new `ExternalToolsTest` case and its result individually. In `core/ui-react`: `npm run typecheck`, `lint`, `format:check`, `test -- --run`, `build`, `check:api`, `validate:migration`
  all succeed; report the test-file/case counts before and after.
- In `tests/system`: `npm run lint` and `npm run format:check` succeed. From repository root: `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/external-tools.spec.ts` passes in full and regenerates the feature's evidence
  directory. A run with a modified assertion elsewhere in the spec does not count.
- Run `git diff --check`; confirm every changed file is in `Files Allowed To Modify` and no stray generated files remain.

## Handoff / Review

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — small edits spanning a Java module with no behavioural test harness, a React validator, and a real-backend spec; the JVM test must be built from scratch around a class whose entry point pulls three collaborators and a static flag.
- Reviewer: `opus` — at least the implementer's tier: judging this means re-deriving which inputs are actually reachable from the UI and whether the system test really reaches the torznab branch, neither of which is visible in a diff.
- Fixer: `sonnet` — one tier down because the expected findings are mechanical: a missing input case, a message literal that drifted from the packet, or a capture at the wrong viewport.

Implementer prompt: Reproduce first — clear "Minimum seeders" on a torrent entry against the pre-fix jar and watch `configure` answer `false` with `Unexpected error: For input string: ""` in `internalapi/externalTools/messages`.
Trap: `addNzbhydraAsIndexer` swallows every exception, so a broken guard looks like an ordinary refusal, not a failure — assert on the posted body and the messages, never only on the boolean.
Second trap: the connection-test message in the same feature is a different, escalated defect; leave `ExternalToolsWeb` alone.
Reviewer prompt: Check hardest that the JVM tests fail without the source change — revert `ExternalTools.java` locally and rerun. Distrust any claim that the system test exercised the torznab branch unless the captured request body shows
`configContract: TorznabSettings`, and distrust a client validator that also rejects an empty field.
