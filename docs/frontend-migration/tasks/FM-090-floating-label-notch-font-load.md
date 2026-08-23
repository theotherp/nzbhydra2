# FM-090: Floating-Label Notch Font-Load Fix

Status: planned Owner:
Feature IDs: None Component IDs: None API IDs: None Depends on: None Blocks: None

## Outcome

A long `TextField` floating label (e.g. "Additional filter terms", `SearchWorkspace.tsx:944`) can render with the outlined
border's top line crossing the back half of the label instead of the notch clearing it. Verified live 2026-08-23: the notch
`legend` measured 112.67px against the label's 117.34px in the loaded IBM Plex Sans; the app's own visual harness
(`tests/system/tests/visualEvidence.ts` awaits `document.fonts.ready`) waits the race out, so no existing strip shows it —
real cold loads do. This task reproduces the defect deterministically, identifies the true mechanism, fixes it once in
shared app scope (bootstrap, font-loading strategy, or theme) so every outlined label app-wide clears its notch, and pins
it with a regression test that survives the harness's font waiting.

## Decision Dependencies

ADR-0014 (stock MUI, theme-level styling only), ADR-0006/ADR-0009 context for visual intent.

## Files Allowed To Modify

- `core/ui-react/src/App.tsx` (+ `App.test.tsx`), `core/ui-react/src/main.tsx`, `core/ui-react/index.html`
- `core/ui-react/src/app/theme.ts` (+ `theme.test.ts`); at most one new small module under `core/ui-react/src/app/` (+ its test)
- One new spec file under `tests/system/tests/` for the deterministic reproduction/regression
- This task packet and `../STATUS.md`

## Out Of Scope

- Any per-feature or per-field change (`SearchWorkspace.tsx`, config forms, …) — the fix is shared or it is wrong
- Weakening `visualEvidence.ts`'s `document.fonts.ready` wait or any existing test
- Shortening label text, forking MUI, or adding a dependency
- Upgrading `@mui/material`

## Context To Read

- `../MAINTENANCE.md` Open candidates, 2026-08-23 notch entry — the live measurements and the harness-blindness analysis.
  **Known-stale detail there**: "measures the label's width once via a ref" describes MUI v4; the vendored MUI 7.3.9
  (`node_modules/@mui/material/OutlinedInput/NotchedOutline.js`) is CSS-only — the `legend` duplicates the label text at
  `fontSize: 0.75em` and self-sizes, while the visible `InputLabel` renders full-size under a `scale(0.75)` transform. The
  mechanism you verify (e.g. divergent glyph advances between 12px-rendered and 16px-scaled-to-75% text after the swap, a
  frozen `max-width` transition, or something else) decides the fix shape; record it with measurements in the handoff.
- `theme.ts`: `MuiInputLabel` `shrink: true` default and `MuiOutlinedInput` `notched: true` default — every outlined field
  app-wide has a permanently open notch, so the exposure is app-wide, not one field's
- `App.tsx:6-11`: fonts are vendored `@fontsource` CSS side-effect imports (same-origin woff2), so a Playwright route
  delaying `**/*.woff2` reproduces the cold-load ordering deterministically

## Acceptance

- Red first: a system test that delays woff2 fulfillment until after first paint, then releases it, demonstrates the
  pre-fix overlap on "Additional filter terms" (label box intersecting the outline's top border / exceeding legend width),
  and passes post-fix. It must not rely on `prepareVisualEvidence`'s fonts.ready wait to hide or produce the result.
- The handoff names the verified mechanism and why the chosen fix follows from it; a fix chosen without that verification
  is a finding.
- Post-fix, under the same delayed-then-loaded sequence: the legend's width ≥ the floating label's rendered width for
  "Additional filter terms" *and* at least one other long label on a different route (pick one from the config forms),
  asserted numerically via bounding boxes.
- No regression: short labels, label-less inputs (empty legend must still draw no gap — see `MuiOutlinedInput`'s comment),
  focused 2px border, and existing visual strips are unaffected; the full existing suite stays green with no test edits
  outside the allowed files.
- The fix contains no color/font/radius literals in feature code and no per-field markup (ADR-0014); if it is a global CSS
  or bootstrap-level measure, it lives in the allowed `app`/entry files only.
- Screenshot strip per `../README.md` *Visual Gate*: the affected field pre-fix (overlapping, fonts-delayed) and post-fix
  (clear notch) at desktop 1280x800; mobile only if the layout differs.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:production-assets && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/<new-spec>.spec.ts tests/search.spec.ts tests/smoke.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — cross-cutting shared-infrastructure fix whose mechanism must be established before the fix shape is
  chosen; the packet bounds the surface but the judgment is real. (`fable` not warranted: reproduction is deterministic and
  the candidate surface is small.)
- Reviewer: `opus` — at least the implementer's tier; app-bootstrap/theme scope touches every outlined field in the app.
- Fixer: `opus` — findings here would likely be mechanism-level, not mechanical.

Implementer prompt: Reproduce before reading solutions: throttle `**/*.woff2` in Playwright and measure the legend vs. label
boxes. Trap: the ledger's "measured once via a ref" diagnosis is MUI v4 lore — the vendored 7.3.9 legend is CSS-self-sizing,
so a `resize`-event-on-fonts.ready fix may be a no-op; prove whatever you ship actually moves the measured numbers. Prove
first the red case fails on the current tree.
Reviewer prompt: Check hardest that the mechanism claim is backed by measurements, not the ledger's narrative, and that the
delayed-font test fails when the fix is reverted (ask for that evidence). Distrust green visual strips — the harness waits
out exactly this race; only the delayed-font path is probative.
