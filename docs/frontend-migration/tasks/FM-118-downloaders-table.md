# FM-118: Downloaders As A Table

Status: planned Owner:
Feature IDs: F-CONFIG-DOWNLOADING
Component IDs: None (bespoke table per ADR-0033 — no shared component, no new registry ID)
API IDs: None
Depends on: None
Blocks: None

## Outcome

The Downloading tab's downloader list becomes a table mirroring the indexer table's shape: a Name cell that is a button
opening the existing `DownloaderDialog`, plus Type and URL columns, replacing `DownloadersSection.tsx`'s current list
(288 lines; `DownloaderEntryRow` at `:217-288` renders an `h3` legend, a Type/URL `dl`, an Enabled switch, and an
"Edit <name>" button). The template is `IndexerTable.tsx`: module-level `COLUMNS` constant (`:52-61`), name button
(`:412-433`), responsive single-cell collapse via `useMediaQuery(theme.breakpoints.down("sm"))` (`:114`, `:481-503`).
A bespoke `DownloaderTable.tsx` is written; no shared table is extracted (ADR-0033).

## Decision Dependencies

- ADR-0033 — bespoke `DownloaderTable`; every binding constraint there becomes acceptance below.

## Files Allowed To Modify

- `core/ui-react/src/features/config/downloading/DownloaderTable.tsx` (new),
  `DownloadersSection.tsx` (shrinks to composition or is absorbed — implementer's call, stated in the handoff),
  `DownloadingConfigTab.tsx` (wiring only), `downloadingSettings.ts` (the type-label map, and sort/filter helpers only
  if added), `DownloadingConfigTab.test.tsx`, and `downloadingSettings.test.ts` (new — **required** if any sort/filter
  helper is added; none exists today)
- `tests/system/tests/config-downloading.spec.ts`
- The `F-CONFIG-DOWNLOADING` record in `../FEATURES.yaml` (selectors comment prose only; the listed selectors stand)
- This task packet and `../STATUS.md`

## Out Of Scope

- `DownloaderDialog.tsx` — the dialog and its transaction are untouched; only what opens it changes.
- `settingsIndexDrift.test.tsx` and `settingsIndex.ts` — must keep passing untouched; the anchor
  `config-repeat-downloading-downloaders` (`settingsIndex.ts:905`) survives on the table's container.
- Sorting by name, drag reorder, bulk actions, and any filter UI — ADR-0033: order stays the configured array order;
  do not add affordances that do not exist today. (If no helper is added, no `downloadingSettings.test.ts` is owed.)
- `IndexerTable.tsx` — a template to read, never a file to touch.

## Context To Read

- ADR-0033 in full — its binding constraints are the compatibility contract.
- `DownloadersSection.tsx:54-63` (why configured order, kept) and `:264-273` (why the Enabled switch stays on the row
  and out of the modal — that comment must survive wherever the switch lands).
- `IndexerTable.tsx` at the line ranges above, and `AuthUsersSection.tsx` for the second table precedent.
- `downloadingSettings.ts:178-191` (`visibleDownloaderFields`: Torbox entries have no `url` and no user-set `name`)
  and `indexerSettings.ts:287-315` (`INDEXER_TYPE_LABELS`, the label-map shape to mirror).
- `DownloadingConfigTab.test.tsx:155-158` (`openEntry` helper) and the cases at `:590` ("keeps the list order and
  edits the row it was opened from") and `:617` ("toggles a downloader from the list without opening the dialog").
- `tests/system/tests/config-downloading.spec.ts` (`LIST` at `:8`; entry/edit/value assertions at `:113`, `:162-190`,
  `:242-258`, `:284-353`).

## Acceptance

- ADR-0033's testids survive unchanged: `config-repeat-downloading-downloaders` on the table container,
  `config-repeat-entry-downloading-downloaders-${index}` on each row,
  `config-repeat-edit-downloading-downloaders-${index}` on the name button (the edit control *is* the name cell now),
  `config-repeat-add-downloading-downloaders` and its `config-repeat-add-option-…` items, and
  `config-downloader-value-${index}-${field}` on the Type/URL summary cells.
- The per-row Enabled switch stays on the row, out of the modal; rows bind to the config index (row N edits index N),
  never display position; order is the configured array order.
- `downloaderType` renders through a label map (`NZBGET` → "NZBGet" etc.) mirroring `INDEXER_TYPE_LABELS`; a Torbox
  row's URL cell renders an explicit empty state, never the string "undefined".
- Responsive: below `sm` the row collapses to a single stacked cell, as `IndexerTable.tsx:481-503` does.
- `DownloadingConfigTab.test.tsx`'s `openEntry`, order, and toggle cases are updated to the table markup without
  weakening what they assert; `config-downloading.spec.ts` passes with its testid assertions intact (edits limited to
  markup-shape expectations, e.g. text-content scoping).
- Red-first/mutation evidence for the central claim: at least one updated unit case must be shown failing against the
  old list markup (or the new table with a deliberately broken index binding) — a suite that passes both before and
  after proves nothing (`../MAINTENANCE.md`'s fixture lesson).
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 and mobile 390x844 of the table with at least
  one Torbox row (the empty-URL state) and the add menu open.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run
  build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` pass; `npm run knip`
  reports only its known pre-existing finding; compare counts against a pristine-base run before claiming a delta.
- `settingsIndexDrift.test.tsx` passes **byte-identical** — `git diff --stat` shows no line for it.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-downloading.spec.ts
  tests/downloads.spec.ts` passes (`downloads.spec.ts` unedited, in the filter to prove sending still works).
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — mechanical adoption of a table shape the repository demonstrates three times, in one module,
  with the testid contract fully enumerated by ADR-0033.
- Reviewer: `opus` — the testids are a compatibility contract asserted by an unedited drift test and a heavily edited
  E2E spec; a cheaper reviewer would take the green suite's word for it.
- Fixer: `sonnet` — expected findings are markup, labels, and test scoping.

Implementer prompt: Read ADR-0033's binding constraints before `IndexerTable.tsx` — the testids you must keep are the
repeat-section family, not the indexer table's `config-indexer-*` family, so copy the shape and not the ids. Trap:
Torbox rows have no `url`/`name` (`visibleDownloaderFields`). Prove the row-N-edits-index-N case red first.
Reviewer prompt: Check hardest that every ADR-0033 testid appears in the rendered DOM, not merely in the spec file, and
that `settingsIndexDrift.test.tsx` is untouched. Distrust E2E edits: diff the spec's assertions against
`git show d18e7d02d` and refuse any weakened one.
