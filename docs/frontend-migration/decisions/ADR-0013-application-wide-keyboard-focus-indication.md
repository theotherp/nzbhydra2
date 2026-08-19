# ADR-0013: How The React UI Indicates Keyboard Focus, Application-Wide

Status: accepted (2026-08-19) — **Option A**: an explicit focus-ring token, authored per control family, keyed to each component's own `&.Mui-focusVisible`/`:focus-visible` selector in `theme.ts`.

## Decision Question

The React UI renders keyboard focus through several different MUI mechanisms, at least one of which renders nothing at all. **What single, consistent focus-indication approach should the application adopt, and what does each control
family render under it?**

The question is carried verbatim from `tasks/FM-052-keyboard-focus-indication-audit.md`, which raised it. FM-052 wrote "at least one of which renders nothing at all" before measuring; the measurement confirmed it and sharpened it in
both directions. **Five** control classes render nothing at all. And the measurement found something the question did not anticipate: **one family already renders the app's own authored rule correctly and passes both criteria**, which
is carried into the mechanism list and into the options below rather than left out of the framing.

This is not a task-local presentation detail. It decides what `core/ui-react/src/app/theme.ts` — the app's single shared styling boundary — asserts about focus for every interactive control in the application; it spans 43 measured
control classes across at least four feature records; it decides whether the project treats a measured Level AA (WCAG 2.4.7) failure as a defect or as an accepted gap, which is project-wide quality policy; and under **ADR-0006** the
appearance change every remedy produces can only be accepted by the repository owner. No agent may choose it.

## Context And Evidence

Every repository claim below was re-verified first-hand against the working tree at baseline `652f13d5e5ba0abffaafcdef8eee2fe76e2f3978` (branch `newUi2026`). Measured figures are cited from FM-052 rather than re-derived, per the
audit's standing; where this proposal derived something itself it says so explicitly and marks it as unverified in a browser. Installed MUI sources are cited by symbol name and quoted text, never by line number — `node_modules`
coordinates rot between installs, the failure mode FM-047 hit.

### Where the evidence comes from, and how far it can be leaned on

FM-052 (`Status: blocked`, `ADR REQUIRED`) measured **43 control classes** in Chrome for Testing `151.0.7922.34` (Playwright `1.62.1`, `@mui/material` `7.3.9`, Node `v26.7.0`) against a real JVM backend plus mockserver — not a dev
server and not jsdom. Every class was **reached by real `Tab`/`Shift+Tab` keypresses** from a known start, never by `locator.focus()` and never by `click()`; `element.matches(":focus-visible")` is recorded for each; a
mouse-versus-keyboard negative control on `search-advanced-toggle` demonstrates the harness distinguishes `:focus-visible` from `:focus`. Each class carries a whole-subtree focused/unfocused computed-style delta (element, every
descendant, `::before`/`::after`, ripple nodes, `getAnimations`) and a `deviceScaleFactor: 2` capture pair clipped to the control box expanded 12px on every side.

The evidence lives in the git-ignored `tests/system/visual-evidence/FM-052/` (90 PNGs, 12 JSON artifacts) and contributes nothing to the tracked diff. It survived three independent reviews and two correction passes; an independent
reviewer reproduced the Pass 1 source census with its own scanner, recomputed every headline contrast figure, re-derived the whole ripple family from the probe data, and confirmed two findings pixel by pixel. `core/ui-react` is
byte-identical to baseline (SHA-256 match on `theme.ts`, empty `git diff -- core/ui-react`); nothing was remedied, by design.

Its limits, stated because they bound what this decision can rest on: the raw per-property walks for the twenty-five first-pass classes were not reconstructed (their numbers were re-derived from live probes, their per-property diffs
were not); `downloader-select-open-option`'s unfocused capture is the closed trigger; and one ripple instance (`ToastProvider`'s implicit `Alert onClose` `IconButton`) has no `currentColor` on record because no measured state renders
a closeable toast. None of the five 2.4.7 failures rests on any of those limits — all five have a raw whole-subtree walk of record.

### What the application authors today

`core/ui-react/src/app/theme.ts:181-252` is the app's entire component-styling surface, and it is short. Its `components` block declares exactly five entries: `MuiCssBaseline`, `MuiButton` (`textTransform: "none"`, `borderRadius: 8`
— **nothing touching colour, outline, or ripple**), `MuiPaper`, `MuiOutlinedInput` (`borderRadius: 8`), and `MuiChip`. There is **no** `MuiButtonBase`, `MuiLink`, `MuiInputBase`, or `MuiCheckbox` override of any kind.

The only focus rule the application authors anywhere is in `MuiCssBaseline`, at `theme.ts:184-187`:

```ts
":focus-visible": {
    outline: "3px solid currentColor",
    outlineOffset: "3px",
},
```

That single rule is what the whole decision turns on: it is well-formed, it is app-wide, and it is defeated nearly everywhere it would matter.

### The seven mechanisms actually in play

Verified by FM-052 against installed MUI 7.3.9 source and against live computed styles. Five defeat, partially defeat, or replace the authored rule; one is not the app's to author at all; the seventh renders it undefeated and passes.

