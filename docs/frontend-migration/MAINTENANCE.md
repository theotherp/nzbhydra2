# Maintenance Ledger

Single-session fixes made outside the task-packet pipeline — gated, recorded, and committed like any other change. See
`README.md`, *Choosing A Mechanism*.

**What belongs here:** styling, markup, and UX polish inside existing features; single-module bugfixes shipping a regression
test; mechanical repairs. Rendering changes reference their screenshot strip. **What does not:** new capabilities, API/URL/
selector contract changes, `data-testid` changes, persisted-data changes, cross-module behavior changes, or anything needing a
`DECISIONS.md` entry. Those are task packets.

Entries are append-only, newest last. Never rewrite an entry to reflect later work; add a new one that references it. This ledger records completed fixes, not intentions — candidates that have not been fixed live in the handoff that
found them, or under *Open candidates* at the bottom.

Format, one entry per fix:

```
### YYYY-MM-DD — <one-line description>

- **Why not a packet:** <which gate criterion it satisfied>
- **Paths:** <paths touched>
- **Gates:** <commands run and their outcome>
- **Commit:** <sha>
```

---

### 2026-08-18 — Point every mock reference at `uimock/`

- **Why not a packet:** documentation and provenance text only; no code, contract, or behavior touched.
- **Paths:** `docs/frontend-migration/STATUS.md`, `decisions/ADR-0008-branded-visual-redesign.md`, `decisions/ADR-0009-mock-fidelity-visual-redesign.md`, and the FM-039 through FM-046 task packets (11 files, 18 references).
- **Gates:** `validate:migration` valid; `git diff --check` clean.
- **Commit:** `58fda24f9`
- **Note:** the mock moved from an untracked `/tmp` path into the repository at `uimock/` (git-ignored). Two claims that depended on the old location were false rather than merely stale and were corrected with it: FM-041's review
  observation that the mock "no longer exists on disk" described the cleared `/tmp` path, not the mock, and both ADRs' "not a repository file" provenance line now says what is true — present in the working tree, but untracked. The four
  FM-041 popover values recorded as unverified against the mock can now be checked directly against it.

### 2026-08-18 — Repair the `format:check` baseline

- **Why not a packet:** formatter output and an ignore rule; the source-comment edits were verified mechanically to touch no non-comment line.
- **Paths:** new `core/ui-react/.prettierignore`; `README.md`, `tsconfig.json`, `vite/devBackend.ts`, `vite/devBackend.test.ts`, `src/router.tsx`, `src/features/search/SearchPage.tsx` (formatter output); `src/app/theme.ts`,
  `src/features/search/results/{toolbarStyles,refineStyles,displayStyles}.ts`, `src/features/search/workspace/SearchWorkspace.tsx` (mock comment paths).
- **Gates:** `typecheck`, `lint` (0 errors, 8 pre-existing warnings), `format:check`, `test` (38 files / 223 tests), `build`, `check:api`, `validate:migration` all pass; `git diff --check` clean. Install skipped — manifests unchanged
  and `node_modules` already matched the lockfile.
- **Commit:** `4340ee7a8`
- **Note:** two distinct causes, and only one was drift. Five of the eleven failures were git-ignored `.playwright-cli` scratch artifacts: Prettier only reads a `.gitignore` next to its working directory, so the repository-root entry
  never reached it. Fixed at the cause with a `.prettierignore` rather than by formatting throwaway output. The other six were genuine drift in tracked files.

### 2026-08-18 — Reconcile the `tests/system` format:check baseline for `search.spec.ts`

- **Why not a packet:** a new Prettier config file plus `// prettier-ignore` markers preserving existing, unreformatted lines; no test assertion or behavior changed, verified by diff (only 5 comment lines added).
- **Paths:** new `tests/system/.prettierrc.json`; `tests/system/tests/search.spec.ts` (5 `// prettier-ignore` comments, no other change).
- **Gates:** `npx prettier --check tests/search.spec.ts` from `tests/system` (both via the local `core/ui-react` binary and via `npx`) — "All matched files use Prettier code style!"; `npx tsc --noEmit` in `tests/system` clean; `npm run
  validate:migration` in `core/ui-react` passes; `git diff --check` clean. No Playwright run: the change alters no assertion, only comments. Install skipped — no manifest changed in either package.
- **Commit:** `021d5cd29`
- **Note:** the original candidate (below, now resolved) undersold the scope. `tests/system` had no local Prettier config at all, so any ad hoc `prettier --check`/`--write` fell back to Prettier's defaults rather than
  `search.spec.ts`'s actual maintained style (`core/ui-react`'s config, established for this file by FM-027). Adding that config as `tests/system/.prettierrc.json` makes the file check clean for all but 5 statements that drifted from
  later hand-edits (e.g. FM-047's locator fix) into shapes Prettier's own member-chain-breaking heuristic won't reproduce under **any** `printWidth` (tested 80 through 999) — those 5 got `// prettier-ignore` instead, so a future
  `--write` won't rewrite them either. Investigating further surfaced that the other 11 `tests/system` spec files were never Prettier-formatted at all and disagree with each other on style, not just with this config — see the new
  candidate below rather than this entry; reconciling those was out of scope for a quickfix.

### 2026-08-18 — Correct FM-047's two stale `playwright-core` citations

- **Why not a packet:** factual correction to a `done` packet's recorded evidence, permitted by `README.md`'s *Workflow* carve-out; the substantive claim, the implementation, and the verification are all unchanged.
- **Paths:** `docs/frontend-migration/tasks/FM-047-recent-search-refill-locator-repair.md` (Acceptance only).
- **Gates:** `validate:migration` valid; `git diff --check` clean. No code touched, so no build, test, or Playwright run applies.
- **Commit:** `188c649cc`
- **Note:** the packet cited `playwright-core/types/types.d.ts:3906`/`:8115` for `getByRole`'s default case-insensitive-substring `name` matching; in the installed 1.62.1 both lines document `hasNotText`. Verified directly — the `name`
  option's documentation is at `:3149-3153`. Recited by symbol and quoted text rather than by line number, because the coordinates are what rotted: that block appears **eight** times across the `Page`, `Frame`, `Locator`, and
  `FrameLocator` variants and moves between releases, so any bare line number would go stale again. This discharges the FM-047 implementer's second Follow-Up Work item; its Deviations and Follow-Up text is left exactly as written,
  being its attested findings rather than the packet's evidence, so that section still reads as "not done".
- **Prerequisite:** `0b759d65c` added the `README.md` carve-out that made this discharge possible at all. Before it, only the task designer could touch a packet, so correcting two coordinates would have required a designer pass — the
  exact overhead this ledger exists to avoid.

### 2026-08-18 — Allow `desktop-wide` in the visual viewport allowlist

- **Why not a packet:** config allowlist in a validation script; no behavioral surface, consumed at exactly one call site (`validate-migration.mjs:270`, validating `FEATURES.yaml` viewport names). Widening the set cannot invalidate anything currently valid.
- **Paths:** `core/ui-react/scripts/validate-migration.mjs`.
- **Gates:** `core/ui-react` `typecheck`, `lint`, `format:check`, `test -- --run` (226/226 across 38 files), `build`, `check:api`, `validate:migration` all passed; `git diff --check` clean at the root. No pre-existing failures. Install skipped — no lockfile change and `node_modules` already consistent. `tests/system` gates not run: nothing there changed.
- **Commit:** `b1bf2770a`
- **Note:** the defect was drift between two registries of the same concept — `tests/system/tests/visualEvidence.ts`'s `visualViewports` gained `desktop-wide` (1900x1000) in FM-042 under ADR-0011's `Human Decision` item 3, while the validator's allowlist did not, and the validator was the stricter one. This lifts the block only; actually moving the viewport into `FEATURES.yaml`'s structured `contract.viewports` array is a registry-contract edit and stays a candidate below.

### 2026-08-18 — Render the results Size column as a human-readable size

- **Why not a packet:** contained bugfix with a regression test. `ResultColumn.value` has exactly two call sites (`SearchResults.tsx:1595`, `:1598`), both rendering; sorting and the size min/max refine filters read `result.size` directly and are untouched. No `data-testid` changed and no `FEATURES.yaml` contract asserts this cell's content.
- **Paths:** `core/ui-react/src/features/search/results/SearchResults.tsx`, `resultTable.ts`, `resultTable.test.ts`.
- **Gates:** `core/ui-react` `typecheck`, `lint`, `format:check`, `test -- --run` (231/231, up from 226 by the five new cases), `build`, `check:api`, `validate:migration` all passed; `git diff --check` clean at the root. No pre-existing failures. Install skipped — no lockfile change, `node_modules` already consistent. `tests/system` gates not run: nothing there changed, and no spec asserts this cell's value (`results.spec.ts`'s only `Size` reference is the header label at `:2969`). The formatted string is strictly shorter than the byte integer it replaces, so FM-042's cell-spill assertions can only be relaxed by it.
- **Commit:** `066db3089`
- **Note:** the column rendered the raw byte integer (`result.size ?? ""`), so a 1.4 GB release showed as `1503238553`. A parity gap predating FM-042, whose implementer found it while satisfying that task's non-title-cell-spill check and correctly left it out of scope. `formatResultSize` mirrors angular-filter's `byteFmt` as bundled in `core/src/main/resources/static/js/alllibs.js:65093` rather than guessing a format — 1024-based steps, `B`/`KB`/`MB`/... labels, at most two decimals. Not *exactly* two: `byteFmt` concatenates the Number `convertToDecimal` returns, so trailing zeros never reach the DOM and `1503238553` renders `1.4 GB`, not `1.40 GB`. One deliberate divergence: `byteFmt` yields the string `"NaN"` for a non-numeric size, where this renders an empty cell, matching the missing-size case. Tests were written first and observed failing (5 failed | 12 passed) before the implementation, then passing (17/17).

### 2026-08-18 — Stop Prettier crashing on `tests/system`'s git-ignored runtime output

- **Why not a packet:** an ignore file; no behavioral surface, and it repairs the cause (Prettier examining files it should never examine) rather than suppressing findings.
- **Paths:** `tests/system/.prettierignore` (new).
- **Gates:** `tests/system` `npx tsc --noEmit` passed; `core/ui-react` `validate:migration` and `format:check` passed; `git diff --check` clean at the root. No Playwright run — no spec, fixture, or assertion changed. `core/ui-react`'s remaining gates not run: nothing there was touched.
- **Commit:** `654f403ba`
- **Note:** `npx prettier --check .` run unscoped from `tests/system` aborted on `data/logs/nzbhydra2-log.json` (newline-delimited JSON, git-ignored runtime output), so the directory had no usable formatting gate at all. Prettier only reads a `.gitignore` next to its own working directory, which is why `core/ui-react` already carried one. Ignored: runtime/build output, `package-lock.json`, the Java module's `src/`, and `instanceData/`'s byte-sensitive v1-migration fixture. **Deliberately not ignored:** `tests/*.ts`, `playwright.config.ts`, `tsconfig.json` — the never-formatted-sources candidate below is still open, and the command now reports those 13 files (exit 1) instead of crashing, which is the point.

### 2026-08-18 — Establish the Prettier baseline for `tests/system` sources

- **Why not a packet:** formatter output. The item had been routed to `/fm-orchestrate` only because nobody had decided whether to establish the baseline; the repository owner decided on 2026-08-18, with the git-blame churn stated up front. A task packet to run a formatter is the overhead this command exists to avoid.
- **Paths:** 13 files — `tests/system/playwright.config.ts`, `tsconfig.json`, and `tests/{downloads,external-tools,news,results,search-history,shell-selector,smoke,stats}.spec.ts`, `tests/{environment,fixtures,visualEvidence}.ts`. (`search.spec.ts` was already formatted by FM-047.)
- **Gates:** `tests/system` `npx tsc --noEmit` passed and `npx prettier --check .` passed — the first time it has ever reported clean; `core/ui-react` `validate:migration` and `format:check` passed; `git diff --check` clean at the root. Because the diff touches the `results.spec.ts` FM-042 landed the same day, static checks were not treated as sufficient: `tests/results.spec.ts` was run in full against a real Maven-built JVM backend with mockserver and the sonarr/radarr fixtures — **22 passed (57.3s), exit 0**, the same tally FM-042 recorded before reformatting. The other spec files were not executed.
- **Commit:** `ba4acd521`
- **Note:** these files were invisible until `654f403ba` stopped `prettier --check .` crashing before it reached them, so the directory had a gate that could never pass. Semantic equivalence was checked rather than assumed, and the **first check failed**: a whitespace-stripped fingerprint differed for 9 files, because Prettier also normalizes quote style (`"a[href=\"/\"]"` becomes `'a[href="/"]'`, an identical runtime string) and adds arrow parens. A structural invariant was used instead — per-file counts of `test(`, `expect(`, `locator(`, `getByTestId(` and `data-testid` literals are byte-identical before and after for all 13 files.

