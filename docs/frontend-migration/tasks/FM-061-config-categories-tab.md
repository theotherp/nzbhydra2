# FM-061: Config Categories Tab

Status: planned Owner:
Feature IDs: F-CONFIG-CATEGORIES Component IDs: C-CONFIG-FIELDS, C-CATEGORY-CATALOG, C-CONFIG-FORM API IDs: API-CONFIG-PUT Depends on: FM-059 Blocks: None

## Outcome

Admins manage the Hydra category catalog at `/config/categories` in React: the three catalog-wide settings and full add/edit/remove of categories with their search type, subtype, word and regex restrictions, size presets, newznab category
numbers, and ignore rules.

## Boundary Rationale

An independent product capability over its own `CategoriesConfig` section, and the one config surface that feeds a shared component search already consumes (`C-CATEGORY-CATALOG`): the catalog's shape and the editor that produces it must be
reviewed together. It depends on FM-059 only for the field vocabulary.

## Decision Dependencies

- Accepted: ADR-0002, ADR-0003, ADR-0004, ADR-0014, ADR-0015.
- Blocking proposed/rejected: None.

## Files Allowed To Modify

- `core/ui-react/src/features/config/categories/**`
- `core/ui-react/src/features/config/components/**`, only for additive, non-forking extensions FM-059's vocabulary genuinely lacks; FM-059's and FM-060's tests must keep passing unmodified
- `core/ui-react/src/domain/categories/**`, only additively and only if the editor needs a type or lookup the catalog already owns; existing catalog consumers must keep passing unmodified
- FM-058's config shell/form files and `core/ui-react/src/router.tsx` (+ `router.test.tsx`), only to mount the Categories tab body
- `tests/system/tests/config-categories.spec.ts`
- The `F-CONFIG-CATEGORIES`, `C-CONFIG-FIELDS`, and `C-CATEGORY-CATALOG` records only
- This task packet and `docs/frontend-migration/STATUS.md`

## Read Scope

The agent may read/search the repository. Context To Read is mandatory starting context. Do not modify files outside Files Allowed To Modify.

## Out Of Scope

- The search page's category selection, per-indexer category mappings (FM-066 owns the indexer form), and backend category-mapping logic
- Any change to how the search routes read `C-CATEGORY-CATALOG` today

## Context To Read

- FM-058 and FM-059 packets and handoffs, `/core/ui-react/AGENTS.md` *UI Conventions*, and the listed registry records
- `core/ui-src/js/config/config-fields-service.js:1604-1836` (the whole tab, including the `categories` repeat section and its `defaultModel`), `core/ui-src/html/states/config.html` (`repeatSection.html`)
- `shared/mapping/.../config/category/CategoriesConfig.java` and `Category.java`, `core/src/main/java/org/nzbhydra/config/validation/CategoriesConfigValidator.java`, `core/ui-react/src/domain/categories/catalog.ts`

## Acceptance

- `/config/categories` renders the three catalog-wide fields (`enableCategorySizes`, `defaultCategory`, `overwriteNaWithSearchCategory`) with legacy's labels, help, and tooltips, and the advanced-gated help block. The default-category select
  offers "All" plus every configured category name and is driven by the live form values, so a category renamed in this session is selectable without a reload — legacy required one (`config-fields-service.js:1621-1626`).
- The categories list adds, edits, and removes entries inline in the whole-config form, each labelled by its name, with legacy's `defaultModel` for a new entry (`searchType: SEARCH`, `subtype: NONE`, `applyRestrictionsType: NONE`,
  `ignoreResultsFrom: NONE`, `mayBeSelected: true`, `preselect: true`, empty word/category lists, null regexes and size presets) and the whole section advanced-gated as legacy has it.
- Every per-category field is present with legacy's option sets and help: name (required), search type (General/Audio/EBook/Movie/TV), sub type (Anime/Audiobook/Comic/Ebook/None), apply-restrictions type, required/forbidden words as chips,
  required/forbidden regexes, the min/max size preset pair labelled in MB as one row, limit-API-results-size, newznab categories as chips, and ignore-results-from.
- Newznab category entries accept legacy's tuple syntax: a bare number, and numbers joined with `&` to require several in one result (`config-fields-service.js:1789-1795`). Entries are stored as the strings the backend expects; a test covers
  a plain and an `&`-joined value surviving a save and reload.
- Renaming or removing a category is reflected wherever the running React app derives categories from the saved config, and the packet's handoff states which surfaces need a reload to pick the change up.
- New `data-testid` values are recorded in `F-CONFIG-CATEGORIES.selectors`.
- Tests: component tests for add/edit/remove, the default-category select tracking live names, chips entry, and required-name validation; `tests/system/tests/config-categories.spec.ts` (using the `hydra` fixture, which restores the instance
  config) adds a category with a newznab tuple and a size preset, saves against the real backend, reloads, and proves every edited value persisted and no other category changed.
- Screenshot strip per `../README.md` *Visual Gate*: `/config/categories` with the list collapsed to defaults, one category expanded for editing, and a newly added category, at 1280x800 and 390x844.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run check:api && npm run validate:migration && npm run validate:focus-affordances` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-categories.spec.ts` succeeds, and `tests/config.spec.ts` and `tests/search.spec.ts` still pass unchanged.
- Run `git diff --check`; confirm changed files match Files Allowed To Modify and no generated artifacts are left behind.

## Handoff / Review

Use `templates/handoff.md`; fill every section and mark `review` only after verification succeeds.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — a declarative field set plus a list section whose behavior FM-060 already demonstrated; the acceptance criteria settle the option sets, defaults, and tuple syntax.
- Reviewer: `opus` — at least the implementer's tier because the edited data is the input to `C-CATEGORY-CATALOG`, which the search routes consume, so a shape mistake here surfaces far from this tab.
- Fixer: `sonnet` — expected findings are missing fields, wrong defaults, or a missing validation message.

Implementer prompt: Start at `config-fields-service.js:1604-1836` and `CategoriesConfigValidator`; the validator tells you which shapes the backend will reject before the UI does. Trap: turning newznab categories into numbers — `&`-joined
entries are strings and must stay strings. Prove one added category survives a real save and reload before polishing the editor.
Reviewer prompt: Check hardest that a category the user renames or removes cannot leave a dangling `defaultCategory`, and that no per-category field from the legacy range is missing. Distrust a chips test that only exercises plain numbers.
