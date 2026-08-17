# ADR-0008: Branded Visual Redesign (Dark Teal/Cyan Palette And IBM Plex Typography)

Status: accepted (Option B only — palette/typography unchanged; ADR-0007's palette and typography tokens stand as-is. Option A's teal/IBM-Plex redesign and Option C's full deferral were not chosen.)

## Decision Question

Should the React migration adopt a new branded visual design — a dark teal/cyan-accented palette with IBM Plex Sans/Mono typography — superseding the palette and typography tokens decided in `ADR-0007-branded-mui-theme-foundation.md`,
based on a human-authored mock the repository owner produced with an external design tool?

This ADR governs only the palette/typography token layer (and the density/component-styling choices bundled with it in the source mock). It does not reopen `ADR-0002-frontend-stack.md`'s MUI-only component-system boundary, and it does
not itself decide whether the mock's net-new search-page UI concepts (a "Refine" filter sidebar, a row-selection bulk-actions bar, a "Display options" menu) become new product capabilities — that is a separate scope question for
`FEATURES.yaml`/task-designer follow-up, noted under Consequences.

## Context And Evidence

- `ADR-0007-branded-mui-theme-foundation.md` (accepted) established the current "legacy-grey" MUI theme foundation: `background.default` `#262c2e`, `background.paper` `#2d3436`, `text.primary` `#c8c8c8`, `text.secondary` `#7a8288`,
  `primary` `#0fab4b` (sampled from the legacy snake-logo mark), `success`/`info`/`warning`/`error` mapped from legacy's own `@brand-*` LESS variables. It set no explicit typography tokens (MUI's stock font stack remains in force). It also
  established a separate `dark-dyschromatopsia` accessibility variant that must continue to compose with whatever base palette is in force.
- `core/ui-react/src/app/theme.ts` (read in full) is the sole implementation of these tokens, in `createHydraTheme()`. It is the only file that would need its palette/typography constants changed to adopt a new visual design; the function
  shape (mode resolution, dyschromatopsia override layering) does not need to change for a palette swap alone.
