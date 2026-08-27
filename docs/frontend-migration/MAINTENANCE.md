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

### 2026-08-24 — Close three references the legacy removal left dangling

- **Why not a packet:** three mechanical repairs, eight lines total, each closing a reference to something FM-095 deleted; no capability, contract, or `data-testid` change.
- **Paths:** `core/src/main/resources/META-INF/native-image/resource-config.json`, `core/src/main/java/org/nzbhydra/api/CapsGenerator.java`, `core/ui-react/vite/devBackend.ts`.
- **Gates:** `core/ui-react` typecheck / lint (0 errors, 19 pre-existing warnings) / `format:check` / `test` (1129) green; `mvn --batch-mode test -pl core -DskipTests=false` → **Tests run: 478, Failures: 0, Errors: 0**; full system suite **153 passed**, no failures, skips or flaky, against an instance packaged from this tree; `git diff --check` clean.
- **Commit:** `776ca706d`
- **Note:** all three were surfaced by FM-095's reviewer and designer rather than by any test, which is the point worth recording — a green suite could not have caught any of them.
  **The native shell template.** `resource-config.json`'s hand-maintained GraalVM include list named `templates/index.html`, deleted by FM-095, and had never named `templates/react.html`. If that list is load-bearing — its explicit `templates/error.html` entry and commit `c9f27f163` ("Fix native build some more") both suggest it is — a **native** build had no shell template for any route. Neither the 478-test Java suite nor the 153-test system suite can detect this: `NativeApplicationContextTest` reads the JVM classpath, not the image. Repointed, one line.
  A wider cleanup was started and deliberately reverted: ~30 further entries in that file name deleted legacy assets, and six were removed before it became clear the file would be left half-swept. Every one of them is inert anyway — line 23's `static/.*` pattern already covers the whole tree — so the diff is now exactly the one load-bearing line, and the dead-entry cleanup is a candidate below rather than churn inside an already-large removal.
  **The caps image.** `CapsGenerator.java:124` advertised indexer capabilities with an image URL under `master/core/ui-src/`, a path FM-095 deletes; it would have kept resolving until the branch merged and then broken silently, since nothing tests a remote asset URL. Repointed at the retained `static/img/banner-bright.png`, the same relocation FM-095 gave `/readme.md`. `grep -rn "ui-src" core/src/main/java` is now empty.
  **The dev proxy's Cookie header.** `devBackend.ts` set `Cookie: nzbhydra-ui=react` on every proxied request via `setHeader`, which *replaces* the browser's own header and so discarded `JSESSIONID` — dev-mode session breakage against a backend with authentication configured. Pre-existing, but its only justification was the selector FM-095 removed, so it is now pure liability. Removed, with the reason recorded at the site so nobody reintroduces it.

### 2026-08-26 — Clamp `ConfigFieldset`'s minimum width at zero

- **Why not a packet:** one contained layout defect in a single component, shipping a regression test observed failing before the fix and passing after; no capability, contract, registry, or `data-testid` change.
- **Paths:** `core/ui-react/src/features/config/components/ConfigFieldset.tsx`, `core/ui-react/src/features/config/components/configFields.test.tsx`, `core/ui-react/src/features/config/indexers/IndexerTable.tsx`.
- **Gates:** in `core/ui-react` — `typecheck`, `format:check`, `build`, `check:api`, `validate:migration` all pass; `lint` **14 warnings / 0 errors**, equal to base; `test -- --run` **114 files / 1330 tests passed**; `knip` reports only the pre-existing `NO_ADVANCED_DISCLOSURE`; `validate:focus-affordances` **red on exactly the five known base findings**, no sixth and no exemption entries (pre-existing, unchanged by this fix). Real backend from the repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config tests/external-tools.spec.ts` → **86 passed**, plus a confirming `tests/config-indexers.spec.ts` run → **12 passed**. `git diff --check` clean. Install skipped — no manifest changed and `node_modules` already matched the lockfile.
- **Commit:** `1b24f85f9`
- **Note:** the mechanism, because it is not obvious and the project kept collecting findings against it. `ConfigFieldset` renders a real `<fieldset>`, and a `<fieldset>` computes `min-inline-size: min-content` where a `<div>` computes `0`. So the fieldset is always at least as wide as the widest min-content *contribution* of anything inside it, and that width propagates outward until an ancestor stops it — which in the config shell means the document. Any config tab holding content wider than its column therefore scrolled **the page** sideways rather than scrolling its own container: at a 390px viewport the indexers tab rendered a 916px document. `minWidth: 0` on the fieldset's `sx` restores the `<div>` floor and clamps it regardless of what any descendant contributes.
  **FM-103's local workaround is removed with it.** That task wrapped the indexer table in a `minmax(0, 1fr)` grid, which did work but only for its own subtree — a `minmax(0,1fr)` track contributes 0, while a wide *sibling* would still push the fieldset out (proven by FM-103's reviewer: an 800px sibling next to the wrapper settled the fieldset at exactly 800). Both the wrapper and its comment — which claimed a child "cannot override" the floor, which the wrapper's own success disproves — are gone. `config-indexers.spec.ts`'s 390px page-width assertion still passes with the wrapper removed, which is the evidence that the central fix subsumes the local one.
  **Swept before changing anything**, since this component renders on every config tab and the fix only *lowers* a floor: the failure mode it could introduce is a fieldset holding wide unscrollable content, which would clip instead of widening the page. There is none. The only fieldset content wider than its column is `IndexerTable`'s 900px table, which owns an `overflowX: auto` `TableContainer`. The three `minWidth: 180` `<dt>` labels (`CustomMappingsSection`, `ExternalToolsSection`, `DownloadersSection`) are far below any supported viewport and stack to a column at `xs`; `ReviewChangesPanel`'s table lives in a `Dialog`, not a fieldset; the only `whiteSpace: nowrap` outside a scrolling table is `ColorSetting`'s visually-hidden `<input type="color">`. No `<pre>` blocks and no unbroken long strings without `overflowWrap` in the config tree.
  Visual evidence for `F-CONFIG-INDEXERS` was re-captured (the strip is git-ignored under `tests/system/visual-evidence/`); the mobile list and the tablet scroll-container captures are unchanged in layout from FM-103's, confirming the wrapper's removal shifted nothing.

### 2026-08-26 — Restore the Auth Users search anchor, and close the drift blindness that hid its loss

- **Why not a packet:** one restored `data-testid` on an existing container plus one new assertion in the test that was
  supposed to catch its loss; no capability, contract, registry, or behavior change beyond making an already-indexed
  navigation target reachable again.
- **Paths:** `core/ui-react/src/features/config/auth/AuthUsersSection.tsx` and `AuthUsersSection.test.tsx`;
  `core/ui-react/src/features/config/settingsSearch/settingsIndexDrift.test.tsx`;
  `tests/system/tests/config-auth.spec.ts`; `docs/frontend-migration/FEATURES.yaml` (`F-CONFIG-AUTH.selectors`).
- **Gates:** in `core/ui-react` — `typecheck`, `format:check`, `build`, `validate:migration` pass; `lint`
  **14 warnings / 0 errors**, equal to base; `test -- --run` **119 files / 1447 tests passed**; `knip` reports exactly
  the two base findings (`NO_ADVANCED_DISCLOSURE` and the now-dead `RepeatSection` barrel export), no third;
  `validate:focus-affordances` **red on exactly the five known base findings** — its output is byte-identical
  (`md5 039971a77a37040d111114af7b1175ed`) to the same script run against a `git archive 1b4a46362` extraction, and the
  exemption list is untouched. `tests/system`: `npx tsc --noEmit` clean, `prettier --check` clean. Real backend from
  the repository root: `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-auth.spec.ts
  tests/config.spec.ts` → **38 passed**, plus a confirming `tests/config-auth.spec.ts` run → **9 passed**.
- **Commit:** `034b42088`
- **Note:** the defect and the reason nothing saw it are two different things, and both are fixed here.
  **The anchor.** `settingsIndex.ts:550` indexes the Auth Users list as one `kind: "section"` entry anchored on
  `repeatAnchor("auth.users")` → `config-repeat-auth-users`. FM-105 replaced the users `RepeatSection` with a table
  carrying `config-users-table` and dropped that id, so from FM-105 until now FM-099's settings search and FM-102's
  "on this page" list navigated to an id in no DOM: `useSettingsNavigation`'s anchor poll simply ran out its 2s
  deadline and no highlight was ever painted — the same silent-no-op shape as FM-099's own cross-tab reveal bug.
  Restored on a `Box` wrapping the table, derived from `USERS_PATH` through `settingTestId` rather than typed out, the
  precedent FM-107 set in `CategoriesTable.tsx:36-47`. `config-users-table` is untouched: it is the focus target after
  an add or delete and is asserted by four unit tests and two system assertions.
  **The blindness.** `settingsIndexDrift.test.tsx`'s two directions cannot see a section anchor *at all* — (a) filters
  `kind === "row"`, and (b) only ever looks at what `^config-setting-` matched — so the file stayed 37/37 green with
  the anchor gone. A third direction (c) now asserts, per tab, that every `kind: "section"` entry's `anchorTestId` is
  rendered by something, naming the offending path and anchor on failure. It checks the anchor across *all* of a tab's
  fixtures rather than the default one, because Auth's Users section is `conditional` (it renders only for a non-`NONE`
  auth type) and filtering conditionals out — as direction (a) does for rows — would have skipped the very entry that
  was broken. Verified negatively: with the restored anchor deleted, (c) fails with
  `auth.users is indexed with anchor config-repeat-auth-users, which nothing on the Authorization tab renders`.
  A companion assertion pins the number of section entries at ≥7 so (c) cannot go vacuous the way (b) could.
  **The other six section anchors pass** under (c) — indexers, downloaders, external tools, custom mappings,
  notifications, categories. `config-repeat-auth-users` was the only one missing; the true scope is one anchor.
  **The system test asserts the behaviour, not the id.** `config-auth.spec.ts` now searches from the Main tab, picks
  the Auth Users hit, and requires the section to be scrolled into view *and* carrying the highlight `boxShadow` —
  which only appears once the anchor poll resolves, so it is direct evidence the navigation completed rather than
  expired. A DOM-presence check would have been the weaker claim.

### 2026-08-27 — Narrow the focus-affordance colour-literal check to design positions

- **Why not a packet:** mechanical repair of one build-time validation script. No runtime source, no rendering, no
  contract, registry, decision entry or `data-testid` touched; the gate's intent is unchanged, only which positions it
  reads as design values.
- **Paths:** `core/ui-react/scripts/validate-focus-affordances.mjs`; this file.
- **Gates:** in `core/ui-react` — `validate:focus-affordances` now **passes** (345 source files, 10 authored families),
  `typecheck`, `format:check`, `build`, `validate:migration` pass; `lint` **14 warnings / 0 errors**, equal to base;
  `test -- --run` **119 files / 1458 tests passed**; `knip` reports exactly the two base findings
  (`NO_ADVANCED_DISCLOSURE`, `RepeatSection`), no third. No system-test run: the change is confined to a script that
  never ships and renders nothing, so there is no screenshot strip and none is owed.
- **Commit:** `034b42088`
- **Note:** check 4 had been red at base for the whole FM-097..FM-116 run on five findings, none of them a design
  literal, so every implementer met a required gate failing for something it did not cause and had to prove the finding
  set byte-identical against a pristine tree to show it had not added a sixth.
  **The defect.** The check matched `#hex`/`rgba?(`/`oklch(` anywhere in a feature file. But legacy persists an
  indexer's colour as an `rgb(r,g,b)` string, so feature code legitimately builds, parses, documents and fixtures that
  shape. The five: `ColorSetting.tsx`'s `` return `rgb(${r},${g},${b})` `` (the wire format `hexToRgb` exists to
  produce — the one site that *cannot* be fixed by removing the literal), two test *titles* containing the words
  (`ColorSetting.test.tsx`, `resultTable.test.ts`), and two indexer-config fixture values
  (`SearchResults.test.tsx`, `IndexersConfigTab.test.tsx`).
  **The fix.** A new `designLiteralRegions()` returns the byte ranges where a colour is a design decision rather than
  data — a style object or prop (`sx={…}`, `sx: {…}`, `style={…}`), an Emotion authoring site
  (`styled(X)(…)`, ``css`…` ``, ``keyframes`…` ``), a presentational JSX attribute (`fill`, `stroke`, `color`,
  `htmlColor`, `bgcolor`, `borderColor`, `backgroundColor`), and a binding whose whole value is a colour string, so
  hoisting a literal out of an `sx` block does not evade the gate. Check 4 fires only inside those, and never in
  `*.test.*`, whose fixtures and titles are data by construction. Delimiter scanning is nesting-aware and deliberately
  naive about delimiters inside strings: over-running widens a region, which can only make the check flag more.
  **The exemption list at `:112` was not touched and is still empty.** Adding the five files there was the cheap
  workaround available to every task in this run and refused by all of them, FM-111 included; it would have weakened a
  real gate to hide a matcher bug.
  **Proven to still bite, not asserted.** A probe file carrying a literal in each of the four design positions was
  flagged four times at the exact lines, while the same file's comment, `` `rgb(${…})` `` template and
  `{color: "rgb(10,20,30)"}` data fixture were correctly ignored; separately, inserting `color: "rgb(200,50,10)"` into
  a real `sx` block at `ResultRow.tsx:132` produced exactly one finding naming that line. Both probes reverted; the
  tree scanned clean afterwards, with no new finding anywhere.
  **Line numbers are now true.** `stripComments` collapsed each comment to a single space, shifting every index after
  it — which is why the old output blamed `ColorSetting.tsx:46` for a literal on line 51 and
  `IndexersConfigTab.test.tsx:921` for a line containing no colour at all. Comments are now blanked to an equal-length
  run of spaces with their newlines kept, so reported positions match the file the reader opens. Checks 1-3 are
  otherwise untouched and benefit from the same correction.

