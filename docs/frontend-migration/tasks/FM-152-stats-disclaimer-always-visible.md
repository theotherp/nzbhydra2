# FM-152: Always-Visible Stats Disclaimer

Status: planned Owner:
Feature IDs: F-STATS-MAIN
Component IDs: None
API IDs: None
Depends on: None
Blocks: None

## Outcome

ADR-0051: the stats disclaimer moves out of the info-icon `Popover` into a permanently visible, non-dismissible compact info
`Alert` at the top of the stats dashboard, so every user is guaranteed to see it; the popover trigger button is removed.

## Decision Dependencies

ADR-0051.

## Files Allowed To Modify

- core/ui-react/src/features/stats/dashboard/{ControlsHeader.tsx,StatsDashboardPage.tsx,StatsDashboardPage.test.tsx}
- tests/system/tests/stats.spec.ts (only if it references the removed control or needs the new alert asserted)
- This task packet and docs/frontend-migration/FEATURES.yaml (F-STATS-MAIN only)

## Out Of Scope

- No wording change to the `DISCLAIMER` constant (`ControlsHeader.tsx:28-32`); move it if its owner file changes.
- No other controls-header change; no dismiss/acknowledge mechanism (ADR-0051 says non-dismissible).

## Context To Read

- `ControlsHeader.tsx:249-268` (the IconButton + Popover being removed), `StatsDashboardPage.tsx:311-330` (where the dashboard
  composes its header — the alert becomes the section's first visible block)
- ADR-0051; F-STATS-MAIN's selectors comment (`FEATURES.yaml:1119` names `stats-disclaimer-button`)

## Acceptance

- A compact `Alert severity="info"` (stock MUI, default icon, no close button, `data-testid="stats-disclaimer"`) containing
  the full DISCLAIMER text renders as the first content block of `/stats/stats`, above the controls header, in loading,
  loaded, and error states alike — it must not depend on the stats query.
- The `stats-disclaimer-button` IconButton, the `Popover`, and their state are removed; no `aria-describedby` dangles.
- F-STATS-MAIN's selectors comment replaces `stats-disclaimer-button` with `stats-disclaimer`.
- A component test asserts the alert's presence with the DISCLAIMER text and the absence of the old button.
- Screenshot strip (Visual Gate): desktop 1280x800 dashboard top with the alert; mobile 390x844 (text wraps, no overflow).

## Verification

- core/ui-react: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run knip`,
  `npm run validate:migration`, `npm run validate:focus-affordances` — all green
- tests/system: `npx playwright test tests/stats.spec.ts` against a real backend — green
- Confirm changed files match `Files Allowed To Modify`

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks `review`; a fresh reviewer fills `../templates/review.md`; only the
coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — mechanical replacement inside one feature with settled criteria.
- Reviewer: `sonnet` — no shared component or contract changes.
- Fixer: `sonnet` — expected findings mechanical.

Implementer prompt: Start at `StatsDashboardPage.tsx:298-330` — the dashboard has distinct loading/error/loaded returns, and
the alert must render in all of them; that early-return structure is the one trap. Prove first that the alert shows during the
initial loading state.
Reviewer prompt: Check the error and loading branches render the alert; distrust a test that only covers the loaded state.
