# FM-064: Config Downloading Tab

Status: planned Owner:
Feature IDs: F-CONFIG-DOWNLOADING Component IDs: C-CONFIG-FIELDS, C-SECRET-INPUT, C-CONFIG-FORM, C-DIALOG-SERVICE API IDs: API-DOWNLOAD-CHECK-CONNECTION, API-CONFIG-PUT Depends on: None Blocks: None

## Outcome

Admins configure downloading at `/config/downloading` in React: the general download settings and black-hole folders, plus the downloader list where each downloader is added from a preset and edited in a modal that verifies its connection
before the entry is accepted.

## Boundary Rationale

An independent product capability over `DownloadingConfig` and the first packet to ship the modal-transaction pattern `CONTEXT.md` names as a config parity requirement: preset-seeded creation, per-type field sets, a connection check that can
veto or be overridden on close, and masked credentials. Splitting the list from the general fields would separate settings that only make sense together (the primary-downloader select is driven by the list). Depends on FM-059 for the vocabulary.

## Decision Dependencies

- Accepted: ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/config/downloading/**`
- `core/ui-react/src/features/config/components/**`, only for additive, non-forking extensions FM-059's vocabulary genuinely lacks; earlier packets' tests must keep passing unmodified
- `core/ui-react/src/api/config/**`, only additively for the connection-check endpoint
- FM-058's config shell/form files and `core/ui-react/src/router.tsx` (+ `router.test.tsx`), only to mount the Downloading tab body
- `tests/system/tests/config-downloading.spec.ts`
- The `F-CONFIG-DOWNLOADING`, `C-CONFIG-FIELDS`, `C-SECRET-INPUT`, and `API-DOWNLOAD-CHECK-CONNECTION` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Sending downloads from search results and the download history (`C-DOWNLOAD-ACTIONS`), and the downloader status footer
- Downloader category lookup for the search page (`API-DOWNLOAD-CATEGORIES`)

## Context To Read

- FM-058 and FM-059 packets and handoffs, `/core/ui-react/AGENTS.md` *UI Conventions*, `CONTEXT.md` *Migration Boundaries*, and the listed registry records
- `core/ui-src/js/config/config-fields-service.js:1837-1979` (general fields), `core/ui-src/js/config/formly-downloaders.js` (presets, per-type field filtering, the box controller, `DownloaderCheckBeforeCloseService`),
  `core/ui-src/html/config/downloader-config.html` and `downloader-config-box.html`, `core/ui-src/js/config/config-fields-service.js:2557+` (`handleConnectionCheckFail`)
- `shared/mapping/.../config/downloading/DownloadingConfig.java` and `DownloaderConfig.java` (note the `@HiddenInUI` credentials), `core/src/main/java/org/nzbhydra/config/validation/DownloadingConfigValidator.java`

## Acceptance

- The general fieldset renders every field of `config-fields-service.js:1837-1979` with legacy's labels, help, tooltips, and advanced flags, including the two black-hole folder pickers, NZB access type, external URL, fallback for failed
  downloads, magnet links, status updating, and the downloader footer switch. Legacy's conditional rules hold and keep values: the external URL appears when the footer is shown or any downloader adds by link, the fallback select hides for
  `REDIRECT`, and the primary-downloader select appears only when the footer is on and more than one downloader is enabled, offering the currently configured downloader names.
- Adding a downloader starts from one of legacy's three presets — NZBGet, SABnzbd, Torbox — with exactly legacy's seeded values (`formly-downloaders.js:14-44`), and opens the edit modal for a new entry.
- Editing a downloader is a modal transaction: the dialog edits a copy, Cancel and Reset discard, Submit commits into the whole-config form, and Delete removes the entry. Nothing is persisted until the config itself is saved.
- The modal shows only the fields that apply to the entry's downloader type, honoring legacy's per-type inclusion and exclusion (`formly-downloaders.js:271-280`), and its credential fields use `C-SECRET-INPUT` because the backend masks
  `DownloaderConfig.apiKey`, `username`, and `password`.
- Submitting runs the connection check against `API-DOWNLOAD-CHECK-CONNECTION` and reproduces legacy's outcomes: success closes the dialog, a failure explains what failed and lets the admin keep the entry anyway or go back and correct it
  (`DownloaderCheckBeforeCloseService`, `handleConnectionCheckFail`), and the in-flight state is visible. A closed dialog never leaves a half-applied entry in the form.
- New `data-testid` values are recorded in `F-CONFIG-DOWNLOADING.selectors`.
- Tests: component tests for each preset's seeded values, per-type field visibility, the transaction's cancel/submit/delete paths, and the connection check's success, failure-and-keep, and failure-and-correct paths;
  `tests/system/tests/config-downloading.spec.ts` (using the `hydra` fixture, which restores the instance config) adds a downloader pointing at the SABnzbd mock the suite already provides, saves against the real backend, reloads, and proves
  the entry persisted with its credentials still masked.
- Screenshot strip per `../README.md` *Visual Gate*: `/config/downloading` with no downloader and with two, the preset menu, and the edit modal after a failed connection check, at 1280x800 and 390x844.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-downloading.spec.ts` succeeds, and `tests/config.spec.ts` and `tests/downloads.spec.ts` still pass unchanged.
- Run `git diff --check`; confirm changed files match Files Allowed To Modify and no generated artifacts are left behind.

## Handoff / Review

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — reconstructs the modal-transaction and check-before-close behavior from imperative AngularJS services, with per-type field sets and masked credentials that a mistake turns into a broken downloader.
- Reviewer: `opus` — at least the implementer's tier because this packet establishes the modal-transaction pattern FM-065 and FM-066 will follow, and because it may extend the shared vocabulary.
- Fixer: `opus` — expected findings land in the transaction or the check's outcome handling rather than in one field.

Implementer prompt: Start at `formly-downloaders.js` end to end, including `DownloaderCheckBeforeCloseService`, then read `handleConnectionCheckFail` for the exact failure choices. Trap: letting the modal write into the form as the user types,
which makes Cancel meaningless and can strip a masked credential. Prove a real connection check against the suite's SABnzbd mock before building the field sets.
Reviewer prompt: Check hardest that Cancel/Reset leave the form untouched and that a failed check cannot persist a partially edited entry. Distrust a preset test that asserts only the downloader type.
