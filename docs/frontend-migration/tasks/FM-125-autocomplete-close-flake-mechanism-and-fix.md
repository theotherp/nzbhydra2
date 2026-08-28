# FM-125: Autocomplete Close Flake — Mechanism And Fix

Status: planned Owner:
Feature IDs: None
Component IDs: None
API IDs: None
Depends on: None
Blocks: None

> Continues FM-123's undelivered third concern (re-opened by its *Acceptance* section); FM-122/FM-123 are in the baseline.

## Outcome

The unit suite's last known flake is fixed via an observed mechanism, using the reproduction recipe FM-123 lacked.
The defect: `src/features/search/workspace/SearchWorkspace.test.tsx` › *"should close the autocomplete dropdown when
the user clicks anywhere else, but not when clicking a suggestion"* intermittently fails
`expect(screen.queryByTestId("autocomplete-popup")).not.toBeInTheDocument()` (lines 731–733, after
`fireEvent.mouseDown(document.body)`) with the popup still in the DOM. **The recipe (2026-08-28 controlled A/B):** a
plain full-suite loop — bare `npx vitest run`, no `-t` filter, no file argument — on an otherwise-idle machine,
verified idle by wall time (~22.5s/run; 60s+ means contention, results untrustworthy). Yield: 5/50 pristine
`b20ee2b53`, 6/50 with FM-123's changes, 12/100 in FM-122's campaign — three measurements clustering at 10–12%,
always this test and assertion. **What does NOT reproduce it** (FM-123 proved across 110 runs; do not repeat):
single-file amplification (sequential or parallel), `-t` filters, `taskset` pinning, `--maxWorkers` oversubscription.
Only genuine whole-suite scheduling surfaces it.

## Decision Dependencies

None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/workspace/SearchWorkspace.test.tsx` — fenced to this test's deterministic repair
- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx` — only if the observed mechanism is a product race,
  fenced to that repair; decision source: the 2026-08-19 ledger entry at `7913805dc` records close-on-outside-click as
  intended, test-pinned behavior. If the right fix would change intended behavior, report `DECISION REQUIRED` and stop.
- This task packet

Temporary diagnostic instrumentation may touch any file but must be fully reverted before handoff (`git diff --stat`).

## Out Of Scope

- `MAINTENANCE.md` ledger closure (coordinator's step on acceptance); `vitest.setup.ts`; reporter/config changes
  (FM-123 delivered evidence preservation); any suite-wide audit (FM-123 delivered it); other tests or sources

## Context To Read

- FM-123's packet (in `tasks/` today; git history once the coordinator archives it): its handoff's non-reproducing
  routes and its *Acceptance* section's A/B data — the durable record of the recipe and rates quoted above
- `core/ui-react/vite/failureArtifactReporter.ts` (landed `23bc19aec`): every failing run now writes a uniquely-named
  `test-results/vitest-failures-*.json` naming the failed test — free per-occurrence evidence during the loops
- The test (lines 708–734) and `SearchWorkspace.tsx:226–247` — `closeIfOutside`, a native
  `document.addEventListener("mousedown", ...)` in a `useEffect`; FM-123's unverified hypothesis (native-listener
  `setState` not flushed by `fireEvent`'s `act` like a synthetic handler's) is a starting point, not a finding
- `MAINTENANCE.md` *Open candidates*: the entry separating the two flake classes (~2% teardown, fixed; this one ~12%)

## Acceptance

- **Red first, by the recipe.** The loop above on the pre-fix tree, wall time per run recorded to prove idleness, until
  ≥ 3 occurrences of the named test/assertion are captured (expected ~5–6 in 50; artifacts retained). If 0 in 50 runs
  at ~22.5s wall each — probability ≈ 0.89⁵⁰ ≈ 0.3% at the measured p ≈ 0.11 — stop and hand back with the loop
  evidence rather than shipping an unproven fix.
- **Mechanism observed, not inferred.** The handoff records the runtime observation (instrumentation output, captured
  state, or equivalent) identifying what keeps or re-inserts the popup after the outside `mouseDown`. A causal story
  without an observation fails, however plausible (FM-122's real cause — a leaked MUI `FocusTrap` interval — resembled
  no first hypothesis).
- **Not a suppression.** Named wrong answers: a blanket `waitFor` around the negative assertion, a raised timeout,
  retries, or deleting/weakening the *"but not when clicking a suggestion"* half. Both behavioral halves survive —
  suggestion `mousedown` keeps the dropdown open (line 728), outside `mousedown` closes it and it stays closed — each
  shown still red under a mutation of the behavior it pins.
- **Green by the same route.** 50 consecutive post-fix runs of the identical loop, all exiting 0, wall times recorded.
  The arithmetic, tied to the measured rate so nobody over- or under-claims: at p ≈ 0.11 (pooled 23/200 across the
  three measurements), 50 clean runs occur by luck with probability 0.89⁵⁰ ≈ 0.3% — adequate; do not substitute a
  shorter loop or claim more confidence than the sample supports. If the mechanism also admits a deterministic
  single-run red→green demonstration, record it as primary and keep the loop as confirmation.
- Machine exclusivity is a hard precondition for both loops: nothing else running, wall time checked every run.

## Verification

- `core/ui-react`: red occurrences (count/total, per-run wall times, retained artifact names) and the 50/50 green loop
  recorded in the handoff; the mechanism observation quoted, not paraphrased
- `core/ui-react`: `npm run typecheck`, `npm run lint` (0 errors / 14 pre-existing warnings), `npm run format:check`,
  `npm run build`, `npm run check:api`, `npm run knip` (1 pre-existing `RepeatSection` finding, none new), and
  `npm run validate:migration`; root `git diff --check` clean; changed files match `Files Allowed To Modify`

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a race diagnosed from runtime observation under whole-suite scheduling, with a possible fenced
  production change; the recipe is settled, so the FM-123-era ambiguity that might have argued for more is gone.
- Reviewer: `opus` — must judge a mechanism claim and possibly a production change; at least the implementer's tier.
- Fixer: `opus` — expected findings are disputed mechanism or proof adequacy, which are judgment, not mechanics.

Implementer prompt: Start from FM-123's packet — its *Acceptance* section carries the A/B data and its handoff the six
reproduction shapes that provably do not work; run only the plain idle full-suite loop and check wall time every run.
Capture ≥ 3 occurrences and observe the mechanism through instrumentation before designing anything — the trap is
fixing from the failure text, which three prior reports did. Prove first: the red loop, before touching code.
Reviewer prompt: Re-run the red recipe yourself on the pre-fix tree before crediting the mechanism claim; verify the
green loop's wall times show a genuinely idle machine, and check hardest that neither behavioral half was weakened.
