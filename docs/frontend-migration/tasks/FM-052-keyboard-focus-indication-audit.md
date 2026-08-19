# FM-052: Application-Wide Keyboard Focus Indication Audit

Status: done Owner:
Feature IDs: F-PLATFORM-SHELL, F-SEARCH-FORM, F-SEARCH-GROUP-SELECTION, F-SEARCH-MEDIA
Component IDs: None
API IDs: None
Depends on: None
Blocks: None

## Dependency Notes

This is a **measurement packet**, built on FM-049's shape: it establishes facts and repairs nothing. `Depends on: None` is literal — every route it audits already exists, and no packet is waiting on it except the decision it is
expected to raise.

It exists because the repository owner tabbed through the React UI and reported that focus indication differs from control to control: visible on the Search button, the Advanced toggle, the checkboxes, and the three bulk-action
buttons; absent on the category dropdown and the query field; and *reported both ways* for the Downloader dropdown ("not on … the Downloader dropdown" and "the Downloader dropdown shows a colored border when selected"). That last
contradiction is not to be resolved by picking a reading — it is a measurement, and it may well be a focused-versus-open distinction.

It is also the filing FM-050's Follow-Up Work asked for. That bullet sized the concern as task-sized rather than a quickfix and said filing it was "a task-designer decision outside this task's `Files Allowed To Modify`". **This packet
supersedes that bullet as the owning record.** FM-050 is `done` and is not edited: `README.md`'s narrow post-`done` exception covers factual corrections only, and rewriting a fixer's attested finding is forbidden outright. Nothing is
added to `MAINTENANCE.md`'s *Open candidates* either — that list is for small defects dischargeable by `/fm-quickfix`, and FM-050's own bullet already established this is not one.

**Source-reading alone has already produced one wrong diagnosis here.** FM-050's Follow-Up bullet first claimed `ButtonBase` controls have no focus indicator at all; the owner can see a ripple, and a fixer pass corrected it. Treat every
mechanism named under *Context To Read* as a lead to verify and extend in a browser, never as an inventory to transcribe.

## Outcome

What focus indication each interactive control class in the React UI actually renders under keyboard focus today is established by direct measurement in a real browser, per class, with an unfocused comparison, and recorded as durable
evidence — enough that a remedy could later be specified against literal values rather than impressions. Every class is dispositioned against one stated, uniformly applied rule, and classes that fail WCAG 2.4.7 outright are separated
from classes that are merely inconsistent. Nothing is remedied: `core/ui-react` stays byte-identical to `HEAD`.

## Boundary Rationale

**Deliberately measurement-only, and deliberately not a vertical capability.** The unit of work is the size of the open question. The remedy cannot be bundled in because the remedy is not yet specifiable: the owner's report and the
source leads disagree about at least one control, source-reading already produced one wrong answer here, and any fix changes the rendered focus indicator of every control of its family across the whole application — a user-observable,
app-wide visual and accessibility surface that needs its own ADR-0006 treatment and an explicit human acceptance, neither of which a measurement may create.

It is not split from anything: no adjacent live packet exists, and enlarging it by bundling unrelated accessibility work is forbidden by `README.md`'s *Creating Task Batches*. The exhaustiveness requirement is what makes it substantial
— a per-route, per-class, keyboard-driven sweep with focused/unfocused deltas is the whole job, and narrowing it to the search route would reproduce the sampling error that made the original report ambiguous.

## Decision Dependencies

- Accepted ADRs governing this task: **ADR-0004** (testing and parity) is central. jsdom has no `:focus-visible` implementation, no layout, no computed outline, and no ripple element, so no component test can establish or refute any
  criterion here; ADR-0004's Playwright clause and its independent-gates clause are what govern. **ADR-0006** (visual parity policy) governs only as a constraint: this packet defines no visual contract, proposes no baseline, and
  reserves all acceptance for an explicit human decision it must not simulate. **ADR-0002** (frontend stack) constrains every future remedy to MUI's own primitives and is the reason the audit records *which MUI mechanism* produces each
  indicator rather than only what it looks like. **ADR-0009** (mock-fidelity redesign) is why several controls carry local styling that overrides MUI's own focus affordances; the audit measures the result, and does not relitigate it.
- This task defines no new visual contract, no new state, no new geometry check, no new named viewport, no new snapshot, and no new variance. No `visual` block field of any record is touched. No `decision`, `accepted_by`, or
  `accepted_on` key is added, edited, or re-dated anywhere.
- Proposed or rejected ADRs blocking this task: **None.**

**Coordinator note (2026-08-19).** The bullet above is preserved as it stood at handoff, when the remedy's ADR genuinely did not exist. It does now. **ADR-0013**
(`decisions/ADR-0013-application-wide-keyboard-focus-indication.md`, accepted 2026-08-19, **Option A** — an explicit focus-ring token authored per control family) resolves the decision this packet escalated, so the blocking proposal is
discharged and this packet is no longer `blocked`. ADR-0013 governs this packet only in that it closes it: it records that "the remedy is a later task packet that does not exist yet", that FM-052 "implemented no remedy by design", and
that `core/ui-react` and `tests/system` stay byte-identical to baseline until a designed packet says otherwise. **Nothing in the measurement, its disposition, its numbers, or its recorded evidence changes**, and no remedy packet is
created or named here — creating it is a later task designer's job, and the repository owner has explicitly reserved it for a later session.

## Files Allowed To Modify

- `docs/frontend-migration/FEATURES.yaml` — **only** the `gaps` and `backlog` fields of `F-PLATFORM-SHELL` (mandatory: it owns `core/ui-react/src/app`, and therefore `theme.ts`'s app-wide `:focus-visible` rule) and of **each** feature
  record whose own controls the audit dispositions as failing WCAG 2.4.7. Append to `gaps` as a short phrase and extend `backlog.rationale`; use `status: deferred` with prose only — do **not** invent a `backlog.adr` or `backlog.task`
  for a remedy that does not exist yet. Not the `visual` block (any field of it), not `parity`, not `tests`, not `selectors`, not `target`, not `task`, and not one character of any other record. Records the audit finds clean are
  explicitly confirmed unchanged in the handoff, per `README.md`'s registry-reconciliation rule.
- `docs/frontend-migration/STATUS.md` and this task packet.
- Measurement captures under `tests/system/visual-evidence/FM-052/` — a **task-scoped** directory, deliberately not a `F-<FEATURE>/` one, so these are never mistaken for ADR-0006 feature baselines. The whole
  `tests/system/visual-evidence` tree is git-ignored (`tests/.gitignore:33`), so this adds nothing to the tracked diff; that is the repository's existing evidence convention, not a workaround.

## Read Scope

The agent may read and search the entire repository as necessary to satisfy the acceptance criteria and verification requirements.

The files under Context To Read are mandatory starting points, not an exhaustive list of files that may be inspected.

Do not modify files outside Files Allowed To Modify. If a required change falls outside this scope, stop and escalate with the exact file and reason.

## Out Of Scope

- **Any change to `core/ui-react/src/app/theme.ts`.** Not the `:focus-visible` rule, not a `MuiButtonBase` override, not a token. This is the single most likely place an implementer drifts into fixing, and it is the remedy's file.
- **Any change to any component under `core/ui-react/src/`.** Adding a `focusVisibleClassName`, an `sx` focus rule, a `disableRipple`, or restoring the category select's notched outline is remediation. `git diff -- core/ui-react` must
  be empty at handoff.
- **Any committed test, in `tests/system` or `core/ui-react`.** The audit's product is evidence, not a gate: a test asserting today's indicators would enshrine defects as expected behavior, and a remedy packet would then have to delete
  passing assertions, which ADR-0004 forbids ("No test may be removed, skipped, weakened, or ignored"). Measurement runs use a scratch spec under the git-ignored `tests/system/.playwright-cli/`, deleted before handoff.
- **Designing, prototyping, naming, or recommending-by-implementation any remedy**, including a focus-ring token, a specificity fix, or a ripple-opacity change. Enumerating options with their acceptance costs in the handoff is required;
  choosing one is not available to any agent here.
- **Removing or renaming any `data-testid`.** Every value is a compatibility contract under `README.md`'s *Registry Rules* and no part of this task needs to touch one.
- **Any human visual or accessibility acceptance**, and any edit to a `visual` block. A measurement is evidence, never acceptance.
- **Editing FM-050, or any other `done` packet.** See *Dependency Notes*.

## Context To Read

- `tasks/FM-049-recent-search-refill-keyboard-reachability-measurement.md` in full — the measurement-packet shape this follows, its control-probe discipline, and its handoff's *Assumptions*, which records that running Playwright
  outside `misc/run_gui_systemtest.py` needs `MOCKSERVER_INTERNAL_URL` set explicitly or indexer resolution fails in ways that look like app defects.
- `tasks/FM-050-recent-search-refill-keyboard-reachability-remedy.md`'s *Follow-Up Work* — the finding this packet takes ownership of, including the correction that a ripple does exist.
- `README.md` — *Choosing A Mechanism*, *Registry Rules*, *Verification Integrity*, *Agent Autonomy And Escalation*, *Context Discipline*.
- `decisions/ADR-0004-testing-and-parity.md` in full; `decisions/ADR-0006-visual-parity-policy.md`'s `Consequences` (who may accept a baseline or variance); `decisions/ADR-0002-frontend-stack.md`.
- `core/ui-react/src/app/theme.ts` — read-only. Line 184-187's `MuiCssBaseline` `:focus-visible { outline: 3px solid currentColor; outlineOffset: 3px }` is the app's only global focus rule and the only `focus` occurrence in the file.
- `core/ui-react/src/router.tsx:19-105` — the authoritative route list. Six real React routes exist: `/`, `system/news`, `stats`, `stats/indexers`, `stats/saved-searches`, `stats/searches`; `stats/$tab` renders
  `MigrationPlaceholder`. Derive route coverage from this file, not from `AppShell.tsx`'s nav labels, which include unmigrated `config/main` and `system/control` destinations.
- The installed MUI 7.3.9 sources, **cited by symbol name and quoted text, never by line number** (`node_modules` coordinates rot between installs — that is how FM-047 acquired two stale citations): `ButtonBase/ButtonBase.js`'s root
  style and its `focusRipple` default; `ButtonBase/TouchRipple.js`'s `TouchRippleRipple` template and `pulsateKeyframe`; `InputBase/InputBase.js`'s input `&:focus` rule; `MenuItem/MenuItem.js`, `ListItemButton/ListItemButton.js`,
  `Chip/Chip.js`, and `Link/Link.js`'s `&.Mui-focusVisible` rules; `OutlinedInput`'s focused `notchedOutline` rule.
- The four local styling sites that alter or suppress an input's focus affordance: `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx:480-482` (`border: "none"`) and `:376` (a bare `InputBase`),
  `.../results/DownloadActions.tsx:85`, `.../results/RefineSidebar.tsx:218`, `.../results/filterControls.tsx:147`.
- WCAG 2.2 SC **2.4.7 Focus Visible** (Level AA) and SC **2.4.11 Focus Appearance** (Level AAA), including 2.4.11's minimum-area and 3:1 focused-versus-unfocused contrast requirements. These supply this packet's disposition rule; do
  not substitute a rule of your own.

## Acceptance

- **The control-class inventory is derived from the repository and the running app, not from this packet.** Build it from the union of two independent passes, and record both: (1) a source sweep of `core/ui-react/src/**` for MUI
  interactive components, native interactive elements, and anything carrying `tabIndex`, `aria-pressed`, `role="button"`, or `component={Link}`; and (2) a runtime sweep on **every** route in `router.tsx`, walking the real tab order by
  repeatedly pressing `Tab` from `document.body` and recording each `document.activeElement`, plus a DOM query for the focusable set, grouped by the `Mui<Component>-root` class present on the focused element (or by tag name when none
  is). Any class found by only one pass is called out as such with the reason. Cover the transient states too, naming each: results loaded, a `Menu` open, the refine `Drawer` open, a `Dialog` open, a `Popover` open, the Advanced panel
  expanded, an `Alert` rendered. A class present in the app but unreachable in any measured state is recorded as such rather than omitted.
- **A control class is defined by rendering, not by import.** Two instances of the same MUI component are **different classes** when either one's own styling changes what focus renders — the search-form category `Select`
  (`SearchWorkspace.tsx:480`, `notchedOutline` `border: "none"`) and the refine-bar inputs are two classes, not one. State this rule and apply it uniformly; it is the distinction the original report turns on.
- **Every measurement is reached by keyboard, and proven to be.** Reach each control by `Tab`/`Shift+Tab`/arrow keys from a known start. Never by `locator.focus()` and never by `click()`. Record `element.matches(":focus-visible")` for
  every measured control — this is the load-bearing datum, not an aside. **Negative control:** measure one `ButtonBase`-derived control reached by mouse click as well as by `Tab`, and show the two differ. A harness that cannot tell
  `:focus` from `:focus-visible` cannot support any finding in this packet, and this is the same "prove the gate bites" obligation FM-048 and FM-049 carried.
- **Focused and unfocused computed styles are captured for the whole subtree, so "renders nothing" is distinguishable from "renders something invisible."** For each class, in both states, from the same page and the same element,
  record for the element, each of its descendants, and its `::before`/`::after`: `outline-style`, `outline-width`, `outline-color`, `outline-offset`, `box-shadow`, every `border-*-color` and `border-*-width`, `background-color`,
  `color`, and `opacity`; plus `.MuiOutlinedInput-notchedOutline`'s `border-color`/`border-width` where one exists; plus the presence, computed `opacity`, `background-color`, `transform`, and bounding box of any
  `.MuiTouchRipple-root` / `.MuiTouchRipple-ripplePulsate` / `.MuiTouchRipple-child` node; plus `element.getAnimations({subtree: true})` reporting each running animation's `animationName` and `effect.getTiming().duration`. **An empty
  delta across that whole set is the evidence of record for "renders nothing"** — computed styles, not screenshots, decide every disposition.
- **The disposition rule is WCAG's, stated once and applied uniformly.** Per class: **`fails 2.4.7`** when the focused/unfocused delta is empty — no keyboard focus indicator exists, a plain Level AA failure and not a matter of taste;
  **`meets 2.4.7, fails 2.4.11`** when a delta exists but the changed area is smaller than the perimeter of a 2px-thick line around the control, or the contrast ratio between the changed area's focused and unfocused colors is below
  **3:1**; **`meets both`** otherwise. Report the changed-area figure and the contrast ratio as **numbers to two decimals**, computed from the literal composited colors by the standard WCAG relative-luminance formula — never as
  "faint", "weak", or "subtle". Where a figure is genuinely not computable, say which and why; do not soften it into an adjective.
- **The mechanism behind each disposition is named.** For each class, state which of the app's focus mechanisms produced the measured result, verified against the installed MUI source: the global `theme.ts` `:focus-visible` outline;
  `ButtonBase`'s root `outline: 0` defeating it; a pulsating `TouchRipple`; a `&.Mui-focusVisible` background rule; MUI's focused `notchedOutline` border; a local `sx` override suppressing one of the above; or something the audit
  found that this list does not name. Note in particular that `ButtonBase`'s own `focusRipple` prop **defaults to `false`** and only some components pass it — so "derives from `ButtonBase`" does not imply "has a ripple", and the audit
  must not assume it does.
- **The Downloader-dropdown contradiction is resolved empirically.** Measure it focused-but-closed and focused-with-the-menu-open, separately, and state which state the owner's two conflicting descriptions each correspond to.
- **Visual evidence a human can actually judge.** For each class, capture a focused/unfocused pair to `tests/system/visual-evidence/FM-052/<class>-{focused,unfocused}.png` at `deviceScaleFactor` **2**, using `page.screenshot({clip})`
  on the element's bounding box **expanded by 12px on every side** — an element screenshot would crop away a 3px outline drawn at a 3px offset entirely, and a cropped indicator photographs identically to an absent one. Both images of a
  pair must use identical geometry.
- **The animated indicator is captured honestly, and the reason it can be is stated.** The pulsate ripple's `opacity: 0.3` is **static** (from `.MuiTouchRipple-rippleVisible`); `pulsateKeyframe` animates **`transform: scale` only**
  (`1 → 0.92 → 1`, 2500ms, infinite, 200ms delay). A still therefore records everything except the scale phase, and is not the misleading artifact it would be if opacity were animated — verify that claim against the installed source
  and say so. Capture two stills at deterministic scale extremes by setting `Animation.currentTime` on the animation returned by `getAnimations({subtree: true})`, rather than by sleeping and hoping. **Do not use
  `prepareVisualEvidence()` for these captures**: its injected `animation: none !important` and `emulateMedia({reducedMotion: "reduce"})` alter the exact thing under measurement. If it is used anywhere in this task, record where and
  what it changed.
- **Registry reconciliation.** Append a short `gaps` phrase and extend `backlog.rationale` on `F-PLATFORM-SHELL` and on every record with a `fails 2.4.7` class, naming the capability precisely (keyboard focus indication is absent for
  the named controls) and naming the blocking decision rather than a fix. Explicitly confirm every other linked record unchanged. Then report **`ADR REQUIRED`** per the section below.
- **Environment is recorded.** `@mui/material` version, Playwright version, and the actual Chromium build. Every number here is a library-and-browser behavior and is only as durable as the versions it was taken against.
- **`core/ui-react` is byte-identical to `HEAD`**, confirmed by SHA-256 for `src/app/theme.ts` specifically and by an empty `git diff -- core/ui-react` overall. No `data-testid` is removed or renamed; confirm mechanically by diffing
  the `data-testid` literals in the working tree against `HEAD`, not by inspection.

## The Escalation This Packet Is Expected To Raise

**Resolved 2026-08-19 by ADR-0013 (accepted, Option A).** This section is preserved verbatim as the pre-formed question the implementer was required to raise and did raise; it is not reworded. ADR-0013 — not this section, and not the
`ADR REQUIRED` section below — is now the authority on the decision question, its option space, and its outcome. ADR-0013 records four options; the three pre-formed here and the three the measurement produced are the sets that existed
before the proposal, and ADR-0013 added a fourth ("remedy only the five WCAG 2.4.7 failures; accept the 2.4.11 gaps") that neither had.

Report `ADR REQUIRED` at handoff. The decision question is stated here so the implementer raises a pre-formed one and does not narrow the option space by whoever happens to hit it.

**Decision question.** The React UI renders keyboard focus through several different MUI mechanisms, at least one of which renders nothing at all. What single, consistent focus-indication approach should the application adopt, and what
does each control family render under it?

**Options.** Derive them from the mechanisms the audit actually measured, one per coherent strategy, and for each state: which control classes it changes, what each would render instead (literal values), whether it requires fresh
ADR-0006 human acceptance and why, and what it costs. Do **not** carry a pre-written option list from this packet, and do **not** recommend by implementation or by elimination beyond honest tradeoffs. The repository owner decides.

**Affected work.** No existing packet. The remedy is a later packet that does not exist yet and that this task must not create.

## Verification

Prerequisites and required service state: `tests/system` runs against a **real JVM backend plus mockserver**, not a Vite dev server. Use the documented launcher, which builds the `core` and `mockserver` exec JARs with Maven and starts
the sonarr/radarr Docker fixtures. Maven, a JDK, Docker, and installed Playwright Chromium browsers must all be available. Record any command as blocked if the environment cannot provide them — never imply it passed. Measurement runs
use a scratch spec under the git-ignored `tests/system/.playwright-cli/`; the `playwright-cli` skill may drive them.

- Working directory: `/home/sist/projects/nzbhydra2`
- `git diff -- core/ui-react` — empty.
- `sha256sum core/ui-react/src/app/theme.ts` — matches `git show HEAD:core/ui-react/src/app/theme.ts` byte for byte.
- `git diff -- tests/system` — empty. This task commits no test and no formatting change; `tests/system` has been Prettier-clean since `ba4acd521` and must stay so.
- `git diff --check` — no whitespace errors.
- `git diff --stat` — exactly `docs/frontend-migration/FEATURES.yaml`, `docs/frontend-migration/STATUS.md`, and this packet. Anything else is out of scope and an escalation.
- `git status --short --ignored tests/system` — confirm `tests/system/.playwright-cli/` holds no scratch spec, and that no `playwright-report/` or `test-results/` stragglers were left behind. FM-051's review carried exactly that as a
  minor finding; do not repeat it.
- Working directory: `/home/sist/projects/nzbhydra2/tests/system`
- `npx tsc --noEmit` — succeeds with no errors.
- `npx prettier --check .` — passes.
- Working directory: `/home/sist/projects/nzbhydra2/core/ui-react`
- `npm run validate:migration` — prints `Migration registries and task metadata are valid.` and exits 0, with FM-052 placed in the `STATUS.md` section its status requires (`## Blocked` when `blocked`; `## Review` when `review`).
- Confirm task-owned changed files are all listed under Files Allowed To Modify.
- Confirm verification leaves no unexpected generated or modified files. The captures under `tests/system/visual-evidence/FM-052/` are expected and git-ignored; list them in the handoff.

The React quality chain (`typecheck`, `lint`, `format:check`, `test`, `build`, `check:api`) is **not required and must be recorded as not run**, with this reason: no file under `core/ui-react/` changes, and the one registry file this
task may touch is gated by `validate:migration`. This is ADR-0004's independent-gates principle applied honestly, not a relaxation of *Verification Integrity*.

## Handoff

At handoff, use `templates/handoff.md`. Fill every section, writing `None` where appropriate. The deliverable is the evidence: include the control-class inventory with its two derivation passes, the per-class disposition table with its
computed-style deltas, area figures, and contrast ratios, the mechanism named per class, the negative-control result, and the capture paths. Mark the task **`blocked`**, list it under `## Blocked` in `STATUS.md`, and report
`ADR REQUIRED`. An implementer must never mark a task `done`.

### Outcome

Measured directly in a real Chromium browser (Chrome for Testing 151.0.7922.34, Playwright 1.62.1) against a real JVM backend plus mockserver, kept running for the whole audit via
`python3 misc/run_gui_systemtest.py --runtime local --keep-services -- tests/search.spec.ts --list` (a fast, non-mutating warmup that still builds and starts the real `core`/`mockserver` exec JARs and the sonarr/radarr Docker fixtures).
**43 control classes were fully measured** (keyboard-reached, focused/unfocused computed-style subtree diffed, `:focus-visible` recorded, every one of the 43 screenshotted as a focused/unfocused pair — 44 pairs, because the
43rd class is measured on two different grounds and each has its own pair — plus two deterministic pulsate-scale stills), across every real route in `router.tsx` plus the named transient states. The 43 are 25 from the first pass,
10 added by the second, mechanical pass, 7 added by the second correction pass, which re-checked the rendering-not-import rule against Pass 2's raw walk data element by element rather than against its `Mui<Component>-root`
groups — a group check that had passed while six renderings inside those groups carried their own `sx` `color`, or their own composited ground, and therefore their own contrast figure — and **1 added by the third correction
pass**: the `Button color="error"` Delete rendering (`SavedSearchesPage.tsx:133`, `:170`), which the second correction pass's element-by-element re-check missed because it covered the refine sidebar and results table but not the
`/stats/saved-searches` and `dialog-open` walks. One further class (the recent-search Refill `IconButton`) is recorded as present but keyboard-unreachable, per FM-049.

**One class meets both criteria under the convention reading; three do under the measured reading, and both counts are stated everywhere either is.**

- Under the **convention** figure this packet uses as its primary disposition, exactly one class passes both axes: the MUI `Link` rendered by `SavedSearchesPage.tsx:204` and `SearchHistoryPage.tsx:521`
  (`stats-identifier-link`), which renders `theme.ts`'s global `:focus-visible{outline:3px solid currentColor; outline-offset:3px}` **completely undefeated**, in the app's own primary teal (`currentColor` = `Link`'s default
  `color="primary"` = `palette.primary.main`, canvas-resolved `rgb(85,194,188)`), measured at **contrast 7.34:1** against the composited page background `rgb(31,36,38)` and **area 912.00 px² against a 536.00 px² threshold**.
- Under the **measured** ring geometry this packet also records, **three** classes pass both axes: `stats-identifier-link` (unchanged — its figure is real outline geometry, not a convention), plus the two *unlabelled*
  `notchedOutline` fields, `refine-filter-title-input` (contrast **5.56:1**; measured ring **1002.75 px²** against a **998.75 px²** threshold, **+4.00**) and `refine-numeric-range-input` (contrast **5.56:1**; measured ring
  **552.75 px²** against **548.75 px²**, **+4.00**). Their focused captures show a complete, unbroken 2px teal ring; nothing about them is marginal to look at, and the only reason they disposition as failures here is the
  convention's inset-ring model. **Whoever reads "one class passes" without this sentence attached will underestimate how much of the app already clears both axes.**

Every other measured class fails WCAG 2.4.11 (Level AAA) on contrast, on area, or both, under both readings.

**The `ButtonBase` pulsating-ripple family — the indicator on most of the app's buttons — measures `1.19:1` to `2.38:1`.** The floor is the `Button color="error"` Delete rendering (`SavedSearchesPage.tsx:170`) inside the
delete-confirmation `Dialog`, at **1.19:1**; the same rendering in the saved-searches table row measures **1.22:1**. Both sit below the `1.40:1` an earlier version of this handoff called "the measured floor", and the range is
restated as `1.19:1`–`2.38:1` everywhere it appears here and in `STATUS.md`. This changes **no** disposition (the class is `meets 2.4.7, fails 2.4.11` on contrast like every other `ButtonBase` instance), leaves the `fails 2.4.7`
count at five, and changes no option in the escalation; it changes a number the ADR will quote.

**Five classes fail WCAG 2.4.7 outright** (empty or perceptually-empty delta): `search-query-input` (the bare `queryInputSx` `InputBase`), `advanced-range-input` (the Advanced-panel Age/Size ranges — the same mechanism, but `advancedInputSx` is a second and distinct bare-`InputBase` rendering), `search-category-select`, the results toolbar's tri-state select-all `Checkbox`, and `season-episode-paired-input` (`pairedInputSx`, a third and distinct bare-`InputBase` rendering that carries no border at all). **Five** is the count the disposition table, the class-boundary section ("bare `InputBase` splits three ways"), the 42-class total and `FEATURES.yaml` all agree on; an earlier "four" here counted `advanced-range-input` inside `search-query-input` while the table counted it separately.

**Read the "fails 2.4.11" verdict with its two caveats attached.** First, `search-indexers-select`, `downloader-select`, `refine-filter-title-input` and every newly measured `notchedOutline` class *pass* the contrast axis (measured
3.15:1 to 5.56:1) and fail only on **area**, by **16.00 px²** — the size-independent shortfall an inset uniform 2px ring has against a `2 × perimeter` threshold, which is 1.9% of the smallest such control's threshold and which an
*outset* ring of the same thickness would clear outright. Second, that 16.00 px² figure is a modelling convention, not a photograph: measured directly, MUI's `notchedOutline` fieldset is 5px taller than the control box it surrounds
and its focused top border is interrupted by the label notch, so the *painted* ring is **+4.00 px² above** the threshold for the unlabelled fields (`refine-filter-title-input`, `refine-numeric-range-input`) and **70–250 px² below** it
for the labelled ones. This packet keeps the uniform-ring convention as its primary disposition for the `notchedOutline` family, and records the measured alternative beside it — **but the reason is comparability of that family with itself, not
uniformity across the audit, and the earlier claim that the convention "was applied identically to all 35 classes" is withdrawn as inaccurate.** What is uniform across every class is the **threshold** (`2 × perimeter` of the
control box); the *changed-area* model is not, and could not be: the ripple classes are dispositioned on measured ripple diameter, `nav-listitembutton`/`recent-search-entry` on measured fill area,
`downloader-select-open-option` on measured fill area, the two link classes and the calendar picker indicator on real outline geometry, and only the `notchedOutline` family on the `2 × perimeter − 16` convention figure.
Keeping the convention primary is defensible only with the flip stated: **under the measured reading `refine-filter-title-input` and `refine-numeric-range-input` change from `meets 2.4.7, fails 2.4.11` to `meets both`**, taking
the `meets both` count from one to three. Nothing in the audit hinges on either reading for the five `fails 2.4.7` classes, whose delta is empty.

The Downloader-dropdown contradiction is resolved empirically as a **focused-vs-open distinction that is not a clean binary**: focused-but-closed shows a real, high-contrast (4.84:1 measured) teal `notchedOutline` border
(screenshotted); once opened, real DOM focus moves onto the selected `MenuItem`, and the trigger's own teal border is state-driven (tied to the `Select`'s `open`/`focused` React state, not literally to DOM focus) so it visually
persists underneath the popup while the option itself carries a second, 1.73:1 teal-tinted highlight — both indicators are simultaneously present in the open state, plausibly explaining why the same control was described both ways.
`core/ui-react` is confirmed byte-identical to `HEAD` (SHA-256 match for `theme.ts`, empty `git diff -- core/ui-react`); no remedy was implemented. `ADR REQUIRED` is reported below.

