# FM-083: Search Cancellation

Status: planned Owner:
Feature IDs: F-SEARCH-PROGRESS Component IDs: None API IDs: None Depends on: None Blocks: None

## Outcome

The search progress dialog gains legacy's Cancel action — `F-SEARCH-PROGRESS`'s one recorded gap. Cancelling closes the dialog, keeps the user on the search form with their criteria intact, and discards the in-flight search's eventual
response: no results render, no error surfaces, and the live-progress subscription is closed. Like legacy, no server request is sent to stop the search (the backend keeps searching; only the client abandons it) — parity, recorded as a
deliberate gap line.

## Decision Dependencies

ADR-0004, ADR-0014.

## Files Allowed To Modify

- `core/ui-react/src/features/search/SearchPage.tsx` (+ its test)
- `tests/system/tests/search.spec.ts`
- The `F-SEARCH-PROGRESS` record
- This task packet and `docs/frontend-migration/STATUS.md`

## Out Of Scope

- Any server-side cancellation endpoint; the "Show early results" flow (done); result rendering; `C-LIVE-TRANSPORT`

## Context To Read

- `core/ui-src/js/search-controller.js:287-343` (`isSearchCancelled` set by the modal's `onCancel`; the resolved search then skips navigation) and `:717-790` (the modal's one button morphs Cancel → "Show results" once
  `indexersFinished > 0`)
- `core/ui-src/html/search-state.html` (button text/tooltips: "Cancel search and return to search mask")
- `core/ui-react/src/features/search/SearchPage.tsx` — `activeSubmission`/`releaseSubmission` already implement the abandon-tracking this task must reuse, not duplicate

## Acceptance

- The `search-status-modal` dialog shows a Cancel button (tooltip or accessible description "Cancel search and return to search mask") alongside the existing "Show early results" button. The two-button layout instead of legacy's single
  morphing button is recorded as a deliberate gap line on `F-SEARCH-PROGRESS`.
- Cancel closes the dialog immediately, releases the active submission (live subscription closed), and leaves the page in its pre-search state: form values unchanged, no loading indicator, no results, no error alert.
- When the abandoned `executeSearch` promise later resolves or rejects, nothing changes on screen — proven by a test that resolves the transport after cancellation and asserts no results and no error render.
- Cancelling and immediately submitting a new search works: the new submission's results render and the abandoned one's are discarded even if it resolves last (reuse the existing `activeSubmission` identity check; add a test pinning the
  interleaving).
- The dialog still cannot be dismissed by backdrop click or Escape (legacy's `backdrop: "static"`); Cancel is the only way out besides completion.
- `search.spec.ts` exercises a real cancellation: start a search against the shared instance, cancel while the progress dialog is open (mock indexers respond slowly enough, or route-delay the search request), and assert the form remains
  with no results.
- Screenshot strip per `../README.md` *Visual Gate*: the progress dialog with both buttons, desktop 1280x800.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- In `tests/system`: `npm run lint && npm run format:check` succeeds. From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — one module, the abandon mechanism (`releaseSubmission`) already exists; criteria settle the open questions.
- Reviewer: `sonnet` — no shared component or contract changes; the race tests are the substance to check.
- Fixer: `sonnet` — expected findings are test-shape or state-reset details.

Implementer prompt: Start from `releaseSubmission` in `SearchPage.tsx` — cancellation is a caller of it, not a new mechanism. Trap: FM-064's lesson — a stale closure over the submission can let an abandoned response write state; keep every
post-await effect behind the `activeSubmission.current === submission` check. Prove first the cancel-then-resolve test stays green when the abandoned promise resolves after a new search's response. Reviewer prompt: Check hardest the
cancel-during-subscribe and cancel-then-new-search interleavings; distrust any race claim proven only by ordering that awaits in submission order.
