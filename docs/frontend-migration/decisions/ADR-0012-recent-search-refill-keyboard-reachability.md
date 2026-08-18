# ADR-0012: How The Recent-Search Refill Action Becomes Reachable By Keyboard And Assistive Technology

Status: accepted (2026-08-18) — **Option A1**: `ArrowRight` moves focus onto the existing nested Refill `IconButton`; `ArrowLeft`/`Escape` returns focus to the row; `Enter`/`Space` activates natively; `aria-keyshortcuts` on the row announces it.

## Decision Question

A single recent-search row is one `menuitem` carrying two user actions: **Repeat** on row activation, and **Refill** on an `IconButton` nested inside that row. FM-049 measured, in a real browser, that the Refill action is **unreachable by keyboard** — no key a menu user would try ever moves focus onto it, and `Tab` closes the menu instead. The single-row structure was built in the live session that produced FM-038, alongside an explicit repository-owner instruction recorded in `F-SEARCH-RECENT`'s `visual.note`.

**How should the Refill capability be made reachable by keyboard and by assistive technology — and, if the answer changes the row's structure, is the repository owner willing to revise the structure they instructed?**

This is not a task-local presentation detail. It decides an interaction contract asserted across three independent test layers, it decides whether `F-SEARCH-RECENT`'s `menuitem` role and `Repeat: <description>` accessible-name contract survive, it sets the project's precedent for nested interactive controls inside a MUI `MenuItem`, and — under ADR-0006 — only a human may accept the structural change most of the options require.

## Context And Evidence

Every claim below was re-verified first-hand against the working tree at baseline `07dec83a8564df2f315b515aec537f8c6ee55041` (branch `newUi2026`). Installed MUI sources are cited by **symbol name and quoted text, never by line number**, because `node_modules` coordinates rot between installs — the failure mode FM-047 hit and a later quickfix had to repair.

### What is in the tree

- `core/ui-react/src/features/search/history/RecentSearches.tsx` renders one `MenuItem` per recent search with `aria-label={`Repeat: ${description}`}`, `data-testid="recent-search-entry"`, `draggable`, and an `onClick` calling `onRepeat`. Its first child is a `Tooltip`-wrapped `IconButton` with `aria-label={`Refill: ${description}`}` whose `onClick` calls `event.stopPropagation()` before `onRefill`. The tooltip text is "Refill the search form without searching" — a pointer-only affordance.
- `F-SEARCH-RECENT` (`docs/frontend-migration/FEATURES.yaml:159-185`) is `visual.status: proposed` with **human acceptance already outstanding** since FM-038 superseded the prior 2026-08-16 acceptance. Its `contract.states` includes `single-row-entry-with-leading-refill-button`; its `selectors` list is empty; its `gaps` now reads `refill is invocable by pointer and drag but not by keyboard or assistive technology`; its `backlog` names this decision as the blocker.
- `F-SEARCH-RECENT`'s `visual.note` records the owner's instruction in these terms: the width cap was removed "on the user's explicit instruction, given directly in the live session that produced this implementation, that every recent-search entry be shown in full rather than wrapped or truncated", and "**The same change also collapsed** the two-menuitem row … into one `menuitem` per search". FM-038's *Boundary Rationale* asserts the causal link — "the single-row layout is what makes both the icon-button refill and the removed width cap necessary".

### FM-049's measurement, independently confirmed against the sources it cites

FM-049 measured in Chrome for Testing `151.0.7922.34` (Playwright `1.62.1`, `@mui/material` `7.3.9`) against a real JVM backend, menu opened by keyboard, two deterministic entries.

