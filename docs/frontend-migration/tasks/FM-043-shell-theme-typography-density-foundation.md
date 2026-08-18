# FM-043: Shell Theme, Typography, And Density Foundation

Status: done Owner: migration-implementer Feature IDs: F-PLATFORM-SHELL Component IDs: C-APP-SHELL API IDs: None Depends on: None Blocks: FM-044, FM-045

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
change, matching ADR-0007's and ADR-0008's own precedent of treating shell + theme as one unit. For the same reason, any existing unit test that hardcodes a superseded palette literal is this task's own breakage to repair — the packet
named `AppShell.test.tsx` because it was the only such test known when the packet was written; a repository search found exactly one more (`RecentSearches.test.tsx`), and both are allowed only a literal update, never an intent change.

The ADR-0010 CSS-delivery fix (`vite.config.ts`, `react.html`, `validate-production-assets.mjs`) belongs to this packet, not a separate one, because the two are mutually unverifiable apart. This task's own acceptance already requires
that the vendored fonts *actually load* in a production build, evidenced by the real-backend Playwright run, which is unsatisfiable while the emitted CSS is never linked; and those three files are inert without this task, since a tree
without its `@fontsource` imports emits no CSS asset at all, so `assets/index.css` would not exist, the `<link>` would resolve to nothing, and the widened validator would pass vacuously — exactly the "unreviewable, inert change" the
rule above forbids. A split would make each packet depend on the other's unmerged work for its own evidence. This is not a broadening that legitimizes what was already implemented: the implementer touched none of these three files, and
adding them makes the task *harder* to pass (a new build gate, plus a previously failing assertion that must now succeed). ADR-0010 leaves this choice to the task designer and fixes the file list at exactly these three.

## Decision Dependencies

- Accepted ADRs governing this task: ADR-0002 (MUI-only presentation), ADR-0004 (testing and parity), ADR-0006 (semantic visual parity), ADR-0007 (branded theme tokens and structure being superseded here), ADR-0009 (full mock
  fidelity — palette, typography, density, superseding ADR-0008's Option B), ADR-0010 (React production CSS delivery — Option A, accepted 2026-08-17: pin the emitted CSS entry to `assets/index.css`, `<link>` it from `react.html`'s
  `<head>`, and retarget `scripts/validate-production-assets.mjs` onto that template). ADR-0010's `## Consequences` section is binding here and is not re-derived; this packet only applies it to the three files that decision names.
- Proposed or rejected ADRs blocking this task: None.

## Files Allowed To Modify