- `core/ui-react/src/app/AppShell.tsx` (read in full) is the single shared layout — `AppBar`, horizontal desktop nav via `List`/`ListItemButton`, mobile `Drawer`, footer — rendered around every route (`/`, `/config/*`, `/stats/*`,
  `/system/*`). It consumes `theme.ts`'s palette through MUI's theme context (e.g. `navigationItemSx` colors the active nav item's border/label via `primary.main`) rather than hardcoding colors itself. Any palette/typography change is
  therefore necessarily global the moment it lands in `theme.ts`, not scoped to one route, even though only the search page currently has a matching mock.
- `docs/frontend-migration/FEATURES.yaml` (read in full) currently has six `visual.status: accepted` records, all on the search route (`/`) and all dated `2026-08-16`, whose acceptance evidence was captured under the current ADR-0007
  theme (several explicitly cite "the FM-031 branded theme" in their `acceptance.decision` text):
  - `F-SEARCH-FORM` — "Reviewed desktop/mobile screenshots of the search workspace under the FM-031 branded theme."
  - `F-SEARCH-MEDIA` — "Reviewed desktop screenshot of TV media refinement (season/episode) under the FM-031 branded theme."
  - `F-SEARCH-GROUP-SELECTION` — group indentation/background treatment accepted; its geometry check depends on the current row background-color contrast, which a new palette would change.
  - `F-SEARCH-DOWNLOADS` — accepted including a recorded, human-accepted mobile-visible variance; its geometry/legibility claims (e.g. "Downloaded" chip legibility) depend on current colors.
  - `F-SEARCH-PAGING` — accepted; load-more/load-all placement geometry, not colors, but still evidenced against the current rendered theme.
  - `F-SEARCH-SAVED` — accepted; save-search toolbar placement, likewise evidenced against the current rendered theme.
  - Five further search-route records (`F-PLATFORM-SHELL`, `F-SEARCH-INDEXERS`, `F-SEARCH-RECENT`, `F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`) are currently `visual.status: proposed`, already pending fresh human review for unrelated
    reasons (FM-035/FM-037/FM-038/FM-034 layout changes); they are not "invalidated" by a palette change since they are not currently accepted, but whichever palette is finally accepted must be reflected in their eventual re-review
    evidence too, so they are listed here for completeness rather than omitted.
  - Every other applicable `visual` record in the file (`F-AUTH-LOGIN`, `F-SEARCH-PROGRESS`, `F-SEARCH-TOUR`, all `F-CONFIG-*`, `F-STATS-*`, `F-HISTORY-*`, all `F-SYSTEM-*`, `F-PLATFORM-LIVE-STATUS`) is `status: unassessed`, so a
    palette change has no accepted claim to invalidate there — but per the rollout note below, these routes would keep the *old* look under Option A until a route-specific redesign task exists, since only the search page has a mock.
- The mock, read directly at `/tmp/hydra mock/Awaiting responses for direction/NZBHydra Search.dc.html`, is a static but fully wired interactive HTML/JS prototype of a redesigned search page (not a flat image). Confirmed by reading the
  file:
  - Page background `#1f2426`; header/nav bar `#262c2e` (i.e. legacy's and ADR-0007's current *page* background color is reused as the *header* color in the new design, not the page background).
  - Primary accent teal/cyan `oklch(0.75 0.1 190)` (brighter hover/active variant `oklch(0.82 0.1 190)` / `oklch(0.85 0.1 190)`), used for the search button, active nav affordances, links, selected-row tint, and interactive highlights —
    filling the role ADR-0007's `primary` (`#0fab4b` green) currently fills.
  - Secondary status accents: amber `oklch(0.76 0.1 70)` (used for the "Torrent" type badge) and green `oklch(0.75 0.11 150)` (used for the "all indexers online" status dot) — these read as `warning`/`success`-shaped roles distinct from
    the new primary teal, i.e. the new design does not collapse all semantic accents into one hue.
  - Typography: `'IBM Plex Sans'` for UI text, `'IBM Plex Mono'` for numeric/tabular values (version string, size/age/grabs/seeders columns, quality chips, badges) — a deliberate sans/mono pairing not present in ADR-0007, which set no
    typography tokens at all.
  - Font loading: the mock's own `<helmet>` block loads both families at runtime from `fonts.googleapis.com`/`fonts.gstatic.com` via `<link rel="preconnect">` + a `css2` stylesheet URL. This is a prototyping convenience, not a
    production-ready choice: NZBHydra is a self-hosted application (per `CONTEXT.md`'s deployment posture, not restated here), and a runtime dependency on a third-party Google font CDN for baseline UI legibility is a new external
    runtime dependency this project does not currently have anywhere else in the shell chrome. This is called out below as a build/licensing consideration, not decided by this ADR.
  - Density/component styling: smaller `border-radius` values (7–11px vs. MUI's default 4px scale), tighter paddings, `12–15.5px` font sizes throughout, denser chip/pill controls (quality, category, indexer, type chips) than the current
    React implementation's MUI defaults.
  - Net-new UI concepts with no current equivalent in `core/ui-react/src/features/search`: a collapsible "Refine" left sidebar (quality chips; free-text title-contains; collapsible Category/Indexer lists with per-item counts; size/age
    numeric ranges; a grabs/seeders-min range; type chips) rendered as a persistent `aside` alongside the results table; a row-selection bulk-actions bar ("↓ Send to downloader" / "⬇ Download .zip") anchored in the results toolbar; and a
    "⚙ Display" options menu (group duplicates / compact rows / highlight recent / show refine sidebar) as a new popover distinct from the existing toolbar controls.
  - The mock covers only the search page (`/`). No equivalent mock exists yet for `/config/*`, `/stats/*`, `/system/*`, login, or any other route.
- `ADR-0002-frontend-stack.md` (accepted) fixes MUI as the only general visual component system; this ADR does not reopen that boundary. A palette/typography/density restyle stays inside MUI's `theme` API (`palette`, `typography`,
  `components.styleOverrides`) and does not require a different component library, even for the mock's denser chip/pill styling.
- `ADR-0006-visual-parity-policy.md` (accepted) requires explicit human acceptance of every feature's visual baseline and of every documented variance; a completed screen without an accepted visual record needs a dedicated remediation
  task rather than being retroactively marked accepted. This is the same mechanism ADR-0007 itself used to invalidate FM-027's held baseline, and it is the mechanism any accepted Option A here would trigger again for the six currently
  accepted search-route records above.

## Options

### Option A: Adopt the mock's dark teal/cyan palette and IBM Plex typography as the new branded foundation, superseding ADR-0007's palette/typography tokens

- Replace `theme.ts`'s `legacyGreyPalette` background/text/primary tokens with the mock's values (background `#1f2426`, header/surface `#262c2e`, primary teal `oklch(0.75 0.1 190)`, semantic accents `oklch(0.76 0.1 70)`
  amber/`oklch(0.75 0.11 150)` green), and add `typography.fontFamily` tokens for `'IBM Plex Sans'` (UI) and a mono override (`'IBM Plex Mono'`) for numeric/tabular MUI usage, self-hosting or npm-vendoring both font families
  (`@fontsource/ibm-plex-sans` / `@fontsource/ibm-plex-mono` or repo-vendored `woff2` files) instead of depending on a runtime `fonts.googleapis.com` fetch, so the self-hosted app has no new external runtime dependency for baseline
  legibility. Exact vendoring mechanism is implementation detail for the task designer/implementer, not this ADR.
- Roll out to the shared shell (`AppShell.tsx` header/nav) and the search page first, since that is the only route with a matching mock; `Config`/`System`/`History`/`Stats`/`Auth` routes keep their current ADR-0007-styled appearance
  until each gets its own redesign task. This is a stated rollout consequence, not a blocker to accepting the palette itself — the same phased pattern ADR-0007 used when it changed the shared shell ahead of full per-feature parity.
  Because the shell is shared, the visual seam (new header/nav colors framing old-palette content on non-search routes) is real and should be disclosed to the human as a trade-off of adopting now vs. waiting for full-app mocks.
- Treat the mock's net-new search-page concepts (Refine sidebar, bulk-actions bar, Display options menu) as candidate new capabilities for `FEATURES.yaml`, scoped and task-designed separately under the existing ADR-0006 visual-parity
  process — this ADR's decision is the color/type/density system, not an authorization to build specific new components.
- Every currently `visual.status: accepted` search-route record (`F-SEARCH-FORM`, `F-SEARCH-MEDIA`, `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-PAGING`, `F-SEARCH-SAVED`) has its evidence invalidated by the palette
  change and must be re-proposed and re-accepted with fresh screenshots under the new theme, per ADR-0006's existing remediation mechanism (the same mechanism ADR-0007 itself triggered against FM-027).
- Benefits: uses a complete, deliberately color-scienced (`oklch`), typographically considered system the repository owner produced specifically for this decision, rather than continuing with ADR-0007's narrower "reuse legacy's own
  values" palette; gives distinct hues to primary/warning/success instead of ADR-0007's green-primary-plus-legacy-brand-color set, closer to conventional semantic-color practice; establishes a durable typographic identity (Sans/Mono
  pairing) the app currently lacks entirely.
- Costs: invalidates six already-human-accepted visual records, requiring re-evidencing work; touches the shared shell file that every route depends on, so a partial rollout necessarily produces a visible old/new seam across routes
  until the rest of the app is redesigned; introduces a new typography dependency (font vendoring) that has to be resolved correctly to avoid a runtime third-party fetch; commits the project to executing a second full theme migration
  so soon after ADR-0007 landed, which is real rework cost even though the result is judged an improvement.

### Option B: Keep ADR-0007's palette/typography; treat the mock only as inspiration for layout, density, and new components

- Do not change `theme.ts`'s colors or add typography tokens. Separately evaluate the mock's structural ideas — denser chip/control sizing, the Refine sidebar, the bulk-actions bar, the Display options menu — as candidate
  `FEATURES.yaml`/task-designer work built on the existing legacy-grey/green palette.
- Benefits: zero rework of the six accepted visual records or of `theme.ts`/`AppShell.tsx`; no new font-vendoring dependency to resolve; avoids a second theme migration immediately after ADR-0007; still captures much of the mock's
  layout/density/new-component value, which is arguably the larger source of the mock's improvement over the current search page (denser rows, a persistent filter sidebar, bulk actions) rather than the specific hue choice.
- Costs: does not honor the repository owner's apparent intent in commissioning a from-scratch external-tool mock with a specific new palette and typography, which reads as more than "inspiration only"; produces a visual mismatch if
  the owner's goal was specifically the new look; new components built with legacy-grey/green colors would need restyling again later if a palette change is wanted eventually, so this option risks its own future rework instead.

### Option C: Reject or defer — make no visual-design change now

- Take no action on the palette/typography question; leave `theme.ts` and the six accepted visual records exactly as ADR-0007 established them. Retain the mock only as an unactioned reference for a possible future initiative.
- Benefits: no rework, no re-evidencing, no font-vendoring decision needed right now; keeps migration effort on remaining functional parity (`F-CONFIG-*`, `F-STATS-*`, `F-SYSTEM-*`, etc., which are still mostly `unassessed`/`inventoried`)
  rather than a second visual pass over already-accepted search-page work.
- Costs: does not resolve the open question the repository owner raised by producing the mock and asking for this ADR; if the owner does want the new look eventually, deferring only delays the same rework Option A performs now, likely
  at a point where more accepted visual records and more built features depend on the old palette, making the eventual migration more expensive, not less.

## Recommendation

Recommend Option A, with the phased shell/search-first rollout and self-hosted fonts explicitly disclosed as consequences rather than blockers. The repository owner produced a complete, internally consistent, interactive prototype
with an external design tool specifically to supersede ADR-0007's palette — this is stronger, more deliberate evidence of intent than "inspiration," and the resulting system (distinct `oklch`-tuned semantic hues, a considered
Sans/Mono typography pairing) is a genuine improvement in expressiveness over ADR-0007's narrower "reuse legacy's exact values" palette. The costs are real but bounded and already precedented: re-evidencing six accepted visual
records is the same mechanism ADR-0007 itself used against FM-027, the shell-first rollout seam is temporary and matches how ADR-0007 itself was rolled out, and the font-vendoring concern has a standard, well-understood fix
(self-hosted/npm-vendored font packages) rather than an open research question. Options B and C both leave the repository owner's apparent request for this specific new look unresolved, deferring cost rather than avoiding it.

