# ADR-0010: React Production CSS Delivery

Status: accepted (Option A — pin the CSS asset name, `<link>` it from `react.html`, and retarget the asset validator onto the real Thymeleaf template; chosen by explicit human decision on 2026-08-17. Options B, C, D, and E were not chosen.)

## Decision Question

How must CSS emitted by the React Vite build reach the browser in production, given that `core/src/main/resources/templates/react.html` — the Thymeleaf shell Spring actually serves for every React route — references only `static/react/assets/index.js` and
links no stylesheet at all, so the Vite-emitted CSS bundle is built, packaged, and never loaded?

This is a shared build/runtime-delivery boundary, not a task-local styling detail: it governs every current and future task that imports any CSS (webfonts today, any third-party or authored stylesheet later), the production HTML template that is hand-maintained
outside `core/ui-react`, the Maven/CI asset-validation gate, and the packaging paths ADR-0001 and ADR-0004 require to be explicitly tested.

## Context And Evidence

Every fact below was read directly from the repository at baseline `96bca4826293bf0b04e8b6c9c44b5342b79e1280` (branch `newUi2026`), including the uncommitted FM-043 working-tree changes, which were read as evidence and not modified.

- **The production shell links no stylesheet.** `core/src/main/resources/templates/react.html` is 19 lines. Its `<head>` (lines 3-11) contains `<title>`, `<base th:href="${session.baseUrl}"/>`, three `<meta>` tags, and a favicon `<link rel="shortcut icon">` —
  no `<link rel="stylesheet">` of any kind. Its only script asset is line 17, `<script type="module" th:src="@{static/react/assets/index.js}"></script>`. By contrast the legacy shell `core/src/main/resources/templates/index.html` links three
  stylesheets (lines 9-11: `static/css/alllibs.css`, `${session.cssUrl}`, `static/css/additional.css`), so the omission is specific to the React shell, not a project-wide convention.
- **That template is what Spring serves for React.** `core/src/main/java/org/nzbhydra/web/MainWeb.java` returns the view name `"react"` from `shell(HttpServletRequest)` (line 139), which backs the `/`, `/config/**`, `/system/**`, and `/stats/**` mappings
  (lines 42, 56, 63, 70), and again from `index2` for `/login` (line 49). There is no second React shell template.
- **Vite's own `index.html` — which does link the CSS — is dead weight in production.** The build writes `index.html` into the output directory, but nothing serves it: `core/pom.xml`'s `build-react-assets` execution (lines 80-97) runs `npm run build` with
  `VITE_OUT_DIR=../target/classes/static/react` in the `generate-resources` phase, so the whole `dist` tree lands on the classpath under `static/react/`, and Spring renders `react.html` instead. The correct `<link>` therefore exists in the build output and
  is never used.
- **The existing asset-validation gate structurally cannot catch this.** `core/ui-react/scripts/validate-production-assets.mjs` resolves `outputDirectory` from `VITE_OUT_DIR` (line 20), asserts `assets/index.js` exists and is non-empty (lines 21, 24-27),
  then reads `index.html` *from the output directory* (line 22) and asserts only that it contains the string `assets/index.js` (lines 29-34). It validates Vite's unused HTML, not the Thymeleaf template production serves, and it says nothing about CSS. It runs
  from `core/pom.xml` (`validate-react-assets`, `process-resources` phase, lines 98-115) and from `.github/workflows/frontend-ci.yml` (lines 40-41, against `dist/` since CI sets no `VITE_OUT_DIR`). This gap in the gate is why the defect stayed latent, and it
  is a defect under every option below.
- **FM-043 emitted the first CSS the React bundle has ever produced.** In the working tree, `core/ui-react/src/App.tsx` lines 6-11 add six `@fontsource` CSS side-effect imports (`ibm-plex-sans/400|500|600|700.css`, `ibm-plex-mono/400|500.css`);
  `core/ui-react/package.json` lines 27-28 add `@fontsource/ibm-plex-mono@5.3.0` and `@fontsource/ibm-plex-sans@5.3.0`. A repository-wide search finds no other `.css` import under `core/ui-react/src`, no `.css` file in the source tree, and no
  `core/ui-react/public` directory at all. Before FM-043 the bundle emitted zero CSS assets, so the missing `<link>` had no observable effect.
