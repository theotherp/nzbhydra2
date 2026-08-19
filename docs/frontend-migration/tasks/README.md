# Migration Tasks

Task packets are bounded work contracts for tier-1 work (see `../README.md`, *Choosing A Mechanism*). The task designer creates
them from `../templates/task.md`; the coordinator promotes them when dependencies are done and lists next work in `../STATUS.md`.
Done packets are deleted from this directory; git history is the archive.

- A packet is ≤ 80 lines: outcome, acceptance criteria, `Files Allowed To Modify` (write allowlist, not a read restriction),
  verification commands, linked registry IDs. `Depends on`/`Blocks` hold task IDs or `None`.
- Packets are vertical capabilities; never split by source file or layer.
- Implementers update their assigned task, linked registry records, and allowed files only. Routine reversible choices are made
  autonomously; real blockers follow `../README.md`'s escalation policy. Follow-up proposals go in the handoff.
- Rendering changes ship a screenshot strip per `../README.md`, *Visual Gate*.
- The implementer hands off `review` using `../templates/handoff.md`; a fresh reviewer records `../templates/review.md`; only
  the coordinator marks `done`.
