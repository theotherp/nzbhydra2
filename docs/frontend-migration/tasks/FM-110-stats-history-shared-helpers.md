# FM-110: Stats History Shared Helpers

Status: planned Owner:
Feature IDs: F-STATS-MAIN, F-HISTORY-SEARCHES, F-HISTORY-DOWNLOADS, F-HISTORY-NOTIFICATIONS
Component IDs: None
API IDs: None
Depends on: FM-108
Blocks: None

## Outcome

The stats area's copy-pasted page plumbing is unified where — and only where — the copies are identical.
`historyUserInfoType(safeConfig)` exists three times byte-for-byte (`SearchHistoryPage.tsx:577`,
`DownloadHistoryPage.tsx:398`, `StatsDashboardPage.tsx:358`); the `TableSortLabel`-based `SortHeader` twice
byte-for-byte modulo prop order (`DownloadHistoryPage.tsx:289`, `NotificationHistoryPage.tsx:232`); `Loading` three
times differing only in the message string (`SearchHistoryPage.tsx:341`, `DownloadHistoryPage.tsx:280`,
`NotificationHistoryPage.tsx:223`); and `const PAGE_SIZE = 25` three times. These collapse into one shared
`features/stats/` module, generic over each page's sort-column union, with rendered DOM identical at every call site.
Explicitly not unified: `SearchHistoryPage.tsx:350`'s `SortHeader`, which renders a `Button` instead of a
`TableSortLabel` — folding it in would change the DOM, and this batch changes no pixel.

## Decision Dependencies

None (intra-feature consolidation; part of the 2026-08-24 cleanup batch FM-108..FM-112, independent of the config
batch — no shared files).

## Files Allowed To Modify

- A new shared module (+ tests) under `core/ui-react/src/features/stats/` (e.g. `shared/`), and the four adopting
  pages: `history/SearchHistoryPage.tsx`, `history/DownloadHistoryPage.tsx`, `history/NotificationHistoryPage.tsx`,
  `dashboard/StatsDashboardPage.tsx`, plus `history/SavedSearchesPage.tsx` only if inspection finds it holds one of
  the same identical copies
- Those pages' test files, for import-line changes only
- This task packet, `../STATUS.md`

## Out Of Scope

- SearchHistoryPage's `Button`-based `SortHeader` and any other near-duplicate that is not behavior-identical
  (`DetailsDialog`, `TitleCell`, per-page criteria renderers stay put)
- `HistoryRefineBar` (`C-HISTORY-REFINE-BAR`), request/api modules, any DOM, selector, sort-request, or paging change
- FM-024's logged quickfix candidates (dead `isAbortError` branch etc. — MAINTENANCE.md governs those)

## Context To Read

- The cited duplicate sites, side by side, before writing anything — the packet's line numbers are from 2026-08-24;
  re-locate them in the current tree
- `api/history/request.ts` (the per-page sort types the generic must range over) and `api/config/safeConfig.ts` (what
  the `historyUserInfoType` reader actually receives)

## Acceptance

- One `historyUserInfoType`, one generic `SortHeader<Column>` (TableSortLabel anatomy, exactly today's
  active/direction derivation including the `sortMode === 1 ? "asc" : "desc"` mapping), one `Loading({message})`
  (today's `Stack`/`CircularProgress`/`Typography` anatomy, `role="status"`, `component="main"`), and one shared
  page-size constant, each with a focused unit test; all previously duplicated definitions deleted.
- Every adopting call site renders identical DOM: same elements, attributes, roles, and text — the per-page loading
  messages are preserved verbatim as arguments.
- Anything found non-identical during extraction is left in place and listed in the handoff, not "harmonized".
- No page's exported component signature, route, request payload, or test assertion changes.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run knip && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search-history.spec.ts tests/downloads.spec.ts tests/notification-history.spec.ts tests/stats.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — consolidation of verified-identical functions, confined to one feature area.
- Reviewer: `sonnet` — no registry-level contract changes; verifies identity claims against the diff.
- Fixer: `sonnet` — mechanical.

Implementer prompt: Diff the duplicate bodies yourself before extracting — the packet's byte-identity claims are your
safety, so re-prove them in the current tree. Trap: SearchHistoryPage's `SortHeader` looks like the others but renders
a `Button` — it is named out of scope; touching it changes visible anatomy. Prove first that one adopted page's
rendered sort header serializes identically (`TableCell` snapshot) before and after.
Reviewer prompt: Check hardest that no "close enough" duplicate was unified — every deleted definition must have been
identical to the shared one modulo type parameters and the message argument. Distrust the handoff's identity claims;
re-diff them from git history.
