# FM-074: System Log Viewer Tab

Status: planned Owner:
Feature IDs: F-SYSTEM-LOG
Component IDs: C-DATE-TIME, C-DIALOG-SERVICE
API IDs: API-SYSTEM-LOG-JSON, API-SYSTEM-LOG-CURRENT, API-SYSTEM-LOG-FILES, API-SYSTEM-LOG-DOWNLOAD
Depends on: None
Blocks: None

## Outcome

Admins inspect the application log at `/system/log` in legacy's three views — a formatted (JSON) log with paging and an
entry-detail dialog, the raw current log file with refresh/tail, and a downloadable log-file list. One route, one legacy
directive (`hydra-log.js`), four endpoints adopted together; splitting views would fragment a single page's state for no
dependency reason.

## Decision Dependencies

ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015.

## Files Allowed To Modify

- `core/ui-react/src/features/system/**` (log page inside FM-072's shell), `core/ui-react/src/api/system/**`
- `core/ui-react/src/domain/date-time/**` (only if the timestamp semantics below need a new helper)
- `core/ui-react/src/router.tsx`, `core/ui-react/src/router.test.tsx`
- `tests/system/tests/system.spec.ts`
- The `F-SYSTEM-LOG`, `C-DATE-TIME`, `C-DIALOG-SERVICE`, and four `API-SYSTEM-LOG-*` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Out Of Scope

- Bugreport/debug actions (FM-076), backend logging behavior, log rotation, sensitive-data masking

## Context To Read

- `core/ui-src/js/directives/hydra-log.js` and `core/ui-src/html/directives/log.html` (three views, 500-line paging,
  5s refresh, tail, localStorage persistence, entry modal, `formatTimestamp`'s epoch-seconds-vs-millis heuristic)
- `DebugInfosWeb` in `core/src` (jsonlogs offset/limit contract, `hasMore`, downloadlog params)
- `core/ui-react/src/features/stats/dashboard/persistence.ts` (guarded localStorage pattern; note the `loadIncludeDisabled`
  throwing-getItem guard, commit 267d7850a)

## Acceptance

- Formatted view (default, legacy `active === 0`): pages of 500 entries from `API-SYSTEM-LOG-JSON` with Older/Newer paging
  (Older gated on `hasMore`, Newer clamped at offset 0); each row shows level, timestamp, and message; a row opens a
  detail dialog with the entry's full contents rendered as text. Timestamps format in the server timezone via `C-DATE-TIME`,
  preserving legacy `formatTimestamp` semantics (numeric values below 1979374757 are epoch seconds, otherwise millis; zoned
  strings keep their offset).
- Raw view: the escaped text of `API-SYSTEM-LOG-CURRENT` (rendered as text, never HTML) in a scrollable panel with a
  scroll-to-bottom control, an auto-refresh toggle (5s interval, only while this view is active) and a tail-follow toggle
  (implies auto-refresh; disabling auto-refresh clears it, matching legacy). Both toggles persist in localStorage with
  guarded reads/writes; the interval is cleared on view change and unmount.
- Files view: `API-SYSTEM-LOG-FILES` names listed, each downloading through `API-SYSTEM-LOG-DOWNLOAD` via a base-URL-aware
  link (no fetch-and-blob needed).
- Selectors (new): `system-log`, `system-log-view-<formatted|raw|files>`, `system-log-table`, `system-log-row`,
  `system-log-entry-dialog`, `system-log-older`, `system-log-newer`, `system-log-refresh-toggle`, `system-log-tail-toggle`,
  `system-log-file-<index>`, recorded on `F-SYSTEM-LOG`.
- Unit/component tests cover paging bounds, timestamp heuristic, toggle persistence and interval cleanup, and text-only
  rendering of log content; Playwright proves the three views against a real backend, including a formatted-entry dialog
  and a raw-log fetch.
- Registry evidence updated (parity, API targets/tests). Screenshot strip per *Visual Gate*: the three views, desktop plus
  mobile if layout differs.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/system.spec.ts` succeeds.
- Confirm changed files match `Files Allowed To Modify`; `git diff --check` clean.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — parity reconstructed from a legacy directive with stateful polling, persistence, and timestamp heuristics.
- Reviewer: `opus` — new API adoption records; matches the implementer's tier.
- Fixer: `sonnet` — expected findings are contained (selector, cleanup, formatting) within one module.

Implementer prompt: Start from `hydra-log.js`; the paging index arithmetic (`currentJsonIndex` +/- 500 and its clamp) and
the refresh/tail coupling are legacy's two subtle behaviors — pin both with tests before building UI. Trap: log lines can
contain markup-like text; prove first that a `<script>` in a log message renders inert as text.
Reviewer prompt: Check hardest interval cleanup across view switches/unmount and the epoch-seconds heuristic edge values;
distrust any "renders as text" claim without a hostile-content test.