- **The failure is confirmed at runtime, not inferred.** FM-043's handoff records `npm run build` emitting `assets/index.js` (1,001.59 kB) plus `assets/index-DeiNn2EO.css` (12.30 kB) and 68 font files, and the real-backend run
  (`python3 misc/run_gui_systemtest.py --runtime local -- tests/smoke.spec.ts`) failing 2/3 at `tests/system/tests/smoke.spec.ts` line 79, `expect(loadedFontFamilies).toContain("IBM Plex Sans")` with `Received array: []`. The AppBar's computed `font-family`
  still contained `"IBM Plex Sans"` (line 69 passes) because Emotion injects theme CSS at runtime through the JS path that does work — so the theme is correct and only file-based CSS is undelivered. The later assertions in that spec (IBM Plex Mono declared,
  AppBar-vs-page background, zero `fonts.googleapis.com`/`fonts.gstatic.com` requests at lines 103-106, and the whole desktop nav geometry block) never executed and remain unverified.
- **The entry JS is already deliberately unhashed, and content hashes buy nothing in this deployment.** `core/ui-react/vite.config.ts` line 18 pins `entryFileNames: "assets/[name].js"` precisely so `react.html` can hardcode the path; CSS and other assets
  keep Vite's default content hash. And `core/src/main/java/org/nzbhydra/web/WebConfiguration.java` lines 82-85 register `/static/**` with `.setCacheControl(CacheControl.noCache())` and `.resourceChain(false)` — no versioned-resource resolver, no
  far-future caching. `core/src/main/resources/config/application.properties` line 104 additionally sets `spring.security.headers.cache=false`. Content-hashed filenames are therefore not this application's cache-busting mechanism; revalidation is. Pinning a
  CSS filename costs no cache correctness that the entry JS has not already given up by accepted precedent (ADR-0001/FM-004/FM-009).
- **The external static override and packaging paths depend on predictable asset paths.** `WebConfiguration.addResourceHandlers` prepends `<dataFolder>/static` ahead of `classpath:/static/` when it exists (lines 68-81), and
  `docker/uiDev/start.sh` (lines 41, 46) builds and watches into that folder with `VITE_OUT_DIR`. `core/src/test/java/org/nzbhydra/web/WebConfigurationTest.java` (lines 53-55, 67, 79-81) already exercises `/static/react/assets/index.js` for both packaged and
  external-override cases, and `.github/workflows/buildNative.yml` (lines 144, 173) smoke-checks the same URL. Native-image resource inclusion is generic — `core/src/main/resources/META-INF/native-image/resource-config.json` line 23 matches
  `"static/.*"` — so a CSS asset needs no new native metadata, but it does need the same explicit deployment-path testing `CONTEXT.md` ("Build And Packaging") and ADR-0004 require of packaging behavior.
- **Dev and production diverge structurally, and only production is unverified.** `vite dev` serves `core/ui-react/index.html` (its `<head>` has no stylesheet either) and injects CSS through the module graph, so fonts work in development;
  `core/ui-react/vite/devBackend.ts` proxies `/internalapi`, `/static`, `/ui`, `/websocket` etc. to a real backend and injects the bootstrap, but it never exercises `react.html`. Any fix must therefore be validated by a build/packaging check or a real-backend
  system test, not by development observation.
- **No dependency exists for the inlining option.** A repository-wide search finds no `cssCodeSplit` or `cssInjected` occurrence and no `vite-plugin-css-injected-by-js` in `core/ui-react/package.json`. Vite's own `build.cssCodeSplit: false` merges CSS into a
  single file; it does not inline CSS into the JS bundle, so Option B genuinely requires a new third-party build plugin.
- **Ownership crosses two completed tasks.** `react.html` is owned by FM-004 (`Files Allowed To Modify`, line 67) and `validate-production-assets.mjs` by FM-009 (line 69), both `done`. FM-043's `Files Allowed To Modify` (lines 33-39) includes neither, which
  is exactly why its implementer stopped and reported the boundary rather than editing them (FM-043 Handoff, Blocker 2, line 132; Follow-Up Work, line 236; `STATUS.md` lines 13-16). No planned packet currently covers this fix.
