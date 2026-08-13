# FM-016: Search Indexer Selection

Status: planned Owner:
Feature IDs: F-SEARCH-FORM, F-SEARCH-INDEXERS Component IDs: C-CATEGORY-CATALOG API IDs: API-SEARCH-EXECUTE Depends on: FM-025 Blocks: FM-017

## Outcome

React search users who may choose indexers can select eligible individual sources, types, and groups, restore configured/URL selections, and submit exactly that selection.

## Boundary Rationale

Eligibility, selection controls, URL serialization, and request construction must change together to make source selection truthful. Media refinement precedes this because both own the form/request model; recent-search reuse follows because
it must refill the final selection semantics.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/{SearchPage.tsx,SearchPage.test.tsx,workspace/**}`
- `core/ui-react/src/domain/categories/**`
- `tests/system/tests/search.spec.ts`
- The `F-SEARCH-FORM`, `F-SEARCH-INDEXERS`, `C-CATEGORY-CATALOG`, and `API-SEARCH-EXECUTE` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Indexer configuration, result filtering/status, recent searches, or changing search endpoint semantics

## Context To Read

- `CONTEXT.md`; accepted ADRs; FM-010 and FM-015 handoffs; listed records
- Legacy `search-controller.js`, `multiselect-dropdown.js`, `states/search.html`, bootstrap safe config/permissions, and search tests

## Acceptance

- Controls appear only when session/bootstrap permission permits and include category-eligible `showOnSearch` sources with disabled/unavailable behavior preserved.
- Dropdown and configured checkbox presentations support individual selection, all/none/invert, preselection reset, Usenet/Torznab type selection, and named groups with accessible state.
- Category changes reconcile eligibility without retaining hidden invalid selections; explicit canonical `indexers` criteria restore valid selections, while absent criteria use preselection.
- Submission serializes canonical selection and sends exactly those indexers; zero selection issues no search and gives accessible feedback.
- Component/domain tests cover permissions, eligibility, every bulk action, category transitions, and URL/request round trips; Playwright exercises both configured presentations and legacy-equivalent selection.
- Registry records identify concrete target/test evidence.

## Verification

- In `core/ui-react`: full quality chain `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/search.spec.ts` succeeds.
- Run `git diff --check`; inspect status for allowed scope and unexpected generated files.

## Handoff

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.
