---
description: Create a cohesive batch of the next consecutive FM migration task packets.
agent: migration-orchestrator
---

Parse `$ARGUMENTS` as exactly one positive integer. Reject missing, non-integer, non-positive, or extra arguments before editing. Coordinate creation of that many next consecutive FM task packets. Determine the next ID from the highest
existing task ID; do not overwrite or renumber existing packets.

Invoke the task designer to design the batch in dependency order from the migration inventories, ADRs, completed handoffs, legacy sources, existing tests, and planned work. Each task must be a substantial independently reviewable vertical
capability, not a source-file or layer-sized fragment. Keep atomically necessary route, UI, transport, focused-test, and registry work together; split only at genuine dependency, independent capability, separate runtime boundary, or
unresolved contract. Do not combine unrelated capabilities merely to increase task size.

The designer creates each packet from `docs/frontend-migration/templates/task.md` and self-reviews every packet. In `docs/frontend-migration/STATUS.md`, list only the earliest dependency-ready task under `Upcoming`; leave later batch
members as planned packets without adding them to the status file. Do not edit task packets yourself. Route any `ADR REQUIRED` result through the ADR proposer and explicit human-decision workflow before resuming batch design.
