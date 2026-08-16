# FM-033: Durable Visual Evidence Output

Status: planned Owner:
Feature IDs: F-PLATFORM-SHELL Component IDs: None API IDs: None Depends on: None Blocks: None

## Dependency Notes

This is a dependency-free test-infrastructure correction of the FM-026 evidence workflow. It formally blocks nothing: FM-028 is already in `review` and its factual handoff must not be rewritten, and FM-022 (`ready`) can proceed either way.
It should nevertheless be sequenced before further ADR-0006 visual-parity work, because every such task currently pays the manual workaround described below.

## Outcome

Playwright visual evidence recorded in `FEATURES.yaml` survives a partial or selective spec run, so `npm run validate:migration` no longer fails because an unrelated spec invocation deleted another feature's evidence artifacts.

## Boundary Rationale

One defect in one shared browser-evidence mechanism: `tests/system/tests/visualEvidence.ts:28` writes evidence under `test-results/`, and `tests/system/playwright.config.ts` sets no `outputDir`, so Playwright's default output directory —
the same tree — is cleared at the start of every run. The output location, the recorded `snapshots` paths that must resolve to it, the ignore rule that keeps those artifacts untracked, and the CI artifact collection that must still capture
them are a single change that cannot be verified in parts: the evidence path is only correct if all four agree. Nothing product-facing is included, and the `npm ci` verification-cost convention (FM-034) is a separate documentation-policy
concern in disjoint files with disjoint verification.

## Decision Dependencies

- Accepted: ADR-0004, ADR-0006, ADR-0007.
- Blocking proposed/rejected: None.

ADR-0006's Affected Work already assigns `tests/system/playwright.config.ts` and the evidence workflow to follow-up task work, and it decides evidence *semantics* and *acceptance*, not artifact storage location. Both candidate approaches
below are reversible test-infrastructure choices that leave every visual contract, geometry check, depicted region, and human acceptance untouched, so no new ADR is required.

## Files Allowed To Modify

- `tests/system/playwright.config.ts`
- `tests/system/tests/visualEvidence.ts`
- One new or existing focused test file under `tests/system/tests/` for the regression guard below
- `tests/.gitignore` — only to keep generated evidence untracked if its root moves
- `.github/workflows/system-test.yml` — only the two `Upload Playwright artifacts` `path:` lists, and only if the evidence root moves outside `tests/system/test-results/**`
- Only the `visual.snapshots` path strings of `F-PLATFORM-SHELL` in `docs/frontend-migration/FEATURES.yaml`, and only if the evidence root moves
- `core/ui-react/scripts/validate-migration.mjs` and `core/ui-react/scripts/validate-migration.test.mjs` — only if the guard is implemented there; no existing validation rule may be relaxed
- This task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- What any evidence depicts, any geometry or overflow assertion, any viewport, any `contract`, `states`, `variances`, `acceptance`, or `visual.status` value, and any capture of a new or replacement baseline image
- Any React, legacy, backend, styling, or product change; any new feature evidence; any new spec coverage beyond the regression guard
- Retention, copying, archiving, diffing, or pruning of evidence across runs; changing `playwright-report`, the junit reporter, retries, workers, or `misc/run_gui_systemtest.py`
- The `npm ci` verification-chain convention (FM-034) and any other verification-chain wording
- Rewriting FM-026/FM-027/FM-028/FM-031/FM-032 task contracts, factual handoffs, or recorded verification evidence, including FM-028's documented evidence-restoration rerun

## Context To Read

