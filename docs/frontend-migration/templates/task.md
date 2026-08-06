# FM-NNN: Short Outcome

Status: planned Owner:
Feature IDs:
Component IDs:
API IDs:
Depends on:
Blocks:

## Outcome

One externally observable or architecturally complete result.

## Files Allowed To Modify

- Exact files or narrow path globs
- This task packet
- Explicit linked registry records

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- Explicit exclusions

## Context To Read

- Required ADR IDs
- Required context sections or registry IDs
- Legacy sources necessary for parity

## Acceptance

- Testable behavior and architecture requirements
- Include repository-wide reconciliation when completeness or parity is required

## Verification

- Prerequisites and required service state
- Working directory: `/absolute/or/repository-relative/path`
- `exact command` - expected successful outcome
- Confirm task-owned changed files are all listed under Files Allowed To Modify
- Confirm verification leaves no unexpected generated or modified files

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds.
