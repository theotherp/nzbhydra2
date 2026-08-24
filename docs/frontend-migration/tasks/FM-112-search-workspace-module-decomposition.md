# FM-112: Search Workspace Module Decomposition

Status: planned Owner:
Feature IDs: F-SEARCH-FORM
Component IDs: None
API IDs: None
Depends on: FM-109
Blocks: None

## Outcome

`features/search/workspace/SearchWorkspace.tsx` is 1437 lines holding three separable layers: the pure form model
(`searchFormSchema`, `SearchFormValues`, `valuesFromSearch`, `indexersFromSearch`, `fieldValue`,
`nonIdentifierQueryText`, `canonicalSearch` at `:116-243`, plus `hasIdentifier` `:1256` and
`mediaTypeForCategory`/`mediaTypeForCategoryName` `:1417-1436`), the secondary components (`SeasonEpisodeInput`
`:1181`, `AdvancedRangeInput` `:1210`, `IndexerSelectionButton` `:1273`), and the ~900-line `SearchWorkspace`
component itself. The model moves to a `workspace/searchFormModel.ts` and the components to sibling modules, all
byte-identically; `SearchPage.tsx` (the only external importer, of `SearchFormValues`/`canonicalSearch`/
`hasIdentifier`/`nonIdentifierQueryText`/`valuesFromSearch`) updates its import paths. Pure code motion — these are
the exact functions FM-087 proved unchanged by diff-hunk exclusion, and they stay unchanged here too.

## Decision Dependencies

None (module layout only; part of the 2026-08-24 cleanup batch FM-108..FM-112, independent of the config batch).

## Files Allowed To Modify

- `core/ui-react/src/features/search/workspace/`: `SearchWorkspace.tsx`, new sibling modules, and
  `SearchWorkspace.test.tsx` (import lines; whole test blocks may relocate next to a moved unit, unedited)
- `core/ui-react/src/features/search/SearchPage.tsx` and `SearchPage.test.tsx` — import statements only
- This task packet, `../STATUS.md`

## Out Of Scope

- Any change to the moved functions' bodies, the form schema, submit path, chips/Advanced behavior, or selectors —
  FM-087's contract (`valuesFromSearch`/`canonicalSearch`/`nonIdentifierQueryText` semantics) is inherited frozen
- Splitting the `SearchWorkspace` component body beyond extracting the three named subcomponents (same hook-order and
  focus-sequencing risk FM-087 documented); `SearchPage.tsx` logic; `RecentSearches`
- The `advancedOpen` persistence semantics (FM-109 adopted the shared storage; key and auto-open rules stay)

## Context To Read

- `SearchWorkspace.tsx` in full and `SearchWorkspace.test.tsx` (which symbols it imports — it reaches the model
  directly today)
- `SearchPage.tsx:43-50` (the external import surface that must keep compiling with only path edits)
- `STATUS.md`'s FM-087 entry (the open-then-focus sequencing and persistence rules the motion must not disturb)

## Acceptance

- `searchFormModel.ts` holds the pure model listed above with bodies byte-identical modulo import/export statements;
  `SearchWorkspace.tsx` retains the `SearchWorkspace` component (and its immediate constants/hooks) and drops below
  ~1000 lines; the three subcomponents live in their own modules with unchanged props and JSX.
- `SearchPage.tsx` diff hunks touch import statements only; `SearchWorkspace.tsx` re-exports nothing it no longer
  defines unless a test forces a compatibility re-export, in which case the handoff names it and why.
- The chip-click open-then-focus sequencing, `advancedOpen` persistence-on-explicit-toggle-only, and identifier
  handling are proven untouched by the existing test suite passing without assertion edits.
- No selector, DOM, or submit-payload change anywhere.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run knip && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts tests/results.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — code motion across a contract boundary FM-087 froze; the model feeds the submit path.
- Reviewer: `opus` — must verify byte-identity of the frozen functions in transit; matches implementer.
- Fixer: `sonnet` — expected findings are import-path and re-export mechanics.

Implementer prompt: Start from the import lists of `SearchPage.tsx` and `SearchWorkspace.test.tsx` — they define
exactly which symbols need public homes; everything else can lose its `export` on the way (FM-108 already unexported
`searchFormSchema`; keep it internal to the model module if nothing imports it). Trap: `searchFormSchema` and
`SearchFormValues` must move together or the `z.infer` link breaks subtly under isolatedModules. Prove first that
`canonicalSearch`'s moved body is byte-identical via `git diff --color-moved` before running anything.
Reviewer prompt: Check hardest the frozen FM-087 functions for in-transit edits — diff each against the base commit,
not the handoff's claim. Distrust "imports only" for `SearchPage.tsx`; read its full diff.