1. **`ButtonBase`'s unconditional root `outline: 0`** — specificity 0,1,0, equal to the global rule's, winning by stylesheet insertion order. Defeats the outline on every `Button`/`IconButton`/`Tab`/`Checkbox`/`Radio`/`Switch`/
   `MenuItem`/`ListItemButton`. Where `focusRipple` resolves `true` (it **defaults to `false` on `ButtonBase` itself**, and is passed by `Button`, `IconButton`, `Tab`, and `SwitchBase`-derived controls unless `disableRipple`), the
   actual indicator is a pulsating `TouchRipple`. **Measured range: `1.19:1` to `2.38:1`** against a 3:1 requirement — 37 instance-and-state figures, **34 read live**, 3 re-composited from an already-probed instance's own
   `currentColor` over a second measured ground. Floor: the `Button color="error"` Delete inside the delete-confirmation `Dialog` (`SavedSearchesPage.tsx:170`), `palette.error.main` `#a33938` on `background.paper` = **1.19:1**; the
   same rendering in the table row = 1.22:1. Ceiling: `refine-category-option` pressed = **2.38:1**. **Area is never the problem for this mechanism** — every measured ripple clears its own `2 × perimeter` threshold by 2.4× to 9×.
   Where the ripple is disabled or absent, **nothing renders at all**: `Checkbox`/`SwitchBase`/`IconButton` define no `&.Mui-focusVisible` rule (confirmed by source grep, zero matches).
2. **`InputBase`'s `.MuiInputBase-input:focus { outline: 0 }`** — specificity 0,2,0, winning outright regardless of order. Defeats the global rule for the bare query/range/paired fields **and, non-obviously, for every `Select`
   trigger**, because the `role="combobox"` div carries the shared `MuiInputBase-input` class. FM-052's own initial source-only reading of `SelectInput.js` got this wrong before checking the live computed class list.
3. **`OutlinedInput`'s focused `notchedOutline` border** (`&.Mui-focused .notchedOutline { borderWidth: 2 }` plus a per-colour variant rule) — the app's highest-contrast results, measured **3.15:1 to 5.56:1**, every one **passing**
   the 3:1 axis. Every instance nonetheless fails 2.4.11 on **area** under FM-052's uniform-ring convention, by exactly **16.00 px²** at every control size (a 2px ring inset in a box has area `2 × perimeter − 16`). That margin is a
   modelling artefact as much as a finding — see *One class passes, or three* below.
4. **`MenuItem`/`ListItemButton`'s `&.Mui-focusVisible { background-color: palette.action.focus }`** — a real but very low-contrast (**1.46:1**) tint; the compound `Mui-selected` variant (an open `Select`'s chosen option) renders a
   teal-tinted version at **1.73:1**.
5. **A bare, unclassed native `<a href>`** — runtime-only sanitized third-party HTML in `NewsPage`'s `SafeRichContent`. Nothing resets its outline, so the global rule renders **undefeated** — and still fails on contrast at
   **1.29:1**, not because of the rule but because `currentColor` here is the UA default link blue `rgb(0,0,238)`.
6. **Chromium's own UA focus ring on a UA shadow sub-control** — the `::-webkit-calendar-picker-indicator` inside each `type="datetime-local"` filter. No repository file and no MUI rule touches it; 2.00 px of
   `srgb(16,16,16)`, **144.00 px²**, **1.21:1**. It bears on this decision only as a boundary: no option below reaches it without setting `color-scheme` or restyling a UA pseudo-element, and none proposes to.
7. **MUI `Link` with `component="a"`** — renders the global rule **undefeated and passes both criteria**: **912.00 px²** against a **536.00 px²** threshold and **7.34:1** contrast. `Link.js` gates *both* its `outline: 0` reset and
   its `&.MuiLink-focusVisible { outline: 'auto' }` inside a single `variants` entry keyed `props: {component: 'button'}`; both call sites (`SavedSearchesPage.tsx:204`, `SearchHistoryPage.tsx:521`) pass `href` and take the default
   `component = 'a'`, so neither rule fires, and `theme.ts` declares no `MuiLink` override. **The only difference between this and mechanism 5 is the colour**: `Link`'s default `color = 'primary'` makes `currentColor` the brand teal
   `rgb(85,194,188)` instead of UA link blue. Same rule, same geometry, same offset.

### The five outright failures (WCAG 2.4.7, Level AA)

An empty focused/unfocused delta across the whole recorded subtree, or a real delta painting on an `opacity: 0` layer. This is a plain Level AA failure, not a matter of taste, and it does not depend on either area reading:

| Class | Site | Why nothing renders |
|---|---|---|
| `search-query-input` | `SearchWorkspace.tsx:376`, `:418` (`queryInputSx`) | Bare `InputBase`; mechanism 2 defeats the outline; the static-bordered wrapper `Box` does not react to focus. |
| `advanced-range-input` | `SearchWorkspace.tsx:958` (`advancedInputSx`, sx at `:99-108`) | Same defeat, a distinct rendering: a recessed background and a **static, non-focus-reactive** 1px border. |
| `season-episode-paired-input` | `SearchWorkspace.tsx:539`, `:563` (`pairedInputSx`, sx at `:87-97`) | Same defeat, a third rendering that declares **no border at all** and has no wrapper — nothing exists that could react. |
| `search-category-select` | `SearchWorkspace.tsx:462`, sx at `:480-482` | Mechanism 2 **plus** `"& .MuiOutlinedInput-notchedOutline": {border: "none"}`, which forces `border-width: 0px` in both states, so the `borderColor` that does change never paints. |
| `checkbox-select-all` | `SearchResults.tsx:1732-1746` | The app's only `disableRipple` (`:1735`), so no ripple mounts; no component in the `Checkbox`/`SwitchBase`/`IconButton` chain defines a `&.Mui-focusVisible` rule; and the one property that *does* change — the native `<input>`'s own `outline-style: none → solid` — paints on a **fully transparent overlay**, while every visible sibling is unchanged. |

Note what the last row means structurally: for that control the global rule already **wins uncontested**. Its failure is not a precedence failure.

`SearchWorkspace.tsx:480-482` is the clearest instance of the general hazard: local restyling deleted an affordance outright. Removing the resting border removed the focused one with it, and nothing in the codebase records that the
second consequence was intended.

### One class passes, or three — both readings, neither the sole truth