### 2026-08-27 — Stop a cleared search size range from being refilled by the category preset

- **Why not a packet:** single-module bugfix inside `features/search`, shipping the regression test FM-094 had to leave
  behind. No new capability; the URL, request and `data-testid` contracts are unchanged, and the FM-087-frozen
  `valuesFromSearch`/`canonicalSearch`/`nonIdentifierQueryText` are untouched — the fix is entirely in `SearchPage`'s own
  reading of the route.
- **Paths:** `core/ui-react/src/features/search/SearchPage.tsx`, `core/ui-react/src/features/search/SearchPage.test.tsx`,
  `tests/system/tests/search.spec.ts`; this file.
- **Gates:** in `core/ui-react` — `typecheck`, `format:check`, `build`, `validate:migration`,
  `validate:focus-affordances` (345 files, 10 families) pass; `lint` **14 warnings / 0 errors**, equal to base;
  `test -- --run` **119 files / 1460 tests passed** (1458 at base plus the two new ones); `knip` reports exactly the two
  base findings (`NO_ADVANCED_DISCLOSURE`, `RepeatSection`), no third. Real backend from the repo root:
  `python3 misc/run_gui_systemtest.py --runtime local -- tests/search.spec.ts tests/results.spec.ts` — **45 passed, 0
  failed**, including the restored assertion.
- **Screenshot strip:** `tests/system/visual-evidence/F-SEARCH-FORM/cleared-size-{1-preset-untouched,2-cleared,3-after-submit}-desktop.png`
  (1280x800) — the untouched preset still raises its `Size 500–20000 MB` chip, clearing the range drops it, and it stays
  dropped across the submit, where it used to reappear. Desktop only: the chip bar is one wrapping row with no separate
  mobile layout.
- **Commit:** `034b42088`
- **Note:** the ledger's suspected cause was checked and is not where the constraint leaks. The submitted request is
  correct; the *second* one is not. Instrumenting the real-backend run showed two navigations for one click —
  `?category=Movies&title=…&indexers=…` (cleared range correctly absent, because `canonicalSearch` drops an empty field),
  then `?category=Movies&minsize="500"&maxsize="20000"&…`. `AutoSubmitFromRoute` re-resolves the canonical URL that the
  submit had just written, `valuesFromSearch` cannot tell an absent `minsize` from a cleared one and so refills it from
  the category preset, and that second submission's `releaseSubmission()` cancels the correct request still in flight
  before it is sent. One search reaches the backend and it is the preset one — which is why the log showed
  `minsize=500, maxsize=20000` and only one entry. The same non-idempotence made the workspace, keyed on the resolved
  values, remount with the size chip restored.
  **The fix.** `SearchPage` remembers the values behind each route it submits, keyed by that route, and prefers them
  over re-resolving it; `AutoSubmitFromRoute` is handed that resolution instead of computing a second, independent one.
  A route this page never submitted still resolves through `valuesFromSearch`, so a fresh load, a bookmark, a deep link
  and a category change all keep their presets. The map is bounded at 20 routes.
  **Both removal routes are covered**, by a parametrised `SearchPage` test that clears the Min/Max fields and one that
  deletes the `search-chip-size` chip; each drives the submit and then the route round trip the real router performs.
  Both were observed failing against the unfixed `SearchPage.tsx` (the size chip returns after the round trip) and
  passing after.
  **Route resolution is deliberately kept separate from the form's.** Feeding `AutoSubmitFromRoute` the form's values
  instead made a Refill — which prefills the form without touching the route — auto-run its search; caught by
  `search.spec.ts`'s ADR-0012 keyboard-Refill test on the first real-backend run, and fixed by resolving the route
  independently of `refillCriteria`.

### 2026-08-27 — Stop the entry dialogs' advanced rows registering with the fieldset behind them

- **Why not a packet:** single-module bugfix inside `features/config`, shipping regression tests that were observed
  failing first. It consumes an existing exported constant rather than introducing anything; no new capability, no
  contract, registry or `data-testid` change, and no `DECISIONS.md` subject matter. `IndexerDialog` is deliberately
  untouched — it is rendered outside its fieldset (`IndexersConfigTab.tsx:328` closes before `:354`) and was already
  correct.
- **Paths:** `core/ui-react/src/features/config/downloading/DownloaderDialog.tsx`,
  `core/ui-react/src/features/config/downloading/DownloadingConfigTab.test.tsx`,
  `core/ui-react/src/features/config/external-tools/ExternalToolDialog.tsx`,
  `core/ui-react/src/features/config/external-tools/ExternalToolsConfigTab.test.tsx`; this file.
- **Gates:** in `core/ui-react` — `typecheck`, `format:check`, `build`, `check:api`, `validate:migration`,
  `validate:focus-affordances` (345 files, 10 families) pass; `lint` **14 warnings / 0 errors**, equal to base;
  `test -- --run` **119 files / 1464 tests passed** (1460 at base plus the four new ones); `knip` **drops from two
  findings to one** — `NO_ADVANCED_DISCLOSURE` is now consumed, leaving only the pre-existing `RepeatSection` barrel
  export. Real backend from the repo root:
  `python3 misc/run_gui_systemtest.py --runtime local -- tests/config-downloading.spec.ts tests/external-tools.spec.ts tests/config-indexers.spec.ts`
  — **35 passed, 0 failed**, the indexers spec included to prove `IndexerDialog` is undisturbed. `git diff --check`
  clean. Install skipped — no manifest changed and `node_modules` already matched the lockfile.
- **Screenshot strip:** `tests/system/visual-evidence/QUICKFIX-DIALOG-ADVANCED/after/{downloading-dialog-closed,downloading-dialog-open}-{desktop,mobile}.png`
  and `.../{external-tools-dialog-closed,external-tools-dialog-open}-desktop.png` — each captured with the global
  advanced toggle **off**, full-page so the whole host fieldset is in frame. The Downloaders and External tools
  fieldsets end at their "Add new …" button with no expander after it while the dialog is open; the Downloading tab's
  *General* fieldset keeps its own genuine "4 advanced settings hidden" expander, which is what the strip is contrasted
  against. (The directory is under the git-ignored `visual-evidence/` root, as all evidence here is.)
- **Commit:** `034b42088`
- **Note:** the registration is a React context effect, not a DOM relationship, so the portal that moves the dialog out
  of the fieldset's markup does not move it out of the fieldset's *count*. The fix wraps each dialog body in
  `AdvancedDisclosureContext.Provider value={NO_ADVANCED_DISCLOSURE}` — the value `advancedDisclosure.ts:32-40` already
  documents as "what an advanced row outside any fieldset sees". Only the hidden state changes: with the toggle on,
  `SettingRow` shows an advanced row regardless of what any disclosure says, which is the second of the four new tests.
  **The count, not the expander, is what the tests assert.** FM-098's `hiddenCount` is read off state every render with
  no memoisation (deliberately — FM-097 shipped a stale badge by memoising on React Hook Form state), so a fix that left
  a stale or replacement registration could hide the expander while the count stayed wrong. `hiddenCount === 0` renders
  *no element at all*, so each test compares the whole set of `config-advanced-expander-*` elements and their count text
  before and after the dialog opens, and additionally asserts the host fieldset's own expander is absent rather than
  merely invisible. Both were observed failing against the unfixed dialogs, on exactly that assertion: the phantom
  button was present, reading "3 advanced settings hidden" for Downloaders and "4 advanced settings hidden" for External
  tools.
  **The candidate's "11" is the upper bound, not the number you will usually see.** `ExternalToolDialog` declares 11
  advanced rows but gates them behind `visibleExternalToolFields`, so a Usenet-only tool (the fixture, and the common
  case) reaches only 4; the torrent seeding rows account for the rest. The defect and the fix are unaffected — the
  correct count is zero either way.

### 2026-08-27 — Make the next intermittent unit failure identifiable: write a JSON report to a file

- **Why not a packet:** test-runner configuration only. No source file, no test, no rendering, no contract, registry,
  `data-testid` or `DECISIONS.md` subject matter; the console reporter is untouched, so every agent and gate chain
  reads exactly the output it read before. The one behavioural change is an additional git-ignored file on disk.
- **Paths:** `core/ui-react/vite.config.ts`, `core/ui-react/.gitignore`; this file.
- **What it does:** `test.reporters` becomes `["default", "json"]` with
  `outputFile.json = "test-results/vitest-results.json"`. `default` stays first and unchanged. The report is
  git-ignored via a `test-results/` line in `core/ui-react/.gitignore` — the same name and the same treatment
  `tests/.gitignore` gives `system/test-results` for Playwright's output, rather than a new convention. Prettier reads
  the `.gitignore` next to its working directory, so no `.prettierignore` change was needed; `format:check` passes
  with the report present.
- **Evidence it captures a name:** a temporary `expect(true).toBe(false)` was added at
  `DialogProvider.test.tsx:38` and the full suite run. Console: `Tests 1 failed | 1463 passed (1464)`, with the failure
  block in its usual shape. The report named it independently of the console —
  `numFailedTests: 1`, `assertionResults[].fullName` =
  `"DialogProvider should expose an accessible confirmation dialog and return a typed result"`, with the file path and
  the `AssertionError` message and stack. The forced failure was then reverted and `git status` confirmed only the two
  intended files modified.
- **Gates:** in `core/ui-react`, after reverting the forced failure — `typecheck`, `format:check`, `build`,
  `validate:migration`, `validate:focus-affordances` (345 files, 10 families) pass; `lint` **14 warnings / 0 errors**,
  equal to base; `knip` **exactly one finding** (`RepeatSection`), equal to base; `test -- --run` **119 files / 1464
  tests passed**. `git check-ignore -v core/ui-react/test-results/vitest-results.json` resolves to
  `core/ui-react/.gitignore:4`, and the file does not appear in `git status`. **No system-test run and no screenshot
  strip: nothing renders.**
- **Known limitation, stated because it bounds the claim:** Vitest's `JsonReporter.onTestRunEnd` receives only
  `testModules`, not `unhandledErrors` — verified in `node_modules/vitest/dist/chunks/index.UpGiHP7g.js:3538`. So the
  separately-logged `DialogProvider.test.tsx` teardown race, which exits 1 while every test passes, will produce a
  report reading `numFailedTests: 0, success: true`. The JUnit reporter has the same signature, so adding it would buy
  nothing; JSON alone is the right single choice. A report that says green next to a non-zero exit is therefore a
  *discriminator*, not a miss: it says the run hit the unhandled-error class, whose file the console already names.
- **The flake is not fixed, and was not chased.** This closes the identification half only. Nine further green full
  runs were made after the gates (8 consecutive plus the gate run, 1464/1464 each, exit 0 every time), so the flake was
  **not** caught in the act and nothing new is known about it. Both recorded candidates stay live under *Open
  candidates*. Worth noting for whoever picks it up: these runs compressed ~210s of aggregated test time into ~18s
  wall — the same contention shape FM-097's reviewer blamed for the `notifications` timeout — without reproducing it.
- **Commit:** `9f76043e5`

## Open candidates

Known defects and gaps found but not yet fixed, routed by **mechanism** per README's *Choosing A Mechanism* — by risk, not by
visibility. Discharge a single-session item with `/fm-quickfix`, then move it into the ledger above with its commit SHA. Route a
packet item to `/fm-orchestrate`. An item under *Needs a decision first* cannot be routed at all until the named question is
settled in `DECISIONS.md`.

Triaged and reorganised 2026-08-27 after the sixteen-task batch (FM-097..FM-112) roughly doubled this list. Entries merged during
that pass name every task that surfaced them; no evidence and no `file:line` citation was dropped. Verification notes marked
**Checked 2026-08-27** were confirmed by grep against the working tree at that date; nothing else here was re-derived.

### Task packet with independent review

New user capability, API/URL/selector contract change, persisted-data change, cross-module behaviour change, or anything that
needs a new decision entry. Ordered by consequence-if-left times likelihood-of-being-hit: the first three are reachable by an
ordinary admin on an ordinary day and fail silently or destructively; the selector-contract pair below them is latent but
compounds with every tab that copies the convention. **That ranking was partly wrong and is left in place with its
correction attached rather than silently re-sorted:** the first item is not UI-reachable — see the correction in its own
entry, 2026-08-27. It stays first because FM-113 is ready and independent, not because the rationale held.

