# FM-079: Startup Checks, Welcome, And Announcement Dialogs

Status: planned Owner:
Feature IDs: F-PLATFORM-LIVE-STATUS
Component IDs: C-SERVER-PREFERENCES, C-DIALOG-SERVICE, C-TOAST-SERVICE, C-SAFE-RICH-CONTENT, C-BOOTSTRAP-CONTEXT
API IDs: API-PREFERENCES-GET, API-PREFERENCES-PUT, API-WELCOME-GET, API-WELCOME-PUT, API-NEWS-CURRENT-VERSION, API-NEWS-SAVE-SHOWN, API-USER-NEWS-LIST, API-USER-NEWS-DISMISS, API-UPDATES-WRAPPER-STATUS, API-UPDATES-ACK-WRAPPER
Depends on: None
Blocks: FM-080

## Outcome

The React shell runs legacy's startup checks and announcements (`hydra-checks-footer.js`, non-websocket half): the
first-start welcome dialog, sequential user news, the admin news dialog, indexer VIP-expiry warnings, and the five
show-once admin warnings backed by server-side generic storage. One orchestrated on-load sequence over one legacy
controller; `C-SERVER-PREFERENCES` is built here because every show-once check reads and clears through it.

## Decision Dependencies

ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015, ADR-0017 (safe config is read through the reactive query).

## Files Allowed To Modify

- `core/ui-react/src/app/status/**` (new checks module + dialogs), `core/ui-react/src/App.tsx` (+ its test), `core/ui-react/src/app/AppShell.tsx` (+ its test)
- `core/ui-react/src/services/preferences/**` (new `C-SERVER-PREFERENCES`), `core/ui-react/src/api/preferences.ts` (+ test)
- `core/ui-react/src/api/welcome.ts`, `core/ui-react/src/api/news.ts`, `core/ui-react/src/api/system/updates.ts` (+ their tests)
- `tests/system/tests/smoke.spec.ts` (guarding only; see Acceptance's system-test constraint)
- The `F-PLATFORM-LIVE-STATUS` and `C-SERVER-PREFERENCES` records; the ten API records listed above
- This task packet and `docs/frontend-migration/STATUS.md`

## Out Of Scope

- The update/automatic-update footer banners (FM-080) and websocket surfaces (FM-081); the NZBHydra1 (python) migration
  wizard — no feature record inventories it, so the welcome dialog omits legacy's "migrate your data" link (gap line)

## Context To Read

- `core/ui-src/js/directives/hydra-checks-footer.js` (ordering: welcome first; only when already shown → user news,
  then for admins news, VIP expiry; the five stored-flag checks and wrapper check run only for `maySeeAdmin`)
- `core/ui-src/html/welcome-modal.html`, `news-modal.html`, `user-news-modal.html`; `core/ui-src/js/generic-storage-service.js`
- `core/ui-react/src/features/system/news` (existing safe rendering of news HTML) and `core/ui-react/src/components` dialogs

## Acceptance

- `C-SERVER-PREFERENCES` wraps `API-PREFERENCES-GET`/`API-PREFERENCES-PUT` (`forUser` param preserved) and is the only
  path the checks use to read/clear stored flags.
- Welcome: when `API-WELCOME-GET` is false, PUT `API-WELCOME-PUT` and show the welcome dialog ("Welcome to NZBHydra 2",
  first-start guidance, a link to `/config/main`, wiki and GitHub-issue links through `C-EXTERNAL-LINKS`' policy for
  external targets); the migration link is omitted per Out Of Scope. When already shown: user news (`API-USER-NEWS-LIST`)
  display sequentially, each dismissed via `API-USER-NEWS-DISMISS` before the next; for admin sessions with
  `showNews`, `API-NEWS-CURRENT-VERSION` entries show in one dialog (server-authored HTML through `C-SAFE-RICH-CONTENT`'s
  news profile) acknowledged with `API-NEWS-SAVE-SHOWN`; VIP expiry warns by toast per indexer whose
  `vipExpirationDate` (not "Lifetime") is past or within 7 days, with legacy's message wording.
- Admin-only stored-flag checks, each shown once then cleared via `C-SERVER-PREFERENCES`: `outOfMemoryDetected`,
  `showOpenToInternetWithoutAuth`, `belowJava17`, and `FAILED_BACKUP` (legacy's display condition is self-contradictory
  dead code — implement the evident intent: show message + time from the stored record, then clear; record the deviation
  in the handoff). `API-UPDATES-WRAPPER-STATUS` true shows legacy's outdated-wrapper dialog whose OK PUTs
  `API-UPDATES-ACK-WRAPPER`. Dialog texts keep legacy's wording; embedded links render as safe anchors, never injected HTML.
- Checks run once per app load, never per route change; a transport failure in any check is contained (no crash, other
  checks still run). Non-admin sessions trigger none of the admin-only calls.
- Component tests cover the ordering contract, once-then-clear semantics, sequential user-news dismissal, containment of
  a failing check, and the non-admin no-call guarantee (transport mocked). System tests must not consume one-shot state
  on the shared instance: assert only that the app loads with no unexpected dialog when `welcomeshown` is already true.
- Selectors (new): `welcome-dialog`, `news-dialog`, `user-news-dialog`, `startup-check-dialog`, recorded on
  `F-PLATFORM-LIVE-STATUS`. Registry evidence updated (ten API adoptions, component state). Screenshot strip per *Visual
  Gate*: welcome, news, and one warning dialog (component-driven capture acceptable), desktop plus mobile if layout differs.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/smoke.spec.ts` succeeds.
- Confirm changed files match `Files Allowed To Modify`; `git diff --check` clean.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a new shared component, ten API adoptions, and ordering semantics reconstructed from legacy.
- Reviewer: `opus` — `C-SERVER-PREFERENCES` is a new shared contract; matches the implementer's tier.
- Fixer: `opus` — likely findings concern ordering/once-only semantics, not mechanical polish.

Implementer prompt: Start from `hydra-checks-footer.js` and map its call graph before writing code. Trap: legacy's
FAILED_BACKUP condition is dead code — implement the intent, record the deviation; and never run admin checks for
non-admin sessions. Prove first the welcome-vs-news mutual exclusion (news only when welcome was already shown).
Reviewer prompt: Check hardest that every one-shot flag is cleared only after successful display and that the system test
consumed no one-shot state on the shared instance; distrust ordering claims not pinned by a test.