## Human Decision

- **Decision-maker:** the repository owner.
- **Date:** 2026-08-17.
- **Selected option:** Option B — keep ADR-0007's palette and typography exactly as they are; treat the mock only as inspiration for layout, density, and new components, not for colors or fonts. The human explicitly chose Option B
  over the recommended Option A, and over Option C.
- **Rationale, as given by the repository owner:** keep the current ADR-0007 legacy-grey/green palette and MUI's current default typography unchanged — no `theme.ts` palette/typography edit, no re-evidencing of the six already-accepted
  visual records, no IBM Plex font vendoring. The mock's structural/layout ideas remain valuable and in scope, but as a separate future initiative: the "Refine" filter sidebar, the row-selection bulk-actions bar ("Send to downloader" /
  "Download .zip"), the "Display options" menu, and the denser chip/row/control sizing are to be built using the current ADR-0007 colors and current MUI default typography, not the mock's `oklch` teal/cyan palette or IBM Plex Sans/Mono
  fonts. This ADR does not authorize or scope that follow-up initiative; it only settles the palette/typography question in ADR-0007's favor.

## Consequences

- Because Option B was chosen, `core/ui-react/src/app/theme.ts` is **not** changed by this decision: no new palette tokens (background, header/surface, primary, semantic warning/success accents) and no `typography.fontFamily`
  tokens are added. ADR-0007's `legacyGreyPalette` constants (and MUI's stock default typography, which ADR-0007 left unset) remain exactly as they are.
