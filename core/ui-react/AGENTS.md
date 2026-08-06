# React Frontend Agent Instructions

These instructions apply to files under `core/ui-react` and supplement `/AGENTS.md`.

## Required Context

Before implementation, read:

1. `/docs/frontend-migration/README.md`
2. Your assigned `/docs/frontend-migration/tasks/FM-*.md`
3. The ADRs and registry records linked by that task

Do not infer migration requirements from conversation history. The linked files are mandatory starting points, not a restriction on repository reads. `Files Allowed To Modify` in the task is the write boundary.

## Boundaries

- Use React, TypeScript, Vite, MUI, TanStack Router/Query/Table, React Hook Form, and Zod as recorded in `ADR-0002`.
- MUI is the only general visual component system.
- Do not add Bootstrap, Tailwind, another component suite, another router, or another server-state library without an ADR.
- Search and configuration domain behavior must remain explicit application code.
- Do not create a shared component, API wrapper, or storage abstraction without checking and updating the appropriate registry.
- Prefer direct MUI usage over trivial wrappers.
- Do not hardcode root-relative application, API, asset, login, logout, or WebSocket URLs.
- Preserve stable legacy `data-testid` values when behavior is equivalent.
- Keep backend DTO data separate from UI state.
- Never edit generated API types or production bundles manually.

## Dependencies And Toolchain

- Follow the runtime and development dependency policy in `/docs/frontend-migration/README.md`.
- Use `dependencies` only for packages required by the shipped browser application. Build, lint, formatting, test, validation, and code-generation packages belong in `devDependencies`.
- Treat the versions declared by the project as authoritative. Do not downgrade dependencies or weaken configuration for an older locally installed Node or npm.
- Record dependency decisions and actual Node/npm versions in the structured handoff.

## Code Quality

- Use strict TypeScript and avoid `any`; validate untrusted runtime data at boundaries.
- Keep feature code inside its feature directory unless the task explicitly owns a registered shared abstraction.
- Use TanStack Query for server state and ordinary React state or reducers for local UI/domain state. Do not introduce a global store by default.
- Use React Hook Form for editable forms; do not duplicate form values into parallel component state without a documented reason.
- Use semantic elements and preserve visible keyboard focus.
- Add comments only for non-obvious domain constraints.

## Verification

Run the exact focused and project-wide commands listed by the task. Do not weaken or suppress checks. Use the structured handoff template, record each command and result, and confirm only allowed files were modified. An implementation is
handed off as `review`, not `done`.