### 2026-08-18 — Correct the stale note in `tests/system/.prettierignore`

- **Why not a packet:** comment correction, no behavioral surface; the ignore list itself is byte-identical.
- **Paths:** `tests/system/.prettierignore`.
- **Gates:** `tests/system` `npx prettier --check .` and `npx tsc --noEmit` passed; `core/ui-react` `validate:migration` passed; `git diff --check` clean at the root. No Playwright run — nothing executable changed. No pre-existing failures.
- **Commit:** `4699d462b`
- **Note:** the comment claimed those sources "have never been Prettier-formatted, tracked as a separate open candidate" — both halves untrue since `ba4acd521` formatted all thirteen and discharged that candidate. Written by `654f403ba`, whose intent (leave them unignored so Prettier reports rather than crashes) still holds; only the justification changed, from "this debt is open, do not hide it" to "this debt is paid, do not silently re-open it".

### 2026-08-19 — Search bar UX polish: category-change focus, season/episode position, hidden title

- **Why not a packet:** three small, related asks against `SearchWorkspace.tsx`/`SearchPage.tsx`, made together in one `/fm-quickfix` invocation. Each qualifies on its own: focusing the query field after a category change is a
  contained bugfix (regression test written first, observed failing without the fix, passing with it); moving the season/episode inputs and visually hiding the "Search" heading (kept in the accessibility tree) are markup/styling
  changes with no behavior, contract, or `data-testid` surface.
- **Paths:** `core/ui-react/src/features/search/SearchPage.tsx`, `core/ui-react/src/features/search/workspace/{SearchWorkspace.tsx,SearchWorkspace.test.tsx}`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, 10 pre-existing warnings, unchanged by this diff), `format:check`, `test` (38 files / 249 tests), `build`, `check:api`, `validate:migration` all pass. Root `git diff --check`
  clean. Install skipped — manifests unchanged. Screenshot strip: `npm run dev` (real backend on :5076, reached via the dev proxy) driven with a throwaway Playwright script (not committed), captured at 1280x800 and 390x844, both
  in the default category and after switching to a TV category — reviewed inline in the session; season/episode render to the right of the query field at both widths, the query field carries visible focus after the category
  switch, and the heading text is gone from the rendered page at both viewports.
- **Commit:** `5e25bbe90`

### 2026-08-19 — Fix results header alignment, Size/Age column widths, refine placeholders

- **Why not a packet:** three related, contract-free CSS/markup fixes to `SearchResults.tsx`/`filterControls.tsx`, no `data-testid` or behavior touched. The header-alignment fix is a one-line-cause dead-CSS repair (a `textAlign` a
  shrink-to-fit `<button>` could never act on); the column-width change is a colgroup percentage re-measured against real content; the placeholder fix is a missing `color` alongside an existing `opacity`.
- **Paths:** `core/ui-react/src/features/search/results/{SearchResults.tsx,filterControls.tsx}`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, 10 pre-existing warnings, unchanged), `format:check`, `test` (38 files / 249 tests), `build`, `check:api`, `validate:migration` all pass. Root `git diff --check` clean.
  Install skipped — manifests unchanged. Screenshot strip: `npm run dev` (real backend on :5076) driven with a throwaway Playwright script (not committed) against the live loaded result set (310 real rows) — reviewed inline in the
  session; headers now sit flush with their right-aligned body content, the Age column visibly tightened, and the refine sidebar's "min"/"max" placeholders now render in the same muted color as "e.g. 1080p, name…".
- **Commit:** `94e739b6c`
- **Note:** Size was *not* narrowed despite being named in the request — measured against its own mathematical worst case (`formatResultSize` guarantees the numeric part stays under 4 digits, so `999.99 GB` is the real ceiling) it
  needs ~89px against the 81px 9% already resolves to at 1280x800, i.e. it already has no slack to give up. The "too wide" impression for both columns was most likely dominated by the header-alignment bug fixed alongside it (a
  left-stuck header over right-aligned content reads as more empty space than is actually there); Age genuinely had slack even at a generous unbounded-age worst case and was trimmed, Size did not and was left alone rather than
  risking truncation on a real large release to chase a symptom that the alignment fix already resolves.

### 2026-08-19 — Fix visually-hidden h1 sizing that overflowed the page horizontally

- **Why not a packet:** styling-only defect confined to one `sx` block, no behavior/contract/`data-testid` change: the SearchPage's visually-hidden heading used numeric `width: 1`/`height: 1`, which MUI `sx` resolves as
  percentages, so the absolutely positioned box spanned the full content width at a 40px offset and extended `scrollWidth` by 40px at every viewport. Regression evidence: the 18 system tests asserting no page-level
  horizontal overflow (results.spec.ts, focus-indication.spec.ts) observed failing before the fix and passing after.
- **Paths:** `core/ui-react/src/features/search/SearchPage.tsx`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, 10 pre-existing warnings, unchanged), `format:check`, `test -- --run` (251 passed), `build`, `check:api`, `validate:migration` all pass; install skipped —
  manifests unchanged. Full real-backend suite via `python3 misc/run_gui_systemtest.py --runtime local --skip-install --keep-services`: 74 passed, 0 failed (previously 18 failures, all sharing this root cause). Root
  `git diff --check` clean. No screenshot strip: the element is invisible in both states; the only rendering change is the horizontal scrollbar disappearing, which the overflow assertions pin mechanically.
- **Commit:** `9dddc7036`

### 2026-08-19 — Scope the refine sidebar's indexer/category selection to a single search

- **Why not a packet:** single-module behavioral bugfix shipping regression tests. The refine sidebar's `indexers` and
  `categories` selections were persisted into the existing `hydra.search-results.table` payload with the rest of
  `ResultFilters`, and `SearchResults` is re-rendered rather than remounted between searches, so both survived a reload *and* a
  new search. Both default to "every value the current results contain", so a carried-over selection silently hides every
  result from an indexer or category the earlier search happened not to return — and a value that no longer occurs at all is
  not listed in the sidebar, so it cannot be re-enabled. Two regression tests were observed failing before the fix (stale
  stored selection applied on mount; previous search's selection kept across a new search) and passing after it. No contract,
  selector, or `data-testid` change. **Tension with this ledger's own header, recorded deliberately:** the header excludes
  "persisted-data changes". This one *removes* two keys from an existing payload rather than introducing a persisted-data
  contract — no new storage key, no new capability, no `DECISIONS.md` subject matter (no ADR governs
  `hydra.search-results.table`; ADR-0005's persisted indexers are the *search form's*, not the refine sidebar's) — and payloads
  written by earlier builds are stripped on read, so it is backward-compatible in one direction and reversible in one commit.
  Read as "do not widen the exclusion to any code that touches persisted state"; a fix that *added* a persisted key would still
  need a packet, as the open candidate below records.
- **Paths:** `core/ui-react/src/features/search/results/SearchResults.tsx`,
  `core/ui-react/src/features/search/results/SearchResults.test.tsx`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, 10 pre-existing warnings, unchanged), `format:check`,
  `test -- --run` (38 files, 262 passed), `build`, `check:api`, `validate:migration` all pass; install skipped — manifests
  unchanged. Root `git diff --check` clean. `tests/system` untouched and not re-run: no system test asserts cross-search or
  cross-reload persistence of this selection (checked by hand against every `refine-indexer-option` /
  `refine-category-option` and `page.reload()` use in `results.spec.ts` and `search.spec.ts`; each toggles within one search).
  No screenshot strip: no markup or styling change, and the default rendering — every indexer and category selected — is
  exactly the accepted baseline; only the stale-storage case renders differently, and it now renders *as* that baseline.
- **Commit:** `24329c640`

### 2026-08-19 — Scope the refine sidebar's download-type selection to a single search

- **Why not a packet:** the open candidate raised by the entry above, discharged on the same criterion — single-module
  behavioral bugfix shipping a regression test, no contract, selector, or `data-testid` change. `downloadTypes` comes from the
  same `defaultFilters` derivation and the same `hydra.search-results.table` payload as `indexers`/`categories`, and
  `RefineSidebar`'s `downloadTypeOptions` only offers values the loaded results actually carry, so a search returning only NZBs
  persisted `downloadTypes: ["NZB"]`, hid every torrent of the next search, and rendered no TORRENT chip to undo it with. The
  candidate's "confirm no torrent/NZB-specific UI depends on the selection surviving" was checked: `downloadTypes` is read only
  by `filterResults` and by the chip group's `active` state, both per-search. Regression test observed failing before the fix
  (stored `["NZB"]` applied on mount, torrent hidden) and passing after; it also pins the new-search reset against a download
  type the previous search never returned. Three lines of behavior — `downloadTypes` joins `SearchScopedFilter`, the
  `searchRequestId` reset, and the strip-on-read — the rest of the diff is comment wording. The same persisted-data tension
  recorded in the entry above applies unchanged.
- **Paths:** `core/ui-react/src/features/search/results/SearchResults.tsx`,
  `core/ui-react/src/features/search/results/SearchResults.test.tsx`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, 10 pre-existing warnings, unchanged), `format:check`,
  `test -- --run` (38 files, 263 passed), `build`, `check:api`, `validate:migration` all pass; install skipped — manifests
  unchanged. Root `git diff --check` clean. `tests/system` untouched and not re-run: every `refine-type-chips` assertion in
  `results.spec.ts` toggles within one search, and no system test asserts cross-search or cross-reload persistence of this
  selection. No screenshot strip, for the reason given in the entry above.
- **Commit:** `27efd28f5`

### 2026-08-19 — Show a cover next to autocomplete suggestions and close the dropdown on outside click

- **Why not a packet:** two small fixes confined to one component (`SearchWorkspace.tsx`), requested together. The cover image
  is markup/UX polish restoring legacy parity (`core/ui-src/html/states/search.html`'s `autocompleteTemplate.html` already
  showed a 50px poster; the React port dropped it) — no behavior, contract, or `data-testid` change, `posterUrl` was already
  fetched and typed on `MediaSuggestion` and simply wasn't rendered. The close-on-outside-click/blur is a contained bugfix
  confined to the same single component, covered by regression tests observed failing against the pre-fix code (verified by
  `git stash push -u` on just the implementation hunk, running the new tests against the stashed-out state, then `git stash
  pop`) and passing after.
- **Paths:** `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`,
  `core/ui-react/src/features/search/workspace/SearchWorkspace.test.tsx`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, 10 pre-existing warnings, unchanged), `format:check`,
  `test -- --run` (38 files, 266 passed), `build`, `check:api`, `validate:migration` all pass; install skipped — manifests
  unchanged. Root `git diff --check` clean. `tests/system` untouched and not re-run: its two `autocomplete-option` selection
  tests (`search.spec.ts`) use Playwright's real click, which dispatches a mousedown on the option itself — inside the new
  container ref, so unaffected — and the React-route variant's real-backend fixture returns `posterUrl: null`, already
  exercising the no-cover branch.
