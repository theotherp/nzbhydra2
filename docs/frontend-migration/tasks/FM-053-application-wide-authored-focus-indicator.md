# FM-053: Application-Wide Authored Keyboard Focus Indicator

Status: done Owner:
Feature IDs: F-PLATFORM-SHELL, F-SEARCH-FORM, F-SEARCH-MEDIA, F-SEARCH-INDEXERS, F-SEARCH-RECENT, F-SEARCH-PROGRESS, F-SEARCH-RESULTS, F-SEARCH-SORT-FILTER, F-SEARCH-GROUP-SELECTION, F-SEARCH-DOWNLOADS, F-SEARCH-PAGING, F-SEARCH-SAVED, F-STATS-SHELL, F-STATS-INDEXERS, F-HISTORY-SEARCHES, F-HISTORY-SAVED-SEARCHES, F-SYSTEM-NEWS
Component IDs: None
API IDs: None
Depends on: FM-052
Blocks: None

**Refined (2026-08-19), `theme.test.ts` write-scope only:** a fresh implementer correctly found that no implementation of ADR-0013's accepted Option A can leave `core/ui-react/src/app/theme.test.ts` passing, and that the file is absent
from `Files Allowed To Modify`, so it escalated under `README.md`'s *Agent Autonomy And Escalation* ("satisfying the task requires modifying a file outside `Files Allowed To Modify`") rather than broadening scope. Two of that file's
assertions pin the exact **pre**-ADR-0013 shape of objects the accepted decision necessarily changes: `:173` requires `MuiCssBaseline`'s resolved `":focus-visible"` entry to equal `{outline: "3px solid currentColor", outlineOffset: "3px"}`,
which **both** branches of this packet's own reconcile-or-scope criterion change; and `:129` requires `MuiButton.styleOverrides.root` to equal exactly `{textTransform: "none", borderRadius: 8}`, which gains a key the moment the
`ButtonBase` family is authored at all. This is a missing write path, not an unresolved decision: the packet's Outcome, its *Boundary Rationale*, its *Decision Dependencies*, its *Out Of Scope* fences and constraints, and every other
Acceptance criterion are unchanged, no ADR is reopened, and no new product, UX, architecture, API-contract, or migration choice is made. The refinement is exactly two things — that one path is added to *Files Allowed To Modify* under a
narrow scope note, and one Acceptance criterion below fixes what may change in it and forbids the weakening ADR-0004 prohibits. The Handoff's *The Blocker* section records the state at that escalation; the implementer resuming this task
rewrites it against the granted scope rather than leaving it standing.

**Refined a second time (2026-08-19), same file, one assertion wider — and this is the second refinement of this packet, not a re-statement of the first.** The implementer that resumed under the grant above discharged it exactly: both
named assertions were updated to the literals Option A actually produces, neither was weakened, and both pass. But `npm run test` came back at `1 failed | 246 passed (247)`, not the required `247 passed (247)`. The survivor is a **third**
assertion in the same file — `MuiChip.styleOverrides.root` (`:148`), `AssertionError: expected [Function root] to deeply equal { height: 26, borderRadius: 7 }` — invalidated by the accepted option for exactly the reason `MuiButton`'s was:
`Chip` is one of the authored control families, so its override became a theme-reading function to reach the shared focus token. **Why neither the first escalation nor the first refinement saw it:** it fails inside the *same* vitest
`it()` as the `MuiButton` assertion, three assertions below it, and vitest abandons an `it()` at its first failing assertion — so `MuiButton`'s failure masked `MuiChip`'s in every run made before `MuiButton` was fixed, the first report
honestly said "two", and the first refinement honestly granted two. Nothing was overlooked by either; the second failure was not observable until the first was gone. The implementer did **not** fix it on its own authority, correctly
reading the first refinement's fence ("no other assertion in this file may be added, removed, or changed") as a deliberate narrowing it could not widen itself; it instead **measured rather than predicted** the remedy with a reverted
probe (SHA-256 byte-identical before and after) that returned the suite to `38 passed (38)` / `247 passed (247)` exactly — which also rules out a fourth hidden assertion in that `it()`, since the probe ran all three fixes together and the
suite went fully green. This refinement therefore extends the identical grant to that third assertion under the identical fences, and corrects the "two"/"three" counts that follow from it. That is all it does: no ADR is reopened,
ADR-0013's Option A and its eleven authored families are not reinterpreted, and no product, UX, architecture, API-contract, or migration choice is made. Everything else in this packet — Outcome, *Boundary Rationale*, *Decision
Dependencies*, *Out Of Scope*, every other Acceptance criterion and every Verification command — stands unchanged from the first refinement.

## Dependency Notes

`Depends on: FM-052` is a real sequencing dependency, not deference. FM-052 owns the `gaps`/`backlog` edits on `F-PLATFORM-SHELL`, `F-SEARCH-FORM`, `F-SEARCH-GROUP-SELECTION` and `F-SEARCH-MEDIA` that this packet discharges, and
`README.md`'s *Parallel Work* rule forbids two live tasks owning the same registry record. FM-052 is a measurement packet that implemented no remedy by design; this packet implements the remedy ADR-0013 chose.

Nothing else blocks it. **ADR-0013 is accepted (2026-08-19, Option A)**, so no decision is outstanding, and `core/ui-react` and `tests/system` are byte-identical to baseline `dfe9f8a2e` — FM-052 confirmed both by SHA-256 and by an empty
`git diff`. This packet is the first to touch either since.

**FM-052 is the measurement of record and is not reopened.** It is `done`; its inventory, its 43 dispositions, its numbers and its captures are inputs here, not work to redo. Exactly one figure is re-measured rather than inherited — see
*Acceptance*, the `Button color="error"` clause — because that one was closed by direct re-measurement without a fourth independent review pass, and `STATUS.md` records that a remedy author should re-measure it rather than trust it.

## Outcome

Every interactive control family in the React UI renders an authored, measured keyboard focus indicator: reached by real `Tab`/`Shift+Tab`, each family paints an indicator whose changed area and whose full-opacity contrast against its own
composited ground are recorded as literal numbers and clear WCAG 2.4.11's thresholds, and no control class renders nothing at all. The application carries **one** focus system, not two — the existing global `theme.ts` rule is either
reconciled with the authored token or explicitly scoped, by a stated and justified choice. The result is defended by a committed real-browser gate and by a repository guard against reintroducing the local `sx` patterns that deleted these
affordances in the first place, and focused-state visual evidence is produced for every affected record and put in front of the repository owner without any agent claiming its acceptance.

## Boundary Rationale

One vertical capability, delivered whole, and deliberately large. The unit of work is the size of what ADR-0013 accepted: Option A is a single authored token applied across the app's **single shared styling boundary**
(`core/ui-react/src/app/theme.ts`), and the one user-observable result is "keyboard focus is visibly and consistently indicated". The measurement, the authored rules, the two affordance-deletion unwinds, the gate, and the registry
evidence are not independently reviewable apart from each other: a family authored without its full-opacity measurement has no defensible literal value, and an unwind without an authored rule paints nothing.

**Nothing is split off, and each candidate split was rejected for a stated reason.** Splitting by control family, by route, or by `theme.ts`-versus-`sx` is a split by source file or layer, which `README.md`'s *Creating Task Batches*
forbids; worse, it would leave the app carrying two focus systems between packets, which ADR-0013's `Human Decision` explicitly forbids. Splitting "the five WCAG 2.4.7 failures" from "the rest" is **ADR-0013's Option D**, which was
considered and **not accepted** — sequencing it would narrow the accepted decision under another name. There is no genuine dependency, second product capability, second runtime boundary, or unresolved contract inside this work.

**One boundary is real and is drawn explicitly rather than silently.** ADR-0013 requires focused-state visual evidence for "every record owning an interactive control". Ten records carry a `visual.contract` today and gain one additive
focused state here. The remaining records that own a React-rendered interactive control (`F-SEARCH-PROGRESS`, `F-STATS-SHELL`, `F-STATS-INDEXERS`, `F-HISTORY-SEARCHES`, `F-HISTORY-SAVED-SEARCHES`, `F-SYSTEM-NEWS`) are
`visual.status: unassessed` and have **no contract at all**. Authoring a first full visual contract for those surfaces is their own visual-parity assessment, not focus work, and bundling it here is exactly the "combine unrelated features
to increase task size" this project forbids. So those records get their focused-state **evidence** (captures, recorded here, put in front of the owner) plus a `gaps`/`backlog` entry naming the outstanding acceptance — but not a
manufactured contract. This narrows no remedy: every one of their controls is still authored, measured, and gated.

## Decision Dependencies

- Accepted ADRs governing this task: **ADR-0013** (`decisions/ADR-0013-application-wide-keyboard-focus-indication.md`, accepted 2026-08-19, **Option A**) is the governing decision and this packet implements exactly it. Options B, C and D
  are recorded there as rejected — **including the proposer's own recommendation of Option B** — and none is available to any agent here. In particular, raising the precedence of `theme.ts:184-187`'s global `:focus-visible` rule (by
  specificity, by `!important`, or by per-family opt-in) **is Option B's mechanism and is not this packet's**; do not drift into it because its engineering case reads as cleaner. **ADR-0004** makes accessibility an independent gate,
  settles the evidence class as real-browser Playwright (jsdom has no `:focus-visible`, no layout, no computed outline, no ripple element), and forbids removing, skipping, weakening, or ignoring any test — every test change here is
  additive. **ADR-0002** binds the remedy to MUI's own primitives: no bespoke focus widget, no second component suite. **ADR-0006** governs the focused states this introduces and reserves every baseline and variance acceptance for an
  explicit human decision. **ADR-0009** is why several controls carry local styling that overrides MUI's focus affordances; it is not relitigated here. **ADR-0012** supplies the precedent for recording a version-scoped re-verification
  duty in the code that depends on it.
- Proposed or rejected ADRs blocking this task: **None**.
- **ADR-0013 is a technical decision and is not visual acceptance**, and says so itself. Every record touched here keeps its current `visual.status`; no `decision`, `accepted_by`, or `accepted_on` key is added, edited, or re-dated by any
  agent, and no variance is marked `accepted`.

## Files Allowed To Modify

- `core/ui-react/src/app/theme.ts` — the authored focus token and the per-family `styleOverrides` entries, plus whatever the stated reconcile-or-scope choice does to the existing `MuiCssBaseline` `:focus-visible` entry.
- `core/ui-react/src/app/theme.test.ts` — **only** three literal assertions: the `MuiCssBaseline` `":focus-visible"` entry (`:173` at baseline `dfe9f8a2e`, `:188` in the current working tree), `MuiButton.styleOverrides.root` (`:129` at
  baseline, `:132-144` now), and `MuiChip.styleOverrides.root` (`:148` at baseline **and** now, still pinning `{height: 26, borderRadius: 7}`) — each updated to the value ADR-0013's accepted Option A actually produces; no other assertion
  in this file may be added, removed, or changed. All three stay literal-value assertions and none may be weakened, loosened, deleted, or skipped (ADR-0004). See the *Acceptance* criterion that fences this.
- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx` — **only** `queryInputSx` (`:111-117`), `pairedInputSx` (`:87-97`), `advancedInputSx` (`:99-108`), and the category `TextField`'s
  `"& .MuiOutlinedInput-notchedOutline": {border: "none"}` (`:480-482`). No other rendering, prop, handler, or `data-testid`.
- `core/ui-react/src/features/search/results/SearchResults.tsx` — **only** the select-all `Checkbox`'s `disableRipple` (`:1735`) and, if the chosen indicator needs it, that control's own focus rule. Nothing else in this 1700-line file.
- `tests/system/tests/focus-indication.spec.ts` — **new file**, the committed gate. A new file rather than edits to existing specs, so the change is additive at the file level and no existing assertion can be disturbed.
- `core/ui-react/scripts/validate-focus-affordances.mjs` — **new file**, the repository guard; and `core/ui-react/package.json`'s `scripts` block **only**, for its `validate:focus-affordances` entry. No dependency added, moved, or
  removed, and `package-lock.json` must come out unchanged.
- Focused-state captures under `tests/system/visual-evidence/<F-RECORD-ID>/` (registry-cited) and `tests/system/visual-evidence/FM-053/` (task-scoped measurement evidence, never cited as an ADR-0006 baseline). The whole tree is
  git-ignored (`tests/.gitignore:33`), which is this repository's existing evidence convention.
- `docs/frontend-migration/FEATURES.yaml` — for the ten contract-carrying records (`F-PLATFORM-SHELL`, `F-SEARCH-FORM`, `F-SEARCH-MEDIA`, `F-SEARCH-INDEXERS`, `F-SEARCH-RECENT`, `F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`,
  `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-SAVED`): `gaps`, `backlog`, one additive `visual.contract.states` entry, additive `visual.contract.geometry_checks` entries, additive `visual.snapshots` entries, and additive
  `proposed` `visual.variances`. For `F-SEARCH-PAGING` (`visual.status: accepted`): see *Acceptance*; by default **nothing**. For the six unassessed records: `gaps` and `backlog` **only**. Not `visual.applicability`, not `status`, not
  `contract.setup`, not `contract.viewports`, not `visual.evidence` unless the new spec must be listed, not `parity`, `tests`, `selectors`, `target`, or `task` — and not one character of any record not named above.
- `docs/frontend-migration/STATUS.md` and this task packet.

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- **Option B's mechanism, in any form.** No specificity raise, no `!important`, no per-family opt-in on `theme.ts:184-187`'s global rule as the way the indicator is delivered. Scoping that rule is permitted only as the *reconciliation*
  half of the choice below, never as the indicator's mechanism.
- **Unwinding the three `notchedOutline` `borderColor` recolours** at `RefineSidebar.tsx:218-220`, `filterControls.tsx:147`, and `DownloadActions.tsx:85`. FM-052 measured that they **raise** that family's focused-versus-unfocused
  contrast to 4.53–5.56:1, against 3.15–3.45:1 for MUI's stock un-overridden rendering. Removing them would make the app measurably worse on the one axis that family already passes. This is the single most likely thing an implementer
  "cleans up" by habit; it is a regression, and it is forbidden here.
- **Chromium's UA focus ring on `::-webkit-calendar-picker-indicator`** (FM-052's mechanism 6, inside each `type="datetime-local"` filter). No repository file authors it; ADR-0013 records that no option reaches it and none proposes to.
  Setting `color-scheme` or restyling a UA pseudo-element is not available here.
- **Any structural or behavioral change to any control**: no role change, no relocation, no new prop beyond what the indicator needs, no changed accessible name, and **no `data-testid` removed or renamed** (compatibility contracts under
  `README.md`'s *Registry Rules*).
- **Any human visual or accessibility acceptance**, and any `visual.status` promotion to `accepted`. Producing and presenting evidence is this packet's job; granting acceptance is not available to its implementer or its reviewer.
- **The pre-existing, unrelated outstanding acceptances**: `F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER` and `F-SEARCH-RECENT`'s standing baselines, and the two `proposed` ADR-0011 variances. They are separately outstanding, they are not
  discharged here, and they are not re-dated, withdrawn, or bundled into this packet's evidence.
- **A first visual contract for any `unassessed` record.** See *Boundary Rationale*.
- **Reopening FM-052**, editing any `done` packet, or re-running its audit wholesale.
- **Any dependency change**, including the `@mui/material` version: every finding here is scoped to `7.3.9` and must not move.

## Context To Read

- `decisions/ADR-0013-application-wide-keyboard-focus-indication.md` **in full**, and especially `## Human Decision` with its `### What the accepted option inherits from the evidence above` subsection — that subsection exists so the
  remedy author does not have to reconstruct the constraints from a 900-line audit. Note its lettering hazard: the owner's answer "c" maps to this ADR's **Option A**, not its Option C.
- `tasks/FM-052-keyboard-focus-indication-audit.md`'s Handoff **in full** — the control-class inventory, the per-class disposition table, the mechanism named per class, and the capture paths. It is the before-state this packet is measured
  against, and it is where the family-to-feature-record mapping comes from. Its class names (`search-query-input`, `checkbox-select-all`, …) are the audit's own labels, **not** `data-testid` values; do not use them as selectors.
- `decisions/ADR-0004-testing-and-parity.md` in full; `decisions/ADR-0006-visual-parity-policy.md`'s `Consequences` (who may accept a baseline or variance); `decisions/ADR-0002-frontend-stack.md`; `decisions/ADR-0012`'s `Consequences`
  (the version-scoped re-verification duty this follows).
- `tasks/FM-050-recent-search-refill-keyboard-reachability-remedy.md` — the committed pattern for a version-scoped code comment, for a negative-control probe with SHA-256 restoration, and for a keyboard-only real-browser spec.
- `core/ui-react/src/app/theme.ts` in full: its five `components` entries, and the `MuiCssBaseline` `:focus-visible` rule at `:184-187` (`outline: "3px solid currentColor"`, `outlineOffset: "3px"`).
- `core/ui-react/src/app/theme.test.ts` — the three assertions named under *Acceptance* (baseline `:129`, `:148`, `:173`), **the whole `it()` block that contains the first two of them**, and, beside them in the same `describe`, the
  `MuiPaper.styleOverrides.root` test, which is this file's own precedent for asserting a theme-reading `styleOverrides` function by resolving it rather than by loosening the matcher. Read the enclosing `it()` blocks whole: two of the
  three named assertions share one, which is why the third stayed invisible until the second was fixed.
