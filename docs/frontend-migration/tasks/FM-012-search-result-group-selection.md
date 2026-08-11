# FM-012: Search Result Grouping And Selection

Status: planned Owner:
Feature IDs: F-SEARCH-GROUP-SELECTION Component IDs: C-RESULT-TABLE API IDs: none Depends on: FM-011 Blocks: FM-013

## Outcome

React search results provide duplicate, title, and eligible episode grouping with expansion, row selection, invert/select-all/deselect-all controls, and shift-selection semantics.

## Boundary Rationale

Grouping defines visible rows and selection defines the bulk-action input, so both must operate over one explicit domain result model. Downloading is separate because it adds binary/network side effects after this task makes the selection
set trustworthy.

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/**`
- `tests/system/tests/results.spec.ts`
- The `F-SEARCH-GROUP-SELECTION` and `C-RESULT-TABLE` records only
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository. Context To Read is mandatory starting context, not a read allowlist. Do not modify files outside Files Allowed To Modify; escalate the exact path and reason if one is required.

## Out Of Scope

- Download actions, paging, saved searches, server preferences, external links, covers, NFO, and Emby availability
- Changes to sorting/filtering semantics except integration required to preserve the FM-011 filtered result set

## Context To Read

- `CONTEXT.md`, `ADR-0002`, `ADR-0004`, and FM-010/FM-011 handoffs
- `F-SEARCH-GROUP-SELECTION` and `C-RESULT-TABLE`
- `core/ui-src/js/search-results-controller.js`, `core/ui-src/js/directives/search-result.js`, and `core/ui-src/js/directives/selection-button.js`
- `core/ui-src/html/{states/search-results.html,directives/search-result.html}` and `tests/system/tests/results.spec.ts`

## Acceptance

- Explicit result-domain logic groups by normalized title and duplicate hash, preserves the torrent/Usenet grouping choice, and applies eligible TV episode grouping only when no episode is requested.
- Collapsed groups expose deterministic expansion controls; duplicate/title/episode group rendering remains keyboard operable and does not create duplicate visible row identities.
- Row checkboxes, select all, deselect all, invert selection, and shift-selection operate over current visible filtered ordering. Filtering removes selections no longer visible.
- `search-result-row` remains stable, and each visible row retains result ID/title data contracts needed by system tests.
- Pure grouping and selection transformations have exhaustive unit tests, including malformed/titleless values and grouped duplicate boundaries. Component tests cover keyboard and shift selection; Playwright validates group expansion and
  bulk selection in legacy and React shells.
- No download endpoint or action is called by this task; selected rows are exposed only as local result-table state for FM-013.

## Verification

- In `core/ui-react`: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/results.spec.ts` succeeds with React grouping/selection coverage.
- From repository root: `git diff --check` and `git status --short`; confirm all changed/generated paths are allowed and report unexpected artifacts.

## Handoff

### Result

Record grouping/selection behavior and exclusions.

### Verification

Use `templates/handoff.md`; record commands, results, scope check, and SHA-256 verification basis.

### Decisions

Record grouping keys, ordering, and selection semantics.

### Dependency/toolchain decisions

Record dependencies, versions, and actual Node/npm versions, or `None`.

### Assumptions

Record material assumptions, or `None`.

### Unresolved issues

Record deferred or blocked work, or `None`.

### Follow-up

Record bounded follow-up proposals, or `None`.
