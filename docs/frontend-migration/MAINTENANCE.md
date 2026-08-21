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

## Open candidates

Known small defects not yet fixed. Discharge one with `/fm-quickfix`, then move it into the ledger above with its commit SHA. If a candidate turns out to fail the qualification gate, say so here and route it to `/fm-orchestrate`
instead of leaving it to rot.

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
- **Persist whether the search workspace's "Advanced" panel is collapsed or expanded** (`core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`, `advancedOpen` state). Requested alongside the 2026-08-19 UX polish above but
  refused at the qualification gate: this ledger's own header excludes persisted-data changes, and remembering the panel's state across page loads is a new user-observable capability, not styling or a contained bugfix. Needs a task
  packet: a storage-key convention decision (this would be the first persisted UI preference in `core/ui-react`) and a regular implementer/reviewer pass. Route to `/fm-orchestrate`.
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
