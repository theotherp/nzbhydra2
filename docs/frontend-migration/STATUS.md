# Migration Status

## Active

None.

## Review

None.

## Blocked

None.

## Upcoming

- FM-022: Download History Route

**FM-041 is `done`** — reviewed `PASS WITH MINOR FINDINGS` with no required corrections. Every display preference for the results list now lives in one `display-options` popover on the mock's `#2a3133`/`11px`/`220px` surface, opened by a right-aligned `display-options-toggle` in
`results-selection-actions`: the two grouping toggles relocated out of the inline toolbar row with unchanged labels, defaults, and behavior; new opt-in `Compact rows` and `Highlight recent` preferences persisted alongside sorting,
filters, and `sidebarCollapsed` in the existing `hydra.search-results.table` payload — **two** new keys, since the sidebar shortcut adds none; and a "Show refine sidebar" entry that reads and writes whichever per-viewport refine-surface
mechanism is mounted. FM-045's below-`sm` `drawerOpen` was lifted verbatim into `SearchResults.tsx` as a controlled prop pair (still initialized closed, still unpersisted, its in-file rationale intact) and both files resolve the branch
from one exported `useCompactRefineSurface` hook, so they cannot drift. The two mechanisms are deliberately **not** merged and no mount-time guard was added; that divergence from the mock's single `showFilters` boolean is recorded as
one `proposed` variance on `F-SEARCH-SORT-FILTER`. All 18 `results.spec.ts` tests pass against the real backend (17 pre-existing plus the new evidence block), and FM-045's clipped, acceptance-pending `refine-sidebar-mobile-drawer` block
and capture are untouched. `F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`, and `F-SEARCH-GROUP-SELECTION` all stay `visual.status: proposed` with **human visual acceptance outstanding**. Three things a reviewer should read rather than
assume. The compact row padding is `4px`, not the mock's literal `7px`: FM-045 already put non-compact rows at `6px`, so the mock's value would have *increased* padding and contradicted this packet's own "default row density unchanged"
and "compact measurably shorter" criteria; compact keeps the mock's 7:11 proportion against the denser React baseline, both mock literals stay recorded in `displayStyles.ts`, and the reviewer's one actionable minor finding — that the packet's
Acceptance text still said `11px`/`7px` — was discharged before completion by a task-designer text-truth correction to `6px`/`4px` that keeps the mock literals and the 7:11 derivation visible. The packet's own
Follow-Up Work bullet still proposes that correction; it is implementer-authored handoff evidence and was deliberately left as written rather than rewritten after the fact. `Highlight recent` defaults **off** even though the mock defaults it on, because changing default rendering would invalidate accepted default-state baselines only a human may re-accept. And
below `sm` the popover cannot be opened while the modal refine `Drawer` is up (its backdrop legitimately blocks the page, as it already does for FM-045's own trigger), so the entry closes the popover when used and its closing direction
is evidenced at desktop in the browser and at mobile by the component test. `npm run format:check` fails, identically on a clean baseline tree at `6507a5ed6` — `README.md`, `SearchPage.tsx`, `router.tsx`, `tsconfig.json`,
`vite/devBackend*.ts`, and five git-ignored `.playwright-cli` artifacts, none in FM-041's write scope; the unowned pre-existing `search.spec.ts` FM-038 `Refill` failure also remains.

**ADR-0009 full-mock-fidelity batch.** FM-043 (shell theme, typography, density foundation) is `done`, so `createHydraTheme()`'s `oklch` palette, self-hosted IBM Plex Sans/Mono typography, and the denser default component sizing are
now the tokens every later packet in this batch restyles against rather than guessing at values. FM-044 (search form restyle) and FM-045 (single refine-sidebar filter surface) are no longer blocked and are independent of each other;
FM-046 remediates FM-039/FM-040 behind FM-045 and in turn unblocks FM-041. FM-046 is `done` — reviewed `PASS WITH MINOR FINDINGS` with no required corrections. The `results-toolbar` is now a flat `Box` at the mock's `16px 0 14px`
padding instead of an elevated `Paper`; `search-results-summary` gained an additive `· N selected` fragment in `primary.main` alongside the untouched `results-selected-count`; the tri-state select-all checkbox renders as the mock's
17x17px/5px-radius square through MUI `Checkbox`'s own `icon`/`checkedIcon`/`indeterminateIcon` props (ADR-0002, no bespoke control); the caret menu opens on the mock's `#2a3133`/9px popover; and "Send to downloader", the NZB ZIP
action, and every `results-download-actions` control carry the mock's palette/density with real `disabled` semantics rather than opacity. FM-040's selection/download structure and interaction logic are reused unchanged — no
`data-testid` was removed or renamed and no accessibility affordance regressed, confirmed by rerunning FM-040's existing component coverage rather than assuming it. Verification was independently reproduced by the reviewer (SHA-256
manifest matched byte for byte; `typecheck`/`lint`/`format:check`/`test`/`check:api`/`validate:migration`, `tests/system` `tsc --noEmit`, and `git diff --check` all rerun identically); the expensive real-backend Playwright run
(21/21 passing across `results.spec.ts` and `downloads.spec.ts`) was reused under the reviewer's evidence-reuse exception after the three evidence captures were opened and visually inspected. `F-SEARCH-GROUP-SELECTION`,
`F-SEARCH-DOWNLOADS`, `F-SEARCH-SAVED`, and `F-SEARCH-RESULTS` all stay `visual.status: proposed` with **human visual acceptance outstanding**. Two items are carried as accepted deviations rather than corrections. The mock's own
`allBoxBg`/`allBoxMark` logic leaves the select-all control transparent in the *indeterminate* state with only a dark `#0e1c1b` dash — which would be effectively invisible against the dark toolbar, an authoring inconsistency in the
mock; the implementation fills it like the checked state instead, preserving state visibility per ADR-0006, and that deliberate departure from the mock's literal value should be added to the packet's `Assumptions` on its next touch.
And the handoff describes the non-registry `toolbar-mock-density-desktop-bulk-actions.png` capture as documenting enabled/disabled button contrast when the single frame shows only the disabled state; the registry-cited captures are
unaffected. FM-045 is `done` — reviewed
`PASS WITH MINOR FINDINGS` with no required corrections. The `refine-sidebar` is the single result-filter surface at every viewport (FM-034's inline column-header filter popovers and the
mobile-only `results-filters`/`results-quick-filters` toolbar rows are removed; below `sm` the same toggle opens the sidebar as a MUI `Drawer`), Category/Indexer render as the mock's toggle rows, and the whole panel carries the mock's
palette/density. The no-lost-capability guarantee is structural rather than asserted: `RefineSidebar` builds one `sections` node and renders it in both the docked and `Drawer` branches, so the two viewports cannot drift apart, and both
the component and Playwright layers drive filters at 390x844 and assert the resulting row counts. It also resolves the three long-standing `results.spec.ts` failures FM-039 and FM-040 both recorded as inherited debt — all 16
`results.spec.ts` tests now pass — and leaves `F-SEARCH-SORT-FILTER` and `F-SEARCH-RESULTS` `visual.status: proposed` with **human visual acceptance outstanding**. Two FM-045 items are carried as accepted deviations rather than
corrections. Its `visual-evidence/F-SEARCH-SORT-FILTER/refine-sidebar-mobile-drawer.png` capture is **clipped** — the sidebar is taller than the 844px viewport inside the scrollable drawer, so the image bleeds underlying page content
and omits the Type chip section that the test itself asserts visible; the desktop capture is clean. Whoever performs the ADR-0006 acceptance for `refine-sidebar-mobile-drawer` should recapture it first rather than judge that state on
the current image. And `F-SEARCH-SORT-FILTER`'s `selectors` deliberately retains `freetext-filter-*` and `filter-toggle-*`, which FM-045 removed from the React target but which remain live in the legacy AngularJS view the same record
documents through its `legacy_sources` (`core/ui-src/html/states/search-results.html`, `columnFilterFreetext.html`, still exercised by passing legacy-shell tests); a task-designer refinement corrected FM-045's Acceptance to state that
rule, since deleting those entries would have made the record factually false about the legacy side. `header-filter-*` and `number-filter-*-header-*` were React-only and were deleted. FM-044 is `done` — reviewed
`PASS WITH MINOR FINDINGS`, with its one required finding a packet-internal inconsistency (its `search.spec.ts` allowlist forbade the
only conforming realization of its own collapsed-by-default Acceptance) resolved by a task-designer refinement to that packet, not by changing the implementation. FM-044 leaves `F-SEARCH-FORM`, `F-SEARCH-MEDIA`, and `F-SEARCH-INDEXERS` all `visual.status: proposed` with **human visual acceptance outstanding**, and reports one pre-existing, unrelated `tests/system/tests/search.spec.ts`
failure it did not cause and is not allowed to repair: FM-038 turned the recent-search "Refill" control into an icon `button` nested inside the `Repeat:` `menuitem` but left that spec's `getByRole("menuitem", {name: "Refill"})`
assertions untouched. Reproduced on a clean baseline tree at `68e4e2f9a`; see the FM-044 handoff's Follow-Up Work for the proposed corrective packet. Two things that landed with FM-043 are worth carrying
forward. **ADR-0010 (React Production CSS Delivery)** is accepted and implemented: the
emitted CSS entry is pinned to `assets/index.css`, `core/src/main/resources/templates/react.html` `<link>`s it render-blocking from `<head>`, and `core/ui-react/scripts/validate-production-assets.mjs` now validates that real Thymeleaf
template instead of the Vite output's unused `index.html` — so any future task importing CSS is covered by a gate that was proven to actually fail. Separately, `F-PLATFORM-SHELL`'s visual record stays `proposed`: **human visual
acceptance of the new look is still outstanding**, is independent of technical review per ADR-0006, and was not supplied by any agent.

