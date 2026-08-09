# Agent Instructions for NZBHydra2

This document provides essential context, commands, and guidelines for AI agents operating in this codebase.
The project is a search aggregator for Usenet indexers, built with Spring Boot (Java 17) and a legacy AngularJS frontend.

## CRITICAL RULES

- **NEVER delete failing tests** unless explicitly told to do so by the user.
- **NEVER ignore failing tests.** If tests fail after your changes, fix them. Do not claim they are unrelated unless they were already failing before you started.

## 1. Project Structure & Environment

- **Root Directory**: `C:\Users\<user>\IdeaProjects\nzbhydra2`
- **Core Logic**: `core/src/main/java`
- **Tests**: `core/src/test/java`
- **Frontend**: `core/ui-src` (Legacy Gulp/Bower/AngularJS)
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
- Force current JVM code in WSL with `python3 misc/run_gui_systemtest.py --runtime wsl`. This shuts down Hydra or mockserver already using the test ports through their actuator shutdown endpoints.
- Pass Playwright arguments after `--`, for example `python3 misc/run_gui_systemtest.py -- tests/search.spec.ts --grep "should search"`. The complete Playwright command times out after five minutes by default; override it with
  `--test-timeout <seconds>` when needed.
- Run Windows native Java system tests from WSL with `cmd.exe /c "cd /d C:\Users\strat\IdeaProjects\nzbhydra2 && py misc\run_windows_systemtest.py --skip-build --core-exe core.exe"`.
- Add `--gui-tests` to also run Playwright against the managed Windows native processes, or add both `--gui-tests --skip-system-tests` for GUI tests only. Put optional Playwright arguments last using `--playwright-args`; override its
  five-minute default with `--gui-test-timeout <seconds>`.

## 4. Documentation Lookup (Context7 MCP)

Always use the **Context7 MCP tools** when you need:

- Code generation, setup, or configuration steps
- Library or API documentation (Spring Boot, Mockito, AssertJ, Jackson, OkHttp, etc.)
- Correct syntax or usage patterns for any dependency

Resolve the library ID first, then fetch the relevant docs. Do this automatically without the user needing to ask.

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

### Frontend (Legacy AngularJS)

- The frontend is legacy AngularJS located in `core/ui-src`.
- **Do not** manually build frontend resources. A **Gulp watch instance** runs via the IntelliJ run configuration named **"default"** and automatically rebuilds frontend assets on change. Just edit the source files.
- **IMPORTANT:** If frontend resource changes are not taking effect, check whether the **"default"** run configuration is running in IntelliJ. If it is not running, **ask the user to start it** before proceeding.
- After editing frontend files, you **may run Gulp tasks** to verify the UI source compiles correctly. Useful tasks:
    - `gulp scripts` -- compiles/concatenates JavaScript files.
    - `gulp less` -- compiles LESS stylesheets to CSS.
    - Run these from the `core/ui-src` directory (e.g., `npx gulp scripts`).
- Minimize frontend changes unless necessary.

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
