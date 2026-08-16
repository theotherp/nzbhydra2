# FM-026: Visual Parity Workflow Foundation

Status: done Owner: gpt-5.6-terra
Feature IDs: All applicable records in FEATURES.yaml
Component IDs: None
API IDs: None
Depends on: None
Blocks: FM-027, FM-028

## Dependency Notes

ADR-0006 is accepted and supplies the policy decision. This task establishes its shared workflow before any screen can propose visual evidence; FM-027 and FM-028 consume that workflow.

## Outcome

The migration has one validated `FEATURES.yaml` visual-parity schema, an honest non-accepted initial inventory, and a deterministic Playwright evidence workflow that implements ADR-0006 without changing product presentation.

## Boundary Rationale

Registry schema, workflow guidance, agent enforcement, validation, and the evidence harness are one project-wide quality boundary: screen remediation cannot produce reviewable evidence until all agree. Search layout changes and baseline proposals are separate user-facing tasks because this foundation neither judges nor changes a screen.

## Decision Dependencies

- Accepted: ADR-0004, ADR-0006.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `docs/frontend-migration/{README.md,CONTEXT.md,FEATURES.yaml}`
- `docs/frontend-migration/decisions/ADR-0004-testing-and-parity.md`
- `docs/frontend-migration/tasks/README.md`
- `docs/frontend-migration/templates/{task.md,handoff.md,review.md}`
- `.opencode/agent/{migration-task-designer.md,migration-implementer.md,migration-reviewer.md}`
- `core/ui-react/scripts/validate-migration.mjs`
- `core/ui-react/scripts/validate-migration.test.mjs`
- `tests/system/playwright.config.ts`
- `tests/system/tests/visualEvidence.ts`
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- React component/style changes, legacy product changes, layout remediation, feature behavior, API contracts, or new runtime dependencies
- Capturing, approving, or claiming an accepted visual baseline or variance; broad full-page snapshots and Bootstrap pixel identity
- Rewriting existing behavioral parity, task completion, handoff, or test evidence

## Context To Read

- `README.md`, `CONTEXT.md`, ADR-0004, ADR-0006, decisions/tasks READMEs, all three templates, and all `FEATURES.yaml` records
- Current migration designer/implementer/reviewer instructions, `validate-migration.mjs`, Playwright config/fixtures/spec conventions, and the ADR-0006 affected-work inventory

## Acceptance

- Documentation defines semantic visual parity and a single feature-level visual record covering applicability, lifecycle status, scoped states/viewports, geometry checks, evidence references, optional narrow snapshots, variances, and explicit human acceptance. Behavioral, accessibility, and visual gates remain independent.
- Every applicable user-facing feature receives an initial non-accepted visual record without changing its behavioral `parity`, historical task owner, gaps, or completion evidence. Records with no implemented React screen are inventoried honestly rather than blocked as failed remediation.
- Lifecycle rules distinguish unassessed/proposed/accepted visual states: implementers and reviewers may produce/audit a proposal, but only explicit human acceptance may set accepted status or accept a variance. Completed screens are not retrospectively accepted.
- Migration validation enforces schema/enums, required fields by lifecycle, repository-contained evidence paths, accepted-human-decision metadata, and task references where applicable. Focused tests prove malformed/new applicable records fail while unrelated legacy-only, deferred, non-applicable, and pre-existing behavioral records are not falsely rejected solely for lacking implementation evidence.
- The Playwright convention/helper names fixed desktop `1280x800` and mobile `390x844` viewports, deterministic data/setup, stable region naming/output, geometry/overflow assertions, animation/font readiness, and optional narrow region capture. It does not enable broad automatic screenshot baselines or create an accepted image.
- Task, handoff, review, and relevant agent instructions require scoped visual contracts, proposal evidence, variance disposition, human-acceptance separation, registry reconciliation, and verification-basis coverage under ADR-0006.

## Verification

- In `core/ui-react`: `node --test scripts/validate-migration.test.mjs && npm run validate:migration && npm run format:check` succeeds.
- In `tests/system`: `npx tsc --noEmit` succeeds and the Playwright configuration plus visual-evidence helper type-check without creating baseline images.
- From repository root: `git diff --check`; inspect status/allowlist and confirm no React/legacy product source, generated bundle, snapshot, or unexpected evidence artifact changed.

