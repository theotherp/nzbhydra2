# FM-047: Recent-Search Refill Locator Repair

Status: done Owner: Feature IDs: F-SEARCH-RECENT Component IDs: None API IDs: None Depends on: None Blocks: None

**Closed without an independent reviewer pass (2026-08-18), by explicit human decision.** Every other FM task in this batch was reviewed by a fresh `migration-reviewer`; this one was not, and the record should say so plainly rather than imply uniform process. The coordinator proposed the deviation and the human accepted it on proportionality grounds: the entire change is two locator expressions (`git diff` shows `1 file changed, 2 insertions(+), 2 deletions(-)`, no reformat churn), the coordinator inspected that complete diff directly, and the implementer's full 14-test real-backend `search.spec.ts` run passed at exit 0 — evidence a reviewer would have reused rather than regenerated. What was therefore *not* obtained: an independent audit of the handoff's `Verification Basis` and SHA-256 manifest, and a second reading of the two stale Playwright citations noted under Deviations. Anyone relying on this packet's evidence later should weigh it as implementer-attested plus coordinator-inspected, not independently reproduced.

## Dependency Notes

This is a **corrective packet for inherited test debt**, not a feature packet. FM-038 (`b949b6fe0`) changed the recent-search Refill affordance from its own `menuitem` into an `IconButton` nested inside the `Repeat: <description>`
`menuitem`, but its own diff to `tests/system/tests/search.spec.ts` touched only the menu-width bound and left that spec's two `getByRole("menuitem", {name: "Refill"})` lines untouched. The test has failed ever since.

Three later packets each observed the failure, proved it pre-existing, and correctly declined to repair it as outside their `Files Allowed To Modify`:

- FM-038's own review recorded the locator as broken (`tasks/FM-038-recent-searches-single-row-menu.md:228-230`, `:291`) and deferred the fix.
- FM-044 reproduced the failure on a clean baseline tree at `68e4e2f9a` via `git stash push`/`pop` — proving it is not FM-044's regression — and proposed exactly this corrective packet in its `Follow-Up Work`
  (`tasks/FM-044-search-form-mock-fidelity-restyle.md:120`, `:177-178`, `:263-265`).
- FM-041 recorded it as still unowned (`tasks/FM-041-search-results-display-options-and-compact-rows.md:196`, `:320`).
- FM-045 resolved three *other* long-standing `results.spec.ts` failures but never owned `search.spec.ts`.

`Depends on: None` is literal: every prerequisite is already `done`. This task has **no feature dependency on FM-042** (sticky toolbar/header) or on any other pending packet — it shares no file with them, and `search.spec.ts` is
not in FM-042's write scope. It may be implemented before, after, or alongside FM-042.

## Outcome

`tests/system/tests/search.spec.ts`'s `should refill and repeat complete recent React search criteria` locates the recent-search Refill control by the role it has actually had since FM-038 — `button`, not `menuitem` — so the whole
14-test `search.spec.ts` file passes against a real backend, and the suite once again reflects the DOM the application ships.

## Boundary Rationale

This packet is deliberately **below** the normal "substantial vertical capability" bar, and that is the correct boundary here rather than an exception to be corrected. The unit of work is one broken assertion in one test. It cannot
be folded into an adjacent feature packet: every candidate has already refused it on scope grounds (see `Dependency Notes`), and forcing it into FM-042 would mix an unrelated test repair into a layout packet's diff and make both
harder to review. It cannot be usefully enlarged either — there is no adjacent broken assertion, no stale registry entry (verified; see `Acceptance`), and no production defect to pair it with. Bundling unrelated work to reach a
larger packet size is explicitly forbidden by the README's task-boundary rules, so this stays exactly as large as the defect is.

It is a **test repair**, not a restyle, redesign, or extension. No rendered pixel, no component, and no user-observable behavior changes.

## Decision Dependencies

- Accepted ADRs governing this task: ADR-0004 (testing and parity — the spec must assert the behavior the implementation actually has), ADR-0005 (recent-history criteria contract — the refill/repeat criteria round-trip this test
  exercises), ADR-0002 (MUI-only presentation — the reason the control is a MUI `IconButton` at all).
