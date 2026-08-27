# FM-119: Categories As Edit Modals

Status: planned Owner:
Feature IDs: F-CONFIG-CATEGORIES
Component IDs: C-CONFIG-FIELDS (consumer-side only — the vocabulary itself is unchanged)
API IDs: None
Depends on: None
Blocks: None

## Outcome

Category rows stop expanding in place and are edited through a modal following the established dialog shape
(`auth/UserDialog.tsx` is the closest template), replacing `CategoriesTable.tsx`'s accordion (two `TableRow`s per
entry, `:321-480`, `Collapse` at `:448-455`). This also resolves the owner's "categories subsection is slow" report:
today the 16 base-config categories mount `CategoryEntryFields`' 13 registered controllers each — 208 registered
inputs, 48 `Autocomplete`s and 64 `Select`s, eagerly, whether or not any row is open (ADR-0034's evidence). The
required-name guarantee the always-mounted fields carried is **replaced, not dropped**: the dialog refuses to commit a
blank name via its own `trigger()`, as `DownloaderDialog.tsx:191-200` already does.

## Decision Dependencies

- ADR-0034 — detailed and binding; follow it closely. Every constraint there becomes acceptance below.

## Files Allowed To Modify

- `core/ui-react/src/features/config/categories/`: `CategoriesTable.tsx`, `CategoryDialog.tsx` (new),
  `CategoryEntryFields.tsx` (path-builder prop only — the field list and its order must not change),
  `categoriesSettings.ts` (`CATEGORY_DRAFT_PATH` and its path helper), `CategoriesConfigTab.tsx` (wiring),
  `CategoriesConfigTab.test.tsx`, `categoriesSettings.test.ts`
- `tests/system/tests/config-categories.spec.ts`
- The `F-CONFIG-CATEGORIES` record in `../FEATURES.yaml` (its selectors comment currently documents the expansion
  ids and the FM-107 "kept mounted" rationale — both must be rewritten to the dialog reality)
- This task packet and `../STATUS.md`

## Out Of Scope

- Row-render hygiene noted by the owner — the whole-array `useWatch` (`CategoriesTable.tsx:82-84`), unmemoised
  `CategoryTableRow` (`:295`), index keys (`:265-268`): **deliberately not this packet.** The dialog owns a throwaway
  draft form (ADR-0034), so keystrokes never reach the main form and the array watch fires only on commit — the
  keystroke-re-renders-all-rows path this hygiene would address ceases to exist. Index keys stay: `:265-268` documents
  them as load-bearing (row N shows index N). If profiling after this change still shows a problem, that is new
  evidence for a follow-up, not silent scope growth here.
- The scalar tab fields (`defaultCategory`, `enableCategorySizes`) and `C-CONFIG-FIELDS` internals.
- Backend files; FM-113's server-side blank-name refusal already stands and is unrelated to this client guarantee.

## Context To Read

- ADR-0034 in full, then `CategoriesTable.tsx:64-90` (the doc comment whose reason this change retires) and what
  ADR-0034 sentences to removal: the `fieldsWidth` `ResizeObserver` (`:118-133`, `:456-472`), the
  `config-categories-scroller` sticky box (`:214`), the expanded-index fixup after delete (`:186-196`).
- `auth/UserDialog.tsx`, `DownloaderDialog.tsx:191-200` (the `trigger()` refusal), and the `*_DRAFT_PATH` constants
  in `authSettings.ts:95-101` / `downloadingSettings.ts:23-35`.
- `CategoryEntryFields.tsx:33` and `SizePresetRow` (`:111`) — every path built from `index: number`; the
  path-builder prop replaces exactly that. `categoriesSettings.ts:88-98` — `mayBeSelected`/`preselect` persisted
  with no control (ADR-0003 round-trip hazard).
- `CategoriesConfigTab.test.tsx` (`expandRow` `:129-131`; expansion describes at `:291`, `:420`, `:458`, `:530`; the
  case at `:331` asserting an input is present *because nothing was expanded*) and
  `tests/system/tests/config-categories.spec.ts` (`expandCategory` `:68-87`, used at `:143`, `:218`, `:342`;
  expansion assertions at `:316`, `:349`, `:368-390`; `categoryIndexByName` reads collapsed rows' inputs and must be
  reworked to read summary cells).

## Acceptance

- ADR-0034's constraints, verbatim in substance: the container anchor `config-repeat-categoriesConfig-categories`
  (`settingsIndex.ts:837`) survives; the dialog is a throwaway `useForm` over `structuredClone` bound to
  `CATEGORY_DRAFT_PATH`, with Delete/Cancel/Reset/Submit and the `NO_ADVANCED_DISCLOSURE` wrapper;
  `CategoryEntryFields`/`SizePresetRow` gain a path-builder prop with an unchanged field list and order;
  `mayBeSelected`/`preselect` clone through every commit; the commit is synchronous into form state — no transaction
  holds a config index across an async gap (`CategoriesConfig.setCategories` re-sorts by name on save); the summary
  cells' invalid-newznab-token flagging (`CategoriesTable.tsx:384-425`) stays; the `fieldsWidth` machinery, scroller
  sticky box, and expanded-index fixup are removed, not orphaned.
- Add opens the new entry's dialog immediately (the blank-name successor to `:155-162`'s expand-on-add); the dialog
  refuses to commit a blank name and shows the error on the field.
- `CategoriesConfigTab.test.tsx:331`'s case is **replaced, not deleted** (ADR-0034): the new case proves the dialog
  blocks a blank name. The other expansion cases and both specs' expansion helpers are rewritten to dialog flows
  without weakening what they proved.
- Performance is measured, not asserted: the handoff records the count of registered form inputs (or rendered
  `input`/`select` elements) on the categories tab before and after, with the counting method stated. Before is ~208
  for the 16 base categories; after must be the summary rows only.
- Red-first/mutation evidence: the blank-name-refusal case must be shown failing against a dialog with the
  `trigger()` gate removed, and at least one rewritten expansion case shown failing against the accordion markup —
  a suite green both before and after proves nothing (`../MAINTENANCE.md`'s fixture lesson).
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 and mobile 390x844 of the table, the dialog
  (including its blank-name refusal), and a summary row flagging an invalid newznab token.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run
  build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` pass; `npm run knip`
  reports only its known pre-existing finding; compare counts against a pristine-base run before claiming a delta.
- `settingsIndexDrift.test.tsx` passes untouched (the kept container anchor is what it asserts).
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-categories.spec.ts
  tests/config.spec.ts` passes (`config.spec.ts` unedited — settings search and save must still find categories).
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — the largest and most subtle of the batch: a validation guarantee changes hands, a signature
  change threads through two field components, and roughly a dozen tests must be rewritten without losing what they
  proved.
- Reviewer: `opus` — at least the implementer's tier; must audit the replaced guarantee and the round-trip of
  uncontrolled fields, both invisible to a green suite.
- Fixer: `opus` — findings here are likely to be about the guarantee, not cosmetics.

Implementer prompt: Read ADR-0034 and `CategoriesTable.tsx:64-90` first — you are retiring that comment's reason; the
dialog's `trigger()` gate is its replacement. Traps: `setCategories` re-sorts by name on save, so never hold an index
across an await; `mayBeSelected`/`preselect` have no control, so a commit built from rendered fields silently drops
them. Prove the blank-name refusal red first, and count the mounted inputs before changing anything.
Reviewer prompt: Check hardest the commit path — clone-through of uncontrolled fields, synchronous index use — and
that every rewritten test still proves its old claim's successor. Distrust the perf claim without the counting
method, and any refusal test never shown red.
