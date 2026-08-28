# FM-124: System Suite Server-State Restoration

Status: planned Owner:
Feature IDs: None
Component IDs: None
API IDs: None
Depends on: None
Blocks: None

## Outcome

A mid-test failure in a server-mutating Playwright test can no longer poison the shared instance so that the *next* run
fails on its own precondition. The known instance (`MAINTENANCE.md`, single-session list, observed 2026-08-23):
`tests/system/tests/system.spec.ts`'s sensitive-data-logging round trip enables the setting, asserts, and disables it at
the end, so a mid-test failure leaves the instance mutated and the next run fails on
`toHaveText("Enable sensitive data in logs")` — reset by hand via `PUT /internalapi/debuginfos/sensitiveDataLogging?enabled=false`.
The fix is a restoration that runs regardless of outcome, the shape the `hydra` fixture already gives config mutations
(`tests/system/tests/fixtures.ts:43-57`, kept per ADR-0020's fix-the-fixture ruling), plus a sweep so the class is
closed, not the instance. This task shares no files and no test mounts with FM-122/FM-123 (a different runtime boundary)
and may run alongside either.

## Decision Dependencies

None (ADR-0020 governs the existing fixture shape and is followed, not changed).

## Files Allowed To Modify

- `tests/system/tests/fixtures.ts`
- `tests/system/tests/system.spec.ts`
- Other `tests/system/tests/*.spec.ts` only where the sweep implicates a missing restoration — fenced to restoration
  wiring; no assertion changes
- This task packet

## Out Of Scope

- Raising `playwright.config.ts`'s `globalTimeout` (a separate quickfix); the vitest suite; any product or server code

## Context To Read

- `MAINTENANCE.md` *Open candidates*: the sensitive-data poisoning entry
- `tests/system/tests/fixtures.ts` — the `hydra` config-restore teardown and the auto `diagnostics` fixture
- `tests/system/tests/system.spec.ts:628-662` — the round trip and its direct server-read assertion
- `docs/frontend-migration/DECISIONS.md` ADR-0020

## Acceptance

- Red first, deterministically: poison the instance the way a mid-test failure does (enable sensitive logging, then abort
  before the disable — e.g. a temporary induced failure between the enable and disable steps in a scratch copy), and show
  the *next unmodified* run failing on the precondition exactly as the ledger records.
- Green: with the restoration in place, the same induced mid-test failure leaves the following unmodified run passing;
  and on a normal success the test's own final assertions (including the direct server read of `false`) still hold — the
  restoration must not double-toggle.
- The restoration asks the server, not the UI: it restores the setting via the API regardless of how the test ended,
  mirroring the `hydra` fixture's restore-in-teardown-with-loud-failure shape.
- Sweep: the handoff inventories every server mutation the suite performs outside the `hydra` fixture's config restore
  (method + URL and `spec:line`), and disposes of each: restored by this task, already restored, or recorded why a
  mid-test failure cannot break a later run's precondition (e.g. a thread dump appends to a log; a created backup is a
  file no test asserts absent). Known starting points: `system.spec.ts`'s sensitive toggle, SQL execute, thread dump, and
  backup creation; the show-once server-preference flags acked by dialog dismissals.
- No assertion deleted or weakened; the `diagnostics` auto-fixture and the config-restore teardown behave unchanged for
  every spec this task does not touch.

## Verification

- Root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/system.spec.ts` green post-change, plus one run of
  each additional spec the sweep caused edits in
- The induced-failure/next-run pair from Acceptance, both directions, with outputs recorded in the handoff
- `tests/system`: `npx tsc --noEmit` clean; `npx prettier --check .` clean
- `core/ui-react`: `npm run validate:migration` passes
- Confirm changed files match `Files Allowed To Modify`; root `git diff --check` clean

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — edits the shared fixture every system test runs inside, and the sweep needs judgement about
  server-side semantics per mutation.
- Reviewer: `opus` — shared fixture change; at least the implementer's tier, and must re-derive the sweep inventory.
- Fixer: `sonnet` — expected findings are wiring-level and mechanical against a settled design.

Implementer prompt: Start at `fixtures.ts`'s `hydra` teardown — the pattern to mirror, not to modify — and note the
sensitive toggle is *not* config, so `restoreConfig` never covers it. The trap is a restoration that only runs when the
test body completes; prove the induced-failure/next-run red pair before writing the fix.
Reviewer prompt: Re-derive the mutation inventory yourself (grep PUT/POST across the specs) and diff it against the
handoff's; distrust any "benign" disposition that isn't argued from what a later run's preconditions actually read.
