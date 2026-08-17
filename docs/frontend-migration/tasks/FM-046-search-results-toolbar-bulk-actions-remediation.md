# FM-046: Results Toolbar And Bulk-Actions-Bar Mock-Fidelity Remediation

Status: planned Owner: Feature IDs: F-SEARCH-GROUP-SELECTION, F-SEARCH-DOWNLOADS, F-SEARCH-SAVED, F-SEARCH-RESULTS Component IDs: C-RESULT-TABLE, C-DOWNLOAD-ACTIONS API IDs: None Depends on: FM-045 Blocks: FM-041

## Dependency Notes

Depends on FM-045 because both own `SearchResults.tsx`, which README's Parallel Work rules forbid two concurrent tasks from owning, and because FM-045 removes the inline column-header filters and shortens the header row this task's
own toolbar/table-header measurements should be taken against, not the pre-removal layout. It blocks FM-041 (the display-options menu, compact rows, and the "Show refine sidebar" entry) because that packet adds a further control
into the toolbar region this task restyles and needs its final palette/density shape, not an intermediate one, to avoid being redone. This is a **remediation** pass over FM-040's already-`done` selection/bulk-actions work, not a
rebuild: FM-040's tri-state-checkbox/caret-menu/bulk-actions-bar structure and interaction logic are sound and reused; only the visual layer changes.

## Outcome

The results toolbar's summary line, the tri-state select-all checkbox and its caret menu, the bulk-actions bar's "Send to downloader"/ZIP buttons, and the download-actions region (downloader select, black-hole, copy-links, Save
search) read at the mock's density and palette instead of ADR-0007's legacy-grey/green tokens, with no change to what any of them does.

## Boundary Rationale

The toolbar's summary, selection affordances, and download actions all render inside the same `results-toolbar` region and the same restyle pass that touches one touches the others' surrounding container, so reviewing them
separately would mean re-reviewing shared spacing/background changes multiple times. It is separate from FM-045 because filtering and selection/download are different capabilities on different feature records (FM-040 already
established this split; this task preserves it), and separate from FM-041 because display preferences are a different, later-added control in the same region, and from FM-042 because sticky positioning is unconditional layout
behavior with its own distinct failure mode, not a color or density change.

## Decision Dependencies

- Accepted ADRs governing this task: ADR-0002 (MUI-only presentation), ADR-0004 (testing and parity), ADR-0006 (semantic visual parity), ADR-0007 (historical; superseded for palette/typography/density by ADR-0009), ADR-0008
  (historical; superseded), ADR-0009 (full mock fidelity).
- Proposed or rejected ADRs blocking this task: None.

## Files Allowed To Modify

