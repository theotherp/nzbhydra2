# FM-043: Shell Theme, Typography, And Density Foundation

Status: planned Owner: Feature IDs: F-PLATFORM-SHELL Component IDs: C-APP-SHELL API IDs: None Depends on: None Blocks: FM-044, FM-045

## Dependency Notes

First packet of the ADR-0009 full-mock-fidelity batch, and the only dependency-free one: `core/ui-react/src/app/theme.ts` (`createHydraTheme()`) is the sole implementation of palette/typography/density tokens and
`core/ui-react/src/app/AppShell.tsx` is the single shared layout every route renders through, so every later packet in this batch (the search form, the results sidebar/toolbar/table) consumes whatever this task lands rather than
inventing its own colors. It blocks FM-044 (search form restyle) and FM-045 (results filter-surface consolidation), the two packets that can proceed independently of each other once this one is done, because both need real palette and
typography tokens to restyle against rather than guessing at values this task is authoritative for. This task does not touch any route's own feature code — only the shell and the theme.

## Outcome

The shared shell (`AppBar`, nav, footer) and every route's default MUI look now render the mock's `oklch` teal/cyan palette, amber/green semantic accents, self-hosted IBM Plex Sans/Mono typography, and its denser default component
sizing, instead of ADR-0007's legacy-grey/green tokens — visible everywhere immediately, since the shell is shared, per ADR-0009's disclosed shell-first rollout seam.

## Boundary Rationale

A token-layer change is one architecturally complete result: the palette, the typography, and the density tokens all live in the same `createHydraTheme()` function and change together, and none of them is independently reviewable
from the others since MUI's `theme` API composes them into one object every component reads. It is separate from every other packet in this batch because those packets restyle specific feature regions (the search form, the results
sidebar/toolbar/table) using the tokens this task defines; splitting a token definition from its first consumer would leave an unreviewable, inert change. `AppShell.tsx` is included because it is the one file, besides `theme.ts`
itself, that renders shell chrome (`AppBar` background, nav) directly from theme tokens rather than through a feature-owned component, so it is the shell's own "consumer" that must be re-verified against the new palette in the same
change, matching ADR-0007's and ADR-0008's own precedent of treating shell + theme as one unit.

## Decision Dependencies

- Accepted ADRs governing this task: ADR-0002 (MUI-only presentation), ADR-0004 (testing and parity), ADR-0006 (semantic visual parity), ADR-0007 (branded theme tokens and structure being superseded here), ADR-0009 (full mock
  fidelity — palette, typography, density, superseding ADR-0008's Option B).
- Proposed or rejected ADRs blocking this task: None.

## Files Allowed To Modify

- `core/ui-react/src/app/theme.ts`, `theme.test.ts`, `AppShell.tsx`, `AppShell.test.tsx`
- `core/ui-react/src/App.tsx` — only the font-CSS import line(s) needed to load the vendored IBM Plex packages
- `core/ui-react/package.json`, `core/ui-react/package-lock.json` — only the `@fontsource/ibm-plex-sans`/`@fontsource/ibm-plex-mono` runtime dependency addition
- `tests/system/tests/smoke.spec.ts` — only `F-PLATFORM-SHELL`'s own visual-evidence block
- `docs/frontend-migration/FEATURES.yaml` — only `F-PLATFORM-SHELL`'s `visual`, `selectors`, and `tests` fields
- `docs/frontend-migration/COMPONENTS.yaml` — only `C-APP-SHELL`'s `state` field
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- Every feature route's own component-level styling (search form, results sidebar/toolbar/table, config, stats, history, system, auth) — those are later packets in this batch or, for non-search routes, explicitly deferred until
  each gets its own redesign task per ADR-0009's phased rollout
- The `dark-dyschromatopsia` accessibility variant's own override *values* (`#000000`/`#0f1113`/`#b090c8`/`#3aaccf`/`#78909c`/`#30b885`/`#f0a830`): these stay exactly as ADR-0007 set them and continue to be spread last so they still
  win over the new base palette; only confirm they still compose correctly, do not retune them
- `palette.info`/`palette.error`: the mock never renders either role, so there is no mock evidence to adopt for them. Keep ADR-0007's current hex values (`#398da5`/`#a33938`) unchanged rather than inventing unreviewed `oklch` values;
  record this as a disclosed, deliberate non-adoption in the handoff, not an oversight
- A runtime `fonts.googleapis.com`/`fonts.gstatic.com` dependency in any form: fonts must be served from this application's own build output
- Any `components.styleOverrides` scoped to a specific feature's table cells, chips, or controls (e.g. the results table's own `& td, & th` sizing) — those stay feature-local and are these later packets' work; this task's overrides
  are shell-wide, route-agnostic primitives only (`MuiButton`, `MuiPaper`, `MuiTextField`/`MuiOutlinedInput`, `MuiChip`, `MuiCssBaseline` scrollbar/focus styling)
