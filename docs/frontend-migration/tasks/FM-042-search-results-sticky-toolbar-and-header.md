# FM-042: Sticky Results Toolbar And Column Header While Scrolling

Status: done Owner: migration-implementer Feature IDs: F-SEARCH-RESULTS, F-SEARCH-SORT-FILTER, F-SEARCH-PAGING Component IDs: C-RESULT-TABLE API IDs: None Depends on: FM-041 Blocks: None

**Refined under ADR-0009 (2026-08-17):** this packet was originally scoped against ADR-0008's Option B (structure only, ADR-0007 palette/typography unchanged) and never implemented. ADR-0009 supersedes ADR-0008 and now makes the
sticky header central rather than incidental — it is one of the four structural gaps the repository owner named directly. This packet's Outcome and Boundary Rationale still hold unchanged, so it is refined in place: its Decision
Dependencies cite ADR-0009, and its Acceptance gains the mock's exact sticky offset (`top: 51px` for the header, directly beneath the `top: 0` toolbar) now that FM-041 lands the final toolbar/row heights this offset is measured
against. Everything else — the `position: sticky` mechanism, the scroll-model boundary, the offset-derived-not-hardcoded requirement — is unchanged from the original packet's reasoning.

**Refined under ADR-0011 (2026-08-18), and unblocked.** Implementation began and stalled: the toolbar half is done and verified pinned in a real browser, but the column header could not engage `position: sticky` because the
`overflowX: "auto"` wrapper around `<Table>` is a scrolling ancestor in both axes and never scrolls vertically. ADR-0011 is now `accepted` and selects **Option E** — the results table never scrolls horizontally, as the legacy
AngularJS view does not — with sub-decision **E-title (i) wrap** and a scoped `desktop-wide 1900x1000` evidence viewport. That decision *preserves* this packet's document scroll model rather than changing it, so the Outcome, the
Boundary Rationale, the `position: sticky` mechanism, the derived-offset requirement, and the `AppShell.tsx`/`router.tsx` Out Of Scope boundary all stand exactly as written and the sticky-toolbar criteria below are already satisfied
by the work in the tree. What the refinement adds is the newly authorized work Option E requires: deleting the wrapper and the width floor, re-proportioning the `<colgroup>`, giving the title cell a break rule, moving the stacked-card
breakpoint, and drawing the sticky header's bottom edge as a `box-shadow`. **Resume on top of the existing partial implementation; do not revert it.** In particular `SearchResults.tsx`'s `toolbarHeight` measurement machinery
(`useLayoutEffect` + `document.fonts.ready` + `MutationObserver` + `ResizeObserver`, `:493-554`) is exactly what the accepted option needs and must not be rewritten (ADR-0011, `Consequences`).

## Dependency Notes

