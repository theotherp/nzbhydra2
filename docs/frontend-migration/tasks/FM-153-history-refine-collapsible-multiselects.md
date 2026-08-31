# FM-153: History Refine Collapsible Multiselects

Status: planned Owner:
Feature IDs: F-HISTORY-SEARCHES, F-HISTORY-DOWNLOADS, F-HISTORY-NOTIFICATIONS, F-SEARCH-SORT-FILTER
Component IDs: C-REFINE-MULTISELECT, C-HISTORY-REFINE-BAR, C-REFINE-SURFACE
API IDs: None
Depends on: None
Blocks: None

## Outcome

ADR-0050: the four history `checkboxes` dimensions — Category (searches), Indexer and Result (downloads), Event type
(notifications) — stop rendering as wrapping chip rows and adopt the results sidebar's collapsible-list presentation (caption
button + `Collapse`, one full-width toggle row per option), collapsed by default, open state not persisted. The presentation
is extracted as one shared, controlled component (`C-REFINE-MULTISELECT`, new registry record already added as `planned`) in
`src/components/refine`, and the results sidebar's Category/Indexer sections are re-based on it at rendered parity — one
packet because the shared component and its two consumers are only reviewable together. Do not run concurrently with FM-150
(shared `features/search/results` test surface).

## Decision Dependencies

ADR-0050; ADR-0016 (empty-selection semantics, unchanged); ADR-0046 (state/options stay per consumer).

## Files Allowed To Modify

- core/ui-react/src/components/refine/** (new `RefineMultiselect` module + test)
- core/ui-react/src/features/stats/history/refine/{HistoryRefineSurface.tsx,HistoryRefineSurface.test.tsx}
- core/ui-react/src/features/search/results/{RefineSidebar.tsx,RefineSidebar.test.tsx,filterControls.tsx,SearchResults.tsx,SearchResults.test.tsx}
- tests/system/tests/{search-history,downloads,notification-history}.spec.ts and results.spec.ts (assertions for the new/old anatomy)
- This task packet, docs/frontend-migration/FEATURES.yaml and COMPONENTS.yaml (linked records only)

## Out Of Scope

- History free text, Source, Age/number-range, and Time controls; the C-REFINE-SURFACE shell chrome; FM-089's results-side
  open-state persistence keys (they keep working; history open state gets NO persistence).
- No filter-model, C-HISTORY-REQUEST, or api/ dimension-declaration change — options stay `{value,label}[]` as declared.

## Context To Read

- `RefineSidebar.tsx:373-435` (`RefineCollapsibleList`), `filterControls.tsx:50-158` (`ToggleRowFilter` rows incl. count span)
- `HistoryRefineSurface.tsx:374-425` (`CheckboxesSection` being replaced), `:217` (testid scheme)
- Dimension declarations: `api/searchHistory.ts:110-118`, `api/history/downloads.ts:94-113`, `api/history/notifications.ts:94-102`
- COMPONENTS.yaml C-REFINE-MULTISELECT/C-REFINE-SURFACE/C-HISTORY-REFINE-BAR; `docs/frontend-migration/history-refine-redesign.md`

## Acceptance

- `RefineMultiselect` (name free) is controlled and presentational: props for entries `{value, label, count?}[]` (rendered in
  given order, no sorting/dedup inside), `selected`, `onChange`, `open`/`onToggleOpen`, label, and per-consumer testids; the
  caption button keeps `refineSectionLabel` typography + `aria-expanded`; rows keep `aria-pressed`, `data-filter-value`, the
  quiet selected treatment via `theme.alpha`, and render the mono count span only when `count` is provided.
- Results sidebar Category/Indexer re-base on it with dedupe/count/sort staying in the results feature; rendered parity proven
  the FM-136/FM-110 way — captured `outerHTML` of the docked expanded Category and Indexer sections byte-identical before and
  after (open-state persistence and all `refine-*` testids unchanged).
- All four history checkbox dimensions render through it: collapsed by default on every mount, open state in component-local
  state only (grep-provable: no new storage key, no `historyRefineCollapsed` change); ADR-0016 holds — empty selection filters
  nothing, no select-all/invert; option order is the declared order.
- Existing testids `history-refine-<id>` and `history-refine-<id>-option` survive; the new caption toggles are recorded (e.g.
  `history-refine-<id>-toggle`) in the three F-HISTORY-* selector lists; C-REFINE-MULTISELECT flips to `done` with consumers
  listed; C-HISTORY-REFINE-BAR's note gains one line.
- Tests: component tests for both consumers (collapsed default, toggle, select/deselect round trip into the filter model) and
  one real-backend spec per history view exercising a filter through the new anatomy.
- Screenshot strip (Visual Gate): desktop 1280x800 — one history view collapsed (default) and expanded with selections, and
  the results sidebar unchanged; mobile 390x844 drawer branch of a history view.

## Verification

- core/ui-react: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run knip`,
  `npm run validate:migration`, `npm run validate:focus-affordances` — all green
- tests/system: `npx playwright test tests/search-history.spec.ts tests/downloads.spec.ts tests/notification-history.spec.ts
  tests/results.spec.ts` against a real backend — green
- Confirm changed files match `Files Allowed To Modify`

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks `review`; a fresh reviewer fills `../templates/review.md`; only the
coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a new shared abstraction with two consumers, a byte-parity rebase, and registry work.
- Reviewer: `opus` — at least the implementer's tier (shared component); must re-derive the outerHTML parity claim.
- Fixer: `opus` — parity findings are not mechanical.

Implementer prompt: Start by capturing the results sidebar's Category/Indexer `outerHTML` at baseline — that is the parity
oracle everything else answers to. The trap: `ToggleRowFilter` sorts and counts internally; that logic must stay in the
results feature, not migrate into the shared component where it would reorder history's declared option order.
Reviewer prompt: Re-derive the outerHTML parity yourself from a baseline checkout; check hardest that history open state is
nowhere persisted and that the Result/Event-type options render in declared, not sorted, order.
