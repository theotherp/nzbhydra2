# FM-005: Bootstrap, Auth, And Transport

Status: done Owner: OpenCode
Feature IDs: F-PLATFORM-SHELL Component IDs: C-API-TRANSPORT API IDs: API-BOOTSTRAP-INITIAL, API-AUTH-LOGIN, API-AUTH-LOGOUT Depends on: FM-001, FM-002, FM-004 Blocks: FM-007, FM-008

## Outcome

Provide one typed runtime bootstrap and HTTP transport with base URL, credentials, CSRF, authentication, authorization, and common error semantics.

## Files Allowed To Modify

- `core/ui-react/src/api/**`
- `core/ui-react/src/bootstrap*`
- `core/ui-react/src/features/auth/**`
- Focused backend changes required to make bootstrap semantics coherent
- Focused tests
- Relevant component and API registry records
- `docs/frontend-migration/STATUS.md`
- This task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Feature-specific API methods
- File transfer, upload progress, or STOMP abstractions
- General UI shell styling

## Context To Read

- `ADR-0001`, `ADR-0003`, and `ADR-0004`
- `BootstrappedDataTO`, `MainWeb`, `AuthWeb`, and `SecurityConfig`
- Legacy auth service and HTTP interceptors

## Acceptance

- Runtime URLs derive from normalized bootstrap base data.
- Unsafe same-origin requests support the Hydra CSRF cookie/header contract.
- Credentials and JSON/error parsing are centralized.
- 401 and 403 remain distinguishable.
- FORM login/logout and current permission state have focused tests.
- Transport consumers cannot silently use hardcoded root-relative internal API URLs.

## Verification

- React quality commands and focused unit tests
- IntelliJ build and focused auth tests for backend changes
- Focused Playwright auth/base-path scenarios where available

## Handoff

### Outcome

- Added `ApiTransport`, which accepts only application-base-relative paths and centralizes same-origin credentials, JSON request/response handling, Hydra CSRF, and typed 401/403 errors.
- Added FORM `loginWithForm`, `logout`, and `currentSession` operations. Each refreshes the complete typed bootstrap and returns its current permissions.
- Normalized React bootstrap bases to same-origin path bases. `/internalapi/userinfos` now returns the same safe configuration and normalized base URL bootstrap semantics as the shell, so FORM session refreshes remain complete.

### Public Transport API

- `new ApiTransport(baseUrl, fetchImplementation?)` and `request<T>(path, options)`; paths must not begin with `/` or escape `baseUrl`.
- `TransportRequest` supports raw, form, or JSON bodies (one only); unsafe requests copy `HYDRA-XSRF-TOKEN` to `X-XSRF-TOKEN` when present.
- `ApiError`, `UnauthorizedError`, and `ForbiddenError` preserve parsed response data and distinguish 401 from 403.

### Files Modified

- `core/ui-react/src/{api,bootstrap*,features/auth}` and focused React tests.
- Focused bootstrap/auth backend sources and tests, `COMPONENTS.yaml`, `APIS.yaml`, `STATUS.md`, and this task packet.
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`.

### Toolchain

- Node: `v26.6.0`
- Package manager: `npm 11.18.0`
- Other material tools: IntelliJ build/test runner; Maven `3.9.16` through the required system-test runner.

### Verification Evidence

| Working directory | Command                                                                                                                                      | Result                                                                                                                                |
|-------------------|----------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| `core/ui-react`   | `npm ci`                                                                                                                                     | Passed; 347 packages installed, no vulnerabilities.                                                                                   |
| `core/ui-react`   | `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration`          | Passed; 4 test files / 12 tests; migration registry validation passed.                                                                |
| `core/ui-react`   | `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run src/api/transport.test.ts && npm run validate:migration` | Passed; 1 test file / 7 tests; migration registry validation passed.                                                                  |
| IntelliJ          | build focused `UserInfosProvider`, `AuthWeb`, `MainWeb`, and auth/web tests                                                                  | Passed with no problems.                                                                                                              |
| IntelliJ          | `AuthWebTest`                                                                                                                                | Passed: 1 test.                                                                                                                       |
| IntelliJ          | `MainWebTest`                                                                                                                                | Passed: 5 tests.                                                                                                                      |
| repository root   | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/shell-selector.spec.ts`                                                           | Passed: Maven package succeeded and 1 Playwright base-path/shell-selection test passed. No dedicated Playwright auth scenario exists. |

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Assumptions

- The server bootstrap `baseUrl` represents the configured context path and is intentionally restricted to same-origin paths by the React runtime.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `C-API-TRANSPORT` and `C-AUTH-SESSION` now record their delivered partial implementations. `API-BOOTSTRAP-INITIAL`, `API-AUTH-LOGIN`, and `API-AUTH-LOGOUT` point to their concrete source and focused tests.

### Follow-Up Work

- File-transfer/binary response handling and SockJS/STOMP abstractions remain deferred as explicitly out of scope for FM-005.
