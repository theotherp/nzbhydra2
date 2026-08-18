# ADR-0011: The Results Table's Scroll Model, And How A Viewport-Sticky Column Header Coexists With Contained Horizontal Scroll

Status: accepted (2026-08-18 — **Option E**, with sub-decision **E-title (i) wrap** and a scoped `desktop-wide 1900x1000` evidence viewport, selected by explicit decision of the repository owner from the options presented below; see
**Human Decision**)

**Acceptance note (2026-08-18).** The revision note immediately below describes the state of this document at the time the revision was written, before any decision existed; it is preserved verbatim as part of the record and its "nothing
is accepted / FM-042 remains `blocked`" statements are historical, superseded by the **Human Decision** section. The acceptance changed no option's text, no cost, no tradeoff, and no measurement caveat: Options A–E and their stated costs
stand exactly as they were weighed, and the outstanding browser re-measurement obligations under **Required Re-Measurement Before Any Option Is Relied On** are *not* settled by this acceptance.

**Revision note (2026-08-18, still `proposed`, nothing accepted).** The repository owner directed a revision of this proposal after raising the approach previously filed here as "Option E — a complement, not a standalone answer". On
re-investigation Option E is materially stronger than this document stated, and two of the costs previously attributed to it were factually wrong. Option E is now a first-class, fully specified option, both errors are corrected below
under **Corrections**, and the recommendation has been re-run across all five options — it **changes from Option D to Option E**. Every claim in this revision was re-verified against the working tree at baseline
`e248c2dcb13168cbbd93af3f40cd67bc21c498ff`; the revision also found several claims in the original text (including in the original Option E) that do not survive verification, and those are corrected rather than quietly dropped. No option
is accepted. FM-042 remains `blocked`.

## Decision Question

The results table is wrapped in `<Box sx={{maxWidth: "100%", overflowX: "auto"}}>` so that a table wider than its column scrolls horizontally inside its own box instead of overflowing the page. That wrapper is, by the CSS Overflow
Module's own interaction rule, a scrolling ancestor in **both** axes, and it never scrolls vertically — so a `position: sticky` `<th>` inside it can never track the viewport. Given that ADR-0009's accepted decision names the mock's
sticky/pinned column header as one of the four structural gaps the repository owner asked for by name, **how should the results table reconcile "contained horizontal scroll for a wide table" with "a column header that stays visible
while the user scrolls the result list" — or should it stop needing contained horizontal scroll at all, as the legacy AngularJS view does?**

Two decisions are requested here, because the second only exists if the first is answered a particular way:

1. **The scroll model.** Options A–E below.
2. **Conditional sub-decision, live only if Option E is selected: how an over-long release title behaves once the Title column can be squeezed** — wrap onto further lines (legacy's behavior), truncate with an ellipsis (the mock's
   behavior), or clamp to a fixed number of lines. Legacy and the mock give opposite answers to this, so it cannot be settled by deferring to either artifact. See **Option E, sub-decision E-title**.

This is a scroll-model and shared-runtime-boundary question, not a task-local styling detail: it decides whether the results region keeps the app-wide document scroll model, and it changes what `F-SEARCH-RESULTS`,
`F-SEARCH-SORT-FILTER`, and `C-RESULT-TABLE` can claim about scrolled-state geometry. It does not reopen `ADR-0002-frontend-stack.md`'s MUI-only boundary or `ADR-0009-mock-fidelity-visual-redesign.md`'s fidelity decision; it decides how
one of ADR-0009's named gaps is actually realized.

## Context And Evidence

Every fact below was verified in the working tree at baseline `e248c2dcb13168cbbd93af3f40cd67bc21c498ff` (branch `newUi2026`) rather than taken from an escalation or a review report. Line numbers were re-confirmed for this revision.

- **The wrapper.** `core/ui-react/src/features/search/results/SearchResults.tsx:850` is `<Box sx={{maxWidth: "100%", overflowX: "auto"}}>`, wrapping the `<Table>` at `:851`. The table's own `sx` sets `minWidth: tableMinWidth` at
  `theme.breakpoints.up("sm")` (`:926-928`), and `tableMinWidth` (`:461-463`) is `TABLE_MIN_WIDTH` (`:104`, `1320`) plus `EXPANDED_WIDTH - COLLAPSED_WIDTH` when the sidebar is collapsed. The in-file comment at `:915-925` states the
  wrapper's purpose directly: `tableMinWidth` "keeps header sort-buttons from being squeezed into overflow by the persistent sidebar -- scrolling horizontally within the existing `overflowX: \"auto\"` wrapper instead."
- **Correction to the original escalation's attribution.** The escalation attributed the wrapper to FM-039. Git history does not support that: `git log -S 'overflowX: "auto"'` on that file returns `bca2d20e4` (FM-010, Search Workspace
  And Core Results) as the commit whose diff *adds* the line, and `51a4def8e` (FM-039) as a commit that removes it at one nesting level and re-adds it deeper inside the new sidebar layout. The wrapper is therefore **FM-010-era baseline
  presentation of `F-SEARCH-RESULTS`**, re-nested but not introduced by FM-039.
- **Why sticky cannot engage.** Setting `overflow-x` to anything other than `visible` forces the used value of `overflow-y` to `auto` as well. The FM-042 implementer confirmed this empirically against the actual Chromium build in an
  isolated reproduction rather than by spec-reading — `getComputedStyle(wrapper).overflowY` reports `"auto"` although only `overflowX` was set — and the reproduction was identical across three rebuilds. The wrapper is therefore the
  nearest scrolling ancestor of every `<th>`, its own `scrollTop` never changes when the *page* scrolls, and each sticky `<th>` renders at its ordinary in-flow position. `overflow-y: clip`, `overflow-y: hidden`, and an explicit
  `overflow-y: visible` (silently forced back to `auto`) were each tried and each failed. There is no CSS opt-out: a sticky element sticks to its nearest scrolling ancestor, and an element with a non-`visible` overflow value is a scroll
  container whether or not its content currently overflows.
- **The partial implementation is real evidence, and it is in the tree.** `git status --porcelain` shows exactly five modified files, all inside FM-042's `Files Allowed To Modify`: `SearchResults.tsx`, `SearchResults.test.tsx`,
  `tests/system/tests/results.spec.ts`, `STATUS.md`, and the FM-042 packet, plus this untracked ADR. `docs/frontend-migration/FEATURES.yaml` is **unmodified** — the implementer reverted its registry edits because they cited visual
  evidence that was never produced. The sticky styling is applied at `SearchResults.tsx:990-994` and `:1053-1068` (`position: "sticky"`, `top: toolbarHeight`, `zIndex: HEADER_STICKY_Z_INDEX`, plus the shared `STICKY_BACKGROUND`).
- **The toolbar half already works and is not in question.** `results-toolbar` (`SearchResults.tsx:646-656`) is `position: sticky; top: 0; zIndex: 15`, verified pinned in a real browser. The header's offset is genuinely derived, never
  hardcoded: `toolbarHeight` is state (`:494`) measured in a `useLayoutEffect` (`:496-554`) from `getBoundingClientRect().height`, re-measured on `document.fonts.ready` (`:518-520`), on any `MutationObserver` DOM change inside the
  toolbar (`:529-537`, added because the downloader/category `<Select>`s populate asynchronously and made the offset undershoot), and on `ResizeObserver` resize (`:544-545`). That measurement machinery is reusable under every option
  below; none of them discards it.
- **jsdom cannot see this class of defect, and both test layers say so in their own comments.** `SearchResults.test.tsx:1028-1044` records that jsdom applies emotion's stylesheet but performs no layout, so the component test asserts
  only the static `position`/`z-index` declarations (`:1045-1085`); `results.spec.ts:1966-1977` records the same and carries the real scrolled-geometry contract. Any option chosen here must be evidenced in the browser, per FM-042's own
  Verification ("Scrolled geometry must be asserted in a real browser; a component test is not sufficient evidence for this task's contract").
- **The table is already fluid and proportional; only two declarations create the overflow.** `SearchResults.tsx:868-870` sets `tableLayout: "fixed"` and `width: "100%"`, and a `<colgroup>` at `:969-978` sets the column ratios
  explicitly: `40px` checkbox, then `54%` (Title), `9%`, `8%`, `7%`, `6.5%`, `5.5%`, `10%`. Under `table-layout: fixed` cell content cannot force the table wider, so the *only* things producing horizontal overflow are `minWidth:
  tableMinWidth` (`:927`) and the `overflowX: "auto"` wrapper (`:850`).
