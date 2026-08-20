# FM-060: Config Auth Tab

Status: planned Owner:
Feature IDs: F-CONFIG-AUTH Component IDs: C-CONFIG-FIELDS, C-SECRET-INPUT, C-CONFIG-FORM API IDs: API-CONFIG-PUT Depends on: FM-059 Blocks: None

## Outcome

Admins configure authentication at `/config/auth` in React: auth type and its dependent field groups, the OIDC provider settings, the area restrictions, and the user list with inline add, edit, and remove — including passwords that are never
round-tripped in clear text.

## Boundary Rationale

An independent product capability with its own persistence surface (`AuthConfig`, including the user list) and its own risk: it is the first packet whose repeat section adds and removes records inside the whole-config form, and the first
whose secrets belong to list entries matched by name. It depends on FM-059 only because the field vocabulary must exist and be reviewed first, not because of any layer split.

## Decision Dependencies

- Accepted: ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/config/auth/**`
- `core/ui-react/src/features/config/components/**`, only for additive, non-forking extensions FM-059's vocabulary genuinely lacks (a repeat/list-section kind is expected here); FM-059's tests must keep passing unmodified
- FM-058's config shell/form files and `core/ui-react/src/router.tsx` (+ `router.test.tsx`), only to mount the Auth tab body
- `tests/system/tests/config-auth.spec.ts`
- The `F-CONFIG-AUTH`, `C-CONFIG-FIELDS`, and `C-SECRET-INPUT` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Login, logout, and session behavior (`F-AUTH-LOGIN`), the shell's permission-gated navigation, and backend auth wiring
- Any other tab's fields, and any change to how FM-058 saves or validates the config

## Context To Read

- FM-058 and FM-059 packets and handoffs, `/core/ui-react/AGENTS.md` *UI Conventions*, and the listed registry records
- `core/ui-src/js/config/config-fields-service.js:2011-2375` (the whole Auth tab, including the `users` repeat section), `core/ui-src/html/states/config.html` (`repeatSection.html`), `core/ui-src/js/config/formly-config.js` `passwordSwitch`
- `AuthConfig.java` and `UserAuthConfig.java`, `SensitiveDataConfigValidator.processSensitiveFieldsForSaving`/`findCorrespondingOldItem`, `core/ui-react/src/bootstrap.ts`

## Acceptance

- `/config/auth` renders every field of `config-fields-service.js:2011-2375` with legacy's labels, help, tooltips, and advanced flags: the Main group (auth type, auth header, secure IP ranges, remember users, cookie expiry), the OpenID Connect
  group, the restriction switches (`restrictSearch`, `restrictStats`, `restrictAdmin`, `restrictDetailsDl`, `restrictIndexerSelection`, `allowApiStats`), and the Users section.
- Conditional visibility matches legacy exactly and is `useWatch`-driven: header fields hide for `NONE` and `OIDC`, the secure-IP-range field additionally hides while the auth header is empty, the whole OIDC group shows only for `OIDC`, the
  explicit OIDC endpoint fields hide once an issuer URI is set, restrictions and users hide for `NONE`, and the per-user permission switches hide while `maySeeAdmin` is on. A hidden field keeps its value; nothing is cleared by hiding.
- The Users section adds, edits, and removes entries inline in the whole-config form (legacy `repeatSection.html`, not a modal): a new user starts from legacy's default model (`maySeeStats`, `maySeeAdmin`, `maySeeDetailsDl`,
  `showIndexerSelection` all true), each entry is labelled by its username or "Authless", add and remove mark the form dirty, and removal takes effect only when the config is saved.
- Passwords use `C-SECRET-INPUT`: a hashed password arrives as `***UNCHANGED***` (`UserAuthConfigValidator.updateAfterLoading`) and is preserved untouched, while an edited one sends the typed value. Username is required; a password is
  required only for a newly added user, and never while the auth type is `OIDC`. `oidcClientSecret` is not masked by the backend and round-trips in clear — do not treat it as an unchanged-marker field.
- The users array keeps its server order and is never reordered by the UI, because the marker is resolved positionally before it is resolved by username (`BaseConfigValidator.prepareForSaving:137-149` runs
  `SensitiveDataConfigValidator.prepareForSaving`, whose `findCorrespondingOldItem` falls back to index since `UserAuthConfig` has no `name` field, before `UserAuthConfigValidator.prepareForSaving` matches by username). The system test renames
  an existing user without touching its password, records in the handoff what the running backend actually does to that password, and escalates rather than works around it if the answer is data loss.
- New `data-testid` values are recorded in `F-CONFIG-AUTH.selectors`.
- Tests: component tests for auth-type-driven visibility with value retention, user add/edit/remove, required-field validation, and the OIDC issuer/explicit-endpoint switch; `tests/system/tests/config-auth.spec.ts` (using the `hydra` fixture,
  which restores the instance config) adds a user, saves against the real backend, reloads, and proves the user persists while the password field comes back masked and a re-save without touching it keeps the login working.
- Screenshot strip per `../README.md` *Visual Gate*: `/config/auth` for auth type `NONE`, `FORM`, and `OIDC`, plus the Users section with two entries, at 1280x800 and 390x844.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-auth.spec.ts` succeeds, and `tests/config.spec.ts` and `tests/config-main.spec.ts` still pass unchanged.
- Run `git diff --check`; confirm changed files match Files Allowed To Modify and no generated artifacts are left behind.

## Handoff / Review

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — the field set is declarative and FM-059's vocabulary already exists; the only new mechanism is a list section whose behavior this packet spells out.
- Reviewer: `opus` — at least the implementer's tier because the packet may extend the shared vocabulary, and because a wrong secret or permission mapping here is a security regression rather than a cosmetic one.
- Fixer: `sonnet` — expected findings are missing fields, wrong visibility conditions, or a missing validation message.

Implementer prompt: Start at `config-fields-service.js:2011-2375` and read every `hideExpression` before writing any JSX. Trap: treating the users array as component state — it must live in the FM-058 form, or a tab switch loses new users.
Prove the rename-plus-unchanged-password case against a running instance and write down what actually happened, whatever it is.
Reviewer prompt: Check hardest that no hidden field is unregistered or cleared and that the password rule distinguishes a new user from an existing one. Distrust a component test that asserts a masked field renders without asserting what is sent.