- **Screenshot strip (desktop 1280x800):** captured live against the repository owner's already-running dev stack — `vite`
  dev server on :5173 (its `devBackendPlugin` proxies to the IntelliJ-launched backend on :5076 and injects real bootstrap
  data) with the `/internalapi/autocomplete/MOVIE` response mocked (one suggestion with a `posterUrl`, one without), so the
  capture needed no rebuild and touched no running service. Two states: dropdown open (cover rendered before the title for
  the first suggestion, no image for the second) and dropdown closed after a click elsewhere on the page. Delivered directly
  to the owner for review rather than committed under `docs/frontend-migration/` — FM-033 (`tasks/` history) establishes
  visual evidence as an untracked, regenerable artifact, not a repository-committed binary, and no such directory exists
  elsewhere in this repository's history.
- **Commit:** `7913805dc`

### 2026-08-19 — Proxy the `/cache` image route in the vite dev server

- **Why not a packet:** mechanical config repair, no behavioral surface on the shipped application. Reported live while the
  owner reviewed the entry above's screenshot strip against their own running dev stack: a suggestion's `posterUrl` is a
  same-origin `/cache/{base64OriginalUrl}` path served by `ProxyImagesWeb.java` (the backend proxies and caches posters
  server-side), which resolves fine in production (same-origin) but wasn't in `devBackend.ts`'s `PROXIED_PATHS` list, so under
  `vite dev` it fell through to the SPA fallback and returned `index.html` instead of image bytes. One line in a dev-only
  proxy config array, covered by a regression test in the existing `devBackend.test.ts` (`backendProxy` already had direct
  unit coverage) observed failing before the fix and passing after, and confirmed live against the owner's running dev
  server — the exact URL they reported returned `image/jpeg` after the fix, and the owner confirmed it.
- **Paths:** `core/ui-react/vite/devBackend.ts`, `core/ui-react/vite/devBackend.test.ts`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, 10 pre-existing warnings, unchanged), `format:check`,
  `test -- --run` (38 files, 267 passed), `build`, `check:api`, `validate:migration` all pass; install skipped — manifests
  unchanged. Root `git diff --check` clean. `tests/system` untouched: this file has no Playwright coverage and none is
  warranted for a dev-server-only proxy list. No screenshot strip: no rendering change, only what an image request resolves
  to in a dev-only proxy.
- **Commit:** `b4f24bae5`

### 2026-08-19 — Let the autocomplete dropdown overlap the form and scroll instead of being cut off

