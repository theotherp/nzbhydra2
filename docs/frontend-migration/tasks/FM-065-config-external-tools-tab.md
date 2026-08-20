# FM-065: Config External Tools Tab

Status: planned Owner:
Feature IDs: F-CONFIG-EXTERNAL-TOOLS Component IDs: C-CONFIG-FIELDS, C-CONFIG-FORM, C-DIALOG-SERVICE, C-TOAST-SERVICE API IDs: API-CONFIG-EXTERNAL-CONNECTION, API-CONFIG-EXTERNAL-CONFIGURE, API-CONFIG-EXTERNAL-SYNC, API-CONFIG-PUT Depends on: FM-059 Blocks: None

## Outcome

Admins manage Sonarr, Radarr, Lidarr, and Readarr entries at `/config/externalTools` in React: add from a preset or custom, edit in a modal that tests the connection and then writes NZBHydra into the tool, remove entries, and sync every
configured tool at once — with the existing real-backend system test proving the same request contract against live *arr instances as it does today.

## Boundary Rationale

An independent product capability over `ExternalToolsConfig` whose modal does something no other tab's does: submitting performs a real, externally visible side effect on another application, not just a form commit. It carries the one
existing config system test in the suite, which must be re-pointed at React without losing coverage. Depends on FM-059 for the field vocabulary and on FM-064's modal-transaction precedent only by convention, not by contract.

## Decision Dependencies

- Accepted: ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/config/external-tools/**`
- `core/ui-react/src/features/config/components/**`, only for additive, non-forking extensions FM-059's vocabulary genuinely lacks; earlier packets' tests must keep passing unmodified
- `core/ui-react/src/api/config/**`, only additively for the external-tool endpoints
- FM-058's config shell/form files and `core/ui-react/src/router.tsx` (+ `router.test.tsx`), only to mount the External Tools tab body
- `tests/system/tests/external-tools.spec.ts`
- The `F-CONFIG-EXTERNAL-TOOLS`, `C-CONFIG-FIELDS`, `API-CONFIG-EXTERNAL-CONNECTION`, `API-CONFIG-EXTERNAL-CONFIGURE`, and `API-CONFIG-EXTERNAL-SYNC` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- `API-CONFIG-EXTERNAL-DIALOG` and `API-CONFIG-EXTERNAL-MESSAGES`: the "Configure NZBHydra in ..." wizard they serve (`config-service.js:100-233`, `configure-in-modal.html`) has no trigger anywhere in the legacy UI and is not migrated. Leave
  both records' targets `null` and say so in the handoff; do not build a polled-progress dialog for a dead path.
- Indexer configuration (FM-066/FM-067) even though syncing pushes indexers, and any backend sync behavior

## Context To Read

- FM-058, FM-059, and FM-064 packets and handoffs, `/core/ui-react/AGENTS.md` *UI Conventions*, and the listed registry records
- `core/ui-src/js/config/formly-external-tools.js` (presets, the per-type field set, `syncAll`, `addEntry` defaults, and the box controller's `testConnection`/`checkConnection`/`syncToExternalTool`),
  `core/ui-src/html/config/external-tool-config.html` and `external-tool-config-box.html`, `core/ui-src/js/external-tool-request-service.js`, `core/ui-src/js/config/config-fields-service.js:1980-2000`
- `shared/mapping/.../config/ExternalTool*`, `core/src/main/java/org/nzbhydra/externaltools/**`, and `tests/system/tests/external-tools.spec.ts` in full

## Acceptance

- `/config/externalTools` renders the sync-on-config-change switch (`config-fields-service.js:1980-2000`), the empty state "No external tools configured" with its guidance, the configured tools sorted by name, an "Add external tool" menu
  offering Sonarr, Radarr, Lidarr, Readarr and Custom, and a sync-all action.
- A new entry starts from legacy's defaults (`formly-external-tools.js:106-121`: enabled, `PER_INDEXER`, usenet on, torrents off, RSS/automatic/interactive search on, Hydra priorities on, priority 25, name `NZBHydra2`, the default host) and,
  for a preset, that preset's name, type, host, categories, and sync type.
- Editing is a modal transaction over a copy: Cancel, backdrop dismissal, and Reset discard; Delete removes the entry; only Submit commits into the whole-config form. Every legacy field is present with its labels, help, and its per-type and
  per-sync-type visibility, including the torrent-only seeding fields.
- Submit reproduces legacy's order and semantics: validate, then test the connection when the entry is new or its connection-relevant fields changed, then call `API-CONFIG-EXTERNAL-CONFIGURE` and only close on a `true` response; a failure at
  either step keeps the dialog open with the server's message. The standalone "Test connection" action reports success or the server's failure message and never mutates the form. Both show an in-flight state.
- Sync-all posts `API-CONFIG-EXTERNAL-SYNC` and reports its three outcomes distinctly — all succeeded, all failed, and partial with both counts (`formly-external-tools.js:87-104`).
- New `data-testid` values are recorded in `F-CONFIG-EXTERNAL-TOOLS.selectors`, replacing the legacy `.nav-tabs`/text locators the current spec relies on.
- `tests/system/tests/external-tools.spec.ts` is re-pointed at the React shell and keeps every assertion it makes today about the real *arr instances: the add request's complete boolean payload, per-indexer and single sync types, the
  connection test, sync-all, the empty state, and its existing indexer cleanup. Its `hydra` fixture usage and afterEach cleanup are preserved; coverage may grow, never shrink.
- Screenshot strip per `../README.md` *Visual Gate*: the empty state, two configured tools, the edit modal, and a failed connection test, at 1280x800 and 390x844.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/external-tools.spec.ts` succeeds against live Sonarr/Radarr instances, and `tests/config.spec.ts` still passes unchanged.
- Run `git diff --check`; confirm changed files match Files Allowed To Modify and no generated artifacts are left behind.

## Handoff / Review

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a modal whose submit mutates another running application, a two-step check-then-configure sequence to reconstruct from AngularJS promises, and an existing real-backend spec to port without losing an assertion.
- Reviewer: `opus` — at least the implementer's tier because the packet rewrites the suite's only config system test; judging whether coverage shrank requires reading the old spec against the new one line by line.
- Fixer: `opus` — expected findings land in the submit sequence or in ported test coverage rather than in markup.

Implementer prompt: Start by reading `external-tools.spec.ts` in full, then `formly-external-tools.js`'s box controller; the spec is the contract the *arr side already depends on. Trap: reordering check-then-configure, or closing the dialog on
a `false` configure response — legacy keeps it open. Prove the ported spec green against live instances before touching the field set.
Reviewer prompt: Check hardest that every assertion the old spec made survives, including the complete boolean payload check, and that Submit cannot commit an entry the server refused. Distrust a green run that skipped the *arr cleanup.
