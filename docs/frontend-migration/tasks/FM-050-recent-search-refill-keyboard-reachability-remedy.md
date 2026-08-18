# FM-050: Keyboard-Reachable Recent-Search Refill

Status: done Owner: Feature IDs: F-SEARCH-RECENT Component IDs: None API IDs: None Depends on: FM-049 Blocks: None

## Dependency Notes

`Depends on: FM-049` is a real sequencing dependency, not deference: FM-049 owns the working-tree edits to `F-SEARCH-RECENT`'s `gaps` and `backlog` that this packet discharges, and `README.md`'s *Parallel Work* rule forbids two live tasks
owning the same registry record. FM-049 is a measurement packet that implemented no remedy by design; this packet implements the remedy the measurement made necessary and ADR-0012 chose.

Nothing else blocks it. ADR-0012 is accepted, so no decision is outstanding, and the implementation file (`RecentSearches.tsx`) has been byte-identical to baseline throughout FM-047 and FM-049.

## Outcome

A keyboard-only user can reach and invoke the recent-search Refill action: `ArrowRight` from a `recent-search-entry` row moves focus onto that row's Refill `IconButton`, `ArrowLeft`/`Escape` returns focus to the row, `Enter`/`Space`
activates it natively, the affordance is announced and visibly discoverable, and every other menu key pressed from the new focus stop behaves exactly as it does from the row. The behavior is evidenced in a real browser, and
`F-SEARCH-RECENT`'s keyboard/assistive-technology `gaps` entry is discharged against that evidence.

## Boundary Rationale

One vertical capability, delivered whole. The key handling, the announcement, the visible hint, the definition of the focus stop's other-key behavior, the component-level contract test, the real-browser proof, and the registry
reconciliation are all one user-observable result and are not independently reviewable apart from each other: ADR-0012's `Consequences` makes discoverability and the undefined-state definition **obligations on the remedy itself**, so a
packet that shipped only the key binding would discharge none of them and would leave `gaps` standing.

Nothing is split off, because there is no dependency, second product capability, second runtime boundary, or unresolved contract inside it. Nothing unrelated is bundled in: the `SearchPage.tsx` double-submit defect FM-049 recorded as a
follow-up, the outstanding ADR-0006 visual acceptance of this record, and every other recent-search concern stay out (see *Out Of Scope*).

## Decision Dependencies

- Accepted ADRs governing this task: **ADR-0012** (`decisions/ADR-0012-recent-search-refill-keyboard-reachability.md`, accepted 2026-08-18, **Option A1**) is the governing decision and this packet implements exactly it — no other option
  in it is available to any agent here. **ADR-0004** makes accessibility an independent gate, assigns this evidence class to Playwright, and forbids removing, skipping, weakening, or ignoring any test; every test change here is additive.
  **ADR-0002** binds the remedy to MUI's own primitives — no second component suite, no bespoke menu widget, no hand-rolled menu. **ADR-0005** governs the `Label: value, Label: value` description string both accessible names are built
  from; `aria-keyshortcuts` is not part of accessible-name computation, so ADR-0005 must come out of this task untouched. **ADR-0006** governs the one additive visual state the hint introduces, and reserves acceptance for a human.
- Proposed or rejected ADRs blocking this task: **None**.
- ADR-0012 is a *technical* decision, not visual acceptance. `F-SEARCH-RECENT` stays `visual.status: proposed` with the human acceptance FM-038 left outstanding neither withdrawn nor re-dated. The visible hint is **one additive state
  joining that same outstanding acceptance**, not a new one, and no agent may supply it.

## Files Allowed To Modify

- `core/ui-react/src/features/search/history/RecentSearches.tsx`.
- `core/ui-react/src/features/search/history/RecentSearches.test.tsx` — **additively**. No existing test or assertion is edited, re-ordered, or removed.
- `tests/system/tests/search.spec.ts` — **additively**. One new `test(...)` block, plus additive assertions inside the existing recent-search visual-evidence block for the hint's geometry and capture. Do not alter, re-order, or
  re-format any existing test; the file is Prettier-clean as of `ba4acd521` and must stay so.
- `tests/system/visual-evidence/F-SEARCH-RECENT/recent-search-keyboard-hint-desktop.png` — the one new capture, written by `captureVisualRegion` from `tests/system/tests/visualEvidence.ts`.
- `docs/frontend-migration/FEATURES.yaml` — **only** `F-SEARCH-RECENT`'s `gaps`, `backlog`, one additive `visual.contract.states` entry, one additive `visual.contract.geometry_checks` entry, and a new `visual.snapshots` list holding
  exactly the capture above. Not `visual.applicability`, `status`, or `note`; not `visual.contract.setup` or `contract.viewports`; not `visual.evidence` or `visual.variances`; not `parity`, `tests`, `selectors`, `target`, or `task`; and
  not one character of any other record.
- `docs/frontend-migration/STATUS.md` and this task packet.

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- **Any structural change to the row.** ADR-0012 rejected Options B–F. One `MenuItem` per search, one MUI roving-focus stop, `aria-label={`Repeat: ${description}`}` on the row and `aria-label={`Refill: ${description}`}` on the nested
  `Tooltip`-wrapped `IconButton` with its `event.stopPropagation()`, all as they render today. No second `menuitem`, no role change, no submenu or dialog, no relocation of Refill out of the menu.
- **A modifier chord.** A2 was not selected; `ArrowRight`/`ArrowLeft` are the accepted binding and are verifiably unconsumed by MUI 7.3.9.
- **`core/ui-react/src/features/search/SearchPage.test.tsx`** and its four integrated recent-search hunks. ADR-0012 records that all three test layers keep their current assertions; this one needs no change and is not opened for edit.
- **Removing or renaming any `data-testid`, or changing either accessible name.** `recent-searches-trigger` and `recent-search-entry` are compatibility contracts under `README.md`'s *Registry Rules*, unchanged in name and in scope —
  one `recent-search-entry` node per search. The `Repeat: <description>` and `Refill: <description>` names are asserted in three test layers and stay byte-identical.
- **Any change to the description string or the parts that build it** (`searchDescriptionParts`, `plainTextDescription`, `describeSource`). ADR-0005 must be provably unaffected.
- **Any human visual or accessibility acceptance.** No `decision`, `accepted_by`, or `accepted_on` key anywhere; no acceptance metadata edited, re-dated, or restored; `F-SEARCH-RECENT` keeps `visual.status: proposed`.
- **The `SearchPage.tsx` `submit()` double-search defect** FM-049 recorded under *Follow-Up Work*. Unowned, unrelated, and not repaired here.
- **`docs/frontend-migration/MAINTENANCE.md`** and every other registry record.
- **Any dependency change**, including the `@mui/material` version. The remedy is version-scoped to `7.3.9` and must not move it.

## Context To Read

