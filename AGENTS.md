# Agent Instructions for NZBHydra2

This document provides essential context, commands, and guidelines for AI agents operating in this codebase.
The project is a search aggregator for Usenet indexers, built with Spring Boot (Java 17) and a React frontend.

## CRITICAL RULES

- **NEVER delete failing tests** unless explicitly told to do so by the user.
- **NEVER ignore failing tests.** If tests fail after your changes, fix them. Do not claim they are unrelated unless they were already failing before you started.

## 1. Project Structure & Environment

- **Root Directory**: `C:\Users\<user>\IdeaProjects\nzbhydra2`
- **Core Logic**: `core/src/main/java`
- **Tests**: `core/src/test/java`
- **Frontend**: `core/ui-react` (React 19 + TypeScript + Vite + MUI)
- **Java Version**: 17
- **Build System**: Maven (but prefer IntelliJ MCP tools -- see below)

**Important**:

- `core` is the primary module for backend logic.
- `other` folder should be ignored unless explicitly instructed otherwise.
- **ALWAYS** use absolute paths for file operations.

## 2. IntelliJ MCP Server (Primary Tool)

**Always prefer IntelliJ MCP tools over Maven CLI commands.** Maven is only a fallback when MCP tools are unavailable or insufficient.

DO NOT USE intellij_search_in_files_by_text AS IT'S BUGGY

When calling the IntelliJ MCP map `projectPath=/mnt/c/Users/<user>/IdeaProjects/nzbhydra2` to `projectPath=C:/Users/<user>/IdeaProjects/nzbhydra2`

### Building & Compiling

- Use `intellij_build_project` to compile and check for errors after edits.
- Use `intellij_get_file_problems` to inspect a specific file for errors and warnings.

### Running Tests

- Use `intellij_get_run_configurations` to list available run configurations.
- Use `intellij_execute_run_configuration` to run a test by its configuration name.
- **If no run configuration exists for the test you need to run, ask the user to create one in IntelliJ.** Do not silently fall back to Maven.

### Searching & Navigation

- Use `intellij_search_in_files_by_text` and `intellij_search_in_files_by_regex` for code search.
- Use `intellij_find_files_by_name_keyword` to locate files by name.
- Use `intellij_get_symbol_info` to inspect symbol declarations and documentation.
- Use `intellij_list_directory_tree` to explore directory structure (prefer over `ls`/`dir`).

### Refactoring

- Use `intellij_rename_refactoring` for renaming symbols (variables, methods, classes). This is far safer than text find-and-replace.

## 3. Maven Commands (Fallback Only)

Use these **only** when IntelliJ MCP tools are unavailable. Run from the project root.


### Build

- **Full Build**: `mvn clean install`
- **Build Core Only**: `mvn -pl core clean install`
- **Compile**: `mvn compile`

### Testing (fallback)

- **Run All Core Tests**: `mvn -pl core test`
- **Run a Single Test Class**: `mvn -pl core test -Dtest=ExternalApiTest`
- **Run a Single Test Method**: `mvn -pl core test -Dtest=ExternalApiTest#shouldCache`

### System and GUI Tests

- Run Playwright from WSL with `python3 misc/run_gui_systemtest.py`. It reuses healthy IntelliJ Hydra and mockserver processes; if neither is running, it builds and starts the current JVM code in WSL. It also manages Sonarr and Radarr as
  needed.
- Require already-running IntelliJ services with `python3 misc/run_gui_systemtest.py --runtime existing`.
- Force current JVM code in WSL with `python3 misc/run_gui_systemtest.py --runtime local`. This shuts down Hydra or mockserver already using the test ports through their actuator shutdown endpoints.
- Pass Playwright arguments after `--`, for example `python3 misc/run_gui_systemtest.py -- tests/search.spec.ts --grep "should search"`. The complete Playwright command times out after five minutes by default; override it with
  `--test-timeout <seconds>` when needed.
- Run native Java system tests from WSL with `python3 misc/run_systemtest.py`. It rebuilds the Linux native executable when core or shared code changes; `native-image` must be on `PATH`.
- Add `--gui-tests` to also run Playwright against the managed native processes, or add both `--gui-tests --skip-system-tests` for GUI tests only. Put optional Playwright arguments last using `--playwright-args`; override its
  five-minute default with `--gui-test-timeout <seconds>`.

## 4. Documentation Lookup (Context7 MCP)

Always use the **Context7 MCP tools** when you need:

- Code generation, setup, or configuration steps
- Library or API documentation (Spring Boot, Mockito, AssertJ, Jackson, OkHttp, etc.)
- Correct syntax or usage patterns for any dependency

Resolve the library ID first, then fetch the relevant docs. Do this automatically without the user needing to ask.