- `AppShell.tsx` is **not** touched by this decision; it continues rendering the existing ADR-0007 colors through the MUI theme context, unchanged, across every route.
- The six currently `visual.status: accepted` `FEATURES.yaml` records (`F-SEARCH-FORM`, `F-SEARCH-MEDIA`, `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-PAGING`, `F-SEARCH-SAVED`) keep their accepted status as-is;
  there is no palette change to invalidate their evidence, so no re-proposal or re-evidencing work is triggered by this ADR. The five already-`proposed` search-route records (`F-PLATFORM-SHELL`, `F-SEARCH-INDEXERS`, `F-SEARCH-RECENT`,
  `F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`) are likewise unaffected by any palette question when they are eventually re-evidenced, since the palette is not changing.
- No font-vendoring work (IBM Plex Sans/Mono, `@fontsource/*` packages, or repository-vendored `woff2` files) is required or authorized by this decision. The mock's runtime `fonts.googleapis.com`/`fonts.gstatic.com` dependency is not
  adopted in any form.
- The mock's net-new search-page UI concepts (Refine filter sidebar, row-selection bulk-actions bar, Display options menu) and its denser chip/row/control sizing remain in scope as candidate product capabilities, per the human's
  stated rationale, but strictly as a separate future initiative built on the existing ADR-0007 legacy-grey/green palette and current MUI default typography — not on the mock's colors or fonts. Scoping that initiative into
  `FEATURES.yaml` records and task packets is task-designer follow-up work not performed by this ADR.
