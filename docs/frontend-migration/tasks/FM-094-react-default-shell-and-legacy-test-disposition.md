# FM-094: React Default Shell And Legacy-Test Disposition

Status: planned Owner:
Feature IDs: F-PLATFORM-SHELL
Component IDs: None
API IDs: None
Depends on: None
Blocks: FM-095

## Outcome

React becomes the default shell (ADR-0001 stage one): a request without the `nzbhydra-ui` cookie serves `react`, and a
`legacy` cookie still serves the legacy shell — the full rollback path (`/ui/legacy`, cookie honored on every mapping)
stays intact and untouched. Because bare `/` navigations now land on React, this same packet disposes of every system
test that exercised the legacy shell, per test, and repairs `tests/system/tests/shell-selector.spec.ts`, red since
FM-077 (`MAINTENANCE.md` 2026-08-23: it asserts the real `system-tasks-table`, then clicks the "Switch to legacy UI"
link only `MigrationPlaceholder` renders — no route renders that placeholder any more). One packet because the flip
and the test disposition cannot be separated: the flip is what breaks the legacy-shell tests.

**Promotion gate:** ADR-0001 permits this flip "only after migration acceptance". Do not promote past `planned` until
the owner's acceptance is recorded as a `DECISIONS.md` entry; cite that entry here when it exists.

## Decision Dependencies

ADR-0001 (default flip and its acceptance precondition); ADR-0004 (per-test deletion rules); ADR-0022 via FM-093.

## Files Allowed To Modify

- `core/src/main/java/org/nzbhydra/web/MainWeb.java`; `core/src/test/java/org/nzbhydra/web/MainWebTest.java`
- `tests/system/tests/{shell-selector,results,news,downloads,notification-history,search,smoke}.spec.ts`
- This task packet, `../STATUS.md`, `../GUI-STATUS.md`

## Out Of Scope

- Removing the selector endpoints, cookie code, legacy templates, or any legacy source/asset (FM-095)
- Any React (`core/ui-react`) production change; any legacy (`core/ui-src`, `static/`) change
- No tolerated-red baseline remains in `search.spec.ts`: its `>= 36px` assertion was fixed 2026-08-23 (see
  MAINTENANCE), and `search.spec.ts`/`results.spec.ts` pass 48/48. Treat any failure there as your own.

## Context To Read

- `MainWeb.java` (`isReactSelected`, `shell()`, `index2`); `MainWebTest.java`; ADR-0001; `MAINTENANCE.md`'s two
  `shell-selector.spec.ts` entries; each spec named below plus its React counterpart before deciding a disposition

## Acceptance

- With no `nzbhydra-ui` cookie (and with any unrecognized cookie value), `/`, `/config/**`, `/system/**`, `/stats/**`,
  and `/login` serve the `react` view; a `legacy` cookie serves `index`/`login` exactly as today; `/ui/react` and
  `/ui/legacy` behave unchanged. `MainWebTest` proves the new default and both cookie directions.
- `shell-selector.spec.ts` is rewritten green against a real backend: a cookie-less canonical deep link renders the
  React shell and loads `/static/react/assets/index.js` (200); `/ui/legacy` lands on legacy (`#wrap`); `/ui/react`
  returns. No assertion depends on `MigrationPlaceholder` or its "Switch to legacy UI" link.
- Every remaining legacy-shell navigation in the suite is disposed of explicitly, one handoff line per test naming the
  disposition and its justification (ADR-0004: deletion is legitimate only because the legacy UI itself is being
  removed, and only where React coverage of the behavior is named). Known population — confirm by inspection, do not
  assume it is complete: `results.spec.ts` "should filter titles and sizes through result controls" (legacy inline
  column filters, deliberately absent in React per ADR-0009 — delete; React coverage: "should sort every column and
  filter deterministic React results" and the refine-sidebar tests), "should sort results by title in both directions"
  and "should match x265 and HEVC quick filters..." (bare `/` — retarget to React if the behavior exists there, else
  delete with named coverage), "should expand grouped legacy results..." plus its `assertLegacyGroupExpansionAndBulk-
  Selection` helper (delete; React sibling test exists); `news.spec.ts`'s legacy-shell half; `downloads.spec.ts`
  "...legacy download history"; `notification-history.spec.ts` "...in the legacy route"; `search.spec.ts`'s
  legacy-comparison portion (the `ui/legacy` visit) of the saved-search test, React assertions kept; `smoke.spec.ts`'s
  now-stale "`/` still serves the legacy UI" comment. No React-behavior assertion is deleted or weakened anywhere.
- `../GUI-STATUS.md`'s opening lines state the new reality: React is the default; `/ui/legacy` switches back.
- Screenshot strip per `../README.md` *Visual Gate*: bare `/` in a fresh cookie-less profile, desktop 1280x800.

## Verification

- Root: `mvn -q -pl org.nzbhydra:core -am test -Dtest=MainWebTest -DfailIfNoTests=false` passes (FM-069 note: this
  reactor pull may dirty `other/github-release-plugin` fixtures — do not commit those).
- Root: `python3 misc/run_gui_systemtest.py --runtime local` — full suite; only the documented `search.spec.ts:411`
  baseline failure is tolerated, recorded as such.
- In `core/ui-react`: `npm run validate:migration` succeeds (STATUS/GUI-STATUS consistency).
- `git diff --check` clean; changed files match `Files Allowed To Modify`.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — the Java flip is small, but the per-test disposition demands judgment across many specs under
  ADR-0004, and mistakes there silently discard coverage.
- Reviewer: `opus` — at least the implementer's tier: this changes the URL/shell contract, and test deletions are
  exactly where review must judge, not defer.
- Fixer: `sonnet` — expected findings are disposition-wording or single-spec mechanical repairs.

Implementer prompt: Start at `MainWeb.isReactSelected` and `MAINTENANCE.md`'s 2026-08-23 shell-selector entry. Trap: a
test at bare `/` may pass against React by coincidence of shared testids — classify each by what it asserts, not by
whether it goes green. Prove first that `shell-selector.spec.ts` passes against a freshly built real backend.
Reviewer prompt: Check hardest that every deleted test's behavior is either deliberately absent in React (cite the
decision) or covered by a named surviving test — open both files yourself. Distrust "it still passes" as a disposition.
