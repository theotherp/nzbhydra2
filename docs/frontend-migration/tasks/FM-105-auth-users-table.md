# FM-105: Auth Users Table

Status: planned Owner:
Feature IDs: F-CONFIG-AUTH
Component IDs: C-CONFIG-FIELDS
API IDs: API-CONFIG-PUT
Depends on: None
Blocks: None

## Outcome

The Users section becomes auditable at a glance: the stacked `RepeatSection` fieldsets give way to a compact table —
username, rights as chips (Admin, or the individual Stats / Details&DL / Indexer-selection rights), password state — with
per-row edit and delete, editing in a dialog that follows FM-064's modal-transaction pattern (edit a clone, commit into
the whole-config form only on submit, discard on cancel). Source: owner backlog `docs/config-ui-improvements.md` §4.3,
fed into design 2026-08-24; this packet is the contract, implementers ignore that file per its banner. The owner offered
inline or modal; modal is chosen because the transaction pattern and its tests already exist (`DownloaderDialog.tsx`)
and a half-filled new user then never sits invalid inside the main form.

## Decision Dependencies

None (masked-password semantics are settled: `API-CONFIG-PUT` resolves `***UNCHANGED***` for users by username and
refuses unresolvable markers — see its `../APIS.yaml` note).

## Files Allowed To Modify

- In `core/ui-react/src/features/config/auth/`: `AuthUsersSection.tsx`, `authSettings.ts`, a new `UserDialog.tsx`, their
  tests, and `AuthConfigTab.test.tsx`
- `tests/system/tests/config-auth.spec.ts` — cases driving the repeat-section UI may be rewritten
- The `F-CONFIG-AUTH` record in `../FEATURES.yaml`
- This task packet, `../STATUS.md`, `../GUI-STATUS.md` if its derived row changes

## Out Of Scope

- `RepeatSection.tsx` (other consumers keep it; do not modify or delete), `AuthConfigTab.tsx`'s non-user fields, the
  auth-type/OIDC logic beyond what `UserEntryFields` already branches on, any backend change
- Fixing FM-060's escalated backend defects (they are `ConfigWeb`-side; the by-username marker resolution already
  neutralizes the password-swap case for saves)

## Context To Read

- `AuthUsersSection.tsx` (fields, the OIDC no-password branch, the admin-implies-all hiding at `:64-79`, `defaultUser`,
  `userFieldPath`) and `authSettings.ts`
- `downloading/DownloaderDialog.tsx` + `DownloadersSection.tsx` (the modal-transaction pattern: clone, own form, token,
  commit via `setValue` with `shouldDirty`) — minus the connection check, which users do not have
- `components/SecretInput.tsx` (masked-value anatomy the dialog's password field keeps) and `../APIS.yaml`
  `API-CONFIG-PUT` (marker resolution by username; length-stable positional fallback)
- `F-CONFIG-AUTH.selectors` in `../FEATURES.yaml` (the `config-repeat-*` ids this packet explicitly replaces)

## Acceptance

- Table (`config-users-table`): one row per `auth.users` entry in config order — username (or the existing "Authless"
  legend for an empty one), rights chips ("Admin" alone when `maySeeAdmin`, mirroring the existing implies-all hiding;
  otherwise one chip per granted right, "No rights" when none), a password-set indicator that never shows a value, Edit
  (`config-user-edit-<index>`) and Delete (`config-user-delete-<index>`) actions. "Add new user" button preserved in
  wording.
- Dialog: edits a clone over its own React Hook Form (the existing `*Setting` controls bind to whichever form is
  nearest — the `C-CONFIG-FIELDS` property FM-064 exploits); Save validates (username required; password required
  except OIDC, exactly the current branch) and commits the clone into `auth.users` by config index; Cancel discards. A
  stored masked password stays `***UNCHANGED***` unless retyped, so an untouched edit round-trips losslessly.
- Delete asks the shared confirm dialog naming the username, then removes by config index. Focus management: after add
  or delete, focus lands on the table (§5's repeat-section focus note made concrete here).
- Rights are colour-independent (chip labels are text) and the rendering logic is a tested pure function.
- Tests: table + dialog component tests (rights derivation, OIDC branch, masked round-trip, cancel-discards);
  `config-auth.spec.ts` rewrites the users cases: add a user, grant rights, save; edit without touching the password and
  verify the save carries the marker (assert via a second load); delete with confirm.
- `F-CONFIG-AUTH.selectors`: the `auth.users` repeat-section ids removed with a comment naming this packet; new ids
  recorded. ADR-0014: stock MUI table/dialog anatomy, no design literals.
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 table with an admin and a limited user plus the
  open dialog; mobile 390x844.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-auth.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a modal transaction over credentials with masked-secret round-trip semantics; a wrong commit
  path here writes another user's password.
- Reviewer: `opus` — secret semantics and a selector re-homing demand at least the implementer's tier.
- Fixer: `sonnet` — expected findings are presentation-level.

Implementer prompt: Start at `DownloaderDialog.tsx`'s transaction shape and strip the connection-check half. Trap: the
dialog's clone must carry the stored password *as masked* — seeding the secret field empty would save an empty password;
follow `SecretInput`'s unchanged-state contract exactly. Prove the untouched-edit round-trip first against a real
backend: edit only a username, save, reload, and confirm the login still works.
Reviewer prompt: Check hardest the commit-by-config-index path when a user was deleted while the dialog cycled, and that
no password value ever reaches the table DOM. Distrust jsdom marker claims — require the real-backend round-trip.
