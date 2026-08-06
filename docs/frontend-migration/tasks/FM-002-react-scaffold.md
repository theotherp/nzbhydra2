# FM-002: React Scaffold

Status: planned Owner:
Feature IDs: F-PLATFORM-SHELL Component IDs: C-APP-SHELL API IDs: none Depends on: FM-001 Blocks: FM-003, FM-004, FM-005, FM-006, FM-007

## Outcome

Create a reproducible Vite React TypeScript project with the approved dependencies and local quality commands, without integrating it into Spring yet.

## Files Allowed To Modify

- `core/ui-react/**`
- Root ignore/editor settings only where required for generated React files
- `docs/frontend-migration/COMPONENTS.yaml`
- `docs/frontend-migration/STATUS.md`
- This task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Spring or Thymeleaf integration
- Application navigation, API transport, generated API types, or feature pages
- Legacy UI and generated static assets

## Context To Read

- `ADR-0001`, `ADR-0002`, and `ADR-0004`
- `/core/ui-react/AGENTS.md`

## Acceptance

- Lockfile and Node engine policy make `npm ci` reproducible.
- Scripts cover development, production build, typecheck, lint, unit tests, and formatting checks.
- Strict TypeScript, ESLint, Vitest, React Testing Library, and a minimal smoke test are configured.
- Approved stack dependencies are present without overlapping UI or state frameworks.
- Production output is configured for the isolated React namespace and a configurable base.
- A package script validates migration YAML, unique IDs, task references, and duplicate active API method/path records.

## Verification

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run test -- --run`
- `npm run build`
- Run the migration registry validation script.

## Handoff

Record tool versions, commands, generated-output policy, verification results, and any build integration assumptions. Mark this task `review` when complete.
