# Frontend Migration

This directory is the durable coordination point for replacing the AngularJS UI with React. Conversation history and Mnemosyne memory are not part of the migration's authoritative context.

## Reading Order

Every migration agent reads:

1. `/AGENTS.md`
2. This file
3. The assigned file under `tasks/`
4. The context, decisions, and registry entries linked by that task

Agents editing `core/ui-react` also read `/core/ui-react/AGENTS.md`.

## Sources Of Truth

| Information                                | Authoritative file    |
|--------------------------------------------|-----------------------|
| Durable product and deployment constraints | `CONTEXT.md`          |
| Active and next work                       | `STATUS.md`           |
| User-visible parity                        | `FEATURES.yaml`       |
| Shared target components                   | `COMPONENTS.yaml`     |
| Frontend API adoption                      | `APIS.yaml`           |
| Consequential decisions                    | `decisions/ADR-*.md`  |
| ADR lifecycle and proposal rules           | `decisions/README.md` |
| Task scope, acceptance, and handoff        | `tasks/FM-*.md`       |
| Small fixes made outside the pipeline      | `MAINTENANCE.md`      |

Do not duplicate an authoritative fact in another document. Link its stable ID instead.

`GUI-STATUS.md` is the intentionally concise, human-facing view of how to select the React GUI and which user-observable capabilities are currently available. It is a derived convenience summary, not a source of truth: selector decisions and accepted task handoffs govern access behavior, `FEATURES.yaml` governs feature detail and parity, and `STATUS.md` remains limited to task lifecycle. Keep the summary readable without parsing YAML; do not copy task queues, parity matrices, gap inventories, registry IDs, or detailed verification evidence into it. If it conflicts with an authoritative source above, the authoritative source wins.

## Visual Parity

Semantic visual parity preserves user-meaningful information hierarchy, grouping, state visibility, responsive behavior, interaction affordances, and readable accessible presentation. It does not require Bootstrap pixel identity. Behavioral, accessibility, and visual gates are independent under ADR-0004 and ADR-0006.

Each user-facing `FEATURES.yaml` record has one `visual` record with `applicability` (`applicable` or `not_applicable`) and lifecycle `status` (`unassessed`, `proposed`, or `accepted`). An unassessed record is an honest inventory, not failed remediation. A proposed or accepted record requires a scoped `contract` with deterministic `setup`, `states`, named integer `viewports`, and `geometry_checks`; repository-contained `evidence`; optional narrow `snapshots`; and optional `variances` with a description and disposition. `accepted` additionally requires explicit human-decision metadata (`decision`, `accepted_by`, and `accepted_on`), and all variances must be accepted. Implementers and reviewers may create and audit proposals; only a human may accept a baseline or variance. Completed work is never retrospectively accepted.

Use `tests/system/tests/visualEvidence.ts` for fixed `desktop` (1280x800) and `mobile` (390x844) viewport setup, font/animation readiness, named-region geometry and overflow assertions, and optional narrow region captures. It deliberately does not enable automatic full-page screenshot baselines.

## Workflow

Task states are `planned`, `ready`, `in_progress`, `review`, `blocked`, and `done`.

1. The coordinator promotes a dependency-free `planned` task to `ready` and selects it in `STATUS.md`.
2. A task starts only after its dependencies are `done`, unless the coordinator records an explicit exception.
3. The implementation agent records its owner and marks it `in_progress` before editing implementation files.
4. The agent stays within the task's modification scope and acceptance criteria.
5. The agent searches `COMPONENTS.yaml` and `APIS.yaml` before introducing shared code.
6. The agent runs the task's verification and records structured evidence in its handoff.
7. The agent reconciles every linked registry record and marks the task `review` in the same change.
8. A fresh agent records the independent review using `templates/review.md`.
9. After the review disposition is accepted and findings are resolved, the coordinator reconciles `GUI-STATUS.md` with the accepted result. This is a permitted direct coordinator write. Any change to user-observable React availability or GUI selection instructions must be reflected there before the task is marked `done`; capabilities unaffected by the task remain a concise summary rather than a copied registry inventory.
10. Only the coordinator marks the task `done`, and the reconciled `GUI-STATUS.md`, task lifecycle update, and any corresponding registry reconciliation are included in the same completion commit.

When an agent encounters an unresolved fundamental decision, it reports `ADR REQUIRED`. The coordinator automatically has a fresh proposer draft an evidence-based ADR and presents it to the human. The task remains blocked until the human
explicitly accepts or rejects the proposal; after acceptance, the task designer links the ADR and refines the affected task before work resumes. See `decisions/README.md`.