- Does not reopen `ADR-0002-frontend-stack.md` (MUI remains the only component system) or `ADR-0006-visual-parity-policy.md` (semantic-parity policy and human-acceptance process, unchanged). `ADR-0007-branded-mui-theme-foundation.md`
  also remains fully in force and unchanged; see Supersession below.
- The existing `dark-dyschromatopsia` accessibility variant in `theme.ts` is unaffected, since no base-palette change is made.
- No implementation, task packet, or theme/shell/registry file change is made by this ADR (proposal or decision). Should the separate structural/layout initiative described above be scoped later, the task designer would refine or
  create the affected task packet(s) at that time, built against ADR-0007's current palette/typography — that is future work this ADR does not perform or pre-authorize in detail.

## Affected Work

- Shell/theme files (would require implementation if Option A is accepted): `core/ui-react/src/app/theme.ts`, `core/ui-react/src/app/AppShell.tsx`.
- Search-page implementation files that would need matching restyle work: `core/ui-react/src/features/search/**` (not enumerated file-by-file here; scoping is task-designer work).
- `FEATURES.yaml` records losing accepted visual status under Option A: `F-SEARCH-FORM`, `F-SEARCH-MEDIA`, `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-PAGING`, `F-SEARCH-SAVED`.
- `FEATURES.yaml` records already pending fresh review whose eventual re-review must reflect whichever palette is accepted: `F-PLATFORM-SHELL`, `F-SEARCH-INDEXERS`, `F-SEARCH-RECENT`, `F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`.
- Routes with no matching mock, deferred under Option A's phased rollout until separately redesigned: all `F-CONFIG-*`, `F-STATS-*`, `F-HISTORY-*`, `F-SYSTEM-*` records, plus `F-AUTH-LOGIN`, `F-SEARCH-PROGRESS`, `F-SEARCH-TOUR`,
  `F-PLATFORM-LIVE-STATUS`.
- Policy context: `docs/frontend-migration/decisions/ADR-0002-frontend-stack.md` (MUI-only boundary, unchanged) and `docs/frontend-migration/decisions/ADR-0006-visual-parity-policy.md` (semantic visual parity and human-acceptance
  process, unchanged; this ADR's token changes flow through ADR-0006's existing remediation mechanism when implementing tasks land).
- Source evidence (not a repository file): `/tmp/hydra mock/Awaiting responses for direction/NZBHydra Search.dc.html`, the human-authored interactive prototype this ADR evaluates.

## Supersession

- Supersedes: **None.** Option B was chosen, not Option A, so `ADR-0007-branded-mui-theme-foundation.md` is **not** superseded — its palette and typography tokens, its nav-layout-bug fix, and its general "a branded theme is
  required" decision all remain fully in force and unchanged by this ADR.
- Superseded by: `None` until a later ADR replaces this decision.