- ADR-0006 (visual parity policy) governs `F-SEARCH-RECENT`'s record but **does not apply to this task's work**: nothing visual changes, no visual contract is defined, no baseline is captured, and no variance is proposed or accepted.
  `F-SEARCH-RECENT`'s `visual.status: proposed` and its outstanding human acceptance are untouched and must stay that way.
- Proposed or rejected ADRs blocking this task: None.

## Files Allowed To Modify

- `tests/system/tests/search.spec.ts` — **only** the two Refill locator expressions inside `should refill and repeat complete recent React search criteria` (currently lines 586 and 588). No other line of this file.
- `docs/frontend-migration/STATUS.md` and this task packet.

`core/ui-react/src/features/search/history/RecentSearches.tsx` is deliberately **not** listed. The React implementation is correct: FM-038 shipped it under an explicit recorded human instruction, its component tests already assert the
real structure, and `F-SEARCH-RECENT`'s registry note already describes it accurately. The test is the only thing that is wrong, so the test is the only thing this packet may change.

`docs/frontend-migration/FEATURES.yaml` is deliberately **not** listed either — see the registry criterion under `Acceptance` for the verified reason.

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- **Any change to `RecentSearches.tsx` or its component tests.** Restructuring, re-roling, or re-labelling the Refill control is forbidden here, including as a "cleaner" way to make the existing `menuitem` locator pass. Making the
  stale assertion true by changing the implementation would invert the defect.
