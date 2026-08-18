# FM-049: Recent-Search Refill Keyboard Reachability Measurement

Status: done Owner: Feature IDs: F-SEARCH-RECENT Component IDs: None API IDs: None Depends on: None Blocks: FM-050

## Dependency Notes

This is a **measurement packet**. It establishes one fact and does not fix anything. `Depends on: None` is literal: FM-047 (`done`) recorded the concern but owns no part of it, and FM-038 (`done`) built the structure under
examination. Nothing is waiting on this packet's completion except the decision it may raise.

**Designer note (2026-08-18).** That decision now exists — ADR-0012, accepted, Option A1 — and its remedy packet is FM-050, so `Blocks` now names it. The dependency is a sequencing one: this packet owns the working-tree edits to
`F-SEARCH-RECENT`'s `gaps`/`backlog` that FM-050 discharges, and `README.md`'s *Parallel Work* rule forbids two live tasks owning the same registry record.

It exists because the last bullet under `MAINTENANCE.md`'s *Open candidates* — "Refill is plausibly not keyboard-reachable" — routes itself here, having failed the `/fm-quickfix` gate on two counts it states: the change would be
user-observable interaction semantics, and FM-038's single-row layout was an explicit repository-owner instruction recorded in `F-SEARCH-RECENT`'s `visual.note`.

The word in that bullet is **plausibly**. Both agents who raised it — the FM-047 designer and its implementer — reasoned it from MUI `MenuList`'s roving-focus behavior; neither pressed a key in a browser. Reasoning from library
behavior is not measurement, and this packet's first obligation is to remove the hedge.

## Outcome

Whether the recent-search Refill action is reachable and invocable by keyboard alone, and whether it is present as an actionable node in the browser's computed accessibility tree, is established by direct observation in a real browser
and recorded as durable evidence. If it is reachable, the concern is closed and nothing changes. If it is not, the gap is recorded in `F-SEARCH-RECENT` and the choice of remedy is escalated as `ADR REQUIRED`, unchosen.

## Boundary Rationale

**This is deliberately a measurement-only packet, and deliberately smaller than a vertical capability.** The unit of work is the size of the open question. The remedy is not bundled in because the remedy is not yet knowable: the set of
viable approaches depends on what the measurement finds (an arrow-key gap, a `Tab` gap, an accessibility-tree gap, or none of them are different problems with different solution spaces), and the approaches that remain viable all
change interaction semantics on a layout the repository owner instructed directly. Designing an implementation against an unmeasured premise is exactly what produced the hedge this packet removes.

It is not split from anything: there is no adjacent packet to fold it into (`FM-047` and `FM-038` are both `done`), and enlarging it by bundling unrelated recent-search work is forbidden by `README.md`'s *Creating Task Batches* rules.
The follow-up remedy, if one is needed, is a separate packet by construction — it cannot be designed until a human has decided which approach it implements.

## Decision Dependencies

- Accepted ADRs governing this task: **ADR-0012** (`decisions/ADR-0012-recent-search-refill-keyboard-reachability.md`, accepted 2026-08-18, **Option A1**) resolves the decision this packet escalated: `ArrowRight` moves focus onto the
  existing nested Refill `IconButton`, `ArrowLeft`/`Escape` returns focus to the row, `Enter`/`Space` activates natively, and `aria-keyshortcuts` on the row announces it; the row keeps one `menuitem` and one roving-focus stop. It
  governs this packet only in that it closes it: ADR-0012's `Consequences` states that "the remedy is a later task packet, not part of FM-049", that this packet "implemented no remedy by design", and that `core/ui-react` and
  `tests/system` stay byte-identical to baseline. The remedy is **FM-050**, which carries every standing obligation ADR-0012 places on it. Nothing in the measurement, its disposition, or its recorded evidence changes.
  **ADR-0004** (testing and parity) is the central one for the measurement itself. Its "React interactions and accessibility receive component tests" clause does **not** discharge this question — jsdom has no focus ring, no
  roving-focus implementation, and no accessibility tree, so `RecentSearches.test.tsx` cannot establish or refute reachability at all. Its Playwright clause and its "behavioral, accessibility, and visual gates are independent" clause
  are what govern here. **ADR-0006** (visual parity policy) governs only as a constraint: it reserves baseline and variance acceptance for an explicit human decision, which this task must not simulate, and it is the mechanism by which
  any remedy that alters the recorded single-row layout would need fresh acceptance. **ADR-0002** (frontend stack) constrains every candidate remedy to MUI's own primitives — no second component suite, no bespoke menu widget.
  **ADR-0005** (recent-history criteria contract) governs the `Label: value, Label: value` description string that both accessible names are built from; it is unaffected here and must stay unaffected.
- This task defines no new visual contract, no new state, no new geometry check, no new named viewport, no new snapshot, and no new variance. `F-SEARCH-RECENT` stays `visual.status: proposed`, and the human re-acceptance FM-038 left
  outstanding stays outstanding and un-re-dated.
- Proposed or rejected ADRs blocking this task: **None.** ADR-0012 was the blocking proposal and is now accepted, so it moves to the accepted list above and this packet is no longer `blocked`. Two corrections ADR-0012 records bear on
  this packet's own escalation text, which is deliberately left as written: no option withdraws an acceptance, since `F-SEARCH-RECENT` has been `visual.status: proposed` since FM-038, so the non-recommended options enlarge and further
  defer an acceptance that is already outstanding; and `visual.note` attributes the owner's explicit instruction to every entry being readable in full, recording the two-`menuitem`-to-one collapse as something the same change also did,
  so a two-row layout would not have contradicted the instruction actually recorded. The remedy is FM-050, designed against the accepted option — never this packet, which stays measurement-only.

## Files Allowed To Modify

- `tests/system/tests/search.spec.ts` — **additively, and only on the reachable branch.** One new `test(...)` block asserting the keyboard path that was observed to work. Do not alter, re-order, or re-format any existing test; the file
  is Prettier-clean as of `ba4acd521` and must stay so. **On the unreachable branch this file is not touched at all** — see the first bullet of *Out Of Scope* for why a test asserting the defect is forbidden.
