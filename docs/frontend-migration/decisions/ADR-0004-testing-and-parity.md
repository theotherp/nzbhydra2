# ADR-0004: Testing And Parity

Status: accepted

## Decision

- `FEATURES.yaml` is the parity inventory and links legacy sources, existing tests, target ownership, and migration state.
- Preserve stable existing `data-testid` values where the behavior remains equivalent.
- Pure domain transformations receive exhaustive unit tests.
- React interactions and accessibility receive component tests.
- Spring integration, configured base paths, packaging, API workflows, and visible parity receive Playwright or existing Java system tests.
- A task implementation moves to `review`; a fresh agent checks it before the coordinator marks it `done`.
- No test may be removed, skipped, weakened, or ignored to complete migration work.

## Consequences

Rendering a page is not sufficient parity. Search and configuration are accepted only when their linked behavior records and workflows are covered.
