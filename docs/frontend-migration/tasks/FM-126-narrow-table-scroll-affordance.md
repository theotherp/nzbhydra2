# FM-126: Narrow-Table Scroll Affordance

Status: ready Owner:
Feature IDs: F-HISTORY-SEARCHES, F-HISTORY-DOWNLOADS, F-HISTORY-NOTIFICATIONS, F-CONFIG-INDEXERS, F-CONFIG-CATEGORIES
Component IDs: None
API IDs: None
Depends on: None
Blocks: None

## Outcome

At narrow widths every wide table scrolls inside its own container and visibly says so: one shared scroll-edge affordance
(shadow or gradient at each clipped edge, cleared once that edge is fully scrolled into view), applied uniformly to the five
surfaces ADR-0038 names. Today none of them has it, and three cannot even scroll: `DownloadHistoryPage.tsx:157` and
`NotificationHistoryPage.tsx:138` wrap a `TableContainer` around a `Table` with no width floor, so at 390px cells wrap
mid-word ("Syst / em") instead of overflowing; `SearchHistoryPage.tsx:201` has no container at all — a bare `Table` under the
page `Stack`, the structurally worst of the five and the one ADR-0038 asks to confirm first. `IndexerTable.tsx:250-267`
scrolls between `sm` and its 900px floor with no hint that Priority continues off-canvas, and drops its floor below `sm`;
`CategoriesTable.tsx:309-316` has `overflowX: "auto"` but no floor. One packet because ADR-0038's binding constraint is
"one shared affordance mechanism/component, not four bespoke implementations".

## Decision Dependencies

ADR-0038 (governs this task), ADR-0014 (UI conventions), ADR-0029 (page never scrolls sideways; container scroll pattern).

## Files Allowed To Modify

- `core/ui-react/src/components/**` (the new shared affordance component and its unit test only)
- `core/ui-react/src/features/stats/history/{SearchHistoryPage,DownloadHistoryPage,NotificationHistoryPage}.tsx` (+ their tests)
- `core/ui-react/src/features/config/indexers/IndexerTable.tsx`, `core/ui-react/src/features/config/categories/CategoriesTable.tsx` (+ their tests)
- `tests/system/tests/{search-history,downloads,notification-history,config-indexers,config-categories}.spec.ts`
- `docs/frontend-migration/COMPONENTS.yaml`, `docs/frontend-migration/FEATURES.yaml`, this task packet

## Out Of Scope

- Dropping or merging columns below `sm` (ADR-0038 forbids it); any column-content or sorting change
- Any other table in the app; retrofitting is future work once the shared component exists
- The FM-130 registry-truth edits (disjoint FEATURES.yaml records)

## Context To Read

ADR-0038; `IndexerTable.tsx:250-267` and `CategoriesTable.tsx:307-327` (the two shipped container-scroll rationales, whose
comments stay true); `tests/system/tests/config-indexers.spec.ts:392-465` (the existing 390px reachability assertions that
must stay green); `FEATURES.yaml` records listed above; `visualEvidence.ts` viewports.

## Acceptance

- A shared component (register it as `C-TABLE-SCROLL-AFFORDANCE` in `COMPONENTS.yaml` before implementing) wraps or decorates
  a horizontally scrollable container: affordance visible at an edge exactly while content is clipped there
  (`scrollWidth > clientWidth` and that edge not at its scroll limit), absent otherwise. Logic unit-tested with driven
  scroll metrics; jsdom layout claims are not accepted as visual proof (ADR-0004).
- All five surfaces use it. Each table gets a width floor (implementer-measured, justified in a comment like
  `IndexerTable.tsx:263-267`'s) so at 390x844 columns keep their intrinsic width and the container scrolls — no mid-word
  cell wrapping. `SearchHistoryPage` first gains the container it lacks; confirm and record its 390px before-state.
- Page-level `scrollWidth <= clientWidth` stays green on every affected route (existing assertions, e.g.
  `downloads.spec.ts:291-298`, `config-indexers.spec.ts:392`); no existing `data-testid` changes.
- At least one real-browser Playwright assertion pins the affordance semantics end-to-end (appears clipped, clears after
  scrolling to the end) on `search-history.spec.ts`, whose table currently has no 390px coverage at all.
- Registries: `COMPONENTS.yaml` record for the new component; each of the five `FEATURES.yaml` records names the affordance
  selector; reconcile `FEATURES.yaml:709`'s phantom `config-categories-scroller` (recorded selector that exists nowhere in
  `src` — implement it on the categories container or correct the record to what ships).
- Screenshot strips per Visual Gate: fresh 390x844 capture of each of the five tables showing the affordance, plus
  1280x800 where the route's strip convention already includes it; indexers also at its 700px tablet case.

## Verification

- `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm test -- --run && npm run build && npm run check:api && npm run validate:migration` — all pass
- Root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search-history.spec.ts tests/downloads.spec.ts tests/notification-history.spec.ts tests/config-indexers.spec.ts tests/config-categories.spec.ts` — all pass, strips regenerated
- Root: `git diff --check` clean; changed files match the allowlist

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a net-new shared component with no in-repo precedent, five consuming modules, and scroll-metric
  semantics that must be proven in a real browser.
- Reviewer: `opus` — shared-component introduction; reviewer tier must not be below the implementer's.
- Fixer: `opus` — findings will likely concern cross-surface uniformity, not mechanical edits.

Implementer prompt: Start from ADR-0038 and `IndexerTable.tsx:250-267`. The trap: a `minWidth` without a scrolling ancestor
pushes the page sideways (`SearchHistoryPage` has no container today) — prove first, in a real browser at 390px, that each
route keeps `scrollWidth <= clientWidth` at page level while the table itself scrolls.
Reviewer prompt: Check hardest that the affordance clears at the scroll end on every surface and that no history column
wraps mid-word at 390px. Distrust jsdom-only evidence for anything visual; require the Playwright run and the strips.
