# FM-009: Packaging And Deployment Validation

Status: done Owner: OpenCode
Feature IDs: F-PLATFORM-SHELL Component IDs: C-APP-SHELL API IDs: API-BOOTSTRAP-INITIAL Depends on: FM-003, FM-004, FM-008 Blocks: later feature migration

## Outcome

Prove the React shell and first vertical slice work in development, packaged JVM, configured URL-base, external-static, and representative native deployment paths.

## Files Allowed To Modify

- Frontend build integration
- Release, Docker UI-development, and CI scripts directly required for React assets
- Focused Java/native resource tests
- Focused Playwright configuration and tests
- Relevant feature records
- `docs/frontend-migration/STATUS.md`
- This task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Legacy Gulp modernization or removal
- Additional feature migration
- General release pipeline redesign

## Context To Read

- `ADR-0001` and `ADR-0004`
- `CONTEXT.md` build and packaging section
- `misc/build_and_release.py`, native hints, static resource configuration, UI-development Docker files, and existing system-test runners

## Acceptance

- Clean builds produce React assets before JVM and native resource packaging.
- React assets load under root and non-root configured URL bases.
- The external static override has an explicit working development path.
- JVM package and one representative native package serve the React shell and first feature.
- CI detects missing or stale production assets.
- Legacy assets continue to work while the selector exists.

## Verification

- React quality commands and production build
- IntelliJ project build and focused resource tests
- GUI system-test runner against JVM and representative native runtime

## Handoff

### Outcome

- Maven builds and validates fresh React production assets before packaging; frontend and native CI validate the resulting entry asset.
- The UI-development Docker path builds the repository's Dockerfile as `nzbhydra-ui-dev:local`, mounts React sources, and retains dependencies in a named volume while building and watching React assets in the external static override. Focused resource tests prove packaged fallback and external-static precedence.
- JVM executable JAR root and `/hydra` deployments, plus a Linux GraalVM native executable, serve the React shell, `/system/news`, and the legacy switch.

### Files Modified

- `.github/workflows/buildNative.yml`, `.github/workflows/frontend-ci.yml`, `core/pom.xml`, `core/src/main/resources/META-INF/native-image/resource-config.json`, `core/src/test/java/org/nzbhydra/web/WebConfigurationTest.java`, `core/ui-react/package.json`, and `core/ui-react/scripts/validate-production-assets.mjs`.
- `docker/uiDev/Dockerfile`, `docker/uiDev/docker-compose.yaml`, `docker/uiDev/start.sh`, `docs/frontend-migration/STATUS.md`, and this task packet.
- Scope confirmation: every task-owned change is within `Files Allowed To Modify`; there were no unrelated pre-existing changes.

### Toolchain

- Node `v26.6.0`; npm `11.18.0`; Java `26.0.2`; Maven `3.9.16`; GraalVM CE `25.1.3`; Playwright Chromium.

### Verification Evidence

| Runtime | Working directory | Command | Result |
|---|---|---|---|
| React development | `core/ui-react` | `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration && npm run validate:production-assets` | Passed: 12 files / 28 tests. Existing Fast Refresh and Vite chunk-size warnings are non-failing. |
| JVM package | repository root | `JAVA_HOME="/home/sist/.sdkman/candidates/java/current" mvn --batch-mode clean package -DskipTests -pl org.nzbhydra:core -am` | Passed: Vite emitted and Maven validated `target/classes/static/react`; executable JAR was produced. |
| Focused resources | IntelliJ | `WebConfigurationTest` | Passed: 2 tests verify packaged fallback and external-static precedence. |
| JVM package, root base | repository root | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/shell-selector.spec.ts tests/news.spec.ts` | Passed: 2 Playwright tests against the built executable JAR. |
| JVM package, `/hydra` base | `tests/system` | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5076/hydra npx playwright test tests/news.spec.ts tests/shell-selector.spec.ts` against the packaged JAR with `-Dserver.servlet.context-path=/hydra` | Passed: React and legacy shells and `/system/news` work under the configured base. |
| Docker external-static development | repository root | `docker compose -f docker/uiDev/docker-compose.yaml --project-name fm009correction config`; `docker compose -f docker/uiDev/docker-compose.yaml --project-name fm009correction up --build --detach`; temporary `core/ui-react/src/main.tsx` edit; SHA-256 assertion of container and HTTP-served `/static/react/assets/index.js`; `down --volumes` | Passed: Compose resolved the repository root build context and `docker/uiDev/Dockerfile`, built `nzbhydra-ui-dev:local`, and started it. The host-source mutation rebuilt `/app/data/static/react/assets/index.js`; container and HTTP checksums both changed from `20cfc77c…` to `8616edb0…`, then matched exactly. |
| Representative native runtime | repository root | `JAVA_HOME="/home/sist/.local/graalvm-community-25.1.3" bash buildCore.sh`; `python3 misc/run_systemtest.py --skip-build --core-executable core/target/core --gui-tests --skip-system-tests --playwright-args tests/shell-selector.spec.ts tests/news.spec.ts` | Passed: GraalVM built `core/target/core`; 2 Playwright tests validate React/legacy selection and `/system/news`. |

### Runtime Matrix

| Runtime | React shell | First feature | Legacy selector | URL base | External static |
|---|---|---|---|---|---|
| JVM executable JAR | Validated | `/system/news` validated | Validated | root and `/hydra` validated | focused precedence test validated |
| UI-development Docker path | Built | external build output validated | classpath fallback preserved | inherited server configuration | host-source build/watch validated at `/app/data/static/react` |
| Linux native executable | Validated | `/system/news` validated | Validated | root validated | resource metadata and CI entry-asset check validated |

### Dependency Decisions

- Runtime dependencies: None. Development dependencies: None.
- Docker Compose uses a named `react_node_modules` volume so the host React source bind mount does not mask dependencies; `npm ci` refreshes that volume on each startup.
- Compose builds and tags the local image as `nzbhydra-ui-dev:local`; `up --build` reproducibly exercises this checkout's `docker/uiDev/Dockerfile` without a registry image.

### Assumptions

- The existing `static/**` resource handler applies the configured Spring context path before resolving external or classpath resources.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- Updated `STATUS.md` and this task packet only. No feature contract changed.

### Blocker

- None. All acceptance criteria are satisfied; ready for independent review.
