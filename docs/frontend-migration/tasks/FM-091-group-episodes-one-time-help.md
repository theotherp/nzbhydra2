# FM-091: Group-Episodes One-Time Help Dialog

Status: planned Owner:
Feature IDs: F-SEARCH-SORT-FILTER
Component IDs: C-SERVER-PREFERENCES, C-DIALOG-SERVICE
API IDs: API-PREFERENCES-GET, API-PREFERENCES-PUT
Depends on: None
Blocks: None

## Outcome

The React results view shows legacy's one-time "Sorting of TV episodes" help dialog the first time a user sees
episode-grouped results, and records the server-backed per-user flag `isGroupEpisodesHelpShown` so it never shows again —
closing `F-SEARCH-SORT-FILTER`'s last unmigrated gap (`search-results-controller.js:184-191`). This is one vertical
capability: the eligibility predicate, the dialog, the C-SERVER-PREFERENCES adoption, and the registry flip belong
together. Decision source: the recorded `F-SEARCH-SORT-FILTER` gap line; `C-SERVER-PREFERENCES`' own note ("F-SEARCH-RESULTS
has not adopted it yet") reserves exactly this adoption; it is a persisted-data change, hence packet work.

## Decision Dependencies

None (ADR-0004 for coverage; FM-079's acknowledge-after-close precedent is followed, recorded as a deliberate gap line).

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/SearchResults.tsx` (or one new small module beside it) and its tests
  (`SearchResults.test.tsx`; a new colocated `*.test.ts(x)` if a module is added)
- `tests/system/tests/results.spec.ts` — add cases only; existing cases stay untouched
- The `F-SEARCH-SORT-FILTER` record in `../FEATURES.yaml`; the `C-SERVER-PREFERENCES` record in `../COMPONENTS.yaml`
- This task packet, `../STATUS.md`, `../GUI-STATUS.md` if its derived row changes

## Out Of Scope

- Any change to `C-SERVER-PREFERENCES`' own implementation or to the preferences API modules — this is adoption only
- The `groupEpisodes` display option's behavior, grouping logic, or persistence; any other dialog or toast

## Context To Read

- `core/ui-src/js/search-results-controller.js:175-195` — the exact legacy predicate (`groupEpisodes` option on, category
  contains "tv" case-insensitively, no episode requested) and the dialog's title/body/OK shape
- `core/ui-react/src/services/preferences/serverPreferences.ts` and its FM-079 consumers in `src/app/status` — the
  read/`isRaisedFlag`/write pattern to copy; note the flag's meaning is inverted here (raised = help already shown)
- `SearchResults.tsx`: `groupEpisodes` state, `episodeRequested`, and the `DialogContext` usage already present

## Acceptance

- When a results view first renders with episode grouping active under legacy's predicate, the flag is read (`forUser`
  true); only a not-raised flag opens a dialog titled "Sorting of TV episodes" whose body conveys legacy's text (the
  "upper left" locator phrase may be adapted to the React layout; if adapted, record a `deliberate -` gap line).
- The flag is written (`true`, per-user) only after the dialog is closed, however it is closed — a `deliberate -` gap
  line records the deviation from legacy's write-on-open, citing FM-079's precedent.
- At most one read and at most one dialog per app load; a raised flag, a failed read, or an ineligible search shows
  nothing and writes nothing. A failed write is not retried and never blocks the results view.
- Component tests cover: eligible-and-unraised shows then writes after close; raised shows nothing; read failure shows
  nothing; ineligible (non-TV category, or explicit episode requested, or `groupEpisodes` off) shows nothing.
- System test (real backend): PUT the flag `false`, run a TV search, assert the dialog, close it, GET the flag and
  assert it reads raised; a follow-up TV search in the same load shows no second dialog.
- `F-SEARCH-SORT-FILTER`: gap line replaced by the shipped behavior's `deliberate -` lines; parity flips to `done` (all
  remaining gaps deliberate). `C-SERVER-PREFERENCES`: consumers/note updated to name `F-SEARCH-SORT-FILTER` as the
  adopter (correcting the stale `F-SEARCH-RESULTS` anticipation) and state advanced if nothing else keeps it `partial`.
- Screenshot strip per `../README.md` *Visual Gate*: the open dialog over grouped TV results, desktop 1280x800.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — adoption of two demonstrated shared services in one module; the criteria settle predicate,
  timing, failure behavior, and registry flips.
- Reviewer: `sonnet` — no shared code changes; the contract is fully prescribed.
- Fixer: `sonnet` — expected findings are test-mechanical.

Implementer prompt: Start at `search-results-controller.js:175-195` and `serverPreferences.ts`. Trap: the flag's polarity
is inverted relative to FM-079's warning flags (raised means "do NOT show"), and legacy's own `!response.data` truthiness
bug must not be reproduced — go through `isRaisedFlag`. Prove first that a raised flag issues no dialog and no write.
Reviewer prompt: Check hardest the once-per-load guard and the write-after-close ordering under every close path
(button, escape, backdrop). Distrust a system test that never restores/asserts the flag's end state on the shared instance.
