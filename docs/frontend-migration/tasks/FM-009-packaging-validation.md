# FM-009: Packaging And Deployment Validation

Status: planned Owner:
Feature IDs: F-PLATFORM-SHELL Component IDs: C-APP-SHELL API IDs: API-BOOTSTRAP-INITIAL Depends on: FM-003, FM-004, FM-008 Blocks: later feature migration

## Outcome

Prove the React shell and first vertical slice work in development, packaged JVM, configured URL-base, external-static, and representative native deployment paths.

## Files Allowed To Modify

- Frontend build integration
- Release, Docker UI-development, and CI scripts directly required for React assets
- Focused Java/native resource tests
- Focused Playwright configuration and tests
- Relevant feature records
- `docs/frontend-migration/STATUS.md`
- This task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Legacy Gulp modernization or removal
- Additional feature migration
- General release pipeline redesign

## Context To Read

- `ADR-0001` and `ADR-0004`
- `CONTEXT.md` build and packaging section
- `misc/build_and_release.py`, native hints, static resource configuration, UI-development Docker files, and existing system-test runners

## Acceptance

- Clean builds produce React assets before JVM and native resource packaging.
- React assets load under root and non-root configured URL bases.
- The external static override has an explicit working development path.
- JVM package and one representative native package serve the React shell and first feature.
- CI detects missing or stale production assets.
- Legacy assets continue to work while the selector exists.

## Verification

- React quality commands and production build
- IntelliJ project build and focused resource tests
- GUI system-test runner against JVM and representative native runtime

## Handoff

Record validated runtime matrix, exact commands, remaining platform gaps, and release implications. Mark this task `review` when complete.
