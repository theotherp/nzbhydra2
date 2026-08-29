# FM-133: System-Test Server-Preference Reset

Status: ready Owner:
Feature IDs: None
Component IDs: C-SERVER-PREFERENCES
API IDs: API-PREFERENCES-GET, API-PREFERENCES-PUT
Depends on: None
Blocks: None

## Outcome

Each system test establishes the server-side preference state it needs, so the `hydra` fixture's config snapshot/restore
teardown (`tests/system/tests/fixtures.ts:46-60`, plus `restoreConfig` at `:236-330`) is removed — the remaining half of the
owner's ruling that a test ensures its own requirements rather than restoring the previous state. `applyBaseline()`
(`fixtures.ts:376`, commit `563f5b293`) is the config-level half and is built on, not redone. The blocker is server state the
`page` fixture's `localStorage.clear()` cannot touch: applying a full baseline to all 197 tests broke 26 of
`results.spec.ts` ("0 of 3 loaded, 3 filtered" — a stale selection filtering every result away, per `563f5b293`'s message).
**The recorded mechanism is unverified**: the candidate blames refine-sidebar selections stored in `forUser` genericstorage,
but `storedChoices.ts:13-33` (FM-111) makes those selections search-scoped and unpersisted, and the only client-written
`forUser=true` key in the tree is `isGroupEpisodesHelpShown` (`groupEpisodesHelp.ts:14,78`). So this task first reproduces
the breakage and names the actual state carrier, then enumerates the surface, then resets it, and only then removes the
teardown.

## Decision Dependencies

None.

## Files Allowed To Modify

- `tests/system/tests/fixtures.ts`
- `tests/system/tests/*.spec.ts` (only edits that make a spec establish its own preconditions)
- `tests/system/tests/testEnvironment.ts` (only if a reset helper needs shared constants)
- This task packet

## Out Of Scope

- Any backend change. If enumeration proves the existing `GET`/`PUT /internalapi/genericstorage/{key}` surface cannot reset
  the state (e.g. unknown per-user key suffixes), stop and escalate per `../README.md` — a reset/delete endpoint is an API
  contract change the owner must rule on.
- The `sensitiveDataLogging` fixture (`fixtures.ts:74-99`) — a static logging flag, opt-in per test, not `BaseConfig` state.
- Redoing or widening `applyBaseline()`'s field set beyond what the reproduced mechanism demands.

## Context To Read

`tests/system/tests/fixtures.ts` (whole file); commit `563f5b293`'s message (the empirical record of the 26-test breakage);
`core/ui-react/src/services/preferences/serverPreferences.ts`, `core/ui-react/src/api/preferences.ts`,
`core/src/main/java/org/nzbhydra/genericstorage/GenericStorageWeb.java` (the `forUser` key-suffix rule);
`core/ui-react/src/features/search/results/storedChoices.ts:13-33` and `groupEpisodesHelp.ts`; the spec-side writers:
`results.spec.ts:27,3371-3435`, `search.spec.ts:39`, `focus-indication.spec.ts:541`, `smoke.spec.ts:98`; backend writers for
the enumeration (`org.nzbhydra.problemdetection.*`, `GuidedTourProvider`, `UserNewsProvider`, `NzbHydra.java:326-328`).

## Acceptance

- The 26-test `results.spec.ts` breakage is reproduced (full config baseline applied to all tests, indexer list changed
  between tests) and the actual carrier of the stale state is named with file:line evidence in the handoff — confirming or
  correcting the candidate's `forUser`-genericstorage claim. If it is not server-side preference state at all, stop and
  report before designing a reset.
- The handoff enumerates the server-preference surface as a table: every genericstorage key, its writer (client spec,
  React code, or backend), and whether it is `forUser`. Backend-written operational keys (e.g. `FirstStart`,
  `outOfMemoryDetected`) are classified as reset-relevant or not, with one line of reasoning each.
- A reset mechanism (fixture helper or per-spec precondition, implementer's choice) makes every test independent of
  server-side preference state a predecessor left behind, using only the existing genericstorage endpoints.
- The `hydra` fixture no longer snapshots or restores config: `restoreConfig`, the `originalConfig` capture, and the
  teardown are deleted; specs that relied on the restore now establish their own preconditions (via `applyBaseline()` or
  their own setup).
- Demonstrated, not asserted: the full suite passes twice in a row against one instance *without restarting it* — the
  second run inherits whatever the first left behind. Both runs' tallies recorded.
- No rendering change → no screenshot strip.

## Verification

- `tests/system`: `npx playwright test` twice consecutively against one instance — all pass both times, tallies recorded
- `tests/system`: `npx tsc --noEmit` and `npx prettier --check .` pass
- `core/ui-react`: `npm run validate:migration` passes
- Root: `git diff --check` clean; changed files match the allowlist

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — the mechanism is unverified and must be reconstructed empirically before the reset can be designed;
  the removal changes what every one of 197 tests may inherit.
- Reviewer: `opus` — same tier: the risky claim is "tests are now independent", which needs judgment against the
  enumeration, not a diff read.
- Fixer: `opus` — findings here will be about state carriers, not mechanical edits.

Implementer prompt: Reproduce first — apply the full baseline to all tests and break `results.spec.ts` before touching
anything, or you are resetting state you have not identified. `storedChoices.ts:13-33` contradicts the candidate's stated
mechanism; trust neither until the repro says which. The double-run-without-restart demonstration is the claim that matters.
Reviewer prompt: Distrust a green single run — only the consecutive-runs evidence proves independence. Check the
enumeration table against `grep -rn genericStorage.save` on the Java tree yourself.