- **Relationship to accepted ADRs, verified rather than assumed.**
  - `ADR-0002-frontend-stack.md` (accepted) fixes MUI as the only general visual component system and requires an ADR only for a competing framework or consequential runtime choice. None of the options below adds a component system, a router, or a
    server-state library; Options A, C, and D add no dependency at all, and Option B's plugin is build tooling. **This ADR does not reopen ADR-0002.**
  - `ADR-0009-mock-fidelity-visual-redesign.md` (accepted) requires self-hosted/vendored IBM Plex with "no runtime dependency on `fonts.googleapis.com`/`fonts.gstatic.com` ... in any form", and explicitly leaves the "exact vendoring mechanism ... implementation
    detail". Every option below keeps the fonts self-hosted and CDN-free. **This ADR does not reopen ADR-0009**; it decides only how self-hosted CSS is delivered, which ADR-0009 left open and which turned out to be a shared boundary rather than a task detail.
  - `ADR-0001-react-placement-and-ui-switch.md` (accepted) already fixes the isolated `static/react/` namespace, the Thymeleaf React shell, and the requirement that "Base URL, external static override, JAR packaging, and native resource inclusion require
    explicit tests"; `ADR-0004-testing-and-parity.md` (accepted) assigns packaging and configured-base-path proof to Playwright/Java system tests. This ADR **extends** both by adding CSS to the asset classes they cover; it reverses neither.
  - `ADR-0006-visual-parity-policy.md` (accepted) is untouched: this decision changes no visual contract, though `F-PLATFORM-SHELL`'s proposed `branded-typography-and-density` state cannot produce passing evidence until it is resolved.
- **FM-043's second blocker is not part of this question.** Blocker 1 (`core/ui-react/src/features/search/history/RecentSearches.test.tsx` asserting the superseded `text.secondary` literal `#7a8288`) is a one-literal, task-scope widening with a clear
  conventional answer. It is named here only so the human is not asked to decide it: it needs no ADR.

## Options

### Option A (chosen): Pin the CSS asset name, link it from `react.html`, and validate the template that production actually serves

- In `core/ui-react/vite.config.ts`, give `rollupOptions.output.assetFileNames` a function that pins CSS to `assets/index.css` while leaving fonts and other assets content-hashed, mirroring the existing deliberate `entryFileNames: "assets/[name].js"` pin
  (line 18). Add `<link rel="stylesheet" th:href="@{static/react/assets/index.css}"/>` to `react.html`'s `<head>`, resolved through the same Thymeleaf `@{...}` base-URL mechanism the existing script tag uses, so configured non-root context paths keep working.
- Extend `scripts/validate-production-assets.mjs` from "the entry JS exists and Vite's own HTML mentions it" to "every emitted top-level entry asset exists, is non-empty, and is referenced by `core/src/main/resources/templates/react.html`" — i.e. validate the
  file production serves, and fail the build when the bundle emits a CSS asset the template does not link. This runs already in `core/pom.xml`'s `process-resources` phase and in `frontend-ci.yml`, so the check lands on both the Maven and CI paths with no new
  wiring.
- Benefits: the only option that closes the gap for **all** CSS rather than fonts specifically, so no future task can silently ship an unloaded stylesheet; zero per-task maintenance afterwards (a new CSS import just joins the existing bundle); a render-blocking
  `<link>` in `<head>` starts the CSS and webfont fetch before the ~1 MB entry module parses, which is the best flash-of-unstyled-text behavior of the four; adds no dependency and no backend Java; converts a class of bug that today costs a full real-backend
  Playwright cycle to discover into a build failure at `process-resources`; the conventional Vite/server-rendered-shell arrangement, so it needs no bespoke explanation to a future maintainer.
- Costs: keeps the hand-maintained coupling between a Thymeleaf template and Vite's output filenames — the validation gate makes that coupling checked rather than eliminating it; gives up content hashing for the CSS asset, though `noCache()` +
  `resourceChain(false)` mean this deployment never used content hashes for cache-busting and the entry JS already made the same trade; requires a task whose `Files Allowed To Modify` spans `core/ui-react` and `core/src/main/resources`, reopening two `done`
  tasks' files (FM-004's template, FM-009's validator); route-level code-split CSS from any future dynamically imported chunk is loaded by Vite's own module-preload runtime rather than by this `<link>`, which should be confirmed at implementation time rather
  than assumed, and the widened validator must not mistake such a chunk asset for an unreferenced entry asset.