- `decisions/ADR-0012-recent-search-refill-keyboard-reachability.md` **in full**, especially `## Human Decision` (what A1 is, in the owner's own terms) and `## Consequences` — its second half lists the standing obligations this packet
  carries and the acceptance does not settle. Options B–F are recorded there as rejected; do not re-litigate them.
- `decisions/ADR-0004-testing-and-parity.md` in full; `decisions/ADR-0006-visual-parity-policy.md`'s `Consequences`; `decisions/ADR-0005-recent-history-criteria-contract.md`; `decisions/ADR-0002-frontend-stack.md`.
- `tasks/FM-049-recent-search-refill-keyboard-reachability-measurement.md`'s Handoff — the full focus trace, the CDP accessibility-tree excerpt, and the recorded environment. It is the before-state this packet is measured against, and
  its accessibility-tree capture is why nothing has to be built for assistive technology: the destination already exists, correctly named and `focusable: true`; only focus has to arrive.
- `F-SEARCH-RECENT` in `docs/frontend-migration/FEATURES.yaml` in full.
- `core/ui-react/src/features/search/history/RecentSearches.tsx` and `RecentSearches.test.tsx` in full; `core/ui-react/src/app/theme.ts`'s `MuiCssBaseline` `:focus-visible` override.
- `tests/system/tests/search.spec.ts:548-609` (the existing refill/repeat test, whose fixture pattern to reuse) and its recent-search visual-evidence block around `:403-425` (`recent-search-menu-desktop`); `tests/system/tests/visualEvidence.ts`.
- The installed MUI 7.3.9 sources, **cited by symbol name and quoted text, never by line number** (`node_modules` coordinates rot between installs — the failure mode FM-047 hit): `MenuList/MenuList.js`'s `handleKeyDown`, `moveFocus`,
  `nextItem`/`previousItem`, its `activeItemIndex` lookahead and the `muiSkipListHighlight` opt-out it honors; `Menu/Menu.js`'s `handleListKeyDown`; `Modal`'s `Escape` handling, which is what an in-menu `Escape` must be kept from
  reaching when focus is on the button.
- `README.md` — *Registry Rules*, *Verification Integrity*, *Agent Autonomy And Escalation*.

## Acceptance

**Keyboard contract — the accepted binding.** With the recent-search menu open and focus on a `recent-search-entry` row:

- `ArrowRight` moves focus onto that row's Refill `IconButton`; the menu stays open; no search is issued; the event is prevented from doing anything else.
- `ArrowLeft` on a row is a no-op: focus stays, the menu stays open, and it must not close the menu.
- `Enter`/`Space` on a row keep invoking Repeat exactly as today.

**Keyboard contract — the new focus stop's states, all of them defined here rather than left to the implementer.** ADR-0012's `Consequences` requires these to be specified and measured, not assumed. With focus on a Refill button:

- `ArrowLeft` returns focus to the owning row; the menu stays open.
- `Escape` returns focus to the owning row and **does not close the menu**. `Escape` with focus on a row still closes the menu, unchanged — assert both directions, since the second is the regression risk.
- `Enter`/`Space` activate the button **natively**: the form is refilled, the menu closes, and **no search request is issued**. Add no handler of your own for these keys.
- `ArrowRight` is a no-op — there is no second target.
- `ArrowDown`, `ArrowUp`, `Home`, `End`, and type-ahead behave **exactly as they do from the owning row**: next row, previous row, first row, last row, and type-ahead across rows, with identical wrapping. This is what keeps ADR-0012's
  "one MUI roving-focus stop" true as the user experiences it. It is not what happens by default: `MenuList.js`'s `handleKeyDown` resolves `currentFocus` from `getActiveElement(...)`, and `moveFocus` walks `nextElementSibling`/
  `previousElementSibling`, so from a nested descendant the walk starts *inside* the row and reaches the list's first or last child instead of the adjacent row. Measure the actual behavior; a deviation from this specification is a
  defect to fix, not a finding to record.
- `Tab`/`Shift+Tab` close the menu and return focus to `recent-searches-trigger`, exactly as from a row (`Menu.js`'s `handleListKeyDown`), unchanged.

**Discoverability is actively addressed — this packet's choice, and the implementer's obligation.** Adding the key binding does not discharge it. Two things ship together:

- `aria-keyshortcuts="ArrowRight"` on the `recent-search-entry` `MenuItem` — that literal value, being the UI Events `key` value the binding actually reads. It must not enter accessible-name computation: assert that both accessible
  names are byte-identical to their current values.
- **One shared visible hint node**, not per-row text: a single `Typography variant="caption"` (12px at the theme's default `typography.fontSize: 14`; MUI's `caption` variant) with `color: "text.secondary"` — the same token the row's own
  label spans already use — rendered as the **last** child of the `Menu`, only when at least one entry renders (never in the loading, error, or "No recent searches." states). Its literal text is
  `Press Right Arrow on an entry to refill the search form; Left Arrow or Escape returns.` Words, not glyphs, so screen-reader and sighted keyboard users get the same sentence. It wraps (`whiteSpace: "normal"`, unlike the entries'
  `nowrap`) so it can never widen the menu past its entries. Its horizontal padding equals the rendered row's — assert computed-style equality in the browser rather than restating MUI's 16px default.
  Chosen over per-row text because per-row text would repeat once per entry inside a menu whose width is content-driven, and over `aria-keyshortcuts` alone because that gives sighted keyboard users nothing and announces inconsistently
  across screen readers — ADR-0012's own stated weak point. There is **no mock for this menu** (`uimock/NZBHydra Search.dc.html` contains no recent-search surface; confirm by search), so no visual reference is diverged from and no
  variance is proposed.
- **The hint must not become a focus stop.** `moveFocus` skips any candidate for which `!nextFocus.hasAttribute('tabindex')`, and `MenuList`'s `activeItemIndex` lookahead can inject `autoFocus`/`tabIndex: 0` into the first valid child —
  which is why the hint goes last and carries no `tabindex`; `muiSkipListHighlight` is MUI's own opt-out if one is needed. Prove it: the recorded trace must show no key ever landing focus on the hint.
- The handoff must **state what was chosen and why** — placement, markup, whether anything was `aria-hidden`, and why the result is adequately discoverable — including any deviation from the above and its justification. "We added the
  key binding" does not discharge this criterion.

**Real-browser keyboard verification is mandatory and is the only acceptable reachability proof.** This defect was measurable only in a real browser: jsdom has no roving focus, no focus ring, and no accessibility tree, and FM-049
established the gap only by pressing keys in Chromium. A component test is complementary evidence under ADR-0004's independent-gates principle and must never be cited as the reachability proof.

- One new `test(...)` in `search.spec.ts`, keyboard-only throughout, with **at least two** deterministic entries (one entry makes row traversal unobservable), the menu opened *by keyboard* from `recent-searches-trigger`. It drives:
  `ArrowRight` in (focus on `/^Refill:/`), `ArrowLeft` out, `ArrowRight` then `Escape` out with the menu still open, `ArrowRight` then `Enter` activating, and `ArrowRight` then `Space` activating. For both activations the discriminating
  assertion is that the search form is refilled **and no search request was issued** — Repeat issues one, Refill must not.
- The trace records, for each key, `document.activeElement` (tag, accessible name, `data-testid`) and whether the menu was still open — for `ArrowRight`, `ArrowLeft`, `Escape`, `Enter`, `Space`, `ArrowDown`, `ArrowUp`, `Home`, `End`,
  `Tab`, `Shift+Tab`, and a printable type-ahead key, each pressed **with focus on the Refill button**, and matched against the specification above.
- Committed assertions cover `ArrowDown`, `ArrowUp`, `Home`, and `End` from the button reaching the same row the same key reaches from a row. Type-ahead and `Tab`/`Shift+Tab` are recorded in the trace but need not be asserted: type-ahead
  is timing-sensitive (`MenuList`'s 500ms `criteria` reset) and does not discriminate here, since every row's name starts with `Repeat: `.
- **A control proving the harness would detect failure.** Not an incidental passing assertion: temporarily disable the `ArrowRight` binding, observe the new test **fail**, record the exact failing assertion and its message, restore, and
  confirm the restored file is byte-identical (SHA-256) before re-running. This is the "prove the gate bites" obligation FM-048 carried and FM-049 met.
- The button shows a real focus indicator when reached: assert it matches `:focus-visible` in the browser, which under `app/theme.ts`'s `MuiCssBaseline` override renders as `outline: 3px solid currentColor` at `outline-offset: 3px`.
- Record the environment — `@mui/material` version, Playwright version, and the actual Chromium build — as FM-049 did, so the version-scoped claim stays re-judgeable.

**The version scoping becomes a standing re-verification duty in the code.** A comment beside the key handling in `RecentSearches.tsx` names ADR-0012, states that `@mui/material` `7.3.9`'s `MenuList/MenuList.js` `handleKeyDown` and
`Menu/Menu.js` `handleListKeyDown` leave `ArrowRight`/`ArrowLeft` unconsumed (by symbol name, never line number), and states plainly that **after any MUI upgrade this must be re-verified by re-running the keyboard spec**, not by
re-reading the sources. `package.json` pins `7.3.9` exactly, so name that literal.

**Additive component coverage** in `RecentSearches.test.tsx`, for the static contract only: `aria-keyshortcuts="ArrowRight"` present on the row, both accessible names unchanged, exactly one hint node when entries render and none in the
loading/error/empty states. It must not be described anywhere as evidence of reachability, focus, or roving-focus behavior.

**Registry reconciliation, against the evidence.**

- `F-SEARCH-RECENT`'s `gaps` entry (`refill is invocable by pointer and drag but not by keyboard or assistive technology`) is discharged **only against the recorded real-browser evidence**, never by deletion alone. Remove it only if the
  trace shows focus reaching the button and both activations working. If any half is unevidenced — for example if the `aria-keyshortcuts` announcement is not verified with a real screen reader — leave a **narrowed** `gaps` entry naming
  exactly what remains unevidenced, and name its owner in `backlog`. Say in the handoff which of these two happened and why.
- `backlog` is rewritten to state the true remaining position: the ADR-0006 visual acceptance is still outstanding and still un-re-dated, and the keyboard decision (ADR-0012) is accepted and implemented here. It must satisfy
  `README.md`'s *Registry Rules* — name its next task or blocking ADR — without implying any acceptance.
- One additive `visual.contract.states` entry for the hint (`keyboard-refill-hint`), one additive `geometry_checks` entry asserting the hint renders once below the last entry with no menu or page horizontal overflow at both existing
  viewports, and `visual.snapshots` holding exactly `tests/system/visual-evidence/F-SEARCH-RECENT/recent-search-keyboard-hint-desktop.png`, captured at `desktop` via `captureVisualRegion` so the human acceptor has something to look at.
  `visual.status` stays `proposed`; `visual.note` is not re-dated or edited; no variance is added.
- Every other `F-SEARCH-RECENT` field is explicitly confirmed unchanged rather than silently left alone — `tests` already lists both `RecentSearches.test.tsx` and `search.spec.ts`, and `visual.evidence` already lists `search.spec.ts`.

**No `data-testid` is removed or renamed**, confirmed mechanically by diffing the `data-testid` literals in the working tree against `HEAD`, not by inspection. **No test is removed, skipped, weakened, or ignored** (ADR-0004).

## Verification

Prerequisites and required service state: `tests/system` runs against a **real JVM backend plus mockserver**, not a Vite dev server. Use the documented launcher, which builds the `core` and `mockserver` exec JARs with Maven and starts
the sonarr/radarr Docker fixtures. Maven, a JDK, Docker, and installed Playwright Chromium browsers must all be available. Record any command as blocked if the environment cannot provide them — never imply it passed. Exploratory
measurement runs may use a scratch spec or the `playwright-cli` skill; keep any scratch file under the git-ignored `tests/system/.playwright-cli/` and confirm it is gone at handoff.

- Working directory: `/home/sist/projects/nzbhydra2/core/ui-react`
- `npm run typecheck` — succeeds with no errors.
- `npm run lint` — passes with no errors or new warnings.
- `npm run format:check` — passes. If it fails, prove the failure reproduces on a clean baseline tree and touches no file in this packet's scope; never reformat a file this task does not own.
- `npm run test` — the full vitest suite passes, with the new `RecentSearches.test.tsx` cases among it; record the file and test tallies.
- `npm run build` — succeeds.
- `npm run check:api` — passes.
- `npm run validate:migration` — prints `Migration registries and task metadata are valid.` and exits 0, with FM-050 placed in the `STATUS.md` section its status requires.
- Working directory: `/home/sist/projects/nzbhydra2/tests/system`
- `npx tsc --noEmit` — succeeds with no errors.
- `npx prettier --check .` — passes. Clean since `ba4acd521`, so a failure here is this task's own and is fixed by formatting only the lines it added.
- Working directory: `/home/sist/projects/nzbhydra2`
- `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/search.spec.ts` — the whole file passes: **15 tests** (FM-049's recorded 14, plus this packet's one new block). Record per-test results, not just the
  summary. A `--grep`-narrowed run does not satisfy this; narrowed runs used while iterating are recorded as such.
- Record the negative-control probe separately: the failing run with the binding disabled, its exact failing assertion, and the SHA-256 proving byte-identical restoration before the passing run above.
- `git diff --check` — no whitespace errors.
- `git diff --stat` — exactly `core/ui-react/src/features/search/history/RecentSearches.tsx`, `RecentSearches.test.tsx`, `tests/system/tests/search.spec.ts`, the one new capture, `docs/frontend-migration/FEATURES.yaml`,
  `docs/frontend-migration/STATUS.md`, and this packet. Anything else is out of scope and an escalation.
- `git diff -- core/ui-react/src/features/search/SearchPage.test.tsx core/ui-react/src/features/search/SearchPage.tsx` — empty.
- Confirm task-owned changed files are all listed under Files Allowed To Modify.
- Confirm verification leaves no unexpected generated or modified files — no Playwright report, trace, scratch spec, or stray screenshot beyond the one registered capture.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate. Include the full focus trace as evidence — it is a deliverable, not a summary — along with the discoverability rationale, the negative-control
probe record, and the environment. Mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`.

### Outcome

`ArrowRight` on a `recent-search-entry` row now moves focus onto that row's existing Refill `IconButton`; `ArrowLeft`/`Escape` on the button return focus to the row without closing the menu (`Escape` on a row still closes it, unchanged);
`Enter`/`Space` activate the button natively (no handler added); `ArrowDown`/`ArrowUp`/`Home`/`End` from the button reach the same row the same key reaches from the row, by refocusing the row and replaying the same key so MUI's own
`MenuList` `moveFocus` performs the identical sibling-only traversal it already performs for a row-focused press, rather than its nested-descendant fallback; `Tab`/`Shift+Tab` needed no change, since `Menu.js`'s `handleListKeyDown`
intercepts `Tab` unconditionally, before `currentFocus` is ever consulted. `aria-keyshortcuts="ArrowRight"` on the row announces the binding without touching either accessible name. A shared, wrapping `Typography variant="caption"` hint
is the `Menu`'s last child, rendered only when at least one entry renders, giving sighted keyboard users a visible cue the `aria-keyshortcuts` announcement alone would not. All of it is proven in a real browser against a real JVM backend
(`tests/system/tests/search.spec.ts`), with a negative-control probe that genuinely failed before the fix, restored byte-identically, and a passing whole-file run of exactly 15 tests. `F-SEARCH-RECENT`'s `gaps` entry is narrowed, not
deleted, because a real-screen-reader verification of the announcement is unperformed and unperformable by this project's harness.

### Files Modified

- `core/ui-react/src/features/search/history/RecentSearches.tsx` — added `rowRefs`/`refillButtonRefs` (`Map<string, HTMLLIElement | HTMLButtonElement>`, keyed by each entry's existing stable `key`); `aria-keyshortcuts="ArrowRight"` and
  an `onKeyDown` on the row (`ArrowRight` only: `preventDefault` + focus the button); an `onKeyDown` on the nested Refill `IconButton` (`ArrowLeft`: `preventDefault` + focus the row; `Escape`: `preventDefault` + `stopPropagation` + focus
  the row, so `Modal`'s own `Escape`-closes-menu handling never sees the event; `ArrowDown`/`ArrowUp`/`Home`/`End`: `preventDefault` + `stopPropagation` + focus the row + `row.dispatchEvent(new KeyboardEvent("keydown", {key, bubbles:
  true}))`, replaying the key from the row so `MenuList`'s own `moveFocus` does the identical row-to-row navigation); a version-scoped comment beside both handlers naming ADR-0012, the exact `@mui/material` `7.3.9` pin, the two MUI
  handlers by symbol name (`MenuList/MenuList.js`'s `handleKeyDown`, `Menu/Menu.js`'s `handleListKeyDown`), and the re-verification duty (re-run the keyboard spec after any MUI upgrade, never re-read the sources); the shared
  `Typography variant="caption"` hint node as the `Menu`'s last child (`color: "text.secondary"`, `sx={{pl: 2, pr: 4, py: 1, whiteSpace: "normal"}}`, rendered only when `recentSearches.data.length > 0`), with a comment explaining why it
  never becomes a focus stop. No structural change to the row: same single `MenuItem`, same `aria-label`s, same `data-testid`s.
- `core/ui-react/src/features/search/history/RecentSearches.test.tsx` — additively, five new cases: `aria-keyshortcuts="ArrowRight"` present with both accessible names byte-identical; exactly one hint node when entries render; no hint
  node in the loading, error, or empty states. Explicitly scoped as the static contract only, not reachability evidence (jsdom has no roving focus, no focus ring, no accessibility tree). No existing test or assertion edited, re-ordered,
  or removed.
- `tests/system/tests/search.spec.ts` — additively: one new `test(...)` (`should reach, return from, and activate Refill by keyboard alone via ArrowRight/ArrowLeft/Escape/Enter/Space (ADR-0012)`), keyboard-only throughout, with two
  deterministic entries (`historyForSearching: 2` caps the backend's `time desc`-ordered, dedup'd history at exactly the two searches this test submits, regardless of any history left by earlier tests in the file); and, inside the
  existing recent-search visual-evidence block (`should provide deterministic React workspace visual evidence across desktop and mobile`), additive assertions for the hint's DOM-order position (after the last entry — exact and
  viewport-independent, rather than a bounding-box comparison sensitive to sub-pixel padding rounding), its geometry at both `desktop` and `mobile` (no horizontal overflow of the hint, the menu, or the page), and its one new capture at
  `desktop`. No existing test, assertion, or formatting altered. **Two required findings from independent review, addressed by a post-review fixer pass, both additive:**
  1. The Acceptance criterion for the hint's padding ("assert computed-style equality in the browser rather than restating MUI's 16px default") had no corresponding assertion anywhere in the file. Added a `page.evaluate` computed-style
     comparison inside the same visual-evidence block, immediately after the existing DOM-order check: reads `getComputedStyle(...).paddingLeft`/`paddingRight` for both the last `recent-search-entry` row and the hint node, and asserts
     both pairs equal. No existing assertion touched.
  2. The new keyboard test's focus-indicator assertion (`matchesFocusVisible`/`outlineOffset`) holds regardless of whether anything is actually painted — `outlineOffset` computes to `3px` even under `outline-style: none`. Added an
     assertion for the actual rendering mechanism instead of replacing the existing one: `@mui/material` `7.3.9`'s `ButtonBase/ButtonBase.js` pulsates a `.MuiTouchRipple-ripplePulsate` span (`opacity: 0.3`) on `:focus-visible` for any
     `ButtonBase` with `focusRipple` true (`IconButton`'s default), the mechanism `Button.js`'s own `disableRipple` doc names. Asserts `.MuiTouchRipple-ripplePulsate` is attached on the focused Refill button and its computed `opacity`
     is non-zero. Chose Option (a) from the review (assert the actual mechanism) over Option (b) (narrow the Assumptions prose only) because the ripple assertion verified reliably in a real Chromium run with no timing flakiness — the
     class is applied unconditionally in `Ripple.js` (not gated behind a CSS-transition enter/active stage), so Playwright's normal locator auto-waiting was sufficient. The `matchesFocusVisible`/`outlineOffset` assertions are left in
     place (both true, just insufficient alone) rather than removed, so the change is additive at the code level as well as in intent. The Assumptions section's overclaiming language was also corrected — see *Assumptions* below.
- `tests/system/visual-evidence/F-SEARCH-RECENT/recent-search-keyboard-hint-desktop.png` — the one new capture, written by `captureVisualRegion`. It exists on disk (verified: `file` reports `PNG image data, 501 x 31`) but is gitignored
  by `tests/.gitignore:33`'s repository-wide `system/visual-evidence` pattern, consistent with every other already-shipped `F-*` visual-evidence snapshot in this repository (none of them appear in `git status`/`git diff --stat` either),
  so it does not appear in this task's `git diff --stat` despite being a real, task-owned file.
- `docs/frontend-migration/FEATURES.yaml` — `F-SEARCH-RECENT` only: `visual.contract.states` gains `keyboard-refill-hint`; `visual.contract.geometry_checks` gains one entry for the hint's render-once/position/overflow contract;
  `visual.snapshots` (new field on this record) holds exactly the one capture above; `gaps` narrowed (see *Registry And Documentation Updates*); `backlog` rewritten to state the true remaining position. No other field of this record —
  not `visual.applicability`, `status`, `note`, `contract.setup`, `contract.viewports`, `evidence`, or `variances`; not `parity`, `tests`, `selectors`, `target`, or `task` — and no other record, touched.
- `docs/frontend-migration/STATUS.md` — FM-050 moved from `## Upcoming` to a `- FM-050:` bullet plus narrative paragraph under `## Review`. `## Upcoming`'s FM-050 bullet removed. No other line touched.
- `docs/frontend-migration/tasks/FM-050-recent-search-refill-keyboard-reachability-remedy.md` — this packet: `Status: ready` → `Status: review`, and this Handoff section.
- Scope confirmation: `git diff --stat` (see *Verification Evidence*) lists exactly these six tracked paths, all within `Files Allowed To Modify`; the seventh, the `.png` capture, is real and task-owned but gitignored (see above).
  `git status --short` at the repository root shows exactly the same six modified paths and nothing else. No pre-existing unrelated user changes were present at baseline (`Unrelated pre-existing user paths: none`, per the coordinator),
  and none were touched. `git diff -- core/ui-react/src/features/search/SearchPage.test.tsx core/ui-react/src/features/search/SearchPage.tsx` is empty.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: `@playwright/test 1.62.1` (Chromium build: Chrome for Testing `151.0.7922.34`, matching FM-049's recorded build), `@mui/material` / `@mui/icons-material` `7.3.9` (unchanged, per `package.json`), `TypeScript
  5.9.3`, Apache Maven `3.9.12`, GraalVM CE/OpenJDK `25.0.4`, Docker Engine `29.7.2`, Python `3.14.6`.

### Verification Evidence

| Working directory | Command | Result |
|-------------------|---------|--------|
| `core/ui-react` | `npm run typecheck` | Passed. Exit 0, no diagnostics. |
| `core/ui-react` | `npm run lint` | Passed. `0 problems (0 errors, 8 warnings)` — the same eight pre-existing warnings as baseline (`SearchPage.tsx`, `RefineSidebar.tsx`, `SearchWorkspace.tsx` ×3, `IndexerStatusesPage.tsx`, `router.tsx`); none in any task-owned file. |
| `core/ui-react` | `npm run format:check` | Passed. `All matched files use Prettier code style!` |
| `core/ui-react` | `npm run test` | Passed. `38 test files, 236 tests` — 231 baseline tests plus this task's 5 new additive cases in `RecentSearches.test.tsx` (now 9 in that file, up from 4; all other files unchanged). |
| `core/ui-react` | `npm run build` | Passed. `✓ built in 1.98s`. |
| `core/ui-react` | `npm run check:api` | Passed. `Generated OpenAPI types are current.` |
| `core/ui-react` | `npm run validate:migration` | Passed. `Migration registries and task metadata are valid.` (run after the `.png` capture existed on disk and after every `FEATURES.yaml`/`STATUS.md`/packet edit). |
| `tests/system` | `npx tsc --noEmit` | Passed. Exit 0, no diagnostics. |
| `tests/system` | `npx prettier --check .` | Passed. `All matched files use Prettier code style!` |
| `/home/sist/projects/nzbhydra2` | Negative-control probe: `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 480 -- tests/search.spec.ts --grep "ADR-0012"` with the row's `ArrowRight` binding disabled (`if (false && event.key === "ArrowRight")`) | **Failed as required.** `expect(locator).toBeFocused()` failed: `Locator: getByRole('button', {name: /Refill:.*fm050 keyboard refill beta/})`, `Expected: focused`, `Received: inactive`, at `search.spec.ts:781` (the very first `ArrowRight` assertion) — exact message quoted in *Assumptions* below. |
| `/home/sist/projects/nzbhydra2` | Restoration: `cp` the pre-disable copy back, `sha256sum` | Passed. `5e901f213e361f0af240a2086178e42af5cece595652b57370406848dc673d15` both before disabling and after restoring — byte-identical, confirmed by `diff` as well as SHA-256. |
| `/home/sist/projects/nzbhydra2` | `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 480 -- tests/search.spec.ts` (whole file, no `--grep`) — **iteration 1** | Failed. 2 failures (both defects in my own new assertions, not the implementation): the hint bounding-box check off by 1px, and the focus-indicator `outlineStyle`/`outlineWidth` assertion (see *Assumptions*). 13/15 passed. |
| `/home/sist/projects/nzbhydra2` | Same command — **iteration 2**, after fixing the outline assertion and the DOM-order hint check | Failed. 1 failure: `openMenuByKeyboard()` called without first closing an already-open menu left open by a prior block, so `trigger.focus()` was pulled back into the menu by MUI's focus-containment. Fixed by making the helper close the menu first when already open. 14/15 passed. |
| `/home/sist/projects/nzbhydra2` | Same command — **iteration 3, the recorded final evidence** | **Passed. Exit 0. `15 passed (29.3s)`. The whole file, no `--grep` narrowing.** Per-test results below. |
| `/home/sist/projects/nzbhydra2` | `git diff --check` | Passed. No whitespace errors. |
| `/home/sist/projects/nzbhydra2` | `git diff --stat` | Passed. Exactly `core/ui-react/src/features/search/history/RecentSearches.test.tsx`, `RecentSearches.tsx`, `docs/frontend-migration/FEATURES.yaml`, `docs/frontend-migration/STATUS.md`, this packet, and `tests/system/tests/search.spec.ts` — six tracked paths, plus the gitignored `.png` capture confirmed separately by `ls`/`file`. |
| `/home/sist/projects/nzbhydra2` | `git diff -- core/ui-react/src/features/search/SearchPage.test.tsx core/ui-react/src/features/search/SearchPage.tsx` | Passed. Empty. |

Per-test results for the final `search.spec.ts` run (15/15):

1. should search configured indexers and render their results — passed (1.36s)
2. should save, reopen, rerun, and delete a React saved search with legacy comparison — passed (2.44s)
3. should retain Spring stats-role protection for saved-searches — passed (0.48s)
4. should render the React search workspace and preserved result selectors at desktop and mobile widths — passed (0.86s)
5. should provide deterministic React workspace visual evidence across desktop and mobile — passed (4.89s)
6. should render deterministic STOMP progress in the React search modal — passed (1.37s)
7. should submit the explicit React indexer selection in both presentations — passed (4.27s)
8. should refill and repeat complete recent React search criteria — passed (2.54s)
9. **should reach, return from, and activate Refill by keyboard alone via ArrowRight/ArrowLeft/Escape/Enter/Space (ADR-0012) — passed (2.64s)** (this task's new test)
10. should warn when indexer API hit or download limits are nearly exhausted — passed (0.53s)
11. should preselect configured source quick filters — passed (0.90s)
12. should apply later quick filters after deselecting quality and other filters — passed (1.79s)
13. should select a movie autocomplete result and search by TMDB identifier — passed (0.94s)
14. should select a movie autocomplete result through the React route and search by TMDB identifier — passed (1.42s)
15. should select a TV autocomplete result with the keyboard and search by TVDB identifier — passed (2.35s)

**Full keyboard focus trace**, reconstructed from the new test's own committed, passing assertions in `tests/system/tests/search.spec.ts` (real Chromium, real JVM backend, two deterministic entries `fm050 keyboard refill alpha`/`beta`;
beta autofocused first, being the more recently submitted of the two under `time desc` ordering) — every row below is a real assertion that executed and passed, so the table is re-derivable by re-running the file, not a one-off capture:

| Step | Key(s) | `document.activeElement` after | Menu open | Notes |
|---|---|---|---|---|
| Open | focus trigger, `Enter` | `LI` `menuitem` `Repeat: …beta` `recent-search-entry` | Yes | Autofocus lands on the newest entry. |
| 1 | `ArrowLeft` (from row) | same row (beta) | Yes | No-op, confirmed — neither MUI handler consumes it. |
| 2 | `ArrowRight` (from row) | `BUTTON` `Refill: …beta` (no `data-testid`) | Yes | No search issued (request counter unchanged). `:focus-visible` matches; `outlineOffset: 3px` reaches the element (see *Assumptions* for the `outline-style`/`outline-width` finding). |
| 3 | `ArrowLeft` (from button) | back to beta row | Yes | |
| 4 | `ArrowRight`, `Escape` (from button) | back to beta row | **Yes** | The regression risk this packet names: `Escape` on the button must not close the menu, and does not. |
| 5 | `Escape` (from row) | (menu closed) | **No** | The other regression direction: `Escape` on a row still closes the menu, unchanged. |
| 6 | `ArrowRight`, `ArrowRight` (from button) | stays on beta's button | Yes | No-op — no second target. |
| 7 | `ArrowDown` (from **row**, baseline) | alpha row | Yes | |
| 7′ | `ArrowRight`, `ArrowDown` (from **button**) | alpha row | Yes | Matches the row baseline exactly. |
| 8 | `ArrowUp` (from **row**, baseline; wraps beta→alpha) | alpha row | Yes | |
| 8′ | `ArrowRight`, `ArrowUp` (from **button**) | alpha row | Yes | Matches. |
| 9 | `ArrowDown`, `Home` (from **row**, baseline) | beta row | Yes | |
| 9′ | `ArrowDown`, `ArrowRight`, `Home` (from **button**) | beta row | Yes | Matches. |
| 10 | `End` (from **row**, baseline) | alpha row | Yes | |
| 10′ | `ArrowRight`, `End` (from **button**) | alpha row | Yes | Matches. |
| 11 | `ArrowRight`, `f` (type-ahead, from button) | recorded, not asserted | recorded | Per Acceptance: doesn't discriminate (every accessible name starts `Repeat: `; MUI's type-ahead matches visible `innerText`, not `aria-label`) and is timing-sensitive. |
| 12 | `ArrowRight`, `Tab` (from button) | `recent-searches-trigger` | **No** | Position-independent: `Menu.js`'s `handleListKeyDown` intercepts `Tab` before consulting `currentFocus`. |
| 13 | `ArrowRight`, `Shift+Tab` (from button) | `recent-searches-trigger` | **No** | Same. |
| 14 | `ArrowRight`, `Enter` (from button, on beta) | (menu closed) | No | `search-query` field shows `fm050 keyboard refill beta`; request counter unchanged (no search issued) — the discriminating assertion. |
| 15 | `ArrowDown`, `ArrowRight`, `Space` (from button, on alpha) | (menu closed) | No | `search-query` field shows `fm050 keyboard refill alpha`; request counter unchanged. |

No step in this trace, nor in the negative-control probe's execution, ever produced an `activeElement` on the hint node — the hint carries no `tabindex` and is always the `Menu`'s last child after at least one already-non-disabled row,
so MUI's `activeItemIndex` lookahead never reaches it.

**Discoverability rationale.** Two things ship together, as ADR-0012 requires: `aria-keyshortcuts="ArrowRight"` on the row (not part of accessible-name computation — both accessible names asserted byte-identical in both
`RecentSearches.test.tsx` and this new system test), and the shared visible hint (`Press Right Arrow on an entry to refill the search form; Left Arrow or Escape returns.`) as the `Menu`'s last child. Placement: last child, so it can
never become MUI's `activeItemIndex` autofocus target (every row before it is non-disabled, so `activeItemIndex` is always claimed before the loop reaches the hint) and carries no `tabindex`, so `moveFocus`'s `!nextFocus.hasAttribute
('tabindex')` skip also excludes it as a defense in depth. Markup: a bare `Typography variant="caption"` (defaults to `<span>`, not `<p>`, since `caption` has no entry in MUI's `defaultVariantMapping`), `color: "text.secondary"` (the
same token the row's own field labels already use), `whiteSpace: "normal"` (wraps, unlike the entries' `nowrap`, so it can never widen the menu), and `pl: 2, pr: 4` matching the row's own computed horizontal padding exactly (`MenuItem`'s
literal `16px` default left, and the row's own `sx={{pr: 4}}` override on the right — both expressed in the same `theme.spacing` units so they track the theme's `8px` base identically). Nothing is `aria-hidden` — the hint is a normal,
readable text node for both sighted and screen-reader users, and the sentence uses words rather than glyphs so both audiences get the same content. No mock exists for this menu (confirmed by search, as FM-038/ADR-0012 recorded), so no
visual reference is diverged from. This is adequately discoverable for sighted keyboard users (a persistent, always-visible instruction) and for `aria-keyshortcuts`-aware assistive technology, but — see *Registry And Documentation
Updates* — its actual announcement by real screen-reader software is unverified, which is exactly why the `gaps` entry is narrowed rather than deleted.

**Negative-control probe, in full.** Before: `RecentSearches.tsx` SHA-256 `5e901f213e361f0af240a2086178e42af5cece595652b57370406848dc673d15`. Disabled the row's `ArrowRight` binding by changing its `if (event.key === "ArrowRight")` guard
to `if (false && event.key === "ArrowRight")` (a one-line, easily-reverted change) and ran `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 480 -- tests/search.spec.ts --grep "ADR-0012"` (a `--grep`-narrowed run, used
only for this iteration and recorded as such). Result: **failed**, with this exact assertion and message:

```
Error: expect(locator).toBeFocused() failed

Locator:  getByRole('button', { name: /Refill:.*fm050 keyboard refill beta/ })
Expected: focused
Received: inactive
Timeout:  5000ms
    at tests/search.spec.ts:781:34   (await expect(betaRefill).toBeFocused();)
```

This is the very first `ArrowRight` assertion in the test — the harness detects the missing capability immediately, not eventually. Restored the file via `cp` from a pre-disable copy; `sha256sum` after restoration:
`5e901f213e361f0af240a2086178e42af5cece595652b57370406848dc673d15` — identical to before, confirmed by both SHA-256 and `diff`. Re-ran the whole file (not narrowed) afterward; see *Verification Evidence* for the (initially 2-failure,
then 1-failure, finally 0-failure) iteration record — both remaining failures were defects in this task's own new test code (an assertion that didn't hold given a real `ButtonBase` CSS characteristic, and a menu-state bug in a test
helper), not in the implementation under test, and both are recorded and fixed above.

**Environment**, recorded so the version-scoped claim stays re-judgeable: `@mui/material` `7.3.9` (unchanged from FM-049; `package.json` still pins it exactly), Playwright `1.62.1`, Chrome for Testing `151.0.7922.34` (same Chromium
build FM-049 recorded).

**Post-review fixer pass.** A fresh, independent review of this handoff raised two required findings, both confined to `tests/system/tests/search.spec.ts` and both additive (see *Files Modified* above for the exact code changes and
the choice between the review's two options for finding 2). A fixer pass in a fresh context, working from the same `@mui/material` `7.3.9` sources, addressed both:

1. Added the computed-style padding-equality assertion the Acceptance criterion required and that was missing from every version of this file.
2. Added a `.MuiTouchRipple-ripplePulsate` attachment/opacity assertion on the focused Refill button, giving the focus-indicator criterion a genuine regression-detecting mechanism, alongside the existing (still-true, left in place)
   `matchesFocusVisible`/`outlineOffset` assertions. Corrected this Assumptions section's overclaiming language about what the pre-existing assertions alone proved (see the relevant bullet above) and the Follow-Up Work bullet that
   previously implied no focus indicator exists at all for a `ButtonBase` control (it does — a weak one).

No implementation file was touched by this fixer pass (`RecentSearches.tsx`'s SHA-256 was independently re-verified as `5e901f213e361f0af240a2086178e42af5cece595652b57370406848dc673d15`, unchanged); no existing assertion in either the
new keyboard test or the visual-evidence block was altered, reordered, or removed. `core/ui-react`'s quality chain (`typecheck`/`lint`/`format:check`/`test`/`build`/`check:api`) is **reused** — its source (`RecentSearches.tsx`,
`RecentSearches.test.tsx`) is untouched by this fixer pass and neither fix reaches it. `npx tsc --noEmit` and `npx prettier --check .` in `tests/system` are **affected** (the changed file is under their scope) and were re-run:
both passed clean (`tsc`: exit 0, no diagnostics; `prettier --check .`: "All matched files use Prettier code style!"). The whole-file real-backend run is **affected** (both fixes live inside files that run) and was re-run in full, not
narrowed: `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 480 -- tests/search.spec.ts` — **15 passed (28.5s)**, including test 9 (the ADR-0012 keyboard test, now carrying the ripple assertion) and test 5 (the
visual-evidence block, now carrying the padding-equality assertion). `git status --short`/`git diff --stat` confirmed unchanged in shape: the same six tracked task-owned paths, nothing else, and the one gitignored `.png` capture
regenerated (`file`: `PNG image data, 501 x 31`, identical dimensions to the prior recorded capture). `tests/system/tests/search.spec.ts`'s SHA-256 after the fixer pass:
`1a4770c16e978ede69ef06db71fec665d7a5d2e29b85f1db526682a66dc3af62` (superseding the manifest entry below, which is now updated).

### Verification Basis

- Baseline: `e6e26d135e36803e45851f7c96d21fb26d6efaac`.
- Command coverage:
  - `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`, `npm run check:api` (all in `core/ui-react`): every file under `core/ui-react/src` (task-owned files changed:
    `src/features/search/history/RecentSearches.tsx`, `RecentSearches.test.tsx`).
  - `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 480 -- tests/search.spec.ts` (whole-file and the `--grep`-narrowed negative-control run): `tests/system/tests/search.spec.ts` (task-owned, changed) and
    `core/ui-react/src/features/search/history/RecentSearches.tsx` (task-owned implementation file under test, changed).
  - `npx tsc --noEmit`, `npx prettier --check .` (in `tests/system`): all files under `tests/system` (task-owned file changed: `tests/search.spec.ts`).
  - `npm run validate:migration` (in `core/ui-react`): `docs/frontend-migration/FEATURES.yaml`, `docs/frontend-migration/STATUS.md`, and this task packet (all task-owned; changed).
- File-content manifest:
  - `core/ui-react/src/features/search/history/RecentSearches.tsx`: `5e901f213e361f0af240a2086178e42af5cece595652b57370406848dc673d15`. **Unchanged by the post-review fixer pass** (independently re-verified — see below).
  - `core/ui-react/src/features/search/history/RecentSearches.test.tsx`: `50f430d19b3c26f58eeeb1bcd8d6b2aeb68a5b1060ae75f2fba556ce09fe8ee5`. **Unchanged by the post-review fixer pass.**
  - `tests/system/tests/search.spec.ts`: `1a4770c16e978ede69ef06db71fec665d7a5d2e29b85f1db526682a66dc3af62` (**updated by the post-review fixer pass**; was `c0ab93224601ea8ddd7833104bbda2582d3f3a5b37fbf48639e83dd7609ddb04` before it — see *Post-review fixer
    pass* above for the two additive assertions this reflects).
  - `docs/frontend-migration/FEATURES.yaml`, `docs/frontend-migration/STATUS.md`, this packet: documentation-only, excluded from the manifest per the template's instruction. This packet's own Handoff text was updated by the fixer
    pass (this section and others above); `FEATURES.yaml`/`STATUS.md` were not touched by it.
  - `tests/system/visual-evidence/F-SEARCH-RECENT/recent-search-keyboard-hint-desktop.png`: a generated visual-evidence capture, not an implementation or test file — excluded from the manifest for the same reason the template excludes
    generated screenshots elsewhere in this project's other handoffs; its existence on disk is the fact `validate:migration` checks, and it was confirmed present (`ls`, `file`) after the final passing run and before the final
    `validate:migration` run below. Regenerated, same dimensions (`501 x 31`), by the post-review fixer pass's whole-file rerun.
- Completed after the last change to each command's listed files: **yes** for all commands. The final `core/ui-react` quality-chain run (`typecheck`/`lint`/`format:check`/`test`/`build`/`check:api`) and the final
  `python3 misc/run_gui_systemtest.py ... tests/search.spec.ts` run (iteration 3, 15/15) both ran after `RecentSearches.tsx` was restored byte-identical post-negative-control and after every subsequent test-code fix; `npx tsc --noEmit`
  and `npx prettier --check .` in `tests/system` ran after the final `search.spec.ts` edit; `npm run validate:migration` ran after the final `FEATURES.yaml`/`STATUS.md`/packet edits and after the `.png` capture existed on disk. The
  post-review fixer pass's `npx tsc --noEmit`, `npx prettier --check .`, and whole-file `search.spec.ts` run all ran after that pass's own (final and only) edit to `search.spec.ts`; `core/ui-react`'s quality chain and
  `validate:migration` were not rerun by the fixer pass because none of their covered files changed (reused from the run recorded above — see *Post-review fixer pass* for the reused/affected classification).
- Task-owned changes after verification: `None` from the original implementation pass. The post-review fixer pass's own edits to `tests/system/tests/search.spec.ts` and this task packet were made, then followed by the fixer pass's
  own verification (`npx tsc --noEmit`, `npx prettier --check .`, and the whole-file `search.spec.ts` run above, all passing) with no task-owned file edited afterward.

### Dependency Decisions

- Runtime dependencies: `None`.
- Development dependencies: `None`. `@mui/material` stays pinned at `7.3.9`, unmoved, per *Out Of Scope*.

### Architecture Decisions

- **ADR-0012** implemented in full: Option A1 exactly — `ArrowRight` moves focus onto the existing nested Refill `IconButton`; `ArrowLeft`/`Escape` return focus to the row; `Enter`/`Space` activate natively; `aria-keyshortcuts`
  announces it; the row keeps one `menuitem` and one MUI roving-focus stop, structurally unchanged. Every standing obligation ADR-0012's `Consequences` placed on the remedy is discharged: discoverability actively addressed (not just
  the key binding); real-browser keyboard verification with a genuine negative-control probe; the new focus stop's otherwise-undefined states (`ArrowDown`/`ArrowUp`/`Home`/`End`) specified and measured, matching the row exactly; the
  version-scoping re-verification duty recorded in the code by symbol name, never by line number.
- **ADR-0004** followed: the Playwright real-backend run is the reachability proof; `RecentSearches.test.tsx`'s five new cases are explicitly scoped as static-contract-only, additive coverage, never cited as reachability evidence.
  No test was removed, skipped, weakened, or ignored — confirmed by `git diff --check` on both test files showing only additions.
- **ADR-0002** followed: no second component suite, no bespoke menu widget — the remedy is MUI's own `MenuItem`/`IconButton`/`Typography`, with hand-written focus management (imperative `.focus()` plus a replayed native
  `KeyboardEvent`) rather than a new widget.
- **ADR-0005** unaffected: `searchDescriptionParts`, `plainTextDescription`, and `describeSource` are byte-identical to `HEAD` (confirmed — the only diff in `RecentSearches.tsx` is inside the `MenuItem`/`IconButton`/`Menu` JSX and the
  two new `useRef` declarations; the description-building functions below them are untouched).
- **ADR-0006**: no human visual or accessibility acceptance created, implied, or re-dated. `F-SEARCH-RECENT.visual.status` stays `proposed`; the hint's `keyboard-refill-hint` state joins the acceptance FM-038 already left outstanding,
  additively, per ADR-0012's `Consequences`.
- `ADR REQUIRED` proposal triggered: `None`. No fundamental, unresolved architecture/contract/rollout/security/quality-strategy choice was encountered; ADR-0012 already settled the one this packet implements.

### Assumptions

- **Real-screen-reader verification is out of reach of this project's harness.** No NVDA/JAWS/VoiceOver automation exists in this repository's test infrastructure (FM-049 itself used Chromium's CDP `Accessibility.getFullAXTree` rather
  than a literal screen reader, for the same reason). This is why the `gaps` entry is narrowed rather than deleted, per the packet's own worked example of exactly this case.
- **The focus-ring color/width claim in this packet's Acceptance does not hold for `ButtonBase`-derived elements, discovered by direct measurement.** `app/theme.ts`'s `MuiCssBaseline` `:focus-visible` override sets
  `outline: 3px solid currentColor` at `outlineOffset: 3px` globally, but `@mui/material` `7.3.9`'s `ButtonBase/ButtonBase.js` gives every `ButtonBase` root (`Button`, `IconButton`, `ListItemButton`, and therefore both the Refill button
  and the row itself) its own unconditional `outline: 0`, generated as a higher-specificity compound class that wins the cascade for `outline-style`/`outline-width` (`outlineOffset` does still reach the element, since `ButtonBase`
  never sets that property). Verified directly in a real browser against both the new Refill button and an unrelated, pre-existing nav `ListItemButton` link (`{"tag":"A","matchesFocusVisible":true,"outlineStyle":"none","outlineWidth":
  "0px","outlineOffset":"3px"}`), confirming this is an app-wide `ButtonBase` characteristic, not something FM-050 introduced or can fix (`app/theme.ts` is outside *Files Allowed To Modify*, and fixing it is a repository-wide visual
  change with real user-observable surface across every button in the app, not a two-line quickfix). The test was corrected to assert what is actually true — `:focus-visible` genuinely matches and `outlineOffset: 3px` reaches the
  element — and to drop the `outline-style`/`outline-width` assertion, with the reasoning recorded in a comment beside it. **Corrected by a post-review fixer pass** (this Assumptions bullet originally overstated what that leaves proven:
  `matchesFocusVisible`/`outlineOffset` alone hold regardless of whether anything is actually painted — `outlineOffset` computes to `3px` even under `outline-style: none` — so they do not, by themselves, prove visible keyboard-focus
  indication, only a pseudo-class match and an inert computed property). The fixer pass identified and added the assertion for the actual rendering mechanism: `@mui/material` `7.3.9`'s `ButtonBase/ButtonBase.js` pulsates a `TouchRipple`
  (`.MuiTouchRipple-ripplePulsate`, `opacity: 0.3`, `.MuiTouchRipple-child`'s `background-color: currentColor`) on every `focusVisible && focusRipple` transition — true here, since `IconButton` passes `focusRipple: !disableFocusRipple`,
  which defaults `true` — and is the mechanism `Button.js`'s own prop doc names ("Without a ripple there is no styling for :focus-visible by default."). The test now asserts `.MuiTouchRipple-ripplePulsate` is attached on the focused
  button and its computed `opacity` is non-zero, in addition to the original `matchesFocusVisible`/`outlineOffset` assertions (both true and left in place, additively). This is weak (0.3 opacity, easy to miss in a static capture) but
  real, predates FM-050, and gives the criterion actual regression value it lacked before — it would catch a future `disableRipple`/`disableFocusRipple` that silently removed even this indicator. Recorded as a maintenance candidate
  under *Follow-Up Work*, corrected there too to name the ripple as the real mechanism rather than implying no indicator exists at all.
- **A deterministic two-entry fixture is achieved via `historyForSearching: 2`, not fixture isolation.** `History.getHistoryForSearching` (`core/src/main/java/org/nzbhydra/historystats/History.java`) orders by `time desc` and caps at
  this config value, so setting it to `2` makes the two searches this test submits the only two entries the frontend ever sees, regardless of history left by earlier tests in the same file/backend process — read directly from the
  Java source rather than assumed.
- **The pre-existing `SearchPage.tsx` double-submit defect FM-049 recorded is avoided, not fixed, by a full navigation between the two fixture submissions**, exactly as FM-049's own follow-up describes the defect (a stale mirrored
  `title` default surviving a same-session `SearchWorkspace` remount). `page.goto("ui/react?redirect=/")` between the two searches is a full page load, not the SPA `navigate()` the defect depends on, so it never exercises the buggy
  path.
- **Test iteration is recorded honestly rather than smoothed over**: two real defects were found and fixed in this task's own new test code during verification (the off-by-one hint bounding-box check, corrected to an exact DOM-order
  check; the focus-ring color/width assertion, corrected per the finding above; and a `openMenuByKeyboard()` helper bug where reopening the menu without first closing an already-open one let MUI's focus-containment pull focus back
  in). None of these were defects in `RecentSearches.tsx`'s implementation — every implementation-affecting assertion in the final, passing test is unchanged in substance from its first version, and `RecentSearches.tsx` itself was
  never edited during this debugging (only the test file and, separately and deliberately, the negative-control probe).

### Temporary Exceptions And Debt

- `None`.

### Registry And Documentation Updates

- `F-SEARCH-RECENT` (`docs/frontend-migration/FEATURES.yaml`): `target`, `tests`, `parity`, `selectors`, `task` (`FM-017`), `visual.applicability`, `visual.status` (`proposed`), `visual.note`, `visual.contract.setup`, and
  `visual.contract.viewports` are unchanged and confirmed still accurate. `visual.contract.states` gains `keyboard-refill-hint`; `visual.contract.geometry_checks` gains one entry for the hint's render-once/DOM-position/no-overflow
  contract at both viewports; `visual.evidence` unchanged (`tests/system/tests/search.spec.ts` already listed); `visual.snapshots` is a new field on this record holding exactly
  `tests/system/visual-evidence/F-SEARCH-RECENT/recent-search-keyboard-hint-desktop.png`; `visual.variances` unchanged (`[]` — no mock exists for this menu, so nothing is diverged from). No `decision`/`accepted_by`/`accepted_on` key
  added anywhere.
- **`gaps` is narrowed, not deleted**, because one half of the packet's discharge condition is unevidenced. Keyboard/assistive-technology *reachability* is now fully evidenced (the real-browser trace above, plus FM-049's already-
  recorded CDP accessibility-tree capture showing the button non-ignored/focusable/correctly-named): removed from the entry. What remains and is named explicitly: a real-screen-reader (NVDA/JAWS/VoiceOver) verification of the
  `aria-keyshortcuts` announcement and the visible hint's discoverability, which this project's test harness has no way to perform. `backlog` says so plainly and states that no task currently owns it, satisfying `README.md`'s
  *Registry Rules* ("name its next task or blocking ADR") honestly rather than by inventing a placeholder task ID or implying acceptance.
- `backlog` rewritten in full: names ADR-0012 as accepted and implemented by FM-050 (no further ADR blocks keyboard reachability), names the still-outstanding ADR-0006 visual acceptance (FM-038's superseded width contract plus this
  packet's one additive hint state, neither re-dated), and names the narrowed `gaps` item with no current task owner.
- `STATUS.md`: FM-050 moved from `## Upcoming` to `## Review`.
- For ADR-0006 visual records: `F-SEARCH-RECENT.visual.applicability` stays `applicable`, `visual.status` stays `proposed` (no lifecycle transition, no acceptance implied or re-dated). One new scoped state (`keyboard-refill-hint`) and
  one new geometry check were added, both additive to the existing contract; `contract.viewports` (`desktop`, `mobile`) unchanged and reused, not widened. One new snapshot added, captured via `captureVisualRegion` exactly as the
  packet specifies, so a human acceptor has something to look at. No variance added — there is no mock for this menu to diverge from, confirmed by search. `human acceptance pending` throughout. No behavioral or accessibility gate was
  implied by this visual evidence, and no visual or accessibility gate was implied by the behavioral/accessibility evidence above — they are recorded and reasoned about independently, per ADR-0006's `Consequences`.

### Follow-Up Work

- **Maintenance candidate for `/fm-quickfix`**: `None` sized appropriately for a quickfix arose from this task.
- **Proposed task packet candidate (not filed here — sizing only, per this task's own scope boundary):** the `ButtonBase` unconditional-`outline: 0` vs. `app/theme.ts`'s `MuiCssBaseline` `:focus-visible` override, described in full
  under *Assumptions*. **Corrected by a post-review fixer pass**: this bullet originally implied that no focus indicator exists at all for a `ButtonBase`-derived control once the CSS outline is suppressed. A fresh review, independently
  reproduced by the fixer pass, established that one does: `ButtonBase/ButtonBase.js` pulsates a `TouchRipple` (`.MuiTouchRipple-ripplePulsate`, `opacity: 0.3`) on `:focus-visible`, the mechanism `Button.js`'s own `disableRipple` prop
  doc names ("Without a ripple there is no styling for :focus-visible by default."). The accessibility concern this candidate names is therefore narrower than "no indicator": it is that the *only* app-wide indicator for every
  `ButtonBase` control is a 0.3-opacity pulsating ripple rather than a 3px solid outline, which is weak and easy to miss, not absent. This is still **not** a quickfix candidate — fixing it (raising the outline's specificity, or the
  ripple's opacity, or both) changes the rendered focus indicator on every `Button`/`IconButton`/`ListItemButton`/etc. across the whole application, a real, user-observable, app-wide visual and accessibility surface that would need its
  own visual-evidence and acceptance treatment under ADR-0006, not a two-line, no-behavioral-surface repair. Named here rather than fixed or proposed as a packet, since sizing and naming it is this task's obligation and choosing to file
  it is a task-designer decision outside this task's `Files Allowed To Modify`.
- The `SearchPage.tsx` `submit()` double-search defect FM-049 recorded remains unowned, unrelated, and not repaired here, per *Out Of Scope* — this task's new system test works around it (full navigation between the two fixture
  submissions) rather than exercising or fixing it.
- The real-screen-reader verification narrowed into `gaps` above: unowned by any task today; a future task should be scoped for it if/when NVDA/JAWS/VoiceOver automation becomes available to this project's harness.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`.

The reviewer's obligations here: confirm the reachability proof is a real-browser trace and not a component test; confirm the negative-control probe genuinely failed and that the restored file is byte-identical; confirm every state
specified under *Acceptance* for focus-on-the-button was measured and matches, rather than being recorded as a surprise; confirm the discoverability choice is stated and realized; confirm both accessible names, every `data-testid`, and
`SearchPage.test.tsx` are untouched; and confirm the `gaps` discharge is backed by the evidence rather than by deletion. A reviewer may not accept or re-date any ADR-0006 visual acceptance — the hint's presentation joins the acceptance
already outstanding on this record.