- **The nested-interactive accessibility question** (an `IconButton` inside a `MenuItem`). It is real and it is recorded under `Considerations And Follow-Up` as a proposal. It is not this packet's to act on.
- **The other 13 tests in `search.spec.ts`.** They must keep passing (see `Verification`), but none of them may be edited.
- **The other `getByRole("menuitem", ...)` locators in the suite** — `search.spec.ts:531` and `:534` (`Deselect all`, `Select group Secondary`, FM-037's indexer split-button menu) and the four in `results.spec.ts`. All of those target
  real `menuitem`s and are correct; verify before assuming, but do not touch them.
- **Reformatting `search.spec.ts`.** This repository's `tests/system` Prettier configuration disagrees with that file's committed style, so a whole-file `prettier --write` reformats nearly the entire file — FM-038 did exactly that and
  its review flagged it. Do not run a formatter over this file; hand-match the surrounding style instead.
- **Human visual-acceptance metadata.** Never create, re-date, or remove `F-SEARCH-RECENT`'s `visual.status`, its acceptance history, or its `backlog` entry.
- Any change to `FM-042` or any other packet.

## Context To Read

- `README.md` — Workflow, Registry Rules, Verification Integrity, and the task-boundary rules.
- `ADR-0004`, `ADR-0005`, `ADR-0002`.
- `F-SEARCH-RECENT` in `docs/frontend-migration/FEATURES.yaml` in full, including its `visual` note (which already describes the post-FM-038 single-row structure and the leading `Refill: <description>` icon button).
- `tasks/FM-038-recent-searches-single-row-menu.md` — especially lines 226-230, 253, 291, and 309-312 and 340 (the review's own record that the locator is broken and that the component tests address it correctly).
- `tasks/FM-044-search-form-mock-fidelity-restyle.md` lines 120, 177-178, and 263-265 (the clean-baseline reproduction and the proposal that produced this packet).
- `core/ui-react/src/features/search/history/RecentSearches.tsx` lines 93-121 — read only, to confirm the roles and accessible names first-hand.
- `core/ui-react/src/features/search/history/RecentSearches.test.tsx` line 62 — the sibling unit test that already uses the correct locator form.
- `tests/system/tests/search.spec.ts`, the `should refill and repeat complete recent React search criteria` test in full.

## Acceptance

- **The two Refill locators query role `button`.** `search.spec.ts:586` and `:588` (`expect(...).toBeVisible()` and the subsequent `.click()`) select the Refill control by `role: "button"`. Use `getByRole("button", {name: /^Refill:/})`,
  matching `RecentSearches.test.tsx:62` — the anchored regex is preferred over the bare `"Refill"` string so the locator names the real accessible name rather than relying on substring matching. `.first()` is retained; several recent
  searches may be listed. Decision source: `RecentSearches.tsx:110-121` renders `<IconButton aria-label={`Refill: ${description}`}>`, and `plainTextDescription` (`RecentSearches.tsx:177-179`) makes the full accessible name
  `Refill: Category: <c>, Source: <s>, Query: recent criteria, …`.
- **The role is the only thing that was wrong.** Confirm this rather than assume it: Playwright 1.62.1's `name` option matches the accessible name as a **case-insensitive substring** by default (`playwright-core/types/types.d.ts:3906`,
  `:8115`), so the existing `{name: "Refill"}` already matched; and `queryRole` in `playwright-core/lib/coreBundle.js` matches `getAriaRole(element)` per element with **no accessibility-tree pruning and no children-presentational
  suppression**, so a `button` nested inside a `menuitem` is discoverable. If the implementer's own reading of these two sources contradicts this, stop and escalate rather than widening the change.
- **The sibling `Repeat` assertion is untouched and still passes.** `search.spec.ts:598`'s `getByRole("menuitem", {name: "Repeat"}).first()` stays exactly as written: the `MenuItem` genuinely is a `menuitem` with accessible name
  `Repeat: <description>`, and substring matching makes `"Repeat"` match it. Its passing must be observed in the run, not inferred — before FM-047 it was never reached, because the Refill failure aborted the test first.
- **The diff to `search.spec.ts` is exactly the two locator expressions.** No other line changes — not the surrounding comments, not the FM-044 `Advanced`-disclosure lines, not whitespace, and no whole-file reformat. Verify with
  `git diff` before handoff.
- **No production source file changes.** `RecentSearches.tsx` and every other file under `core/ui-react/src/` are byte-identical to `HEAD` at handoff.
- **Registry reconciliation: none required, and that finding must be re-verified rather than copied from this packet.** `F-SEARCH-RECENT`'s `tests` list already includes `tests/system/tests/search.spec.ts` alongside the three React
  test files, and all four paths exist. Its `selectors` list is empty (`FEATURES.yaml:166`) and — confirmed with `git show b949b6fe0^:docs/frontend-migration/FEATURES.yaml` — was already empty *before* FM-038, so it is not stale for
  this defect's reason. Its `visual` note already states that FM-038 collapsed the two-`menuitem` row into one `menuitem` with a leading `Refill: <description>` icon button, so it is factually current. If the implementer's own check
  contradicts any of this, escalate; do not edit `FEATURES.yaml` on the strength of this packet's text alone. Do not add the component's `data-testid`s (`recent-searches-trigger`, `recent-search-entry`) to `selectors` — that is an
  unrelated registry improvement, not a correction of this defect.
- **No new capability, assertion, test, or fixture** is added to `search.spec.ts`. The repaired test asserts exactly what it asserted before FM-038 broke it.

## Considerations And Follow-Up

**The nested-interactive structure is a real accessibility concern, and it is deliberately not fixed here.** An `IconButton` nested inside a `MenuItem` places a separately focusable control inside a composite widget whose keyboard
model (MUI `MenuList` arrow-key roving focus) does not visit it, so the Refill affordance is plausibly reachable by pointer and drag but **not** by keyboard alone, while the row's own `Repeat` action is. That is a genuine
capability gap, not a cosmetic smell, and it is worth its own packet.

It is not repaired by this one, for three reasons, each traceable to authoritative evidence rather than preference:

1. It is not the failing assertion's cause. The locator is stale independently of whether the structure is ideal, and Playwright's per-element role matching (see `Acceptance`) means the test can and should pass against the structure
   as it stands.
2. The structure was chosen under an **explicit human instruction** recorded in `F-SEARCH-RECENT`'s `visual` note and in FM-038's packet — one row per search, showing every entry in full, with refill preserved as a leading icon
   button. Changing it back is a product/UX decision, not a test repair.
3. A fix would change interaction semantics and would likely need a visual re-acceptance under ADR-0006, since `F-SEARCH-RECENT`'s baseline is already `proposed` and awaiting human review.

**Proposed follow-up (not authorized by this packet):** a small `F-SEARCH-RECENT` accessibility packet that establishes whether Refill is keyboard-reachable inside the open menu, and if it is not, restores keyboard access without
losing FM-038's single-row layout. If more than one viable approach exists — for example a keyboard shortcut on the focused row versus a two-item structure versus a menu-level toolbar — that packet should raise the choice for a
human decision rather than pick one.

## Expected Implementer Gaps

Stated plainly so the coordinator can judge the cost — the honest answer is that this is very small:

- **A one-token role change on two lines** of `tests/system/tests/search.spec.ts` (`"menuitem"` → `"button"` at lines 586 and 588), plus swapping the `name` argument from the bare string `"Refill"` to the anchored `/^Refill:/` regex
  to match the sibling unit test. That is the entire code change.
- **One full real-backend `search.spec.ts` run** — all 14 tests, not a `--grep` of the repaired one. This is the expensive part of the packet and the only part that is not trivial: it needs a Maven-built JVM backend plus mockserver
  and the Docker fixtures, and it must demonstrate both that the repaired assertion passes *and* that nothing else in the file regressed, including the `Repeat` assertion at line 598 that no run has ever actually reached.
- **No registry entry to reconcile.** Verified above; the expected `FEATURES.yaml` diff is empty.
- **No production code change, no new test, no visual evidence, no ADR-0006 contract.**

If the implementer finds the work is larger than this, that is a signal the packet's premise is wrong — escalate rather than expand.

## Verification

Prerequisites and required service state: `tests/system` runs against a **real JVM backend plus mockserver**, not a Vite dev server. Use the documented launcher `misc/run_gui_systemtest.py --runtime local`, which builds the `core` and
`mockserver` exec JARs with Maven and starts the sonarr/radarr Docker fixtures. Maven, a JDK, Docker, and installed Playwright chromium browsers must all be available. Record the command as blocked if the environment cannot provide
them — never imply it passed.

- Working directory: `/home/sist/projects/nzbhydra2`
- `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/search.spec.ts` — **all 14 tests pass.** Record the per-test results, not just the summary. `should refill and repeat complete recent React search
  criteria` must pass, and the run must show the previously unreachable `Repeat` assertion executing. A `--grep`-narrowed run does **not** satisfy this criterion.
- Working directory: `/home/sist/projects/nzbhydra2/tests/system`
- `npx tsc --noEmit` — succeeds with no errors.
- Working directory: `/home/sist/projects/nzbhydra2`
- `git diff -- tests/system/tests/search.spec.ts` — shows exactly the two changed locator expressions and nothing else.
- `git diff --stat -- core/ui-react/src` — empty; no production source file changed.
- `git diff -- docs/frontend-migration/FEATURES.yaml` — empty, confirming the no-registry-change finding.
- `git diff --check` — no whitespace errors.
- Working directory: `/home/sist/projects/nzbhydra2/core/ui-react`
- `npm run validate:migration` — passes, with FM-047 correctly placed in `STATUS.md`.
- Confirm task-owned changed files are all listed under Files Allowed To Modify.
- Confirm verification leaves no unexpected generated or modified files (in particular no Playwright report, trace, or screenshot artifacts staged into the repository).

The React quality chain (`typecheck`, `lint`, `test`, `build`, `check:api`) is **not** required: this task changes no file under `core/ui-react/`. Do not run `npm run format:check` over `tests/system` — it fails on a clean baseline
for reasons unrelated to this task, and "fixing" it would reformat the whole file in violation of `Out Of Scope`.

## Handoff

### Outcome

`tests/system/tests/search.spec.ts`'s `should refill and repeat complete recent React search criteria` now locates the recent-search Refill control by the role it has actually had since FM-038 — `button`, not `menuitem` — using
`getByRole("button", {name: /^Refill:/})` to match the accessible name `RecentSearches.tsx:111` actually renders. The long-standing failure inherited from FM-038 is resolved, the full 14-test `search.spec.ts` file passes against a
real JVM backend, and the sibling `Repeat` `menuitem` assertion at line 598 — never reached by any previous run because the Refill failure aborted the test first — was observed executing and passing.

No production code, no component behavior, and no rendered pixel changed. The change is two locator expressions.

### Files Modified

- `tests/system/tests/search.spec.ts` — the two Refill locator expressions inside `should refill and repeat complete recent React search criteria` (lines 586 and 588). No other line.
- `docs/frontend-migration/STATUS.md` — FM-047 moved `Upcoming` → `Active` → `Review` with its context paragraph updated to match.
- `docs/frontend-migration/tasks/FM-047-recent-search-refill-locator-repair.md` — this packet: `Status` and this handoff.
- Scope confirmation: all task-owned modifications are within `Files Allowed To Modify`. `git status` reports exactly these three paths and nothing else. No pre-existing unrelated user changes were present at baseline, and none were
  touched.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: `@playwright/test 1.62.1`, `TypeScript 5.8.3`, `Apache Maven 3.9.12`, `OpenJDK/GraalVM CE 25.0.4`, `Docker Engine 29.7.2`, `Python 3.14.6`

### Verification Evidence

| Working directory | Command | Result |
|-------------------|---------|--------|
| `/home/sist/projects/nzbhydra2` | `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/search.spec.ts` | **Passed. Exit 0. `14 passed (26.4s)` — the whole file, no `--grep` narrowing.** Per-test results below. |
| `/home/sist/projects/nzbhydra2/tests/system` | `npx tsc --noEmit` | Passed. Exit 0, no diagnostics. |
| `/home/sist/projects/nzbhydra2` | `git diff -- tests/system/tests/search.spec.ts` | Passed. `1 file changed, 2 insertions(+), 2 deletions(-)` — only lines 586 and 588, `"menuitem"`/`"Refill"` → `"button"`/`/^Refill:/`. No comment, whitespace, or reformat churn. |
| `/home/sist/projects/nzbhydra2` | `git diff --stat -- core/ui-react/src` | Passed. Empty — no production source file changed. |
| `/home/sist/projects/nzbhydra2` | `git diff -- docs/frontend-migration/FEATURES.yaml` | Passed. Empty, confirming the no-registry-change finding independently. |
| `/home/sist/projects/nzbhydra2` | `git diff --check` | Passed. No whitespace errors. |
| `/home/sist/projects/nzbhydra2/core/ui-react` | `npm run validate:migration` | Passed. `Migration registries and task metadata are valid.` |

**Per-test results of the real-backend `search.spec.ts` run** (`--runtime local`: Maven `package -DskipTests -pl org.nzbhydra:core,org.nzbhydra:mockserver -am`, then mockserver + Hydra JVM core both reported healthy, then the
sonarr/radarr Docker fixtures recreated and both healthy; `Running 14 tests using 1 worker`):

```
  ✓   1 [chromium] › tests/search.spec.ts:19:9  › should search configured indexers and render their results (1.4s)
  ✓   2 [chromium] › tests/search.spec.ts:74:9  › should save, reopen, rerun, and delete a React saved search with legacy comparison (2.4s)
  ✓   3 [chromium] › tests/search.spec.ts:132:9 › should retain Spring stats-role protection for saved-searches (492ms)
  ✓   4 [chromium] › tests/search.spec.ts:159:9 › should render the React search workspace and preserved result selectors at desktop and mobile widths (854ms)
  ✓   5 [chromium] › tests/search.spec.ts:222:9 › should provide deterministic React workspace visual evidence across desktop and mobile (4.5s)
  ✓   6 [chromium] › tests/search.spec.ts:472:9 › should render deterministic STOMP progress in the React search modal (1.4s)
  ✓   7 [chromium] › tests/search.spec.ts:496:9 › should submit the explicit React indexer selection in both presentations (3.9s)
  ✓   8 [chromium] › tests/search.spec.ts:545:9 › should refill and repeat complete recent React search criteria (2.6s)
  ✓   9 [chromium] › tests/search.spec.ts:607:9 › should warn when indexer API hit or download limits are nearly exhausted (538ms)
  ✓  10 [chromium] › tests/search.spec.ts:636:9 › should preselect configured source quick filters (928ms)
  ✓  11 [chromium] › tests/search.spec.ts:666:9 › should apply later quick filters after deselecting quality and other filters (1.9s)
  ✓  12 [chromium] › tests/search.spec.ts:717:9 › should select a movie autocomplete result and search by TMDB identifier (943ms)
  ✓  13 [chromium] › tests/search.spec.ts:779:9 › should select a movie autocomplete result through the React route and search by TMDB identifier (1.5s)
  ✓  14 [chromium] › tests/search.spec.ts:832:9 › should select a TV autocomplete result with the keyboard and search by TVDB identifier (2.4s)

  14 passed (26.4s)
```

Zero failures, zero flakes, zero skips. Nothing in the other 13 tests regressed.

**The previously unreachable `Repeat` assertion was observed executing, not inferred.** Test 8 (`search.spec.ts:545`) is the repaired test, and it passed *in full* — which is the direct observation the `Acceptance` criterion demands, because every statement after the formerly failing Refill locator is on that test's only code path and each one is awaited:

- `:586-588` — the repaired `getByRole("button", {name: /^Refill:/}).first()` resolved and was both asserted visible and clicked. Had it not matched, the test would have failed here exactly as it has since FM-038.
- `:590-592` — the FM-044 `Advanced` disclosure reopened and the refilled `Minimum age (days)` / `Maximum size (MB)` still read `2` / `50`, proving the refill actually populated the form.
- **`:598` — `await page.getByRole("menuitem", {name: "Repeat"}).first().click()` executed and resolved.** A non-matching locator would have thrown on timeout rather than passing, so this line is now confirmed correct against the
  shipped DOM for the first time since FM-038: the `MenuItem` genuinely carries role `menuitem` with accessible name `Repeat: <description>`, and Playwright's default substring matching makes the bare `"Repeat"` match it.
- `:599-604` — the strongest evidence that `:598` truly fired: `expect((await repeatedSearch).request().postDataJSON()).toMatchObject({query: "recent criteria", minage: 2, maxsize: 50, indexers: ["Mock2"]})` awaits a
  `page.waitForResponse` promise armed *before* the click. It can only resolve if the Repeat click actually dispatched a real search to the backend, and the assertion further confirms that search carried the full round-tripped
  criteria. A click that silently hit nothing would have hung this `await` until timeout.

This closes the gap the packet flagged: before FM-047 the Refill failure aborted the test at `:586`, so `:598` had never once been reached by any run.

`npm run format:check` over `tests/system` was deliberately **not** run, per this packet's `Verification` section: it fails on a clean baseline for unrelated reasons and running a formatter over `search.spec.ts` would reformat nearly
the whole file in violation of `Out Of Scope`. The React quality chain was not run because no file under `core/ui-react/` changed.

### Verification Basis

- Baseline: `4340ee7a8608d73250cbe96f1fa2ae62e7b3acac`.
- Command coverage:
  - `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/search.spec.ts` — `tests/system/tests/search.spec.ts`
  - `npx tsc --noEmit` — `tests/system/tests/search.spec.ts`
  - The four `git` commands and `npm run validate:migration` are whole-tree state checks; the only task-owned implementation or test file they cover is `tests/system/tests/search.spec.ts`.
- File-content manifest:
  - `tests/system/tests/search.spec.ts: 69a5947c8eb6bd4aae202f50a733f746e0df542aaeed800717aa6f4a59e8f5db`
- Completed after the last change to each command's listed files: **`yes`, for every command.** `tests/system/tests/search.spec.ts` was edited exactly once, before any verification command ran, and no task-owned implementation or
  test file was touched afterwards. Its SHA-256 was captured before the real-backend run and re-checked after it completed, unchanged both times at `69a5947c8eb6bd4aae202f50a733f746e0df542aaeed800717aa6f4a59e8f5db` — so the
  expensive run demonstrably covers the exact file content being handed off. No command required a rerun.
- Task-owned changes after verification: **documentation/lifecycle-only.** `docs/frontend-migration/STATUS.md` (section move to `Review`) and this packet (`Status`, this handoff). Neither is an implementation or test file, neither
  affects any command's evidence, and `npm run validate:migration` was rerun after the final `STATUS.md`/packet state to confirm lifecycle placement. No other path changed.
- Verification left no unexpected generated or modified files. Post-run `git status` reports exactly the three task-owned paths and nothing else — no Playwright HTML report, trace, screenshot, or `test-results/` artifact was staged.
  The runner's own logs land in `misc/.gui-systemtest-runs/`, which was already ignored by a pre-existing rule (`misc/.gitignore:4`) that this task did not add or modify.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: `None`.
- Development dependencies added, removed, or changed: `None`.

### Architecture Decisions

- Accepted ADRs followed and their task-specific application:
  - **ADR-0004** (testing and parity) — directly applied and is the whole point of the packet: the spec must assert the behavior the implementation actually has. The repair moved the assertion onto the real DOM contract rather than
    moving the DOM onto the stale assertion.
  - **ADR-0005** (recent-history criteria contract) — unchanged; the refill/repeat criteria round-trip the test exercises (`minage: 2`, `maxsize: 50`, `indexers: ["Mock2"]`, `query: "recent criteria"`) is asserted exactly as before.
  - **ADR-0002** (MUI-only presentation) — unchanged, and the reason the control is a MUI `IconButton` (hence role `button`) at all.
  - **ADR-0006** (visual parity policy) — governs `F-SEARCH-RECENT`'s record but does **not** apply to this task's work. No visual contract, baseline, evidence, or variance was created, altered, or proposed. `F-SEARCH-RECENT`'s
    `visual.status: proposed` and its outstanding human acceptance are untouched.
- `ADR REQUIRED` proposal triggered during this task: `None`.

### Assumptions

- `None` material to the change. Every premise the packet asserted was re-verified first-hand against the installed sources rather than taken on trust. See `Deviations From The Packet` below and the selector/registry evidence in
  `Registry And Documentation Updates`.

### Deviations From The Packet

Recorded so the reviewer can see these were **caught during implementation, not inherited**. Neither changed the outcome, and neither is a code change.

1. **Two stale `playwright-core` line-number citations in `Acceptance`.** The packet cites `playwright-core/types/types.d.ts:3906` and `:8115` as the source for Playwright's default case-insensitive-substring `name` matching. In the
   installed `@playwright/test 1.62.1` those two lines actually document the **`hasNotText`** option on `locator()`/`filter()`, not `getByRole`'s `name`. The **substantive claim is nonetheless correct**, and was verified at the real
   location — **`types.d.ts:3149-3153`**, the `getByRole` `name` option: *"Option to match the accessible name. By default, matching is case-insensitive and searches for a substring, use `exact` to control this behavior."* The
   companion `queryRole` claim was likewise verified directly in `playwright-core/lib/coreBundle.js` (function `queryRole`, byte offset ~950577), whose matcher opens `if (getAriaRole(element) !== options.role) return;` and is applied
   per element across the scope with **no accessibility-tree pruning and no children-presentational suppression** — so an `IconButton` (`button`) nested inside a `MenuItem` (`menuitem`) is discoverable, exactly as the packet reasoned.
   Because both conclusions were confirmed, this did **not** trigger the packet's "if the implementer's own reading of these two sources contradicts this, stop and escalate" clause: the reading agrees with the conclusion and differs
   only in citation coordinates. The packet text was left unedited apart from `Status` and this handoff.
2. **`STATUS.md` lifecycle wording.** The designer's context paragraph opened "**FM-047 is `ready`**". It was updated to `in_progress` and then `review` as the task moved sections, since the validator ties section placement to
   `Status`. Content otherwise unchanged.

No other deviation. In particular the `Out Of Scope` fences held: `RecentSearches.tsx` and its component tests are untouched, no formatter was run over `search.spec.ts`, the other `menuitem` locators were verified but not modified,
and no visual-acceptance metadata was created, re-dated, or removed.

### Temporary Exceptions And Debt

- `None`. The repair is the removal of inherited debt, not the addition of any.

### Registry And Documentation Updates

- IDs updated: `None`. `F-SEARCH-RECENT` is linked but required no change, and `git diff -- docs/frontend-migration/FEATURES.yaml` is empty as predicted.
- `F-SEARCH-RECENT` (`FEATURES.yaml:159-183`), reconciled field by field and re-verified rather than copied from this packet's text:
  - **target** — `core/ui-react/src/features/search`: unchanged and correct; this task changed no production file.
  - **tests** — unchanged and correct. All four listed paths were confirmed to exist on disk: `core/ui-react/src/api/recentSearches.test.ts`, `core/ui-react/src/features/search/history/RecentSearches.test.tsx`,
    `core/ui-react/src/features/search/SearchPage.test.tsx`, and `tests/system/tests/search.spec.ts`. The system spec this task repaired was already listed.
  - **state** (`parity: partial`) — intentionally unchanged. A stale test locator never reflected a parity gap in the implementation, so repairing it does not advance parity.
  - **task owner** (`task: FM-017`) — intentionally unchanged. FM-047 is a corrective test-debt packet, not the record's implementing owner; reassigning ownership to it would misrepresent which task delivered the feature.
  - **gaps** (`[ ]`) — intentionally unchanged; no capability gap was opened or closed.
  - **selector contracts** (`selectors: [ ]`) — intentionally unchanged, and independently confirmed **not** stale for this defect's reason: `git show b949b6fe0^:docs/frontend-migration/FEATURES.yaml` shows `selectors: [ ]` was
    already empty *before* FM-038, so FM-038 did not empty it. Per `Out Of Scope`, the component's `data-testid`s (`recent-searches-trigger`, `recent-search-entry`) were **not** added — that is an unrelated registry improvement, not a
    correction of this defect.
  - **backlog ownership** — intentionally unchanged (`status: deferred`, rationale citing the pending ADR-0006 acceptance after FM-038 superseded the prior accepted width contract). Still accurate.
  - **visual note** — intentionally unchanged and confirmed factually current: it already states that FM-038 collapsed the two-`menuitem` row into one `menuitem` per search named `Repeat: <description>` with a leading icon button
    named `Refill: <description>` — precisely the structure this task's locator now targets.
- ADR-0006 visual records: **not applicable to this task.** No lifecycle transition, no scoped states/viewports/geometry change, no evidence or snapshot captured, no variance proposed or disposed. `F-SEARCH-RECENT`'s
  `visual.status` remains `proposed` with **human acceptance pending**, inherited from FM-038 and unaffected in either direction by this task. No behavioral or accessibility gate is implied by any visual evidence, and none was
  produced.
- `COMPONENTS.yaml` / `APIS.yaml`: no records linked by this task (`Component IDs: None`, `API IDs: None`); both files are unmodified.
- Documentation: `STATUS.md` lifecycle placement only.

### Follow-Up Work

Identified but deliberately **not** performed under this packet:

1. **Refill keyboard reachability (`F-SEARCH-RECENT` accessibility).** Confirmed as a real structural concern by first-hand reading of `RecentSearches.tsx:93-121`: the `IconButton` is a separately focusable control inside a MUI
   `MenuItem`, whose `MenuList` arrow-key roving focus does not visit nested interactive descendants, so Refill is plausibly pointer-reachable but not keyboard-reachable while the row's own `Repeat` action is. This packet's
   `Considerations And Follow-Up` already records it as a proposal; it is restated here because implementation confirmed the structure rather than merely inheriting the claim. A future packet should establish reachability empirically
   first, and if it is absent, restore keyboard access **without** losing FM-038's human-instructed single-row layout — raising the choice between approaches (row-level keyboard shortcut vs. two-item structure vs. menu-level toolbar)
   for a human decision rather than picking one, since a fix would change interaction semantics and likely require fresh ADR-0006 visual acceptance.
2. **Correct this packet's two stale `playwright-core` citations** if it is ever revised — `Acceptance` should point at `types.d.ts:3149-3153` rather than `:3906`/`:8115`. Detailed under `Deviations From The Packet` above. Not done
   here because the packet's `Files Allowed To Modify` covers its own lifecycle and handoff, and silently rewriting a designer's evidence citations after the fact is a change a reviewer should see proposed rather than applied.
3. **`tests/system` Prettier baseline.** `format:check` fails on a clean baseline for reasons unrelated to this task, which is why this packet excludes it and forbids formatting `search.spec.ts`. Reconciling that configuration
   against the committed style of the `tests/system` specs is worth its own packet; doing it here would have reformatted nearly the entire file.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`. There is no visual work here, so no human visual acceptance is required or implied by
this packet; `F-SEARCH-RECENT`'s outstanding ADR-0006 acceptance is inherited from FM-038 and is unaffected either way.
