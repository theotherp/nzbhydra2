# FM-002: React Scaffold

Status: done Owner:
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

- `package.json` declares the supported Node range and exact npm version.
- A committed npm lockfile allows a clean `npm ci`.
- Required scripts exist:
    - `dev`
    - `build`
    - `typecheck`
    - `lint`
    - `test`
    - `format`
    - `format:check`
    - `validate:migration`
- TypeScript is configured in strict mode.
- ESLint, Prettier, Vitest, and React Testing Library are configured.
- A minimal component smoke test verifies that the application shell renders.
- Only dependencies approved by the ADRs are present.
- No routing, API-client, server-state, client-state, form, or alternative UI framework is introduced.
- Production assets use Vite's configurable `base` and remain isolated from legacy generated assets.
- Build output remains under `core/ui-react` and is not integrated into Spring.
- `validate:migration`:
    - parses all three YAML registries;
    - rejects duplicate registry IDs;
    - rejects duplicate active API method/path records;
    - verifies IDs referenced by migration task metadata;
    - exits nonzero with actionable diagnostics on validation failure.
- Generated build output, dependencies, coverage, and local environment files are ignored.

## Verification

From a clean dependency state:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm run test -- --run`
- `npm run build`
- `npm run validate:migration`
- Confirm verification leaves no unexpected generated or modified files.
- Confirm the final diff contains only files allowed by this task.

## Handoff

Record tool versions, commands, generated-output policy, verification results, and any build integration assumptions. Mark this task `review` when complete.