Final packet of the batch, and last by design: it pins whatever the three preceding results-page packets (FM-045, FM-046, FM-041) put in the toolbar and the table header, so its offsets, stacking order, and scrolled evidence would
have to be redone if it landed first. It depends on FM-041 directly (compact mode changes the row and toolbar heights the sticky offset is derived from) and transitively on FM-043 (palette/density tokens), FM-045 (the single-filter-
surface consolidation, which also shortens the header row by removing the inline filter popovers), and FM-046 (the toolbar's final restyled shape).

## Outcome

While scrolling a long result list, the results toolbar and the table's column header stay visible at the top of the viewport instead of scrolling away, without overlapping the rows or misplacing any menu anchored in them — matching
the mock's own `position: sticky; top: 0` toolbar and `position: sticky; top: 51px` column header.

## Boundary Rationale

Sticky positioning is one independent product behavior with a distinct failure mode: overlap, stacking-context, and popover-anchoring regressions that no other packet in the batch can cause or catch, evidenced in a scrolled state the
system suite does not currently exercise at all. It is separate from FM-041 because it is unconditional layout rather than a user preference, and it is deliberately not merged into the earlier packets because pinning controls that
are still being rearranged would produce a baseline invalidated by the next task.

## Decision Dependencies

- Accepted ADRs governing this task: ADR-0002 (MUI-only presentation), ADR-0004 (testing and parity), ADR-0006 (semantic visual parity), ADR-0007 (historical; superseded for palette/typography/density by ADR-0009), ADR-0008
  (historical; superseded), ADR-0009 (full mock fidelity, including the sticky header as one of the four named structural gaps), ADR-0011 (the results table's scroll model, and how a viewport-sticky column header coexists with
  contained horizontal scroll) — `accepted` 2026-08-18 by explicit decision of the repository owner. ADR-0011 decides three things this task must realize: **(1)** the results table never scrolls horizontally, as legacy does not
  (Option E) — the `overflowX: "auto"` wrapper and the `TABLE_MIN_WIDTH` floor are removed so that no scrolling ancestor exists between a sticky `<th>` and the document and native `position: sticky` engages at every width at and above
  the stacking breakpoint; **(2)** an over-long release title **wraps** rather than ellipsizing or clamping (sub-decision E-title (i)), matching legacy's `.text-break`, with variable row heights accepted as the cost; and **(3)**
  `desktop-wide 1900x1000` is added as a second desktop evidence viewport **scoped to this task's own visual states only**, with `1280x800` retained as *the* desktop evidence viewport so the measured `63.25px` header-height baseline at
  `FEATURES.yaml:227`/`:267` is not orphaned. Options A–D were considered and not selected. ADR-0011 settles **no measurement**: its `Required Re-Measurement Before Any Option Is Relied On` section survives the acceptance in full and
  is an obligation on this implementation.
- Proposed or rejected ADRs blocking this task: `None`. ADR-0011 is accepted, so the block is lifted.
- ADR-0011 is not visual acceptance of anything. `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER` remain `visual.status: proposed`, and the two ADR-0006 variances this decision creates (below) are `proposed` and separately subject to
  explicit human acceptance, which no agent may supply.

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/SearchResults.tsx`, `SearchResults.test.tsx`, and new feature-scoped sibling modules and tests under `core/ui-react/src/features/search/results/`
- `core/ui-react/src/features/search/results/RefineSidebar.tsx` and `RefineSidebar.test.tsx` — **only** the stacking/drawer breakpoint concern: the body of the exported `useCompactRefineSurface()` hook (`RefineSidebar.tsx:55-58`,
  today `useMediaQuery(theme.breakpoints.down("sm"))`), its in-file comment, and whatever `RefineSidebar.test.tsx` must change to keep covering it. The hook's name, signature, export, and `useTheme()`-not-callback-form realization
  (which exists so the branch still resolves in a component test rendered without a `ThemeProvider` — see its comment at `:50-54`) are all unchanged. Nothing else in either file is in scope: not `EXPANDED_WIDTH`/`COLLAPSED_WIDTH`
  (`:42-43`, read-only, for the table-width arithmetic), not the sidebar's sections, docked branch, `Drawer` branch, styling, or FM-045/FM-041 behavior. Decision source: ADR-0011's `Consequences` — "`RefineSidebar.tsx`'s
  `useCompactRefineSurface()` (`:55-58`) is the single shared source of truth for both the table's stacking branch and the sidebar's drawer branch, so the task designer must widen FM-042's `Files Allowed To Modify` to include
  `RefineSidebar.tsx` for the two to move together." `SearchResults.tsx:204` consumes the same hook, so the alternative — moving only the table's branch — would manufacture an undesigned state between the two breakpoints in which a
  docked 248px sidebar sits beside a stacked-card table
- `tests/system/tests/results.spec.ts` — only this task's visual-evidence block
- `tests/system/tests/visualEvidence.ts` — **only** an additive `desktop-wide: {width: 1900, height: 1000}` entry in the exported `visualViewports` map (`:3-8`), which is the single place a named viewport can be declared and is what
  `VisualViewport` is keyed from. Purely additive: the existing `desktop` and `mobile` entries and every other export in that file are unchanged, so no other spec's evidence moves. Decision source: ADR-0011's `Human Decision` item 3
  requires this named viewport, and the map is the only mechanism by which the repository names one. Do not instead call `page.setViewportSize` inline in the spec — that would create an unnamed viewport outside the shared registry the
  visual contract is expressed against
- `docs/frontend-migration/FEATURES.yaml` — only `F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`, and `F-SEARCH-PAGING`'s `visual` and `tests` fields
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- `core/ui-react/src/app/AppShell.tsx` and `core/ui-react/src/router.tsx`. The shell renders `AppBar position="static"` inside a `minHeight: 100vh` flex column with no ancestor scroll container, so the document is the scroller and
  `position: sticky` works without touching either file. Converting the results area into its own scroll container, or making the shell header fixed, would change the shared page scroll model for every route and is not authorized here
- `core/ui-react/src/app/theme.ts` (FM-043's territory; read its tokens, do not edit them). This explicitly forecloses realizing the stacking-breakpoint move by changing `theme.breakpoints.values`: a theme breakpoint is a project-wide
  token that every other feature resolves against, and moving it here would silently re-flow routes this task does not own. The move must be expressed inside `useCompactRefineSurface()` instead
- Introducing a `<Tooltip>` or an HTML `title=` attribute on the title cell to recover truncated text. Sub-decision E-title (i) wraps rather than truncates, so nothing is hidden and there is nothing to recover; adding one would be new
  scope and a new accessibility surface. `SearchResults.tsx` has neither today and must still have neither at handoff
- Switching the table to `border-collapse: separate`, and any change to FM-041's inset recency stripe (`SearchResults.tsx:1390-1394`)
- Re-scoping the ~28 existing "at desktop" / "at 1280x800 and 390x844" geometry checks in `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER` to the new `desktop-wide` viewport. ADR-0011 scopes that viewport to this task's own states only and
  authorizes no per-check editorial pass
- Row virtualization or any other change to how many rows render (the FM-034 follow-up, still deferred)
- Moving the load-more/load-all controls, which `F-SEARCH-PAGING` has accepted immediately above the toolbar
- Changing filtering, sorting, grouping, selection, download, or display-preference behavior; any route other than `/`

## Context To Read

- `README.md` (Visual Parity, Workflow, Verification Integrity), `ADR-0002`, `ADR-0004`, `ADR-0006`, `ADR-0007` (historical), `ADR-0008` (historical), `ADR-0009`
- `ADR-0011` **in full**, and above all its `Human Decision`, `Consequences`, and `Required Re-Measurement Before Any Option Is Relied On` sections. It is the authority for everything the Option E criteria below require; where this
  packet and ADR-0011 differ in detail, ADR-0011 governs. Its `Options` section preserves the four options that were *not* selected — read it as record, not as available choices
- `F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`, `F-SEARCH-PAGING`, `C-RESULT-TABLE`, and the FM-018, FM-034, FM-045, FM-046, and FM-041 packets
- `core/ui-react/src/app/AppShell.tsx` and `core/ui-react/src/router.tsx` — read only, to confirm the scroll model and that no ancestor sets `overflow`
- `core/ui-react/src/features/search/results/SearchResults.tsx` (the responsive table styling that hides `thead` below the stacking breakpoint — today `sm`, which this task moves — and every `Popover`/menu anchored in the toolbar or
  header, post-FM-041/FM-045/FM-046), specifically the
  declarations Option E removes or changes: `TABLE_MIN_WIDTH` (`:104`) and its comment (`:97-104`, which records it as a *measured* value), `tableMinWidth` (`:461-463`), the `overflowX: "auto"` wrapper (`:850`), `tableLayout: "fixed"`
  / `width: "100%"` (`:868-870`), the `minWidth` rule and its comment (`:915-928`), the stacked-card block (`:929-966`), the `<colgroup>` (`:969-978`), the sticky header cells and sort buttons (`:990-994`, `:1053-1109`), the
  `toolbarHeight` measurement effect (`:493-554`), the title column definition (`:1295-1302`) and its attributes (`:1380` `data-result-title`, `:1431` `data-testid`, `:1509` the value `<Box>`), the recency stripe and its
  `border-collapse` comment (`:1390-1394`), and the title cell's `whiteSpace` (`:1447`)
- `core/ui-react/src/features/search/results/RefineSidebar.tsx` — `useCompactRefineSurface()` (`:55-58`) and its comment (`:50-54`), plus `EXPANDED_WIDTH`/`COLLAPSED_WIDTH` (`:42-43`) for the table-width arithmetic
- The legacy sources that establish the parity baseline Option E adopts: `core/ui-src/less/partials/tables.less` (`:17-23` the fluid `width: 100%` table with no `min-width` and no scroll wrapper; `:47-81` the `.result-*` column ratios
  the React `<colgroup>` ports byte for byte; `:91` the stacked-card breakpoint), `core/ui-src/less/partials/type.less` (`:31-34` `.text-break`), `core/ui-src/html/states/search-results.html` (`:289`, the table rendered with no
  `table-responsive` wrapper, unlike seven other legacy tables), `core/ui-src/html/directives/search-result.html` (`:3`, the title cell carrying `.text-break`), and `core/src/main/resources/static/css/bright.css` (the compiled
  stylesheet from which `@screen-xs-max` resolves to **767px**; Bootstrap 3 itself is a git-ignored bower dependency and its `variables.less` is not readable in-tree)
- `uimock/NZBHydra Search.dc.html` — the sticky toolbar (`:212`, `position:sticky;top:0`) and sticky header-row (`:258`, `position:sticky;top:51px`) blocks for the offset relationship; the header row's own density literals at `:258`
  and the sort buttons' `padding: 0 4px` at `:270-277`, which ADR-0009 does make authoritative for palette, typography, and density; and `:210`, `:255-258`, `:282`, and `:287-288` for the scroll model and title rendering that ADR-0011
  deliberately diverges from. Its **fixed-viewport shell** specifically remains non-authoritative — that is what `main{overflow:auto}` at `:210` is, and ADR-0011 turns on exactly that reading
- `tests/system/tests/results.spec.ts` and `tests/system/tests/visualEvidence.ts`

## Acceptance

- While the document scrolls, the results toolbar stays pinned at the top of the viewport (`position: sticky; top: 0`, matching the mock) and the table's column header row stays visible directly beneath it at `top:` the toolbar's own
  actual rendered height (the mock's own header sits at `top: 51px` against its own toolbar height; this task's offset is derived, not hardcoded to `51px`, since FM-041's compact mode and this batch's restyled toolbar may render a
  different height — see below), neither overlapping the other nor allowing a data row to render above the header row's lower edge.
- The implementation uses `position: sticky` within the existing document scroll model and changes no shared layout file. This criterion is unchanged by ADR-0011 and stays literally true under it: Option E *preserves* the document
  scroll model by deleting a scroll container rather than adding one, so no route's scrolling changes and no new nested scroller exists. ("Shared layout file" means the app shell named below, not the feature-scoped
  `RefineSidebar.tsx`, whose breakpoint hook this task is now explicitly permitted to change.) If sticky behavior cannot be achieved without altering `AppShell.tsx` or `router.tsx`, stop and escalate with the
  exact file and reason rather than widening scope; a change to the app-wide scroll model is a shared-layout decision this task does not carry.
- The header's sticky offset is derived from the toolbar's actual rendered height rather than a hardcoded pixel constant, so it stays correct when FM-045's sidebar is collapsed, expanded, or opened as a mobile drawer, when FM-041's
  compact mode changes heights, and when the toolbar wraps to more rows at narrow widths. State how this is derived in the handoff.
- Below the stacking breakpoint (`sm` today; moved by the criterion below) the responsive styling hides `thead`, so only the toolbar sticks — "sticky at every width" is therefore shorthand for "at every width the table renders as a
  table", which ADR-0011 states plainly as a cost of the accepted option. At 390x844 the sticky region occupies at most 40% of the viewport height with at least two result rows visible beneath it; if the full toolbar cannot meet that,
  only a compact summary and bulk-action strip sticks and the remainder scrolls normally.
- Menus and popovers anchored inside the sticky regions — FM-046's selection caret menu and FM-041's display-options menu (FM-045 removed the inline column-header filters, so there is no longer an inline-filter popover to anchor here)
  — remain correctly positioned and render above the sticky regions after scrolling. A stacking-context or `z-index` regression here is a failure, not a cosmetic finding, and is covered by an assertion in the scrolled state.
- FM-045's sidebar is not overlapped by or hidden behind the sticky regions at desktop; if it is made sticky itself its top offset matches the results column's. At mobile, FM-045's drawer-based sidebar opens as an overlay and is
  unaffected by the toolbar/header's sticky positioning underneath it.
- **No scrolling ancestor exists between a sticky `<th>` and the document.** The `overflowX: "auto"` wrapper (`SearchResults.tsx:850`) is **deleted outright**, not emptied and not left with `overflow: visible` — an `overflow-x: auto`
  element is a scroll container even when its content fits, and setting `overflow-x` to any non-`visible` value forces the used value of `overflow-y` to `auto` as well, which is why the header could not stick. `TABLE_MIN_WIDTH`
  (`:104`), its derivation `tableMinWidth` (`:461-463`), and the `minWidth` rule at `:927` are removed with it, along with the now-false comment at `:915-925` that describes horizontal scrolling as the strategy. `tableLayout: "fixed"`
  and `width: "100%"` (`:868-870`) stay, so the table remains fluid and proportional. Verify in the browser — not by reading `AppShell.tsx` and `router.tsx`, and not from the spec — that walking the ancestor chain from a sticky `<th>`
  to the document finds no element whose computed `overflow-x` or `overflow-y` is anything but `visible`. Decision source: ADR-0011 `Human Decision` item 1 and `Consequences`.
- **The `<colgroup>` is re-proportioned so all eight columns render their full labels, and the ratios are measured rather than assumed.** Today's `<colgroup>` (`:969-978`) is `40px` checkbox, then `54% / 9% / 8% / 7% / 6.5% / 5.5% / 10%`
  for Title / Indexer / Category / Size / Details / Age / Actions. Those seven numbers are a byte-for-byte port of legacy's `.result-title / .result-indexer / .result-category / .result-size / .result-details / .result-age /
  .result-links` (`core/ui-src/less/partials/tables.less:47-81`). They demonstrably do not fit once the floor is gone: `TABLE_MIN_WIDTH = 1320` is the *measured* smallest width at which every header's `scrollWidth` fits its
  `clientWidth`, and at 1280x800 with the sidebar expanded the table gets roughly 1000px. ADR-0011 sketches `Title 40% / Indexer 11% / Category 10% / Size 9% / Details 8% / Age 7% / Actions 11%` and states plainly that **those
  percentages are derived from constants, not browser-measured, and the acceptance did not settle them.** They are therefore a starting point to be measured and adjusted, **not values to implement blindly**. The criterion is the
  outcome, not the numbers: **every labelled column header renders its full label with `scrollWidth <= clientWidth`** — the six sortable headers (Title, Indexer, Category, Size, Details, Age; `:1295-1335`), measured on both the header
  `TableCell` and its sort `Button`, plus the plain `Actions` header cell (`:1137-1149`); the checkbox column (`:990-994`) carries no text label and is exempt. Measure at 1280x800 with the sidebar expanded *and* collapsed, and at
  1900x1000. Record the ratios actually shipped, the measured table width in each of those three configurations, and the tightest column's measured `scrollWidth`/`clientWidth` margin, in the handoff. If the shipped ratios differ from
  ADR-0011's sketch, say so and why — that is the expected outcome of measuring, not a deviation.
  - The complementary lever, if re-proportioning alone will not carry all eight labels, is the header-label typography at `:1053-1109`, which today is MUI `Button`'s uppercase 13px with `minWidth`/letter-spacing inside a `px: 1` cell and
    a `px: 0.5` button. The mock's own header row (`uimock/NZBHydra Search.dc.html:258`) is `font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: #7c8483` with each sort button at `padding: 0 4px`
    (Title's at `0 6px`) and the row at `height: 42px`. Adopting those literals is aligned work rather than a divergence, since ADR-0009 already mandates the mock's density — but it interacts with `FEATURES.yaml:227`/`:267`'s measured
    `63.25px` header-height baseline, so any header-height change must be re-evidenced there rather than left to contradict it silently.
  - The header cells' existing degradation guard (`overflow: hidden`, `textOverflow: "ellipsis"`, `whiteSpace: "nowrap"` at `:1053-1068` and `:1091-1109`) stays. It is a guard, not the mechanism: the acceptance is that it never has to
    engage at the evidenced viewports.
- **Release titles wrap; nothing is truncated.** The title cell gets `overflow-wrap: anywhere` — the modern spelling of legacy's `.text-break` (`core/ui-src/less/partials/type.less:31-34`, `word-wrap: break-word; word-break:
  break-word`), which `core/ui-src/html/directives/search-result.html:3` applies to legacy's own title cell. This is required, not optional: release names are dot-separated with no spaces, so a browser treats one as a single unbreakable
  word and, with no floor and no break rule, the Title cell would neither wrap nor shrink but spill into the adjacent column. A long dot-separated title must render across multiple lines, its cell must stay free of `scrollWidth`
  overflow, and the row's `data-result-title` (`:1380`) must still carry the full untruncated title. Variable row heights are the accepted cost (ADR-0011 `Human Decision` item 2). **Not** ellipsis and **not** a two-line clamp: both were
  presented and neither was selected. No `<Tooltip>` and no HTML `title=` attribute is introduced anywhere in `SearchResults.tsx` — there is none today, and the absence is precisely why wrapping was chosen over ellipsizing.
  - Measure, do not assume, that this leaves FM-041's two checks true: `FEATURES.yaml:232`'s idempotence claim (the table's height for a fixed four-row count returns to exactly its previous value after Compact rows is toggled on and off)
    and `:233`'s "enabling Compact rows measurably reduces the table's height". Wrapped heights are deterministic at a fixed width, so both are expected to hold; report the observed heights rather than inheriting the claim.
  - The non-title body cells are `whiteSpace: "nowrap"` (`:1447`) with no ellipsis guard of their own. ADR-0011 flags as unmeasured whether a long category or indexer value spills at compressed widths. Check it at 1280x800 with the
    sidebar expanded and report what was found; a spill is a defect to fix within this packet's file scope, not a finding to defer.
- **The stacked-card breakpoint moves off `sm`, and the table and the sidebar move together.** Eight columns cannot render legibly at 600px. Legacy's measured stacking threshold is **767px** (`tables.less:91`'s `@media (max-width:
  @screen-xs-max)`, resolved from the compiled `core/src/main/resources/static/css/bright.css`), while MUI's `sm` is 600px and `md` is 900px — so today's `sm` undershoots legacy by 167px and `md` overshoots it by 133px. **Required: match
  legacy's threshold**, i.e. stack below 768px, expressed as a raw max-width media query inside `useCompactRefineSurface()` (`RefineSidebar.tsx:55-58`); migration parity to the application being migrated is this project's default and
  legacy's 767px is the only measured number available. `md` (900px) is an acceptable fallback **only** if the raw query cannot be expressed within this packet's file scope, and then only recorded as an explicit deviation with the
  reason. Editing `theme.breakpoints.values` is not available — `theme.ts` is out of scope.
  - Because `useCompactRefineSurface()` is the single shared definition (consumed by `SearchResults.tsx:204` and by `RefineSidebar.tsx:114`), the table's stacking branch (`SearchResults.tsx:929-966`) and the sidebar's drawer branch move
    **together** to the same threshold. Decoupling them is out of scope: it would create an undesigned state between the two thresholds — a docked 248px sidebar beside a stacked-card table — which ADR-0011 says must be a designed,
    evidenced decision rather than a side effect. Evidence both sides of the chosen threshold in the browser: just below it the table renders stacked cards with `thead` hidden and the sidebar renders as a drawer with no docked sidebar
    beside the table; just above it the table renders as a table with a pinned header and the sidebar is docked.
  - This moves FM-045's drawer branch and FM-041's mobile-branch behavior to a new width, so re-run their existing component coverage rather than assuming it still passes. The mobile acceptance criterion above needs no rewording: it is
    phrased against 390x844, which is below every candidate threshold, so the compact branch it asserts is still the branch that renders there.
- **The sticky header's bottom edge is drawn as a `box-shadow` on the `<th>`, and the table stays `border-collapse: collapse`.** Collapsed borders are painted by the table rather than by the sticky cell, so a sticky header's bottom
  border may not travel with it. ADR-0011 requires the `box-shadow` remedy and rules out switching to `border-collapse: separate`, because `collapse` is exactly why FM-041's recency stripe is drawn as an inset `box-shadow` on the row's
  first cell (`SearchResults.tsx:1390-1394`) and changing it would disturb FM-041's delivered, evidenced behavior for no benefit. The browser behavior itself is folklore until checked: **verify against this Chromium build** whether the
  collapsed table actually drops the sticky header's bottom border, and report what was observed either way. FM-041's inset stripe must still render, unchanged, after the fix.
- No existing `data-testid` is removed or renamed. Sticky header behavior has no legacy equivalent (legacy uses no affix or sticky treatment for the results table; confirm by search rather than assuming), so it is recorded as a `proposed`
  variance.
- Registry reconciliation: `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER` gain a scrolled state in their contracts (both are `proposed`; do not re-accept). For `F-SEARCH-PAGING`, verify whether its accepted check — the load-more/load-all
  controls rendered immediately above the toolbar with no page-level horizontal overflow — is still literally true; the DOM order is unchanged, so it is expected to hold. Move it from `accepted` to `proposed` with an explanatory `note` only
  if it does not, and record which outcome was found. Never fabricate or re-date human acceptance.
- Registry reconciliation, Option E's own consequences. Each of these is a disclosure obligation: the point is that the record must not be left silently false, not that a human acceptance is being withdrawn — both affected records are
  `visual.status: proposed`, so re-proposing them costs a re-evidencing pass and nothing else. `FEATURES.yaml` is currently **unmodified** and must stay that way until this task produces the browser evidence its contract cites (the
  earlier implementer's revert of premature registry edits was correct and must not be undone). Reconcile it in the same change as the implementation, not before.
  - `FEATURES.yaml:215` — `F-SEARCH-RESULTS`'s own `visual.note` asserts that "FM-034's 1700px page container and `.result-*` column ratios remain true and unchanged". Re-proportioning the `<colgroup>` **contradicts that sentence** and
    it must be updated to say so plainly, naming the shipped ratios and the reason. Note precisely what the divergence is, because it is easy to state backwards: the React `<colgroup>` percentages are a byte-for-byte port of legacy's
    `.result-*` widths (`tables.less:47-81`), so this task adopts legacy's *fluid, never-scrolling* table model while deliberately diverging from legacy's *column ratios* — the ratios have to give precisely because the width floor that
    protected them is gone. Disclose both halves.
  - `FEATURES.yaml:270` — `F-SEARCH-SORT-FILTER`'s "every sortable column header … renders its full label at desktop with no `scrollWidth` overflow of its own box" is the check `TABLE_MIN_WIDTH = 1320` was calibrated to satisfy. It must
    be re-proposed with fresh evidence against the new ratios.
  - `FEATURES.yaml:221` — "the results-toolbar and search-results-table regions each render with no horizontal overflow at 1280x800 and 390x844" stays true and becomes true for a better reason: the table now fits rather than a wrapper
    clipping it. Re-evidence it rather than inheriting it.
  - `FEATURES.yaml:222` and `:269` — "the title header column's bounding-box width exceeds twice the indexer header column's width at desktop" is expected to survive re-proportioning (ADR-0011's sketch leaves it at roughly 3.6x). Verify
    it against the shipped ratios; do not assume it.
  - `FEATURES.yaml:233` — "every row's title cell stays free of `scrollWidth` overflow" passes under the wrap rule and fails only in the intermediate state where the floor is removed with no break rule at all. Evidence it after the wrap
    rule is in place.
  - `C-RESULT-TABLE` (`COMPONENTS.yaml:164-173`) gains a "fluid, never horizontally scrolling" layout responsibility. Record it when the record is reconciled.
- Two `proposed` ADR-0006 variances are recorded on `F-SEARCH-RESULTS`, both required by ADR-0011's `Consequences` and both live because sub-decision (i) was selected:
  - **(a) Scroll model.** The results table diverges from the mock's dual-axis scroll model in favour of legacy's always-fluid table. State the specifics rather than the adjective: the mock's own grid
    (`uimock/NZBHydra Search.dc.html:258`) is `grid-template-columns: 38px minmax(240px,1fr) 118px 130px 92px 62px 78px 78px 92px 104px` inside `padding: 0 6px`, giving a hard **240px** Title floor and an intrinsic minimum of roughly
    **1044px** below which the mock scrolls horizontally (its declared `min-width: 940px` at `:256` is inert), inside a `main` that is `overflow: auto` in both axes (`:210`). This implementation has no Title floor, no horizontal scroll
    at any width, and no nested scroller, and it compresses Title freely.
  - **(b) Title rendering.** Release titles **wrap** onto further lines rather than ellipsizing. The mock's title cell (`:287`) is `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` with a second, also-ellipsized metadata
    line at `:288`; legacy wraps (`search-result.html:3` + `type.less:31-34`). Legacy's behavior was selected.
  - Both are recorded with `status: proposed`. Accepting ADR-0011 is not accepting either of them, and neither an implementer nor a reviewer may accept them: that is an explicit human decision under ADR-0006. Never fabricate or re-date
    an acceptance.
- Visual contract (ADR-0006), asserted in `results.spec.ts`. States: `scrolled-sticky-toolbar-and-header`, `scrolled-popover-above-sticky`, `fluid-table-title-collapse`. Viewports: `desktop` 1280x800, `desktop-wide` 1900x1000,
  `mobile` 390x844. The `desktop-wide` viewport is added by ADR-0011's `Human Decision` item 3 and is **scoped to these three states only**: `1280x800` remains *the* desktop evidence viewport, the existing checks in `F-SEARCH-RESULTS`
  and `F-SEARCH-SORT-FILTER` keep their current phrasing and are not re-scoped to it, and the `63.25px` header-height baseline at `FEATURES.yaml:227`/`:267` stays measured at 1280x800. `mobile` applies to the two scrolled states only, as
  today. Geometry checks:
    - after scrolling far enough that several rows pass beneath it, the toolbar's and the header row's bounding-box tops remain within the viewport, with the header's top at or below the toolbar's bottom edge, and the header's
      computed `top` offset equals the toolbar's measured rendered height (not a hardcoded constant — assert the relationship, not a fixed number);
    - no data row's top edge sits above the header row's bottom edge while scrolled;
    - FM-046's caret selection menu or FM-041's display-options menu, opened while scrolled, renders fully within the viewport and above the sticky regions;
    - the page has no horizontal overflow in the scrolled state at every viewport the state is captured at, and at mobile the sticky region's height is at most 40% of the 844px viewport with at least two rows visible beneath it;
    - walking the ancestor chain from a sticky header `<th>` up to `documentElement`, no element has a computed `overflow-x` or `overflow-y` other than `visible` — asserted in the browser at 1280x800 and 1900x1000, in both sidebar
      states, which is what makes the sticky header work at all rather than being inferred from `AppShell.tsx`;
    - the results table's own `scrollWidth` does not exceed its `clientWidth`, and `documentElement.scrollWidth` does not exceed its `clientWidth`, at 1280x800 with the sidebar expanded and collapsed and at 1900x1000 — the table fits
      rather than being clipped;
    - each of the six sortable column headers and its sort `Button`, plus the plain `Actions` header cell, satisfies `scrollWidth <= clientWidth` at 1280x800 in both sidebar states and at 1900x1000, with each header's rendered text equal
      to its full label (the unlabelled checkbox header is exempt). This is the check that makes the `<colgroup>` re-measurement obligation verifiable rather than aspirational: it fails against today's ratios once the width floor is gone;
    - in `fluid-table-title-collapse` at 1280x800 with the sidebar expanded, a fixture row whose title is a long dot-separated release name renders its title cell across more than one line (the cell's rendered height exceeds one line
      box), the cell satisfies `scrollWidth <= clientWidth`, the row's `data-result-title` attribute still equals the full untruncated title, and the title cell carries neither a `title=` attribute nor a tooltip. Capture the same state
      at 1900x1000, where the title is expected not to need wrapping, so the collapse behavior is evidenced at both ends;
    - at the chosen stacking threshold, one viewport a few pixels below it renders the stacked-card table (`thead` hidden) *and* the refine sidebar as a drawer with no docked sidebar beside the table, while one a few pixels above renders
      the table with a pinned header *and* a docked sidebar — the two branches switching at the same width;
    - while scrolled at 1280x800, the sticky `<th>`'s computed `box-shadow` is not `none` and the table's computed `border-collapse` is `collapse`, and a recency-flagged row still renders FM-041's inset left-edge stripe on its first cell.
  The evidence fixture needs enough results to scroll, and the title-collapse state needs at least one deliberately long dot-separated release name; extend only this task's own block. `results.spec.ts` keeps scrolling the **window** — no
  assertion is re-pointed at a container, because Option E adds none. Evidence: `tests/system/tests/results.spec.ts` plus narrow captures at `visual-evidence/F-SEARCH-RESULTS/sticky-header-desktop.png`, `-desktop-wide.png`, `-mobile.png`,
  and `visual-evidence/F-SEARCH-RESULTS/fluid-table-title-collapse-desktop.png`.

## Verification

- `npm ci` only if `package.json`/`package-lock.json` change; otherwise the cheapest install that guarantees `node_modules` matches the lockfile. Record which install ran.
- Working directory `core/ui-react`: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api`, `npm run validate:migration` — each expected to pass.
- Working directory `tests/system`: `npx tsc --noEmit` — expected to pass (this task changes a spec).
- Working directory `tests/system`, after `VITE_OUT_DIR=../target/classes/static/react npm run build` from `core/ui-react`: `npx playwright test tests/results.spec.ts`, expected to produce the scrolled-state evidence. Scrolled geometry must
  be asserted in a real browser; a component test is not sufficient evidence for this task's contract. `SearchResults.test.tsx:1028-1044` and `results.spec.ts:1966-1977` both record in their own comments that jsdom applies emotion's
  stylesheet but performs no layout, so the component layer can assert only the static `position`/`z-index`/`overflow-wrap` declarations. Every column-width, wrap, overflow-ancestor, and stacking-threshold measurement above belongs to
  the Playwright run.
- **Record the re-measurement, so ADR-0011's obligation is discharged with numbers rather than assertions.** ADR-0011's `Required Re-Measurement Before Any Option Is Relied On` survives its acceptance in full. The handoff must state, as
  observed values from the real-browser run and not as arithmetic over the constants: the measured table width at 1280x800 with the sidebar expanded and collapsed and at 1900x1000; the `<colgroup>` ratios actually shipped and how they
  differ from ADR-0011's sketch; the tightest column's `scrollWidth`/`clientWidth` margin in each configuration; the observed row-height effect of wrapping against FM-041's `FEATURES.yaml:232`/`:233` checks; whether any non-title
  `nowrap` cell spills at compressed widths; whether this Chromium build actually drops a collapsed table's sticky header bottom border; and confirmation that no ancestor of a sticky `<th>` is a scroll container. A handoff that repeats
  ADR-0011's derived figures without measuring them has not satisfied this task.
- Repository root: `git diff --check` — expected to produce no output.
- Confirm task-owned changed files are all listed under Files Allowed To Modify, and that no other spec's fixtures or assertions were altered.
- Confirm verification leaves no unexpected generated or modified files; the git-ignored production build under `core/target/classes/static/react` is build output, not a tracked change.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`.

## Handoff

### Outcome

Both halves of the sticky-toolbar/header contract now work end to end. `results-toolbar` stays pinned at `position: sticky; top: 0` (that half was already done and verified by a previous invocation, and is preserved unrewritten here). Completing
this task's own scope: the table's column header row now genuinely engages native `position: sticky` at `top:` the toolbar's own measured rendered height, because ADR-0011's Option E deletes the `overflowX: "auto"` wrapper and its
`TABLE_MIN_WIDTH` floor that were the scrolling ancestor blocking it — confirmed in the browser by walking the ancestor chain from a sticky `<th>` to `documentElement` and finding no non-`visible` `overflow-x`/`overflow-y` anywhere in
between. The table never scrolls horizontally at or above the new 768px stacking breakpoint. The `<colgroup>` is re-proportioned (`40px / 34% / 11% / 11% / 9% / 11% / 9% / 15%` for the checkbox column then Title/Indexer/Category/
Size/Details/Age/Actions) and the header labels adopt the mock's own typography (11px/600/0.5px letter-spacing/uppercase, `#7c8483`), so every sortable header and the plain `Actions` header cell fit their full labels with
`scrollWidth <= clientWidth` — measured, not assumed, at 1280x800 in both sidebar states and at 1900x1000 (see **Re-Measurement** below for the observed numbers ADR-0011 requires). Release titles wrap (`overflow-wrap: anywhere`) instead of
ellipsizing, clamping, or spilling. The sticky header's bottom edge is drawn as a `box-shadow` on each `<th>` (verified to render correctly, not silently dropped, under `border-collapse: collapse` in this Chromium build), and FM-041's
inset recency stripe is confirmed unaffected. The stacked-card/drawer breakpoint moves from MUI's `sm` (600px) to a raw 768px query (legacy's own measured 767px threshold) shared by `RefineSidebar.tsx`'s `useCompactRefineSurface()` and
`SearchResults.tsx`'s own stacked-card styling, so the table and the sidebar switch together at the same width. Two pre-existing bugs in the scroll test's own assertions (unreachable while the header was still un-stuck, so never exercised
before now) were found and fixed rather than worked around; see Files Modified.

### Files Modified

- `core/ui-react/src/features/search/results/SearchResults.tsx` — completes the header half of this task (the toolbar-sticky/`toolbarHeight` measurement machinery at `:493-554`-equivalent lines, from a previous invocation, is preserved
  unrewritten, per the packet's explicit instruction): removes `TABLE_MIN_WIDTH`, its comment, `tableMinWidth`, and the `overflowX: "auto"` wrapper `Box` outright (not emptied); re-proportions `<colgroup>`; adds the mock's header-label
  typography constants (`HEADER_LABEL_FONT_SIZE`/`_FONT_WEIGHT`/`_LETTER_SPACING`/`_COLOR`) and applies them to the sort buttons and the `Actions` header cell; moves the stacked-card breakpoint from `theme.breakpoints.up/down("sm")` to
  `theme.breakpoints.up/down(768)`; adds an inset `box-shadow` remedy (`inset 0 -1px 0 ${theme.palette.divider}`) to every sticky header cell; adds `overflow-wrap: anywhere` to the title cell.
- `core/ui-react/src/features/search/results/SearchResults.test.tsx` — two new component tests, both static/jsdom-checkable declarations only (per this task's own Verification note that jsdom performs no layout): the header cells'
  `box-shadow`/table `border-collapse`, and the title cell's `overflow-wrap: anywhere` (with a check that no other body cell carries it and that no `title=` attribute or tooltip exists anywhere).
- `core/ui-react/src/features/search/results/RefineSidebar.tsx` — only `useCompactRefineSurface()`'s body (`theme.breakpoints.down("sm")` -> `theme.breakpoints.down(768)`) and its comment, per the packet's narrowly-scoped authorization;
  name, signature, export, and the `useTheme()`-not-callback-form realization are unchanged.
- `tests/system/tests/results.spec.ts` — this task's own visual-evidence block only: extended the pre-existing scroll test (already in the tree from a previous invocation) to also run at `desktop-wide`, and added a box-shadow/
  border-collapse/recency-stripe check while scrolled; fixed two pre-existing bugs in that same block, unreachable and so never actually exercised while the header was still un-stuck: (1) the "no row above the header" check filtered
  "visible" rows by generic viewport overlap, which counted a row straddling the sticky region's bottom edge (hidden behind it, not actually visible) as a false failure — fixed by filtering directly on "top at or past the sticky
  region's bottom edge" instead; (2) the docked-sidebar-not-overlapped check compared the sidebar's right edge against the *toolbar's* left edge, but `results-toolbar` spans the full page width above *both* columns, so that comparison
  could never pass — fixed to compare against the table's own left edge, matching the existing unscrolled-state contract's phrasing; also fixed a `getByRole("menuitem", {name: "Select all"})` strict-mode violation (matched both
  "Select all" and "Deselect all" without `exact: true`). Added three new tests: header-label fit (`scrollWidth <= clientWidth` on all six sortable headers/buttons plus `Actions`) and the ancestor-overflow-chain check, both at
  `desktop`/`desktop-wide` and both sidebar states; the `fluid-table-title-collapse` state (wraps at 1280x800, single line at 1900x1000); and the shared-768px stacking-threshold switch (stacked-card+drawer below, table+docked-sidebar
  above).
- `tests/system/tests/visualEvidence.ts` — additive `"desktop-wide": {width: 1900, height: 1000}` entry in `visualViewports`; `desktop`/`mobile` and every other export unchanged.
- `docs/frontend-migration/FEATURES.yaml` — `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER`'s `visual` fields only (`note`, `contract.states`, `contract.geometry_checks`, `snapshots`, `variances`); `F-SEARCH-PAGING` left unchanged (its
  accepted check was re-verified, not found false — see Registry And Documentation Updates).
- `docs/frontend-migration/STATUS.md`, `docs/frontend-migration/tasks/FM-042-search-results-sticky-toolbar-and-header.md` — lifecycle bookkeeping and this Handoff.
- Scope confirmation: every change above is within `Files Allowed To Modify`. `docs/frontend-migration/decisions/ADR-0011-results-table-scroll-model-and-sticky-header.md` is untracked and pre-existing (the coordinator's supplied
  resumed-task-attributable state), not authored or modified by this invocation.

**Not modified, and why (both discovered, not caused, by this task):**

- `docs/frontend-migration/COMPONENTS.yaml` — the packet's own registry-reconciliation bullet and ADR-0011's `Consequences` both say `C-RESULT-TABLE` "gains a 'fluid, never horizontally scrolling' layout responsibility... worth
  recording when its record is next reconciled," but `COMPONENTS.yaml` is not listed under this task's `Files Allowed To Modify`. Not edited; recorded under Follow-Up Work instead, as the ADR's own "when next reconciled" phrasing
  anticipates.
- `core/ui-react/scripts/validate-migration.mjs` — its `visualViewportNames` allowlist (`:30`) is a hardcoded `Set(["desktop", "mobile"])`; `"desktop-wide"` is not recognized, and `npm run validate:migration` fails immediately if a
  `contract.viewports` entry names it. That file is outside this task's `Files Allowed To Modify`, so `desktop-wide` was deliberately **not** added to either record's structured `contract.viewports` array; it is disclosed instead in
  each record's free-text `note` and `geometry_checks` strings, which the validator does not constrain. Recorded under Follow-Up Work.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: `prettier` (scoped `--write` runs on task-owned files only), `vitest`, `eslint`, `tsc`, `vite`, Playwright Chromium, Maven 3.9.12 / GraalVM Java 25.0.4 (`mvn package -DskipTests -pl
  org.nzbhydra:core,org.nzbhydra:mockserver -am`, invoked once via `misc/run_gui_systemtest.py --runtime local --keep-services` to bring up a real backend; two subsequent rebuild/restart cycles during colgroup iteration used the
  equivalent bare `mvn`/`java -jar` commands directly against the same kept-alive data folder, documented here rather than left implicit) — all via this repository's declared `npm run` scripts/`npx` equivalents or the documented
  `AGENTS.md` system-test launcher.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ls --depth=0` | Passed: `node_modules` already matched `package-lock.json`; no install run (`package.json`/`package-lock.json` untouched). |
| `tests/system` | `npm ls --depth=0` | Passed: `node_modules` already matched `package-lock.json`; no install run. |
| `core/ui-react` | `npm run typecheck` | Passed: `tsc --noEmit`, zero diagnostics. |
| `core/ui-react` | `npm run lint` | Passed: 0 errors, 8 pre-existing warnings, all in files this task did not touch (`SearchPage.tsx`, `RefineSidebar.tsx:69` fast-refresh warning — pre-existing, not on the changed line —, `SearchWorkspace.tsx`, `IndexerStatusesPage.tsx`, `router.tsx`). |
| `core/ui-react` | `npm run format:check` | Passed: "All matched files use Prettier code style!" (task-owned files reformatted with `prettier --write` after the wrapper-`Box` removal changed indentation, then reconfirmed clean). |
| `core/ui-react` | `npm run test -- --run` | Passed: 38 test files, 226 tests, 0 failures. |
| `core/ui-react` | `npm run build` | Passed. |
| `core/ui-react` | `npm run check:api` | Passed: "Generated OpenAPI types are current." |
| `core/ui-react` | `npm run validate:migration` | Passed (final run, after the `FEATURES.yaml` registry reconciliation): "Migration registries and task metadata are valid." |
| `tests/system` | `npx tsc --noEmit` | Passed, no diagnostics. |
| `core/ui-react` | `VITE_OUT_DIR=../target/classes/static/react npm run build` | Passed: production build written to `core/target/classes/static/react`. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local --keep-services --test-timeout 180 -- tests/results.spec.ts --grep "should keep the toolbar and header pinned"` | Brought up a real NZBHydra2 JVM backend (Maven package, ~10s) plus mockserver, per `AGENTS.md`, and ran this task's own scroll test against it (first pass surfaced the two pre-existing test bugs and one env-var gap described above/below, all then fixed). |
| `tests/system` (backend kept alive; env vars sourced from the wrapper's own values — `PLAYWRIGHT_BASE_URL`, `HYDRA_INTERNAL_API_KEY`, `MOCKSERVER_INTERNAL_URL=http://127.0.0.1:5080`, etc. — for faster iteration than re-invoking the full wrapper each time) | `npx playwright test tests/results.spec.ts` (full file, final run, against the backend rebuilt from the final `34%/…/15%` colgroup) | **Passed: 22 of 22 tests**, including this task's own extended scroll test and the three new tests. |
| `tests/system` (same backend) | `npx playwright test tests/search.spec.ts` (regression check: this spec also exercises the results page) | Passed: 14 of 14 tests. |
| repository root | `git diff --check` | Passed, no output. |
| repository root | `git status --porcelain` | Confirmed: only the task-owned files above changed; no stray/generated files (evidence PNGs under `tests/system/visual-evidence/` and the JVM build under `core/target/` are both git-ignored, confirmed via `git check-ignore -v`). |
| repository root | `sha256sum` on every task-owned implementation/test file | Recorded in Verification Basis below. |

### Verification Basis

- Baseline: `e248c2dcb13168cbbd93af3f40cd67bc21c498ff`.
- Command coverage: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api` (all `core/ui-react`) depend on the three `core/ui-react` implementation/test files listed
  below. `npx tsc --noEmit` (`tests/system`) and both `npx playwright test` runs depend on `tests/system/tests/results.spec.ts` and `tests/system/tests/visualEvidence.ts` directly, and (through the served production build) on the three
  `core/ui-react` files. `npm run validate:migration` additionally depends on `docs/frontend-migration/FEATURES.yaml` and this task packet (documentation/registry-only; excluded from the file-content manifest per template
  instruction).
- File-content manifest (current on disk, captured after the final full Playwright/vitest runs; no implementation or test file changed after these hashes were taken):
  - `core/ui-react/src/features/search/results/SearchResults.tsx: 210bfc391ac4093a4aa90564d3171825b7deedce502c90faee75ee0497da030b`
  - `core/ui-react/src/features/search/results/SearchResults.test.tsx: 0a14b99cd84e1fd7956bc7260647f057d408b417ddf9bcfd91ed07eb81ba3534`
  - `core/ui-react/src/features/search/results/RefineSidebar.tsx: 86e62ff68dd7e2b517405e77efbaae53d44bb4f932d3b315655d0ef6a8331729`
  - `tests/system/tests/results.spec.ts: 95ee3bf358ca779d885e156f5c06e2449883a67aaa9ffa584e339dc70929998e`
  - `tests/system/tests/visualEvidence.ts: 09f3d2833074629d813069a1e61129d9629516b4ee5a13ed89bde8f23c4114b3`
- Completed after the last change to each command's listed files: yes. Every command above was executed fresh after the final colgroup/typography edit; `FEATURES.yaml`'s registry reconciliation was written after that, and
  `npm run validate:migration` was re-run afterward and passed — no implementation or test file was touched after these hashes were captured, so no other command needed re-running.
- Task-owned changes after verification: `docs/frontend-migration/FEATURES.yaml`, `docs/frontend-migration/STATUS.md`, and this task packet's own Handoff section — documentation/registry/lifecycle-only, written after the code-level
  verification above and covered by the `validate:migration` re-run.

### Re-Measurement (ADR-0011's Obligation, Discharged With Numbers)

Measured via `playwright-core`'s `chromium.launch()` directly against the same served production build the Playwright suite above exercises (a throwaway, un-tracked measurement script — not part of the diff), so these are observed
values, not arithmetic over the constants:

1. **Measured table width**: 1280x800 sidebar expanded **936px**; 1280x800 sidebar collapsed **1136px**; 1900x1000 sidebar expanded **1356px**.
2. **`<colgroup>` ratios shipped**: `40px / 34% / 11% / 11% / 9% / 11% / 9% / 15%` (checkbox, Title, Indexer, Category, Size, Details, Age, Actions) — versus ADR-0011's sketch of `40px Title 40% / Indexer 11% / Category 10% / Size 9% /
   Details 8% / Age 7% / Actions 11%`. Differences and why: **Title is lower (34% vs. 40%)** because the real rendered Title *header* button only ever needs ~45px regardless of column width (its data content, not its label, is what
   uses the space, and the sketch's 40% assumed more slack than the header-fit criterion actually requires); **Details and Age are higher (11%/9% vs. 8%/7%)** because their sort buttons, at the adopted 11px/600-weight/0.5px-tracked
   typography, need slightly more than the sketch's default-MUI-Button-metrics estimate; **Actions is substantially higher (15% vs. 11%)** because the sketch only sized the plain header *label* ("Actions", ~57px), not the wider
   `Chip` ("Downloaded", rendered in the body after a direct download) that is the column's real binding constraint — confirmed directly: the pre-existing (unrelated, already-passing-before-this-task) test
   `"should provide deterministic React results visual evidence across desktop and mobile"` failed with a clipped `Downloaded` chip at Actions=13%, and passed once Actions moved to 15%. Category/Size stayed at the sketch's own
   figures (10%->11%, 9% unchanged, within measurement rounding).
3. **Tightest column's margin**: the **Age** header's sort button has the smallest headroom of any labelled column in every configuration — **~7.6px** between its intrinsic (Range-measured, not `scrollWidth`, per the note below) text
   width and its rendered box, identically at 1280x800 expanded, 1280x800 collapsed, and 1900x1000 expanded (Age's column percentage and button padding don't change across sidebar states/viewports, so neither does this margin). No
   configuration showed a negative margin (no overflow) on any of the eight columns. Measurement note: MUI's `Button` shrink-wraps to its own content by default (not stretched to the cell), so its DOM `scrollWidth`/`clientWidth` are
   trivially equal whenever it isn't visually clipped — a genuine "how much room is left" figure required measuring the text's own intrinsic width via a DOM `Range` and comparing it to the button's rendered box, which is what the
   number above reflects.
4. **Row-height effect of wrapping, against FM-041's `FEATURES.yaml:232`/`:233` checks**: both re-verified passing, unchanged, via the existing Playwright test (`"should provide deterministic display-options, compact-row, recency,
   and sidebar-shortcut visual evidence..."`), which asserts the idempotence claim and the Compact-rows-reduces-height claim directly against real rendered heights. A row's height is set by the tallest cell in the row (checkbox/
   action controls, not the title's own line count, in this task's fixtures), so wrapping a short single-line title introduces no observed change to either check; a genuinely multi-line title (the `fluid-table-title-collapse` fixture)
   does increase its own row's height, which is the accepted cost ADR-0011 names, and does not interact with either FM-041 check (both use short, non-wrapping titles).
5. **Whether any non-title `nowrap` cell spills at compressed widths**: checked at 1280x800 sidebar expanded with realistic (not synthetic-short) Indexer (`"DrunkenSlug"`, `"omgwtfnzbs"`) and Category (`"Movies/HD"`, `"TV/x264/HD"`)
   values — **no spill found**; both fit with `scrollWidth === clientWidth` (exactly fitting, not overflowing). A genuine, **pre-existing** gap was found in the unrelated **Size** column while probing this with an unrealistically large
   raw byte count: `SearchResults.tsx`'s `size` column renders `result.size ?? ""` directly (a raw byte integer, e.g. `10995116277760`), unlike legacy's `{{ ::result.size | byteFmt: 2 }}` (`core/ui-src/html/directives/search-result.html:51`).
   This is **not** a spill this task's re-proportioning caused (Size was already the same tight percentage under the old, pre-Option-E ratios, so an equally large raw number would already have spilled there too) and Size is not one of
   the two columns ("category or indexer") ADR-0011 names as unmeasured, so it is disclosed and deferred rather than fixed in this task's scope — see Follow-Up Work.
6. **Whether this Chromium build drops a collapsed table's sticky header bottom border**: verified directly, not assumed from folklore. The table's computed `border-collapse` is `"collapse"`, and every sticky header `<th>`'s own
   computed `box-shadow` is a real, non-`"none"` inset shadow (e.g. `rgba(255, 255, 255, 0.12) 0px -1px 0px 0px inset`), confirmed both before and while scrolled, via a dedicated assertion in `results.spec.ts`'s scroll test. Because
   the remedy (a `box-shadow` on the `<th>` itself) does not rely on the collapsed table's native border rendering at all, whether that native border specifically would have been dropped is moot for this implementation's correctness
   — the remedy sidesteps the question ADR-0011 raised rather than needing to answer it directly.
7. **No ancestor of a sticky `<th>` is a scroll container**: confirmed in the browser, not inferred from `AppShell.tsx`/`router.tsx`. Walking the ancestor chain from `sort-title`'s closest `<th>` up to `documentElement` at 1280x800 and
   1900x1000, in both sidebar states, every ancestor's computed `overflow-x` and `overflow-y` is `"visible"` — asserted by a dedicated Playwright test (`"should render every column header's full label without scrollWidth overflow,
   and no scrolling ancestor..."`).

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- ADR-0002 (MUI-only presentation): followed. No new UI library introduced; every new declaration is `sx`/theme-driven MUI styling.
- ADR-0004 (testing and parity): followed. The scrolled-state contract, the ancestor-overflow-chain proof, the column-fit measurements, and the stacking-threshold switch are all asserted in a real-browser Playwright run (jsdom cannot
  lay out or resolve them); the two component tests added are deliberately scoped to only the static declarations jsdom *can* check, per this task's own Verification note.
- ADR-0006 (semantic visual parity): followed. `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER` stay `visual.status: proposed` (never self-accepted); two new `proposed` ADR-0006 variances were added (scroll model, title rendering), both
  requiring explicit, separate human acceptance this handoff does not and cannot supply; no acceptance was fabricated or re-dated.
- ADR-0009 (mock fidelity): followed. The mock's own header-row density literals (`uimock/NZBHydra Search.dc.html:258`, `:270-277`) are adopted as the "complementary lever" for the header-fit requirement, as ADR-0009 already makes
  them authoritative and ADR-0011 names them as available.
- ADR-0011 (this task's own governing decision): implemented in full — Option E (never scroll horizontally), sub-decision E-title (i) (wrap), and the `desktop-wide` viewport scoped to this task's own three states. Every item under its
  `Required Re-Measurement Before Any Option Is Relied On` section is discharged above with observed numbers, not repeated sketch figures.
- `ADR REQUIRED` proposal triggered during this task: None. Every choice (the exact shipped colgroup ratios within the measured-fit constraint, the `theme.breakpoints.down(768)` raw-pixel expression, the `box-shadow` remedy's exact
  color token) is a routine, reversible, task-local implementation decision already licensed by ADR-0011.

### Assumptions

- **Colgroup ratios are the result of real-browser measurement, adjusted twice from an initial guess** (first from a sketch-adjacent starting point, then bumped again after the pre-existing `"...React results visual evidence..."`
  test caught the `Downloaded` chip clipping at the first-adjusted Actions width) — not a single unverified guess. See Re-Measurement item 2 for the full reasoning.
- **`desktop-wide` is disclosed in `FEATURES.yaml` prose, not the structured `contract.viewports` array**, because `core/ui-react/scripts/validate-migration.mjs`'s viewport allowlist does not recognize it and that file is outside
  this task's `Files Allowed To Modify`. See Files Modified and Follow-Up Work.
- **The Size column's raw-byte-count display** is a genuine, pre-existing migration gap relative to legacy, discovered while satisfying this task's required "check whether a non-title cell spills" investigation, not caused by the
  `<colgroup>` re-proportioning. Not fixed here (outside this task's Boundary Rationale, which is about sticky positioning and the scroll model, not result-value formatting); recorded as Follow-Up Work.
- The two `MOCKSERVER_INTERNAL_URL`-related test failures encountered once during iteration (a `ResourceAccessException: mockserver: Name or service not known` from the backend, and a Playwright strict-mode violation) were both
  environment/test-authoring issues exposed by, not caused by, this task's changes — the first from invoking `npx playwright test` directly without the wrapper script's env vars during fast local iteration (resolved by sourcing the
  same env vars the wrapper sets), the second a pre-existing `getByRole` ambiguity in the already-present scroll test (fixed, see Files Modified).

### Temporary Exceptions And Debt

None.

### Registry And Documentation Updates

- `F-SEARCH-RESULTS` (`FEATURES.yaml`): `visual.status` stays `proposed`. `note` gained a paragraph naming FM-042/ADR-0011, correcting the superseded "`.result-*` column ratios remain true and unchanged" clause (they do not — the new
  ratios and the reason are stated), and disclosing the box-shadow remedy, the wrap rule, and the shared 768px breakpoint. `contract.states` gained `scrolled-sticky-toolbar-and-header`, `scrolled-popover-above-sticky`,
  `fluid-table-title-collapse`. `contract.geometry_checks` gained the sticky-pinning/no-overlap/popover-above/sidebar-not-overlapped/ancestor-chain/table-and-document-overflow/box-shadow-and-recency-stripe/title-wrap bullets, each
  genuinely asserted in `results.spec.ts` and confirmed passing. `contract.viewports` is unchanged (see Files Modified for why `desktop-wide` is not a structured entry). `evidence` unchanged (`results.spec.ts`). `snapshots` gained
  `sticky-header-{desktop,desktop-wide,mobile}.png` and `fluid-table-title-collapse-desktop.png`, all confirmed present on disk with SHA-256 recorded above (via the visual-evidence PNGs' own listing, not repeated here as they are
  git-ignored build output, not tracked files this task's manifest covers). `variances` gained two `proposed` ADR-0006 entries (scroll model, title rendering), both requiring separate human acceptance. `selectors`, `tests`, `target`,
  `parity`, `gaps`, `task`, `backlog` unchanged and confirmed still accurate.
- `F-SEARCH-SORT-FILTER` (`FEATURES.yaml`): `visual.status` stays `proposed`. `note` gained a paragraph naming FM-042/ADR-0011, disclosing the re-proportioned `<colgroup>`/typography and — because this record's own mobile/breakpoint
  language referenced `sm` throughout — explicitly restating that both the sidebar's drawer branch and the table's stacked-card branch now switch at the shared raw-768px threshold instead. `contract.geometry_checks` gained a
  fresh-evidence bullet for the existing full-label-fit check (re-verified against the new ratios, at 1280x800 in both sidebar states) and a new stacking-threshold-switch bullet. `contract.viewports` unchanged (same reason as above).
  `variances` — the third entry's `theme.breakpoints.down("sm")` reference was corrected: it named the *old* threshold literally, which would have been stale and misleading now that the shared hook has moved; updated to describe the
  mechanism generically and note FM-042's threshold change explicitly, without altering the variance's underlying claim or status. `evidence`, `snapshots`, `selectors`, `tests`, `target`, `parity`, `gaps`, `task`, `backlog` unchanged.
- `F-SEARCH-PAGING`: `visual.status` stays `accepted`, unchanged. Its accepted check (load-more/load-all controls immediately above the toolbar, no page-level horizontal overflow) was re-verified rather than assumed: the existing
  Playwright tests covering it (`"should load more and all React results..."`, `"should stop React load-more..."`) both passed in the full 22/22 run, and DOM order is unchanged by this task, so no demotion to `proposed` was
  warranted or made.
- `C-RESULT-TABLE` (`COMPONENTS.yaml`): **not modified** — outside this task's `Files Allowed To Modify`; see Files Modified and Follow-Up Work.
- No `APIS.yaml` record applies (`API IDs: None`).
- For ADR-0006 visual records: `applicability: applicable` (both records, unchanged); lifecycle stays `proposed` for both, not advanced to `accepted` and not left `unassessed`; scoped `states`/`geometry_checks` are present and genuinely
  asserted; `evidence` present; `snapshots` present and confirmed on disk; both new variances are `proposed`, not fabricated as accepted; **human acceptance is explicitly pending** for both records' updated contracts and both new
  variances — this handoff proposes them, it does not and cannot accept them. No behavioral or accessibility gate is implied by this visual evidence: the `aria-sort`/`aria-label` sort-button contract, the header caret menu's
  actionable clickability while scrolled, and the display-options menu's actionable clickability while scrolled were all verified via real Playwright interaction (a genuine click-through, not a geometry inference), not merely
  inferred from a screenshot.
- `STATUS.md`: this task's entry moved from `ready` (the state the task-designer's refinement left it in once ADR-0011 was accepted) to `review` (this handoff), reflecting that the implementation is now complete and verified.

### Follow-Up Work

- **Maintenance candidate for `/fm-quickfix`**: `core/ui-react/scripts/validate-migration.mjs:30`'s `visualViewportNames` allowlist (`Set(["desktop", "mobile"])`) should add `"desktop-wide"` so a future task can name it in
  `FEATURES.yaml`'s structured `contract.viewports` array instead of only in free-text prose. Single-line `Set` literal change, no behavioral surface.
- **Maintenance candidate for `/fm-quickfix`**: `docs/frontend-migration/COMPONENTS.yaml`'s `C-RESULT-TABLE` record (`:164-173`) should gain a "fluid, never horizontally scrolling" layout-responsibility note, per ADR-0011's
  `Consequences` and this task's own registry-reconciliation bullet — a single descriptive line in an existing record, no behavioral surface.
- **Maintenance candidate for `/fm-quickfix`**: `core/ui-react/src/features/search/results/SearchResults.tsx`'s `resultColumns` `size` column (`value: (result) => result.size ?? ""`) displays the raw byte integer instead of a
  human-readable size, unlike legacy's `{{ ::result.size | byteFmt: 2 }}` (`core/ui-src/html/directives/search-result.html:51`, `core/ui-src/js/filters.js:5`'s `filesize` filter). Discovered while satisfying this task's required
  non-title-cell-spill check (see Re-Measurement item 5); a single value-function change in one column, coverable by a regression test.
- **Human decision required, not a task**: fresh human visual acceptance for `F-SEARCH-RESULTS`'s and `F-SEARCH-SORT-FILTER`'s updated contracts, and for the two new `proposed` ADR-0006 variances (scroll model, title rendering) —
  per ADR-0006, no agent may supply this.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer cannot supply the human visual acceptance the affected records require; that
remains a human decision independent of technical review, per ADR-0006.