- The affordance sites: `SearchWorkspace.tsx:87-97`, `:99-108`, `:111-117`, `:480-482`; `SearchResults.tsx:1728-1746`; and, read-only, the three recolour sites named under *Out Of Scope*.
- The installed MUI 7.3.9 sources, **cited by symbol name and quoted text, never by `node_modules` line number** (coordinates rot between installs — the failure mode FM-047 hit, cited as such by ADR-0013): `internal/SwitchBase.js`'s
  `SwitchBaseRoot`/`SwitchBaseInput`; `ButtonBase/ButtonBase.js`'s root `outline: 0`, its `focusRipple` default and its `.Mui-focusVisible` propType comment; `InputBase/InputBase.js`'s `.MuiInputBase-input:focus { outline: 0 }`;
  `Select/SelectInput.js`'s class list on the `role="combobox"` node; `OutlinedInput`'s focused `notchedOutline` rule; `MenuItem/MenuItem.js`, `ListItemButton/ListItemButton.js`, `Chip/Chip.js`, `Link/Link.js`'s `&.Mui-focusVisible`
  rules.
- `uimock/NZBHydra Search.dc.html` — the ADR-0009 visual reference. It declares **`outline:none` 15 times** and authors **no focus-state style whatsoever** (its only `focus` occurrences are the `onFocus`/`onFocusSearch`/`searchFocused`
  JS bindings). That is the literal fact the ADR-0006 variance below is written against; confirm it rather than trusting this sentence.
- WCAG 2.2 SC **2.4.7 Focus Visible** (AA) and SC **2.4.11 Focus Appearance** (AAA). FM-052's thresholds are theirs and are reused unchanged here: minimum changed area `2 × perimeter` of the control box (`4(w+h)` px²), minimum contrast
  **3:1** between the changed area's focused and unfocused colours.
- `README.md` — *Registry Rules*, *Visual Parity*, *Verification Integrity*, *Agent Autonomy And Escalation*.

## Acceptance

**The global rule is reconciled or scoped, by a stated choice.** `theme.ts:184-187`'s `MuiCssBaseline` `:focus-visible` rule stays in force today, and Option A's own recorded cost is that it introduces a second focus token beside it. Decide
explicitly — reconcile the authored per-family token with the global rule, or scope the global rule so the two cannot silently coexist — and state in the handoff **which, and why**, naming what each control family renders afterward. A
handoff that adds authored rules without addressing this criterion does not discharge it. Note that mechanism 7 (`stats-identifier-link`, MUI `Link` with the default `component="a"`) renders the global rule **undefeated and passing** at
7.34:1 and 912.00 px² against a 536.00 px² threshold; whichever choice is made must not regress it.

**Each family is authored on the selector that actually reaches it.** Derive the family list from FM-052's inventory, not from this packet, and record the derivation. It is expected to cover: the `ButtonBase` ripple family
(`Button`/`IconButton`/`Tab`); the `SwitchBase` family (`Checkbox`/`Radio`/`Switch`); the `InputBase` family, including **every `Select` trigger** (the `role="combobox"` div carries the shared `MuiInputBase-input` class — FM-052's own
source-only reading of `SelectInput.js` got this wrong before it checked the live class list); the `OutlinedInput`/`notchedOutline` family; `MenuItem`/`ListItemButton` including the compound `Mui-selected` variant; `Chip`; and the
anchor family. Any family added or dropped relative to FM-052's inventory is called out with its reason.

- **`Checkbox`/`Radio`/`Switch` are authored on the root `Mui-focusVisible` class, not on `:focus-visible`.** This is not optional and is the entire reason Option A was chosen over Option B for this family: `internal/SwitchBase.js`
  renders `SwitchBaseRoot` (a `styled(ButtonBase)`) with `component: 'span'` and `additionalProps` including `role: undefined, tabIndex: null`, so the visible root is not focusable, while `SwitchBaseInput` is a `styled('input')` with
  `{position: 'absolute', opacity: 0, width: '100%', height: '100%', …}`. A `:focus-visible` rule at any specificity matches that transparent overlay and paints there invisibly. Verify this against the installed 7.3.9 source **and**
  against live computed styles before authoring.
- **Every literal value is measured live, in a real browser, at full opacity.** Record, per family, the authored indicator's literal declaration, its changed area in px² against that control's own `4(w+h)` threshold, and its contrast
  ratio against its own composited unfocused ground — **numbers to two decimals**, never "denser", "stronger", or "clearer". **Re-reading FM-052's ripple table instead of measuring the new authored indicator is a review failure.** Those
  `1.19:1`–`2.38:1` figures are `currentColor` composited at `.MuiTouchRipple-rippleVisible`'s static `opacity: 0.3`; an authored outline or `box-shadow` paints opaque and yields different, higher numbers for the same `currentColor`.
- **Re-measure the `Button color="error"` Delete family rather than inheriting its figures.** Measure **both** instances live — the confirmation-dialog Delete (`SavedSearchesPage.tsx:170`) and the saved-searches table-row Delete — as part
  of building their authored indicator. FM-052's 1.19:1/1.22:1 for this family is the one figure in that audit attested by direct re-measurement alone, without a fourth independent review pass, and `STATUS.md` records that a remedy author
  should re-measure it rather than trust it.
- **`currentColor` is not assumed sufficient anywhere.** Where a family's measured full-opacity contrast is below 3:1, give it an explicit colour and record the literal. The two directly measured data points to reason from are the bare
  sanitized `<a href>` in `NewsPage`'s `SafeRichContent`, whose `currentColor` is the UA default link blue `rgb(0,0,238)` at **1.29:1** (insufficient), and mechanism 7's brand teal `primary.main` `oklch(0.75 0.1 190)` at **7.34:1**
  (sufficient). Families whose `currentColor` is a local `sx` value (`#7c8483`, `#6b7472`, `text.secondary`) or a dark `contrastText` on a `contained` button's own teal ground each need their own measurement.
- **Geometry is measured for clipping and collision, not assumed.** The app's own authored geometry — a 3px outline at a 3px offset, area `6(w+h) + 108` px² — is the natural starting point and is the one geometry this repository has
  measured passing (mechanism 7). But it has never been rendered at scale here, and ADR-0013 records that whether an outset ring is clipped by an `overflow: hidden` ancestor or collides with a neighbour is **unmeasured**. Measure it in
  the results table rows, the refine sidebar's dense pill rows, and the sticky toolbar/header specifically. Where an outset ring clips or collides, shaping that family's indicator differently (inset, `box-shadow`, a different offset) is
  exactly the per-family latitude the owner chose; record the literal and the measured reason.

**The affordance deletions are unwound and the three bare renderings gain an affordance.**

- `SearchWorkspace.tsx:480-482`'s `"& .MuiOutlinedInput-notchedOutline": {border: "none"}` forces `border-width: 0px` in **both** states, so no border-based indicator can ever paint on the category `Select`. Remove or re-scope it so the
  authored indicator paints. If the resting borderless rendering is preserved (it is an ADR-0009 mock-fidelity choice), state how, and prove the focused state paints.
- `SearchResults.tsx:1735`'s `disableRipple` on the select-all `Checkbox` is the app's only one. Remove it, or replace the ripple with this packet's `SwitchBase` root-class indicator. Either way that control must render a visible
  focused/unfocused delta on a **non-transparent** node — FM-052 measured its current delta painting on the `opacity: 0` input overlay.
- `queryInputSx`, `pairedInputSx` and `advancedInputSx` have **no** focus-reactive affordance at all today; they are three of FM-052's five outright 2.4.7 failures (the query field, the paired season/episode inputs — which declare no
  border and have no wrapper — and the Advanced-panel Age/Size ranges, whose 1px border is static). Each gains one, each measured.
- After the remedy, **no control class in FM-052's inventory renders an empty focused/unfocused delta**. State this per class against the inventory, not in aggregate.

**Every MUI mechanism claim is verified against live computed styles, never against source inference alone.** Source-reading alone has already produced wrong diagnoses twice in this exact investigation. Read the source to form the
hypothesis; confirm it in the browser before acting on it, and say in the handoff which claims were confirmed that way.

**The committed gate is a real-browser Playwright spec, and it bites.** `tests/system/tests/focus-indication.spec.ts`, additive, never a component/jsdom test — ADR-0004 settles that jsdom has no `:focus-visible`, no layout, no computed
outline and no ripple element and can establish nothing here.

- Every control is reached by real `Tab`/`Shift+Tab` keypresses from a known start. **Never `locator.focus()`, never `click()`.** Record `element.matches(":focus-visible")` for each.
- **`page.goto("ui/react?redirect=/")`, never a bare `page.goto("/")`** — a bare goto lands on the legacy AngularJS shell, where these defects and fixes do not exist, so the test would pass for the wrong reason. FM-051's first draft made
  exactly this mistake.
- One representative control per authored family, at both named viewports where the family renders at both. Assert (a) the focused/unfocused computed-style delta is **non-empty**, and (b) the **literal authored values** of the accepted
  option — declaration, colour, width, offset — never a screenshot comparison.
- **A negative control proving the gate detects failure**: disable one authored family's rule, observe the new spec **fail**, record the exact failing assertion and message, restore, and confirm the restored file byte-identical by
  SHA-256 before the passing run counts as evidence.
- **A version-scoped re-verification duty in the code**, following ADR-0012's precedent: a comment beside the authored token in `theme.ts` naming ADR-0013, the exact `@mui/material` `7.3.9` pin, the MUI internals it depends on **by
  symbol name**, and the requirement that after any MUI upgrade this be re-proven by re-running the spec rather than by re-reading the sources.
- **No test is removed, skipped, weakened, or ignored** (ADR-0004), and no existing spec file is edited.

**Exactly three superseded `theme.test.ts` assertions are updated, and nothing else in that file is.** `core/ui-react/src/app/theme.test.ts` pins the pre-ADR-0013 shape of three objects the accepted decision necessarily changes, so no
correct implementation of Option A can leave all three passing. The list below is exhaustive: exactly these three, updated to the literal values `createHydraTheme` actually produces afterward, and no fourth.

- The `":focus-visible"` entry of `MuiCssBaseline`'s resolved `styleOverrides` (asserted at `:173` as `{outline: "3px solid currentColor", outlineOffset: "3px"}`). Both branches of the reconcile-or-scope criterion above change this
  entry; assert what the stated choice produces — the authored token's literal width, colour and offset if the rule is reconciled — and keep asserting it by literal value. Deleting the assertion, or replacing it with an assertion that
  the entry is absent or unspecified, does not discharge this.
- `theme.components.MuiButton.styleOverrides.root` (asserted at `:129` as exactly `{textTransform: "none", borderRadius: 8}`). Authoring the `ButtonBase` family adds a key to that object whether or not the override becomes a
  theme-reading function, so restate the assertion over the full authored value. If it does become a function, follow this file's **own existing precedent in the same `describe`** — the `MuiPaper.styleOverrides.root` test's
  `expect(typeof root).toBe("function")`, then resolve it and `toEqual` the resolved object — rather than reaching for a looser matcher. The mock's `textTransform: "none"` and `borderRadius: 8` literals, which that test exists to pin,
  must still be asserted afterward.
- `theme.components.MuiChip.styleOverrides.root` (asserted at `:148` as exactly `{height: 26, borderRadius: 7}`). `Chip` is one of the authored control families, so this override gains the same `&.Mui-focusVisible` key for the same
  structural reason `MuiButton`'s does — it reads the shared focus token off the theme. Restate the assertion over the full authored value; if it has become a theme-reading function, follow the same `MuiPaper.styleOverrides.root`
  precedent already applied to `MuiButton` (`expect(typeof root).toBe("function")` as a guard, then resolve and `toEqual` the resolved object) rather than a looser matcher. The pre-existing `height: 26` and `borderRadius: 7` literals,
  which that assertion exists to pin, must still be asserted afterward.

**Why this list is three and not two.** `MuiChip`'s assertion sits inside the **same `it()`** as `MuiButton`'s (`should adopt the mock's denser radii and sentence-case buttons`), three assertions below it, and vitest abandons an `it()` at
its first failing assertion — so the `MuiButton` failure masked it in every test run made before `MuiButton` was fixed. Do not treat a shrinking failure count as proof the list is complete; run the suite to a clean `247 passed (247)`.

All three assertions stay literal-value assertions: `toEqual` is **not** downgraded to `toMatchObject`, `expect.objectContaining`, `toBeDefined`, or a `typeof` check standing alone; no test in the file is added, removed, renamed, skipped
(`it.skip`/`it.todo`), or commented out; and no assertion outside those three changes (ADR-0004 forbids removing, skipping, weakening, or ignoring any test). The test names may change only if the assertion they now make renders the
existing name inaccurate. `npm run test` must come back at its unchanged baseline tallies — `38 passed (38)` files, `247 passed (247)` tests — a restored count, never a lowered one. If a fourth assertion in this file turns out to be
invalidated too, that is a further escalation under `README.md`'s *Agent Autonomy And Escalation*, not a licence to widen this fence.

**The repository guard makes reintroduction detectable.** `core/ui-react/scripts/validate-focus-affordances.mjs`, wired as `npm run validate:focus-affordances`, fails on the known affordance-deleting patterns reappearing anywhere under
`core/ui-react/src` — at minimum a `notchedOutline` rule setting `border`/`border-width` to none or `0`, and `disableRipple` on a control with no authored `Mui-focusVisible` rule. Prove it fails on a deliberately reintroduced instance,
then revert and confirm byte-identity by SHA-256. ADR-0013 names this how the failures got here: each local `sx` was individually reasonable and each deleted an affordance.

**Visual contract — one additive focused state, scoped semantically, acceptance reserved for a human.**

- **State name**, added to each of the ten contract-carrying records' `visual.contract.states`: `keyboard-focus-indicator`.
- **Setup** is the existing per-record deterministic setup, extended only by "the named control reached by real `Tab`/`Shift+Tab` keypresses from a known start, with no pointer interaction". **Viewports** are the existing named
  `desktop` 1280x800 and `mobile` 390x844; no new viewport is introduced.
- **Geometry checks**, additive, per record, stated with the record's own control named: the focused control's computed-style delta against its unfocused state is non-empty; the authored indicator's changed area is at least
  `2 × perimeter` (`4(w+h)` px²) of the control box, with the measured figure recorded; its contrast against its own composited unfocused ground is at least **3:1** at full opacity, with the measured figure recorded; and the indicator is
  neither clipped by an ancestor nor the cause of page-level horizontal overflow at either viewport.
- **Evidence**: `tests/system/tests/focus-indication.spec.ts`, added to each touched record's `visual.evidence` where not already implied. **Snapshots**: one narrow focused capture per record at `desktop`, under
  `tests/system/visual-evidence/<F-RECORD-ID>/keyboard-focus-<control>-desktop.png`, written by `captureVisualRegion` from `tests/system/tests/visualEvidence.ts` with the clip expanded enough to contain an outset ring — an element-box
  screenshot crops a 3px outline at a 3px offset away entirely, and a cropped indicator photographs identically to an absent one.
- **One `proposed` variance per touched record**, with this literal justification: the ADR-0009 source mock `uimock/NZBHydra Search.dc.html` declares `outline:none` 15 times and authors no focus-state style at all, so an authored focus
  indicator is a deliberate divergence from the visual reference, adopted under ADR-0013 for WCAG 2.4.7/2.4.11 rather than for mock fidelity. Add a second `proposed` variance for any family whose authored geometry deviates from the app's
  own `3px`/`3px` authored literals, stating the measured clipping or collision reason.
- **`visual.status` stays exactly as it is on every record.** Nothing becomes `accepted`; no `decision`/`accepted_by`/`accepted_on` key is added, edited or re-dated; no existing variance's status is changed; no existing `note` is
  rewritten. The handoff states plainly that this evidence is **proposed** and that acceptance is outstanding and belongs to the repository owner alone.