- `core/ui-react/src/app/theme.ts`, `theme.test.ts`, `AppShell.tsx`, `AppShell.test.tsx`
- `core/ui-react/src/features/search/history/RecentSearches.test.tsx` — only the single superseded `text.secondary` color literal (`/rgb\(\s*122,\s*130,\s*136\s*\)/`, ADR-0007's `#7a8288`) in `renders field labels in italic, muted
  text distinct from the values`, replaced by the new token's value; the test's intent, its name, its other assertions, and every other test in the file stay unchanged, and no other feature file may be touched
- `core/ui-react/src/App.tsx` — only the font-CSS import line(s) needed to load the vendored IBM Plex packages
- `core/ui-react/package.json`, `core/ui-react/package-lock.json` — only the `@fontsource/ibm-plex-sans`/`@fontsource/ibm-plex-mono` runtime dependency addition
- `core/ui-react/vite.config.ts` — only a `build.rollupOptions.output.assetFileNames` rule pinning the emitted CSS entry to `assets/index.css`, per ADR-0010. `base`, `outDir`, `emptyOutDir`, the existing `entryFileNames:
  "assets/[name].js"`, `plugins`, `define`, and the whole `test` block stay byte-identical; no `cssCodeSplit`, no `manifest`, no new plugin, and no change to how fonts or any other emitted asset are named
- `core/src/main/resources/templates/react.html` (FM-004-owned) — only the addition of one `<link rel="stylesheet" th:href="@{static/react/assets/index.css}" />` inside the existing `<head>`, per ADR-0010. Every existing line stays
  unchanged, including `<base th:href="${session.baseUrl}" />`, the three `<meta>` tags, the favicon `<link>`, the bootstrap `<script th:inline="javascript">`, and `<script type="module" th:src="@{static/react/assets/index.js}">`
- `core/ui-react/scripts/validate-production-assets.mjs` (FM-009-owned) — only retargeting the HTML it reads from the output directory's `index.html` to `core/src/main/resources/templates/react.html`, and widening the single
  hardcoded `assets/index.js` check to every emitted entry asset, per ADR-0010. Its license header, its `VITE_OUT_DIR ?? "dist"` resolution, and its invocation contract (`npm run validate:production-assets`, no arguments, no new
  dependency) stay unchanged
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
- The `.woff` duplication debt this task recorded (34 redundant `.woff` files beside their `.woff2` twins, roughly half of `dist/assets`' 2.0 MB): ADR-0010's accepted Option A explicitly does **not** retire it, and only the rejected
  Option C would have. It stays open debt under Temporary Exceptions And Debt; do not fold it into this scope
- Everything ADR-0010's rejected options would have required: no CSS-inlining plugin such as `vite-plugin-css-injected-by-js` (Option B), no hand-written `@font-face` blocks in `theme.ts` and no "build fails if any CSS asset is
  emitted" check (Option C), no `build.manifest` with Spring-rendered asset tags, hence no change under `core/src/main/java/org/nzbhydra/web/` and none to `META-INF/native-image/resource-config.json` (Option D)
- The `/static/**` caching policy (`WebConfiguration.java`'s `CacheControl.noCache()` + `resourceChain(false)`, `application.properties`' `spring.security.headers.cache=false`) — the premise that makes an unhashed `assets/index.css`
  correct. Confirm it by reading; changing it would invalidate ADR-0010's premise and require revisiting that ADR
- Renaming or re-hashing any emitted asset other than the CSS entry, and any change to `core/pom.xml`, `.github/workflows/frontend-ci.yml`, `.github/workflows/buildNative.yml`, or `docker/uiDev/start.sh` — the validator must keep
  working under the invocations those files already declare rather than gaining new wiring

## Context To Read

- `README.md` (Visual Parity, Workflow, Registry Rules, Verification Integrity, Dependencies And Toolchain), `ADR-0002`, `ADR-0004`, `ADR-0006`, `ADR-0007`, `ADR-0008` (historical; superseded), `ADR-0009`
- `ADR-0010` in full, especially `## Human Decision` and `## Consequences` — the binding, already-decided shape of the CSS-delivery change; also `ADR-0001` (isolated `static/react/` namespace, Thymeleaf React shell, explicit
  packaging/base-path/external-static tests), which ADR-0010 extends
- `F-PLATFORM-SHELL`, `C-APP-SHELL`, and the FM-004/FM-009/FM-031/FM-035 packets (prior shell/theme history; FM-004 owns `react.html` and FM-009 owns the asset validator and its CI wiring)
- `core/ui-react/vite.config.ts`, `core/src/main/resources/templates/react.html`, and `core/ui-react/scripts/validate-production-assets.mjs` in full, plus the two invocations that must keep working: `core/pom.xml`'s
  `validate-react-assets` execution (`process-resources`, `VITE_OUT_DIR=../target/classes/static/react`) and `.github/workflows/frontend-ci.yml`'s `Validate production assets` step (no `VITE_OUT_DIR`, so default `dist/`)
- `core/src/main/java/org/nzbhydra/web/WebConfiguration.java` `addResourceHandlers` (the `/static/**` `noCache()`/`resourceChain(false)` registration and the `<dataFolder>/static` override) and
  `core/src/main/resources/META-INF/native-image/resource-config.json` — read to confirm, not to change
- `core/ui-react/src/app/theme.ts`, `theme.test.ts`, `AppShell.tsx`, `AppShell.test.tsx`, `App.tsx` in full
- `uimock/NZBHydra Search.dc.html` — the `<helmet>` `<style>` block, the outer page `<div>`'s inline style, and the `<header>` block only, for the exact palette/typography/radius/scrollbar
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
  typography/palette breaks an existing assertion (e.g. a hardcoded old-palette color check) — do not rewrite passing, unrelated assertions. The same rule, and only that rule, applies to `RecentSearches.test.tsx`'s one stale
  `text.secondary` literal: swap the asserted value for the new token's, leaving the assertion's intent (muted label tone distinct from its value) and every other assertion in the file intact. No test may be skipped, deleted, or
  weakened to make the suite green.
- `F-PLATFORM-SHELL`'s visual contract is re-evidenced under the new theme: keep every existing geometry check from the current `proposed` contract (AppBar/nav overflow-free, horizontal alignment, active-nav-item border color, stable
  nav-item width across active state — with the color assertion updated to the new `primary.main`), and add one new state, `branded-typography-and-density`, asserting the AppBar's computed `font-family` includes `"IBM Plex Sans"` and
  that `background.default` (page, outside the AppBar) differs from the AppBar's own computed background color. Record the new IBM Plex Sans/Mono typography, the `oklch` palette, and the new density tokens as `proposed` variances
  (no legacy equivalent) rather than parity; the prior primary-green variance stays, superseded by this task's own note explaining the palette change, per ADR-0006's existing remediation mechanism (the same pattern FM-034/037/039/040
  used). Never fabricate or re-date human acceptance — this record stays `proposed`.
- **Pinned CSS entry (ADR-0010).** `npm run build` emits the stylesheet at exactly `assets/index.css` — that literal name, no content hash, one file — while every other emitted asset keeps Vite's default content hash: the 68
  `@fontsource` font files must still carry hashes (e.g. `assets/ibm-plex-sans-latin-400-normal-<hash>.woff2`), and `assets/index.js` keeps its existing unhashed pin from `entryFileNames: "assets/[name].js"`. The mechanism is an
  `assetFileNames` rule in `vite.config.ts` that special-cases CSS only; nothing else about the build output changes.
- **`<head>` `<link>` (ADR-0010).** `core/src/main/resources/templates/react.html` contains `<link rel="stylesheet" th:href="@{static/react/assets/index.css}" />` inside `<head>`, before `</head>` and therefore before the
  `<body>`'s `<script type="module" th:src="@{static/react/assets/index.js}">`. The `<head>` placement is load-bearing, not incidental: it is the render-blocking, flash-of-unstyled-text property Option A was chosen for, so the CSS and
  its webfonts start fetching before the ~1,000 kB entry module parses. Moving it into `<body>`, deferring it, or loading it from JavaScript does not satisfy this criterion. It uses Thymeleaf's `@{...}` form, identically to the
  existing script tag, so a configured non-root context path or reverse proxy resolves it the same way — asserted, not assumed.
- **Validator reads the real template (ADR-0010).** `scripts/validate-production-assets.mjs` reads `core/src/main/resources/templates/react.html` — the file Spring serves via `MainWeb.shell()`'s `"react"` view — instead of the output
  directory's unused `index.html`, and fails with a non-zero exit and a message naming the offending asset when an emitted entry asset is not referenced by that template. It resolves the template path relative to the `core/ui-react`
  working directory (not relative to the output directory), so it behaves identically under both invocations that exist today: Maven's `VITE_OUT_DIR=../target/classes/static/react` and CI's default `dist/`.
- **Entry assets vs. code-split chunks (ADR-0010).** The validator's "must be referenced by the template" set is exactly the pinned, unhashed entry assets (`assets/index.js` and `assets/index.css`). Content-hashed assets — future
  route-level code-split JS/CSS chunks, which Vite's own module-preload runtime loads rather than the template `<link>`, and the 68 font files — are never treated as unreferenced entry assets. State the classification rule used and
  confirm it against the actual build output rather than assuming it; a run in which the 68 hashed font files or a hashed chunk would have to appear in `react.html` fails this criterion. Extending the check in the opposite direction
  (failing when the template references an asset the build did not emit) is a routine, permitted addition, not a requirement.
- **Fonts actually load in production.** The real-backend Playwright run's `branded-typography-and-density` assertions pass end to end: `Array.from(document.fonts).filter(f => f.status === "loaded").map(f => f.family)` contains
  `"IBM Plex Sans"` (a non-empty `document.fonts`, which is the evidence that was missing — the previous run returned `[]`), `document.fonts` also declares `"IBM Plex Mono"`, and the AppBar's computed `font-family` contains
  `"IBM Plex Sans"`. The computed `font-family` alone is **not** sufficient: Emotion injects theme CSS through the JS path even when no file-based CSS is delivered, which is exactly how the defect passed that check while the fonts
  were absent. The later assertions in the same spec that never executed before — AppBar background distinct from the page background, and the whole desktop nav geometry block including the `oklch(0.75 0.1 190)` active-indicator
  color — must now execute and pass.
- **No CDN dependency reintroduced.** The same run records zero requests to `fonts.googleapis.com` or `fonts.gstatic.com`, and the build output contains neither string. The pinned CSS entry and the template `<link>` must not
  reintroduce either in any form, per ADR-0009.
- **Native-image metadata confirmed unaffected.** `core/src/main/resources/META-INF/native-image/resource-config.json`'s existing generic `"static/.*"` pattern already covers `static/react/assets/index.css`, so no entry is added.
  Confirm this by reading the file and recording the finding; do not assume it, and do not modify the file.

## Verification

- `npm ci` only if `package.json`/`package-lock.json` change (it does here, for the two `@fontsource` packages); otherwise the cheapest install that guarantees `node_modules` matches the lockfile. Record which install ran.
- Working directory `core/ui-react`: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api`, `npm run validate:migration` — each expected to pass.
- Working directory `core/ui-react`, after `npm run build`: list `dist/assets` and record that exactly one stylesheet exists and it is named `index.css` with no hash (e.g. `ls dist/assets | grep '\.css$'` returning exactly
  `index.css`), that `index.js` is still unhashed, and that the font files are still content-hashed. Expected: the pinned CSS entry alongside otherwise-hashed assets.
- Working directory `core/ui-react`: `npm run validate:production-assets` with no environment override (validating `dist/`, the CI path), and again as
  `VITE_OUT_DIR=../target/classes/static/react npm run validate:production-assets` after the Maven-path build (the `core/pom.xml` `process-resources` path) — both expected to pass and to report the validated output directory.
- Working directory `core/ui-react`: prove the gate actually fails, since a check that cannot fail is not a gate. Temporarily remove or misspell the `<link>` in `core/src/main/resources/templates/react.html`, run
  `npm run validate:production-assets`, and record the non-zero exit and the message naming the unreferenced asset; then restore the file exactly and re-run to confirm it passes again. Confirm with `git diff` that the template is
  byte-identical to its intended final state afterwards.
- Working directory `core/ui-react`: record the entry-asset classification the validator applies, and confirm from the same build output that none of the 68 hashed font files (and no hashed chunk asset) is required to appear in
  `react.html`. Expected: only `assets/index.js` and `assets/index.css` are checked for a template reference.
- Repository root: read `core/src/main/resources/META-INF/native-image/resource-config.json` and confirm its generic `"static/.*"` pattern already covers the new CSS asset, so the file needs no change and receives none. Record the
  confirmation; an unconfirmed assumption does not satisfy this.
- Working directory `tests/system`: `npx tsc --noEmit` — expected to pass (this task changes a spec).
- Working directory `tests/system`, after `VITE_OUT_DIR=../target/classes/static/react npm run build` from `core/ui-react`: `npx playwright test tests/smoke.spec.ts`, expected to produce the updated contract's evidence, including a
  visible font-family assertion (not merely a color check) proving the vendored fonts actually load and apply, not just that the CSS declares them. All three `Branded app shell visual evidence` specs must now pass, not one of three:
  the `loadedFontFamilies` assertion (`document.fonts` non-empty and containing `"IBM Plex Sans"`) is the criterion that previously failed with `Received array: []`, and every assertion after it in the same test — IBM Plex Mono
  declared, AppBar-vs-page background, zero font-CDN requests, and the desktop nav geometry block — must actually execute rather than being skipped by that early failure. Because `vite dev` serves a different HTML file entirely and
  never renders `react.html`, development observation is not evidence for any of this. Per prior tasks' precedent this suite requires the documented `python3 misc/run_gui_systemtest.py --runtime local` launcher for a real backend;
  record whichever path is used.
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

## Handoff

Recorded in the `review` state. This handoff replaces the earlier `blocked` one: both blockers it reported are now fixed, the packet was widened to own the four files involved, and the full Verification section was re-run end to end
against the final implementation. Where an earlier command's evidence is still valid because none of the files it covers changed, that is stated explicitly below rather than silently reused.

### Outcome

The shell theme, typography, and density foundation is implemented and fully verified. `createHydraTheme()` renders the mock's `oklch` teal palette, its self-hosted IBM Plex Sans typography, and its denser radii/control sizing;
`AppShell.tsx`'s `AppBar` picks up the new `background.paper` tone through the theme with no file edit. ADR-0010's accepted Option A now delivers that CSS in production: the Vite build pins its stylesheet to `assets/index.css`,
`core/src/main/resources/templates/react.html` render-blocks on it from `<head>`, and `scripts/validate-production-assets.mjs` validates the template Spring actually serves instead of the Vite output's unused `index.html`. The
real-backend Playwright run now passes all three `Branded app shell visual evidence` specs with a non-empty `document.fonts` containing a `loaded` `"IBM Plex Sans"` face — the evidence that was previously missing and that produced the
earlier blocker.

### Blockers

`None`. Both previously reported blockers are resolved:

1. The stale `text.secondary` literal in `core/ui-react/src/features/search/history/RecentSearches.test.tsx` is now inside `Files Allowed To Modify` and was updated from `/rgb\(\s*122,\s*130,\s*136\s*\)/` (`#7a8288`) to
   `/rgb\(\s*154,\s*162,\s*161\s*\)/` (`#9aa2a1`). That literal is the only change to the file: the test's name, its `fontStyle` assertions, and every other test in the file are untouched. No test was skipped, deleted, or weakened;
   `npm run test -- --run` is 210/210.
2. The CSS-delivery gap is closed per ADR-0010's accepted Option A, across exactly the three files that decision names. Its `## Consequences` were applied as binding and not re-derived; the rejected options B/C/D contributed nothing
   to the implementation.

### Files Modified

- `core/ui-react/src/app/theme.ts`, `core/ui-react/src/app/theme.test.ts`, `core/ui-react/src/app/AppShell.test.tsx` (prior implementer's work, unchanged in this pass)
- `core/ui-react/src/App.tsx` (font-CSS import lines only; unchanged in this pass)
- `core/ui-react/package.json`, `core/ui-react/package-lock.json` (the two `@fontsource` additions only; unchanged in this pass)
- `core/ui-react/src/features/search/history/RecentSearches.test.tsx` — one color literal, nothing else (this pass)
- `core/ui-react/vite.config.ts` — one `build.rollupOptions.output.assetFileNames` function and its comment (this pass)
- `core/src/main/resources/templates/react.html` — one added `<link rel="stylesheet" th:href="@{static/react/assets/index.css}" />` line inside `<head>` (this pass)
- `core/ui-react/scripts/validate-production-assets.mjs` — template retarget and entry-asset widening (this pass)
- `tests/system/tests/smoke.spec.ts` (`F-PLATFORM-SHELL`'s own visual-evidence block only; unchanged in this pass)
- `docs/frontend-migration/FEATURES.yaml` (`F-PLATFORM-SHELL`'s `visual` only), `docs/frontend-migration/STATUS.md`, this packet
- `core/ui-react/src/app/AppShell.tsx` was deliberately **not** edited: MUI renders a dark-mode `AppBar` at `palette.background.paper` already, so the new tone flows through the theme with no file change, which is exactly what the
  acceptance criterion asks for. Confirmed mechanically — the file contains no hex, `rgb()`, or `oklch()` literal at all — and behaviorally, by the now-passing AppBar-vs-page background assertion in the real-backend run.
- `docs/frontend-migration/COMPONENTS.yaml` was intentionally not modified (see Registry And Documentation Updates).
- Per-file constraint confirmation against the packet's inline limits:
  - `vite.config.ts`: `base`, `outDir`, `emptyOutDir`, `entryFileNames: "assets/[name].js"`, `plugins`, `define`, and the whole `test` block are byte-identical; the diff is additive only. No `cssCodeSplit`, no `manifest`, no new
    plugin, and no change to how fonts or any other emitted asset are named — confirmed by the build output, where the 68 font files and `logo-DUBjWDjk.png` all still carry content hashes.
  - `react.html`: the diff is exactly one added line. `<base th:href="${session.baseUrl}" />`, the three `<meta>` tags, the favicon `<link>`, the bootstrap `<script th:inline="javascript">`, and
    `<script type="module" th:src="@{static/react/assets/index.js}">` are all unchanged. The new `<link>` sits inside `<head>`, before `</head>` and therefore before the `<body>`'s entry `<script>` — the render-blocking placement
    Option A was chosen for. It uses Thymeleaf's `@{...}` form, identically to the existing script tag, so a configured non-root context path or reverse proxy resolves it the same way; this is asserted by construction (same
    mechanism, same file, adjacent line) and exercised by the real-backend run, which serves the app through the JVM's own Thymeleaf rendering rather than a static file.
  - `validate-production-assets.mjs`: its Apache license header, its `VITE_OUT_DIR ?? "dist"` resolution, and its invocation contract (`npm run validate:production-assets`, no arguments, no new dependency — it still imports only
    `node:fs/promises` and `node:path`) are unchanged. `core/pom.xml`, `.github/workflows/frontend-ci.yml`, `.github/workflows/buildNative.yml`, and `docker/uiDev/start.sh` are untouched; the validator keeps working under the
    invocations they already declare, proven below for both.
- Scope confirmation: every task-owned modification is within `Files Allowed To Modify`. `git status` lists exactly the 11 modified paths above plus the untracked `docs/frontend-migration/decisions/ADR-0010-react-production-css-delivery.md`
  (the ADR proposer's output for this same task), and nothing else. No other spec's fixtures or assertions were altered.

### Toolchain

- Node: `v26.7.0` (package.json engines `>=26.0.0 <27`)
- Package manager: `npm 11.19.0` (matches the declared `packageManager`)
- Other material tools: `vite 7.3.6`, `rollup 4.62.4`, `vitest 4.1.6`, `tsc 5.9.3`, `eslint 9.39.1`, `prettier 3.7.4`, `@playwright/test` (Chromium), Maven (`mvn package -DskipTests -pl org.nzbhydra:core,org.nzbhydra:mockserver -am`),
  Docker (sonarr/radarr containers started by `python3 misc/run_gui_systemtest.py --runtime local`)

### Verification Evidence

Every row below was run in this pass against the final implementation. Nothing is carried over from the earlier `blocked` handoff's run.

| Working directory | Command | Result |
|-------------------|---------|--------|
| `core/ui-react` | `npm ci` | Passed. This is the install that ran, and it is the packet's required one: `package.json`/`package-lock.json` differ from the baseline, so `npm ci` was used to guarantee `node_modules` matches the lockfile exactly. "added 403 packages, and audited 404 packages in 4s". (The earlier pass used `npm install` because it was the command that *wrote* the lockfile entries; that is now superseded by this clean `npm ci`.) |
| `core/ui-react` | `npm run typecheck` | Passed (no output). |
| `core/ui-react` | `npm run lint` | Passed: `0 errors, 7 warnings` — the same pre-existing `react-refresh/only-export-components` and `react-hooks/incompatible-library` warnings in `SearchWorkspace.tsx`, `IndexerStatusesPage.tsx`, and `router.tsx`, none of which this task owns. |
| `core/ui-react` | `npm run format:check` | Passed for task-owned files. The retargeted validator initially reported a style issue; `npx prettier --write scripts/validate-production-assets.mjs vite.config.ts src/features/search/history/RecentSearches.test.tsx` fixed it (the other two were already clean), after which the report is back to the same 11 pre-existing, out-of-scope files as before this task: `.playwright-cli/*.yml` x5, `README.md`, `src/features/search/SearchPage.tsx`, `src/router.tsx`, `tsconfig.json`, `vite/devBackend.test.ts`, `vite/devBackend.ts`. |
| `core/ui-react` | `npm run test -- --run` | **Passed: 38 files, 210/210 tests.** The previously failing `RecentSearches.test.tsx` case now passes with the corrected literal. Nothing was skipped, deleted, weakened, or suppressed to achieve this: the suite total is unchanged at 210. |
| `core/ui-react` | `npm run build` | Passed. Emits `assets/index.css` (12.30 kB, gzip 1.42 kB), `assets/index.js` (1,001.59 kB, gzip 305.56 kB), 68 font files, and `logo-DUBjWDjk.png`; 71 files in `dist/assets`. |
| `core/ui-react` | `ls dist/assets \| grep '\.css$'` and `\| grep -c '\.css$'` | Passed: exactly `index.css`, count `1`. One stylesheet, that literal name, no content hash. |
| `core/ui-react` | `ls dist/assets \| grep '\.js$'` | Passed: exactly `index.js` — still unhashed, from the untouched `entryFileNames: "assets/[name].js"`. |
| `core/ui-react` | `ls dist/assets \| grep -E '\.woff2?$' \| head -4` and `grep -cE '\.woff2?$'` | Passed: 68 font files, all content-hashed (e.g. `ibm-plex-mono-cyrillic-400-normal-BSMlKf0J.woff2`, `ibm-plex-sans-latin-500-normal-6ng42L7E.woff2`). The non-font, non-entry asset `logo-DUBjWDjk.png` is hashed too, so the `assetFileNames` rule demonstrably special-cases CSS only. |
| `core/ui-react` | `ls dist/assets \| grep -E '^index\.[^.]+$'` | Passed: exactly `index.css` and `index.js` — the entry-asset classification confirmed against real build output (see the dedicated row below). |
| `core/ui-react` | `npm run check:api` | Passed ("Generated OpenAPI types are current."). |
| `core/ui-react` | `npm run validate:migration` | Passed ("Migration registries and task metadata are valid."). |
| `core/ui-react` | `npm run validate:production-assets` (no env override — the CI `dist/` path) | Passed, exit `0`: "Validated React production assets in `.../core/ui-react/dist` (entry assets: index.css, index.js) against `.../core/src/main/resources/templates/react.html`". It reports the validated output directory, and now also the entry assets checked and the template validated against. |
| `core/ui-react` | `VITE_OUT_DIR=../target/classes/static/react npm run build` | Passed; 71 files under `core/target/classes/static/react/assets`, with the same `index.css`/`index.js` unhashed pair. Git-ignored build output. |
| `core/ui-react` | `VITE_OUT_DIR=../target/classes/static/react npm run validate:production-assets` (the Maven `process-resources` path) | Passed, exit `0`: "Validated React production assets in `.../core/target/classes/static/react` (entry assets: index.css, index.js) against `.../core/src/main/resources/templates/react.html`". **Identical behavior to the default `dist/` invocation**, including the same absolute template path — the template is resolved from the `core/ui-react` working directory, not from the output directory, which is what makes the two invocations agree. |
| repository root | `mvn --batch-mode package -DskipTests -pl org.nzbhydra:core,org.nzbhydra:mockserver -am` | Passed (`BUILD SUCCESS`). Exercises the real `core/pom.xml` wiring end to end: `build-react-assets` (`generate-resources`) then `validate-react-assets` (`process-resources`), the latter printing the same "Validated React production assets in `.../core/target/classes/static/react` (entry assets: index.css, index.js) against `.../react.html`" line. The gate lands on the Maven packaging path with no new wiring. |
| `core/ui-react` | **Negative gate check, step 1** — misspell the link to `@{static/react/assets/indexx.css}`, then `npm run validate:production-assets` (both invocations) | **Failed as required**, raw exit `1` on both the default `dist/` and the `VITE_OUT_DIR=../target/classes/static/react` path, with `Error: React production HTML does not reference emitted entry asset static/react/assets/index.css: /home/sist/projects/nzbhydra2/core/src/main/resources/templates/react.html` — the message names the offending asset and the template. |
| `core/ui-react` | **Negative gate check, step 2** — remove the `<link>` line entirely, then `npm run validate:production-assets` | **Failed as required**, raw exit `1`, same message naming `static/react/assets/index.css`. Both the "wrong filename" and the "no link at all" shapes of the original defect are caught. |
| repository root | **Negative gate check, step 3** — restore the template and confirm byte-identity | Passed. `sha256sum core/src/main/resources/templates/react.html` is `67b070dbe59c1dd9009e38ae2fc756d1d8c8ed7957057b2279bf4c4df3109230` both before the break and after the restore, and `git diff -- core/src/main/resources/templates/react.html` shows exactly one added line (`+    <link rel="stylesheet" th:href="@{static/react/assets/index.css}" />`) with no other hunk. Re-running both validator invocations after the restore passes again. |
| `core/ui-react` | Entry-asset classification, confirmed against real build output | Passed. The rule the validator applies: an entry asset is a top-level file in `<out>/assets` whose name matches `/^index\.[^.]+$/`, i.e. carries no content hash — exactly the two names `vite.config.ts` pins (`index.js` via `entryFileNames`, `index.css` via the new `assetFileNames` rule). Confirmed, not assumed: of the 71 emitted files, exactly two match (`index.css`, `index.js`), and the validator's own output names those two. None of the 68 hashed font files and not the hashed `logo-DUBjWDjk.png` is required to appear in `react.html`. This build produces no code-split chunk (a single entry chunk), and any future one would carry Vite's default `-[hash]` suffix and so would be classified as a non-entry asset loaded by Vite's module-preload runtime — the ADR-0010 misclassification risk is structurally avoided by keying on the hash, not on the extension. |
| repository root | Read `core/src/main/resources/META-INF/native-image/resource-config.json` | Confirmed by reading, not assumed: line 23 of the file, inside `resources.includes`, is `{"pattern": "static/.*"}` — a generic Java regex matching any classpath resource under `static/`, which includes `static/react/assets/index.css` exactly as it already covers `static/react/assets/index.js`. No entry is needed and **none was added**; the file is unmodified and absent from `git status`. |
| `tests/system` | `npx tsc --noEmit` | Passed (exit `0`, no output). |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 420 -- tests/smoke.spec.ts` | **Passed: 3/3.** `should load the application shell` (618 ms), `Branded app shell visual evidence › ... at desktop` (630 ms), `... at mobile` (552 ms). The documented real-backend launcher was used (Maven-built `core`/`mockserver` exec JARs plus the sonarr/radarr Docker containers), matching FM-031's and FM-040's precedent; `vite dev` was not used and is not treated as evidence for anything. |
| repository root | Font-loading evidence inside that run | Passed. `expect(loadedFontFamilies).toContain("IBM Plex Sans")` — computed as `Array.from(document.fonts).filter(f => f.status === "loaded").map(f => f.family)` — now passes at both viewports, where it previously failed with `Received array: []`. A passing `toContain` on that filtered array is precisely the "non-empty `document.fonts` containing a `loaded` IBM Plex Sans" criterion. The weaker computed-`font-family` check (which passed even while the fonts were absent, via Emotion's JS-injected theme CSS) is retained but is explicitly not the criterion. |
| repository root | Downstream assertions in the same spec that previously never executed | Passed, all of them, at both viewports: `declaredFontFamilies` contains `"IBM Plex Mono"`; the AppBar's computed `background-color` differs from the page body's; `fontCdnRequests` equals `[]`; and, at desktop, the whole nav geometry block — nav-region geometry evidence, horizontal alignment of every nav item, exactly one `aria-current="page"` link accessible-named "Search", its computed `border-bottom-color` equal to `oklch(0.75 0.1 190)`, and Search's bounding-box width unchanged across a real client-side navigation from active to inactive. |
| repository root | `grep -rl "fonts.googleapis.com\|fonts.gstatic.com" core/ui-react/dist/` and the same over `core/target/classes/static/react/` | Passed: no match, exit `1`, in both build outputs. Combined with the Playwright network assertion above (zero requests to either host observed from before the first navigation through load), the "no runtime CDN dependency" claim is verified at both the build-output and the runtime level, not asserted in prose. |
| repository root | `git diff --check` | Passed (no output, exit `0`). |
| repository root | `git status --porcelain=v1` | Passed: exactly the 11 task-owned modified paths plus the untracked ADR-0010 file. No unexpected generated or modified file. The production build under `core/target/classes/static/react` is git-ignored build output, and the two regenerated `tests/system/visual-evidence/F-PLATFORM-SHELL/*.png` captures are git-ignored too (`tests/.gitignore` line 33), so neither is a tracked change. |

### Verification Basis

- Baseline: `96bca4826293bf0b04e8b6c9c44b5342b79e1280` (unchanged for the whole task; `git rev-parse HEAD` confirmed at the start of this pass).
- Command coverage:
  - `npm ci`: `core/ui-react/package.json`, `core/ui-react/package-lock.json`.
  - `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`: `core/ui-react/src/app/theme.ts`, `core/ui-react/src/app/theme.test.ts`, `core/ui-react/src/app/AppShell.test.tsx`, `core/ui-react/src/App.tsx`,
    `core/ui-react/src/features/search/history/RecentSearches.test.tsx`, `core/ui-react/vite.config.ts`, `core/ui-react/scripts/validate-production-assets.mjs`, `core/ui-react/package.json`, `core/ui-react/package-lock.json`.
  - `npm run build`, `VITE_OUT_DIR=... npm run build`, and the `dist/assets` listings: `core/ui-react/vite.config.ts`, `core/ui-react/src/App.tsx`, `core/ui-react/src/app/theme.ts`, `core/ui-react/package.json`,
    `core/ui-react/package-lock.json`.
  - `npm run validate:production-assets` (both invocations), the three-step negative gate check, the entry-asset classification confirmation, and the Maven `package` run: `core/ui-react/scripts/validate-production-assets.mjs`,
    `core/src/main/resources/templates/react.html`, `core/ui-react/vite.config.ts`.
  - `npm run check:api`: `core/ui-react/package.json`, `core/ui-react/package-lock.json`.
  - `npm run validate:migration`: additionally `docs/frontend-migration/FEATURES.yaml` and this packet (documentation/registry-only; excluded from the manifest per the template).
  - `npx tsc --noEmit` (`tests/system`) and the `misc/run_gui_systemtest.py` real-backend Playwright run: `tests/system/tests/smoke.spec.ts` plus, through the served production build, all of
    `core/ui-react/src/app/theme.ts`, `core/ui-react/src/App.tsx`, `core/ui-react/vite.config.ts`, `core/src/main/resources/templates/react.html`, `core/ui-react/package.json`, and `core/ui-react/package-lock.json`.
  - `git diff --check`, `git status --porcelain=v1`, the build-output CDN greps, and the `resource-config.json` read have no task-owned implementation or test file coverage of their own beyond the build they inspect.
- File-content manifest (SHA-256):
  - `core/ui-react/src/app/theme.ts: 084df687a2e4f48a473f9eccb8ba8c394c4c23004dff2ea23513663d0be1a34a`
  - `core/ui-react/src/app/theme.test.ts: d2079c4bfe871b758d38085a4d79ee7fd95c8ebd6f9d1ed6ba49c7654e9d0df8`
  - `core/ui-react/src/app/AppShell.test.tsx: c4523743554b1170dca07a8a90794b3b33017be945149d3b27f4e0d3211d1e55`
  - `core/ui-react/src/App.tsx: dc935ac1c37fda73a198d9d47b619f82847fd2024a97bbc7f593119268f2ab65`
  - `core/ui-react/src/features/search/history/RecentSearches.test.tsx: 0a8d2259074eeac2279ef67c8a369d2e59a33f23a917616628e9e0aaee469b24`
  - `core/ui-react/vite.config.ts: ede6182215a7b67c792a8e31c220d415f313f7b95ca1746791314cb4a9392469`
  - `core/ui-react/scripts/validate-production-assets.mjs: 0a93902ed9b93838ff0b1c32fd416a7ea587276415433c135fb240d45a38abb2`
  - `core/src/main/resources/templates/react.html: 67b070dbe59c1dd9009e38ae2fc756d1d8c8ed7957057b2279bf4c4df3109230`
  - `core/ui-react/package.json: d898dd8e6ccd14a653079ba0f48243f7da62d7f89e82671d863a065604c9b211`
  - `core/ui-react/package-lock.json: ab048500036be3fc739fdbcf1b34af706401c94bad60276f38fb645b5f6cdfbb`
  - `tests/system/tests/smoke.spec.ts: 69d3df5bdf7ce7a20b31c16bbeebf9925e30daaff817c1c5fdbf3d5492c08b92`
  - Reused versus regenerated: the first four hashes, plus `package.json`, `package-lock.json`, and `smoke.spec.ts`, are byte-identical to the earlier `blocked` handoff's manifest — those files were not touched in this pass. Their
    *evidence* was nevertheless fully regenerated, because the four files that did change (`RecentSearches.test.tsx`, `vite.config.ts`, `validate-production-assets.mjs`, `react.html`) affect the same commands. No command's result is
    carried over from the earlier run; every row in Verification Evidence above was executed in this pass.
- Completed after the last change to each command's listed files: `yes` for every command listed above. The last implementation/test edit was the `react.html` restore in the negative gate check; every validator invocation, the Maven
  packaging run, and the real-backend Playwright run were executed after it, and the file's SHA-256 is recorded above as its post-restore value.
- Task-owned changes after verification: `None` other than this packet's own Handoff section and `STATUS.md`, both documentation/lifecycle-only.

### Dependency Decisions

- Runtime dependencies added: `@fontsource/ibm-plex-sans@5.3.0` and `@fontsource/ibm-plex-mono@5.3.0`, both pinned exactly, matching this project's convention of exact versions for `@mui/*`, `react`, and `zod`. Both are
  shipped-application packages (webfont files plus their `@font-face` CSS), so `dependencies` is the correct classification per `core/ui-react/AGENTS.md`. They are the vendoring mechanism ADR-0009 names by name, and they are what
  removes the mock's runtime Google Fonts CDN dependency. Unchanged in this pass and re-verified by `npm ci`.
- Development dependencies added, removed, or changed: `None`. ADR-0010's accepted Option A adds no dependency of any kind — the validator still imports only `node:fs/promises` and `node:path`, and no Vite plugin was added (that was
  rejected Option B).

### Architecture Decisions

- **ADR-0010 (accepted, Option A, human decision 2026-08-17)**: applied exactly as its `## Consequences` binds, to exactly the three files it names, without re-deriving or re-litigating the decision. (1) `vite.config.ts` gains an
  `assetFileNames` function pinning the entry stylesheet to `assets/index.css`, unhashed, while every other emitted asset keeps its content hash. (2) `react.html` gains one `<link rel="stylesheet" th:href="@{static/react/assets/index.css}" />`
  in `<head>`, render-blocking, using the same Thymeleaf `@{...}` mechanism as the existing entry `<script>`. (3) `validate-production-assets.mjs` is retargeted onto `core/src/main/resources/templates/react.html` — the file
  `MainWeb.shell()`'s `"react"` view resolves to — and widened from a single hardcoded `assets/index.js` string check to "every emitted, unhashed entry asset exists, is non-empty, and is referenced by that template", failing non-zero
  and naming the offending asset otherwise. The ADR's premise that an unhashed CSS name is safe was confirmed by reading, not assumed: `WebConfiguration.addResourceHandlers` registers `/static/**` with `CacheControl.noCache()` and
  `resourceChain(false)`, and `application.properties` sets `spring.security.headers.cache=false`. That policy was not changed; changing it would invalidate ADR-0010's premise and require revisiting it.
- ADR-0009 (accepted): the mock's `oklch` palette, IBM Plex Sans/Mono typography, and density tokens replace ADR-0007's legacy-grey tokens in `createHydraTheme()`; rolled out shell-first, so every route sees the new look immediately,
  per its disclosed seam. Its "no runtime `fonts.googleapis.com`/`fonts.gstatic.com` dependency in any form" requirement is verified at both build-output and runtime level.
- ADR-0007: superseded for token *values*, preserved for structure (single `createHydraTheme()`, dark-by-default, the `dark-dyschromatopsia` variant spread last). Its `info`/`error` values are deliberately retained (see Assumptions).
- ADR-0001 / ADR-0004: extended, not reopened. The isolated `static/react/` namespace and the Thymeleaf React shell are unchanged; CSS simply joins the asset classes those ADRs require to be explicitly tested, which the retargeted
  validator (Maven `process-resources` and CI) and the real-backend Playwright run now do.
- ADR-0006: `F-PLATFORM-SHELL`'s visual record stays `proposed` with fresh evidence and four `proposed` variances; no human acceptance was fabricated or re-dated.
- ADR-0002: MUI remains the only component system; every theme change is a `theme`/`components.styleOverrides` change, and the CSS-delivery fix adds no component system, router, server-state library, or build plugin.
- `ADR REQUIRED` proposal triggered during this task: `None` in this pass. The earlier pass's Blocker 2 was routed to ADR-0010, which is now accepted and implemented; no new fundamental question arose.

### Assumptions

- **`palette.info`/`palette.error` are deliberately not adopted from the mock — a disclosed decision, not an oversight.** The mock renders neither role anywhere in its markup, so there is no mock evidence to source. ADR-0007's
  `#398da5`/`#a33938` are kept verbatim, and `theme.test.ts` asserts them explicitly so the omission is visible rather than silent. Per the packet's Out Of Scope.
- **`colorSpace: "oklch"` is required, not stylistic.** `@mui/system`'s `decomposeColor` supports only `#nnn`, `rgb()`, `hsl()` and `color()`. Verified directly: with an `oklch()` `primary.main` and no `colorSpace`, rendering a single
  `<MenuItem selected>` throws ``MUI: Unsupported `oklch(0.75 0.1 190)` color`` from `theme.alpha()`, and any `Chip`, hovered `Button`, or selected row would do the same. `@mui/material@7.3.9`'s `colorSpace` option makes MUI emit
  `oklch(from ... l c h / a)` and `color-mix(in oklch, ...)` instead. `theme.test.ts` pins both behaviors.
- **Every palette role spells out its own `contrastText`.** Under `colorSpace`, MUI derives contrast text as `oklch(from <main> var(--__l) 0 h / var(--__a))`, and `--__l`/`--__a` are only defined by the CSS theme-variables build
  (`prepareCssVars`) this app does not use, so the derived value would be an invalid color. `primary.contrastText` is the mock's own `#0e1c1b` (the text color on its teal Search button). `success`/`warning` use MUI's standard
  `rgba(0, 0, 0, 0.87)` — both are light enough that MUI's own rule would pick dark text, and the mock renders no filled success/warning surface to source from. `info`/`error` use `#fff`, exactly what MUI computed for them before this
  change.
- **The `dark-dyschromatopsia` variant is unretuned.** Its seven override values are byte-identical to ADR-0007's and still spread last. Its `contrastText` values are now stated explicitly, but each is the value MUI itself derived for
  that color before `colorSpace` existed (verified by building the pre-change palette and printing them), so the variant renders identically. `theme.test.ts` asserts both the mains and the contrast texts.
- **Mock citations for every chosen density value** (all from `uimock/NZBHydra Search.dc.html`):
  - `shape.borderRadius: 8` and `MuiButton` `borderRadius: 8` — the mock's dominant radius: 21 of its inline styles use `border-radius:8px`, more than all other radii combined, including the primary `<button>Search</button>`, the four
    `<nav>` pills, the toolbar's `Send to downloader`/`Download .zip`/`Display` buttons, and every text `<input>`.
  - `MuiButton` `textTransform: "none"` — the mock labels its buttons `Search`, `Load more results`, `↓ Send to downloader`, `⚙ Display`; never uppercase.
  - `MuiPaper` `borderRadius: 12` for raised, non-square surfaces — the mock's results card, `border-radius:12px` (its only 12px radius; its popover menu is the adjacent 11px). Scoped by `ownerState.square`, which MUI's `AppBar` sets,
    so the shell header keeps square, full-bleed corners.
  - `MuiOutlinedInput` `borderRadius: 8` — the mock's text inputs (`min`/`max` size, age, grabs, seed, and the title filter) are all `border-radius:8px`. Its `<select>` and season/episode wrapper use 11px, the other end of the packet's
    8–11px range; 8px was chosen because MUI renders `TextField`/`Select` through the same `OutlinedInput` root and 8px is what the mock's own `<input>` elements use.
  - `MuiChip` `borderRadius: 7` — the mock's quality and type pills, `border-radius:7px`.
  - `MuiChip` `height: 26` — the same pills are `padding:5px 10px` around a `font-size:12px` monospace label inside a `1px` border: 5 + 5 + 2 + ~14 (12px at the UA's default button line-height) ≈ 26px, against MUI's 32px default.
  - Scrollbar — the mock's `<helmet>` `<style>`: `::-webkit-scrollbar{width:11px;height:11px}`, `::-webkit-scrollbar-thumb{background:#3a4446;border-radius:6px;border:2px solid #1f2426}`, hover `#495456`. The track and the thumb's
    2px border read `palette.background.default` instead of repeating `#1f2426`, so a future palette change needs no edit here.
  - `typography.fontSize` left at MUI's default `14`, which already equals the mock page `<div>`'s own `font-size:14px`.
- **IBM Plex Mono is exposed as an exported constant**, `monoFontFamily` in `theme.ts`, rather than a custom typography variant or `TypographyVariants` module augmentation. Feature code writes `sx={{fontFamily: monoFontFamily}}` on
  whichever element already carries the right variant and semantics; the constant needs no module augmentation and works identically inside `sx`, `styled`, and `components.styleOverrides`. The packet leaves this convention to the
  implementer.
- **One module augmentation was necessary**: `@mui/material@7.3.9` reads `options.colorSpace` in `createThemeNoVars` and exposes it on the theme, but declares it only on the internal `createColorScheme` signature, not on the public
  `ThemeOptions`. `theme.ts` declares the missing option; see Temporary Exceptions And Debt.
- **All six Unicode subsets per weight are vendored** (not just `latin`), matching what the mock's own Google Fonts request serves. `unicode-range` means a browser downloads only the subsets it needs, so this costs build size, not
  runtime bytes.
- **The validator's entry-asset rule keys on the absence of a content hash, not on the file extension.** `/^index\.[^.]+$/` matches exactly the names `vite.config.ts` pins and nothing Vite hashes, so a future route-level code-split
  JS or CSS chunk — which Vite's own module-preload runtime loads, not the template `<link>` — can never be misclassified as an unreferenced entry asset. This is the ADR-0010 risk the ADR asked to be confirmed rather than assumed;
  it is confirmed against this build's real output in the Verification Evidence table (71 emitted files, exactly two matches).
- **The template `<link>`'s `@{...}` base-URL behavior is inherited, not newly reasoned.** It is the identical Thymeleaf mechanism the existing entry `<script th:src="@{static/react/assets/index.js}">` on the adjacent line already uses
  and that FM-004/FM-009 established, so a configured non-root context path or reverse proxy resolves both the same way. The real-backend run serves the app through the JVM's own Thymeleaf rendering, which exercises the resolution.

### Temporary Exceptions And Debt

- **Workaround**: `declare module "@mui/material/styles" { interface ThemeOptions { colorSpace?: string | undefined } }` in `theme.ts`. **Reason**: MUI 7.3.9 implements the option but does not type it publicly. **Impact**: none at
  runtime; a one-property, narrowly scoped augmentation with the evidence recorded in a comment beside it. **Removal condition**: delete once `@mui/material` declares `colorSpace` on `ThemeOptions`. **Tracking**: this handoff entry.
- **Debt**: `@fontsource` ships a `.woff` fallback beside every `.woff2`, so the build emits 34 of each (2.0 MB of `dist/assets` total). Every browser that supports the `oklch()` palette this theme requires also supports `woff2`, so
  the `.woff` half is dead weight. **This is explicitly not retired by ADR-0010's accepted Option A** — the ADR records that only the rejected Option C would have retired it as a side effect — and it was deliberately not folded into
  this task's scope. **Removal condition**: a separate, independently scoped change that declares the `@font-face` rules directly (or otherwise filters the `.woff` files) instead of importing `@fontsource`'s full CSS. **Tracking**:
  this handoff entry and Follow-Up Work below.
- **Debt**: the coupling between the hand-maintained Thymeleaf template and Vite's output filenames is now *checked* rather than eliminated — ADR-0010 records this as an accepted cost of Option A, with rejected Option D (a Vite
  manifest rendered by Spring) as the alternative that would have removed it. **Removal condition**: a future decision to revisit ADR-0010, which its own text ties to any change of the `/static/**` `noCache()` caching policy.
  **Tracking**: ADR-0010's `## Consequences`.

### Registry And Documentation Updates

- `FEATURES.yaml` `F-PLATFORM-SHELL`: `visual` updated (by the prior pass; unchanged in this pass and now backed by passing evidence). `target`, `tests`, `parity`, `gaps`, `task`, and `backlog` intentionally unchanged — this task
  changes no route ownership, adds no test file (it edits the already-listed `tests/system/tests/smoke.spec.ts`), closes none of the record's `gaps` (navigation, footer, permission-aware links, live status), and leaves the deferred
  backlog rationale accurate. `selectors` intentionally unchanged: this task adds, removes, and renames no `data-testid`.
- `COMPONENTS.yaml` `C-APP-SHELL`: intentionally not modified at all. `state` stays `partial`, and correctly so — the record's own deferred backlog (footer branding, live-status integration) is untouched by a token change, so promoting
  it would be a false completion claim. `responsibility`, `target`, `consumers`, `classification`, `task`, and `backlog` likewise intentionally unchanged.
- ADR-0006 visual record for `F-PLATFORM-SHELL`: `applicability: applicable`, unchanged. Lifecycle `status` stays `proposed` — **no transition** (it has not been human-accepted since FM-035 removed the prior acceptance). Scoped states
  go from five to six with the new `branded-typography-and-density`; viewports unchanged (desktop 1280x800, mobile 390x844); geometry checks keep all five prior checks — the active-nav-item color literal updated from `#0fab4b` to
  `oklch(0.75 0.1 190)` — and add four: AppBar font-family plus a `loaded` IBM Plex Sans FontFace, an IBM Plex Mono FontFace served by the app, AppBar background distinct from the page background, and zero
  `fonts.googleapis.com`/`fonts.gstatic.com` requests. All nine now produce **passing** evidence, at both viewports, in the real-backend run — which was the one thing the earlier pass could not deliver. `evidence` unchanged
  (`tests/system/tests/smoke.spec.ts`); `snapshots` unchanged (the two existing narrow AppBar region captures, regenerated by this run at `tests/system/visual-evidence/F-PLATFORM-SHELL/app-bar-{desktop,mobile}.png`; that directory is
  git-ignored). Variance disposition: the prior primary-green variance is retained and superseded in place by a note explaining that `primary.main` is now the mock's teal, and three new `proposed` variances record the palette, the
  typography, and the density tokens as having no legacy equivalent; all four are `proposed`. **Human acceptance pending** — no acceptance metadata was written, invented, or re-dated, and none is implied by this handoff. No behavioral
  or accessibility gate is implied by any of this visual evidence: the behavioral gates are `npm run test -- --run` (210/210) and the smoke spec's own functional assertions, and the build/packaging gate is
  `npm run validate:production-assets` — all reported separately above.
- `STATUS.md`: FM-043 moved from Active/`in_progress` to Review.
- ADR-0010 (`docs/frontend-migration/decisions/ADR-0010-react-production-css-delivery.md`) is untracked working-tree output from this same task's ADR-proposer pass; this implementation neither edited nor re-dated it.

### Follow-Up Work

- Retire the `.woff` duplication debt (34 redundant files, roughly half of `dist/assets`' 2.0 MB) in its own scoped change. Explicitly out of scope here per ADR-0010, which records that accepted Option A does not retire it.
- Consider a repository-wide convention that feature tests assert against theme tokens rather than hardcoded color literals, so the next palette change does not break unrelated specs — `RecentSearches.test.tsx` was the only such
  breakage this time, but the pattern will recur as later ADR-0009 packets land.
- FM-039/FM-040's search-page work was built against the now-superseded ADR-0008 Option B look and will need the remediation pass `STATUS.md` already notes, now that the palette and density tokens have landed.
- Consider extending `validate-production-assets.mjs` in the opposite direction as well — failing when the template references an asset the build did **not** emit. ADR-0010 marks this a permitted, routine addition rather than a
  requirement, so it was deliberately left out of this change's minimal diff.

## Fresh Review

Recorded by the coordinator on behalf of the fresh reviewer, whose role has no write tools. The substance below is the reviewer's own; the coordinator transcribed it without altering findings, verdict, or disclosed limitations.

### Review Identity

- Reviewer: fresh `migration-reviewer` subagent (independent; implemented no part of this task)
- Role: fresh reviewer
- Reviewed revision: working tree at baseline `96bca4826293bf0b04e8b6c9c44b5342b79e1280` plus the uncommitted task diff (HEAD unchanged, confirmed via `git rev-parse HEAD`)
- Implementation handoff revision: this packet's second (`review`) Handoff section

### Acceptance And Evidence Audit

All 12 acceptance items (6 original, 6 added by the mid-task ADR-0010 refinement) pass, independently re-verified rather than accepted from the handoff:

- Base palette: every literal checked directly against the mock — `#1f2426`, `#262c2e`, `#d6dad9`, `#9aa2a1`, `oklch(0.75 0.1 190)` (header logo/button), `oklch(0.82 0.1 190)`/`oklch(0.85 0.1 190)` (chip-text and `a:hover` variants), `oklch(0.75 0.11 150)` (status dot), `oklch(0.76 0.1 70)` (the mock's own `AMBER` constant). `info`/`error` correctly left at ADR-0007 values, matching the Out Of Scope disclosure rather than being an oversight.
- Typography: `fontFamily` matches the mock's inline style exactly; `fontSize` untouched at `14`; `monoFontFamily` exported constant is a convention the packet explicitly left to the implementer.
- Density: `shape.borderRadius: 8` — the reviewer independently counted `border-radius:8px` in the mock at **21** occurrences, matching the handoff's cited count exactly; `12px` at **1** (Paper), `7px` at **9** (chip pills). `MuiPaper`'s radius is gated on `!square && elevation > 0`, keeping the AppBar square.
- Scrollbar and `:focus-visible`: the `:focus-visible` block is byte-identical to before; new scrollbar rules match the mock's `<style>` block (`width`/`height` `11px`, thumb `#3a4446`/`#495456`, `border-radius: 6px`), reading `palette.background.default` rather than repeating a literal.
- `dark-dyschromatopsia`: seven override values byte-identical to ADR-0007; only `contrastText` added, now asserted explicitly.
- `AppShell.tsx` confirmed untouched and containing no hex/rgb/oklch literal, so the claim that the AppBar picks up the new tone with zero file edit is verified structurally, not merely asserted.
- ADR-0010 items: rebuilt from scratch — `dist/assets` holds exactly one `.css` (`index.css`, 12.30 kB), unhashed `index.js`, 68 hashed fonts, 71 files total, reproducing the handoff exactly. The `<link>` sits at line 10 inside `<head>`, before `</head>` and before the body's entry `<script>` — render-blocking placement confirmed by direct file read, not from the diff alone. The validator resolves the real template relative to `core/ui-react`; the reviewer ran it with an arbitrary `VITE_OUT_DIR` outside the repository and it still located the correct template. Exactly 2 of 71 emitted files match `/^index\.[^.]+$/`, so no hashed font or future code-split chunk can be misclassified.
- Fonts and CDN: the built `dist/assets/index.css` genuinely contains `@font-face` rules with `src: url(./ibm-plex-sans-…)` — real file-based CSS, not only CSS-in-JS — and `grep` for `fonts.googleapis.com`/`fonts.gstatic.com` over build output returns no match.
- Native-image metadata: `resource-config.json`'s `{"pattern": "static/.*"}` confirmed by reading; file unmodified.

Verification-basis reconciliation: the reviewer reran or cross-checked every cheap, deterministic command, all matching the handoff — `test -- --run` 210/210 across 38 files; `typecheck` clean; `lint` 0 errors and the same 7 pre-existing warnings in the same three files; `format:check` flagging the same 11 pre-existing out-of-scope files with task-owned files clean; `check:api`, `validate:migration`, `build` (identical output sizes), `validate:production-assets` under both invocations, `tests/system` `tsc --noEmit`, `git diff --check`, and `git status`. All 11 SHA-256 hashes in the handoff's file-content manifest were independently recomputed and match. The negative gate was reproduced independently in an isolated scratch copy that never touched the tracked `react.html`: both the misspelled-link and no-link cases exit 1 with the expected message, and the restored file hashes to `67b070db…09230`, byte-identical to the recorded value.

Disclosed limitation, recorded as a limitation and not a finding: the reviewer did not rerun the Maven `package` build or the real-backend `misc/run_gui_systemtest.py` Playwright/Docker run, judging them expensive under the task's evidence-reuse guidance given that every other independently checkable layer — including a byte-for-byte negative-gate hash and the full 11-file manifest — matched exactly, and given the CSS-build and `<head>`-wiring evidence above. No evidence was found casting doubt on those runs.

Scope reconciliation: all 14 attributable paths are within Files Allowed To Modify, and each per-file inline constraint was verified by direct diff inspection rather than from the handoff's prose — `vite.config.ts` purely additive with `entryFileNames`/`plugins`/`define`/`test` untouched; `react.html` exactly one added line; `validate-production-assets.mjs` retaining its license header, `VITE_OUT_DIR ?? "dist"` resolution, and node-builtin-only imports; `RecentSearches.test.tsx` a single-line literal swap; `AppShell.test.tsx` only the one color assertion and its comment; `package.json`/`package-lock.json` only the two `@fontsource` entries; `App.tsx` only the CSS side-effect imports and a comment; `FEATURES.yaml` a single hunk entirely inside the `F-PLATFORM-SHELL` block, confirmed via `id:` boundaries. `COMPONENTS.yaml` deliberately untouched — a token-only change does not justify promoting `C-APP-SHELL`'s `partial` state.

Registry reconciliation: `F-PLATFORM-SHELL.visual.status` remains `proposed`, with no fabricated or re-dated acceptance anywhere in the diff. The prior primary-green variance is retained and superseded in place rather than deleted; three new `proposed` variances cover palette, typography, and density, and disclose the `info`/`error` non-adoption. `gaps`, `target`, `tests`, `selectors`, `task`, and `backlog` are unchanged.

Visual-contract audit: setup, viewports (1280×800 and 390×844), and geometry checks in the `contract` block match `smoke.spec.ts`'s actual assertions one-for-one, including the new `branded-typography-and-density` state. No baseline and no retrospective human acceptance was introduced; both the registry and `STATUS.md` state that acceptance remains pending.

### Findings

None required.

Optional observations, retained deliberately and not treated as corrections:

- The real-backend Playwright/Docker system test and `mvn package` were not re-executed by the reviewer (see the disclosed limitation above). Anyone wanting zero residual doubt on the live font-loading assertion can rerun `python3 misc/run_gui_systemtest.py --runtime local -- tests/smoke.spec.ts`.
- `MuiTextField` is not separately styled, only `MuiOutlinedInput`. This is a sound simplification because MUI routes `TextField`'s outlined variant and `Select` through `OutlinedInput`'s root, and this packet's Assumptions section already discloses the rationale — not a gap.

### Resolution

- Resolution evidence for each finding: None (no findings).
- Review disposition: `accepted`.

### Coordinator Completion

- Coordinator: `fm-orchestrate` coordinator session
- Decision: `mark done` — PASS with no required findings; the two optional observations are retained, not corrected.
- Decision revision/date: recorded against baseline `96bca4826293bf0b04e8b6c9c44b5342b79e1280` on 2026-08-17; the task-boundary commit SHA follows this record.

### Human Visual Acceptance

Still outstanding and outside technical review. `F-PLATFORM-SHELL`'s visual record stays `proposed`; per ADR-0006 neither the implementer nor the reviewer can supply that acceptance, and the coordinator did not supply it either.