- **Backend defect, outside every FM allowlist — saving a blank category NPEs.**
  `shared/mapping/src/main/java/org/nzbhydra/config/category/CategoriesConfig.java:35-38`'s `setCategories` runs
  `categories.sort(Comparator.comparing(Category::getName))` on every deserialization, over entries whose `name` may
  be `null` — and both the React default entry and legacy's `defaultModel` start with a null name. ~~So adding a
  category and saving before typing a name throws on the write path rather than being refused with a validation
  message.~~ Wants its own packet: the fix is server-side (null-safe comparator, or a validator that refuses a nameless
  category with a field-attributed message), and a client-side guard alone would leave the API defect standing for any
  other caller. Surfaced 2026-08-26 while investigating FM-107. Routed to **FM-113**.
  **Correction, 2026-08-27, raised by FM-113's implementer as `BLOCKED` and verified before accepting:** the struck
  sentence is wrong, and the 2026-08-27 triage ranked this item first on the strength of it ("reachable by an ordinary
  admin on an ordinary day"). The React tab cannot reach the defect at all. `CategoryEntryFields.tsx:36-42` marks Name
  `required`, `components/settings.ts:146` turns that into an RHF `{required: "This field is required"}` rule, and
  `ConfigShell.tsx:205-212` returns `"rejected"` from `form.trigger()` before issuing any PUT; FM-107 already said so
  at `CategoriesTable.tsx:67-71`. The typed-then-cleared `""` route is closed identically — RHF rejects `""` before
  `EmptyStringToNullDeserializer` sees it. The Java defect is real and unchanged (`CategoriesConfig.setCategories`,
  plus two unguarded dereferences at `CategoriesConfigValidator.java:63,69`), but it is reachable only by non-React
  callers of `PUT /internalapi/config` — scripts, hand-crafted requests, restored or hand-edited configs — so it is API
  hardening, not an everyday crash. FM-113 was refined to assert the refusal at the API boundary rather than through
  the tab, and its Outcome carries this framing so a future reader does not re-derive the false urgency.
  **Why the claim was wrong, which is the reusable part:** the *data shape* was real — `defaultCategoryEntry()` seeds
  `name: null` — so inspecting the model made the UI route look obviously reachable. What nobody walked was the submit
  path between that shape and the server. A "the UI can reach this" claim needs the client gate checked, not just the
  model; the same class of mistake as the `loadLimitInternal` entry below, in the opposite direction.
- **React's bulk send ignores the downloader's configured default category.** With `category: null` ("Use downloader default")
  the server sends SABnzbd no `cat` parameter at all, so Hydra's configured `defaultCategory` has no effect; legacy sent it
  explicitly from the client. Evidence: the SABnzbd mock recorded `{apikey, mode: "addfile", nzbname, output, priority}` with no
  `cat`. Surfaced by FM-094, which had to drop `downloads.spec.ts`'s `cat: testEnvironment.sabnzbdMockCategory` assertion and
  could name no surviving test that covers it. The fix crosses `DownloadActions.tsx` and the server path that resolves a null
  category, so per README's *Choosing A Mechanism* it is a **packet**, not a quickfix.
- **No toast or raised report over a MUI modal is both announced and reachable — application-wide, WCAG 4.1.3.**
  Merged 2026-08-27 from two entries that are the two halves of one fix; recording only one of them gets it half-done.
  *(a) The announcement half, pre-existing and app-wide.* `@mui/material/Snackbar` contains no `Portal` (verify with
  `grep -c Portal node_modules/@mui/material/Snackbar/Snackbar.js` → 0), and `ToastProvider` renders it in-tree at
  `App.tsx:48`, so it is one of the `container.children` that MUI's `ariaHiddenSiblings` marks `aria-hidden` when a modal
  opens. Every toast raised while a dialog is up is therefore announced to nobody. It hits hardest where a toast is raised
  *from inside* its own dialog, which is always the broken state: `ExternalToolDialog.tsx:225`, `DownloaderDialog.tsx:190`,
  `IndexerDialog.tsx:382`. Toasts are already *clickable* today — the `Snackbar` is `position: fixed` at `zIndex.snackbar`
  1400 against the modal's 1300 — so that defect is announcement-only, which is exactly why it survived visual review.
  Wrapping the toast layer in a `Portal` fixes the `aria-hidden` half and leaves the second. Surfaced 2026-08-26 by
  FM-101's fixer, which found it by probing the ancestor chain after its reviewer suggested a toast as the remedy;
  confirmed and extended by FM-101's re-review.
  *(b) The focus half, demonstrated on FM-101's own portalled report.* `ConfigShell.tsx:379-438` portals the error report
  above FM-100's modal panel, which fixes the `aria-hidden` half — but MUI's `FocusTrap` steals focus straight back into the
  dialog: focusing the raised Alert's Close button leaves `document.activeElement` as `DIV.MuiDialog-container`. Measured by
  FM-101's re-review, not inferred. Not a regression (the toast it replaced was equally untabbable, and the acknowledge
  dialog it replaced carried no actionable entry), and a keyboard user can Escape the panel and use the in-place banner. But
  the comment at `ConfigShell.tsx:384-386` claims the entries "could be neither announced nor clicked" and now can, which
  overstates what was fixed — the reachability tests assert `aria-hidden` ancestry only, so they are green on a claim they
  establish half of. The fix is cross-module (either FM-100's panel renders the report inside its own DOM, or it relaxes
  focus enforcement). Surfaced 2026-08-26 by FM-101's re-review.
- **`ConfigFieldset`'s `config-fieldset-<label>` testid is derived from the fieldset's label text and will contain a
  space for any multi-word label** (`label.toLowerCase()` with no sanitization, e.g. "External Tools" ->
  `config-fieldset-external tools`). Every fieldset FM-059 shipped has a single-word label, so this is latent, not yet
  observed breaking anything, but FM-060 (Auth), FM-065 (External Tools), and others plan multi-word fieldset labels.
  Surfaced by a `migration-task-designer` while documenting `C-CONFIG-FIELDS`'s testid convention, 2026-08-20. Fixing it
  is a `data-testid` value change on a shipped component (`config-fieldset-<label>` -> presumably a slugified form), so
  it needs an explicit `/fm-orchestrate` call, not a quickfix — check whether any test already asserts the exact
  space-containing string before choosing a replacement scheme. **Checked 2026-08-27:** still unslugified; the generator
  has since moved to `features/config/components/settings.ts:62-64` (`fieldsetTestId`), used at
  `ConfigFieldset.tsx:148`.
- **`config-input-<path>` lands on the MUI root element for `SwitchSetting`/`SelectSetting` rather than the actual
  editable control**, unlike the other seven control kinds where it lands on the native `<input>`. Flagged by FM-059's
  independent reviewer as harmless today (both component and system tests already reach those two controls by role, not
  by this testid), but the inconsistency is a convention seven more config tabs will otherwise copy. Left open rather
  than fixed alongside the aria-describedby entry above: relocating an existing `data-testid` to a different DOM node is
  arguably a selector-contract change even though the id string itself is unchanged, which the quickfix gate excludes;
  worth an explicit `/fm-orchestrate` call on whether to move it or declare the root-element placement the intended
  convention.