- Adding a `mono` typography variant key to MUI's `TypographyVariants` type via module augmentation is a routine, reversible choice left to the implementer; do not treat picking a different convention (e.g. an exported font-stack
  constant) as requiring escalation

## Context To Read

- `README.md` (Visual Parity, Workflow, Registry Rules, Verification Integrity, Dependencies And Toolchain), `ADR-0002`, `ADR-0004`, `ADR-0006`, `ADR-0007`, `ADR-0008` (historical; superseded), `ADR-0009`
- `F-PLATFORM-SHELL`, `C-APP-SHELL`, and the FM-004/FM-031/FM-035 packets (prior shell/theme history)
- `core/ui-react/src/app/theme.ts`, `theme.test.ts`, `AppShell.tsx`, `AppShell.test.tsx`, `App.tsx` in full
- `/tmp/hydra mock/Awaiting responses for direction/NZBHydra Search.dc.html` — the `<helmet>` `<style>` block, the outer page `<div>`'s inline style, and the `<header>` block only, for the exact palette/typography/radius/scrollbar
  values; ignore its runtime Google Fonts `<link>` tags (font loading is out of scope as vendored, not linked)
- `tests/system/tests/smoke.spec.ts` and `tests/system/tests/visualEvidence.ts`

## Acceptance

- `createHydraTheme()`'s base (non-dyschromatopsia) palette becomes: `background.default` `"#1f2426"` (mock page background), `background.paper` `"#262c2e"` (mock header/surface tone — reused for `AppBar`, `Paper`, popovers, and table
  headers via MUI's elevation defaults), `text.primary` `"#d6dad9"` (mock body text), `text.secondary` `"#9aa2a1"` (mock muted/label text), `primary.main` `"oklch(0.75 0.1 190)"` with `primary.light`/`primary.dark` sourced from the
  mock's own hover/active variants (`"oklch(0.82 0.1 190)"` / `"oklch(0.85 0.1 190)"`), `success.main` `"oklch(0.75 0.11 150)"`, `warning.main` `"oklch(0.76 0.1 70)"`. `info.main`/`error.main` remain `"#398da5"`/`"#a33938"` unchanged
  (no mock evidence; see Out Of Scope).
