# FM-073: System Updates And About Tabs

Status: planned Owner:
Feature IDs: F-SYSTEM-UPDATES, F-SYSTEM-ABOUT
Component IDs: C-UPDATE-COORDINATOR, C-SAFE-RICH-CONTENT, C-RESTART-COORDINATOR, C-EXTERNAL-LINKS
API IDs: API-UPDATES-INFOS, API-UPDATES-VERSION-HISTORY, API-UPDATES-CHANGES, API-UPDATES-INSTALL, API-UPDATES-MESSAGES, API-UPDATES-SIMPLE-INFOS
Depends on: None
Blocks: None

## Outcome

Admins see update status and history and can install an update from `/system/updates`, and read program/contact/license
information at `/system/about`. The two tabs belong together because both are thin views over the update-info service this
task creates (`C-UPDATE-COORDINATOR`'s page portion; About's only data is `API-UPDATES-SIMPLE-INFOS`), and splitting them
would leave About a near-empty packet. The cross-route footer update banner (`hydra-checks-footer.js`, ignore/ack flows)
stays with `F-PLATFORM-LIVE-STATUS`.

## Decision Dependencies

ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015.

## Files Allowed To Modify

- `core/ui-react/src/features/system/**` (updates and about pages inside FM-072's shell), `core/ui-react/src/api/system/**`
- `core/ui-react/src/services/updates/**` (new, per `C-UPDATE-COORDINATOR`), `core/ui-react/src/components/content/**`
- `core/ui-react/src/router.tsx`, `core/ui-react/src/router.test.tsx`, `core/ui-react/src/assets/**` (sponsor image)
- `tests/system/tests/system.spec.ts`
- The two feature records, the six API records, and the four component records listed above only
- This task packet and `docs/frontend-migration/STATUS.md`

## Out Of Scope

- The footer/global update banner, `API-UPDATES-IGNORE`, `API-UPDATES-AUTOMATIC-HISTORY`, `API-UPDATES-ACK-HISTORY`,
  `API-UPDATES-WRAPPER-STATUS` (all `hydra-checks-footer.js` callers — F-PLATFORM-LIVE-STATUS)
- Changing update backend behavior or release metadata

## Context To Read

- `core/ui-src/js/update-service.js`, `core/ui-src/js/directives/hydra-updates.js`, `core/ui-src/html/directives/updates.html`,
  `core/ui-src/html/directives/version-history.html`, `core/ui-src/html/changelog-modal.html`, `core/ui-src/html/update-modal.html`
- `core/ui-src/html/about.html` (verbatim content source, `dereferer` filter usage), `UpdateInfosWeb`/`UpdatesWeb` in `core/src`
- `core/ui-react/src/components/content/` (`C-SAFE-RICH-CONTENT` — a changelog `change.text` is server-authored HTML that
  legacy renders through its `unsafe` filter) and `core/ui-react/src/services/restart/`

## Acceptance

- Updates tab shows current/latest/beta versions from `API-UPDATES-INFOS`; the `updatedExternally` warning (which, unless
  `showUpdateBannerOnUpdatedExternally`, also suppresses the install offer); "A new (beta) release ... is available" blocks
  with "See what's new" (changelog dialog over `API-UPDATES-CHANGES`) and install actions; "You're up to date!" /
  ignored-version text; a Force update action when nothing is offered; the `wrapperOutdated` warning block with legacy's
  file lists; and the full version-history list (`API-UPDATES-VERSION-HISTORY`) with note/fix/feature type badges.
- Changelog and version-history `change.text` render through `C-SAFE-RICH-CONTENT` (extended for this boundary), never via
  raw HTML injection; entries keep version, Beta marker, and date.
- Install: a blocking progress dialog polls `API-UPDATES-MESSAGES` while `API-UPDATES-INSTALL` runs, shows the returned
  message lines, then (matching legacy's ~2s grace) hands off to `C-RESTART-COORDINATOR`'s countdown; a failed install
  closes the dialog with legacy's error toast wording. The poll is cleared on every exit path.
- About tab renders legacy `about.html`'s content: version plus the conditional `packageInfo` block from
  `API-UPDATES-SIMPLE-INFOS`, contact/sources/donations/license prose, every external link routed through
  `C-EXTERNAL-LINKS`'s dereferer, and the sponsor image served from React assets.
- Selectors (new): `system-updates`, `system-updates-install`, `system-updates-install-beta`, `system-updates-force`,
  `system-updates-changelog`, `system-update-progress-dialog`, `system-version-history`, `system-about`, recorded on the
  feature records.
- Unit/component tests cover info-driven branch visibility, changelog sanitization, install success/failure handoff, and
  About's conditional package block; Playwright proves both tabs render real data (never installing an update).
- Registry evidence updated (feature parity, API targets/tests, `C-UPDATE-COORDINATOR` page-portion state note stays
  `partial` for the footer). Screenshot strip per *Visual Gate*: updates tab states and About, desktop plus mobile if layout differs.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/system.spec.ts` succeeds.
- Confirm changed files match `Files Allowed To Modify`; `git diff --check` clean.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — parity reconstructed from legacy service/directive source plus a shared sanitization boundary and restart handoff.
- Reviewer: `opus` — extends `C-SAFE-RICH-CONTENT` and `C-UPDATE-COORDINATOR`; must match the implementer's tier.
- Fixer: `opus` — findings here tend to sit in async install/poll/handoff flows, not mechanical polish.

Implementer prompt: Start from `update-service.js` + `updates.html`; the `updatedExternally`/`showUpdateBannerOnUpdatedExternally`
interaction is the easiest branch to get backwards — prove it first with a table-driven test. Trap: `change.text` is HTML;
route it through the news sanitization boundary, never `dangerouslySetInnerHTML` in feature code.
Reviewer prompt: Check hardest the sanitization path for changelog HTML and the install dialog's poll cleanup on failure;
distrust visibility-branch claims not backed by a test enumerating the info-flag combinations.
