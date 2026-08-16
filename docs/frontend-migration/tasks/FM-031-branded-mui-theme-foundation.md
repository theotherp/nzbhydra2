# FM-031: Branded MUI Theme Foundation

Status: done Owner: Claude Sonnet 5
Feature IDs: F-PLATFORM-SHELL
Component IDs: C-APP-SHELL
API IDs: None
Depends on: FM-026
Blocks: FM-027

## Dependency Notes

FM-026 supplies the ADR-0006 visual-registry schema and the deterministic Playwright evidence helper (`prepareVisualEvidence`/`expectVisualGeometry`) this task's evidence must use; FM-026 is `done`, so this dependency is satisfied and the task starts `ready`.

This task blocks FM-027's remaining step. FM-027 (`docs/frontend-migration/tasks/FM-027-search-workspace-visual-parity.md`) is `review` with a proposed-but-not-yet-human-accepted visual baseline captured against the unbranded stock MUI theme; per ADR-0007's Consequences, that baseline must be re-evidenced (new screenshots) against the branded theme before a human may accept it. This task does not itself re-evidence FM-027: re-capturing FM-027's proposed baseline and updating its linked `F-SEARCH-FORM`/`F-SEARCH-MEDIA`/`F-SEARCH-INDEXERS`/`F-SEARCH-RECENT` visual records remains FM-027's own follow-up (a tightly-scoped continuation of that existing task, not new scope here). This task's own Verification instead runs FM-027's existing Playwright visual-evidence assertions in `tests/system/tests/search.spec.ts` unmodified, as a smoke check that they still geometrically pass against the new theme — proving the new theme does not break FM-027's layout contract without claiming to have re-evidenced or re-proposed FM-027's baseline itself.

## Outcome

The React app shell renders with legacy's branded default "grey" theme (dark background/text/semantic palette sourced from `core/ui-src/less/themes/vars-grey.less`, logo-green MUI `primary`), a horizontally-aligned desktop navigation bar (fixing the current vertical-stacking flex bug), and the NZBHydra logo in the `AppBar`, replacing the current unbranded stock-MUI look, per ADR-0007 Option A.

## Boundary Rationale

The palette, the nav-layout bug fix, and the logo integration are one shell-level rendering defect: ADR-0007 traces all three to the same root cause (the app shell was never designed) and its accepted Option A requires landing them together so shared shell files (`theme.ts`, `AppShell.tsx`, `App.tsx`) are touched once rather than being reopened piecemeal. This is a genuine dependency boundary, not a source-file split: every current and future screen renders through this shell, so an implementation that fixed only the palette or only the nav bug would leave the other half of the same defect for a near-immediate follow-up task touching the same files. Route-level visual-parity work (FM-027, FM-028, and later) is a separate, independent product boundary — measuring and adjusting individual screens' own internal layout — and stays out of this task; this task changes no route's category catalogs, search behavior, selectors, or API contracts.

## Decision Dependencies