- `docs/frontend-migration/FEATURES.yaml` — **only** `F-SEARCH-RECENT`'s `gaps` and `backlog` fields, and only on the unreachable branch. Not its `visual` block (any field of it), not `parity`, not `tests` (`tests/system/tests/search.spec.ts`
  is already listed and stays listed either way), not `selectors`, not `task`, and not one character of any other record.
- `docs/frontend-migration/MAINTENANCE.md` — **only** the deletion of the single *Open candidates* bullet beginning "**Refill is plausibly not keyboard-reachable.**", identified by that opening text rather than by position or count,
  since that list changes between packets. Delete it only in the same change that establishes its successor authority (nothing to record, on the reachable branch; the `gaps`/`backlog` entry, on the unreachable one), so the defect is
  never unowned. Do **not** add a ledger entry above it: that section records `/fm-quickfix` fixes and this is not one.
- `docs/frontend-migration/STATUS.md` and this task packet.

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- **Any change to `core/ui-react/src/features/search/history/RecentSearches.tsx`.** This packet measures the component; it does not repair it. If the measurement confirms the gap, the repair is a later packet implementing a
  human-decided approach. An implementer who finds themselves editing this file has left the task.
- **Any change to `core/ui-react/src/features/search/history/RecentSearches.test.tsx` or `SearchPage.test.tsx`.** A jsdom component test cannot establish roving-focus behavior, cannot observe a real focus ring, and has no accessibility
  tree; adding one here would produce evidence that looks like proof and is not. This is a scope boundary, not a coverage gap — ADR-0004 assigns this class of evidence to Playwright.
- **A committed test that asserts Refill is unreachable.** On the unreachable branch, no such assertion is added anywhere. It would enshrine the defect as expected behavior, and the remedy packet would then have to delete a passing
  test — which ADR-0004 forbids ("No test may be removed, skipped, weakened, or ignored"). The unreachable branch's durable artifact is the `gaps` entry and this packet's recorded evidence, not a test.
- **Choosing, prototyping, or recommending-by-implementation any remedy.** Enumerating options with tradeoffs in the handoff is required; picking one is not available to any agent here.
- **Removing or renaming any `data-testid`.** `recent-searches-trigger` and `recent-search-entry` are compatibility contracts under `README.md`'s *Registry Rules*, and no branch of this task needs to touch either.
- **Any human visual or accessibility acceptance.** No `decision`, `accepted_by`, or `accepted_on` key is added anywhere; no existing acceptance metadata is edited, re-dated, or restored; `F-SEARCH-RECENT` keeps `visual.status: proposed`.
  A measurement is evidence, never acceptance.
- **The rest of `MAINTENANCE.md`** — every ledger entry, and any other *Open candidates* bullet.

## Context To Read

- `MAINTENANCE.md`'s *Open candidates* — the Refill bullet verbatim, and the section preamble defining what the list is.
- `README.md` — *Choosing A Mechanism*, *Registry Rules*, *Verification Integrity*, *Agent Autonomy And Escalation*.
- `decisions/ADR-0004-testing-and-parity.md` in full; `decisions/ADR-0006-visual-parity-policy.md`'s `Consequences` (who may accept a baseline or variance); `decisions/ADR-0005-recent-history-criteria-contract.md`.
- `core/ui-react/src/features/search/history/RecentSearches.tsx` in full — read-only. The row is one `MenuItem` (`aria-label={`Repeat: ${description}`}`, `data-testid="recent-search-entry"`, `draggable`) containing a `Tooltip`-wrapped
  `IconButton` (`aria-label={`Refill: ${description}`}`, `onClick` calling `event.stopPropagation()`).
- `F-SEARCH-RECENT` in `docs/frontend-migration/FEATURES.yaml` in full, especially the `visual.note`'s sentence recording the repository owner's explicit single-row instruction. That sentence is the reason this is a decision and not a bugfix.
- `tasks/FM-038-recent-searches-single-row-menu.md` — its Outcome/Acceptance description of the single-`menuitem` structure, and its handoff's claim that "keyboard/ARIA accessibility ... was verified independently", to judge what that
  verification actually covered.
- `tasks/FM-047-recent-search-refill-locator-repair.md` — its finding that Playwright's `queryRole` "matches roles per element with no accessibility-tree pruning". This is load-bearing here: **`getByRole("button", {name: /^Refill:/})`
  resolving proves nothing about what assistive technology can see**, and must not be cited as accessibility evidence.
- `tests/system/tests/search.spec.ts:548-610` — the existing `should refill and repeat complete recent React search criteria` test, which is the closest existing setup and the one whose fixture pattern to reuse.
- The installed MUI sources, read only *after* observing behavior, to explain what was observed: `core/ui-react/node_modules/@mui/material/Menu/Menu.js`'s `handleListKeyDown`, and `MenuList/MenuList.js`'s `handleKeyDown` and its
  `moveFocus` helper. **Cite these by symbol name and quoted text, never by line number** — `node_modules` coordinates rot between installs, which is precisely how FM-047 acquired two stale citations.
- WAI-ARIA 1.2's `menuitem` role, specifically its *Children Presentational* value. If it is `True`, a conforming user agent prunes the nested `IconButton` from the accessibility tree regardless of focusability, which changes the remedy
  space materially. Treat that as a claim to verify against the computed tree and the spec text, not as a fact this packet has established.

## Acceptance

- **Reachability is measured in a real browser, before anything else.** With the recent-search menu opened *by keyboard* from `recent-searches-trigger` and at least **two** deterministic entries present (two distinct submitted searches
  in the fixture; one entry makes arrow traversal unobservable), record a focus trace: for each of `ArrowDown`, `ArrowUp`, `Home`, `End`, `Tab`, `Shift+Tab`, `Enter`, `Space`, and the type-ahead key `r`, the key pressed, the resulting
  `document.activeElement` (tag, computed role, accessible name, `data-testid`), and whether the menu was still open afterwards. The trace must state explicitly, for each key, whether focus ever landed on a node whose accessible name
  matches `/^Refill:/`.
