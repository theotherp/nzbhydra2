# ADR-0009: Full Mock-Fidelity Visual Redesign (Palette, Typography, Density, And Structure), Superseding ADR-0008's Option B

Status: accepted (the full-fidelity option — palette, typography, density, and structural fidelity, shell-first phased rollout — was chosen by explicit human direction; not a recommendation this proposer is asking to be accepted)

## Decision Question

Should the React migration's search page (and, prospectively, its shared shell) be restyled to match the repository owner's external-tool mock as closely as possible — including the mock's `oklch` teal/cyan palette and semantic accents,
its IBM Plex Sans/Mono typography, its density (tight paddings, small font sizes, compact controls), and its exact structural patterns (sticky/pinned column header, a single filter surface via the sidebar rather than parallel inline
per-column filters, a toggle-row-style multiselect for Category/Indexer rather than a checkbox list) — superseding `ADR-0008-branded-visual-redesign.md`'s Option B decision (mock structure only, on ADR-0007's unchanged legacy-grey
palette/typography), which FM-039 and FM-040 already implemented and which FM-041/FM-042 were planned but not yet implemented against?

This ADR governs the same token/density/structural layer ADR-0008 governed, now widened to include palette, typography, and exact structural fidelity rather than structure alone. It does not reopen `ADR-0002-frontend-stack.md`'s MUI-only
component-system boundary.

## Context And Evidence

- `ADR-0008-branded-visual-redesign.md` (accepted, Option B) evaluated the same mock this ADR evaluates — `/tmp/hydra mock/Awaiting responses for direction/NZBHydra Search.dc.html` — against `ADR-0007-branded-mui-theme-foundation.md`'s
  legacy-grey palette, and the repository owner chose Option B: keep ADR-0007's palette/typography unchanged, build only the mock's structural/layout ideas (Refine sidebar, bulk-actions bar, display-options menu, denser sizing) on the
  existing colors. Read in full for this ADR; its Options A/B/C text and evidence about the mock's `oklch` palette (`primary` `oklch(0.75 0.1 190)` teal/cyan; `warning`-shaped amber `oklch(0.76 0.1 70)`; `success`-shaped green
  `oklch(0.75 0.11 150)`), its `'IBM Plex Sans'`/`'IBM Plex Mono'` typography, its runtime-Google-Fonts prototyping shortcut, and its six affected `visual.status: accepted` `FEATURES.yaml` records is not restated here except where the
  facts have since changed (below).
- FM-039 (`docs/frontend-migration/tasks/FM-039-search-results-refine-filter-sidebar.md`, done) and FM-040 (`docs/frontend-migration/tasks/FM-040-search-results-selection-bulk-actions-bar.md`, done) — read in full, including their Handoff,
  Fix Round, and Fresh Review sections — implemented the first two packets of the ADR-0008 Option B structural-redesign batch, explicitly on ADR-0007's current palette/typography: a persistent, collapsible "Refine" filter sidebar bound to
  the existing `ResultFilters` state (FM-039), and a header tri-state select-all checkbox with a caret `Select all`/`Deselect all`/`Invert selection` menu plus a selection-gated bulk-actions bar (FM-040). Both explicitly recorded
  `core/ui-react/src/app/theme.ts` as untouched and out of scope, and both used only current-theme MUI defaults (no `oklch` colors, no IBM Plex fonts, no mock density values). Both are real, committed, reviewed-PASS work, not proposals.
- FM-041 (`docs/frontend-migration/tasks/FM-041-search-results-display-options-and-compact-rows.md`) and FM-042 (`docs/frontend-migration/tasks/FM-042-search-results-sticky-toolbar-and-header.md`) — read in full — are the third and fourth
  packets of the same ADR-0008 Option B batch (a Display-options menu with compact rows/recency highlighting, and sticky toolbar/column-header positioning). Both are `Status: planned`; neither has been implemented. `STATUS.md`'s Upcoming
  section, read in full, already records that they are "intentionally not promoted" and are "being folded into the superseding initiative's task design rather than implemented against the now-superseded Option B spec."
