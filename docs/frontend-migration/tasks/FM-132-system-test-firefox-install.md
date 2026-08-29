# FM-132: System-Test Firefox Install

Status: planned Owner:
Feature IDs: F-CONFIG-SHELL
Component IDs: None
API IDs: None
Depends on: None
Blocks: None

## Outcome

FM-117's Firefox acceptance criterion exists again everywhere the suite runs. The number-spinner suppression was fixed
*because the owner dislikes them in Firefox specifically*, and `config-control-treatment.spec.ts:361-377` tests it by
launching Firefox directly (`firefox.launch()`, deliberately not a Playwright project) — but guards with `test.skip` when
the executable is absent, and both installers install Chromium only: `misc/run_gui_systemtest.py:604`
(`npx playwright install chromium`, hardcoded) and `.github/workflows/system-test.yml:93-97,302-306`
(`npx playwright install --with-deps chromium`). So on any machine without a manual `npx playwright install firefox` the
criterion covers nothing — honest, but silently absent. After this task both installers install Firefox alongside
Chromium and the Firefox case demonstrably runs, not skips. A packet rather than a quickfix because it changes what every
system run downloads and how long CI takes (the ledger's own sizing).

## Decision Dependencies

None.

## Files Allowed To Modify

- `misc/run_gui_systemtest.py`
- `.github/workflows/system-test.yml`
- `tests/system/tests/config-control-treatment.spec.ts` (comments only — the 362-367 rationale block mentioning
  "installs only Chromium" goes stale; the `test.skip` guard itself stays)
- This task packet

## Out Of Scope

- Adding a Firefox Playwright project or running any other spec under Firefox (the spec's own 362-364 rationale stands)
- Weakening or removing the `test.skip` guard (it stays the honest fallback for direct `npx playwright test` runs)
- Any other workflow file (`frontend-ci.yml` etc. have no Playwright browser installs — confirm and record)

## Context To Read

`misc/run_gui_systemtest.py:83-97,587-605,691-692`; `tests/system/tests/config-control-treatment.spec.ts:1-2,361-404`;
`tests/system/playwright.config.ts:31-36`; `.github/workflows/system-test.yml:93-97,302-306` (and the ~26-minute runtime
comments at `:45,:256`); the `MAINTENANCE.md` open candidate this discharges (2026-08-27 triage, first item).

## Acceptance

- `ensure_playwright_installed()` installs `chromium firefox` (one invocation or two — implementer's choice; failure
  message names what failed); `--skip-install`'s help text (`:83-87`) no longer says "install Chromium" alone.
- Both `system-test.yml` install steps run `npx playwright install --with-deps chromium firefox`.
- Demonstrated, not asserted: with the Playwright Firefox build absent (move/rename its cache directory first, record the
  path), a `misc/run_gui_systemtest.py` run of `tests/config-control-treatment.spec.ts` installs Firefox and reports the
  Firefox test **passed** — the suite's skip count for that spec drops by one versus the pre-change run. Record both runs'
  pass/skip tallies.
- The stale comment at `:365-367` is updated to name the new install behavior; no assertion in the spec changes.
- Handoff records the cost this packet knowingly adds: Firefox download size and the wall-clock delta of the install step,
  so the CI-runtime consequence the ledger flagged is a number, not a guess.
- No rendering change → no screenshot strip (the spec regenerates its own `control-treatment-number-field-firefox`
  evidence as part of passing).

## Verification

- Root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-control-treatment.spec.ts` — all pass, Firefox case not skipped (before/after tallies recorded)
- `tests/system`: `npx tsc --noEmit` and `npx prettier --check .` pass (comment edit only)
- Root: `python3 -m py_compile misc/run_gui_systemtest.py` clean; workflow YAML parses (`python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/system-test.yml'))"`)
- Root: `git diff --check` clean; changed files match the allowlist. CI itself cannot be run locally — record that the workflow edit is verified by parse + reading, not execution.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — two install-site edits with fully settled acceptance; the only care point is the demonstration
  protocol.
- Reviewer: `sonnet` — no shared component or contract changes; verify the demonstration evidence and the tallies.
- Fixer: `sonnet` — mechanical.

Implementer prompt: Start from `run_gui_systemtest.py:587-605`. The trap: proving the "not skipped" claim against a
machine where Firefox was already present — remove the cached build first and record the path, or the demonstration shows
nothing. Run the spec once before your change to capture the skip tally you must beat.
Reviewer prompt: Check hardest the before/after tallies and that the skip guard survived unweakened. Distrust a green run
on a machine with a pre-existing Firefox install.
