# FM-004: React Shell Selector

Status: ready Owner:
Feature IDs: F-PLATFORM-SHELL Component IDs: C-APP-SHELL API IDs: API-BOOTSTRAP-INITIAL Depends on: FM-001, FM-002 Blocks: FM-005, FM-006, FM-008, FM-009

## Outcome

Serve a minimal React shell on canonical application URLs when explicitly selected, while retaining the legacy shell as the default.

## Files Allowed To Modify

- React application bootstrap and migration-placeholder files
- Spring shell controller/configuration and focused tests
- New React Thymeleaf template
- Build integration needed to place React output under `static/react/`
- Relevant feature, component, and API registry records
- `docs/frontend-migration/STATUS.md`
- This task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Full navigation or visual design
- API transport beyond consuming initial bootstrap data
- Migrated feature pages
- Removal or modification of legacy behavior

## Context To Read

- `ADR-0001` and `ADR-0004`
- `CONTEXT.md` runtime and packaging sections
- `MainWeb`, `WebConfiguration`, `SecurityConfig`, and the legacy `index.html`

## Acceptance

- Temporary React and legacy selectors use a documented cookie and safe redirect behavior.
- Canonical route URLs render the selected shell without weakening role protection.
- React receives typed bootstrap data and honors configured URL bases.
- Unimplemented routes render a placeholder with a working legacy switch.
- AngularJS and React are never mounted in the same document.
- Focused Spring and browser tests cover default, selected, deep-link, and non-root-base behavior.

## Verification

- React quality commands
- IntelliJ project build and focused Spring tests
- Focused Playwright shell-selection scenario

## Handoff

Record selector semantics, changed mappings, packaging assumptions, and verification. Mark this task `review` when complete.
