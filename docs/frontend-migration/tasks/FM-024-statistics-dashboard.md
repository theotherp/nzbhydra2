# FM-024: Statistics Dashboard

Status: planned Owner:
Feature IDs: F-STATS-MAIN Component IDs: C-DATE-TIME API IDs: API-STATS-QUERY Depends on: FM-020 Blocks: None

## Outcome

Stats users can choose a date range and disabled-indexer inclusion, request selected statistic families, and inspect equivalent responsive tables/charts at canonical `/stats/stats`.

## Boundary Rationale

Request switches, date range, aggregate validation, tables/charts, and refresh form one dashboard contract; splitting chart groups would fragment one endpoint and persisted visibility model. History routes are separate paged record
capabilities.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/package.json` and `core/ui-react/package-lock.json`, only for a justified maintained narrow chart dependency if platform/MUI primitives are insufficient
- `core/ui-react/src/router.tsx`, `core/ui-react/src/router.test.tsx`, `core/ui-react/src/api/stats/**`, `core/ui-react/src/features/stats/**`
- `tests/system/tests/stats.spec.ts`
- The `F-STATS-MAIN`, `C-DATE-TIME`, and `API-STATS-QUERY` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- History tables, indexer configuration/status, new statistics, or backend calculation redesign

## Context To Read

- `CONTEXT.md`; accepted ADRs; FM-020 handoff; listed records
- Legacy stats controller/service/request factory and full stats template, `StatsWeb`, `StatsRequest`/`StatsResponse`, generated types, and `tests/system/tests/stats.spec.ts`

## Acceptance

- Stats-protected route defaults to the legacy date window, validates range input, persists include-disabled/stat visibility choices, and sends every active boolean explicitly.
- Runtime validation safely handles each existing response family, partial selected-stat refreshes, malformed families, timeout/failure, empty data, and cancellation/replacement without discarding valid prior families.
- Every legacy statistic family has an accessible table and equivalent visual chart where meaningful; responsive layout, legends, labels, values, and disabled-stat calculation behavior are preserved.
- Any added chart package is narrow, maintained, compatible with ADR-0002/MUI, classified as runtime, exact/caret-version consistent with repository policy, and justified in handoff; no general component suite is added.
- Pure request/response transformations and component interactions are tested; Playwright proves the complete request, date/include-disabled changes, statistic toggling, and representative visible values at desktop/mobile widths.
- Registry evidence records full dashboard/API parity and concrete tests.

## Verification

- In `core/ui-react`: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/stats.spec.ts` succeeds.
- Run `git diff --check`; inspect status, dependency lock consistency, allowed scope, and generated artifacts.

## Handoff

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.