- **React's bulk send leaves the sent rows unmarked.** The row "Downloaded" chip is raised only by the direct NZB/torrent
  transfer, so legacy's per-row `.sabnzbd-success` feedback has no counterpart after a bulk send
  (`SearchResults.tsx`'s `onDownloaded` mapping from `addedIds` back to `searchResultId`s).
- **FM-098's recorded disclosure boundary omits a third case: `CustomMappingsSection`.** `COMPONENTS.yaml`'s
  `C-CONFIG-FIELDS` note says only an advanced `HelpBlock` and an advanced row outside any fieldset stay hidden. But
  `searching/CustomMappingsSection.tsx:78-79` self-gates with its own `if (!showAdvanced) return null` and sits
  outside every fieldset (`SearchingConfigTab.tsx:268`), so a whole *editable section* of Searching — not prose —
  still vanishes with no expander announcing it. FM-098's allowlist excluded tab files, so this was correctly out of
  scope; the ledger item is the note's accuracy, and the underlying disclosure gap belongs in a future packet's
  design. Surfaced 2026-08-26 by FM-098's reviewer. Packet rather than fix: it edits a registry note and changes
  reveal behaviour on a tab.
- **FM-105 added a username-uniqueness refusal that no contract records.** The user dialog refuses a username another
  entry already holds exactly, because `UserAuthConfigValidator.findCorrespondingOldUserConfig` filters on
  `String.equals` and takes `.findFirst()` — with two identical usernames the *same* stored record is handed to both
  submitted entries, so one user's `***UNCHANGED***` marker resolves to the other's hash, and
  `reviewChangesDiff.ts:268-278` independently degrades a duplicate-keyed list to positional comparison so the review
  panel stops naming the affected rows. The refusal is right and its reviewer endorsed it — but it lives only in the
  handoff, so a later task could remove it as unexplained. Record it in `F-CONFIG-AUTH`. Two consequences also worth
  noting: a config already holding two identical usernames (seeded outside the UI, or saved before FM-105) makes each
  such row unsaveable from the dialog until renamed, with the error attached to a field the admin did not change.
  Surfaced 2026-08-26 by FM-105's reviewer.
- **`F-CONFIG-SHELL.gaps` is still `[]` although FM-097 deliberately dropped a legacy signal.** Save's pristine/dirty
  colour switch (legacy `config.html:21`, old `ConfigShell.tsx:250`) is gone, replaced by the save bar's worded
  summary and a Discard button that exists only while dirty — a better signal, and one that satisfies ADR-0014's
  colour-is-never-sole-carrier rule where the hue did not. The deviation is justified at the site in
  `ConfigSaveBar.tsx` and recorded in `COMPONENTS.yaml`'s `C-CONFIG-FORM`, and FM-097's packet only required it in
  the handoff — but `gaps` is where a future parity reader looks, and there it is invisible. Add a one-line
  `deliberate - ...` entry at `FEATURES.yaml:436`. Packet rather than fix only because the quickfix gate forbids
  registry edits. Surfaced 2026-08-24 by FM-097's reviewer.
- **The search-results feature writes raw px values where the theme's scales belong — ~44 sites, ~24 of them in
  spacing props.** Surfaced 2026-08-27 while measuring the unannotated-magnitude candidate below (its full method and
  counts are there). `features/search/results/` — `RefineSidebar.tsx`, `SearchResults.tsx`, `filterControls.tsx`,
  `SelectionMenu.tsx`, `ResultsPopovers.tsx`, `DownloadActions.tsx` — carries px strings in `sx`: `fontSize: "13px"`,
  `fontSize: "11.5px"`, `letterSpacing: "0.6px"`, plus about two dozen `px: "9px"` / `py: "7px"` / `mb: "9px"` /
  `gap: "6px"` / `mx: "4px"` shapes. The last group is unambiguously wrong rather than merely unannotated: those
  props take **theme spacing units**, so a px string bypasses the spacing scale entirely. This is the mock
  transliteration `AGENTS.md` forbids ("never copy a mock's inline CSS into `sx`"), surviving from the FM-039..FM-046
  visual-redesign tasks. A packet, not a fix: it spans six modules, changes rendering (so it needs the screenshot
  strip), and the port is a token question — some of these want new `theme.ts` typography/density entries rather than
  a mechanical `"13px"` → `1.625` rewrite. Doing it would also unblock the only honest mechanical form of the
  unannotated-magnitude gate, which is red at base almost entirely on these sites.

### Single-session fix

Styling, markup or UX polish inside existing features; a single-module bugfix shipping a regression test; mechanical repair.
Constraints: no designer, no reviewer, no decision entry, no registry edit, no `data-testid` change. If mid-fix the change turns
out to cross modules or touch a contract, stop and convert it to a packet.

Ordered by consequence times likelihood. The first two are discharged: a required gate red for *every* implementer, which cost
the most per day it stood, and a search that silently returned results filtered by a constraint the user had cleared. Of what
remains, the first two are visible misbehaviour on the config tabs an admin uses most.

- ~~**`validate:focus-affordances` has been red since the FM-092/FM-096 indexer-colour work, on five false positives.**
  Merged 2026-08-27 from FM-111's report and FM-097's reviewer's confirmation of one of its five sites.
  This matters beyond one task: the gate sits in several packets' Verification chains, so every future implementer
  will meet a failing required command it did not cause. ADR-0014's colour-literal check
  (`core/ui-react/scripts/validate-focus-affordances.mjs:218`) matches `rgb(`/`rgba(` inside comments, test titles,
  and runtime colour fixtures. It flags `ColorSetting.tsx:46` (a JSDoc line documenting `hexToRgb`),
  `ColorSetting.test.tsx:50` and `resultTable.test.ts:431` (test *titles* containing the words), `SearchResults.test.tsx:1611`
  (the fixture `color: "rgb(200,50,10)"`, an indexer-config value, not a design token), and `IndexersConfigTab.test.tsx:565`
  (which resolves to `const api = backend();` — an offset/block-scan defect on top of the substring one). None is a
  design literal in feature code. Repair by narrowing the matcher to exclude comments, string test titles, and
  `*.test.*` fixture values — **not** by adding entries to the script's pre-ADR-0014 exemption list at `:112`, which
  would weaken a real gate to hide a matcher bug. FM-111's implementer had exactly that cheap workaround available
  inside a file it was not allowed to touch, and correctly reported the failure instead. Surfaced 2026-08-24 by
  FM-111, independently confirmed byte-identical at base by its reviewer via a pristine `git archive` tree.
  Note that `ColorSetting.tsx:46` *legitimately* needs the literal string `rgb(`, because legacy persists colours in
  that format — so at least one of the five sites cannot be fixed by "remove the literal", only by "teach the matcher
  this is data". That site keeps the gate red for every task touching `features/config/indexers/`. Surfaced
  2026-08-24 by FM-097's reviewer, confirming FM-111's and FM-112's reports.~~
  Discharged 2026-08-27 by the ledger entry above, which narrowed check 4 to design-literal positions and left the
  exemption list at `:112` untouched and empty. The diagnosis held on all five sites; the two line numbers it quotes
  (`ColorSetting.tsx:46`, `IndexersConfigTab.test.tsx:565`) were themselves an artefact of `stripComments` collapsing
  each comment to one space, which is fixed alongside — the "offset/block-scan defect" it suspected was that, not a
  second bug.
- ~~**A cleared search size constraint is still submitted.** Clearing the Advanced panel's Min/Max size fields, or deleting the
  `search-chip-size` chip, both leave the request carrying the category's preset — the backend logged `minsize=500,
  maxsize=20000` in both attempts against a Movies-category identifier search. Likely `SearchWorkspace.tsx`'s
  `minsize: field("minsize") || (preset?.minSizePreset?.toString() ?? "")` fallback. This is why FM-094 could not carry the
  deleted legacy autocomplete test's "the identifier search really returns the movie" assertion into its React sibling; once
  fixed, restore it to `search.spec.ts`'s TMDB-identifier test.~~
  Discharged 2026-08-27 by the ledger entry above. The FM-094 assertion is restored and passing. The suspected fallback was
  not the leak: the submitted request was already correct, and the preset came back through `AutoSubmitFromRoute`
  re-resolving the canonical URL that submit had just written, whose second submission cancelled the first.
- ~~**Advanced rows inside the Downloading and External Tools dialogs register with the fieldset behind the modal.**
  React context crosses portals, so the 3 advanced `SettingRow`s in `DownloaderDialog` and the 11 in
  `ExternalToolDialog` are descendants of `<ConfigFieldset label="Downloaders">` / `<ConfigFieldset label="External
  tools">` (`DownloadersSection.tsx:185`, `ExternalToolsSection.tsx:256`) and count toward them. With the advanced
  toggle off, opening either dialog makes a spurious "3 advanced settings hidden" / "11 advanced settings hidden"
  expander appear *behind* the modal backdrop, vanishing on close. No value or reveal impact — both host fieldsets own
  zero advanced rows of their own, so the expander is never clickable — but FM-098's claim that dialog bodies are
  unaffected holds only for `IndexerDialog`, which is rendered outside its fieldset (`IndexersConfigTab.tsx:328`
  closes before `:354`). Fix: wrap the two dialog bodies in `AdvancedDisclosureContext.Provider
  value={NO_ADVANCED_DISCLOSURE}`. Surfaced 2026-08-26 by FM-098's reviewer, which checked all three dialogs rather
  than accepting the claim.~~
  Discharged 2026-08-27 by the ledger entry above, exactly as prescribed. The "11" is the upper bound: the External
  Tools rows are gated by `visibleExternalToolFields`, so a Usenet-only tool shows 4 of them. `IndexerDialog` was
  confirmed unaffected and left untouched.
- **A settings-search reveal request is never retired, so a fieldset re-reveals itself on remount.**
  `useSettingsNavigation.tsx:178` bumps the token but nothing clears it once honoured, so a fieldset that unmounts and
  remounts while the last request still names it opens again on its own: search to "Indexer access" on Searching,
  navigate away by hand, come back, and it is expanded again. Harmless — nothing is lost and no stored preference
  changes — but not intended, and the same applies to the auth-type-gated fieldsets. Retiring the request once
  honoured, or matching on a request id the fieldset records, would close it. Surfaced 2026-08-26 by FM-099's
  re-review.
- **FM-102's anchor list renders `<button>` as a direct child of `<ul>`.** `ConfigNav.tsx:181-217` uses
  `ListItemButton component="button"` inside a `List`, so the DOM is `ul > button` with no `li` — an invalid content
  model that yields a `list` with zero `listitem`s, so assistive tech announces no item count for the "on this page"
  list. Stock MUI nav anatomy is `List > ListItem disablePadding > ListItemButton`. Verified by DOM probe, not
  inferred. Surfaced 2026-08-26 by FM-102's re-review.
- **The config nav's mobile `Drawer` has no visible close affordance.** It dismisses only via Escape, a backdrop tap,
  or choosing a section, whereas `RefineSidebar.tsx:414` — the idiom FM-097's packet names as its model — ships a
  `CloseIcon` button in its drawer header. `config-nav-open` also only opens, so it is not literally the "toggleable"
  control the Acceptance wording describes. The gap is discoverable dismissal on touch, where Escape is unavailable
  and a backdrop tap is undiscoverable. `ConfigNav.tsx:144-184`. Surfaced 2026-08-24 by FM-097's reviewer.
- **Teardown race in `core/ui-react/src/components/dialogs/DialogProvider.test.tsx`.** Roughly 1 run in 10 of
  `npm run test -- --run` exits 1 on two unhandled `ReferenceError: window is not defined` from a react-dom scheduler
  callback firing after that file's jsdom environment is torn down — while every test still reports passing
  (1149/1149). Characterized by FM-111's implementer across 15 runs (9 on head, 6 on a stashed base tree) and
  confirmed unrelated on mechanism by its reviewer: the file shares no module with the search feature, so code motion
  there cannot reach it. The fix is to unmount/flush before teardown, with a regression test. Surfaced 2026-08-24.
- **The unit suite fails once in every ten to thirteen runs for reasons nobody has captured**, ~~and the runner cannot
  name the test.~~ **The flake itself stays open; only the identification half is discharged** — see the 2026-08-27
  reporter entry above. Merged 2026-08-27 from three entries — the same story reported by three tasks.
  *The failures.* FM-097's reviewer saw two failures at `expect(harness.form.formState.isDirty).toBe(false)` in
  `features/config/notifications` in a run that compressed 244s of aggregated test time into 24s wall; the immediate
  re-run was 1175/1175 green and three isolated runs of that directory were 26/26 — reads as a timeout under
  contention rather than a regression, and the file is untouched by FM-097 (surfaced 2026-08-24). FM-102's
  re-reviewer saw `1 failed | 1307 passed` on a cold-cache first run and green 1308/1308 on the twelve that followed,
  without capturing the failing test's name; not attributable to FM-102 on the available evidence (surfaced
  2026-08-26). FM-103 reported `1 failed / 1325 passed` on one of nine runs, green on the other eight.
  *The reason they stay anonymous.* Each lost the failing test's name to a truncated pipe. The honest reporting is
  right; ~~the mechanical fix is to have `npm run test` emit a JSON or JUnit reporter to a file so the next one is
  identifiable instead of anecdotal — that is the tractable half of this item and should be done first.~~ Done
  2026-08-27 (entry above): the next occurrence that is a *test* failure will be named in
  `core/ui-react/test-results/vitest-results.json`. **The occurrence still has to be reported with that file's
  contents** — nothing collects it automatically, and the `DialogProvider` teardown class above produces `0 failed` in
  that report, so a run that exits 1 with a green report is itself the signal that it was that class and not this one.
  *What remains open is the cause.* FM-103's
  reviewer names a plausible candidate in that task's own new tests — a synchronous negative assertion
  (`expect(rowNames()).toEqual([...])` immediately after a `waitFor` that only guarantees an unrelated write landed) is
  the classic shape that goes red under scheduler jitter — but could not prove it. The separately-logged
  `DialogProvider.test.tsx` teardown race above is another plausible source. A suite that fails once in thirteen for
  unknown reasons is worth identifying before it trains people to re-run. Surfaced 2026-08-24 and 2026-08-26.
- **`system.spec.ts`'s sensitive-data-logging test poisons the shared instance when it fails.** It enables the setting, asserts, and
  disables it at the end, so any mid-test failure leaves `SensitiveDataRemovingPatternLayoutEncoder` disabled on the running
  instance and the next run fails on its own precondition (`toHaveText("Enable sensitive data in logs")` against a toggle already
  reading "Disable ..."). Observed 2026-08-23; reset by hand via `PUT /internalapi/debuginfos/sensitiveDataLogging?enabled=false`.
  The durable fix is a fixture that restores the setting regardless of outcome, which is the same shape as any other
  server-mutating test in this suite — worth a sweep for others rather than fixing this one alone.
- **`focus-indication.spec.ts`'s anchor-family test fails on a fresh datafolder because FM-079's startup `NewsDialog`
  duplicates the mocked news anchor** (`tests/system/tests/focus-indication.spec.ts:1047`, `core/ui-react/src/app/status/NewsDialog.tsx`). The test mocks `/internalapi/news**` with a `forCurrentVersion: true` entry and locates
  `a[href='https://example.invalid/fm053']` strictly; on a datafolder where that news is unseen, the startup dialog (a portal outside `system-shell`, added by FM-079 after the test was written for FM-053) renders the same
  server-authored HTML as the news page, so the locator resolves to two elements. Deterministic on `--runtime local` runs (fresh datafolder), invisible against long-lived IntelliJ services (news already marked shown). Surfaced
  2026-08-23 while gating the visual-language quickfix above, which could not have caused it (theme-only diff). Fix belongs in the test — dismiss or await the dialog before probing, or scope the locator — contained enough for a
  quickfix.
- **`playwright.config.ts`'s `globalTimeout: 300_000` is below the suite's own runtime** (~4.2 minutes green, and the value
  bounds the whole run), so any documented full-suite command needs `--global-timeout=1800000` to finish at all; without it the
  run ends `timedout` with reporters unflushed. Raise it or split the suite. Deferred explicitly by FM-094.
  **Checked 2026-08-27:** still `300_000` at `tests/system/playwright.config.ts:12`.
- **The six sibling specs' drawer-open probe is a bare `await navOpen.isVisible()` with no auto-retry.** If the shell
  has not painted when the helper runs, the mobile path is silently skipped and the subsequent `setChecked` times
  out rather than opening the drawer. Fails loudly, so it cannot mask a regression, and each helper's first line
  already runs after an `openXConfig` wait, which is why it is stable today — but it is a flake surface across six
  specs (`config-main.spec.ts:26` and the same pattern in `config-categories`, `config-downloading`,
  `config-searching`, `config-indexers`, `external-tools`). A short retry-until-visible would close it. Surfaced
  2026-08-24 by FM-097's reviewer.
- **FM-100's review panel keys a whole list positionally when any single entry is unkeyed.** `reviewChangesDiff.ts`'s
  `listKeys` returns `null` for the entire list if one entry lacks a `name`/`username` or repeats one, whereas the
  backend (`SensitiveDataConfigValidator.findCorrespondingOldItem`) keys each entry independently. Removing a named
  indexer while a freshly added blank row is present therefore makes the panel report N spurious "edited entry K" rows
  instead of "X removed / entry N added". Display-only — no leak, and the save itself is unaffected — but it
  misdescribes the change in the one place the admin looks before committing. Surfaced 2026-08-26 by FM-100's reviewer.
- **`null` and `""` both render as `(empty)` in the review panel, so a row can show no visible change.**
  `reviewChangesDiff.ts:151` maps both to the same text while `isDeepEqual(null, "")` is false, so the row survives the
  value-equal filter and displays `(empty)` → `(empty)` on desktop, or a bare `(empty)` on mobile where the prefix is
  suppressed when both sides match — with nothing saying what changed. Plausible whenever RHF turns an unset optional
  string default into `""`. Surfaced 2026-08-26 by FM-100's re-review.
- **"Is there an error report?" is computed twice by different means in FM-101.** The shell uses
  `errorMessages.length > 0 || refusedBySelf` (`ConfigShell.tsx:167-170`); the banner uses
  `collectInvalidFields(...).length > 0` (`ConfigFeedbackBanner.tsx:82-93`). The shared-markup extraction unified the
  rendering but not this predicate, and the reason it was not unified is a `react-refresh/only-export-components`
  warning whose own message prescribes the remedy: put `hasConfigErrorReport` in a small non-component module and use
  it in both places. If the two ever disagree the portal renders an error `Alert` with a `null` body — a bare close
  button floating over the modal. Unreachable today, since fields cannot be edited while the panel is modal. Surfaced
  2026-08-26 by FM-101's re-review.
- **Two hardening gaps in the review panel, neither reachable today.** `reviewValueText` falls through to
  `JSON.stringify` for a dirty leaf whose value is a plain object, and `isHiddenSetting` tests only the path, never the
  object's keys — so that is the one place a secret could reach the screen without any of the three masking layers
  firing. No reachable path exists today (RHF recurses into objects, and arrays of records are intercepted earlier by
  the dispatch on value shape). Separately, no test pins the post-save re-baseline — that a second round of edits diffs
  against the newly saved config rather than the initial fetch — which is correct by construction via
  `form.formState.defaultValues` but was flagged as a trap by the packet. Surfaced 2026-08-26 by FM-100's reviewer.
