# ADR-0002: Frontend Stack And Boundaries

Status: accepted

## Decision

Use React, TypeScript, Vite, MUI, TanStack Router, TanStack Query, TanStack Table, React Hook Form, Zod, Vitest, React Testing Library, SockJS, and `@stomp/stompjs`.

MUI is the only general visual component system. Do not add Bootstrap, Tailwind, another component suite, another router, or another server-state library without superseding this ADR.

TanStack Table supplies controlled table primitives. Hydra-specific title grouping, duplicate grouping, filtering, compatibility, and selection remain explicit domain code rather than being delegated to a commercial or generic grid feature.

Configuration uses React Hook Form with a small typed Hydra field vocabulary. Indexers, downloaders, external tools, mappings, and notifications are dedicated editors rather than an unrestricted generic schema framework.

## Consequences

- Shared Hydra behavior is registered in `COMPONENTS.yaml`; ordinary MUI usage is not wrapped by default.
- Persistent DTOs, server state, domain transformations, UI state, and rendering remain separate.
- Specialized narrow dependencies require a task justification; general framework overlap requires an ADR.
