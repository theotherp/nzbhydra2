# FM-006: UI Foundation

Status: done Owner: OpenCode
Feature IDs: F-PLATFORM-SHELL Component IDs: C-APP-SHELL, C-DIALOG-SERVICE, C-TOAST-SERVICE API IDs: none Depends on: FM-001, FM-002, FM-004 Blocks: FM-008

## Outcome

Establish the MUI theme, responsive shell, navigation model, dialog convention, toast convention, loading convention, and visible focus baseline.

## Files Allowed To Modify

- `core/ui-react/src/app/**`
- `core/ui-react/src/App.tsx` and `core/ui-react/src/App.test.tsx`, only for UI-foundation provider, shell, theme, and loading-convention integration
- `core/ui-react/src/components/dialogs/**`
- `core/ui-react/src/components/toasts/**`
- Theme and focused tests
- `core/ui-react/src/api/transport.ts` and `core/ui-react/src/api/transport.test.ts`, only for output produced by the repository's configured Prettier; no semantic production or test-behavior changes
- Relevant component registry records
- `docs/frontend-migration/STATUS.md`
- This task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Feature pages or feature-specific components
- Feature-specific loading orchestration, skeleton layouts, and empty or error states; FM-008 or the owning feature task defines those states
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
- The application-level loading convention is an indeterminate MUI progress indicator accompanied by visible `Loading…` text in a `role="status"` live region; a focused App/component test renders it and verifies the progressbar, status region, and visible text. It does not introduce global loading state or route/query behavior.
- Keyboard focus remains visible.
- Shared abstractions exist only where Hydra behavior exceeds direct MUI usage.

## Verification

- React quality commands
- Focused component and accessibility tests; `npm run test -- --run` must include a loading-convention test that fails if its progressbar, visible text, or status semantics are removed
- Manual desktop and mobile review in the React shell

## Handoff

### Outcome

- Implemented the tokenized MUI theme, responsive permission-aware shell, typed confirmation dialog provider, and centralized toast provider.
- Added the bounded App loading convention: an indeterminate MUI progress indicator and visible `Loading…` text inside a `role="status"` region. The optional App input selects this presentation only; it creates no global loading state or route/query behavior.
- Applied configured Prettier output only to the approved `transport` files; the reviewed diff contains only quote-style and empty-class-body formatting changes.

### Files Modified

- `core/ui-react/src/App.tsx`, `core/ui-react/src/App.test.tsx`, `core/ui-react/src/app/**`, and `core/ui-react/src/components/{dialogs,toasts}/**`.
- `core/ui-react/src/api/{transport.ts,transport.test.ts}` (Prettier-only exception), `docs/frontend-migration/{COMPONENTS,STATUS}.yaml`, and this task packet.
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`.

### Public APIs And Theme Decisions

- `DialogProvider` provides the `useDialogs().confirm(Confirmation): Promise<"confirmed" | "cancelled">` API. MUI supplies modal focus trapping and focus restoration; the dialog has an accessible title and Escape/backdrop cancellation.
- `ToastProvider` provides `useToasts().showToast({message, severity})`; severity is the `success`, `info`, `warning`, or `error` union and the centralized lifetime is 5000 ms at bottom-right, matching the legacy growl convention.
- `createHydraTheme` supports `light`, `dark`, `auto` (system preference), and `dark-dyschromatopsia`. The dyschromatopsia palette preserves the legacy dark-dyschromatopsia background and paper values; its error color is the legacy danger-message value, while its info, success, and warning colors are legacy pie-chart values. Its primary color is a new MUI value, so MUI severity colors are not a direct mapping of legacy `@brand-*` values. CSS baseline provides a visible `:focus-visible` outline.
- The shell data model preserves legacy permission logic and canonical base-relative routes. The migration placeholder remains until feature routes are implemented.

### Toolchain

- Node: `v26.6.0`
- Package manager: `npm 11.18.0`
- Other material tools: `Prettier 3.7.4`, `Vite 7.3.6`, `Vitest 4.1.6`.

### Verification Evidence

| Working directory | Command | Result |
|-------------------|---------|--------|
| `core/ui-react` | `npx prettier --write src/api/transport.ts src/api/transport.test.ts` | Passed; reviewed output is formatting-only. |
| `core/ui-react` | `npm run typecheck` | Passed. |
| `core/ui-react` | `npm run lint` | Passed. |
| `core/ui-react` | `npx prettier --write src/App.tsx src/App.test.tsx` | Passed. |
| `core/ui-react` | `npm run format:check` | Passed: all matched files use Prettier code style. |
| `core/ui-react` | `npm run test -- --run` | Passed: 8 files, 19 tests, including the focused loading-convention accessibility test. |
| `core/ui-react` | `npm run build` | Passed; Vite built production assets. |
| `core/ui-react` | `npm run validate:migration` | Passed. |
| `core/ui-react` | `npx prettier --check src/api/transport.ts src/api/transport.test.ts` | Passed. |
| repository root | `git diff --check` | Passed. |

### Accessibility Evidence

- Focused tests verify the confirmation dialog has the MUI dialog role and accessible title, returns its typed result, and the toast exposes an alert with severity content.
- The focused App test verifies the loading convention's `status` region, indeterminate MUI `progressbar`, and visible `Loading…` text.
- Theme tests verify automatic light/dark resolution and the dyschromatopsia palette. The MUI CSS baseline defines visible keyboard focus.
- Manual React-shell review passed with an anonymous unrestricted bootstrap: desktop (945 px) showed the canonical Search, History & Stats, Config, and System links plus placeholder and footer; mobile (390 px) hid the desktop links, exposed Open navigation, and opened a drawer containing the same canonical links. The only browser console error was the Vite development server's missing `/favicon.ico` (404).

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: None.

### Assumptions

- The React shell consumes the existing FM-004 bootstrap fields. Persisting a user-selected theme remains configuration work and is not introduced as a second client-state mechanism in this foundation task.

### Temporary Exceptions And Debt

- None.

### Unresolved Review Finding

- None.

### Registry And Documentation Updates

- `C-APP-SHELL`, `C-DIALOG-SERVICE`, and `C-TOAST-SERVICE` remain `partial`, accurately reflecting the foundation-only scope; independent review passed and task status is `done`.

### Follow-Up Work

- None.
