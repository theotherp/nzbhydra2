# Durable Context

## Product And Scope

NZBHydra2 is a Spring Boot 4 / Java 17 application. The frontend is a search aggregator UI with configuration, statistics, history, system administration, downloads, notifications, and live status features.

The legacy source is `core/ui-src` and uses AngularJS, Angular Formly, Bootstrap 3, Bower, and Gulp. Generated legacy output under `core/src/main/resources/static` is not source and must not be used as migration input.

The permanent replacement source is `core/ui-react`. The abandoned and ignored `core/ui-src/hydra-ng` directory is not reusable migration work.

## Target Stack

- React and TypeScript
- Vite
- MUI as the single visual component system
- TanStack Router, Query, and Table
- React Hook Form and Zod
- Vitest and React Testing Library
- Existing Playwright system tests
- SockJS and `@stomp/stompjs` for current live channels

Do not add Bootstrap, Tailwind, another general component suite, another router, or another server-state library without an ADR.

## Rollout

React replaced AngularJS as planned under `ADR-0001`: it was built to canonical route semantics from the start, behind a
temporary cookie-based shell selector, with a migration placeholder for routes not yet implemented. `ADR-0023` accepted the
migration on 2026-08-23; `FM-094` then flipped React to the default shell and `FM-095` removed AngularJS, the legacy `static/`
assets, and the selector entirely. React is now the only shell for every canonical route; there is no legacy fallback.

## Runtime Contracts

- The configured application URL base must work behind reverse proxies and under non-root context paths.
- Initial bootstrap data includes permissions, authentication information, safe configuration, server timezone, and base URL.
- Browser requests are same-origin and session based.
- When CSRF is enabled, read `HYDRA-XSRF-TOKEN` and send `X-XSRF-TOKEN` on unsafe requests.
- Preserve FORM, BASIC, OIDC, header, remember-me, and anonymous permission behavior.
- Preserve the existing role protection on Spring shell mappings.
- REST APIs are mostly under `internalapi/`; login, logout, downloads, and live channels require explicit handling.
- SockJS connects at `{baseUrl}websocket`; STOMP destinations are tracked in `APIS.yaml`.

## API Contracts

`core/openapi.json` is useful but not yet complete enough to generate an application client blindly. It contains unwanted HTTP verb variants, weak required/null metadata, unstable operation IDs, and inaccurate binary or multipart
definitions. Security, CSRF, login/logout, and WebSockets are outside or absent from it.

Generate types first and use a small handwritten transport. Improve source Java/OpenAPI contracts incrementally as endpoints are adopted. See `ADR-0003`.

## Build And Packaging

- Vite output must use an isolated namespace such as `static/react/` and must not overwrite legacy assets.
- Asset and API URLs must honor the configured base URL.
- Spring currently packages resources already present under `core/src/main/resources`; Maven does not build the legacy UI.
- Release and CI work must prove React assets are built before JAR and native-image resource processing.
- The external data-directory static override can replace classpath static resources and must be tested.
- Do not manually edit generated frontend output.

## Testing

- Unit-test pure domain behavior, especially search processing and configuration semantics.
- Use component tests for interaction and accessibility behavior.
- Use Playwright for route, API, deployment, and legacy-parity behavior.
- Visual parity is a separate semantic gate: fixed, deterministic Playwright setup must assert scoped geometry and responsive overflow; optional captures are narrow named regions, never automatic full-page pixel baselines. `FEATURES.yaml` records visual proposals and only explicit human acceptance may mark them accepted.
- Preserve existing stable `data-testid` selectors where applicable.
- Never delete, skip, or weaken a failing test to complete migration work.
- A task is not done until its focused verification passes and a fresh review has checked its acceptance criteria.

## Migration Boundaries

Search form and search results are one product slice, although their implementation is split into small tasks. Configuration is not migrated merely when fields render; whole-config round trips, secrets, dirty state, dynamic behavior, modal
transactions, connection checks, and server validation are required for parity.

Do not mechanically port AngularJS controllers. Separate persistent DTOs, domain transformations, server state, UI state, and presentation.