### Option B: Inline all CSS into the JS bundle, so the template never needs an asset link

- Add a Vite build plugin that injects the bundled CSS from JavaScript (`vite-plugin-css-injected-by-js` or equivalent). `react.html` stays exactly as it is, forever, for any CSS any future task imports. Note that Vite's built-in `build.cssCodeSplit: false`
  alone does **not** achieve this — it merges CSS into one emitted file that still needs loading — so this option necessarily adds a third-party plugin that does not exist in `package.json` today.
- Benefits: structurally removes the template/filename coupling instead of validating it, so no future CSS import can regress it and no build check is needed to protect the invariant; makes production behave like `vite dev` (CSS arriving through the module
  graph), eliminating the dev/prod divergence that hid this defect; a purely `core/ui-react`-local change, touching no Spring template, no Java, no pom.
- Costs: CSS applies only after the ~1 MB entry module has downloaded, parsed, and executed, so `@font-face` registration and every rule are strictly later than Option A's render-blocking `<link>` — a real flash of unstyled text on the shell that this app
  does not have today; inflates the entry bundle that FM-043 already recorded at 1,001.59 kB by the full CSS payload; introduces a third-party plugin on the critical packaging path (Maven `generate-resources` and both CI workflows) whose maintenance is outside
  this project's control, for a problem the platform can solve with a `<link>` tag; and it leaves `validate-production-assets.mjs` still validating Vite's unused `index.html` — the underlying "nothing checks the template production serves" defect survives,
  merely with nothing currently riding on it.

### Option C: Declare `@font-face` in `theme.ts` against `woff2` asset imports, and forbid build-emitted CSS

- Drop the six `@fontsource` CSS imports from `App.tsx`, import the `@fontsource/*/files/*.woff2` files as Vite URL assets, and declare the `@font-face` blocks in `theme.ts`'s `MuiCssBaseline.styleOverrides` — MUI's documented self-hosted-font recipe — so
  Emotion injects them at runtime through the JS path that demonstrably works. To be coherent rather than merely lucky, pair it with a build check that **fails** when the bundle emits any CSS asset at all, making "all styling flows through MUI/Emotion" an
  enforced project invariant rather than an accident.
- Benefits: fixes the fonts with no template change, no filename pin, and no new dependency; the enforced no-CSS-assets invariant is a defensible reading of ADR-0002's MUI-only boundary and gives future tasks an immediate, cheap build error instead of a silent
  production-only failure; incidentally retires the debt FM-043 recorded, since hand-written `@font-face` blocks can declare `woff2` only and drop the 34 redundant `.woff` files (roughly half of the 2.0 MB `dist/assets` total).
- Costs: replaces a maintained upstream package's CSS with hand-maintained `@font-face` declarations — six family/weight combinations across up to six Unicode subsets each, i.e. ~36 blocks with their `unicode-range` values, or a reduction to the `latin` subset
  that silently drops the non-Latin coverage FM-043 deliberately vendored; fonts still register only after React mounts and `CssBaseline` renders, later than Option A and no earlier than Option B; and the general capability is not restored but formally
  removed — any future need for real CSS (a third-party component stylesheet, a print stylesheet, a `@keyframes` file, an `@layer` ordering fix) reopens exactly this decision. It answers ADR-0009's font requirement while narrowing the platform.

### Option D: Emit a Vite manifest and render the asset tags from it in Spring

- Enable `build.manifest`, restore content hashes on every asset including the entry JS, add a small Spring component that reads `static/react/.vite/manifest.json` and exposes the entry's JS/CSS URLs as model attributes, and have `react.html` render its
  `<script>` and `<link>` from those attributes.
- Benefits: no hardcoded filename anywhere, so the template is correct for any asset class any future build emits — the most future-proof of the four; restores genuine content-hash cache-busting for all assets; a single mechanism covering JS, CSS, and anything
  later.
