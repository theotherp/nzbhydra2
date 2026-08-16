# FM-030: Migration Validator Test-Runner Boundary

Status: done Owner: gpt-5.6-terra
Feature IDs: None
Component IDs: None
API IDs: None
Depends on: FM-026
Blocks: FM-027

## Dependency Notes

FM-026 introduced the Node test and STATUS validation now needing correction. FM-030 must complete before FM-027 reruns its required React quality chain; FM-028 remains sequenced after FM-027. Dependency order is FM-026 -> FM-030 -> FM-027 -> FM-028.

## Outcome

The migration validator's Node tests run only under their intended runner, while STATUS validation recognizes only actual task-list bullets, removing both verified foundation blockers from FM-027 without changing migration facts.

## Boundary Rationale

Vitest collection and STATUS parsing are the two narrow failures of the same FM-026 validation foundation exposed by FM-027's required quality chain. Correcting and jointly verifying that foundation is one independently reviewable tooling capability; FM-027's product implementation, evidence, and handoff remain separate and unchanged.

## Decision Dependencies

- Accepted: ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/vite.config.ts`
- `core/ui-react/scripts/validate-migration.mjs`
- `core/ui-react/scripts/validate-migration.test.mjs`
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- React, legacy, backend, API/transport, registry, product, visual-evidence, dependency, package-script, or generated-file changes
- Broadly narrowing Vitest discovery, converting the Node tests to Vitest, or weakening/removing/skipping either runner's coverage
- Changing FM-026/FM-027 lifecycle or dependency facts, or rewriting their task contracts, factual handoffs, implementation, or evidence
- Unrelated validator cleanup or new migration-policy validation

## Context To Read

- `README.md`, `CONTEXT.md`, ADR-0004, and the FM-026/FM-027 contracts and factual handoffs
- `core/ui-react/{package.json,vite.config.ts,vitest.setup.ts}` and both `core/ui-react/scripts/validate-migration*.mjs` files
- `STATUS.md`, task/status lifecycle rules, current task inventory, and Vitest 4.1.6 default collection/exclusion semantics

## Acceptance

- Vitest preserves its default exclusions and adds only the exact Node-runner file `scripts/validate-migration.test.mjs` to `test.exclude`; normal React/Vitest tests remain discoverable and pass.
- The excluded file remains a Node built-in test suite and its explicit `node --test` invocation passes; no test is converted, skipped, removed, or hidden from both runners.
- STATUS parsing counts an FM task only when its ID is the leading ID of that section's task-list bullet. An ID appearing later in the same explanatory bullet, or in other prose, does not make that task listed.
- A focused regression proves a Blocked bullet led by `FM-027` whose explanation mentions `FM-026` lists `FM-027` only; validation therefore accepts the current fact that FM-026 is done and absent from STATUS while FM-027 is blocked and listed.
- FM-027's complete required React quality chain no longer fails on either prohibited-file blocker. No FM-026/FM-027 status or dependency, registry record, product behavior, or FM-026/FM-027 handoff evidence changes.

## Verification

- In `core/ui-react`: `node --test scripts/validate-migration.test.mjs` succeeds, including the focused leading-bullet STATUS regression.
- In `core/ui-react`: `npm run test -- --run` succeeds, collects the normal Vitest suite, and does not collect `scripts/validate-migration.test.mjs`.
- In `core/ui-react`: `npm run validate:migration` succeeds against the current STATUS file, including its FM-027 bullet that explains the FM-026 blocker.
- In `core/ui-react`: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds, removing both blockers from FM-027's required quality chain.
- From repository root: `git diff --check` succeeds; inspect status and confirm every task-owned changed file is allowlisted and no unexpected generated file, lifecycle fact, or handoff evidence changed.

## Handoff

Use `templates/handoff.md`; record the exact Vitest exclusion and preserved defaults, Node-test and STATUS regression cases, full FM-027 quality-chain result, and scope confirmation. Notify the coordinator that FM-027 can receive a verification-only continuation after accepted review; do not edit its factual handoff.

## Fresh Review

The reviewer independently checks that only the intended Node test is excluded from Vitest, explicit Node coverage remains live, leading-bullet parsing cannot infer FM-026 from FM-027's explanation, and the recorded commands establish both blockers are absent.

## Handoff

### Outcome

- Vitest retains `configDefaults.exclude` and adds only `scripts/validate-migration.test.mjs`; the Node built-in suite remains explicitly covered by `node --test`.
- STATUS validation now recognizes task IDs only at the leading position of a task-list bullet. The focused regression proves a blocked FM-027 bullet that mentions FM-026 does not list FM-026.

### Files Modified

- `core/ui-react/vite.config.ts`, `core/ui-react/scripts/validate-migration.mjs`, and `core/ui-react/scripts/validate-migration.test.mjs`.
- `docs/frontend-migration/tasks/FM-030-migration-validator-test-runner-boundary.md` and `docs/frontend-migration/STATUS.md` lifecycle records.
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`; FM-026 and FM-027 implementation and handoff files are unchanged.

