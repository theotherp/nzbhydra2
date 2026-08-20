# FM-066: Config Indexers — List, Presets, And The Edit Modal

Status: planned Owner:
Feature IDs: F-CONFIG-INDEXERS Component IDs: C-CONFIG-FIELDS, C-SECRET-INPUT, C-CONFIG-FORM, C-DIALOG-SERVICE, C-CATEGORY-CATALOG API IDs: API-CONFIG-INDEXER-CONNECTION, API-CONFIG-INDEXER-CAPS, API-CONFIG-INDEXER-CAPS-MESSAGES, API-CONFIG-PUT Depends on: FM-059 Blocks: FM-067

## Outcome

Admins manage indexers at `/config/indexers` in React: the ordered indexer list with per-indexer state and priority, adding a newznab, torznab, or special indexer from a preset or as a custom entry, and editing one in a modal that tests the
connection and completes the indexer's capabilities before the entry is accepted.

## Boundary Rationale

An independent product capability over the `indexers` list, and the one config surface whose edit dialog cannot be split from its checks: legacy's close sequence is connection check, then capability check, and an indexer that skips the second
is persisted as unusable (`configComplete: false`). The single caps check therefore ships here with its progress dialog; bulk recheck and the Jackett/Prowlarr imports are separate capabilities and are FM-067's.

## Decision Dependencies

- Accepted: ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/config/indexers/**`
- `core/ui-react/src/features/config/components/**`, only for additive, non-forking extensions FM-059's vocabulary genuinely lacks; earlier packets' tests must keep passing unmodified
- `core/ui-react/src/api/config/**`, only additively for the indexer endpoints
- FM-058's config shell/form files and `core/ui-react/src/router.tsx` (+ `router.test.tsx`), only to mount the Indexers tab body
- `tests/system/tests/config-indexers.spec.ts`
- The `F-CONFIG-INDEXERS`, `C-CONFIG-FIELDS`, `C-SECRET-INPUT`, `API-CONFIG-INDEXER-CONNECTION`, `API-CONFIG-INDEXER-CAPS`, and `API-CONFIG-INDEXER-CAPS-MESSAGES` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Bulk caps recheck and the Jackett/Prowlarr config imports (FM-067)
- Indexer statuses at `/stats/indexers`, indexer selection on the search page, and backend caps logic

## Context To Read

- FM-058, FM-059, and FM-064 packets and handoffs, `CONTEXT.md` *Migration Boundaries*, `/core/ui-react/AGENTS.md` *UI Conventions*, and the listed registry records
- `core/ui-src/js/config/formly-indexers.js` in full (box fields, preset lists, `IndexerConfigBoxService`, `CheckCapsModalInstanceCtrl`, `IndexerCheckBeforeCloseService`), `core/ui-src/js/config/config-fields-service.js:2002-2010` and
  `:2557+` (`handleConnectionCheckFail`), `core/ui-src/html/config/indexer-config.html`, `indexer-config-box.html`, `indexer-config-selection.html`, `core/ui-src/html/checker-state.html`
- `core/ui-src/js/directives/indexer-input.js`, `indexer-state-switch.js` and their templates, `core/ui-src/js/caps-check-request-service.js`
- `shared/mapping/.../config/indexer/IndexerConfig.java` (note the `@HiddenInUI` credentials), `core/src/main/java/org/nzbhydra/config/validation/IndexerConfigValidator.java`, `core/src/main/java/org/nzbhydra/indexers/capscheck/**`

## Acceptance

- `/config/indexers` lists the configured indexers in legacy's order (state descending, then score descending, then name) and shows per entry: the name as the control that opens the editor, a visible marker for an incomplete config and for
  an incomplete caps check, the state control with legacy's three disabled meanings (`DISABLED_USER` "Disabled by user", `DISABLED_SYSTEM_TEMPORARY` "Temporary disabled", `DISABLED_SYSTEM` "Disabled by system"), an inline priority (`score`)
  field, and the VIP-expiry warning where legacy shows one. Changing state or priority marks the form dirty and is persisted by the shell's save.
- Adding offers legacy's three groups: newznab presets plus "Add custom newznab indexer", torznab presets plus a custom torznab entry, and the special presets — each seeded with exactly the preset's values (`formly-indexers.js:900-1200`).
- Editing is a modal transaction over a copy: Cancel, backdrop dismissal, and Reset discard; Delete removes the entry with legacy's warning that stats and related history go with it; only a successful Submit commits into the whole-config
  form. The modal shows the type-specific field set, the torznab-only note, and the incomplete-config/incomplete-caps banners, with credentials through `C-SECRET-INPUT` (`IndexerConfig.apiKey`, `username`, `password` are masked).
- Name validation matches legacy: required, unique among indexers, and no comma. Category and group-name fields keep legacy's behavior, including group-name suggestions drawn from the other indexers.
- Submit reproduces `IndexerCheckBeforeCloseService`: a new entry or one whose connection-relevant fields changed is connection-checked first, a failure offers legacy's keep-anyway or go-back choices (`handleConnectionCheckFail`), and an entry
  with unknown supported search types/IDs then runs a `SINGLE` caps check whose three outcomes are distinguished — complete, incomplete-but-usable, and failed-and-unusable, with legacy's wording — before the entry is committed.
- The caps check shows a modal progress dialog that polls `API-CONFIG-INDEXER-CAPS-MESSAGES` every 500ms and lists the messages as they arrive, stopping the poll when the check resolves or the dialog closes (`CheckCapsModalInstanceCtrl`).
  A successful check writes the returned capability fields back onto the entry (`updateIndexerModel` in `formly-config.js`).
- New `data-testid` values are recorded in `F-CONFIG-INDEXERS.selectors`.
- Tests: component tests for list ordering and state/priority editing, preset seeding, the modal transaction, name validation, and each connection-check and caps-check outcome; `tests/system/tests/config-indexers.spec.ts` (using the `hydra`
  fixture, which restores the instance config) adds an indexer against the suite's mock indexer, completes the connection and caps checks against the real backend, saves, reloads, and proves the entry persisted as complete.
- Screenshot strip per `../README.md` *Visual Gate*: the list with mixed states, the add menu, the edit modal, the caps-check progress dialog, and a failed connection check, at 1280x800 and 390x844.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-indexers.spec.ts` succeeds, and `tests/config.spec.ts`, `tests/search.spec.ts`, and `tests/stats.spec.ts` still pass unchanged.
- Run `git diff --check`; confirm changed files match Files Allowed To Modify and no generated artifacts are left behind.

## Handoff / Review

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — the close sequence chains two long-running server checks with branching outcomes that mutate the entry being committed, reconstructed from ~1400 lines of imperative AngularJS across several services.
- Reviewer: `opus` — at least the implementer's tier because the caps progress dialog and the modal pattern are extended by FM-067, and because an indexer committed with `configComplete: false` looks fine in the UI and fails at search time.
- Fixer: `opus` — expected findings land in the check sequence or in what the check writes back, not in markup.

Implementer prompt: Start at `IndexerCheckBeforeCloseService` and `CheckCapsModalInstanceCtrl`, then work outward to the field sets. Trap: committing the entry before the caps result returns, which persists an unusable indexer; and dropping
the capability fields the check writes back. Prove add-with-caps-check end to end against a mock indexer before styling anything.
Reviewer prompt: Check hardest that Cancel and a failed check leave the form untouched, that the message poll is cancelled on every exit path, and that returned capability fields land on the committed entry. Distrust a caps test that stubs
the response instead of exercising the poll.
