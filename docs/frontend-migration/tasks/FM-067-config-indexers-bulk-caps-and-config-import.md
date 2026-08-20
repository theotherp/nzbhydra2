# FM-067: Config Indexers — Bulk Caps Recheck And Jackett/Prowlarr Import

Status: planned Owner:
Feature IDs: F-CONFIG-INDEXERS Component IDs: C-CONFIG-FIELDS, C-CONFIG-FORM, C-DIALOG-SERVICE API IDs: API-CONFIG-INDEXER-CAPS, API-CONFIG-INDEXER-CAPS-MESSAGES, API-CONFIG-INDEXER-PROWLARR, API-CONFIG-INDEXER-JACKETT, API-CONFIG-PUT Depends on: FM-066 Blocks: None

## Outcome

Admins repair and populate their indexer list in bulk at `/config/indexers`: recheck capabilities for the incomplete indexers or for all of them, watching the per-indexer messages arrive, and import a whole Jackett or Prowlarr indexer set in
one step, seeing exactly how many entries were added, updated, or removed before saving.

## Boundary Rationale

Two independent capabilities that operate on the whole list rather than on one entry, and the only place where a single action rewrites the entire `indexers` array — a different risk from FM-066's per-entry transaction. They are separated
from FM-066 by a genuine dependency: both reuse its edit modal, its progress dialog, and its result-merge, which must exist and be reviewed first.

## Decision Dependencies

- Accepted: ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/config/indexers/**`
- `core/ui-react/src/api/config/**`, only additively for the import endpoints
- `core/ui-react/src/features/config/components/**`, only for additive, non-forking extensions FM-059's vocabulary genuinely lacks; earlier packets' tests must keep passing unmodified
- `tests/system/tests/config-indexers.spec.ts`, additively — FM-066's tests must keep passing unmodified
- The `F-CONFIG-INDEXERS`, `API-CONFIG-INDEXER-CAPS`, `API-CONFIG-INDEXER-CAPS-MESSAGES`, `API-CONFIG-INDEXER-PROWLARR`, and `API-CONFIG-INDEXER-JACKETT` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- The per-indexer edit modal, presets, connection check, and single caps check (FM-066 owns them; extend, never fork)
- Jackett and Prowlarr themselves, and any backend import or caps behavior

## Context To Read

- FM-066's packet and handoff, `/core/ui-react/AGENTS.md` *UI Conventions*, and the listed registry records
- `core/ui-src/js/config/formly-config.js:628-650` (`recheckAllCaps` and its merge back into the list) and `core/ui-src/html/config/recheck-all-caps.html`, `core/ui-src/js/config/formly-indexers.js:746-802` (both import flows) and
  `:1163-1200` (the `IMPORT_CONFIG` submit path), `core/ui-src/js/indexer-config-import-request-service.js`, `core/ui-src/js/caps-check-request-service.js`
- `core/src/main/java/org/nzbhydra/indexers/capscheck/IndexerWeb.java`, `JacketConfigRetriever.java`, `ProwlarrConfigRetriever.java` and their response types

## Acceptance

- The tab offers "Recheck caps for incomplete indexers" as the primary action and "Recheck caps for all indexers" beside it, sending `checkType` `INCOMPLETE` and `ALL` respectively (`recheck-all-caps.html`).
- A bulk recheck reuses FM-066's progress dialog, which for a non-`SINGLE` check prefixes each polled message with the indexer's name (`CheckCapsModalInstanceCtrl`), and reports "No indexers were checked" when the result list is empty.
- Results are merged back per indexer by name, updating only the capability fields legacy updates (`updateIndexerModel`: supported search IDs and types, category mapping, `configComplete`, `allCapsChecked`, hit and download limits, state,
  backend) and leaving every other field of that entry — including the user's unsaved edits to unrelated fields — untouched. The merge marks the form dirty; nothing is persisted until the shell saves.
- Importing offers "Read from Jackett" and "Read from Prowlarr (all)" from the same add surface FM-066 built, each opening a dialog that asks only for host and API key, seeded with legacy's defaults (`http://127.0.0.1:9117` for Jackett,
  `http://127.0.0.1:9696` for Prowlarr).
- The import dialog stays open on failure and shows the server's `errorMessage`, its status text, or an unknown-error fallback in that order (`formly-indexers.js:1163-1200`); only a successful response closes it.
- A successful import replaces the whole indexer list with the returned `newIndexersConfig` and reports the counts the response carries — added and updated trackers for Jackett, added, updated, and removed indexers for Prowlarr, with the
  removal line shown only when it is non-zero. The replacement is a form edit: the admin can still leave without saving, and the unsaved-changes guard applies.
- Because a replacement discards entries the import does not return, the action states that consequence before it runs.
- New `data-testid` values are recorded in `F-CONFIG-INDEXERS.selectors` alongside FM-066's.
- Tests: component tests for both check types, the name-keyed merge preserving unrelated fields and unsaved edits, the empty-result message, both import dialogs' failure and success paths, and the count reporting including the suppressed
  zero-removal line; `tests/system/tests/config-indexers.spec.ts` gains a bulk recheck against the suite's mock indexers, run through the `hydra` fixture so the instance config is restored.
- Screenshot strip per `../README.md` *Visual Gate*: the recheck actions, the progress dialog mid-check with per-indexer messages, the import dialog, and an import failure, at 1280x800 and 390x844.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-indexers.spec.ts` succeeds, and `tests/config.spec.ts` and `tests/search.spec.ts` still pass unchanged.
- Run `git diff --check`; confirm changed files match Files Allowed To Modify and no generated artifacts are left behind.

## Handoff / Review

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a merge that must touch exactly nine fields of matching entries and an import that replaces the entire list; both are destructive if the boundary is drawn one field too wide, and both are reconstructed from AngularJS.
- Reviewer: `opus` — at least the implementer's tier because the packet may extend FM-066's shared dialog and merge, and because the damage from a wrong merge is invisible until a search fails.
- Fixer: `opus` — expected findings land in merge scope or import failure handling rather than in markup.

Implementer prompt: Start at `formly-config.js`'s `recheckAllCaps` and `updateIndexerModel`, then the two import flows; the field list in `updateIndexerModel` is the exact merge contract. Trap: replacing whole entries after a recheck, which
silently reverts unsaved edits. Prove the merge preserves an unsaved edit on an unrelated field before wiring the dialog.
Reviewer prompt: Check hardest that the merge writes only the capability fields and matches by name, and that a failed import leaves the list untouched. Distrust an import test that never asserts what happened to a pre-existing indexer.
