# Decisions

Append-only log of the migration's binding decisions. Each entry is the complete current authority for its subject; the full
original ADR analyses (options weighed, evidence, verbatim owner feedback) were deliberately compacted on 2026-08-19 and live in
git history (`git log -- docs/frontend-migration/decisions`). IDs are permanent; a superseded entry stays and names its
replacement.

New entries: only for hard-to-reverse choices — framework/stack, API or URL contracts, persisted data, cross-cutting UX policy.
Keep an entry under ~20 lines: date, question, decision, binding constraints. Option analysis happens in conversation with the
repository owner, not in this file. Styling questions inside ADR-0014's rules never need an entry.

## ADR-0001 — React placement and UI switch (accepted)

React source lives permanently in `core/ui-react`; Vite production output uses the isolated `static/react/` namespace and never
overwrites legacy assets. A Thymeleaf React shell receives the same server bootstrap contract as the legacy shell. A temporary
cookie-based selector (`ui/react`, `ui/legacy` endpoints) picks the shell for canonical URLs; Spring route mappings keep their
role protection. React uses final URL shapes from the start and shows a migration placeholder for unimplemented routes. React
becomes the default only after migration acceptance; selector and AngularJS are then removed in separate cleanup work.

## ADR-0002 — Frontend stack and boundaries (accepted)

React, TypeScript, Vite, MUI, TanStack Router/Query/Table, React Hook Form, Zod, Vitest, React Testing Library, SockJS,
`@stomp/stompjs`. MUI is the only general visual component system — no Bootstrap, Tailwind, second component suite, second
router, or second server-state library without superseding this entry. Hydra-specific table behavior (grouping, duplicates,
filtering, selection) stays explicit domain code. Config editing uses React Hook Form with a small typed field vocabulary, not a
generic schema framework. Shared Hydra behavior is registered in `COMPONENTS.yaml`; ordinary MUI usage is not wrapped.

## ADR-0003 — API contract and generation (accepted)

Generate TypeScript types from `core/openapi.json`; do not generate the transport or hooks. A small handwritten fetch transport
(`C-API-TRANSPORT`) derives its base from bootstrap data, sends credentials, and implements the CSRF cookie/header contract
(`HYDRA-XSRF-TOKEN` → `X-XSRF-TOKEN`). Login, logout, file transfers, upload progress, and STOMP are handled explicitly.
Generated files are reproducible and never hand-edited. `APIS.yaml` tracks contract quality and adoption per API ID.

## ADR-0004 — Testing and parity (accepted)

`FEATURES.yaml` is the behavioral parity inventory. Stable legacy `data-testid` values are preserved where behavior is
equivalent. Pure domain transformations get exhaustive unit tests; interactions and accessibility get component tests; routes,
packaging, API workflows, and parity get Playwright/Java system tests. jsdom cannot observe focus/layout/painting — claims about
those need a real browser. No test may be removed, skipped, weakened, or ignored to complete work. Rendering a page is not
parity; linked behavior must be covered.

## ADR-0005 — Recent-history criteria contract (accepted)

Recent searches persist and expose `minAge`, `maxAge`, `minSize`, `maxSize`, and explicitly selected indexers through
`API-HISTORY-RECENT-SEARCHES`. Pre-existing records without these values stay usable: refill/repeat falls back to default
indexers and empty age/size filters. Age/size/indexer values are not shown inline in the recent-search dropdown (tooltips only
where existing conventions allow).

## ADR-0006 — Visual parity policy (accepted; acceptance mechanism amended by ADR-0014)

Visual parity is semantic — information hierarchy, grouping, state visibility, responsive behavior, affordances — never
Bootstrap pixel identity. Behavioral, accessibility, and visual gates are independent. Only a human accepts a visual result.
*Amended by ADR-0014:* acceptance now happens by the owner reviewing each change's screenshot strip, not through per-record
visual contract/variance lifecycle records in `FEATURES.yaml` (that machinery is removed).

## ADR-0007 — Branded MUI theme foundation (superseded by ADR-0009)

Historical: adopted legacy's grey palette with logo-green primary. Palette and typography replaced by ADR-0009. The
`dark-dyschromatopsia` accessibility palette variant it introduced remains a requirement and must compose with the current
palette.

## ADR-0008 — Branded visual redesign, Option B (superseded by ADR-0009)

Historical: "mock structure only, keep old palette" — reversed by the owner after seeing the result.

## ADR-0009 — Mock-driven visual redesign (accepted; fidelity level amended by ADR-0014)

The owner's mock `uimock/NZBHydra Search.dc.html` (git-ignored, in the working tree) is the design source for the app: its
`oklch` teal palette, vendored IBM Plex Sans/Mono (never a runtime Google Fonts dependency), its density, and its structural
patterns — sticky results header, the Refine sidebar as the sole filter surface (no inline column filters), toggle-row
multiselects for category/indexer in the sidebar. Rollout is shell-first; routes without a mock keep their current look until
redesigned. *Amended by ADR-0014:* fidelity is token- and structure-level, not pixel-level — control anatomy is stock MUI.

## ADR-0010 — React production CSS delivery (accepted)