- **Keyboard traversal fails for every tested key.** `ArrowDown`/`ArrowUp`/`Home`/`End` move focus only between the two `recent-search-entry` rows; `Tab`/`Shift+Tab` close the menu back to `recent-searches-trigger`; `Enter`/`Space` invoke Repeat and close; type-ahead `r` does not move focus. Focus never lands on a node named `/^Refill:/`.
- **The controls prove the harness can detect reachability when it exists** — arrow keys demonstrably move focus, and `Enter` on a focused row issues a real search. The negative finding is therefore a finding, not a harness artifact.
- **The accessibility tree is not the problem.** Chromium's real computed tree (CDP `Accessibility.getFullAXTree`) exposes each nested `IconButton` as its own `button` node, `ignored: false`, `focusable: true`, with the correct `Refill: <description>` name, as a child of the `menuitem`. The WAI-ARIA *Children Presentational* concern does not apply: that characteristic is specified for `menuitemcheckbox`/`menuitemradio`, not the base `menuitem` role.
- **Mechanism, confirmed in the installed MUI 7.3.9 sources.** `Menu/Menu.js`'s `handleListKeyDown` is wired as the list slot's `onKeyDown` and reads, in full: `const handleListKeyDown = event => { if (event.key === 'Tab') { event.preventDefault(); if (onClose) { onClose(event, 'tabKeyDown'); } } };`. `MenuList/MenuList.js`'s `moveFocus` walks the list via `nextItem`/`previousItem`, whose only traversal steps are `item.nextElementSibling` and `item.previousElementSibling` relative to the `<ul>`'s direct children — sibling-only, with no path into a row's own descendants.

**Net: this is a pure focus-navigation gap, not an accessibility-tree pruning problem.** Confirmed independently here, and it is the fact that keeps the cheapest options viable.

### Two findings this proposal adds, both of which change the option space

These were not in FM-049's escalation and are load-bearing.

1. **MUI leaves specific keys entirely unconsumed, and they are better keys than a modifier chord.** `MenuList/MenuList.js`'s `handleKeyDown` branches on `ArrowDown`, `ArrowUp`, `Home`, `End`, and then `else if (key.length === 1)` for type-ahead; every other key falls through untouched to the consumer's `onKeyDown`. `Menu.js`'s `handleListKeyDown` intercepts only `'Tab'`. **`ArrowRight` and `ArrowLeft` are therefore consumed by neither handler** — no `preventDefault`, no type-ahead capture, no menu close. Separately, `handleKeyDown` opens with `const isModifierKeyPressed = event.ctrlKey || event.metaKey || event.altKey; if (isModifierKeyPressed) { if (onKeyDown) { onKeyDown(event); } return; }` — an explicit pass-through for `Ctrl`/`Meta`/`Alt` chords (note: **not** `Shift`, which still reaches type-ahead). FM-049's constraint — "a bare printable letter is unavailable" — is correct, but its conclusion that Option 1 must therefore mean a non-standard modifier chord is too narrow. `ArrowRight`/`ArrowLeft` are the WAI-ARIA APG's own directional convention for moving inward from and back out of a `menuitem`, and they are free.
2. **The announcement cost FM-049 charged against Option 1 is avoidable.** FM-049 states that announcing a chord "lengthens every row's accessible name". It need not: `aria-keyshortcuts` is a distinct ARIA property that is not part of accessible-name computation, and a shared `aria-describedby` hint node is one node for the whole menu rather than a per-row string. This matters twice over — it removes one of the two costs weighed against Option 1, and it keeps **ADR-0005**'s `Label: value, Label: value` criteria-description contract completely untouched.

### The severity of the gap, stated plainly in both directions

Repeat — the primary action, and the one a row activation naturally means — is **fully keyboard-reachable and control-confirmed working**. Refill remains reachable by pointer and by drag. The feature is not unusable by keyboard.

Equally: a keyboard-only or screen-reader user cannot reach a capability that pointer users can, and this is a **regression introduced by the migration, not an inherited legacy gap**. FM-038's own review records that the structure it replaced was "the old `flatMap` producing two `MenuItem`s per search (`-refill`/`-repeat` keys)" — two `menuitem`s, both of which MUI's roving focus would have reached. The React target had this capability keyboard-reachable and lost it.

### What the accepted decisions require, and what they do not

- **ADR-0004** makes accessibility an independent gate and states plainly that "React interactions and accessibility receive component tests"; **ADR-0006**'s consequences state that "Behavioral, accessibility, and visual acceptance are separate gates. Passing one does not waive failures or missing evidence in either other gate." Neither ADR sets a formal WCAG conformance target, and neither forbids a recorded, human-accepted gap. So "accept the gap" is **not foreclosed by an accepted decision** — but it is a product decision that only the repository owner can make, which is why it appears below as a real option rather than being silently excluded.
- **ADR-0002** constrains every candidate to MUI's own primitives: no second component suite, no bespoke menu widget.
- **ADR-0005** governs the description string both accessible names are built from. It is unaffected today and must stay unaffected.

### A correction to the escalation's acceptance accounting