- Costs: the cache-busting it buys is worth nothing today, because `/static/**` is served `CacheControl.noCache()` with `resourceChain(false)` (`WebConfiguration.java` lines 82-85) — realizing the benefit means also changing the caching policy, widening this
  decision into one about HTTP caching for the whole static namespace; adds Java code, a new failure mode (manifest missing or stale), a native-image resource entry for the manifest, and Java test coverage, plus interaction with the external
  `<dataFolder>/static` override where a manifest and its assets could disagree; and it is the largest change of the four, spending backend complexity on a frontend delivery problem a `<link>` tag solves.

### Option E: Defer — leave the gap and drop FM-043's font requirement

- Recorded for completeness per this migration's ADR template, not as a live alternative. Deferring leaves `document.fonts` empty in production, so ADR-0009's accepted self-hosted IBM Plex typography is not actually delivered, FM-043 stays `blocked`, and
  FM-044/FM-045 stay blocked behind it. It also leaves the underlying trap armed for the next task that imports any CSS. It contradicts an accepted ADR and fixes nothing.

## Recommendation

Recommend **Option A**, with the validator widened to check `react.html` (not Vite's unused `index.html`) regardless of which option is chosen. A recommendation is not a decision.

This recommendation was subsequently accepted: the repository owner explicitly selected Option A on 2026-08-17, including the validator retarget. The reasons below are retained as the proposer's reasoning at the time of proposal and are
**not** attributed to the owner, who gave no rationale beyond the selection itself. See `## Human Decision`.

Reasons, each grounded in a verified repository fact rather than general preference:

1. It is the only option that closes the gap for **all** CSS. Options B and D also do so mechanically, but Option C explicitly does not, and the cost of getting this wrong is measured: one blocked task and one full real-backend Playwright cycle to discover a
   defect that shipped through `npm run build`, `npm run validate:production-assets`, Maven packaging, and CI without a single failure.
2. Pinning the CSS filename costs nothing here. `/static/**` is served `CacheControl.noCache()` with `resourceChain(false)`, so content hashes are not this deployment's cache-busting mechanism, and `vite.config.ts` line 18 already made exactly this trade for
   the entry JS under ADR-0001's accepted arrangement. Option D's main advantage is therefore hypothetical until a separate, wider decision changes the caching policy.
3. A render-blocking `<link>` in `<head>` requests the CSS and its webfonts before the 1,001.59 kB entry module executes. Options B and C both defer font registration behind that module, which is a visible flash-of-unstyled-text regression for the shell —
   the very typography ADR-0009 accepted.
4. It adds no dependency and no backend code, so it sits inside ADR-0002's boundary without argument and does not put a third-party build plugin on the Maven and CI packaging path.
5. The validator extension is the durable part. The root defect is that the only automated asset check validates a file production never serves; fixing that turns this whole class of bug into a `process-resources` build failure, and it is worth doing under
   Options B, C, and D too.

## Human Decision

- **Decision-maker:** the repository owner.
- **Date:** 2026-08-17.
- **Selected option:** Option A — pin the CSS filename in `core/ui-react/vite.config.ts`, add a `<link rel="stylesheet">` to `core/src/main/resources/templates/react.html`, and extend
  `core/ui-react/scripts/validate-production-assets.mjs` to check the real template (`core/src/main/resources/templates/react.html`, the file Spring actually serves) instead of the Vite output's unused `index.html`. The owner was presented
  with the decision question and the viable options A, B, C, and D, with Option A marked as the proposer's recommendation, and explicitly selected Option A.
- **Shape presented to and accepted by the owner:**

  ```
  vite.config.ts:  assetFileNames -> "assets/index.css" (pinned, unhashed)

  react.html:
    <link rel="stylesheet" th:href="@{static/react/assets/index.css}" />
    <script type="module" th:src="@{static/react/assets/index.js}"></script>

  validate-production-assets.mjs:
    validate templates/react.html (the file Spring serves)
    instead of the Vite output's unused index.html
  ```

- **Conditions and caveats:** none. The owner added no conditions, caveats, or qualifications beyond the selection and the shape recorded above. Nothing further may be attributed to the owner; the reasoning in `## Recommendation` is the
  proposer's, not the owner's.
- **Validator retarget is in scope of this accepted decision.** The proposer's standing recommendation — that `validate-production-assets.mjs` be widened to check `react.html` rather than Vite's unused `index.html` regardless of which
  option was chosen — is carried forward and is not a separate follow-up: it is an explicit part of the accepted Option A shape above. The root defect is that the only automated asset check validates a file production never serves, and the
  accepted decision closes it.
- Options B (inline CSS into the JS bundle via a third-party Vite plugin), C (`@font-face` in `theme.ts` plus a build check forbidding emitted CSS), and D (Vite manifest rendered by Spring) were the other viable options presented, and
  were **not** selected. Option E (defer) was never a live alternative — it was recorded only for completeness per this migration's ADR template — and is likewise not selected. All four are retained above with their full trade-offs as
  recorded history, per this migration's ADR process: the reasoning is the value of this record, not only the outcome. None of them governs implementation.

## Consequences

These are the consequences the **accepted** Option A now imposes. They are binding on the implementing task; the task designer and implementer should act on them without re-deriving the analysis. Consequences that were contingent on the
rejected options are marked as such and are now moot.

- **Pinned, unhashed CSS filename.** `core/ui-react/vite.config.ts` gains an `assetFileNames` rule resolving the CSS entry to `assets/index.css` — pinned and content-hash-free — while leaving font and other emitted assets content-hashed.
  This mirrors the deliberate `entryFileNames: "assets/[name].js"` pin already on line 18.
- **Unhashed is safe here because of the caching policy, not by accident.** `core/src/main/java/org/nzbhydra/web/WebConfiguration.java` lines 82-85 register `/static/**` with `.setCacheControl(CacheControl.noCache())` and
  `.resourceChain(false)` — no versioned-resource resolver and no far-future caching — and `core/src/main/resources/config/application.properties` line 104 sets `spring.security.headers.cache=false`. Revalidation, not content hashing, is
  this deployment's cache-busting mechanism, which is precisely what makes a pinned CSS name correct rather than a regression. **Any future change to that `/static/**` caching policy invalidates this premise and must revisit this ADR**,
  because a cached-forever `assets/index.css` would serve stale styling.
- **Template `<link>`.** `core/src/main/resources/templates/react.html` gains one `<link rel="stylesheet" th:href="@{static/react/assets/index.css}"/>` in `<head>`, using the same Thymeleaf `@{...}` base-URL mechanism as its existing
  `<script type="module" th:src="@{static/react/assets/index.js}"></script>` so configured non-root context paths and reverse proxies keep working per `CONTEXT.md`'s runtime contracts. It belongs in `<head>` as a render-blocking link;
  that placement is the flash-of-unstyled-text property this option was chosen for, not an incidental detail.
- **Validator retargeted onto the real template.** `core/ui-react/scripts/validate-production-assets.mjs` changes target: it must read `core/src/main/resources/templates/react.html` rather than the output directory's `index.html`, and must
  fail the build when an emitted entry asset is unreferenced by that template. It resolves that path from `core/ui-react`, so the path traversal must work under both invocations that exist today — Maven's
  `VITE_OUT_DIR=../target/classes/static/react` (`core/pom.xml` `validate-react-assets`, `process-resources`) and CI's default `dist/` (`.github/workflows/frontend-ci.yml` lines 40-41). This is in scope of the accepted decision, not a
  follow-up. The widened check must not misclassify a route-level code-split CSS chunk — loaded by Vite's own module-preload runtime rather than by the template `<link>` — as an unreferenced entry asset; confirm that behavior at
  implementation time rather than assuming it.
- The change is verifiable only against a real production path. Development observation is not evidence, because `vite dev` serves a different HTML file entirely. Per ADR-0004 and `CONTEXT.md`'s packaging requirements, acceptance evidence must include the
  real-backend Playwright run (`misc/run_gui_systemtest.py --runtime local -- tests/smoke.spec.ts`), whose existing assertions at `tests/system/tests/smoke.spec.ts` lines 69-87 and 103-106 already encode the correct pass condition, plus the packaged-JAR and
  external-static-override paths FM-009 established.
- No native-image metadata change is expected: `resource-config.json` line 23 already matches `static/.*` generically. This should be confirmed, not assumed, in the implementing task.
- FM-043 becomes unblockable on its Blocker 2 once implemented; its Blocker 1 (one stale color literal in `RecentSearches.test.tsx`) is independent of this decision and needs only a scope widening, not an ADR.
- Two `done` tasks' files are reopened (FM-004's `react.html`, FM-009's `validate-production-assets.mjs`). That is a task-designer scoping matter — a new packet listing both under `Files Allowed To Modify`, or a documented widening of FM-043 — and this ADR
  does not choose between those or write any packet.
- The `.woff` duplication FM-043 recorded under Temporary Exceptions And Debt (34 redundant files, ~half of 2.0 MB of `dist/assets`) is **not** resolved by Option A and remains open debt; only Option C retires it as a side effect. It can be addressed
  independently later and should not drive this decision.
- Moot, retained for history: the conditions that would have applied had Option B been chosen (classifying and justifying the new build plugin as a development dependency per `README.md`'s Dependencies And Toolchain rules, and recording
  the flash-of-unstyled-text consequence as an accepted variance under ADR-0006) or Option C (the mandatory "build fails if any CSS asset is emitted" check, without which that option was a fonts-only fix leaving the original trap armed).
  Neither option was selected, so neither condition applies. No new runtime or build dependency is added by the accepted decision, and no ADR-0006 visual variance arises from it.
- No implementation, task packet, `STATUS.md`, `FEATURES.yaml`, `COMPONENTS.yaml`, source, template, build-configuration, or test change is made by this ADR. After a human decision, the task designer refines or creates the affected packets and an implementer
  performs the work.

## Affected Work

- Was blocked on this decision, and is no longer blocked **by the decision** (implementation still pending): `docs/frontend-migration/tasks/FM-043-shell-theme-typography-density-foundation.md` (Blocker 2), and transitively its `Blocks`
  list — FM-044 and FM-045 — plus the rest of the ADR-0009 batch that consumes FM-043's tokens. A task designer must now replace FM-043's blocking decision-dependency block with this accepted ADR and scope the packet accordingly; this ADR
  writes no packet and changes no task file.
- Every future task that imports any CSS in `core/ui-react`, which is the reason this is an ADR rather than a task note.
- Files the implementing task must own under the **accepted** Option A — exactly three, no more: `core/ui-react/vite.config.ts`, `core/ui-react/scripts/validate-production-assets.mjs` (FM-009-owned), and
  `core/src/main/resources/templates/react.html` (FM-004-owned). The additional files the rejected options would have required (`package.json`/`package-lock.json` under B; `core/ui-react/src/App.tsx` and `core/ui-react/src/app/theme.ts`
  under C; Java under `core/src/main/java/org/nzbhydra/web/` and `core/src/main/resources/META-INF/native-image/resource-config.json` under D) are **not** in scope.
- Verification surfaces that assert React asset delivery and may need extending: `tests/system/tests/smoke.spec.ts` (font assertions, lines 61-106), `tests/system/tests/shell-selector.spec.ts` (line 11), `core/src/test/java/org/nzbhydra/web/WebConfigurationTest.java`
  (packaged and external-override resolution of `/static/react/assets/index.js`), `.github/workflows/frontend-ci.yml` (lines 40-41), `.github/workflows/buildNative.yml` (lines 144, 173), `core/pom.xml` (lines 80-115), and `docker/uiDev/start.sh` (lines 41, 46).
- Registry records whose evidence is currently unobtainable because of the gap: `F-PLATFORM-SHELL` (its proposed `branded-typography-and-density` visual state) and, indirectly, `C-APP-SHELL`. No registry record is changed by this ADR.
- Accepted ADRs extended but **not** reopened: `ADR-0001-react-placement-and-ui-switch.md` (isolated `static/react/` namespace, Thymeleaf React shell, explicit packaging/base-path/external-static tests), `ADR-0004-testing-and-parity.md` (packaging and
  deployment evidence).
- Accepted ADRs explicitly **not** affected, confirmed by reading them rather than assumed: `ADR-0002-frontend-stack.md` (MUI-only component-system boundary — no option adds a component system, router, or server-state library),
  `ADR-0009-mock-fidelity-visual-redesign.md` (full mock fidelity and self-hosted, CDN-free IBM Plex — every option keeps fonts self-hosted; ADR-0009 left the vendoring/delivery mechanism open as implementation detail, which is precisely what this ADR
  now closes), and `ADR-0006-visual-parity-policy.md` (visual acceptance process unchanged).

## Supersession

- Supersedes: `None`.
- Superseded by: `None` until a later ADR replaces this decision.