- `README.md` (Visual Parity, Verification Integrity), `CONTEXT.md`, ADR-0004, ADR-0006, and the FM-026 handoff's evidence-workflow section
- `tests/system/tests/visualEvidence.ts` (`visualEvidencePath`, `captureVisualRegion`), `tests/system/playwright.config.ts`, and the only current caller `tests/system/tests/smoke.spec.ts`
- `core/ui-react/scripts/validate-migration.mjs` — `isContainedProjectPath` requires each `evidence`/`snapshots` entry to exist on disk, which is why a wiped artifact fails `validate:migration`
- `docs/frontend-migration/FEATURES.yaml` `F-PLATFORM-SHELL` (`snapshots`, currently the only recorded PNG paths; its record is `accepted` with an accepted variance) and every `evidence:` spec reference
- `tests/.gitignore` (`system/test-results`), both `Upload Playwright artifacts` steps in `.github/workflows/system-test.yml`, and `misc/run_gui_systemtest.py` `run_playwright` (Playwright runs with `cwd=tests/system`, so helper paths are
  relative to that directory while `FEATURES.yaml` paths are repository-relative)
- The recurring cost this removes: FM-028's handoff records a `tests/smoke.spec.ts` rerun solely to restore wiped `F-PLATFORM-SHELL` evidence before `validate:migration`; FM-027 and FM-031 used the same workaround
- Playwright 1.x semantics for `outputDir` cleanup and `preserveOutput`

## Acceptance

- Visual evidence written by `captureVisualRegion` is no longer stored inside the directory Playwright clears at the start of a run. The implementer chooses and justifies one approach — an explicit `outputDir` that does not contain the
  evidence root, or an evidence root outside the output tree — and records why in the handoff.
- Running any single spec that writes no visual evidence leaves every other feature's previously written evidence file present and unmodified. No manual "rerun the owning spec last" workaround remains necessary before
  `npm run validate:migration`.
- Every recorded path stays consistent after the change: the helper's output location, `F-PLATFORM-SHELL`'s `visual.snapshots` entries, the ignore rule keeping generated evidence untracked, and both CI artifact upload paths all resolve to
  the same directory. If the root does not move, none of these files change.
- A durable automated guard fails if the evidence root becomes contained in Playwright's cleared output tree again. It asserts the containment relationship between the configured output directory and the evidence root rather than restating
  one literal path in two places, and it runs inside an existing verification command.
- The evidence a spec writes is byte-comparable to what it wrote before: same regions, same viewports, same geometry assertions, same file names per feature and region. Re-running the owning spec still overwrites its own evidence, so a
  passing `validate:migration` never depends on evidence from a spec that has not run in the current environment.
- No visual contract, state, geometry check, variance, or acceptance changes. `F-PLATFORM-SHELL` remains `accepted` with its existing human decision metadata and accepted variance unchanged; no baseline or variance acceptance is proposed,
  re-proposed, or implied by this task.

## Verification

- `npm ci` is not required: this task changes no `package.json` or `package-lock.json`. Run an install only if `node_modules` is missing or does not match the lockfile, and record which install command was used.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/smoke.spec.ts` succeeds and writes the `F-PLATFORM-SHELL` evidence files.
- From repository root, immediately afterwards: `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts` succeeds, and both `F-PLATFORM-SHELL` snapshot paths recorded in `FEATURES.yaml` still exist afterwards. Record
  the file listing and modification times that prove the earlier artifacts survived.
- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds with no smoke rerun in between. If
  `validate-migration.mjs` or its test changed, also run `node --test scripts/validate-migration.test.mjs`.
- In `tests/system`: `npx tsc --noEmit` succeeds.
- From repository root: `git diff --check` succeeds; confirm every task-owned changed file is listed under Files Allowed To Modify and that verification leaves no unexpected generated or modified files.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. Record: the chosen approach and why; the exact before/after evidence root
and output directory; the survival evidence from the two consecutive selective runs; the guard's location and what it asserts; and explicit confirmation that no depicted region, geometry check, `FEATURES.yaml` contract field, variance, or
acceptance value changed. An implementer must never mark a task `done`.

## Fresh Review

The reviewer independently confirms that the evidence root cannot be cleared by an unrelated spec run, that all four path references agree, that the guard genuinely fails on regression, that no validator rule was relaxed to make paths
resolve, and that `F-PLATFORM-SHELL`'s accepted visual record is unchanged apart from artifact locations. Human visual acceptance is not requested for this infrastructure-only task.