- Under the **convention** reading FM-052 uses as its primary disposition (changed area modelled as a uniform 2px ring inset in the control box), exactly **one** class passes both axes: `stats-identifier-link` (mechanism 7), at
  **7.34:1** and **912.00 px² against a 536.00 px² threshold**.
- Under the **measured** ring geometry FM-052 also records (MUI positions the `notchedOutline` fieldset at `top: -5px`, so it is 5.00 px taller than the control box, minus the focused label notch), **three** classes pass: the same
  `Link`, plus the two *unlabelled* `notchedOutline` fields `refine-filter-title-input` and `refine-numeric-range-input` — both **5.56:1**, both with measured rings **+4.00 px²** over threshold. Their focused captures show a
  complete, unbroken 2px teal ring; nothing about them is marginal to look at.

FM-052 keeps the convention primary for comparability of the `notchedOutline` family with itself, and explicitly withdraws an earlier claim that the convention was applied uniformly across all classes — it was not, and could not be
(ripples are dispositioned on measured ripple diameter, fills on measured fill area, outlines on real outline geometry). What *is* uniform across every class is the **threshold** (`2 × perimeter` of the control box).

Both readings belong in front of the owner. Whoever reads "one class passes" without the second bullet attached will underestimate how much of this app already clears both axes; whoever reads only the second will miss that the
ripple indicating focus on most of the app's buttons bottoms out at 1.19:1 and that five classes render nothing.

### Two facts about the option space that FM-052's own escalation understates

Both were derived by this proposal from FM-052's recorded data; both cut against the option this proposal ends up recommending, and both are stated for that reason.

1. **A precedence fix cannot reach `Checkbox`/`Radio`/`Switch` at all, and the audit's own `checkbox-select-all` row proves it.** For those controls the element that receives DOM focus is not the visible `ButtonBase` root — it is
   MUI's native `<input>` overlay. Verified in the installed 7.3.9 sources (`internal/SwitchBase.js`): `SwitchBaseRoot` is `styled(ButtonBase)`, rendered with `component: 'span'` and `additionalProps` including `role: undefined,
   tabIndex: null` — so the visible root carries no `tabindex` and is not focusable — while `SwitchBaseInput` is `styled('input')` with `{cursor: 'inherit', position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0,
   left: 0, margin: 0, padding: 0, zIndex: 1}`. A CSS `:focus-visible` rule, at *any* specificity, matches that fully transparent overlay and paints there, invisibly. FM-052 measured exactly this outcome: for `checkbox-select-all`
   the global rule **already renders uncontested** on the input and is invisible anyway. So restoring the global rule's precedence would fix four of the five 2.4.7 failures and leave the fifth standing, and would leave every
   `Checkbox` in the app (five sites, three renderings) with no outline. Reaching them requires a **class-based** rule on the root (`&.Mui-focusVisible`, or `&:has(:focus-visible)`) — Option A's authoring style, not Option B's. MUI
   itself says so: `IconButton.js` and `ButtonBase.js` both carry the propType comment "Without a ripple there is no styling for :focus-visible by default. Be sure to highlight the element by applying separate styles with the
   `.Mui-focusVisible` class." Confirmed by grep across `Checkbox.js`, `internal/SwitchBase.js` and `IconButton.js` (CJS and `esm/` alike): that comment is the **only** `focusVisible` occurrence in the three files, and none of them
   ships a focus-visible style rule.
2. **The ripple family's contrast figures do not transfer to an outline, and FM-052's Option 2 cost paragraph reads them as if they did.** Every figure in the `1.19:1`–`2.38:1` range is `currentColor` composited at
   `.MuiTouchRipple-rippleVisible`'s **static `opacity: 0.3`**. A `3px solid currentColor` outline paints at **full opacity**, so the same `currentColor` yields a different, higher contrast. Recomputed by this proposal from FM-052's
   own measured colour pairs, by the standard WCAG formula and **not verified in a browser**: `palette.error.main` `#a33938` against `background.default` `rgb(31,36,38)` is ≈**2.39:1** at full opacity (still failing, so the
   conclusion holds for that family), and `sectionLabelColor` `#6b7472` against the same ground is ≈**3.26:1** (passing, so the conclusion does **not** hold for the three toggles FM-052 lists at 1.40:1). The direction of Option B's
   stated cost survives; its **size** does not, and the remedy must measure each family at full opacity rather than read the ripple table. `news-page-link`'s **1.29:1** is unaffected by this — that figure was sampled from the
   outline's own difference mask in the capture pair, and it is the one measured data point about the outline's contrast in this app besides mechanism 7's 7.34:1.

### The local styling sites any remedy has to reckon with

Verified in the tree: `SearchWorkspace.tsx:87-97` (`pairedInputSx`, no border), `:99-108` (`advancedInputSx`, static border), `:480-482` (`notchedOutline` `border: "none"`), `RefineSidebar.tsx:218-220` and
`filterControls.tsx:147` and `DownloadActions.tsx:85` (`notchedOutline` `borderColor` recoloured to a literal `rgba(255,255,255,0.1)`), and `SearchResults.tsx:1735` (`disableRipple`). Note the asymmetry FM-052 measured: the
`notchedOutline` **recolours raise** the family's measured focused-versus-unfocused contrast (4.53–5.56:1 overridden versus 3.15–3.45:1 for MUI's stock un-overridden rendering); only the `border: "none"` and the `disableRipple`
delete an affordance. A remedy should not unwind the recolours reflexively.

### What the accepted decisions require, and what they do not

- **ADR-0002** constrains every option to MUI's own primitives. No second component suite, no bespoke focus widget.
- **ADR-0004** makes accessibility an independent gate and settles the evidence class: jsdom has no `:focus-visible`, no layout, no computed outline and no ripple element, so no component test can establish or refute anything here —
  real-browser Playwright evidence is required. It also forbids removing, skipping, weakening, or ignoring any test, which is precisely why FM-052 committed none: a test asserting today's indicators would enshrine the defects.
