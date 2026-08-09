# FM-007: OpenAPI Types And First Endpoint

Status: done Owner: OpenCode
Feature IDs: F-PLATFORM-SHELL Component IDs: C-API-TRANSPORT API IDs: selected by the task owner from APIS.yaml Depends on: FM-001, FM-002, FM-005 Blocks: FM-008

## Outcome

Generate reproducible TypeScript API types and adopt one simple read-only endpoint through the shared transport without generating a second client architecture.

## Files Allowed To Modify

- React API generation configuration, generated types, and focused tests
- Java/OpenAPI annotations for the selected endpoint only
- React package scripts and lockfile
- `core/.gitignore`, only to add `!ui-react/package-lock.json`; the existing ignore behavior for other lockfiles must remain unchanged
- Relevant API registry records
- `docs/frontend-migration/STATUS.md`
- This task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Whole-spec cleanup
- Generated transport or React Query hooks
- Binary, multipart, login/logout, or STOMP operations
- Feature page implementation

## Context To Read

- `ADR-0003` and `ADR-0004`
- `core/.gitignore` and FM-002's committed-lockfile contract
- `core/openapi.json`
- The selected API's Java contract and legacy caller

## Acceptance

- Generation is deterministic and available through one package script.
- Generated files carry a no-manual-edit marker.
- The selected operation has stable method/path semantics and useful response typing.
- Runtime calls use `C-API-TRANSPORT`, not generator defaults.
- CI or a focused check detects stale generated types.
- The API registry records contract quality, target caller, and test evidence.

## Verification

- Regenerate and prove a clean diff on a second run.
- React typecheck, lint, unit tests, and build.
- Focused backend contract test if Java metadata changes.
- From the repository root, confirm `git check-ignore core/ui-react/package-lock.json` exits `1` with no output and `git check-ignore -v core/package-lock.json` still identifies `core/.gitignore`.

## Handoff

### Outcome

- Selected `API-WELCOME-GET` (`GET internalapi/welcomeshown`), whose legacy caller reads a boolean before showing the welcome modal.
- Added `openapi-typescript` `7.13.0` generation from `core/openapi.json`, a generated no-manual-edit marker, a stale-output check, and a typed `getWelcomeShown` call through `C-API-TRANSPORT`.
- Added the precise `core/.gitignore` exception for `ui-react/package-lock.json`; other `package-lock.json` files remain ignored.

### Files Modified

- `core/.gitignore`, `core/ui-react/package.json`, `core/ui-react/package-lock.json`, generation check, generated OpenAPI types, and focused welcome API source/test.
- `docs/frontend-migration/{APIS.yaml,STATUS.md}` and this task packet.
- Scope confirmation: all task-owned implementation edits are within `Files Allowed To Modify`, including the task-authorized lockfile exception.

### Toolchain

- Node: `v26.6.0`
- Package manager: `npm 11.18.0`
- Other material tools: `openapi-typescript 7.13.0`, Prettier `3.7.4`

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci`, then `npm run generate:api` twice with `git diff --exit-code -- src/api/generated/openapi.ts` after each run | Passed; both generations left a clean worktree diff. |
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run` | Passed through tests: 9 files / 20 tests. `npm ci` reported 2 high-severity audit findings. |
| `core/ui-react` | `npm run build && npm run validate:migration && npm run check:api` | Passed; Vite built 914 modules, registry validation and stale-output check passed. |
| repository root | `git check-ignore core/ui-react/package-lock.json` | Passed: exit `1` with no output. |
| repository root | `git check-ignore -v core/package-lock.json` | Passed: identifies `core/.gitignore`'s `package-lock.json` rule. |
| repository root | Corresponding `git check-ignore --no-index` checks | Passed; proves the exception itself is effective despite the intended lockfile already being in the index. |
| repository root | `git diff --check` | Passed. |

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: Added exact `openapi-typescript 7.13.0` to generate compile-time-only OpenAPI types. Its output is formatted with the existing Prettier configuration so generation and stale checking are deterministic.

### Assumptions

- No Java/OpenAPI metadata correction was made: the selected snapshot already supplies stable `GET /internalapi/welcomeshown` path semantics and a boolean `200` response. Its `logfileContent` operation ID remains a known upstream spec weakness and is recorded in `APIS.yaml`.
- A focused backend contract test is not applicable because no Java metadata changed.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `API-WELCOME-GET` now identifies its React target, typed contract state, focused test evidence, and FM-007 ownership.

### Follow-Up Work

- No FM-007 follow-up. The independent review passed with a minor retained finding: restore unrelated line-ending churn in `core/.gitignore` in a future appropriate change.
