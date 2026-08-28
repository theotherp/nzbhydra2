# FM-123: Autocomplete Close Flake Fix, Failure-Evidence Preservation, And Racing-Assertion Audit

Status: planned Owner:
Feature IDs: None
Component IDs: None
API IDs: None
Depends on: None
Blocks: None

> Dependency discharged, not dropped: written `Depends on: FM-122`, which was accepted 2026-08-28 at
> `c264c296e` (packet archived at `339136a4f`). The field reads `None` only because the registry validator
> requires dependencies to name a live packet. FM-122's `vitest.setup.ts` guard is in the baseline, so this
> task's campaigns no longer sample the teardown class at all.

## Outcome

The unit suite's remaining flake is fixed deterministically, and failing-run evidence becomes durable. FM-122's 100-run
campaign named what this packet was first written against as anonymous — same test, same assertion, every time:
`SearchWorkspace.test.tsx` › *"should close the autocomplete dropdown when the user clicks anywhere else, but not when
clicking a suggestion"*, failing `expect(queryByTestId("autocomplete-popup")).not.toBeInTheDocument()` with the popup
still in the DOM. 12/100 full-suite runs (~12%; `MAINTENANCE.md` *Open candidates*, updated 2026-08-28). A ~12%-per-run
failure at a known assertion is a reproducible defect: the expected evidence shape is FM-122's — red on demand, then
green by the same deterministic route. It is also the exact shape FM-103's reviewer predicted, so the suite-wide audit
of that shape now proceeds from a confirmed exemplar, in the very file the audit is fenced to — one packet.

## Decision Dependencies

None.

## Files Allowed To Modify

- `core/ui-react/vite.config.ts` — the `test` block (reporters/outputFile wiring) only
- `core/ui-react/vite/` — one new reporter module (plus its unit test)
- `core/ui-react/knip.json` — only if the new module needs declaring
- `core/ui-react/src/**/*.test.{ts,tsx}` — fenced to the named test's deterministic repair and assertion strengthening
  per the audit; no other edits
- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx` — only if the demonstrated mechanism is a product
  race (e.g. a late autocomplete resolution reopening a closed dropdown), fenced to that repair; the 2026-08-19
  `7913805dc` ledger entry records close-on-outside-click as intended, test-pinned behavior. A test-scheduling
  artifact leaves production untouched.
- This task packet

## Out Of Scope

- Closing the flake's `MAINTENANCE.md` item (the coordinator annotates the ledger on acceptance, as with FM-122);
  `vitest.setup.ts` (FM-122's file); the `npm run test` script shape; production sources other than the fenced
  `SearchWorkspace.tsx` allowance above

## Context To Read

- `MAINTENANCE.md` *Open candidates*: the ~12% entry as updated 2026-08-28 (two classes blended as one rate; the 13
  preserved captures were session-scoped, so the failure text quoted there and here is the durable record)
- `core/ui-react/vite.config.ts:42-55` — the reporter added 2026-08-27 and the comment binding the console shape
- The confirmed site: `src/features/search/workspace/SearchWorkspace.test.tsx`, the negative assertion after
  `fireEvent.mouseDown(document.body)` (~line 730); its sibling blur-close test directly above shares the shape
- Suspect sites named before confirmation: `SearchWorkspace.test.tsx:764-765,823-824,853-854`;
  `src/features/config/indexers/IndexersConfigTab.test.tsx:583-584,606-608`

## Acceptance

- Red on demand first: the named test made to fail deterministically or near-deterministically — a targeted repeat run
  of that single file, or a forced-scheduling reproduction — with recorded counts. If single-file amplification cannot
  reproduce it (the race may need full-suite contention), a full-suite loop stands in: at ~12%, 25 runs miss with
  probability 0.88^25 ≈ 4%. If neither route reproduces it, stop and hand back "premise stale" — do not ship an
  unproven fix. The mechanism is demonstrated, not inferred: the handoff records the observation identifying what
  keeps (or puts) the popup in the DOM after the outside mousedown; a causal story without an observation fails.
- Green by the same route: the reproduction that was red is rerun unchanged after the fix (FM-122's 10/10 red then
  10/10 green is the expected shape), plus 10 consecutive full-suite runs exiting 0 — supporting evidence only
  (0.88^10 ≈ 28% if unfixed); the deterministic route is the proof.
- Not a suppression. The named wrong answers: wrapping the negative assertion in a blanket `waitFor`, raising a
  timeout, configuring retries, or deleting/weakening the "but not when clicking a suggestion" half. The test pins
  real behavior — a suggestion mousedown must not close the dropdown; an outside mousedown must close it and it must
  stay closed — and both halves survive, shown still red under a mutation of the behavior each pins.
- Evidence preservation: after any run with ≥ 1 failed test, a per-run artifact under `core/ui-react/test-results/`
  (git-ignored) names every failed test with its error and survives subsequent green runs. Today
  `test-results/vitest-results.json` is overwritten by the next run (`vite.config.ts:48-53`), so re-running-until-green
  destroys the evidence — the defect that kept this flake anonymous across three reports. Proven deterministically:
  red run, green run, red artifact still present and naming the test. The `default` console reporter stays first with
  its output shape unchanged — gate chains parse it.
- Audit: a grep-reproducible inventory (methodology recorded in the handoff) of every site in
  `core/ui-react/src/**/*.test.{ts,tsx}` where a synchronous DOM/state assertion follows an awaited condition that
  does not guarantee the state being read. Per site: strengthened, or a one-line reason it is already deterministic.
  Deliberate stability assertions ("has NOT re-sorted") must not be wrapped in `waitFor` — that passes vacuously —
  they need the pending update flushed before the read.
- Nothing weakened: no assertion deleted or loosened. For each strengthened site in the two exemplar files, a mutation
  of the source behavior it pins is shown still caught (red) after the change.

## Verification

- `core/ui-react`: the red-on-demand and green-by-the-same-route counts above, recorded in the handoff; the 10
  full-suite runs with exit codes recorded — any genuine failure must now be named by a preserved artifact
- `core/ui-react`: `npm run typecheck`, `npm run lint` (0 errors / 14 pre-existing warnings), `npm run format:check`,
  `npm run build`, `npm run check:api`, `npm run knip` (1 pre-existing finding, none new), `npm run validate:migration`
- Confirm changed files match `Files Allowed To Modify`; root `git diff --check` clean

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a race diagnosed from observation plus a suite-wide audit needing per-site judgement about
  React scheduling, plus a reporter that must not disturb parsed console output.
- Reviewer: `opus` — shared test infrastructure, a possible production change, and dozens of judgement calls; at least
  the implementer's tier.
- Fixer: `opus` — expected findings are disputed mechanism claims and site dispositions, which are judgement.

Implementer prompt: Reproduce before you theorize — get the named test red on demand and observe the mechanism before
touching any code; a fix designed from the failure text alone is the trap, and so is any change that merely makes the
assertion stop firing. Then prove the preservation demo (red artifact surviving a green run) before starting the audit.
Reviewer prompt: Rerun the implementer's red reproduction against the pre-fix tree yourself, then re-derive the audit
inventory; check hardest that no stability assertion became a vacuous waitFor and the console shape is unchanged.