- **ADR-0006** requires explicit human acceptance of each feature's proposed visual baseline and every variance, and states that "a reviewer may verify evidence but cannot supply this acceptance", and that behavioural,
  accessibility, and visual acceptance are separate gates. **No accepted ADR sets a formal WCAG conformance target**, and none forbids a recorded, human-accepted gap — which is why Option C below is a real option and not a
  formality.
- **ADR-0009** is why several controls carry local styling that overrides MUI's focus affordances. This ADR does not relitigate that redesign; it decides what focus renders on top of it.

### Registry state

FM-052 appended `gaps` phrases and extended `backlog.rationale` (`status: deferred`, prose only, no invented `backlog.adr`/`backlog.task`) on exactly four records: `F-PLATFORM-SHELL` (which owns `core/ui-react/src/app`, and therefore
`theme.ts`), `F-SEARCH-FORM`, `F-SEARCH-GROUP-SELECTION`, and `F-SEARCH-MEDIA` — the three records owning a `fails 2.4.7` control. Every other linked record was confirmed unchanged. No `visual` block field was touched anywhere.

Each of the four `backlog.rationale` entries names this decision rather than a fix, as `README.md`'s *Registry Rules* require, and those four entries are what this ADR's outcome either discharges or makes permanent.

**One factual correction to that registry text, raised here rather than acted on.** `F-PLATFORM-SHELL`'s `backlog.rationale` states that the global rule is "defeated, undefeated, or partially defeated depending on which of several MUI
mechanisms a control uses … **no control family renders the global rule as authored**". The last clause is contradicted by FM-052's own mechanism 7: `stats-identifier-link` renders `theme.ts:184-187` **completely undefeated** and
passes both WCAG criteria at 7.34:1 and 912.00 px², and mechanism 5's sanitized anchors render it undefeated too (failing only on `currentColor`). The sentence appears to predate the correction pass that added the `Link` finding.
This matters beyond bookkeeping: that clause, read alone, is the strongest available argument *against* Option B, and it is not true. Correcting `FEATURES.yaml` is the task designer's, not this proposal's — this ADR may not edit a
registry — but the option list below is written against the measurement, not against that sentence.

## Options

Options A, B, and C are FM-052's own three, in its order, with their evidence preserved; Option D is added by this proposal and is marked as such, with the reason it is not covered by the other three. Each states what it changes,
**its real precedent in this codebase**, its honest cost, its ADR-0006 acceptance consequence, and its regression surface.

### Option A: An explicit focus-ring token, authored per control family

Author a shared focus indicator (an outline or `box-shadow`) keyed to each component's own `&.Mui-focusVisible`/`:focus-visible` selector — in `theme.ts`'s `components` overrides, tuned to clear both the area and the 3:1 contrast
thresholds measured above — overriding whichever of mechanisms 1–5 currently governs each family.

- **Precedent in this codebase:** none as a focus indicator. But it is the authoring *style* MUI itself uses for `MenuItem`/`ListItemButton`/`Chip`/`Link` (mechanism 4 is exactly a `&.Mui-focusVisible` rule), and `theme.ts` already
  carries five `styleOverrides` entries, so nothing structurally new is introduced.
- **Benefits.** It is the only option that reaches every measured failure **by construction**, including the three the other options reach only awkwardly or not at all: the classes whose `currentColor` is a local `sx` value rather
  than a palette colour (`sort-header-button` `#7c8483`, the three `sectionLabelColor` toggles `#6b7472`, `results-selection-caret` `text.secondary` — about a third of the ripple family), the `contained` buttons whose `currentColor`
  is dark `contrastText` on their own teal ground by design, and `saved-search-delete-button`, whose `currentColor` **is** a palette colour (`error.main`) and is still the family's floor. Because it is authored on each component's
  own `Mui-focusVisible` class it does not depend on winning a specificity or insertion-order fight with MUI's resets — the exact mechanism that defeated the existing rule. And it is the only option that reaches
  `checkbox-select-all` and the rest of the `Checkbox` family without a separate sub-remedy, because `Mui-focusVisible` lands on the visible root while `:focus-visible` lands on the transparent input.
- **Costs.** The largest surface: `theme.ts` plus a per-family specification, and potentially every feature-local `sx` that suppresses or recolours a `notchedOutline` or a ripple. The literal rendered value for each family must be
  specified, measured, and screenshotted as that remedy's own evidence — this is the option with the most numbers to get right. It also introduces a second focus token alongside the existing global rule, which must then be either
  reconciled with it or explicitly scoped, or the app carries two focus systems.
- **ADR-0006 acceptance:** yes, fresh, for every feature record owning an interactive control — this changes the rendered focus indicator app-wide.

### Option B: Restore the precedence of the existing global `:focus-visible` rule

Make `theme.ts:184-187`'s own rule — `3px solid currentColor`, offset 3px — actually render where it is currently defeated: by raising its specificity, by `!important`, or by moving the defeating component rules to opt back in per
family. No second token is introduced.

- **Precedent in this codebase — and this is the point that must not be omitted.** `stats-identifier-link` **is this strategy already in effect**, on one real control family, today: the global rule undefeated, `currentColor`
  resolving to a palette colour, measured at **7.34:1 contrast and 912.00 px² against a 536.00 px² threshold — passing both axes with margin.** The app already contains a working instance of the thing this option generalises. FM-052
  records that an earlier version of its own analysis missed this instance and consequently framed the option as the merely-cheap one; it is not.
