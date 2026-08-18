## Handoff

### Outcome

- Concise description of the completed behavior or framework result.

### Files Modified

- List task-owned files or concise path groups.
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`.

### Toolchain

- Node: `version` or `not used`
- Package manager: `name version` or `not used`
- Other material tools: `name version` or `none`

### Verification Evidence

| Working directory | Command         | Result                                           |
|-------------------|-----------------|--------------------------------------------------|
| `path`            | `exact command` | Passed, failed, or blocked with concise evidence |

### Verification Basis

- Baseline: `Git revision supplied for this task`.
- Command coverage: for each verification command, list the task-owned implementation and test files whose contents affect its evidence. Exclude task-packet and lifecycle documentation-only edits.
- File-content manifest: a `path: SHA-256` entry for every file listed in command coverage, or `None` when no implementation or test file was involved. Include `deleted` for a verified deletion.
- Completed after the last change to each command's listed files: `yes` or `no`, with the affected command rerun when `no`.
- Task-owned changes after verification: `None` or documentation/lifecycle-only paths. Explain any other path and identify its rerun evidence.

### Dependency Decisions

- Runtime dependencies added, removed, or changed with justification, or `None`.
- Development dependencies added, removed, or changed with justification, or `None`.

### Architecture Decisions

- Accepted ADRs followed and their task-specific application, or `None`.
- `ADR REQUIRED` proposal triggered during this task, with its ID and blocking/acceptance status, or `None`.

### Assumptions

- Material assumptions made from repository evidence, or `None`.

### Temporary Exceptions And Debt

- Workaround, reason, impact, removal condition, and tracking reference, or `None`.

### Registry And Documentation Updates

- IDs or shared guidance updated, or `None`.
- For every linked `FEATURES.yaml`, `COMPONENTS.yaml`, and `APIS.yaml` record: state whether target, tests, state, task owner, gaps, selector contracts, and backlog ownership were updated or intentionally unchanged.
- For ADR-0006 visual records: state applicability, lifecycle transition, scoped states/viewports/geometry, evidence and optional snapshots, variance disposition, and `human acceptance pending` unless an explicit human decision is recorded. Confirm no behavioral or accessibility gate was implied by visual evidence.

### Follow-Up Work

- Bounded proposals not required for this task, or `None`.
- Label each one either a **maintenance candidate for `/fm-quickfix`** (mechanically repairable, no behavioral surface, or a single-module bug a regression test could cover) or a **proposed task packet** (contract, registry record,
  selector, user-observable capability, or ADR). Do not propose a packet for a defect a quickfix could discharge.