- **Why not a packet:** styling change confined to one component, no behavior, contract, or `data-testid` change. The
  autocomplete dropdown was clipped at the search form's bottom edge: `search-workspace`'s outer `Paper` had
  `overflow: "hidden"` — needed only to keep `workspace-primary`'s flush background bar from squaring off the Paper's
  rounded top corners (`MuiPaper`'s `theme.ts` override, 12px) — and an absolutely-positioned descendant is clipped by
  *any* `overflow: hidden` ancestor, not just its immediate parent. Moved the clip to the one element that needed it
  (`workspace-primary` now carries its own matching `borderTopLeftRadius`/`borderTopRightRadius: 12`) and removed it from
  the outer Paper, so the dropdown can now extend past the form. The dropdown itself is capped at `maxHeight: 360` with
  `overflowY: "auto"` (previously unbounded) and `overflowX: "hidden"` in place of the old blanket `overflow: "hidden"`,
  so option-row hover backgrounds still clip to the rounded side corners while the list scrolls vertically.
- **Paths:** `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, 10 pre-existing warnings, unchanged), `format:check`,
  `test -- --run` (38 files, 267 passed, all pre-existing `SearchWorkspace` tests green), `build`, `check:api`,
  `validate:migration` all pass; install skipped — manifests unchanged. Root `git diff --check` clean. `tests/system`
  untouched; hand-checked `search.spec.ts`'s `search-workspace` visual-geometry test, which asserts
  `workspace-primary`'s background color/width and the advanced-panel expand/collapse height delta, none of which this
  change touches.
- **Screenshot strip (desktop 1280x800):** captured live against the owner's running vite dev server with the
  autocomplete response mocked (20 suggestions, more than fit in one screenful). Three states: dropdown capped and
  visually overlapping the page below the form instead of being cut off at the form's border; scrolled to the last
  suggestion (`scrollTop` 0 → 694, confirming genuine scroll, not just visual truncation); the form's idle top-left
  corner still rounded, confirming no square-corner regression from removing the outer Paper's `overflow: hidden`.
  Delivered directly to the owner rather than committed under `docs/frontend-migration/`, per FM-033's untracked-evidence
  convention (see the 2026-08-19 autocomplete-cover entry above).
- **Commit:** `8e1cd770c`

### 2026-08-19 — Show units on the download history Age column

- **Why not a packet:** contained bugfix confined to one cell in one component, shipping a regression test. The Age column
  rendered a bare integer with no unit, while every other age-bearing surface in the app (`SearchHistoryPage`,
  `SavedSearchesPage`) renders `"N days"`. No `data-testid`, contract, or behavior change — display formatting only.
- **Paths:** `core/ui-react/src/features/stats/history/{DownloadHistoryPage.tsx,DownloadHistoryPage.test.tsx}`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, 10 pre-existing warnings, unchanged), `format:check`,
  `test -- --run` (40 files, 280 passed), `build`, `check:api`, `validate:migration` all pass; install skipped — manifests
  unchanged. Root `git diff --check` clean. `tests/system` untouched: no Playwright spec asserts this cell's raw value.
  Regression test observed failing before the fix and passing after.
- **Commit:** `110b522bb`
- **Note:** flagged as a non-blocking minor finding by the FM-022 reviewer rather than fixed inline (per this project's
  minor-findings convention — small cosmetic gaps are logged, not always fixed on the spot); discharged here alongside the
  `FilterDefinition.java` fix below at the owner's request.

### 2026-08-19 — Show a visible sort-direction indicator on history table headers

- **Why not a packet:** styling change confined to two components' local `SortHeader` functions, no behavior, contract, or
  `data-testid` change. `TableSortLabel` is `ButtonBase` with `component="span"`, which still yields `role="button"` and the
  same accessible name, so `getByRole("button", {name: ...})` in both routes' unit and Playwright tests needed no update.
- **Paths:** `core/ui-react/src/features/stats/history/{DownloadHistoryPage.tsx,NotificationHistoryPage.tsx}`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, 10 pre-existing warnings, unchanged), `format:check`,
  `test -- --run` (46 files, 338 passed), `build`, `check:api`, `validate:focus-affordances`, `validate:migration` all pass.
  Root `git diff --check` clean. Real backend: `python3 misc/run_gui_systemtest.py --runtime local -- tests/notification-history.spec.ts tests/downloads.spec.ts` — 11/11 passed, regenerating the `F-HISTORY-NOTIFICATIONS` and
  `F-HISTORY-DOWNLOADS` screenshot strips (1280x800/390x844), reviewed inline: "Time ↓" now shows a visible arrow on both
  routes' active sort column.
- **Commit:** `0769f326b`
- **Note:** flagged as a non-blocking minor finding by the FM-023 reviewer (previously a plain `Button` with no visible
  direction indicator, copied from `DownloadHistoryPage.tsx`'s existing pattern) rather than fixed inline, per this project's
  minor-findings convention. `SearchHistoryPage.tsx` has the identical local `SortHeader` pattern but was not named by the
  review and is left alone here — see the open candidate below.

### 2026-08-19 — Stop `FilterDefinition` rejecting filtered history requests with a bare `isBoolean` type mismatch

- **Why not a packet:** contained bugfix to a single primitive-vs-boxed field in one class, shipping a regression test. No
  contract, selector, or `data-testid` change — `isBoolean` appears in no `docs/frontend-migration/*.yaml` registry.
- **Paths:** `shared/mapping/src/main/java/org/nzbhydra/historystats/FilterDefinition.java`; new
  `shared/mapping/src/test/java/org/nzbhydra/historystats/FilterDefinitionJacksonTest.java`.
- **Gates:** `shared/mapping` `mvn test` (10/10, up from 8 by the two new cases; note the environment's global
  `~/.mvn/maven.config` sets `-DskipTests` by default — every Maven invocation here needed an explicit `-DskipTests=false`
  override). `core` `mvn test -Dtest=HistoryTest,StatsComponentTest` (10/10, 1 pre-existing `@Disabled` skip, unrelated) and
  `mvn -pl core -am compile` both clean. Root `git diff --check` clean. Real backend:
  `python3 misc/run_gui_systemtest.py --runtime local --skip-install --keep-services -- tests/search-history.spec.ts
  tests/downloads.spec.ts` — 9/9 passed against the rebuilt server, exercising both the search-history filter request (no
  `isBoolean` sent) and the download-history filter request (`isBoolean: false` sent). New test observed failing against the
  unfixed primitive field (verified via `git stash push -u` on just the fix hunk, running the new test against the
  stashed-out state, then `git stash pop`) and passing after.
- **Commit:** `1fd40c659`
- **Note:** root cause, confirmed by direct reproduction: `@Data @AllArgsConstructor @NoArgsConstructor` on a class with a
  primitive `boolean isBoolean` field makes Jackson 3's implicit-constructor property binding treat `isBoolean` as a required
  constructor parameter; any request omitting it fails with `MismatchedInputException: Cannot map 'null' into type 'boolean'`
  (surfaced to the client as HTTP 400), rather than defaulting the primitive to `false`. `isBoolean` is dead weight — grepped
  across the repository, nothing ever reads it (`History.java` only calls `getFilterValue()`/`getFilterType()`) and nothing
  outside Jackson ever constructs a `FilterDefinition` with it set. Boxing `boolean` to `Boolean` was the smaller of two
  candidate fixes (the other being deleting the field plus adding `@JsonIgnoreProperties(ignoreUnknown = true)`, which would
  also require touching the FM-022 client's `isBoolean: false` workaround to stay minimal) — it makes a missing property
  default to `null` instead of erroring, changes no other behavior, and needs no client-side change. This was silently
  breaking the already-shipped FM-020 search-history filtering (`searchHistory.ts` never sent `isBoolean`) in addition to
  being worked around client-side in FM-022's `downloads.ts` (`isBoolean: false`, still sent, still harmless, left in place —
  removing it is a `core/ui-react` change and out of scope for this single-module fix).
- **Open candidate:** ~~the FM-022 client's now-unnecessary `isBoolean: false` padding in `downloads.ts` could be removed as a
  follow-up `core/ui-react`-only quickfix; left alone here since it is harmless and touching it would have made this a
  two-module change.~~ Discharged by FM-056: `C-HISTORY-REQUEST` sends no `isBoolean` for any history endpoint, and the
  padding is gone from `downloads.ts`.

### 2026-08-19 — Guard the visual evidence root against Playwright's cleared output tree

- **Why not a packet:** mechanically verifiable test-infrastructure guard with no behavioral surface; the accompanying helper
  edit only extracts the existing path literal into an exported constant (identical emitted paths). This was the single
  undelivered acceptance criterion of FM-033, whose packet is retired in a separate commit — the rest of its outcome shipped
  ad-hoc in `5c36a7a14` and its `FEATURES.yaml` anchoring was removed by ADR-0014.
- **Paths:** `core/ui-react/scripts/validate-migration.mjs` (new `validateVisualEvidenceContainment`, wired into the main
  run), `core/ui-react/scripts/validate-migration.test.mjs` (five tests), `tests/system/tests/visualEvidence.ts` (exported
  `visualEvidenceRoot` constant).
- **Gates:** `core/ui-react`: `typecheck`, `lint` (0 errors, 10 pre-existing warnings), `format:check`, `test -- --run`
  (46 files, 347 passed), `build`, `check:api`, `validate:migration`, `node --test scripts/validate-migration.test.mjs`
  (9 passed) all pass; install skipped — manifests unchanged. `tests/system`: `npx tsc --noEmit`, `prettier --check` on the
  edited file. Root: `git diff --check` clean. Regression demonstrated live: with the root flipped to
  `test-results/visual-evidence`, `validate:migration` exits 1 with the containment error; restored, it passes. No Playwright
  run needed — the spec-visible path strings are byte-identical.
- **Commit:** `12b615863`

---

### 2026-08-20 — Retarget config tab assertions off the placeholder body

- **Why not a packet:** mechanically verifiable locator/assertion repair confined to one test file, no `data-testid`,
  selector, or API contract change. Diagnosed and fully specified by a `migration-task-designer` agent during
  `/fm-orchestrate FM-059` coordination: FM-058's `config.spec.ts` asserted `config-tab-placeholder` for every canonical
  config tab, which is only true until a tab's real content lands, so FM-059 (and every later config-batch task,
  FM-060..FM-067) would break it again as each tab migrates. Retargeting once, now, off the placeholder makes the
  assertion durable for the rest of the batch instead of needing eight ad-hoc carve-outs.
- **Paths:** `tests/system/tests/config.spec.ts` (`openConfig()` now waits for `config-save` instead of the placeholder;
  the tab tour asserts MUI's `aria-selected` state on the clicked tab instead of the placeholder's text).
- **Gates:** `tests/system`: `npx tsc --noEmit` pass; `npx prettier --check tests/config.spec.ts` pass. Root:
  `python3 misc/run_gui_systemtest.py --runtime local -- tests/config.spec.ts` — 4/4 passed against the real backend;
  `git diff --check` clean.
- **Commit:** `96d6923d6`

---

### 2026-08-20 — Wire the config field vocabulary's help/error text to its control via aria-describedby

- **Why not a packet:** UX/accessibility polish confined entirely to one module
  (`core/ui-react/src/features/config/components/`), no behavior change to what a field saves, no new/renamed/removed
  `data-testid`, no registry edit. Flagged as a minor finding by FM-059's independent reviewer: `SettingRow` rendered help
  and error text as siblings outside the control, so no control ever emitted `aria-describedby` — a screen reader announced
  a field was invalid but never why.
- **Paths:** `settings.ts` (new `settingErrorId`/`settingHelpId`/`settingDescribedBy`), `SettingRow.tsx` (`id` on the
  help/error `FormHelperText`s), and all nine control kinds (`TextSetting`, `NumberSetting`, `SecretInput`,
  `ApiKeySetting`, `FileBrowserSetting`, `SelectSetting`, `MultiSelectSetting`, `ChipsSetting`, `SwitchSetting`) wiring
  `aria-describedby` onto the actual interactive element via each control's own MUI-idiomatic slot
  (`slotProps.input`/`slotProps.select` for `TextField` variants, a direct prop for raw `Select`, `slotProps.input` for
  `Switch`). `configFields.test.tsx` gained three regression tests (text, switch, select).
- **A bug the regression test caught before commit:** the first `SwitchSetting` attempt passed `slotProps={{input:
  {"aria-describedby": ...}}}`, which fully replaces MUI `Switch`'s own default `slotProps.input = {role: "switch"}`
  rather than merging with it — silently downgrading every switch to an unlabelled `role="checkbox"` and breaking the
  pre-existing "should toggle a switch setting" test along with the new one. Fixed by repeating `role: "switch"`
  alongside `aria-describedby` in the same object, with a comment explaining why. Observed: 2 failing (1 pre-existing, 1
  new) before the `role` fix, 23 passing after; separately confirmed by stashing only the source changes that all three
  new tests fail against unmodified `SettingRow`/controls and pass again once restored.
- **Gates:** `core/ui-react`: `typecheck`, `lint` (0 errors, 10 pre-existing warnings, none in touched files),
  `format:check`, `test -- --run` (52 files, 434 passed), `build`, `check:api`, `validate:migration` all pass; install
  skipped — manifests unchanged. Root: `git diff --check` clean. No `tests/system` files touched, so no Playwright rerun
  needed.
- **Commit:** `2e05538a2`

---

### 2026-08-20 — Two config field vocabulary cosmetic nits

- **Why not a packet:** a comment addition and a test-content correction, both confined to the same module already
  touched above, no behavior/contract/`data-testid` change. Both flagged as minor findings by FM-059's independent
  reviewer.
- **Paths:** `SettingRow.tsx` (justification comment on the row's `maxWidth: 560` — legacy's row was a fraction of a
  20-column grid, `col-sm-6` of `col-sm-20` in `config.html`, not a literal pixel width to carry forward, so 560 is
  documented as a deliberate reading-width cap instead), `configFields.test.tsx` (the test titled "should add and
  remove chips" only ever added a chip; extended it to also remove one via Autocomplete's backspace-on-empty-input
  affordance, so the title matches its coverage).
- **Gates:** `core/ui-react`: `typecheck`, `lint` (0 errors, 10 pre-existing warnings), `format:check`,
  `test -- --run` (52 files, 434 passed), `build`, `check:api`, `validate:migration` all pass; install skipped —
  manifests unchanged. Root: `git diff --check` clean. No `tests/system` files touched.
- **Commit:** `3c5e6b55d`

---

### 2026-08-20 — Document the config field vocabulary's data-testid convention on C-CONFIG-FIELDS

- **Why not a quickfix:** any edit to `COMPONENTS.yaml` hands off to `/fm-orchestrate` per the quickfix gate, regardless
  of how mechanical the edit is. Routed to a fresh `migration-task-designer` instead, per the open candidate this
  discharges (below).
- **Paths:** `docs/frontend-migration/COMPONENTS.yaml` (`C-CONFIG-FIELDS.responsibility` gains one sentence stating the
  path-to-testid derivation rule and pointing to `F-CONFIG-MAIN.selectors` in `FEATURES.yaml` for the full prefix list,
  rather than duplicating it — no new registry key: all 22 `COMPONENTS.yaml` records share the same six keys with no
  note-style field, and adding one would be a schema decision, not bookkeeping).
- **A second defect surfaced, not fixed:** `ConfigFieldset.tsx` derives its `config-fieldset-<label>` testid from the
  fieldset's *label* text (`label.toLowerCase()`), not a config path — so a multi-word label produces a testid
  containing a space (e.g. "External Tools" -> `config-fieldset-external tools`). Every FM-059 fieldset label happens to
  be one word, so nothing is broken yet, but FM-060 onward add multi-word labels. Logged as a new open candidate below;
  out of scope for this single-file registry edit.
- **Gates:** `npm run validate:migration` in `core/ui-react` passes.
- **Commit:** `e81b63e98`

### 2026-08-20 — Wrap long unbroken text in confirmation dialogs

- **Why not a packet:** styling-only fix confined to one shared component (`DialogProvider.tsx`), no behavior, contract, or
  `data-testid` change — `overflowWrap: "break-word"` on the existing `DialogContentText` message and detail-list items,
  nothing else. Flagged by FM-064's re-reviewer as a "single-session fix candidate" outside that task's `Files Allowed To
  Modify` (`C-DIALOG-SERVICE` is a shared component, not owned by the Downloading tab packet).
- **Paths:** `core/ui-react/src/components/dialogs/{DialogProvider.tsx,DialogProvider.test.tsx}`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, 10 pre-existing warnings, unchanged), `format:check`,
  `test -- --run` (59 files, 544 passed, up from 543 by the one new case), `build`, `check:api`, `validate:migration` all
  pass; install skipped — manifests unchanged. Root `git diff --check` clean. Real backend:
  `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/config-downloading.spec.ts` — 4/4
  passed, regenerating `F-CONFIG-DOWNLOADING`'s screenshot strip. The new regression test was observed failing against the
  pre-fix component (`git stash push -- DialogProvider.tsx` to isolate the source hunk, ran the test, `git stash pop`) and
  passing after.
- **Screenshot strip:** `tests/system/visual-evidence/F-CONFIG-DOWNLOADING/downloading-connection-failed-mobile.png`
  (390x844, regenerated by the real-backend run above) — the long `404 ... "http://127.0.0.1:5080/definitely-not-sabnzbd/api"`
  failure reason now wraps across five lines inside the dialog instead of clipping at the right edge.
- **Commit:** `db8569cb5`
- **Note:** origin is FM-064's re-review (`docs/frontend-migration/STATUS.md`'s FM-064 entry), which found the same defect
  visible in that screenshot but out of scope for the Downloading tab packet to fix directly since `DialogProvider.tsx`
  belongs to `C-DIALOG-SERVICE`, a shared component consumed by every config tab.

### 2026-08-20 — Reposition toasts so they no longer overlap dialog action buttons

- **Why not a packet:** styling-only defect confined to one prop in `ToastProvider.tsx`, no behavior/contract/`data-testid`
  change: MUI's `Snackbar` z-index (1400) sits above `Dialog`'s (1300), so the default bottom-right anchor placed the toast
  visually on top of any open dialog's bottom-right action row — every `C-CONFIG-FIELDS` modal transaction — leaving
  Cancel/Reset/Test connection/Submit unclickable for the ~5s autohide duration, and the toast's own close button
  unreachable via keyboard (MUI's `Dialog` focus trap and `aria-hidden` sibling-hiding target it too, being a sibling
  portal under `document.body`).
- **Paths:** `core/ui-react/src/components/toasts/ToastProvider.tsx`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, 10 pre-existing warnings, unchanged), `format:check`,
  `test -- --run` (60 files, 584/584, unchanged), `build`, `check:api`, `validate:migration` all pass; install skipped —
  manifests unchanged. Root `git diff --check` clean. `tests/system` gates not run: nothing there changed.
- **Screenshot strip:** real backend on :5076 (mockserver + core jar built by FM-065) reached via the Vite dev proxy,
  driven with a throwaway Playwright script (not committed), captured at 1280x800 and 390x844 reproducing FM-065's
  connection-failure scenario (host pointed at a dead local port, no live *arr instance needed) — reviewed inline in the
  session; both viewports now show Cancel/Reset/Test connection/Submit fully clickable and the toast's close button
  reachable. Before state already documented in
  `tests/system/visual-evidence/F-CONFIG-EXTERNAL-TOOLS/external-tools-connection-failed-{desktop,mobile}.png`.
- **Commit:** `a80a2870e`
- **Note:** origin is FM-065's review (`docs/frontend-migration/STATUS.md`'s FM-065 entry), which found the same
  `C-TOAST-SERVICE` overlap FM-064's re-review found for `DialogProvider.tsx`'s failure-reason clipping — both trace to
  the same shared component being outside either config-tab packet's file scope. Repositioning fixes every dialog that
  can trigger a toast, not just External Tools'.

### 2026-08-21 — Fix the stats dashboard's unreachable empty-data state

- **Why not a packet:** single-module bugfix confined to `isEmpty()` in `StatsDashboardPage.tsx`, shipped with a
  regression test that fails against the prior implementation and passes against the fix; no contract, selector, or
  persisted-data change.
- **Paths:** `core/ui-react/src/features/stats/dashboard/StatsDashboardPage.tsx`,
  `core/ui-react/src/features/stats/dashboard/StatsDashboardPage.test.tsx`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, same 12 pre-existing warnings), `format:check`,
  `test -- --run` (718/718, up from 717/717), `build`, `check:api`, `validate:migration` all pass; install skipped —
  manifests unchanged. Root `git diff --check` clean. `tests/system` gates not run: nothing there changed.
- **Commit:** `f491b1c16`
- **Note:** `isEmpty()` tested `Object.keys(stats).length === 0`, but a real `POST /internalapi/stats` response always
  carries `after`/`before`, so the "No statistics are available for the selected range." branch could never render.
  Now checks each currently selected family's own field for absence or an empty array instead. Flagged as a minor
  finding by FM-024's review (`docs/frontend-migration/STATUS.md`); the task's six other minor findings remain there,
  unfixed, as future quickfix candidates.

### 2026-08-21 — Remove the stats dashboard's unreachable isAbortError guard

- **Why not a packet:** mechanical dead-code removal, no behavioral surface — confirmed by the full
  `StatsDashboardPage.test.tsx` suite (including its two overlapping/aborted-request tests) passing unchanged before
  and after the removal.
- **Paths:** `core/ui-react/src/features/stats/dashboard/StatsDashboardPage.tsx`,
  `core/ui-react/src/features/stats/dashboard/StatsDashboardPage.test.tsx` (stale comment reference only).
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, same 12 pre-existing warnings), `format:check`,
  `test -- --run` (718/718, unchanged), `build`, `check:api`, `validate:migration` all pass; install skipped —
  manifests unchanged. Root `git diff --check` clean. `tests/system` gates not run: nothing there changed.
- **Commit:** `51ba76a0c`
- **Note:** `abortRef.current?.abort()` fires only at the top of `fetchFamilies`' own next invocation, immediately
  followed by `++requestIdRef.current`, so any superseded request's rejection is already caught by the preceding
  `requestIdRef.current !== requestId` staleness check — `isAbortError` could never be reached. Flagged as a minor
  finding by FM-024's review (`docs/frontend-migration/STATUS.md`); five of the task's other minor findings remain
  there as future quickfix candidates.

### 2026-08-21 — Guard `loadIncludeDisabled` against a throwing `getItem`

- **Why not a packet:** single-function bugfix confined to `persistence.ts`, shipped with a regression test that fails
  against the prior implementation and passes against the fix; no contract, selector, or persisted-data-shape change.
- **Paths:** `core/ui-react/src/features/stats/dashboard/persistence.ts`,
  `core/ui-react/src/features/stats/dashboard/persistence.test.ts`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, same 12 pre-existing warnings), `format:check`,
  `test -- --run` (719/719, up from 718/718), `build`, `check:api`, `validate:migration` all pass; install skipped —
  manifests unchanged. Root `git diff --check` clean. `tests/system` gates not run: nothing there changed.
- **Commit:** `267d7850a`
- **Note:** `loadIncludeDisabled` called `getItem` with no `try`/`catch`, unlike its sibling `loadFamilySelection`,
  which already wraps the identical call; `getStorage()` only guards *constructing* `window.localStorage`, not
  individual calls on it. Flagged as a minor finding by FM-024's review (`docs/frontend-migration/STATUS.md`); four
  of the task's other minor findings remain there as future quickfix candidates.

### 2026-08-21 — Repoint `shell-selector.spec.ts` at an unmigrated route

- **Why not a packet:** a locator/URL repair confined to one spec file; no product code, contract, or selector touched.
- **Paths:** `tests/system/tests/shell-selector.spec.ts`.
- **Gates:** `tests/system` `npx tsc --noEmit` clean; real-backend run via
  `misc/run_gui_systemtest.py --runtime local -- tests/shell-selector.spec.ts` passed (1/1); root `git diff --check`
  clean.
- **Commit:** `b38399dd9`
- **Note:** the spec deep-linked to `/stats/stats?period=day` and asserted the migration placeholder there; FM-024
  turned that route into the real stats dashboard, making the assertion stale. Flagged by FM-072's review and carried
  forward as a minor finding through FM-073..FM-076 (`docs/frontend-migration/STATUS.md`). Repointed at
  `/system/tasks`, the one remaining unmigrated system tab after FM-072..FM-076.

### 2026-08-21 — Catch a rejecting action in `SystemControlTab`'s `run()`

- **Why not a packet:** single-function bugfix confined to `SystemControlTab.tsx`, shipped with a regression test that
  fails against the prior implementation (unhandled rejection, no toast, test timeout) and passes against the fix; no
  contract or selector change.
- **Paths:** `core/ui-react/src/features/system/control/SystemControlTab.tsx`,
  `core/ui-react/src/features/system/control/SystemControlTab.test.tsx`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, same 12 pre-existing warnings), `format:check`,
  `test -- --run` (854/854, up from 853/853), `build`, `check:api`, `validate:migration` all pass; root
  `git diff --check` clean.
- **Commit:** `ea0236dde`
- **Note:** `run()` awaited `action(transport)` with no `catch`, relying entirely on `requestControlAction` never
  rejecting — true today, but unenforced at `run()`'s own boundary. Flagged as a minor finding by FM-072's review
  (`docs/frontend-migration/STATUS.md`).

### 2026-08-21 — Stop the update message poll on unmount

- **Why not a packet:** single-hook bugfix confined to `useUpdateInstaller.tsx`, shipped with a regression test that
  fails against the prior implementation (poll keeps firing after unmount) and passes against the fix; no contract or
  selector change.
- **Paths:** `core/ui-react/src/services/updates/useUpdateInstaller.tsx`,
  `core/ui-react/src/services/updates/useUpdateInstaller.test.tsx`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, same 12 pre-existing warnings), `format:check`,
  `test -- --run` (855/855, up from 854/854), `build`, `check:api`, `validate:migration` all pass; root
  `git diff --check` clean.
- **Commit:** `6936bc184`
- **Note:** the poll interval only stopped on `runUpdateInstall`'s own exit paths (success, failure, a rejecting grace
  period), none of which fire on an unmount mid-install. Flagged as a minor finding by FM-073's review
  (`docs/frontend-migration/STATUS.md`).

### 2026-08-21 — Fix invalid ARIA table structure in the log formatted view

- **Why not a packet:** styling/markup polish with no behavior, contract, or `data-testid` change; regression-tested
  and no rendering/visual change (an ARIA attribute removal, not a layout change), so no screenshot strip is needed.
- **Paths:** `core/ui-react/src/features/system/logs/FormattedLogView.tsx`,
  `core/ui-react/src/features/system/logs/SystemLogTab.test.tsx`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, same 12 pre-existing warnings), `format:check`,
  `test -- --run` (856/856, up from 855/855), `build`, `check:api`, `validate:migration` all pass; root
  `git diff --check` clean.
- **Commit:** `2bfd32ada`
- **Note:** `LogRow`'s `<tr>` carried `role="button"`, which removes it from the table's row/cell ARIA structure.
  Removed the override; the row keeps `tabIndex` and its Enter/Space keydown handler for keyboard operability.
  Flagged as a minor finding by FM-074's review (`docs/frontend-migration/STATUS.md`).

### 2026-08-21 — Make the raw log panel keyboard-scrollable

- **Why not a packet:** styling/markup polish with no behavior, contract, or `data-testid` change; regression-tested
  and no visual rendering change (a `tabIndex` addition), so no screenshot strip is needed.
- **Paths:** `core/ui-react/src/features/system/logs/RawLogView.tsx`,
  `core/ui-react/src/features/system/logs/SystemLogTab.test.tsx`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, same 12 pre-existing warnings), `format:check`,
  `test -- --run` (857/857, up from 856/856), `build`, `check:api`, `validate:migration` all pass; root
  `git diff --check` clean.
- **Commit:** `52fdb301f`
- **Note:** the scrollable `<pre>` panel had no `tabIndex`, so it could not be reached or scrolled by keyboard alone
  (WCAG 2.1.1). Legacy had the same defect, so this closes a pre-existing gap rather than a regression. Flagged as a
  minor finding by FM-074's review (`docs/frontend-migration/STATUS.md`).

### 2026-08-21 — Fix mobile log table's Message column overflow

- **Why not a packet:** styling/markup polish inside an existing feature with no behavior, contract, or `data-testid`
  change. Rendering change — verified via the Visual Gate.
- **Paths:** `core/ui-react/src/features/system/logs/FormattedLogView.tsx`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, same 12 pre-existing warnings), `format:check`,
  `test -- --run` (857/857, unchanged — pure CSS fix), `build`, `check:api`, `validate:migration` all pass. Real
  backend: `python3 misc/run_gui_systemtest.py --runtime local -- tests/system.spec.ts`, 12/12 passed. Root
  `git diff --check` clean.
- **Commit:** `6756781a1`
- **Note:** at a narrow viewport the Message column lost the column-width contest to its non-wrapping neighbors
  under `table-layout: auto`, squeezed to ~89px so every character wrapped onto its own line and inflated each row
  to ~350px tall. Added a `minWidth` floor on the `Table` (500px) and the Message column (200px) so the
  `TableContainer` scrolls horizontally instead. Verified directly against a real backend instance at 390px width
  before and after the fix (row height ~350px → normal), then confirmed via the regenerated
  `tests/system/visual-evidence/F-SYSTEM-LOG/log-formatted-{desktop,mobile}.png`. Flagged as a minor finding by
  FM-074's review (`docs/frontend-migration/STATUS.md`).

### 2026-08-21 — Stop the bugreport visual-gate upload guard being shadowed

- **Why not a packet:** a mechanical repair confined to one spec file's route wiring; no product code or contract
  touched.
- **Paths:** `tests/system/tests/system.spec.ts`.
- **Gates:** `tests/system` `npx tsc --noEmit` clean; real-backend run via
  `misc/run_gui_systemtest.py --runtime local -- tests/system.spec.ts`, 12/12 passed; root `git diff --check` clean.
- **Commit:** `7493f12fb`
- **Note:** the visual-gate bugreport test registered `blockDebugInfosUpload` (aborts and records) and then a second
  route for the same pattern that fulfilled with a fixture; Playwright dispatches the most recent handler first, so
  the fulfilling route always won and the abort handler never ran, making `expect(attemptedUploads).toEqual([])`
  vacuously true. Consolidated into one `stubDebugInfosUpload` helper that records and fulfills together, and the
  assertion now expects one recorded, locally-answered attempt per viewport instead of a shadowed empty list.
  Protection was still real in practice throughout (the fulfilling route never reached the file share). Flagged as
  a minor finding by FM-076's review (`docs/frontend-migration/STATUS.md`).

### 2026-08-21 — Stop the CPU chart showing two explanations for one empty panel

- **Why not a packet:** single-component UX bugfix confined to `CpuUsageCard.tsx`, shipped with a regression test
  that fails against the prior rendering (both messages present) and passes against the fix; no contract or
  selector change.
- **Paths:** `core/ui-react/src/features/system/bugreport/CpuUsageCard.tsx`,
  `core/ui-react/src/features/system/bugreport/SystemBugreportTab.test.tsx`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, same 12 pre-existing warnings), `format:check`,
  `test -- --run` (858/858, up from 857/857), `build`, `check:api`, `validate:migration` all pass; root
  `git diff --check` clean.
- **Commit:** `1668bbcd9`
- **Note:** when the very first CPU-usage poll failed, the panel showed both the "chart stopped updating" alert and
  the "Enable the logging marker 'Performance'" hint at once, offering two different explanations for the same
  empty panel. The marker hint now only shows when the panel is empty and the poll hasn't stopped. Flagged as a
  minor finding by FM-076's review (`docs/frontend-migration/STATUS.md`).

### 2026-08-21 — Restore the CPU chart's dropped x-axis label

- **Why not a packet:** styling addition inside an existing feature with no behavior, contract, or `data-testid`
  change. Rendering change — verified via the Visual Gate.
- **Paths:** `core/ui-react/src/features/system/bugreport/CpuUsageCard.tsx`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, same 12 pre-existing warnings), `format:check`,
  `test -- --run` (858/858, unchanged — pure prop addition), `build`, `check:api`, `validate:migration` all pass.
  Real backend: `python3 misc/run_gui_systemtest.py --runtime local -- tests/system.spec.ts`, 12/12 passed. Root
  `git diff --check` clean.
- **Commit:** `441f8444b`
- **Note:** legacy's nvd3 x-axis label "Time" was dropped when the chart was rebuilt on `@mui/x-charts` for
  FM-076; the y-axis label "CPU %" was kept. Confirmed via the regenerated
  `tests/system/visual-evidence/F-SYSTEM-BUGREPORT/bugreport-desktop.png`. Flagged as a minor finding by FM-076's
  review (`docs/frontend-migration/STATUS.md`).

### 2026-08-23 — Align form controls and the search card with the mock's visual language

- **Why not a packet:** styling polish inside existing features with no behavior, contract, or `data-testid` change;
  the theme entries are stock MUI defaults and mock-token sizes per ADR-0014. Rendering change — verified via the
  Visual Gate (regenerated `tests/system/visual-evidence/F-SEARCH-FORM/*` strip, owner-reported "cheap copy" gap
  after FM-087). Note the reach: the always-shrunk labels and 14px/13px control sizes are theme-wide (all forms,
  including config), owner-blessed ("feel free to change the overall theme").
- **Paths:** `core/ui-react/src/app/theme.ts`, `core/ui-react/src/app/theme.test.ts`,
  `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`, `tests/system/tests/search.spec.ts`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, pre-existing warnings only), `format:check`,
  `test -- --run` (1094/1094), `build`, `check:api`, `validate:migration` all pass. `tests/system` `npx tsc --noEmit`
  pass. Real backend: `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts
  tests/focus-indication.spec.ts` — `search.spec.ts` fully green; `focus-indication.spec.ts` 1 error on the
  anchor-family test from a **pre-existing** FM-079 interaction (see the Open candidate below), mechanism-independent
  of this diff (a theme-only change cannot mount the startup dialog that duplicates the anchor). Root
  `git diff --check` clean.
- **Commit:** `554145c33`
- **Note:** four MUI defaults FM-087 never overrode caused the gap: inputs/selects at `body1` 16px (mock 14px, same
  400 weight but visibly heavier), checkbox rows and menu items at 16px (mock 13px/14px), labels floating inside the
  input at rest behind the value with placeholders suppressed (mock: permanently in the border notch), and the
  workspace card split bar-on-paper (mock: one `surfaces.bar` surface zoned by hairlines). `theme.test.ts`'s
  ADR-0015 guard was sharpened, not weakened: from "no `MuiInputBase` entry" to "exactly the 14px size token and no
  focus styling".

### 2026-08-23 — Range-row breathing room and quiet autocomplete feedback

- **Why not a packet:** owner-requested UX polish inside an existing feature; no contract, selector, or `data-testid`
  change (the removed status Alerts were asserted by no test and recorded in no registry). Rendering change —
  verified via the Visual Gate (regenerated `tests/system/visual-evidence/F-SEARCH-FORM/*`).
- **Paths:** `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`.
- **Gates:** `core/ui-react` `typecheck`, `lint` (0 errors, pre-existing warnings only), `format:check`,
  `test -- --run` (1094/1094), `build`, `check:api`, `validate:migration` all pass. Real backend:
  `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts` 18/18 passed. Root
  `git diff --check` clean.
- **Commit:** `dd0702d03`
- **Note:** the Age & Size rows' gap went 6px → 12px (row gap only — the 6px column gutter is summed by
  `rangeSectionWidth` and stays). The "No title suggestions found." / "Loading title suggestions…" Alerts flashed
  into the form on every debounced miss while typing; the empty state was removed entirely (an absent dropdown
  already says it) and loading became a 16px `CircularProgress` inside the query field, legacy's own pattern. The
  error/malformed warning Alerts remain.

### 2026-08-23 — Center the search form at a 1100px cap

- **Why not a packet:** owner-decided layout polish; no behavior, contract, or `data-testid` change. Rendering change —
  verified by live measurement and the regenerated `F-SEARCH-FORM` strip.
- **Paths:** `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`.
- **Gates:** full `core/ui-react` gate set green (1094/1094); `tests/search.spec.ts` 18/18 against a rebuilt real
  backend; live 1920px measurement (form x=410, width=1100 — exact center).
- **Commit:** `04d2ec308`
- **Note:** first attempt used `mx: "auto"`, which silently did nothing: the page's spacing `Stack` resets child
  margins with `& > :not(style):not(style) {margin: 0}` at (0,3,0) specificity, beating any sx class. Centered via
  `alignSelf: "center"` instead, which no margin reset can touch. Worth remembering for any future Stack child that
  wants auto margins — the same reset also makes the form's own `mt: 3` dead CSS (predates this change, gap comes
  from Stack spacing; left as is).

### 2026-08-23 — Polish the results refine-bar filter controls

- **Why not a packet:** styling (input font size) plus two contained disabled-state bugfixes inside one existing
  component pair; no `data-testid`, contract, or persisted-data change. Each behavioral change has a regression
  test.
- **Paths:** `core/ui-react/src/features/search/results/{filterControls,RefineSidebar}.tsx` and their test files.
- **Gates:** full `core/ui-react` gate set green: typecheck, lint, format:check, `test -- --run` (1094/1094),
  build, check:api, validate:migration. `git diff --check` clean.
- **Commit:** `88da46f72`
- **Note:** part of a larger owner-requested batch of minor search-results/search-form UI fixes. The other two
  items originally grouped with these (removing the size/age filter's dead-code "Apply" button, and persisting
  the category/indexer accordion expand state) were pulled out during qualification: the Apply button carries a
  `data-testid` a system test clicks (`tests/system/tests/results.spec.ts`), and accordion persistence is a new
  user-observable capability — both routed to `/fm-orchestrate` instead. See *Open candidates* below.

### 2026-08-23 — Reorder the downloader send-action row and fix its selects

- **Why not a packet:** markup reorder plus two contained bugfixes (hide-when-single-downloader,
  `displayEmpty` on the category select) inside one existing component; no `data-testid` or contract change.
  Both bugfixes have regression tests.
- **Paths:** `core/ui-react/src/features/search/results/DownloadActions.tsx` and `SearchResults.test.tsx`.
- **Gates:** full `core/ui-react` gate set green: typecheck, lint, format:check, `test -- --run` (1096/1096),
  build, check:api, validate:migration. `git diff --check` clean.
- **Commit:** `bdae1e73a`

### 2026-08-23 — Give the TV search form's Additional filter terms row breathing room

- **Why not a packet:** styling-only (a single `mt` on one field), no `data-testid` or contract change. Rendering
  change — verified live and via the regenerated `F-SEARCH-FORM` strip.
- **Paths:** `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`.
- **Gates:** full `core/ui-react` gate set green (1096/1096); `tests/search.spec.ts` "bar-and-chips visual
  evidence" 1/1 against a rebuilt real backend; live measurement (Additional filter terms' `fieldset` top now
  265.625px, exactly matching Min size's).
- **Commit:** `aa65fb79f`

### 2026-08-23 — Show the NZBHydra banner in the app bar, drop the plain-text footer

- **Why not a packet:** markup/asset swap and dead-markup removal, no `data-testid` removed (`app-shell-logo` and
  its `alt="NZBHydra2"` kept, matching what `smoke.spec.ts` and `AppShell.test.tsx` already assert) and no other
  contract change. Rendering change — verified via the regenerated `F-PLATFORM-SHELL` strip.
- **Paths:** `core/ui-react/src/app/AppShell.tsx`; new `src/assets/banner.png`; removed `src/assets/logo.png`
  (left unused by the swap).
- **Gates:** full `core/ui-react` gate set green (1096/1096); `tests/smoke.spec.ts` "Branded app shell visual
  evidence" 3/3 (desktop, desktop-wide, mobile) against a rebuilt real backend.
- **Commit:** `35be348ce`

### 2026-08-23 — Update `results-bulk-actions` select count for the hidden single-downloader select

- **Why not a packet:** single-file test-only update to match already-shipped, intentional behavior (a stale
  assertion after a prior UI change) -- the mechanical-repair pattern already established in this ledger's
  history.
- **Paths:** `tests/system/tests/results.spec.ts`.
- **Gates:** `npx tsc --noEmit` in `tests/system` clean; the previously-failing spec re-run and passing (1/1)
  against a rebuilt real backend; `git diff --check` clean.
- **Commit:** `5d84901e8`
- **Note:** this was a real regression from the 2026-08-23 downloader-actions quickfix (`bdae1e73a`, see above),
  which shipped with vitest coverage only and was never run against this real-backend system test. Surfaced
  by FM-088's implementer running the full `results.spec.ts` suite. A lesson for next time: a downloader-actions
  rendering change should run `results.spec.ts` in full, not just the component test suite.

### 2026-08-23 — Unify the control shape and height language

- **Why not a packet:** styling polish inside existing features plus the theme tokens behind it; no behavior, capability, API/URL/selector, `data-testid`, or persisted-data change. Verified by diff: every edit is a colour, radius, height, padding, icon, or comment.
- **Paths:** `core/ui-react/src/app/theme.ts`, `theme.test.ts`, `scripts/validate-focus-affordances.mjs`; `src/features/search/history/RecentSearches.tsx`; `src/features/search/results/{DownloadActions,RefineSidebar,SearchResults,filterControls}.tsx`.
- **Gates:** `typecheck`, `lint` (0 errors, 17 pre-existing warnings), `format:check`, `test` (101 files / 1099 tests), `build`, `check:api`, `validate:migration`, `validate:focus-affordances`, `validate:production-assets` all pass; `tests/system` `tsc` clean; `git diff --check` clean. Rendering verified live against a real backend at 1600x1000 and 390x844 (screenshot strip below).
- **Commit:** `c3bb56318`
- **Note:** the owner reported buttons "all over the place" — some slightly rounded, some fully rounded, some fully rounded but actually toggles. The root cause was a real bug, not a design drift: `sx`'s `borderRadius` key is theme-multiplied (`@mui/system`'s `styleFunctionSx/defaultSxConfig.js` maps it to `themeKey: "shape.borderRadius"`, and `borders/borders.js`'s `createUnaryUnit` multiplies a numeric value by it), so **every numeric radius token passed through `sx` rendered at 8x its authored value** while the same token rendered correctly in `styleOverrides`. Measured: `theme.shape.borderRadius` (8) -> 64px, `pillRadius` (7) -> 56px, `selectAllRadius` (5) -> 40px, which is why the select-all "5px square" had been rendering as a circle since FM-046. Both radius tokens are now CSS *strings*, which both mechanisms pass through untouched, and `theme.test.ts` asserts the string-ness with the reason.
  On top of the fix, three unifications the owner asked for. **Shape:** 8px rounded rect means "an action", a stadium (`pillRadius`, now `999px`) means "a state that is on or off" — only the refine quality/type pills and the search bar's constraint chips are stadiums. **Weight:** six near-identical local `sx` blocks for the same neutral secondary button collapsed into one themed `MuiButton` `variant="control"`, and `RefineSidebar`'s local `RefineChip` deleted in favour of the `refineChip` variant it duplicated byte-for-byte; MUI's stock teal `outlined` is gone from the search surfaces, so teal fill now means "primary" and nothing else competes with it. **Height:** the app rendered ten different control heights (25.9 / 27.3 / 27.6 / 28.0 / 30.8 / 31.5 / 35.7 / 36.5 / 37.1 / 38.8 / 40.0), none of them chosen — each was a MUI default's line-box plus a call site's own padding. A single exported `controlHeight = 32` now applies to `MuiButton`, `MuiToggleButton`, `MuiInputBase` (single-line only) and `MuiIconButton`, app-wide. `ToggleButton` needed its own entry because it is a separate `styled(ButtonBase)` and had silently kept the stats date-range control at 38.8px.
  Two deliberate opt-outs, both stated in code and one now test-guarded: the mock's dense 26px quality/type pills (a compact multi-select, not a row of actions) keep `minHeight: 0`, and `theme.test.ts` asserts it so a future edit cannot inflate them by accident; `size="small"` icon buttons stay 28px so in-row glyphs are not padded out to match bar controls. A third opt-out was tried and *rejected*: column sort headers were briefly excluded to protect ADR-0011's contested header space, but the sticky header row grows to 44.5px regardless (its selection caret is a `Button` and moved to 32px either way), so excluding them only bought a second special case and a 19.3px button. They are 32px like everything else.
  Two findings changed the plan mid-flight, both from live measurement rather than reasoning. The `control` variant needed 7px vertical padding against the filled primary's 8px, because it draws a 1px border the primary does not — which a stated `minHeight` then made moot, since a stated height is border-box. And unifying the refine sidebar's filter rows onto the pills' full selected language (16% fill, `primary.light`) was reverted after seeing it: `defaultFilters` starts with every category and indexer *selected*, so "active" is the resting state for whole columns at once and the sidebar became a wall of teal. Those rows keep their quieter 12%/`text.primary` treatment; only their radius changed.
  `validate-focus-affordances.mjs`'s ADR-0015 guard was failing **before this change** (it rejected a `MuiInputBase` entry of any kind, a proxy that stopped being true when `554145c33` added the mock's 14px input size). Confirmed pre-existing by re-running it with this diff stashed. Sharpened here to what ADR-0015 actually forbids — focus styling on the input root, never the entry itself — since this change adds a second legitimate non-focus declaration to that family. The gate is green again.
  Screenshot strip (1600x1000 unless noted): search form, results toolbar + bulk row, refine sidebar, display popover, 390x844 mobile (no horizontal overflow: `scrollWidth` 390 = `clientWidth` 390), and post-change sweeps of stats, search history, downloading config, and the bug-report tab confirming multiline textareas still grow (117px / 217px) while every single-line control is 32px.

### 2026-08-23 — Repair the outlined input's inner-element overflow, and the geometry assertion that caught it

- **Why not a packet:** a single-module styling repair plus the stale test assertion that exposed it; no behavior, capability, API/URL/selector, `data-testid`, or persisted-data change.
- **Paths:** `core/ui-react/src/app/theme.ts`, `theme.test.ts`; `tests/system/tests/search.spec.ts`.
- **Gates:** `typecheck`, `lint` (0 errors, 17 pre-existing warnings), `format:check`, `test` (1102), `build`, `check:api`, `validate:migration`, `validate:focus-affordances`, `validate:production-assets` all pass; `tests/system` `tsc` clean. `search.spec.ts` + `results.spec.ts` run in full against a freshly built real backend (`misc/run_gui_systemtest.py --runtime local`): **48 passed**.
- **Commit:** `4aa740701`
- **Note:** `search.spec.ts`'s `expect(submitBox.height).toBeGreaterThanOrEqual(36)` went red against `c3bb56318`'s shared `controlHeight = 32`, and was reported as a stale assertion. It was stale — the `36` silently encoded MUI's *default* button height — but rewriting it to assert what the row actually needs (the submit button agrees with the query field beside it) left it red by 17px, which was a real defect `c3bb56318` had shipped and its own verification had missed.
  `c3bb56318` authored the inner-control sizing on `MuiInputBase.styleOverrides.input`. `OutlinedInput` ships its *own* `input` slot carrying `padding: 8.5px 14px` at `size="small"`, and a component slot outranks the base's, so that rule never applied: `height: 100%` resolved to a 32px **content** box under `content-box` sizing and MUI's 17px of vertical padding was added on top. Measured live: input root 32px, inner `<input>` **49px** — every text field's focusable element overflowed its visible border by 17px. It painted nothing, which is why a screenshot review passed it; the original verification measured `.MuiInputBase-root` (correctly 32px) and never the inner element.
  Fixed by authoring the rule on `MuiOutlinedInput.styleOverrides.input` with `boxSizing: "border-box"`. Re-measured live: inner input 32, root 32, submit 32. `theme.test.ts` now asserts that slot explicitly with the precedence reason, so the same silent loss cannot recur.
  The assertion is now equality with the neighbouring field rather than a pixel floor, so it tracks the shared control height instead of going stale against it again. Two process notes worth keeping: a geometry floor that encodes a framework default is a latent trap, and "verified live" is only as good as the element measured — a container can be right while its child is wrong.

### 2026-08-23 — Repair the two known-red system specs

- **Why not a packet:** mechanical repair of test assertions in `tests/system` plus one spec restructured to assert the same contract through a locator that cannot go stale; no product code, no contract, no `data-testid`, no behavior change.
- **Paths:** `tests/system/tests/shell-selector.spec.ts` (rewritten); `config-indexers`, `config-downloading`, `config-searching`, `config-categories`, `config-auth`, `config-notifications`, `config-main`, `config` `.spec.ts` (one assertion each, two in `config-main`).
- **Gates:** `tests/system` `npx tsc --noEmit` clean; `prettier --check` clean; real-backend runs via `misc/run_gui_systemtest.py --runtime existing`: `shell-selector` + `config-indexers` **13/13**, and the remaining seven config specs **29/29**. `git diff --check` clean.
- **Commit:** `5aaf6571d`
- **Note:** two independently-reported red baselines, fixed together at the owner's request because a suite that is normally red teaches everyone to ignore failures.
  **The toast assertion was eight files, not one.** `config-indexers.spec.ts`'s shared `save()` helper ended with `expect(page.getByText("Configuration saved.")).toBeVisible()`, which trips Playwright's strict mode once a test saves twice, because FM-084 changed toasts from replace-on-arrival to stacking. It was reported as one file's problem; a sweep found the same unanchored assertion in eight spec files, each with its own copy of the helper — `config-indexers` was simply the first to have a test that saves three times. All nine sites are now anchored with `.last()`, which is what the assertion always meant ("the save I just performed reported success"), never "exactly one toast exists". Fixing only the red one would have left seven primed to fail the next time anyone added a second save. FM-092's own new test had worked around the hazard by closing the first toast before its second save; that workaround is removed here, since `save()` is now safe for every caller — its reviewer had accepted it for a new test, but the cause is the better place to fix it.
  **`shell-selector.spec.ts` could not be repaired the way it was last time.** It deep-linked at whichever route was still unmigrated, asserted the migration placeholder there, and clicked the placeholder's "Switch to legacy UI" link to return. That shape went stale twice: FM-024 took `/stats/stats?period=day` (repointed 2026-08-21, see above), and FM-077 then took `/system/tasks` as well, leaving the file red since `e28d70345` — it asserted the real Tasks body and then clicked a link only `MigrationPlaceholder` renders. There is no third route to repoint at, which is itself a migration-completeness signal. Split instead into three tests: the canonical deep link serves the React shell; `ui/legacy` switches back; and the placeholder's own link still works where the placeholder still lives. The middle one now exercises the **endpoint** rather than the link, which is the selector's actual contract and cannot go stale as routes migrate — the failure mode that broke this file twice. One correction found by probing rather than assuming: a path matching no route at all renders an empty document, not the placeholder, so the third test uses an unknown `stats/$tab`, which does render it.
  FM-094's packet folds this same `shell-selector.spec.ts` repair into its own scope and is now stale on that point; it needs a designer pass to drop it before FM-094 is implemented.

### 2026-08-23 — Repair four failing system specs, two of them a regression this batch introduced

- **Why not a packet:** test-only repairs — a shared fixture guard, two locator scopings, and toast-locator anchoring; no product code, contract, or `data-testid` touched.
- **Paths:** `tests/system/tests/{focus-indication,system,stats}.spec.ts`.
- **Gates:** `tests/system` `npx tsc --noEmit` clean; `prettier` clean; real-backend runs via `misc/run_gui_systemtest.py --runtime existing`: `focus-indication` 10/10, the three specs together 30/30, and the **full suite 154 passed / 2 failed**, the two remaining being `search-history.spec.ts:19` and `:68`, which are FM-094's own declared disposition work and not baseline failures.
- **Commit:** `6742ebab4`
- **Note:** the coordinator had told four subagents the suite had no known-red baselines, having verified only the specs it had itself repaired and never run the suite. FM-094's implementer reported four failures; the coordinator initially repeated its "pre-existing" framing. Both were wrong, and the distinction matters:
  **Two were caused by this batch.** `focus-indication.spec.ts:797` and `:1084` broke on FM-091. That file's `mockSearchResponse` fixture returns a `category: "TV"` result and grouping defaults on, so every search in it is eligible for FM-091's new one-time help dialog — which is modal and traps focus, fatal to a spec whose entire method is walking focus with Tab. Proof: `"Sorting of TV episodes"` appears in both failing page snapshots. FM-091's own reviewer ran `results.spec.ts`, the packet's declared spec, and passed it; the `beforeEach` flag guard was added only there. Fixed by adding the same guard here, with the reason recorded at the site.
  **Two were genuinely older.** `focus-indication.spec.ts:1047` is the previously-logged `NewsDialog` anchor duplication — but the logged fix ("scope the locator") is insufficient on its own: the dialog also traps focus, so the anchor must be dismissed, not merely disambiguated. A first attempt guarded the dismissal behind `isVisible()`, which polls once and loses the race against the startup checks that raise the dialog after `goto` returns; it is now awaited, which is deterministic because the test mocks a `forCurrentVersion` entry into a fresh session. `system.spec.ts:591` was FM-084 toast stacking again — the earlier sweep matched only `getByText("Configuration saved.")` and missed `getByRole("alert")`, so those `toContainText` assertions are now anchored with `.last()` here and in `stats.spec.ts`. The `toHaveCount(0)` alert assertions in `search.spec.ts` are deliberately left unanchored: they count all alerts, and `.last()` would silently change their meaning.
  **A poisoned shared instance** was the last layer: `system.spec.ts`'s sensitive-logging test enables the setting and disables it at the end, so the earlier strict-mode failure left it enabled and the next run failed on its own precondition. Reset via the real endpoint. The fragility is real — a failed run poisons later ones — and is recorded as a candidate below.
  Incidental: `prettier --write` on `system.spec.ts` and `stats.spec.ts` also reformatted pre-existing unformatted lines (~11 and ~20 lines), partially touching the 2026-08-18 candidate about `tests/system` specs never having been Prettier-formatted. Disclosed rather than reverted; it is mechanical and leaves both files consistent with the repo's own config.

## Open candidates

Known small defects not yet fixed. Discharge one with `/fm-quickfix`, then move it into the ledger above with its commit SHA. If a candidate turns out to fail the qualification gate, say so here and route it to `/fm-orchestrate`
instead of leaving it to rot.

- **React's bulk send ignores the downloader's configured default category.** With `category: null` ("Use downloader default")
  the server sends SABnzbd no `cat` parameter at all, so Hydra's configured `defaultCategory` has no effect; legacy sent it
  explicitly from the client. Evidence: the SABnzbd mock recorded `{apikey, mode: "addfile", nzbname, output, priority}` with no
  `cat`. Surfaced by FM-094, which had to drop `downloads.spec.ts`'s `cat: testEnvironment.sabnzbdMockCategory` assertion and
  could name no surviving test that covers it. The fix crosses `DownloadActions.tsx` and the server path that resolves a null
  category, so per README's *Choosing A Mechanism* it is a **packet**, not a quickfix.
- **A cleared search size constraint is still submitted.** Clearing the Advanced panel's Min/Max size fields, or deleting the
  `search-chip-size` chip, both leave the request carrying the category's preset — the backend logged `minsize=500,
  maxsize=20000` in both attempts against a Movies-category identifier search. Likely `SearchWorkspace.tsx`'s
  `minsize: field("minsize") || (preset?.minSizePreset?.toString() ?? "")` fallback. This is why FM-094 could not carry the
  deleted legacy autocomplete test's "the identifier search really returns the movie" assertion into its React sibling; once
  fixed, restore it to `search.spec.ts`'s TMDB-identifier test.
- **React's bulk send leaves the sent rows unmarked.** The row "Downloaded" chip is raised only by the direct NZB/torrent
  transfer, so legacy's per-row `.sabnzbd-success` feedback has no counterpart after a bulk send
  (`SearchResults.tsx`'s `onDownloaded` mapping from `addedIds` back to `searchResultId`s).
- **`searching.loadLimitInternal` is editable but consumed nowhere.** React's Config > Searching tab edits it; the results view
  ignores it, where legacy used it as the displayed page size. FM-094 deleted the last test covering it
  (`results.spec.ts`'s title-group page-size test, which used no legacy-only selectors and failed only for this reason), so
  nothing now evidences the gap. **Needs an owner ruling** — honour the setting or declare it backend-only — plus a registry
  line either way, so this is a packet rather than a quickfix.
- **`system.spec.ts:312` is log-volume fragile.** It failed once during FM-094's verification and passed on an identical rerun:
  `toContainText("NZBHydra")` against `system-log-view-raw` depends on the current log file not having rotated its startup
  banner away by the time the test runs, which the suite's own log volume decides. Assert on something the current file always
  carries instead.
- **`playwright.config.ts`'s `globalTimeout: 300_000` is below the suite's own runtime** (~4.2 minutes green, and the value
  bounds the whole run), so any documented full-suite command needs `--global-timeout=1800000` to finish at all; without it the
  run ends `timedout` with reporters unflushed. Raise it or split the suite. Deferred explicitly by FM-094.
- **Stale "the default is legacy" comments** in `focus-indication.spec.ts:29-32` and `notched-label-geometry.spec.ts:185-186`.
  Their `ui/react?redirect=…` navigations remain correct; only the stated reasons are now wrong after FM-094 flipped the
  default.
- **Two small unclaimed coverage trims from FM-094's deletions**, both cosmetic: `search-history.spec.ts:67-69` creates
  `historyResponse` and never awaits it (dangling promise, pre-existing at baseline), and the React autocomplete sibling
  (`search.spec.ts:1377-1394`) asserts `tmdbId` and the explicit-null shape but not the deleted test's `title`, `year`, or
  `content-type: application/json`.
- **`system.spec.ts`'s sensitive-data-logging test poisons the shared instance when it fails.** It enables the setting, asserts, and
  disables it at the end, so any mid-test failure leaves `SensitiveDataRemovingPatternLayoutEncoder` disabled on the running
  instance and the next run fails on its own precondition (`toHaveText("Enable sensitive data in logs")` against a toggle already
  reading "Disable ..."). Observed 2026-08-23; reset by hand via `PUT /internalapi/debuginfos/sensitiveDataLogging?enabled=false`.
  The durable fix is a fixture that restores the setting regardless of outcome, which is the same shape as any other
  server-mutating test in this suite — worth a sweep for others rather than fixing this one alone.
- **`POST /loggedout` (`core/src/main/java/org/nzbhydra/web/MainWeb.java:92`) is dead server code.** It invalidates the session,
  answers 401 with a `WWW-Authenticate: Basic` challenge, and clears the `remember-me`/`JSESSIONID` cookies — the standard trick
  for making a browser drop cached BASIC credentials. Nothing has ever called it: a case-insensitive sweep of `core/ui-src`
  finds only AngularJS `user:loggedOut` *events*, and `core/ui-react` never references it either. Found 2026-08-23 while ruling
  on `F-AUTH-LOGIN`'s BASIC-logout gap, which FM-093 now records as a permanent shared limitation on that evidence. Removing it
  is backend cleanup outside FM governance (ADR-0001 scopes FM to the frontend), and it is only worth doing deliberately: its
  cookie clearing sets `setSecure(true)`, so it would be inert over plain HTTP anyway, and any future attempt to actually end a
  BASIC session would want to start from this endpoint rather than rediscover it.
- ~~**`shell-selector.spec.ts` has been failing since FM-077 and can no longer be repaired by repointing it.** Its one test deep-links
  to `/system/tasks`, asserts `system-tasks-table` is visible (the *real* Tasks body), and then clicks
  `getByRole("link", {name: "Switch to legacy UI"})` — but that link is rendered only by `MigrationPlaceholder`
  (`core/ui-react/src/router.tsx:252-269`), so the two halves contradict each other and the click times out after 30s. `e28d70345`
  (FM-077: System tasks tab) updated the assertion when it migrated the tab and left the click behind. Verified failing
  2026-08-23 against a freshly built real backend (`misc/run_gui_systemtest.py --runtime local`, 1 failed / 7 passed in that
  batch); unrelated to that session's own diff, which does not touch this file. Note this is the *second* time this spec went
  stale the same way — the 2026-08-21 entry above repointed it from `/stats/stats?period=day` to `/system/tasks` after FM-024
  migrated the former. It cannot be repointed a third time at a real route: every canonical route is now migrated, and the
  placeholder survives only on `notFoundComponent`, an unknown `stats/$tab`, and the admin-area fall-through. Fixing it means
  choosing between deep-linking at a deliberately unknown route, splitting the selector assertion from the placeholder
  assertion, or deleting the spec with the UI selector itself — which is why it is left here rather than quickfixed: the
  legacy-removal packet (FM-094+) owns `shell-selector.spec.ts` and should decide it as part of that work.~~
  Discharged 2026-08-23 by the ledger entry above, at the owner's request, rather than waiting for FM-094.
- ~~**The results size/age `NumericFilter`'s "Apply" button is dead code that should be removed**~~ Discharged
  2026-08-23 by the FM-088 packet, which removed the button and moved "Clear" beside the min/max fields as an
  icon-only control (task packet deleted on completion per convention; see git history and `STATUS.md`).
- ~~**The refine sidebar's Category/Indexer expand/collapse state is plain `useState` and always resets to expanded
  on reload.**~~ Discharged 2026-08-23 by the FM-089 packet, which persisted both via two new optional keys folded
  into `SearchResults.tsx`'s existing `hydra.search-results.table` payload (task packet deleted on completion per
  convention; see git history and `STATUS.md`).
- ~~**A long `TextField` floating label can render with the outlined border's top line crossing through the back
  half of the label text.**~~ Discharged 2026-08-23 by the FM-090 packet, which found the original diagnosis here
  (a font-load ref-staleness race) was wrong: it's a permanent size mismatch between the notch legend and the
  visible label, present even with the web font fully loaded, fixed app-wide in `theme.ts` (task packet deleted on
  completion per convention; see git history and `STATUS.md`).
- **`ConfigFieldset.tsx`'s `config-fieldset-<label>` testid is derived from the fieldset's label text and will contain a
  space for any multi-word label** (`label.toLowerCase()` with no sanitization, e.g. "External Tools" ->
  `config-fieldset-external tools`). Every fieldset FM-059 shipped has a single-word label, so this is latent, not yet
  observed breaking anything, but FM-060 (Auth), FM-065 (External Tools), and others plan multi-word fieldset labels.
  Surfaced by a `migration-task-designer` while documenting `C-CONFIG-FIELDS`'s testid convention, 2026-08-20. Fixing it
  is a `data-testid` value change on a shipped component (`config-fieldset-<label>` -> presumably a slugified form), so
  it needs an explicit `/fm-orchestrate` call, not a quickfix — check whether any test already asserts the exact
  space-containing string before choosing a replacement scheme.
- **`config-input-<path>` lands on the MUI root element for `SwitchSetting`/`SelectSetting` rather than the actual
  editable control**, unlike the other seven control kinds where it lands on the native `<input>`. Flagged by FM-059's
  independent reviewer as harmless today (both component and system tests already reach those two controls by role, not
  by this testid), but the inconsistency is a convention seven more config tabs will otherwise copy. Left open rather
  than fixed alongside the aria-describedby entry above: relocating an existing `data-testid` to a different DOM node is
  arguably a selector-contract change even though the id string itself is unchanged, which the quickfix gate excludes;
  worth an explicit `/fm-orchestrate` call on whether to move it or declare the root-element placement the intended
  convention.
- ~~**Persist whether the search workspace's "Advanced" panel is collapsed or expanded** (`core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`, `advancedOpen` state). Requested alongside the 2026-08-19 UX polish above but
  refused at the qualification gate: this ledger's own header excludes persisted-data changes, and remembering the panel's state across page loads is a new user-observable capability, not styling or a contained bugfix. Needs a task
  packet: a storage-key convention decision (this would be the first persisted UI preference in `core/ui-react`) and a regular implementer/reviewer pass. Route to `/fm-orchestrate`.~~
  Discharged 2026-08-23 by the FM-087 packet, which shipped exactly this (`nzbhydra.search.advancedOpen` in `localStorage`, guarded reads).
- **`focus-indication.spec.ts`'s anchor-family test fails on a fresh datafolder because FM-079's startup `NewsDialog`
  duplicates the mocked news anchor** (`tests/system/tests/focus-indication.spec.ts:1047`, `core/ui-react/src/app/status/NewsDialog.tsx`). The test mocks `/internalapi/news**` with a `forCurrentVersion: true` entry and locates
  `a[href='https://example.invalid/fm053']` strictly; on a datafolder where that news is unseen, the startup dialog (a portal outside `system-shell`, added by FM-079 after the test was written for FM-053) renders the same
  server-authored HTML as the news page, so the locator resolves to two elements. Deterministic on `--runtime local` runs (fresh datafolder), invisible against long-lived IntelliJ services (news already marked shown). Surfaced
  2026-08-23 while gating the visual-language quickfix above, which could not have caused it (theme-only diff). Fix belongs in the test — dismiss or await the dialog before probing, or scope the locator — contained enough for a
  quickfix.
- ~~**The refine sidebar's `downloadTypes` selection has the same cross-search staleness as `indexers`/`categories` did.**~~
  Discharged the same day by the 2026-08-19 download-type entry above (`27efd28f5`).
- **Download-history and notification-history tables squeeze columns instead of scrolling at 390x844**, wrapping cell text
  (e.g. "Syst / em", "Inde / xer") rather than letting `TableContainer` scroll horizontally. Flagged by the FM-023 reviewer;
  affects `DownloadHistoryPage.tsx` and `NotificationHistoryPage.tsx` identically, likely `SearchHistoryPage.tsx` too (not
  confirmed). Left off this session's quickfix because it needs a real layout decision (a `minWidth` on `Table` forcing
  container scroll vs. a narrower mobile column set) rather than a mechanical swap, and should be checked and fixed across
  all three history routes together with a fresh 390x844 screenshot strip for each.
- **`SearchHistoryPage.tsx`'s local `SortHeader` has the same missing-sort-indicator gap** the entry above just fixed in the
  other two history routes (identical copy-pasted `<Button>`-in-`<TableCell>` pattern, not a shared component). Not named by
  the FM-023 review so left untouched here; discharging it would be the same `TableSortLabel` swap, contained to that one
  file.
- **`focus-indication.spec.ts`'s "authored ring on the results surfaces" test mislabels its downloader-select focus-ring
  capture** (`page.getByTestId("results-bulk-actions").locator(".MuiInputBase-root").first()`, named `downloader-select`
  in its screenshot path and evidence, around line 884): its fixture (`hydra.configureSabnzbdMock()`) configures exactly
  one downloader, so since `bdae1e73a` (2026-08-23) that select is hidden and `.first()` now actually resolves to the
  *category* select instead. The test still passes -- `expectFocusedOutlinedInput` only checks generic notched-outline
  CSS, and `tabTo` walks Tab presses dynamically until the target locator itself gains focus, so nothing is
  content-sensitive -- but the captured `keyboard-focus-downloader-select-desktop` evidence and the assertion's own
  name now describe the wrong control. Not a failure, so left as a candidate rather than fixed inline while chasing
  FM-088; the fix is either pointing the locator at `.last()` (the category select, and renaming accordingly) or
  switching the fixture to configure two downloaders so the downloader select is actually present again. Surfaced
  2026-08-23 while investigating the `results.spec.ts` regression above.
- ~~**`tests/system/tests/search.spec.ts:411` asserts the search submit button's height is `>= 36px`**, which is now
  false: `c3bb56318` (2026-08-23, an independent concurrent session's visual-language unification) set every
  `MuiButton` to the app's new `controlHeight = 32`. Confirmed pre-existing and unrelated to FM-090 (reproduces
  identically with FM-090's `theme.ts` change reverted). Left alone because it's outside every packet's file
  allowlist that has touched this area so far; the fix is a one-line assertion update (`>= 32` or an exact `32`),
  contained to that one file. Surfaced 2026-08-23 by FM-090's implementer while running the full system-test
  verification set.~~
  Discharged 2026-08-23 by the ledger entry above ("Repair the outlined input's inner-element overflow, and the
  geometry assertion that caught it"). The suggested one-line update turned out to be insufficient, and usefully so:
  rewriting the assertion to say what the row actually needs — that the submit button agrees with the query field
  beside it — left it red by 17px, exposing a real defect `c3bb56318` had shipped (its inner-input sizing was
  authored on `MuiInputBase`, which `OutlinedInput`'s own `input` slot outranks, so every text field's focusable
  element overflowed its visible border). Both the defect and the assertion are fixed; `search.spec.ts` and
  `results.spec.ts` pass in full (48/48) against a freshly built real backend.
- **The FM-090 notch/label-overlap fix closes the gap by shrinking every input label app-wide** (effective 12px ->
  10.5px) rather than by widening the notch legend instead. Mechanically correct and owner-approved via a
  before/after screenshot strip, but the alternative shape (sizing the legend up in `MuiOutlinedInput` rather than
  the label down in `MuiInputLabel`) was never attempted or compared. Not a defect -- nothing to discharge -- just a
  design-space note in case the label-size reduction turns out to read too small in practice once seen across more
  of the app than the two fields FM-090 measured. Surfaced 2026-08-23 by FM-090's reviewer.
