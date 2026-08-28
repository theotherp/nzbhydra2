# FM-123: Vitest Failure Evidence Preservation And Racing-Assertion Audit

Status: planned Owner:
Feature IDs: None
Component IDs: None
API IDs: None
Depends on: FM-122
Blocks: None

## Outcome

The anonymous once-in-ten-to-thirteen unit-suite failure (`MAINTENANCE.md`, single-session list) becomes convergent
instead of anecdotal: a failing run's evidence survives the reflexive green re-run, and the one named suspect shape — a
synchronous assertion immediately after an awaited condition that does not guarantee the state it reads (FM-103's
reviewer) — is audited across the suite and strengthened wherever it races. This packet deliberately does **not** claim
to fix the flake; nobody has reproduced it on demand, so its ledger item stays open until an occurrence is caught and
attributed with the evidence this task makes durable. The dependency on FM-122 is sequencing, not code: both tasks alter
the substrate every vitest run executes in, and FM-122's 50-run campaigns must not contain this task's uncommitted work
(the FM-117/FM-121 contamination lesson).

## Decision Dependencies

None.

## Files Allowed To Modify

- `core/ui-react/vite.config.ts` — the `test` block (reporters/outputFile wiring) only
- `core/ui-react/vite/` — one new reporter module (plus its unit test)
- `core/ui-react/knip.json` — only if the new module needs declaring
- `core/ui-react/src/**/*.test.{ts,tsx}` — fenced to assertion strengthening per the audit; no other edits
- This task packet

## Out Of Scope

- Claiming the flake fixed or closing its `MAINTENANCE.md` item; production sources; `vitest.setup.ts` (FM-122's file);
  the `npm run test` script shape

## Context To Read

- `MAINTENANCE.md` *Open candidates*: the anonymous-flake entry (three tasks' sightings, FM-103's reviewer's suspect)
- `core/ui-react/vite.config.ts:42-55` — the reporter added 2026-08-27 and the comment binding the console shape
- Exemplar suspect sites: `src/features/config/indexers/IndexersConfigTab.test.tsx:583-584,606-608`;
  `src/features/search/workspace/SearchWorkspace.test.tsx:764-765,823-824,853-854`

## Acceptance

- Evidence preservation: after any run with ≥ 1 failed test, a per-run artifact under `core/ui-react/test-results/`
  (already git-ignored) names every failed test with its error and survives subsequent green runs. Today
  `test-results/vitest-results.json` is overwritten by the next run, so re-running-until-green destroys exactly the
  evidence the reporter was added to keep. Proven deterministically: in a scratch state with a deliberately failing
  test, run red, then run green, and show the red run's artifact still present and naming the test.
- The `default` console reporter stays first with its output shape unchanged — gate chains parse it.
- Audit: a grep-reproducible inventory (methodology recorded in the handoff) of every site in
  `core/ui-react/src/**/*.test.{ts,tsx}` where a synchronous DOM/state assertion follows an awaited condition that does
  not guarantee the state being read. Per site: strengthened, or a one-line reason it is already deterministic.
  Deliberate stability assertions ("has NOT re-sorted") must not be wrapped in `waitFor` — that passes vacuously — they
  need the pending update flushed before the read.
- Nothing weakened: no assertion deleted or loosened. For each strengthened site in the two exemplar files, a mutation
  of the source behavior it pins is shown still caught (red) after the change.
- The `SearchWorkspace.test.tsx` occurrence FM-119's re-review logged is classified in the handoff — teardown class
  (exit 1, 0 failed), anonymous class (a named in-run failure), or unknown — from evidence, or stated unknown.

## Verification

- `core/ui-react`: 10 consecutive `npm run test -- --run` runs with exit codes recorded; any genuine failure must now be
  named by a preserved artifact and is reported, not silently re-run (an evidence-collection demonstration, not a
  zero-failure gate)
- `core/ui-react`: `npm run typecheck`, `npm run lint` (0 errors / 14 pre-existing warnings), `npm run format:check`,
  `npm run build`, `npm run check:api`, `npm run knip` (1 pre-existing finding, none new), `npm run validate:migration`
- Confirm changed files match `Files Allowed To Modify`; root `git diff --check` clean

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a suite-wide audit needing per-site judgement about React scheduling, plus a reporter that must
  not disturb parsed console output.
- Reviewer: `opus` — shared test infrastructure and dozens of judgement calls; at least the implementer's tier.
- Fixer: `opus` — expected findings are disputed site dispositions, which are judgement, not mechanics.

Implementer prompt: Read the two exemplar files first and work out which awaited conditions actually guarantee the
following read — many of these sites are already deterministic, and a blanket mechanical rewrite is the trap. Prove the
preservation demo (red run's artifact surviving a green run) before starting the audit.
Reviewer prompt: Re-derive the inventory with the recorded methodology and diff it against the handoff's; check hardest
that no stability assertion became a vacuous waitFor and that the console reporter output is byte-shape-identical.
