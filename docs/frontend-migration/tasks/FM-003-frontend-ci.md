# FM-003: Frontend CI Baseline

Status: planned Owner:
Feature IDs: F-PLATFORM-SHELL Component IDs: none API IDs: none Depends on: FM-002 Blocks: FM-009

## Outcome

Make React dependency installation, typechecking, linting, unit tests, and production build mandatory automated checks.

## Files Allowed To Modify

- `.github/workflows/**`
- React package scripts or test configuration required by CI
- `docs/frontend-migration/STATUS.md`
- This task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Spring packaging integration
- Feature implementation
- Legacy Gulp modernization

## Context To Read

- `ADR-0002` and `ADR-0004`
- Existing `.github/workflows/system-test.yml` and native workflows

## Acceptance

- CI uses the repository's chosen Node version and `npm ci`.
- Typecheck, lint, unit tests, and production build fail independently and visibly.
- Dependency caching does not cache generated application output.
- Local and CI commands are identical.

## Verification

- Run the complete local command sequence represented by the workflow.
- Validate workflow syntax.

## Handoff

Record workflow and local verification evidence. Mark this task `review` when complete.
