# Migration Tasks

Task packets are permanent, bounded work contracts. The migration task designer creates them from `templates/task.md`; the coordinator promotes them from `planned` to `ready` when dependencies are complete and lists immediately relevant
tasks in `../STATUS.md`.

Create a batch with `/create-next-tasks <count>`. New packets must be substantial independently reviewable vertical capabilities, with a `Boundary Rationale` explaining why the included work belongs together and why adjacent work is
separate.

`Files Allowed To Modify` is a write allowlist, not a read restriction. `Context To Read` is the mandatory starting context, not the complete set of files an agent may inspect. Repository-wide searches are expected where completeness or
parity is required.

Implementation agents may update their assigned task, linked registry records, and allowed implementation files. They must not create new tasks or silently broaden allowed paths. Routine reversible choices should be made autonomously; true
blockers follow the escalation policy in `../README.md`. Proposed follow-up work belongs in the handoff.

The implementation agent uses `../templates/handoff.md` and marks a completed, fully verified implementation `review`. Only the coordinator marks it `done` after review findings are resolved.