- `docs/frontend-migration/FEATURES.yaml` (read for the eleven records ADR-0008 and FM-039/FM-040 named) confirms the current state, verified directly rather than assumed:
  - Still `visual.status: accepted` (untouched by FM-039/FM-040, since restyling them was outside those tasks' `Files Allowed To Modify`): `F-SEARCH-FORM`, `F-SEARCH-MEDIA`, `F-SEARCH-PAGING`.
  - Demoted `accepted` -> `proposed` by FM-040 as part of its own toolbar restructure (per its Registry And Documentation Updates section): `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-SAVED`.
  - Together these are the same six records ADR-0008 identified as `visual.status: accepted` under the FM-031 branded theme; none has yet been re-proposed/re-accepted against any new palette, since Option B never required a palette
    change and the human's new direction (below) postdates FM-040's completion.
  - Already `proposed` for reasons unrelated to this ADR, and now also carrying FM-039/FM-040's own structural (not-yet-palette) changes: `F-PLATFORM-SHELL`, `F-SEARCH-INDEXERS`, `F-SEARCH-RECENT`, `F-SEARCH-RESULTS`,
    `F-SEARCH-SORT-FILTER`. These will need their eventual re-review evidence to reflect whichever palette/density is finally accepted, same as ADR-0008 already noted.
- The repository owner reviewed the FM-039/FM-040 result (the live running app) against the mock and gave the following direct, explicit, unambiguous feedback in conversation, reproduced verbatim because it is the human decision this ADR
  records, not a hypothesis to re-litigate:

  > "Ok, but seriously - that new UI looks barely like the mockup I gave you. Yes, I said to use the structure, but you only asked about the colors. I meant it should look as close to the mockup as possible *ignoring the colors*. The
  > mockup is denser, has a fixed table header, no inline filters, doesn't use checkboxes for the category or indexer but instead some kind of multiselect, and so on. ... Let FM-040 complete ..., then let the designer create a new task
  > that follows the mockup as closely as possible, EVEN WITH THE COLORS. I guess it's easier to change the colors later than to define what to follow in the mockup and what not, right? It should include everything in the mockup, the
  > search form, the table with the sticky header, the category / indexer selection and so on. When something is missing in the mockup, e.g. the actions to modify the indexer selection for the search, make it follow the overall design
  > of the mockup."

  Read plainly, this reverses ADR-0008's Option B choice on the palette question specifically (the owner had, at the time of ADR-0008, framed "inspiration only, current colors" as sufficient; having now seen the result, they state that
  framing was a misunderstanding — "you only asked about the colors" — and that fidelity should include colors), while confirming and *widening* Option B's structural ambition beyond what FM-039/FM-040 delivered: a fixed table header
  (not yet built; that is FM-042's undelivered scope), no inline column-header filters (FM-039 explicitly kept the FM-034 inline filters alongside the new sidebar; the owner wants the sidebar to be the *only* filter surface), a
  toggle/multiselect-style Category/Indexer control (FM-039 built a checkbox list with counts, matching the mock's literal `<input type=checkbox>` markup structurally but not its toggle-row visual treatment — see below), and the search
  form itself (out of scope for the entire FM-039–042 batch, which was results-page-only).
- Re-reading the mock's `aside` and header markup specifically for the density/control-shape claims in the owner's feedback confirms them: the mock's Category/Indexer lists render each entry as a full-width clickable row with a
  background/border state change on selection (a toggle-row pattern) rather than a native `<input type="checkbox">` to the left of a label (the checkbox-list pattern FM-039 built); the mock's results grid header has
  `position: sticky; top: <toolbar-height>` (not yet built; FM-042's undelivered scope); the mock has no equivalent of FM-034's inline per-column-header filter popovers at all — every filter lives in the `aside` only. These are exactly
  the gaps the owner named, confirmed by direct comparison rather than inferred.
- The owner's explicit instruction to extend "the overall design of the mockup" to elements the mock does not show but this migration's scope touches anyway — naming "the actions to modify the indexer selection for the search" as an
  example — reaches at least the search-form indexer-selection split button FM-037 already built (`docs/frontend-migration/tasks/FM-037-search-results-legacy-shaped-indexer-selection.md`, done), which sits above the results table the
  mock does show and shares no visual language with it today. Scoping exactly which additional out-of-mock elements this reaches is task-designer work, not settled exhaustively by this ADR.
- Font loading: the mock's own runtime `fonts.googleapis.com`/`fonts.gstatic.com` dependency remains, as ADR-0008 already found, unsuitable for a self-hosted application with no other third-party runtime CDN dependency in its shell
  chrome. Nothing in the owner's new direction asks for the CDN dependency itself — the request is for the mock's *look*, and self-hosted/vendored IBM Plex (`@fontsource/ibm-plex-sans` / `@fontsource/ibm-plex-mono`, or repo-vendored
  `woff2` files) delivers the same rendered typography without it, exactly as ADR-0008's Option A already proposed.
- `core/ui-react/src/app/theme.ts` (`createHydraTheme()`) remains the sole implementation of palette/typography tokens; `core/ui-react/src/app/AppShell.tsx` remains the single shared layout rendered around every route. Both facts are
  unchanged from ADR-0008's own reading of them: a palette/typography change is necessarily global the moment it lands in `theme.ts`, even though only the search page currently has a matching mock.
- `ADR-0002-frontend-stack.md` (accepted) still fixes MUI as the only component system; this ADR does not reopen that boundary. `ADR-0006-visual-parity-policy.md` (accepted) still requires explicit human acceptance of every feature's
  visual baseline and of every documented variance — the same mechanism ADR-0007 and ADR-0008 both used, and the mechanism this ADR's re-proposal work will use again for the six records above, plus for FM-039/FM-040's own already-`proposed`
  (not yet accepted) records once they are remediated to the new look.
- `docs/frontend-migration/decisions/README.md` (read in full) governs this proposal's own process: a proposer records the human's response and changes `Status` accordingly; it must never accept an option on the human's behalf. Here the
  human's decision was given directly, in the human's own words, before this ADR was drafted — this ADR records that decision rather than soliciting it.

## Options

### Option A (chosen): Full mock fidelity — palette, typography, density, and structural fidelity, shell-first phased rollout

- Replace `theme.ts`'s `legacyGreyPalette` tokens with the mock's `oklch` values (background, header/surface, primary teal, amber/green semantic accents) and add `typography.fontFamily` tokens for self-hosted/vendored `'IBM Plex Sans'`
  (UI) and `'IBM Plex Mono'` (numeric/tabular), exactly as ADR-0008's own Option A specified, with no runtime Google Fonts CDN dependency.
- Additionally adopt the mock's density (its `12–15.5px` font sizes, `7–11px` border radii, tight paddings, compact chip/pill controls) as first-class scope, not a byproduct of the palette swap.
- Additionally pursue the mock's exact structural patterns wherever the current implementation diverges from them, superseding the narrower "structure only" reading Option B/ADR-0008 used: a sticky/pinned results-table column header
  (FM-042's undelivered scope, now re-scoped to genuinely stick rather than merely being planned); the Refine sidebar as the sole filter surface, removing FM-034's inline per-column-header filter popovers rather than running both
  surfaces in parallel as FM-039 currently does; a toggle-row-style multiselect for Category/Indexer (visually and interactively matching the mock's full-row clickable state) rather than FM-039's checkbox-list treatment of the same
  data; and extending this same design language to elements the mock does not explicitly show but this migration's scope already touches, such as the search form's own indexer-selection controls (FM-037's split button), per the owner's
  explicit instruction to "follow the overall design of the mockup" for such gaps.
- Roll out to the shared shell (`AppShell.tsx` header/nav) and the search page first, since the shell change is unavoidably global the moment `theme.ts` changes, and the search page is the only route with a matching mock; other routes
  (`Config`/`System`/`History`/`Stats`/`Auth`) keep their current ADR-0007-styled appearance until each gets its own redesign task. This is the identical phased pattern ADR-0008's own (then-rejected) Option A proposed and that ADR-0007
  itself used when it changed the shared shell ahead of full per-feature parity; it is restated here because it remains the correct rollout shape regardless of which palette question is being decided.
- FM-039 and FM-040's already-committed work needs a remediation pass, not a rebuild from scratch: FM-039's sidebar structure, filter-state wiring, and count logic, and FM-040's tri-state-checkbox/caret-menu/bulk-actions-bar structure
  and interaction logic, are sound and reusable; what needs to change is their visual layer (palette, typography, density, the checkbox-list -> toggle-row control shape) and, per the owner's explicit direction, removing the inline
  column-header filters FM-039 deliberately preserved alongside the sidebar.
- FM-041 and FM-042 (planned, unstarted) should not be implemented against their current packets, which were scoped and written against Option B (current tokens, sidebar-plus-inline-filters coexisting, checkbox-style multiselect). A
  fresh task-designer pass should supersede/refine both — FM-042's sticky-header scope in particular becomes more central under full fidelity, since the mock's sticky header is one of the four structural gaps the owner named directly.
- Every currently `visual.status: accepted` or now-`proposed`-from-remediation search-route record needs fresh proposal/re-acceptance against the new look: the three still-`accepted` records (`F-SEARCH-FORM`, `F-SEARCH-MEDIA`,
  `F-SEARCH-PAGING`) and the three FM-040 already demoted to `proposed` (`F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-SAVED`) — six records total, matching ADR-0008's original six, now in a mixed
  accepted/already-proposed state rather than uniformly accepted. The five already-`proposed`-for-other-reasons records (`F-PLATFORM-SHELL`, `F-SEARCH-INDEXERS`, `F-SEARCH-RECENT`, `F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`) likewise
  need their eventual re-review evidence to reflect the new look before acceptance.
- Benefits: matches the repository owner's explicit, direct, already-given instruction exactly, rather than continuing to guess at how literally to read "structure only"; delivers the complete, deliberately color-scienced (`oklch`)
  and typographically considered system the owner produced specifically for this purpose; resolves the sidebar/inline-filter redundancy and the checkbox-vs-toggle-row mismatch the owner specifically flagged, not just the palette;
  reuses FM-039/FM-040's real, reviewed, working structural/logic layer rather than discarding committed work.
- Costs: is the largest-scope option — a second full theme migration plus a remediation pass over two already-done tasks plus a re-scoping of two planned ones; re-proposing/re-accepting six visual records (three losing already-accepted
  status a second time, after ADR-0007 and again here); removing FM-039's inline filters is itself a small regression/rework of very recent work; font-vendoring must be resolved correctly to avoid a runtime CDN dependency; the shared
  shell change is visible on every route immediately, producing the same disclosed old/new seam ADR-0008's Option A already flagged, for however long other routes remain unredesigned.

### Option B: Palette and typography only — adopt the mock's colors and fonts, but leave structural/density work to a later, separately-scoped pass

- Change only `theme.ts`'s palette/typography tokens (as ADR-0008's original Option A specified) and stop there: no density pass, no removal of FM-039's inline filters, no toggle-row Category/Indexer control, no sticky header, no
  search-form indexer-selection restyling. FM-041/FM-042 would proceed on their current Option-B-shaped packets, just re-skinned with the new colors once they land.
- Benefits: smaller, faster first increment; isolates the highest-risk, most global change (the shared-shell palette swap) from the highest-effort, most detailed change (structural/density fidelity), so each can be verified
  independently; still directly answers the "colors too" half of the owner's feedback immediately.
- Costs: does not answer the owner's feedback in full — the transcript names density, the sticky header, the removal of inline filters, and the toggle-row multiselect as concrete, specific gaps, not merely "and also change the
  colors"; leaves FM-041/FM-042 to be implemented against a spec the owner has already said falls short, only to need a second pass immediately after; splits one coherent redesign initiative into two review/acceptance cycles for no
  stated benefit, when the owner's own words ("It should include everything in the mockup... and so on") explicitly ask for the whole thing together.

### Option C: Defer — make no further visual-design change now, leave FM-039/FM-040 as delivered and FM-041/FM-042 unscoped

- Take no action; leave `theme.ts`, FM-039/FM-040's current structure, and FM-041/FM-042's current packets exactly as they are. Retain the owner's feedback as an unactioned record for a possible future initiative.
- Benefits: none beyond avoiding immediate rework; not applicable here in the way Option C ordinarily would be, since the human decision this ADR records is not a request to consider deferring — it is a direct instruction to proceed.
- Costs: contradicts the repository owner's explicit, direct, already-given instruction to proceed with a full-fidelity task; leaves the search page in the state the owner has already said "looks barely like the mockup," which is the
  precise defect this feedback identifies. Included here for completeness/record only, per this migration's ADR template, not as a live alternative.

## Recommendation

Recommend Option A. The repository owner's own words already select it in substance — "as close to the mockup as possible... EVEN WITH THE COLORS," "It should include everything in the mockup," an explicit list of the specific
structural gaps (density, fixed header, inline filters, checkbox-vs-multiselect), and an explicit instruction to extend the same design language to elements the mock omits but this migration's scope touches (the indexer-selection
controls). Option B under-delivers against that instruction by design, not by oversight, and would predictably need a second pass immediately after landing. Option A's costs are real but are the same class of cost ADR-0008's original
Option A already disclosed and the owner already weighed once when producing the mock and asking for this initiative a second time; the phased shell-first rollout keeps the unavoidable global-shell seam to the minimum necessary
duration, and FM-039/FM-040's structural/logic layer is reusable rather than wasted.

## Human Decision

- **Decision-maker:** the repository owner.
- **Date:** 2026-08-17.
- **Selected option:** Option A — full mock fidelity: the mock's palette (`oklch` teal/cyan primary, amber/green semantic accents) and typography (self-hosted IBM Plex Sans/Mono) are adopted, together with its density and its exact
  structural patterns (sticky/pinned column header, the Refine sidebar as the sole filter surface, a toggle-row multiselect for Category/Indexer), rolled out shell-first to the shared shell and the search page. This is not a
  recommendation awaiting acceptance; the human gave this direction directly, in conversation, before this ADR was drafted, and this ADR records that decision rather than soliciting it.
- **Rationale, as given by the repository owner (verbatim):** "Ok, but seriously - that new UI looks barely like the mockup I gave you. Yes, I said to use the structure, but you only asked about the colors. I meant it should look as
  close to the mockup as possible *ignoring the colors*. The mockup is denser, has a fixed table header, no inline filters, doesn't use checkboxes for the category or indexer but instead some kind of multiselect, and so on. ... Let
  FM-040 complete ..., then let the designer create a new task that follows the mockup as closely as possible, EVEN WITH THE COLORS. I guess it's easier to change the colors later than to define what to follow in the mockup and what
  not, right? It should include everything in the mockup, the search form, the table with the sticky header, the category / indexer selection and so on. When something is missing in the mockup, e.g. the actions to modify the indexer
  selection for the search, make it follow the overall design of the mockup."
- Options B and C were not selected; they are recorded above only as the genuine alternatives this proposal weighed, per this migration's ADR process.

## Consequences

- `core/ui-react/src/app/theme.ts` **is** changed by this decision (unlike under ADR-0008's Option B): new palette tokens (background, header/surface, primary teal, warning-shaped amber, success-shaped green) and new
  `typography.fontFamily` tokens (self-hosted/vendored IBM Plex Sans/Mono, no runtime Google Fonts CDN dependency) are added, plus density-bearing tokens (smaller default border radii, tighter component paddings via
  `components.styleOverrides`, adjusted default font sizes) that ADR-0008's Option A did not itself scope in this much density detail. `AppShell.tsx` is changed to carry the new header/nav colors, since it consumes `theme.ts` through
  MUI's theme context; this is visible on every route immediately, per the phased-rollout disclosure above.
- Font vendoring (`@fontsource/ibm-plex-sans` / `@fontsource/ibm-plex-mono`, or repository-vendored `woff2` files) is now required work, not merely a disclosed possibility; no runtime dependency on `fonts.googleapis.com`/
  `fonts.gstatic.com` is adopted in any form, consistent with this being a self-hosted application with no other such dependency in its shell chrome. Exact vendoring mechanism remains implementation detail for the task designer/
  implementer.
- The six `FEATURES.yaml` records ADR-0008 originally named (`F-SEARCH-FORM`, `F-SEARCH-MEDIA`, `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-PAGING`, `F-SEARCH-SAVED`) need fresh proposal and re-acceptance against the
  new look. Three (`F-SEARCH-FORM`, `F-SEARCH-MEDIA`, `F-SEARCH-PAGING`) are currently still `visual.status: accepted` and must be demoted to `proposed` as part of that re-proposal, per ADR-0006's existing remediation mechanism (the
  same mechanism ADR-0007 and ADR-0008 both used). The other three (`F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-SAVED`) are already `proposed`, demoted by FM-040's own toolbar restructure; they still need fresh
  evidence and human acceptance against the new look, not merely against FM-040's structural change. The five already-`proposed`-for-unrelated-reasons records (`F-PLATFORM-SHELL`, `F-SEARCH-INDEXERS`, `F-SEARCH-RECENT`,
  `F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`) likewise need their eventual re-review evidence to reflect the new palette/density/structure before acceptance.
- FM-039 and FM-040 are **not** to be redone from scratch. Both are `done`, reviewed `PASS`, and their structural/interaction layer (the sidebar's filter-state wiring and count logic; the tri-state checkbox, caret menu, and
  bulk-actions-bar gating logic) is sound. A **remediation pass** is required instead: restyle both to the new palette/typography/density; convert FM-039's Category/Indexer checkbox lists to the mock's toggle-row multiselect; remove
  FM-034's inline per-column-header filters (which FM-039 deliberately preserved alongside the sidebar) so the sidebar becomes the sole filter surface, per the owner's explicit "no inline filters" instruction; and reconcile
  FM-039's/FM-040's own already-`proposed` visual records as part of that same remediation, not as a separate pass. Scoping the remediation task(s) is task-designer follow-up work this ADR does not perform.
- FM-041 (`docs/frontend-migration/tasks/FM-041-search-results-display-options-and-compact-rows.md`) and FM-042 (`docs/frontend-migration/tasks/FM-042-search-results-sticky-toolbar-and-header.md`) are `planned` and unstarted; neither
  should be implemented against its current packet, which was scoped and written against ADR-0008's Option B. Both need a fresh task-designer pass that supersedes/refines them under this ADR — FM-042's sticky-header scope in
  particular is now central rather than incidental, since a fixed table header is one of the four structural gaps the owner named directly. This ADR does not itself rewrite either packet; that is task-designer work.
- The search form's own controls (out of scope for the entire FM-039–042 batch) and any other element the mock does not explicitly show but this migration's scope already touches — the owner's own example is the search form's
  indexer-selection controls (FM-037's split button) — are now in scope for extending "the overall design of the mockup," per the owner's explicit instruction. Scoping exactly which elements this reaches, beyond the one named example,
  is task-designer follow-up work this ADR does not perform exhaustively.
- Does not reopen `ADR-0002-frontend-stack.md` (MUI remains the only component system) or `ADR-0006-visual-parity-policy.md` (semantic-parity policy and human-acceptance process, unchanged). The existing `dark-dyschromatopsia`
  accessibility variant in `theme.ts` is unaffected in intent and must continue to compose with whatever new base palette lands, matching ADR-0007's original requirement.
- `docs/frontend-migration/STATUS.md`'s existing note (already present, dated 2026-08-17) already anticipates this decision's shape — FM-039/FM-040 done and needing remediation, FM-041/FM-042 intentionally not promoted pending a
  fresh task-designer pass — and needs no substantive correction by this ADR, only routine lifecycle bookkeeping as the follow-up task(s) this ADR authorizes are actually scoped and started.
- `ADR-0008-branded-visual-redesign.md`'s own **Supersession** section currently reads "Supersedes: None... Superseded by: None until a later ADR replaces this decision." That statement is now stale: this ADR supersedes ADR-0008 (see
  below). Per this migration's Integrity Rules (`docs/frontend-migration/decisions/README.md`: "Accepted ADRs are historical records... Correct only factual/documentation errors in an accepted ADR"), ADR-0008's Supersession section
  needs a follow-up edit recording that it was superseded by this ADR. This proposer does not make that edit itself — per this repository's routing convention, only a coordinator or task designer touches another packet or ADR; this is
  noted here as required follow-up work, not performed by this document.
- No implementation, task packet, `FEATURES.yaml`, `STATUS.md`, or theme/component code change is made by this ADR itself. The task designer must scope the shell/theme change, the FM-039/FM-040 remediation, and the FM-041/FM-042
  refresh into concrete task packets before an implementer may act.

## Affected Work

- Shell/theme files (require implementation under this decision): `core/ui-react/src/app/theme.ts`, `core/ui-react/src/app/AppShell.tsx`.
- Search-page implementation files requiring a remediation pass: `core/ui-react/src/features/search/results/**` (in particular `RefineSidebar.tsx`, `SearchResults.tsx`, `DownloadActions.tsx`, `filterControls.tsx` — the FM-039/FM-040
  deliverables) and, per the owner's named example, the search-form indexer-selection controls (`docs/frontend-migration/tasks/FM-037-search-results-legacy-shaped-indexer-selection.md`'s deliverable). Exact file-by-file scoping is
  task-designer work, not enumerated exhaustively here.
- Task packets requiring a fresh task-designer pass rather than implementation as currently written: `docs/frontend-migration/tasks/FM-041-search-results-display-options-and-compact-rows.md`,
  `docs/frontend-migration/tasks/FM-042-search-results-sticky-toolbar-and-header.md`.
- Task packets requiring a remediation pass, not a rebuild: `docs/frontend-migration/tasks/FM-039-search-results-refine-filter-sidebar.md`, `docs/frontend-migration/tasks/FM-040-search-results-selection-bulk-actions-bar.md` (both `done`).
- `FEATURES.yaml` records requiring fresh proposal/re-acceptance against the new look: `F-SEARCH-FORM`, `F-SEARCH-MEDIA`, `F-SEARCH-PAGING` (currently `accepted`, to be demoted) and `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`,
  `F-SEARCH-SAVED` (already `proposed` from FM-040's remediation, still need re-evidencing against the new look).
- `FEATURES.yaml` records already `proposed` for unrelated reasons whose eventual re-review must additionally reflect this decision: `F-PLATFORM-SHELL`, `F-SEARCH-INDEXERS`, `F-SEARCH-RECENT`, `F-SEARCH-RESULTS`,
  `F-SEARCH-SORT-FILTER`.
- Routes with no matching mock, deferred under the same phased rollout until separately redesigned: all `F-CONFIG-*`, `F-STATS-*`, `F-HISTORY-*`, `F-SYSTEM-*` records, plus `F-AUTH-LOGIN`, `F-SEARCH-PROGRESS`, `F-SEARCH-TOUR`,
  `F-PLATFORM-LIVE-STATUS`.
- Required follow-up edit to another ADR (not performed by this document; coordinator/task-designer work): `docs/frontend-migration/decisions/ADR-0008-branded-visual-redesign.md`'s Supersession section.
- Policy context: `docs/frontend-migration/decisions/ADR-0002-frontend-stack.md` (MUI-only boundary, unchanged) and `docs/frontend-migration/decisions/ADR-0006-visual-parity-policy.md` (semantic visual parity and human-acceptance
  process, unchanged; this ADR's token/density/structural changes flow through ADR-0006's existing remediation mechanism when implementing tasks land).
- Source evidence (not a repository file): `/tmp/hydra mock/Awaiting responses for direction/NZBHydra Search.dc.html`, the same human-authored interactive prototype ADR-0008 evaluated.

## Supersession

- Supersedes: **`ADR-0008-branded-visual-redesign.md`**. ADR-0008's Option B decision — keep ADR-0007's palette/typography unchanged and treat the mock as structural inspiration only — is reversed by this ADR's Option A. ADR-0008
  remains a historical record of the decision that was in force between 2026-08-17 (its own acceptance) and this ADR's acceptance, and of the reasoning the human gave at that time; it is not deleted, rewritten, or retroactively
  corrected, per this migration's Integrity Rules. ADR-0008's own Supersession section requires a follow-up edit (not performed here; coordinator/task-designer work, per Consequences above) to record this fact from its side.
- Superseded by: `None` until a later ADR replaces this decision.