Only the migration task designer creates or refines task packets and dependencies. The coordinator promotes and completes task lifecycle states. Implementation agents add a follow-up proposal to their handoff instead of expanding scope.

One narrow exception: a **factual correction to a `done` packet's recorded evidence** — a wrong file path, a stale line-number citation, a superseded tool version — may be made by `/fm-quickfix` without the designer, because it changes
what the packet *says happened*, not what it required. Scope, acceptance criteria, `Files Allowed To Modify`, dependencies, and any packet not yet `done` remain designer-only, and a correction that would alter what the task was allowed
to do is a refinement, not a correction. Never rewrite an implementer's or reviewer's own attested findings this way; correct the packet's evidence and leave their handoff text as written.

## Choosing A Mechanism

Not every change is a task. Route by the size of the change, not by which directory it lands in.

| Change                                                                                             | Mechanism                     |
|----------------------------------------------------------------------------------------------------|-------------------------------|
| A user-observable capability, a contract, a registry record, a selector, anything needing an ADR     | `/fm-orchestrate` task packet |
| Mechanical repair with no behavioral surface, or a single-module bugfix shipping a regression test   | `/fm-quickfix`                |
| The migration's own governance surface — this file, `templates/`, `.claude/agents/migration-*.md`    | Direct coordinator edit       |
| An already-dirty tree that needs attributing and landing before the next task                        | `/fm-reconcile`               |

A quickfix is gated, recorded in `MAINTENANCE.md`, and committed like any other change; it simply skips the packet, the subagents, and the independent review, because for a two-line repair those cost more than they protect. It never
uses an `FM-NNN:` commit subject, never edits a registry contract or a `data-testid`, and aborts rather than committing if the diff outgrows that gate.

This exists because the overhead was causing debt rather than preventing it. A stale `search.spec.ts` locator survived FM-044, FM-045, and FM-041 — each implementer correctly reported it as out of scope and proposed a corrective packet
that nobody ever wrote — and a repo-wide `format:check` failure was carried as inherited debt across four handoffs the same way. When the cheapest available action is a designer/implementer/reviewer chain, walking past a small defect
is the rational choice, and small defects compound. Prefer the lightest mechanism that still leaves the change gated and recorded.

## Creating Task Batches

Use `/create-next-tasks <count>` to create the next consecutive planned FM packets. For example, `/create-next-tasks 3` creates the three IDs after the highest existing `FM-NNN` packet. `STATUS.md` lists only the earliest dependency-ready
packet under `Upcoming`; later batch members remain planned task packets until they become immediately next work.

New tasks default to substantial vertical capabilities: keep the route, UI state, API/transport adaptation, necessary shared code, focused tests, and registry evidence together when they are necessary for one user-observable result. Split
only at genuine dependencies, independent product capabilities, separate runtime boundaries, or unresolved contracts. Do not split a feature by source file or layer merely to create smaller tasks, and do not combine unrelated features
simply to increase task size.

## Agent Autonomy And Escalation

Agents make routine, reversible implementation decisions without waiting for approval. Inspect repository conventions, choose the smallest conventional solution consistent with the task and ADRs, verify it, and record material assumptions
in the handoff.

Stop and escalate only when:

- requirements or accepted decisions genuinely conflict;
- satisfying the task requires modifying a file outside `Files Allowed To Modify`;
- unavailable external access, credentials, services, or user action are required;
- a consequential architectural choice is not covered by an ADR; report `ADR REQUIRED` with the decision question, evidence, viable options, affected work, and recommendation so the coordinator can start the proposal process;
- unexpected concurrent changes directly conflict with the task's implementation.

Do not escalate ordinary naming, file organization, test arrangement, or tooling details that have a clear conventional answer. When escalating, state the blocker, evidence, and smallest viable options. Keep the task `in_progress` or mark
it `blocked`; do not mark incomplete work `review`.

## Read And Write Scope

`Files Allowed To Modify` restricts writes only. Unless a task explicitly narrows read scope for security or confidentiality, agents may read and search the entire repository as needed to satisfy acceptance and verification.

`Context To Read` lists mandatory starting points, not an exhaustive read allowlist. Repository-wide searches are expected when acceptance uses terms such as every, all, complete, no duplicates, or parity.

Generated or temporary files count as modifications. Keep them inside allowed paths or ignored temporary locations. If a required tool would modify a prohibited path, escalate rather than silently broadening scope.

