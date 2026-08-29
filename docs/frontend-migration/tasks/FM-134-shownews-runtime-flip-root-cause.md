# FM-134: showNews Runtime Flip Root Cause

Status: planned Owner:
Feature IDs: None
Component IDs: None
API IDs: None
Depends on: None
Blocks: None

## Outcome

The runtime flip of `main.showNews` to `false` is explained, reproduced, and closed at its source. The default is `true`
(`core/src/main/resources/config/baseConfig.yml:335`) yet CI run 33240679544's trace showed the bootstrap payload carrying
`showNews: false`, silently disabling the startup news dialog `focus-indication.spec.ts` asserts on. The maintenance
candidate says nothing in the repository sets it false and hypothesizes a product bug in config save; **that premise is
wrong**: `ConfigurationPersistenceSystemTest.shouldReloadConfigurationFromDisk`
(`tests/system/src/test/java/org/nzbhydra/ConfigurationPersistenceSystemTest.java:99-113`) flips `showNews` via
`PUT /internalapi/config` and never restores it, and CI's `runSystemTestsLinux` runs that Maven phase
(`.github/workflows/system-test.yml:151`) against the same instance the Playwright phase then tests. This task proves that
explanation against a running instance rather than adopting it, fixes the leak at the test, and states explicitly whether
any product bug remains — because commit `563f5b293`'s baseline now forces `showNews: true` in nine config specs, which
**hides the symptom from those tests without fixing anything**, and that mitigation must not be mistaken for a fix.

## Decision Dependencies

None.

## Files Allowed To Modify

- `tests/system/src/test/java/org/nzbhydra/ConfigurationPersistenceSystemTest.java`
- Other files under `tests/system/src/test/java/` only where the required sweep (below) finds the same unrestored-mutation
  pattern
- This task packet

## Out Of Scope

- Weakening or removing `shouldReloadConfigurationFromDisk`'s reload assertion — it keeps proving a save round-trips
  through disk; only its state leak goes.
- Removing `563f5b293`'s baseline fields or the `hydra` fixture teardown (FM-133's ground).
- Any change to `ConfigWeb`/`BaseConfig` save behavior — if reproduction shows the flip is *not* fully explained by the
  Java test, stop and escalate with the evidence; a save-path product bug is a new decision, not this packet.

## Context To Read

`ConfigurationPersistenceSystemTest.java` (whole class — every test mutates config via `assertSuccessfulSave`);
`.github/workflows/system-test.yml:47-160,300-440` (Maven phase then `npm run test:full` against one docker `core`
instance); commit `563f5b293`'s message (which already attributes the leaked `showNews` to the Java system tests);
`tests/system/tests/focus-indication.spec.ts` (the news-dialog assertion that went dark); the maintenance candidate
(surfaced 2026-08-29). The previous local-parity attempt failed with 58 errors and was abandoned — treat getting this one
test class running against a live instance as part of the work, and record what it took.

## Acceptance

- Reproduced, not inferred: against an instance with `showNews: true`, running `shouldReloadConfigurationFromDisk` (Maven,
  `-pl org.nzbhydra.tests:system`, single-class filter allowed) leaves `GET /internalapi/config` reporting
  `showNews: false`. The exact commands and the environment needed to get there are recorded in the handoff.
- The test no longer leaks: after the fix, the same run leaves `showNews` as it found it (restore-in-finally, or mutating a
  field no Playwright spec asserts on — implementer's choice, recorded with reasoning).
- A sweep of every `@Test` in the module lists which other tests mutate config without restoring, and each is either fixed
  here (same pattern) or recorded in the handoff as a named residual with its blast radius.
- The handoff states in one paragraph, with the reproduction as evidence, whether any "config save silently resets an
  advanced boolean" product bug remains for real users, and corrects the maintenance candidate's premise.
- The `563f5b293` baseline is explicitly re-framed in the handoff as defense-in-depth once the source is fixed, so a later
  reader does not take it for the fix.
- No rendering change → no screenshot strip.

## Verification

- Root: `mvn --batch-mode test -pl org.nzbhydra.tests:system -Dtest=ConfigurationPersistenceSystemTest` against a running
  instance — passes, and `showNews` verified unchanged before/after via `GET /internalapi/config` (both values recorded)
- `tests/system`: `npx playwright test tests/focus-indication.spec.ts` against the same instance, run *after* the Maven
  phase — the news-dialog assertion passes without the baseline having to repair anything
- `core/ui-react`: `npm run validate:migration` passes
- Root: `git diff --check` clean; changed files match the allowlist

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — the fix is small but the deliverable is a proven causal chain across two test runtimes plus the
  environment bring-up a previous attempt failed at.
- Reviewer: `sonnet` — no contract or shared component changes; audit the reproduction evidence and the sweep's
  completeness against the class's own test list.
- Fixer: `sonnet` — expected findings are mechanical (restore placement, sweep omissions).

Implementer prompt: Prove the flip before fixing it — run the one test class against a live instance and read
`showNews` back; do not settle for the static reading this packet starts from. The trap is the environment: the last
parity attempt died with 58 errors, so budget for bring-up. Sweep the whole class — every test there saves config.
Reviewer prompt: The claim to check hardest is "fully explained": demand the before/after `showNews` values from a real
instance, and distrust the product-bug paragraph if it rests only on reading the test source.