- **The measurement is proven capable of a positive result.** The same trace must show the *control* succeeding: `ArrowDown`/`ArrowUp` moving focus between the two `recent-search-entry` rows, and `Enter` on a focused row invoking Repeat
  (observed as the search request the existing test already asserts). A negative finding produced by a harness that cannot detect reachability when it exists is worthless; this is the same "prove the gate bites" obligation FM-048 carried.
- **The computed accessibility tree is inspected, not inferred.** Capture the browser's real accessibility tree for the open menu — Chromium DevTools Protocol `Accessibility.getFullAXTree` via `page.context().newCDPSession(page)` is the
  available mechanism, and `playwright.config.ts` runs a single Chromium project — and record the `menu` node's subtree verbatim: the `menuitem` node for each entry, its name, and whether any descendant node with role `button` and name
  `Refill: …` exists, is ignored, or is absent. Playwright role locators are explicitly **not** acceptable as evidence for this criterion, for the FM-047 reason cited under *Context To Read*.
- **The disposition follows one stated rule, applied to the recorded evidence.** Refill counts as **reachable** only if *both* halves hold: a keyboard-only user can move focus to it and invoke it using keys a menu user would try, without
  the menu closing first; **and** it exists as a non-ignored, actionable node in the computed accessibility tree. If either half fails, the disposition is **unreachable**. Record which half or halves failed, quoting the trace line and the
  tree node that decide it. Do not soften a partial failure into a pass.
- **Reachable branch — close it and change nothing else.** Add exactly one `test(...)` to `search.spec.ts` that drives the observed keyboard path end to end (open the menu by keyboard, traverse by keyboard to Refill, invoke it by keyboard,
  assert the search form is refilled and no search was issued — the discriminating assertion, since Repeat issues one and Refill must not). Confirm `F-SEARCH-RECENT` needs no change and say so explicitly rather than silently. Delete the
  `MAINTENANCE.md` bullet. Mark the task `review`. `RecentSearches.tsx` stays byte-identical to `HEAD`.
- **Unreachable branch — record the gap, then stop.** Add a `gaps` entry to `F-SEARCH-RECENT` naming the capability precisely (the refill action is invocable by pointer and drag but not by keyboard or assistive technology), and set
  `backlog` to name the blocking decision rather than a fix, per `README.md`'s *Registry Rules* ("name its next task or blocking ADR"). Delete the `MAINTENANCE.md` bullet in that same change, so the fact moves to its authoritative record
  instead of being duplicated. Then mark the task **`blocked`**, list it under `## Blocked` in `STATUS.md`, and report **`ADR REQUIRED`** using the decision question and options set out below verbatim, extended with what the measurement
  found. Do not implement, do not prototype, and do not recommend by elimination beyond the honest tradeoffs. `RecentSearches.tsx` and `search.spec.ts` both stay byte-identical to `HEAD`.
  **Designer note (2026-08-18):** this criterion was met as written and is now discharged. The `blocked` state and the `## Blocked` listing it required were correctly entered, the escalation was raised, and ADR-0012 accepted Option A1,
  so the packet moves to `review` for the independent review its *Fresh Review* section requires. No measurement obligation above is relaxed, and no remedy becomes available to this packet.
- **The options are carried into the handoff with their acceptance cost stated.** For each option below, state whether it would require fresh ADR-0006 human acceptance and why, based on whether it alters what the owner explicitly asked
  for (one `menuitem` per search, each entry readable in full) as recorded in `F-SEARCH-RECENT`'s `visual.note`.
- **Environment is recorded.** `@mui/material` version, Playwright version, and the actual Chromium build used, so the finding can be re-judged after an upgrade. A roving-focus behavior is a library behavior; the measurement is only as
  durable as the versions it was taken against.
- **No `data-testid` is removed or renamed, in either branch.** Confirm mechanically by diffing the `data-testid` literals in the working tree against `HEAD`, not by inspection.

## The Escalation This Packet May Raise

**Resolved 2026-08-18 by ADR-0012 (accepted, Option A1).** This section is preserved verbatim as the pre-formed question the implementer was required to raise and did raise; it is not reworded, and ADR-0012 — not this section — is now
the authority on the decision question, its option space, and its outcome. ADR-0012 records six options; this section's five are the set the packet pre-formed before the measurement, and ADR-0012 added "accept the gap and leave it
recorded" as an honestly available sixth. The remedy is FM-050.

Raise this only if the measurement disposition is **unreachable**. It is stated here so the implementer escalates a pre-formed question rather than inventing one, and so the option space is not narrowed by whoever happens to hit it.

**Decision question.** A single recent-search `menuitem` carries two user actions — Repeat on row activation, Refill on a nested `IconButton` — and the single-row structure is an explicit repository-owner instruction recorded in
`F-SEARCH-RECENT`'s `visual.note`. How should the Refill capability be made reachable by keyboard and by assistive technology?

**Options, with the tradeoffs that are already visible.** The measurement may add to or eliminate from this list; it may not silently replace it.

1. **Keyboard binding on the existing single focus stop.** Keep one `menuitem`, one roving-focus stop, and the row exactly as it renders; bind a modifier chord on the row (a bare letter is unavailable — `MenuList`'s `handleKeyDown`
   consumes single printable keys for type-ahead) to invoke refill, and announce it in the row's accessible description. Preserves the owner's instruction literally and changes no pixel. Cost: a menu chord is non-standard and
   undiscoverable without the announcement, and the announcement lengthens every row's accessible name.