#### Control-class inventory: two independent passes, both derived mechanically

The first version of this handoff derived both passes by prose. That produced an undercount (`InputBase×2` where the census is 5; three of five `Checkbox` sites; a `Link` named and then dropped; `NumericFilter` mis-described as
rendering `aria-pressed` `Button`s when it renders `TextField`s) and a Pass 2 that did not correct it — the exact rubber-stamp failure the two-pass rule exists to prevent. Both passes are now **generated by a script and preserved as
data**, and the union is taken mechanically rather than by reading.

**Pass 1 — source sweep**, script-generated over `core/ui-react/src/**` (every `.ts`/`.tsx` except `*.test.*`; 46 files): every JSX opening tag of an interactive MUI component, every native interactive element, and every occurrence
of `tabIndex`, `aria-pressed`, `role="button"`, `component={Link}`, `component="a"`, `component="button"`, and `onClick`, each with its `file:line`. Full output: `tests/system/visual-evidence/FM-052/pass1-source-census.json`.

The census, which an independent reviewer reproduced identically: **`Button` 42, `Alert` 37, `MenuItem` 20, `TextField` 14, `InputBase` 5, `Checkbox` 5, `Dialog` 4, `Select` 3, `Menu` 3, `FormControlLabel` 3, `Link` 2, `Tooltip` 2,
`IconButton` 2, `Drawer` 2, `Tabs` 1, `Tab` 1, `Snackbar` 1, `Popover` 1, `ListItemButton` 1, `Chip` 1, `ButtonGroup` 1.** Attribute markers: `tabIndex` ×1 (`SearchWorkspace.tsx:641`, the autocomplete `<li tabIndex={-1}>`),
`aria-pressed` ×2 (`RefineSidebar.tsx:502`, `filterControls.tsx:69` — both `Button`s), `component={Link}` ×2 (`AppShell.tsx:60`, `StatsShell.tsx:23`), `component="a"` ×2 (`DownloadActions.tsx:464`, `router.tsx:132`),
`role="button"` ×0, `component="button"` ×0. The script's five native interactive-element hits (`<button>` ×3, `<input>` ×2; two `<li>` hits are non-interactive `Alert` list items and are excluded) were each opened and are **all inside comments**
(`theme.ts:72`, `RecentSearches.tsx:183`, `refineStyles.ts:29`, `SearchResults.tsx:1637`, `SearchResults.tsx:1980`): the React source contains **no** author-written native interactive element, which is why the one real `<a href>` in
the app is runtime-only (below).

The multi-site components the first pass got wrong, resolved site by site:

- **`InputBase` ×5**, in **three** distinct renderings, not one: `queryInputSx` (`:376` autocomplete variant, `:418` plain query — sx applied at `:406`/`:427`, same class), `pairedInputSx` (`:539` Season, `:563` Episode — sx at
  `:87-97`, **no border at all**), `advancedInputSx` (`:958` `AdvancedNumberField` — sx at `:99-108`, a static, non-focus-reactive 1px border).
