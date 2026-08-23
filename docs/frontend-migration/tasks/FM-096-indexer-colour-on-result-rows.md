# FM-096: Indexer Colour On Result Rows

Status: planned Owner:
Feature IDs: F-SEARCH-RESULTS, F-SEARCH-INDEXERS
Component IDs: None
API IDs: None
Depends on: None
Blocks: None

## Outcome

The per-indexer Color setting becomes visible again: each result row whose indexer has a colour configured shows a small
swatch of that colour beside the indexer name in the Indexer cell. React round-trips the value but consumes it nowhere,
making its help text ("used in the search results to mark the indexer's results", `IndexerDialog.tsx:654`) false.
Rationale: owner decision in conversation 2026-08-23 — show the colour again as "a subtle indexer-colour accent to result
rows"; dropping the setting and leaving it stored-but-dead were both rejected. Legacy's whole-`tbody` `rgba(colour,0.5)`
tint is not reproduced: an arbitrary colour at 0.5 alpha behind row text cannot meet WCAG contrast on the dark palette
and collides with row states that already carry meaning (teal recency stripe from FM-054, nested rows' `action.hover`
background, Downloaded chip); a bounded swatch shows any colour without touching either. Independent of FM-092 (picker) —
the value is settable today via the dialog's free-text field; no shared code files.

## Decision Dependencies

None (owner decision 2026-08-23 recorded above; ADR-0014 governs the treatment, ADR-0017 the config read path).

## Files Allowed To Modify

- In `core/ui-react/src/features/search/results/`: `SearchResults.tsx` + test, `resultTable.ts` + test
- `tests/system/tests/results.spec.ts` — add cases only; existing cases stay untouched
- The `F-SEARCH-RESULTS` and `F-SEARCH-INDEXERS` records in `../FEATURES.yaml`
- This task packet, `../STATUS.md`, `../GUI-STATUS.md` if its derived row changes

## Out Of Scope

- The search form's indexer selection (`SearchWorkspace.tsx:1043-1120`): legacy tinted those checkboxes too
  (`indexer-input.js:41-42`), but the owner named result rows and the setting promises only results — a `deliberate -` gap
- FM-092's picker/clear controls; the stored value's format or config schema; any `theme.ts` change (the user's colour is
  data, never a token); the recency stripe, Downloaded chip, and nested-row treatments

## Context To Read

- `core/ui-src/js/search-results-controller.js:21-25,800-806` and `core/ui-src/html/states/search-results.html:365` (legacy
  map `indexer.name → indexer.color` from safe config; value is `rgb(r,g,b)` string or null; null → unstyled)
- `SearchResults.tsx:201-224` (ADR-0017 live safe-config read), `:1626-1668` (`resultColumns`), memoized `ResultRow`;
  `resultTable.ts` `quickFiltersFromSafeConfig` (the untyped-narrowing pattern to follow); `SafeIndexerConfig.java`
  (`name`, `color` are in safe config); `/core/ui-react/AGENTS.md` *UI Conventions* (ADR-0014)

## Acceptance

- A row whose `result.indexer` maps to a configured colour renders a swatch before the indexer name in the Indexer cell;
  the map comes from the live safe config via the ADR-0017 read path already in `SearchResults.tsx`, through a narrowing
  helper in `resultTable.ts`. Indexers with no colour render exactly as today — no placeholder, no layout shift.
- Swatch anatomy: a small bounded shape sized from theme spacing, filled with the user's value, outlined 1px in `divider`
  so near-black, near-white, and saturated colours all stay visible on the dark surface; `data-testid`
  `search-result-indexer-swatch`, recorded in `F-SEARCH-RESULTS.selectors`. No colour/font/radius literal in feature code
  beyond binding the user's own value (ADR-0014, same allowance as FM-092's swatch).
- Nothing else changes: row background, text colours, recency stripe, and Downloaded chip stay untouched (contrast holds
  by construction; a component test asserts row and cell styles unchanged with colours configured). Colour is never the
  sole carrier: the indexer name text stays in the cell; the swatch is `aria-hidden` decoration.
- The Color field is free text: only a value matching legacy's `rgb(r,g,b)` shape renders; any other non-null string
  renders no swatch, never throwing. `ResultRow` stays memoized; the map is referentially stable across re-renders.
- Tests: `resultTable.test.ts` covers map building plus null/malformed values; `SearchResults.test.tsx` covers swatch
  present/absent per indexer; a new `results.spec.ts` case sets one mock indexer's colour via `hydra.getConfig`/`saveConfig`,
  searches, and asserts the swatch's computed background matches and the uncoloured indexer has none.
- Two `deliberate -` gap lines (owner 2026-08-23, FM-096): on `F-SEARCH-RESULTS`, legacy's 0.5-alpha row tint replaced by
  the swatch; on `F-SEARCH-INDEXERS`, the search form's checkbox tint (`indexer-input.js:41-42`) not reproduced.
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 results showing a dark, a saturated, and an
  uncoloured indexer, with one recency-flagged row (swatch and teal stripe coexisting); mobile 390x844 if layout differs.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/results.spec.ts` passes in full.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — one feature module, an existing narrowing pattern to copy, and the treatment fully settled above.
- Reviewer: `sonnet` — no shared component or contract changes; one additive selector.
- Fixer: `sonnet` — expected findings are mechanical.

Implementer prompt: Start at `SearchResults.tsx:201-224` and `resultTable.ts`'s `quickFiltersFromSafeConfig`. Trap:
`resultColumns` is a module constant whose `value(result)` cannot see config — plumb the map into the memoized `ResultRow`
as a stable prop, or its memoization silently breaks. Second trap: the Color field is free text; validate the `rgb(r,g,b)`
shape before rendering. Prove first, in a real browser, that a configured colour appears on its rows and nowhere else.
Reviewer prompt: Check hardest that no row background or text colour changed anywhere (diff the row `sx` paths) and that
no colour literal entered feature code. Distrust jsdom-only rendering evidence — require the system-test and strip.
