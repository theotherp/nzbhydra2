# FM-000: Migration Control Plane

Status: done Owner: OpenCode bootstrap session Feature IDs: all initial records Component IDs: all initial records API IDs: all initial records Depends on: none Blocks: FM-001

## Outcome

Provide durable, checked-in migration context so future agents do not depend on conversation history.

## Acceptance

- Reading order, ownership, task lifecycle, and context limits are documented.
- Initial ADRs record placement, stack, API, and parity decisions.
- Machine-readable feature, component, and API registries exist with permanent IDs.
- Initial tasks through the first vertical slice and packaging validation are bounded.
- Scoped instructions exist for future `core/ui-react` work.

## Verification

- Validate YAML syntax.
- Check internal document links and task dependencies.
- Inspect Git diff for source or generated-asset changes outside this control plane.

## Handoff

Created the control plane only. No React scaffold, backend route, generated API code, legacy UI code, or static output was changed. `FM-001` is the first task for a fresh agent.