FM-049 marks Options 2–5 "**Requires fresh ADR-0006 acceptance**". That is true in the sense that each changes what a human will be asked to accept. It is **not** true that any of them withdraws an existing acceptance: `F-SEARCH-RECENT.visual.status` is already `proposed`, and its 2026-08-16 acceptance was already removed by FM-038. Re-proposing a check on a `proposed` record costs a re-evidencing pass, not a withdrawn human acceptance — the same correction ADR-0011's revision made for `F-SEARCH-SORT-FILTER`. The real cost of Options 2–5 is that they **further defer** an acceptance that is already outstanding, and enlarge what it covers.

### A correction to how strongly the owner's instruction binds

The escalation states that the single-row structure is "an explicit repository-owner instruction". Read against the record it cites, that is one degree stronger than what is written. `visual.note` attributes an explicit instruction to **readability in full** ("every recent-search entry be shown in full rather than wrapped or truncated") and records the two-`menuitem`-to-one collapse as something "the same change also" did. FM-038's *Boundary Rationale* argues the collapse follows from that requirement; it is an implementer's argument, not a quoted instruction.

This matters concretely: **a two-row layout does not contradict the instruction that is actually recorded.** Two rows, each shown in full, satisfies "shown in full rather than wrapped or truncated" exactly as one row does. Option 5 below therefore asks the owner to revisit a structure they worked in and approved live — not to reverse a recorded instruction. The owner is the authority on what they meant; this ADR's obligation is only to avoid overstating the constraint and thereby narrowing their own choices for them.

### The compatibility contracts in play

- `recent-searches-trigger` and `recent-search-entry` are `data-testid` compatibility contracts under `README.md`'s *Registry Rules* (independently of `F-SEARCH-RECENT.selectors`, which is empty and was empty before FM-038). **No option below needs to remove or rename either.**
- The role-and-name contract is asserted in three places and is the thing Options 2 and 5 actually put at risk: `RecentSearches.test.tsx` queries `getByRole("menuitem", {name: /^Repeat:/})` and `getByRole("button", {name: /^Refill:/})`; `SearchPage.test.tsx` carries the four integrated recent-search hunks against the same roles and names; and `tests/system/tests/search.spec.ts:589-602` drives `getByRole("button", {name: /^Refill:/})` and `getByRole("menuitem", {name: "Repeat"})`.

## Options

Each option states its remedy, its honest tradeoff, whether it touches a `data-testid`, and what it costs `F-SEARCH-RECENT`'s already-outstanding visual acceptance.

### Option A: Keyboard affordance on the existing single focus stop

Keep one `menuitem`, one roving-focus stop, and the row exactly as it renders. Add a key binding on the row that gives the keyboard user the Refill capability, and announce it without touching the accessible name.

Two realizations, materially different in quality:

- **A1 — directional focus move (recommended realization).** `ArrowRight` moves focus onto the nested Refill `IconButton`; `ArrowLeft`/`Escape` returns focus to the row. The user then activates it with `Enter`/`Space` natively. This works because the measurement already proved the target exists: the nested button is a non-ignored, focusable `button` with the correct name in the real accessibility tree, so nothing has to be invented for assistive technology to announce — only focus has to arrive. `ArrowRight`/`ArrowLeft` are verified unconsumed by both MUI handlers and are the APG's own inward/outward directional convention.
- **A2 — modifier chord invocation.** A `Ctrl`/`Alt`/`Meta` chord on the focused row invokes refill directly, using MUI's explicit modifier pass-through. Simpler to implement; strictly worse to discover and to announce, and it invents an invocation the user has no reason to guess.

Under either, discoverability is addressed with `aria-keyshortcuts` on the row (not part of accessible-name computation) and, if the owner wants sighted keyboard users to discover it too, one shared visible hint node in the menu.

