# FM-122: Unit Suite Teardown Race Elimination

Status: planned Owner:
Feature IDs: None
Component IDs: None
API IDs: None
Depends on: None
Blocks: FM-123

## Outcome

`npm run test -- --run` in `core/ui-react` never again exits 1 while every test reports passing. The known producer is the
teardown race characterised by FM-111 (`MAINTENANCE.md`, single-session list): roughly 1 full run in 10 exits 1 on two
unhandled `ReferenceError: window is not defined` from a react-dom scheduler callback firing after
`src/components/dialogs/DialogProvider.test.tsx`'s jsdom environment is torn down, with `0 failed` in the JSON report. The
fix closes the class (pending React work flushed before any file's environment teardown), not just this file's instance.
This scope belongs together because the reproduction, the mechanism evidence, and the class-wide guard are one claim.

## Decision Dependencies

None.

## Files Allowed To Modify

- `core/ui-react/vitest.setup.ts`
- `core/ui-react/src/components/dialogs/DialogProvider.test.tsx`
- `core/ui-react/vite.config.ts` — the `test` block only, and only if the setup change requires configuration
- This task packet

## Out Of Scope

- Fixing any genuine test failure surfaced during the run campaigns (that is the separate anonymous-flake ledger item)
- `tests/system`, production sources, the `npm run test` script shape

## Context To Read

- `MAINTENANCE.md` *Open candidates*: the `DialogProvider.test.tsx` teardown entry and the anonymous 1-in-10-to-13 entry
  (the two classes this task must keep apart — their signatures differ: `0 failed` + exit 1 vs a named failed test)
- `core/ui-react/vite.config.ts:42-55` — the JSON reporter and the comment binding the console reporter's shape
- `DialogProvider.test.tsx` — note its last test ends with a MUI dialog open mid-transition, nothing awaited

## Acceptance

- Red first: the signature is reproduced on the unfixed tree — exit 1, stderr carrying `ReferenceError: window is not
  defined` from a scheduler callback, `test-results/vitest-results.json` reporting 0 failed — in at most 50 full-suite
  runs, with run and failure counts recorded. At the observed ~1-in-10 rate, 50 runs miss with probability 0.9^50 ≈ 0.5%.
  If 50 runs cannot reproduce it, stop and hand back "premise stale" — do not ship an unproven fix. Faster amplification
  (looping the single file) may serve diagnosis, but the binding pre/post counts are full-suite runs, matching FM-111's
  characterisation.
- The mechanism is demonstrated, not inferred: the handoff records an observation (e.g. instrumented
  timers/microtasks/MessageChannel in a failing configuration) identifying which scheduled callback outlives the
  environment. A causal story without a recorded observation is not acceptable — this batch already produced one
  fabricated explanation (`MAINTENANCE.md`, 2026-08-27 FM-117 entry).
- The guard is class-wide in `vitest.setup.ts`, so any future test file that abandons pending React work is covered;
  `DialogProvider.test.tsx` may additionally stop abandoning its open, mid-transition dialog.
- A deterministic regression guard fails against the unfixed tree, where achievable; if genuinely not achievable, the
  handoff records why and the repeat-run evidence below stands in.
- Green: 50 consecutive post-fix full-suite runs each exit 0 with the JSON report showing 0 failed (probability ≈ 0.5% of
  that outcome if the failure rate were unchanged). Discrimination rule: a run that exits 1 with the JSON naming ≥ 1
  genuinely failed test is the *other* class — copy `test-results/vitest-results.json` aside before any re-run, report
  the named test in the handoff, do not fix it here, and do not count it against this criterion. A run that exits 1 with
  0 failed fails this criterion outright.
- No test deleted, skipped, or weakened; the `default` console reporter stays first with its output shape unchanged.

## Verification

- `core/ui-react`: pre-fix and post-fix campaigns, e.g. `for i in $(seq 1 50); do npm run test -- --run; echo "run $i exit $?"; done`,
  with every exit code and each nonzero run's JSON failure tally recorded in the handoff
- `core/ui-react`: `npm run typecheck`, `npm run lint` (0 errors / 14 pre-existing warnings), `npm run format:check`,
  `npm run build`, `npm run check:api`, `npm run knip` (1 pre-existing finding), `npm run validate:migration` — all pass
- Confirm changed files match `Files Allowed To Modify`; root `git diff --check` clean

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — diagnosing an intermittent race with a required recorded mechanism, in a setup file every test runs inside.
- Reviewer: `opus` — shared test infrastructure; must independently recount campaign exit codes, at least the implementer's tier.
- Fixer: `opus` — likely findings (flush semantics, discrimination errors) are semantic, not mechanical.

Implementer prompt: Start at `DialogProvider.test.tsx`'s last test and `vite.config.ts`'s reporter comment. The trap is
shipping a plausible-sounding flush without ever observing the post-teardown callback — instrument first, and prove the
reproduction before changing anything.
Reviewer prompt: Distrust the causal story unless the handoff shows the recorded observation. Recount the campaign logs
yourself, and check no genuine test failure from the runs was quietly fixed or counted away.
