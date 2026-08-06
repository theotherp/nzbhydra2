# FM-006: UI Foundation

Status: planned Owner:
Feature IDs: F-PLATFORM-SHELL Component IDs: C-APP-SHELL, C-DIALOG-SERVICE, C-TOAST-SERVICE API IDs: none Depends on: FM-001, FM-002, FM-004 Blocks: FM-008

## Outcome

Establish the MUI theme, responsive shell, navigation model, dialog convention, toast convention, loading convention, and visible focus baseline.

## Files Allowed To Modify

- `core/ui-react/src/app/**`
- `core/ui-react/src/components/dialogs/**`
- `core/ui-react/src/components/toasts/**`
- Theme and focused tests
- Relevant component registry records
- `docs/frontend-migration/STATUS.md`
- This task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Feature pages or feature-specific components
- Recreating the Bootstrap theme pixel for pixel
- Adding a second styling or component framework

## Context To Read

- `ADR-0002` and `ADR-0004`
- Legacy header, theme entry points, modal services, growl configuration, and dyschromatopsia theme

## Acceptance

- One tokenized theme supports light, dark, automatic, and dyschromatopsia requirements or records an explicit staged plan.
- Navigation is data-driven, permission-aware, responsive, and canonical-route based.
- Dialogs have accessible titles, focus trapping/restoration, Escape behavior, and typed results.
- Toast severity and lifetime are centralized.
- Keyboard focus remains visible.
- Shared abstractions exist only where Hydra behavior exceeds direct MUI usage.

## Verification

- React quality commands
- Focused component and accessibility tests
- Manual desktop and mobile review in the React shell

## Handoff

Record public component APIs, theme decisions, accessibility evidence, and deferred visual parity. Mark this task `review` when complete.