- **The review panel's entry-row status reads as if it were the old value.** An array entry renders `edited` in a
  `colSpan={2}` cell that starts under the "Previously" header, so `Indexers: Mock1 · edited` scans as "Mock1 was
  edited before". `align="right"` or a leading em-dash would disambiguate. Visible in `review-changes-desktop.png`.
  Surfaced 2026-08-26 by FM-100's reviewer.
- **FM-100's summary button is the only entrance to the review panel but looks like static text.** No underline, no
  button chrome, `color: "text.secondary"` — visually unchanged from FM-097's `Typography` by design, at the cost of
  discoverability for the feature it now gates. That `sx` override also carries no at-site justification comment, which
  `AGENTS.md` *UI Conventions* requires at every deviation from stock MUI. Surfaced 2026-08-26 by FM-100's reviewer.
- **"Enable shown" silently skips indexers whose config is incomplete.** Correct behaviour — `IndexerStateSwitch.tsx:54`
  disables the per-row switch for those, so a bulk enable that flipped them would be the only route in the UI past a
  gate every per-row path enforces — but nothing on screen says *why* the bulk action passed a row over. The row keeps
  its `Disabled by system` caption so it is not invisible, just unexplained. A note beside the button, or a count in
  `config-indexers-shown-count`, would close it. Surfaced 2026-08-26 by FM-103's reviewer.
- **`STATUS.md` section entries must start exactly `- FM-NNN:` or the validator cannot see them.**
  `validate-migration.mjs:163` extracts task ids with `/^- (FM-\d{3}):/`, so a perfectly readable entry like
  `- FM-101 (Save Feedback Banner): in progress` is invisible to it, and the task is reported "absent from STATUS.md
  Active" while sitting plainly in that section — a confusing error that points at the wrong problem. This has now cost
  time twice in one batch: once when a coordinator wrote `- FM-112 closes the cleanup batch` in Upcoming, and once when
  an implementer wrote the parenthetical form above in Active. Both are natural prose. Either loosen the regex to
  accept `- FM-NNN` followed by any delimiter, or make the error message say what shape it expected — the second is
  probably worth more than the first, since the current message actively misleads. Surfaced 2026-08-26.
  Related: the same file also produced a self-contradiction this batch (see the struck-through
  `EXTERNAL_TOOL_CONFIGURATION` note under *Discharged* below); a status file that disagrees with itself is worse than
  one that is merely behind.
- **`SettingRow.tsx:85`'s chip guard carries a dead conjunct.** It reads `advanced === true && hiddenByToggle`, but
  `hiddenByToggle` is defined as `advanced === true && !showAdvanced`, so the first half can never independently be
  false. Harmless today; it invites a future reader to believe the two conditions are independent and to "fix" one of
  them. `hiddenByToggle` alone is the whole condition. Surfaced 2026-08-26 by FM-098's re-review.
- **`UpdateFooterBanners.tsx:93` measures a different box than its own initial measurement — a latent trap, not a live
  bug.** The initial read uses `getBoundingClientRect().height` while the `ResizeObserver` callback uses
  `entry.contentRect.height`, so the two paths measure border box and content box respectively. FM-102's fixer hit
  exactly this pattern in its own new `useSaveBarHeight` — the padded save bar measured ~24px short and the sticky
  column painted over the first tab entry — and flagged the sibling occurrence. FM-102's re-review checked before
  agreeing: the observed `Box` at `:105` sets only `bottom`/`left`/`right`/`position`/`zIndex`, no padding or border,
  so its two boxes are the same height today and the footer offset is correct. It becomes a real bug the moment anyone
  adds padding or a border to that container. Fix is one line for uniformity. Surfaced 2026-08-26 by FM-102's fixer,
  scoped by its re-review.
- **FM-102 nests two navigation landmarks.** The anchor list is a `Box component="nav"` inside the nav column's own
  `component="nav"` (`ConfigNav.tsx:162`), so a screen-reader rotor lists "Configuration sections" containing "Main on
  this page". Valid HTML, but a labelled region inside the outer landmark would read better. Also `useScrollspy`
  (`:456-465`) listens for `scroll` only, so a viewport resize changes the activation line without recomputing the
  marker until the next scroll. Surfaced 2026-08-26 by FM-102's reviews.
- **`SettingHighlight` trips `react-refresh/only-export-components`.** `useSettingsNavigation.tsx:178` exports a
  component from a module that also exports the `useSettingsNavigation` hook, taking the tree from 13 lint warnings to
  14. Zero errors, and consistent with several pre-existing peers, so it was left. Splitting the component into its own
  module would close it. Note FM-099's handoff claimed "none in touched files", which was inaccurate — the warning is
  in a task-owned file. Surfaced 2026-08-26 by FM-099's reviewer.
- **`SearchHistoryPage.tsx`'s local `SortHeader` has the same missing-sort-indicator gap** the FM-023-era entry above
  fixed in the other two history routes (identical copy-pasted `<Button>`-in-`<TableCell>` pattern, not a shared
  component). Not named by the FM-023 review so left untouched there; discharging it would be the same
  `TableSortLabel` swap, contained to that one file. **Checked 2026-08-27:** still a bare `<Button>` inside a
  `<TableCell sortDirection=…>` at `features/stats/history/SearchHistoryPage.tsx:343-367`.
- **`showsUsername`/`showsIp` are duplicated between `SearchHistoryPage.tsx` and `DownloadHistoryPage.tsx`.** FM-110
  unified four other copy-pasted shapes in the same files but deliberately left these two alone: its packet enumerates
  exactly what to unify and does not name them, and opportunistic scope creep in a behavior-preserving batch is worse
  than a leftover duplicate. Both the implementer and the reviewer independently reached that conclusion, so this is a
  future consolidation candidate rather than a gap in FM-110. Small and low-risk — two call sites, and
  `features/stats/shared/` now exists as the obvious home — so it suits a single-session fix rather than a packet.
  Surfaced 2026-08-24 by FM-110's implementer, endorsed by its reviewer. **Checked 2026-08-27:** the pair is still
  declared twice, at `api/searchHistory.ts:96-97` and `api/history/downloads.ts:81-82`.
- **`userFieldPath` in `authSettings.ts:72-82` is production-dead, kept alive by its own test.** FM-105's table binds
  no control to a row, so nothing in production calls it; `knip` stays silent only because `authSettings.test.ts:168`
  imports it. It was kept deliberately because `categoriesSettings.ts`'s comment points at it and that file is
  outside FM-105's allowlist — the right call for that task, since re-pointing the comment there would have been the
  scope violation. But a test-only export kept alive to hold a comment reference upright should not persist: remove
  the helper and its test case, and re-point that comment, in one session. Surfaced 2026-08-26, declared by FM-105's
  implementer and endorsed by its reviewer. **Checked 2026-08-27:** all three sites still stand; the referring
  comment is now at `categoriesSettings.ts:144`.
- **`RepeatSection` has no production consumer left, and its `addChoices` mode has none either.** Merged 2026-08-27
  from two entries whose work is the same deletion; do the whole component in one session rather than the mode first.
  FM-106 moved notifications to a locally-owned section and FM-107 moved categories to a table, so `knip` now reports
  the barrel export dead (`features/config/components/index.ts:14`). FM-107 correctly left it: deleting the line would
  exceed its fence on that file and would immediately make `RepeatSection.tsx` — explicitly out of scope — an unused
  *file* rather than an unused export. Separately and earlier, FM-106's implementer recorded that the `addChoices`
  mode alone was already unused in production (Notifications was its only consumer; Categories, then the sole
  remaining consumer, does not use the mode), and correctly left it — its allowlist permitted `RepeatSection.tsx` only
  for an accordion opt-in it did not take. The contained follow-up is now the whole thing: delete the component and
  its test, the barrel line, the `Menu`/`MenuItem` and `config-repeat-add-option-*` selectors, the cases in
  `RepeatSection.test.tsx`/`configFields.test.tsx`, and trim the `C-CONFIG-FIELDS` paragraph — worth doing only after
  confirming no planned list wants the vocabulary back. Covering command: `npm run test -- --run` in `core/ui-react`.
  Surfaced 2026-08-26 by FM-106's implementer and by FM-107, ruling endorsed by both reviewers. **Checked
  2026-08-27:** `addChoices` still present at `RepeatSection.tsx:46-151`; barrel export still at
  `features/config/components/index.ts:14`.
- **One of FM-099's 48 `conditional` index entries is never rendered by any drift-test fixture.**
  `settingsIndex.ts:897`'s `downloading.primaryDownloader` renders under no fixture, so neither drift direction nor the
  `advanced`/`fieldset` column checks ever touch it. FM-099's reviewer hand-verified it correct today (not advanced,
  inside `General`, label and help verbatim against `DownloadingConfigTab.tsx:124-135`), but nothing would catch it
  drifting. Either a `should render every conditional entry under at least one fixture` guard, or a Downloading
  alternative fixture with `showDownloaderStatus` and two downloaders, would close it. Surfaced 2026-08-26 by FM-099's
  reviewer.
- **FM-102's short-tab scrollspy guard has no test.** The fix for the document-end fallback firing at scroll 0 added a
  `scrollHeight > clientHeight` check, but no case asserts that on a short tab (Downloading, Notifications, External
  Tools, Authorization — all of which fit a 1280x800 viewport with advanced off) the *first* anchor rather than the
  last is current at rest. The guard is correct by inspection; nothing would catch its removal. Surfaced 2026-08-26 by
  FM-102's re-review.
- **The cross-tab reveal into a wholly advanced fieldset has no visual capture.** FM-099's strip captures the
  per-fieldset-expander shape only. The other FM-098 gate shape — a fieldset that was not on the page at all, opened
  by search, with the highlight painted inside a settling `Collapse` — is now headline behaviour and is asserted in
  two harnesses but never seen. It is also the shape whose defect (cross-tab reveal silently doing nothing) survived a
  green suite precisely because no test crossed tabs. One shot at `config.spec.ts:375` would close it. Surfaced
  2026-08-26 by FM-099's re-review.
- **FM-104's truncation test asserts a class, not the clipping.** `AddIndexerDialog.test.tsx:99-113` checks that
  `MuiTypography-noWrap` is present, which still passes if a future refactor breaks the shrink chain — removing
  `minmax(0, 1fr)` from the grid columns, say — and leaves the label unclipped. No live defect: FM-104's reviewer built
  a standalone reproduction of the exact grid → button → `Typography noWrap` nesting, served it over local HTTP and
  drove it with playwright-cli, and measured a long label genuinely clipped (span `scrollWidth` 804px against a
  rendered 324px) with no page-level horizontal scroll. But the test proves less than the reviewer had to do to
  establish it. Asserting `scrollWidth > clientWidth` would close the gap. Surfaced 2026-08-26 by FM-104's reviewer.
- **FM-105's case-sensitivity test does not pin case-sensitivity.** "should keep two usernames that differ only by
  case apart" (`AuthUsersSection.test.tsx:333-353`) renames index 1 from `alice` to `alice-lower`, which collides with
  `Alice` under no matcher — so FM-105's reviewer mutated `uniqueUsername` to compare `toLowerCase()` and all 48 tests
  still passed. The *behaviour* is correct (both Java matchers use `String.equals`, verified against the source), but
  the handoff's "with a test pinning that" overstates what exists. Renaming index 1 to `ALICE` and asserting Save is
  **accepted** would bite. Surfaced 2026-08-26 by FM-105's reviewer.
- **`system.spec.ts:312` is log-volume fragile.** It failed once during FM-094's verification and passed on an identical rerun:
  `toContainText("NZBHydra")` against `system-log-view-raw` depends on the current log file not having rotated its startup
  banner away by the time the test runs, which the suite's own log volume decides. Assert on something the current file always
  carries instead.
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
- **FM-097's sticky save bar has broken two kinds of visual evidence.** Merged 2026-08-27 from FM-098's and FM-105's
  reviewers; both are the capture convention meeting the sticky bar, and both are fixed in the same place.
  *(a) Occlusion.* `main-validation-error-{desktop,mobile}.png` no longer frame the error they are evidence of:
  `config-main.spec.ts:365-372` calls `scrollIntoViewIfNeeded()`, which since FM-097 puts the Host field under the
  sticky save bar, so the red `config-error-main-host` text sits off-frame in both captures. The assertion itself
  still passes, so the spec is honest — it is the *evidence* that stopped showing the thing. Pre-existing framing
  rather than an FM-098 change, but FM-098 owns the current bytes. Surfaced 2026-08-26 by FM-098's reviewer.
  *(b) Duplication.* `fullPage: true` captures duplicate the sticky save bar: `auth-user-dialog-{desktop,mobile}.png`
  show the bar twice — Playwright's scroll-and-stitch behaviour meeting a `position: sticky` element, not a rendering
  bug. Confirmed by FM-105's reviewer against two controls: `auth-after-save-desktop.png` (the same convention,
  inherited from FM-068) shows the identical artifact, while `auth-form-desktop.png`, whose page fits without
  scrolling, does not. Not worth changing that one file's convention for on its own, but it will recur in any
  `fullPage` capture of a scrolling config page now that FM-097's bar is sticky. Surfaced 2026-08-26.
