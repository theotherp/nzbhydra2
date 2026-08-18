# Maintenance Ledger

Small, contained fixes made through `/fm-quickfix` — outside the task-packet pipeline, but gated, recorded, and committed like any other change.

This exists because packet overhead was causing debt to accumulate. A failing `search.spec.ts` locator survived FM-044, FM-045, and FM-041, each of which correctly reported it as out of scope and proposed a corrective packet that
nobody wrote; a repo-wide `format:check` failure was carried as inherited debt across four handoffs the same way. When the cheapest available action costs a designer/implementer/reviewer chain, walking past a two-line defect is the
rational choice. This ledger is the cheaper action, and it is what makes "has this already been dealt with?" answerable without reading every handoff.

**What belongs here:** mechanical repairs with no behavioral surface, and single-module bugfixes that ship with a regression test. **What does not:** anything touching a registry contract, a selector or `data-testid`, a visual record,
a user-observable capability, or an ADR. Those are task packets — see `README.md`, *Choosing A Mechanism*.

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

---

## Open candidates

Known small defects not yet fixed. Discharge one with `/fm-quickfix`, then move it into the ledger above with its commit SHA. If a candidate turns out to fail the qualification gate, say so here and route it to `/fm-orchestrate`
instead of leaving it to rot.

- **The other 11 `tests/system` spec files have never been Prettier-formatted.** `downloads.spec.ts`, `environment.ts`, `external-tools.spec.ts`, `fixtures.ts`, `news.spec.ts`, `results.spec.ts`, `search-history.spec.ts`,
  `shell-selector.spec.ts`, `smoke.spec.ts`, `stats.spec.ts`, and `visualEvidence.ts` all contain long (100–190 char) unwrapped lines and diverge from `core/ui-react`'s config (and from each other) far beyond the 5-statement drift
  `search.spec.ts` had. No single `printWidth` reconciles all of them simultaneously — tested 80 through 999 against the new `tests/system/.prettierrc.json`; some files want effectively unbounded width, others want 80. A real fix
  means either a full `prettier --write` pass (large diff across every one of these files, since most FM tasks never touch them, so blast radius and git-blame churn need a human call) or leaving them permanently un-gated. Not a
  quickfix: it fails the "blast radius you can state precisely but is not small" bar and the resulting diff would not be formatting-only relative to committed intent for files no packet has ever asserted a canonical style for. Route
  to `/fm-orchestrate` if this baseline is worth establishing, or decide these files stay outside the formatting gate.
- **`prettier --check .` crashes when run unscoped from `tests/system`.** It throws a `SyntaxError` on `data/logs/nzbhydra2-log.json` (newline-delimited JSON, not a single JSON expression) and additionally warns on generated/build
  paths (`data/nzbhydra.yml`, `instanceData/`, `playwright-report/`, `target/`, `test-results/`, `package-lock.json`). A `tests/system/.prettierignore` mirroring `core/ui-react`'s (see the entry above it) would fix this at the cause.
  Not fixed here because it's an unrelated defect found while investigating the `search.spec.ts` baseline — recording it per the "one fix per invocation" rule.
- **Refill is plausibly not keyboard-reachable.** `RecentSearches.tsx` renders Refill as a focusable `IconButton` nested inside a `MenuItem`, and MUI `MenuList`'s roving focus does not visit nested descendants — so Refill is reachable
  by pointer and drag while the row's Repeat is reachable by keyboard. Confirmed independently by the FM-047 designer and implementer. This is a capability gap, not a cosmetic one, and it fails the quickfix gate on two counts: it
  changes user-observable interaction semantics, and FM-038's single-row layout was an explicit human instruction recorded in `F-SEARCH-RECENT`'s `visual` note, so a fix would likely need fresh ADR-0006 acceptance. Needs a task packet
  that measures reachability first and raises the approach for a human decision.
