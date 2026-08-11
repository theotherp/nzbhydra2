# Architecture Decision Records

ADRs preserve accepted, durable migration decisions that constrain more than one task or a system boundary. They are not task implementation notes.

## Lifecycle

1. An implementer, fixer, reviewer, or task designer reports `ADR REQUIRED` when an unresolved fundamental decision is encountered.
2. The coordinator invokes `migration-adr-proposer`, which researches and writes the next `ADR-NNNN` from `../templates/adr.md` with `Status: proposed`.
3. The task designer records the proposed ADR in each affected task's blocking decision dependency, marks affected tasks `blocked`, and updates `STATUS.md`. The coordinator then presents the proposal's question, options, recommendation,
   consequences, and affected work to the human.
4. The human explicitly accepts an option, rejects the proposal, or supplies a different decision.
5. The proposer records that response. An accepted choice changes the proposal to `Status: accepted`; a rejected proposal remains `Status: rejected`.
6. The task designer replaces the blocking proposal with the accepted ADR, removes obsolete rejected/proposed entries, and unblocks affected task packets before the coordinator resumes work.

Agents may draft and recommend ADRs without being asked. They must never accept an ADR or choose an option on the human's behalf.

## When An ADR Is Required

Create a proposal when reasonable alternatives materially differ for one or more of these concerns:

- shared frontend or backend architecture, domain model, runtime state, or component boundary;
- framework, platform, transport, API, authentication, authorization, persistence, or security contract;
- rollout, deployment, base-path, packaging, compatibility, or native-runtime boundary;
- project-wide testing, parity, observability, or quality policy.

Do not create an ADR for a task-local presentation detail, conventional naming or file layout, a reversible helper implementation, or a narrow dependency already permitted by an accepted ADR. Record those in the task handoff instead.

## Integrity Rules

- Number new records consecutively as `ADR-NNNN`; do not reuse an ID.
- Proposed ADRs are not authority and cannot unblock implementation.
- Accepted ADRs are historical records. Create a new ADR with `Supersedes` for a changed decision instead of rewriting the old decision. Correct only factual/documentation errors in an accepted ADR.
- Every new or revised task governed by an ADR links it under `Decision Dependencies`; a task with a proposed/rejected dependency remains blocked or planned.
