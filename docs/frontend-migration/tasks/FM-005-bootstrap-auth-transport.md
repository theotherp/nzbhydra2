# FM-005: Bootstrap, Auth, And Transport

Status: planned Owner:
Feature IDs: F-PLATFORM-SHELL Component IDs: C-API-TRANSPORT API IDs: API-BOOTSTRAP-INITIAL, API-AUTH-LOGIN, API-AUTH-LOGOUT Depends on: FM-001, FM-002, FM-004 Blocks: FM-007, FM-008

## Outcome

Provide one typed runtime bootstrap and HTTP transport with base URL, credentials, CSRF, authentication, authorization, and common error semantics.

## Files Allowed To Modify

- `core/ui-react/src/api/**`
- `core/ui-react/src/app/bootstrap*`
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

Record public transport API, backend contract changes, verification, and deferred file/STOMP requirements. Mark this task `review` when complete.