## Handoff

Use `templates/handoff.md`; additionally enumerate the schema fields/status transitions, initial applicability rule/counts, positive and negative validation cases, evidence naming/viewports, and confirmation that no baseline was accepted or product layout changed. Mark `review` only after verification succeeds.

## Fresh Review

The reviewer independently audits false-positive validation cases, every initial visual record, agent/template enforcement, and the absence of product/baseline changes. Human visual acceptance is not requested for this workflow-only task.

## Handoff

### Outcome

- Implemented the ADR-0006 visual-record schema, initial inventory, validator/tests, and deterministic Playwright evidence helper without product/layout or baseline changes. FM-029 resolved the external system-test type error; the required system TypeScript verification now passes, so this task is review-ready.
- Review-finding correction: accepted variances now require an accepted visual record with valid human metadata, and `accepted_on` is validated as an ISO calendar date.
- Second review-finding correction: the focused validator test now proves a `not_applicable` and `unassessed` visual record passes without contract, evidence, or implementation evidence. The task remains in `review` after the affected validation command passed.

### Files Modified

- `.opencode/agent/{migration-task-designer.md,migration-implementer.md,migration-reviewer.md`
- `core/ui-react/scripts/{validate-migration.mjs,validate-migration.test.mjs}`
- `docs/frontend-migration/{README.md,CONTEXT.md,FEATURES.yaml,STATUS.md}`, `docs/frontend-migration/decisions/ADR-0004-testing-and-parity.md`, `docs/frontend-migration/tasks/README.md`, and `docs/frontend-migration/templates/{task.md,handoff.md,review.md}`
- `docs/frontend-migration/tasks/FM-026-visual-parity-foundation.md`
- `tests/system/tests/visualEvidence.ts`
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`. Pre-existing untracked ADR-0006 and FM-027/FM-028 packets were preserved and not changed.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: `TypeScript 5.8.3`, invoked through `npx`

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `node --test scripts/validate-migration.test.mjs && npm run validate:migration && npm run format:check` | Passed: 8 validation tests, registry validation, and Prettier check passed. |
| `core/ui-react` | `node --test scripts/validate-migration.test.mjs && npm run validate:migration && npm run format:check` | Affected by the review-finding correction; passed: 10 validation tests, registry validation, and Prettier check passed. |
| `core/ui-react` | `node --test scripts/validate-migration.test.mjs && npm run validate:migration && npm run format:check` | Affected by the second review-finding correction because `validate-migration.test.mjs` changed; passed: 11 validation tests, registry validation, and Prettier check passed. |
| `core/ui-react` | `npm run validate:migration` | Passed after the lifecycle documentation update: task/status registry reconciliation remains valid. |
| `tests/system` | `npx tsc --noEmit` | Passed in the verification-only fixer cycle after independently accepted FM-029 resolved the prior external `results.spec.ts` type error. No TypeScript diagnostics or emitted files. |
| repository root | `git diff --check && git status --short` | Passed: no whitespace errors; inspected status and confirmed no product source, generated bundle, snapshot, or evidence artifact changed. |

### Verification Basis

- Baseline: `5a2eddca72abd60f331d268a10bd900a6204434f`.
- Command coverage: `node --test ... && npm run validate:migration && npm run format:check`: `core/ui-react/scripts/validate-migration.mjs`, `core/ui-react/scripts/validate-migration.test.mjs`, and `docs/frontend-migration/FEATURES.yaml`. `npx tsc --noEmit`: `tests/system/tests/visualEvidence.ts`. `git diff --check && git status --short`: no implementation/test file coverage.
- File-content manifest:
   - `core/ui-react/scripts/validate-migration.mjs: 92abf2bf7bdf5ef927305e761e7e4372b1fb30f4fc7d775d9d0dcbbfdc84627f`
   - `core/ui-react/scripts/validate-migration.test.mjs: eb68a32361bd6439d40fcb1dcd747ab753ca74c822e04e2033724e71720598d7`
  - `docs/frontend-migration/FEATURES.yaml: c7546c45fb90c6d735b3ba5ac3e54134e73c9ed725059da950a674fab1d2fce7`
  - `tests/system/tests/visualEvidence.ts: 0d93c1b2c5daf061179723e5efe0799ef8e57e6f971ed1270ab7c84945691982`
- Completed after the last change to each command's listed files: yes.
- Verification-basis reconciliation (verification-only fixer cycle): `npx tsc --noEmit` was affected by the required rerun after FM-029 corrected its formerly blocking external system-test input; it passed against the unchanged `visualEvidence.ts` manifest above. The `core/ui-react` validation/format command and its standalone validation rerun are reusable: every task-owned implementation/test file they cover remains byte-identical to the manifest above. `git diff --check && git status --short` is affected by this task packet and `STATUS.md` lifecycle/handoff update and was rerun after that update.
- Task-owned changes after the original verification: documentation/lifecycle-only `STATUS.md` and this task packet.
- Verification-basis reconciliation (review-finding correction): the combined `core/ui-react` validation/format command is affected because both listed validator scripts changed and was rerun successfully. `npx tsc --noEmit` is reusable because its sole task-owned covered file, `tests/system/tests/visualEvidence.ts`, is byte-identical to the manifest above. `git diff --check && git status --short` is affected by the validator/test correction and lifecycle/handoff update and was rerun after them.
- Task-owned changes after the review-finding correction verification: None.
- Verification-basis reconciliation (second review-finding correction): the combined `core/ui-react` validation/format command is affected because `core/ui-react/scripts/validate-migration.test.mjs` changed; it was rerun successfully against the manifest above. `npx tsc --noEmit` is reusable because its sole task-owned covered file, `tests/system/tests/visualEvidence.ts`, is byte-identical to the manifest above. `git diff --check && git status --short` is affected by the test and this handoff update and was rerun after them.
- Task-owned changes after the second review-finding correction verification: this task packet only (handoff/lifecycle documentation); the covered validator and test files are unchanged after the combined command.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- ADR-0004 and accepted ADR-0006: visual records preserve semantic parity independently of behavioral/accessibility gates; only explicit human metadata can accept a baseline or variance.
- `ADR REQUIRED` proposal triggered during this task: None.

### Assumptions

- All 40 current `FEATURES.yaml` records are user-facing and therefore applicable. Each is honestly initialized as `unassessed`; no React implementation evidence is required until a record is proposed.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `FEATURES.yaml`: added `visual` to all 40 feature records: `applicability: applicable`, `status: unassessed` (40 applicable; 0 non-applicable; 0 proposed; 0 accepted). Behavioral `parity`, historical `task`, gaps, tests, target, selectors, and completion evidence remain unchanged. Added required deferred backlog ownership to `F-HISTORY-SEARCHES` without changing its historical task.
- Schema/lifecycle: `applicability` is `applicable|not_applicable`; status is `unassessed -> proposed -> accepted`. Proposed/accepted records require `contract.states`, named integer `contract.viewports`, deterministic `contract.setup`, `contract.geometry_checks`, repository-contained `evidence`, optional narrow `snapshots`, and optional described `variances`; accepted requires `acceptance.decision`, `accepted_by`, and `accepted_on`, with every variance accepted.
- Positive validation: a new applicable/unimplemented record, deferred legacy-only record, and pre-existing behavioral record pass unassessed. Negative validation: malformed enum, proposal lacking contract, accepted record lacking human metadata, and outside-repository evidence path fail.
- Correction negative validation: an accepted variance on a proposed visual record fails; an otherwise valid accepted record with `accepted_on: 2026-02-30` fails.
- Second correction positive validation: a `not_applicable`/`unassessed` record passes without a visual contract, visual evidence, or implementation evidence.
- Playwright evidence: `visualViewports.desktop` is `1280x800`; `mobile` is `390x844`. `prepareVisualEvidence` requires deterministic setup and waits for reduced motion, disabled animation/transition, and fonts; `expectVisualGeometry` uses kebab-case regions and region/page overflow checks; optional narrow output is `test-results/visual-evidence/F-.../<region>.png`.
- No visual baseline or variance was accepted, no screenshot/image was created, and no product layout changed. `COMPONENTS.yaml` and `APIS.yaml` have no linked records and remain unchanged.

### Follow-Up Work

- No further implementation follow-up. This workflow-only task requests no human visual acceptance; it has returned to fresh review after the second review-finding correction.
