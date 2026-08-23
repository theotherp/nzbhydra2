# FM-095: Legacy UI And Selector Removal

Status: planned Owner:
Feature IDs: F-PLATFORM-SHELL, F-SEARCH-FORM
Component IDs: None
API IDs: None
Depends on: None
Blocks: None

## Outcome

The AngularJS UI and the cookie selector cease to exist (ADR-0001's final stage): sources (`core/ui-src`), the
gulp/bower toolchain, the checked-in legacy static assets, the legacy Thymeleaf shells, the selector endpoints/cookie,
the release-pipeline legacy build steps, and the legacy-only test surface go in one commit — after FM-094 they are one
dead capability whose parts reference each other; removing any one alone leaves a broken build or an unreachable
remnant. Irreversible by design; the rollback window is FM-094's soak, ended by the owner promoting this packet.

## Decision Dependencies

ADR-0001 (selector and AngularJS removal); ADR-0004 (test rules); ADR-0022 (tour retirement; backend surface deferred).

## Files Allowed To Modify

- Delete: `core/ui-src/**`; `core/{gulpfile.js,package.json,package-lock.json,bower.json}`;
  `core/src/main/resources/templates/{index,login}.html`; under `core/src/main/resources/static/`: `js/`, `css/`,
  `fonts/`, `index.html`, `main.js`, `polyfills.js`, `runtime.js`, `styles.css`, `styles.css.map`, `vendor.js`,
  `DO-NOT-EDIT-THESE-FILES`, plus any `static/img/` file no retained reference names (favicons stay)
- `core/src/main/java/org/nzbhydra/web/{MainWeb,WebConfiguration}.java` + their tests in `core/src/test/java/org/nzbhydra/web/`
- `core/ui-react/src/{router.tsx,App.test.tsx}`; `tests/system/tests/**` (navigation rewrite; `shell-selector.spec.ts`
  deletion; one moved assertion); `misc/build_and_release.py`; `/AGENTS.md`; `/readme.md`
- `../FEATURES.yaml` (`F-SEARCH-FORM` guided-tour line only), this task packet, `../STATUS.md`, `../GUI-STATUS.md`

## Out Of Scope

- The `GuidedTourWeb`/`DemoDataProvider` backend surface (ADR-0022 defers its removal; no FM packet may take it)
- The now-inert `main.theme` setting and any backend surface whose only consumer was legacy — propose, don't remove
- Historical `core/ui-src/...` citations in React code comments, `legacy_sources`/`legacy_callers` registry fields,
  `MAINTENANCE.md`, `DECISIONS.md` — provenance stays (`validate-migration.mjs` path-checks only `target`/`test`/
  `tests`, verified 2026-08-23); `.claude/**` governance files (owner edits those directly)

## Context To Read

- `MainWeb.java` post-FM-094; `WebConfiguration.java:83-110` (the `bower_components` fonts handler is legacy-only,
  the `favicon.*` handler must survive); `react.html`+`error.html` (what `static/` must still serve)
- `build_and_release.py` `build_frontend_assets`/`stage_frontend_assets`; `/AGENTS.md` §"Frontend (Legacy AngularJS)";
  `core/ui-react/src/router.tsx:252-282` (`MigrationPlaceholder`, the `ui/legacy` link)

## Acceptance

- No AngularJS source, gulp/bower file, legacy static asset, or legacy Thymeleaf shell remains; every file left under
  `static/` is referenced by `react.html`, `error.html`, a surviving `WebConfiguration` handler, or the React build
  output — proven by a recorded grep/listing in the handoff, not asserted.
- `MainWeb` serves `react` unconditionally for `/`, `/config/**`, `/system/**`, `/stats/**`, `/login`, and the
  `logout`/`loggedOut` flows; the selector endpoints, cookie constants, and `cssUrl`/`disableBlockUi` session
  attributes are gone; the bootstrap contract (`baseUrl`, `bootstrap`) is byte-identical; a stale `nzbhydra-ui`
  cookie is ignored, proven by a test. `AuthWeb.askForAdmin`'s `"index"` is a `@RestController` body, not a view — leave it.
- `MigrationPlaceholder` drops the "Switch to legacy UI" link and reads as an unknown-route notice (`App.test.tsx`
  updated); screenshot strip per `../README.md` *Visual Gate*: an unknown route, desktop 1280x800.
- `F-SEARCH-FORM`'s bare "guided tour" gap line becomes `deliberate -` citing ADR-0022; no other registry parity/gap
  edits. `../GUI-STATUS.md` no longer mentions `/ui/react`, `/ui/legacy`, or a legacy GUI.
- Every `ui/react?redirect=...` navigation in `tests/system` becomes a direct canonical-route `goto`, weakening no
  assertion. `shell-selector.spec.ts` is deleted (its subject is the removed selector); its surviving half — a
  cookie-less deep link renders the React shell, `/static/react/assets/index.js` answers 200 — moves into `smoke.spec.ts`.
- `build_and_release.py` no longer builds or stages legacy assets and its step sequence still validates; `/AGENTS.md`'s
  frontend section describes `core/ui-react`; `/readme.md`'s banner resolves post-merge (commit-pinned or relocated).
- Known-red baseline: `search.spec.ts:411` (MAINTENANCE 2026-08-23) is not fixed or masked; if still red, record it as the only tolerated failure.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration` succeeds.
- Root: `mvn -q -pl org.nzbhydra:core -am -DskipTests package` succeeds; `unzip -l core/target/core-*.jar | grep -E "static/(js|css|fonts)/|templates/(index|login)\.html"` is empty while `static/react/assets/` is present.
- Root: `mvn -q -pl org.nzbhydra:core -am test -Dtest=MainWebTest,WebConfigurationTest -DfailIfNoTests=false` passes (FM-069 note: may dirty `other/github-release-plugin` fixtures — do not commit those).
- Root: `python3 misc/run_gui_systemtest.py --runtime local` — full suite green except the documented baseline; then
  `grep -rn "ui/legacy" core tests misc` matches nothing; `git diff --check` clean; files match the allowlist.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — one sweep across four runtimes (Spring views, Maven packaging, release tooling, Playwright)
  where a missed reference surfaces only at package or release time.
- Reviewer: `opus` — at least the implementer's tier: URL and packaging contracts change, and the referenced-asset
  pruning must be re-derived, not trusted.
- Fixer: `sonnet` — expected findings are missed references or grep-provable leftovers, mechanical to close.

Implementer prompt: Start at `MainWeb.java`, `WebConfiguration.java:83-110`, then `build_and_release.py`'s two
frontend steps. Trap: `static/img` serves react.html's and the `favicon.*` handler's favicons — prune by reference,
never wholesale. Prove first that the packaged jar serves `/` as React with no `static/js` inside.
Reviewer prompt: Check hardest the packaged-artifact listing and the test-navigation rewrite for weakened assertions.
Distrust the handoff's "unreferenced" claims for deleted images — rerun the reference grep yourself.
