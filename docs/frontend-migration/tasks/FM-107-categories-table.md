# FM-107: Categories Table

Status: planned Owner:
Feature IDs: F-CONFIG-CATEGORIES
Component IDs: C-CONFIG-FIELDS
API IDs: None
Depends on: None
Blocks: None

## Outcome

The Categories repeat section becomes a table with per-category expansion — summary columns (name, search type, newznab
categories, size preset when enabled) that make the whole catalog auditable without scrolling stacked fieldsets, each row
expanding in place to the existing full entry fields — plus inline validation of newznab category tokens, which today
pass through unchecked ("The category configuration is not validated in any way", `categoriesSettings.ts:75`). Source:
owner backlog `docs/config-ui-improvements.md` §4.4, fed into design 2026-08-24; this packet is the contract,
implementers ignore that file per its banner. No reordering is added: legacy has none, and the owner's own note requires
evidence order matters before inventing one — the implementer records in the handoff what a search of consumers shows,
and adds nothing either way.

## Decision Dependencies

None (client-side validation mirrors the backend's parse; the config schema is untouched).

## Files Allowed To Modify

- In `core/ui-react/src/features/config/categories/`: `CategoriesConfigTab.tsx`, `CategoryEntryFields.tsx`,
  `categoriesSettings.ts`, their tests, and new table files + tests
- `tests/system/tests/config-categories.spec.ts` — cases asserting the stacked layout may be rewritten
- The `F-CONFIG-CATEGORIES` record in `../FEATURES.yaml`
- This task packet, `../STATUS.md`, `../GUI-STATUS.md` if its derived row changes

## Out Of Scope

- `RepeatSection.tsx` (untouched; this section takes ownership of its list rendering like FM-063/064's lists did), the
  three catalog-wide settings above the list, the advanced gating of the whole fieldset (`CategoriesConfigTab.tsx:82` —
  the table stays behind it), reordering, and FM-061's open minor findings unless the rework subsumes them naturally

## Context To Read

- `CategoriesConfigTab.tsx` (the live default-category options derivation that must keep reading the form) and
  `CategoryEntryFields.tsx` (the full field set an expanded row renders; the size-preset pair)
- `categoriesSettings.ts:58-130` (`newznabCategories` is `string[]` client-side; the "&"-combination help at `:67`) and
  `shared/mapping/src/main/java/org/nzbhydra/config/category/Category.java:46` (`List<List<Integer>>` — a token is
  digits optionally `&`-joined, which is the shape the inline validator must accept and nothing else)
- `F-CONFIG-CATEGORIES.selectors` in `../FEATURES.yaml`; `/core/ui-react/AGENTS.md` *UI Conventions* (ADR-0014)

## Acceptance

- Table (`config-categories-table`), inside the existing advanced fieldset: one row per entry in config order — name
  (or the existing empty-name legend), search type label, newznab categories joined for display, min/max sizes when
  `enableCategorySizes` is on — with an expand toggle (`config-category-expand-<index>`) revealing the existing
  `CategoryEntryFields` for that entry in place, bound by config index. Add and remove keep their behavior; remove asks
  the shared confirm dialog naming the category.
- Inline newznab validation: each entered chip must match `^\d+(&\d+)*$`; a violating chip is refused with a message
  naming the token and the accepted shape (the `ChipsSetting` gains an optional per-chip validator only if none exists —
  an additive `C-CONFIG-FIELDS` prop defaulting to previous behavior, FM-066's precedent). Existing stored violations
  render flagged, never silently dropped.
- The default-category select keeps updating live from the form as rows are edited (the `CategoriesConfigTab.tsx:38-55`
  behavior, retested over the table).
- Tests: table rendering, expansion binding (edit an expanded field in a multi-row table → right entry changes),
  validator unit tests (accepts `2010`, `2010&11000`; rejects `2010&`, `abc`, `2010,3000`); `config-categories.spec.ts`
  rewrites layout-bound cases and adds an invalid-token refusal case.
- Selector changes recorded in `F-CONFIG-CATEGORIES.selectors` (repeat-section ids this replaces, with a comment naming
  this packet); `C-CONFIG-FIELDS` responsibility updated if the chips validator lands there. ADR-0014 throughout.
- Screenshot strip per `../README.md` *Visual Gate*: desktop 1280x800 table collapsed and one row expanded with a
  refused token visible; mobile 390x844 showing the scroll container.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run validate:migration && npm run validate:focus-affordances` succeeds — except that the last is
  **red at base** on five known false positives (`../MAINTENANCE.md`). None is in this packet's files: all three
  config-side ones live in `features/config/indexers/`, which this packet may not touch. Report it *failed* with a
  base-comparison run on a pristine tree (stash or `git archive`) proving your finding set is byte-identical to base; a
  sixth finding — including any the new chip-refusal styling introduces — is yours to fix. Never silence it by adding
  entries to the exemption list at `scripts/validate-focus-affordances.mjs:112` — that weakens a real gate to hide a
  matcher bug, and FM-111 refused exactly that workaround.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-categories.spec.ts` passes
  in full. If the per-chip validator lands on `ChipsSetting` (`C-CONFIG-FIELDS`), its five other consumers — Main,
  Searching, Auth, Notifications, `IndexerDialog` — are in the blast radius and the run is instead
  `-- tests/config-categories.spec.ts tests/config-searching.spec.ts tests/config-main.spec.ts
  tests/config-indexers.spec.ts`, all unedited and green (`config-searching.spec.ts:212-260,290` is the one case that
  renders stored chip values end to end). A local validator in the categories table keeps the narrow filter honest.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — the table follows FM-105's shape, the validator is fully specified, and the fields inside an
  expanded row are the existing components unchanged.
- Reviewer: `opus` — if the chips validator lands in `C-CONFIG-FIELDS`, a shared-component change; audit its default.
- Fixer: `sonnet` — mechanical.

Implementer prompt: Start at `CategoriesConfigTab.tsx` and `CategoryEntryFields.tsx`. Trap: the whole fieldset is
`advanced` — every test must switch the toggle (or FM-098's expander, if merged by then) on first or it renders nothing.
Second trap: `enableCategorySizes` gates the size columns live via `useWatch`, not at mount. Prove the expanded-row
index binding first with three categories and the middle one expanded.
Reviewer prompt: Check hardest that stored invalid tokens still round-trip (flagged, not dropped) and that the chips
validator defaults off for every other consumer. Distrust the advanced-toggle handling in rewritten specs.
