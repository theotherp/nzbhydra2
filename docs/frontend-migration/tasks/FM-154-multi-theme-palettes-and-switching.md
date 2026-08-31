# FM-154: Multi-Theme Palettes And In-Session Theme Switching

Status: planned Owner:
Feature IDs: F-PLATFORM-SHELL
Component IDs: C-APP-SHELL
API IDs: None
Depends on: None
Blocks: FM-155

## Outcome

ADR-0049's theme half: `theme.ts` is consolidated so each theme's complete color set is one named block, four concrete themes
exist — grey (default; today's mock palette verbatim), bright, dark, dark-dyschromatopsia — plus `auto` (system light →
bright, system dark → grey), and a nav-bar selector beside the login/logout control applies a choice immediately for the
session. Persistence is FM-155's; the selector ships here because the Visual Gate needs a way to reach each theme, and it
forces the App-level theme-state restructuring to happen once instead of twice.

## Decision Dependencies

ADR-0049; ADR-0014 (tokens live in theme.ts); ADR-0013/0015 (focus indication stays theme-authored).

## Files Allowed To Modify

- core/ui-react/src/app/{theme.ts,theme.test.ts,AppShell.tsx,AppShell.test.tsx} (create theme.test.ts if absent)
- core/ui-react/src/App.tsx and its test; a new theme-preference context module under core/ui-react/src/app/
- Any `core/ui-react/src/**/*.test.ts(x)` — ONLY to change a `createHydraTheme("dark")` argument so the test keeps rendering
  today's palette (now `grey`/the default); no other test edit under this bullet
- tests/system/tests/*.spec.ts (only additions asserting the selector and captures)
- This task packet, docs/frontend-migration/FEATURES.yaml and COMPONENTS.yaml (linked records only)

## Out Of Scope

- Persistence (server or localStorage), the config-UI Theme dropdown, and any Java change — all FM-155 or ADR-0049-excluded.
- Non-color tokens: typography, spacing, radii, sizes, breakpoints, focus-ring geometry stay single and shared.

## Context To Read

- `theme.ts:115-130` (ThemePreference/resolveThemeMode), `:279-340` (mockPalette/mockSurfaces), `:360-386` (inputOutline,
  chart colors, contrast texts), `:476-560` (createHydraTheme + dyschromatopsia override block)
- `App.tsx:54-88` (ThemeProvider hard-codes "dark", sits outside SafeConfigProvider), `AppShell.tsx:128-160` (top bar)
- Legacy character sources: `git show master:core/ui-src/less/themes/{vars-grey.less,theme-bright.less,theme-dark.less,theme-dark-dyschromatopsia.less}`

## Acceptance

- `ThemePreference` becomes `"auto" | "grey" | "bright" | "dark" | "dark-dyschromatopsia"`; `createHydraTheme()` defaults to
  `grey`; a resolver maps `auto` + `prefers-color-scheme` to bright (light) / grey (dark). Each concrete theme's full color
  set (backgrounds, text, role colors + contrastText, surfaces, inputOutline, scrollbar, chart categorical sequence) is one
  named block; `createHydraTheme` and every component styleOverride consume only the active block — grep proves no color
  literal outside the blocks (the ADR-0013 focus ring keys off the block's primary).
- Grey is today's palette byte-for-byte; a unit test pins that `createHydraTheme()` yields today's palette values, and
  dark-dyschromatopsia's effective palette (base + today's `:539-559` overrides merged into its own complete block) is
  unchanged. Bright: white/near-white background, dark text, green primary in the legacy `#00640e`/`rgb(6,161,40)` family
  adapted for WCAG 1.4.3/1.4.11 on the light ground, MUI `mode: "light"`. Dark: near-black `rgb(0,0,0)`-family background
  with slightly lifted paper, muted light text (legacy `rgb(156,156,156)` character). Colors may be improved; character
  retention per ADR-0049 is judged by the owner on the strip.
- A theme-preference context owns the preference (default `grey`), re-creates the theme on change, and reacts to
  `prefers-color-scheme` changes while `auto` is selected; `App.tsx`'s `ThemeProvider` consumes it (provider order may be
  restructured; document why in the diff).
- The selector sits in the `AppShell` top bar next to `LoginOutButton`: stock MUI, accessible name, shows the current choice,
  offers Auto/Grey/Bright/Dark/Dark (Dyschromatopsia), applies on selection with no reload; keyboard operable with visible
  focus. New testids recorded in F-PLATFORM-SHELL selectors.
- Screenshot strip (Visual Gate): 1280x800 search-results and one config page in grey, bright, dark, dark-dyschromatopsia
  (grey pair proving no default drift), the open selector, and one 390x844 capture of the selector on mobile.

## Verification

- core/ui-react: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run knip`,
  `npm run validate:migration`, `npm run validate:focus-affordances` — all green
- tests/system: `npx playwright test tests/search.spec.ts tests/results.spec.ts tests/focus-indication.spec.ts
  tests/notched-label-geometry.spec.ts` against a real backend — green (default theme unchanged means no assertion drift)
- Confirm changed files match `Files Allowed To Modify`; test-file diffs outside app/ touch only `createHydraTheme` arguments

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks `review`; a fresh reviewer fills `../templates/review.md`; only the
coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — app-wide token architecture, parity reconstruction from legacy LESS, a light mode the codebase has
  never rendered, and provider restructuring.
- Reviewer: `opus` — at least the implementer's tier; must independently verify grey/dyschromatopsia palette invariance.
- Fixer: `opus` — findings will be judgment-bearing (contrast, block completeness), not mechanical.

Implementer prompt: Inventory every color literal in `theme.ts` outside `mockPalette`/`mockSurfaces` first — hairlines,
`inputOutline`, contrast texts and scrollbar are what a light theme silently breaks on. Prove grey's palette deep-equals the
baseline before authoring any new theme. Beware the 27 test files passing `createHydraTheme("dark")`: the value stays valid
but changes meaning.
Reviewer prompt: Diff grey's and dark-dyschromatopsia's resolved palettes against a baseline checkout yourself; then hunt
the bright captures for dark-theme remnants (white hairlines, contrast texts, chart colors) — the likeliest defect class.
