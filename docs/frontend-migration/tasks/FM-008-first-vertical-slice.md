# FM-008: First Vertical Slice

Status: planned Owner:
Feature IDs: selected by coordinator after FM-001 Component IDs: C-APP-SHELL, C-API-TRANSPORT API IDs: selected by coordinator after FM-001 Depends on: FM-001, FM-004, FM-005, FM-006, FM-007 Blocks: FM-009

## Outcome

Migrate one small read-oriented route, preferably About or News, through routing, permissions, API access, presentation, tests, and React/legacy comparison.

## Files Allowed To Modify

- One selected feature directory
- Its route registration and focused tests
- Only registry records named when this task is claimed
- Existing Playwright spec or one focused new spec
- `docs/frontend-migration/STATUS.md`
- This task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Search, configuration, statistics dashboards, or broad shared-component expansion
- Opportunistic migration of neighboring routes

## Context To Read

- All accepted ADRs
- Selected feature, component, and API records
- Selected legacy controller/template/service and existing tests

## Acceptance

- Coordinator fills exact IDs and allowed files before implementation begins.
- Canonical route behavior and role protection match legacy behavior.
- Loading, empty, success, and error states are intentional.
- Desktop/mobile and keyboard behavior are reviewed.
- React unit/component tests and Playwright parity coverage pass.
- No new shared abstraction is introduced without a component registry record.

## Verification

- React quality commands
- Focused Playwright parity scenario in both selected shells
- Backend focused tests if contracts change

## Handoff

Record parity evidence, screenshots only as test artifacts, verification, and architecture lessons that affect later task packets. Mark this task `review` when complete.