The CSS bundle filename is pinned in `core/ui-react/vite.config.ts`; `core/src/main/resources/templates/react.html` links it;
`validate:production-assets` checks the real served template, not Vite's unused `index.html`.

## ADR-0011 — Results table scroll model and sticky header (accepted)

The results table never scrolls horizontally, like legacy: no `overflowX` wrapper, no table min-width floor, the Title column
absorbs the squeeze and wraps (`overflow-wrap: anywhere`; variable row heights accepted). With no scrolling ancestor between the
header cells and the document, the column header is viewport-sticky via native `position: sticky`. Below the ~768px breakpoint
rows stack as cards.

## ADR-0012 — Recent-search Refill keyboard reachability (accepted)

`ArrowRight` on a recent-search row moves focus to its nested Refill `IconButton`; `ArrowLeft`/`Escape` return to the row;
`Enter`/`Space` activate natively; `aria-keyshortcuts="ArrowRight"` plus one visible menu hint provide discoverability. The
binding depends on MUI menu internals and must be re-verified in a real browser after any `@mui/material` upgrade
(`tests/system/tests/search.spec.ts`).

## ADR-0013 — Keyboard focus indication (accepted; scope amended by ADR-0015)

The app authors one explicit focus-ring token in `theme.ts` (`3px solid primary.main`, offset `3px`, inset `-3px` where an
ancestor measurably clips an outset ring), keyed to each control family's own `&.Mui-focusVisible`/`:focus-visible` selector.
`SwitchBase`-derived controls (Checkbox/Radio/Switch) must be authored on the root class — their focusable node is a transparent
input overlay where `:focus-visible` paints invisibly. Gated by `tests/system/tests/focus-indication.spec.ts` (real browser,
keyboard-only) and the `validate:focus-affordances` source guard; both are version-scoped to the installed MUI and must be
re-proven after an upgrade. *Amended by ADR-0015:* the ring no longer applies to the text-input/select family.

## ADR-0014 — Token fidelity, standard MUI (accepted 2026-08-19)

Supersedes ADR-0009's pixel-fidelity reading after the owner reviewed the result: literal translation of the mock's inline CSS
produced hand-built controls (bare `InputBase` composites, clipped labels, deleted borders) that destroyed MUI's built-in
affordances and required expensive repair work (FM-052/ADR-0013/FM-053).

- The mock defines **tokens** (palette, typography, density, radii, surface colors) and **page structure**. Tokens live in
  `theme.ts` only — as palette entries and component `styleOverrides`/`defaultProps` — so every standard component gets the
  mock's look automatically.
- **Control anatomy is stock MUI**: standard components, visible labels, default borders, default focus/hover/error states.
  Feature code contains no color/font/radius literals and never restyles component internals (`notchedOutline`, label clipping,
  outline suppression).
- Deviating from stock MUI requires a written justification at the site; deviating from the mock's pixels requires none.
- Visual acceptance is a human reviewing the change's screenshot strip (see README, *Visual Gate*), replacing the
  `FEATURES.yaml` visual contract/variance lifecycle.
- Conventions are operationalized in `/core/ui-react/AGENTS.md`, *UI Conventions*.

## ADR-0015 — Focus indication simplification (accepted 2026-08-19; amends ADR-0013)

With ADR-0014 restoring stock inputs, the text-input/select family indicates focus through MUI's own focused outlined border
(2px `primary.main` — measured by FM-052 at 3.15–5.56:1, passing contrast everywhere). The theme's `MuiInputBase`
`&:has(:focus-visible)` ring is removed — it double-bordered every focused select. The authored ring remains for the families
where MUI renders nothing by itself: `ButtonBase` (Button/IconButton/Tab), `SwitchBase` (Checkbox/Radio/Switch),
`MenuItem`/`ListItemButton` (inset), `Chip`, `Link`, and the global `:focus-visible` rule for unclassed elements. Feature code
must not suppress the resting or focused input border; the focus gate and source guard are updated to assert this split.

## ADR-0016 — History refine bar multi-select semantics (accepted 2026-08-19)

The legacy history filters preselect every value of a `checkboxes-filter` and offer an invert control
(`download-history.html` indexer/status, `search-history.html` category, `notification-history.html` event type). The owner
decided the React refine bar does not carry that model forward.

- A multi-select dimension starts with **nothing selected**, and an empty selection means **no filter** — all entries show.
  Selecting one or more values narrows to exactly those. There is no preselect-all state and no invert control; deselecting
  everything returns to showing all.
- This is the semantics of the shared bar's multi-select kind (`C-HISTORY-REFINE-BAR`), not a per-route choice: download
  history's indexer and result, search history's category, and notification history's event types all follow it, as does any
  history dimension added later.
- Consequence for parity: an entry's absence from a selection is never a filter. A route must not send a filter value list
  that merely enumerates every known option — an unselected dimension sends no `filterModel` entry at all.
- Download history's indexer dimension therefore becomes multi-select over the known indexer list, replacing the freetext
  contains-match the React route ships today (`api/history/downloads.ts` sends `filterType: "freetext"` on column `name`).
