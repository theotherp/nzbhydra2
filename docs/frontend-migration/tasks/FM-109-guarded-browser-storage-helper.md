# FM-109: Guarded Browser Storage Helper

Status: planned Owner:
Feature IDs: None
Component IDs: None
API IDs: None
Depends on: FM-108
Blocks: FM-097, FM-111, FM-112

## Outcome

Five byte-similar copies of the guarded-localStorage boilerplate collapse into one shared module. Today each of
`features/stats/dashboard/persistence.ts`, `features/system/logs/persistence.ts`, `features/config/advancedFields.ts`,
`features/search/workspace/SearchWorkspace.tsx:65-87`, and `features/search/results/SearchResults.tsx:2518-2559` (plus
its write at `:469`) carries its own `getStorage()` returning `window.localStorage` behind try/catch and its own
guarded read/write — the logs module's comment even points at the stats module as the pattern it copied. The new
module (`core/ui-react/src/domain/storage/`, the established home for shared pure helpers per `C-DATE-TIME`'s
precedent) exports exactly `readItem(key): string | undefined` and `writeItem(key, value): void`, both swallowing
accessor and operation throws. Parsing, defaults, and keys stay at the call sites, so the abstraction dedups only what
is genuinely identical and every site's behavior is byte-for-byte unchanged. Registered as `C-BROWSER-STORAGE`.

## Decision Dependencies

None (no storage key, format, or semantic changes; second of the 2026-08-24 cleanup batch FM-108..FM-112, ahead of the
config batch because FM-098's allowlist includes `advancedFields.ts`).

## Files Allowed To Modify

- New `core/ui-react/src/domain/storage/` module + unit tests
- The five adopting files named above (each edit: delete the local `getStorage`/try-catch helpers, call the shared
  module; nothing else) and their test files only for import-line changes or stubs that targeted a deleted local helper
- A new `C-BROWSER-STORAGE` record in `../COMPONENTS.yaml` (responsibility, target, consumers — the five adopters)
- This task packet, `../STATUS.md`

## Out Of Scope

- Any JSON/parse/default logic move into the shared module (tri-state `loadIncludeDisabled` vs. default-false
  `readFlag` vs. `loadChoices`' shape checks stay exactly where and as they are)
- Key renames or payload changes (`hydra.search-results.table` carries FM-089's refine keys; `hydra.config.showAdvanced`
  is FM-097/FM-098 territory); `services/preferences` (`C-SERVER-PREFERENCES` is server-side flags, unrelated)
- sessionStorage, IndexedDB, or any new persistence

## Context To Read

- The five sites' current guards: `stats/dashboard/persistence.ts` (tri-state + JSON), `system/logs/persistence.ts`
  (`readFlag`/`writeFlag`), `config/advancedFields.ts` (`readShowAdvanced`/`writeShowAdvanced`),
  `SearchWorkspace.tsx:65-87`, `SearchResults.tsx:465-472,2518-2559`
- `src/domain/date-time/` and its `C-DATE-TIME` record in `../COMPONENTS.yaml` (the record shape to follow)

## Acceptance

- The module exposes only `readItem`/`writeItem`; both return safely when `window.localStorage` access throws, when
  `getItem`/`setItem` throw, and in a storage-less environment — each proven by a dedicated unit test with a throwing
  stub. No default values, no JSON, no key prefixes inside the module.
- All five sites adopt it and their local `getStorage`/guard copies are deleted; every exported function of the two
  `persistence.ts` modules and `advancedFields.ts` keeps its exact signature and semantics (tri-state, default-false,
  and default-false respectively), and `SearchWorkspace`/`SearchResults` behavior is unchanged, including what is
  written on toggle and what a malformed stored payload yields.
- Storage keys are byte-identical before/after (list them in the handoff with grep evidence).
- Existing unit suites pass without assertion changes; edits there are import lines or stub retargeting only.
- `C-BROWSER-STORAGE` recorded with all five consumers; its responsibility line states the parse-stays-at-call-site
  contract so future adopters don't fatten it.

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run knip && npm run validate:migration` succeeds.
- From repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts tests/results.spec.ts` passes (covers the two search-feature adopters' persisted preferences end-to-end).
- `git diff --check` clean; changed files match `Files Allowed To Modify`; no stray generated files.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `opus` — a new shared abstraction with a registry record and five cross-feature adopters.
- Reviewer: `opus` — shared-component introduction; at least the implementer's tier per the routing rule.
- Fixer: `sonnet` — expected findings are per-site mechanical slips.

Implementer prompt: Read all five guards side by side first — the temptation is a `readFlag`-style boolean helper, and
that is exactly wrong: stats' `loadIncludeDisabled` is tri-state and must stay so. Trap: `SearchResults`' payload also
carries FM-089's refine keys — touch only its storage access, never `loadChoices`' shape handling. Prove first, by
unit test, that a throwing `window.localStorage` *accessor* (not just a throwing `getItem`) is survived.
Reviewer prompt: Check hardest that each adopter's observable semantics (return type, default, tri-state) is
byte-identical — diff each exported function before/after, not just the module. Distrust "all tests green" for
`advancedFields.ts`; its guard had no dedicated throwing-storage test before.