- **Benefits:** the only option that leaves the row structure literally untouched. No pixel changes under A1 with `aria-keyshortcuts` alone. No `data-testid` touched. No role or accessible-name contract changed, so all three test layers keep passing unmodified. **ADR-0005 untouched.** Uniquely, it is the only option that does **not** enlarge or further defer `F-SEARCH-RECENT`'s outstanding visual acceptance — the record can be accepted on the evidence already recorded.
- **Costs, stated plainly:** discoverability is the weakest part of any realization, and an undiscoverable affordance is a weak accessibility remedy. `aria-keyshortcuts` announcement is inconsistent across screen readers and gives sighted keyboard users nothing; a visible hint fixes that but is itself a small visual change that adds a state to the visual contract. Under A1 the nested button becomes a focus stop MUI's `MenuList` does not know about, so behavior of `ArrowDown`/`ArrowUp`/`Home`/`End`/type-ahead *from* that position must be defined and **measured in a real browser, not assumed** — FM-049's own standard. It is hand-written focus management inside a library's roving-focus widget, so it carries a real, if small, maintenance surface across MUI upgrades; the measurement is only as durable as `@mui/material` 7.3.9.
- **ADR-0006 acceptance:** none beyond the acceptance already outstanding, unless a visible hint is added — in which case one additive state joins the same outstanding acceptance.

### Option B: Two separately exposed actions inside one visual row

Restructure so both actions are separately exposed to keyboard and assistive technology while the row still renders as one line.

- **Benefits:** preserves the single visual row exactly; both actions become first-class.
- **Costs:** contradicts the recorded "one `menuitem` per search" structure. A `menuitem` whose accessible name is `Repeat: …` cannot also be the container for a separately-named actionable child in a conforming menu; in practice the row stops being a `menuitem`, which breaks the role assertion in `RecentSearches.test.tsx`, the `SearchPage.test.tsx` hunks, and `search.spec.ts:602`. `data-testid`s survive; the role/name contract does not.
- **ADR-0006 acceptance:** yes — it changes `contract.states`' `single-row-entry-with-leading-refill-button` and enlarges the outstanding acceptance.

### Option C: Relocate Refill out of the menu

Repeat stays on row activation; Refill becomes its own keyboard-reachable affordance in the workspace actions.

- **Benefits:** leaves the instructed row untouched and gives Refill an unambiguous, conforming accessible home with no invented keys.
- **Costs:** it is a product change — it moves a capability users currently find inside the menu, and it must answer "refill *which* recent search?" outside a menu that currently supplies that context by position. `data-testid`s survive; `search.spec.ts` and `RecentSearches.test.tsx` need re-pointing (they locate Refill by role and name, not by testid).
- **ADR-0006 acceptance:** yes — `contract.states` loses the in-menu refill affordance.

### Option D: Row activation opens a two-action step

Row activation opens a submenu or dialog offering Repeat and Refill.

- **Benefits:** one focus stop, one visual row, both actions fully conforming with no invented semantics; `ArrowRight`-into-a-submenu is exactly the APG pattern.
- **Costs:** it makes a currently one-step action two steps **for every user, pointer users included** — a real regression in the primary path to fix a secondary one. Applying it conditionally (keyboard only) is itself a semantics split between input modalities. Row-activation semantics change, so `search.spec.ts:602`'s repeat assertion and the `SearchPage.test.tsx` repeat hunk change meaning.
- **ADR-0006 acceptance:** yes.

### Option E: Revert to two rows

Return to one `menuitem` for Repeat and one for Refill per search, as the pre-FM-038 React structure had.

- **Benefits:** technically the cheapest and **unambiguously conforming** — it needs no invented key, no announcement, no hand-written focus management, and no measurement of undefined states, because MUI's own roving focus already reaches both rows. It is the only option that removes the maintenance surface entirely.
- **Costs:** it doubles the menu's vertical length, and it undoes the structure the owner built and worked in live during FM-038. `recent-search-entry` would match two nodes per search unless re-scoped — the one option that raises a genuine `data-testid` question, though it can be answered without removing or renaming either contract. Note the correction above: it does **not** contradict the instruction actually recorded in `visual.note`, which is about each entry being shown in full.
- **ADR-0006 acceptance:** yes, and only the repository owner may choose it.

### Option F: Accept the gap and leave it recorded

Take no remedy. Leave `F-SEARCH-RECENT`'s `gaps` entry standing as the durable record that Refill is pointer-and-drag only.

Included because it is honestly available: no accepted ADR sets a WCAG conformance target, and the registry has a slot designed for exactly this. It is not a nothing-option — it is a decision with a cost.

- **Benefits:** zero implementation, zero risk, zero further deferral of the outstanding visual acceptance. The gap stays visible and honest rather than being quietly forgotten.
- **Costs:** it permanently denies keyboard-only and screen-reader users a capability pointer users have, in a capability the React target **previously had and lost**. Under `README.md`'s *Registry Rules* the record must "name its next task or blocking ADR"; once this ADR resolves there is no next task and no blocking ADR to name, so the `backlog` rationale would have to say plainly that the gap is accepted and permanent — which is exactly the sentence the owner should read before choosing this.
- **ADR-0006 acceptance:** no visual acceptance, but it does require an explicit human decision recorded here; no agent may choose it.