- **Those colgroup ratios are a byte-for-byte port of legacy's.** `core/ui-src/less/partials/tables.less:47-81` defines `.result-title { width: 54% }`, `.result-indexer { 9% }`, `.result-category { 8% }`, `.result-size { 7% }`,
  `.result-details { 6.5% }`, `.result-age { 5.5% }`, `.result-links { 10% }` — the same seven numbers in the same order. React adds a `40px` checkbox column on top of the same 100%, so the declared widths total `100% + 40px` and the
  browser scales the percentages down proportionally to fit; a small, separately fixable inaccuracy, not a defect.
- **Legacy never scrolls the results table sideways, and did so deliberately.** `tables.less:17-23` is `.search-results-table { border: 1px solid @brand-primary; display: table; width: 100%; background-color: @table-bg;
  border-collapse: separate; }` — no `min-width`. `core/ui-src/html/states/search-results.html:289` renders `<table class="table table-hover search-results-table" data-testid="search-results-table">` with **no** `table-responsive`
  wrapper and no scroll container of any kind, while seven *other* tables in the same application do use Bootstrap's `table-responsive` horizontal scroller (`notification-history.html:11`, `download-history.html:10`,
  `indexer-statuses.html:1`, `saved-searches.html:17`, `search-history.html:15`, `directives/backup.html:28`, `directives/tasks.html:6`, `directives/log.html:17`). A repository-wide search of `core/ui-src/less/` finds no `min-width` or
  `overflow` rule targeting the results table or its cells. Legacy squeezes its columns and never scrolls sideways, by choice.
- **Legacy solves the unbreakable-title problem explicitly, and React does not.** `core/ui-src/html/directives/search-result.html:3` is `<td class="col-md-13 text-break search-results-cell result-title" ...>`, and `.text-break` is
  defined at `core/ui-src/less/partials/type.less:31-34` as `word-wrap: break-word !important; word-break: break-word !important;`. In the React target there is **no** `overflow-wrap`, `word-break`, `word-wrap`, `hyphens`, or line-clamp
  declaration anywhere: a search of the whole of `core/ui-react/src/` for those properties returns only `textOverflow` hits, all on the *header* cell and its sort button (`SearchResults.tsx:1062`, `:1105`) plus one unrelated hit in
  `filterControls.tsx:110`. `core/ui-react/src/app/theme.ts`'s `MuiCssBaseline.styleOverrides` (`:182-204`) sets only focus-outline and scrollbar rules — no global word-break baseline. The title body cell is
  `whiteSpace: isTitle ? "normal" : "nowrap"` (`SearchResults.tsx:1447`) and nothing else.
- **The Title column's content structure, for the sub-decision.** The title column is `{align: "left", id: "title", label: "Title", testId: "search-result-title", value: (result) => result.title}` (`SearchResults.tsx:1295-1302`) — a
  plain string. It renders inside a `<Stack direction="row" flexWrap="wrap">` (`:1451-1456`) whose last child is `<Box>{column.value(result)}</Box>` (`:1509`), preceded by the optional `Expand group` / `Expand duplicates` buttons. The
  cell carries `data-testid={column.testId}` (`:1431`), i.e. `search-result-title`; the row carries `data-result-title={result.title}` (`:1380`) with the **full, untruncated** title. There is no `<Tooltip>` and no HTML `title=`
  attribute anywhere in `SearchResults.tsx`.
- **`TABLE_MIN_WIDTH = 1320` is a measured calibration, not an arbitrary floor.** Its own comment (`:97-104`) reads: "The narrowest a `sm`-and-up results table is allowed to render before it scrolls horizontally within its own box
  instead of squeezing header sort-buttons into overflow (measured against the fixed `colgroup` column ratios below: this is the smallest width at which every header's `scrollWidth` fits its `clientWidth`, including the epoch column's
  sort arrow)." The header cells already carry the degradation guard that constant exists to keep dormant: `overflow: "hidden"`, `textOverflow: "ellipsis"`, `whiteSpace: "nowrap"`, `px: 1` on the `TableCell` (`:1053-1068`) and the same
  three plus `px: 0.5` on the sort `Button` (`:1091-1109`). This fact is load-bearing for Option E and is discussed there.