- **Benefits.** The geometry is unconditionally sufficient: a 3px outline drawn at a 3px offset has area `6(w+h) + 108` against a `4(w+h)` threshold, which **exceeds the threshold at every control size** — by 108 px² as the control
  shrinks toward nothing, and by more as it grows. Unlike the `notchedOutline` ring it has no area problem at all, inset or outset; unlike the ripple it does not depend on an animation being observed, and it therefore survives
  `prefers-reduced-motion`. It removes the root cause rather than layering over it, and it keeps the number of places that can silently drift at **one**.
- **Costs, in three parts, none of which FM-052's framing fully states.**
  1. **It does not reach `Checkbox`/`Radio`/`Switch` at all** — see *Two facts* above. Four of the five 2.4.7 failures are fixed by the precedence change; `checkbox-select-all` is not, and every other `Checkbox` keeps only its
     ripple. Closing that requires a root-level `&.Mui-focusVisible` rule, i.e. borrowing one small piece of Option A. **B is therefore not a one-rule option**, and should not be chosen on the belief that it is.
  2. **`currentColor` is not universally sufficient**, and the families where it is not must be given an explicit `outline-color`. FM-052's list of those families is derived from ripple figures and is **too long by an unknown
     amount** (see *Two facts* #2); the measured, directly applicable data points are `news-page-link` at **1.29:1** (UA link blue, genuinely insufficient) and mechanism 7 at **7.34:1** (the teal, genuinely sufficient). Each
     remaining family needs one full-opacity measurement, not a re-reading of the ripple table.
  3. **An outset ring 3px away from the control is a geometry the app has never rendered at scale.** FM-052 could not measure clipping or collision, because the rule is defeated nearly everywhere: whether a 3px offset ring is
     clipped by an `overflow: hidden` ancestor, or collides with a neighbour, in the results table rows, the refine sidebar's dense pill rows, or a sticky header, is unmeasured. That is a real risk this option carries and the others
     do not.
- **ADR-0006 acceptance:** yes, fresh, and broad — a 3px outset ring where there is currently a ripple, a border recolour, or nothing is a large visible change on most controls in the app.

### Option C: Leave the mechanisms as they are and accept the measured gap as recorded

Close this decision with no remedy task. The `gaps` and `backlog` entries FM-052 wrote stay as the durable record.

- **Precedent in this codebase:** the registry has a slot designed for exactly this, and ADR-0012's Option F was the same shape and was put to the owner on the same terms (there, the owner chose a remedy).
- **Benefits.** Costs nothing today; risks nothing; changes no pixel and defers no acceptance. The gap stays visible and honest rather than being quietly forgotten.
- **Costs.** It leaves **five classes failing WCAG 2.4.7** — a Level AA failure, not merely an inconsistency — on the record indefinitely, and leaves the repository owner's own reported symptom (focus visible on some controls, absent
  on others) unaddressed. It should be weighed against the measured picture rather than the headline, in both directions: the `notchedOutline` family's only failure is a 16.00 px² margin under a modelling convention that its own
  measured geometry does not reproduce — and under that measured geometry **three** classes pass both axes, not one, so "the app fails everywhere" is not what was measured. Cutting the other way with equal weight: the ripple that
  indicates focus on most of this app's buttons measures **1.19:1 at its floor**, and five classes render nothing at all. Under `README.md`'s *Registry Rules* each affected record must name its next task or blocking ADR; once this
  ADR resolves there is neither, so the `backlog` rationale would have to say plainly that the gap is accepted and permanent.
- **ADR-0006 acceptance:** none. But an explicit human decision is required to choose it, and no agent may choose it.

### Option D: Remedy only the five WCAG 2.4.7 failures; accept the 2.4.11 (AAA) gaps — *added by this proposal*

Fix the five classes that render **nothing**, by whichever local mechanism is cheapest per class (restore a focus-reactive border on the three bare-`InputBase` renderings, drop or re-scope `SearchWorkspace.tsx:480-482`'s
`border: "none"` so the focused `notchedOutline` paints, and give `checkbox-select-all` a root `&.Mui-focusVisible` indicator or remove its `disableRipple`). Leave mechanisms 1, 3, 4, 6 and 7 as they are, and record the remaining
2.4.11 shortfalls as an accepted gap.

**Why this is a separate option and not a variant of the others.** Without it the list reads "change every control in the app" or "accept a Level AA failure", and the evidence does not force that choice. WCAG **2.4.7 is Level AA;
2.4.11 is Level AAA**, and no accepted ADR sets a conformance target at either level. FM-052's own numbers make the split defensible: the `notchedOutline` family passes contrast everywhere (3.15–5.56:1) and fails area only under a
convention its measured geometry contradicts for two of its members; the ripple family passes area everywhere by 2.4× to 9× and fails only the AAA contrast axis. Omitting this option would bias the list by omission in exactly the
way FM-052's own history warns about.

- **Precedent in this codebase:** the three bare-`InputBase` renderings would gain the focus-reactive border that the `notchedOutline` family already has and that FM-052 measured passing the contrast axis at every site — so the
  target rendering is not hypothetical, it is the app's own most successful mechanism.
- **Benefits.** By far the smallest surface and the smallest acceptance: five classes, three feature records, and a `theme.ts` change that may not be needed at all. It closes the only failure that is unambiguously a defect rather
  than a stricter-standard shortfall. It is the fastest route out of `blocked` for FM-052.
- **Costs, stated plainly.** **It declines half the decision question.** The question asks for a *single, consistent* approach; this answers "make nothing invisible" and leaves seven mechanisms coexisting — so the repository owner's
  original observation, that focus indication differs from control to control, remains true after the remedy. It accepts a 1.19:1 focus indicator on the app's buttons as the permanent answer. And it leaves the structural cause
  (`outline: 0` and `outline: 0`-equivalent resets defeating an authored global rule) in place, so the next locally-styled control can reproduce the same class of failure — the failure mode `SearchWorkspace.tsx:480-482` already
  demonstrates.