## Recommendation

**Option A, realized as A1 — `ArrowRight` moves focus onto the existing nested Refill button, `ArrowLeft`/`Escape` returns, `Enter`/`Space` activates natively — with `aria-keyshortcuts` on the row, and a visible hint only if the owner wants sighted keyboard users to discover it.**

The reasoning is repository-based, not inherited from FM-049's recommendation:

- The measurement established that **the destination already exists and is already correct**. Chromium exposes the nested button as non-ignored, focusable, and correctly named. Nothing has to be built for assistive technology; only focus has to arrive. That is the narrowest possible remedy for the defect that was actually measured.
- `ArrowRight`/`ArrowLeft` are verifiably free in MUI 7.3.9 — consumed by neither `MenuList`'s `handleKeyDown` nor `Menu`'s `handleListKeyDown` — and they are the APG's own directional convention, so this is a conventional key, not an invented chord. FM-049 reached Option 1 while believing the only available binding was a non-standard modifier chord; it is not, and that materially strengthens the option beyond how the escalation framed it.
- It is the **only** option that leaves the role contract, all three test layers, `ADR-0005`, every `data-testid`, and every pixel untouched — and therefore the only one that does not enlarge or further defer `F-SEARCH-RECENT`'s already-outstanding human visual acceptance.

**Where I disagree with the escalation, and what the owner should weigh against this recommendation.** FM-049 recommends Option 1 on the grounds that it is "the only option that leaves the owner's explicit instruction untouched". That framing quietly does the owner's deciding for them, on a constraint that is one degree weaker than stated. Stated honestly:

> **Option E (two rows) is the cheapest genuinely correct answer.** It needs no invented key, no announcement, no hand-written focus management inside a library widget, and no new measurement of undefined states — MUI's own roving focus simply works. Every other option, mine included, spends effort working around a structure. The only reason E is not recommended here is that it changes a structure the owner built, and it costs a taller menu.

The owner is now in a position FM-038 was not: the cost of the single-row structure has been measured rather than assumed. If, knowing that cost, they prefer the structure, **A1** delivers the capability at the smallest possible price. If they would rather not carry hand-written focus management in a MUI menu indefinitely, **E** is the right answer and should not be treated as a reversal they owe an explanation for.

Options B, D, and F are not recommended: B breaks the role contract to preserve a visual row that A1 preserves anyway; D charges every user an extra step to fix a secondary action; F permanently accepts a capability loss the migration itself introduced. Option C is a reasonable answer only if the owner independently wants Refill outside the menu as a product matter, which is a different question from this one.

A recommendation is not a decision. What was actually decided is recorded under `## Human Decision` below; this section stands unmodified as the record of what was recommended and of the contrary view put to the owner.

## Human Decision

**Accepted 2026-08-18 by the repository owner: Option A, realized as A1.**

The selection, in the owner's terms:

- `ArrowRight` moves focus onto the existing nested Refill `IconButton`.
- `ArrowLeft`/`Escape` returns focus to the row.
- `Enter`/`Space` activates the button natively.
- `aria-keyshortcuts` on the row announces the affordance.

The row keeps one `menuitem`, one MUI roving-focus stop, and its current structure. No option other than A1 was selected; B, C, D, E, and F remain rejected and are preserved above with their tradeoffs intact as the record of what was weighed.

### What was in front of the owner when they chose

The owner was presented with the decision question and with four options — A1, E, C, and F — each with its tradeoffs and its acceptance cost, the recommendation shown first. They decided in light of all of the following, and the choice is recorded as explicit and informed:

- That **A1 is the only option leaving the `menuitem` role contract, all three test layers, ADR-0005, every `data-testid`, and every pixel untouched**, and is therefore the only option that does not further defer `F-SEARCH-RECENT`'s already-outstanding visual acceptance.
- **A1's weak point, stated to them plainly:** discoverability is the weakest part of the remedy, and A1 carries hand-written focus management inside a MUI roving-focus widget indefinitely.
- **The proposer's own countervailing view, put to them in full and not withheld: Option E (revert to two rows) is the cheapest genuinely correct answer** — MUI's roving focus simply works there, with no invented key, no announcement, and no maintenance surface, while every other option including A1 works around the structure.
- **The correction that Option E would not reverse the owner's own instruction.** `F-SEARCH-RECENT`'s `visual.note` attributes the explicit instruction to entries being readable in full ("every recent-search entry be shown in full rather than wrapped or truncated") and records the two-`menuitem`-to-one collapse as something "the same change also" did. Choosing E would therefore not have been a reversal owed an explanation.
- **That this is a regression the migration introduced, not an inherited gap.** Before FM-038 the row was two `MenuItem`s and MUI's roving focus reached both; the React target had this capability keyboard-reachable and lost it.

The owner chose A1 with that contrary view and that regression framing in front of them. No rationale beyond the selection itself is recorded here, because none was given; nothing further is inferred on their behalf.

## Consequences

### Under the accepted option (A1)

- **The row structure does not change.** One `MenuItem` per recent search, one MUI roving-focus stop, `aria-label={`Repeat: ${description}`}`, the nested `Tooltip`-wrapped Refill `IconButton` with `aria-label={`Refill: ${description}`}` and its `event.stopPropagation()` — all as they render today. The remedy adds key handling and announcement, nothing structural.
- **No modifier chord is needed, because `ArrowRight`/`ArrowLeft` are free.** In the installed `@mui/material` 7.3.9 sources, `MenuList/MenuList.js`'s `handleKeyDown` branches on `ArrowDown`, `ArrowUp`, `Home`, `End`, then `else if (key.length === 1)` for type-ahead, and every other key falls through untouched to the consumer's `onKeyDown`; `Menu/Menu.js`'s `handleListKeyDown` reads, in full, `const handleListKeyDown = event => { if (event.key === 'Tab') { event.preventDefault(); if (onClose) { onClose(event, 'tabKeyDown'); } } };`. Neither handler consumes `ArrowRight` or `ArrowLeft` — no `preventDefault`, no type-ahead capture, no menu close — so the accepted binding uses the APG's own inward/outward directional convention rather than the non-standard chord FM-049 assumed was the only option.
- **The destination already exists; only focus has to arrive.** FM-049's CDP `Accessibility.getFullAXTree` capture shows each nested `IconButton` as its own `button` node, `ignored: false`, `focusable: true`, correctly named `Refill: <description>`, as a child of the `menuitem`. Nothing has to be built for assistive technology.
- **`aria-keyshortcuts` announces the affordance without entering accessible-name computation, so ADR-0005 is untouched.** The `Label: value, Label: value` description string feeding both accessible names gains nothing; no row's accessible name lengthens; ADR-0005's criteria-description contract stands exactly as it is.
- **No `data-testid` is removed or renamed.** `recent-searches-trigger` and `recent-search-entry` remain compatibility contracts under `README.md`'s *Registry Rules*, unchanged in name and in scope — one `recent-search-entry` node per search.
- **All three test layers keep their current assertions.** `RecentSearches.test.tsx`'s `getByRole("menuitem", {name: /^Repeat:/})` and `getByRole("button", {name: /^Refill:/})`, `SearchPage.test.tsx`'s four integrated recent-search hunks, and `tests/system/tests/search.spec.ts:589-602`'s `getByRole("button", {name: /^Refill:/})` and `getByRole("menuitem", {name: "Repeat"})` all survive as written. New coverage is additive.
- **`F-SEARCH-RECENT` stays `visual.status: proposed`, with its outstanding human acceptance neither withdrawn nor re-dated.** A1 neither enlarges nor further defers that acceptance; accepting this ADR is not visual acceptance, and no agent may supply it under ADR-0006. If the remedy packet adds a *visible* hint node, that is one additive state joining the same outstanding acceptance — it does not start a new one.
- **The remedy is a later task packet, not part of FM-049.** FM-049 was a measurement packet and implemented no remedy by design; `core/ui-react` and `tests/system` are byte-identical to baseline and stay that way. A **task designer** must create or refine the remedy packet, link this ADR under its `Decision Dependencies`, and unblock FM-049. No implementer may act on this ADR before that refinement.

### Standing obligations this acceptance places on the remedy, and does not itself settle

