# FM-059: Config Field Vocabulary And The Main Tab

Status: planned Owner:
Feature IDs: F-CONFIG-MAIN Component IDs: C-CONFIG-FIELDS, C-SECRET-INPUT, C-CONFIG-FORM, C-EXTERNAL-LINKS API IDs: API-CONFIG-FOLDER-LISTING, API-CONFIG-PUT Depends on: FM-058 Blocks: FM-060, FM-061, FM-062, FM-063, FM-064, FM-065, FM-066

## Outcome

`/config/main` becomes fully editable, and the small typed field vocabulary ADR-0002 calls for exists as a registered component set that the seven remaining tabs will consume unchanged: labelled rows with help, tooltip and advanced gating, the
scalar controls, secret editing with `***UNCHANGED***` semantics, API-key generation, and server-side file/folder picking.

## Boundary Rationale

The vocabulary and its first consumer belong together: a field set built with no route to prove it is unreviewable, and a route built without the vocabulary would have to be rewritten by the next tab. Main is the right first consumer because
it exercises every control kind — text, number, switch, select, multiselect, chips, secret, API key, file and folder browse — without any repeat section or modal transaction. The other seven tabs are separate product capabilities.

## Decision Dependencies

- Accepted: ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/config/components/**`, `core/ui-react/src/features/config/main/**`
- `core/ui-react/src/api/config/**`, only additively for the folder-listing endpoint
- FM-058's config shell/form files and `core/ui-react/src/router.tsx` (+ `router.test.tsx`), only to mount the Main tab body and for additive, non-forking extensions the shipped shell genuinely lacks; FM-058's tests must keep passing unmodified
- `tests/system/tests/config-main.spec.ts`
- The `F-CONFIG-MAIN`, `C-CONFIG-FIELDS`, `C-SECRET-INPUT`, `C-CONFIG-FORM`, and `API-CONFIG-FOLDER-LISTING` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Repeat sections, modal transactions, connection/caps checks, and every other tab's fields
- The colour control (`color-control.html`, used only by indexer config) and the `timeOfDay`/`duoSetting`/`percentInput` kinds, which no Main field uses — add a kind when its first consumer needs it
- Backup, update, and log actions reachable from the System pages; Main owns only their settings

## Context To Read

- FM-058's packet and handoff, `../README.md` *Visual Gate*, `/core/ui-react/AGENTS.md` *UI Conventions*, and the listed registry records
- `core/ui-src/js/config/config-fields-service.js:50-736` (the whole Main tab), `core/ui-src/js/config/formly-config.js` (the `settingWrapper`, `fieldset`, `horizontalInput`, `horizontalSwitch`, `horizontalSelect`, `horizontalMultiselect`,
  `horizontalChips`, `passwordSwitch`, `apiKeyInput`, `fileInput`, `help` types), `core/ui-src/html/states/config.html` (`setting-wrapper.html`, `fieldset-wrapper.html`), `core/ui-src/js/file-selection-service.js`
- `SensitiveDataConfigValidator.java` (`***UNCHANGED***` in both directions), `MainConfig.java`, `FileSystemBrowser` request/response types, `core/ui-react/src/app/theme.ts`

## Acceptance

- `C-CONFIG-FIELDS` ships under `src/features/config/components` as `SettingRow` (label, control, help, tooltip, advanced gating — the replacement for `setting-wrapper.html`), `ConfigFieldset`, `TextSetting`, `NumberSetting`,
  `SwitchSetting`, `SelectSetting`, `MultiSelectSetting`, `ChipsSetting`, `ApiKeySetting`, `FileBrowserSetting`, plus `C-SECRET-INPUT` as `SecretInput.tsx`. Each binds through the FM-058 form; none holds a parallel copy of its value.
- Controls are stock MUI with visible labels and no design literals in feature code (ADR-0014, *UI Conventions*): a select is `TextField select`, chips are MUI `Chip`s inside a standard field, help is rendered below the control, and the
  tooltip affordance is a real focusable button. Help text containing links passes through `C-EXTERNAL-LINKS` dereferer handling as legacy does (`setting-wrapper.html`, `derefererExtracting`).
- `SecretInput` never synthesizes `***UNCHANGED***`: the marker originates from the server, and the control preserves whatever value it was given, byte for byte, until the user edits the field, at which point the typed value is sent. It shows
  an unchanged-value placeholder instead of the marker text and offers reveal/hide. Which fields actually arrive masked is the backend's choice, not the UI's — `@HiddenInUI` covers `MainConfig.proxyUsername`/`proxyPassword`,
  `IndexerConfig.apiKey`/`username`/`password`, and `DownloaderConfig.apiKey`/`username`/`password`, and `UserAuthConfigValidator.updateAfterLoading` masks hashed user passwords; other password-typed fields (`sslKeyStorePassword`,
  `oidcClientSecret`) arrive in clear and must round-trip in clear. A test proves both directions and that the client never emits the marker for a value the server did not mask.
- `ApiKeySetting` generates a 24-character alphanumeric key and marks the form dirty (`formly-config.js` `apiKeyInput`). `FileBrowserSetting` browses through `API-CONFIG-FOLDER-LISTING` with file vs folder mode, parent navigation, and
  selecting the current folder, and writes the chosen path into the field (`file-selection-service.js`).
- Advanced gating is a property of the row, not of the config: rows marked advanced are hidden unless FM-058's toggle is on, and hiding never changes or clears a value.
- `/config/main` renders every field of `config-fields-service.js:50-736` — 54 keys across the ten fieldsets Hosting, Proxy, UI, Security, Logging, Backup, Updates, History, Database, Other — with legacy's labels, help text, units, minimums,
  placeholders, required marks, and advanced flags. Its `hideExpression`s become `useWatch`-driven rendering (for example the SSL keystore fields, the proxy fields, and the log-marker list) and a hidden field keeps its value, so saving a
  config whose conditions are unmet does not clear the fields behind them.
- Legacy's field-level validators for this tab are preserved as form validation with a visible message: the IP validator, the `HH:mm` scheduled-restart pattern, and the numeric minimums; an invalid form blocks save (`config-controller.js:158-189`).
- New `data-testid` values for the vocabulary and Main's fields are recorded in `F-CONFIG-MAIN.selectors` and `C-CONFIG-FIELDS`; legacy has none to preserve.
- Tests: component tests for each control kind including the secret marker, advanced gating, conditional visibility with value retention, and validation messages; `tests/system/tests/config-main.spec.ts` (using the `hydra` fixture) edits one
  plain field and one advanced field, saves against the real backend, and proves the values persist across a reload and that no unrelated section changed.
- Screenshot strip per `../README.md` *Visual Gate*: `/config/main` with advanced hidden, with advanced shown, a validation error, and the folder-browse dialog, at 1280x800 and 390x844.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-main.spec.ts` succeeds, and `tests/config.spec.ts` still passes unchanged.
- Run `git diff --check`; confirm changed files match Files Allowed To Modify and no generated artifacts are left behind.

## Handoff / Review

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — creates the shared vocabulary every remaining config packet consumes, with secret semantics that can silently destroy credentials, while reconstructing a 54-field tab from Formly definitions.
- Reviewer: `opus` — at least the implementer's tier because the packet defines a shared component set; whether its API is per-kind rather than per-field decides whether FM-060..FM-067 are adoptions or rewrites.
- Fixer: `opus` — expected findings land in the vocabulary's API or the secret/visibility semantics rather than in one field's label.

Implementer prompt: Start at `formly-config.js`'s type registry and `setting-wrapper.html` for the row anatomy, then walk `config-fields-service.js:50-736` field by field. Trap: rendering a hidden field as unregistered — Formly kept the model
value, and dropping it turns a conditional field into data loss on the next save. Prove the `***UNCHANGED***` round trip first; everything else is recoverable, a lost password is not.
Reviewer prompt: Check hardest for design literals or restyled MUI internals in the new components, and for any field of the legacy range that is missing, mislabelled, or wrongly advanced-gated. Distrust a passing secret test that never asserts
the exact marker string leaves the client.