### Toolchain

- Node: `v26.7.0`.
- Package manager: `npm 11.19.0`.
- Other material tools: Vitest 4.1.6.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `node --test scripts/validate-migration.test.mjs` | Passed: 12 Node built-in tests, including the leading-bullet STATUS regression. |
| `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` | Passed: install, typecheck, lint (6 pre-existing warnings, 0 errors), format, 35 Vitest files/153 tests, build, API check, and migration validation. The Node test file was not collected by Vitest. |
| repository root | `git diff --check` | Passed after the review lifecycle update; tracked and task-owned untracked changes have no whitespace errors. |

### Verification Basis

- Baseline: `5a2eddca72abd60f331d268a10bd900a6204434f`.
- Command coverage: `node --test scripts/validate-migration.test.mjs` covers `core/ui-react/scripts/validate-migration.mjs` and `core/ui-react/scripts/validate-migration.test.mjs`; the complete React quality chain covers those files plus `core/ui-react/vite.config.ts`. `git diff --check` has no implementation/test file coverage.
- File-content manifest:
  - `core/ui-react/vite.config.ts: 8f09085a5fe3c20c71f9c1ad09e44cd0941b9a142e2a7587794bd895f02a4cb5`
  - `core/ui-react/scripts/validate-migration.mjs: 33674036b127c90c8aa9553767ecc84a886afdd240c686e3202ca502d8c1b3d9`
  - `core/ui-react/scripts/validate-migration.test.mjs: 2183e7cd3550906f8d43cf5ec57fcd2ec5b3ac2492ad1e41c16ba359002fb0c6`
- Completed after the last change to each command's listed files: yes.
- Task-owned changes after verification: documentation/lifecycle-only `docs/frontend-migration/tasks/FM-030-migration-validator-test-runner-boundary.md` and `docs/frontend-migration/STATUS.md`; final `git diff --check` evidence follows this update.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- ADR-0004: preserve explicit test coverage; the Node built-in suite remains explicitly executed rather than being converted, removed, or hidden.
- `ADR REQUIRED` proposal triggered during this task: None.

### Assumptions

- Vitest 4.1.6 `test.exclude` replaces defaults, so `configDefaults.exclude` must be spread before the single task-specific exclusion; this is verified by Vitest's v4.1.6 configuration documentation and the passing normal suite.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- No linked `FEATURES.yaml`, `COMPONENTS.yaml`, or `APIS.yaml` records. Their targets, tests, state, task owner, gaps, selector contracts, and backlog ownership are intentionally unchanged.
- No ADR-0006 visual records are linked or changed; no behavioral, accessibility, or visual gate is implied by this tooling repair.

### Follow-Up Work

- After accepted review, FM-027 can receive a verification-only continuation to rerun its required React quality chain; its factual handoff remains unchanged.