- **Discoverability is not settled by this decision — it is an obligation on the implementation.** A1's acknowledged weak point is that an unreachable-by-guess affordance is a weak accessibility remedy: `aria-keyshortcuts` announcement is inconsistent across screen readers and gives sighted keyboard users nothing. The remedy **must make the affordance discoverable** — `aria-keyshortcuts` on the row plus whatever visible hint the packet decides is right (for example, one shared hint node in the menu rather than per-row text). The packet must state what it chose and why; "we added the key binding" does not discharge this.
- **The remedy must be verified in a real browser with real keyboard input.** The defect was only detectable that way. Per ADR-0004 and FM-049's precedent, a jsdom component test cannot establish roving focus, a focus ring, or an accessibility tree. Required evidence: a real-browser keyboard trace showing focus reaching the Refill button via `ArrowRight`, returning via `ArrowLeft`/`Escape`, and invoking Refill via `Enter`/`Space`; plus a control proving the harness would detect failure. A component test in `RecentSearches.test.tsx` is complementary evidence under ADR-0004's independent-gates principle, never the reachability proof.
- **Undefined states created by the new focus stop must be defined and measured, not assumed.** Under A1 the nested button becomes a focus stop MUI's `MenuList` does not know about, so the behavior of `ArrowDown`/`ArrowUp`/`Home`/`End`/type-ahead *from that position* must be specified by the packet and measured in a real browser.
- **`F-SEARCH-RECENT`'s `gaps` entry — "refill is invocable by pointer and drag but not by keyboard or assistive technology" — is discharged only by the implementing task, and only against that real-browser evidence.** It is not discharged by this acceptance.
- **This carries a maintenance surface, and it is version-scoped.** A1 is hand-written focus management inside a library's roving-focus widget; the owner accepted that cost knowingly. The mechanism findings hold for `@mui/material` 7.3.9 and Chrome for Testing `151.0.7922.34` (Playwright `1.62.1`). A1 depends on MUI leaving `ArrowRight`/`ArrowLeft` unconsumed and **must be re-verified after a MUI upgrade**; the remedy packet must say so in the code that relies on it.
- **No test may be removed, skipped, weakened, or ignored** (ADR-0004). A1 requires no assertion changes, so any test edit in the remedy is additive coverage, never a deletion or a relaxation.
- **`ADR-0002` binds the remedy to MUI primitives.** No second component suite and no bespoke menu widget.
- **Lifecycle bookkeeping follows this recording, not this file.** `docs/frontend-migration/STATUS.md`'s `## Blocked` entry for FM-049, and any `F-SEARCH-RECENT` registry updates, are the coordinator's and task designer's to make.

## Affected Work

- Blocked task raising this decision: `docs/frontend-migration/tasks/FM-049-recent-search-refill-keyboard-reachability-measurement.md` (`Status: blocked`, `ADR REQUIRED`). It implemented no remedy by design; `core/ui-react` and `tests/system` are byte-identical to baseline.
- The task that built the structure under examination: `docs/frontend-migration/tasks/FM-038-recent-searches-single-row-menu.md` (`done`), whose `Boundary Rationale` and handoff record the live-session origin of the single-row layout.
- Implementation file every option except F changes: `core/ui-react/src/features/search/history/RecentSearches.tsx`.
- Test layers carrying the role and accessible-name contract: `core/ui-react/src/features/search/history/RecentSearches.test.tsx`, `core/ui-react/src/features/search/SearchPage.test.tsx` (its four recent-search hunks), and `tests/system/tests/search.spec.ts:548-609`.
- Registry record whose contract and gap disposition change with the outcome: `F-SEARCH-RECENT` (`docs/frontend-migration/FEATURES.yaml:159-185`) — specifically `visual.note`, `contract.states`, `gaps`, and `backlog`. No other feature record is affected. No `COMPONENTS.yaml` or `APIS.yaml` record applies.
- Governing accepted decisions, none reopened by this ADR: `ADR-0002-frontend-stack.md` (MUI-only), `ADR-0004-testing-and-parity.md` (independent accessibility gate; no test weakened), `ADR-0005-recent-history-criteria-contract.md` (the description string, to stay unaffected), `ADR-0006-visual-parity-policy.md` (human acceptance of baselines and variances).
- Lifecycle bookkeeping: `docs/frontend-migration/STATUS.md`'s `## Blocked` entry for FM-049 needs updating by the coordinator or task designer once a decision exists.

## Supersession

- Supersedes: `None`.
- Superseded by: `None` until a later ADR replaces this decision.