- **The `tests/system` visual-evidence captures are not bit-reproducible run to run.** Across identical trees, 4 of
  335 PNGs differ, and the differing set changes membership between runs — FM-112 saw
  `fluid-table-title-collapse-desktop.png` and `fm055-mobile-refine-drawer.png` swap places between two runs of the
  same tree. The one in-scope shot was chased to ground: 24 differing pixels of 260,592 (0.0092%), all isolated
  single pixels on rounded-corner antialiasing of TextField outlines, no edge displaced — and a second base run then
  matched the after-runs byte-for-byte, showing the first base run was the outlier. This is renderer nondeterminism,
  not a code signal, but it costs every implementer in a code-motion batch an extra base run to disambiguate a
  "changed" screenshot. Logged here so future reviewers do not re-chase it. A small pixel tolerance, or pinning
  fonts/antialiasing via a launch flag, would close it; the shared `prepareVisualEvidence` helper behind
  `tests/system/tests/search.spec.ts` and `results.spec.ts` is the place. Surfaced 2026-08-24 by FM-112, endorsed by
  its reviewer.
- **FM-107's mobile scroll comment overstates its own claim.** `CategoriesTable.tsx:218-222` and the matching
  `config-categories.spec.ts` assertion say "Both of a row's controls … sit in the first two cells, so nothing scrolled
  out of view is operable" — but the packet's own `categories-scroll-container-mobile.png` shows the expand-toggle
  column scrolled entirely off the left edge, so an operable control *can* be out of view. The true, narrower claim is
  that both controls are visible at the container's default scroll position and cost one swipe to reach again.
  Surfaced 2026-08-26 by FM-107's reviewer.
- **`SearchResults.test.tsx:38-40` explains jsdom's storage behavior in terms of a symbol FM-109 deleted.** The
  comment still says "`getStorage()`'s `window.localStorage` access in SearchResults.tsx resolves to `undefined` …
  so `getStorage()?.setItem(...)` silently no-ops". The mechanism it describes remains correct — the write is simply
  routed through `writeItem` now — but `getStorage()` no longer exists. FM-109's packet permitted test-file edits
  only for import lines and stub retargeting, so leaving it was the correct call under contract; it is doc drift, not
  a behavior gap. Surfaced 2026-08-24 by FM-109's reviewer. Now doubly stale after FM-111: the read side it describes
  moved out of `SearchResults.tsx` into `storedChoices.ts`. **Checked 2026-08-27:** `getStorage` survives nowhere in
  `core/ui-react/src` except those two comment lines.
