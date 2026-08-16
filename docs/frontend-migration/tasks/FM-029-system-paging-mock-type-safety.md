# FM-029: System Paging Mock Type Safety

Status: done Owner: gpt-5.6-terra
Feature IDs: F-SEARCH-PAGING
Component IDs: None
API IDs: API-SEARCH-EXECUTE
Depends on: None
Blocks: FM-026

## Dependency Notes

This dependency-free correction owns the pre-existing `results.spec.ts` type error that blocks FM-026's required system TypeScript verification. Completing FM-029 removes that external verification blocker so a fixer can rerun FM-026 verification and return it to review. FM-026's historical contract and dependency fields remain unchanged.

## Outcome

The deterministic paging route mock represents its consumed search-request fields with sound TypeScript types, allowing strict system-test type checking while preserving the mocked paging responses and request assertions.

## Boundary Rationale

The request-field typing and its numeric use are one test-only correction in a separate system-test boundary. It is intentionally split from FM-026 because the blocker predates that workflow task and its source file is outside FM-026's allowlist; paging runtime, product behavior, and broader test cleanup are unrelated.

## Decision Dependencies

- Accepted: ADR-0004.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `tests/system/tests/results.spec.ts`
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- React, legacy, backend, API/transport, test-runner configuration, dependency, generated-file, or registry changes
- Paging scenario, mock-response, request-assertion, selector, or user-observable behavior changes
- Unrelated typing cleanup in `results.spec.ts` or other system specs
- Rewriting FM-018 or FM-026 packets or their factual handoff evidence

## Context To Read

- `README.md`, `CONTEXT.md`, ADR-0004, FM-018's paging contract/handoff, and FM-026's blocker handoff
- `F-SEARCH-PAGING` and `API-SEARCH-EXECUTE`; `tests/system/{package.json,tsconfig.json}`
- The complete paging scenarios and shared conventions in `tests/system/tests/results.spec.ts`

## Acceptance

- The advancing-cache-offset route mock narrows or models the request fields it consumes so `offset` is a number before numeric comparison/arithmetic and `loadAll` is handled without unsafe assumptions.
- The mocked initial, load-more, and load-all response branches, response metadata and offsets, result sets, and expected continuation request payloads remain behaviorally identical.
- The correction introduces no `any`, type-check suppression, non-null assertion used to bypass validation, weakened compiler option, dependency, or production change.
- FM-026's recorded `results.spec.ts:451` TypeScript blocker is absent from a strict no-emit check; any other failure is reported rather than ignored.

## Verification

- In `tests/system`: `npx tsc --noEmit` succeeds with no TypeScript diagnostics and no emitted files.
- From repository root: `git diff --check` succeeds; inspect the `results.spec.ts` diff against the FM-018 paging scenario and confirm only typing/narrowing changed, all mock values and assertions are preserved, and every task-owned changed file is allowlisted.

## Handoff

Use `templates/handoff.md`; record the request-field typing/narrowing, explicit preservation of paging mock branches/values/assertions, exact TypeScript result, and scope confirmation. On successful review, notify the coordinator that FM-026 may be unblocked for a verification-only fixer cycle; do not rewrite FM-026 evidence.

## Fresh Review

The reviewer independently checks that strict typing is sound rather than asserted away, compares all paging mock values and request assertions with the predecessor scenario, and audits the focused verification evidence before acceptance.

## Handoff

### Outcome

- Narrowed the paging mock's consumed `offset` field to a number and `loadAll` field to an explicit boolean while preserving every response branch, value, and request assertion.

### Files Modified

- `tests/system/tests/results.spec.ts`
- `docs/frontend-migration/tasks/FM-029-system-paging-mock-type-safety.md`
- `docs/frontend-migration/STATUS.md`
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`; unrelated pre-existing changes, including FM-026 and visual-workflow files, were preserved.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: TypeScript `5.8.3`, invoked through `npx`

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `tests/system` | `npx tsc --noEmit` | Passed with no TypeScript diagnostics and no emitted files. |
| repository root | `git diff --check` | Passed. |

### Verification Basis

- Baseline: `5a2eddca72abd60f331d268a10bd900a6204434f`.
- Command coverage: `npx tsc --noEmit` covers `tests/system/tests/results.spec.ts`. `git diff --check` covers the task-owned test and documentation/lifecycle changes.
- File-content manifest: `tests/system/tests/results.spec.ts: 63a4313c317f4913f82d0ba3e6ec433554b3bf3a790f442fbb270c0714cd7372`.
- Completed after the last change to each command's listed files: `yes`.
- Task-owned changes after verification: documentation/lifecycle-only `docs/frontend-migration/tasks/FM-029-system-paging-mock-type-safety.md` and `docs/frontend-migration/STATUS.md`; no implementation or test file changed after this basis.

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Architecture Decisions

- ADR-0004: retained the deterministic Playwright paging scenario without weakening or changing its behavioral coverage.
- `ADR REQUIRED`: None.

### Assumptions

- A non-number mocked `offset` intentionally maps to zero; only a literal `true` `loadAll` selects the load-all branch.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `F-SEARCH-PAGING`: target, tests, parity state, task owner, gaps, selector contracts, and backlog ownership intentionally unchanged; its visual record remains `applicable` and `unassessed`, with no visual evidence, snapshots, variances, or human acceptance involved.
- `API-SEARCH-EXECUTE`: target, tests, contract state, and task owner intentionally unchanged.
- No `COMPONENTS.yaml` record is linked. The task packet records lifecycle and handoff evidence; `STATUS.md` lists FM-029 for review.

### Follow-Up Work

- After fresh review accepts this correction, FM-026 may receive a verification-only fixer cycle to rerun its system TypeScript check; its historical evidence remains unchanged.
