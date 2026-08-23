# Search form redesign: primary bar + status chips

Owner-approved direction (2026-08-23, "Option B"), chosen over a modernized
legacy stack and an everything-visible sectioned card. This document is the
design source for the implementing task packet; it changes no contracts of
`SearchWorkspace`'s form state, URL canonicalization, or submit pipeline.

## Problem

The current `SearchWorkspace.tsx` top bar holds too many peers — category,
query, submit, season/episode, and the Advanced toggle all compete on one
wrapping row, so a TV category reflows the bar. State that affects the search
(age/size presets, indexer selection, the additional filter) is invisible
while Advanced is collapsed or lives disconnected in the lower zone. The
legacy form's strength was a one-job-per-row reading order; its weakness was
permanent vertical bulk. The owner wants to keep the Advanced
expand/collapse.

## Design

Two-row bar surface (`surfaces.bar`), a collapsible Advanced panel, and a
footer. Nothing that affects the search is invisible: every non-empty
constraint renders as a live chip in the bar even while Advanced is
collapsed.

```
┌────────────────────────────────────────────────────────────┐  surfaces.bar
│ [Category ▾]  [🔍 query…                ]  [Search]  [⌄]   │  row 1: input
│ (● Breaking Bad (2008) ×)(S 01)(E 02)(Age ≤ 100 d)         │  row 2: chips
│ (Size 500–8000 MB)(Filter: 1080p ×)(Indexers 12/15)        │  (only if any)
├─ Advanced (Collapse, closed by default) ───────────────────┤
│  MEDIA                AGE & SIZE           INDEXERS        │  overline
│  Season   [01]        Min age  [    ] d    ☑ NZBGeek       │  captions:
│  Episode  [02]        Max age  [100 ] d    ☑ DrunkenSlug   │  refine-
│  Additional filter    Min size [500 ] MB   ☑ abNZB …       │  SectionLabel
│  [1080p            ]  Max size [8000] MB   [Invert ▾]      │
├────────────────────────────────────────────────────────────┤  body
│ [🕒 Search history ▾]                     (alerts as today)│
└────────────────────────────────────────────────────────────┘
```

### Row 1 — input row

Exactly four peers, so it never wobbles: the category `Select`, the query
`TextField` (flex, carries the existing autocomplete popup unchanged), the
contained Search button, and the Advanced toggle. The toggle becomes an
icon-only `IconButton` (expand-more/expand-less) with `aria-label
"Advanced"` and `aria-expanded`/`aria-controls`, since the chips row now
communicates what Advanced holds; it renders in `primary` color while the
panel is open, as today. Season/episode leave this row (see Media section).

### Row 2 — status chips

A wrapping row of MUI `Chip`s inside the bar surface, rendered only when at
least one chip exists. Chips use the theme's existing pill language
(`MuiChip` override: 26 px, `pillRadius`; label in `monoFontFamily` 12 px)
— visually the refine-surface `refineChip` family, delivered by the stock
`Chip` component. Each chip is clickable: click opens Advanced and moves
focus to the section's first field (plain `Collapse` + ref focus — no
scrolling, no anchoring). Chips whose meaning is "clear this constraint"
also carry `onDelete`:

| Chip | Renders when | Label | Click focuses | Delete |
| --- | --- | --- | --- | --- |
| Matched title | an identifier is set (`hasIdentifier`) | `● <title> (<year>)` | Additional filter | clears identifiers (`clearSelection`) |
| Season / Episode | value non-empty (TV category) | `S 01` / `E 02` | that field | clears the field |
| Age | minage or maxage non-empty | `Age 10–100 d` / `Age ≥ 10 d` / `Age ≤ 100 d` | Min age | clears both |
| Size | minsize or maxsize non-empty | `Size 500–8000 MB` (same one-sided forms) | Min size | clears both |
| Additional filter | additionalQuery non-empty | `Filter: 1080p` | Additional filter | clears the field |
| Indexers | `showIndexerSelection` and selection ≠ all eligible | `Indexers 12/15` | Indexers section | none (opens panel) |