- **ADR-0006 acceptance:** yes, fresh, but scoped to `F-SEARCH-FORM`, `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-MEDIA` and (if `theme.ts` changes) `F-PLATFORM-SHELL`, rather than to every record with an interactive control.

## Recommendation

**Option B — restore the precedence of the existing global `:focus-visible` rule — with two additions this proposal considers inseparable from it: (i) a root-level `&.Mui-focusVisible` outline for the `SwitchBase`-derived controls
whose focused node is a transparent input, and (ii) an explicit `outline-color` for each family whose `currentColor` is measured insufficient at full opacity.** A recommendation is not a decision.

The reasoning is repository-based:

- **The app already contains a working instance of it.** `stats-identifier-link` renders `theme.ts`'s own rule undefeated and clears both axes at 7.34:1 and +376.00 px². No other option can point at a control in this repository that
  already behaves the way it proposes all controls should behave. That instance also isolates the variable: mechanisms 5 and 7 are the *same rule, same geometry, same offset*, differing only in whether `currentColor` resolves to a
  palette colour or a UA default. The rule is not what is broken.
- **The geometry is unconditionally sufficient, and it is the only mechanism in the audit of which that is true.** `6(w+h) + 108` versus `4(w+h)` clears the threshold at every control size. Mechanism 3 fails area by a 16.00 px²
  convention margin at every size; mechanism 1 passes area but fails contrast at every size. Choosing B removes the axis this audit spent the most words disputing, rather than arguing about which reading of it is fairer.
- **It repairs the cause rather than covering it.** Four of the five 2.4.7 failures are one defeated rule; so is most of the inconsistency the repository owner reported. Option A would leave `outline: 0` and
  `.MuiInputBase-input:focus { outline: 0 }` in force and paint over them, which works but means the app permanently maintains a second focus system whose every family is a separate number to keep right.
- **It is the smallest thing that answers the question as asked.** The question asks for a *single, consistent* approach. B is one rule plus a named, small set of exceptions; A is a per-family specification; D declines the
  consistency half outright.

**Where I disagree with FM-052's framing, since it is what the owner will read first.** FM-052 charges Option 2 with a per-family colour audit sized by the ripple table's `1.19:1`–`2.38:1` range. That range is measured and correct
*for the ripple*, and it is the wrong instrument for an outline: those figures are a 0.3-alpha composite, and the outline paints opaque. On my own recomputation from FM-052's own colour pairs — **unverified in a browser, and the
remedy must measure it** — at least one family FM-052 lists as needing an explicit colour (`sectionLabelColor` at 1.40:1 ripple) comes out around 3.26:1 as an outline and would need nothing. Option B's colour work is real but
smaller than the escalation implies.

**And where the recommendation is weakest, stated with the same weight.** Option B has a hole the escalation does not mention at all: it cannot reach `Checkbox`/`Radio`/`Switch`, because `:focus-visible` matches a transparent input
overlay there. That is why the recommendation above carries addition (i) — and it means B is not the pure one-rule change its framing suggests. If the owner weighs that plus the unmeasured clipping risk of a 3px outset ring in the
results table and the refine sidebar and concludes that a designed, per-family indicator is the more predictable outcome, **Option A is a defensible choice and is the only option that reaches every measured failure by construction.**
That is a legitimate preference about how much of MUI's own behaviour the project wants to fight, not an error.

Option D is not recommended, but it is the right answer if the owner's priority is to clear the Level AA failure quickly and revisit consistency later; it should not be dismissed as doing nothing, because it fixes the only finding
in this audit that is unambiguously a defect. Option C is not recommended: the five failing classes are a Level AA failure the migration itself introduced through local styling, and one of them (`SearchWorkspace.tsx:480-482`) deleted
a focus affordance as a side effect of removing a resting border, which is not a tradeoff anyone recorded choosing.

## Human Decision

**Accepted 2026-08-19 by the repository owner: Option A — an explicit focus-ring token, authored per control family.**

**On the lettering, because the raw transcript is misleading and must not be mis-recorded.** The owner answered with the letter "c" — "I want c (a single focus-ring)", and again "let's just go with c then". That letter belongs to a
coordinator-side three-way list put to them earlier in the same session, whose item **(c)** read "a single focus-ring token applied per family — consistent signal, respecting each control's shape". That is **this ADR's Option A**,
which was drafted independently and lettered differently. It is the exact opposite of **this ADR's Option C** (leave the mechanisms as they are and accept the measured gap), and Option C was **not** chosen. Two facts beyond the
owner's own parenthetical corroborate the mapping: they said they would "start a new agent for that" remedy, which Option C forecloses entirely; and this audit exists because the owner reported that focus indication is "all over the
place", which Option C leaves standing.

**The proposer's recommendation was Option B, and it was not taken.** Under ADR-0006 that choice is the repository owner's to make. The `## Recommendation` section above stands unmodified as the record of what was recommended and of
the contrary view put alongside it — including its own statement that "Option A is a defensible choice and is the only option that reaches every measured failure by construction". Options B, C and D remain rejected and are preserved
above with their tradeoffs intact as the record of what was weighed. No rationale beyond the selection itself is recorded here, because none was given; nothing further is inferred on the owner's behalf.

### What the accepted option inherits from the evidence above

Every constraint below is already established in this ADR's body or in FM-052; they are gathered here so that a remedy author reading only this section does not walk into them.

- **Option A's own stated cost is a second focus token.** It layers an authored indicator alongside the existing global `:focus-visible` rule at `theme.ts:184-187`, which stays in force. The remedy **must decide** whether to
  reconcile the two or to scope the global rule explicitly; the application must not silently carry two focus systems.
