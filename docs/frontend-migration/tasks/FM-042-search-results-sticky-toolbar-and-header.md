# FM-042: Sticky Results Toolbar And Column Header While Scrolling

Status: planned Owner: Feature IDs: F-SEARCH-RESULTS, F-SEARCH-SORT-FILTER, F-SEARCH-PAGING Component IDs: C-RESULT-TABLE API IDs: None Depends on: FM-041 Blocks: None

## Dependency Notes

Final packet of the ADR-0008 structural-redesign batch, and last by design: it pins whatever the three preceding packets put in the toolbar and the table header, so its offsets, stacking order, and scrolled evidence would have to be redone
if it landed first. It depends on FM-041 directly (compact mode changes the row and toolbar heights the sticky offset is derived from) and transitively on FM-039 and FM-040 for the sidebar and bulk-actions bar it must not overlap.

## Outcome

While scrolling a long result list, the results toolbar and the table's column header — with its sort controls and FM-034 inline filters — stay visible at the top of the viewport instead of scrolling away, without overlapping the rows or
misplacing any menu anchored in them.

## Boundary Rationale

Sticky positioning is one independent product behavior with a distinct failure mode: overlap, stacking-context, and popover-anchoring regressions that no other packet in the batch can cause or catch, evidenced in a scrolled state the system
suite does not currently exercise at all. It is separate from FM-041 because it is unconditional layout rather than a user preference, and it is deliberately not merged into the earlier packets because pinning controls that are still being
rearranged would produce a baseline invalidated by the next task.

## Decision Dependencies

