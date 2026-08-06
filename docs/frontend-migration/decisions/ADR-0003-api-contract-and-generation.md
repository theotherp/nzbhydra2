# ADR-0003: API Contract And Generation

Status: accepted

## Context

`core/openapi.json` provides broad OpenAPI 3.1 coverage but currently includes unwanted verb variants, weak required/null metadata, unstable operation IDs, incomplete auth/error information, and incorrect multipart or binary contracts.

## Decision

- Generate TypeScript types first; do not initially generate the application transport or React Query hooks.
- Use a small handwritten fetch transport registered as `C-API-TRANSPORT`.
- Derive the runtime base from server bootstrap data, include browser credentials, and implement the Hydra CSRF cookie/header contract.
- Handle login, logout, file transfers, upload progress, and STOMP explicitly.
- Correct Java mappings and OpenAPI metadata incrementally as APIs are adopted.
- Generated files are reproducible and never edited manually.
- `APIS.yaml` tracks contract quality and frontend adoption by stable API ID.

## Consequences

The generated types are useful without pretending the current document is stronger than it is. Each migrated feature owns enough contract improvement and testing to make its endpoints safe.