## Dependencies And Toolchain

- Runtime dependencies are packages required by the shipped application. They must conform to accepted ADRs and the assigned task. A new competing framework or consequential runtime choice requires an ADR.
- Development dependencies are packages used only for build, linting, formatting, testing, validation, or code generation. Agents may add conventional, narrowly scoped development dependencies without approval when they do not introduce a
  competing framework.
- Every dependency addition must be classified, justified, lockfile-consistent, and recorded in the handoff. Avoid packages when the platform or an approved dependency already provides the capability.
- Project manifests and accepted specifications define the supported toolchain, not whichever Node or npm version happens to be installed locally.
- The React project must declare its supported Node range and exact package-manager version. Agents record the actual Node and package-manager versions used for verification.
- Do not downgrade packages or change the declared toolchain to accommodate an older local environment. Update the environment when possible; otherwise report the mismatch and blocked verification.

## Verification Integrity

- Do not weaken linting, formatting, type checking, tests, coverage expectations, or production build configuration to obtain a passing result.
- Do not suppress, skip, ignore, or misclassify failures.
- Do not use silent dependency downgrades, compatibility flags, or fallback implementations that change the intended architecture.
- A temporary workaround must be unavoidable, explicit in code or configuration where appropriate, and recorded under `Temporary Exceptions And Debt` with its reason, impact, removal condition, and follow-up.
- Verification instructions must identify the working directory, exact command, and expected successful outcome. Record skipped or blocked commands as such; never imply they passed.
- Before handoff, compare task-owned changed files with `Files Allowed To Modify` and explicitly confirm scope compliance.
- Full system, browser, native, packaging, and similarly expensive verification runs once for each relevant task-owned implementation revision. The implementation handoff records command results and a verification basis that identifies the
  tested files and their SHA-256 contents.
- A fresh reviewer independently audits the verification basis, command result, test coverage, and current diff. Matching evidence is valid without rerunning the command. The reviewer reruns an expensive command only when evidence is
  missing, failed, inconsistent, stale, nondeterministic, insufficient to establish critical behavior, or does not credibly cover the claimed criterion.
- A correction reruns only commands affected by files it changes. Unchanged command evidence remains valid when the recorded verification basis still matches the task-owned implementation and test files.
- A clean install (`npm ci`) is required in a task's verification chain only when the task modifies `package.json` or `package-lock.json`, or when a clean install is itself part of acceptance. Otherwise use the cheapest install that
  guarantees `node_modules` matches the lockfile, and omit the step when it already does. An install is still mandatory whenever `node_modules` is absent or inconsistent with the lockfile, and the handoff records which install command
  actually ran. CI retains its clean install as the reproducibility guarantee.
- That exception is scoped to installation only. Type checking, linting, formatting, tests, build, API checks, and migration validation remain unconditional, and no other verification step may be made conditional by analogy.

## Registry Rules

- Feature IDs use `F-<AREA>-<CAPABILITY>`.
- Component IDs use `C-<RESPONSIBILITY>`.
- API IDs use `API-<AREA>-<OPERATION>`.
- Task IDs use `FM-NNN`.
- Decisions use `ADR-NNNN`.
- IDs are permanent. Superseded records remain present and point to their replacement.
- A shared component or API wrapper must have a registry ID before it is implemented.
- Existing `data-testid` values are compatibility contracts unless a task explicitly replaces them.
- `Depends on` and `Blocks` contain only comma-separated task IDs or `None`. Put explanatory prose under `Dependency Notes`.
- An implementation handoff reconciles every registry record linked by its task: current target, tests, state, task ownership, gaps, selector contracts, and backlog ownership must be updated or explicitly confirmed unchanged.
- An unfinished feature or component without a non-done task owner must carry `backlog: { status: deferred, rationale: "..." }`, or name its next task or blocking ADR. `deferred` is intentional planning state, not a claim of completion.

## Context Discipline

- Keep task packets below roughly 100 lines.
- Do not paste logs, source files, schemas, or investigation transcripts into migration documents.
- Keep completed task files in place, but do not load them for unrelated work.
- Keep `STATUS.md` limited to active, blocked, review-ready, and immediately next work.
- Verify legacy behavior from source and tests; older planning documents may be stale.
- Use Git history for chronology.
- Use `templates/handoff.md` for every implementation handoff, including tasks created before that template existed.

## Parallel Work

The initial workflow is sequential. The same task ownership and allowed-file rules support future worktrees: concurrent tasks must not own the same implementation files or registry records.