- **`Mui-focusVisible` is precisely why Option A reaches `Checkbox`/`Radio`/`Switch` and Option B does not.** For `SwitchBase`-derived controls that class lands on the visible root, while `:focus-visible` matches MUI's transparent
  `opacity: 0` native input overlay and paints there invisibly. For that family the indicator must be authored on the root class, not on the pseudo-class.
- **The ripple family's contrast figures do not transfer to an opaque ring.** The `1.19:1`–`2.38:1` range is `currentColor` composited at `.MuiTouchRipple-rippleVisible`'s static `opacity: 0.3`; an authored ring paints at full
  opacity and yields different, higher numbers. The remedy must **measure each family at full opacity** rather than re-read the ripple table.
- **Overrides that must *not* be unwound reflexively:** the `notchedOutline` `borderColor` recolours at `RefineSidebar.tsx:218-220`, `filterControls.tsx:147` and `DownloadActions.tsx:85`. FM-052 measured that these **raise** that
  family's focused-versus-unfocused contrast (4.53–5.56:1 against MUI's stock 3.15–3.45:1); removing them would make the app measurably worse on the one axis that family already passes.
- **Overrides that must be unwound or given an affordance:** `SearchWorkspace.tsx:480-482`'s `"& .MuiOutlinedInput-notchedOutline": {border: "none"}`, `SearchResults.tsx:1735`'s `disableRipple`, and the three bare-`InputBase`
  renderings (`queryInputSx`, `pairedInputSx`, `advancedInputSx`), none of which has a focus-reactive affordance today.
- **ADR-0006 acceptance is required fresh and broad** — for every feature record owning an interactive control, because the accepted option changes the rendered focus indicator app-wide. **Accepting this ADR is not visual
  acceptance**, and no agent may supply it.
- **The unmeasured-risk asymmetry now runs in the accepted option's favour, and is recorded as such.** Option B's 3px outset ring at a 3px offset has never been rendered at scale in this application, so whether it is clipped by an
  `overflow: hidden` ancestor or collides with a neighbour — in the results table rows, the refine sidebar's dense pill rows, or a sticky header — is unmeasured. A per-family authored indicator can be shaped to each control, which is
  part of what the owner chose.

## Consequences

These were written across all four options, before a decision existed. **Option A is the accepted option**, and where the acceptance settles a branch that is now marked; the per-option analysis under `## Options` stands unchanged as
the record of what was weighed.

### What the remedy has to touch

- **`theme.ts` is the remedy's file**, and it is explicitly out of FM-052's scope for exactly that reason. **Under the accepted Option A the change is a set of new `styleOverrides` entries** in that file's `components` block, keyed
  to each control family's own focus selector — that is the live branch. (For the record of what was weighed: under B the change would have been to `MuiCssBaseline`'s existing `:focus-visible` entry — specificity, `!important`, or
  per-family opt-in — plus at least one new `components` entry for the `SwitchBase` family; under D it might have been reachable entirely in feature-local `sx`.)
- **Component-local overrides that must be unwound** — live under Option A, which expects an authored indicator to paint on these controls: `SearchWorkspace.tsx:480-482`'s
  `"& .MuiOutlinedInput-notchedOutline": {border: "none"}` — it removes the focus border together with the resting one — and `SearchResults.tsx:1735`'s `disableRipple`, if a ripple rather than an outline is the chosen indicator for
  that control. `queryInputSx`, `pairedInputSx` and `advancedInputSx` need a focus-reactive affordance added; today none of the three has one.
- **Overrides that must *not* be unwound reflexively**: the `notchedOutline` `borderColor` recolours at `RefineSidebar.tsx:218-220`, `filterControls.tsx:147` and `DownloadActions.tsx:85`. FM-052 measured that these **raise** the
  family's focused-versus-unfocused contrast (4.53–5.56:1) above MUI's stock rendering (3.15–3.45:1). Removing them would make the app measurably worse on the one axis that family already passes.
- **No `data-testid` is removed or renamed by any option.** Every value is a compatibility contract under `README.md`'s *Registry Rules*, and nothing here needs to touch one.
- **ADR-0002 binds the remedy to MUI primitives** — no bespoke focus widget, no second component suite.

### Visual acceptance: fresh human acceptance is required, and cannot be inherited

Every option except C changes what the application renders in a **focused** state, and **no visual contract in this repository covers a focused state.** Verified across all 40 records of `FEATURES.yaml`: no record's
`visual.contract.states` list contains a focus/focused/focus-visible entry. The only focus mentions anywhere in the file are prose in `gaps`, `backlog.rationale`, one `F-PLATFORM-SHELL` variance description, and one
`F-SEARCH-MEDIA` geometry check about the paired inputs remaining *operable* by keyboard — an operability check, not an indicator state. FM-052 itself defined no visual contract, proposed no baseline, touched no `visual` block, and
added no `decision`/`accepted_by`/`accepted_on` key.

**An acceptance-accounting correction, on the same terms ADR-0011 and ADR-0012 made theirs.** No option here withdraws an existing human acceptance, because there is almost nothing to withdraw: exactly **one** of the 40 records is
`visual.status: accepted` today — `F-SEARCH-PAGING`, accepted by the repository owner on 2026-08-16, and the only record in the file carrying an `acceptance` block. Ten records are `proposed` (including all four FM-052 touched) and
29 are `unassessed`. The real cost of Options A, B and D is therefore that they **enlarge and further defer acceptances that are already outstanding**, plus one re-evidencing pass against `F-SEARCH-PAGING` if the accepted option
changes what a focused control renders on that record's surface — not that any accepted baseline is invalidated.

Under ADR-0006 the repository owner must explicitly accept each affected feature's proposed baseline and every variance; a reviewer may verify the evidence but cannot supply the acceptance, and accepting *this* ADR is not visual
acceptance.