FM-039 and FM-040 (both done) built the ADR-0008 Option B structural-redesign batch for the search page (Refine sidebar; selection-gated bulk actions bar). Per an explicit 2026-08-17 human decision, ADR-0008 is being superseded: the search
page should follow the source mock closely, including its palette and typography, not just its structure. FM-041 (display options menu) and FM-042 (sticky toolbar/header) were not started and are intentionally not promoted here; they are
being folded into the superseding initiative's task design rather than implemented against the now-superseded Option B spec. The palette and density tokens landed with FM-043, and FM-039/FM-040's remediation pass, FM-046, is now
`done`; FM-041 was wired behind it, is unblocked, and was promoted to `ready` and refined in place against ADR-0009 rather than its original Option B spec. Every ADR it names is accepted or explicitly historical. A fresh implementer
briefly marked it `blocked` on a genuine internal contradiction in its own Acceptance — "the sidebar's own toggle, and FM-045's mobile drawer trigger ... all three drive one state" is not reachable from FM-041's file scope, because
FM-045 owns the below-`sm` drawer as a deliberately local, unpersisted `drawerOpen` and its compact branch reads neither `collapsed` nor `onToggleCollapsed`. A task-designer refinement resolved it in the packet (not by changing any
implementation, and no implementation file was ever touched): `RefineSidebar.tsx`/`RefineSidebar.test.tsx` are added to the allowlist for a **mechanical lift only** of that state into `SearchResults.tsx`, and Acceptance now says
plainly that the refine surface has one live mechanism per viewport branch — the persisted `sidebarCollapsed` at `sm` and up, the unpersisted `drawerOpen` below `sm` — which the menu entry reads and writes for whichever branch is
mounted. Merging the two, and any mount-time guard forcing one from the other, is explicitly out of scope: nothing in ADR-0009, the mock (which has one boolean because it has no responsive branch), or any registry record requires it,
FM-045's in-file rationale argues against it, and persisting overlay openness would be a product decision needing an ADR. The two-mechanism realization is instead recorded as a `proposed` variance on `F-SEARCH-SORT-FILTER`. FM-045's
`refine-sidebar-mobile-drawer` spec block and its clipped, acceptance-pending capture are out of FM-041's scope and stay untouched. FM-041 is `done`. Its review reproduced all nine SHA-256 manifest entries byte for byte and independently reran `typecheck`, `lint`, `test` (38 files/223 tests), `build`, `check:api`, `validate:migration`, `tests/system` `tsc --noEmit`, and `git diff --check`; it confirmed the `format:check` failure reproduces identically on a clean baseline and touches no FM-041 path, diffed the `data-testid` sets mechanically to prove none was removed or renamed, and opened both evidence captures rather than trusting their filenames. The expensive real-backend Playwright run was reused under the reviewer's evidence-reuse exception. Two review observations are carried rather than corrected: the mock source at `/tmp/hydra mock/...` no longer exists on disk, so `displayMenuCaptionColor`, the popover entry metrics, the divider alpha, and the menu shadow are **not independently verified** against the mock and rest on the implementation's own citations; and `compact-rows-desktop.png` is clipped past 1280px because the table's minimum width is `1320px`, which limits what a human acceptor can judge from that frame. Compact mode also shrinks row-action touch targets, which no acceptance criterion covers — worth a future accessibility pass.

Completed work is recorded in its task packet and Git history, not listed here.