- Accepted: ADR-0001, ADR-0002, ADR-0004, ADR-0006, ADR-0007.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/app/theme.ts`
- `core/ui-react/src/app/theme.test.ts`
- `core/ui-react/src/app/AppShell.tsx`
- `core/ui-react/src/app/AppShell.test.tsx`
- `core/ui-react/src/App.tsx`
- A new legacy-sourced logo asset file under `core/ui-react/src/assets/` or `core/ui-react/public/` (copied unmodified from `core/ui-src/img/logo.png`; choose whichever location matches this project's established Vite static-asset convention — there is no prior precedent in `core/ui-react`, so pick the standard Vite idiom and document the choice in the handoff)
- `tests/system/tests/smoke.spec.ts` (the registered test file for `F-PLATFORM-SHELL`)
- Only the `visual` subrecord of `F-PLATFORM-SHELL` and the `state`/`task`/`backlog` fields of `C-APP-SHELL` in `docs/frontend-migration/{FEATURES.yaml,COMPONENTS.yaml}`
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope (for example, a route-level file needing a palette-driven visual adjustment beyond the shell itself), stop and escalate with the exact file and reason rather than broadening this task's allowlist.

## Out Of Scope

- Multi-theme switching or a user-facing theme-preference UI (legacy's bright/near-black alternate themes beyond the existing `dark-dyschromatopsia` accessibility variant); explicitly deferred by ADR-0007 as a candidate future task
- Any route-level visual-parity work: FM-027's actual re-evidencing/baseline update, FM-028, and all later per-screen visual tasks remain separate
- Recreating legacy Bootstrap pixels exactly; category catalogs, search behavior, selectors, domain/request logic, or any API/transport contract change
- Removing, replacing, or changing the intent of the existing `dark-dyschromatopsia` accessibility variant; it must continue to compose with the new base palette
- Vectorizing the logo or building a new SVG wordmark; use the existing raster `logo.png` as-is

## Context To Read

- ADR-0001, ADR-0002, ADR-0004, ADR-0006, and ADR-0007 in full (ADR-0007 contains the complete evidence, accepted Option A palette mapping, and consequences this task implements)
- `docs/frontend-migration/{README.md,CONTEXT.md}`; `docs/frontend-migration/tasks/README.md`; FM-026 handoff (Playwright evidence conventions) and FM-027 handoff (current shell/theme consumption context, held visual baseline)
- Current `core/ui-react/src/app/theme.ts`, `AppShell.tsx`, `AppShell.test.tsx`, `theme.test.ts`, and `core/ui-react/src/App.tsx`
- Legacy `core/ui-src/less/themes/vars-grey.less` (and `grey.less`, which imports it) for the exact palette source values; `core/ui-src/img/logo.png` and `core/ui-src/img/favicon.svg` for brand color confirmation
- `docs/frontend-migration/{FEATURES.yaml,COMPONENTS.yaml}` records for `F-PLATFORM-SHELL` and `C-APP-SHELL`
- `tests/system/tests/visualEvidence.ts` and `tests/system/tests/smoke.spec.ts`

## Acceptance

- `core/ui-react/src/app/theme.ts`'s base (non-`dark-dyschromatopsia`) palette is sourced from `vars-grey.less`: `background.default`/`background.paper` from `@body-bg`/`@gray-darker` (~`#262c2e`) and a lighter surface variant; `text.primary`/`text.secondary` from `@text-color` (~`rgb(200,200,200)`)/a muted gray; `success`/`info`/`warning`/`error` from `@brand-success`/`@brand-info`/`@brand-warning`/`@brand-danger`; MUI `primary.main` is the logo green `#0fab4b` (the one explicitly-accepted variance from literal legacy color-for-color mapping, per ADR-0007's Human Decision).
- The default rendered theme (no explicit user preference) uses `palette.mode: "dark"` rather than following `prefers-color-scheme`. `resolveThemeMode`'s existing `"auto"` behavior may remain as a pure function, but nothing in `App.tsx`'s default `ThemeProvider` wiring resolves to light mode from OS preference alone.
- The existing `dark-dyschromatopsia` variant's overridden tokens (background `#000000`/`#0f1113`, and its `error`/`info`/`primary`/`success`/`warning` overrides) are unchanged in value and continue to take precedence over the new base palette; `theme.test.ts`'s existing dyschromatopsia assertions keep passing without weakening.
- `AppShell.tsx`'s desktop navigation renders as a horizontal bar: `ListItemButton` (or equivalent) navigation items are laid out in a row, not stacked vertically. The implementer chooses the smallest correct structural fix (for example, applying `display: flex` directly to the `List`, or making the flex row directly contain the item elements) rather than a redesign of the navigation's information architecture.
- The NZBHydra logo (`core/ui-src/img/logo.png`) is integrated into the `AppBar`, replacing or accompanying the current plain "NZBHydra2" text, with a non-empty accessible name (for example, `alt` text) for the image.
- Component tests (`AppShell.test.tsx`, `theme.test.ts`) cover: desktop-width navigation items render in a horizontal row (assert on layout-relevant DOM/style structure, not a screenshot); the logo renders with an accessible name; `dark-dyschromatopsia` still applies its own overrides on top of the new base palette; default `palette.mode` is `"dark"` when no explicit preference is supplied.
- No category catalog, search behavior, selector contract, domain/request logic, or API/transport contract changes. Existing stable `data-testid`/role selectors used by other features through `AppShell` are unchanged.
- Deterministic Playwright visual evidence (using `prepareVisualEvidence`/`expectVisualGeometry` from `tests/system/tests/visualEvidence.ts`, added to `tests/system/tests/smoke.spec.ts`) captures the branded shell at desktop (`1280x800`) and mobile (`390x844`):
  - Narrow region `page.screenshot()` captures of the `AppBar`/navigation region only (not full-page baselines, per ADR-0006), written to `test-results/visual-evidence/F-PLATFORM-SHELL/<region>.png` via `captureVisualRegion`.
  - `expectVisualGeometry` asserts the nav region and the page do not overflow horizontally at either viewport. A custom bounding-box comparison (comparing each desktop nav item's own `boundingBox()` `y` coordinate against its neighbors) asserts the items are horizontally aligned rather than vertically stacked.
- `F-PLATFORM-SHELL`'s `visual` subrecord in `FEATURES.yaml` is updated from `unassessed` to `proposed` with a scoped contract: deterministic setup, named viewports, the states/geometry checks above, the evidence path(s), and any variances (the `primary`-color variance from ADR-0007 recorded here per ADR-0006's variance-disposition process). It is not set to `accepted`; human acceptance is a separate, later decision. Behavioral `parity`, `gaps`, `task`, and `backlog` fields for `F-PLATFORM-SHELL` are otherwise unchanged by this task except where this task's own nav-bug fix narrows a gap already listed.
- `C-APP-SHELL` in `COMPONENTS.yaml` is updated to reflect this task as its most recent implementing task (`task: FM-031`) and its `backlog` rationale is narrowed to describe only what remains deferred after this task (footer branding and live-status integration), since navigation is fixed by this task; `state` remains `partial` because footer/live-status integration is still deferred.
- As a smoke check (not a re-evidencing of FM-027's own baseline), FM-027's existing Playwright visual-evidence assertions in `tests/system/tests/search.spec.ts` are run unmodified against the app under the new theme and still pass geometrically; this task does not edit `search.spec.ts` or FM-027's linked visual records.

## Verification

- In `core/ui-react`: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/smoke.spec.ts` succeeds with deterministic desktop/mobile branded-shell evidence (new narrow `AppBar`/nav region captures, horizontal-alignment and overflow geometry assertions).
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts` succeeds unmodified, confirming FM-027's existing visual-evidence assertions still pass geometrically against the new theme (smoke check only; this file is not in Files Allowed To Modify).
- Run `git diff --check`; inspect status/allowlist and confirm no route-level product source, search/results behavior, selector contract, generated bundle, or accepted visual record changed, and that only the new logo asset plus the files above changed.

## Handoff

Use `templates/handoff.md`; additionally include the concrete palette token mapping (legacy LESS source value to MUI token), the chosen static-asset convention for the logo file and why, the nav-layout fix chosen, the proposed `F-PLATFORM-SHELL` visual contract/evidence paths/variance, the `C-APP-SHELL` registry update, and explicit confirmation that FM-027's existing visual-evidence assertions still pass geometrically under the new theme (smoke check, not re-evidencing). Mark `review` only after required verification succeeds; do not self-accept the proposed visual record.

## Fresh Review

The reviewer independently audits the palette-token-to-legacy-source mapping, the nav-layout fix, logo accessibility, the `dark-dyschromatopsia` composition, the geometry/evidence assertions, the `F-PLATFORM-SHELL`/`C-APP-SHELL` registry updates, and that FM-027's smoke check truly ran unmodified and passed. After accepted technical review, the coordinator obtains explicit human acceptance or rejection of the proposed `F-PLATFORM-SHELL` baseline and its `primary`-color variance before completion; only then may FM-027's own re-evidencing follow-up proceed and, separately, its own baseline go to human acceptance.

## Handoff

### Outcome

The React app shell now renders legacy's branded default "grey" theme (dark background/text/semantic palette sourced from `core/ui-src/less/themes/vars-grey.less`, logo-green `#0fab4b` MUI `primary` per ADR-0007's accepted variance), a horizontally-aligned desktop navigation bar (the `List`/`ListItemButton` flex bug is fixed), and the NZBHydra logo in the `AppBar` with a non-empty accessible name, replacing the previous unbranded stock-MUI look. `palette.mode` now defaults to `"dark"` regardless of OS preference. The existing `dark-dyschromatopsia` accessibility variant is unchanged in value and still composes on top of the new base palette. Deterministic Playwright visual evidence for the branded shell was captured at desktop/mobile, and FM-027's existing visual-evidence assertions were re-run unmodified and pass under the new theme.

