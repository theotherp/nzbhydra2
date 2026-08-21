# FM-076: System Bugreport / Debug Tab

Status: planned Owner:
Feature IDs: F-SYSTEM-BUGREPORT
Component IDs: C-API-TRANSPORT, C-TOAST-SERVICE, C-DATE-TIME
API IDs: API-SYSTEM-DEBUG-ZIP, API-SYSTEM-DEBUG-UPLOAD, API-SYSTEM-THREAD-DUMP, API-SYSTEM-SENSITIVE-GET, API-SYSTEM-SENSITIVE-PUT, API-SYSTEM-SQL-QUERY, API-SYSTEM-SQL-UPDATE, API-SYSTEM-THREAD-CPU, API-SYSTEM-ENDPOINTS, API-SYSTEM-HEAP-DUMP
Depends on: None
Blocks: None

## Outcome

Admins get legacy's Bugreport/Debug tab at `/system/bugreport`: the how-to-report prose, debug-info archive
(download or upload-to-file-share), thread-dump trigger, sensitive-data-logging toggle, heap-dump and endpoint links, the
SQL debug console, and the live CPU-usage chart. One page over one legacy template (`bugreport.html` +
`system-controller.js`); every action is a thin admin diagnostic on the same surface, none independently shippable.

## Decision Dependencies

ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015, ADR-0021 (chart layer precedent: `@mui/x-charts`, themed, with the data reachable as text).

## Files Allowed To Modify

- `core/ui-react/src/features/system/**` (bugreport page inside FM-072's shell), `core/ui-react/src/api/system/**`
- `core/ui-react/src/router.tsx`, `core/ui-react/src/router.test.tsx`
- `tests/system/tests/system.spec.ts`
- The `F-SYSTEM-BUGREPORT` record, the ten `API-SYSTEM-*` records, and the three component records listed above only
- This task packet and `docs/frontend-migration/STATUS.md`

## Out Of Scope

- The log viewer (FM-074), backend debuginfos behavior, new diagnostics, chart-library changes

## Context To Read

- `core/ui-src/html/bugreport.html` and `core/ui-src/js/system-controller.js` (actions, toast wording, tooltips, 5s CPU
  poll with stop-on-error, server-timezone tick formatting)
- `DebugInfosWeb` in `core/src` (response shapes: upload returns a URL string; SQL endpoints return `GenericResponse`)
- `core/ui-react/src/features/stats/dashboard/` (`@mui/x-charts` usage and themed chart pattern from FM-024)

## Acceptance

- Prose panel reproduces legacy's bug-reporting guidance with its GitHub/mail links (legacy uses no dereferer here).
- "Create and download debug infos" streams `API-SYSTEM-DEBUG-ZIP` through the transport's binary path as
  `nzbhydra-debuginfos-YYYY-MM-DD-HH-mm.zip` with a busy indicator; "Create and upload debug infos" calls
  `API-SYSTEM-DEBUG-UPLOAD` and renders the returned URL as a safe anchor (text, never injected HTML — legacy's
  `ng-bind-html` here is a known XSS-shaped hazard not to reproduce); its failure shows the response text.
- "Log thread dump" calls `API-SYSTEM-THREAD-DUMP`. The sensitive-data toggle loads its state from
  `API-SYSTEM-SENSITIVE-GET`, flips it via `API-SYSTEM-SENSITIVE-PUT`, reflects the returned state in the button label,
  keeps legacy's two tooltip texts, and toasts legacy's warning (enabled) or info (disabled) wording.
- Heap-dump (`actuator/heapdump`, with legacy's J9 tooltip) and "List HTTP endpoints" open as base-URL-aware links in a new
  tab.
- SQL console: one input area with Query (`API-SYSTEM-SQL-QUERY`) and Execute (`API-SYSTEM-SQL-UPDATE`) actions posting the
  raw SQL text; a successful response fills the read-only output area (Execute appends legacy's " rows affected"), a
  `successful=false` response toasts the message.
- CPU chart: polls `API-SYSTEM-THREAD-CPU` every 5s, renders a themed `@mui/x-charts` line chart with server-timezone
  HH:mm:ss ticks and legacy's help tooltip (Performance logging marker); a failed poll stops the polling; the interval is
  cleared on unmount; the latest values are also reachable as accessible text/table (ADR-0021 pattern).
- Selectors (new): `system-bugreport`, `system-debug-download`, `system-debug-upload`, `system-debug-upload-result`,
  `system-thread-dump`, `system-sensitive-toggle`, `system-heap-dump`, `system-endpoints`, `system-sql-input`,
  `system-sql-query`, `system-sql-execute`, `system-sql-output`, `system-cpu-chart`, recorded on `F-SYSTEM-BUGREPORT`.
- Component tests cover every action's success/refusal branch (transport mocked) and poll cleanup; Playwright proves the
  page against a real backend including the sensitive toggle round trip (restored to off afterwards) and a harmless
  `SELECT` query — never `API-SYSTEM-DEBUG-UPLOAD` (external share) and no destructive SQL.
- Registry evidence updated (parity, ten API targets/tests). Screenshot strip per *Visual Gate*: full page including chart
  and SQL console; desktop plus mobile if layout differs.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/system.spec.ts` succeeds.
- Confirm changed files match `Files Allowed To Modify`; `git diff --check` clean.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — parity reconstructed from legacy source across many small transport actions plus a polled chart.
- Reviewer: `opus` — ten API adoption records; matches the implementer's tier.
- Fixer: `opus` — findings will likely sit in polling/branch behavior rather than mechanical polish.

Implementer prompt: Start from `bugreport.html`/`system-controller.js` and FM-024's chart pattern. Trap: legacy injects the
upload-result anchor via `ng-bind-html` — render the URL as data in a React anchor instead, and treat the error path's body
as text. Prove first that the sensitive-logging toggle reflects the server's returned state, not the optimistic flip.
Reviewer prompt: Check hardest that no HTML from any response is injected and that Playwright leaves sensitive logging off
and the database untouched; distrust chart claims without an accessible-text rendering of the same data.