- Accepted ADRs governing this task: ADR-0002 (MUI-only presentation), ADR-0004 (testing and parity), ADR-0006 (semantic visual parity), ADR-0007 (branded theme tokens), ADR-0008 (mock adopted for structure only; palette and typography unchanged).
- Proposed or rejected ADRs blocking this task: None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/SearchResults.tsx`, `SearchResults.test.tsx`, and new feature-scoped sibling modules and tests under `core/ui-react/src/features/search/results/`
- `tests/system/tests/results.spec.ts` — only this task's visual-evidence block
- `docs/frontend-migration/FEATURES.yaml` — only `F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`, and `F-SEARCH-PAGING`'s `visual` and `tests` fields
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- `core/ui-react/src/app/AppShell.tsx` and `core/ui-react/src/router.tsx`. The shell renders `AppBar position="static"` inside a `minHeight: 100vh` flex column with no ancestor scroll container, so the document is the scroller and
  `position: sticky` works without touching either file. Converting the results area into its own scroll container, or making the shell header fixed, would change the shared page scroll model for every route and is not authorized here
- `core/ui-react/src/app/theme.ts` and every palette, typography, and font value from the mock
- Row virtualization or any other change to how many rows render (the FM-034 follow-up, still deferred)
- Moving the load-more/load-all controls, which `F-SEARCH-PAGING` has accepted immediately above the toolbar
- Changing filtering, sorting, grouping, selection, download, or display-preference behavior; any route other than `/`

## Context To Read

- `README.md` (Visual Parity, Workflow, Verification Integrity), `ADR-0002`, `ADR-0004`, `ADR-0006`, `ADR-0007`, `ADR-0008`
- `F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`, `F-SEARCH-PAGING`, `C-RESULT-TABLE`, and the FM-018, FM-034, FM-039, FM-040 and FM-041 packets
- `core/ui-react/src/app/AppShell.tsx` and `core/ui-react/src/router.tsx` — read only, to confirm the scroll model and that no ancestor sets `overflow`
- `core/ui-react/src/features/search/results/SearchResults.tsx` (the responsive table styling that hides `thead` below `sm`, and every `Popover`/menu anchored in the toolbar or header)
- `/tmp/hydra mock/Awaiting responses for direction/NZBHydra Search.dc.html` — the sticky toolbar and sticky header-row blocks only, for structure; its fixed-viewport shell, inline colors, and fonts are not authoritative
- `tests/system/tests/results.spec.ts` and `tests/system/tests/visualEvidence.ts`

## Acceptance

- While the document scrolls, the results toolbar stays pinned at the top of the viewport and the table's column header row stays visible directly beneath it, neither overlapping the other nor allowing a data row to render above the header
  row's lower edge.
- The implementation uses `position: sticky` within the existing document scroll model and changes no shared layout file. If sticky behavior cannot be achieved without altering `AppShell.tsx` or `router.tsx`, stop and escalate with the
  exact file and reason rather than widening scope; a change to the app-wide scroll model is a shared-layout decision this task does not carry.
- The header's sticky offset is derived from the toolbar's actual rendered height rather than a hardcoded pixel constant, so it stays correct when FM-039's sidebar is collapsed or expanded, when FM-041's compact mode changes heights, and
  when the toolbar wraps to more rows at narrow widths. State how this is derived in the handoff.
- Below `sm` the responsive styling hides `thead`, so only the toolbar sticks. At 390x844 the sticky region occupies at most 40% of the viewport height with at least two result rows visible beneath it; if the full toolbar cannot meet that,
  only a compact summary and bulk-action strip sticks and the remainder scrolls normally.
- Menus and popovers anchored inside the sticky regions — the FM-034 inline column-header filters, FM-040's selection menu, FM-041's display-options menu — remain correctly positioned and render above the sticky regions after scrolling. A
  stacking-context or `z-index` regression here is a failure, not a cosmetic finding, and is covered by an assertion in the scrolled state.
- FM-039's sidebar is not overlapped by or hidden behind the sticky regions, and if it is made sticky itself its top offset matches the results column's.
- No existing `data-testid` is removed or renamed. Sticky header behavior has no legacy equivalent (legacy uses no affix or sticky treatment for the results table; confirm by search rather than assuming), so it is recorded as a `proposed`
  variance.
- Registry reconciliation: `F-SEARCH-RESULTS` and `F-SEARCH-SORT-FILTER` gain a scrolled state in their contracts (both are `proposed`; do not re-accept). For `F-SEARCH-PAGING`, verify whether its accepted check — the load-more/load-all
  controls rendered immediately above the toolbar with no page-level horizontal overflow — is still literally true; the DOM order is unchanged, so it is expected to hold. Move it from `accepted` to `proposed` with an explanatory `note` only
  if it does not, and record which outcome was found. Never fabricate or re-date human acceptance.
- Visual contract (ADR-0006), asserted in `results.spec.ts`. States: `scrolled-sticky-toolbar-and-header`, `scrolled-popover-above-sticky`. Viewports: desktop 1280x800, mobile 390x844. Geometry checks:
    - after scrolling far enough that several rows pass beneath it, the toolbar's and the header row's bounding-box tops remain within the viewport, with the header's top at or below the toolbar's bottom edge;
    - no data row's top edge sits above the header row's bottom edge while scrolled;
    - an inline column-header filter popover opened while scrolled renders fully within the viewport and above the sticky regions;
    - the page has no horizontal overflow in the scrolled state at either viewport, and at mobile the sticky region's height is at most 40% of the 844px viewport with at least two rows visible beneath it.
  The evidence fixture needs enough results to scroll; extend only this task's own block. Evidence: `tests/system/tests/results.spec.ts` plus narrow captures at `visual-evidence/F-SEARCH-RESULTS/sticky-header-desktop.png` and `-mobile.png`.

## Verification

- `npm ci` only if `package.json`/`package-lock.json` change; otherwise the cheapest install that guarantees `node_modules` matches the lockfile. Record which install ran.
- Working directory `core/ui-react`: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api`, `npm run validate:migration` — each expected to pass.
- Working directory `tests/system`: `npx tsc --noEmit` — expected to pass (this task changes a spec).
- Working directory `tests/system`, after `VITE_OUT_DIR=../target/classes/static/react npm run build` from `core/ui-react`: `npx playwright test tests/results.spec.ts`, expected to produce the scrolled-state evidence. Scrolled geometry must
  be asserted in a real browser; a component test is not sufficient evidence for this task's contract. Per FM-034 this suite currently fails in this environment during fixture setup on a pre-existing, unrelated black-hole-path config defect.
  If that reproduces, record the run as blocked with the evidence that it is pre-existing, leave the visual records `proposed`, and log it under Temporary Exceptions And Debt with a removal condition — and note explicitly that this task's
  central claim is then unverified rather than merely unaccepted. Never report a blocked run as passed. If a run wipes `F-PLATFORM-SHELL`'s evidence PNGs (the known FM-033 gap) and `validate:migration` then fails, rerun `tests/smoke.spec.ts`
  to restore them and record that this happened.
- Repository root: `git diff --check` — expected to produce no output.
- Confirm task-owned changed files are all listed under Files Allowed To Modify, and that no other spec's fixtures or assertions were altered.
- Confirm verification leaves no unexpected generated or modified files; the git-ignored production build under `core/target/classes/static/react` is build output, not a tracked change.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer cannot supply the human visual acceptance the affected records require; that
remains a human decision independent of technical review, per ADR-0006.
