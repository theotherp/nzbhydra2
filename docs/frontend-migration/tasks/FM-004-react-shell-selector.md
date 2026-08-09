# FM-004: React Shell Selector

Status: done Owner: OpenCode
Feature IDs: F-PLATFORM-SHELL Component IDs: C-APP-SHELL API IDs: API-BOOTSTRAP-INITIAL Depends on: FM-001, FM-002 Blocks: FM-005, FM-006, FM-008, FM-009

## Outcome

Serve a minimal React shell on canonical application URLs when explicitly selected, while retaining the legacy shell as the default.

## Files Allowed To Modify

- React application bootstrap and migration-placeholder files
- Spring shell controller/configuration and focused tests
- New React Thymeleaf template
- Build integration needed to place React output under `static/react/`
- Relevant feature, component, and API registry records
- `docs/frontend-migration/STATUS.md`
- This task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- Full navigation or visual design
- API transport beyond consuming initial bootstrap data
- Migrated feature pages
- Removal or modification of legacy behavior

## Context To Read

- `ADR-0001` and `ADR-0004`
- `CONTEXT.md` runtime and packaging sections
- `MainWeb`, `WebConfiguration`, `SecurityConfig`, and the legacy `index.html`

## Acceptance

- Temporary React and legacy selectors use a documented cookie and safe redirect behavior.
- Canonical route URLs render the selected shell without weakening role protection.
- React receives typed bootstrap data and honors configured URL bases.
- Unimplemented routes render a placeholder with a working legacy switch.
- AngularJS and React are never mounted in the same document.
- Focused Spring and browser tests cover default, selected, deep-link, and non-root-base behavior.

## Verification

- React quality commands
- IntelliJ project build and focused Spring tests
- Focused Playwright shell-selection scenario

## Handoff

### Outcome

- Added the server-controlled `nzbhydra-ui` cookie selector. `/ui/react` and `/ui/legacy` set the selected shell then redirect only to validated local canonical paths.
- Existing `/`, `/config/**`, `/system/**`, `/stats/**`, and `/login` mappings select the requested independent Thymeleaf shell without changing their existing role annotations. The React shell receives typed bootstrap data and renders an
  unimplemented-route placeholder with a legacy switch.
- Maven builds React assets into `core/target/classes/static/react`; no generated asset is committed under source resources. External static overrides take precedence while falling back to packaged React assets.

### Files Modified

- `core/ui-react/**`, `core/pom.xml`, `core/src/main/java/org/nzbhydra/web/MainWeb.java`, `core/src/main/resources/templates/react.html`, and focused Spring/Playwright tests.
- `docs/frontend-migration/{FEATURES,COMPONENTS,APIS,STATUS}.yaml` and this task packet.
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`.

### Toolchain

- Node: `v26.6.0`
- Package manager: `npm 11.18.0`
- Other material tools: `Java 26.0.2`, Maven `3.9.16`, IntelliJ test runner

### Verification Evidence

| Working directory | Command                                                                                                                             | Result                                                                                                                                       |
|-------------------|-------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| `core/ui-react`   | `npm ci`                                                                                                                            | Passed.                                                                                                                                      |
| `core/ui-react`   | `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration` | Passed.                                                                                                                                      |
| IntelliJ          | build `MainWeb.java` and `MainWebTest.java`                                                                                         | Passed.                                                                                                                                      |
| IntelliJ          | `MainWebTest` and `WebConfigurationTest`                                                                                            | Passed: 5 selector/role tests and 1 external-static-override resource test.                                                                  |
| repository root   | `python3 misc/run_gui_systemtest.py --runtime wsl -- tests/shell-selector.spec.ts`                                                  | Passed: 1 Playwright test; also verified Maven packages assets to `core/target/classes/static/react`.                                        |
| `tests/system`    | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5091/hydra npx playwright test tests/shell-selector.spec.ts`                                  | Passed against a manually started packaged app with `server.servlet.context-path=/hydra`: asset load, selected deep link, and legacy switch. |

### Dependency Decisions

- Runtime dependencies: None.
- Development dependencies: Added Maven `exec-maven-plugin` `3.6.2` to execute the already-locked React build during the resource lifecycle; it is build-only and does not alter browser dependencies.

### Assumptions

- The UI selector persists for 30 days as an `HttpOnly`, `SameSite=Lax` cookie scoped to the configured context path. Its `Secure` flag follows the request security state after forwarded-header processing.
- Selector redirects accept only application-relative paths. Spring applies the configured context path to the redirect; the current path and query are preserved by the React legacy-switch link. Fragments remain client-side and are not sent
  to the server.
- Vite uses a relative base so asset imports remain valid below non-root application bases; the server template resolves its entry asset through Thymeleaf.

### Temporary Exceptions And Debt

- None.

### Registry And Documentation Updates

- `F-PLATFORM-SHELL`, `C-BOOTSTRAP-CONTEXT`, and `API-BOOTSTRAP-INITIAL` now record the delivered partial shell/bootstrap implementation and `FM-004` ownership.

### Follow-Up Work

- FM-005 can extend the bootstrap context into API transport and session behavior; FM-006 owns complete navigation, footer, and permission-aware application shell work.
