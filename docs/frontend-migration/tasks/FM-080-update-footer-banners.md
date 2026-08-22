# FM-080: Global Update Footer Banners

Status: planned Owner:
Feature IDs: F-PLATFORM-LIVE-STATUS, F-PLATFORM-SHELL
Component IDs: C-UPDATE-COORDINATOR, C-APP-SHELL, C-SAFE-RICH-CONTENT
API IDs: API-UPDATES-INFOS, API-UPDATES-IGNORE, API-UPDATES-AUTOMATIC-HISTORY, API-UPDATES-ACK-HISTORY
Depends on: None
Blocks: FM-081

## Outcome

Admin sessions see legacy's cross-route bottom banners: the update-available banner (with its externally-updated
variant) offering changelog, ignore, and install, and the automatic-update notice with its changelog and dismissal.
This completes `C-UPDATE-COORDINATOR`'s footer portion that FM-073 deliberately left with `F-PLATFORM-LIVE-STATUS`; the
two banners share one `API-UPDATES-INFOS` retrieval and one stacked footer region, so they ship together.

## Decision Dependencies

ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015.

## Files Allowed To Modify

- `core/ui-react/src/app/status/**` (banner components), `core/ui-react/src/app/AppShell.tsx` (+ its test)
- `core/ui-react/src/services/updates/**`, `core/ui-react/src/api/system/updates.ts` (+ their tests)
- `tests/system/tests/smoke.spec.ts` (absence assertion only, if needed)
- The `F-PLATFORM-LIVE-STATUS`, `F-PLATFORM-SHELL`, `C-UPDATE-COORDINATOR`, and `C-APP-SHELL` records; the four API records above
- This task packet and `docs/frontend-migration/STATUS.md`

## Out Of Scope

- The Updates system tab (done, FM-073); startup dialogs (FM-079); the downloader-status footer and websockets (FM-081);
  any change to the install flow itself (reuse FM-073's `useUpdateInstaller`)

## Context To Read

- `core/ui-src/js/directives/hydra-checks-footer.js:129-181` (`retrieveUpdateInfos`, ignore, changelog, dismiss) and
  `core/ui-src/html/directives/checks-footer.html` (banner variants, exact sentences, button labels)
- `core/ui-src/js/directives/footer.js` (banner stacking and content-padding compensation — reproduce the intent with
  layout, not legacy's pixel bookkeeping; ADR-0014 governs)
- `core/ui-react/src/services/updates` (FM-073's offers/changelog/install machinery), `core/ui-src/js/update-service.js`

## Acceptance

- For sessions with `maySeeAdmin`, `API-UPDATES-INFOS` is fetched once per app load; non-admin sessions fetch nothing
  and render no banner region.
- Update banner, pinned across every route at the viewport bottom, when `updateAvailable` — withdrawn when
  `updatedExternally && !showUpdateBannerOnUpdatedExternally` (legacy's asymmetric clear): the normal variant renders
  "An update is available. Your version: {current}. Latest version: {latest}." (plus " Beta" when `latestVersionIsBeta`)
  with buttons "See what's new!", "Ignore this update", "Update now!"; the externally-updated variant renders legacy's
  docker/package-manager sentence and omits "Update now!".
- "Update now!" runs FM-073's install flow (progress dialog, restart handoff) unchanged. "Ignore this update" PUTs
  `API-UPDATES-IGNORE` for the latest version and hides the banner for this load. "See what's new!" opens FM-073's
  changelog dialog with changes since the current version.
- Automatic-update notice when `automaticUpdateToNotice && showWhatsNewBanner`: "An update was automatically installed."
  with "See what's new!" opening a changelog dialog fed by `API-UPDATES-AUTOMATIC-HISTORY`, and a dismiss control that
  calls `API-UPDATES-ACK-HISTORY` and removes the notice.
- Banners stack without overlapping each other and without hiding page content behind them (the main scroll area is
  compensated); changelog HTML renders only through `C-SAFE-RICH-CONTENT`.
- Selectors (new): `update-footer`, `update-footer-install`, `update-footer-ignore`, `update-footer-changelog`,
  `automatic-update-footer`, recorded on `F-PLATFORM-LIVE-STATUS`.
- Component tests cover both variants, the withdrawal rule, ignore, dismiss-ack, and the non-admin absence (transport
  mocked). The shared system-test instance is current, so Playwright may only assert banner absence. Registry evidence
  updated (four API adoptions; `C-UPDATE-COORDINATOR` note revised). Screenshot strip per *Visual Gate*: both banner
  variants and the stacked pair, desktop plus mobile.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/smoke.spec.ts` succeeds.
- Confirm changed files match `Files Allowed To Modify`; `git diff --check` clean.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — reuses FM-073's update machinery; the banner logic is small and fully specified above.
- Reviewer: `sonnet` — no new shared contract beyond a note revision; verifies wording and withdrawal rules.
- Fixer: `sonnet` — expected findings are mechanical.

Implementer prompt: Start from `checks-footer.html` for the exact sentences and `hydra-checks-footer.js:141-143` for the
withdrawal rule. Trap: the externally-updated variant must not offer "Update now!", and the notice needs
`showWhatsNewBanner`, not just `automaticUpdateToNotice`. Prove first that page content is never hidden behind the
pinned banners on a scrolled route.
Reviewer prompt: Check hardest the withdrawal rule and non-admin absence; distrust screenshots that show a banner
without also showing the bottom of the scrolled content.
