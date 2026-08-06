# ADR-0001: React Placement And UI Switch

Status: accepted

## Context

The replacement must be viewable throughout development without introducing temporary route semantics or requiring production-quality route-by-route coexistence. NZBHydra2 supports configurable URL bases and Spring currently serves a
Thymeleaf AngularJS shell for canonical routes.

## Decision

- Permanent React source lives in `core/ui-react`.
- Vite production output uses an isolated `static/react/` namespace.
- A new Thymeleaf React shell receives the same server bootstrap contract as the legacy shell.
- Temporary endpoints select React or legacy using a cookie and redirect to a canonical application URL.
- Existing Spring route mappings keep their role protection and choose the shell without changing canonical URLs.
- React shows a migration placeholder for routes it does not implement.
- React becomes the default only after migration acceptance; the selector and AngularJS are then removed in separate cleanup work.

## Consequences

- React routing and links use final URL shapes from the beginning.
- Full-page UI switching is acceptable during migration.
- Both shells are packaged temporarily, but they do not share a DOM or runtime.
- Base URL, external static override, JAR packaging, and native resource inclusion require explicit tests.
