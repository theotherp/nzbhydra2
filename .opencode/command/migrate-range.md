---
description: Migrate and independently review an inclusive sequential range of FM tasks.
agent: migration-orchestrator
---

Process the inclusive FM task range from `$1` through `$2` sequentially in dependency order. Reject missing, malformed, reversed, or extra arguments before starting work.

For each task, establish its attributable Git baseline and complete pre-invocation working-tree snapshot, prepare the task only when concrete predecessor discoveries require refinement, invoke a fresh implementer, invoke an independent
fresh reviewer, fix required findings in a separate fresh context, and independently re-review. The implementer records one verification basis for the final implementation; reviewers audit that evidence and do not routinely repeat expensive
commands. A fixer reruns only commands affected by its correction and refreshes their evidence. Treat changes created after a worker invocation as task-attributable unless there is positive evidence of an external writer; staged versus
unstaged state alone is not evidence of different ownership. When resuming a task marked `blocked`, `in_progress`, or `review`, preserve unfinished task-attributable changes recorded by its packet or prior handoff across the new invocation;
do not reclassify them as pre-existing user work merely because they are present at command start. Recover from attribution-only worker blocks by comparing against the recorded snapshot and retrying in a fresh context when ownership is
determinable. On `ADR REQUIRED`, draft a proposed ADR through `migration-adr-proposer`, present it for explicit human acceptance, and stop dependent work until the decision is recorded and task packets are refined. Stop on other genuine
blockers, failed prerequisites, exhausted fix cycles, or task-to-task diff boundaries that remain ambiguous after this recovery. Stop after `$2` and do not begin tasks outside this range.
