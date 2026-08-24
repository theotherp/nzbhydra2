# FM-097: Config Sidebar Navigation And Sticky Save Bar

Status: planned Owner:
Feature IDs: F-CONFIG-SHELL
Component IDs: C-CONFIG-FORM
API IDs: None
Depends on: FM-108, FM-109
Blocks: FM-098, FM-099, FM-100, FM-101, FM-102

## Outcome

The config area's chrome is restructured: the eight horizontal tabs become a left settings sidebar (icon + label per
section, the structure language of the search Refine sidebar — permanent panel on desktop, MUI `Drawer` on mobile like
`RefineSidebar.tsx`), and the shell header becomes a sticky bar that always holds Save and, while the form is dirty, adds
"N settings changed" and a Discard button. Each sidebar entry shows a dirty dot and an invalid dot for its section. Source:
owner backlog `docs/config-ui-improvements.md` §1.1 + §3.1, fed into design 2026-08-24 — this packet, not that file, is
the contract; implementers ignore that file per its own banner. The two belong together because both are one restructuring
of `ConfigShell.tsx`'s single header row, and the per-section badges are the save bar's summary broken down by nav entry.

## Decision Dependencies

None (ADR-0014 governs the treatment; route URLs and the whole-config save contract are unchanged by owner constraint §6).

## Files Allowed To Modify

- `core/ui-react/src/features/config/ConfigShell.tsx` + test, `configTabs.ts` + test, and new shell-level files directly
  in `core/ui-react/src/features/config/` (not in tab subdirectories) with their tests
- `tests/system/tests/config.spec.ts`
- The `F-CONFIG-SHELL` record in `../FEATURES.yaml`; the `C-CONFIG-FORM` record note in `../COMPONENTS.yaml` if its
  responsibility wording changes
- This task packet, `../STATUS.md`, `../GUI-STATUS.md` if its derived row changes

## Out Of Scope

- Settings search (FM-099), review-changes panel (FM-100), validation banner (FM-101), in-tab anchor nav (FM-102)
- Route URLs (`/config/<tab>` stays, `configTabs.ts` segments untouched), the save pipeline (`useConfigSave.ts`), the
  unsaved-changes blocker semantics, and every tab body

## Context To Read

- `ConfigShell.tsx:184-263` (the header row being replaced: Tabs 203-218, advanced toggle 225-236, API button 237-243,
  Save 244-257) and `configTabs.ts` (`CONFIG_TABS`, `configTabTestId` — compatibility contracts)
- `RefineSidebar.tsx` (the sidebar idiom: permanent panel md+, `Drawer` below, collapse affordance)
- `api/config/schema.ts:32-39` (the top-level section keys that map dirty/invalid state onto tabs; note External Tools
  edits live under `externalTools`, Notifications under `notificationConfig`, Categories under `categoriesConfig`)
- `/core/ui-react/AGENTS.md` *UI Conventions* (ADR-0014)

## Acceptance

- Sidebar: one entry per `CONFIG_TABS` member in order, icon + label, linking via router `Link` to the unchanged hrefs;
  the active entry is visibly selected; every entry keeps its existing `config-tab-<path>` testid. On viewports below the
  `md` breakpoint the sidebar becomes a toggleable `Drawer` (new selector `config-nav-open`); the nav container is
  `config-nav`. The advanced toggle (`config-advanced-toggle`) and API button (`config-api-help`) move to the sidebar's
  foot with behavior and testids unchanged.
- Sticky bar: sticks to the top of the config area while scrolling (`position: sticky`, theme surface tokens only). Save
  keeps testid `config-save` and its submit semantics (`ConfigShell.tsx:94-113` untouched). While `formState.isDirty`:
  the bar shows "N settings changed" (`config-dirty-summary`) and Discard (`config-discard`), which resets the form from
  the cached loaded config exactly as the blocker's deny branch does (`ConfigShell.tsx:134-140`). Pristine: both absent.
  The `isDirty` colour switch on Save (`:250`) is dropped — the bar's summary is the replacement signal; record this as
  the deviation it is in the handoff.
- N counts dirty leaf paths from `formState.dirtyFields` via a pure helper with unit tests covering scalar, nested-object,
  and array shapes (an array entry counts once, however many of its fields changed).
- Badges: a sidebar entry whose top-level section key has dirty fields shows a dirty dot (`config-nav-dirty-<path>`);
  one with validation errors (`formState.errors`) shows an invalid dot (`config-nav-invalid-<path>`). Colour is never the
  sole carrier: each dot has an `aria-label` naming the state. The key→tab mapping is a tested pure function.
- Tests: `ConfigShell.test.tsx` covers nav rendering, badge derivation, sticky-bar dirty/pristine states, and Discard;
  `config.spec.ts` keeps every existing case green (tab testids unmoved) and adds: edit a Main field → dirty summary and
  Main dirty dot appear → Discard → both gone and the field restored.
- New selectors recorded in `F-CONFIG-SHELL.selectors`; no colour/font/radius literal in feature code (ADR-0014).
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 pristine and dirty (badges visible), mobile 390x844
  with the drawer closed and open.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — restructures the shared shell every tab renders inside, and the dirty/invalid derivation from RHF
  state across array sections demands judgment.
- Reviewer: `opus` — shell chrome is a cross-tab contract; must verify no tab behavior or selector regressed.
- Fixer: `opus` — fixes will sit in the same shared state derivations.

Implementer prompt: Start at `ConfigShell.tsx:184-263` and `RefineSidebar.tsx`. Trap: `formState.dirtyFields` for arrays
can hold sparse entries and marks structure changes oddly — write the counting helper against real RHF output, not the
docs. Second trap: the blocker (`:115-143`) compares pathnames — do not break `isConfigLocation` when moving nav markup.
Prove first that all eight existing `config-tab-*` testids still navigate in the real app before styling anything.
Reviewer prompt: Check hardest that no existing `config.spec.ts` assertion was edited to pass and that Save's submit path
is byte-identical. Distrust jsdom badge evidence — require the system-test dirty-dot case and the strip.