- `core/ui-react/src/features/search/results/SearchResults.tsx`, `SearchResults.test.tsx`, `DownloadActions.tsx`, and new feature-scoped sibling modules and tests under `core/ui-react/src/features/search/results/`
- `tests/system/tests/results.spec.ts` — only this task's own visual-evidence block
- `docs/frontend-migration/FEATURES.yaml` — only `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-SAVED`, and `F-SEARCH-RESULTS`'s `visual`, `selectors`, and `tests` fields
- `docs/frontend-migration/STATUS.md` and this task packet

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- `core/ui-react/src/app/theme.ts` and `core/ui-react/src/domain/downloads/**` (unchanged, as FM-040 also left them)
- `refine-sidebar` and every filter control (FM-045's territory; already restyled by the time this task runs)
- The display-options menu, compact rows, recency highlighting (FM-041), and sticky positioning (FM-042)
- Changing selection semantics, download request/response behavior, `selectVisibleResults`, `selectionStatus`, or any existing bulk capability (downloader select, downloader-category select, black-hole/save, copy-links, Save search)
  — restyle only
- Replacing the tri-state checkbox with a non-MUI control: restyle the existing MUI `Checkbox` (custom `icon`/`checkedIcon`/`indeterminateIcon` and `sx` sizing) to match the mock's small square, per ADR-0002's MUI-only boundary

## Context To Read

- `README.md` (Visual Parity, Workflow, Registry Rules, Verification Integrity), `ADR-0002`, `ADR-0004`, `ADR-0006`, `ADR-0007`, `ADR-0008` (historical), `ADR-0009`
- `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-SAVED`, `F-SEARCH-RESULTS`, `C-RESULT-TABLE`, `C-DOWNLOAD-ACTIONS`, and the FM-012, FM-013, FM-019, and FM-040 packets
- `core/ui-react/src/app/theme.ts` (read only, post-FM-043)
- `core/ui-react/src/features/search/results/SearchResults.tsx` (`SelectionMenu`, `results-toolbar`, `search-results-summary`) and `DownloadActions.tsx` in full
- `/tmp/hydra mock/Awaiting responses for direction/NZBHydra Search.dc.html` — the sticky toolbar block (`<div style="position:sticky;top:0...">`, ignore the sticky positioning itself — that is FM-042's scope) and the grid header's
  first column (`toggleAll`/`toggleSelMenu`/`showSelMenu` block) for exact colors, padding, and control shapes; note the `renderVals()` script's `chip`/`rowStyle`/selection color functions for the exact hex/oklch values used
- `tests/system/tests/results.spec.ts` and `tests/system/tests/visualEvidence.ts`

## Acceptance

- `results-toolbar` renders on a flat background (no elevated `Paper` surface/border), matching the mock's borderless bar, with `16px 0 14px` padding; `search-results-summary` keeps its existing loaded/filtered/available/rejected
  wording, with the `· N selected` fragment rendered in `primary.main` (the new teal), matching the mock's accent treatment.
- The tri-state select-all checkbox (header and mobile-reachable toolbar copy) renders as a small (`17x17px`) square with `5px` border radius: checked is filled `primary.main` with a check mark, indeterminate shows a dash, unchecked
  is transparent with a neutral `rgba(255,255,255,0.25)`-equivalent border — implemented via MUI `Checkbox`'s `icon`/`checkedIcon`/`indeterminateIcon` and `sx`, not a bespoke control (ADR-0002). The caret's `role="menu"` renders on the
  mock's popover surface (`#2a3133`, `9px` radius, drop shadow) with unchanged `Select all`/`Deselect all`/`Invert selection` entries, order, and outcomes.
- "Send to downloader" renders with `primary.main` background and `primary.contrastText` (or an equivalent dark-on-teal color) when enabled, `8px` border radius, `8px 14px` padding, `13px` font at weight `600`; when disabled it
  renders on the mock's neutral `#2a3133`-equivalent surface with muted text — using the control's real `disabled` semantics (unchanged from FM-040), not opacity alone. The NZB ZIP action renders as the mock's secondary outlined
  button (neutral surface, `1px` border, same radius/padding scale) in both states.
- `results-download-actions` (downloader select, downloader-category select, black-hole/save, copy-links, Save search) restyles to the same surfaces/radii/typography without any change to which controls are present, their order,
  or their behavior.
- No existing `data-testid` is removed or renamed; no new one changes any accessibility affordance already verified by FM-040's component tests (`aria-haspopup`, `aria-expanded`, `role="menu"`/`"menuitem"`, `indeterminate`,
  `disabled`) — confirm these still pass, not merely assume the restyle preserves them.
- Registry reconciliation: `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-SAVED`, and `F-SEARCH-RESULTS` (all already `proposed` since FM-040) get their `note`s and `contract`s extended to record the new mock
  palette/density, without re-litigating FM-040's own structural claims; never fabricate or re-date human acceptance.
- Visual contract (ADR-0006), asserted in `results.spec.ts`. States: `toolbar-mock-density`, `tri-state-checkbox-mock-square`, `bulk-actions-mock-buttons`. Viewports: desktop 1280x800, mobile 390x844. Geometry checks:
    - the toolbar renders with no elevated-surface border/shadow and no horizontal overflow at either viewport;
    - the tri-state checkbox's rendered bounding box is within a few pixels of the mock's `17x17px` target at both checked and unchecked states, with no scrollWidth overflow;
    - the enabled "Send to downloader" button's computed background color differs measurably from its disabled-state background color, and both differ from the page background;
    - the caret menu renders fully within the viewport with no page horizontal overflow at both viewports.
  Evidence: `tests/system/tests/results.spec.ts` plus narrow captures at `visual-evidence/F-SEARCH-GROUP-SELECTION/toolbar-mock-density-desktop.png` and `-mobile.png`.

## Verification

- `npm ci` only if `package.json`/`package-lock.json` change; otherwise the cheapest install that guarantees `node_modules` matches the lockfile. Record which install ran.
- Working directory `core/ui-react`: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test -- --run`, `npm run build`, `npm run check:api`, `npm run validate:migration` — each expected to pass.
- Working directory `tests/system`: `npx tsc --noEmit` — expected to pass (this task changes a spec).
- Working directory `tests/system`, after `VITE_OUT_DIR=../target/classes/static/react npm run build` from `core/ui-react`: `npx playwright test tests/results.spec.ts` and `npx playwright test tests/downloads.spec.ts`, expected to
  produce the proposed contracts' evidence.
- Repository root: `git diff --check` — expected to produce no output.
- Confirm task-owned changed files are all listed under Files Allowed To Modify, and that no other spec's fixtures or assertions were altered.
- Confirm verification leaves no unexpected generated or modified files; the git-ignored production build under `core/target/classes/static/react` is build output, not a tracked change.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate, and mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. The reviewer cannot supply the human visual acceptance the affected records require;
that remains a human decision independent of technical review, per ADR-0006.