- **`Checkbox` ×5**: `SearchResults.tsx:1470` (per-row), `:1732` (select-all, the app's only `disableRipple`), `:1994` (display-options `Popover`), `SearchWorkspace.tsx:854` (indexer selection), `SearchHistoryPage.tsx:166`
  ("Show user agents"). Pass 1 accounted for three of the five sites. Of the two it missed, only **one** is a new rendering: `SearchHistoryPage.tsx:166` passes no `size` prop at all and is the app's **only** default-padding
  `Checkbox`, measured at **42.00×42.00** with a **43.00 px** ripple. `SearchWorkspace.tsx:854` does pass `size="small"` (`SearchWorkspace.tsx:874`) and renders at **38.00×38.00**, identical to `checkbox-row-select` — it was measured
  anyway, because it belongs to a different feature record and because it is the only `Checkbox` this audit measured in its **checked** state, where `currentColor` is the primary teal rather than the unchecked grey, which changes the
  ripple's contrast figure.
- **`TextField` ×14**: `RefineSidebar.tsx:196` (`refine-filter-title-input`), `filterControls.tsx:183`/`:199` (`numericFieldSx`, **`TextField`s — not `aria-pressed` `Button`s**), `SearchWorkspace.tsx:462` (category `Select`),
  `:785` (`additional-query`), `:804` (indexers `Select`), and `SearchHistoryPage.tsx:112, 121, 130, 137, 152, 179, 188, 197` (8 filters: two `type="datetime-local"`, two `select`, four text). The eight history filters and
  `additional-query` carry **no `sx` at all** and are the app's only unmodified `notchedOutline` rendering — the baseline every override in the family should be read against.
- **`Link` ×2**: `SavedSearchesPage.tsx:204`, `SearchHistoryPage.tsx:521`. Both pass `href` and take `component="a"` by default, which is decisive — see the mechanism note in the table.
- **`Select` ×3** (`DownloadActions.tsx:367`/`:387`, `SearchResults.tsx:515`) are distinct from the two `TextField select` instances above; `Chip` ×1 (`SearchResults.tsx:1617`) carries no `onClick`/`onDelete`.

**Pass 2 — runtime sweep**, also script-generated: real `Tab` presses from `document.body`, recording `document.activeElement`'s tag, class list, `data-testid`, `aria-label`, `role`, `type`, text, `:focus-visible` and DOM index after
**every** keypress, until the walk returns to `body` or revisits a node. Full output: `pass2-runtime-sweep.json`; the mechanically-taken union of `Mui<Component>-root` groups the walk actually landed on is
`pass2-reached-classes.json`. Each state also records a DOM query for the full focusable set and an enumeration of every scrollable region (below). States walked: the six real routes (`/`, `/system/news`, `/stats`, `/stats/indexers`,
`/stats/saved-searches`, `/stats/searches`) plus the `stats/$tab` `MigrationPlaceholder` fallback (`/stats/foo`); and the transient states **Advanced panel expanded** (17 stops), **a media-type category selected** (15),
**results loaded** (91), **a `Popover` open** (`DisplayOptionsMenu`), **a `Menu` open** (results-selection caret), **an `Alert` rendered** (recorded as DOM presence — see the artifact table), **mobile 390×844** (29), **the refine `Drawer` open** at that width (40), **a saved search
with a `Link` rendered** (9), **a `Dialog` open** (`SavedSearchesPage`'s delete confirmation, reached via a saved search created through a direct `internalapi/savedsearches` POST), and **the search-history filters** with and without
the user-agent column (47 and 53).

Two things the mechanical walk found that no prose pass had:

- **A composite input is more than one Tab stop.** Each `type="datetime-local"` filter takes **seven** consecutive Tab presses while `document.activeElement` never changes: six internal segments (month/day/year/hour/minute/AM-PM),
  each with `element.matches(":focus-visible") === true`, and a **seventh** stop with `:focus-visible === false` — the UA shadow-DOM `::-webkit-calendar-picker-indicator`. It exists in no JSX file and is dispositioned in the table
  below. The first version of this walk terminated early on exactly this, mistaking the repeat for a wrap-around, which is how eight of the nine `/stats/searches` filter controls went unrecorded.
- **No scrollable region is a keyboard Tab stop in this app, at any measured state or viewport.** Every state's scrollable-region enumeration (`overflow: auto|scroll` **and** actually overflowing) is empty at 1280×720 — including the
  results-table wrapper and `StatsShell.tsx:19`'s `Tabs variant="scrollable"`, whose `MuiTabs-scroller` does not overflow at that width — and the one region that does appear, the mobile refine `Drawer`'s `MuiPaper`, carries MUI's own
  `tabindex="-1"`, so Chromium's keyboard-focusable-scroll-containers behaviour never fires. This is recorded as a checked negative, not an omission.

**Found by only one pass:**
- **Runtime-only**, exists in no JSX file: the real `<a href>` this packet's *Context To Read* named — `NewsPage`'s `SafeRichContent` renders sanitized third-party HTML via `dangerouslySetInnerHTML`. The shipped mock news fixture
  (`internalapi/news`) carries no `<a>` in its current content, so the response was intercepted (`page.route`) to inject one; `SafeRichContent`/`DOMPurify`/React rendering are all real and unmodified — only the fixture data is
  substituted, the same class of substitution `configureMockIndexers`/`configureSabnzbdMock` already make for indexers and downloaders. **It is therefore absent from `pass2-reached-classes.json`**, which was generated without that
  interception: `/system/news` walks to four stops (the nav links) and no further, because the shipped fixture's news content contains no anchor. Stated so the union check has no unexplained gap — this class's evidence is the first
  pass's `news-page-link` capture pair and its row in the table above, not the second pass's sweep.
- **Source-only, confirmed unreachable at runtime by any tested key**: the recent-search Refill `IconButton` (FM-049's finding, cited rather than re-litigated — see below).
- **Source-only, confirmed never focusable at runtime**: the autocomplete `<li role="option" tabIndex={-1}>` items (real DOM focus never lands on them; `aria-activedescendant` plus a `bgcolor` highlight is the app's own "current
  option" indicator, which is a different WAI-ARIA affordance from a WCAG 2.4.7 keyboard-focus indicator and is not dispositioned here) and the static "Downloaded" `Chip` (no `onClick`/`onDelete`, not part of the tab order).

#### Rendering-not-import class boundary, applied

Per the packet's rule, two instances of the same MUI component are different classes when either one's own styling changes what focus renders. Applied literally:

- **`OutlinedInput`/`Select` splits four ways, not three.** The search-form category `Select` (`border: "none"` notchedOutline) removes the fieldset border in every state; the Indexers `Select`/Downloader
  `Select`/`refine-filter-title-input`/`refine-numeric-range-input` recolor it to a literal `rgba(255,255,255,0.1)`; and the eight `SearchHistoryPage` filters plus `additional-query` carry **no `sx` at all** and render MUI's stock
  unfocused `rgba(255,255,255,0.23)`. The last group is a class the first pass did not have, and it is the family's own baseline: the same mechanism, a different unfocused colour, and therefore a different contrast figure (3.15–3.45:1
  un-overridden versus 4.53–5.56:1 overridden — the local override *raises* the measured contrast rather than lowering it).
- **Bare `InputBase` splits three ways, not one.** `queryInputSx` (no border, static-bordered wrapper `Box`), `pairedInputSx` (**no border at all**, and no wrapper of its own), and `advancedInputSx` (a static, non-focus-reactive 1px
  border plus a recessed background). All three fail 2.4.7 by the same mechanism, but they are three renderings, and only the first was measured before.
- **`Checkbox` splits three ways, not two.** `checkbox-select-all` (`disableRipple` plus an `sx` forcing 17×17 at `p: 0`), the `size="small"` ripple variants (`checkbox-row-select`, `display-options-checkbox`,
  `indexer-selection-checkbox` — 38.00×38.00), and the **default-padding** variant with no `size` prop at all (`SearchHistoryPage.tsx:166` — 42.00×42.00, a 43.00 px ripple where the small variant's is 38.85 px). The checked-versus-
  unchecked distinction inside the ripple family is a *state*, not a rendering, so it does not split a class — but it does change the measured number, because `currentColor` is `palette.primary.main` when checked and
  `rgb(154,162,161)` when not, and both figures are reported.
- **MUI `Link` is its own class and its own mechanism** — see the table.
- Conversely, the "Save search"/"Send selected to black hole"/"Copy selected links" buttons share the literal `downloadActionsButtonSx` object (`DownloadActions.tsx:80`, `= secondaryActionSx`) with no field touching outline or ripple,
  so they are **one class**, measured once (`bulk-action-secondary-button`, "Save search"). `numericFieldSx` (`filterControls.tsx:141-159`) and `refine-filter-title-input`'s inline `sx` (`RefineSidebar.tsx:212-226`) set the identical
  `backgroundColor`/`notchedOutline borderColor` pair and differ only in font and padding, so they are one *rendering* — but their control boxes differ (104.50×32.69 vs. 215.00×34.69), and since the 2.4.11 area threshold is a
  function of the box, both are measured and both figures are reported.

### Disposition rule (restated once, applied uniformly)

Per class: **`fails 2.4.7`** when the focused/unfocused delta is empty (or renders on a layer with `opacity: 0`, which is perceptually the same thing). **`meets 2.4.7, fails 2.4.11`** when a delta exists but the changed area is smaller
than the perimeter of a 2px-thick line around the control, **or** the contrast ratio between the changed area's focused and unfocused composited colors is below 3:1. **`meets both`** otherwise. Composited colors were read as the
literal computed CSS values (`getComputedStyle`), alpha-composited by hand against the correct ancestor background where translucent (`background.paper` `#262c2e`/`rgb(38,44,46)` for `AppBar`/`Menu`/`Popover` surfaces, confirmed live;
the page body `background.default` `#1f2426`/`rgb(31,36,38)` for the bare `news-page-link` anchor), and `oklch()` literals were resolved to sRGB by rendering them to a real `<canvas>` pixel (`ctx.fillStyle` + `getImageData`) rather than
trusted as authored, since Chromium's `getComputedStyle` does not always convert `oklch()` back to `rgb()`. Relative luminance and contrast use the standard WCAG formulas.

For the ten classes measured in the second, mechanical pass the backdrop is no longer chosen by hand: the harness walks the indicator's own ancestor chain, compositing each translucent `background-color` until it reaches an opaque
one, and uses the result. That correction matters. Re-running the same walk against two classes the first pass had already dispositioned shows their translucent unfocused `notchedOutline` does **not** sit on `background.paper`:
`search-indexers-select`'s ring composites over `rgb(42,49,51)` (contrast **4.53:1**, not the 4.84:1 first reported) and `refine-filter-title-input`'s over `rgb(28,34,36)` — the field's own `inputBackground` surface — giving
**5.56:1**, not 4.84:1. Both figures are *higher* than 3:1 either way, so **no disposition changes**; the corrected numbers are recorded because the escalation below quotes them. The evidence is
`notchedoutline-geometry-probe.json`, which reads geometry and backdrop only and captures nothing.

**Area, stated twice on purpose.** The threshold is the packet's: `2 × perimeter` of the control box. The changed area is reported first under the **uniform-ring convention** the first pass applied to all its classes — a 2px ring
inset in the control box, area `2 × perimeter − 16`, hence the size-independent 16.00 px² shortfall — and second as the **measured** figure, from the `notchedOutline` fieldset's own bounding box (uniformly 5.00 px taller than the
control box: MUI positions it at `top: -5px`) minus the focused label notch (`2px × legend width`, measured per class). The two disagree by at most 250 px² and, for the two unlabelled fields, disagree in *sign*. Every disposition of a `notchedOutline` class below uses the convention figure, so that family is comparable with itself at every control size; the measured figure is stated beside it so the owner can see how much of the
"fails on area" verdict is modelling rather than pixels. **The convention applies to that family only** — no other class in this audit is dispositioned on it (see the withdrawal in the Outcome above) — and under the measured
reading the two unlabelled fields in the family, `refine-filter-title-input` and `refine-numeric-range-input`, flip to `meets both`.

### The master disposition table

**Fully measured** (keyboard-reached from a known start, focused/unfocused subtree-diffed, `:focus-visible` recorded; screenshot pair unless noted):

| Class | Route / state | Mechanism (verified against MUI 7.3.9 source) | Delta | Area vs. 2px-perimeter threshold | Contrast | Disposition |
|---|---|---|---|---|---|---|
| `search-query-input` | `/` | Bare `InputBase` (query field; the media-type/autocomplete `InputBase` variant at `SearchWorkspace.tsx:375-415` shares this exact sx/wrapper and is the same class). `.MuiInputBase-input:focus{outline:0}` (specificity 0,2,0) beats theme.ts's `:focus-visible{outline:3px...}` (0,1,0) regardless of insertion order. Static-bordered wrapper `Box` does not react to focus. | `outline-style: none` in **both** states (only `outline-offset` changes, 0→3px, invisible since style is none). | n/a — no visible change | n/a | **fails 2.4.7** |
| `advanced-range-input` | `/`, Advanced expanded | Identical bare-`InputBase` **mechanism** to `search-query-input` — the same `.MuiInputBase-input:focus{outline:0}` defeat — but a **different rendering**, and therefore its own class under this packet's rendering-not-import rule: `advancedInputSx` (`SearchWorkspace.tsx:99-108`) carries a recessed background and a static 1px border that `queryInputSx` does not, and neither reacts to focus. (The word "rendering" in this cell previously said the opposite of the class-boundary section below, of `FEATURES.yaml`'s `F-SEARCH-FORM` rationale, and of the class total, all three of which count this row separately; corrected here, and the `fails 2.4.7` count is **five**, not four.) | Raw whole-subtree walk preserved by the third correction pass (`fix3-measured-classes.json`, reached at Tab **9** from `document.body`, `:focus-visible` **true**), rooted at the `MuiInputBase-root` wrapper so `advancedInputSx`'s own border and background are inside the recorded subtree. Across the whole subtree the **only** difference between the two states is the inner `<input>`'s `outline-width` `3px → 0px` and `outline-offset` `0px → 3px`, with **`outline-style: none` in both**. The wrapper's `1px` `rgba(255,255,255,0.1)` border, its `rgb(28,34,36)` recessed background and every other recorded property are identical; no ripple mounts and `getAnimations` is empty in both states | n/a | n/a | **fails 2.4.7** |
| `search-category-select` | `/` | `Select` trigger (`role=combobox` div carrying the shared `MuiInputBase-input` class — confirmed live via computed classList, correcting an initial source-only reading of `SelectInput.js` alone that wrongly assumed this trigger's outline was undefeated). Same `.MuiInputBase-input:focus{outline:0}` defeat as the query field, **plus** `& .MuiOutlinedInput-notchedOutline{border:"none"}` (`SearchWorkspace.tsx:480-482`) forces `notchedOutline` `border-width: 0px` in both states regardless of the `borderColor` that does change (`rgb(214,218,217)`→`oklch` teal) underneath it. | `notchedOutline` `border-width` stays `0px` both states (color changes, invisibly) | n/a — 0-width border never paints | n/a | **fails 2.4.7** |
| `checkbox-select-all` | `/`, results loaded | `Checkbox` (`SwitchBase`/`ButtonBase`) with the app's **only** `disableRipple` prop (`SearchResults.tsx:1735`). Root `outline:0` unconditional; no ripple mounts; none of `Checkbox`/`SwitchBase`/`IconButton` define an `&.Mui-focusVisible` rule (confirmed by source grep — zero matches). The one property that *does* change (native `<input>`'s own `outline-style: none→solid`, global rule winning uncontested here since nothing on this element resets it) paints on `opacity: 0` — the input is a fully transparent overlay over the real, visible icon sibling, which itself shows **no** delta. That sibling is **not an `<svg>`**: this `Checkbox` passes its own `icon`/`checkedIcon`/`indeterminateIcon` (`SearchResults.tsx:1652-1690`), each of which renders a `<Box>` — so the recorded snapshot subtree is exactly `span:nth(1)`, `span:nth(1) > input:nth(1)`, `span:nth(1) > div:nth(2)`, with no `svg` node anywhere in it. | Real CSS delta on an `opacity: 0` layer; every visible sibling (icon, wrapper) unchanged | n/a — invisible | n/a | **fails 2.4.7** (perceptually empty) |
| `nav-listitembutton` | every route | `ListItemButton` (`ButtonBase`, `component={Link}`). Root `outline:0` unconditional defeats the global rule; no `focusRipple` prop passed (`ButtonBase` default `false` applies) so no ripple; `&.Mui-focusVisible{background-color: palette.action.focus}` (`rgba(255,255,255,0.12)`) is the only reactive rule. | `background-color: transparent → rgba(255,255,255,0.12)` | fill 3612.00 px² ≥ threshold 508.00 px² — **passes** | composited `rgb(38,44,46)` vs `rgb(64.04,69.32,71.08)` = **1.46:1** — fails | **meets 2.4.7, fails 2.4.11** (contrast) |
| `recent-search-entry` | `/`, Recent Searches menu open | `MenuItem` (`ButtonBase`). Same outline-defeat/no-ripple-by-default reasoning as `nav-listitembutton`; `&.Mui-focusVisible{background-color: palette.action.focus}` identical rule/value. Complements FM-049 (which established keyboard/AT reachability for this row) with the WCAG computed-style disposition FM-049's scope did not need. | `background-color: transparent → rgba(255,255,255,0.12)` | fill 18790.70 px² ≥ threshold 2080.28 px² — passes | **1.46:1** (identical composite) — fails | **meets 2.4.7, fails 2.4.11** (contrast) |
| `search-indexers-select` | `/` | `Select` trigger, same `.MuiInputBase-input:focus{outline:0}` defeat as category. Local sx overrides `notchedOutline` `borderColor` to a literal color (not `none`), so `OutlinedInput`'s own `&.Mui-focused .notchedOutline{borderWidth:2}` still applies, and its focused-color variant rule (`&.Mui-focused .notchedOutline{borderColor: primary.main}`) **wins** the specificity/order fight against the local unconditional override — measured directly. | `notchedOutline`: `rgba(255,255,255,0.1)`/1px → `oklch` teal (`rgb(85,194,188)` resolved)/2px | ring (focused, 2px) 4785.64 px² **<** threshold 4801.64 px² — **fails by exactly 16.00 px²** | composited `rgb(63.3,69.6,71.4)` vs `rgb(85,194,188)` = **4.53:1** — passes. (The 4.84:1 this row carried was composited against a hand-chosen `background.paper`; `notchedoutline-geometry-probe.json` measures this ring's own backdrop as `rgb(42,49,51)`. The *Disposition rule* section, the Outcome and the `ADR REQUIRED` section all already carried 4.53:1; this row did not.) | **meets 2.4.7, fails 2.4.11** (area) |
| `downloader-select` | `/`, results loaded, CLOSED | Identical mechanism/override pattern to `search-indexers-select` (`downloadActionsSelectSx`). **This is the Downloader dropdown, focused-but-not-opened** — see contradiction resolution below. | Same `notchedOutline` delta pattern, box 180×35.69 | ring (2px) 846.76 px² **<** threshold 862.76 px² — **fails by 16.00 px²** | **4.84:1** (identical colors) — passes | **meets 2.4.7, fails 2.4.11** (area) |
| `downloader-select-open-option` | `/`, results loaded, OPEN | Real DOM focus moves OFF the trigger entirely onto the open listbox's `<li role="option" class="MuiMenuItem-root Mui-selected Mui-focusVisible">` (confirmed live). Because the currently-chosen downloader is also `Mui-selected`, `MenuItem.js`'s compound rule applies: `&.Mui-selected .Mui-focusVisible{background-color: alpha(primary.main, selectedOpacity+focusOpacity)}` — a teal-tinted overlay, not the plain `action.focus` overlay a non-selected option gets. **This is the Downloader dropdown, OPEN** — see contradiction resolution below. | `background-color: transparent → oklch(0.75 0.1 190 / 0.28)` | fill 6424.20 px² ≥ threshold 862.76 px² — passes | composited `rgb(38,44,46)` vs `rgb(51,85,85)` = **1.73:1** — fails | **meets 2.4.7, fails 2.4.11** (contrast) |
| `refine-filter-title-input` | `/`, results loaded | `TextField`/`OutlinedInput`; same `notchedOutline` color-override family/mechanism as `search-indexers-select`/`downloader-select`, applied to a `TextField` instead of a `Select`. | Same pattern, box 215×34.6875 | control 215.00×34.69, fieldset 215.00×39.69, no label ⇒ notch 0.00px. Convention ring (2px) 982.75 px² **<** threshold 998.75 px² — **fails by 16.00 px²**. Measured ring **1002.75 px²** — **passes** by 4.00 (this is one of the two classes that flip to `meets both` under the measured reading; the row previously omitted the measured figure the Outcome and the `ADR REQUIRED` section both quote) | composited `rgb(50.7,56.1,57.9)` over the field's own `inputBackground` surface `rgb(28,34,36)` vs `rgb(85,194,188)` = **5.56:1** — passes. (The 4.84:1 this row carried used a hand-chosen `background.paper` backdrop; the *Disposition rule* section, the Outcome and the `ADR REQUIRED` section all already carried 5.56:1.) | **meets 2.4.7, fails 2.4.11** (area, under the convention figure; see the two-figure note above) |
| `refine-toggle-chip` | `/`, results loaded | Plain `Button aria-pressed` (**not** MUI `Chip` — see class-boundary note above), `ButtonBase`-derived, `focusRipple` defaults `true` (unset). Same ripple mechanism as below. | Pulsating `TouchRipple` mounts (`animation-1taevns`/`animation-f6tr5a`, 200ms/2500ms — matches `TouchRipple.js` exactly) | ripple Ø 49.19 ⇒ circle 1900.51 px², clipped by `TouchRipple-root`'s `overflow: hidden` to the 57.00×27.59 control box ⇒ **1572.84 px²** ≥ threshold **338.38 px²** — passes | ripple `currentColor` = `chipInactiveColor` `rgb(170,176,175)` (unpressed) at opacity 0.30 over `rgb(36,43,45)` = **1.83:1**; pressed it is `chipActiveColor` canvas-resolved `rgb(110,217,210)` over `rgb(40.02,61.21,61.89)` = **1.94:1** — both fail. (**Not** the teal 1.83:1 this row first asserted by family analogy; measured directly in this correction pass.) | **meets 2.4.7, fails 2.4.11** (contrast) |
| `search-submit` | `/` | `Button` (`ButtonBase`, `variant="contained"`). Root `outline:0` unconditional. `Button.js` passes `focusRipple: !disableFocusRipple` (unset ⇒ `true`) — a pulsating `TouchRipple` is the real indicator. **Also the mouse-click negative control's sibling scenario** (`search-advanced-toggle`, below) since clicking this button itself issues a real search and steals focus into the resulting Dialog, contaminating a same-element click comparison. | Ripple mounts, confirmed via `getAnimations` (200ms/2500ms) | ripple Ø 74.77 ⇒ circle 4390.96 px², clipped to the 86.00×44.50 control box ⇒ **3827.00 px²** ≥ threshold **522.00 px²** — passes | ripple color = button's own `contrastText` (`rgb(14,28,27)`) at `rippleVisible` opacity 0.3 over the `contained` teal bg (canvas-resolved `rgb(85,194,188)`) = **1.76:1** — fails (re-measured, unchanged) | **meets 2.4.7, fails 2.4.11** (contrast) |
| `search-advanced-toggle` | `/` | `Button` (`variant="text"`). Same `ButtonBase` mechanism as `search-submit`. **Mouse-click negative control**: reached by `Tab` (`:focus-visible` **true**) vs. reached by `.click()` on the same element (`:focus-visible` **false**, `activeElement` unchanged) — the harness demonstrably distinguishes keyboard from pointer focus. | Ripple mounts | ripple Ø 100.18 ⇒ circle 7882.83 px², clipped to the 118.00×47.56 control box ⇒ **5612.38 px²** ≥ threshold **662.25 px²** — passes | **two states, not one.** `SearchWorkspace.tsx:683` sets `color: advancedOpen ? "primary.main" : "text.primary"`, and the walk carries two emotion classes for it (`css-r0tmfe` collapsed, `css-1rypbpq` expanded). **Collapsed**: `currentColor` measured **`rgb(214,218,217)`** (`text.primary`, not teal — the search-row `sx` sets it) at 0.3 over `rgb(42,49,51)` = **2.19:1**. **Expanded**: `currentColor` measured `oklch(0.75 0.1 190)` ⇒ `rgb(85,194,188)` at 0.3 over the same `rgb(42,49,51)` = **1.81:1**. Both fail; the expanded figure was unreported. (The collapsed figure was corrected from an assumed teal 1.83:1 in the second correction pass.) | **meets 2.4.7, fails 2.4.11** (contrast) |
| `indexer-selection-preset-button` | `/` | `Button` (`variant="outlined"`, grouped `MuiButtonGroup`). Same `ButtonBase` ripple mechanism. The group's own `sx` sets `"& .MuiButton-root": {color: "text.primary", backgroundColor: controlSurface}` (`SearchWorkspace.tsx:1045-1061`), so `currentColor` here is **not** the theme's primary teal. | Ripple mounts | ripple Ø 112.39 ⇒ circle 9920.10 px², clipped to the 138.00×32.00 control box ⇒ **4416.00 px²** ≥ threshold **680.00 px²** — passes | ripple `currentColor` measured **`rgb(214,218,217)`** at 0.3 over `controlSurface` `rgb(42,49,51)` = **2.19:1** — fails. (Corrected from an assumed teal 1.83:1.) | **meets 2.4.7, fails 2.4.11** (contrast) |
| `recent-searches-trigger` | `/` | `Button` (`variant="outlined"`). Same `ButtonBase` ripple mechanism. **Deterministic pulsate-scale stills**: `Animation.currentTime` set directly on the `childPulsate` animation (never by sleeping) — `currentTime=0` resolves `transform: none` (scale 1, the 0%/100% keyframe) and `currentTime=1250` (of the 2500ms loop) resolves `transform: matrix(0.921,0,0,0.921,0,0)` (the 50% keyframe, `scale(0.92)`), exactly matching `pulsateKeyframe`'s three stops verified against `TouchRipple.js`. | Ripple mounts | ripple Ø 112.82 ⇒ circle 9996.09 px², clipped to the 138.00×36.50 control box ⇒ **5037.00 px²** ≥ threshold **698.00 px²** — passes | ripple `currentColor` measured `rgb(85,194,188)` (teal) at 0.3 over `background.paper` `rgb(38,44,46)` = **1.83:1** — fails (re-measured, unchanged) | **meets 2.4.7, fails 2.4.11** (contrast) |
| `checkbox-row-select` | `/`, results loaded | `Checkbox` (`SwitchBase`/`ButtonBase`), **no** `disableRipple` (unlike `checkbox-select-all`) — `SwitchBase` passes `focusRipple: !disableFocusRipple` (unset ⇒ `true`). | Ripple mounts (confirmed via `getAnimations`; a residual mouse-click ripple from the setup's `.check()` is also visible in the raw data, disclosed under *Assumptions* rather than mistaken for the keyboard indicator) | ripple Ø 39.00 (`TouchRipple.js`'s `sqrt((2w²+h²)/3)` on the 38.00×38.00 root, plus its `if (rippleSize % 2 === 0) rippleSize += 1` step) ⇒ **1194.59 px²** ≥ threshold **304.00 px²** — passes | ripple `currentColor` measured `rgb(154,162,161)` **unchecked** at 0.3 over `rgb(31,36,38)` = **1.73:1**, and `rgb(85,194,188)` (teal) **checked** = **1.86:1** — both fail. (The row previously gave only a teal 1.83:1; the checked figure is 1.86:1 against this control's own measured ground, and the unchecked figure was missing.) | **meets 2.4.7, fails 2.4.11** (contrast) |
| `bulk-action-secondary-button` ("Save search"; same class as "Send selected to black hole"/"Copy selected links" — identical `downloadActionsButtonSx`) | `/`, results loaded | `Button` (`variant="outlined"`, `downloadActionsButtonSx` = `secondaryActionSx`, whose `enabledSecondaryTextColor` `#c9cfce` is the `currentColor`). Same `ButtonBase` ripple mechanism. | Ripple mounts | ripple Ø 81.51 ⇒ circle 5218.59 px², clipped to the 98.00×40.75 control box ⇒ **3993.50 px²** ≥ threshold **555.00 px²** — passes | ripple `currentColor` measured **`rgb(201,207,206)`** at 0.3 over `controlSurface` `rgb(42,49,51)` = **2.08:1** — fails. (Corrected from an assumed teal 1.83:1.) | **meets 2.4.7, fails 2.4.11** (contrast) |
| `sort-header-button` | `/`, results loaded | `Button` (`size="small"`, sx only touches color/typography). Same `ButtonBase` ripple mechanism. | Ripple mounts (visible in the capture as a rounded translucent disc behind "TITLE") | ripple Ø 39.59 ⇒ circle 1231.26 px², clipped to the 44.50×27.25 control box ⇒ **1212.62 px²** ≥ threshold **287.00 px²** — passes | ripple `currentColor` measured **`rgb(124,132,131)`** (`HEADER_LABEL_COLOR` `#7c8483`, set by this button's own `sx` — not teal) at 0.3 over `rgb(31,36,38)` = **1.51:1** — fails. (Corrected from an assumed teal 1.83:1; this was reported as the second-lowest ripple figure in the app, and with the `color="error"` Delete rendering (1.19:1/1.22:1) and the three 1.40:1 `sectionLabelColor` toggles below it, it is the **fourth**-lowest distinct figure.) | **meets 2.4.7, fails 2.4.11** (contrast) |
| `stats-tab` | `/stats/indexers` | `Tab` (`ButtonBase`). `Tab.js` passes `focusRipple: !disableFocusRipple` (unset ⇒ `true`) — same ripple mechanism. `Mui-selected` is a separate, always-on, non-focus indicator. | Ripple mounts | ripple Ø 133.55 ⇒ circle 14007.31 px², clipped to the 160.00×48.00 control box ⇒ **7680.00 px²** ≥ threshold **832.00 px²** — passes | ripple `currentColor` measured `rgb(85,194,188)` (teal) at 0.3 over `background.default` `rgb(31,36,38)` = **1.86:1** — fails. (Corrected from 1.83:1, which used `background.paper` as the ground.) | **meets 2.4.7, fails 2.4.11** (contrast) |
| `mobile-nav-hamburger-iconbutton` | `/`, mobile 390×844 | `IconButton` (`ButtonBase`). `IconButton.js` passes `focusRipple: !disableFocusRipple` — same ripple mechanism. Visible only below the `md` breakpoint. | Ripple mounts | ripple Ø 67.09 ⇒ circle 3534.88 px², clipped to the 76.05×44.00 control box ⇒ **3346.06 px²** ≥ threshold **480.19 px²** — passes | ripple `currentColor` measured **`rgb(214,218,217)`** (`text.primary`, not teal) at 0.3 over `background.paper` `rgb(38,44,46)` = **2.22:1** — fails. (Corrected from an assumed teal 1.83:1.) | **meets 2.4.7, fails 2.4.11** (contrast) |
| `display-options-checkbox` | `/`, results loaded, Popover open | `Checkbox`, no `disableRipple` — same rendering/mechanism as `checkbox-row-select`, on a smaller (18.00×18.00) box. | Ripple mounts | ripple Ø 19.00 ⇒ **283.53 px²** ≥ threshold **144.00 px²** — passes | ripple `currentColor` measured `rgb(154,162,161)` (unchecked) at 0.3 over the `Popover`'s `controlSurface` `rgb(42,49,51)` = **1.68:1** — fails. (Corrected from an assumed teal 1.83:1.) | **meets 2.4.7, fails 2.4.11** (contrast) |
| `dialog-action-button` ("Cancel") | `/stats/saved-searches`, Dialog open | `Button` (plain, no `sx`, default `color="primary"`). Same `ButtonBase` ripple mechanism. | Ripple mounts | control box **64.00×36.50**, measured live by the third correction pass (it was the one ripple class whose box no earlier pass had re-probed, and no area figure was asserted for it until now); ripple Ø 56.34 ⇒ circle 2493.34 px², clipped to the control box ⇒ **2336.00 px²** ≥ threshold **402.00 px²** — passes | ripple `currentColor` `rgb(85,194,188)` (teal) at 0.3 over the `Dialog` `Paper`'s `background.paper` `rgb(38,44,46)` = **1.83:1** — fails. **Was source-derived; now read live.** The second correction pass did not reconstruct the saved-search `Dialog` fixture, so this class's `currentColor` was inferred from the call site carrying no `sx` and no `color` prop (`SavedSearchesPage.tsx:163-168`). The third correction pass rebuilt that fixture and read it live: `oklch(0.75 0.1 190)` ⇒ `rgb(85,194,188)` over the `Paper`'s `rgb(38,44,46)`, **1.83:1** — the inferred value, confirmed (`fix3-derived-figures.json`). | **meets 2.4.7, fails 2.4.11** (contrast) |
| `refine-sidebar-drawer-close-button` | `/`, mobile 390×844, Drawer open | `Button` (plain, `sx` touches only `minWidth`/`px`). Same `ButtonBase` ripple mechanism. | Ripple mounts | ripple Ø 25.84 ⇒ **524.41 px²** ≥ threshold **215.00 px²** — passes | ripple `currentColor` measured `rgb(85,194,188)` (teal) at 0.3 over the `Drawer` `Paper`'s `rgb(38,44,46)` = **1.83:1** — fails (re-probed, unchanged) | **meets 2.4.7, fails 2.4.11** (contrast) |
| `migration-placeholder-switch-button` | `/stats/foo` | `Button` (`variant="contained"`, `component="a"`). Same `ButtonBase` ripple mechanism as `search-submit` (contained/teal-bg ripple-color family). | Ripple mounts | ripple Ø 1006.14 ⇒ circle 795079.57 px², clipped to the 1232.00×36.50 control box ⇒ **44968.00 px²** ≥ threshold **5074.00 px²** — passes | ripple color = the button's own `contrastText` `rgb(14,28,27)` at 0.3 over its `contained` teal bg `rgb(85,194,188)` = **1.76:1** — fails (re-measured, unchanged) | **meets 2.4.7, fails 2.4.11** (contrast) |
| `news-page-link` | `/system/news` | Plain native `<a href>` from `SafeRichContent`'s sanitized HTML — **not** a MUI `Link`. Nothing resets `outline` for this bare, unclassed anchor (no `ButtonBase`/`InputBase`/`Link.js` class present), so theme.ts's global `:focus-visible{outline:3px solid currentColor; outline-offset:3px}` renders **undefeated**. | `outline-style: none → solid`, `outline-width: 3px` (both states — width is a UA-default even when `style:none`, only style/offset change), `outline-offset: 0→3px`, `opacity: 1` throughout (not hidden) | ring (offset 3, width 3) 990.00 px² ≥ threshold 588.00 px² — passes | the outline's own composited backdrop, **sampled from the capture pair itself** rather than assumed: the focused/unfocused difference mask is 3485 opaque device pixels, and under it the unfocused ground is `srgb(49,55,57)` (2514 px) and `srgb(49,54,56)` (971 px) — **not** the `background.default` `rgb(31,36,38)` this row first asserted. Against the majority ground, link-blue `rgb(0,0,238)` (both the anchor's own default UA colour and the outline's `currentColor`) = **1.29:1**; against the secondary ground **1.30:1** — fails. (The withdrawn 1.67:1 figure was this same pair of colours composited against `rgb(31,36,38)`, a hand-chosen backdrop. This is the same correction already applied to `search-indexers-select` and `refine-filter-title-input`.) | **meets 2.4.7, fails 2.4.11** (contrast) |

**Added by the second, mechanical pass** — the ten classes the first inventory omitted. Same method throughout: reached by real `Tab` presses from `document.body` (the ordinal is stated; **seven of the ten match Pass 2's independent walk, one does not, and two are not cross-checkable at all** — see *Assumptions*, where each is named), whole-subtree computed-style diff, `deviceScaleFactor: 2` capture pair on the control box expanded 12px on every side with identical width/height. Raw per-class walks: `delta-omitted-classes.json`; derived figures: `computed-figures.json`.

| Class | Route / state | Mechanism (verified against MUI 7.3.9 source) | Delta | Area vs. 2px-perimeter threshold | Contrast | Disposition |
|---|---|---|---|---|---|---|
| `stats-identifier-link` | `/stats/saved-searches` (identical class at `/stats/searches`); reached at Tab **6** | **MUI `Link`** (`SavedSearchesPage.tsx:204`, `SearchHistoryPage.tsx:521`). `Link.js` puts **both** its `outline: 0` reset **and** its `` `&.${linkClasses.focusVisible}`: {outline: 'auto'} `` rule inside a single `variants` entry keyed `props: {component: 'button'}`. Both call sites pass `href` and take the default `component = 'a'`, so **neither rule applies**, and `theme.ts` declares no `MuiLink` override (`grep MuiLink core/ui-react/src/app/theme.ts` — zero matches). theme.ts's global `:focus-visible` outline therefore renders **undefeated**, and `currentColor` here is `Link`'s default `color = 'primary'` ⇒ `palette.primary.main`. This is a **seventh** mechanism (the audit's mechanism list is numbered in the `ADR REQUIRED` section below), and the only one in the app that satisfies both criteria. | `outline-style: none → solid`; `outline-width: 3px` and `outline-color: oklch(0.75 0.1 190)` in both states; `outline-offset: 0px → 3px`; `opacity: 1` throughout | control box 116.00×18.00; ring (offset 3, width 3) **912.00 px²** ≥ threshold **536.00 px²** — **passes**, by 376.00 px² | composited page bg `rgb(31,36,38)` vs. canvas-resolved teal `rgb(85,194,188)` = **7.34:1** — **passes** | ***meets both*** |
| `stats-history-text-input` | `/stats/searches`; Tab **20** | Default, un-overridden `TextField`/`OutlinedInput` (`SearchHistoryPage.tsx:130`, no `sx`). `OutlinedInput`'s own `&.Mui-focused .notchedOutline{borderWidth:2}` plus its primary-colour variant rule, with nothing local to fight. The `.MuiInputBase-input:focus{outline:0}` defeat still applies to the inner `<input>` (`outline-width: 3px → 0px`), so the fieldset is the entire indicator. | `notchedOutline` `rgba(255,255,255,0.23)`/1px → `oklch(0.75 0.1 190)` (`rgb(85,194,188)`)/2px; label colour → primary | control 218.00×56.00, fieldset 218.00×61.00, focused notch 43.00px. Convention ring **1080.00** < threshold **1096.00** — fails by 16.00. Measured ring **1014.00** — fails by 82.00 | composited unfocused ring `rgb(82.52,86.37,87.91)` vs. `rgb(85,194,188)` = **3.45:1** — passes | **meets 2.4.7, fails 2.4.11** (area) |
| `stats-history-select` | `/stats/searches`; Tab **22** | Same as above, on a `TextField select` (`SearchHistoryPage.tsx:152` "Source"; `:137` "Category" is the same class). Focus lands on the `role="combobox"` `div`, which carries `MuiInputBase-input`. | Same `notchedOutline` delta | control 125.00×56.00, fieldset 125.00×61.00, notch 48.00px. Convention **708.00** < threshold **724.00** — fails by 16.00. Measured **632.00** — fails by 92.00 | **3.45:1** — passes | **meets 2.4.7, fails 2.4.11** (area) |
| `stats-history-datetime-input` | `/stats/searches`; Tab **6** (first internal segment) | Same as above, on `type="datetime-local"` (`SearchHistoryPage.tsx:112`/`:121`). Six of its seven Tab stops are internal segments of one `<input>`; all six report `:focus-visible === true` and all six render the same single fieldset indicator. | Same `notchedOutline` delta | control 270.00×56.00, fieldset 270.00×61.00, notch 37.00px. Convention **1288.00** < threshold **1304.00** — fails by 16.00. Measured **1234.00** — fails by 70.00 | **3.45:1** — passes | **meets 2.4.7, fails 2.4.11** (area) |
| `stats-history-datetime-picker-indicator` | `/stats/searches`; Tab **12** (six presses past the segment above) | **UA shadow-DOM `::-webkit-calendar-picker-indicator`** — a Tab stop that exists in no JSX file, the same category of runtime-only control as `news-page-link`. `document.activeElement` stays the host `<input>`, and `element.matches(":focus-visible")` on it is **`false`** at this stop while it is `true` at every one of the six segment stops. Its indicator is **Chromium's own UA focus ring**, which no repository file authors and no MUI rule defeats — a *seventh* mechanism, and the only one in this audit whose evidence of record is the capture pair rather than a computed-style delta, for the reason given two columns right. | Against the unfocused state: the host field's `notchedOutline` is teal/2px (React `Mui-focused` state persists). Against the *previous* Tab stop, `getComputedStyle` reports only the host `<input>`'s `outline-width` (`0px → 3px`, `outline-style: none` in both) — but that instrument cannot see this sub-control at all (next column), and **the captures show it plainly paints**: a **2.00 px-thick ring** in Chromium's own `outline-color: auto` light-scheme value `srgb(16,16,16)` appears around the calendar glyph in `-focused.png` and in **neither** `-unfocused.png` **nor** `stats-history-datetime-input-focused.png` (the host field focused on its first segment — same fieldset, same geometry, same crop). Exactly **576 device pixels** at `deviceScaleFactor: 2` change from `srgb(31,36,38)` to `srgb(16,16,16)`; every other pixel of the glyph region — the glyph strokes and their antialiasing — is byte-identical across all three captures | ring outer box **20.00×20.00** CSS px, inner **16.00×16.00**, painted area **144.00 px²** (576 device px² ÷ 4). Read as a 2px outline drawn *outside* a 16.00×16.00 sub-control — which is what Chromium's UA focus ring is — the threshold is **128.00 px²** and it **passes** by 16.00. Read instead as a 2px ring *inset* in the 20.00×20.00 outer box, the threshold is 160.00 px² and it fails by 16.00. Both are stated because the sub-control's own border box is not readable; no disposition turns on which is taken | ring `srgb(16,16,16)` against the field's ground `srgb(31,36,38)` = **1.21:1** — fails. **What is not computable here is `getComputedStyle`, not the audit**: `getComputedStyle(input, "::-webkit-calendar-picker-indicator")` returns the *host* input's own styles (width `242px`, `color rgb(214,218,217)`, `outline-style: none`), confirmed live — the UA shadow sub-control is invisible to the CSSOM. The pixels are not, and this packet captured them at 2× | **meets 2.4.7, fails 2.4.11** (contrast) |
| `stats-history-checkbox` | `/stats/searches`; Tab **23** | Default-padding `Checkbox` (`SearchHistoryPage.tsx:166`, no `sx`, no `size`, no `disableRipple`) — a 42.00×42.00 hit area, larger than either previously measured `Checkbox` variant. `SwitchBase` passes `focusRipple: !disableFocusRipple` (unset ⇒ `true`). | Pulsating `TouchRipple` mounts (`animation-f6tr5a`, 2500ms, delay 200ms, infinite — matches `pulsateKeyframe`); the native `<input>`'s own `outline-style: none → solid` again paints on the `opacity: 0` overlay and is disregarded | ripple child Ø 43.00 ⇒ **1452.20 px²** ≥ threshold **336.00 px²** — passes | ripple `currentColor` `rgb(154,162,161)` (unchecked; **not** the teal the checked variants render) at `rippleVisible` opacity 0.30 over `rgb(31,36,38)` ⇒ composited `rgb(67.9,73.8,74.9)` = **1.73:1** — fails | **meets 2.4.7, fails 2.4.11** (contrast) |
| `indexer-selection-checkbox` | `/`, `indexerSelectionAsCheckboxes`; Tab **9** — **not cross-checkable**: Pass 2 walked no state with `main.indexerSelectionAsCheckboxes = true` | `size="small"` `Checkbox` (`SearchWorkspace.tsx:854`), 38.00×38.00 — the **same rendering** as `checkbox-row-select`, not a new one. Measured because Pass 1 omitted the site, because a different feature record owns it, and because it is the only `Checkbox` measured in its **checked** state, where `currentColor` is `palette.primary.main` instead of the unchecked `rgb(154,162,161)`. | Ripple mounts (`animation-1taevns` 200ms enter + `animation-f6tr5a` 2500ms pulsate) | ripple child Ø 38.85 ⇒ **1185.46 px²** ≥ threshold **304.00 px²** — passes | ripple `oklch(0.75 0.1 190)` ⇒ `rgb(85,194,188)` at opacity 0.30 over `rgb(38,44,46)` ⇒ composited `rgb(52.06,88.89,88.49)` = **1.83:1** — fails | **meets 2.4.7, fails 2.4.11** (contrast) |
| `season-episode-paired-input` | `/`, category TV; Tab **6** | **`pairedInputSx` bare `InputBase`** (`SearchWorkspace.tsx:539` Season, `:563` Episode; sx at `:87-97`). Same `.MuiInputBase-input:focus{outline:0}` (specificity 0,2,0) defeat as `search-query-input`, but a **third** rendering: unlike `advancedInputSx` (`:99-108`) it declares no border of any kind and has no wrapper of its own, so there is nothing at all that could react to focus. | Whole-subtree delta is `outline-width: 3px → 0px` and `outline-offset: 0px → 3px` on the `<input>`, with **`outline-style: none` in both states**. No border, no `notchedOutline`, no ripple, no background change, no animation | n/a — no visible change | n/a | ***fails 2.4.7*** |
| `refine-numeric-range-input` | `/`, results loaded; Tab **44** as reached by this harness — **not** corroborated by Pass 2, which puts this element at Tab 42 in `transient:results-loaded` and Tab 26 in `transient:mobile-refine-drawer-open`; the second correction pass re-reached it at **42** in a three-indexer results view. See *Assumptions* | `numericFieldSx` `TextField` (`filterControls.tsx:183`/`:199`, `NumericFilter` — **`TextField`s, not the `aria-pressed` `Button`s** the first inventory described this file as containing). Same `notchedOutline` recolour family as `refine-filter-title-input`, on a smaller box. | `notchedOutline` `rgba(255,255,255,0.1)`/1px → teal/2px | control 104.50×32.69, fieldset 104.50×37.69, no label ⇒ notch 0.00px. Convention **532.75** < threshold **548.75** — fails by 16.00. Measured **552.75** — **passes** by 4.00 | composited unfocused ring `rgb(50.7,56.1,57.9)` over the field's own `inputBackground` surface `rgb(28,34,36)` vs. `rgb(85,194,188)` = **5.56:1** — passes | **meets 2.4.7, fails 2.4.11** (area, under the convention figure; see the two-figure note above) |
| `additional-query-input` | `/`, media type selected and an autocomplete suggestion chosen; Tab **11** — **not cross-checkable**: the field is `disabled` until a suggestion is chosen, and Pass 2 walked no such state | Default, un-overridden `TextField` (`SearchWorkspace.tsx:785`). `F-SEARCH-MEDIA` owns this selector. It is `disabled={!selected}`, so it is **only** a Tab stop once a suggestion has been chosen — which is why the plain "category selected" walk does not contain it. | Same `notchedOutline` delta as the history filters | control 1164.00×40.00, fieldset 1164.00×45.00, notch 127.00px. Convention **4800.00** < threshold **4816.00** — fails by 16.00. Measured **4566.00** — fails by 250.00 | composited unfocused ring `rgb(87.91,92.53,94.07)` over `background.paper` vs. `rgb(85,194,188)` = **3.15:1** — passes | **meets 2.4.7, fails 2.4.11** (area) |

**Added by the second correction pass** — seven further control *renderings* that Pass 2's own walk data contains and that neither of the earlier tables measured nor cited. They were found by checking the packet's
rendering-not-import rule against `pass2-runtime-sweep.json` element by element rather than against `pass2-reached-classes.json`'s `Mui<Component>-root` *groups*: the group check passes (every group maps to some measured
class), but a group is not a rendering: **four** of these seven carry an `sx` — their own or their `ButtonGroup`'s — that changes the ripple's `currentColor` away from the theme default, and the other three sit on a
composited ground the cited family figure did not use, so all seven have a contrast figure of their own. Same method as the block above: reached by real `Tab` presses from `document.body`, whole-subtree
computed-style diff, `getAnimations`, `deviceScaleFactor: 2` capture pair on the control box expanded 12px on every side with identical width/height. Every Tab ordinal below **matches Pass 2's walk for the same state exactly**
(three mock indexers, `transient:results-loaded` / `route:/` / `route:/stats/searches`). Raw walks: `fix2-measured-classes.json`; derived figures: `fix2-derived-figures.json`; per-instance `currentColor` and composited
backdrop for the whole ripple family: `ripple-currentcolor-probe.json`.

| Class | Route / state | Mechanism (verified against MUI 7.3.9 source) | Delta | Area vs. 2px-perimeter threshold | Contrast | Disposition |
|---|---|---|---|---|---|---|
| `refine-category-toggle` (identical rendering: `refine-indexer-toggle`) | `/`, results loaded; Tab **32** (and **38** for the indexer twin); Tab **16**/**22** with the mobile `Drawer` open | Section-heading `Button` (`RefineSidebar.tsx:586`), `size="small"`, `sx` sets `color: sectionLabelColor` (`refineStyles.ts` `#6b7472`). Same `ButtonBase` `outline:0` + `focusRipple` default-`true` mechanism as the rest of the ripple family; only the colour differs, and it differs decisively. | Pulsating `TouchRipple` mounts (`animation-1taevns` 200ms enter + `animation-f6tr5a` 2500ms pulsate, delay 200ms, infinite); `outline-offset` `0px → 3px` on an element whose `outline-style` is `none` in both states | ripple Ø 175.89 ⇒ circle 24298.26 px², clipped to the 215.00×19.25 control box ⇒ **4138.75 px²** ≥ threshold **937.00 px²** — passes | ripple `currentColor` `rgb(107,116,114)` at `rippleVisible` opacity 0.30 over `background.default` `rgb(31,36,38)` ⇒ composited `rgb(53.80,60.00,60.80)` = **1.40:1** — fails. **This is the lowest figure in the stock/`sectionLabelColor` part of the ripple family, and it is not the app's floor**: the `Button color="error"` Delete rendering measured by the third correction pass is lower still, at 1.22:1 and 1.19:1. The claim that this row was "the lowest focusable ripple figure in the app" is withdrawn | **meets 2.4.7, fails 2.4.11** (contrast) |
| `refine-category-option` (identical rendering: `refine-indexer-option`) | `/`, results loaded; Tab **33–37** (categories) and **39–41** (indexers); Tab **17–21**/**23–25** with the mobile `Drawer` open | `ToggleRowFilter` row `Button aria-pressed` (`filterControls.tsx:68`), `rowStyle` colours: `color` `rowActiveColor` `#eef1f0` when pressed and `rowInactiveColor` `#b7bdbc` when not, `backgroundColor` `oklch(0.75 0.1 190 / 0.12)` when pressed. **A different rendering from `refine-toggle-chip`**, which is `chip()`: a `#242b2d` ground, a 1px border, mono font and `chipInactiveColor` `#aab0af`. Same `ButtonBase` ripple mechanism. | Pulsating `TouchRipple` mounts (`animation-f6tr5a`, 2500ms, delay 200ms, infinite); `outline-offset` `0px → 3px` with `outline-style: none` both states. **Setup-click residue disclosed, on the same terms as `checkbox-row-select`'s**: this class's *unfocused* snapshot (`fix2-measured-classes.json`) already contains three `MuiTouchRipple-*` nodes — the root, a `rippleVisible ripplePulsate` at `opacity: 0.147536` mid-fade, and a `childLeaving childPulsate` at `opacity: 0` — left over from the `setup()`'s click on that row. The disposition does not rest on the raw self-diff of background colours but on the `getAnimations` entry naming `animation-f6tr5a` at the exact `pulsateKeyframe` timing, so it stands; it is stated here rather than left for a reader to find | ripple Ø 176.48 ⇒ circle 24462.59 px², clipped to the 215.00×31.55 control box ⇒ **6782.58 px²** ≥ threshold **986.19 px²** — passes | **pressed** (the state every row is in on a fresh results view): `rgb(238,241,240)` at 0.30 over the row's own composited `rgb(37.23,55.62,56.38)` ⇒ `rgb(97.46,111.24,111.47)` = **2.38:1** — the app's *highest* ripple figure, still failing. **Unpressed** (measured after deselecting one row): `rgb(183,189,188)` at 0.30 over that instance's **own measured** ground `rgb(39.78,44.59,46.51)` (a residual hover overlay was on the row) ⇒ **1.94:1** — fails. Over an un-hovered `rgb(31,36,38)` the same `currentColor` gives **1.97:1**; `fix2-derived-figures.json` records both, and the row previously quoted only the un-hovered re-derivation while the probe's own measured ground gives 1.94:1. The family's ≈1.83:1 does not apply to either: this ripple's `currentColor` is not teal | **meets 2.4.7, fails 2.4.11** (contrast) |
| `number-filter-apply-button` (identical rendering: every `number-filter-clear-*`) | `/`, results loaded; Tab **44**/**45**, **48**/**49**, **52**/**53**; Tab **28**/**29**, **32**/**33**, **36**/**37** with the mobile `Drawer` open | `NumericFilter`'s Apply/Clear `Button`s (`filterControls.tsx:217`, `:224`), `size="small"`, `sx` touches only `fontSize`/`minWidth`/`px` — no colour override, so `currentColor` is the theme default `primary.main`. Distinct from `sort-header-button`, which *does* override colour, and from `search-advanced-toggle`, which sits on a different ground. | Pulsating `TouchRipple` mounts (`animation-f6tr5a`, 2500ms, delay 200ms, infinite) | ripple Ø 43.36 ⇒ circle 1476.58 px², clipped to the 49.00×29.00 control box ⇒ **1421.00 px²** ≥ threshold **312.00 px²** — passes | ripple `currentColor` canvas-resolved `rgb(85,194,188)` at 0.30 over `rgb(31,36,38)` ⇒ `rgb(47.20,83.40,83.00)` = **1.86:1** — fails | **meets 2.4.7, fails 2.4.11** (contrast) |
| `results-selection-caret` | `/`, results loaded; Tab **56** | The results toolbar's `▾` selection-menu `Button` (`SearchResults.tsx:1755`), `size="small"`, `sx` sets `color: "text.secondary"`. Same `ButtonBase` ripple mechanism. | Pulsating `TouchRipple` mounts (`animation-f6tr5a`, 2500ms, delay 200ms, infinite) | ripple Ø 21.56 ⇒ **365.16 px²** ≥ threshold **183.00 px²** — passes | ripple `currentColor` `rgb(154,162,161)` (`text.secondary`) at 0.30 over `rgb(31,36,38)` ⇒ `rgb(67.90,73.80,74.90)` = **1.73:1** — fails | **meets 2.4.7, fails 2.4.11** (contrast) |
| `results-expand-duplicates` | `/`, results loaded; Tab **70** and **73** | The duplicate-expansion `Button` (`SearchResults.tsx:1571`), `size="small"`, no `sx` — a stock text `Button` inside a results-table row, so `currentColor` is the theme default `primary.main`. Same `ButtonBase` ripple mechanism. | Pulsating `TouchRipple` mounts (`animation-f6tr5a`, 2500ms, delay 200ms, infinite) | ripple Ø 101.17 ⇒ circle 8039.14 px², clipped to the 122.00×30.75 control box ⇒ **3751.50 px²** ≥ threshold **611.00 px²** — passes | `rgb(85,194,188)` at 0.30 over `rgb(31,36,38)` ⇒ `rgb(47.20,83.40,83.00)` = **1.86:1** — fails | **meets 2.4.7, fails 2.4.11** (contrast) |
| `indexer-selection-more-options-button` | `/`; Tab **11** (also **13**/**15** in the category-selected and Advanced-expanded states) | The `ButtonGroup` caret `Button` (`SearchWorkspace.tsx:1079`, `aria-label="More selection options"`), `sx` only `px: 0.5`. It sits in the **same** `ButtonGroup` as `indexer-selection-preset-button` and inherits the same group `sx` (`color: "text.primary"`, `backgroundColor: controlSurface`), so it is that class's rendering with a different box — measured separately rather than cited, because its box drives its own threshold. | Pulsating `TouchRipple` mounts (`animation-1taevns` 200ms + `animation-f6tr5a` 2500ms) | ripple Ø 35.53 (`TouchRipple` root box 38.00×30.00, inside the 1px outlined border) ⇒ **991.54 px²** ≥ threshold **288.00 px²** — passes | ripple `currentColor` `rgb(214,218,217)` at 0.30 over `controlSurface` `rgb(42,49,51)` ⇒ `rgb(93.60,99.70,100.80)` = **2.19:1** — fails | **meets 2.4.7, fails 2.4.11** (contrast) |
| `search-history-sort-button` (identical rendering: `search-history-repeat`, `search-history-details`, the other column-sort `Button`s, `search-history-refresh`, `Previous page`/`Next page`, and `SavedSearchesPage`'s **Search** action `Button` — **not** its `Delete` `Button`s, which are `color="error"` and are their own class; see the third correction pass's table below) | `/stats/searches`; Tab **25** (Time), **26–28** the other sort columns, **24** Refresh, **29–46** the per-row Repeat/Details pairs | Stock MUI `Button` — no `sx`, no `color` prop, so `currentColor` is the theme default `primary.main` (`SearchHistoryPage.tsx:402`, `:206`, `:301`, `:339`, `:351`, `:357`). `search-history-refresh` passes `variant="outlined"`, which adds a border but changes nothing about what focus renders, so it is the same class under the rendering rule. Same `ButtonBase` ripple mechanism. | Pulsating `TouchRipple` mounts (`animation-1taevns` 200ms + `animation-f6tr5a` 2500ms) | ripple Ø 56.34 ⇒ circle 2493.34 px², clipped to the 64.00×36.50 control box ⇒ **2336.00 px²** ≥ threshold **402.00 px²** — passes | `rgb(85,194,188)` at 0.30 over `background.default` `rgb(31,36,38)` ⇒ `rgb(47.20,83.40,83.00)` = **1.86:1** — fails | **meets 2.4.7, fails 2.4.11** (contrast) |

**Added by the third correction pass** — one further control *rendering* that the second correction pass's element-by-element re-check still missed, because it re-checked emotion classes for the refine sidebar and the results table but
not for the `/stats/saved-searches` and `dialog-open` walks. It is not hypothetical: `pass2-runtime-sweep.json` already carried it as a real Tab stop with `focusVisible: true` in both of those states. Same method as the two blocks above:
reached by real `Tab` presses from `document.body` (from the `Dialog`'s own initial-focus placement for the trapped instance), whole-subtree computed-style diff, `getAnimations`, canvas-resolved `currentColor`, composited backdrop layer
stack, and a `deviceScaleFactor: 2` capture pair on the control box expanded 12px on every side with identical width/height. Raw walks: `fix3-measured-classes.json`; derived figures: `fix3-derived-figures.json`.

| Class | Route / state | Mechanism (verified against MUI 7.3.9 source) | Delta | Area vs. 2px-perimeter threshold | Contrast | Disposition |
|---|---|---|---|---|---|---|
| `saved-search-delete-button` (both `Button color="error"` sites: the table row and the delete-confirmation `Dialog`) | `/stats/saved-searches`; Tab **7** in this pass's one-saved-search fixture, **8** in Pass 2's (whose row also renders the identifier `Link` at Tab 6 and so pushes every later stop by one). The `Dialog` instance is Tab **2** from the open `Dialog`, matching Pass 2's `transient:dialog-open` exactly | `Button color="error"` (`SavedSearchesPage.tsx:133`, `:170`). Same `ButtonBase` `outline:0` + `focusRipple` default-`true` mechanism as the rest of the ripple family — but `MuiButton-colorError` resolves `currentColor` to `palette.error.main` `#a33938` = `rgb(163,57,56)` (`theme.ts:82`, `:142`), and **no `MuiButton` override in `theme.ts` touches colour** (the one override sets `textTransform`/`borderRadius` only). Under this packet's rendering-not-import rule that makes it a distinct class from the stock-`Button` family it was previously folded into: emotion class `css-1f1ybl5`, versus `css-ae17tw` for the `MuiButton-colorPrimary` `Search`/`Cancel` siblings on the same two surfaces | Pulsating `TouchRipple` mounts (`animation-f6tr5a`, 2500ms, delay 200ms, infinite — plus `animation-1taevns` 200ms enter on the `Dialog` instance); `outline-offset` `0px → 3px` on an element whose `outline-style` is `none` in both states. `:focus-visible` **true** at both sites | control box **64.00×36.50** at both sites; ripple Ø 56.34 ⇒ circle 2493.34 px², clipped to the control box ⇒ **2336.00 px²** ≥ threshold **402.00 px²** — passes | ripple `currentColor` `rgb(163,57,56)` at `rippleVisible` opacity 0.30, over each site's own measured backdrop. **Table row**, over `background.default` `rgb(31,36,38)` ⇒ composited `rgb(70.60,42.30,43.40)` = **1.22:1**. **`Dialog`**, over the `Paper`'s `background.paper` `rgb(38,44,46)` ⇒ composited `rgb(75.50,47.90,49.00)` = **1.19:1**. Both fail, and **both are below the 1.40:1 this packet previously called "The measured floor"** — 1.19:1 is mechanism 1's real floor | **meets 2.4.7, fails 2.4.11** (contrast) |

**What this row changes and what it does not.** It changes **no disposition**: the class is `meets 2.4.7, fails 2.4.11 (contrast)` like every other `ButtonBase` instance in the app, the `fails 2.4.7` set stays at **five**, no option in the
escalation gains or loses viability, and the remedy's scope is unchanged, since any remedy reaching the `ButtonBase` family already reaches this control. What it changes is **a number**: mechanism 1's measured range, restated
throughout this handoff as **1.19:1 to 2.38:1**. It also withdraws a positive false statement — `search-history-sort-button`'s identical-rendering list named "`SavedSearchesPage`'s Search/Delete action `Button`s" and the
cited-by-mechanism paragraph gave that whole group `rgb(85,194,188)` at 1.86:1. `Search` genuinely is that rendering (`MuiButton-colorPrimary`/`css-ae17tw`); `Delete` is not, and has been removed from both.

**One further limit closed by the same fixture.** `dialog-action-button` (the `Dialog`'s `Cancel`) was the only ripple class in this audit whose `currentColor` had never been read live — its 1.83:1 was source-derived from the call site
carrying no `sx`/`color`. Read live on the rebuilt fixture it reproduces exactly: `oklch(0.75 0.1 190)` ⇒ `rgb(85,194,188)` over the `Paper`'s `rgb(38,44,46)` = **1.83:1** (`fix3-derived-figures.json`). Its row above is therefore no
longer source-derived. `ToastProvider`'s implicit `Alert onClose` `IconButton` remains the one instance with no `currentColor` on record, for the reason already stated: no measured state renders a closeable toast.

Three things the second correction pass's block settles that the review that prompted it left open:

- **The `Previous page`/`Next page` `Button`s are not Tab stops in the walked state.** `page === 1` and `totalPages === 1` leave both `disabled`, and a disabled `Button` receives no focus — which is why `route:/stats/searches`'s
  47-stop walk ends at Tab 46 with no pagination stop. Their probe reads `currentColor` `rgba(255,255,255,0.302)` (`action.disabled`), a ripple contrast of 1.32:1 **if they were focusable**; they are not, so that figure is
  excluded from the mechanism-1 range below rather than reported as this app's floor.
- **Tab 54 in `transient:results-loaded` is not a results-table control.** It is the refine sidebar's Type pill labelled "NZB" (`RefineSidebar.tsx:301`, `RefineChip`) — the already-measured `refine-toggle-chip` class,
  confirmed by its `MuiButton-text` class list, by `RefineSidebar.test.tsx:244` asserting a button named "NZB", and by the sidebar's Quality pills occupying Tabs 19–30 of the same walk. The per-row `NZB` controls are Tabs 64,
  66, 68, 71 and 74 and are `download-nzb` anchors, already cited.
- **`refine-clear-all` and `refine-sidebar-toggle` keep their citation but not their number.** Both were cited as "≈1.76–1.83:1"; measured, `refine-clear-all` is `clearAllColor` `oklch(0.78 0.1 190)` ⇒ `rgb(96,204,197)` over
  `rgb(31,36,38)` = **1.95:1** (docked) / **1.92:1** (inside the mobile `Drawer`, over `rgb(38,44,46)`), and `refine-sidebar-toggle` is **two renderings under one `data-testid`, not one**: the docked `«`/`»` (`RefineSidebar.tsx:435`) sets `color: sectionLabelColor` `rgb(107,116,114)` = **1.40:1**, the same figure as the section toggles, while the compact mobile "Refine" `Button` (`RefineSidebar.tsx:347`, emotion class `css-gcp7l6`, box 65.00×38.75, Tab **16** in `transient:mobile-390x844`) sets `color: "text.primary"` and measures `rgb(214,218,217)` at 0.30 over `rgb(31,36,38)` = **2.26:1** (`fix3-derived-figures.json`). The packet previously cited the `data-testid` uniformly at 1.40:1.
  `display-options-toggle` is `rgb(201,207,206)` over `rgb(42,49,51)` = **2.08:1**.

**Not independently screenshotted/measured, cited by identical mechanism to an already-measured sibling** (present in the app, confirmed via source; disposition inferred from the cited class's real computed-style/animation evidence,
not fabricated): `search-category-option`/indexer-preset `MenuItem`s/results-selection-caret `MenuItem`s (same `MenuItem` `&.Mui-focusVisible` mechanism as `recent-search-entry` — **meets 2.4.7, fails 2.4.11**, contrast 1.46:1);
`ToastProvider`'s implicit `Alert onClose` close `IconButton` (same `ButtonBase` ripple mechanism; its `currentColor` was **not** probed, because no measured state renders a closeable toast — recorded as the one citation in
this audit without its own `currentColor`), `DisplayOptionsMenu`'s own `display-options-toggle` `Button` (`rgb(201,207,206)` over `rgb(42,49,51)` = **2.08:1**), `SavedSearchesPage`/`SearchHistoryPage`'s other **stock** action `Button`s
(`currentColor` `rgb(85,194,188)` over `rgb(31,36,38)` = **1.86:1** — now a measured class in its own right, `search-history-sort-button`, above; `SavedSearchesPage`'s `Delete` `Button`s are **excluded** from this citation, being `color="error"` and measured separately below), `DirectDownloadActions`' `component="a"` download `Button`s
(`download-nzb`, `rgb(85,194,188)` over `rgb(31,36,38)` = **1.86:1**), `RefineSidebar`'s `refine-clear-all` (`rgb(96,204,197)` over `rgb(31,36,38)` = **1.95:1** docked, **1.92:1** in the mobile `Drawer`) and
`refine-sidebar-toggle` (two renderings: docked `«`/`»` `rgb(107,116,114)` over `rgb(31,36,38)` = **1.40:1**; compact mobile "Refine" `rgb(214,218,217)` over `rgb(31,36,38)` = **2.26:1**) `Button`s — every one **meets 2.4.7, fails 2.4.11** on contrast. Each figure is that instance's own measured `currentColor` composited over its own
measured backdrop (`ripple-currentcolor-probe.json`); the blanket "≈1.76–1.83:1" this paragraph previously carried was a family analogy and is withdrawn;
`SearchHistoryPage.tsx:121` ("Before", identical to `:112`), `:137` ("Category", identical to `:152`), `:179`/`:188`/`:197` (User agent / Username / IP address, identical to `:130`) — same default un-overridden `OutlinedInput`
rendering as `stats-history-text-input`/`-select`/`-datetime-input` above, differing only in box width and therefore in the size-independent 16.00 px² area shortfall; `SearchWorkspace.tsx:563` (Episode, identical to the Season
`InputBase` at `:539` — **fails 2.4.7**); `filterControls.tsx:199` and the `refine-age`/`refine-grabs` `NumericFilter` pairs (identical `numericFieldSx` rendering to `refine-numeric-range-input`).

**Present, keyboard-unreachable — no WCAG 2.4.7/2.4.11 disposition assigned** (the criteria presuppose the control receives focus): the recent-search Refill `IconButton`. FM-049 (`done`) already measured and recorded this exhaustively
— a full keyboard focus trace over every key a menu user would try, a real accessibility-tree capture, and the `ADR REQUIRED` escalation ADR-0012 resolved (Option A1, remedy FM-050, `done`) — and this packet does not re-litigate it or
touch `F-SEARCH-RECENT`. Cited here only so the class is not silently omitted from this audit's own inventory.

**Not focusable by real DOM focus, out of WCAG 2.4.7/2.4.11 scope**: the autocomplete `<li role="option" tabIndex={-1}>` items (a different, `aria-activedescendant`-driven highlighting affordance) and the static "Downloaded" `Chip`
(no `onClick`/`onDelete`).

### The Downloader-dropdown contradiction, resolved

Measured focused-but-closed and focused-with-the-menu-open, separately, as the packet required:

- **Focused, closed** (`downloader-select`): the `Select` trigger's `notchedOutline` border changes from `rgba(255,255,255,0.1)` at 1px to `oklch(0.75 0.1 190)` (`rgb(85,194,188)`) at 2px — a doubling of the line width and a
  focused-versus-unfocused contrast of **4.84:1**, among the highest figures this audit measured; screenshotted (`downloader-select-focused.png` vs. `-unfocused.png`). This is the "colored border" a
  user tabbing to the control (without opening it) would see. **This matches "the Downloader dropdown shows a colored border when selected"** — "selected" read as "the currently-focused element," which is exactly the moment this
  screenshot captures. (This class was not re-measured in the second pass — the fixture state that renders it was not reconstructed — so its 4.84:1 figure is the first pass's, computed against `background.paper`; the sibling
  `search-indexers-select`, re-probed with its own measured backdrop, comes out at 4.53:1. Both pass 3:1 and neither changes a disposition; see the backdrop note above.)
- **Focused, open** (`downloader-select-open-option`): real DOM focus moves onto the selected `MenuItem` inside the now-open listbox. The screenshot (`downloader-select-open-option-focused.png`) shows the trigger's teal border still
  visible at the very top of the crop (MUI's `Mui-focused`/`notchedOutline` styling is driven by the `Select`'s own `open`/internal-focus React state, not by literal `document.activeElement`, so it does not disappear just because
  real DOM focus moved into the popup) **plus** a second, distinctly different, lower-contrast (1.73:1) teal-tinted fill covering the selected option itself. Someone judging *only* the open menu's own per-item highlight — the part
  that is supposed to track which option keyboard focus is on — is judging a 1.73:1 indicator sitting next to a 4.84:1 one of a similar hue, which is plausibly the source of **"not … on … the Downloader dropdown."** The
  contradiction is not a clean binary because the control genuinely renders two different, temporally-overlapping indicators depending on open state, and the packet's own hypothesis (a focused-vs-open distinction) is confirmed,
  refined by the additional detail that the closed-state indicator does not cleanly switch off when the menu opens.

**A second capture pair shares its unfocused half, disclosed on the same terms.** `stats-history-datetime-picker-indicator-unfocused.png` is byte-identical to `stats-history-datetime-input-unfocused.png` (both SHA-256
`60f4a669f757b326…`): the two classes are two Tab stops on the same `<input>`, the clip geometry is identical by construction, and neither is focused in the unfocused pass, so the two files are the same photograph of the same
pixels. That is defensible — but it is stated rather than left for a reader to discover, exactly as the `downloader-select-open-option` case below is, and it is also why the *focused* comparison that settles this class is
`-picker-indicator-focused.png` against `stats-history-datetime-input-focused.png` as well as against its own unfocused half.

**One limit of the open-state capture, disclosed.** `downloader-select-open-option-unfocused.png` is byte-identical to `downloader-select-unfocused.png` (both SHA-256
`720a73871c2df2aeffec9fff2ba4c6bc07204a06f9461f42d63bc1fb695a80a3`), so that class's *unfocused* comparator is the closed trigger, not an unfocused `MenuItem` inside an open menu. This changes no finding — every disposition in this
audit is decided by computed styles, and `downloader-select-open-option`'s 1.73:1 figure comes from the `MenuItem`'s own focused/unfocused `background-color` pair, not from the images — but as *human-judgeable* evidence the pair does
not isolate the option's own indicator, and a reader comparing only those two PNGs would be comparing two different controls.

### Ripple honesty (verified against installed source)

`ButtonBase/TouchRipple.js`: `.MuiTouchRipple-rippleVisible{opacity: 0.3; transform: scale(1); animation-name: enterKeyframe}` — **`opacity: 0.3` is static**, not part of any keyframe. `pulsateKeyframe` (applied to
`.MuiTouchRipple-childPulsate`, `animation-duration: 2500ms; animation-iteration-count: infinite; animation-delay: 200ms`) animates **`transform: scale` only**: `0% { scale(1) } 50% { scale(0.92) } 100% { scale(1) }`. A still therefore
records everything except the scale phase, confirmed both by reading the source and by the deterministic `Animation.currentTime` stills captured for `recent-searches-trigger` (see table above) — both stills show the ripple at full,
static 0.3 opacity, differing only in the 8% scale — which on a 38.85px-diameter ripple is a 1.55px change in diameter and a 91.85 px² change in area, both far above this audit's 0.00-px² threshold for "renders nothing" and far
below any figure a disposition turns on. `prepareVisualEvidence()` was **not used anywhere in this task** — it was deliberately avoided
throughout per the packet's instruction, since its injected `animation: none !important` and `emulateMedia({reducedMotion: "reduce"})` would have suppressed the very ripple this audit measures.

### Raw evidence preserved alongside the captures

The first version of this handoff kept only the conclusions of its computed-style walks; the scratch spec that produced them was deleted, so "an empty delta across that whole set" — the packet's own evidence of record for
`fails 2.4.7` — could not be re-read by anyone. The second pass writes the walks themselves to the same git-ignored directory as the PNGs, so every disposition it supports is independently auditable without re-running anything:

| Artifact | What it holds |
|---|---|
| `pass1-source-census.json` | Every interactive-component JSX tag, native element and attribute marker in `core/ui-react/src/**`, with `file:line`. The Pass 1 census, as data. |
| `pass2-runtime-sweep.json` | Every `document.activeElement` after every `Tab` press, for all seven routes and eleven walked transient states, with `:focus-visible`, class list, `data-testid`, `aria-label`, `type` and DOM index — plus each state's DOM focusable set and its scrollable-region enumeration. The twelfth transient state, **an `Alert` rendered**, is recorded as DOM presence instead, because the question it answers is whether the `Alert` contributes a Tab stop of its own: it does not (`ownTabStops: 0` for the one rendered `MuiAlert-root`, "No downloader is configured for selected-result sends"), so it carries no focus-indication class. |
| `pass2-reached-classes.json` | The mechanical union: every `Mui<Component>-root` group the keyboard walk landed on, and the states it was reached in. |
| `delta-omitted-classes.json` | For each of the ten newly measured classes: the complete focused and unfocused computed-style subtree walks (element, every descendant, `::before`/`::after`), the derived delta, ripple nodes, `getAnimations` output, geometry, composited backdrop, canvas-resolved colours, Tab ordinal and clip. |
| `delta-fails-2-4-7-classes.json` | The same complete walks for the three first-pass classes dispositioned `fails 2.4.7`, re-taken so their "empty delta" claim is readable rather than asserted. All three reproduce: `search-query-input` changes only `outline-width` `3px→0px` and `outline-offset` `0→3px` with `outline-style: none` in both states; `search-category-select`'s `notchedOutline` `border-color` changes while `border-width` stays `0px` in both, so it never paints; `checkbox-select-all` mounts **no** ripple (`disableRipple`) and changes only the `opacity: 0` native input's `outline-style`, with the visible icon element (`span:nth(1) > div:nth(2)` — a `<Box>` from this control's own `icon`/`indeterminateIcon` props, not an `<svg>`) and the wrapper unchanged. **This file holds three of the five `fails 2.4.7` classes, not five**, and that is stated rather than left to be discovered: `season-episode-paired-input`'s walk is in `delta-omitted-classes.json` and `advanced-range-input`'s is in `fix3-measured-classes.json`. With the third correction pass, **all five now have a raw whole-subtree walk of record**; none rests on source inspection alone. |
| `notchedoutline-geometry-probe.json` | Control, `MuiInputBase-root`, fieldset and legend boxes plus the composited backdrop for every `notchedOutline` class, unfocused and keyboard-focused. Read-only: captures nothing. |
| `computed-figures.json` | Every area and contrast figure quoted by the first two passes, with the inputs each was derived from. |
| `fix2-measured-classes.json` | For each of the seven classes the correction pass added: the complete focused and unfocused computed-style subtree walks, the derived delta, every `MuiTouchRipple-*` node with its own box/opacity/colour/transform, `getAnimations` output, geometry, canvas-resolved `currentColor`, composited backdrop, Tab ordinal, `:focus-visible`, and clip. |
| `ripple-currentcolor-probe.json` | Read-only: for **every** `ButtonBase` ripple instance reachable in eight measured states, the element's resolved `currentColor` (canvas-composited, alpha included), its full composited backdrop layer stack, its control box, and whether it is `disabled` in that state. With `fix3-measured-classes.json` this is the evidence for mechanism 1's corrected `1.19:1`–`2.38:1` range. Captures nothing. |
| `fix2-derived-figures.json` | Every figure the correction pass computed or corrected — the seven new classes, all 33 ripple-family instances, the calendar-picker-indicator pixel analysis, and the `news-page-link` backdrop resample — each with the artifact it was derived from. |
| `fix3-measured-classes.json` | For the `Button color="error"` Delete rendering at both of its sites: the complete focused and unfocused computed-style subtree walks, the derived delta, every `MuiTouchRipple-*` node, `getAnimations`, geometry, canvas-resolved `currentColor`, composited backdrop layer stack, Tab ordinal, `:focus-visible` and clip. Plus the **`advanced-range-input`** walk — the fifth and last `fails 2.4.7` class, whose raw delta no artifact previously held — rooted at the `MuiInputBase-root` wrapper so `advancedInputSx`'s static border and recessed background are inside the recorded subtree. Plus read-only `currentColor`/backdrop probes for `search-advanced-toggle` collapsed **and** expanded, the compact mobile `refine-sidebar-toggle`, and the `Dialog`'s `Cancel`. |
| `fix3-derived-figures.json` | Every figure the third correction pass computed or corrected — the `color="error"` class in both grounds, the `Cancel` re-probe, the three second-state probes, and the `advanced-range-input` verdict — each with the artifact it was derived from. |

The raw *whole-subtree* walks for the twenty-five first-pass classes were **not** reconstructed. Ten of them (the `ButtonBase` ripple family) are dispositioned on `getAnimations` output rather than on a style delta, and
re-deriving the transient states of the remaining fifteen would have re-taken evidence an independent review has already checked. This is recorded as a known limit of the artifact set, not presented as complete. **The
correction pass narrowed it**: every one of those ripple classes now has its `currentColor`, its composited backdrop layer stack and its control box in `ripple-currentcolor-probe.json`, read live, and that is what the
per-class contrast figures in the table now rest on — what is still missing for them is only the per-property focused/unfocused subtree diff, not the numbers. **The third correction pass narrowed it once more**: it rebuilt the
saved-search `Dialog` fixture, so `dialog-action-button`'s `currentColor` is now read live too (reproducing its source-derived 1.83:1 exactly), and it preserved the `advanced-range-input` whole-subtree walk, so **all five**
`fails 2.4.7` classes now have a raw walk of record. Exactly **one** instance remains uncovered even by the probe and is named where it appears: `ToastProvider`'s `Alert onClose` `IconButton`, because no measured state renders
a closeable toast.

### Environment

`@mui/material`/`@mui/icons-material` `7.3.9`; `@playwright/test` `1.62.1` (Chromium build: Chrome for Testing `151.0.7922.34`); Node `v26.7.0`; npm `11.19.0`; Apache Maven `3.9.12`; OpenJDK/GraalVM CE `25.0.4`; Docker Engine `29.7.2`.

### Files Modified

- `docs/frontend-migration/FEATURES.yaml` — `gaps`/`backlog` extended on exactly four records: `F-PLATFORM-SHELL` (mandatory — owns `core/ui-react/src/app`, i.e. `theme.ts`'s global rule), `F-SEARCH-FORM` (query field, category
  select, Advanced-panel range fields all fail 2.4.7), `F-SEARCH-GROUP-SELECTION` (the select-all checkbox fails 2.4.7), and `F-SEARCH-MEDIA` (the paired season/episode `InputBase`es fail 2.4.7; the record also owns
  `additional-query`). One further correction was made inside `F-SEARCH-FORM`'s own new rationale: it had said the Advanced-panel Age/Size fields share the query field's "mechanism and rendering", which is self-contradictory under
  this packet's rendering-not-import rule — they share the *mechanism*; `advancedInputSx` carries a recessed background and a static 1px border that `queryInputSx` does not. Corrected to "mechanism", with the reason the difference
  does not change the disposition stated. No other field of these records (`visual`, `parity`, `tests`, `selectors`, `target`, `task`) and no other record was touched. See *Registry And Documentation Updates* for the explicit
  per-record confirmation of every other linked record. The second correction pass extended `F-SEARCH-FORM`'s `gaps` phrase to name the Advanced-panel range fields explicitly, since they are now counted as their own class
  in the `fails 2.4.7` total; **no record gained or lost a `gaps` entry**, because all seven classes the correction pass added disposition `meets 2.4.7`.
- `docs/frontend-migration/STATUS.md` — FM-052 moved from `## Upcoming` to `## Blocked`; its narrative paragraph rewritten from the pre-measurement framing to the measured outcome, disposition counts, and escalation, then
  corrected to the second pass's counts, corrected again by the second correction pass to 42 measured classes, five `fails 2.4.7`, the one-versus-three `meets both` split between the convention and measured readings, and
  mechanism 1's ripple range — and corrected once more by the third correction pass to **43** measured classes and mechanism 1's real **1.19:1–2.38:1** range. The `fails 2.4.7` count is unchanged at five and no disposition moved.
- `docs/frontend-migration/tasks/FM-052-keyboard-focus-indication-audit.md` (this packet) — `Status: ready` → `Status: blocked`; `Feature IDs` header extended to list `F-SEARCH-GROUP-SELECTION` and `F-SEARCH-MEDIA` alongside the two
  originally-declared IDs, a factual correction reflecting the registry records this handoff actually touches under the packet's own `Files Allowed To Modify` grant (that clause is outcome-driven — "each feature record whose own
  controls the audit dispositions as failing WCAG 2.4.7" — not limited to the header's a-priori list); and this Handoff section. The third correction pass edited this file only: it added the `saved-search-delete-button` class and
  its table, restated mechanism 1's range as `1.19:1`–`2.38:1` at every place it appears, removed `Delete` from `search-history-sort-button`'s identical-rendering list and from the 1.86:1 citation, corrected
  `search-indexers-select` to 4.53:1 and `refine-filter-title-input` to 5.56:1 with its measured ring figure, added `search-advanced-toggle`'s expanded state and the compact `refine-sidebar-toggle` rendering, corrected
  `refine-category-option`'s unpressed figure to its own measured ground, disclosed that class's setup-click ripple residue, reconciled the ripple-family instance count to one basis, and recorded the `advanced-range-input`
  walk and the `dialog-action-button` live re-probe. **`FEATURES.yaml` was not touched by this pass**, because every change is `meets 2.4.7`.
- `tests/system/visual-evidence/FM-052/` — **90 PNG files** (44 focused/unfocused pairs at `deviceScaleFactor: 2` — one per measured class, and two for `saved-search-delete-button`, which is measured on two different grounds —
  plus 2 deterministic pulsate-scale stills for `recent-searches-trigger`) and **12 JSON
  artifacts** (the census, both sweeps, the per-class raw walks, the geometry probe, and the derived figures), listed under *Registry And Documentation Updates*. This directory is git-ignored (`tests/.gitignore:33`) and contributes
  nothing to the tracked diff; `git status --short` does not list it.
- Scope confirmation: every task-owned path above is within `Files Allowed To Modify`. `git status --short` reports exactly `docs/frontend-migration/FEATURES.yaml` (modified), `docs/frontend-migration/STATUS.md` (modified), and this
  packet (untracked/new) as tracked changes; `git diff -- core/ui-react` and `git diff -- tests/system` are both empty. No pre-existing unrelated user changes were present at baseline (`Unrelated pre-existing user paths: none`, per the
  coordinator) beyond this packet's own designer-authored content (the task packet file itself and the `STATUS.md` pre-measurement entry), and both are reconciled above rather than reverted.

### Verification Evidence

Every command below was **re-run against the state produced by the third correction pass**. None of the earlier runs' command evidence was reused for these commands: the correction changed `STATUS.md` and this packet (so every
registry/format/scope command is affected), and it re-entered a real browser against a real JVM backend plus mockserver, creating and then deleting scratch specs inside `tests/system/.playwright-cli/` (so every hygiene command a
Playwright run can perturb is affected). What *was* reused, and why it remains valid, is named under *Verification Basis*. The results below are the third pass's; each row's result is unchanged from the second pass's, which is
what "no `core/ui-react` or `tests/system` file changed" predicts and does not excuse re-running.

| Working directory | Command | Result |
|-------------------|---------|--------|
| `/home/sist/projects/nzbhydra2` | `git diff -- core/ui-react` | Passed. Empty. |
| `/home/sist/projects/nzbhydra2` | `sha256sum core/ui-react/src/app/theme.ts` vs. `git show HEAD:core/ui-react/src/app/theme.ts \| sha256sum` | Passed. Both `3db6749c7c98e0482a4901ca86f34bc3148933983eb300d6336181ac75fca77d`. |
| `/home/sist/projects/nzbhydra2` | `git diff -- tests/system` | Passed. Empty — no scratch spec, no formatting change. |
| `/home/sist/projects/nzbhydra2` | `git diff --check` | Passed. No whitespace errors. |
| `/home/sist/projects/nzbhydra2` | `git diff --stat` | Passed. Exactly `docs/frontend-migration/FEATURES.yaml` (16 lines changed) and `docs/frontend-migration/STATUS.md` (24 changed); this packet is untracked/new, so `--stat` does not list it and `git status --short` confirms it as the third changed path. `FEATURES.yaml`'s 16 lines are the second correction pass's and are byte-identical after this pass. |
| `/home/sist/projects/nzbhydra2` | `git status --short --ignored tests/system` | Passed. `tests/system/.playwright-cli/` is absent (the third pass's scratch spec and config were deleted before this handoff, as the earlier passes' were); no `playwright-report/`/`test-results/` stragglers — each pass's scratch config writes its `outputDir` outside the repository; only the expected `visual-evidence/` (and pre-existing IDE/build ignores) appear. |
| `/home/sist/projects/nzbhydra2` | `data-testid` diff against `HEAD` | Passed. Confirmed mechanically: `git diff -- core/ui-react tests/system` is empty, so no `data-testid` literal could have changed, added, or been removed. |
| `/home/sist/projects/nzbhydra2/tests/system` | `npx tsc --noEmit` | Passed. Exit 0, no diagnostics. |
| `/home/sist/projects/nzbhydra2/tests/system` | `npx prettier --check .` | Passed. `All matched files use Prettier code style!` |
| `/home/sist/projects/nzbhydra2/core/ui-react` | `npm run validate:migration` | Passed. `Migration registries and task metadata are valid.` (FM-052 placed under `## Blocked` in `STATUS.md`, matching its `blocked` status.) |
| real-backend browser sweep | Pass 1 census script; `pass2.spec.ts`; `measure.spec.ts`; `probe.spec.ts`; `verify.spec.ts`; for the second correction pass, `fm052-fix2.spec.ts` + `fm052-drawer.spec.ts` + `harness.ts` + `fm052.config.ts`; and for the third, `fm052-fix3.spec.ts` + `fm052.config.ts` (all scratch, under the git-ignored `tests/system/.playwright-cli/`, all deleted afterwards; each scratch config's `outputDir` points outside the repository) | All completed, exit 0 — the third pass's run reports `3 passed`. Not a committed test and not a gate: their product is the JSON/PNG evidence listed above. The third pass reused the services the second left running via `--keep-services` from the same `python3 misc/run_gui_systemtest.py --runtime local --keep-services -- tests/search.spec.ts --list` warmup, and shut them down afterwards. It ran with `MOCKSERVER_INTERNAL_URL=http://127.0.0.1:5080` set explicitly, per FM-049's recorded assumption; see *Assumptions*. |
| backend fixture state | `internalapi/config`, `internalapi/savedsearches` after the run | Passed. `main.indexerSelectionAsCheckboxes` back to `false`, `searching.savedSearches` back to `[]`, and the configured indexer list back to the single `GUI System Test Baseline` entry — the `hydra` fixture's own config restore returned the running instance to the state it was in before the measurement. Every correction pass's scratch specs import that same `hydra` fixture from `tests/fixtures.ts` precisely so its `saveConfig(originalConfig)` teardown runs. The third pass's only config mutation was `configureMockIndexers(["1","2","3"])`; the saved search it created through the app's own "Save search" button was deleted by the spec itself and the restore confirmed empty afterwards. |

The React quality chain (`typecheck`, `lint`, `format:check`, `test`, `build`, `check:api`) is **not run**, per the packet's own instruction: no file under `core/ui-react/` changes, and the one registry file this task may touch is
gated by `validate:migration` above. This is ADR-0004's independent-gates principle applied honestly, not a relaxation of *Verification Integrity*. The exploratory measurement itself (now a 43-class Playwright/Chromium capture) is not
a committed test and has no pass/fail gate of its own; its evidence is the disposition table and the JSON artifacts above, and the prerequisite real-backend environment it required
(`python3 misc/run_gui_systemtest.py --runtime local --keep-services -- tests/search.spec.ts --list`) is recorded as the warmup command actually used, not as a claimed-passing full suite run — this packet's Verification section does
not require running `search.spec.ts` itself, unlike FM-049/FM-050.

### Verification Basis

- Baseline: `652f13d5e5ba0abffaafcdef8eee2fe76e2f3978`.
- **Affected versus reusable, classified before re-running (second correction pass).** The correction changed all three task-owned tracked/untracked paths, added evidence artifacts under the git-ignored capture directory, and
  re-entered a real browser against a freshly built real JVM backend plus mockserver and the sonarr/radarr Docker fixtures, so:
  - **Affected, re-run:** `npm run validate:migration` (its inputs `FEATURES.yaml`, `STATUS.md` and this packet all changed); `git diff --stat`, `git status --short`, `git diff --check` (the tracked diff changed);
    `git status --short --ignored tests/system` (a Playwright run can leave `playwright-report/`/`test-results/` behind, and this pass created a scratch spec, a harness module and a scratch Playwright config inside
    `tests/system/.playwright-cli/`); and **the real-backend browser sweep itself**, for the seven newly measured classes, the 33-instance ripple `currentColor` probe, and the `::-webkit-calendar-picker-indicator` pseudo-element
    readout. The sweep is a *runtime* measurement, so any change to what it measures makes it affected by definition; it was re-run in full rather than argued about.
  - **Also re-run although arguably reusable:** `npx tsc --noEmit` and `npx prettier --check .` in `tests/system`, and `git diff -- core/ui-react` / `git diff -- tests/system` / `sha256sum core/ui-react/src/app/theme.ts`. No file
    those commands cover changed, so the earlier evidence would still hold — but scratch files were created **inside** `tests/system/.playwright-cli/` during this correction and then deleted, and "it was git-ignored" is an argument,
    not evidence. Every one was re-run against the final tree rather than argued for.
  - **Reused, named as reused:**
    1. **The first pass's twenty-five per-class keyboard-reach measurements, their fifty computed-style comparisons and their fifty captures**, and the **`search-advanced-toggle` mouse-versus-keyboard negative control**. Reuse is
       sound for exactly the reason the rule states: every task-owned implementation and test file those measurements cover — all of `core/ui-react`, all of `tests/system` — is byte-identical to the baseline they were taken
       against, confirmed here by SHA-256 on `theme.ts` and by empty `git diff`s on both trees. Note what this reuse does **not** cover: fourteen of those twenty-five rows have **corrected contrast figures** in this pass, but the
       correction comes from the new read-only `ripple-currentcolor-probe.json`, not from re-taking the class's keyboard reach, its subtree diff or its capture — the mechanism, the delta and the images are the reused evidence and
       are unchanged.
    2. **The second (mechanical) pass's ten per-class measurements and their twenty captures**, on the same grounds. One of them, `stats-history-datetime-picker-indicator`, has a **re-dispositioned** row — but again from its own
       already-captured PNGs, re-analysed pixel by pixel, not from a new capture; the two images are byte-identical to the ones the previous review checked.
    3. **`pass1-source-census.json`, `pass2-runtime-sweep.json`, `pass2-reached-classes.json` and `notchedoutline-geometry-probe.json`.** No source file under `core/ui-react/src` changed, so the census cannot have changed; the
       runtime sweep is what this pass *checked its new classes against* rather than re-derived, which is only sound because the app it walked is byte-identical to the app measured here.
- **Affected versus reusable, classified before re-running (third correction pass).** This correction changed `STATUS.md` and this packet, added `fix3-measured-classes.json`, `fix3-derived-figures.json` and four PNGs under the
  git-ignored capture directory, left `FEATURES.yaml` byte-identical, and re-entered a real browser against the already-running real JVM backend plus mockserver and the sonarr/radarr Docker fixtures, so:
  - **Affected, re-run:** `npm run validate:migration` (two of its three inputs, `STATUS.md` and this packet, changed); `git diff --stat`, `git status --short`, `git diff --check` (the tracked diff changed);
    `git status --short --ignored tests/system` (this pass created a scratch spec and a scratch Playwright config inside `tests/system/.playwright-cli/` and then deleted them, and a Playwright run can leave
    `playwright-report/`/`test-results/` behind); and **the real-backend browser sweep itself**, for the one newly measured class in both its grounds, the `advanced-range-input` subtree walk, and the four read-only
    `currentColor`/backdrop probes. The sweep is a *runtime* measurement, so any change to what it measures makes it affected by definition; it was re-run rather than argued about.
  - **Also re-run although arguably reusable:** `npx tsc --noEmit` and `npx prettier --check .` in `tests/system`, and `git diff -- core/ui-react` / `git diff -- tests/system` / `sha256sum core/ui-react/src/app/theme.ts`. No file
    those commands cover changed — but scratch files were created **inside** `tests/system/.playwright-cli/` during this correction and then deleted, and "it was git-ignored" is an argument, not evidence. Every one was re-run
    against the final tree.
  - **Reused, named as reused:**
    1. **Every measurement of the first, second and second-correction passes — all 42 classes' keyboard reaches, their computed-style comparisons and all 86 of their captures**, plus the `search-advanced-toggle`
       mouse-versus-keyboard negative control, the Pass 1 census, the Pass 2 runtime sweep, `pass2-reached-classes.json`, `notchedoutline-geometry-probe.json`, `ripple-currentcolor-probe.json`, `delta-*` and `fix2-*`. Reuse is
       sound for the reason the rule states: every task-owned implementation and test file those measurements cover — all of `core/ui-react`, all of `tests/system` — is byte-identical to the baseline they were taken against,
       confirmed here by SHA-256 on `theme.ts` and by empty `git diff`s on both trees. This pass took no capture and no walk over any of them.
    2. **What this reuse does not cover, stated as the previous pass stated its own:** four of those rows have **corrected figures** in this pass (`search-indexers-select`, `refine-filter-title-input`, `refine-category-option`
       unpressed, `search-advanced-toggle`'s second state) and one has a **shortened** identical-rendering list (`search-history-sort-button`). None of those corrections comes from a new capture or a new reach: three are
       re-readings of `notchedoutline-geometry-probe.json` and `fix2-derived-figures.json`, and the fourth (`search-advanced-toggle` expanded) plus the compact `refine-sidebar-toggle` are new read-only probes that capture nothing.
       The mechanisms, the deltas and the images are the reused evidence and are unchanged.
    3. **The `FEATURES.yaml` diff itself**, unchanged from the second correction pass and re-validated by `validate:migration` rather than re-derived: every class this pass added or corrected dispositions `meets 2.4.7`, so the
       outcome-driven grant reaches no record it did not already reach.
- Command coverage:
  - `npx tsc --noEmit`, `npx prettier --check .` (in `tests/system`): all files under `tests/system` (unchanged as a whole — this task touches none of them; the deleted scratch specs under the git-ignored
    `tests/system/.playwright-cli/` never affected these commands' evidence, since Playwright's `testDir`/`tsconfig` scope is `tests/system/tests`, and both commands were re-run after the deletion regardless).
  - `npm run validate:migration` (in `core/ui-react`): `docs/frontend-migration/FEATURES.yaml` (task-owned; changed by the second correction pass, byte-identical after the third), `docs/frontend-migration/STATUS.md` (task-owned;
    changed) and this task packet (task-owned; changed).
  - `git diff`/`sha256sum`/`git status` commands: `core/ui-react/src/app/theme.ts` specifically (SHA-256 manifested below) and the full `core/ui-react`/`tests/system` trees (confirmed empty diffs).
  - the real-backend browser sweep: no repository file at all — its inputs are the running app built from the baseline tree, and its outputs are the git-ignored artifacts under `tests/system/visual-evidence/FM-052/`.
- File-content manifest:
  - `core/ui-react/src/app/theme.ts`: `3db6749c7c98e0482a4901ca86f34bc3148933983eb300d6336181ac75fca77d` — matches `git show HEAD:…` byte-for-byte (confirmed, re-run after the correction).
  - `docs/frontend-migration/FEATURES.yaml`, `docs/frontend-migration/STATUS.md`, this packet: documentation-only, excluded from the manifest per the template's "exclude task-packet and lifecycle documentation-only edits" instruction.
  - No other `core/ui-react` or `tests/system` file is task-owned or changed: `None`.
- Completed after the last change to each command's listed files: **yes** for all commands — `tsc`/`prettier` and every `git` command were run after the third pass's scratch directory was deleted and after the final
  `STATUS.md`/packet edits, and `validate:migration` last of all (including the `## Blocked` bullet line the validator's `statusSections` scan requires).
- Task-owned changes after verification: `None`. No task-owned file was edited after the commands above were run.

### Dependency Decisions

- Runtime dependencies: `None`.
- Development dependencies: `None`.

### Architecture Decisions

- **ADR-0004** followed: the real-backend Playwright/Chromium measurement is the evidence class it assigns to focus-visibility/computed-style questions — jsdom has no `:focus-visible`, no layout, no computed outline, and no ripple
  element, so no component test could have established or refuted any criterion here, and none was added. No test was removed, skipped, weakened, or ignored; no test was committed at all, per the packet's own *Out Of Scope*.
- **ADR-0006** followed as a constraint: no visual contract, state, geometry check, viewport, snapshot, or variance was defined or touched; no `decision`/`accepted_by`/`accepted_on` key was added, edited, or re-dated anywhere; no
  `visual` block field of any record was touched. The screenshots captured are task-scoped measurement evidence under `tests/system/visual-evidence/FM-052/`, deliberately not an `F-<FEATURE>/` baseline directory.
- **ADR-0002** constrains every *future* remedy to MUI's own primitives; this packet chose no remedy, so it is not implicated beyond being the reason every mechanism is named against MUI 7.3.9 source rather than described only by
  appearance.
- **ADR-0009** is why several controls carry local styling that overrides MUI's own focus affordances (the `notchedOutline` color/none overrides, the bulk-action button surfaces); the audit measured the result and did not relitigate
  the redesign.
- **`ADR REQUIRED` proposal triggered**: yes, this task's own escalation — see below. No ADR ID exists yet; the coordinator starts the proposal process from this handoff.

### Assumptions

- **`Element.scrollIntoView()` also moves Chromium's sequential focus navigation starting point, even while `document.activeElement` is still `<body>`.** The second pass's first run reported every measured control as reached on
  **Tab press 1**, because the unfocused pass scrolls the target to the viewport centre before capturing, and the reset-to-body loop then returned immediately (activeElement already `<body>`) without re-anchoring the starting point.
  The fix, and the shape every Tab ordinal in this handoff was taken with: press `Tab` **once** to materialise focus at whatever the starting point currently is, then press real `Shift+Tab` until `document.activeElement ===
  document.body`. The ordinals are then a real cross-check against Pass 2's independent full-page walk — but **not for all ten
  classes, and the earlier claim that they were is withdrawn.** Checked individually against `pass2-runtime-sweep.json`:

  - **Seven of ten match exactly**: `stats-identifier-link` at 6 (`transient:saved-search-with-link`), `stats-history-datetime-input` at 6 and
    `stats-history-datetime-picker-indicator` at 6 + 6 = 12, the Query filter (`stats-history-text-input`) at 20, the Source select (`stats-history-select`) at 22, the
    "Show user agents" checkbox (`stats-history-checkbox`) at 23 (all `route:/stats/searches`), and the Season field (`season-episode-paired-input`) at 6 (`transient:category-tv-selected`).
  - **One does not match**: `refine-numeric-range-input` was measured at Tab **44**, but Pass 2 puts its element (`number-filter-min-refine-size`) at Tab **42** in
    `transient:results-loaded` and Tab **26** in `transient:mobile-refine-drawer-open`; Tab 44 in the `results-loaded` walk is `number-filter-apply-refine-size`, a different control. The two walks were taken in
    fixture states with different indexer counts, and the measurement's own recorded ordinal was not re-derived against Pass 2's state — so for this one class the ordinal is a record of where the harness reached it, not a
    cross-check. (This correction pass re-reached the same element from `document.body` in a three-indexer `results-loaded` state and got Tab **42**, matching Pass 2.)
  - **Two cannot be cross-checked at all**, because they were measured in states Pass 2 never walked: `indexer-selection-checkbox` (Tab 9) needs `main.indexerSelectionAsCheckboxes = true`, which no walked state sets, and
    `additional-query-input` (Tab 11) is `disabled` until an autocomplete suggestion has been chosen, which is why it appears in neither `transient:category-tv-selected` nor any other walk. Their ordinals stand as recorded
    reach counts and are stated as such, not as corroborated ones.

  Any Tab-count in a focus audit that was taken after a `scrollIntoView` without this re-anchoring is not the control's real ordinal.
- **The harness distinguishes `:focus-visible` from `:focus` within the second pass itself, not only by the first pass's mouse-click negative control.** Nine of the ten measured reach points report
  `element.matches(":focus-visible") === true`; the tenth, the `::-webkit-calendar-picker-indicator` reached by six further `Tab` presses inside the same `<input>`, reports **`false`** — a keyboard-only path producing a
  `:focus-visible`-negative reading, which a harness that could not tell the two apart could not produce. The first pass's `search-advanced-toggle` mouse-versus-keyboard negative control stands unchanged and is not re-run.
- **A page-level attribute was set on the measured element to anchor the snapshot and the clip.** The harness sets `data-fm052-handle="1"` on the snapshot root immediately before each read and removes it before the next. No CSS
  selector in the app or in MUI matches a `data-fm052-handle` attribute, so it cannot affect any computed style; it is disclosed here because it is a DOM mutation made by the measurement. It is set from the same page-side `locate()`
  expression in both the focused and the unfocused pass, which is what proves both passes describe the same element rather than two similar ones. No repository file was modified.
- **A mouse click during `setup()` does not reset Chromium's own "sequential focus navigation starting point."** Checking a result checkbox (`locator.check()`, a real click) or clicking a `Dialog`/`Popover`/`Drawer` trigger leaves the
  browser's internal next-Tab-stop pointer anchored at the clicked element even after `document.body.focus()` is called (confirmed empirically: a `body.focus()` immediately followed by one `Tab` landed mid-page, not on the first nav
  link). The harness's fix — repeated real `Shift+Tab` presses until `document.activeElement === document.body`, used before every keyboard-reach pass that follows a mouse-driven `setup()` — is itself an application of the packet's
  own "reach a known start by Tab/Shift+Tab" requirement, not a deviation from it. For scenarios whose `setup()` opens a MUI focus trap (`Dialog`/`Drawer`/`Popover`, inside which `Shift+Tab` cycles forever and never reaches
  `document.body`), the reset was performed *before* opening the trap, and the trap's own initial-focus placement was then treated as the known start for the keyboard walk into it.
- **`ButtonBase`'s keyboard-focus ripple mounts one render cycle after the Tab keypress, via `useLazyRipple`.** A settle wait (`page.waitForTimeout(150)`) was inserted between reaching focus and reading `getAnimations`/subtree state,
  to avoid a false "no ripple" reading racing the mount. This is a harness-correctness wait for a deterministic mount event, not the animation-phase "sleeping and hoping" the packet forbids for the pulsate stills themselves — those
  were captured by setting `Animation.currentTime` directly, never by waiting an arbitrary interval and hoping to land on a particular phase.
- **`page.screenshot({clip})` coordinates are viewport-relative, and tabbing 50+ times to reach a control auto-scrolls the page.** A clip computed once (from the unfocused pass) and reused verbatim for the focused pass produced a
  blank screenshot for two classes reached late in tab order (`checkbox-row-select`, `checkbox-select-all`) because the two passes ended at different scroll positions. The fix: scroll the target element to `{block: "center", inline:
  "center"}` before measuring the box in *both* passes, keep the pair's clip **width/height** identical (computed once, from the unfocused pass), and recompute only the **x/y** offset per pass from that pass's own post-scroll
  position. `scrollIntoViewIfNeeded()` alone was tried first and rejected: it no-ops when Playwright judges an element already geometrically intersects the viewport, even when a sticky table/toolbar header is actually painted over
  it, which is what produced the first blank capture.
- **`oklch()` colors are not always converted back to `rgb()` by `getComputedStyle`** in this Chromium build (confirmed: `canvas.fillStyle = "oklch(...)"` read back unchanged, while pixel data read via `getImageData` after an actual
  `fillRect` is real sRGB). Every `oklch()` literal used in a contrast computation in this handoff (the teal `primary.main` and its alpha variants) was resolved by rendering it to a real canvas pixel and reading the composited sRGB
  back, not by parsing the authored string, and each resolved value is stated in the disposition table.
- **The `Select`/`TextField` `aria-label` set via `slotProps`/props lands on the outer `MuiInputBase-root` wrapper, not on the inner `role="combobox"` div that actually receives DOM focus** (confirmed live for both `Category` and
  `Downloader`). Reach predicates for these classes therefore match `[role="combobox"]` scoped to `.closest('[aria-label="..."]')`, and the same wrapper is used as the `snapshotHandle` so the sibling `notchedOutline` fieldset (not a
  descendant of the combobox div itself) is included in the computed-style walk — without this, the notchedOutline delta that decides several of this audit's `meets 2.4.7, fails 2.4.11` dispositions would have been invisible to the
  harness entirely.
- **The negative control was moved from `search-submit` to `search-advanced-toggle`.** Clicking `search-submit` issues a real search and moves focus into the resulting `search-status-modal` `Dialog`, so a same-element focused-vs-clicked
  comparison is impossible on that button; `search-advanced-toggle` only toggles local component state and leaves the same element focused after a click, which is what the negative control needs.
- **A saved search was created via a direct `internalapi/savedsearches` POST** (not through the UI) solely to have a row to open the "Delete saved search?" `Dialog` from, satisfying the *Dialog open* transient state. This is the same
  class of fixture substitution `configureMockIndexers`/`configureSabnzbdMock` already make for the search/downloader fixtures, not a UI shortcut around the measured control itself (the `Dialog`'s own `Cancel` button was still
  reached by real keyboard `Tab`).
- **The `checkbox-row-select` raw computed-style data also shows a residual mouse-click ripple fading out** (a `.MuiTouchRipple-childLeaving` node, left over from the `setup()`'s `locator.check()` click on that same row) alongside
  the new keyboard-triggered pulsating ripple. This is disclosed rather than mistaken for the keyboard indicator: the dispositive evidence for this class is the `getAnimations` entry naming `animation-name`s and durations
  (200ms/2500ms) that match `TouchRipple.js`'s `pulsateKeyframe`/`childPulsate` timing exactly, not the raw self-diff of background colors (which also shows an unrelated `:hover`-position artifact from the same leftover mouse
  position).

- **Two harness facts the third correction pass had to establish before it could measure anything, both recorded because either one silently produces wrong data rather than an error.** First, FM-049's recorded assumption bites
  exactly as written: driving Playwright outside `misc/run_gui_systemtest.py` needs `MOCKSERVER_INTERNAL_URL` set explicitly (the default `http://mockserver:5080` only resolves inside Docker, and the services here were started
  `--runtime local`). Without it a search completes, `search-results` renders, and **zero** result rows appear — an app defect's exact shape. Second, **`page.goto("/")` serves the legacy AngularJS UI, not React**, and the legacy UI
  carries the same `data-testid` compatibility contract, so `getByTestId("search-query")`/`("search-submit")`/`("search-results")` all resolve and the run looks healthy while measuring the wrong application. Every React
  measurement in this pass navigates via `ui/react?redirect=…`.
- **This pass created its saved-search fixture through the app's own "Save search" button after a real search, not through a synthesised `internalapi/savedsearches` POST.** A synthesised POST returns 200 but persists a row with
  `categoryName: null`, which `savedSearches.ts`'s `savedSearchSchema` (`categoryName: z.string().min(1)`) rejects, so `SavedSearchesPage` counts it as malformed and renders no row at all — the backend resolves the saved row from a
  live `searchRequestId` rather than from the posted body. **This is a discrepancy with the earlier pass's recorded method** ("A saved search was created via a direct `internalapi/savedsearches` POST (not through the UI)", above),
  whose own walk nevertheless shows a fully rendered row with an `IMDB ID` `Link`; that earlier POST must therefore have carried a real `searchRequestId`. Recorded as an observed discrepancy rather than a correction to the earlier
  attestation, since only the fixture route differs and the measured control is reached by real `Tab` either way. It is also why this pass's saved-searches walk reaches `Delete` at Tab **7** while Pass 2 reaches it at Tab **8**:
  a plain-query saved search carries no identifiers, so the row renders no `Link` and every later stop moves up one. The `Dialog` instance's Tab **2** matches Pass 2 exactly.
- **The ripple settle wait was lengthened from 150ms to 400ms for this pass.** `enterKeyframe` runs for 200ms and animates `opacity: 0 → 0.3` as well as scale, so a 150ms read can catch the ripple mid-enter: the first run of this
  pass read the `Dialog` instance's `rippleVisible` opacity as `0.272403` rather than the static `0.3`. At 400ms both sites read exactly `0.3`, which is the value every contrast figure in this audit composites at. The residual
  variation in *measured* ripple diameter between the two sites (55.51 vs 56.12 px on identical 64.00×36.50 boxes) is the pulsate scale phase (`1 → 0.92 → 1`), not a geometry difference; both are recorded in
  `fix3-derived-figures.json` beside `TouchRipple.js`'s own derived Ø 56.34, and neither changes the area verdict, since both clip to the same control box.
- **The `advanced-range-input` walk is rooted at the `MuiInputBase-root` wrapper, not at the inner `<input>`.** `advancedInputSx`'s static `1px solid` border and recessed background are declared on the wrapper, which is not a
  descendant of the focused `<input>`; a walk rooted at the `<input>` would record a delta that is empty for the trivial reason that it never contained the only thing that could have reacted. `:focus-visible` is read from
  `document.activeElement` (the `<input>`, `true`) rather than from the snapshot root. This is the same correction already applied to the `Select` classes for their sibling `notchedOutline` fieldset.

### Temporary Exceptions And Debt

- `None`.

### Registry And Documentation Updates

- `F-PLATFORM-SHELL`: `target`, `tests`, `parity`, `selectors`, and `task` (`FM-004`) are unchanged and confirmed still accurate. `gaps` gained one phrase naming the app-wide focus-indication inconsistency; `backlog.rationale` was
  extended (not replaced) to name FM-052's `ADR REQUIRED` escalation as the blocking decision, alongside the pre-existing "remaining shell parity" rationale (both are independently true and both remain outstanding). `visual` block is
  completely unchanged — no field of it was touched, no acceptance implied.
- `F-SEARCH-FORM`: `target`, `tests`, `parity`, `selectors`, and `task` (`FM-016`) are unchanged and confirmed still accurate. `gaps` gained one phrase naming the query-field/category-select 2.4.7 failure; `backlog.rationale` was
  extended alongside the pre-existing "guided tour" rationale. `visual` block completely unchanged.
- `F-SEARCH-GROUP-SELECTION`: `target`, `tests`, `parity`, `selectors`, and `task` (`FM-012`) are unchanged and confirmed still accurate. `gaps` (previously empty) gained one phrase naming the select-all checkbox's 2.4.7 failure;
  `backlog.rationale` was extended alongside the pre-existing "dedicated full-parity reconciliation" rationale. `visual` block completely unchanged.
- `F-SEARCH-MEDIA`: `target`, `tests`, `parity`, `selectors`, and `task` (`FM-025`) are unchanged and confirmed still accurate. This record declares `selectors: [additional-query, autocomplete-popup, autocomplete-option,
  season-episode-pair]`, so it owns both controls the second pass added on this route: the paired season/episode `InputBase`es (`fails 2.4.7`, by the identical `.MuiInputBase-input:focus{outline:0}` mechanism as the query field) and
  `additional-query` (`meets 2.4.7, fails 2.4.11`). `gaps` (previously empty) gained one phrase naming both; `backlog.rationale` was extended alongside the pre-existing "dedicated full-parity reconciliation" rationale, in the same
  shape as the other three records. `visual` block completely unchanged — no field of it touched, no acceptance implied, and the FM-044 supersession note it carries is not altered.
- **The seven classes added by the second correction pass changed no record's `gaps`/`backlog`, and that is a finding rather than an omission**: every one of them dispositions `meets 2.4.7, fails 2.4.11` (contrast), and the
  `Files Allowed To Modify` grant extends only to `F-PLATFORM-SHELL` and to records with a `fails 2.4.7` class. Their owning records are re-confirmed unchanged individually below —
  `refine-category-toggle`/`refine-category-option`/`number-filter-apply-button`/`results-selection-caret`/`results-expand-duplicates` under whichever record owns the refine sidebar and results table,
  `indexer-selection-more-options-button` under `F-SEARCH-INDEXERS`, and `search-history-sort-button` under `F-HISTORY-SEARCHES`/`F-HISTORY-SAVED-SEARCHES`. `F-PLATFORM-SHELL`'s existing entry already names the app-wide
  inconsistency and needed no edit for them.
- **The one class added by the third correction pass changes no record's `gaps`/`backlog` either, on the same grounds.** `saved-search-delete-button` dispositions `meets 2.4.7, fails 2.4.11` (contrast), so the outcome-driven
  grant does not reach its owning record; `F-HISTORY-SAVED-SEARCHES` is re-confirmed unchanged below, alongside the `dialog-action-button` and `stats-identifier-link` classes it already owns. Its being the app's *lowest* ripple
  figure does not make it a `gap` under `README.md`'s *Registry Rules*: a registry `gap` records a missing capability, and the capability here is present but insufficient against a Level AAA criterion, which is exactly what
  `F-PLATFORM-SHELL`'s existing app-wide entry already records. **No `FEATURES.yaml` byte changed in this correction pass**; the diff to `FEATURES.yaml` is the second correction pass's, unmodified.
- **Every other linked/measured record is confirmed unchanged, explicitly**, per `README.md`'s registry-reconciliation rule: `F-SEARCH-INDEXERS` (Indexers `Select`, `meets 2.4.7, fails 2.4.11` — not a 2.4.7 failure, no edit due),
  `F-SEARCH-DOWNLOADS` (Downloader `Select` and its open-menu option, both `meets 2.4.7, fails 2.4.11`, no edit due), `F-SEARCH-SORT-FILTER`/whichever record owns the refine sidebar and results table (`refine-filter-title-input`,
  `refine-numeric-range-input`, `refine-toggle-chip`, `checkbox-row-select`, `sort-header-button`, all `meets 2.4.7, fails 2.4.11`, no edit due), `F-STATS-SHELL` (`stats-tab`, `meets 2.4.7, fails 2.4.11`), `F-SYSTEM-NEWS`
  (`news-page-link`, `meets 2.4.7, fails 2.4.11`), `F-HISTORY-SAVED-SEARCHES` (`dialog-action-button`, `saved-search-delete-button` — the app's lowest ripple figure, but `meets 2.4.7`, so no edit due — and `stats-identifier-link`; the last is this audit's only ***meets both*** class, which is a passing result and therefore
  carries no `gaps` entry: a registry `gap` records a missing capability, and there is none here), `F-HISTORY-SEARCHES` (the eight default un-overridden `TextField` filters, the default-padding "Show user agents" `Checkbox`, the
  `::-webkit-calendar-picker-indicator` shadow stop, and the same `Link` class — every one `meets 2.4.7`, so no 2.4.7 failure and no edit due), and **`F-SEARCH-RECENT` most importantly of all — deliberately not touched.** Its
  `gaps`/`backlog` already record the recent-search Refill `IconButton`'s keyboard-unreachability (FM-049, `done`) and ADR-0012/FM-050's accepted remedy; this packet's own inventory cites that record rather than duplicating or
  re-deriving it, per *Dependency Notes*' instruction that FM-050's Follow-Up bullet — not this control again — is the authoritative history, and per the explicit prohibition on editing a `done` packet's owning record for a fact it
  already states correctly.
- **Measurement artifacts under `tests/system/visual-evidence/FM-052/` (git-ignored via `tests/.gitignore:33`; 102 files).** 90 PNGs — a `<class>-focused.png`/`<class>-unfocused.png` pair at `deviceScaleFactor: 2` for each of the 43
  measured classes (44 pairs: `saved-search-delete-button` has one for each of its two grounds, `saved-search-delete-button-*.png` and `dialog-delete-button-*.png`), plus `recent-searches-trigger-ripple-scale-1.png` and `-ripple-scale-0.92.png` — for: `additional-query-input`, `advanced-range-input`, `bulk-action-secondary-button`, `checkbox-row-select`, `checkbox-select-all`,
  `dialog-action-button`, `display-options-checkbox`, `downloader-select`, `downloader-select-open-option`, `indexer-selection-checkbox`, `indexer-selection-preset-button`, `migration-placeholder-switch-button`,
  `mobile-nav-hamburger-iconbutton`, `nav-listitembutton`, `news-page-link`, `recent-search-entry`, `recent-searches-trigger`, `refine-filter-title-input`, `refine-numeric-range-input`, `refine-sidebar-drawer-close-button`,
  `refine-toggle-chip`, `search-advanced-toggle`, `search-category-select`, `search-indexers-select`, `search-query-input`, `search-submit`, `season-episode-paired-input`, `sort-header-button`, `stats-history-checkbox`,
  `stats-history-datetime-input`, `stats-history-datetime-picker-indicator`, `stats-history-select`, `stats-history-text-input`, `stats-identifier-link`, `stats-tab`, and the seven added by the correction pass —
  `indexer-selection-more-options-button`, `number-filter-apply-button`, `refine-category-option`, `refine-category-toggle`, `results-expand-duplicates`, `results-selection-caret`, `search-history-sort-button`; and the one added by
  the third correction pass — `saved-search-delete-button` (plus its second-ground pair `dialog-delete-button`). Plus 12 JSON artifacts: `pass1-source-census.json`,
  `pass2-runtime-sweep.json`, `pass2-reached-classes.json`, `delta-omitted-classes.json`, `delta-fails-2-4-7-classes.json`, `notchedoutline-geometry-probe.json`, `computed-figures.json`, `fix2-measured-classes.json`,
  `ripple-currentcolor-probe.json`, `fix2-derived-figures.json`, `fix3-measured-classes.json` and `fix3-derived-figures.json` (contents described under *Raw evidence
  preserved alongside the captures*). This directory is deliberately task-scoped rather than an `F-<FEATURE>/` one, so none of it can be mistaken for an ADR-0006 feature baseline, and none of it enters the tracked diff.
- For ADR-0006 visual records: no record's `applicability`, `status`, scoped states/viewports/geometry, evidence/snapshots, or variance disposition changed for any of the four touched records or any other record. All four touched
  records stay `visual.status: proposed` with human acceptance still outstanding and un-re-dated. No behavioral or accessibility gate was implied by visual evidence, and no visual or accessibility gate was implied by the other: this
  measurement is behavioral/accessibility evidence only.

### Follow-Up Work

- **`ADR REQUIRED`** (this task's own escalation) — see below. This is the load-bearing follow-up; a remedy packet cannot be designed until it resolves. **Coordinator note (2026-08-19): it resolved** — ADR-0013, accepted, Option A.
  The remedy packet is now designable and is deliberately still uncreated; it belongs to a later task designer, not to this packet.
- **The raw computed-style walks for the twenty-five first-pass classes were not reconstructed.** The ten `ButtonBase` ripple classes are dispositioned on `getAnimations` output rather than on a style delta, and re-deriving the
  transient states of the remaining fifteen would have re-taken evidence an independent review has already checked. Anyone specifying the remedy against literal values will have **all five** `fails 2.4.7` walks (three in
  `delta-fails-2-4-7-classes.json`, `season-episode-paired-input` in `delta-omitted-classes.json`, `advanced-range-input` in `fix3-measured-classes.json`), all ten second-pass walks, the seven second-correction-pass walks and
  the third pass's, all in JSON, plus the first pass's numbers in the table above; they will not have the first pass's per-property walks. Recorded as a limit, not as a task.
- **`downloader-select-open-option`'s unfocused comparator is the closed trigger** (byte-identical PNG; see the Downloader section). Re-capturing an unfocused `MenuItem` inside an open menu would improve the human-judgeable evidence
  for that one class. It changes no disposition — computed styles decide them — so it is not raised as a defect.
- **One ripple instance has no `currentColor` of its own on record**: `ToastProvider`'s implicit `Alert onClose` `IconButton`, because no measured state renders a closeable toast. It is named where it appears rather than folded
  silently into a family average. Recorded as a limit, not as a task. (`dialog-action-button` was the second such instance until the third correction pass rebuilt the saved-search `Dialog` fixture and read it live; its
  source-derived 1.83:1 reproduced exactly.)
- **None** beyond those and the escalation. This packet found no defect small enough for `/fm-quickfix` and out of its own scope: every finding here either feeds directly into the `ADR REQUIRED` decision (the focus-indication
  mechanisms themselves) or is a registry-recorded 2.4.7 gap awaiting that same decision. No proposed task packet is created, per the packet's explicit prohibition on designing or naming the remedy.

### `ADR REQUIRED`

**Coordinator note (2026-08-19): resolved by ADR-0013, accepted, Option A — an explicit focus-ring token authored per control family.** Everything below this line is the implementer's attested escalation as it stood at handoff and is
not edited: it is the evidence the proposal was built from, and its three options are the set the implementer derived, not the set the owner chose between. Read ADR-0013 for the option space actually decided and for the constraints the
remedy inherits. One correction the proposal established and this section predates: the owner's choice was expressed against a coordinator-side lettering in which "c" meant *a single focus-ring token* — that is ADR-0013's **Option A**,
and it is the opposite of ADR-0013's own Option C ("accept the measured gap, no remedy"), which was **not** chosen.

**Decision question** (carried verbatim from the packet, as instructed). The React UI renders keyboard focus through several different MUI mechanisms, at least one of which renders nothing at all. What single, consistent
focus-indication approach should the application adopt, and what does each control family render under it?

*(The packet wrote "at least one of which renders nothing at all" before the measurement. It is confirmed: five classes render nothing. The measurement also found something the question did not anticipate — one family that already
renders the authored rule correctly and passes both criteria — which is carried into the mechanism list and the options rather than left out of the framing.)*

**What the measurement found, to place the decision.** **Seven** distinct mechanisms are in play today, verified against installed MUI 7.3.9 source and real computed styles. Five of them defeat, partially defeat, or replace theme.ts's
authored `:focus-visible{outline:3px solid currentColor; outline-offset:3px}` rule; a sixth is not the app's to author at all (Chromium's own UA focus ring on a shadow sub-control). **The seventh does not defeat the rule, and
it passes both criteria** — the app already contains a working instance of what the second option below proposes to generalise:

1. **`ButtonBase`'s unconditional root `outline:0`** (specificity 0,1,0, but wins by stylesheet insertion order over the equally-specific global rule) defeats every `Button`/`IconButton`/`Tab`/`Checkbox`/`Radio`/`Switch`/`MenuItem`/
   `ListItemButton` in the app. Where `focusRipple` defaults `true` and is not disabled (`Button`, `IconButton`, `Tab`, and `SwitchBase`-derived controls without `disableRipple`), a pulsating `TouchRipple` is the actual indicator —
   real, animated, and well under 3:1 everywhere — but **the range is `1.19:1` to `2.38:1`, not the `≈1.76–1.83:1` this paragraph asserted before the ripple family's `currentColor` was read per instance, and not the `1.40:1`
   floor the second correction pass reported either.** The `≈1.76–1.83:1` figure assumed `currentColor` is either the brand teal or a contained button's dark `contrastText`; it is neither for a third of the family, because
   feature-local `sx` overrides set it. The `1.40:1` floor was measured, but it was taken before the `Button color="error"` rendering on `/stats/saved-searches` was recognised as its own class, and that rendering is lower at
   both of its sites.

   **The count, reconciled to one basis, because three different numbers were in circulation.** The ripple family comprises **37 instance-and-state figures**, not 37 controls — the table below groups them by contrast, so one
   of its rows may carry several. **34** of the 37 were read live —
   **29** across the 8 states `ripple-currentcolor-probe.json` covers, and **5** by `fix3-measured-classes.json` (the `color="error"` Delete in each of its two grounds; the `Dialog`'s `Cancel`, whose `currentColor` had
   previously been source-derived; `search-advanced-toggle` in its expanded state; and the compact mobile `refine-sidebar-toggle`) — and the remaining **3** are derived by re-compositing an already-probed instance's own
   `currentColor` over a second *measured* ground (`refine-category-option` un-hovered, `checkbox-row-select` checked, `indexer-selection-checkbox` on `background.paper`). The earlier "31 instances across 8 states" counted probe
   entries and derived rows inconsistently and is withdrawn; the
   probe file itself holds 30 entries, of which 29 are ripple instances and one is the non-ripple `::-webkit-calendar-picker-indicator` pseudo-element readout. **One** `ButtonBase` ripple instance still has no `currentColor`
   on record at all and is named where it appears: `ToastProvider`'s implicit `Alert onClose` `IconButton`, because no measured state renders a closeable toast.

   | Ripple contrast | Instances (each figure is that instance's own `currentColor` at `rippleVisible` opacity 0.30 over its own composited backdrop) |
   |---|---|
   | **1.19:1** | `saved-search-delete-button` in the delete-confirmation `Dialog` — `palette.error.main` `#a33938` on `background.paper`. **The measured floor.** |
   | 1.22:1 | `saved-search-delete-button` in the saved-searches table row — the same `#a33938` on `background.default` |
   | 1.40:1 | `refine-category-toggle`, `refine-indexer-toggle`, `refine-sidebar-toggle` (docked `«`/`»` only) — `sectionLabelColor` `#6b7472` on `background.default` |
   | 1.51:1 | `sort-header-button` — `HEADER_LABEL_COLOR` `#7c8483` |
   | 1.68:1 | `display-options-checkbox` (unchecked) |
   | 1.73:1 | `checkbox-row-select` (unchecked), `stats-history-checkbox` (unchecked), `results-selection-caret` |
   | 1.76:1 | `search-submit`, `migration-placeholder-switch-button` — the two `contained` buttons, dark `contrastText` on teal |
   | 1.81:1 | `search-advanced-toggle` **expanded** — `primary.main` on `controlSurface` (the same control renders 2.19:1 collapsed) |
   | 1.83:1 | `recent-searches-trigger`, `refine-toggle-chip` (unpressed), `refine-sidebar-drawer-close-button`, `indexer-selection-checkbox` (checked), `dialog-action-button` (read live by the third correction pass; no longer source-derived) |
   | 1.86:1 | `stats-tab`, `download-nzb`, `number-filter-apply-button`/`-clear`, `search-history-sort-button` and its whole stock-`Button` class, `results-expand-duplicates`, `checkbox-row-select` (checked) |
   | 1.92–1.95:1 | `refine-clear-all` (docked / in the `Drawer`), `refine-toggle-chip` (pressed), `refine-category-option` (unpressed, over its own measured ground; 1.97:1 over an un-hovered one) |
   | 2.08:1 | `bulk-action-secondary-button`, `display-options-toggle` |
   | 2.19:1 | `search-advanced-toggle` **collapsed**, `indexer-selection-preset-button`, `indexer-selection-more-options-button` — `text.primary` on `controlSurface` |
   | 2.22:1 | `mobile-nav-hamburger-iconbutton` |
   | 2.26:1 | `refine-sidebar-toggle` **compact** (the mobile "Refine" `Button`) — `text.primary` on `background.default`; the same `data-testid` as the 1.40:1 docked toggle, a different rendering |
   | **2.38:1** | `refine-category-option`, `refine-indexer-option` (pressed — the state a fresh results view renders them in). **The measured ceiling.** |

   (`Previous page`/`Next page` on `/stats/searches` probe at 1.32:1, but they are `disabled` in every walked state and a disabled `Button` is not a Tab stop, so they set no floor.) **Area is not the problem for this mechanism
   anywhere**: every measured ripple clears its own `2 × perimeter` threshold by between 2.4× and 9×. Where `focusRipple`/ripple is disabled (`checkbox-select-all`, the app's one `disableRipple` instance) or no
   `&.Mui-focusVisible` rule exists for the component (`Checkbox`/`SwitchBase`/`IconButton` define none), **nothing renders at all**.
2. **`InputBase`'s `.MuiInputBase-input:focus{outline:0}`** (specificity 0,2,0, wins outright) defeats the same global rule for the bare query/range fields **and**, non-obviously, for every `Select` trigger too (`Select`'s `role=
   combobox` div carries the shared `MuiInputBase-input` class) — a finding this audit's own initial source-only reading of `SelectInput.js` got wrong before checking the live computed classList and CSS rule text.
3. **`OutlinedInput`'s focused `notchedOutline` border** (`&.Mui-focused .notchedOutline{borderWidth:2}` plus a per-color variant rule for `borderColor`) is the mechanism that renders the highest-contrast results in the app —
   measured **3.15:1 to 5.56:1**, every one of them **passing** the 3:1 axis, with the app's own local overrides sitting at the *top* of that range and MUI's stock un-overridden rendering at the bottom. Every measured instance
   nonetheless fails 2.4.11 on **area** under this packet's convention figure, by **16.00 px²**: a uniform 2px ring inset in a box has area `perimeter×2 − 16`, always exactly 16.00 px² short of a `perimeter×2` threshold, at every
   control size (confirmed identically on seven differently-sized controls, from 46×56 to 1164×40). **That margin is 1.9% of the smallest such control's threshold, and it is a modelling artefact as much as a finding**: measured
   directly, the fieldset that paints the ring is 5.00 px taller than the control box, so the two unlabelled fields in the family come out **4.00 px² above** the threshold and the labelled ones 70–250 px² below it, the difference
   being the width of the label notch cut out of the focused top border. An outset ring of the same thickness would clear the threshold outright at any size. This mechanism is the one whose "failure" the owner should weigh most
   sceptically. Where a local override sets `border: "none"` (the search-form category select only), it is suppressed entirely and the control drops to `fails 2.4.7`.
4. **`MenuItem`/`ListItemButton`'s `&.Mui-focusVisible{background-color: palette.action.focus}`** renders a real but very low-contrast (**1.46:1**) background tint; the compound `Mui-selected` variant of the same rule (the open
   `Select` menu's currently-chosen option) renders a teal-tinted version at **1.73:1** — still failing.
5. **A bare, unclassed native `<a href>`** (runtime-only content from sanitized third-party HTML, not a MUI `Link`) renders theme.ts's global rule completely undefeated, and still fails 2.4.11 on contrast (**1.29:1** against
   the ground sampled from its own capture; the 1.67:1 first reported here used a hand-chosen backdrop) — not because
   of the rule, but because `currentColor` for this element is the UA's default link blue `rgb(0,0,238)`, which the app never overrides for sanitized third-party HTML and which is low-luminance against the dark palette.
6. **Chromium's own UA focus ring on a UA shadow sub-control** — the `::-webkit-calendar-picker-indicator` inside each `type="datetime-local"` filter (`/stats/searches`). No repository file and no MUI rule touches it;
   Chromium paints a 2.00 px ring in its light-scheme `outline-color: auto` value `srgb(16,16,16)`, measured from the captures at **144.00 px²** and **1.21:1** against the field's own dark ground. It is the only mechanism the
   app does not author, the only one `getComputedStyle` cannot read (the pseudo-element query returns the host `<input>`'s styles), and the only one whose evidence of record is a capture pair rather than a computed-style delta.
   It bears on the decision only as a boundary: no option below reaches it without setting `color-scheme` or restyling a UA pseudo-element, neither of which any option here proposes.
7. **MUI `Link` with `component="a"`** renders theme.ts's global rule undefeated **and passes both criteria**: `912.00 px²` against a `536.00 px²` threshold, and **7.34:1** contrast. `Link.js` gates both its `outline: 0` reset and
   its `&.MuiLink-focusVisible{outline: 'auto'}` inside a single `variants` entry keyed `props: {component: 'button'}`; both app call sites (`SavedSearchesPage.tsx:204`, `SearchHistoryPage.tsx:521`) pass `href` and take the default
   `component = 'a'`, so neither rule fires, and `theme.ts` declares no `MuiLink` override. The difference between this and mechanism 5 is **only the colour**: `Link`'s default `color = 'primary'` makes `currentColor` the brand teal
   `rgb(85,194,188)` instead of UA link blue. Same rule, same geometry, same offset — a palette-aware `currentColor` and it clears both axes with margin.

**One control family in the measured set achieves `meets both` today under this packet's primary (convention) reading: the MUI `Link` (mechanism 7). Under the measured ring geometry the packet also records, three classes
do** — the same `Link`, plus the two unlabelled `notchedOutline` fields `refine-filter-title-input` and `refine-numeric-range-input` (5.56:1 contrast, measured ring **+4.00 px²** over threshold each). Every other family fails
2.4.11 on contrast, on area, or both, and **five** classes fail 2.4.7 outright. The `Link` instance is a live, in-repository demonstration that the app's *existing authored rule* is sufficient wherever it is (a) not defeated
and (b) inherited by an element whose colour is a palette colour rather than a UA default — which is precisely the scope of the second option below, and the reason that option is not merely the cheap one. The two flipping
`notchedOutline` fields are a second, independent demonstration that part of the "fails on area" verdict is modelling: the owner should weigh both readings, and this packet states both wherever either appears.

**Options.** Derived from the mechanisms actually measured above, one per coherent strategy; the repository owner decides, and none is recommended here.

1. **A single, explicit focus-ring token applied per control family**, overriding whichever of the six mechanisms above currently governs each family (e.g., a shared `sx`/`styleOverrides` outline or box-shadow rule keyed to each
   component's own `&.Mui-focusVisible`/`:focus-visible` selector, tuned to clear both the area and 3:1-contrast thresholds this audit measured). Changes every control family's rendered focus indicator app-wide — a real,
   user-observable visual change needing fresh ADR-0006 human acceptance for each affected feature record's `visual` contract.

   **Its own advantage, stated so this list is not costs-for-one and benefits-for-another.** It is the only option that reaches every measured failure by construction, including the two the audit found that a precedence fix
   alone does not touch: the classes whose `currentColor` is a local `sx` value rather than a palette colour (`sort-header-button` at 1.51:1, the three `sectionLabelColor` toggles at 1.40:1, `results-selection-caret` at
   1.73:1 — a third of the ripple family), the `contained` buttons whose `currentColor` is dark-on-teal by design (1.76:1), and `saved-search-delete-button`, whose `currentColor` is the palette's own `error.main` and is the family's floor at 1.19:1/1.22:1. An explicit token is specified once and audited once against the numbers in the tables above,
   rather than per family against whatever `currentColor` happens to resolve to; and because it is authored on each component's own `&.Mui-focusVisible`/`:focus-visible` selector it does not depend on winning a specificity or
   insertion-order fight with MUI's own resets, which is the mechanism that defeated the existing rule in the first place.

   Cost: touches `theme.ts` (out of this packet's scope, in scope for the remedy) and potentially every
   feature-local `sx` override that currently suppresses or recolors a `notchedOutline`/ripple; the literal rendered value for each family would need to be specified and screenshotted as part of that remedy's own evidence.
2. **Restore the global `:focus-visible` outline's precedence** (e.g., raise its specificity, or `!important`, or move the defeating component rules to opt back in per-family) so the *existing* authored rule — `3px solid
   currentColor`, offset 3px — actually renders everywhere it is currently defeated, without introducing a second token.

   **This option has a working precedent in the repository, and the audit's numbers should be read with that in front of them.** `stats-identifier-link` is this strategy already in effect on one control family: the global rule
   undefeated, `currentColor` resolving to a palette colour, measured at **7.34:1 contrast and 912.00 px² against a 536.00 px² threshold — passing both**. Geometrically the option is strong everywhere, not just there: a 3px outline
   drawn at a 3px offset has area `6(w+h) + 108` against a `4(w+h)` threshold, which **exceeds the threshold at every control size** (by 108 px² at `w+h → 0`, and by more as the control grows) — so unlike the `notchedOutline` ring
   it has no area problem at all, inset-versus-outset or otherwise, and unlike the ripple it does not depend on an animation being observed.

   What it does **not** fix by itself is `currentColor` wherever the measured `currentColor` is insufficient against its own ground — which is not only the non-palette cases. Measured: `news-page-link` inherits the UA default link
   blue and comes out at **1.29:1**; `search-query-input`'s `<input>` carries `rgb(214,218,217)`; a `contained` `Button`'s `currentColor` is its dark `contrastText` on its own teal ground; and `saved-search-delete-button`'s
   `currentColor` **is** a palette colour — `palette.error.main` `#a33938` — and is nonetheless this audit's lowest ripple figure at **1.19:1**/**1.22:1**, because that token is low-luminance against the dark palette. The
   generalisation "a palette colour is enough" holds for the teal, not for the whole palette. Each of those needs an explicit `outline-color` (or a `currentColor`-bearing colour decision per family) on top of the
   precedence fix — the same class of work option 1 requires, but scoped to the families where the measured `currentColor` is not already sufficient rather than to all of them. Cost: one rule's precedence plus a per-family colour
   audit against the numbers in the table above; still needs fresh ADR-0006 acceptance wherever a control's focus appearance visibly changes (most of them, since a 3px outset ring where there is currently a ripple or nothing is a
   large visible change).
3. **Leave the mechanisms as they are and accept the WCAG gap as recorded**, closing this decision without a remedy task. Costs nothing today; leaves five classes failing 2.4.7 (a Level AA failure, not merely inconsistent) on the
   record indefinitely, and leaves the owner's own reported inconsistency unaddressed. It is worth weighing against two measured facts rather than against the bare headline: the `notchedOutline` family's only failure is a 16.00 px²
   area margin under a modelling convention its own measured geometry does not reproduce — and read against that measured geometry two of that family's own fields join the MUI `Link` in passing both criteria, so **three** classes
   pass under the measured reading and one under the convention reading. "The app fails everywhere" is not what was measured. Cutting the other way, and stated with the same weight: the ripple that indicates focus on most of
   the app's buttons measures **1.19:1 at its floor** (the `color="error"` Delete inside the delete-confirmation `Dialog`; 1.22:1 for the same rendering in the table row, and 1.40:1 for the three `sectionLabelColor` toggles below the rest of the family), and five classes render nothing at all. Only the repository owner can choose this.

**None of the three is recommended, and none is eliminated.** Option 3 is listed with the same seriousness as the others; the two caveats added above cut in its favour as much as against it, which is exactly why they belong in the
option list rather than in a footnote.

**Affected work.** No existing packet. The remedy is a later task packet that does not exist yet and that this task must not create.

Use `templates/review.md` after the implementation handoff. A fresh reviewer records the review before the coordinator may mark the task `done`.

The reviewer's obligations here: confirm the inventory was derived by both passes and that the runtime pass really visited every route in `router.tsx`; confirm every measurement was keyboard-reached and that the mouse-click negative
control genuinely differs, rather than being asserted; confirm the disposition rule is WCAG's as written and was applied uniformly, with numbers rather than adjectives, including to classes whose result flatters the current code;
confirm the captures are 12px-padded pairs of identical geometry and that any use of `prepareVisualEvidence()` is disclosed; confirm `theme.ts` and all of `core/ui-react` are byte-identical to baseline and no `data-testid` changed; and
confirm no option in the escalation was chosen, prototyped, or recommended by elimination. A reviewer may not accept or re-date any ADR-0006 acceptance.

**After the correction pass, four further obligations.** (1) Re-run the Pass 1 census script's logic independently and confirm the per-component counts and `file:line` sites in `pass1-source-census.json` — the whole correction exists
because the first inventory's counts were wrong, and a reviewer who accepts them by reading has repeated the failure. (2) Check the union: every `Mui<Component>-root` group in `pass2-reached-classes.json` should appear in the
disposition table, under one of the four headings (fully measured, cited by identical mechanism, keyboard-unreachable, not focusable) — nothing may simply be absent. (3) Independently verify the `Link` finding at source, since it
inverts the headline: `node_modules/@mui/material/Link/Link.js` gates both `outline: 0` and `&.MuiLink-focusVisible{outline:'auto'}` inside the single `props: {component: 'button'}` variant, both call sites pass `href` with no
`component`, and `theme.ts` has no `MuiLink` override. (4) Confirm the two area figures per `notchedOutline` class are both stated and that the convention figure is used consistently for every disposition — the point of stating both
is that the owner sees the margin, not that the audit chose whichever reading suited it.

**Coordinator note (2026-08-19): one deviation from the review discipline above, recorded rather than omitted.** This packet went through **three** independent review rounds and two correction passes. The third review raised a single
required finding — the `Button color="error"` Delete rendering measured at 1.19:1 (`Dialog`) and 1.22:1 (table row), below the 1.40:1 the audit then stated as the ripple family's floor, and miscited as belonging to a 1.86:1 group. That
finding was closed by direct re-measurement (`fix3-measured-classes.json`, `fix3-derived-figures.json`, and the `saved-search-delete-button`/`dialog-delete-button` capture pairs) and the headline range was corrected to **1.19:1 –
2.38:1** — but **without a fourth independent review pass**. The coordinator's judgement was that the correction budget was spent and that the finding changed no disposition: the class dispositions `meets 2.4.7, fails 2.4.11` before and
after, only the cited figure moved, and it moved in the direction unflattering to the current code. The consequence is stated plainly so a later reader can weigh it: **the final correction is attested by measurement, not by an
independent reviewer.** Anyone specifying the remedy against literal values should re-measure that family rather than inherit its figures on trust.