2. **Two accessible actions inside one visual row.** Restructure so both actions are separately exposed — which, if ARIA's *Children Presentational* value for `menuitem` is `True`, means the row can no longer be a `menuitem` at all.
   Preserves the single visual row; contradicts the recorded "one `menuitem` per search" structure and changes the `Repeat: <description>` accessible-name contract that `search.spec.ts` and `RecentSearches.test.tsx` both assert.
   **Requires fresh ADR-0006 acceptance.**
3. **Relocate Refill out of the menu.** Repeat stays on row activation; refill becomes its own keyboard-reachable affordance elsewhere in the workspace actions. Leaves the instructed row untouched and gives refill an unambiguous
   accessible home; moves a capability the user currently finds inside the menu, so it is a product change. **Requires fresh ADR-0006 acceptance.**
4. **Row activation opens a two-action step** (submenu or dialog offering Repeat and Refill). One focus stop, one visual row, both actions conforming; costs every user an extra step, including pointer users, unless applied conditionally,
   which is itself a semantics split. **Requires fresh ADR-0006 acceptance.**
5. **Revert to two rows.** Technically the cheapest and unambiguously conforming; directly undoes the instruction the owner gave in the live FM-038 session and restores the layout they rejected. Only the repository owner can choose it.
   **Requires fresh ADR-0006 acceptance and a reversal of the original instruction.**

**Recommendation to carry into the escalation:** Option 1, *if and only if* the measurement shows the gap is a focus-navigation gap and the accessibility tree otherwise exposes the row's two actions adequately; it is the only option that
leaves the owner's explicit instruction untouched. If the tree prunes the nested control entirely, Option 1 does not solve the assistive-technology half and the real choice narrows to Options 2–5, all of which need the owner. State which
case the evidence puts the decision in; do not choose between them.

## Verification

Prerequisites and required service state: `tests/system` runs against a **real JVM backend plus mockserver**, not a Vite dev server. Use the documented launcher, which builds the `core` and `mockserver` exec JARs with Maven and starts
the sonarr/radarr Docker fixtures. Maven, a JDK, Docker, and installed Playwright Chromium browsers must all be available. Record any command as blocked if the environment cannot provide them — never imply it passed.

Exploratory measurement runs may use a scratch spec or the `playwright-cli` skill; keep any scratch file under the git-ignored `tests/system/.playwright-cli/` and confirm it is gone at handoff.