- **Two comments in FM-101's shipped code describe mechanisms the same change disproves.** Merged 2026-08-27 from two
  FM-101 re-review entries: adjacent files, same session, same kind of correction.
  *(a)* `ConfigFeedbackBanner.tsx:39` and `:104-105` state that the `"filled"` surface *is* the toast surface
  `C-TOAST-SERVICE` renders on, and that the shell "relocates this exact markup onto the toast surface". Both are
  false, and directly contradicted by `ConfigShell.tsx:390-394` in the same change ("It is a `Portal` and not a toast
  because `Snackbar` does not portal"). A future reader is told the report rides the toast service; it does not.
  *(b)* `ConfigShell.tsx:384-386` credits JSX sibling order for something it does not cause, explaining the
  portal-versus-modal ordering as working "because the panel is the earlier JSX sibling". The re-review read MUI's
  `Portal.js` and `ModalManager.js` and established the real mechanism: `Portal` inserts on the render pass *after* its
  layout effect, while `ariaHiddenSiblings` snapshots `container.children` inside `useModal`'s passive effect of the
  first pass — and MUI's own `Modal` goes through the same two-pass `Portal`, so `add()` always runs while neither
  subtree is mounted. Order is irrelevant, and the reviewer proved it by moving the whole `Portal` block above
  `<ReviewChangesPanel>` in a sandbox copy and getting 50/50 green. Harmless today, but the comment invites a future
  maintainer to preserve an ordering that does nothing — and hides the dependency that is real: a *second* modal
  opening while the raised layer is already mounted would snapshot it as a body sibling and hide it.
  Both surfaced 2026-08-26 by FM-101's re-review.
- **Unannotated magnitudes are now a convention nothing enforces — fix the enforcement, not the four sites.**
  Merged 2026-08-27 from four separate tasks that each independently collected an instance of the same gap. Four
  tasks in one batch finding the same thing means *UI Conventions*' "justify every deviation from stock MUI at the
  site" has no mechanical backing; the proportionate discharge looked like a lint rule in
  `validate-focus-affordances.mjs` that makes an unexplained numeric `sx` value visible at authoring time, with the
  four sites below fixed in the same pass as its first cohort.
  **Attempted 2026-08-27 as a quickfix and abandoned on measurement: the boundary cannot be drawn mechanically, and
  the candidate is left open as a review-and-authoring concern rather than a gate.** A prototype reusing
  `designLiteralRegions`' machinery classified every `key: value` pair inside an `sx`/`style` region in
  non-test `src`, and counted how many sites each candidate predicate flags against how many are annotated at the
  site (a `//` comment on the property's own line or the line directly above it — the shape *UI Conventions* asks
  for). Four predicates, each of which does catch its finding above, and each of which drowns it:
  *bare numeric dimension* (`width|height|min*|max*|top|right|bottom|left`, value ≥ 2) — **27 sites**, of which
  FM-097's `minHeight: 44` is one and the rest are ordinary layout caps nobody has ever called a defect
  (`SystemAboutTab.tsx:44`'s `maxWidth: 800` readable-column cap, `minWidth: 180` on a definition-list term in three
  config sections, `router.tsx:36`'s `maxWidth: 1700` page shell).
  *off-integer theme spacing* (`m*`/`p*`/`gap*` at a non-integer step, excluding the idiomatic `0.5`) — **29 sites**,
  and `mb: 2.5` alone accounts for **9** of them across `config/`. Nine occurrences is a rhythm, not a one-off: it is
  positive evidence *against* FM-098's premise that the number needs justifying, since what it needs is a token.
  *border width over 1px* — 3 sites, the only near-clean predicate, and two of the three are one repeated idiom
  (`SelectionMenu.tsx:49,65`).
  *raw px string* (`fontSize: "13px"`, `px: "9px"`) — **44 sites**, ~24 of them px values written into `m*`/`p*`
  props that take theme units, i.e. genuinely wrong. All but two sit in the mock-transliterated
  `features/search/results/` files. This is real ADR-0014 debt, but it is pre-existing debt of a different size than
  this candidate; see the new candidate below.
  Across all 103 flagged sites **6 carry an at-site annotation**. That number is the finding. The convention is not
  observed anywhere in the tree, so any predicate broad enough to catch the four reported sites is red at base on
  ~100 more — and the only ways to green it are the `pendingFm054Cleanup` exemption list (refused by every task in
  this run) or annotating ~100 sites to fit the rule (a behavioural no-op that would make the gate describe the tree
  instead of the convention). A diff-scoped variant that only inspects changed lines was considered and rejected: it
  would be green at base by construction, but it fires at the same ~1-in-4 precision on new code, so it relocates the
  noise onto the next author rather than removing it.
  What actually distinguishes the four findings from the 99 is semantic and out of reach of a source-shape checker:
  *a token already exists for this* (44 against `controlHeight = 32`), *this number equals its neighbour's and the
  equality is the point* (FM-098's pair), and *the stated measurement is wrong* (FM-106, 1.5px off — a checker cannot
  measure a rendered button). Those stay the reviewer's job. If this is to be mechanised at all, the cheap version is
  the packet-template line, not a gate.
  *FM-097 — `ConfigNav.tsx:88-93`'s `minHeight: 44` is an unexplained magnitude.* The comment justifies overriding
  MUI's vertical-`Tab` default but not the number, which sits next to the app-wide `controlHeight = 32` token
  (`theme.ts:192`) established by the 2026-08-23 height unification. 44 is defensible on its own terms as a touch
  target, but the ledger entry for that unification is explicit that unstated heights are exactly how the app
  accumulated ten of them. Either derive it from a token or say at the site why a nav row is not a control. Surfaced
  2026-08-24 by FM-097's reviewer.
  *FM-098 — two spacing magnitudes are correct but unannotated.* `ConfigFieldset.tsx`'s `mb: 2.5` on the expander is
  exactly `SettingRow`'s row rhythm and its `pt: 1` on the collapsed advanced-fieldset wrapper is exactly the
  fieldset Box's own `pt`, so both keep the layout from shifting on expand — but neither carries the at-site note
  tying it to its neighbour. Surfaced 2026-08-26 by FM-098's reviewer.
  *FM-102 — the current-anchor magnitudes and activation fraction are unannotated or half-annotated.*
  `borderLeft: "3px solid"`, `pl: 1.5` and `py: 0.25` (`ConfigNav.tsx:193-200`) carry no justification comment; and
  `:418`'s `0.3` viewport fraction justifies *why a fraction* ("keeps the same behaviour across viewport heights") but
  never why one third. Surfaced 2026-08-26 by FM-102's reviews, which is where the "fourth task, so make it a rule"
  observation was first made.
  *FM-106 — a magnitude in a justification comment is 1.5px off.* `NotificationEntryFields.tsx:178` says the adjacent
  outlined `Button` is "~38px"; measured in Chromium it is 36.5px, against a stock `Alert` at 48.0px and the `py: 0`
  Alert at 36.0px. The argument — that the actions row would grow ~10px taller the moment a result appears, shifting
  everything below — is unaffected and correct; only the quoted number drifts. Worth correcting because the comment
  exists precisely to justify the number. Surfaced 2026-08-26 by FM-106's re-review. (This one is a *wrong* stated
  magnitude rather than a missing one; it is grouped here because the same enforcement would catch it.)
- **FM-107's summary chips key on the token value.** `CategoriesTable.tsx:414` uses `key={category}`, so two identical
  stored newznab tokens in one category collide. `ChipsSetting` is `freeSolo` and does not prevent entering a
  duplicate. Cosmetic React warning only. Surfaced 2026-08-26 by FM-107's reviewer.
- **Two small unclaimed coverage trims from FM-094's deletions**, both cosmetic: `search-history.spec.ts:67-69` creates
  `historyResponse` and never awaits it (dangling promise, pre-existing at baseline), and the React autocomplete sibling
  (`search.spec.ts:1377-1394`) asserts `tmdbId` and the explicit-null shape but not the deleted test's `title`, `year`, or
  `content-type: application/json`. **Checked 2026-08-27:** the dangling `historyResponse` is still there at
  `tests/system/tests/search-history.spec.ts:67-69`.
- **Stale legacy-era prose in files the legacy removal did not rename.** Merged 2026-08-27 — four wordings, one
  mechanical sweep, none of them asserted by any test.
  *(a)* Two "migration placeholder" wordings survive FM-095's rename of the component's copy to an unknown-route
  notice: `core/ui-react/src/router.test.tsx:328` (a test name) and `features/system/SystemShell.test.tsx:98` (a stub
  body). Both pass and neither asserts the renamed text.
  *(b)* Two "the default is legacy" comments survive FM-094 flipping the default: `focus-indication.spec.ts:29-33`
  and `notched-label-geometry.spec.ts:185-186`. Their `ui/react?redirect=…` navigations remain correct; only the
  stated reasons are now wrong.
  **Checked 2026-08-27:** all four sites still read as described (the `SystemShell.test.tsx` stub is now under
  `features/system/`, not `app/shell/`).
- **`resource-config.json`'s GraalVM include list still names assets FM-095 deleted.** Merged 2026-08-27 from two
  entries about the same hand-maintained list; sweep it in one pass, because a half-swept list is worse than an
  untouched one. Roughly 30 include entries name `static/css/*`, `static/fonts/*` and legacy `static/js/*` that no
  longer exist. All are inert — line 23's `static/.*` pattern covers the tree regardless — so this is tidiness, not
  correctness. **Checked 2026-08-27, and the correctness half of the original pair is already closed:** the
  originally-reported risk was that the list included `templates/index.html` and `static/js/templates.js` while never
  naming `templates/react.html`, which would have left a native build with no shell template for any route (FM-095's
  reviewer; not an FM-095 regression, since FM-094 had already made `react` the served view). Today
  `core/src/main/resources/META-INF/native-image/resource-config.json:2621` **does** include `templates/react.html`
  and `templates/index.html` is gone; only the dead `static/js/templates.js` entry at `:2612` and the ~30 inert
  asset entries remain. Note `NativeApplicationContextTest` still cannot catch this class of error — it reads the JVM
  classpath, not the native image.
- **Toolchain remnants that outlived what they configured, plus the dev container they belong to.** Merged
  2026-08-27: the two entries are one deletion, because `core/.bowerrc` cannot go without `docker/uiDev/**` and vice
  versa. FM-095 deliberately left all of it — its Delete list enumerated four files by name, and an unforced deletion
  in an irreversible packet is the wrong side to err on. `docker/uiDev/**` is *broken* by FM-095's deletions: its
  Dockerfile COPYs `core/ui-src/`, `core/bower_components/`, and gulp/bower globs that no longer exist. It is the
  legacy-UI dev container. `core/.bowerrc` is likewise not inert in one respect — `docker/uiDev/Dockerfile:16` COPYs
  it and Docker fails on a missing COPY source — so the two must go together. Inert alongside them:
  `core/core.iml`'s two `bower_components` `excludeFolder` entries, and `--exclude "bower_components"` in
  `misc/rsyncToServers.sh`, `misc/rsyncAndStartGraalvmDocker.sh` and both `misc/buildLinuxCore/*/buildLinuxCore.sh`.
  Surfaced by FM-095's designer. **Checked 2026-08-27:** `core/.bowerrc` and `docker/uiDev/` both still exist;
  `core/core.iml:6-7`, `misc/rsyncToServers.sh:1` and `misc/rsyncAndStartGraalvmDocker.sh:11` all still carry the
  exclusions.

### Needs a `DECISIONS.md` entry first

Nothing here can be routed until a human settles the named question. Ordered by how much other work each unblocks: the first two
each gate a defect list that already exists, the rest are single judgement calls.

- ~~**`searching.loadLimitInternal` is editable but consumed nowhere.** React's Config > Searching tab edits it; the results
  view ignores it, where legacy used it as the displayed page size. FM-094 deleted the last test covering it
  (`results.spec.ts`'s title-group page-size test, which used no legacy-only selectors and failed only for this reason), so
  nothing now evidences the gap. **Decision to settle:** honour the setting in the results view, or declare it backend-only.
  Either answer needs a registry line, and the packet that follows depends on which.~~
  **Settled 2026-08-27 by ADR-0032, and the entry above was factually wrong.** The setting is consumed:
  `core/.../searching/searchrequests/SearchRequestFactory.java:26-30` substitutes it as the page size of every internal
  search that arrives without an explicit `limit`, and `SearchPage.tsx:166-196` never sends one — so it governs the *fetch*
  size on every install, and `SearchPage.tsx:294-335` / `SearchResults.tsx:490-494` consume the returned `limit` as the
  load-more cursor. ADR-0031 had already been accepted on the "consumed nowhere" premise and directed removal; the premise
  was caught during packet design and ADR-0032 supersedes it. The setting stays and stays editable; the real defect is that
  its label (`"Display..."`) and help describe legacy's *display* page size. Routed to **FM-116** as a text correction.
  **Why the claim was wrong, which is the reusable part:** the consumer is a default substituted server-side for an
  *absent* field, so no grep for `loadLimitInternal` in the frontend can see it — the frontend genuinely never mentions it
  outside the config tab, which is exactly what the entry observed and exactly why the inference failed. Before "nothing
  consumes this" becomes a decision, check the backend read path for a null-substitution default, not just the callers.
- **A link inside a persistent toast is unreachable while a modal is open — decide how far to go.** FM-115 closes the
  *announcement* half of this defect and deliberately leaves the *focus* half, which needs a ruling. Mechanism, verified
  against the installed MUI 7.3.9 rather than inferred: `Snackbar` contains no `Portal`
  (`grep -c Portal node_modules/@mui/material/Snackbar/Snackbar.js` → 0), so the toast layer renders in-tree at
  `App.tsx:48-50` and `ModalManager.add` — which calls `ariaHiddenSiblings(container, modal.mount, modal.modalRef,
  hiddenSiblings, true)` over `container.children` **at modal-open time**, honouring no opt-out attribute — marks it
  `aria-hidden`. FM-115 moves the layer out of that subtree, which fixes announcement. It does not fix focus: a modal's
  `FocusTrap` owns focus regardless of DOM position, measured by FM-101's re-review on its own portalled report
  (focusing the raised Alert's Close button leaves `document.activeElement` as `DIV.MuiDialog-container`).
  **This is live, not theoretical.** `Toast` carries no action field, so the general case is announcement-only — but
  `app/status/NotificationToasts.tsx:82-92` raises `persistent: true` toasts from the live backend channel with a
  `RouterLink` in their `content`, and a persistent toast stays until dismissed. So a real link, raised over a real
  dialog, cannot be tabbed to, and neither can the toast's own close button. **Decision to settle:** (i) relax
  `FocusTrap` app-wide so the toast layer is tabbable from inside a modal, (ii) render toasts inside the open modal when
  there is one, or (iii) accept it — a keyboard user Escapes the dialog first — and forbid actionable content in toasts,
  which means `Toast.content` stops taking arbitrary nodes. Each answer is cross-module and changes modal behaviour or a
  shared type, so none is a quickfix. Related and already recorded: FM-101's `ConfigShell.tsx:404-412` comment overstated
  what its portal fixed; FM-115 corrects that text as part of the announcement half. Surfaced 2026-08-26 by FM-101's
  re-review, mechanism and liveness established 2026-08-27 during FM-115's design.
- **Tables below `sm` scroll their content off-canvas with no affordance — decide the strategy once, for all of them.**
  Merged 2026-08-27 from three entries in three areas; each was independently deferred for wanting "a real layout
  decision" rather than a mechanical swap, and answering it once discharges all three. **Decision to settle:** at
  narrow widths, do tables (i) force container scroll with a `minWidth` plus a scroll-edge affordance, (ii) drop or
  merge columns below `sm`, or (iii) keep scrolling and add an explicit acknowledgement that content continues?
  *(a) History routes squeeze instead of scrolling.* Download-history and notification-history tables wrap cell text
  (e.g. "Syst / em", "Inde / xer") at 390x844 rather than letting `TableContainer` scroll horizontally. Flagged by the
  FM-023 reviewer; affects `DownloadHistoryPage.tsx` and `NotificationHistoryPage.tsx` identically, likely
  `SearchHistoryPage.tsx` too (not confirmed). Should be checked and fixed across all three history routes together
  with a fresh 390x844 screenshot strip for each.
  *(b) The indexer table's Priority column is invisible between `sm` and ~900px.* Not merely cut off — value, label
  and header are all off-canvas at 700px, and nothing on screen suggests the content continues
  (`indexers-list-scroll-container-tablet.png`). FM-103's packet sanctions container scrolling at narrow widths so
  this is not a contract breach, and its implementer was right to reject a stacked layout at 880px as reading worse.
  The proportionate remedy is an affordance rather than a layout change: a scroll-edge shadow on the
  `TableContainer`, or an explicit acknowledgement. Surfaced 2026-08-26 by FM-103's reviewer.
  *(c) At 390px the categories table's Size column is off-canvas with no affordance.* The shape ADR-0029 refused for
  FM-100's review panel, in a case where it is non-blocking: FM-107's Acceptance explicitly asked for a "mobile
  390x844 showing the scroll container", ratifying the scroll, and the row expansion repeats every value as a real
  editable field, so nothing is unreachable. A below-`sm` column drop or merge would be a design decision rather than
  a fix. Surfaced 2026-08-26 by FM-107's reviewer.
- **Settings search offers rows whose render condition is unmet.** `settingsSearchMatching.ts:38` matches the whole index, so
  with SSL off the results still offer "SSL keystore file" and "SSL keystore password" (visible in
  `search-results-desktop.png`). Picking one routes to the tab and then silently no-ops until `ANCHOR_DEADLINE_MS`
  expires, with no feedback. The timeout is deliberate and documented at `useSettingsNavigation.tsx:24-29`, and FM-099's
  packet neither required nor forbade this. **Decision to settle:** hide such hits, mark them unavailable, or explain the
  no-op. A packet follows whichever is chosen. Surfaced 2026-08-26 by FM-099's reviewer.
- **FM-103's search-source select renders for a type the dialog withholds it from.** `IndexerTable.tsx:404-415` shows
  the `enabledForSearchSource` control on every row, but `visibleIndexerFields` (`indexerSettings.ts:761-763`) hides
  that field for `TORBOX`, which is an addable preset (`indexerPresets.ts:256`). So the list offers a control the edit
  dialog deliberately does not. Undeclared — it is not in the `FEATURES.yaml` gaps alongside FM-103's other three
  deviations. **Decision to settle:** gate the cell on `visibleIndexerFields(entry.searchModuleType)`, or declare the
  list's wider surface deliberate. Gating is a one-line fix; declaring is a registry edit. Surfaced 2026-08-26 by
  FM-103's reviewer.
- **The sticky bar counts dirty leaves while the review panel counts rows.** Editing five fields of one indexer reads
  "5 settings changed" on the bar and opens a panel with a single row. Both are contract-driven — FM-100's packet
  fences the summary text verbatim and specifies one row per list entry — so this is a recorded consequence rather than
  a defect. **Decision to settle:** ratify the mismatch as intended, or re-word one of the two counts (which reopens a
  fenced string). Surfaced 2026-08-26 by FM-100's reviewer.
- **The FM-090 notch/label-overlap fix closes the gap by shrinking every input label app-wide** (effective 12px ->
  10.5px) rather than by widening the notch legend instead. Mechanically correct and owner-approved via a
  before/after screenshot strip, but the alternative shape (sizing the legend up in `MuiOutlinedInput` rather than
  the label down in `MuiInputLabel`) was never attempted or compared. Not a defect -- nothing to discharge -- just a
  design-space note. **Decision to settle:** accept the app-wide 10.5px label, or commission the legend-widening
  alternative for comparison, now that far more of the app is visible than the two fields FM-090 measured. Surfaced
  2026-08-23 by FM-090's reviewer.
- **The preset gallery's "Import" heading stays visible with nothing under it.** Filtering to a term that matches only
  presets (e.g. "geek") leaves the Import section's heading rendered over zero importer buttons, because importers are
  filtered independently against their own labels rather than being hidden when the preset groups empty. That follows
  FM-104's packet text literally ("hide them only when the filter also misses their labels") and is visible in both
  filtered captures, so it is a packet-sanctioned choice rather than a defect. **Decision to settle:** keep the packet's
  literal behaviour, or hide the heading when its section is empty (which contradicts the packet text). Surfaced
  2026-08-26 by FM-104's reviewer.
- **`GUI-STATUS.md:3-4` still names "The AngularJS GUI it replaced".** FM-095's acceptance asked that the file no longer mention a
  legacy GUI; read literally that is unmet, read as intent (nothing implies a legacy GUI is reachable) it is met, and the
  historical sentence is arguably more useful than silence. **Decision to settle:** owner's call, one way or the other.
  **Checked 2026-08-27:** the sentence still stands at `docs/frontend-migration/GUI-STATUS.md:3-4`.
- **`POST /loggedout` (`core/src/main/java/org/nzbhydra/web/MainWeb.java`) is dead server code.** It invalidates the session,
  answers 401 with a `WWW-Authenticate: Basic` challenge, and clears the `remember-me`/`JSESSIONID` cookies — the standard trick
  for making a browser drop cached BASIC credentials. Nothing has ever called it: a case-insensitive sweep of `core/ui-src`
  finds only AngularJS `user:loggedOut` *events*, and `core/ui-react` never references it either. Found 2026-08-23 while ruling
  on `F-AUTH-LOGIN`'s BASIC-logout gap, which FM-093 now records as a permanent shared limitation on that evidence. Removing it
  is backend cleanup outside FM governance (ADR-0001 scopes FM to the frontend), and it is only worth doing deliberately: its
  cookie clearing sets `setSecure(true)`, so it would be inert over plain HTTP anyway, and any future attempt to actually end a
  BASIC session would want to start from this endpoint rather than rediscover it. **Decision to settle:** delete it, or keep it
  as the starting point for a future BASIC-logout capability. **Checked 2026-08-27:** still present, now at `MainWeb.java:83`
  (the entry originally cited `:92`).

### Recorded, not routable

Kept because the evidence is worth having, but not actionable as work: each is either a note about an artefact that no longer
exists, or a finding whose only content is "this is fine, and here is why". Do not route these; do not delete them either.

- **FM-108's handoff cites the wrong precedent lines for its two `eslint-disable-next-line` comments.** The report
  justifies the disables on `HISTORY_FILTER_KINDS` (`api/history/filters.ts`) and `searchFormSchema`
  (`features/search/workspace/SearchWorkspace.tsx`) by pointing at `features/stats/dashboard/StatsDashboardPage.tsx:130,312`
  as existing convention, but those two lines actually carry `react-hooks/exhaustive-deps` and
  `@typescript-eslint/no-explicit-any` disables — not `no-unused-vars`. The disables themselves are correct and
  necessary: FM-108's reviewer built an eslint `--stdin` repro and confirmed `@typescript-eslint/no-unused-vars`
  fires as an *error* on a `const` read only through `typeof`, and the line-scoped `-- <reason>` style does match
  project convention. Nothing to change in code; the citation is simply wrong in a report that is now only in git
  history. Surfaced 2026-08-24 by FM-108's reviewer.
- **A stale count in FM-106's packet, worth knowing if the `RepeatSection` opt-in is ever reconsidered.** Its
  Verification section prices the opt-in branch as affecting "other four consumers". There is exactly **one**:
  `features/config/categories/CategoriesConfigTab.tsx:83`. Every other hit in `src` is a prose comment explaining why
  that file owns its list locally instead — `AuthUsersSection`, `DownloadersSection`, `ExternalToolsSection`,
  `CustomMappingsSection`, and now `NotificationEntriesSection`. The six-spec verification filter written for that
  branch was a conservative superset. Moot for FM-106, which took the local branch, but the sentence would misprice the
  next task that considers opting in. Surfaced 2026-08-26 by FM-106's implementer, confirmed by its reviewer. Not
  routable: the packet was deleted on completion, so there is no file to correct — and the `RepeatSection` deletion
  item above would retire the question entirely.
- **FM-105's stale-transaction token guard is unreachable and untested.** Deleting the guard at
  `AuthUsersSection.tsx:136-138` leaves all 48 tests green. Unlike `DownloadersSection`, whose equivalent guard is
  reachable through its async connection check, `UserDialog` has no async step and both dialogs are modal, so no UI
  path can produce a stale commit. Correct defence-in-depth and honestly documented at the site — logged only so the
  coverage asymmetry with `DownloadersSection` is not later mistaken for parity. Surfaced 2026-08-26 by FM-105's
  reviewer.
- **The `setCategories` sort is also the evidence that nothing in the categories config is order-dependent.**
  It sorts by name on every write, and `withoutAll()` filters by equality rather than position, so any order an admin
  arranged is discarded on write-back. That is a stronger justification for FM-107's "do not invent reordering" note
  than the packet's original "legacy has none", and worth carrying into the packet if reordering is ever reconsidered.
  (The same sort is the cause of the blank-category NPE packet at the top of this section.) Surfaced 2026-08-26.

### Discharged

Struck-through candidates are kept verbatim as a record of what was closed and how. Collected here 2026-08-27 by the triage pass;
their text and relative order are unchanged.

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
- ~~**Persist whether the search workspace's "Advanced" panel is collapsed or expanded** (`core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`, `advancedOpen` state). Requested alongside the 2026-08-19 UX polish above but
  refused at the qualification gate: this ledger's own header excludes persisted-data changes, and remembering the panel's state across page loads is a new user-observable capability, not styling or a contained bugfix. Needs a task
  packet: a storage-key convention decision (this would be the first persisted UI preference in `core/ui-react`) and a regular implementer/reviewer pass. Route to `/fm-orchestrate`.~~
  Discharged 2026-08-23 by the FM-087 packet, which shipped exactly this (`nzbhydra.search.advancedOpen` in `localStorage`, guarded reads).
- ~~**The refine sidebar's `downloadTypes` selection has the same cross-search staleness as `indexers`/`categories` did.**~~
  Discharged the same day by the 2026-08-19 download-type entry above (`27efd28f5`).
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
- ~~**FM-108's handoff was reported to the coordinator rather than written to `templates/handoff.md`**, as that
  packet's Handoff/Review section directs. Worth deciding once whether the template file is genuinely required per
  task or whether a reported handoff satisfies it. Surfaced 2026-08-24 by FM-108's reviewer.~~
  Discharged 2026-08-24 by ADR-0026, and usefully so: acting on this finding, the coordinator told FM-109's
  implementer to write its handoff into the file, which overwrote the blank template with one task's content. That
  exposed the right reading — "fills `../templates/handoff.md`" means fill out the form it defines, which is what
  FM-108 did. The template was restored and ADR-0026 settles it: handoffs are reported, their substance carried into
  `STATUS.md` and the commit message, and the templates stay blank forms.
- ~~**FM-103's grid-wrapper comment states a mechanism its own workaround disproves.** `IndexerTable.tsx:164-172` says the
  fieldset's min-content floor "cannot be overridden by anything a child does" — but the `minmax(0, 1fr)` wrapper it
  justifies *is* a child, and does work. The real mechanism, established by the reviewer's probe: `min-content` is not a
  fixed floor, it is computed from children's min-content *contributions*, and a `minmax(0,1fr)` track contributes 0.
  Proven by adding an 800px sibling next to the wrapper, whereupon the fieldset settled at exactly 800, not 900. Both
  the comment and the wrapper should go when the central `ConfigFieldset` fix lands. Surfaced 2026-08-26 by FM-103's
  reviewer.~~ Discharged 2026-08-26 by the ledger entry above, which landed the central `ConfigFieldset` `min-width: 0`
  fix and removed both the wrapper and the comment.

- ~~**`CapsGenerator.java:124` serves a caps image URL into the deleted `core/ui-src`.**
  `capsServer.setImage("https://raw.githubusercontent.com/theotherp/nzbhydra2/master/core/ui-src/img/banner-bright.png")` stops
  resolving the moment this branch merges to `master` — the same breakage FM-095 fixed for `/readme.md` by repointing at the
  retained `core/src/main/resources/static/img/banner-bright.png`. Outside FM-095's allowed files; the same relocation applies.
  `grep -rn "ui-src" core/src/main/java` returns exactly this line.~~
  Discharged before 2026-08-27 (not by this ledger): `CapsGenerator.java:124` now serves
  `core/src/main/resources/static/img/banner-bright.png`, and `grep -rn "ui-src" core/src/main/java` returns nothing.
  Confirmed by the 2026-08-27 triage pass.
- ~~**`core/ui-react/vite/devBackend.ts:18,71,135` still injects the selector cookie, and does it destructively.**
  Line 71's `proxyRequest.setHeader("Cookie", UI_SELECTOR_COOKIE)` *replaces* the browser's Cookie header on every proxied API
  call, discarding `JSESSIONID`. Its own comment calls it "the Cookie value `MainWeb` requires before it renders the React shell";
  `MainWeb` requires nothing now, so there is no upside left — only dev-mode auth breakage. Fix: delete `UI_SELECTOR_COOKIE` and
  its two injections. Dev-only, no test covers it.~~
  Discharged before 2026-08-27 (not by this ledger): `core/ui-react/vite/devBackend.ts:68-71` now carries a comment
  recording that FM-095 removed the injection, and `grep -rn UI_SELECTOR_COOKIE core/ui-react/vite` returns nothing.
  Confirmed by the 2026-08-27 triage pass.
- ~~**Two `STATUS.md` passages contradicted a third about `EXTERNAL_TOOL_CONFIGURATION`** — the FM-062 entry and an
  Upcoming line both still described the `NotificationsWeb.NOTIFICATION_EVENTS` gap as open and "not yet packaged",
  while the FM-086 entry a few hundred lines above recorded it closed. Corrected in bookkeeping 2026-08-26; recorded
  here because it is the second stale-cross-reference this batch has produced in that file (see the `- FM-NNN:` entry
  shape above), and a status file that disagrees with itself is worse than one that is merely behind.~~
  Struck 2026-08-27 by the triage pass: its own text records the correction as already made in bookkeeping
  2026-08-26, so there is nothing left to route. The durable lesson it carries — the `- FM-NNN:` validator regex — is
  kept as a live single-session item above.
- **FM-113's refusal message names the position *after* sorting, not the position the caller sent.** Because
  `setCategories` sorts before the validator runs, an API caller who puts the nameless entry first is told
  `Category number <last>`. That is correct relative to what the server stores and what the tab renders, and
  `config-categories.spec.ts:280-281` comments on it — but the validator comment and the `FEATURES.yaml` paragraph
  (`:673-676`) both say only "counting from one", which reads as the payload position. One clarifying clause in the
  registry comment closes it. Surfaced 2026-08-27 by FM-113's reviewer.
- **A nameless category still emits `Category "null" does not have any newznab categories configured`.** FM-113 added
  a refusal for the missing name but could not suppress the other messages that entry accumulates, because the packet
  froze their wording and suppressing one would have been a silent scope breach. Its implementer flagged rather than
  worked around it, which was right; the literal `"null"` in user-facing output is still poor. Fix alongside whatever
  eventually attributes messages to fields. `CategoriesConfigValidator.java:45`. Surfaced 2027-08-27 by FM-113.
- **Proposed packet — `Category` identity semantics now have more reachable surface.** `Category.java:104-118`'s
  `equals`/`hashCode` collapse all nameless entries to one, and `CategoryProvider.java:80`'s
  `Collectors.toMap(Category::getName, …)` has a duplicate-key path. FM-113 made nameless entries survive
  deserialization instead of throwing, so both are now reachable from a hand-edited or restored `nzbhydra.yml` — no
  validation runs on the config-load path, only on `PUT`. FM-113's reviewer ruled shipping acceptable and the
  reasoning is worth keeping: pre-FM-113 that route was an NPE during config load, i.e. an unbootable instance; now
  one nameless entry boots with a benign `null` key, and two produce `IllegalStateException: Duplicate key` at
  initialization — a *relocated* failure with a clearer diagnosis, not a new one. No scenario got worse. It wants a
  packet rather than a fix because it needs a ruling on `Category` identity that is wider than one module. Surfaced
  2026-08-27 by FM-113's reviewer.
- **`.trim().isEmpty()` where `String.isBlank()` is idiomatic.** `CategoriesConfigValidator.java:41`. Semantically
  identical for the code points that matter. Surfaced 2026-08-27 by FM-113's reviewer.
- **Neither bulk-actions `Select` has an accessible name.** `DownloadActions.tsx:303,324` put `aria-label` on the MUI
  `InputBase` wrapper rather than the `role="combobox"` element MUI renders inside it, so a screen reader announces an
  unnamed combobox and `getByRole("combobox", {name})` cannot address either control — which is why
  `SearchResults.test.tsx`'s helper reaches them via `querySelector('[aria-label="…"] [role="combobox"]')`. FM-114's
  reviewer ruled it a single-session fix that only looks larger than it is because the workaround is visible in a test
  helper: move the label to `inputProps`/`SelectDisplayProps`, then simplify the helper. Touches no contract, registry
  or decision. Surfaced 2026-08-27 by FM-114, confirmed by both its reviewers.
- **FM-114's category-load-failure criterion is only half-reachable.** The packet asks that a failed category fetch
  leave the send falling back to `defaultCategory` rather than `null`, but the pre-existing
  `if (categoryError) return;` at `DownloadActions.tsx:183-185` blocks the send outright, so only the *display* half
  is observable and the new test correctly asserts only that. Not a regression, and the resolution genuinely never
  consults the fetched list — but the criterion reads as though a send occurs, and nothing in the code records that it
  cannot. Worth deciding whether a load failure should block the send at all, given the list is explicitly not the
  authority for what is sent. Surfaced 2026-08-27 by FM-114's reviewers.
- **`categorySelect()` names its local `wrapper` but returns the inner combobox.** `SearchResults.test.tsx:3567-3575`,
  contradicting its own comment. Cosmetic, and it disappears if the `aria-label` placement above is fixed. Surfaced
  2026-08-27 by FM-114's re-review.
- **The 2026-08-20 ledger entry calls the toast layer "a sibling portal under `document.body`" (`:464`).** That was
  factually wrong when written — `Snackbar` contained no `Portal` at all, which is the defect FM-115 exists to fix —
  and is now half-true for an entirely different reason. It reads as prior art for a mechanism that did not exist,
  which is the same class of claim FM-115's own `ConfigShell` comment rewrite was raised to correct. Surfaced
  2026-08-27 by FM-115's reviewer.
- **FM-115's toast layer carries `aria-hidden` for a sub-millisecond window before the observer strips it.**
  `ToastProvider.tsx:158-165`'s `MutationObserver` callback is a microtask, so MUI's `ariaHiddenSiblings` sweep does
  briefly land on the layer. Harmless in every scenario its reviewer could construct — including two-modal cycles and
  StrictMode — and there is no synchronous hook into MUI's sweep to close it. But the docblock asserts the layer "is
  kept in the accessibility tree" without noting the removal is after-the-fact. One clause would make that comment as
  honest as the rest of them. Surfaced 2026-08-27 by FM-115's reviewer.
- **Proposed packet — the `loadLimitInternal` field still renders "results per page" beside its corrected label.**
  FM-116 fixed three surfaces that misdescribed the setting as a display page size, but a fourth survived:
  `SearchingConfigTab.tsx:283`'s `NumberSetting` carries `unit="results per page"`, which renders as an end adornment
  immediately next to the new "Results fetched per request" label — visible in
  `searching-advanced-shown-desktop.png`. That directly contradicts ADR-0032's binding constraint that the wording
  must not imply the value caps what is displayed. FM-116 could not fix it: its allowlist explicitly freezes every
  prop other than the strings it names, `unit` among them, so touching it is a scope change rather than a
  single-session fix. The task designer did not name it as one of the three surfaces. Surfaced 2026-08-27 by FM-116's
  reviewer.
- **`settingsIndexDrift.test.tsx` does not guard label or help text between a tab and the index.** It compares
  `anchorTestId`/`path` presence, the `advanced` boolean, and fieldset placement — but `entry.label` and
  `entry.helpText` are never compared against anything rendered, which the module's own doc comment states outright
  ("there is nothing to read the labels and help text off at runtime"). So the two copies of a setting's wording can
  drift apart silently. Demonstrated rather than reasoned: FM-116's implementer edited only the index's label, left
  the tab correct, and the suite stayed 46/46 green; its reviewer reproduced that independently and confirmed the
  mechanism by reading the file. This is a **pre-existing gap in the guarantee FM-099 built**, not something FM-116
  introduced, and it was out of FM-116's reach — the allowlist licenses editing the drift test only if a fixture
  quotes the changed strings, and none do. A fix would compare `SettingRow`'s rendered label and help text against
  `entry.label`/`entry.helpText` in at least one per-tab block. Note it means FM-116's own two copies were synced by
  hand and verified by hand, not by any gate. Surfaced 2026-08-27 by FM-116.
