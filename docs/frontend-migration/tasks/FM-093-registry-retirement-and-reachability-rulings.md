# FM-093: Registry Retirement And Reachability Rulings

Status: planned Owner:
Feature IDs: F-SEARCH-TOUR, F-CONFIG-EXTERNAL-TOOLS, F-SYSTEM-CONTROL, F-SYSTEM-UPDATES, F-SYSTEM-LOG, F-SEARCH-PROGRESS, F-PLATFORM-LIVE-STATUS, F-AUTH-LOGIN
Component IDs: None
API IDs: API-TOUR-HIDDEN, API-TOUR-HIDE, API-DEMO-START, API-DEMO-STOP
Depends on: None
Blocks: None

## Outcome

The registries state the truth about capabilities the migration will not reproduce: ADR-0022's tour/demo retirement is
recorded (the first use of the `retired` parity state), and gap lines that describe legacy-unreachable or already-shipped
behavior are reclassified with the existing `deliberate -` convention. Registry-only work, no product code; it belongs in
one packet because every edit is the same kind of change (recorded-evidence bookkeeping) gated by `validate:migration`.
Decision sources are cited per edit below; no edit introduces a new product or UX decision.

## Decision Dependencies

ADR-0022 (tour/demo retirement). Every other edit's authority is the cited registry/STATUS evidence, not a new decision.

## Files Allowed To Modify

- `../FEATURES.yaml`, `../APIS.yaml`, `../GUI-STATUS.md`, this task packet, `../STATUS.md`

## Out Of Scope

- Any product, test, or backend code; removing the `GuidedTourWeb`/`DemoDataProvider` backend surface (ADR-0022 defers it)
- The `gaps:`/`deviations:` schema split (proposed, unapproved) — only the existing `deliberate -` prefix is used
- `F-SEARCH-RECENT` (manual-QA item, no code or registry change until a real screen-reader session verifies ADR-0012)
- Parity flips for any record this packet's edits do not touch

## Context To Read

- `../DECISIONS.md` ADR-0022; `core/ui-react/scripts/validate-migration.mjs` `parityStates` (`retired`'s own rules)
- `../APIS.yaml` `unverified_legacy_calls` (API-LEGACY-MIGRATION-URL/FILES/MESSAGES) and the API-LIVE-SOCKJS note
- `core/ui-src/js/directives/hydra-checks-footer.js:376-379` + `migration-service.js` (welcome link → migration endpoints)
- `core/ui-src/html/states/login.html`, `login-controller.js` (no OIDC affordance); `../STATUS.md`'s FM-080/FM-083 entries

## Acceptance

- `F-SEARCH-TOUR`: `parity: retired`, `target: null`, and a gap/note line naming ADR-0022 as the deciding entry.
- `APIS.yaml` API-TOUR-HIDDEN/API-TOUR-HIDE/API-DEMO-START/API-DEMO-STOP: each gains a note "retired per ADR-0022, never
  adopted by React"; `target: null` and `contract_state` stay as they are.
- `F-CONFIG-EXTERNAL-TOOLS`: the wizard's `not migrated -` line becomes `deliberate -`, keeping its evidence (no trigger
  anywhere in the legacy UI, `config-service.js:100-233`).
- `F-SYSTEM-CONTROL`: the migrate-button `not migrated -` line becomes `deliberate -`, keeping its evidence (all three
  `/internalapi/migration/*` endpoints have no backend mapping, so the legacy button cannot succeed).
- `F-SYSTEM-UPDATES`: the version-ignore line becomes `deliberate -` (legacy offers no control on this page; the footer
  control shipped in FM-080 under `F-PLATFORM-LIVE-STATUS`); the automatic-update-notice line stops reading as unmigrated
  (FM-080 implemented it) and becomes a `deliberate -` pointer to `F-PLATFORM-LIVE-STATUS`; parity flips to `done`.
- `F-SYSTEM-LOG`: the log-filtering line becomes `deliberate -` (legacy's `hydra-log.js` offers none either); parity
  flips to `done`.
- `F-SEARCH-PROGRESS`: the two-button-layout line gains the `deliberate -` prefix FM-083 recorded it under per
  `../STATUS.md`; parity flips to `done`.
- `F-PLATFORM-LIVE-STATUS`: the welcome "migrate your data" line becomes `deliberate -` with the reachability evidence
  (the legacy link fires `MigrationService.migrate`, whose `/internalapi/migration/*` calls have no backend mapping —
  same ruling as `F-SYSTEM-CONTROL`); the stale "keeps legacy's one connection per subscription" line is corrected to
  FM-085's shared-connection reality (evidence: API-LIVE-SOCKJS note); parity flips to `done`.
- `F-AUTH-LOGIN`: the BASIC-logout line becomes `deliberate -`, recorded as a permanent shared limitation rather than a
  React gap. Owner ruling 2026-08-23. Evidence: `POST /loggedout` (`MainWeb.java:92`) is dead server code that **no UI has
  ever called** — a case-insensitive sweep of `core/ui-src` finds only AngularJS `user:loggedOut` *events*, never the
  endpoint — so this is not an endpoint React failed to adopt. React already implements legacy's actual BASIC mechanism
  (`session.ts`'s `askForPassword` → `internalapi/askpassword?old_username=`). Keep the existing "verified live" text.
- `F-AUTH-LOGIN`: the OIDC line becomes `deliberate -` (no legacy SPA surface: `login.html`/`login-controller.js` carry
  no OIDC affordance; sign-in happens in server-side redirects the SPA never renders); the BASIC-logout line and
  `parity: partial` stay untouched pending the owner's `POST /loggedout` decision.
- Every reclassified line keeps its factual justification text; no line is deleted without its content surviving in the
  replacement; `GUI-STATUS.md` rows are reconciled for the flipped records in the same commit.

## Verification

- In `core/ui-react`: `npm run validate:migration` succeeds (proves the first `retired` record validates).
- In `core/ui-react`: `npm run test -- --run scripts` (validator's own tests, if any are wired) or note as not applicable.
- `git diff --stat` touches only the five allowed files; `git diff --check` clean.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — every edit is enumerated with its wording intent and evidence; no judgment beyond phrasing.
- Reviewer: `opus` — the registry is the migration's parity contract and this is `retired`'s first use; each
  reclassification must be audited against its cited evidence, not against the packet's own summary.
- Fixer: `sonnet` — findings would be wording- or evidence-citation-level.

Implementer prompt: Start at `validate-migration.mjs`'s `parityStates` comment for what a `retired` record must carry.
Trap: `parity: done` is only correct where every remaining gap line is `deliberate -` after your edits — re-read each
full gap list before flipping, and never flip `F-AUTH-LOGIN`. Prove first `validate:migration` with `F-SEARCH-TOUR` retired.
Reviewer prompt: Check hardest that no reclassification lost its factual justification and that no record was flipped to
`done` while a bare (non-`deliberate`) gap line survives. Distrust the packet's own evidence summaries — open the cited
legacy sources and APIS.yaml entries yourself.