- Working directory: `/home/sist/projects/nzbhydra2`
- `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/search.spec.ts` — the whole file passes: **14 tests on the unreachable branch** (unchanged from FM-047's recorded tally), **15 on the reachable branch**.
  Record per-test results, not just the summary. A `--grep`-narrowed run does not satisfy this; narrowed runs used while iterating are recorded as such.
- `git diff -- core/ui-react` — empty. In particular `git diff -- core/ui-react/src/features/search/history/RecentSearches.tsx` is empty; this task changes no React source in either branch.
- `git diff --check` — no whitespace errors.
- `git diff --stat` — on the unreachable branch, exactly `docs/frontend-migration/FEATURES.yaml`, `MAINTENANCE.md`, `STATUS.md`, and this packet; on the reachable branch, `tests/system/tests/search.spec.ts`, `MAINTENANCE.md`,
  `STATUS.md`, and this packet. Anything else is out of scope and an escalation.
- Working directory: `/home/sist/projects/nzbhydra2/tests/system`
- `npx tsc --noEmit` — succeeds with no errors.
- `npx prettier --check .` — passes. The baseline has been clean since `ba4acd521`, so a failure here is this task's own and must be fixed by formatting only the line range it added, never by reformatting the file.
- Working directory: `/home/sist/projects/nzbhydra2/core/ui-react`
- `npm run validate:migration` — prints `Migration registries and task metadata are valid.` and exits 0, with FM-049 placed in the `STATUS.md` section its status requires (`## Blocked` when `blocked`; `## Review` when `review`).
- Confirm task-owned changed files are all listed under Files Allowed To Modify.
- Confirm verification leaves no unexpected generated or modified files — no Playwright report, trace, screenshot, or scratch spec left in the tree.

The React quality chain (`typecheck`, `lint`, `format:check`, `test`, `build`, `check:api`) is **not required and must be recorded as not run**, with this reason: no file under `core/ui-react/` changes in either branch, and the one
registry file this task may touch is gated by `validate:migration`. This is ADR-0004's independent-gates principle applied honestly, not a relaxation of *Verification Integrity*.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate. Include the full focus trace and the accessibility-tree excerpt as evidence — they are the deliverable. Mark the task `review` only on the
reachable branch and only after required verification succeeds; on the unreachable branch mark it `blocked` and report `ADR REQUIRED`. An implementer must never mark a task `done`.

**Designer note (2026-08-18):** the unreachable branch ran, the handoff below is complete, and the escalation it raised is resolved by ADR-0012. The packet is therefore `review` — the measurement is finished and no implementation work
remains in it, but no independent review has ever been recorded against it, and only the coordinator may mark a task `done`. Nothing below this line is edited: it is the implementer's attested evidence.

### Outcome

**Disposition: unreachable.** Measured directly in a real Chromium browser (Chrome for Testing 151.0.7922.34, Playwright 1.62.1) against a real JVM backend plus mockserver. With the recent-search menu opened by keyboard (focus
`recent-searches-trigger`, then `Enter`) and two deterministic entries present, a full keyboard focus trace over `ArrowDown`/`ArrowUp`/`Home`/`End`/`Tab`/`Shift+Tab`/`Enter`/`Space`/type-ahead `r` shows focus never lands on a node
whose accessible name matches `/^Refill:/` under any tested key. `ArrowDown`/`ArrowUp`/`Home`/`End` only ever move focus among the two `recent-search-entry` `menuitem` rows (control-confirmed positive: this is real, working roving
focus). `Tab` and `Shift+Tab` each close the menu and return focus to `recent-searches-trigger`, before focus could reach the nested `Refill` `IconButton`. `Enter` on a focused row invokes Repeat and issues a real search
(control-confirmed positive: the harness can detect a genuine activation), then closes the menu the same way. `Space` behaves identically to `Enter` (also invokes Repeat and closes the menu). Type-ahead `r` does not move focus at all
(both accessible names start with `Repeat: `, so it does not discriminate, but it never lands on Refill either). Half one of the disposition rule — reachable focus-and-invoke without the menu closing first — **fails** for every
tested key.

Half two — a non-ignored, actionable accessibility-tree node — **holds**. The real computed accessibility tree (Chromium DevTools Protocol `Accessibility.getFullAXTree`, captured via `page.context().newCDPSession(page)`) shows the
nested `IconButton` as its own `button` node, `ignored: false`, `focusable: true`, with the correct accessible name `Refill: <description>`, as a child of the `menuitem` node — not pruned. This refutes the WAI-ARIA "Children
Presentational" concern the packet flagged as unverified: per a GitHub `w3c/aria` issue (#1711, raised by Scott O'Hara) and corroborating secondary references, the WAI-ARIA role-characteristics table lists `Children Presentational:
True` for `menuitemcheckbox` and `menuitemradio`, but **not** for the base `menuitem` role used here — consistent with what Chromium's tree actually exposes.

Because the packet's rule requires **both** halves and half one fails, the disposition is **unreachable** — not a partial pass. The blocking half is keyboard focus traversal, not accessibility-tree exposure.

Root causes, confirmed against the installed MUI 7.3.9 sources (cited by symbol and quoted text, not line number, per the packet's FM-047-citation-rot caution):

- **`Tab`/`Shift+Tab` close the menu.** `Menu.js`'s `handleListKeyDown` is wired as the `list` slot's `onKeyDown` (`onKeyDown: event => { handleListKeyDown(event); handlers.onKeyDown?.(event); }`) and reads:
  ```js
  const handleListKeyDown = event => {
    if (event.key === 'Tab') {
      event.preventDefault();
      if (onClose) {
        onClose(event, 'tabKeyDown');
      }
    }
  };
  ```
  `Tab` is intercepted, `preventDefault()`d, and closes the menu via `onClose(event, 'tabKeyDown')` — it never reaches the nested `IconButton`, which sits right after the row in DOM order. This matches the designer's hypothesis
  exactly and is the mechanism observed for both `Tab` and `Shift+Tab`.
- **Arrow-key roving focus never visits nested descendants.** `MenuList.js`'s `moveFocus` walks the list via `nextItem`/`previousItem`, both of which traverse `item.nextElementSibling` / `item.previousElementSibling` relative to
  the `<ul>`'s direct children:
  ```js
  function nextItem(list, item, disableListWrap) {
    if (list === item) {
      return list.firstChild;
    }
    if (item && item.nextElementSibling) {
      return item.nextElementSibling;
    }
    return disableListWrap ? null : list.firstChild;
  }
  ```
  Sibling traversal only ever moves between the `<li>` rows themselves; it has no path into a row's own children, so it structurally cannot land on the nested `Refill` button. This matches the designer's `MenuList` roving-focus
  hypothesis exactly.

`RecentSearches.tsx` is byte-identical to `HEAD` (confirmed by SHA-256, see Verification Basis) — this packet measured, and changed nothing.

### Files Modified

- `docs/frontend-migration/FEATURES.yaml` — `F-SEARCH-RECENT`'s `gaps` (added the keyboard/AT-unreachability finding) and `backlog` (rationale extended to name the blocking ADR decision this packet raises). No other field of this
  record, and no other record, touched. `visual` block untouched.
- `docs/frontend-migration/MAINTENANCE.md` — deleted the single *Open candidates* bullet beginning "**Refill is plausibly not keyboard-reachable.**", identified by its opening text. No ledger entry added (this is not a `/fm-quickfix`
  fix). No other line touched.
- `docs/frontend-migration/STATUS.md` — FM-049 moved from `## Upcoming` to `## Blocked`; its narrative paragraph rewritten to record the measurement outcome, disposition, and escalation instead of the pre-measurement framing.
- `docs/frontend-migration/tasks/FM-049-recent-search-refill-keyboard-reachability-measurement.md` — this packet: `Status: ready` → `Status: blocked`, and this Handoff section.
- Scope confirmation: all four paths are within `Files Allowed To Modify`. `git status --short` reports exactly these four paths (three modified, one new/untracked — this packet itself) and nothing else. `git diff -- core/ui-react` and
  `git diff -- tests/system` are both empty. No pre-existing unrelated user changes were present at baseline (`Unrelated pre-existing user paths: none`, per the coordinator), and none were touched.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: `@playwright/test 1.62.1` (Chromium build: Chrome for Testing `151.0.7922.34`, revision `1234`, per `playwright-core/browsers.json`), `@mui/material` / `@mui/icons-material` `7.3.9`, `TypeScript 5.8.3`,
  Apache Maven `3.9.12`, GraalVM CE/OpenJDK `25.0.4`, Docker Engine `29.7.2`, Python `3.14.6`.

### Verification Evidence

| Working directory | Command | Result |
|-------------------|---------|--------|
| `/home/sist/projects/nzbhydra2` | `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/search.spec.ts` | **Passed. Exit 0. `14 passed (26.7s)` — the whole file, no `--grep` narrowing.** Per-test results below. |
| `/home/sist/projects/nzbhydra2` | `git diff -- core/ui-react` | Passed. Empty. |
| `/home/sist/projects/nzbhydra2` | `git diff -- core/ui-react/src/features/search/history/RecentSearches.tsx` | Passed. Empty. |
| `/home/sist/projects/nzbhydra2` | `git diff -- tests/system` | Passed. Empty (unreachable-branch requirement: `search.spec.ts` untouched). |
| `/home/sist/projects/nzbhydra2` | `git diff --check` | Passed. No whitespace errors (an initial extra trailing blank line in `MAINTENANCE.md` was caught by this check and corrected before this record). |
| `/home/sist/projects/nzbhydra2` | `git diff --stat` | Passed. Exactly `docs/frontend-migration/FEATURES.yaml`, `docs/frontend-migration/MAINTENANCE.md`, `docs/frontend-migration/STATUS.md` (the packet itself is untracked/new, so `--stat` does not list it; `git status --short` confirms it). |
| `/home/sist/projects/nzbhydra2/tests/system` | `npx tsc --noEmit` | Passed. Exit 0, no diagnostics. |
| `/home/sist/projects/nzbhydra2/tests/system` | `npx prettier --check .` | Passed. `All matched files use Prettier code style!` |
| `/home/sist/projects/nzbhydra2/core/ui-react` | `npm run validate:migration` | Passed. `Migration registries and task metadata are valid.` |

Per-test results for the `search.spec.ts` run (14/14, unreachable-branch tally, unchanged from FM-047):

1. should search configured indexers and render their results — passed (1.4s)
2. should save, reopen, rerun, and delete a React saved search with legacy comparison — passed (2.5s)
3. should retain Spring stats-role protection for saved-searches — passed (475ms)
4. should render the React search workspace and preserved result selectors at desktop and mobile widths — passed (921ms)
5. should provide deterministic React workspace visual evidence across desktop and mobile — passed (4.7s)
6. should render deterministic STOMP progress in the React search modal — passed (1.4s)
7. should submit the explicit React indexer selection in both presentations — passed (4.3s)
8. should refill and repeat complete recent React search criteria — passed (2.6s)
9. should warn when indexer API hit or download limits are nearly exhausted — passed (526ms)
10. should preselect configured source quick filters — passed (926ms)
11. should apply later quick filters after deselecting quality and other filters — passed (1.8s)
12. should select a movie autocomplete result and search by TMDB identifier — passed (943ms)
13. should select a movie autocomplete result through the React route and search by TMDB identifier — passed (1.4s)
14. should select a TV autocomplete result with the keyboard and search by TVDB identifier — passed (2.4s)

**Full focus trace** (exploratory measurement, real browser, real backend, two deterministic `recent-search-entry` rows named by distinct random UUID-suffixed queries; captured with a scratch spec under the git-ignored
`tests/system/.playwright-cli/`, deleted before this handoff — confirmed gone via `ls`):

| Key | `document.activeElement` (tag / role / accessible name / testid) | Menu open after | Landed on `/^Refill:/`? |
|---|---|---|---|
| *(open by keyboard: focus trigger, `Enter`)* | `LI` / `menuitem` / `Repeat: …` / `recent-search-entry` | Yes | No |
| **`Enter` (control)** | closes to `BUTTON` / `recent-searches-trigger` (a real search was issued — `ISSUED:200`) | No | No — activates the row, doesn't reach Refill |
| `ArrowDown` (control) | `LI` / `menuitem` / `Repeat: …` (other row) / `recent-search-entry` | Yes | No |
| `ArrowDown` (control) | `LI` / `menuitem` / `Repeat: …` (wraps back) / `recent-search-entry` | Yes | No |
| `ArrowUp` (control) | `LI` / `menuitem` / `Repeat: …` (previous row) / `recent-search-entry` | Yes | No |
| `End` | `LI` / `menuitem` / `Repeat: …` (last row) / `recent-search-entry` | Yes | No |
| `Home` | `LI` / `menuitem` / `Repeat: …` (first row) / `recent-search-entry` | Yes | No |
| `r` (type-ahead) | `LI` / `menuitem` / `Repeat: …` (unchanged — both names start with "Repeat: ") / `recent-search-entry` | Yes | No |
| `Tab` | closes to `BUTTON` / `recent-searches-trigger` | No | No |
| `Shift+Tab` | closes to `BUTTON` / `recent-searches-trigger` | No | No |
| `Space` | closes to `BUTTON` / `recent-searches-trigger` (a real search was issued — `SEARCH-ISSUED`) | No | No |

No key, in any position of the trace, ever produced an `activeElement` whose accessible name matched `/^Refill:/`.

**Accessibility-tree excerpt** (Chromium DevTools Protocol `Accessibility.getFullAXTree`, menu reopened by keyboard immediately before capture):

```
menu "Recent searches" (ignored: false)
  menuitem "Repeat: Category: All, Source: Internal, Query: measure-a-…" (ignored: false)
    button "Refill: Category: All, Source: Internal, Query: measure-a-…" (ignored: false, focusable: true)
    none (ignored: true)               <- presentational wrapper around the label's static-text runs
      StaticText/InlineTextBox × N     <- "Category", ":", " ", "All", ", ", "Source", … (the visible label text)
  menuitem "Repeat: Category: All, Source: Internal, Query: measure-b-…" (ignored: false)
    button "Refill: Category: All, Source: Internal, Query: measure-b-…" (ignored: false, focusable: true)
    none (ignored: true)
      StaticText/InlineTextBox × N
```

Both `menuitem` nodes are non-ignored with the expected `Repeat: <description>` name. Both nested `button` nodes (the `Refill` `IconButton`s) are **non-ignored, focusable, and carry the correct `Refill: <description>` accessible
name** — present as real, actionable nodes in the computed tree, not pruned. The `Typography` label wrapper is its own `none`/presentational node (an unrelated, expected layout artifact of the label markup), and does not affect the
`Refill` button's exposure. `cdp.send("Accessibility.getFullAXTree")` was used directly; no Playwright role locator was used as evidence for this criterion.

### Verification Basis

- Baseline: `07dec83a8564df2f315b515aec537f8c6ee55041`.
- Command coverage:
  - `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/search.spec.ts`: `tests/system/tests/search.spec.ts` (test file, unchanged) and `core/ui-react/src/features/search/history/RecentSearches.tsx`
    (implementation file under measurement, unchanged) are the files whose contents affect this evidence.
  - `npx tsc --noEmit`, `npx prettier --check .` (in `tests/system`): all files under `tests/system` (unchanged as a whole — this task touches none of them).
  - `npm run validate:migration` (in `core/ui-react`): `docs/frontend-migration/FEATURES.yaml`, `docs/frontend-migration/MAINTENANCE.md`, `docs/frontend-migration/STATUS.md`, and this task packet (all task-owned; changed).
- File-content manifest:
  - `core/ui-react/src/features/search/history/RecentSearches.tsx`: `47a8033050edf4995ab6ab867dce88cd19995cd8730125d3a11d4e306a7d5f1d` — matches `git show HEAD:…` byte-for-byte (confirmed).
  - `tests/system/tests/search.spec.ts`: `f699cd10bbbde17c0246c676c6aed5755f8316a64d077363386ae803f6d75385` — matches `git show HEAD:…` byte-for-byte (confirmed).
  - `docs/frontend-migration/FEATURES.yaml`, `docs/frontend-migration/MAINTENANCE.md`, `docs/frontend-migration/STATUS.md`, this packet: documentation-only, excluded from the manifest per the template's "exclude task-packet and
    lifecycle documentation-only edits" instruction.
- Completed after the last change to each command's listed files: **yes** for all commands — the `search.spec.ts`/`tsc`/`prettier` commands were run after confirming `RecentSearches.tsx` and `search.spec.ts` are unchanged from
  `HEAD`, and `validate:migration` was run after the final `FEATURES.yaml`/`MAINTENANCE.md`/`STATUS.md` edits (including the whitespace fix to `MAINTENANCE.md`).
- Task-owned changes after verification: `None`. No task-owned file was edited after the commands above were run.

### Dependency Decisions

- Runtime dependencies: `None`.
- Development dependencies: `None`.

### Architecture Decisions

- **ADR-0004** followed: the Playwright real-backend run and the CDP accessibility-tree capture are the evidence class it assigns to this question; no jsdom/component test was added or relied on for reachability or accessibility
  (both are explicitly barred by the packet's *Out Of Scope*, consistent with ADR-0004's independent-gates principle). No test was removed, skipped, weakened, or ignored.
- **ADR-0006** followed: no new visual contract, state, geometry check, viewport, snapshot, or variance was defined; `F-SEARCH-RECENT` stays `visual.status: proposed`; no `decision`/`accepted_by`/`accepted_on` key was added, edited,
  or re-dated.
- **ADR-0002** is not implicated: no candidate remedy was chosen, prototyped, or implemented.
- **ADR-0005** unaffected: the `Label: value, Label: value` criteria-description string this packet's fixture entries carry (e.g. `Repeat: Category: All, Source: Internal, Query: …`) was only read as evidence, never altered.
- **`ADR REQUIRED` proposal triggered**: yes, this task's own escalation — see below. No ADR ID exists yet; the coordinator starts the proposal process from this handoff.

### Assumptions

- The packet's disposition rule ("reachable only if both halves hold") was applied literally: since the keyboard-traversal half fails for every tested key, the disposition is unreachable regardless of the accessibility-tree half
  holding. No partial-pass reading was used.
- `document.activeElement`'s `role` was read from the DOM `role` attribute (or `aria-haspopup` for the trigger button, which carries no explicit `role`) rather than a computed-role API, since the trace's job is to identify *which*
  element keyboard focus is on, not to re-derive accessibility semantics — the CDP accessibility-tree capture is the authoritative source for computed role/exposure evidence, per the packet's own division of the two criteria.
- Two prior local scratch-harness pitfalls, encountered and resolved while designing the measurement, are recorded here as assumptions/corrections rather than product findings because both trace to the harness, not the app: (1) an
  unset `MOCKSERVER_INTERNAL_URL` when running Playwright directly (outside `misc/run_gui_systemtest.py`, which sets it to `http://127.0.0.1:5080` for local runtime) left indexer host resolution at its docker-only default and
  produced genuine indexer communication errors that looked like app misbehavior; setting it explicitly resolved this. (2) Submitting two plain-text searches back-to-back in one `SearchWorkspace` session hits a real, pre-existing,
  out-of-scope app defect (recorded under Follow-Up Work below) where the second search silently resubmits the first query's text; the fixture works around it by submitting the first search through the real UI and cloning its
  exact, proven-correct request body (query and `searchRequestId` substituted) for the second entry via a direct authenticated POST to the same `/internalapi/search` endpoint the form itself calls — never touching the buggy path,
  and never asserting anything about its behavior.

### Temporary Exceptions And Debt

- `None`.

### Registry And Documentation Updates

- `F-SEARCH-RECENT` (`docs/frontend-migration/FEATURES.yaml`): `target`, `tests`, `parity`, `selectors`, and `task` (`FM-017`) are unchanged and confirmed still accurate — this task added no test, changed no target, and owns no
  new task assignment. `gaps` updated to name the keyboard/assistive-technology unreachability. `backlog` rationale extended to name this packet's `ADR REQUIRED` escalation as the blocking decision, alongside the pre-existing visual
  re-acceptance rationale (both are independently true and both remain outstanding). `visual` block (`applicability`, `status`, `note`, `contract`, `evidence`, `variances`) is completely unchanged — no field of it was touched, and
  no acceptance was implied.
- `MAINTENANCE.md`: the *Open candidates* bullet this packet discharges is deleted in this same change (its successor authority, the `gaps`/`backlog` entry above, now exists). No ledger entry was added — this is not a `/fm-quickfix`
  fix, it is a task-packet escalation.
- `STATUS.md`: FM-049 reconciled from `## Upcoming` (pre-measurement framing) to `## Blocked` (measured outcome, disposition, and escalation).
- For ADR-0006 visual records: `F-SEARCH-RECENT.visual.applicability` stays `applicable`, `status` stays `proposed` (no lifecycle transition). No scoped states/viewports/geometry were added or changed. No new evidence or snapshot
  was added under `visual.evidence`/`visual.snapshots` (the focus trace and accessibility tree are behavioral/accessibility evidence, recorded in this Handoff and referenced from `gaps`, not visual evidence). No variance was added
  or its disposition changed. `human acceptance pending` — no `decision`/`accepted_by`/`accepted_on` exists or was added. No behavioral or accessibility gate was implied by visual evidence, and no visual or accessibility gate was
  implied by the other: this measurement is behavioral/accessibility evidence only, and it changes nothing about the separate, still-outstanding visual acceptance question.

### Follow-Up Work

- **`ADR REQUIRED`** (this task's own escalation) — see below. This is the load-bearing follow-up; a remedy packet cannot be designed until it resolves.
- **Maintenance candidate for `/fm-quickfix`**: a pre-existing, out-of-scope defect in `core/ui-react/src/features/search/SearchPage.tsx`'s `submit()`. Submitting two distinct plain-text searches back-to-back in one
  `SearchWorkspace` session (no intervening navigation) causes the **second** search to silently resubmit the **first** search's query text. Root cause: `valuesFromSearch()` (`core/ui-react/src/features/search/workspace/SearchWorkspace.tsx`)
  mirrors a URL-round-tripped `query` param into the RHF `title` default (`title: typeof search.title === "string" ? search.title : typeof search.query === "string" ? search.query : ""`) on the remount that `submit()`'s own
  `navigate()` call triggers after the first search; `submit()`'s request-building ternary (`request.query = values.additionalQuery || (hasMediaIdentifiers(values) ? undefined : values.title || values.query || undefined)`) then
  prefers that stale, mirrored `values.title` over the freshly typed `values.query` for the second search, because the visible "All"-category query field is bound to `register("query")`, not `register("title")`. This is
  user-observable interaction semantics (a real product bug, not cosmetic), so it fails the quickfix gate's "no user-observable behavior change" bar for a *fix* — but the **defect itself** is small, mechanically located (two named
  files, one ternary and one mirrored default), and coverable by a single regression test asserting that two consecutive plain-text searches in one session produce two distinct recorded queries. Failing command:
  `tests/system/tests/search.spec.ts` has no such regression test today (the existing recent-search test only submits one search per session), so there is no currently-failing command to cite — this is a gap discovered by this
  packet's fixture-construction attempts, not a currently-red test. Named here rather than fixed, per this task's `Out Of Scope` (`core/ui-react` changes are not permitted by this packet in either branch).

### `ADR REQUIRED`

Reporting the packet's pre-formed escalation verbatim, as instructed, extended with what the measurement found.

**Decision question.** A single recent-search `menuitem` carries two user actions — Repeat on row activation, Refill on a nested `IconButton` — and the single-row structure is an explicit repository-owner instruction recorded in
`F-SEARCH-RECENT`'s `visual.note`. How should the Refill capability be made reachable by keyboard and by assistive technology?

**What the measurement found, to place the decision.** The gap is a pure focus-navigation gap: `MenuList`'s roving focus (`moveFocus` via `nextItem`/`previousItem`, sibling-only traversal) never visits the nested `IconButton`, and
`Menu`'s `handleListKeyDown` closes the menu on `Tab`/`Shift+Tab` before focus could otherwise reach it by conventional means. The accessibility-tree half does **not** fail — Chromium exposes the nested `Refill` button as a
non-ignored, focusable, correctly-named node, refuting the "Children Presentational" concern for the base `menuitem` role (that characteristic is specified for `menuitemcheckbox`/`menuitemradio`, not `menuitem`, per `w3c/aria`
issue #1711 and corroborating references). This places the decision in the case the packet's own recommendation addresses.

**Options** (carried verbatim from the packet; the measurement did not add to or eliminate from this list):

1. **Keyboard binding on the existing single focus stop.** Keep one `menuitem`, one roving-focus stop, and the row exactly as it renders; bind a modifier chord on the row to invoke refill, and announce it in the row's accessible
   description. Preserves the owner's instruction literally and changes no pixel. Cost: a menu chord is non-standard and undiscoverable without the announcement, and the announcement lengthens every row's accessible name.
2. **Two accessible actions inside one visual row.** Restructure so both actions are separately exposed. Preserves the single visual row; contradicts the recorded "one `menuitem` per search" structure and changes the
   `Repeat: <description>` accessible-name contract `search.spec.ts` and `RecentSearches.test.tsx` both assert. **Requires fresh ADR-0006 acceptance.**
3. **Relocate Refill out of the menu.** Repeat stays on row activation; refill becomes its own keyboard-reachable affordance elsewhere in the workspace actions. Leaves the instructed row untouched; moves a capability the user
   currently finds inside the menu, so it is a product change. **Requires fresh ADR-0006 acceptance.**
4. **Row activation opens a two-action step** (submenu or dialog offering Repeat and Refill). One focus stop, one visual row, both actions conforming; costs every user an extra step unless applied conditionally, which is itself a
   semantics split. **Requires fresh ADR-0006 acceptance.**
5. **Revert to two rows.** Technically the cheapest and unambiguously conforming; directly undoes the instruction the owner gave in the live FM-038 session. Only the repository owner can choose it. **Requires fresh ADR-0006
   acceptance and a reversal of the original instruction.**

**Recommendation carried into the escalation:** Option 1, since the measurement placed the case squarely where the packet's recommendation applies — the gap is a focus-navigation gap and the accessibility tree exposes the row's
two actions adequately (the nested button is not pruned). It is the only option that leaves the owner's explicit instruction untouched. This is a recommendation only; no option is chosen by this implementer, and the human decision
is what the coordinator's ADR proposal process now needs to obtain.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`.

The reviewer's central obligation here is unusual and should be stated plainly: **audit the measurement, not the conclusion.** Check that the focus trace covers every key listed under Acceptance, that the control assertions actually
demonstrate the harness can detect reachability, that the accessibility-tree excerpt is a real computed tree rather than a Playwright role query, and that the disposition rule was applied to the evidence rather than to expectation. A
reviewer may not supply the human decision the unreachable branch escalates, and may not accept or re-date any ADR-0006 visual acceptance.
