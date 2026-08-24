# FM-108: Dead Export Pruning And Knip Guard

Status: ready Owner:
Feature IDs: None
Component IDs: C-CONFIG-FIELDS
API IDs: None
Depends on: None
Blocks: FM-097, FM-103, FM-106, FM-109, FM-110

## Outcome

The React tree's export surface stops lying about its consumers, and a guard keeps it honest: a knip run on 2026-08-24
(npx knip, default config) reported 58 unused exports and 29 unused exported types. Spot-verification shows almost all
are symbols referenced only inside their own module (`interpretCustomMappingTest`, `CONFIG_ROUTE_BASE`,
`searchFormSchema`, every `*_TEST_ID`/`UNNAMED_*` constant, …) plus five dead re-exports in the `C-CONFIG-FIELDS`
barrel `features/config/components/index.ts` (`generateApiKey`, `maximumValidator`, `minimumValidator`,
`settingRowTestId`, `type SettingProps` — every consumer, tests included, imports those from the concrete files). This
task removes the stale `export` modifiers and barrel lines, deletes any declaration with zero references anywhere, and
wires knip in as a permanent gate so the next batch cannot regrow the surface. Strictly behavior-preserving: no value,
call site, DOM node, selector, or network request changes — the compiler proves no external consumer existed.

## Decision Dependencies

None (a dev-only lint-class gate; no runtime, API, or architecture change. Batch context: first of the 2026-08-24
cleanup batch FM-108..FM-112, sequenced ahead of the config-improvements batch so FM-097+/FM-103/FM-106 build on the
pruned files instead of colliding with this diff).

## Files Allowed To Modify

- `core/ui-react/package.json`, `package-lock.json` (knip devDependency, pinned, and a `knip` script), and a knip
  config file (`knip.json` or a `knip` key) — generated `src/api/generated/openapi.ts` is ignored there, never edited
- Any `core/ui-react/src/**` or `core/ui-react/vite/**` file named by the knip report — edits limited to removing
  `export` modifiers/re-export lines, deleting unreferenced declarations, and adjusting doc comments those carried
- `core/ui-react/AGENTS.md` — add `knip` to the *Verification* gates list, nothing else
- This task packet, `../STATUS.md`

## Out Of Scope

- Renames, file moves/splits, new abstractions, or any change to a symbol that has an external consumer
- Dead *branches* inside live functions (MAINTENANCE.md quickfix candidates stay where they are)
- `src/api/generated/openapi.ts` (regenerated wholesale; excluded via config), `node_modules`, legacy anything

## Context To Read

- The knip report reproduced by `npx knip` in `core/ui-react` (re-run it; the 2026-08-24 counts are the baseline, the
  fresh run is authoritative)
- `features/config/components/index.ts` (the barrel; its doc comment stays — the barrel itself is still the tab
  bodies' import path for everything that remains)
- `core/ui-react/AGENTS.md` *Verification*

## Acceptance

- knip is a pinned devDependency with a committed config: `src/api/generated/openapi.ts` exports ignored; `vite/*.ts`
  and `scripts/*.mjs` treated as entries where needed; test files remain consumers (default). `npm run knip` exits 0.
- Every reported symbol is resolved by exactly one of: (a) referenced in its own module (or only via a concrete-file
  import) → the `export` modifier or barrel re-export line is removed, declaration untouched; (b) zero references in
  `src`, `vite`, `scripts`, and tests (grep evidence, not knip alone) → the declaration is deleted. No third kind of
  edit appears in the diff.
- The five dead barrel entries above are pruned from `features/config/components/index.ts`; the concrete files keep
  their exports (`SettingRow.tsx`, `NumberSetting.tsx`, and `configFields.test.tsx` import them directly today).
- `git diff` over `src/`/`vite/` contains only export-keyword removals, deleted declarations, deleted re-export lines,
  and comment adjustments — no logic, JSX, selector, or literal edits.
- No test file's assertions change; import-line edits in tests only if a test imported through a pruned barrel path
  (none known today).

## Verification

- In `core/ui-react`: `npm run typecheck && npm run lint && npm run format:check && npm run test -- --run && npm run build && npm run knip && npm run validate:migration` succeeds.
- No system-test run required: the diff is unreachable at runtime by construction (typecheck green proves no consumer
  existed; nothing rendered or requested changes). State this rationale in the handoff.
- `git diff --check` clean; changed files match `Files Allowed To Modify`; `src/api/generated/openapi.ts` byte-identical.

## Handoff / Review

Implementer fills `../templates/handoff.md` and marks the task `review`; a fresh reviewer fills `../templates/review.md`; only
the coordinator marks `done`.

## Agent Routing

Suggestions only; the coordinator may override and records why. Not part of the contract — the sections above govern.

- Implementer: `sonnet` — mechanical per-symbol resolution with a settled two-branch rule.
- Reviewer: `sonnet` — verifies the diff-shape invariant and the guard config; no shared contract changes.
- Fixer: `sonnet` — expected findings are per-line.

Implementer prompt: Re-run `npx knip` first and work from that list, not the packet's counts. Trap: knip counts test
files as consumers, so a flagged symbol may still be load-bearing inside its own module — grep every symbol before
choosing delete over unexport. Second trap: `eslint-plugin-react-refresh` can newly complain when a `.tsx` file's
export mix changes — run lint early, not last. Prove first that knip goes green with `openapi.ts` ignored via config,
not edited.
Reviewer prompt: Check hardest that no deleted declaration had a test-only consumer and that the diff contains zero
logic hunks — read every hunk, it is short. Distrust knip's classification; trust the grep evidence in the handoff.
