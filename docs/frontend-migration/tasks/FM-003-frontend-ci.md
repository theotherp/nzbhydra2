# FM-003: Frontend CI Baseline

Status: done Owner: OpenCode
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

### Outcome

- Added React CI that runs the repository's Node 26 toolchain with clean dependency installation, typechecking, linting, unit tests, and a production build as independently visible steps on pushes and pull requests.

### Files Modified

- `.github/workflows/frontend-ci.yml`
- `docs/frontend-migration/STATUS.md`
- `docs/frontend-migration/tasks/FM-003-frontend-ci.md`
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`.

### Toolchain

- Node: `v26.6.0`
- Package manager: `npm 11.18.0`
- Other material tools: `yaml 2.9.0` from the committed React lockfile

### Verification Evidence

| Working directory | Command                                                                                                                                                                                                                                                                                            | Result                                                        |
|-------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| `core/ui-react`   | `npm ci`                                                                                                                                                                                                                                                                                           | Passed; installed 347 packages with zero vulnerabilities.     |
| `core/ui-react`   | `npm run typecheck`                                                                                                                                                                                                                                                                                | Passed.                                                       |
| `core/ui-react`   | `npm run lint`                                                                                                                                                                                                                                                                                     | Passed.                                                       |
| `core/ui-react`   | `npm run test -- --run`                                                                                                                                                                                                                                                                            | Passed; 1 test file and 1 test.                               |
| `core/ui-react`   | `npm run build`                                                                                                                                                                                                                                                                                    | Passed; Vite production assets emitted under ignored `dist/`. |
| `core/ui-react`   | `node --input-type=module -e 'import { readFile } from "node:fs/promises"; import { parseDocument } from "yaml"; const path = "../../.github/workflows/frontend-ci.yml"; const document = parseDocument(await readFile(path, "utf8")); if (document.errors.length) { throw document.errors[0]; }'` | Passed; workflow YAML parsed without errors.                  |
| repository root   | `git diff --check`                                                                                                                                                                                                                                                                                 | Passed.                                                       |

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Assumptions

- `actions/setup-node@v4` with Node 26 satisfies the declared `>=26.0.0 <27` Node range. Its npm cache caches downloaded packages from `package-lock.json`, not generated `dist/` output.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- Updated `STATUS.md` to place FM-003 in review.

### Follow-Up Work

- None.
