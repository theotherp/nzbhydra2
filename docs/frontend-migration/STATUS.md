# Migration Status

## Active

None.

## Review

None.

## Blocked

None.

## Upcoming

- FM-022: Download History Route

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
`done`; FM-041 was wired behind it and is unblocked, but stays `planned` and unlisted above until it is promoted to `ready`.

Completed work is recorded in its task packet and Git history, not listed here.