### Maven dependency/source lookup

`maven-indexer-cli` is available for searching Maven Central and inspecting published Maven artifacts.

Use `maven-indexer-cli` when you need to:

- find which Maven artifact contains a class or package;
- determine available versions of a dependency or plugin;
- inspect or locate published artifacts when the exact coordinates are unknown;
- research Maven dependencies that are not already present in this repository.

Prefer local/project information first:

- use `pom.xml` files for dependencies and versions already defined by the project;
- use `mvn dependency:tree` for the project's resolved dependency graph;
- use the local Maven repository (`~/.m2/repository`) when inspecting artifacts that are already downloaded.

Do not guess Maven coordinates or versions when they can be verified with
`maven-indexer-cli`.

## 5. Code Style & Conventions

### Java (Backend)

- **Formatting**:
    - Indentation: **4 spaces** (no tabs).
    - Braces: Same line (K&R / Java standard).
    - Line length: Aim for <120 chars, but readability comes first.
- **Naming**:
    - Classes: `PascalCase` (e.g., `ExternalApi`).
    - Methods/Variables: `camelCase` (e.g., `handleCachingSearch`).
    - Constants: `UPPER_SNAKE_CASE`.
- **Imports**:
    - Avoid wildcard imports (`import java.util.*;`).
    - Sort alphabetically.
    - Remove unused imports.
- **Annotations**:
    - Use Lombok for boilerplate (`@Data`, `@AllArgsConstructor`, `@Builder`).
    - Use Spring stereotypes (`@Service`, `@RestController`, `@Autowired`).
    - Use field injection unless constructor is already being used.
- **Error Handling**:
    - Use custom exceptions (e.g., `ExternalApiException`) where appropriate.
    - Use `@ExceptionHandler` in Controllers.
    - Log errors with Slf4j (`logger.error(...)`) with context.

### Testing

- **Frameworks**: JUnit 5 (Jupiter), AssertJ, Mockito.
- **Location**: Mirror the package structure of the implementation in `src/test/java`.
- **Naming**:
    - Class: `TargetClassTest`.
    - Methods: Descriptive camelCase, starting with `should` (e.g., `shouldReturnCachedResult`).
- **Structure**:
    - `setUp()` annotated with `@BeforeEach`.
    - Use `@InjectMocks` for the testee and `@Mock` for dependencies.
    - **Always** assert expected outcomes (don't just run and check for no exception).
    - Use `assertThat(actual).isEqualTo(expected)` (AssertJ style).

### Frontend (React)

- The frontend is React 19 with TypeScript, Vite and MUI, located in `core/ui-react`. The legacy AngularJS UI in
  `core/ui-src`, its Gulp/Bower toolchain and its checked-in output under `core/src/main/resources/static` were removed
  by FM-095; there is no second UI and no shell selector.
- Its conventions -- component choice, labelling, and the ban on design literals in feature code (ADR-0014) -- are in
  `core/ui-react/AGENTS.md`. Read that before writing UI code.
- Build and check it from the `core/ui-react` directory: `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `npm run test -- --run`, `npm run build`.
- Nothing is checked in: `core/pom.xml` runs the npm build during the Maven build, emitting the bundle into
  `target/classes/static/react`, which `core/src/main/resources/templates/react.html` loads.

## 6. Workflow for Agents

1. **Explore**: Use `intellij_list_directory_tree` or `intellij_find_files_by_name_keyword` to locate files.
2. **Read**: Always read file content **before** editing to understand context (imports, existing methods).
3. **Plan**: If modifying logic, identify the relevant test class first.
4. **Edit**:
    - Use `edit` or `write` tools.
    - Maintain existing style (4 spaces).
    - **Do not** remove comments unless they are obsolete.
5. **Verify**:
    - Use `intellij_build_project` or `intellij_get_file_problems` to check for compilation errors.
    - Use `intellij_execute_run_configuration` to run the relevant test. If no run config exists, **ask the user to create one**.
    - If a test fails, analyze the output, fix the code/test, and rerun.
    - Do not finish if tests are failing (unless they were failing before you started).

## 7. Common Patterns & Libraries

- **JSON/XML**: `Jackson` for JSON, `JAXB` for XML.
- **HTTP**: `OkHttp3` for external requests.
- **Database**: Spring Data JPA with H2 (embedded). `Flyway` for migrations.
- **Utilities**: `Guava` (`Strings`, `Sets`, `Stopwatch`) and `Apache Commons` (`IO`, `Lang3`). Prefer these over custom implementations.
- **Logging**: Slf4j + Logback. Use `logger.debug` for high-volume tracing, `logger.info` for significant events.
- **Caching**: Caffeine.
- **Resilience**: Failsafe.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), unchanged. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
