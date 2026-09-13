# History refine surface redesign (owner-approved 2026-08-29, ADR-0046)

The owner wants one way to filter a table in this UI. Today there are two: the search results page
filters through a docked, collapsible left "Refine" column (`RefineSidebar.tsx`), and the three
history views filter through a horizontal collapsible bar above the table (`HistoryRefineBar.tsx`).
Both speak the same token language through `theme.ts`, but they are different interaction concepts,
and a user who learned one has to relearn the other.

This design makes the history views use the search results' refine concept. Not a byte-for-byte
copy -- the two surfaces filter different things in different places (client-side loaded results vs.
server-side `HistoryRequest` queries) and that difference stays. What becomes identical is the
user-facing concept: where the surface sits, how it collapses, how it behaves on a narrow viewport,
and what its header offers.

## The concept, stated once

A refine surface is a docked left column beside the table it filters:

- At 768px and up (`theme.breakpoints.down(768)`, the same raw value `RefineSidebar.tsx` documents
  from ADR-0011/FM-042): a persistent left column, 248px expanded, collapsible to a 48px rail via a
  chevron toggle. Expanded padding `{pb: 5, pt: 2.25, px: 2}`, collapsed `{pb: 2.25, pt: 2.25,
  px: 1}`, width/padding transition 150ms ease-in-out. It is sticky beneath whatever sticky chrome
  sits above it and scrolls within itself when taller than the remaining viewport.
- Below 768px: a temporary left `Drawer` (width `min(280px, 88vw)`) opened by a small "Refine"
  button with a caret, `variant="control"`. The drawer always starts closed and its open state is
  never persisted (the same rationale `RefineSidebar.tsx` records: a persisted expanded preference
  from desktop must not pop an overlay over the content on a phone).
- Header row: the consumer's optional active-filter summary in the left slot, single-line, and an
  icon-only clear-all beside the collapse/close control at the end. No caption — FM-142 (owner
  request 2026-08-30) removed the `refineSurfaceLabel` "Refine" label and the "Clear all" text
  button together, because at 248px minus the `px: 2` padding the four elements did not fit 216px
  (FM-137 measured "No active filters" wrapping over two lines, and "Clear all" wrapping inside its
  own button in the drawer). "Refine" survives only as the sub-768px trigger's own text. Sections
  use `refineSectionLabel` captions, `refineSectionGap` rhythm, and the `refineChip` button variant
  for on/off options.
- Exactly one branch (docked or drawer) exists in the DOM at a time, decided by `useMediaQuery` in
  JavaScript, so no duplicate accessible names or test ids ever render.

## Shared shell, domain-owned sections

The chrome above -- docked/rail/drawer switching, header, widths, stickiness -- is extracted into
one shared shell component under `core/ui-react/src/components/refine/` (new registry record, the
designer names it; `C-REFINE-SURFACE` suggested, `classification: shared_hydra`). The shell takes
its sections, its clear-all wiring, an optional sticky-offset, and an optional header summary as
props. It owns no filter state.

Both existing surfaces become consumers:

- `RefineSidebar.tsx` keeps its `ResultFilters` state, quick filters, collapsible category/indexer
  lists, and measured `toolbarHeight` coupling, and hands the chrome to the shell. The results page
  is a parity refactor: no visible change, no test-id change.
- The history views keep the `HistoryDimension`/`HistoryFilterValues` model from
  `api/history/filters.ts` and the five section kinds in `HistoryRefineBar.tsx`, and render them as
  the shell's sections instead of a bar. The `history-refine-*` test ids and the ADR-0016
  checkbox semantics (empty selection filters nothing, no select-all/invert) are unchanged.

This supersedes the "deliberately shares no code with the search results' `RefineSidebar`" stance
written into `HistoryRefineBar.tsx` and `C-HISTORY-REFINE-BAR`'s registry entry -- but only for the
chrome. The reasons that stance gave for not sharing *state and options logic* (server-side
filtering, options declared not derived) all still hold and still apply.

## Where the surfaces stay deliberately different

- History keeps its active-filter summary ("2 active filters"). It renders in the shell's header
  summary slot and on the compact "Refine" toggle, because a collapsed rail or closed drawer hides
  the sections and the user still needs to see that filters are active. The results sidebar does
  not grow a count; its "Clear all" disabled state already signals "no active filters" there.
- History's checkbox dimensions render as wrapping `refineChip` groups in a 248px column; the
  results page's category/indexer sections keep their collapsible `ToggleRowFilter` lists. Same
  concept, different option widgets, both already theme-governed.
- History pages have no sticky results toolbar; their sticky offset is whatever the actual sticky
  ancestor above the `/stats` tab body is (verify at implementation; likely 0).

## Persistence

The docked column's collapsed state persists under one storage key shared by all three history
views, `hydra.history.refine` -- the three views are one concept, and collapsing the column on the
download history should keep it collapsed on the search history. The results page keeps its
existing `hydra.search-results.table` blob untouched. This closes the storage-key candidate
`HistoryRefineBar.tsx` and `MAINTENANCE.md` left open.

## Page layout

Each history page becomes a flex row: the refine surface as left sibling, then the existing
vertical stack (heading row, status/alerts, table). Non-filter page controls stay in the heading
row where they are today ("Show user agents", "Refresh"). The surface must never become an
ancestor of the table's header cells (ADR-0011's constraint), and the table keeps its
`TableScrollAffordance` scroller and min-width floors -- the column costs the table 248px at
desktop widths, which those floors and the scroller absorb.

## Scope and non-goals

In scope: `SearchHistoryPage.tsx`, `DownloadHistoryPage.tsx`, `NotificationHistoryPage.tsx`, the
shell extraction, and the parity refactor of `RefineSidebar.tsx`/`SearchResults.tsx` that consuming
the shell requires. Registry updates for the new shell and the changed `C-HISTORY-REFINE-BAR`.

Not in scope: `SavedSearchesPage.tsx` (it has no filter surface today and gets none here), the
stats pages, any behavioral change to results filtering, and any change to `C-HISTORY-REQUEST` or
the backend.

Both tasks are UI-affecting and carry the README's Visual Gate screenshot strip; the results-page
strip must show the refine sidebar unchanged.