Concretely: the remedy packet must produce focused-state visual evidence for each affected feature record and put it in front of a human. **Under the accepted Option A that scope is every record owning an interactive control**, not a
subset — Option D's narrower scoping to `F-SEARCH-FORM`, `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-MEDIA` and `F-PLATFORM-SHELL` was not chosen. This does not withdraw any existing acceptance — it enlarges acceptances that are already
outstanding.

### What would keep it from regressing

FM-052 is a snapshot, deliberately with no committed test: a test asserting today's indicators would enshrine the defects, and ADR-0004 forbids a later packet deleting passing assertions. The remedy therefore owns the durable gate,
and it needs one, because two mechanisms can silently re-break it:

- **A MUI upgrade.** Every finding here is scoped to `@mui/material` **7.3.9** and Chrome for Testing **151.0.7922.34**. Options A and B both depend on MUI internals — A on the `Mui-focusVisible` class contract, B on winning against
  `ButtonBase`'s root `outline: 0` and `InputBase`'s `&:focus { outline: 0 }`, which a future release could add to. Following ADR-0012's precedent, the remedy must state its version dependency in the code that relies on it and
  require re-verification after a MUI upgrade.
- **A new local `sx`.** This is how the failures got here: `border: "none"`, `disableRipple`, and three bare `InputBase` renderings, each locally reasonable, each deleting an affordance. A remedy that does not make reintroduction
  detectable will be re-audited in a year.

The gate should therefore be, at minimum: a committed **real-browser** Playwright spec (ADR-0004 — jsdom cannot see any of this) that keyboard-reaches one representative control per mechanism family, asserts the focused/unfocused
computed-style delta is non-empty, and asserts the accepted option's **literal** values rather than a screenshot; plus a cheap repository-level guard against reintroducing the known affordance-deleting patterns in
`core/ui-react/src`. The FM-052 harness's own discipline is the model: `:focus-visible` recorded per control, and a negative control proving the harness would detect failure. Whatever gate is written must be one the accepted option
can actually meet — no test may be removed, skipped, weakened, or ignored later to make room for it.

### Process

- **The remedy is a later task packet that does not exist yet.** FM-052 was a measurement packet by design and implemented nothing; `core/ui-react` and `tests/system` are byte-identical to baseline and must stay so until a designed
  packet says otherwise. A **task designer** must create the remedy packet, link this ADR under its `Decision Dependencies`, and unblock FM-052. No implementer may act on this ADR before that refinement: this acceptance is authority
  for the decision, not for an unrefined packet.
- **Lifecycle bookkeeping follows the recording of the decision, not this file**: `STATUS.md`'s `## Blocked` entry for FM-052 and the `backlog` fields of the four touched `FEATURES.yaml` records are the coordinator's and task
  designer's to update.
- **Not applicable — the Option C branch.** This bullet required Option C's acceptance: the four records' `backlog.rationale` would then have had to say plainly that the gap is accepted and permanent, since there would be no next
  task and no blocking ADR for them to name. Option C was not accepted, so that rewrite is not owed; under `README.md`'s *Registry Rules* the four records instead name the remedy packet once a task designer creates it, per the first
  bullet above. Retained rather than deleted so the record shows what the acceptance foreclosed.

## Affected Work

- Blocked task raising this decision: `docs/frontend-migration/tasks/FM-052-keyboard-focus-indication-audit.md` (`Status: blocked`, `ADR REQUIRED`). It implemented no remedy by design.
- Evidence of record (git-ignored, not in the tracked diff): `tests/system/visual-evidence/FM-052/` — 90 PNGs and 12 JSON artifacts, including `pass1-source-census.json`, `pass2-runtime-sweep.json`, `delta-omitted-classes.json`,
  `delta-fails-2-4-7-classes.json`, `notchedoutline-geometry-probe.json`, `ripple-currentcolor-probe.json`, `fix2-*`/`fix3-*`.
- The file every option except C and D-if-local changes: `core/ui-react/src/app/theme.ts` (its `MuiCssBaseline` `:focus-visible` entry at `:184-187`).
- Implementation files carrying the affordance-deleting or affordance-shaping overrides: `core/ui-react/src/features/search/workspace/SearchWorkspace.tsx` (`:87-97`, `:99-108`, `:480-482`),
  `core/ui-react/src/features/search/results/SearchResults.tsx` (`:1735`), `core/ui-react/src/features/search/results/RefineSidebar.tsx` (`:218-220`),
  `core/ui-react/src/features/search/results/filterControls.tsx` (`:147`), `core/ui-react/src/features/search/results/DownloadActions.tsx` (`:85`).
- Registry records whose `gaps`/`backlog` disposition changes with the outcome: `F-PLATFORM-SHELL` (owns `theme.ts`), `F-SEARCH-FORM`, `F-SEARCH-GROUP-SELECTION`, `F-SEARCH-MEDIA`. Options A and B additionally reach every record
  owning an interactive control, for visual acceptance rather than for a gap entry. No `COMPONENTS.yaml` or `APIS.yaml` record applies.
- Governing accepted decisions, none reopened here: `ADR-0002-frontend-stack.md` (MUI primitives only), `ADR-0004-testing-and-parity.md` (real-browser evidence, independent accessibility gate, no test weakened),
  `ADR-0006-visual-parity-policy.md` (human acceptance of baselines and variances), `ADR-0009-mock-fidelity-visual-redesign.md` (the origin of the local overrides).
- Related precedent, not superseded: `ADR-0012-recent-search-refill-keyboard-reachability.md` — the previous keyboard-accessibility decision, whose version-scoped re-verification obligation this ADR follows.
- Lifecycle bookkeeping: `docs/frontend-migration/STATUS.md`'s `## Blocked` entry for FM-052.

## Supersession

- Supersedes: `None`.
- Superseded by: `None` until a later ADR replaces this decision.
