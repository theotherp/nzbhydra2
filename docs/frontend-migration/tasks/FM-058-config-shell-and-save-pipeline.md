# FM-058: Config Shell, Whole-Config Round Trip, And Save Pipeline

Status: planned Owner:
Feature IDs: F-CONFIG-SHELL Component IDs: C-CONFIG-FORM, C-BOOTSTRAP-CONTEXT, C-RESTART-COORDINATOR, C-DIALOG-SERVICE, C-TOAST-SERVICE API IDs: API-CONFIG-GET, API-CONFIG-PUT, API-CONFIG-SAFE, API-CONFIG-API-HELP, API-SYSTEM-RESTART, API-SYSTEM-PING Depends on: None Blocks: FM-059

## Outcome

An admin reaches all eight canonical config tabs in React and can save: the whole `BaseConfig` is fetched, held in one form, and PUT back with server validation, warnings, restart handling, and an unsaved-changes guard. Because every save
rewrites the entire file, a half-migrated UI must never be able to damage it — an unedited load-and-save leaves the persisted config unchanged.

## Boundary Rationale

The transport envelope, the form that owns it, the save/validate/restart pipeline, and the tab routes are one contract: none is observable or reviewable without the others, and every later tab packet is an adoption of this one. Restart
coordination ships here at its minimum because the save pipeline is its first consumer. Tab bodies are separate because each is an independent product capability with its own parity surface.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015, ADR-0017.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/api/config/**`, `core/ui-react/src/features/config/**`, `core/ui-react/src/services/restart/**`
- `core/ui-react/src/bootstrap.ts`, `App.tsx`, their tests, and the safe-config reads under `src/app/**` and `src/features/stats/**` — only as far as ADR-0017's query migration requires, with every existing test there passing unmodified
- `core/ui-react/src/components/dialogs/**`, only for additive needs this pipeline genuinely lacks (existing dialog consumers must keep passing unmodified)
- `tests/system/tests/config.spec.ts`
- The `F-CONFIG-SHELL`, `C-CONFIG-FORM`, `C-BOOTSTRAP-CONTEXT`, `C-RESTART-COORDINATOR`, `C-DIALOG-SERVICE`, `API-CONFIG-GET`, `API-CONFIG-PUT`, `API-CONFIG-SAFE`, `API-CONFIG-API-HELP`, `API-SYSTEM-RESTART`, and `API-SYSTEM-PING` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Any tab body beyond a placeholder, the typed field vocabulary, and `C-SECRET-INPUT` (FM-059 onwards own these)
- `API-CONFIG-RELOAD` (reload-from-file is the System page's control, `system-controller.js:30` — no wrapper without a consumer), and reshaping `SafeConfig` or how consumers interpret it (ADR-0017 changes where the value comes from, not its shape)
- Shutdown, updates, and backup restart flows; those `C-RESTART-COORDINATOR` consumers stay `planned`

## Context To Read

- `CONTEXT.md` *Migration Boundaries*, the listed ADRs, `/core/ui-react/AGENTS.md` *UI Conventions*, and the listed registry records
- `core/ui-src/js/config/config-controller.js`, `core/ui-src/js/config/config-service.js`, `core/ui-src/html/states/config.html`, `core/ui-src/js/restart-service.js`, `core/ui-src/js/nzbhydra.js:44-250` (canonical tab URLs)
- `ConfigWeb.java` (including `getSafeConfig`), `shared/mapping/.../validation/ConfigValidationResult.java`, `SensitiveDataConfigValidator.java`, `shared/mapping/.../config/BaseConfig.java`, `config/safeconfig/SafeConfig.java`
- `core/ui-react/src/features/stats/StatsShell.tsx`, `src/app/AppShell.tsx:130-170`, `src/api/transport.ts`, `tests/system/tests/fixtures.ts:42-56`

## Acceptance

- The eight tab routes exist with legacy's exact segments — `/config/main`, `/config/auth`, `/config/searching`, `/config/categories`, `/config/downloading`, `/config/externalTools`, `/config/indexers`, `/config/notifications`
  (`nzbhydra.js:44-250`); `/config` lands on `/config/main`; unfilled tabs render a placeholder body; layout follows `StatsShell.tsx` (MUI `Tabs` plus router `Link`s); and a session that may not see the admin area never reaches a config
  route, using the same rule as the shell's Config nav item (`AppShell.tsx:143-162`).
- The hand-written Zod envelope (ADR-0003; generated `BaseConfig` types are all-optional and are not the runtime contract) **passes unknown keys through in every object schema**. Sections no tab models — `emby`, `genericStorage`, and the
  `indexers` list (`BaseConfig.java:32-53`) — and unknown keys inside modeled sections survive parse-then-PUT unchanged. A unit test proves this with a payload carrying both an unmodeled section and unmodeled keys inside a modeled one.
- One React Hook Form over the whole config, created by the shell with `shouldUnregister: false`, so an unmounted tab keeps its values. A test proves an edit made on one tab survives navigating to another tab and appears in the PUT body.
- Save maps `ConfigValidationResult`: non-empty `errorMessages` show a blocking dialog and the form stays dirty because nothing was persisted (`ConfigWeb.java:84`); with `ok` and non-empty `warningMessages` the dialog states the config was
  already saved and offers confirmation; a transport failure surfaces as an error, not as a silent success. In every successful case the form resets from `newConfig`, never from the submitted values — the server normalizes and re-masks secrets
  (`ConfigWeb.java:96`, `SensitiveDataConfigValidator.prepareForDisplay`).
- ADR-0017: a successful save never calls `window.location.reload()`. `C-BOOTSTRAP-CONTEXT`'s safe config becomes a TanStack Query over `API-CONFIG-SAFE` seeded with the bootstrap value as `initialData`, and a successful save invalidates it.
  Consumers keep reading the same context and none caches the value outside the query, so today's reads — `AppShell.tsx:143-162`, `StatsShell.tsx:37`, and the history routes' catalog/indexer-name/user-info/dereferer reads — observe the new
  value without a reload; a component test proves a `keepHistory` change alters the stats tabs after a save with no navigation. The system test asserts the config page performs no full document load on a successful save.
- `restartNeeded` offers a restart through `C-RESTART-COORDINATOR` (`src/services/restart`), registered here at its minimum: trigger `API-SYSTEM-RESTART`, then a non-dismissable progress dialog polling `API-SYSTEM-PING`, preserving legacy's
  timings and messages (`restart-service.js:43-79`: 3s before the first poll, 1s between polls, the "takes longer than expected" wording at attempt 45, 2s grace before navigating, and the response `message` as reload target when present).
- Leaving a dirty form is intercepted through TanStack Router blocking with Save / Discard / Cancel (`config-controller.js:304-332`); Discard restores the last server config and Cancel stays put.
- The advanced-fields toggle persists in `localStorage` only and never dirties the form. No `showAdvanced` field exists in the Java config, so no such key may be sent — the comment claiming it is stored to file (`config-controller.js:49`) is stale.
- "API?" opens a dialog showing the newznab endpoint, torznab endpoint, and API key from `API-CONFIG-API-HELP`, and declines with a notice while unsaved changes exist (`config-controller.js:274-279`).
- Every control shipped here carries a new `data-testid` recorded in `F-CONFIG-SHELL.selectors`; legacy config markup has no stable selectors to preserve. Registry evidence records the adopted API targets and tests.
- Screenshot strip per `../README.md` *Visual Gate*: the shell with its tab strip, the validation-error dialog, the warning dialog, and the restart progress dialog, at 1280x800 and 390x844.
- `tests/system/tests/config.spec.ts` uses the `hydra` fixture so the instance config is restored (`fixtures.ts:42-56`), loads `/config/main` in the React shell, saves without editing, asserts the PUT is `ok`, and asserts a fresh
  `GET /internalapi/config` deep-equals the pre-save config except where the backend re-masks a value as `***UNCHANGED***`.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config.spec.ts` succeeds, and `tests/smoke.spec.ts` still passes unchanged.
- Run `git diff --check`; confirm changed files match Files Allowed To Modify and no generated artifacts are left behind.

## Handoff / Review

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — defines three contracts at once (the loose whole-config envelope, the form that owns it, the restart coordinator) and additionally migrates `C-BOOTSTRAP-CONTEXT`'s safe config to reactive server state under ADR-0017,
  touching consumers in the shell, stats, and history routes.
- Reviewer: `opus` — at least the implementer's tier because this packet creates shared contracts and changes a shared runtime boundary; whether the envelope is lossless, the form whole-config, and the safe-config query uncached decides
  whether FM-059..FM-067 stay adoptions.
- Fixer: `opus` — expected findings land in the envelope's shape, the pipeline's state transitions, or a consumer that kept a copy of the safe config, not in markup.

Implementer prompt: Start at `config-controller.js` `handleConfigSetResponse`/`updateAndAskForRestartIfNecessary` and `ConfigWeb.setConfig`; treat the Java side as the authority when legacy comments disagree with it. Traps: a Zod schema that
strips unknown keys, which silently deletes `emby`, `genericStorage`, or a newer backend's section on the next save; and a consumer that reads the safe config once into state, which quietly reintroduces the staleness ADR-0017 removed. Prove
the unedited round trip against the real backend before building any dialog.
Reviewer prompt: Check hardest that no object schema in the envelope is strict, that the form resets from `newConfig` on every success path, and that no consumer caches the safe config outside the query. Distrust a green round-trip test that
compares only the sections the UI models, and a passing refresh test that never re-reads a consumer after invalidation.