- **Sidebar widths.** `RefineSidebar.tsx:42-43` set `EXPANDED_WIDTH = 248` (the mock's own `flex:0 0 248px`) and `COLLAPSED_WIDTH = 48`. The `sm`/drawer branch is decided by one exported hook, `useCompactRefineSurface()`
  (`RefineSidebar.tsx:55-58`), which is `useMediaQuery(theme.breakpoints.down("sm"))` and is consumed by `SearchResults.tsx` as well — a single shared definition, so the table's stacking breakpoint and the sidebar's drawer breakpoint
  cannot be moved independently without deliberately decoupling them.
- **How often the conflict actually bites.** At the visual contract's desktop viewport of 1280x800 the table's column is roughly `1280 - 248 - spacing/padding` ≈ 1000px against a 1320px minimum when the sidebar is expanded, and roughly
  `1280 - 48 - spacing/padding` ≈ 1200px against a **1520px** minimum when collapsed, because `tableMinWidth` grows by the same delta the sidebar frees. The table therefore overflows at 1280 in *both* sidebar states, and only stops
  overflowing somewhere around a ~1600px viewport. The ~1000px/~1200px figures are derived from the constants, not browser-measured; the 1320 they are compared against **is** measured. At the repository owner's stated ~1900px design
  target the arithmetic gives `1900 - 248` = 1652px of table, matching the owner's own "~1650px" figure.
- **What the mock actually does — and what it does not.** `uimock/NZBHydra Search.dc.html:210` is `<main style="flex:1;min-width:0;height:100%;overflow:auto;padding:0 18px 60px;">`. The mock's scroller is **`main`, not the document**,
  and it scrolls in both axes. Its sticky toolbar (`:212`, `position:sticky;top:0;z-index:15`) and sticky header row (`:258`, `position:sticky;top:51px;z-index:10`) stick against that container. The mock's table region (`:255-256`) has
  no inner horizontal-scroll wrapper — it is a `min-width:940px` block inside a `main` that already scrolls both axes. Two details of it matter here and were missed in the original draft of this ADR:
  - the mock's grid is `grid-template-columns: 38px minmax(240px,1fr) 118px 130px 92px 62px 78px 78px 92px 104px` (`:258`, repeated per row at `:282`). Those fixed tracks plus the Title track's own **240px floor** sum to 1032px, plus the
    container's `padding:0 6px` = **~1044px** — so the declared `min-width:940px` is inert, and the mock's real horizontal floor is ~1044px. Below that width the mock scrolls sideways. **The mock is a horizontally-scrolling design with a
    hard Title floor; it does not corroborate a never-scrolling table.** Legacy does. The honest column-density comparison is ~1044px for the mock's ten columns against 1320px for React's eight — directionally the same point the original
    Option E made, but a third of the size it claimed.
  - the mock's title cell (`:287`) is `white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, with a second, also-ellipsized metadata line beneath it (`:288`). **The mock truncates titles; legacy wraps them.** This is why the
    sub-decision below cannot be resolved by deferring to an artifact.
- **Governing accepted decisions.** `ADR-0009` (accepted 2026-08-17 by direct human instruction) records the owner's own words — "The mockup is denser, has a fixed table header, no inline filters, doesn't use checkboxes for the category
  or indexer but instead some kind of multiselect" — and names "the table with the sticky header" among four structural gaps. Note precisely what is named: **a fixed table header**, a user-visible outcome. A nested dual-axis scroll
  container is not among the four named patterns, and FM-042's own `Context To Read` already says of the mock that "its fixed-viewport shell, inline colors, and fonts beyond the offsets themselves are not authoritative"
  (`FM-042-...md:66-67`). `ADR-0002` fixes MUI as the only component system and TanStack Table as the table primitive; MUI's own supported frozen-header pattern (`TableContainer` with a bounded height plus `Table stickyHeader`) is a
  dual-axis scroll container, i.e. the mock's model, and is not currently used here — the sticky styling is hand-written per `TableCell`. `ADR-0006` requires explicit human acceptance of every visual baseline and of every documented
  variance, which no agent may supply. `ADR-0004` keeps behavioral, accessibility, and visual gates independent.
- **The Verification Integrity language.** `docs/frontend-migration/README.md:131` reads: "Do not use silent dependency downgrades, compatibility flags, or fallback implementations that change the intended architecture." Read against
  FM-042's Acceptance — "The implementation uses `position: sticky` within the existing document scroll model" — a JS-computed replacement for `position: sticky` is squarely a fallback implementation that changes the intended mechanism,
  and `:132` would then require it to be recorded under `Temporary Exceptions And Debt` with a removal condition. That is a disclosure obligation, not an outright prohibition; but the option that avoids needing the disclosure is the
  better one when it exists.
- **FM-042's own boundaries.** Its Out Of Scope section fences `AppShell.tsx` and `router.tsx` and states plainly: "Converting the results area into its own scroll container, or making the shell header fixed, would change the shared
  page scroll model for every route and is not authorized here." It also fences `core/ui-react/src/app/theme.ts` ("FM-043's territory; read its tokens, do not edit them"). Its `Files Allowed To Modify` covers `SearchResults.tsx`,
  `SearchResults.test.tsx`, new sibling modules under the same directory, this task's block in `results.spec.ts`, three `FEATURES.yaml` records' `visual`/`tests` fields, `STATUS.md`, and the packet — it does **not** cover
  `RefineSidebar.tsx`. Any option requiring a change to `RefineSidebar.tsx` or to `theme.ts` needs the task designer to widen that list.
- **Registry state — re-verified, because the original Option E got this wrong.** `F-SEARCH-RESULTS` (`FEATURES.yaml:202-246`) is `visual.status: proposed` (`:214`). `F-SEARCH-SORT-FILTER` (`:247-291`) is `visual.status: proposed`
  (`:259`). **Neither record is accepted**, and human acceptance for both is outstanding. Both viewport lists are `[{desktop, 1280, 800}, {mobile, 390, 844}]` (`:219`, `:264`). Checks that bear directly on the options below:
  - `:221` — "the results-toolbar and search-results-table regions each render with no horizontal overflow at 1280x800 and 390x844" (`proposed`).
  - `:227` and `:267` — the header row "measures shorter at desktop than the 63.25px it measured before FM-045", baselined to a measurement taken at 1280x800 against commit `89286c376` (both `proposed`).
  - `:233` — "every row's title cell stays free of `scrollWidth` overflow at both 1280x800 and 390x844" (`proposed`); `:234` makes the same claim for a recency-flagged row's own box.
  - `:270` — "every sortable column header (title, indexer, category, size, grabs/details, age) renders its full label at desktop with no `scrollWidth` overflow of its own box…" (`proposed`). This is the check `TABLE_MIN_WIDTH = 1320`
    was calibrated to satisfy.
  - `:215` — `F-SEARCH-RESULTS`'s own note asserts that "FM-034's 1700px page container and `.result-*` column ratios remain true and unchanged" (`proposed`).
  `F-SEARCH-PAGING` (`:375-402`) holds an `accepted` check about the load-more controls sitting immediately above the toolbar. `C-RESULT-TABLE` (`COMPONENTS.yaml:164-173`) owns `core/ui-react/src/features/search/results` and is
  `state: partial`. No option below removes or renames a `data-testid`.
- **Legacy's stacked-card breakpoint.** `tables.less:91` opens the stacked-card block with `@media (max-width: @screen-xs-max)`. `@screen-xs-max` is **not** defined in any tracked file: Bootstrap 3 arrives as the gitignored bower
  dependency `bootstrap-less ~3.3.4` (`core/bower.json`; `.gitignore:8` excludes `/bower_components`), and `core/ui-src/less/bootstrap.less:8` records that its `variables.less` is imported elsewhere. The resolved value was therefore
  confirmed from the **compiled** stylesheet rather than assumed: `core/src/main/resources/static/css/bright.css` emits `@media (max-width: 767px)` for those blocks (e.g. `:2814`, `:4601`, `:4697`, `:4819`, `:4915`). Legacy's stacking
  breakpoint is **767px**. MUI's `sm` is 600px and `md` is 900px, so legacy's real breakpoint sits between them.

### Corrections To This ADR's Earlier Text

1. **The stacked-card breakpoint cost was mis-framed.** The earlier Option E said that raising the stacking breakpoint from `sm` to `md` "changes accepted responsive behavior". Raising it *is* required — eight columns cannot render
   legibly at 600px — but the direction is toward legacy, not away from it: legacy stacks below **767px**, `sm` is 600px, `md` is 900px. That said, the earlier framing overstated the fix and this revision should not overstate it in the
   other direction: `md` overshoots legacy by 133px where `sm` undershoots by 167px, so `md` is nearer legacy but only by 34px. Matching legacy exactly means a 768px breakpoint, which is either a raw media query inside
   `SearchResults.tsx` or a `theme.breakpoints.values` change — and `theme.ts` is explicitly out of FM-042's scope. Separately, the responsive behavior in question is not "accepted": both governing records are `proposed`.
2. **`F-SEARCH-SORT-FILTER`'s header-label check is not accepted.** The earlier Option E said it collided with that record's "**accepted** check". The check exists (`FEATURES.yaml:270`) but its record's `visual.status` is `proposed`
   (`:259`), with human acceptance outstanding. This ADR's own Context section said so correctly at the time (and still does), so the earlier Option E contradicted this document's own evidence. Re-proposing that check costs a
   re-evidencing pass, not the withdrawal of a human acceptance.

Two further errors in the earlier Option E text are corrected in place above and repeated here so the record is honest in both directions, since both cut *against* the option rather than for it: the mock's "940px minimum for ten
columns" is inert (its real floor is ~1044px, and it scrolls horizontally below that with a hard 240px Title floor), and the claim that removing the floor is "mostly deletion" does not survive contact with `TABLE_MIN_WIDTH`'s measured
calibration — see Option E's costs.

## Options

**Outcome (2026-08-18).** **Option E was selected**, with sub-decision **E-title (i) wrap**. Options A, B, C, and D were considered and not selected. All five options, and every benefit and cost recorded against them, are preserved below
exactly as they were weighed — in particular Option D, which was this ADR's prior recommendation and remains the only option under which nothing is ever compressed, rewrapped, or truncated. Nothing in this section was rewritten by the
acceptance.

### Option A: Hand-rolled "faux sticky" — JS-computed positioning plus a scroll listener, header left inside the horizontal-scroll wrapper

- Keep the wrapper exactly as it is and replace `position: sticky` on the header with JS: measure the page scroll offset on every scroll event and push the header row down by that amount (`position: fixed` is not actually usable on a
  `<tr>`/`<th>` — removing the row from table flow collapses the column widths and jumps the body up — so in practice this becomes a `transform: translateY(...)` or `top` offset recomputed per frame, clamped to the table's own bounds).
- Benefits: no duplicated markup, no new scroll container, no change to the document scroll model, and the packet's "changes no shared layout file" constraint survives untouched. Column widths stay correct for free because the header
  cells never leave the table.
- Costs: it is a from-scratch reimplementation of a native CSS feature, which `README.md:131` cautions against and `:132` would require recording as debt with a removal condition; it runs on the main thread rather than the compositor,
  so it jitters under fast scrolling unless carefully rAF-throttled; it must independently handle resize, zoom, font swap, sidebar collapse, compact-row density changes, and the table's own horizontal `scrollLeft`; and it silently
  breaks the moment anything about the layout changes, in a way no jsdom test can catch. It buys the least architectural change at the price of owning a permanent, fragile, hand-maintained mechanism.

### Option B: Shadow header — an `aria-hidden` duplicate header outside the scroll wrapper, synced to column widths and horizontal offset

- Render a second, visually identical header outside the horizontally-scrolling `<table>`, position it sticky against the document, and keep it in sync with the real header's measured column widths and the body wrapper's `scrollLeft`.
- Benefits: the visible pinned header is a genuine `position: sticky` element in the document scroll model; horizontal scroll behavior is unchanged; the real table markup keeps its correct semantics underneath.
- Costs: duplicated markup with two sources of truth for column geometry, resynchronized on every resize, density change, and horizontal scroll. The accessibility cost is real and unavoidable: the header carries interactive controls —
  each column's sort button, and FM-046's tri-state select-all checkbox with its caret `Select all`/`Deselect all`/`Invert selection` menu. If the shadow copy is `aria-hidden`, those controls are visible but invisible to assistive
  technology and (if focusable) become focus traps that screen readers cannot announce; if the shadow copy is made the real interactive one instead, the underlying header must be hidden from AT and every control's state, focus order,
  and menu anchoring exists twice. Either way a sighted keyboard user and a screen-reader user get materially different affordances from the same visual control, which is exactly the class of divergence `ADR-0004`'s independent
  accessibility gate exists to catch. It also doubles the `data-testid` surface for `sort-{{column}}` and the selection controls unless the duplicate is deliberately left untagged, and `F-SEARCH-SORT-FILTER`'s `:266` check that "each
  sortable header cell renders exactly one button" would need re-reading against two headers.

### Option C: Scope down — native sticky only where the table already fits, and no sticky header wherever it must scroll horizontally

- Apply the horizontal-scroll wrapper conditionally: when the table fits its column, render no overflow wrapper at all so native document-scroll sticky engages; when it does not fit, keep the wrapper and accept a non-sticky header.
  Refine FM-042's Acceptance and both feature contracts to say so, and record the limitation as a `proposed` ADR-0006 variance.
- Benefits: cheapest by a wide margin; invents no new interaction surface; adds no duplicated markup, no JS positioning, and no accessibility risk; keeps the document scroll model exactly as it is.
- Costs: note first that this is *not* a no-op — the wrapper must become conditional, because `overflow-x: auto` makes the element a scroll container even when nothing overflows, so today's unconditional wrapper defeats sticky at every
  width. More seriously, by the arithmetic above the table overflows at the contract's own 1280x800 desktop viewport in **both** sidebar states, so this option plausibly delivers no sticky header at any viewport the visual contract
  actually evidences, and only at roughly ~1600px and wider. Against ADR-0009 — whose accepted decision quotes the owner asking for "the table with the sticky header" and calls it one of four named structural gaps — that is close to
  declining to deliver the feature while recording the decline as a variance. ADR-0006 permits exactly that, but only on explicit human acceptance, which is precisely why it belongs in this ADR rather than in a packet refinement.

### Option D: Adopt the mock's own scroll model — one bounded-height, dual-axis scroll container for the results region at `sm` and up

- Replace the horizontal-only wrapper with a single scroll container that scrolls **both** axes and has a viewport-derived bounded height, exactly as the mock's `<main ... height:100%;overflow:auto>` does. The CSS interaction rule that
  breaks the current attempt then becomes harmless rather than worked around: the container really is the nearest scrolling ancestor, and it really does scroll vertically, so `position: sticky` on the header engages natively against
  it. Horizontal scroll stays contained in the same element, so the page still never scrolls sideways.
- This is also MUI's own documented frozen-header pattern (`TableContainer` with a bounded height plus `Table stickyHeader`), which `ADR-0002` favors over the currently hand-written per-`TableCell` sticky `sx`, and it uses no new
  dependency and no bespoke control.
- The already-working measurement machinery is reused, not discarded: the toolbar stays document-sticky above the container and `toolbarHeight` becomes the input to the container's derived top/height instead of the header's `top`, so
  FM-042's "derived, not a hardcoded `51px`" requirement is satisfied by the same `useLayoutEffect`/`ResizeObserver`/`MutationObserver` code that already exists.
- Applies at `sm` and up only. Below `sm` the responsive styling already hides `thead` and renders stacked cards, and nested touch scrolling is genuinely worse than document scrolling on a phone, so the mobile branch keeps the document
  scroll model unchanged — which is already how FM-042's mobile acceptance is written (toolbar-only sticky region, at most 40% of the 844px viewport).
- Benefits: native CSS, no scroll listener, no duplicated markup, no accessibility divergence between the visual and the accessibility tree, no new `data-testid`; the header is pinned at **every** width at `sm` and up; it moves the
  implementation *toward* the mock's structure rather than compensating for a divergence from it; and, uniquely among the options, **nothing is ever put under horizontal pressure** — the `1320`/`1520` floors and the current column
  ratios, header typography, and title rendering all survive untouched, so no existing geometry check needs recalibrating and no character of a release title is ever hidden or rewrapped.
- Costs, stated plainly: the result list stops scrolling with the document at `sm` and up, so a second scrollbar appears and the page gains a nested scroll region — a real UX change users will notice, the one thing FM-042's Out Of Scope
  section deliberately fenced, and a divergence from legacy, which has no nested scroller anywhere near the results table. Deriving the container's height is fiddly: it must track the container's own viewport-relative top as the document
  scrolls above it (the search form, alerts, and the load-more controls all sit outside it), so the region likely has to be pinned rather than merely max-height-capped, and getting that wrong produces either a stunted table or a double
  scrollbar. Keyboard and AT access requires the container to be focusable with an accessible name (`tabindex={0}` plus `role="region"`/`aria-label`) so keyboard-only users can scroll it at all — a WCAG 2.1.1 obligation that must be an
  explicit acceptance criterion, not an afterthought. `results.spec.ts`'s scrolled-state block must scroll the container rather than the window. And "no page horizontal overflow" changes meaning for
  `F-SEARCH-RESULTS`/`F-SEARCH-SORT-FILTER`: it stays true, but it is now true because the container clips, which should be re-evidenced rather than assumed. It also keeps the status quo in which a user at 1280x800 must scroll sideways
  to read the Actions column at all — the option removes the sticky-header conflict without removing the sideways scrolling that caused it.

### Option E (recommended): Make the table never scroll horizontally, as legacy does — delete the floor and the wrapper, let the Title column absorb the squeeze

This is the repository owner's own proposal, specified here in full.

**Mechanism.**

- Delete `minWidth: tableMinWidth` (`SearchResults.tsx:927`), the `TABLE_MIN_WIDTH` constant (`:104`), and `tableMinWidth`'s derivation (`:461-463`). Delete the `overflowX: "auto"` wrapper (`:850`) **entirely** rather than merely
  emptying it — an `overflow-x: auto` element is a scroll container even when its content fits, so leaving it in place defeats sticky at every width. `SearchResults.tsx:844`'s `<Box sx={{minWidth: 0, width: "100%"}}>` and everything
  above it set no `overflow`, and FM-042's own reading of `AppShell.tsx`/`router.tsx` confirms no ancestor scroll container exists, so the document becomes the header's nearest scrolling ancestor and `position: sticky` engages natively
  with **no** workaround, no duplicated markup, and no nested scroll region. The existing per-`TableCell` sticky `sx` and the `toolbarHeight` measurement machinery are kept exactly as they are.
- `tableLayout: "fixed"` + `width: "100%"` + the `<colgroup>` (`:868-870`, `:969-978`) already make the table fluid and proportional; nothing new is introduced to make it so.
- **Re-proportion the `<colgroup>`.** This is the part the original Option E missed and it is the real work. `TABLE_MIN_WIDTH = 1320` is not a bolt-on — its comment (`:97-104`) records it as the *measured* smallest width at which every
  header's `scrollWidth` still fits its `clientWidth`, the Age column's sort arrow being the binding constraint. At 1280x800 with the sidebar expanded the table gets ≈1000px, and at 5.5% that leaves the Age column ≈55px, minus the
  header cell's `px: 1` (16px) and the sort button's `px: 0.5` (8px) ≈ 31px of content box for an uppercase MUI `Button` label plus its arrow. It will ellipsize, and `FEATURES.yaml:270` will fail. The fix is that the ratios are a free
  parameter: Title has enormous slack (54% of 1000px ≈ 520px, far more than the mock's own 240px floor) and the metadata columns have none. Re-proportioning toward roughly `Title 40% / Indexer 11% / Category 10% / Size 9% / Details 8% /
  Age 7% / Actions 11%` gives Age ≈70px (≈46px of content box) while leaving Title ≈400px, and keeps `:222`/`:269`'s "Title exceeds twice Indexer" comfortably true at 3.6x. Adopting the mock's 11px header-label typography and its
  `padding:0 4px` instead of MUI `Button`'s uppercase 13px with `minWidth`/letter-spacing is the complementary lever, and is aligned work rather than a divergence, since ADR-0009 already mandates the mock's density. **Every number in
  this paragraph is derived from constants, not browser-measured, and must be measured before it is relied on.** The one number that *is* measured — 1320 — says unambiguously that the current ratios do not fit at 1000px.
- **Raise the stacked-card breakpoint.** Eight columns cannot render legibly at 600px, so the `theme.breakpoints.down("sm")` stacked-card block (`:929-966`) must move to `md` (900px) or, to match legacy exactly, to a 768px media query.
  Legacy stacks below 767px, so either choice is nearer legacy than today's 600px; `md` overshoots by 133px, a 768px query matches. The complication is ownership: the table's branch and the sidebar's drawer branch are the *same*
  definition, `useCompactRefineSurface()` (`RefineSidebar.tsx:55-58`), and `RefineSidebar.tsx` is not in FM-042's `Files Allowed To Modify`. Moving them together requires the task designer to widen that list; moving only the table's
  branch creates a new, undesigned state between the two breakpoints in which a 248px docked sidebar sits beside a stacked-card table. A `theme.breakpoints.values` change is not available — `theme.ts` is FM-043's territory and
  explicitly out of scope.
- **Give the Title cell a break rule** — the one genuine functional gap, and the subject of the sub-decision below.

**Sub-decision E-title: how an over-long release title behaves.** Release names are dot-separated with no spaces, so a browser treats one as a single unbreakable word. With no break rule and no `min-width` floor, the Title cell will
neither wrap nor shrink; it will simply spill over the adjacent column. This is not optional polish — Option E does not function without an answer. Legacy and the mock answer it differently, so neither artifact settles it:

- **(i) Wrap** — `overflow-wrap: anywhere` (the modern spelling; legacy's `word-break: break-word` at `type.less:33` is a deprecated alias) on the title cell, matching `search-result.html:3`'s `.text-break`. Preserves every character of
  the title. Cost: variable row heights that depend on content *and* viewport width. Checked against FM-041's contract, this does not break either of its checks as literally phrased — `FEATURES.yaml:232`'s idempotence claim ("the
  table's height … returns to exactly that value after Compact rows is switched on and off again") still holds because wrapped heights are deterministic at a fixed width, and `:233`'s "measurably reduces the table's height" still holds
  — but it does make any future fixed-row-height assumption harder, notably the deferred FM-034 row-virtualization follow-up.
- **(ii) Ellipsis** — `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` on the `<Box>` at `:1509`, matching the mock at `:287`. Uniform row heights, tidier, and mock-faithful. Cost: it hides the tail of long release
  names, which is where the tokens users scan for live (resolution, codec, release group), and there is **no** `<Tooltip>` and no HTML `title=` attribute anywhere in `SearchResults.tsx` to recover them — adding one is new scope and a
  new accessibility surface. It is also only half of the mock's pattern: the mock pairs ellipsis with a hard `minmax(240px,1fr)` Title floor (`:258`) and horizontal scrolling below it, both of which Option E deliberately discards.
- **(iii) Clamp to N lines** — `overflow-wrap: anywhere` plus `display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden`. Viable and widely supported, and it bounds row height while preserving most of
  the title. But it combines both costs — it still truncates, so it still wants a tooltip, and heights still vary with density — for a middle benefit.
- **Recommendation: (i) wrap.** Three repository reasons. It is what the legacy view this table is migrating from actually does, and Option E's entire premise is that legacy's fluid table is the right model — adopting legacy's layout
  while rejecting the break rule that makes legacy's layout work would be incoherent. It is the only choice that loses no information, and the missing-tooltip fact means (ii) loses information with no recovery affordance. And the mock's
  ellipsis is not separable from the 240px floor and the horizontal scrolling that Option E is specifically dropping, so (ii) is not the mock-faithful choice it appears to be. If the owner prefers uniform row heights strongly enough to
  accept hidden title tails, (iii) with a two-line clamp plus a `title` attribute is the better version of that preference than (ii).
- **No `data-testid` or attribute contract is affected by any of the three.** `data-result-title` sits on the `<tr>` (`:1380`) and carries the full, untruncated title regardless of rendering; `data-testid="search-result-title"` sits on
  the cell (`:1300`, applied at `:1431`) and is untouched. `FEATURES.yaml:233`'s "title cell stays free of `scrollWidth` overflow" passes under (i) and, because the ellipsis would be applied to an inner `<Box>` whose own overflow is
  hidden, under (ii)/(iii) as well — it fails only in the *current* state, i.e. if the floor is removed with no break rule at all.

**Benefits.**

- Structurally the simplest end state of any option: no wrapper, no faux sticky, no duplicate header, no nested scroller, no JS mechanism, no accessibility divergence, and the app-wide document scroll model untouched on every route
  including this one. Nothing needs disclosing under `README.md:131-132`.
- Native `position: sticky` engages at **every** width at and above the stacking breakpoint, including 1280x800 in both sidebar states — the exact viewport every geometry check is asserted at, and the thing Option C cannot deliver. It
  therefore satisfies ADR-0009's named "fixed table header" gap fully, not partially.
- It matches the legacy application's own verified behavior (`tables.less:17-23`, `search-results.html:289`, and the deliberate absence of the `table-responsive` wrapper that seven other legacy tables do use), which is the migration's
  baseline parity target.
- The user-visible outcome the owner asked for is the same one Option D produces — a pinned header over a table that never scrolls the page sideways — reached by deleting mechanism rather than adding it, and without a second scrollbar.
- At the owner's ~1900px design target (≈1652px of table) every column is comfortable by the same arithmetic that says 1280 is tight, so the option degrades gracefully rather than being a compromise at its intended width.

**Costs, stated plainly.**

- It is **not** "mostly deletion". The measured `1320` constant means the current ratios and header typography demonstrably do not fit at 1280x800, so re-proportioning the `<colgroup>` and/or restyling the header labels is required
  work, and `FEATURES.yaml:270`'s header-label check plus `:215`'s claim that "FM-034's … `.result-*` column ratios remain true and unchanged" must both be re-proposed. Both records are `proposed`, so this costs a re-evidencing pass,
  not a withdrawn acceptance — but it is a real pass, and the ratios in question are the ones legacy itself uses, so the divergence should be recorded rather than absorbed silently.
- It widens FM-042's file scope beyond what the packet allows, if the table's and the sidebar's breakpoints are to stay aligned (`RefineSidebar.tsx`), and it forecloses the exact-legacy 768px breakpoint unless a raw media query is used,
  because `theme.ts` is out of scope.
- Below the stacking breakpoint there is still no sticky header, because `thead` is hidden in the stacked-card layout. That is identical to Option D and to today, and matches FM-042's existing mobile acceptance, but it means "sticky at
  every width" is shorthand for "at every width the table renders as a table".
- Something must give when the viewport narrows, and under (i) that is row height, under (ii)/(iii) it is title text. Option D is the only option where nothing gives. If the owner's true requirement is "never compress, never truncate,
  never rewrap", Option E cannot satisfy it and Option D is the answer.
- The non-title body cells are `whiteSpace: "nowrap"` (`:1447`) with no ellipsis guard of their own, so a long category or indexer value may spill at compressed widths. Whether it actually does is unmeasured.
- It diverges from the mock's scroll model deliberately — see **Divergence from the mock** below.

**Divergence from the mock, and whether it needs an ADR-0006 variance.**

ADR-0009 makes the mock authoritative for palette, typography, density, and "exact structural patterns", and names four gaps the owner asked for. The mock's `main{overflow:auto}` is not one of those four; it is prototype shell
scaffolding, and FM-042's own `Context To Read` already declares the mock's "fixed-viewport shell … beyond the offsets themselves" non-authoritative. On that reading Option E does not contradict any named ADR-0009 pattern — it delivers
the named one (a fixed table header) by a different means. But the divergence is real and user-visible in a way the mock's *markup* states explicitly: the mock's Title track has a hard `minmax(240px,1fr)` floor and its grid's intrinsic
minimum is ~1044px, so the mock scrolls horizontally below that width and never compresses Title past 240px; Option E never scrolls and compresses Title freely. **Verdict: yes, record it** — one `proposed` ADR-0006 variance on
`F-SEARCH-RESULTS` stating that the results table diverges from the mock's dual-axis scroll model in favor of legacy's always-fluid table, and, if sub-decision (i) is chosen, a second stating that titles wrap (legacy) rather than
ellipsize (mock). Both are subject to human acceptance like any other variance; recording them is what keeps the migration's history honest about a deliberate choice, and costs a paragraph.

## Evidence Viewports

**Decided (2026-08-18): the "cheapest honest shape" below was selected** — `desktop-wide 1900x1000` is added as a second desktop evidence viewport, scoped to this decision's own states only, and `1280x800` is retained as *the* desktop
evidence viewport. See **Human Decision**. The assessment that produced that shape follows, unchanged:

The owner raised ~1900px as the design target. This proposer's assessment, offered for decision rather than assumed:

- **Keep 1280x800 as the desktop evidence viewport and add ~1900x1000 as a second, rather than moving to 1900.** 1280 is precisely where Option E is under pressure — it is the width at which the measured `1320` floor says the current
  columns do not fit, so it is the only viewport that evidences the behavior the whole option rests on. At 1900 nothing is under pressure, so it proves the design target is comfortable and little else. 1366x768 laptops remain common and
  a browser viewport is narrower than the screen it sits on, so 1280 also remains the more representative of the two.
- **Moving off 1280 would orphan a measured baseline.** `FEATURES.yaml:227` and `:267` are both baselined to a header height of `63.25px` measured at 1280x800 against commit `89286c376`. Changing the desktop viewport would make that
  number meaningless and force a fresh measurement of an already-measured value for no gain.
- **Cost of adding a third viewport, honestly.** Both records list exactly two viewports (`:219`, `:264`) and most of their ~28 geometry checks are phrased "at desktop" or "at 1280x800 and 390x844". A third entry named `desktop` would
  make "at desktop" ambiguous, so it needs a distinct name (`desktop-wide`) and an editorial pass deciding, per check, whether it applies at both desktop widths. Playwright evidence then runs at three viewports instead of two, and human
  visual acceptance under ADR-0006 is permanently against three. Both records are `proposed`, so no acceptance is lost.
- **Cheapest honest shape:** add `desktop-wide 1900x1000` scoped to *this* decision's own states only — FM-042's `scrolled-sticky-toolbar-and-header` and `scrolled-popover-above-sticky`, plus a new title-collapse state — and leave the
  existing checks phrased against 1280x800 alone. That buys the evidence the owner's design target deserves without a global re-phrasing of two records.

## Required Re-Measurement Before Any Option Is Relied On

**This section survives the 2026-08-18 acceptance in full and is not discharged by it.** Accepting Option E settles the scroll model, the title break rule, and the evidence viewports; it settles **no measurement**. Every item below
remains an obligation on the FM-042 implementation, to be satisfied with real browser evidence before the numbers it depends on — above all the re-proportioned `<colgroup>` — are relied on.

Flagged explicitly because several numbers above are computed from repository constants rather than observed in a browser:

- **Do all eight columns' full labels fit legibly at ~1000px of table width (1280x800, sidebar expanded)?** With today's ratios and header typography the answer is known to be **no** — `TABLE_MIN_WIDTH = 1320` is a measured value and
  1000 < 1320. What must be measured is the *revised* configuration: the re-proportioned `<colgroup>` and whichever header typography is adopted, checked against `FEATURES.yaml:270`'s `scrollWidth`-versus-`clientWidth` criterion at
  1280x800 in both sidebar states, and again at 1900x1000.
- The ≈1000px and ≈1200px table widths at 1280x800, and the ≈1652px at 1900, are arithmetic from `EXPANDED_WIDTH`/`COLLAPSED_WIDTH` and assumed padding. Measure them.
- The claim that removing both declarations leaves the document as the header's nearest scrolling ancestor follows from FM-042's reading of `AppShell.tsx`/`router.tsx` and from `:844` setting no overflow. Confirm it in a browser, to
  the same standard the wrapper's `overflowY: "auto"` behavior was confirmed to.
- Under sub-decision (i), measure the resulting row-height distribution against FM-041's `:232`/`:233` checks rather than assuming the reasoning above holds.
- Whether the non-title `nowrap` cells spill at compressed widths.
- **Sticky `<th>` under `border-collapse: collapse` — common to A, B, D, and E, not a cost of any one option.** The table uses collapse; the in-code comment at `:1390-1394` records that this is why FM-041's recency stripe is drawn as an
  inset `box-shadow` on the row's first cell, "because `border-collapse: collapse` suppresses a `<tr>`'s own box shadow". Collapsed borders are painted by the table, not by the sticky cell, so a sticky header's bottom border does not
  travel with it — a well-known browser behavior that must be verified against this Chromium build rather than assumed from folklore. Two remedies exist: draw the header's bottom edge as a `box-shadow` on the `<th>` (the smaller
  change, and consistent with how the recency stripe is already drawn), or switch the table to `border-collapse: separate` as legacy does (`tables.less:22`). The second is the larger change and interacts with the recency stripe's stated
  rationale, since under `separate` the stripe could return to the `<tr>` — which would be a gratuitous change to FM-041's delivered, evidenced behavior. **Recommended: `box-shadow` on the `<th>`, leaving `collapse` and the stripe
  untouched.** Either way this is FM-042 work under every option, and it belongs in the refined packet rather than in this decision.

## Recommendation

**The recommendation changes from Option D to Option E.** It changed because the single argument that decided it for D no longer distinguishes them, and because two costs charged against E were wrong.

The original recommendation rested on D being "the only option that delivers the header at the viewport the evidence is actually captured at". That was true against Options A, B, and C, and it is still true against them. It is not true
against Option E: E delivers a native, unworked-around `position: sticky` header at 1280x800 in both sidebar states, at 1900, and at every width down to the stacking breakpoint. Once both options deliver the named ADR-0009 gap fully,
the comparison turns on what each costs to get there — and E adds no nested scroll region, no second scrollbar, no `tabindex`/`role="region"` obligation to make a scroller keyboard-reachable, no re-pointing of `results.spec.ts`'s
scrolled assertions from the window to a container, and no fiddly viewport-derived height that must track its own position as the document scrolls above it. E gets there by deleting two declarations; D gets there by adding a scroll
container the packet's Out Of Scope section deliberately fenced.

E is also the option that matches the application being migrated. Legacy's results table is `width: 100%` with no `min-width` and no scroll wrapper, in an application whose seven other tables *do* use Bootstrap's `table-responsive`
horizontal scroller — the absence is a decision, not an oversight. Migration parity is the default this project reasons from, and D is the option that diverges from it.

Against that, the corrections cut in E's favor without making it free, and the honest statement of where D still wins is this: **D is the only option under which nothing is ever compressed, rewrapped, or truncated.** Column ratios,
header typography, and title rendering all survive it untouched, no `FEATURES.yaml` check needs recalibrating, and no character of a release title is ever hidden. E buys its simplicity by spending the Title column's slack, and the
measured `1320` constant proves that spending it requires re-proportioning the columns and re-proposing two `proposed` checks. If the repository owner's requirement is that the table's information density never degrades with viewport
width, D is the correct answer and E is not. If the requirement is the one the owner stated — legacy's behavior, a fluid table, a native sticky header, no nested scrolling, comfortable at ~1900px and gracefully collapsing below it — E
delivers it with less machinery than any other option here.

Options A, B, and C remain not recommended, for the reasons already stated: A trades a permanent hand-maintained mechanism for the smallest possible diff; B buys a pinned header at the price of an accessibility divergence between what
sighted users see and what assistive technology reports; C plausibly delivers no sticky header at any evidenced viewport, which against ADR-0009's named gap amounts to recording a decline rather than shipping the feature.

Within Option E, the recommended sub-decision is **(i) wrap**, for the reasons under E-title.

A recommendation is not a decision. Nothing here is accepted until the repository owner selects an option, and the owner having proposed Option E is not acceptance of it — this proposer's job was to test the proposal against the
repository, report where it held and where it did not, and say plainly what it now thinks. It thinks E is right. The decision is the owner's.

*(The owner subsequently made that decision, explicitly, on 2026-08-18: Option E with sub-decision (i) wrap. The paragraphs above are the recommendation as it stood before the decision and are preserved unchanged; the decision itself is
recorded under **Human Decision**.)*

## Human Decision

- **Decision-maker:** the repository owner.
- **Date:** 2026-08-18.
- **How it was given:** explicitly. The owner was presented with the full option set, the conditional sub-decision, and the viewport question — each with this ADR's recommendation shown first — and selected from those presented options.
  This is an explicit choice, not an inference from silence and not an acceptance read out of the recommendation.

**1. Scroll model — Option E: never scroll horizontally, as legacy does.** The results table stays fluid. The Title column absorbs the squeeze. The `overflowX: "auto"` wrapper (`SearchResults.tsx:850`) and the `TABLE_MIN_WIDTH` floor
(`:104`, with `tableMinWidth` at `:461-463` and the `minWidth` rule at `:927`) are removed, so no scrolling ancestor exists between the header cells and the document and native `position: sticky` column headers work at every width at and
above the stacking breakpoint.

**2. Sub-decision E-title — (i) wrap.** `overflow-wrap: anywhere` on the title cell, which is legacy's behavior (`search-result.html:3`'s `.text-break`). Not (ii) ellipsis, not (iii) clamp-to-two-lines. The owner accepted variable row
heights as the cost of this choice. The deciding factor, as presented and acted on: there is no `<Tooltip>` and no HTML `title=` attribute anywhere in `SearchResults.tsx`, so ellipsizing would hide the tail of long release names with no
recovery affordance.

**3. Evidence viewports — add `desktop-wide 1900x1000`, scoped to this decision's own states only.** `1280x800` is retained as the desktop evidence viewport, for two reasons as presented: it is the width that actually puts the design
under pressure, and moving off it would orphan the measured `63.25px` header-height baseline that `FEATURES.yaml:227` and `:267` are pinned to. The new viewport is deliberately **not** applied across the ~28 existing "at desktop" checks
in `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER`, so that no per-check editorial pass is incurred.

**The owner's framing when proposing the approach, recorded as intent:** a ~1900px viewport gives roughly 1650px of table beside the 248px sidebar, so nothing is cramped at that width; below it, the Title column collapses gracefully
because it is by far the widest column.

- **Options A, B, C, and D were considered and not selected.** Their benefits and costs stand in the **Options** section as the record of what was weighed. Option D in particular was this ADR's prior recommendation and remains the only
  option under which nothing is ever compressed, rewrapped, or truncated; it was not chosen, and it is not deleted.
- **What this acceptance does not settle.** It does not discharge any item under **Required Re-Measurement Before Any Option Is Relied On**, and it is not visual acceptance of anything: `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER`
  remain `visual.status: proposed`, and the two ADR-0006 variances this decision creates remain `proposed` and separately subject to human acceptance.

## Consequences

The consequences that now govern are those of the accepted path — **Option E, sub-decision (i) wrap, and a scoped `desktop-wide 1900x1000` viewport**. The first group below was true under every option and remains true under the accepted
one; the Option E group states what the accepted decision concretely obliges. The groups for the options that were not selected are retained beneath them as record only and are not in force.

Consequences that held under every option and hold under the accepted one:

- A human has now selected an option (2026-08-18), so this ADR is `accepted` and is authority. FM-042's packet is nonetheless still `Status: blocked` as written: the **task designer** — not this proposer and not an implementer — must
  refine the FM-042 packet, replace the blocking proposal with this accepted ADR under `Decision Dependencies`, widen `Files Allowed To Modify` as stated below, and unblock the task. No implementer may act on this ADR before that
  refinement.
- No `data-testid` is removed or renamed under any option, the accepted one included. Option B is the only one that would *add* a duplicate selector surface, and would need an explicit rule that the shadow header carries no `data-testid`.
- `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER` stay `visual.status: proposed`; human visual acceptance remains outstanding under ADR-0006 and is a separate decision from this one. `FEATURES.yaml` is currently unmodified and must stay
  that way until the implementing task produces the browser evidence its contract cites — the FM-042 implementer's revert of its own registry edits was correct and should not be undone.
- The scrolled-state contract must be evidenced in a real browser; a jsdom component test cannot detect any failure mode discussed here. FM-042's own Verification language already says so and is unchanged by this acceptance.
- The `toolbarHeight` measurement machinery in `SearchResults.tsx:493-554` survives and must not be rewritten; under the accepted option it keeps feeding the header's sticky `top` exactly as it does today.
- **The sticky-`<th>`-under-`border-collapse: collapse` border question must be resolved by FM-042, and the remedy is a `box-shadow` on the `<th>`** — drawing the header's bottom edge as a shadow on the header cell, leaving the table at
  `border-collapse: collapse`. Switching the table to `border-collapse: separate` is **not** the path: it would disturb FM-041's delivered, evidenced inset recency stripe (`SearchResults.tsx:1390-1394`, which exists in that form
  precisely because `collapse` suppresses a `<tr>`'s own box shadow) for no benefit. Whether a collapsed table actually drops the sticky header's bottom border must still be verified against this Chromium build rather than assumed from
  folklore.

Additional consequences of the accepted **Option E**:

- FM-042's Acceptance keeps `position: sticky` and the existing document scroll model verbatim; the Out Of Scope bullet forbidding a results-area scroll container needs no change, because E adds none. What the task designer must add
  are criteria for the table never producing horizontal overflow of the page or of its own box at any width at or above the stacking breakpoint, and for the header's labels rendering in full at 1280x800 in both sidebar states.
- `SearchResults.tsx` loses `TABLE_MIN_WIDTH` (`:104`), `tableMinWidth` (`:461-463`), the `minWidth` rule (`:927`), and the `overflowX: "auto"` wrapper (`:850`) — the wrapper deleted outright, not emptied, since an `overflow-x: auto`
  element is a scroll container even when its content fits. It gains `overflow-wrap: anywhere` on the title cell per the accepted sub-decision (i), a re-proportioned `<colgroup>` (`:969-978`), a moved stacked-card breakpoint (`:929`),
  and probably revised header-label typography on `:1053-1109`.
- **The `<colgroup>` must be re-proportioned; this is required work, not optional polish.** At ~1000px of table (1280x800, sidebar expanded) the metadata columns have no slack — at 5.5% the Age column gets ≈55px, ≈31px of content box
  after the header cell's `px: 1` and the sort button's `px: 0.5`, which will ellipsize and fail `FEATURES.yaml:270` — while Title at 54% has ≈520px, far more slack than it needs. The re-proportioning therefore moves width *from* Title
  *to* the metadata columns (the direction sketched under Option E: roughly `Title 40% / Indexer 11% / Category 10% / Size 9% / Details 8% / Age 7% / Actions 11%`). **Those percentages are derived from constants, not browser-measured,
  and this acceptance does not make them settled**: the requirement that all eight columns render their full labels legibly at ~1000px of table width, judged by `FEATURES.yaml:270`'s `scrollWidth`-versus-`clientWidth` criterion at
  1280x800 in both sidebar states and again at 1900x1000, must be re-measured in a real browser before the chosen ratios are relied on. The only measured number in play — `TABLE_MIN_WIDTH = 1320` — says only that today's ratios do
  *not* fit; it says nothing about which replacement does.
- **The stacked-card breakpoint must move**, because eight columns cannot render legibly at 600px. Legacy stacks below 767px; `sm` is 600px and `md` is 900px, so either `md` or a raw 768px media query is nearer legacy than today, and
  `theme.breakpoints.values` is not available because `theme.ts` is FM-043's territory and out of FM-042's scope.
- **`RefineSidebar.tsx`'s `useCompactRefineSurface()` (`:55-58`) is the single shared source of truth** for both the table's stacking branch and the sidebar's drawer branch, so **the task designer must widen FM-042's `Files Allowed To
  Modify` to include `RefineSidebar.tsx`** for the two to move together. If they are deliberately decoupled instead, the new state between the two breakpoints — a docked 248px sidebar beside a stacked-card table — needs designing and
  evidencing, and that must be an explicit decision in the refined packet rather than a side effect.
- `FEATURES.yaml:270`'s header-label check and `:215`'s "`.result-*` column ratios remain true and unchanged" note must be re-proposed with fresh evidence against the new ratios. `:221`'s no-horizontal-overflow check stays true and
  becomes true for a better reason — the table fits, rather than a wrapper clipping it — and should be re-evidenced rather than inherited. `:222`/`:269`'s "Title exceeds twice Indexer" is expected to survive re-proportioning and must be
  verified, not assumed.
- **Two `proposed` ADR-0006 variances are now required on `F-SEARCH-RESULTS`**, both live because sub-decision (i) was selected: (a) the results table diverges from the mock's dual-axis scroll model in favor of legacy's always-fluid
  table — the mock has a hard `minmax(240px,1fr)` Title floor and scrolls horizontally below its ~1044px intrinsic minimum, and this decision does neither; and (b) release titles **wrap** (legacy) rather than ellipsize (mock). Both are
  recorded as `proposed` and both need explicit human acceptance like any other variance; accepting this ADR is not accepting them.
- `results.spec.ts` keeps scrolling the window; no assertion needs re-pointing at a container. A new state evidencing Title collapse at 1280x800 is required, and the mobile branch's assertions move to whichever breakpoint is chosen.
- **The evidence viewports change as decided above:** `desktop-wide 1900x1000` is added alongside the retained `desktop 1280x800`, scoped to this decision's own states only — FM-042's `scrolled-sticky-toolbar-and-header` and
  `scrolled-popover-above-sticky`, plus the new title-collapse state. The ~28 existing "at desktop" / "at 1280x800 and 390x844" checks in `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER` keep their current phrasing and are **not** re-scoped
  to the new viewport; no per-check editorial pass is authorized by this decision. The `63.25px` header-height baseline at `FEATURES.yaml:227`/`:267` stays measured at 1280x800 and is not orphaned.
- `F-SEARCH-PAGING`'s `accepted` check is expected to remain literally true, since DOM order does not change; FM-042's existing instruction to verify rather than assume it, and to demote it to `proposed` with a `note` only if it fails,
  stands unchanged.
- `C-RESULT-TABLE` gains a "fluid, never horizontally scrolling" layout responsibility worth recording when its record is next reconciled.

Additional consequences that **Option D** would have carried — retained as record; D was considered and not selected, so none of the following is in force:

- FM-042's Out Of Scope entry forbidding conversion of the results area into its own scroll container is superseded for the results region only, at `sm` and up. `AppShell.tsx` and `router.tsx` stay out of scope and untouched; every
  other route keeps the document scroll model. The task designer must rewrite that Out Of Scope bullet and the corresponding Acceptance sentence so the packet is internally consistent before implementation resumes.
- FM-042's Acceptance changes shape rather than being relaxed: "the header's sticky offset is derived from the toolbar's rendered height" becomes "the scroll container's top and height are derived from the toolbar's rendered height and
  the viewport", still measured, still never a hardcoded `51px`. Two new criteria are required: the scroll container is keyboard-scrollable with an accessible name, and the mobile branch below `sm` demonstrably keeps the document
  scroll model.
- `tests/system/tests/results.spec.ts`'s scrolled block must drive the container's scroll rather than the window's, and the existing "no page horizontal overflow" assertions must be re-evidenced against the new container rather than
  inherited.
- The column ratios, `TABLE_MIN_WIDTH`, the header typography, and the title rendering are all unchanged, so no `FEATURES.yaml` geometry check needs recalibrating; a `proposed` ADR-0006 variance recording the nested scroll region
  against legacy's document-scrolling results table is still warranted.
- `C-RESULT-TABLE` gains a scroll-model responsibility worth recording when its record is next reconciled.

Additional consequences that **Option C** would have carried — retained as record; not selected, not in force:

- The overflow wrapper must become conditional on measured fit; leaving it unconditional would deliver no sticky header at any width. FM-042's Acceptance must be rewritten to scope the sticky header to widths where the table fits, and
  a `proposed` ADR-0006 variance must be recorded on `F-SEARCH-RESULTS` stating plainly at which widths the header is not pinned — subject to human acceptance like any other variance.
- ADR-0009's sticky-header gap is then partially delivered. That should be stated in the accepted decision text rather than left implicit, so the migration's own history does not later read as if the gap were closed.

Additional consequences that **Option A or B** would have carried — retained as record; neither was selected, and neither is in force:

- Option A requires an entry under `Temporary Exceptions And Debt` in the implementation handoff with its reason, impact, removal condition, and follow-up, per `README.md:132`, since it substitutes a hand-rolled mechanism for the
  `position: sticky` the packet's Acceptance names.
- Option B requires an explicit accessibility decision in the refined packet — which header is exposed to assistive technology, where focus order runs, and how the select-all caret menu and per-column sort buttons behave from the
  pinned copy — plus component-level accessibility coverage for it, per ADR-0004's independent accessibility gate.

## Affected Work

- Blocked task, now requiring task-designer refinement because the decision exists: `docs/frontend-migration/tasks/FM-042-search-results-sticky-toolbar-and-header.md` (`Status: blocked`, `ADR REQUIRED`). Under the accepted Option E the
  refinement must also widen its `Files Allowed To Modify`, which currently excludes `RefineSidebar.tsx`.
- Implementation files: `core/ui-react/src/features/search/results/SearchResults.tsx` (`:104`/`:461-463`/`:927` width constants, `:850` wrapper, `:646-656` sticky toolbar, `:868-870` and `:969-978` fixed layout and colgroup, `:990-994`
  and `:1053-1109` sticky header cells and sort buttons, `:493-554` measurement effect, `:1295-1302` and `:1380`/`:1431` title column and its attributes, `:1390-1394` recency stripe and the `border-collapse` comment, `:1447` the title
  cell's `whiteSpace`, `:929-966` the stacked-card block), `core/ui-react/src/features/search/results/SearchResults.test.tsx` (`:1028-1085`), and
  `core/ui-react/src/features/search/results/RefineSidebar.tsx` (`:42-43` width constants, read-only for the arithmetic; `:55-58` the shared breakpoint hook, which Option E would need to modify).
- Browser evidence: `tests/system/tests/results.spec.ts` (FM-042's own block at `:1966-2230` and its helpers at `:2488-2530`).
- Registry records whose contracts change with the outcome: `F-SEARCH-RESULTS` (`FEATURES.yaml:202-246`; specifically `:215`, `:219`, `:221`, `:222`, `:227`, `:232-234`), `F-SEARCH-SORT-FILTER` (`:247-291`; specifically `:259`, `:264`,
  `:266`, `:267`, `:269`, `:270`), `F-SEARCH-PAGING` (`:375-402`, `accepted` check to verify), and `C-RESULT-TABLE` (`COMPONENTS.yaml:164-173`). `FEATURES.yaml` is presently unmodified and stays so until the implementing task produces
  its evidence.
- Legacy sources establishing the parity baseline this decision reasons from: `core/ui-src/less/partials/tables.less` (`:17-23` the fluid table, `:47-81` the column ratios, `:91` the 767px stacked-card breakpoint),
  `core/ui-src/less/partials/type.less` (`:31-34` `.text-break`), `core/ui-src/html/states/search-results.html` (`:289` the unwrapped table), `core/ui-src/html/directives/search-result.html` (`:3` the title cell), and the compiled
  `core/src/main/resources/static/css/bright.css` (from which `@screen-xs-max` = 767px was confirmed, Bootstrap 3 itself being a gitignored bower dependency).
- Governing accepted decisions, none reopened by this ADR: `ADR-0002-frontend-stack.md` (MUI-only, TanStack Table), `ADR-0004-testing-and-parity.md` (independent behavioral/accessibility/visual gates),
  `ADR-0006-visual-parity-policy.md` (human acceptance of baselines and variances), `ADR-0009-mock-fidelity-visual-redesign.md` (the sticky header as one of four named structural gaps). `ADR-0007` and `ADR-0008` are historical/
  superseded.
- Source evidence present in the working tree but git-ignored, not a tracked repository file: `uimock/NZBHydra Search.dc.html` (`:210` scroll container, `:212` sticky toolbar, `:255-258` table region, grid tracks and sticky header row,
  `:282` the row grid, `:287-288` the ellipsized title and metadata lines).
- Lifecycle bookkeeping: `docs/frontend-migration/STATUS.md`'s Blocked entry for FM-042 records the reproduction and options (a)/(b)/(c); it will need updating by the coordinator or task designer once a decision exists, including the
  wrapper's corrected FM-010 attribution and the two options (D and E) that entry does not yet name.

## Supersession

- Supersedes: `None`.
- Superseded by: `None` until a later ADR replaces this decision.