The Indexers chip renders in `warning` color when the selection is empty
(the "no indexers selected" state also keeps its existing Alert). Category
size presets therefore become visible the moment a category is chosen —
today they're applied silently.

### Advanced panel

One `Collapse` containing a `flex-wrap` grid of up to three sections, each
titled with the existing `refineSectionLabel` typography variant. Sections
wrap to a single column on narrow viewports (min-width per section, no
media-query special cases).

- **Media** (only for MOVIE/TV categories; Season/Episode only for TV):
  Season, Episode, and the Additional-filter field, which moves here from
  the lower zone — it now sits visibly adjacent to the search it refines.
  Its enable rule is unchanged (enabled once an identifier is selected).
  The Additional-filter field is exactly as wide as the Season + Episode
  pair above it (same flex column width), so the section reads as one
  aligned block.
- **Age & Size**: the four labeled min/max fields, as today's
  `AdvancedRangeGroup`/`AdvancedRangeInput`, but with room for full floating
  labels (`Min age` … with unit adornments), retiring the aria-label-only
  compact-field exception.
- **Indexers** (when `showIndexerSelection`): the existing checkbox grid or
  multi-select plus the `IndexerSelectionButton` split button, moved up from
  the lower zone. Unchanged internally. Sized for real installations of
  20–25 indexers: this section takes the panel's full remaining width
  (`flex: 1 1 100%` on wide viewports it wraps under Media and Age & Size)
  and lays the checkboxes out column-major via CSS multi-column
  (`column-width: 160px; column-gap: 16px`, `break-inside: avoid` per
  label), so 25 indexers form 4–6 tidy columns that read top-to-bottom
  within each column, preserving the catalog's indexer order. No
  max-height/scrolling — the form may grow vertically.

Auto-open rule: choosing a TV autocomplete suggestion opens Advanced and
focuses Season (replacing today's focus jump to the additional-query field);
a MOVIE suggestion keeps today's behavior, focusing the Additional filter
(which now lives in the panel, so it opens the panel too). This keeps the
legacy convenience of S/E being immediately at hand after picking a show.

### Body / footer

The lower `Stack` keeps the alerts (no-indexers, autocomplete status)
exactly as today and the search-history tool as its only remaining control.
The `workspace-media-refinement` and `workspace-indexers` blocks disappear
from the body (their contents move into the panel).

## What does not change

- Form schema, `valuesFromSearch`, `canonicalSearch`,
  `nonIdentifierQueryText`, submit flow, and the FM-051 single-source rule.
- Autocomplete popup markup, positioning, and keyboard handling.
- Indexer selection semantics, split-button actions, preselection logic.
- Test IDs `search-workspace`, `search-query`, `search-submit`,
  `search-category-*`, `autocomplete-*`, `additional-query`,
  `search-advanced-toggle`, `search-advanced-panel` stay; new
  `search-chip-*` IDs are added per chip kind.

## ADR-0014/0015 compliance

Every element is a stock MUI component consuming theme tokens: `Chip` (the
themed 26 px pill), `Collapse`, `IconButton`, existing `TextField` defaults,
`refineSectionLabel`. No new color/font/radius literals in feature code; if
the chip row needs a variant beyond the global `MuiChip` override (e.g. the
clickable-constraint look), it is authored as a theme variant next to
`refineChip`, not as `sx` literals. Focus behavior rides the existing
ADR-0013 families (Chip is family G, already ringed).

## Out of scope / open questions

- Whether the chips row should also render on the search-results view's
  compacted form (not part of this change; the workspace is shared, so it
  will, which is considered a feature).

## Persistence

`advancedOpen` is persisted (owner decision 2026-08-23): the toggle writes
to `localStorage` (key `nzbhydra.search.advancedOpen`) and the initial
state reads it back, wrapped so a missing/blocked store falls back to
closed. The auto-open on suggestion selection still applies on top of the
restored state but does not itself persist.
