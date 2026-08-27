# FM-117: Config Control Treatment

Status: in_progress Owner:
Feature IDs: F-CONFIG-SHELL
Component IDs: C-CONFIG-FIELDS
API IDs: None
Depends on: None
Blocks: FM-120

## Outcome

Four user-visible defects, all resolved in `core/ui-react/src/app/theme.ts` and deliberately one packet because they
edit the same override blocks and would conflict as separate diffs: (a) chips fields clip wrapped chip rows because
`MuiInputBase.root` clamps every non-multiline input to `controlHeight` 32px (`theme.ts:786-800`, `:192`), reinforced by
`MuiOutlinedInput.input`'s `height: 100%` / zero vertical padding (`:932-936`), and there is no `MuiAutocomplete` entry
anywhere in the theme; (b) `type="number"` inputs show native spinner arrows — the owner dislikes them in Firefox — at
seven sites in four files, of which exactly one (`filterControls.tsx:158-170`, `numericFieldSx`) suppresses them
locally, its own comment noting the theme does not express this; (c) the outlined fields do not read as outlined and
the same control renders two ways on the two grounds (ADR-0036); (d) `palette.error.main` `#a33938` (`theme.ts:281`)
fails contrast as a foreground (ADR-0035).

## Decision Dependencies

- ADR-0035 — `error.main` corrected app-wide, token only; its four binding constraints become acceptance below.
- ADR-0036 — one ground, one readable border; its five binding constraints become acceptance below.

## Files Allowed To Modify

- `core/ui-react/src/app/theme.ts` and `core/ui-react/src/app/theme.test.ts`
- `core/ui-react/src/features/search/results/filterControls.tsx` — **only** deleting the now-theme-covered spinner
  rules from `numericFieldSx`; the monospace font and sizing stay
- `core/ui-react/src/features/config/ConfigShell.tsx` (plus `ConfigShell.test.tsx`) — **only if** the ADR-0036 ground
  resolution takes the "config tab bodies gain the `Paper` the dialogs already have" direction; untouched otherwise
- `tests/system/tests/*.spec.ts` — add-only measurement/evidence cases for the criteria below
- This task packet, `../STATUS.md`, and the `C-CONFIG-FIELDS` / `F-CONFIG-SHELL` records if their prose must note the
  treatment change

## Out Of Scope

- `SettingRow.tsx:87`'s `maxWidth: 560` — that caps width, not height, and is not to be changed.
- Every chips/number call site other than `filterControls.tsx`: `ChipsSetting.tsx` (21 call sites benefit through the
  theme), `NumberSetting.tsx:102`, `CategoryEntryFields.tsx:141`/`:165`, `HistoryRefineBar.tsx:385`/`:401` are all
  fixed by theme rules alone. If a theme-level rule genuinely cannot express one of (a)/(b), escalate — do not start
  editing call sites.
- The dyschromatopsia variant's own `error` override (`theme.ts:468-471`) stays as it is (ADR-0035).
- `MuiInputLabel`'s `shrink: true` (`theme.ts:806-819`) stays (ADR-0036).

## Context To Read

- ADR-0035 and ADR-0036 in full — their evidence sections are the defect analysis.
- `theme.ts:186-192` (`controlHeight` and its own comment: inputs whose "single-line box should not grow" — a wrapped
  chips control is exactly not that), `:786-800`, `:892-947`, `:932-936`, `:806-819`, `:281`, and the `surfaces`
  tokens (`recessed`, `hairline`) declared at `:34-56`.
- `ChipsSetting.tsx:111-192` (stock MUI `Autocomplete freeSolo multiple`, no sizing props) and one wide call site,
  e.g. Searching's "Map user agents".
- `filterControls.tsx:155-170` (the local suppression and its comment) and `:208`/`:222` (its two `type="number"` uses).

## Acceptance

- (a) A chips control whose chips wrap grows to show every row — no clipping — while single-line inputs keep their
  32px box exactly. All chips call sites benefit with zero call-site edits.
- (b) All seven `type="number"` sites render without native spinner arrows in Firefox (`appearance: textfield` with
  the `-moz-` prefix is what Firefox honours) and in Chromium (webkit spin-button rules). Keyboard Up/Down stepping
  still works. `numericFieldSx`'s spinner rules are deleted, not duplicated.
- (c) Per ADR-0036: the outline is visible on both `background.default` and `background.paper` (record the chosen
  border value and why); the two-grounds problem is resolved in exactly one stated direction, never both; hover,
  focus, disabled, and error states remain mutually distinguishable after the border weight changes.
- (d) Per ADR-0035: `error.main`'s lightness clears 4.5:1 against both `background.paper` and `background.default`
  with hue preserved; the change is to the token only, no call site gains a literal or override; every site using the
  token as a *background* is re-checked and reported.
- Measured contrast ratios appear in the handoff as numbers (old and new, against both grounds) — never adjectives.
- Red-first/mutation evidence for the central claims: the chips-growth measurement must be shown failing (clipped
  height) against base before the theme change, and the theme unit assertions must be shown failing when the new
  rules are reverted. A test that is green either way proves nothing (see `../MAINTENANCE.md`'s
  `indexerStatuses.test.ts` fixture lesson).
- Screenshot strip per `../README.md` *Visual Gate*, desktop 1280x800 (mobile 390x844 where layout differs), covering
  **both a config tab and a dialog in the same pass** (ADR-0036 requires this explicitly): a wrapped chips field, a
  number field, the outlined-field treatment on both grounds, and a text-variant `color="error"` Delete button
  (`IndexerDialog.tsx` or `DownloaderDialog.tsx`).

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run
  build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` pass; `npm run knip`
  reports only its known pre-existing finding. Compare lint/knip/test counts against a pristine-base run before
  claiming any delta (`../MAINTENANCE.md` records the base state).
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config.spec.ts
  tests/config-searching.spec.ts` passes, plus whichever spec carries the new measurement case.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`;
only the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — (a)/(b) are mechanical, but (c)/(d) are design judgement inside a shared theme with two ADRs'
  worth of binding constraints and app-wide blast radius.
- Reviewer: `opus` — at least the implementer's tier; a shared-theme change every later packet's screenshots sit on.
- Fixer: `sonnet` — expected findings are token values, test wording, and evidence gaps.

Implementer prompt: Start at `theme.ts:186-192` and read `controlHeight`'s comment — the fix for (a) is teaching the
theme that a multiple-Autocomplete root is a growing box, not deleting the clamp. Trap: proving (c) on only one ground
is the exact failure ADR-0036 exists to correct. Prove the chips clipping red first, in Firefox for (b).
Reviewer prompt: Check hardest the ADR constraint lists item by item — especially "one direction only" for the ground
resolution and the error-as-background re-check. Distrust any contrast claim without the arithmetic, and any test that
was never shown red.
