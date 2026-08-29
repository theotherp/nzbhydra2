# FM-135: Raw Log View Bounding Decision

Status: planned Owner:
Feature IDs: F-SYSTEM-LOG
Component IDs: None
API IDs: API-SYSTEM-LOG-CURRENT
Depends on: None
Blocks: None

## Outcome

The owner has ruled, on measured evidence, whether `RawLogView` keeps fetching and rendering the entire current log file,
and the repository records and implements that ruling. `RawLogView.tsx` fetches the whole file
(`API-SYSTEM-LOG-CURRENT`, text/plain, no range or size parameter — `DebugInfosWeb.java:66-71`) into one unbounded `<pre>`,
optionally every 5 seconds. That is legacy's behavior (`hydra-log.js`), not a regression, so this is a product decision
first and an implementation second: **"leave it as is, and record why" is an acceptable outcome.** The former test pressure
is gone — `18c5ed445` added `PUT /internalapi/debuginfos/rotatelog` (and `clearlog`, both deliberately without UI) and the
log tests rotate first — so the only question left is real instances with large logs, where the CI data point stands as a
cost sample: on the JaCoCo-instrumented job the render exceeded a 30s wait and `system.spec.ts:181` still carries
`LOG_VIEW_BUDGET_MS = 120_000`.

## Decision Dependencies

None yet — producing the decision entry is this task's first deliverable, per the escalation path below.

## Files Allowed To Modify

- `core/ui-react/src/features/system/logs/RawLogView.tsx` and its tests (only if the ruling requires a change)
- `core/ui-react/src/api/system/logs.ts` and its tests (only if the ruling bounds the fetch)
- `core/src/main/java/org/nzbhydra/debuginfos/DebugInfosWeb.java` + `LogContentProvider.java` (only if the ruling requires
  a server-side bound; any new/changed endpoint contract goes back to the owner first)
- `tests/system/tests/system.spec.ts` (only `LOG_VIEW_BUDGET_MS`, if the ruling makes it shrinkable)
- `docs/frontend-migration/FEATURES.yaml` (`F-SYSTEM-LOG`), `docs/frontend-migration/APIS.yaml` (`API-SYSTEM-LOG-CURRENT`)
- This task packet

## Out Of Scope

- Any UI for `rotatelog`/`clearlog` — their having no UI is deliberate (`18c5ed445`).
- The JSON log view's paging (`API-SYSTEM-LOG-JSON` already pages) and the download link (`API-SYSTEM-LOG-DOWNLOAD`
  streams via the browser).
- Implementing a bound the owner has not ruled for.

## Context To Read

`RawLogView.tsx` (the query, `staleTime: 0`, the 5s refresh, the tail-scroll effect); `api/system/logs.ts`
(`getCurrentLogFile` via `requestBlob`); `DebugInfosWeb.java:66-71,91-124` and `LogContentProvider`; `system.spec.ts`'s two
log tests and `LOG_VIEW_BUDGET_MS`; the `APIS.yaml` notes for the four `API-SYSTEM-LOG-*` records; the maintenance
candidate (surfaced 2026-08-29, partly-overtaken note included); commit `18c5ed445`'s message.

## Acceptance

- Measured, not estimated: fetch + render wall-clock and browser memory for the raw view at representative log sizes
  (at least ~1 MB, ~10 MB, ~50 MB, generated locally), with and without auto-refresh, recorded as a small table in the
  handoff. This is the evidence the decision is made on.
- The options put to the owner include at least: leave unbounded (status quo, with the measured cost); server-side tail
  parameter on `API-SYSTEM-LOG-CURRENT`; client-side bound (render last N with an explicit load-everything affordance) —
  each with its parity and contract consequences, plus a recommendation. Per `../README.md` the owner decides in
  conversation and the coordinator records a short `DECISIONS.md` entry; implementation past this point waits for it.
- The recorded ruling is implemented exactly. If it is "leave as is": no product code changes; `F-SYSTEM-LOG` and
  `API-SYSTEM-LOG-CURRENT` notes record the accepted unbounded fetch with the ADR reference, and `LOG_VIEW_BUDGET_MS`
  keeps a comment pointing at it. If it bounds the view: tests pin the bound and the tail/refresh coupling still matches
  legacy's semantics.
- If rendering changes: the screenshot strip per `../README.md` *Visual Gate* (raw view desktop 1280x800; mobile 390x844
  only if layout differs).

## Verification

- `core/ui-react`: `npx vitest run`, `npm run lint`, `npm run typecheck`, and `npm run format:check` pass
- `core/ui-react`: `npm run validate:migration` passes
- `tests/system`: `npx playwright test tests/system.spec.ts` passes against a real instance if any product code changed
- Root: `git diff --check` clean; changed files match the allowlist (empty product diff is a valid outcome)

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — the deliverable is a decision case with measurements and possibly an API-contract option; the
  acceptance criteria deliberately leave the outcome open.
- Reviewer: `opus` — at least the implementer's tier: if the ruling touched `API-SYSTEM-LOG-CURRENT` it is a contract
  change, and if it did not, the review is of the evidence and the registry wording.
- Fixer: `sonnet` — once the ruling exists, expected findings are mechanical.

Implementer prompt: Start by generating the three log sizes and measuring — the owner decides on your table, so its
honesty is the whole task. The trap is drifting into building a bound before the ruling exists; stop at the options
memo and wait. Remember auto-refresh re-pays the cost every 5 seconds; measure that mode too.
Reviewer prompt: Check the measurements are reproducible (how the logs were generated, which machine) and that a
"leave as is" outcome still shipped its registry notes and ADR reference. Distrust code not traceable to the ruling.