- `typography.fontFamily` is `'"IBM Plex Sans", system-ui, -apple-system, sans-serif'`, sourced from `@fontsource/ibm-plex-sans` weights 400/500/600/700 (matching the mock's requested Google Fonts weights), imported as a build-time
  CSS side effect (e.g. from `App.tsx` or `theme.ts`) rather than a runtime `<link>`. A reusable IBM Plex Mono font stack (`'"IBM Plex Mono", monospace'`, weights 400/500 from `@fontsource/ibm-plex-mono`) is exposed for feature code
  to apply to numeric/tabular values, by whichever convention the implementer records (custom typography variant, exported constant, or theme augmentation).
- `typography.fontSize` stays MUI's default `14` (already matches the mock's `14px` base); no regression of existing type scale beyond the font-family swap.
- New shell-wide `components.styleOverrides`, scoped to route-agnostic primitives only (per Out Of Scope): `MuiButton` gets `textTransform: "none"` (the mock's buttons read "Search"/"Load more results", never uppercase) and a
  `borderRadius` in the mock's `8–11px` range; `MuiPaper` gets a `borderRadius` around `12px` (the mock's results-card radius) for `elevation > 0`; `MuiTextField`/`MuiOutlinedInput` get a `borderRadius` around `8–11px` (the mock's
  input/select radius); `MuiChip` gets a smaller default height and a `borderRadius` around `7px` (the mock's quality/type chip radius); `shape.borderRadius` itself is set to a value in the `8–11px` range as the new default. Every
  chosen value is cited against a specific mock pixel value in the handoff, not asserted without evidence.
- `MuiCssBaseline`'s existing `:focus-visible` override is preserved unchanged; a new scrollbar styleOverride matches the mock's thin, dark, rounded scrollbar (`width`/`height` `11px`, `border-radius: 6px`, track/thumb colors sourced
  from the mock's `<style>` block) for browsers that honor `::-webkit-scrollbar`.
- `AppShell.tsx`'s `AppBar` renders at the new `background.paper` tone (`#262c2e`), visually distinct from the page's `background.default` (`#1f2426`), without hardcoding either color directly — both flow through the theme, so a
  future palette change needs no `AppShell.tsx` edit. The existing nav active-indicator/label-color logic (`navigationItemSx`, `NavigationLabel`) is unchanged in behavior and continues to resolve to the new `primary.main`.
- `theme.test.ts` is updated to assert the new base-palette values above (replacing the ADR-0007 assertions) and to keep asserting the dyschromatopsia variant's values unchanged; `AppShell.test.tsx` is updated only if the new
  typography/palette breaks an existing assertion (e.g. a hardcoded old-palette color check) — do not rewrite passing, unrelated assertions.
- `F-PLATFORM-SHELL`'s visual contract is re-evidenced under the new theme: keep every existing geometry check from the current `proposed` contract (AppBar/nav overflow-free, horizontal alignment, active-nav-item border color, stable
  nav-item width across active state — with the color assertion updated to the new `primary.main`), and add one new state, `branded-typography-and-density`, asserting the AppBar's computed `font-family` includes `"IBM Plex Sans"` and
  that `background.default` (page, outside the AppBar) differs from the AppBar's own computed background color. Record the new IBM Plex Sans/Mono typography, the `oklch` palette, and the new density tokens as `proposed` variances
  (no legacy equivalent) rather than parity; the prior primary-green variance stays, superseded by this task's own note explaining the palette change, per ADR-0006's existing remediation mechanism (the same pattern FM-034/037/039/040
  used). Never fabricate or re-date human acceptance — this record stays `proposed`.

## Verification

- `npm ci` only if `package.json`/`package-lock.json` change (it does here, for the two `@fontsource` packages); otherwise the cheapest install that guarantees `node_modules` matches the lockfile. Record which install ran.
- Working directory `core/ui-react`: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api`, `npm run validate:migration` — each expected to pass.
- Working directory `tests/system`: `npx tsc --noEmit` — expected to pass (this task changes a spec).
- Working directory `tests/system`, after `VITE_OUT_DIR=../target/classes/static/react npm run build` from `core/ui-react`: `npx playwright test tests/smoke.spec.ts`, expected to produce the updated contract's evidence, including a
  visible font-family assertion (not merely a color check) proving the vendored fonts actually load and apply, not just that the CSS declares them. Per prior tasks' precedent this suite may require the documented
  `python3 misc/run_gui_systemtest.py --runtime local` launcher for a real backend; record whichever path is used.
- Working directory `core/ui-react`: confirm no network request to `fonts.googleapis.com`/`fonts.gstatic.com` occurs when the app loads (e.g. via a Playwright network-request assertion in the smoke run above, or an equivalent
  build-output check that no such URL is emitted) — this is the task's central "no runtime CDN dependency" claim and must be verified, not merely asserted in prose.
- Repository root: `git diff --check` — expected to produce no output.
- Confirm task-owned changed files are all listed under Files Allowed To Modify, and that no other spec's fixtures or assertions were altered.
- Confirm verification leaves no unexpected generated or modified files; the git-ignored production build under `core/target/classes/static/react` is build output, not a tracked change.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer cannot supply the human visual acceptance the affected record requires; that
remains a human decision independent of technical review, per ADR-0006.
