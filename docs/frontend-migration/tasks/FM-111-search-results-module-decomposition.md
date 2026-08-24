# FM-111: Search Results Module Decomposition

Status: planned Owner:
Feature IDs: F-SEARCH-RESULTS
Component IDs: C-RESULT-TABLE
API IDs: None
Depends on: FM-109
Blocks: None

## Outcome

`features/search/results/SearchResults.tsx` is 2588 lines — the largest hand-written file in the tree — because one
file hosts, besides the `SearchResults` component itself, a set of module-level units that are already independent:
`ResultRow` + the `ResultColumn` type (`:1680-2050`), the three select-all icons (`:2050-2103`), `SelectionMenu`
(`:2103`), `RejectedResultsTrigger` (`:2231`), `DisplayOptionsMenu` + `DisplayOption` (`:2336-2518`), the
`StoredChoices` persistence helpers (`:87-99`, `:2518-2560`), and the shared style constants (`:101-180`). Each moves
byte-identically into its own sibling module under `results/`, leaving `SearchResults.tsx` holding the component and
its immediate layout. Pure code motion: no JSX, prop, selector, `sx`, memoization, or storage change; the public
import path (`results/SearchResults`, consumed only by `SearchPage.tsx`) is unchanged.

## Decision Dependencies

None (the `C-RESULT-TABLE` target is the `results/` directory, so the split stays inside the recorded target; part of
the 2026-08-24 cleanup batch FM-108..FM-112, independent of the config batch).

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/SearchResults.tsx`, new sibling modules in the same directory, and
  `SearchResults.test.tsx` (import lines and, if the suite is split alongside the units, moved-not-edited test bodies)
- The `C-RESULT-TABLE` record note in `../COMPONENTS.yaml` only if its responsibility wording names the single file
- This task packet, `../STATUS.md`

## Out Of Scope

- `SearchPage.tsx`, `resultTable.ts`, `RefineSidebar.tsx`, `DownloadActions.tsx`, `filterControls.tsx` — untouched
- Any behavior, DOM, selector, or style change; re-homing the file's px literals into the theme (they predate
  ADR-0014's cutoff treatment of this file — leave them where they land)
- Splitting the `SearchResults` component body itself into subcomponents (hook order and memo identity risk; a
  render-only subtree may be extracted only if it takes plain props and its JSX moves without edits)

## Context To Read

- `SearchResults.tsx` in full, and `SearchResults.test.tsx` (3409 lines — the behavior net; note which internals it
  imports, if any)
- `ResultRow`'s `memo` contract and the stable-prop threading FM-096 documented (`indexerColors`) — the property the
  move must not defeat
- FM-089's stored-payload notes (`STORAGE_KEY` carries `refineCategoryOpen`/`refineIndexerOpen`)

## Acceptance

- Every unit listed in the Outcome lives in its own module (grouping cohesive pairs is fine — e.g. the icons with
  `SelectionMenu`); `SearchResults.tsx` no longer contains module-level components other than `SearchResults` and
  drops below ~1700 lines, with the moved code byte-identical modulo import/export statements and comment placement.
- `ResultRow` remains `memo`-wrapped with an unchanged comparator situation (default shallow), and its props type is
  unchanged — a diff hunk shows the `memo(function ResultRow...)` wrapper moved intact.
- The persistence helpers keep FM-109's shared storage adoption and the exact `STORAGE_KEY`/payload semantics.
- `SearchResults.test.tsx` keeps every assertion; permitted edits are import lines or mechanical relocation of whole
  `describe` blocks next to a moved unit.
- Before/after evidence: two screenshots of the same seeded results view (desktop 1280x800, identical fixture and
  state) captured at the base and head commits, attached to the handoff and visually indistinguishable.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run knip && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts tests/search.spec.ts tests/downloads.spec.ts` passes in full — the deepest selector consumers of this file.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — pure code motion in the app's most behavior-dense feature; an identity slip survives unit
  tests as a selection or persistence bug.
- Reviewer: `opus` — must prove byte-identity of moved hunks and that memoization still holds; matches implementer.
- Fixer: `opus` — fixes would sit in the same identity-sensitive seams.

Implementer prompt: Map the module-level units and their captured module-scope constants before cutting — several
units read the shared style constants, which must keep one home, not grow copies. Trap: `SearchResults.test.tsx` may
reach internals via the single file; check its imports first, since a unit it imports directly changes your export
plan. Prove first that moving `ResultRow` alone leaves the full unit suite green — it is the memo-sensitive piece.
Reviewer prompt: Check hardest that moved hunks are byte-identical (`git diff --color-moved=dimmed-zebra` makes drift
visible) and that no default export/import swap changed identity semantics. Distrust the screenshot pair as sole
evidence — require the system-test selection and persistence cases green.
