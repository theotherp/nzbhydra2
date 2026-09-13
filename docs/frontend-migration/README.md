# Frontend Migration

AngularJS was fully replaced by React; see `ADR-0001`/`ADR-0023` and `FM-095` in `DECISIONS.md`/`STATUS.md`. This directory now
coordinates ongoing frontend work under the same risk-routed process. Conversation history is not part of its authoritative
context. Completed task packets and the original long-form ADRs were deliberately removed from the tree on 2026-08-19; git
history (`git log -- docs/frontend-migration`) is the archive.

## Reading Order

1. `/AGENTS.md`
2. This file
3. For work under `core/ui-react`: `/core/ui-react/AGENTS.md` (including its *UI Conventions*)
4. For packet work: the assigned file under `tasks/` and whatever it links

## Sources Of Truth

| Information                                | Authoritative file |
|--------------------------------------------|--------------------|
| Durable product and deployment constraints | `CONTEXT.md`       |
| Binding decisions                          | `DECISIONS.md`     |
| Active and next work                       | `STATUS.md`        |
| Behavioral parity inventory                | `FEATURES.yaml`    |
| Shared target components                   | `COMPONENTS.yaml`  |
| Frontend API adoption                      | `APIS.yaml`        |
| Open task packets                          | `tasks/FM-*.md`    |
| Fixes made outside the packet pipeline     | `MAINTENANCE.md`   |
| Human-facing GUI availability summary      | `GUI-STATUS.md`    |

Do not duplicate an authoritative fact in another document; link its stable ID instead. `GUI-STATUS.md` is a derived summary,
never a source of truth.

## Design Rules

ADR-0014 (see `DECISIONS.md`) governs all UI work: the owner's mock defines the design tokens and page structure, which live in
`theme.ts`; control anatomy is stock MUI with visible labels and default affordances. The concrete rules are in
`/core/ui-react/AGENTS.md`, *UI Conventions*. Deviating from stock MUI needs a written justification; deviating from the mock's
pixels does not.

## Choosing A Mechanism

Route by risk, not by visibility. A change being user-visible does **not** by itself require a packet.

| Change                                                                                          | Mechanism                    |
|-------------------------------------------------------------------------------------------------|------------------------------|
| New user capability; API/URL/selector contract change; persisted-data change; cross-module behavior change; anything needing a new decision entry | Task packet with independent review |
| Styling, markup, or UX polish inside existing features; single-module bugfix shipping a regression test; mechanical repair | Single-session fix (below)   |

**Single-session fix** (`/fm-quickfix` or done directly): one agent implements, runs the relevant gates, captures screenshots if
rendering changed, and appends one `MAINTENANCE.md` entry. No designer, no reviewer, no decision entry, no registry edit, no
`data-testid` change. If mid-fix the change turns out to alter behavior across modules or any contract, stop and convert it to a
packet rather than finishing it as a fix.

## Task Packets

States: `planned`, `ready`, `in_progress`, `review`, `blocked`, `done`. The coordinator promotes and completes; the implementer
marks `in_progress`, stays within the packet's modification scope, verifies, and hands off as `review`; a fresh agent reviews
against the acceptance criteria and the actual diff before the coordinator marks `done` and reconciles `STATUS.md`,
`GUI-STATUS.md`, and the registries in the same commit. Done packets are then deleted from `tasks/` (git keeps them).

- A packet is ≤ 80 lines: outcome, acceptance criteria, `Files Allowed To Modify` (the write boundary — reads are unrestricted),
  verification commands, linked IDs. A closing `Agent Routing` section may add ≤ 15 lines: a suggested model tier and a thin
  invocation prompt per worker role. Routing is advisory, sits outside the contract, and never restates it.
- Packets are vertical capabilities: route, UI state, API adaptation, tests, and registry updates together. Split only at
  genuine dependencies or independent capabilities, never by source file or layer.
- Agents decide routine, reversible implementation details themselves. Escalate only for: conflicting requirements, a needed
  write outside the allowed files, missing external access, or a consequential choice not covered by `DECISIONS.md` (report the
  question, evidence, options, and a recommendation; the owner decides in conversation and the decision is recorded as a short
  `DECISIONS.md` entry).

## Visual Gate

Any change that alters rendering ships a **screenshot strip**: captures of each state it touched (desktop 1280x800, plus mobile
390x844 when layout differs), taken via `tests/system/tests/visualEvidence.ts` or a Playwright session, referenced from the
handoff or `MAINTENANCE.md` entry. The owner approves by looking at them. There are no per-record visual contracts, geometry
matrices, or variance bookkeeping; add an automated geometry assertion only to pin a regression that actually happened.

## Verification Integrity

- Never weaken lint, formatting, type checking, tests, coverage, or build configuration to obtain a pass. Never suppress, skip,
  or misclassify a failure. Never delete or weaken a test to complete work.
- Record the working directory, exact command, and result for every gate. A skipped or blocked command is recorded as such —
  never implied to have passed.
- Expensive verification (Playwright against a real backend, packaging) runs once per implementation revision; the reviewer
  reruns it only when evidence is missing, failed, stale, or does not cover the claimed criterion.
- Before handoff, confirm the changed files match the packet's allowed files.

## Registries

- IDs (`F-*`, `C-*`, `API-*`, `FM-NNN`, `ADR-NNNN`) are permanent; superseded records point to their replacement.
- A shared component or API wrapper gets a registry ID before it is implemented. Check `COMPONENTS.yaml`/`APIS.yaml` before
  introducing shared code.
- Existing `data-testid` values are compatibility contracts unless a packet explicitly replaces them.
- Parity states are `inventoried`, `planned`, `partial`, `done`, `unverified_legacy_api`, and `retired`. `retired` means the
  migration decided **not** to reproduce a capability and requires an accepted `DECISIONS.md` entry naming that decision — it is
  not a synonym for `done`, and a reader must be able to tell "we built this" from "we decided not to". Marking a record
  retired is packet work, never an ad-hoc edit.
- `npm run validate:migration` (in `core/ui-react`) must pass; it checks registry shape, referenced paths, task metadata, and
  `STATUS.md` consistency.

## Context Discipline

- `STATUS.md` holds only active/blocked/review/next work, ≤ 5 lines per entry; details belong in the packet and git history.
- Never paste logs, source files, or investigation transcripts into migration documents.
- `MAINTENANCE.md` entries are append-only and a few lines each.
- Verify legacy behavior from `core/ui-src` source and tests, not from older planning documents.
