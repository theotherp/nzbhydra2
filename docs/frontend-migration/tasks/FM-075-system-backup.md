# FM-075: System Backup Tab

Status: planned Owner:
Feature IDs: F-SYSTEM-BACKUP
Component IDs: C-API-TRANSPORT, C-RESTART-COORDINATOR, C-DATE-TIME, C-DIALOG-SERVICE, C-TOAST-SERVICE
API IDs: API-SYSTEM-BACKUP-LIST, API-SYSTEM-BACKUP-CREATE, API-SYSTEM-BACKUP-CREATE-DOWNLOAD, API-SYSTEM-BACKUP-UPLOAD, API-SYSTEM-BACKUP-RESTORE, API-SYSTEM-BACKUP-DOWNLOAD
Depends on: None
Blocks: None

## Outcome

Admins manage backups at `/system/backup`: create (with or without downloading), list and download existing backups,
restore from an existing backup, and upload-and-restore a backup file with visible upload progress. One capability over one
legacy directive (`backup.js`) and six endpoints; the upload-progress transport work belongs here because this is its first
consumer (ADR-0003 already reserves upload progress for explicit handling in `C-API-TRANSPORT`).

## Decision Dependencies

ADR-0001, ADR-0002, ADR-0003 (upload progress handled explicitly in the transport), ADR-0004, ADR-0014, ADR-0015.

## Files Allowed To Modify

- `core/ui-react/src/features/system/**` (backup page inside FM-072's shell), `core/ui-react/src/api/system/**`
- `core/ui-react/src/api/transport.ts`, `core/ui-react/src/api/transport.test.ts` (upload-with-progress only)
- `core/ui-react/src/router.tsx`, `core/ui-react/src/router.test.tsx`
- `tests/system/tests/system.spec.ts`
- The `F-SYSTEM-BACKUP` record, the six `API-SYSTEM-BACKUP-*` records, and the five component records listed above only
- This task packet and `docs/frontend-migration/STATUS.md`

## Out Of Scope

- Backend backup/restore behavior, wrapper restore mechanics, scheduled backups (config Main tab owns those settings)

## Context To Read

- `core/ui-src/js/directives/backup.js`, `core/ui-src/js/backup-service.js`, `core/ui-src/html/directives/backup.html`
- `BackupWeb` (or equivalent) in `core/src` for the multipart field name and `GenericResponse` shapes
- `core/ui-react/src/api/transport.ts` (existing binary download path from `API-DOWNLOAD-ZIP-FILE`),
  `core/ui-react/src/services/restart/` (countdown with a caller-supplied message)

## Acceptance

- The backup list (`API-SYSTEM-BACKUP-LIST`) shows filename and server-timezone creation date (`C-DATE-TIME`); each row
  links to `API-SYSTEM-BACKUP-DOWNLOAD` via a base-URL-aware href and offers a Restore action.
- "Create and download backup" streams `API-SYSTEM-BACKUP-CREATE-DOWNLOAD` through the transport's binary path with a
  `nzbhydra-backup-YYYY-MM-DD-HH-mm.zip` filename; "Just create backup" calls `API-SYSTEM-BACKUP-CREATE` with
  `dontdownload=true`; both refresh the list on success (two side-by-side actions replacing legacy's split button is fine —
  FM-066/067 precedent).
- Restore from an existing backup first confirms via `C-DIALOG-SERVICE` that the application will restart (a deliberate
  addition over legacy's unguarded icon click — record it as a `deliberate` gap line), then calls
  `API-SYSTEM-BACKUP-RESTORE` and on success starts the restart countdown with legacy's "Extraction of backup successful.
  Restarting for wrapper to restore data." message; a failure shows the response message as an error toast.
- Upload-and-restore posts the chosen file to `API-SYSTEM-BACKUP-UPLOAD` through a new transport upload method that reports
  progress (XHR-based; fetch cannot observe upload progress) and renders a progress bar with loaded/total; a
  `successful=false` response resets progress and toasts the message; success starts the countdown with legacy's "Upload
  successful. ..." message. The transport method keeps the credentials/CSRF contract and is unit-tested.
- Selectors (new): `system-backup`, `system-backup-create-download`, `system-backup-create-only`, `system-backup-upload`,
  `system-backup-upload-progress`, `system-backup-table`, `system-backup-row`, `system-backup-download-<index>`,
  `system-backup-restore-<index>`, `system-backup-restore-confirm`, recorded on `F-SYSTEM-BACKUP`.
- Component tests cover create/refresh, restore confirm-and-countdown, upload success/refusal/progress (transport mocked);
  Playwright proves create-only, the listed entry, and its download against a real backend — it must not run a real restore
  or upload (both restart the shared instance); those flows are proven by component tests.
- Registry evidence updated. Screenshot strip per *Visual Gate*: list with entries, upload in progress, restore confirm;
  desktop plus mobile if layout differs.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/system.spec.ts` succeeds.
- Confirm changed files match `Files Allowed To Modify`; `git diff --check` clean.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — extends the shared transport with an upload-progress contract and wires two restart-inducing flows.
- Reviewer: `opus` — shared `C-API-TRANSPORT` change; must match the implementer's tier.
- Fixer: `opus` — likely findings live in the transport/upload/restart interplay, not in mechanical polish.

Implementer prompt: Start from `backup.js` and the transport's existing binary download path; the multipart field name comes
from the backend controller, not the legacy Upload wrapper. Trap: a `successful=false` upload answers HTTP 200 — treat it as
refusal, not transport error. Prove first that the new upload method still sends the CSRF header and credentials.
Reviewer prompt: Check hardest the transport upload method's contract parity (CSRF, credentials, base URL) and that
Playwright never triggers restore/upload; distrust progress-bar claims not backed by a progress-event test.
