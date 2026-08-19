# React Frontend Agent Instructions

These instructions apply to files under `core/ui-react` and supplement `/AGENTS.md`.

## Required Context

Before implementation, read:

1. `/docs/frontend-migration/README.md`
2. `/docs/frontend-migration/DECISIONS.md` (at minimum ADR-0002, ADR-0014, ADR-0015)
3. For packet work: your assigned `/docs/frontend-migration/tasks/FM-*.md` and the registry records it links

Do not infer migration requirements from conversation history. `Files Allowed To Modify` in a task is the write boundary; reads
are unrestricted.

## Boundaries

- Use React, TypeScript, Vite, MUI, TanStack Router/Query/Table, React Hook Form, and Zod as recorded in `ADR-0002`.
- MUI is the only general visual component system. Do not add Bootstrap, Tailwind, another component suite, another router, or
  another server-state library without a new decision entry.
- Search and configuration domain behavior must remain explicit application code.
- Do not create a shared component, API wrapper, or storage abstraction without checking and updating the appropriate registry.
- Prefer direct MUI usage over trivial wrappers.
- Do not hardcode root-relative application, API, asset, login, logout, or WebSocket URLs.
- Preserve stable legacy `data-testid` values when behavior is equivalent.
- Keep backend DTO data separate from UI state. Never edit generated API types or production bundles manually.

## UI Conventions (ADR-0014 / ADR-0015)

The design language (palette, typography, density, radii, surface colors) lives in `src/app/theme.ts` — as palette tokens and
component `styleOverrides`/`defaultProps`. Feature code uses standard components and gets the look from the theme.

- **Standard component for a standard need.** A dropdown is `<TextField select>` (or `Select` with `InputLabel`); a text input
  is `TextField`; never hand-assemble controls from `InputBase`/`Box`. `InputBase` is not imported outside `src/components`.
- **Every input has a visible label.** Compact controls that genuinely cannot carry one keep an `aria-label`, but a visually
  clipped/hidden label is never the default.
- **No design literals in feature code.** No `#hex`, `rgba(...)`, `oklch(...)`, font families, or bespoke radii outside
  `theme.ts`. Consume `palette.*` (including `palette.surfaces.*`) and theme shape/typography. No per-feature `*Styles.ts`
  token files.
- **Never restyle component internals.** Do not touch `.MuiOutlinedInput-notchedOutline`, clip labels, suppress borders, set
  `disableRipple`, or author `outline`/`:focus-visible` styles in feature `sx`. Focus indication comes from the theme
  (ADR-0013/0015). If a component looks wrong, fix the theme so every instance is fixed.
- **Density via the theme**, not per-instance font sizes/paddings (`MuiTextField` defaults to `size="small"`, etc.).
- **Deviation from stock MUI requires a written justification comment at the site.** Deviation from the mock's pixels requires
  nothing.

`npm run validate:focus-affordances` enforces the mechanical parts; the reviewer enforces the rest.

**Working from a mock.** A mock (like `uimock/NZBHydra Search.dc.html`) is a source for _tokens_ and _structure_, never a
styling target to transliterate. First extract what it defines into `theme.ts` (palette, surfaces, radii, fonts, density,
component defaults); then build the page structure it shows with stock components that inherit that look. Never copy a mock's
inline CSS into `sx`, and never sacrifice a component's built-in anatomy (label, border, focus state) to match a mock pixel —
mocks are usually hand-written HTML that omits states (this one declares `outline:none` 15 times and authors no focus style).
When the owner asks for a visual change, realize it as a token or structure change so it applies everywhere, and iterate by
screenshotting the running app against the mock rather than by matching CSS text.

## Dependencies And Toolchain

- Runtime `dependencies` only for packages the shipped browser application requires; build/lint/test/codegen packages belong in
  `devDependencies`. A new competing framework needs a decision entry; narrow dev tooling does not.
- Treat the versions declared by the project as authoritative. Do not downgrade dependencies or weaken configuration for an
  older locally installed Node or npm. Record actual Node/npm versions used for verification.

## Code Quality

- Strict TypeScript, no `any`; validate untrusted runtime data at boundaries.
- Keep feature code inside its feature directory unless the task owns a registered shared abstraction.
- TanStack Query for server state; ordinary React state or reducers for local UI state. No global store by default.
- React Hook Form for editable forms; do not duplicate form values into parallel component state without a documented reason.
- Use semantic elements. Add comments only for non-obvious domain constraints.

## Verification

Run the gates relevant to the change (`npm run test`, `typecheck`, `lint`, `format:check`, `build`, `validate:migration`,
`validate:focus-affordances`; system Playwright when behavior or rendering changed). Do not weaken or suppress checks. Record
each command and result. Packet work uses the handoff template and is handed off as `review`, not `done`; single-session fixes
append a `MAINTENANCE.md` entry instead.
