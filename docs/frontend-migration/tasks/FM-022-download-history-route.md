# FM-022: Download History Route

Status: planned Owner:
Feature IDs: F-HISTORY-DOWNLOADS Component IDs: C-DATE-TIME, C-DOWNLOAD-ACTIONS, C-EXTERNAL-LINKS API IDs: API-HISTORY-DOWNLOADS, API-DOWNLOAD-NZB, API-DOWNLOAD-TORRENT Depends on: FM-013, FM-020 Blocks: None

## Outcome

Stats users can page, sort, filter, inspect, and repeat available download actions from canonical `/stats/downloads`.

## Boundary Rationale

History query controls, status presentation, links, and repeat download actions are one route capability over the download DTO. Existing download actions are reused; notification history and aggregate stats have unrelated contracts.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/router.tsx`, `core/ui-react/src/router.test.tsx`
- `core/ui-react/src/api/history/**`, `core/ui-react/src/features/stats/history/**`
- `core/ui-react/src/domain/downloads/**` only for history-consumer integration; `core/ui-react/src/domain/links/**`
- `tests/system/tests/downloads.spec.ts`
- The listed feature/component/API records only; this task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Downloader configuration, live downloader status, deletion, search history, or notification history

## Context To Read

- `CONTEXT.md`; accepted ADRs; FM-013/FM-020 handoffs; listed records
- Legacy download history controller/template, stats/history services, `HistoryWeb`, `FileDownloadEntityTO`, active download links/actions, and download tests

## Acceptance

- Stats-protected route validates paged responses and intentionally handles loading, empty, malformed-entry, partial, and request failure states.
- Server paging/sorting/filtering covers time, indexer, title, result status, source, age, username/IP visibility, and configured status choices.
- Status meanings are accessible text/icons; timestamps use `C-DATE-TIME`; external/dereferenced and application download links use registered base/safety behavior.
- Eligible entries expose correct NZB/torrent repeat actions through `C-DOWNLOAD-ACTIONS`; unavailable or failed actions preserve the row and provide accessible feedback.
- Focused tests cover request/status/link/action transformations and visibility; Playwright exercises deterministic filtering and an available repeat action in React with legacy coverage.
- Registry evidence records route/API/component adoption without claiming live status.

## Verification

- In `core/ui-react`: the complete npm quality/build/API/migration chain succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/downloads.spec.ts` succeeds.
- Run `git diff --check`; inspect status, scope, and generated artifacts.

## Handoff

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.
