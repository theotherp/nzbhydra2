# FM-020: History And Stats Shell With Indexer Status

Status: done Owner: OpenCode
Feature IDs: F-STATS-SHELL, F-STATS-INDEXERS Component IDs: C-APP-SHELL, C-DATE-TIME API IDs: API-STATS-INDEXER-STATUSES Depends on: FM-019 Blocks: FM-021, FM-022, FM-023, FM-024

## Outcome

The React `/stats` area provides permission/configuration-aware canonical tabs and a complete indexer-status page with server-timezone-aware status dates and VIP warnings.

## Boundary Rationale

The shell needs one useful default route; indexer status is the bounded read-only default and establishes date-time behavior required by every later history page. Other tabs have independent paging or aggregate-stat contracts.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/router.tsx`, `core/ui-react/src/router.test.tsx`, and focused app navigation files under `core/ui-react/src/app/**`
- `core/ui-react/src/domain/date-time/**`, `core/ui-react/src/api/stats/**`, `core/ui-react/src/features/stats/**`
- `tests/system/tests/stats.spec.ts` and `tests/system/tests/search-history.spec.ts`
- The listed feature/component/API records only; this task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Search/download/notification history content, aggregate charts, saved-search behavior already owned by FM-019, or indexer configuration

## Context To Read

- `CONTEXT.md`; accepted ADRs; FM-004/FM-006/FM-008/FM-019 handoffs; listed records
- Legacy stats route definitions, `states/stats.html`, indexer status controller/template, bootstrap timezone/keepHistory/permissions, server endpoint and linked tests

## Acceptance

- Base-aware `/stats` and `/stats/indexers` preserve stats-role protection and expose canonical tabs; keep-history tabs follow safe config and unavailable routes retain migration fallback until implemented.
- `API-STATS-INDEXER-STATUSES` is runtime-validated and renders sorted state, disable times/reasons, limits/resets, and VIP expiry/warnings with accessible table/responsive behavior.
- `C-DATE-TIME` consistently parses epoch, numeric strings, offset timestamps, and server-zone-local values from bootstrap, with explicit invalid/absent behavior.
- Loading, empty, malformed-entry, request failure, and partial data states are intentional; navigation and status semantics are keyboard accessible.
- Unit/component tests exhaust date parsing and status rules; Playwright validates tab visibility/roles and deterministic statuses at desktop/mobile widths.
- Registry records identify concrete shell, date-time, feature, and endpoint evidence.

## Verification

- In `core/ui-react`: the complete npm quality/build/API/migration chain succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/stats.spec.ts tests/search-history.spec.ts` succeeds.
- Run `git diff --check`; inspect status, scope, and generated artifacts.

## Handoff

### Outcome

- Added base-aware `/stats` and `/stats/indexers`, configuration-aware tabs, validated indexer statuses, and timezone-aware date handling.

### Files Modified

- `core/ui-react/src/{router.tsx,router.test.tsx,api/stats/**,domain/date-time/**,features/stats/**}` and `tests/system/tests/stats.spec.ts`.
- Named registries, `STATUS.md`, and this task packet.
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`; no generated production assets are tracked.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: Maven `3.9.16`, Playwright Chromium.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed: 32 files / 143 tests; existing non-failing lint, audit, localStorage, and chunk-size warnings remain. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/stats.spec.ts tests/search-history.spec.ts` | Passed: Maven package and 4 Playwright tests, including deterministic React status data, tab roles, mobile keyboard navigation, and search history. |
| repository root | `git diff --check` | Passed after handoff/status completion. |

### Verification Basis

- Baseline: `6804fe0bec60023610e4a75124f06c4f663c7098`.
- Command coverage: the React chain covers `core/ui-react/src/{router.tsx,router.test.tsx,api/stats/indexerStatuses.ts,api/stats/indexerStatuses.test.ts,domain/date-time/dateTime.ts,domain/date-time/dateTime.test.ts,features/stats/StatsShell.tsx,features/stats/indexers/IndexerStatusesPage.tsx,features/stats/indexers/IndexerStatusesPage.test.tsx}` and registries; GUI packages runtime files and executes `tests/system/tests/stats.spec.ts`; diff check covers all task-owned paths.
- File-content manifest: `core/ui-react/src/domain/date-time/dateTime.ts: a81ee6c7895973b3b7a2079b023eac765c6a14c87e8c7d08019648bcfe0e481e`; `core/ui-react/src/domain/date-time/dateTime.test.ts: 93fdd755bc029e698e907a47ba6b6a4c16770696ac3e3ae51fcc72f777b1b85d`; `core/ui-react/src/api/stats/indexerStatuses.ts: ddf7493bd8cff0d7400f97439cfd4a7c76049b6b417d806d01f184dd86b22d8b`; `core/ui-react/src/api/stats/indexerStatuses.test.ts: 8e891cd03f8d1651d5813226b4a2a85fb571c693b191e136f7d7f63ec7f60979`; `core/ui-react/src/features/stats/StatsShell.tsx: 0b3f32315714fb1ef5bf971711bdf028ce9413c8c8f1a9936500753efa49a6c8`; `core/ui-react/src/features/stats/indexers/IndexerStatusesPage.tsx: 31e87f28715bddd2818cd03e349e02184876906e8da45f54e0a4db6499606e14`; `core/ui-react/src/features/stats/indexers/IndexerStatusesPage.test.tsx: c9745afa8d3a2f90fa7ac29307b377e31ec52014baabbae5c45f518fbbb33839`; `core/ui-react/src/router.tsx: fdd925ed8cedece01bacb4034d7a74259d62adc350befbef9fbac6e55adb1c20`; `core/ui-react/src/router.test.tsx: 2ab6b19505f022b6adf3264ac73360f582d21d4158ff5a7ee9df2552213864d4`; `tests/system/tests/stats.spec.ts: dd758f6c7adee9d9d638c9999b0c97f6cbef1142bc1602bf332db7128b97d6e8`.
- Completed after the last change to each command's listed files: yes.
- Task-owned changes after verification: documentation/lifecycle-only `docs/frontend-migration/{APIS.yaml,COMPONENTS.yaml,FEATURES.yaml,STATUS.md,tasks/FM-020-history-stats-shell-indexers.md}`.

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Architecture Decisions

- Followed ADR-0001 through ADR-0004 for canonical routing, existing MUI/Query, generated-type-informed validated transport, and layered test coverage.
- ADR REQUIRED proposal triggered during this task: None.

### Assumptions

- Spring retains stats-route authorization; numeric timestamps are epoch seconds and offset-less ISO values use the bootstrap server timezone, matching legacy behavior.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- Updated `F-STATS-SHELL`, `F-STATS-INDEXERS`, `C-APP-SHELL`, `C-DATE-TIME`, and `API-STATS-INDEXER-STATUSES` with target and test evidence.

### Follow-Up Work

- FM-021 through FM-024 own remaining history and aggregate-stat tab content.

## Correction Handoff

### Result

- Wrapped the FM-019 `/stats/saved-searches` page in the existing stats shell, preserving its saved-search behavior while retaining canonical stats tabs.
- Added shell visibility coverage when `keepHistory` is false, complete status-label/limit/reset variants, and browser coverage that tabs remain after activating Saved searches.

### Verification Evidence

| Working directory | Command | Classification | Result |
|---|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Affected: corrected router, new shell test, and corrected status test are covered. | Passed: 33 files / 144 tests; existing six non-failing lint warnings, npm audit findings (1 moderate, 3 high), localStorage, and chunk-size warnings remain. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/stats.spec.ts tests/search-history.spec.ts` | Affected: corrected stats runtime and `stats.spec.ts` are packaged and exercised. | Passed: Maven package and 4 Playwright tests. |
| repository root | `git diff --check` | Affected: task-owned files and this correction handoff changed. | Passed after this correction handoff update. |

### Verification Basis

- Baseline: `6804fe0bec60023610e4a75124f06c4f663c7098`.
- Reusable prior evidence: none for the React chain or GUI; both aggregate commands cover corrected task-owned files. The prior evidence for byte-identical API and date-time files remains valid.
- Command coverage: the React chain covers all task-owned React runtime/test files and migration registries; GUI packages corrected React runtime and executes `tests/system/tests/stats.spec.ts`; diff check covers all task-owned paths.
- File-content manifest: `core/ui-react/src/domain/date-time/dateTime.ts: a81ee6c7895973b3b7a2079b023eac765c6a14c87e8c7d08019648bcfe0e481e`; `core/ui-react/src/domain/date-time/dateTime.test.ts: 93fdd755bc029e698e907a47ba6b6a4c16770696ac3e3ae51fcc72f777b1b85d`; `core/ui-react/src/api/stats/indexerStatuses.ts: ddf7493bd8cff0d7400f97439cfd4a7c76049b6b417d806d01f184dd86b22d8b`; `core/ui-react/src/api/stats/indexerStatuses.test.ts: 8e891cd03f8d1651d5813226b4a2a85fb571c693b191e136f7d7f63ec7f60979`; `core/ui-react/src/features/stats/StatsShell.tsx: 0b3f32315714fb1ef5bf971711bdf028ce9413c8c8f1a9936500753efa49a6c8`; `core/ui-react/src/features/stats/StatsShell.test.tsx: 6216b2497291c6c1bb2935abdda4fea8e54b4b7f1a8daa26cd8f5f04c4974ed8`; `core/ui-react/src/features/stats/indexers/IndexerStatusesPage.tsx: 31e87f28715bddd2818cd03e349e02184876906e8da45f54e0a4db6499606e14`; `core/ui-react/src/features/stats/indexers/IndexerStatusesPage.test.tsx: 50272f722dcff690c3a666c45d1460a96c280ed713c4a3b1beda3cf4df0d4019`; `core/ui-react/src/router.tsx: fc97532c7fc9e1bff4b153d621939e5ff23485a1e7917d24d5dc67f175903037`; `core/ui-react/src/router.test.tsx: 2ab6b19505f022b6adf3264ac73360f582d21d4158ff5a7ee9df2552213864d4`; `tests/system/tests/stats.spec.ts: 23a9d5c72c79d12621b08916b17579d2dc2fa4249b343360281b11d5cc1dd5d7`.
- Completed after the last change to every covered implementation/test file: yes. No dependencies changed.

### Scope And Status

- All task-attributable files remain within `Files Allowed To Modify`; no generated production assets are tracked.
- Status remains `review` after passing corrected verification; no self-review was performed.

## Focused Review Correction Handoff

### Result

- Added explicit component-test cases for raw hit counts without limits, blank absent hit counts, both API/download reset values, and API-only reset rendering.

### Verification Evidence

| Working directory | Command | Classification | Result |
|---|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Affected: `IndexerStatusesPage.test.tsx` changed. | Passed: 33 files / 145 tests; existing six non-failing lint warnings, npm audit findings (1 moderate, 3 high), localStorage, and chunk-size warnings remain. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/stats.spec.ts tests/search-history.spec.ts` | Reusable: every runtime, packaging, and system-test file covered by the prior GUI evidence is byte-identical; this correction changes only a component test and task handoff. | Prior passing evidence retained: Maven package and 4 Playwright tests. |
| repository root | `git diff --check` | Affected: the focused test and this handoff changed. | Passed after this handoff update. |

### Verification Basis

- Baseline: `6804fe0bec60023610e4a75124f06c4f663c7098`.
- The React chain was rerun after the focused test correction. The prior manifest remains valid for all other listed React runtime/test files; `core/ui-react/src/features/stats/indexers/IndexerStatusesPage.test.tsx` is now `97797efc99779694c8332676e139b3b08a8e2f9ebdf3ed33ffb52a1defd42dc9`.
- GUI evidence is reusable because `IndexerStatusesPage.tsx`, all other React runtime/packaging files, and `tests/system/tests/{stats.spec.ts,search-history.spec.ts}` are unchanged from the prior GUI run; no runtime, packaging, configuration, or system-test change requires a browser rerun.

### Scope And Status

- All task-attributable files remain within `Files Allowed To Modify`; no generated production assets are tracked.
- Required review finding addressed. Status remains `review`; no self-review was performed.

## Independent Review Correction Handoff

### Result

- Added exhaustive focused date-time coverage for fractional numeric epochs, blank and non-finite values, invalid local/calendar values, invalid zones, and `Z`, colon, and compact offset forms.
- Corrected offset timestamp parsing to reject calendar values that JavaScript would otherwise normalize (for example, February 30).
- Added indexer-status coverage for a download-reset-only value and non-warning/invalid VIP dates.

### Verification Evidence

| Working directory | Command | Classification | Result |
|---|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Affected: `dateTime.ts`, `dateTime.test.ts`, and `IndexerStatusesPage.test.tsx` changed. | Typecheck, lint (six existing non-failing warnings), formatting, 33 files/145 tests, build, and API check passed. `validate:migration` failed on pre-existing unfinished ownership records: `F-SEARCH-SAVED`, `F-HISTORY-SAVED-SEARCHES`, and `C-EXTERNAL-LINKS`; these are outside this task's allowed registry records. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/stats.spec.ts tests/search-history.spec.ts` | Affected: `dateTime.ts` is a packaged runtime file, so prior GUI evidence cannot be reused. | Passed: Maven package and 4 Playwright tests. |
| repository root | `git diff --check` | Affected: task-owned implementation, tests, and this handoff changed. | Passed after this handoff update. |

### Verification Basis

- Baseline: `6804fe0bec60023610e4a75124f06c4f663c7098`.
- The prior evidence remains reusable only for byte-identical covered files. The corrected React runtime/test manifest is: `core/ui-react/src/domain/date-time/dateTime.ts: 8c38ce6b414e3872315559feb8a4789dcb321789a7831be73c2f045f193475e1`; `core/ui-react/src/domain/date-time/dateTime.test.ts: a0f244b111af96ac561f6a5d4b11d96abaa5787a4e77879d1f750b5422c08110`; `core/ui-react/src/features/stats/indexers/IndexerStatusesPage.test.tsx: 66f0f364638227419ced397ee4762cbe45e3f107ae6dcdb31c94e3039d4efcf9`.
- GUI evidence was rerun because the date-time runtime file changed; all other GUI-covered runtime, packaging, and system-test files remain byte-identical.
- The React quality/build/API/migration command cannot be recorded as passing until the three existing registry-ownership validation failures are resolved by their owning work; no prohibited registry write was made here.

### Scope And Status

- Task-attributable modifications are limited to `core/ui-react/src/domain/date-time/{dateTime.ts,dateTime.test.ts}`, `core/ui-react/src/features/stats/indexers/IndexerStatusesPage.test.tsx`, and this allowed task packet. No generated production assets are tracked.
- Status remains `review` as directed. No self-review was performed.

## Second Independent Review Correction Handoff

### Result

- Added direct component assertions that the temporary-disabled `Bravo` status renders its Disabled until value and that the Disabled until cells for non-temporary `Charlie` and `Delta` statuses remain empty.

### Verification Evidence

| Working directory | Command | Classification | Result |
|---|---|---|---|
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Affected: `IndexerStatusesPage.test.tsx` changed. | Passed: typecheck, formatting, 33 files / 145 tests, build, API check, and migration validation. Lint retained six existing non-failing warnings; npm reported 1 moderate and 3 high audit findings; localStorage and chunk-size warnings remain. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/stats.spec.ts tests/search-history.spec.ts` | Reusable: this correction changes only a component test and task handoff; every runtime, packaging, configuration, and system-test file in the prior browser basis is byte-identical. | Prior passing evidence retained: Maven package and 4 Playwright tests. |
| repository root | `git diff --check` | Affected: the focused test and this handoff changed. | Passed after this handoff update. |

### Verification Basis

- Baseline: `7de1c60301fee910d72ee69dc04b14e59d009b9b`.
- The React chain was rerun after the focused component-test correction. The prior manifest remains valid for unchanged task-owned runtime/test files; the changed test is `core/ui-react/src/features/stats/indexers/IndexerStatusesPage.test.tsx: 569471295022d0889ddb12b603ab2458642126a686fd4eb28b1ab8d5d02516a2`. The resumed date-time manifest remains `core/ui-react/src/domain/date-time/dateTime.ts: 8c38ce6b414e3872315559feb8a4789dcb321789a7831be73c2f045f193475e1`; `core/ui-react/src/domain/date-time/dateTime.test.ts: a0f244b111af96ac561f6a5d4b11d96abaa5787a4e77879d1f750b5422c08110`.
- Browser evidence is reusable because the correction did not change a runtime, packaging, configuration, or system-test file; the prior browser-covered hashes still match its runtime/test basis.

### Scope And Status

- Task-attributable modifications remain limited to `core/ui-react/src/domain/date-time/{dateTime.ts,dateTime.test.ts}`, `core/ui-react/src/features/stats/indexers/IndexerStatusesPage.test.tsx`, and this allowed task packet. No generated production assets are tracked.
- Required review finding addressed. Status remains `review`; no self-review was performed.

## Validator Reconciliation Handoff

### Result

- Reopened to `review` solely to reconcile validator-required deferred backlog ownership for `F-STATS-SHELL` and `F-STATS-INDEXERS`.
- No source or test file changed.

### Verification Evidence

| Working directory | Command | Classification | Result |
|---|---|---|---|
| repository root | `node core/ui-react/scripts/validate-migration.mjs` | Affected: the two linked feature registry records changed. | Passed. |
| repository root | `git diff --check` | Affected: task packet, linked feature records, and status changed. | Passed. |

### Verification Basis

- Baseline: `14f7e409cb25c1917c040f9a6943bb5a986d07ce`.
- The prior React quality/build/API chain and GUI evidence are reusable: this reconciliation changes no task-owned implementation, test, runtime, packaging, configuration, or system-test file.
- The direct validator run replaces the registry-validation portion of the prior aggregate chain for the changed feature records. `git diff --check` was rerun for the corrected task-attributable documentation diff.

### Scope And Status

- Task-attributable modifications are limited to `docs/frontend-migration/FEATURES.yaml`, `docs/frontend-migration/STATUS.md`, and this task packet, all within `Files Allowed To Modify`.
- Required validator finding addressed. Status is `review`; no self-review was performed.