- **`F-SEARCH-PAGING` (`visual.status: accepted`) is handled by exception.** Its accepted contract has one state and one geometry check, both about the load-more/load-all controls' placement and page-level overflow. Determine whether the
  authored indicator falsifies either — in particular whether an outset ring introduces horizontal overflow at `mobile`. If both stay literally true, **change nothing on that record's `visual` block**: do not add a state to an accepted
  contract, do not re-date the 2026-08-16 acceptance, and record the focused-state evidence for its controls under `tests/system/visual-evidence/FM-053/` with a `backlog` line naming the outstanding focused-state acceptance. If either
  becomes untrue, demote the record to `proposed` with a `note` stating exactly what stopped being true (the mechanism `F-SEARCH-SAVED`'s own note already records for a prior demotion), never re-accept it, and escalate in the handoff.

**Registry reconciliation, against the evidence.**

- **The stale `F-PLATFORM-SHELL` sentence is corrected.** Its `backlog.rationale` no longer says "no control family renders the global rule as authored" — that clause is contradicted by FM-052's own mechanisms 5 and 7 and was already
  withdrawn in the FM-052 close-out; confirm the current text is accurate against the audit and correct any residue. ADR-0013 assigns this correction to the task designer's packet rather than to the ADR, which may not edit a registry.
- The four records FM-052 extended (`F-PLATFORM-SHELL`, `F-SEARCH-FORM`, `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-MEDIA`) have their focus `gaps` phrase **discharged only against the recorded evidence** — removed if the measurement shows
  the family now renders a passing authored indicator, **narrowed** (never deleted) to name exactly what remains unevidenced otherwise. `backlog` names ADR-0013 as the accepted decision and this packet as its implementation, per
  `README.md`'s *Registry Rules*.
- The six `unassessed` records get one `gaps` phrase and a `backlog.rationale` extension recording that focused-state visual evidence exists and that this record's own first visual contract and its acceptance are outstanding.
- Every other linked record's remaining fields are **explicitly confirmed unchanged** rather than silently left alone.

## Verification

Prerequisites and required service state: `tests/system` runs against a **real JVM backend plus mockserver**, not a Vite dev server. Use the documented launcher, which builds the `core` and `mockserver` exec JARs with Maven and starts the
sonarr/radarr Docker fixtures. Maven, a JDK, Docker, and installed Playwright Chromium browsers must all be available. Record any command as blocked if the environment cannot provide them — never imply it passed. Exploratory measurement
may use a scratch spec under the git-ignored `tests/system/.playwright-cli/`; confirm it is gone at handoff.

- Working directory: `/home/sist/projects/nzbhydra2/core/ui-react`
- `npm ci` — required because this task modifies `package.json` (`README.md`'s *Verification Integrity*). Record which install actually ran, and confirm `package-lock.json` comes out unchanged.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`, `npm run check:api` — all pass, with no new lint warnings. Record the vitest file and test tallies.
- `npm run validate:focus-affordances` — passes, and is separately recorded as **failing** on the deliberately reintroduced pattern, with the exact message and the SHA-256 proving byte-identical restoration.
- `npm run validate:migration` — prints `Migration registries and task metadata are valid.` and exits 0, with FM-053 placed in the `STATUS.md` section its status requires.
- Working directory: `/home/sist/projects/nzbhydra2/tests/system`
- `npx tsc --noEmit` — no errors. `npx prettier --check .` — passes; the tree has been Prettier-clean since `ba4acd521`.
- Working directory: `/home/sist/projects/nzbhydra2`
- `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/focus-indication.spec.ts` — the **whole file** passes. Record per-test results, not just the summary. A `--grep`-narrowed run does not satisfy this;
  narrowed runs used while iterating are recorded as such.
- The same launcher, whole-file and un-narrowed, for every existing spec whose surfaces this packet restyles: `tests/search.spec.ts`, `tests/results.spec.ts`, `tests/search-history.spec.ts`, `tests/stats.spec.ts`, `tests/news.spec.ts`,
  `tests/smoke.spec.ts`. All must pass at their existing counts; any change in count is a regression to explain, not a number to update.
- Record the negative-control probe separately: the failing run with one authored family's rule disabled, its exact failing assertion, and the SHA-256 proving byte-identical restoration before the passing run above.
- `git diff --check` — no whitespace errors. `git diff --stat` — exactly the paths under *Files Allowed To Modify*; anything else is an escalation.
- `git diff -- core/ui-react/src/features/search/results/RefineSidebar.tsx core/ui-react/src/features/search/results/filterControls.tsx core/ui-react/src/features/search/results/DownloadActions.tsx` — **empty**. The three recolours are
  out of scope and this is the mechanical proof they were left alone.
- Confirm no `data-testid` was removed or renamed, mechanically by diffing the `data-testid` literals in the working tree against `HEAD`, not by inspection.
- Confirm task-owned changed files are all listed under Files Allowed To Modify, and that verification leaves no unexpected generated or modified files — no Playwright report, trace, scratch spec, or stray screenshot beyond the
  registered captures.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate. The evidence is a deliverable, not a summary: include the family list with its derivation from FM-052's inventory, the per-family authored
literal, its measured area and its measured full-opacity contrast (two decimals each), the reconcile-or-scope choice with its justification, the per-class confirmation that no delta is empty, the negative-control probe records for both
the spec and the guard, the clipping/collision measurements at the three named dense surfaces, and the capture paths. Mark the task `review` only after required verification succeeds. An implementer must never mark a task `done`, and
must never claim, grant, or imply any ADR-0006 acceptance.

## Fresh Review

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`.

The reviewer's obligations here: confirm the packet implements **Option A** and did not drift into Option B's precedence mechanism or Option D's narrowed scope; confirm every contrast and area figure was **measured live at full opacity**
rather than carried over from FM-052's ripple table, and that the `Button color="error"` family was genuinely re-measured; confirm the `SwitchBase` family is authored on the root `Mui-focusVisible` class and that its indicator paints on a
non-transparent node; confirm the three `notchedOutline` `borderColor` recolours are byte-identical to baseline; confirm the gate is real-browser, keyboard-only, selects React via `ui/react?redirect=/`, and genuinely failed in the
negative-control probe before passing; confirm the guard genuinely failed on a reintroduced pattern; confirm every MUI internal is cited by symbol name rather than by `node_modules` line number; and confirm no `visual.status`,
`decision`, `accepted_by`, `accepted_on`, or variance status was promoted. **A reviewer may verify this evidence but may not supply, imply, or re-date any ADR-0006 acceptance.**

## Handoff

### Outcome

**Complete and unblocked.** Both escalations this packet raised are discharged: the second task-designer refinement extended the `core/ui-react/src/app/theme.test.ts` grant to all **three** invalidated assertions, all three are now updated
inside that grant, none is weakened, and `npm run test` is back at its unchanged baseline — **`Test Files 38 passed (38)`, `Tests 247 passed (247)`**, a restored count rather than a lowered one. That was the only thing standing between this
packet and `review`. *The Blocker* below is retained as the record of how it was raised and closed.

ADR-0013's accepted **Option A** is implemented as written. `core/ui-react/src/app/theme.ts` now declares one explicit focus-ring token — `focusRing(theme)`, resolving to `outline: 3px solid <palette.primary.main>` at `outline-offset: 3px`
(outset) or `-3px` (inset) — and authors it on **eleven** control families, each keyed to that family's own `&.Mui-focusVisible` / `:focus-visible` / `:has(:focus-visible)` selector. No specificity raise, no `!important`, and no per-family
opt-in on the global rule is used anywhere: Option B's mechanism is not present in the diff.

Every family was reached by real `Tab`/`Shift+Tab` (or, for menu items, real `Enter`/`ArrowDown`) in Chrome for Testing against a real Maven-built JVM backend, and **every one clears both WCAG axes**: measured full-opacity contrast
**6.20:1 to 7.54:1** against a 3:1 requirement, and measured changed area **1.4x to 2.3x** its own `4(w+h)` threshold. FM-052's five `fails 2.4.7` classes are all remedied and **no control class in that inventory renders an empty
focused/unfocused delta** any more (stated per class below). The one class that already passed both criteria — `stats-identifier-link`, FM-052's mechanism 7 — still passes, at the same 7.34:1 and the same 3px/3px geometry.

### The Blocker — raised twice, now fully discharged

**Nothing is outstanding. This section is the closed record of two escalations, kept because it is the evidence trail for why three assertions in one file changed.** Both grants were made by task-designer refinements, both were discharged
exactly as written, and `npm run test` is back at `38 passed (38)` / `247 passed (247)`.

#### What was escalated, and why twice

`core/ui-react/src/app/theme.test.ts` pinned the pre-ADR-0013 shape of **three** theme objects the accepted Option A necessarily changes, and the file was absent from *Files Allowed To Modify*. Both escalations were raised under
`README.md`'s *Agent Autonomy And Escalation* ("satisfying the task requires modifying a file outside `Files Allowed To Modify`") rather than by silently broadening scope, and each refinement was a **write-scope grant, not a decision**: no
ADR was implicated or reopened, no product/UX/architecture/API/migration choice was made, and ADR-0004 was never in tension, because every restated assertion keeps a literal-value `toEqual` over the whole authored object and restores the
count to 247 rather than lowering it.

The second escalation was not the first gap repeated. `MuiChip`'s assertion sits inside the **same `it()`** as `MuiButton`'s (`should adopt the mock's denser radii and sentence-case buttons`), three assertions below it, and vitest abandons
an `it()` at its first failing assertion — so while `MuiButton` was failing, `MuiChip`'s failure was **unobservable**. The first report's `2 failed | 245 passed (247)` was an honest count of what the runner could show; the third failure
became visible only once the first two were fixed, at `1 failed | 246 passed (247)`.

#### All three assertions, as updated

| Assertion | Before | After, as ADR-0013's accepted Option A actually produces it |
|---|---|---|
| the `":focus-visible"` entry of `MuiCssBaseline`'s resolved `styleOverrides` (`:173` at baseline, `:201` now) | `toEqual({outline: "3px solid currentColor", outlineOffset: "3px"})` | `toEqual({outline: "3px solid oklch(0.75 0.1 190)", outlineOffset: "3px"})` — the literal the *reconcile* branch of this packet's reconcile-or-scope choice produces, read from `focusRing(theme)` with `palette.primary.main`. Still a `toEqual` over the whole entry. |
| `theme.components.MuiButton.styleOverrides.root` (`:129` at baseline, `:132-144` now) | `toEqual({textTransform: "none", borderRadius: 8})` on a plain object | The override is now `({theme}) => ({…})`, so the assertion follows **this file's own `MuiPaper.styleOverrides.root` precedent in the same `describe`**: `expect(typeof buttonRoot).toBe("function")`, then resolve it with `{theme}` and `toEqual` the resolved object — `{textTransform: "none", borderRadius: 8, "&.Mui-focusVisible": {outline: "3px solid oklch(0.75 0.1 190)", outlineOffset: "3px"}}`. |
| `theme.components.MuiChip.styleOverrides.root` (`:148` at baseline, `:157-169` now) | `toEqual({height: 26, borderRadius: 7})` on a plain object | `MuiChip` is **one of the eleven authored control families** (ADR-0013 family G, `theme.ts:471-483`), so its override is now `({theme}) => ({height: 26, borderRadius: 7, "&.Mui-focusVisible": focusRing(theme)})`. Asserted on the **identical `MuiPaper` precedent already applied to `MuiButton`**: `expect(typeof chipRoot).toBe("function")`, then resolve with `{theme}` and `toEqual` `{height: 26, borderRadius: 7, "&.Mui-focusVisible": {outline: "3px solid oklch(0.75 0.1 190)", outlineOffset: "3px"}}`. The observed failure this closes, verbatim: `AssertionError: expected [Function root] to deeply equal { height: 26, borderRadius: 7 }` at `src/app/theme.test.ts:148:65`. |

**Against every fence the two refinements set.** `toEqual` is **not** downgraded to `toMatchObject`, `expect.objectContaining`, `toBeDefined`, or a bare `typeof` check anywhere — each `typeof` check is the precedent's *guard*, standing
beside a full `toEqual`, never in place of one. No assertion is deleted or replaced by an assertion of absence. The literals each assertion exists to pin **are all still asserted**: `textTransform: "none"` and `borderRadius: 8` on
`MuiButton`, `height: 26` and `borderRadius: 7` on `MuiChip`. No test in the file was added, removed, renamed, skipped (`it.skip`/`it.todo`), or commented out, and **no fourth assertion was touched** — the intervening
`MuiOutlinedInput.styleOverrides.root` assertion, which sits between the `MuiButton` and `MuiChip` ones in the same `it()`, is byte-identical. Three explanatory comments were added, one beside each updated assertion. `git diff --` over the
file shows exactly these three assertions and those three comments and nothing else.

**No fourth assertion is invalidated — measured, not assumed.** The prior invocation's reverted probe already ran all three fixes together and returned the suite fully green, which ruled out a fourth hidden failure behind `MuiChip` in that
`it()`. This invocation confirms it as the real outcome rather than a probe: `npm run test` on the delivered tree returns `Test Files 38 passed (38)` / `Tests 247 passed (247)`. The packet's standing note that a fourth invalidated assertion
would be a further escalation rather than a licence to widen the fence was therefore never reached.

**Alternatives considered and rejected, on the record** (retained from the escalations because they remain the reasons each assertion had to change at all, rather than be worked around):

- **Author the ButtonBase family on `MuiButtonBase` instead of `MuiButton`** would have saved `:129`, but it reintroduces exactly the specificity/insertion-order fight against MUI's own resets that ADR-0013 chose Option A to avoid, and it
  does nothing for `:173` or for `MuiChip`.
- **Leaving `":focus-visible"` byte-identical and adding a separate `a:focus-visible` rule beside it** would have saved `:173` and is rejected outright: it leaves a second focus token in force, which ADR-0013's `Human Decision` and this
  packet's *Acceptance* both forbid, and it is gaming a test rather than discharging the criterion.
- **Dropping `MuiChip` from the authored families** to keep its override a plain object is rejected: *Acceptance* requires every family in the derivation to be authored, `validate:focus-affordances` fails when `theme.ts` drops any of the
  eleven (proven by probe C), and ADR-0013 names `Chip` as an in-scope family. It would also silently narrow the accepted option — Option D by another name.
- **Hard-coding the ring colour as a string literal** so `MuiChip`'s override stays a plain object is rejected: it breaks the property the handoff records as deliberate — the token reads `palette.primary.main` so the `dark-dyschromatopsia`
  accessibility variant retunes the ring with the rest of the palette — and it would have to be repeated at all twelve call sites.
- **Redesigning the token or the reconcile choice** to dodge the assertion is out of bounds: that work is already implemented, measured live, and verified, and ADR-0013's accepted option is not open for revision here.

### The reconcile-or-scope choice, and why

**Chosen: reconcile.** `theme.ts:184-187`'s `MuiCssBaseline` `":focus-visible"` entry is kept in force and rewritten to render the *same* `focusRing(theme)` token every per-family entry renders. It is not scoped away and not duplicated:
after this change `focusRing()` is the only focus declaration in the file, and the global entry is one of its twelve call sites.

Why reconcile rather than scope:

1. **Scoping it would orphan the one control class no MUI component styles at all.** `NewsPage`'s `SafeRichContent` renders sanitized third-party HTML through `dangerouslySetInnerHTML`; its `<a href>` carries no `MuiLink`, no `ButtonBase`
   and no `InputBase` class, so `MuiCssBaseline` is the only place in the application that can reach it. Scoping the rule to a narrower selector set would have to enumerate that anchor anyway.
2. **Reconciling fixes that class's actual defect for free.** FM-052 measured it at **1.29:1** — failing not because the rule was defeated (it renders undefeated there) but because `currentColor` resolves to the UA default link blue
   `rgb(0,0,238)`. Substituting the token's explicit colour takes it to a measured **6.63:1**. The spec asserts, in the same test, that the anchor's own unfocused `outline-color` is still `rgb(0, 0, 238)` — proving the ring's colour is
   authored rather than inherited.
3. **It cannot regress mechanism 7, and is measured not to have.** `stats-identifier-link`'s `currentColor` was already `palette.primary.main`, so the reconciled rule paints the identical colour at the identical geometry. Re-measured live:
   **7.34:1**, changed area **972.00 px²** against a **576.00 px²** threshold (the box is 126.00x18.00 in this fixture rather than FM-052's 116.00x18.00 — same rule, same ring, a different identifier string).

**What each family renders afterwards** is the table under *Per-family authored literals*. There is exactly one token, one width, one colour, and two offsets (outset by default; inset only where an ancestor was measured clipping an outset
ring). The `notchedOutline` border MUI itself recolours on `Mui-focused` is **not** a second focus system and is deliberately untouched: it is a *state* affordance that fires on pointer focus and on a `Select`'s `open` state too (FM-052
recorded exactly that for the Downloader dropdown), whereas the authored ring is the application's single **keyboard** focus indicator, keyed to `:focus-visible`/`Mui-focusVisible` and to nothing else.

### The family list, derived from FM-052's inventory

Derivation, mechanically: FM-052's seven mechanisms map onto MUI component families as follows, and each family got the theme entry that actually reaches it.

| FM-052 mechanism | Classes it governs in the audit | `theme.ts` entry authored | Offset |
|---|---|---|---|
| 1. `ButtonBase`'s root `outline: 0` + `TouchRipple` | `search-submit`, `search-advanced-toggle`, `refine-toggle-chip`, `sort-header-button`, `bulk-action-secondary-button`, `stats-tab`, `mobile-nav-hamburger-iconbutton`, `dialog-action-button`, `saved-search-delete-button`, `number-filter-*`, `results-*`, `search-history-*`, `indexer-selection-*`, `recent-searches-trigger`, `refine-*` … | `MuiButton`, `MuiIconButton`, `MuiTab` | `3px` (`MuiTab`: `-3px`) |
| 1 (SwitchBase branch) | `checkbox-select-all`, `checkbox-row-select`, `display-options-checkbox`, `indexer-selection-checkbox`, `stats-history-checkbox` | `MuiCheckbox`, `MuiRadio`, `MuiSwitch` | `3px` |
| 2. `InputBase`'s `.MuiInputBase-input:focus{outline:0}` | `search-query-input`, `advanced-range-input`, `season-episode-paired-input`, and **every `Select` trigger** (`search-category-select`, `search-indexers-select`, `downloader-select`, `stats-history-select`) | `MuiInputBase` (root, `&:has(:focus-visible)`) | `3px` |
| 3. `OutlinedInput`'s focused `notchedOutline` | `refine-filter-title-input`, `refine-numeric-range-input`, `additional-query-input`, `stats-history-text-input`/`-datetime-input` | same `MuiInputBase` root entry (`OutlinedInputRoot = styled(InputBase.InputBaseRoot)`) | `3px` |
| 4. `MenuItem`/`ListItemButton`'s `&.Mui-focusVisible` background | `nav-listitembutton`, `recent-search-entry`, `search-category-option`, `downloader-select-open-option` (the compound `Mui-selected` variant) | `MuiMenuItem`, `MuiListItemButton` | `-3px` |
| 5. bare unclassed `<a href>` | `news-page-link` | `MuiCssBaseline` `":focus-visible"` (reconciled) | `3px` |
| 6. Chromium's UA `::-webkit-calendar-picker-indicator` | `stats-history-datetime-picker-indicator` | **none — out of scope by the packet**; no repository file authors it | n/a |
| 7. MUI `Link` with `component="a"` | `stats-identifier-link` | `MuiLink` (plus the reconciled global rule, which is what already reached it) | `3px` |

**Families added relative to FM-052's inventory, with reasons.** `MuiRadio` and `MuiSwitch` are authored although FM-052's Pass 1 census counts **zero** `Radio` and **zero** `Switch` call sites: ADR-0013 names the family as
`Checkbox`/`Radio`/`Switch`, they share `internal/SwitchBase.js`'s transparent-input problem exactly, and the rule is inert until such a control exists. They are therefore **not** gated by the spec, because there is nothing to keyboard-reach.
`MuiChip` is authored for the same forward-looking reason and is likewise not gated: the application's only `Chip` (`SearchResults.tsx`'s static "Downloaded" indicator) passes neither `onClick` nor `onDelete`, so FM-052 dispositioned it as
not focusable and outside WCAG 2.4.7/2.4.11 scope. **Families dropped: none.**

### Per-family authored literals, measured live at full opacity

Every figure below was read in Chrome for Testing against a real Maven-built JVM backend plus mockserver, from the control's own computed styles after a real keyboard walk — never re-read from FM-052's ripple table, whose `1.19:1`–`2.38:1`
range is `currentColor` composited at `.MuiTouchRipple-rippleVisible`'s static `opacity: 0.3`. Contrast is the authored ring colour (canvas-resolved `rgb(85,194,188)`) against that control's **own** composited unfocused ground, walked up its
own ancestor chain compositing translucent backgrounds until an opaque one is reached. Area is `2t(w+h) + 8to + 4t²`; the threshold is FM-052's, `2 × perimeter` = `4(w+h)`.

| Control (FM-052 class) | Family | Authored literal | Control box | Changed area / threshold | Contrast |
|---|---|---|---|---|---|
| `search-submit` | `MuiButton` | `outline: 3px solid oklch(0.75 0.1 190)`, offset `3px` | 86.00x44.50 | **891.00** / 522.00 | **7.54:1** |
| `search-advanced-toggle` | `MuiButton` | same | 118.00x47.56 | **1101.38** / 662.25 | **6.83:1** |
| `recent-searches-trigger` | `MuiButton` | same | 138.00x36.50 | **1155.00** / 698.00 | **6.63:1** |
| `bulk-action-secondary-button` (Save search) | `MuiButton` | same | 98.00x40.75 | **940.50** / 555.00 | **7.34:1** |
| `sort-header-button` | `MuiButton` | same | 44.50x27.25 | **538.50** / 287.00 | **7.34:1** |
| `refine-category-toggle` | `MuiButton` | same | 215.00x19.25 | **1513.50** / 937.00 | **7.34:1** |
| `refine-category-option` | `MuiButton` | same | 215.00x31.55 | **1587.28** / 986.19 | **7.34:1** |
| `results-selection-caret` | `MuiButton` | same | 15.00x30.75 | **382.50** / 183.00 | **7.34:1** |
| `search-history-refresh` | `MuiButton` | same | 82.00x56.00 | **936.00** / 552.00 | **7.34:1** |
| `dialog-action-button` (Cancel) | `MuiButton` | same | 64.00x36.50 | **711.00** / 402.00 | **6.63:1** |
| **`saved-search-delete-button`, table row (`color="error"`)** | `MuiButton` | same | 64.00x36.50 | **711.00** / 402.00 | **7.34:1** |
| **`saved-search-delete-button`, in the `Dialog` (`color="error"`)** | `MuiButton` | same | 64.00x36.50 | **711.00** / 402.00 | **6.63:1** |
| `paging-load-more` | `MuiButton` | same | 72.00x30.75 | **724.50** / 411.00 | **7.34:1** |
| `paging-load-all` | `MuiButton` | same | 101.00x30.75 | **898.50** / 527.00 | **7.34:1** |
| `mobile-nav-hamburger-iconbutton` | `MuiIconButton` | same | 76.05x44.00 | **828.28** / 480.19 | **6.63:1** |
| `stats-tab` | `MuiTab` | `outline: 3px solid oklch(0.75 0.1 190)`, offset **`-3px`** | 160.00x48.00 | **1212.00** / 832.00 | **7.34:1** |
| `checkbox-select-all` | `MuiCheckbox` | offset `3px`, on the **root** `Mui-focusVisible` | 17.00x17.00 | **312.00** / 136.00 | **7.34:1** |
| `checkbox-row-select` | `MuiCheckbox` | same | 38.00x38.00 | **564.00** / 304.00 | **7.34:1** |
| `stats-history-checkbox` (default padding) | `MuiCheckbox` | same | 42.00x42.00 | **612.00** / 336.00 | **7.34:1** |
| `search-query-input` (`queryInputSx`) | `MuiInputBase` | offset `3px`, on the root via `&:has(:focus-visible)` | 742.00x45.56 | **4833.38** / 3150.25 | **7.54:1** |
| `advanced-range-input` (`advancedInputSx`) | `MuiInputBase` | same | 74.00x34.69 | **760.13** / 434.75 | **6.83:1** |
| `season-episode-paired-input` (`pairedInputSx`) | `MuiInputBase` | same | 40.00x43.41 | **608.44** / 333.63 | **6.20:1** |
| `search-category-select` | `MuiInputBase` | same | 150.00x47.56 | **1293.38** / 790.25 | **6.83:1** |
| `search-indexers-select` | `MuiInputBase` | same | 1164.00x36.41 | **7310.44** / 4801.63 | **6.63:1** |
| `downloader-select` | `MuiInputBase` | same | 180.00x35.69 | **1402.13** / 862.75 | **7.34:1** |
| `refine-filter-title-input` | `MuiInputBase` | same | 215.00x34.69 | **1606.13** / 998.75 | **7.54:1** |
| `refine-numeric-range-input` | `MuiInputBase` | same | 104.50x32.69 | **931.13** / 548.75 | **7.54:1** |
| `stats-history-text-input` | `MuiInputBase` | same | 218.00x56.00 | **1752.00** / 1096.00 | **7.34:1** |
| `nav-listitembutton` (desktop) | `MuiListItemButton` | offset **`-3px`** | 84.00x43.00 | **726.00** / 508.00 | **6.63:1** |
| `nav-listitembutton` (mobile `Drawer`) | `MuiListItemButton` | offset **`-3px`** | 240.00x40.00 | **1644.00** / 1120.00 | **6.63:1** |
| `search-category-option` | `MuiMenuItem` | offset **`-3px`** | 111.00x20.25 | **751.50** / 525.00 | **6.63:1** |
| `recent-search-entry` | `MuiMenuItem` | offset **`-3px`** | 473.25x23.63 | **2945.25** / 1987.50 | **6.63:1** |
| `stats-identifier-link` | `MuiLink` + reconciled global | offset `3px` | 126.00x18.00 | **972.00** / 576.00 | **7.34:1** |
| `news-page-link` (bare `<a href>`) | reconciled global rule | offset `3px` | 140.00x20.00 | **1068.00** / 640.00 | **6.63:1** |

**The `Button color="error"` Delete family was re-measured, not inherited.** Both instances were rebuilt live (a saved search created through the real form, then its delete-confirmation `Dialog`) and both now measure **7.34:1** (table row,
over `background.default` `rgb(31,36,38)`) and **6.63:1** (`Dialog`, over the `Paper`'s `rgb(38,44,46)`). FM-052's 1.19:1/1.22:1 for this family are ripple figures at `opacity: 0.3` in `palette.error.main`; the authored ring paints opaque in
the brand teal, so those numbers do not transfer and are not carried forward. This was the one figure `STATUS.md` records as attested by direct measurement without a fourth review pass; it is now re-measured against the new indicator.

**`currentColor` is assumed sufficient nowhere.** The token's colour is `theme.palette.primary.main` explicitly at every one of its twelve call sites, so no family depends on the element's inherited colour. That is what takes the bare
`<a href>` from 1.29:1 to 6.63:1, and it also removes the whole class of problem FM-052 catalogued — `#7c8483`, `#6b7472`, `text.secondary`, and a `contained` button's dark `contrastText` on its own teal ground never enter the calculation.

### Geometry: clipping and collision, measured rather than assumed

Measured at the three dense surfaces the packet names, plus the two that turned out to matter. For each control the harness computed the real ring rect and walked its ancestor chain to the first ancestor whose computed `overflow` is not
`visible`; it also computed, for the same control, whether a *hypothetical* outset 3px/3px ring would be clipped, which is what justifies each inset decision.

| Surface | Result |
|---|---|
| **Results table rows** (`checkbox-row-select`, `results-expand-duplicates`) | Outset ring **not clipped** (first non-`visible` ancestor is `body`), no collisions. Outset kept. |
| **Sticky results toolbar / table header** (`sort-header-button`, `downloader-select`, `bulk-action-secondary-button`, `results-selection-caret`) | Outset ring **not clipped**; `sort-header-button`'s first non-`visible` ancestor is its own `<th>` and the ring fits inside it. Outset kept. |
| **Refine sidebar dense pill rows** (`refine-category-toggle`, `refine-category-option`, `refine-filter-title-input`, `refine-numeric-range-input`) | Outset ring **not clipped** by the sidebar `nav.MuiPaper-root`. Outset kept. |
| **`Tabs` strip** (`stats-tab`) | Outset ring **clipped** by `div.MuiTabs-scroller` (computed overflow not `visible`; its box is exactly the tab's height, so a 3px ring at a 3px offset falls outside it top and bottom). **Shaped inset**; the inset ring is not clipped and still measures 1212.00 px² against 832.00 px². The spec re-asserts the clipping condition itself, so the reason cannot silently stop being true. |
| **Menu / listbox popovers** (`search-category-option`, `recent-search-entry`) | Outset ring **clipped** by the `Menu`'s own `div.MuiPaper-root`, and overlapping the neighbouring entry (and, for the recent-search menu, its nested Refill buttons). **Shaped inset.** |
| **Mobile navigation `Drawer`** (`nav-listitembutton`) | Outset ring **clipped** by `div.MuiPaper-elevation16` and overlapping `button[Open navigation]` and the next nav link. **Shaped inset** — note the desktop rendering alone would not have shown this. |

**Collisions that are recorded and deliberately accepted, with the reason.** Three outset rings overlap an adjacent control's box by a few pixels: `search-query-input` ↔ `search-submit` (they are one visually joined control by FM-044's
design), `checkbox-select-all` ↔ its own caret `Button` and the row checkbox below, and `results-selection-caret` ↔ the same two checkboxes. An outline is painted, not laid out, so it displaces nothing and only ever overlays an **unfocused**
neighbour; the inset alternative was rejected for `checkbox-select-all` specifically because a 3px inset ring on a 17.00x17.00 box would cover the glyph it is meant to draw attention to. `stats-history-checkbox` likewise overlaps its
neighbouring `Select`. All were measured, none clips.

**Page-level horizontal overflow: none.** `documentElement.scrollWidth === clientWidth` while each measured control held focus, at both named viewports (1280/1280 desktop, 390/390 mobile), asserted for every control in the committed spec.

### The affordance deletions, unwound

**`SearchWorkspace.tsx:480-482` — re-scoped, not deleted.** `"& .MuiOutlinedInput-notchedOutline": {border: "none"}` became
`"&:not(:has(:focus-visible)) .MuiOutlinedInput-notchedOutline": {border: "none"}`. The ADR-0009 mock's borderless resting rendering is preserved exactly — measured `border-top-width: 0px` unfocused — and reaching the trigger by keyboard now
lets MUI's own focused rule paint again: measured `0px → 2px` with `border-*-color` `rgb(214,218,217) → oklch(0.75 0.1 190)`, underneath the authored ring. **Both figures are asserted in the committed spec at both viewports**, so the proof
that the focused state paints is a gate rather than a claim. Hover is unaffected (the suppression still applies in every non-`:focus-visible` state), which is why `borderColor: "transparent"` was rejected as the alternative re-scoping.

**`SearchResults.tsx:1735`'s `disableRipple` — retained, with the ripple *replaced* rather than restored.** This is the second of the two options the packet allows, and it is the right one here: the ripple was never this control's indicator
(with `disableRipple` no ripple ever mounted, which is exactly why FM-052 dispositioned it `fails 2.4.7`), and removing the prop would put a ~38px pulsating disc on a deliberately flat 17x17 `p: 0` square that FM-046 designed with
`"&:hover": {backgroundColor: "transparent"}` — and it would measure 1.19:1–2.38:1 anyway. The indicator is instead `theme.ts`'s `MuiCheckbox` root-class rule. **The spec proves it paints on a non-transparent node**: the ring is asserted on
the element whose computed `opacity` is `"1"`, and in the same test MUI's native input overlay is asserted still `"0"` — so the failure mode FM-052 measured cannot recur silently. Asserted at both viewports (the header copy at desktop, the
`toolbar-selection-menu` copy at mobile).

**`queryInputSx`, `pairedInputSx`, `advancedInputSx` — each gains an affordance, and none needed an `sx` edit.** All three are bare `InputBase` renderings, so all three are reached by the one `MuiInputBase` root entry
(`"&:has(:focus-visible)"`), which paints on the node that carries each of those `sx` objects. Authored on the root rather than on the inner input deliberately: `InputBaseInput`'s own `'&:focus': {outline: 0}` (specificity 0,2,0) defeats any
outline authored on the input, and the root is the element a user sees. All three are measured above and all three are asserted in the committed spec. The packet permits editing those three objects; none required it, and leaving them
untouched keeps the remedy in the one shared styling boundary ADR-0013 names.

### Per-class confirmation against FM-052's inventory: no empty delta remains

Stated per class, not in aggregate. FM-052's five `fails 2.4.7` classes:

1. **`search-query-input`** — was `outline-style: none` in both states. Now: delta on 5 recorded properties, `outline-style: none → solid`, ring 4833.38 px² at 7.54:1. **Remedied.**
2. **`advanced-range-input`** — was a static, non-focus-reactive 1px border. Now: `outline-style: none → solid` on the root that carries that border, 760.13 px² at 6.83:1. **Remedied.**
3. **`season-episode-paired-input`** — declared no border at all and had no wrapper. Now: 608.44 px² at 6.20:1. **Remedied.**
4. **`search-category-select`** — `notchedOutline` `border-width: 0px` in both states. Now: the authored ring (1293.38 px² at 6.83:1) **and** the fieldset border restored to `0px → 2px` in the focused state. **Remedied twice over.**
5. **`checkbox-select-all`** — a real delta on an `opacity: 0` overlay. Now: the ring paints on the root (`opacity: 1`), 312.00 px² at 7.34:1, with the overlay's own `opacity: 0` asserted unchanged. **Remedied.**

Every other class in FM-052's inventory belongs to one of the seven mechanisms in the derivation table above and is reached by that family's entry; the ones measured individually are in the literals table. The two classes FM-052 recorded as
outside WCAG 2.4.7/2.4.11 scope stay outside it and are unchanged: the autocomplete `<li role="option" tabIndex={-1}>` items (an `aria-activedescendant` affordance, never DOM-focused) and the static "Downloaded" `Chip`. The recent-search
Refill `IconButton` is reached by `MuiIconButton`; its keyboard reachability is FM-049/FM-050/ADR-0012's, not re-litigated. `stats-history-datetime-picker-indicator` is Chromium's own UA ring on a UA shadow sub-control and is explicitly out
of scope. **`F-SEARCH-PROGRESS` owns no focusable control at all** — verified first-hand in `SearchPage.tsx`: `search-status-modal` renders a `DialogTitle`, an optional `Alert`, a `role="status"` `Stack` and a progress indicator, with no
`Button`, no `role="button"` and no other focusable element. Recorded as a checked negative.

### MUI mechanism claims confirmed against live computed styles

Read from the installed 7.3.9 source to form each hypothesis, then confirmed in the browser before acting on it — the discipline FM-052 needed after `SelectInput.js` was mis-read from source alone. Cited by symbol name, never by
`node_modules` line number.

- **`internal/SwitchBase.js`.** Source: `SwitchBaseRoot` is a `styled(ButtonBase)` rendered with `component: 'span'` and `additionalProps` including `role: undefined, tabIndex: null`; `SwitchBaseInput` is a `styled('input')` with
  `{cursor: 'inherit', position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0, margin: 0, padding: 0, zIndex: 1}`. **Confirmed live**: with the root-class rule authored, the focused delta carries `outline-style`
  `none → solid` on **both** the root (`self`) and the transparent input (`descendant-0`); the root's computed `opacity` reads `1` and the input's reads `0`. That pair is what makes "the indicator paints on a visible node" a measurement
  rather than an inference, and it is asserted in the committed spec.
- **`Select/SelectInput.js`'s `MuiInputBase-input` on the `role="combobox"` node.** **Confirmed live** by reaching `search-category-control` by `Tab` and reading `document.activeElement.tagName === "div"` with `:focus-visible` true, and by
  the `MuiInputBase` root rule reaching it at all. This is the claim FM-052 got wrong from source alone.
- **`OutlinedInput/OutlinedInput.js`'s `OutlinedInputRoot = styled(InputBase.InputBaseRoot, {name: 'MuiOutlinedInput'})`.** Source-read, then **confirmed live**: one `MuiInputBase` root entry demonstrably reaches every outlined field and
  select (`refine-filter-title-input`, `stats-history-text-input`, `downloader-select`, …), which only holds if the outlined root really is the input root.
- **`OutlinedInput`'s `&.Mui-focused .notchedOutline { borderWidth: 2 }`.** **Confirmed live** on the re-scoped category select: `border-top-width` `0px → 2px`, `border-*-color` `rgb(214,218,217) → oklch(0.75 0.1 190)`.
- **`ButtonBase/ButtonBase.js`'s `Mui-focusVisible` composition and its `disableRipple` propType comment** ("Without a ripple there is no styling for :focus-visible by default. Be sure to highlight the element by applying separate styles
  with the `.Mui-focusVisible` class"). **Confirmed live**: the class lands on the root even with `disableRipple` set, which is the whole basis of the select-all checkbox remedy.
- **`Link/Link.js` gating both its `outline: 0` reset and its `&.MuiLink-focusVisible {outline: 'auto'}` behind `props: {component: 'button'}`.** **Confirmed live**: `stats-identifier-link` (which takes the default `component="a"`) renders
  the ring at the global rule's geometry, and its unfocused `outline-color` reads `oklch(0.75 0.1 190)` rather than `auto`.
- **`MuiTabs-scroller`'s clipping** and **`MuiPaper`'s clipping in `Menu`/`Drawer`.** Hypothesised from the rendering, **measured live** as computed `overflow` plus real bounding rects; the `Tabs` case is re-asserted inside the committed
  spec so the justification for that family's inset geometry is itself gated.

### The committed gate, and the negative control that proves it bites

`tests/system/tests/focus-indication.spec.ts`, **new file, additive at file level** — no existing spec was edited (`git status` over `tests/` lists exactly one untracked path and no modification). Real-browser only, per ADR-0004.

- **9 tests, 9 passed** in the launcher run below. Every control is reached by real `Tab` presses from `document.body`, and the walk is proven bidirectional: on reaching the target the helper presses `Tab` forward and `Shift+Tab` back and
  requires focus to return to the same control. Menu items are reached with real `Enter` then `ArrowDown` inside the open menu. `locator.focus()` is never used to place focus; `click()` appears only to submit a form or open a surface, never
  to focus a control under measurement. `element.matches(":focus-visible")` is asserted for every control.
- **`page.goto("ui/react?redirect=/")` throughout**, with `await expect(page).toHaveURL(/\/$/)`; no bare `page.goto("/")` anywhere except the one deep link that seeds identifier criteria *after* React has already been selected.
- **Asserted per control**: `:focus-visible`; a non-empty focused/unfocused computed-style delta over the element and every descendant plus `::before`/`::after`; the literal authored declaration (`outline-style` `solid`, `outline-width`
  `3px`, `outline-color` `oklch(0.75 0.1 190)`, `outline-offset` `3px`/`-3px`); that the **unfocused** outline style is `none`, so the delta cannot be satisfied by something other than the indicator; changed area ≥ `4(w+h)`; full-opacity
  contrast ≥ 3:1 against the control's own composited ground; not clipped by an ancestor; no page-level horizontal overflow. No screenshot comparison decides anything.
- **Version-scoped re-verification duty in the code**, following ADR-0012: a header comment in the spec and a block comment beside the token in `theme.ts`, each naming ADR-0013, the exact `@mui/material` `7.3.9` pin, Chrome for Testing, the
  MUI internals depended on **by symbol name**, and the requirement that after any MUI upgrade this be re-proven by re-running the spec rather than by re-reading the sources.
- **One authored family is not gated, disclosed in the file itself**: `MuiChip` has no keyboard-reachable representative in this application (`Chip` with no `onClick`/`onDelete`). `MuiRadio`/`MuiSwitch` likewise have no call site. Recorded
  rather than silently omitted.

**Negative-control probe — the spec genuinely fails.** `theme.ts`'s `MuiCheckbox` entry was reduced to `root: () => ({})`, the JARs rebuilt from that source, and the whole file re-run through the launcher:

- Result: **1 failed, 7 passed** (the run predates the two tests added afterwards). Failing test: `should render the authored ring on the results surfaces, including the SwitchBase family on its own visible root`.
- Exact failing assertion and message: `focus-indication.spec.ts:343` in `expectAuthoredFocusRing` —
  `Error: checkbox-select-all (desktop): outline-style` / `expect(received).toBe(expected) // Object.is equality`.
- Restored and confirmed **byte-identical by SHA-256** before the passing run counted: `theme.ts` `efacf34de0865fa108fd62f335fd71deca1fe3c29c80d58dd900ee58921a5a0e` before the probe and `efacf34de0865fa108fd62f335fd71deca1fe3c29c80d58dd900ee58921a5a0e` after restoration.

### The repository guard, and the four reintroductions it was proven to catch

`core/ui-react/scripts/validate-focus-affordances.mjs`, wired as `npm run validate:focus-affordances`. No dependency added; `package-lock.json` is byte-identical (`ab048500036be3fc739fdbcf1b34af706401c94bad60276f38fb645b5f6cdfbb` before and
after `npm ci`). Passing output: `Focus affordances are intact: 83 source files checked, 11 authored control families declared in src/app/theme.ts.`

It fails on: (1) a `notchedOutline` rule removing the fieldset border (`border: "none"|0`, `borderWidth: 0`) **unconditionally** — a rule whose selector names `:focus-visible`/`:focus`/`Mui-focused` is allowed, which is how the category
select now preserves its resting rendering; (2) `disableRipple` on a control whose family has no authored `Mui-focusVisible` rule in `theme.ts` or beside it; (3) `theme.ts` dropping any of the eleven authored families; (4) the reconciled
global rule ceasing to render the shared token. Comments are stripped before matching, so a comment can never satisfy a check, and the enclosing JSX tag for `disableRipple` is found by brace-balanced scanning rather than "nearest `<`" — the
naive version mis-attributed the prop to `<SelectAllCheckedIcon />` passed as a `checkedIcon` value.

| Probe | Reintroduced | Result |
|---|---|---|
| A | `"& .MuiOutlinedInput-notchedOutline": {border: "none"}` restored unconditionally in `SearchWorkspace.tsx` | **exit 1** — `src/features/search/workspace/SearchWorkspace.tsx:494 unconditionally removes the OutlinedInput notched outline ("& .MuiOutlinedInput-notchedOutline" sets border: "none",), which deletes the focused border together with the resting one.` |
| B | `disableRipple` added to the results selection caret `Button` **and** `MuiButton`'s ring removed from `theme.ts` | **exit 1**, 2 findings — `src/features/search/results/SearchResults.tsx:1748 \`disableRipple\` on <Button> removes the only focus affordance MUI ships for that control, and neither \`app/theme.ts\` nor this file authors a \`Mui-focusVisible\` rule for it` plus the `MuiButton` finding below. |
| C | `MuiButton`'s ring removed from `theme.ts` alone, all source files untouched | **exit 1** — `src/app/theme.ts no longer authors a focus ring for MuiButton (ADR-0013, Option A requires one authored rule per control family; …)`. |
| D | The reconciled global rule reverted to its `currentColor` literal | **exit 1** — `src/app/theme.ts's MuiCssBaseline ":focus-visible" rule no longer renders the shared authored token, so the application would carry two focus systems …`. |

Restoration after every probe was confirmed **byte-identical by SHA-256** (`sha256sum -c`, all three files `OK`) before the passing run counted:
`SearchWorkspace.tsx 2890f1a702640d0634ad920cfa5f1c6f35c5997602f93441070953856e7a4ead`, `SearchResults.tsx 996ab77d1c1bb56f7dcf980ff5bca4efe1c52cb89fb89b7a131e2c5c0664e42f`,
`theme.ts efacf34de0865fa108fd62f335fd71deca1fe3c29c80d58dd900ee58921a5a0e`.

**A defect the probes found in the guard itself, disclosed.** The first implementation derived the authored-family set with a bounded lazy regex (`Mui([A-Z][A-Za-z]*)\s*:\s*\{[\s\S]{0,2000}?Mui-focusVisible`). That window runs past one
family's closing brace into the next family's rule, so probe C passed vacuously on the first attempt. It was replaced with real brace matching (`themeFamilyBlocks`), and probes B and C were re-run from scratch against the fixed scanner. The
figures above are the re-run's.

### Review Finding R1 — Fixed

**What a fresh independent reviewer found.** Six of this file's seventeen focused-state capture screenshots cropped the outset ring out of frame, contradicting this packet's own *Visual contract* requirement ("the clip expanded enough
to contain an outset ring"), and the Handoff sentence claiming that was avoided (the previous wording of the *Captures produced* paragraph above) was false. The reviewer decoded every PNG and counted pixels near the ring's
`rgb(85,194,188)` color: `F-SEARCH-SAVED/keyboard-focus-save-search-desktop.png` (region `results-download-actions`, 126 ring px vs a 940.50 px² recorded area — reads as no ring), `F-SEARCH-RECENT/keyboard-focus-recent-searches-trigger-desktop.png`
(region `workspace-actions`, 356 ring px, mostly the trigger's own border), `F-SEARCH-FORM/keyboard-focus-advanced-range-input-desktop.png` (region `workspace-ranges`, 329 ring px, left/bottom strokes cropped), and three bare
`element.screenshot()` captures with the ring **entirely** outside the frame — `FM-053/keyboard-focus-news-anchor-desktop.png` (0 ring pixels), `FM-053/keyboard-focus-search-history-refresh-desktop.png`, and both
`FM-053/keyboard-focus-paging-load-more-{desktop,mobile}.png`.

**The fix.** A new helper, `captureFocusedControl(page, locator, path, margin = 10)`, added to `tests/system/tests/focus-indication.spec.ts` (the only file this fix pass touched — `visualEvidence.ts` is unchanged and unmodifiable per
*Files Allowed To Modify*): it reads the *focused control's own* `boundingBox()` (never a containing region, which can still be too tight), expands it by `margin` px on every side — `10` by default, comfortably past the ring's own
reach (`3px` outline width plus `3px` offset = `6px`, the packet's stated minimum) — clamps the result to the current viewport so an edge-adjacent control cannot silently lose its margin off the page edge, and rasterises that clip
with a real `page.screenshot({clip})`, never an element-box screenshot. All six flagged call sites now use it: the three `captureVisualRegion(region-locator, …)` calls on `results-download-actions`, `workspace-actions`, and
`workspace-ranges` were replaced with `captureFocusedControl` on the actual focused-control locator (`page.locator("#save-search")`, `trigger`, and the Advanced-panel age-input's `inputRoot`-wrapped locator respectively), using
`visualEvidencePath` (already exported by `visualEvidence.ts`) to keep the identical registry-cited file path; the three bare `element.screenshot({path})` / `locator.screenshot({path})` calls (`news-anchor`, `search-history-refresh`,
both `paging-load-more` viewports) were replaced with `captureFocusedControl` on the same locator and path. No assertion, no focused control, and no file path changed — only the screenshot framing. The eleven other captures (seven
`captureVisualRegion` calls the reviewer confirmed already had real margin, plus three bare region/element screenshots the reviewer confirmed were already good) were not touched.

**Re-verification, with pixel evidence — not just claimed.** The whole `focus-indication.spec.ts` file (no `--grep`) was re-run twice against a real Maven-built JVM backend via
`python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/focus-indication.spec.ts`: **9/9 passed both times**, confirming the fix did not disturb any assertion (per-test names and line numbers below). Each run
regenerates all seventeen capture PNGs (Playwright's `screenshot()` call always writes a fresh file), confirmed by `mtime`: every one of the seventeen files under `tests/system/visual-evidence/` carries the run's own timestamp, not
just the six that changed mechanism.

The six regenerated PNGs were independently decoded after the fix — not just claimed — using ImageMagick (`identify`/`convert … rgb:-`) piped into a small Python script counting pixels within ±35 of `rgb(85,194,188)` and reporting
whether any such pixel touches the image border (which would mean the ring is still flush with, or cut by, the crop edge):

| Capture | Ring-color pixels found | Border-touching | Measured margin (all 4 sides) |
|---|---|---|---|
| `FM-053/keyboard-focus-news-anchor-desktop.png` | **1068** (was 0) | 0 | 4px |
| `FM-053/keyboard-focus-paging-load-more-desktop.png` | **749** (was 0) | 0 | 3–4px |
| `FM-053/keyboard-focus-paging-load-more-mobile.png` | **743** (was 0) | 0 | 4px |
| `FM-053/keyboard-focus-search-history-refresh-desktop.png` | **952** (was ~0) | 0 | 4px |
| `F-SEARCH-SAVED/keyboard-focus-save-search-desktop.png` | **850** (was 126) | 0 | 3–4px |
| `F-SEARCH-RECENT/keyboard-focus-recent-searches-trigger-desktop.png` | **1300** (was 356) | 0 | 4px |
| `F-SEARCH-FORM/keyboard-focus-advanced-range-input-desktop.png` | **672** (was 329) | 0 | 3–4px |

A first pass at `margin = 6` (the packet's literal stated minimum) passed the "ring fully inside the frame" test but left the ring's outermost pixel landing exactly on the crop boundary (0px measured buffer, ring-color pixels touching
all four image edges by construction) — technically not clipped, but no genuine margin against rounding or anti-aliasing. `margin` was widened to `10` (still comfortably satisfying "at least 6px") and the spec re-run a second time; the
table above is from that second, final run, and every capture now shows a real 3–4px buffer between the ring's outermost pixel and the image edge, with zero ring-colored pixels touching any border. Two of the `.png` files above
(`news-anchor`, both `paging-load-more`) are the ones the review measured at literally zero ring pixels before this fix; all three, plus the fourth previously-broken bare capture (`search-history-refresh`), now show several hundred to
just over a thousand ring-colored pixels forming a complete rectangular ring with margin on every side. The three region-based captures (`save-search`, `recent-searches-trigger`, `advanced-range-input`) went from a fragment of the ring
(126–356 px, described by the review as "reads as no ring" / partially cropped) to a complete ring (672–1300 px) with the same margin. Spot-checks of three untouched, already-good `captureVisualRegion` captures
(`F-PLATFORM-SHELL/keyboard-focus-nav-item-desktop.png`, `F-SEARCH-INDEXERS/keyboard-focus-indexer-select-desktop.png`, `F-SEARCH-DOWNLOADS/keyboard-focus-downloader-select-desktop.png`) confirm no regression: all three still show a
clearly legible ring (1013, 8194, and 1117 ring-color pixels respectively) — their call sites were not touched by this fix, so this is an existence check against tampering, not a re-review of framing quality already independently
confirmed.

**The inaccurate Handoff sentence is corrected.** The *Captures produced* paragraph above previously read: "written by `captureVisualRegion` … with the clip expanded to a containing region so the outset ring is inside the frame rather
than cropped away." That claimed a behavior `captureVisualRegion` does not have — it is a bare `locator.screenshot({path})` (`tests/system/tests/visualEvidence.ts:97-105`) with no clip expansion of its own; any margin was always
entirely a property of which locator the caller passed it. The paragraph now states this accurately, and the file list beneath it marks each of the seventeen captures with which mechanism produced it (`captureVisualRegion` on a
region locator, or the new `captureFocusedControl` helper) and, for the six R1 covers, what changed.

**Verification reused vs re-run for this fix.** Per *Verification Basis* below (updated), this fix touched exactly one file, `tests/system/tests/focus-indication.spec.ts` — a Playwright spec, not a `core/ui-react` source or test file.
Re-run for this fix: `tests/system`'s `npx tsc --noEmit` and `npx prettier --check .` (both, twice — once per margin iteration — always clean), and the whole `focus-indication.spec.ts` file via the launcher (twice, `9/9` both times,
the second run's PNGs and pixel table are the ones recorded above). Reused, not re-run, because nothing they cover changed: `core/ui-react`'s full chain (`typecheck`/`lint`/`format:check`/`test`/`build`/`check:api`/
`validate:focus-affordances`/`validate:migration`) — no file under `core/ui-react` was touched by this fix; the other six Playwright spec files (`search.spec.ts`, `results.spec.ts`, `search-history.spec.ts`, `stats.spec.ts`,
`news.spec.ts`, `smoke.spec.ts`) — this fix edited no file any of them exercises, and none of their own files changed; every contrast/area/geometry measurement recorded elsewhere in this Handoff — this fix touches only
`captureVisualRegion`/`captureFocusedControl` screenshot calls, never a `probeFocus`/`expectAuthoredFocusRing` assertion, a focused control, or a `theme.ts` rule; the guard's four reintroduction probes and the spec's negative-control
probe — their subject files (`theme.ts`, `SearchWorkspace.tsx`, `SearchResults.tsx`, `validate-focus-affordances.mjs`) are untouched by this fix. `git diff --stat` and the `data-testid` diff were not re-run because this fix could not
plausibly move either (a screenshot-framing change touches no tracked file — `focus-indication.spec.ts` is untracked/new, and no `data-testid` was added, removed, or renamed by this fix).

### Review Finding R2 — Fixed

**What a second, independent fresh reviewer found.** The R1 fix's mechanism was sound, and the reviewer personally decoded all six R1-corrected PNGs and confirmed the ring fully visible with a real buffer in every one — that part of
the record stands unchanged. But the same defect class survived, unexamined by R1, in captures R1's own fix pass did not touch:

- **`F-SEARCH-INDEXERS/keyboard-focus-indexer-select-desktop.png`** — `captureVisualRegion(page.getByTestId("workspace-indexers"), …)`. The region (1164x77) is exactly as wide as the control itself (1164.00x36.41), so the ring's
  left/right/top strokes were off-frame by construction; only the ring's bottom stroke fell inside the frame.
- **`F-SEARCH-DOWNLOADS/keyboard-focus-downloader-select-desktop.png`** — `captureVisualRegion(page.getByTestId("results-download-actions"), …)`. The region (1200x42) was not tall enough for the control's own ~47.7px vertical reach
  (35.69px control height plus the ring's 6px reach on each side), so the ring's top/bottom strokes fell outside the frame. This is a direct internal inconsistency with the R1 fix itself: R1 already replaced a *different* capture
  (`F-SEARCH-SAVED/keyboard-focus-save-search-desktop.png`) taken from this exact same `results-download-actions` region for being too tight, but left this second capture from the same region untouched.
- **`F-SEARCH-GROUP-SELECTION/keyboard-focus-select-all-checkbox-desktop.png`** — marginal: the ring's left stroke survived as only 1 of its 3 pixel columns, flush against the frame's left edge. Not independently blocking on its own,
  but the same class of defect and fixed here for the same reason, at no extra cost.

**The fix.** All three call sites were rewired from `captureVisualRegion` on a containing-region locator to the existing `captureFocusedControl(page, locator, path, margin = 10)` helper R1 built, passing the *same* locator
`probeFocus` had already measured for that control (`indexersLocator`/`downloaderLocator`, newly named to avoid recomputing the chained locator twice, and the already-named `checkboxRoot`) and the identical
`visualEvidencePath(featureId, region)` argument each call site already used, so the registry-cited output path is unchanged. No assertion, no focused control, and no file path changed — only the screenshot framing, exactly the R1
mechanism applied to three more call sites. `tests/system/tests/focus-indication.spec.ts` remains the only file this fix pass touched.

**Re-verification, with pixel evidence.** The whole file (no `--grep`) was re-run once against a real Maven-built JVM backend via `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/focus-indication.spec.ts`:
**9/9 passed**, regenerating all seventeen capture PNGs (confirmed by `mtime`: every one of the seventeen carries this run's own `2026-08-19 08:53:58`–`08:54:07` timestamp). The three rewired PNGs were independently decoded afterward
using the identical method R1 and the second reviewer both used — ImageMagick (`identify`/`convert … rgb:-`) piped into a Python script counting pixels within ±35 of `rgb(85,194,188)`, reporting whether any such pixel touches the
image border, and additionally checking that all four ring strokes are present (not just a raw total count, which is the masking trap this task's own instructions flagged: `notchedOutline`'s own focused-border recolour paints the
identical teal for this control family, so a healthy total count alone does not prove the *authored ring* specifically is intact):

| Capture | Dimensions | Ring-color pixels | Border-touching | Measured margin (all 4 sides) | All 4 strokes present |
|---|---|---|---|---|---|
| `F-SEARCH-INDEXERS/keyboard-focus-indexer-select-desktop.png` | 1184x56 | **11857** | 0 | 4px | yes |
| `F-SEARCH-DOWNLOADS/keyboard-focus-downloader-select-desktop.png` | 200x55 | **2134** | 0 | 3–4px | yes |
| `F-SEARCH-GROUP-SELECTION/keyboard-focus-select-all-checkbox-desktop.png` | 37x37 | **238** | 0 | 4px | yes |

Structural confirmation beyond the pixel count, guarding against the `notchedOutline`-masking trap: all three images were visually inspected (not just pixel-counted). Both `InputBase`/`OutlinedInput` captures (`F-SEARCH-INDEXERS`,
`F-SEARCH-DOWNLOADS`) show a visibly *separate* outer ring with a dark gap between it and the control's own border — the two teal features (the control's own focused `notchedOutline` border and the authored outset ring 3px further
out) are distinguishable as two concentric shapes, not one — which is the structural proof the healthy pixel count is not merely `notchedOutline`'s recolour. The `F-SEARCH-GROUP-SELECTION` checkbox capture shows a complete rounded
ring fully surrounding the checkbox glyph with margin on every side. Dimensions match the helper's contract: e.g. the indexer control's own box (1164.00x36.41, from the *Per-family authored literals* table) plus a 10px margin on
each side clamped to the viewport yields 1184x56.41 → 1184x56, exactly what was captured.

**The inaccurate Handoff sentence is corrected again.** The *Captures produced* paragraph's claim that "seven of the ten registry-cited captures below pass a containing-region locator wide enough to leave real margin around the
focused control, which is correct and was independently confirmed" was false for two of those seven (`F-SEARCH-INDEXERS`, `F-SEARCH-DOWNLOADS`) and marginal for a third (`F-SEARCH-GROUP-SELECTION`). It is corrected below to state,
per capture, which mechanism produced it and why it is now correct.

**A further out-of-scope observation, flagged rather than fixed.** While independently re-verifying the mechanism-table accuracy for this fix's required item 4 (state, per capture, why each is now correct), the same structural
border-touching check was run against the four registry-cited captures that remain on `captureVisualRegion` and were *not* named in this review's required findings, for completeness. Three are clean:
`F-SEARCH-MEDIA/keyboard-focus-season-input-desktop.png` (4240 ring px, 0 border-touching, 11–56px margin all sides), `F-SEARCH-RESULTS/keyboard-focus-sort-header-button-desktop.png` (716 ring px, 0 border-touching, 2–42px margin),
`F-SEARCH-SORT-FILTER/keyboard-focus-refine-filter-title-desktop.png` (2935 ring px, 0 border-touching, 4–50px margin). One is not: `F-PLATFORM-SHELL/keyboard-focus-nav-item-desktop.png`
(`captureVisualRegion(page.getByTestId("app-shell-nav"), …)`) shows exact `rgb(85,194,188)` ring pixels touching the frame's **left edge** (`x=0`, ~20 rows) and **bottom edge** (`y=43`, ~20 columns) — visually confirmed by a zoomed
crop, not just the pixel scan: the inset ring around the "Search" nav item is flush with the crop boundary on those two sides, with no dark margin visible there, while the right side shows a normal margin. This is the identical
defect class as the three findings above. **It is not fixed by this invocation.** It was not named in this review's required findings (only `F-SEARCH-INDEXERS`, `F-SEARCH-DOWNLOADS`, and, optionally, `F-SEARCH-GROUP-SELECTION` were),
this invocation's mandate is to fix exactly the findings it was given and not to expand scope on its own authority, and — following this packet's own established discipline for an unexpected fourth finding surfacing after the third
was fixed (the `theme.test.ts` `MuiChip` precedent above: "a further escalation … not a licence to widen the fence") — it is recorded here for the coordinator and a further review/fix round rather than silently fixed or silently
asserted correct. It is also why the *Captures produced* paragraph below states plainly, per remaining `captureVisualRegion` capture, which are re-confirmed clean and which is not.

**Adjudicated by a third independent review: not a defect, no further fix.** The border-touching heuristic used above is valid only for an **outset** ring (`outline-offset: +3px`), where any stroke reaching the frame edge proves
cropping. `MuiListItemButton` (nav items), `MuiTab`, and `MuiMenuItem` are instead authored with `focusRing(theme, focusRingInsetOffset)` at `outline-offset: -3px` — an **inset** ring, whose outermost pixel is defined to coincide
exactly with the control's own border edge. Border-touching there is that geometry's correct, expected signature, not a cropping defect. The reviewer decoded the regenerated `F-PLATFORM-SHELL/keyboard-focus-nav-item-desktop.png` and
confirmed all four ring strokes present at full 3px width and full length, with the ring's exact pixel bounding box (84x43) matching the control's own recorded box (84.00x43.00) precisely — nothing is outside the frame. The same
adjudication clears the two other inset, task-scoped captures noted above as "structurally uncroppable" (`stats-tab-desktop`, `nav-item-mobile-drawer`). No further fix-invocation is warranted; rewiring this call site to
`captureFocusedControl` would be a cosmetic framing change with no defect behind it.

**Verification reused vs re-run for this fix.** Per *Verification Basis* below (updated), this fix touched exactly one file, `tests/system/tests/focus-indication.spec.ts` — the same file, same nature of change (capture-framing only)
as the R1 fix. Re-run for this fix: `tests/system`'s `npx tsc --noEmit` and `npx prettier --check .` (both clean), and the whole `focus-indication.spec.ts` file via the launcher (once, `9/9`, the seventeen regenerated captures and
the pixel table above are from that run). Reused, not re-run, for the identical reasons the R1 fix gave and re-confirmed by re-hashing every file below against the tree as delivered by this fix: `core/ui-react`'s full chain
(`typecheck`/`lint`/`format:check`/`test`/`build`/`check:api`/`validate:focus-affordances`/`validate:migration`) — no file under `core/ui-react` was touched by this fix; the other six Playwright spec files — this fix edited no file
any of them exercises, and none of their own files changed; every contrast/area/geometry measurement recorded elsewhere in this Handoff — this fix touches only `captureVisualRegion`/`captureFocusedControl` screenshot calls, never a
`probeFocus`/`expectAuthoredFocusRing` assertion, a focused control, or a `theme.ts` rule; the guard's four reintroduction probes and the spec's negative-control probe — their subject files are untouched by this fix. `git diff --stat`
and the `data-testid` diff were not re-run because this fix could not plausibly move either, for the same reason the R1 fix gave.

### Files Modified

- `tests/system/tests/focus-indication.spec.ts` — **new file**, the committed gate (unchanged provenance from the original implementation). **The R1 fix pass** added the `captureFocusedControl` helper and its import of
  `visualEvidencePath`, and rewired six capture call sites (`keyboard-focus-save-search-desktop`, `keyboard-focus-recent-searches-trigger-desktop`, `keyboard-focus-advanced-range-input-desktop`, `keyboard-focus-news-anchor-desktop`,
  `keyboard-focus-search-history-refresh-desktop`, and `keyboard-focus-paging-load-more-{desktop,mobile}`) to it. **This R2 fix pass** rewired three further call sites to the same helper (`keyboard-focus-indexer-select-desktop`,
  `keyboard-focus-downloader-select-desktop`, `keyboard-focus-select-all-checkbox-desktop`), each with an explanatory comment naming the R2 finding it closes, and named two previously-inline locator expressions
  (`indexersLocator`, `downloaderLocator`) so the same locator `probeFocus` measures is the one passed to the capture, without recomputing the chain twice. No assertion, no focused control, no file path, and no other call site
  changed by either fix pass. SHA-256 of the file as delivered by this R2 fix: `7c65ef4aebc5e3de09e8baadb0de0f6877fd59ca86234da4f20b3cd77625e87b` (was `3afab45b548437ec5aa4200ba9f333ade4ee83be4d78ed3836e50ec334acbb6b` as delivered by R1).
- `core/ui-react/src/app/theme.ts` — the authored token, its version-scoped re-verification comment, and eleven per-family `styleOverrides` entries plus the reconciled `MuiCssBaseline` entry. **Unchanged by the resuming invocation**, SHA-256
  `efacf34de0865fa108fd62f335fd71deca1fe3c29c80d58dd900ee58921a5a0e` — identical to the value recorded before the first handoff.
- `core/ui-react/src/app/theme.test.ts` — **only** the three assertions the two 2026-08-19 refinements granted (the `MuiCssBaseline` `":focus-visible"` entry, `MuiButton.styleOverrides.root`, and `MuiChip.styleOverrides.root`), each
  restated over the value Option A actually produces, plus one explanatory comment beside each. No other assertion — including the `MuiOutlinedInput.styleOverrides.root` assertion sitting between the latter two in the same `it()` — and no
  test, was added, removed, renamed, skipped, or commented out.
- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx` — **only** the category `TextField`'s `notchedOutline` rule (`:480-482` re-scoped). `queryInputSx`, `pairedInputSx`, `advancedInputSx` were **not** edited; no other
  rendering, prop, handler, or `data-testid`.
- `core/ui-react/src/features/search/results/SearchResults.tsx` — **only** an explanatory comment beside the select-all `Checkbox`'s retained `disableRipple` (`:1735`). No other line in the file.
- `core/ui-react/scripts/validate-focus-affordances.mjs` — **new**, the repository guard.
- `core/ui-react/package.json` — **only** the `scripts` block, one `validate:focus-affordances` entry. No dependency added, moved, or removed; `package-lock.json` unchanged.
- `docs/frontend-migration/FEATURES.yaml` — the ten contract-carrying records, `F-SEARCH-PAGING` (`backlog` only), and the six `unassessed` records (`gaps`/`backlog` only).
- `docs/frontend-migration/STATUS.md` and this task packet.
- Git-ignored captures under `tests/system/visual-evidence/` (listed below); nothing in the tracked diff.

**Scope confirmation.** All task-owned modifications are within `Files Allowed To Modify`, including the refined `theme.test.ts` entry and its three-assertion scope note. Nothing is outstanding and no change was withheld.
`docs/frontend-migration/tasks/FM-052-keyboard-focus-indication-audit.md` appears modified in `git status`; that is the coordinator's pre-invocation `Blocks: None → Blocks: FM-053` header edit, present in the supplied snapshot, and this
task did not touch it. `git diff --stat` lists exactly the paths under *Files Allowed To Modify* plus that one coordinator edit; no unrelated pre-existing user change was present in the tree, and none was touched.

`git diff -- core/ui-react/src/features/search/results/RefineSidebar.tsx core/ui-react/src/features/search/results/filterControls.tsx core/ui-react/src/features/search/results/DownloadActions.tsx` is **empty** — the mechanical proof the
three `notchedOutline` `borderColor` recolours were left alone. `git diff --check` reports no whitespace errors. No `data-testid` was removed or renamed, confirmed mechanically by diffing the sorted, counted `data-testid="…"` literals in the
working tree against `HEAD` over `core/ui-react/src`: identical.

### Toolchain

- Node: `v26.7.0`
- Package manager: `npm 11.19.0`
- Other material tools: `@mui/material`/`@mui/icons-material` `7.3.9`; `@playwright/test` `1.62.1` (Chromium: Chrome for Testing `151.0.7922.34`); Apache Maven `3.9.12`; OpenJDK/GraalVM CE `25.0.4`; Docker Engine `29.7.2`; `vitest 4.1.6`;
  `typescript 5.9.3`; `prettier 3.7.4`; `eslint 9.39.1`.

### Verification Evidence

**A fourth invocation — the R1 fix pass — changed exactly one file, `tests/system/tests/focus-indication.spec.ts` (the `captureFocusedControl` helper and six rewired capture call sites; see *Review Finding R1 — Fixed*).** It re-ran
`tests/system`'s `npx tsc --noEmit` and `npx prettier --check .`, and the whole `focus-indication.spec.ts` file against a real Maven-built JVM backend (twice — once to observe the `margin = 6` framing, once after widening to
`margin = 10` for genuine buffer; the second run's `9/9` and its seventeen regenerated captures are the ones of record). Rows below marked *(re-run, R1 fix)* were executed for this fourth invocation; rows marked *(re-run, third
invocation)* were executed for the prior `theme.test.ts` fix and are reused here because this fix touches no file any of them cover (`core/ui-react` is untouched); the other real-backend Playwright rows remain **reused evidence,
deliberately not re-run**, with the justification stated below the table and in *Verification Basis*.

**A fifth invocation — the R2 fix pass — changed the same one file again, three more rewired call sites (see *Review Finding R2 — Fixed*).** It re-ran `tests/system`'s `npx tsc --noEmit` and `npx prettier --check .` (both clean, once
each — no margin-iteration retry was needed this time, `margin = 10` was already correct) and the whole `focus-indication.spec.ts` file once against a real Maven-built JVM backend: **9/9 passed**, all seventeen captures regenerated
(confirmed by `mtime`, `2026-08-19 08:53:58`–`08:54:07`), and the three rewired PNGs independently decoded with pixel evidence (see *Review Finding R2 — Fixed*'s table). Rows below marked *(re-run, R2 fix)* were executed for this
fifth invocation; every row still marked *(re-run, R1 fix)* or *(re-run, third invocation)* is reused here for the identical reason it was reused for R1 — this fix touches no file any of them cover.

| Working directory | Command | Result |
|---|---|---|
| `core/ui-react` | `npm ci` | **Passed** (third invocation; not re-run). Required because this task modifies `package.json`, and `package.json` is byte-identical since — SHA-256 `7d7cfbce0e2d5746edb623490539091fc28ad15b4669622163c61945a91c692e`. `package-lock.json` SHA-256 `ab048500036be3fc739fdbcf1b34af706401c94bad60276f38fb645b5f6cdfbb`, re-confirmed unchanged, and `git diff --stat -- core/ui-react/package-lock.json` is empty. |
| `core/ui-react` | `npm run typecheck` | *(re-run, third invocation)* **Passed**, no output. Not re-run for the R1 fix — no `core/ui-react` file changed. |
| `core/ui-react` | `npm run lint` | *(re-run, third invocation)* **Passed**, `10 problems (0 errors, 10 warnings)` — **no new warnings**; the same 10 pre-existing `react-refresh/only-export-components` warnings, none in a file this task touches. Not re-run for the R1 fix. |
| `core/ui-react` | `npm run format:check` | *(re-run, third invocation)* **Passed**, `All matched files use Prettier code style!` Not re-run for the R1 fix — scoped to `core/ui-react`, which the fix does not touch. |
| `core/ui-react` | `npm run test` | *(re-run, third invocation)* **Passed** — `Test Files 38 passed (38)`, `Tests 247 passed (247)`. The **unchanged baseline tallies, restored**, never lowered. Whole suite, **no `--grep`**. Not re-run for the R1 fix — `theme.test.ts` is untouched by it. |
| `core/ui-react` | `npm run build` | *(re-run, third invocation)* **Passed**, `✓ built in 2.06s`. Not re-run for the R1 fix — no `core/ui-react` source changed, so the served bundle is unaffected. |
| `core/ui-react` | `npm run check:api` | *(re-run, third invocation)* **Passed**, `Generated OpenAPI types are current.` Not re-run for the R1 fix. |
| `core/ui-react` | `npm run validate:focus-affordances` | *(re-run, third invocation)* **Passed**, `Focus affordances are intact: 83 source files checked, 11 authored control families declared in src/app/theme.ts.` Separately recorded **failing** on four deliberate reintroductions with exact messages and SHA-256 restoration proofs. Not re-run for the R1 fix — it scans `core/ui-react/src`, untouched by this fix. |
| `core/ui-react` | `npm run validate:migration` | *(re-run, third invocation)* **Passed**, `Migration registries and task metadata are valid.` FM-053 stays `review`, listed under `STATUS.md`'s `## Review`. Not re-run for the R1 fix (this Handoff edit does not change `Status:` or `STATUS.md` placement). |
| `tests/system` | `npx tsc --noEmit` | **Passed**, no errors. *(re-run, R1 fix; re-run again, R2 fix)* — the R2 run executed against the tree with all three additionally-rewired call sites (`F-SEARCH-INDEXERS`, `F-SEARCH-DOWNLOADS`, `F-SEARCH-GROUP-SELECTION`). |
| `tests/system` | `npx prettier --check .` | **Passed**, `All matched files use Prettier code style!` *(re-run, R1 fix, twice — once per margin iteration; re-run again, R2 fix, once)*, always clean. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/focus-indication.spec.ts` | **Passed, 9/9, twice for R1, once more for R2 (9/9 all three times).** *(re-run, R1 fix; re-run again, R2 fix)* — the whole file, no `--grep`, against a real Maven-built JVM backend plus the sonarr/radarr Docker fixtures. R1's first run (`margin = 6`): `9/9`, all seventeen captures regenerated, but the six R1-fixed captures showed the ring landing exactly on the crop boundary (0px buffer) on pixel decode. Margin widened to `10`; R1's second run: `9/9` again, seventeen captures regenerated again, with a measured 3–4px buffer on all sides for all six — see *Review Finding R1 — Fixed*. R2's run (this invocation, `margin = 10` unchanged): `9/9`, seventeen captures regenerated a third time, the three R2-rewired captures now showing 0 border-touching pixels and 3–4px buffer on all sides — see *Review Finding R2 — Fixed* for the full pixel-evidence table. |
| repository root | `python3 misc/run_gui_systemtest.py --runtime local --test-timeout 900 -- tests/search.spec.ts tests/results.spec.ts tests/search-history.spec.ts tests/stats.spec.ts tests/news.spec.ts tests/smoke.spec.ts` | **Passed, 48/48** (prior invocation, part of the `57/57` whole-suite run). **Reused evidence, deliberately not re-run** — this fix edits no file any of these six specs exercises, and none of their own spec files changed. `search.spec.ts` 16/16, `results.spec.ts` 22/22, `search-history.spec.ts` 3/3, `stats.spec.ts` 2/2, `news.spec.ts` 1/1, `smoke.spec.ts` 4/4. |
| repository root | negative-control run of the same launcher with `MuiCheckbox`'s ring disabled | **Failed as required** (third invocation; reused here — the negative control disables a `theme.ts` rule, and `theme.ts` is untouched by the R1 fix), `1 failed, 7 passed`, exact assertion recorded above; restored byte-identical by SHA-256 before the passing run. |
| repository root | `git diff --check` | **Passed**, no whitespace errors. Not re-run for the R1 fix specifically — `focus-indication.spec.ts` is untracked (a new file, not yet added), so this check is not sensitive to edits within it; reused from the third invocation and re-confirmed true by the `git status --short` in *Files Modified* above. |
| repository root | `git diff -- .../RefineSidebar.tsx .../filterControls.tsx .../DownloadActions.tsx` | *(re-run, third invocation)* **Empty** (0 bytes of diff output). Not re-run for the R1 fix — none of these three files is touched by it. |
| repository root | `data-testid` literal diff, working tree vs `HEAD` | *(re-run, third invocation)* **Identical.** Not re-run for the R1 fix — it adds no `data-testid`, and touches no file under `core/ui-react/src`. |
| repository root | `git diff --stat` | *(re-run, third invocation)* **Exactly the paths under *Files Allowed To Modify***, plus the coordinator's own `FM-052` header edit. Re-confirmed for the R1 fix by direct `git status --short` (above): unchanged set of tracked paths — `focus-indication.spec.ts` remains untracked/new, so a screenshot-framing change inside it cannot appear in `git diff --stat` at all. |
| repository root | `git status --short --ignored tests/system` | *(re-run, third invocation)* **Clean.** Not re-run for the R1 fix; the fix wrote no new file, only edited the existing untracked spec, and regenerated git-ignored captures in place. |

**Why `core/ui-react`'s chain and the six other spec files are reused rather than re-run for the R1 fix, and again for the R2 fix — stated explicitly as reused evidence, not as a fresh pass.** The only file either fix changed is
`tests/system/tests/focus-indication.spec.ts` itself — a Playwright spec, not a `core/ui-react` source or test file, and not any of the other six spec files. `core/ui-react`'s chain result below is therefore the **third invocation's**
manifest, re-confirmed unchanged by re-hashing every file it covers against the tree as delivered by the R2 fix (this fifth invocation):

- `core/ui-react/src/app/theme.ts` `efacf34de0865fa108fd62f335fd71deca1fe3c29c80d58dd900ee58921a5a0e`
- `core/ui-react/src/app/theme.test.ts` `eab8ac68de352cf6ae3d9caf314e44b635bbe9dfd9547c7a5e95163f1ef251ff`
- `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx` `2890f1a702640d0634ad920cfa5f1c6f35c5997602f93441070953856e7a4ead`
- `core/ui-react/src/features/search/results/SearchResults.tsx` `996ab77d1c1bb56f7dcf980ff5bca4efe1c52cb89fb89b7a131e2c5c0664e42f`
- `core/ui-react/package.json` `7d7cfbce0e2d5746edb623490539091fc28ad15b4669622163c61945a91c692e`
- `core/ui-react/scripts/validate-focus-affordances.mjs` `d950b731c4871db6ad831b89335c14ea4fca0cacd5614a74b9ce2e321b8bbb89`
- `core/ui-react/package-lock.json` `ab048500036be3fc739fdbcf1b34af706401c94bad60276f38fb645b5f6cdfbb`

all seven matching the third invocation's values digit for digit — neither fix could have moved any of them, since neither wrote to any path under `core/ui-react`. **`tests/system/tests/focus-indication.spec.ts` changed twice**: from
`dcec6442297299c9d6bcad614b1f0838121f9dc9f1334050126dd74874053f25` (as delivered by the third invocation) to `3afab45b548437ec5aa4200ba9f333ade4ee83be4d78ed3836e50ec334acbb6b` (as delivered by R1), then to
`7c65ef4aebc5e3de09e8baadb0de0f6877fd59ca86234da4f20b3cd77625e87b` (as delivered by R2, this fifth invocation) — which is exactly why its own tests were re-run at each step rather than reused. The same reasoning licenses reusing the
guard's four reintroduction probes and the spec's own negative-control probe: their subject files (`theme.ts`, `SearchWorkspace.tsx`, `SearchResults.tsx`, `validate-focus-affordances.mjs`) are in the unchanged set, and the negative
control disables a rule in `theme.ts`, not anything in the spec file either fix touched. The other rows in the table above marked "not re-run for the R1 fix" are, for the identical reason (the file they cover is in the unchanged
set above), also not re-run for the R2 fix.

Per-test results for the spec, all three re-runs (R1 twice, R2 once — all passed every time): `search route's ButtonBase, InputBase and Select families at both viewports`; `Advanced panel's and the media pair's bare InputBase
renderings`; `indexer Select and the recent-search trigger and menu`; `results surfaces, including the SwitchBase family on its own visible root`; `Tab family inset, because an outset ring is clipped by the Tabs scroller`;
`search-history route's un-overridden OutlinedInput and default-padding Checkbox`; `anchor family, including the sanitized third-party anchor the app does not classify`; `MUI Link family … and the color=error Button family`;
`accepted F-SEARCH-PAGING geometry checks literally true while a continuation control is focused`.

### Verification Basis

- Baseline: `dfe9f8a2e0b55a38f2f60adf76525f9f343fac1b` (branch `newUi2026`). **This fifth invocation — the R2 fix — started from the fourth invocation's (R1's) delivered working tree**, whose every path is FM-053-attributable and
  listed under *Files Allowed To Modify* (plus the coordinator's own `FM-052` header edit and the governance bookkeeping in `docs/frontend-migration/`); no unrelated pre-existing user change was present, and none was touched.
  Nothing was staged or committed. Per the orchestrator's supplied classification, all of `git status --short` at the start of this invocation was FM-053 task-attributable, across all four prior implementer/fixer invocations plus
  two task-designer scope refinements.
- Command coverage for this fifth invocation:
  - `tests/system` `npx tsc --noEmit`, `npx prettier --check .`: `focus-indication.spec.ts` — **affected** by this fix (the file itself changed again, three more call sites rewired) — re-run.
  - The launcher run of `focus-indication.spec.ts` alone: `focus-indication.spec.ts` — **affected** (a runtime/test-file change per the task instructions' own affected/reusable classification rule) — re-run.
  - Every other command listed in *Verification Evidence* above: **reusable** — none of their covered files (`theme.ts`, `theme.test.ts`, `SearchWorkspace.tsx`, `SearchResults.tsx`, `validate-focus-affordances.mjs`, `package.json`,
    `package-lock.json`, `FEATURES.yaml`, the other six spec files) changed in this invocation, confirmed by the manifest above and by `git status --short` showing no new modification to any of them.
- File-content manifest (every value below re-computed in this fifth invocation against the delivered tree):
  - `core/ui-react/src/app/theme.ts: efacf34de0865fa108fd62f335fd71deca1fe3c29c80d58dd900ee58921a5a0e` (unchanged)
  - `core/ui-react/src/app/theme.test.ts: eab8ac68de352cf6ae3d9caf314e44b635bbe9dfd9547c7a5e95163f1ef251ff` (unchanged)
  - `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx: 2890f1a702640d0634ad920cfa5f1c6f35c5997602f93441070953856e7a4ead` (unchanged)
  - `core/ui-react/src/features/search/results/SearchResults.tsx: 996ab77d1c1bb56f7dcf980ff5bca4efe1c52cb89fb89b7a131e2c5c0664e42f` (unchanged)
  - `core/ui-react/scripts/validate-focus-affordances.mjs: d950b731c4871db6ad831b89335c14ea4fca0cacd5614a74b9ce2e321b8bbb89` (unchanged)
  - `core/ui-react/package.json: 7d7cfbce0e2d5746edb623490539091fc28ad15b4669622163c61945a91c692e` (unchanged)
  - `tests/system/tests/focus-indication.spec.ts: 7c65ef4aebc5e3de09e8baadb0de0f6877fd59ca86234da4f20b3cd77625e87b` — **changed** from `3afab45b548437ec5aa4200ba9f333ade4ee83be4d78ed3836e50ec334acbb6b` (as delivered by R1); this is the one file this fix touched
  - `docs/frontend-migration/FEATURES.yaml: b0bc0ed485000d308f2cbd65e1811ef84f30d86ffa87c75cba68ffb541893cb1` (unchanged)
  - `core/ui-react/package-lock.json: ab048500036be3fc739fdbcf1b34af706401c94bad60276f38fb645b5f6cdfbb` (unchanged from baseline)
- Completed after the last change to each command's listed files: **yes** for both affected commands (`tsc --noEmit`, `prettier --check .`, and the launcher run) — each was executed after the final edit to
  `focus-indication.spec.ts` (the three R2 call-site rewires), so the passing evidence and the pixel-evidence table both describe the delivered file, not an intermediate one. The reused rows predate this invocation and cover only
  files re-hashed here and found byte-identical to the tree they measured.
- Task-owned changes after this invocation: `tests/system/tests/focus-indication.spec.ts` (the R2 fix) and this packet's Handoff (the *Review Finding R2 — Fixed* section, the corrected *Captures produced* paragraph, and this
  updated *Verification Evidence*/*Verification Basis*, plus a *Follow-Up Work* bullet flagging the out-of-scope `F-PLATFORM-SHELL` observation). `Status:` stays `review` — this is a fix within review, not a new handoff to a
  different status, so `npm run validate:migration` (which reads `Status:`/`STATUS.md` placement, neither of which changed) is reused rather than re-run.

### Dependency Decisions

- Runtime dependencies added, removed, or changed: **None.** `@mui/material` stays pinned at `7.3.9`, as this packet requires.
- Development dependencies added, removed, or changed: **None.** The guard script uses only `node:fs/promises` and `node:path`. `package-lock.json` is byte-identical.

### Architecture Decisions

- **ADR-0013** (accepted 2026-08-19, **Option A**) is the governing decision and is implemented exactly: an explicit focus-ring token authored per control family on each component's own `&.Mui-focusVisible`/`:focus-visible` selector in
  `theme.ts`. **Option B's mechanism appears nowhere**: no `!important`, no specificity raise, and no per-family opt-in on the global rule as the indicator's delivery mechanism. Scoping the global rule was available only as the
  reconciliation half of the required choice, and the choice made was to *reconcile* it, not to scope it. **Option D's narrowing was not taken**: all seven mechanisms are addressed, not only the five 2.4.7 failures.
- **ADR-0004**: accessibility is gated independently and in a real browser; the new spec is additive at file level and **no test was removed, skipped, renamed, weakened, or ignored by this task**. The three granted `theme.test.ts`
  assertions were *restated over the values the accepted option produces* and all three remain literal-value `toEqual` comparisons over the whole object; `toEqual` was not downgraded to `toMatchObject`, `expect.objectContaining`,
  `toBeDefined`, or a standalone `typeof` check anywhere, and the mock's `textTransform: "none"` / `borderRadius: 8` / `height: 26` / `borderRadius: 7` literals are all still asserted. The suite ends at the **restored** `247 passed (247)`,
  never a lowered count. No `theme.test.ts` assertion is left failing, and none was left unedited as a workaround.
- **ADR-0002**: the remedy uses MUI's own primitives only — `styleOverrides` on MUI component slots. No bespoke focus widget, no second component suite.
- **ADR-0006**: this packet produces focused-state evidence and proposes twelve variances. **No baseline or variance is accepted, and no acceptance is claimed, granted, or implied.**
- **ADR-0009**: the mock's borderless resting rendering of the category `Select` is preserved; the local overrides that ADR explains are not relitigated, and the three `notchedOutline` recolours are byte-identical.
- **ADR-0012**: its precedent for a version-scoped re-verification duty recorded in the code is followed in both `theme.ts` and the spec.
- `ADR REQUIRED` triggered during this task: **None.** The blocker is a `Files Allowed To Modify` scope grant, not a decision.

### Assumptions

- **`palette.primary.main` is the right colour for the token.** Chosen from repository evidence rather than invented: it is the only colour FM-052 measured *passing* through the app's own authored rule (mechanism 7, 7.34:1), using it keeps
  that class's rendering literally unchanged, and reading it from the palette rather than as a literal means the `dark-dyschromatopsia` accessibility variant retunes the ring with the rest of the palette automatically.
- **Chromium reports `oklch(0.75 0.1 190)` back verbatim** from `getComputedStyle().outlineColor` rather than converting it to `rgb()`. Confirmed live at every measured control; the spec asserts that literal, so a future Chromium that
  normalised it would fail the gate loudly rather than silently.
- **The `notchedOutline` `Mui-focused` recolour is a state affordance, not a second keyboard focus system.** Stated as an assumption because it is a judgement, not a measurement: it fires on pointer focus and on a `Select`'s `open` state
  too (FM-052 recorded that for the Downloader dropdown), so it is not keyed to keyboard focus and is not what "one focus system" refers to. It is left in place both because this packet forbids unwinding the recolours and because FM-052
  measured them raising that family's contrast.
- **The scratch measurement harness needed the launcher's own environment variables.** Running Playwright outside `misc/run_gui_systemtest.py` without `MOCKSERVER_INTERNAL_URL` pointed at `127.0.0.1` makes indexer resolution fail in ways
  that look like app defects — FM-049 recorded this and it reproduced here (a search returning no rows). Every figure quoted above comes from a run with those variables set, or from the launcher itself.

### Temporary Exceptions And Debt

- **None** introduced by this task, and **none outstanding**. Both escalations were write-scope grants rather than workarounds, both are granted and discharged, and nothing was deferred, suppressed, or worked around to reach `review`.

### Registry And Documentation Updates

**Ten contract-carrying records** (`F-PLATFORM-SHELL`, `F-SEARCH-FORM`, `F-SEARCH-MEDIA`, `F-SEARCH-INDEXERS`, `F-SEARCH-RECENT`, `F-SEARCH-RESULTS`, `F-SEARCH-SORT-FILTER`, `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-DOWNLOADS`,
`F-SEARCH-SAVED`): each gained exactly one additive `visual.contract.states` entry `keyboard-focus-indicator`; two additive `visual.contract.geometry_checks` naming that record's own control, its measured area against its own `4(w+h)`
threshold and its measured full-opacity contrast; `tests/system/tests/focus-indication.spec.ts` appended to `visual.evidence`; one additive `visual.snapshots` entry; and one additive `proposed` variance carrying the required ADR-0009
mock justification. `F-PLATFORM-SHELL` and `F-SEARCH-RECENT` carry a **second** `proposed` variance recording the measured inset geometry. For all ten: `visual.applicability`, `visual.status`, `visual.note`, `contract.setup`,
`contract.viewports`, `parity`, `tests`, `selectors`, `target` and `task` are **intentionally unchanged**, and every pre-existing variance keeps its own `status` and description untouched.

**`gaps` discharged against the evidence, not by assumption.** The four records FM-052 extended had their focus `gaps` phrase **removed rather than narrowed**, in each case because the measurement shows the family now renders a passing
authored indicator: `F-PLATFORM-SHELL` (`app-wide keyboard focus indication is inconsistent (FM-052)`), `F-SEARCH-FORM` (query field / category select / Advanced-panel ranges), `F-SEARCH-GROUP-SELECTION` (select-all checkbox),
`F-SEARCH-MEDIA` (paired season/episode inputs and `additional-query`). Each record's `backlog.rationale` was **extended, not replaced**, naming ADR-0013 as the accepted decision and FM-053 as its implementation, and stating that the
ADR-0006 acceptance remains outstanding.

**`F-PLATFORM-SHELL`'s stale sentence: confirmed already corrected, no residue found.** The clause "no control family renders the global rule as authored" is **not present** in `FEATURES.yaml` — verified by a repository-wide grep, which
finds it only in `STATUS.md`'s FM-052 close-out narration, in ADR-0013's own quotation of it, and in this packet's text, all three of which quote it in order to withdraw it. The current `backlog.rationale` already states the corrected
position ("Two families do render the global rule as authored…"), and was verified accurate against FM-052's mechanisms 5 and 7. No correction was owed; the rationale was extended with FM-053's outcome instead.

**`F-SEARCH-PAGING` (`visual.status: accepted`) handled by exception — its `visual` block is byte-identical.** Both accepted geometry checks were re-verified live while a continuation control held real keyboard focus, and both stay
literally true: the load-more/load-all controls still render immediately above `results-toolbar` (asserted by bounding box), and `documentElement.scrollWidth === clientWidth` at both viewports (1280/1280, 390/390), so the outset ring
introduces no page-level horizontal overflow. **No state was added to the accepted contract, the 2026-08-16 acceptance was not re-dated, and no `acceptance` key was touched.** Only `backlog.rationale` was extended, naming the outstanding
focused-state acceptance and the task-scoped capture paths. No escalation is owed on this record.

**Six `unassessed` records** (`F-SEARCH-PROGRESS`, `F-STATS-SHELL`, `F-STATS-INDEXERS`, `F-HISTORY-SEARCHES`, `F-HISTORY-SAVED-SEARCHES`, `F-SYSTEM-NEWS`): `gaps` and `backlog.rationale` **only**, exactly as the packet scopes them. Each
gained one `gaps` phrase recording that focused-state evidence exists but that the record's own first visual contract and the ADR-0006 acceptance of that state are outstanding, and a `backlog.rationale` extension naming what FM-053 gave it
and why its captures are task-scoped rather than registry-cited. **No `visual` block field of any of the six was touched, and no contract was manufactured for any of them.** `F-SYSTEM-NEWS` had no `gaps` key at all and gained one.
`F-SEARCH-PROGRESS`'s entry records the checked negative described above rather than a capture it does not have.

**Every other linked record explicitly confirmed unchanged**: `F-AUTH-LOGIN`, `F-SEARCH-TOUR`, the ten `F-CONFIG-*` records, `F-STATS-MAIN`, `F-HISTORY-DOWNLOADS`, `F-HISTORY-NOTIFICATIONS`, `F-SYSTEM-SHELL`, `F-SYSTEM-CONTROL`,
`F-SYSTEM-UPDATES`, `F-SYSTEM-LOG`, `F-SYSTEM-TASKS`, `F-SYSTEM-BACKUP`, `F-SYSTEM-BUGREPORT`, `F-SYSTEM-ABOUT` and `F-PLATFORM-LIVE-STATUS` — none is touched, and none owns a React-rendered interactive control this remedy reaches.
`COMPONENTS.yaml` and `APIS.yaml` are unchanged; no component or API contract is affected.

**ADR-0006 statement, in the required terms.** Applicability: `applicable` on every touched record, unchanged. Lifecycle transition: **none** — `visual.status` is exactly as it was on all seventeen records (`accepted` on `F-SEARCH-PAGING`,
`proposed` on the other ten, `unassessed` on the six), and **no `decision`, `accepted_by` or `accepted_on` key was added, edited, or re-dated anywhere**. Scoped states/viewports/geometry: one additive state and two additive geometry checks
per contract-carrying record; **no new viewport** — the existing named `desktop` 1280x800 and `mobile` 390x844 only. Evidence and snapshots: the new spec added to `visual.evidence`, one narrow focused capture per record added to
`visual.snapshots`. Variance disposition: **twelve new variances, every one `proposed`**; no existing variance's status or description was changed. **Human acceptance pending** for every one of them and for every focused state introduced
here — it belongs to the repository owner alone, and accepting ADR-0013 was explicitly not visual acceptance. **No behavioral or accessibility gate was implied by visual evidence, and no visual gate was implied by the behavioral or
accessibility evidence**: the captures are illustrative, and every disposition above rests on computed styles and measured geometry from `tests/system/tests/focus-indication.spec.ts`.

**Captures produced** (git-ignored via `tests/.gitignore:33`; nothing enters the tracked diff). **The sentence that stood here through the first review — that `captureVisualRegion` itself expands the clip to contain an outset ring — was
false**, and was corrected by the R1 fix; **the sentence the R1 fix then wrote here in its place — "seven of the ten registry-cited captures below pass a containing-region locator wide enough to leave real margin around the focused
control, which is correct and was independently confirmed" — was itself false for two of those seven** (`F-SEARCH-INDEXERS`, `F-SEARCH-DOWNLOADS`) and marginal for a third (`F-SEARCH-GROUP-SELECTION`), found by a second independent
review and fixed here (see *Review Finding R2 — Fixed* above for the full account). `captureVisualRegion` (`tests/system/tests/visualEvidence.ts:97-105`) is a bare `locator.screenshot({path})`; it performs no expansion at all — any
margin around the ring comes only from what the caller passes it, and passing a containing-region locator is correct only when that region is measurably wider than the control's own reach on every side, which was not verified for any
of the ten at the time the first-review sentence was written.

**As delivered**: of the ten registry-cited captures, **six** now use `captureFocusedControl` (framed from the focused control's own bounding box plus a fixed margin, clamped to the viewport — correct by construction, and
independently pixel-verified for all six, per capture, below) and **four** remain on `captureVisualRegion` with a containing-region locator — correct for three because that region was independently confirmed to leave a real, measured
margin on every side, and correct for the fourth (`F-PLATFORM-SHELL`) for a different reason: a third independent review adjudicated it and found it renders an **inset** ring (`outline-offset: -3px`, per `MuiListItemButton`'s
`theme.ts` entry), whose outermost pixel is defined to coincide with the control's own border edge — border-touching there is the correct, expected signature of that geometry, not a cropping defect. Marked below, per capture, with the
evidence for the claim:

- `tests/system/visual-evidence/F-PLATFORM-SHELL/keyboard-focus-nav-item-desktop.png` — `captureVisualRegion`, region locator. The R2 fix's own re-verification flagged exact-match ring-colour pixels touching the capture's left and
  bottom edges as the same defect class fixed below, and left it unfixed pending adjudication (recorded in *Review Finding R2 — Fixed* below and originally in *Follow-Up Work*). **A third independent review closed this: the control's
  ring is inset (`outline-offset: -3px`), so its outermost pixel is defined to sit exactly on the control's own border — the reviewer decoded the regenerated PNG and confirmed all four strokes present at full 3px width and full
  length, with the ring's exact pixel bounding box (84x43) matching the control's own recorded box (84.00x43.00) exactly. Not a defect; no further fix.** The same adjudication clears the two other inset, task-scoped captures below
  (`stats-tab-desktop`, `nav-item-mobile-drawer`).
- `tests/system/visual-evidence/F-SEARCH-FORM/keyboard-focus-advanced-range-input-desktop.png` — **`captureFocusedControl`** (R1 fix; was `captureVisualRegion` on `workspace-ranges`, too tight)
- `tests/system/visual-evidence/F-SEARCH-MEDIA/keyboard-focus-season-input-desktop.png` — `captureVisualRegion`, region locator. Re-confirmed correct by this invocation: 4240 ring-colour px, 0 border-touching, 11–56px measured margin
  on every side.
- `tests/system/visual-evidence/F-SEARCH-INDEXERS/keyboard-focus-indexer-select-desktop.png` — **`captureFocusedControl`** (R2 fix, this invocation; was `captureVisualRegion` on `workspace-indexers`, a region exactly as wide as the
  control itself, so the ring's left/right/top strokes were off-frame by construction)
- `tests/system/visual-evidence/F-SEARCH-RECENT/keyboard-focus-recent-searches-trigger-desktop.png` — **`captureFocusedControl`** (R1 fix; was `captureVisualRegion` on `workspace-actions`, too tight)
- `tests/system/visual-evidence/F-SEARCH-RESULTS/keyboard-focus-sort-header-button-desktop.png` — `captureVisualRegion`, region locator. Re-confirmed correct by this invocation: 716 ring-colour px, 0 border-touching, 2–42px measured
  margin on every side.
- `tests/system/visual-evidence/F-SEARCH-SORT-FILTER/keyboard-focus-refine-filter-title-desktop.png` — `captureVisualRegion`, region locator. Re-confirmed correct by this invocation: 2935 ring-colour px, 0 border-touching, 4–50px
  measured margin on every side.
- `tests/system/visual-evidence/F-SEARCH-GROUP-SELECTION/keyboard-focus-select-all-checkbox-desktop.png` — **`captureFocusedControl`** (R2 fix, this invocation; was `captureVisualRegion` on `search-results-table` — marginal, the
  ring's left stroke survived as only 1 of its 3 pixel columns, flush against the frame's left edge)
- `tests/system/visual-evidence/F-SEARCH-DOWNLOADS/keyboard-focus-downloader-select-desktop.png` — **`captureFocusedControl`** (R2 fix, this invocation; was `captureVisualRegion` on `results-download-actions`, not tall enough for the
  control's own vertical reach, so the ring's top/bottom strokes fell outside the frame — the identical region R1 already found too tight for `F-SEARCH-SAVED`'s capture below, left untouched by R1 for this second capture from it)
- `tests/system/visual-evidence/F-SEARCH-SAVED/keyboard-focus-save-search-desktop.png` — **`captureFocusedControl`** (R1 fix; was `captureVisualRegion` on `results-download-actions`, too tight)

Task-scoped, never an ADR-0006 baseline: `tests/system/visual-evidence/FM-053/keyboard-focus-{nav-item-mobile-drawer, saved-search-delete-desktop, stats-tab-desktop}.png` — bare region/element screenshots, unchanged, independently
confirmed good; and `tests/system/visual-evidence/FM-053/keyboard-focus-{news-anchor-desktop, search-history-refresh-desktop, paging-load-more-desktop, paging-load-more-mobile}.png` — **`captureFocusedControl`** (R1 fix; all four were
bare `element.screenshot()` calls that the review decoded and found the ring either fully absent (0 ring pixels, `news-anchor`) or entirely outside the crop (`search-history-refresh`, both `paging-load-more` files)).

### Follow-Up Work

- **The blocker is closed, and is not a follow-up.** The second refinement made the one-line grant, the third assertion was updated under the identical fences, and `npm run test` returned the restored `38 passed (38)` /
  `247 passed (247)`. Nothing is deferred and no corrective packet is proposed for it.
- **`core/ui-react/.playwright-cli/` holds stale scratch artifacts from earlier sessions** (console logs and page dumps dated 2026-08-16 and 2026-08-18, predating this invocation). Git-ignored, so no tracked scope is affected; this task did
  not create them and deliberately did not delete another session's files. **Maintenance candidate for `/fm-quickfix`**: `rm -rf core/ui-react/.playwright-cli`, verified by `git status --short --ignored core/ui-react`.
- **`Radio`, `Switch` and an interactive `Chip` are authored but ungated**, because the application renders none of them. If any is ever added, `tests/system/tests/focus-indication.spec.ts` must gain a representative for it — the spec's own
  header comment says so. Recorded as a known limit of the gate, not as a task.
- **A real screen-reader verification of the new indicator's announcement is out of reach of this harness**, exactly as `F-SEARCH-RECENT`'s existing `gaps` entry records for the Refill button. Not raised as a defect; no task is proposed.
- **`F-PLATFORM-SHELL/keyboard-focus-nav-item-desktop.png` — flagged during the R2 fix, adjudicated and closed by the third review, not a defect.** The R2 fixer's re-verification pass found the ring touching the frame's left and
  bottom edges and, applying the R1/R2 border-touching heuristic, flagged it as needing the identical fix. A third independent review read `theme.ts` directly and found `MuiListItemButton` (nav items), `MuiTab`, and `MuiMenuItem` are
  authored with `focusRing(theme, focusRingInsetOffset)` at `outline-offset: -3px` — an **inset** ring, whose outermost pixel is defined to coincide with the control's own border edge. Border-touching is that geometry's expected,
  correct signature, not a cropping defect; the border-touching heuristic is valid only for the outset families R1/R2 actually fixed. The reviewer decoded the regenerated PNG and confirmed all four strokes present at full 3px width
  and full length, with the ring's exact pixel bounding box (84x43) matching the control's own recorded box (`84.00x43.00`) — nothing is outside the frame. The same adjudication clears the two other inset, task-scoped captures
  (`FM-053/keyboard-focus-stats-tab-desktop.png`, `FM-053/keyboard-focus-nav-item-mobile-drawer.png`), which are also border-touching by the same correct geometry. **No further fix-invocation is warranted**; rewiring this call site to
  `captureFocusedControl` would be a cosmetic framing change with no defect behind it, and should not be done reflexively.
- **None** beyond those. No other out-of-scope defect was found that a quickfix could discharge, and no other corrective packet is proposed.