### Files Modified

- `core/ui-react/src/app/theme.ts` — added the legacy-grey base palette (`background`, `text`, `success`/`info`/`warning`/`error`, `primary`) and changed `createHydraTheme`'s default `preference` parameter from `"auto"` to `"dark"`; the `dark-dyschromatopsia` override block is unchanged in value, now spread after the base palette so it still wins.
- `core/ui-react/src/app/theme.test.ts` — added coverage for the base palette's token values, that they apply independent of `mode`, that the default (no-argument) `palette.mode` is `"dark"`, and extended the existing dyschromatopsia test to assert all five of its overridden tokens plus `background.paper`.
- `core/ui-react/src/app/AppShell.tsx` — fixed the nav flex bug (`List` now receives `sx={{display:"flex", flexDirection:"row", gap:1, py:0}}` directly, with `width:"auto"` on its `ListItemButton` children, only for the desktop AppBar usage; the mobile Drawer usage is unchanged/vertical); added the NZBHydra logo `<img>` (`alt="NZBHydra2"`, `data-testid="app-shell-logo"`) referenced via `new URL("../assets/logo.png", import.meta.url)`; added `data-testid="app-shell-nav"` on the desktop nav container. No existing selector, `data-testid`, or role used by other features was changed. **Review-findings fix round**: added `useLocation` from `@tanstack/react-router` (same pattern as `StatsShell.tsx`) to read the current pathname, a new `isActiveNavigationItem` helper that matches a nav item to the route by its first path segment relative to `baseUrl`, and a new `activeNavigationItemSx` helper; the current route's nav `ListItemButton` now gets `aria-current="page"`, a `primary.main` bottom border (desktop) / left rail (mobile Drawer), and green bold label text via `ListItemText`'s `slotProps.primary.sx`. See the corrected "AppBar chrome color" Assumption below for why this replaces the original (incorrect) claim about the `AppBar`'s own background.
- `core/ui-react/src/app/AppShell.test.tsx` — added `afterEach(cleanup)` (required by this project's non-global Vitest config; its absence was pre-existing latent risk this task's added tests exposed), a test asserting the desktop nav `List`'s computed `display:flex`/`flexDirection:row` and that its links are not full-width, and a test asserting the logo has accessible name `"NZBHydra2"`. **Review-findings fix round**: added a `vi.mock("@tanstack/react-router", ...)` for `useLocation` (mirroring `StatsShell.test.tsx`'s existing mock pattern) with a mutable `mockPathname` reset in `beforeEach`, and a new test ("should mark the current route's nav item with the branded primary-green active indicator") that renders `AppShell` wrapped in `<ThemeProvider theme={createHydraTheme("dark", false)}>` (needed so the `sx` theme-token `"primary.main"` resolves to the real branded color rather than MUI's stock default, since this test file otherwise renders `AppShell` without a `ThemeProvider`), sets `mockPathname` to a stats sub-route, and asserts via real `getComputedStyle` that the active link's `border-bottom-color` is `rgb(15, 171, 75)` (`#0fab4b`) with `aria-current="page"`, while the inactive link has neither.
- `core/ui-react/src/App.tsx` — `ThemeProvider theme={createHydraTheme()}` → `createHydraTheme("dark")`, so the default shell wiring never resolves to light mode from OS preference.
- `core/ui-react/src/assets/logo.png` — new file, byte-identical copy of `core/ui-src/img/logo.png` (SHA-256 match confirmed below).
- `tests/system/tests/smoke.spec.ts` — added a `"Branded app shell visual evidence"` describe block: for each of `desktop`/`mobile`, navigates through `ui/react?redirect=/`, captures a narrow `role=banner` (AppBar) region screenshot via `captureVisualRegion` to `test-results/visual-evidence/F-PLATFORM-SHELL/app-bar-<viewport>.png`, asserts no horizontal overflow via `expectVisualGeometry`, asserts the logo's accessible name, and — desktop only — asserts the nav region's own overflow plus a bounding-box `y`-coordinate comparison across all nav `link`s proving horizontal alignment (not vertical stacking). **Review-findings fix round**: added, still inside the desktop-only block (no new state/viewport, since the default `/` route already makes "Search" the active item so no extra navigation step was needed), an assertion that exactly one nav link has `aria-current="page"`, that it is the "Search" link, and that its real-browser computed `border-bottom-color` is exactly `rgb(15, 171, 75)` — genuine evidence, in the actual rendered app (not just a unit test), that the branded `primary` green is visibly present as an interactive affordance.
- `docs/frontend-migration/FEATURES.yaml` — `F-PLATFORM-SHELL`'s `visual` subrecord only: `unassessed` → `proposed` with contract/evidence/snapshots/variance (see Registry And Documentation Updates). No other field of `F-PLATFORM-SHELL` touched. **Review-findings fix round**: added a `current-route-nav-item-primary-green-indicator` state, a geometry_check-adjacent entry describing the new `aria-current`/border-color assertion, and expanded the `primary`-color variance's `description` to state concretely which element renders the green (the current-route nav item, not the `AppBar` background) and why the `AppBar` itself cannot (`enableColorOnDark` defaults to `false`).
- `docs/frontend-migration/COMPONENTS.yaml` — `C-APP-SHELL`'s `task`/`backlog` fields only: `task: FM-006` → `task: FM-031`; backlog rationale narrowed to "Remaining footer branding and live-status integration needs a dedicated follow-up task." `state` unchanged (`partial`).
- `docs/frontend-migration/tasks/FM-031-branded-mui-theme-foundation.md` — Owner/Status lifecycle and this Handoff.
- `docs/frontend-migration/STATUS.md` — moved FM-031 into `## Active`, then into `## Review` once verification completed.

Scope confirmation: `git status --porcelain` shows every task-owned change above and nothing else touched by this task. Pre-existing uncommitted changes from other in-flight tasks (FM-026/FM-029/FM-030 done-but-uncommitted, FM-027 review, unrelated `.claude`/`.opencode` agent config, `core/ui-react/scripts/validate-migration.mjs`, `tests/system/tests/{search,results}.spec.ts`, `tests/system/tests/visualEvidence.ts`, `docs/frontend-migration/{README.md,CONTEXT.md,templates/*,decisions/ADR-0004*,decisions/ADR-0006*,tasks/{README,FM-026..030}*}`, `core/ui-react/vite.config.ts`, `core/ui-react/src/features/search/**`) were not modified, staged, or reverted by this task.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: Vite `7.3.6`, Vitest `4.1.6`, TypeScript `5.9.3`, `@playwright/test` `1.62.1` (`tests/system`), Maven-built `core`/`mockserver` JARs via `misc/run_gui_systemtest.py --runtime local`.

### Verification Evidence

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci` | Passed: 400 packages installed. |
| `core/ui-react` | `npm run typecheck` | Passed: `tsc --noEmit`, no errors. |
| `core/ui-react` | `npm run lint` | Passed: 0 errors, 6 pre-existing warnings in files this task did not touch (`SearchWorkspace.tsx`, `IndexerStatusesPage.tsx`, `router.tsx`). |
| `core/ui-react` | `npm run format:check` | Passed: all files match Prettier style. |
| `core/ui-react` | `npm run test -- --run` | Passed: 35 files, 163 tests (includes the new `AppShell.test.tsx`/`theme.test.ts` coverage, including the review-findings fix round's active-nav-indicator test). |
| `core/ui-react` | `npm run build` | Passed: `vite build` succeeded; `dist/assets/logo-DUBjWDjk.png` confirms the new logo asset is bundled and base-URL-hashed. |
| `core/ui-react` | `npm run check:api` | Passed: generated OpenAPI types are current. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/smoke.spec.ts` (1st run) | Passed: 3/3 (`should load the application shell`; branded AppBar desktop/mobile). Produced `tests/system/test-results/visual-evidence/F-PLATFORM-SHELL/app-bar-desktop.png` (1280×64) and `app-bar-mobile.png` (390×56). |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts` | Passed: 13/13 unmodified, including FM-027's `"should provide deterministic React workspace visual evidence across desktop and mobile"` — confirms the new theme does not break FM-027's existing layout/geometry contract. `tests/system/tests/search.spec.ts` was not edited. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local -- tests/smoke.spec.ts` (2nd run) | Passed: 3/3 again, re-run last because Playwright's default `outputDir` is cleared at the start of every invocation — the search-spec run above wiped the first run's `F-PLATFORM-SHELL` PNGs (a `validate:migration` run in between caught this: it failed with "visual snapshots must contain repository paths" until the evidence existed again). Regenerated the same two PNGs (byte sizes 9886/5283, dimensions unchanged). See Assumptions. |
| `core/ui-react` | `npm run validate:migration` (final) | Passed with the evidence from the final smoke run on disk: "Migration registries and task metadata are valid." |
| repository root | `git diff --check` (final, after the review-lifecycle update) | Passed: no whitespace errors. |

### Verification Basis

- Baseline: `c207755f06fe1e88a2b5d88673c6db11e1f0ba17`.
- Command coverage: the full `core/ui-react` chain (`npm ci` through `validate:migration`) and both `misc/run_gui_systemtest.py` Playwright runs cover `core/ui-react/src/app/theme.ts`, `core/ui-react/src/app/theme.test.ts`, `core/ui-react/src/app/AppShell.tsx`, `core/ui-react/src/app/AppShell.test.tsx`, `core/ui-react/src/App.tsx`, `core/ui-react/src/assets/logo.png`, and `tests/system/tests/smoke.spec.ts`. `git diff --check` has no implementation/test file coverage.
- File-content manifest:
  - `core/ui-react/src/app/theme.ts: 1643ac018d876d5fdfe4375566a1dd0510f25da99adddd9561663e91d40fcb35`
  - `core/ui-react/src/app/theme.test.ts: d0c8f07a0f9b5d8d410178a7622e4e4466335e5137ed75ef513853f488b6db1a`
  - `core/ui-react/src/app/AppShell.tsx: 83203b3bfa258c2313ed5892ea4f3a714c71e9d136dfd36498fd9091ebc10204`
  - `core/ui-react/src/app/AppShell.test.tsx: 22c0ffc1d75da0082db0b27f3b40817b0afa57fd6f1d74d557a1db4ecd801e68`
  - `core/ui-react/src/App.tsx: 50bb5181b55a186e48017278a27c299ee70d61e8631bcd432fce11637283c45f`
  - `core/ui-react/src/assets/logo.png: 0b8ed64b8797888fdcabdac7d5a7b3d3c7da908d14e192a87a0dda2f4699fdc0` (matches `core/ui-src/img/logo.png`'s SHA-256 exactly — copied unmodified)
  - `tests/system/tests/smoke.spec.ts: b36896ff8d5ec08ef56d898daac9a4e414dd88702acc4d5a40f64752099dda40`
- Completed after the last change to each command's listed files: yes. **Correction (coordinator, post-second-review):** the three hashes above for `AppShell.tsx`, `AppShell.test.tsx`, and `tests/system/tests/smoke.spec.ts` were recomputed against current file content; the values originally recorded here were stale (captured before the review-findings fix round's edits). The independent second-pass reviewer recomputed all 7 hashes, found this exact discrepancy, and separately reran the complete required chain plus both Playwright specs against the current code — everything passed and the active-nav-item green indicator was visually confirmed in the real evidence screenshots. No implementation or test file changed as part of this correction; only this manifest was brought back in sync with what was already independently re-verified.
- Task-owned changes after verification: documentation/lifecycle-only — this task packet's Status/Owner/Handoff and `docs/frontend-migration/STATUS.md`; `docs/frontend-migration/FEATURES.yaml`'s `F-PLATFORM-SHELL` visual subrecord and `docs/frontend-migration/COMPONENTS.yaml`'s `C-APP-SHELL` fields (registry reconciliation, not implementation/test files — `npm run validate:migration` above already reflects their final content). No implementation or test file changed after the hashes above were captured.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: None.
- Development dependencies added, removed, or changed: None.

### Architecture Decisions

- ADR-0007 (accepted, Option A): implemented as written — legacy-grey base palette sourced from `vars-grey.less`, `primary.main = #0fab4b` as the single explicitly-flagged variance, `palette.mode` fixed to `"dark"` by default, logo integrated into the `AppBar`, and the nav flex-layout bug fixed, all in the same shell-level change per its Boundary Rationale.
- ADR-0006 (accepted): the `F-PLATFORM-SHELL` visual record moved from `unassessed` to `proposed` (not `accepted`) with a scoped contract, deterministic setup, named viewports, geometry checks, evidence, narrow region snapshots, and the `primary`-color variance recorded with `status: proposed` per its variance-disposition process; no visual baseline or variance was self-accepted.
- ADR-0001/ADR-0002/ADR-0004: no runtime-boundary, stack, or testing-policy changes; MUI remains the only component system, `data-testid`/role selector contracts used by other features through `AppShell` are unchanged, and behavioral/accessibility/visual gates remain independently evidenced.
- `ADR REQUIRED` proposal triggered during this task: None.

### Assumptions

- **Static-asset convention**: placed the logo at `core/ui-react/src/assets/logo.png` and referenced it via Vite's `new URL("../assets/logo.png", import.meta.url).href` pattern (not a static `import`, and not `core/ui-react/public/`). There is no existing precedent in `core/ui-react` for either convention. Chose this because: (1) `core/ui-react/AGENTS.md` explicitly prohibits hardcoding root-relative asset URLs, and this app is served under a configurable, non-root-safe base URL (`vite.config.ts`: `base: process.env.VITE_BASE_PATH ?? "./"`, per ADR-0001/CONTEXT.md's base-URL runtime contract) — a `public/`-copied asset referenced by a literal `/logo.png`-style path would hardcode exactly the kind of root-relative URL that convention forbids and that breaks under a custom base path; (2) Vite's `new URL(..., import.meta.url)` asset reference is base-URL-aware and content-hashed automatically by the bundler without requiring a static `import` (which would need an ambient `declare module "*.png"` typing not already present in this project and not addable within this task's file allowlist); (3) TypeScript's bundled `lib.dom.d.ts` (included via this project's `"lib": ["ES2022","DOM","DOM.Iterable"]`) already types `ImportMeta.url`, so no new type-declaration file was needed. Verified end-to-end: `npm run typecheck`/`build` succeed, and both `vite build` and the Maven `build-react-assets` step emit a correctly hashed `assets/logo-DUBjWDjk.png` under the packaged `static/react/` namespace.
- **Nav-layout fix**: chose to move `sx={{display:"flex", flexDirection:"row", gap:1}}` directly onto the `List` (only for its desktop `AppBar` usage, via a new `horizontal` parameter to the shared `links()` helper; the mobile `Drawer` usage keeps the default vertical `List`), plus `width:"auto"` on the horizontal `ListItemButton`s to override their default full-width block sizing. This is the smallest change that fixes the actual bug (the previous wrapping `<Box sx={{display:"flex"}}>` had only one child — the `List` itself — so the flex row had no effect on the individual items) without altering the navigation's information architecture, the mobile Drawer's own (intentionally vertical) layout, or any selector.
- **AppBar chrome color (corrected during review-findings fix, see Review Findings Fix Round below)**: the original handoff claimed leaving MUI's default `AppBar` `color="primary"` unchanged meant "the header now renders in the new logo-green primary." That claim was factually wrong: MUI's `AppBar` defaults `enableColorOnDark` to `false`, so under `palette.mode: "dark"` a `color="primary"` `AppBar` neutralizes to `background.paper` plus MUI's dark-mode elevation overlay (confirmed by an independent reviewer's pixel analysis of `app-bar-{desktop,mobile}.png`, which showed `rgb(64,70,72)`, not the green). Rather than setting `enableColorOnDark` (which would color the *entire* AppBar background `#0fab4b` and, verified by computing WCAG contrast, gives only ~3.02:1 contrast for white/inherited-color text against it — below the 4.5:1 AA threshold for normal text, so illegible for the nav labels and title), the fix adds a genuine, narrower `primary`-green affordance: the current route's own desktop/mobile nav item now gets a green (`primary.main`) bottom border (desktop) or left rail (mobile Drawer), green bold label text, and `aria-current="page"`, driven by `useLocation` from `@tanstack/react-router` (the existing pattern already used by `StatsShell.tsx`). This matches ADR-0007's own stated rationale for the `primary` variance ("drives ... links, focus rings, selected states") without redesigning the AppBar's own chrome, which the accepted Option A token mapping does not specify.
- **`dark-dyschromatopsia` + `text`**: the accessibility variant's override object still lists only `background`/`error`/`info`/`primary`/`success`/`warning` (unchanged in value, per acceptance). It does not override `text`, so `dark-dyschromatopsia` now also inherits the new base `text.primary`/`text.secondary` (previously fully unset/stock MUI, since the old base palette set no `text` at all). This is a value-preserving superset, not a change to any of the five explicitly-named override tokens; `theme.test.ts`'s existing and extended dyschromatopsia assertions all still pass.
- **`F-PLATFORM-SHELL` `gaps`/`task`/`parity`/`backlog` left unchanged**: the acceptance text notes the nav-bug fix could "narrow a gap already listed" (`gaps: [navigation, footer, permission-aware links, live status]`), but this task's own `Files Allowed To Modify` restricts `FEATURES.yaml` edits to only `F-PLATFORM-SHELL`'s `visual` subrecord. Treated the file-allowlist as authoritative and left `parity`/`gaps`/`task`/`backlog` untouched; the navigation fix is instead reflected inside the new `visual.contract`'s `states`/`geometry_checks`. Flagging this as a documented, deliberate scope resolution (see Follow-Up Work) rather than an oversight.
- **Registry evidence path convention**: `FEATURES.yaml`'s `visual.snapshots` entries use `tests/system/test-results/visual-evidence/F-PLATFORM-SHELL/<region>.png` — the actual repository-root-relative path, since `scripts/validate-migration.mjs`'s `isContainedProjectPath` resolves registry paths against the repository root while Playwright's own `visualEvidence.ts` helper returns the same path relative to its own working directory (`tests/system`, where `misc/run_gui_systemtest.py` invokes `npx playwright test`). Confirmed correct by running `npm run validate:migration` only after the Playwright evidence files existed on disk.
- **Playwright `outputDir` is cleared per run**: `tests/system/playwright.config.ts` uses the default `test-results` output directory, which Playwright empties at the start of every invocation (not scoped per spec file). Running `tests/search.spec.ts` after `tests/smoke.spec.ts` therefore deleted the just-captured `F-PLATFORM-SHELL` evidence PNGs before `npm run validate:migration` could see them. Not a defect in this task's files (`playwright.config.ts` is not in this task's allowlist and this is standard/expected Playwright behavior) — resolved operationally by re-running `tests/smoke.spec.ts` a second time, last, so its evidence is the one left on disk for the final `validate:migration` pass recorded above.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `F-PLATFORM-SHELL` (`docs/frontend-migration/FEATURES.yaml`): `visual` subrecord only — `applicability: applicable` (unchanged), `status: unassessed` → `proposed`, with a scoped `contract` (`setup`, three `states`, both named `viewports`, three `geometry_checks`), `evidence: [tests/system/tests/smoke.spec.ts]`, `snapshots` (the two captured PNG paths), and one `variances` entry (the ADR-0007 `primary`-color variance, `status: proposed`, explicitly not `accepted`). `target`, `tests`, `parity`, `gaps`, `task`, and `backlog` are intentionally unchanged (outside this task's file allowlist for this record; see Assumptions). Human acceptance of the baseline and its variance is pending and explicitly not claimed by this task.
- `C-APP-SHELL` (`docs/frontend-migration/COMPONENTS.yaml`): `task: FM-006` → `task: FM-031`; `backlog.rationale` narrowed from "Remaining navigation, footer, and live-status integration needs a dedicated follow-up task." to "Remaining footer branding and live-status integration needs a dedicated follow-up task." (navigation dropped since this task fixes it). `state` remains `partial` — footer branding and live-status integration are still deferred. `responsibility`/`legacy`/`target`/`consumers`/`classification` unchanged.
- No `APIS.yaml` records are linked to this task; unchanged.
- FM-027's own `F-SEARCH-FORM`/`F-SEARCH-MEDIA`/`F-SEARCH-INDEXERS`/`F-SEARCH-RECENT` visual records and `tests/system/tests/search.spec.ts` were read and their existing evidence re-run unmodified as a smoke check (see Verification Evidence); neither the test file nor any of FM-027's own registry records were edited by this task.
- No behavioral or accessibility gate is implied by this visual-evidence work; ADR-0004's independent domain/component/Playwright gates and ADR-0006's independent visual gate remain separate.

### Follow-Up Work

- ~~Human acceptance required~~ — resolved, see Coordinator Completion below.
- FM-027's own re-evidencing follow-up (re-capturing its held baseline's screenshots against this branded theme and updating its own linked visual records) may now proceed.
- Optional tiny follow-up (not performed here, outside this task's file allowlist): if the coordinator/task designer agrees, narrow `F-PLATFORM-SHELL.gaps` to drop `navigation` now that the flex-layout bug is fixed.
- `C-APP-SHELL`'s remaining deferred work (footer branding, live-status integration) still needs a dedicated follow-up task, per its updated backlog rationale.

## Fresh Review (Recorded)

### Review Identity

- Two independent fresh-reviewer passes conducted (first pass: `changes_requested`, one required finding on primary-color visibility; fixer round addressed it with a real active-nav-item indicator; second pass: `changes_requested`, one paperwork-only finding on stale verification-basis hashes for the fix-round's three touched files, corrected directly by the coordinator by recomputing and updating the manifest — no code change required, as the second reviewer had already independently reverified the fix-round code passes the complete required chain and visually confirmed the green indicator in real evidence screenshots).

### Resolution

- Both review findings resolved. Final disposition: **accepted**.

### Coordinator Completion

- Coordinator: Claude Sonnet 5 (this session)
- Human visual-baseline acceptance: the repository owner reviewed full-page desktop/mobile screenshots (search workspace and History & Stats page, captured live against the running app) in addition to this task's own narrow AppBar evidence, and explicitly accepted the proposed `F-PLATFORM-SHELL` visual baseline and its `primary`-color variance on 2026-08-16 (recorded in `FEATURES.yaml`'s `F-PLATFORM-SHELL.visual.acceptance`).
- Decision: mark `done`.
