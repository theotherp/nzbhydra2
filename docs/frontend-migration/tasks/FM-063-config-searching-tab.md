# FM-063: Config Searching Tab

Status: planned Owner:
Feature IDs: F-CONFIG-SEARCHING Component IDs: C-CONFIG-FIELDS, C-CONFIG-FORM, C-DIALOG-SERVICE API IDs: API-CONFIG-CUSTOM-MAPPING-TEST, API-CONFIG-PUT Depends on: None Blocks: None

## Outcome

Admins configure search behavior at `/config/searching` in React: the nine setting groups that govern indexer access, category handling, query generation and processing, result filtering, processing, display, quick filters, and duplicate
detection, plus the custom title mappings with the help-and-test dialog that proves a mapping against example input before it is kept.

## Boundary Rationale

An independent product capability over `SearchingConfig`, and the only tab whose list section is edited through a modal transaction: the mapping dialog edits a copy and commits it only on submit, so the editor, its test round trip, and the
commit semantics must be reviewed as one thing. It depends on FM-059 only for the field vocabulary.

## Decision Dependencies

- Accepted: ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/config/searching/**`
- `core/ui-react/src/features/config/components/**`, only for additive, non-forking extensions FM-059's vocabulary genuinely lacks; earlier packets' tests must keep passing unmodified
- `core/ui-react/src/api/config/**`, only additively for the custom-mapping test endpoint
- FM-058's config shell/form files and `core/ui-react/src/router.tsx` (+ `router.test.tsx`), only to mount the Searching tab body
- `tests/system/tests/config-searching.spec.ts`
- The `F-CONFIG-SEARCHING`, `C-CONFIG-FIELDS`, and `API-CONFIG-CUSTOM-MAPPING-TEST` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- The search page itself, per-indexer search settings (FM-066), and backend search behavior
- The category configuration (FM-061) even where a searching field refers to categories

## Context To Read

- FM-058 and FM-059 packets and handoffs, `/core/ui-react/AGENTS.md` *UI Conventions*, and the listed registry records
- `core/ui-src/js/config/config-fields-service.js:737-1603` (the whole tab, including the `customMappings` repeat section at 1310-1394), `core/ui-src/js/config/formly-config.js` `customMappingTest`, `core/ui-src/html/custom-mapping-help.html`
- `shared/mapping/.../config/searching/SearchingConfig.java` and `CustomQueryAndTitleMapping.java`, `core/src/main/java/org/nzbhydra/config/validation/SearchingConfigValidator.java`, `CustomQueryAndTitleMappingHandler.java` (the
  `POST /internalapi/customMapping/test` handler and its response shape)

## Acceptance

- `/config/searching` renders every field of `config-fields-service.js:737-1603` with legacy's labels, help, tooltips, units, minimums, option sets, and advanced flags, grouped into legacy's nine fieldsets: Indexer access, Category handling,
  Media IDs / Query generation / Query processing, Result filters, Result processing, Result display, Quick filters, Duplicate detection, and Other.
- Every legacy `hideExpression` on this tab becomes `useWatch`-driven rendering and a hidden field keeps its value, so saving while a condition is unmet never clears the fields behind it.
- `languagesToKeep` stays a free-text chips field as legacy has it (`config-fields-service.js:1227-1235`) — there is no curated language list to reproduce, and none may be invented here.
- Custom mappings are a list section whose entries are edited through a modal transaction: the dialog edits a copy, Cancel discards it, and only submit writes the entry back into the form (`formly-config.js` `customMappingTest`). Every field
  of the legacy mapping entry is present, and the dialog carries the legacy help content.
- The dialog's Test action posts the edited mapping with the example input and the match-all flag to `API-CONFIG-CUSTOM-MAPPING-TEST` and shows the three legacy outcomes distinctly: the produced output on a match, "input does not match" when
  the mapping does not apply, and the server's error text when the mapping is invalid; empty example input is reported without a request. Testing never mutates the form.
- New `data-testid` values are recorded in `F-CONFIG-SEARCHING.selectors`.
- Tests: component tests for the conditional groups with value retention, the mapping dialog's cancel-discards/submit-commits transaction, and each of the four test outcomes; `tests/system/tests/config-searching.spec.ts` (using the `hydra`
  fixture, which restores the instance config) edits one plain and one advanced field, adds a custom mapping, exercises the test round trip against the real backend, saves, reloads, and proves the values persisted.
- Screenshot strip per `../README.md` *Visual Gate*: `/config/searching` with advanced hidden, with advanced shown, and the custom-mapping dialog after a successful test, at 1280x800 and 390x844.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-searching.spec.ts` succeeds, and `tests/config.spec.ts`, `tests/search.spec.ts`, and `tests/results.spec.ts` still pass unchanged.
- Run `git diff --check`; confirm changed files match Files Allowed To Modify and no generated artifacts are left behind.

## Handoff / Review

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — the modal-transaction semantics and the mapping test's outcome mapping are behavior to reconstruct, and this tab's conditional groups reach across fieldsets rather than sitting inside one.
- Reviewer: `opus` — at least the implementer's tier because the mapping dialog may extend the shared vocabulary and because this tab's settings change how every search behaves, so a wrong default is a silent product regression.
- Fixer: `sonnet` — once the transaction and test outcomes are right, expected findings are labels, units, or a missing conditional.

Implementer prompt: Start at `config-fields-service.js:737-1603`, then read `custom-mapping-help.html` and the backend handler for the test endpoint before designing the dialog. Trap: binding the dialog directly to the form entry, which makes
Cancel a no-op and loses legacy's transaction. Prove the test round trip against a running instance first; the field transcription is the easy half.
Reviewer prompt: Check hardest that Cancel really discards and that hidden fields keep their values across a save. Distrust a language-list implementation that silently drops a stored code it does not recognize.
