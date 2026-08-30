import {chipClasses} from "@mui/material/Chip";
import {
    createTheme,
    type Theme,
    type TypographyStyle,
} from "@mui/material/styles";

declare module "@mui/material/styles" {
    // FM-056 (ADR-0014): the caption style the refine surfaces share -- each
    // filter section's caption, and the history views' header summary.
    // Declared as a typography variant rather than restated as `sx` blocks so
    // `C-HISTORY-REFINE-BAR` inherits the search refine sidebar's language
    // from the theme instead of from that component's code. Its louder sibling
    // `refineSurfaceLabel` (12px/600/0.7px uppercase) painted the surface's own
    // "Refine" header caption and left with it in FM-142, having no other
    // consumer.
    interface TypographyVariants {
        refineSectionLabel: TypographyStyle;
    }

    interface TypographyVariantsOptions {
        refineSectionLabel?: TypographyStyle;
    }

    // `@mui/material@7.3.9` reads `options.colorSpace` in `createThemeNoVars`
    // and exposes it on the theme (its `alpha`/`lighten`/`darken` helpers and
    // `createPalette`'s `augmentColor` both branch on it), but only declares the
    // option on the internal `createColorScheme` signature, not on the public
    // `ThemeOptions`. Declare it here until MUI ships the type.
    interface ThemeOptions {
        colorSpace?: string | undefined;
    }

    // ADR-0014: the mock's surface tokens, exposed on the palette so feature
    // code can consume them via `sx` palette paths ("surfaces.control")
    // instead of restating hex literals.
    interface SurfaceTokens {
        /** The search-bar row ground (`#232a2c` in the mock). */
        bar: string;
        /** Raised control surface: selects, menus, secondary buttons. */
        control: string;
        /** Recessed input surface: text fields. */
        recessed: string;
        /** 1px control border hairline. */
        hairline: string;
        /** Fainter hairline for row/section separators. */
        hairlineFaint: string;
        /**
         * The mock's muted-glyph color (`#6b7472`): section captions, counts,
         * popover captions, and disabled/neutral control text. FM-054: four
         * independent feature-local literals collapsed into this one token.
         */
        mutedText: string;
    }

    interface Palette {
        surfaces: SurfaceTokens;
        charts: ChartTokens;
    }

    interface PaletteOptions {
        surfaces?: SurfaceTokens;
        charts?: ChartTokens;
    }

    // FM-024 (ADR-0021: no mock exists for stats): the dashboard's chart
    // series colors, kept here so `features/stats/dashboard` never states a
    // color literal (ADR-0014). A perceptually distinct categorical sequence
    // in the same oklch lightness/chroma family as `mockPalette` above --
    // this repository's one interactive-chart consumer, so the sequence is
    // authored fresh rather than reusing role colors (`primary`/`warning`/…)
    // whose semantic meaning elsewhere (brand accent, caution) does not apply
    // to "which series is this" in a chart legend.
    interface ChartTokens {
        categorical: string[];
    }
}

declare module "@mui/material/Typography" {
    interface TypographyPropsVariantOverrides {
        refineSectionLabel: true;
    }
}

declare module "@mui/material/Chip" {
    // FM-087: the search bar's constraint chips (the redesign's status row).
    // A themed `Chip` variant authored beside `refineChip` below, for the
    // same reason: a live constraint is a stock, already focus-ringed `Chip`
    // (ADR-0013 family G) whose look is a theme token (ADR-0014), never an
    // `sx` literal in the search feature.
    interface ChipPropsVariantOverrides {
        constraint: true;
    }
}

declare module "@mui/material/Button" {
    // FM-056: the selection pill of a refine surface. A themed `Button`
    // variant rather than a bespoke component so a multi-select option is a
    // stock, already focus-ringed `Button` (ADR-0013 family B) whose look is
    // a theme token (ADR-0014).
    interface ButtonPropsVariantOverrides {
        refineChip: true;
        // The neutral secondary action. Every button that is a real action
        // but not *the* action of its surface -- the results
        // toolbar's ZIP / black hole / copy-links / save-search row, the
        // "Display" and "Refine" popover triggers, the search bar's "Recent
        // searches" trigger, and each result row's NZB/Torrent link. Before
        // this variant, six call sites authored the same intent with six
        // slightly different `sx` blocks (three paddings, two colour roles,
        // and MUI's stock teal `outlined` in two of them).
        control: true;
    }
}

export type ThemePreference =
    | "auto"
    | "light"
    | "dark"
    | "dark-dyschromatopsia";

export function resolveThemeMode(
    preference: ThemePreference,
    prefersDark: boolean,
): "light" | "dark" {
    if (preference === "auto") {
        return prefersDark ? "dark" : "light";
    }

    return preference === "light" ? "light" : "dark";
}

// The mock's own IBM Plex Sans UI stack, copied from the outer page `<div>`'s
// inline `font-family` in "NZBHydra Search.dc.html". The webfont itself is
// vendored through `@fontsource/ibm-plex-sans` and imported as a build-time CSS
// side effect from `App.tsx`; the mock's runtime `fonts.googleapis.com` link is
// deliberately not adopted (ADR-0009: this application ships no third-party
// runtime CDN dependency).
const uiFontFamily = '"IBM Plex Sans", system-ui, -apple-system, sans-serif';

/**
 * The mock's monospace stack for numeric/tabular values (sizes, ages, grabs,
 * seeders, version strings, quality/type pills), copied from the mock's own
 * repeated `font-family:'IBM Plex Mono',monospace` inline styles. Vendored via
 * `@fontsource/ibm-plex-mono` (weights 400/500) alongside the UI font.
 *
 * Exposed as a plain exported constant rather than a custom MUI typography
 * variant: feature code applies it through `sx={{fontFamily: monoFontFamily}}`
 * on whichever element already carries the right variant/semantics, which needs
 * no `TypographyVariants` module augmentation and works equally inside `sx`,
 * `styled`, and `components.styleOverrides`.
 */
export const monoFontFamily = '"IBM Plex Mono", monospace';

/**
 * The state-pill radius: a full stadium, so a *pill* is never confused with a
 * *button*. This is the shape half of the control-shape rule the search and
 * results surfaces follow -- soft-cornered rectangles (`shape.borderRadius`,
 * 8px) are things you *do*, stadiums are things that are *on or off*. Only
 * two control families take it: the refine surfaces' quality/type selection
 * pills (`MuiButton`'s `refineChip` variant below) and the search bar's
 * constraint chips (`MuiChip`).
 *
 * Authored as a CSS string, not a number, and deliberately so: `sx`'s
 * `borderRadius` key is theme-multiplied (`@mui/system`'s
 * `defaultSxConfig.js` maps it to `themeKey: "shape.borderRadius"`), so a
 * numeric token passed through `sx` is silently multiplied by 8 -- the bug
 * that gave this token's previous `7` a 56px rendered radius in every `sx`
 * consumer while rendering the intended 7px in `styleOverrides`. A string is
 * passed through untouched by both mechanisms, so the token now means the
 * same thing wherever it is used.
 */
export const pillRadius = "999px";

/**
 * The one control height this application uses: every button, dropdown
 * trigger, text input, and select is 32px tall, everywhere.
 *
 * Before this token the app rendered ten different control heights (measured
 * live: 25.9 / 27.3 / 27.6 / 28.0 / 30.8 / 31.5 / 35.7 / 36.5 / 37.1 / 38.8 /
 * 40.0). None of them was chosen -- each was whatever a MUI default's
 * line-box plus a call site's own vertical padding happened to add up to, so
 * a row of a select, a primary button and a secondary button stepped 35.7 ->
 * 38.8 -> 38.8 for no reason a reader could name. Height is now stated once,
 * here, and the families that opt out do so explicitly and say why (see
 * `MuiButton`'s `refineChip` variant and `SearchResults.tsx`'s column sort
 * headers).
 *
 * Applied as `minHeight` on buttons (so a wrapping label can still grow the
 * control rather than overflow it) and as a fixed `height` on inputs, whose
 * single-line box should not grow.
 */
export const controlHeight = 32;

/**
 * The mock's input text size (`font-size:14px` on every text input and
 * select), and -- load-bearing -- the single size the outlined-input family's
 * *two* independently rendered copies of a field label must both derive from.
 *
 * FM-090 measured why that matters. MUI's `NotchedOutline` sizes the notch
 * from a hidden `legend` that duplicates the label text at `fontSize:
 * '0.75em'` of the `InputBase` root, while the visible `InputLabel` is a
 * sibling of that root: it takes `typography.body1` (16px) and is shrunk by a
 * `scale(0.75)` transform. Stock MUI keeps the two in step only because both
 * ems are the same 16px. Setting the input size to 14px here without saying
 * anything about the label broke that: the notch was cut for 10.5px text
 * while the label painted at an effective 12px, a ~14% deficit that the
 * legend's 10px of span padding hides on short labels and cannot hide on long
 * ones. Measured on the running application at 1280x800, the search form's
 * "Additional filter terms" rendered a 118.50px label into a 118.00px notch,
 * and the Searching tab's "Timeout when accessing indexers" a 183.00px label
 * into a 177.00px notch -- the outline's top border crossing the back of the
 * label. In the fallback font, before the web font swaps in, the same two
 * fields were 5.39px and 13.70px over their notches.
 *
 * So `MuiInputLabel` below states this same size, restoring stock MUI's
 * invariant: both copies now derive from 14px (the label as 14px x 0.75, the
 * legend as 0.75em of 14px), and the legend's 10px padding plus small text's
 * slightly wider per-em advance leave the notch reliably wider than the label
 * at any length. Keep the two entries reading this constant rather than
 * restating the number, so retuning the control size cannot silently reopen
 * the gap.
 */
const controlFontSize = "14px";

/**
 * One step under `controlFontSize`: the text size the search-results surfaces
 * use for the controls packed *inside* the results area rather than around it
 * -- the refine sidebar's filter rows and numeric fields, the display-options
 * and selection menus' rows, the bulk-action bar's buttons and downloader
 * selects, and the results table's own title cells.
 *
 * FM-129 (ADR-0014): before this, the same `fontSize: "13px"` was written out
 * at eight sites across five files, with a `12.5px` near-duplicate at two
 * more; it is one type role, so it is stated once. Exported as a constant
 * rather than added as a typography variant or a `styleOverrides` entry
 * deliberately: every consumer is an `sx` prop on a component family
 * (`MuiButton`, `MuiSelect`, `MuiFormControlLabel`, `MuiInputBase`, `td`)
 * whose theme-level default is shared with the rest of the application, so a
 * variant or override here would change the density of surfaces this task
 * never looked at. A constant can only reach the files that import it.
 *
 * A CSS string, not a number: these are `sx` `fontSize` values, where a bare
 * `13` would resolve against the theme's own typography scale rather than to
 * pixels.
 */
export const denseControlFontSize = "13px";

/**
 * The mock's `toggleAll` select-all square's own corner radius
 * (`border-radius:5px`), copied from the mock's select-all control. FM-054:
 * `SearchResults.tsx` renders this one control's 17x17 square through two
 * genuinely separate mechanisms that must stay pixel-aligned -- the
 * `icon`/`checkedIcon`/`indeterminateIcon` overlay `Box`es and the real
 * `Checkbox` root's own `sx` -- so both are real consumers of the same value
 * rather than two independent literals that happened to match. No other
 * control in this application shares this radius (it is smaller than both
 * `pillRadius` and `shape.borderRadius`, matching the mock's own distinct,
 * denser geometry for this specific 17x17 control), so it is exposed as its
 * own constant rather than folded into either. A CSS string for the same
 * reason as `pillRadius` above -- both of this control's consumers are `sx`,
 * where a bare `5` renders as 40px and turns the square into a circle.
 */
export const selectAllRadius = "5px";

/**
 * The vertical rhythm between two filter sections of a refine surface, read
 * from the mock's Refine panel. FM-056 exposes it here because
 * `C-HISTORY-REFINE-BAR` has to reproduce the search sidebar's section spacing
 * without importing anything from that component (its own copy stays a local
 * constant); a spacing value is neither a color, a font, nor a radius, so this
 * is a shared-token convenience rather than an ADR-0014 requirement.
 */
export const refineSectionGap = "22px";

// Mock palette, sourced from `uimock/NZBHydra Search.dc.html` (its `<helmet>`
// `<style>` block, the outer
// page `<div>`'s inline style, and its `<header>`). Supersedes ADR-0007's
// legacy-grey tokens per ADR-0009's accepted full-mock-fidelity decision.
const mockPalette = {
    // Outer page `<div>` / `body{background:#1f2426}`.
    backgroundDefault: "#1f2426",
    // `<header>` surface tone; reused by MUI for `AppBar`, `Paper`, popovers.
    backgroundPaper: "#262c2e",
    // Outer page `<div>`'s `color:#d6dad9`.
    textPrimary: "#d6dad9",
    // The mock's muted nav/label color (`<nav>`'s inactive links).
    textSecondary: "#9aa2a1",
    // The mock's brand teal: logo tile, primary "Search" button, active accents.
    primary: "oklch(0.75 0.1 190)",
    // The mock's own emphasis variant of the same hue (result action links).
    primaryLight: "oklch(0.82 0.1 190)",
    // The mock's `a:hover` variant of the same hue.
    primaryDark: "oklch(0.85 0.1 190)",
    // Text drawn on top of the brand teal (`<button>Search</button>`).
    primaryContrastText: "#0e1c1b",
    // The mock's "all indexers online" status dot.
    success: "oklch(0.75 0.11 150)",
    // The mock's amber accent.
    warning: "oklch(0.76 0.1 70)",
    // No mock evidence: the mock never renders an `info` role, so ADR-0007's
    // legacy-grey value is deliberately kept rather than inventing an
    // unreviewed `oklch` one (see the FM-043 packet's Out Of Scope).
    info: "#398da5",
    // ADR-0035. The carried-over legacy `#a33938` was the one role never
    // re-authored with the rest of the palette, and it is used as a
    // *foreground* -- the text-variant `Button color="error"` Delete in the
    // indexer, downloader and external-tool dialogs, `RepeatSection`'s remove
    // button, and every other `color="error"` control listed in the FM-117
    // handoff. Measured against the two grounds those controls render on:
    // 2.16:1 on `background.paper` `#262c2e` and 2.39:1 on
    // `background.default` `#1f2426`, both far below WCAG 1.4.3's 4.5:1.
    //
    // ADR-0035 decides the fix is the token, not a per-button override, and
    // that the correction is *lightness only*: `#a33938` decomposes to
    // `oklch(0.496 0.141 24.283)`, so chroma and hue are carried across
    // unchanged (0.14 / 24.3) and only L moves, 0.496 -> 0.70. That lands on
    // `#e97872`, measured 4.99:1 on `background.paper` and 5.52:1 on
    // `background.default`. L was not pushed further towards the rest of the
    // palette's 0.74-0.78 band because this token is also a *background* in
    // two families (filled `Chip color="error"`, filled error `Alert`), and
    // every step of lightness spends contrast there to buy it here.
    error: "oklch(0.7 0.14 24.3)",
    // The mock's `::-webkit-scrollbar` thumb colors; it has no theme-token
    // equivalent, so the two literals stay here next to the palette they belong
    // to. The track and thumb border reuse `background.default` instead.
    scrollbarThumb: "#3a4446",
    scrollbarThumbHover: "#495456",
} as const;

// ADR-0014 surface tokens, read from the mock's search-bar row and controls.
// The single authoritative copy: feature code consumes these through the
// palette (`surfaces.*`), never by restating the literals.
const mockSurfaces = {
    bar: "#232a2c",
    control: "#2a3133",
    recessed: "#1c2224",
    hairline: "rgba(255, 255, 255, 0.1)",
    hairlineFaint: "rgba(255, 255, 255, 0.06)",
    mutedText: "#6b7472",
} as const;

/**
 * ADR-0036: the outlined-input notch border, as its own token rather than as
 * `surfaces.hairline`.
 *
 * The defect was that an outlined field did not read as outlined. Measured, the
 * resting `surfaces.hairline` `rgba(255, 255, 255, 0.1)` edge is **1.37:1**
 * against `background.paper` `#262c2e` and **1.36:1** against
 * `background.default` `#1f2426` -- below the 3:1 WCAG 1.4.11 asks of the
 * visual boundary that identifies a control, and so faint that MUI's permanently
 * shrunk label had nothing to sit in and read as floating over a filled box
 * instead of notched into a border.
 *
 * `0.35` is the lowest round alpha that clears 3:1 on **both** grounds:
 * **3.08:1** on `background.paper`, **3.17:1** on `background.default`, and
 * **3.19:1** against the field's own `surfaces.recessed` fill, so the edge is
 * legible from the inside too. (0.30 reaches only 2.64 / 2.69; MUI's own stock
 * dark outline, 0.23, only 2.11 / 2.13.)
 *
 * Authored here instead of by raising `surfaces.hairline` -- ADR-0036 allows
 * either -- because that token also paints the menu, popover and constraint-chip
 * borders, none of which were reported and none of which were measured. A
 * dedicated token keeps the change to the family the ADR is about.
 */
const inputOutline = "rgba(255, 255, 255, 0.35)";

// FM-024's chart categorical sequence (see the `ChartTokens` doc comment
// above): six oklch hues at the mock's own lightness/chroma band (L 0.72-0.82,
// C 0.09-0.12), spaced around the hue circle so adjacent series stay
// distinguishable for the deuteranopia/protanopia range the
// `dark-dyschromatopsia` preference exists for -- teal (reuses the brand
// primary), amber, violet, rose, blue, and green.
const chartCategoricalColors = [
    "oklch(0.75 0.1 190)",
    "oklch(0.78 0.12 80)",
    "oklch(0.76 0.11 300)",
    "oklch(0.74 0.12 20)",
    "oklch(0.75 0.1 250)",
    "oklch(0.78 0.11 140)",
] as const;

// MUI's default contrast text for a light-enough surface. Used verbatim for the
// roles MUI would otherwise compute it for, because `oklch()` is outside the
// sRGB formats `@mui/system`'s `getContrastRatio` can decompose.
const darkContrastText = "rgba(0, 0, 0, 0.87)";
const lightContrastText = "#fff";

/*
 * ---------------------------------------------------------------------------
 * The application's single authored keyboard focus indicator (ADR-0013).
 * ---------------------------------------------------------------------------
 *
 * ADR-0013 (`docs/frontend-migration/decisions/ADR-0013-application-wide-
 * keyboard-focus-indication.md`, accepted 2026-08-19, **Option A**) decides
 * that this application indicates keyboard focus with one explicit focus-ring
 * token, authored per control family and keyed to each component's own
 * `&.Mui-focusVisible` / `:focus-visible` selector. Option B (raising the
 * precedence of the global `:focus-visible` rule) was recommended by the ADR's
 * proposer and explicitly rejected by the repository owner; do not reintroduce
 * its mechanism -- no `!important`, no specificity raise, no per-family opt-in
 * on the `MuiCssBaseline` rule as the way the indicator is delivered.
 *
 * `focusRing()` below is that token, and it is the *only* focus declaration in
 * this file: the global `MuiCssBaseline` `:focus-visible` entry that predates
 * ADR-0013 is reconciled with it rather than left beside it, so the
 * application carries one focus system rather than two (ADR-0013's own
 * recorded cost for Option A). The reconciliation replaces that rule's
 * `currentColor` with this token's explicit colour, which is what fixed
 * `NewsPage`'s sanitized bare `<a href>` (its `currentColor` is the UA default
 * link blue, measured by FM-052 at 1.29:1) without changing what the one
 * family that already rendered the rule as authored paints -- MUI `Link` with
 * its default `component="a"`, whose `currentColor` was already
 * `palette.primary.main`.
 *
 * VERSION SCOPE AND RE-VERIFICATION DUTY (ADR-0012's precedent, ADR-0013's
 * `What would keep it from regressing`): every rule below is scoped to
 * `@mui/material` **7.3.9** and to Chrome for Testing, and depends on these
 * MUI internals, cited by symbol name because `node_modules` line numbers rot
 * between installs (the failure mode FM-047 hit):
 *
 *   - `ButtonBase/ButtonBase.js` -- `ButtonBaseRoot`'s unconditional
 *     `outline: 0`, and the `Mui-focusVisible` class `useUtilityClasses`
 *     composes onto the root when its `focusVisible` state is true. Its own
 *     `disableRipple` propType comment states the contract this file relies
 *     on: "Without a ripple there is no styling for :focus-visible by default.
 *     Be sure to highlight the element by applying separate styles with the
 *     `.Mui-focusVisible` class."
 *   - `internal/SwitchBase.js` -- `SwitchBaseRoot` (a `styled(ButtonBase)`
 *     rendered with `component: 'span'` and `additionalProps` including
 *     `role: undefined, tabIndex: null`) and `SwitchBaseInput` (a
 *     `styled('input')` with `{cursor: 'inherit', position: 'absolute',
 *     opacity: 0, width: '100%', height: '100%', top: 0, left: 0, margin: 0,
 *     padding: 0, zIndex: 1}`). Because the focusable node of a
 *     `Checkbox`/`Radio`/`Switch` is that fully transparent input, a
 *     `:focus-visible` rule paints there invisibly at any specificity, so
 *     those three families are authored on the *root* `Mui-focusVisible`
 *     class instead.
 *   - `OutlinedInput/OutlinedInput.js` -- its own `&.Mui-focused
 *     .notchedOutline { borderWidth: 2, borderColor: primary.main }` rule is
 *     the input/select family's focus indicator under ADR-0015 (measured by
 *     FM-052 at 3.15-5.56:1, passing the 3:1 axis everywhere). No ring is
 *     authored for `MuiInputBase`; see the note at the `MuiTextField` entry.
 *   - `Link/Link.js` -- both its `outline: 0` reset and its
 *     `` `&.${linkClasses.focusVisible}`: {outline: 'auto'} `` rule live
 *     inside one `variants` entry keyed `props: {component: 'button'}`.
 *   - `MenuItem/MenuItem.js`, `ListItemButton/ListItemButton.js`,
 *     `Chip/Chip.js` -- each ships its own `&.Mui-focusVisible` rule, which
 *     the entries below override rather than fight.
 *
 * After **any** `@mui/material` upgrade this must be re-proven by re-running
 * `tests/system/tests/focus-indication.spec.ts` in a real browser against a
 * real backend -- not by re-reading these sources, and not by a jsdom
 * component test, which has no `:focus-visible`, no layout, no computed
 * outline and no ripple element (ADR-0004).
 */
const focusRingWidth = "3px";
// The app's own authored geometry, and the one geometry this repository has
// measured passing: a 3px ring at a 3px offset has changed area
// `6(w+h) + 108` px2 against WCAG 2.4.11's `2 x perimeter` = `4(w+h)`
// threshold, which it clears at every control size.
const focusRingOutsetOffset = "3px";
// The same 3px ring drawn *inside* the control box (area `6(w+h) - 36` px2,
// still above the same threshold for every control in this application).
// Used only where an outset ring is measurably clipped by an `overflow`
// ancestor -- see the per-family entries below, each of which records its
// measured reason.
const focusRingInsetOffset = "-3px";

function focusRing(theme: Theme, offset: string = focusRingOutsetOffset) {
    return {
        outline: `${focusRingWidth} solid ${theme.palette.primary.main}`,
        outlineOffset: offset,
    } as const;
}

export function createHydraTheme(
    preference: ThemePreference = "dark",
    prefersDark = systemPrefersDark(),
): Theme {
    const mode = resolveThemeMode(preference, prefersDark);
    const dyschromatopsia = preference === "dark-dyschromatopsia";

    return createTheme({
        // MUI 7.3's own opt-in for a non-sRGB palette. `@mui/system`'s
        // `decomposeColor` only understands `#nnn`, `rgb()`, `hsl()` and
        // `color()`, so with the default sRGB color space every internal
        // `theme.alpha(palette.primary.main, ...)` call (`MenuItem`, `Chip`,
        // `Button` hover, selected rows, ...) throws on an `oklch()` token.
        // With `colorSpace` set, MUI emits relative-color `oklch(from ...)` and
        // `color-mix(in oklch, ...)` instead, which is what makes ADR-0009's
        // `oklch` palette renderable at all.
        colorSpace: "oklch",
        palette: {
            mode,
            background: {
                default: mockPalette.backgroundDefault,
                paper: mockPalette.backgroundPaper,
            },
            text: {
                primary: mockPalette.textPrimary,
                secondary: mockPalette.textSecondary,
            },
            surfaces: mockSurfaces,
            charts: {categorical: [...chartCategoricalColors]},
            // Every role spells out its own `contrastText`: under `colorSpace`
            // MUI would otherwise derive it as `oklch(from <main> var(--__l) 0
            // h / var(--__a))`, whose custom properties only exist in the CSS
            // theme-variables build this app does not use.
            primary: {
                main: mockPalette.primary,
                light: mockPalette.primaryLight,
                dark: mockPalette.primaryDark,
                contrastText: mockPalette.primaryContrastText,
            },
            success: {
                main: mockPalette.success,
                contrastText: darkContrastText,
            },
            warning: {
                main: mockPalette.warning,
                contrastText: darkContrastText,
            },
            info: {main: mockPalette.info, contrastText: lightContrastText},
            // ADR-0035's required re-check of the sites that use this token as
            // a *background* rather than a foreground. `error.main` is now
            // light, so the previous `#fff` fails on it (2.84:1) where it
            // passed on `#a33938` (6.56:1); the dark contrast text MUI itself
            // derives for a light role restores the pairing at 6.51:1. This is
            // the same move the dyschromatopsia variant below already makes for
            // its own lighter `error`, and it stays a token change -- no call
            // site gains a colour of its own.
            error: {main: mockPalette.error, contrastText: darkContrastText},
            // The dark-dyschromatopsia accessibility variant's own overrides are
            // spread last so they continue to take precedence over the base
            // palette above, unchanged in value from ADR-0007. Their
            // `contrastText` values are the ones MUI itself derived for them
            // before `colorSpace` was introduced, restated here only so the
            // variant keeps rendering exactly the same text colors.
            ...(dyschromatopsia
                ? {
                      background: {default: "#000000", paper: "#0f1113"},
                      error: {
                          main: "#b090c8",
                          contrastText: darkContrastText,
                      },
                      info: {main: "#3aaccf", contrastText: darkContrastText},
                      primary: {
                          main: "#78909c",
                          contrastText: lightContrastText,
                      },
                      success: {
                          main: "#30b885",
                          contrastText: darkContrastText,
                      },
                      warning: {
                          main: "#f0a830",
                          contrastText: darkContrastText,
                      },
                  }
                : {}),
        },
        typography: {
            fontFamily: uiFontFamily,
            // `typography.fontSize` is deliberately left at MUI's default 14,
            // which already matches the mock page `<div>`'s own `font-size:14px`.
            //
            // The mock's Refine panel caption, as a reusable variant: each
            // filter section's caption, and the history views' header summary.
            // The mock's louder panel-header label above it is gone with the
            // caption it painted (FM-142).
            refineSectionLabel: {
                color: mockSurfaces.mutedText,
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.6px",
                textTransform: "uppercase",
            },
        },
        // The mock's dominant corner radius: 21 of its inline styles use
        // `border-radius:8px` (nav pills, the primary Search button, every text
        // input, the toolbar buttons), more than all its other radii combined.
        shape: {borderRadius: 8},
        components: {
            MuiCssBaseline: {
                styleOverrides: (theme) => ({
                    // ADR-0013 family H, and the reconciliation half of this
                    // file's reconcile-or-scope choice. This rule predates
                    // ADR-0013 and stays in force, but it now renders the same
                    // authored token every family below renders, instead of
                    // its own second one in `currentColor`. It is the only
                    // indicator for the one control class in the application
                    // that no MUI component styles at all: the sanitized,
                    // unclassed native `<a href>` `NewsPage`'s
                    // `SafeRichContent` renders from third-party HTML.
                    ":focus-visible": focusRing(theme),
                    // The mock's `<helmet>` scrollbar block, for browsers that
                    // honor the `::-webkit-scrollbar` pseudo-elements. Track and
                    // thumb border reuse the page background token so a future
                    // palette change does not need this rule edited.
                    "*::-webkit-scrollbar": {width: 11, height: 11},
                    "*::-webkit-scrollbar-track": {
                        background: theme.palette.background.default,
                    },
                    "*::-webkit-scrollbar-thumb": {
                        background: mockPalette.scrollbarThumb,
                        borderRadius: 6,
                        border: `2px solid ${theme.palette.background.default}`,
                    },
                    "*::-webkit-scrollbar-thumb:hover": {
                        background: mockPalette.scrollbarThumbHover,
                    },
                }),
            },
            MuiButton: {
                styleOverrides: {
                    root: ({theme}) => ({
                        // The mock labels its buttons "Search" / "Load more
                        // results" / "Send to downloader" in sentence case.
                        textTransform: "none",
                        // The shared control height. `minHeight`, not
                        // `height`, so a button whose label wraps grows
                        // instead of clipping. The vertical padding is zeroed
                        // with it: MUI sizes buttons purely by padding around
                        // a line-box, which is exactly what produced the
                        // 30.8 / 36.5 / 38.8 spread this replaces -- with a
                        // stated height that padding has nothing left to do,
                        // and leaving it in would only push short-labelled
                        // buttons back above 32.
                        minHeight: controlHeight,
                        paddingTop: 0,
                        paddingBottom: 0,
                        // The mock's own button radius (`border-radius:8px` on
                        // the primary Search button and the toolbar buttons).
                        borderRadius: 8,
                        // ADR-0013 family B (the `ButtonBase` ripple family).
                        // `ButtonBaseRoot`'s unconditional `outline: 0` is why
                        // the global rule never reached these controls; the
                        // ripple that stood in for it measured 1.19:1 to
                        // 2.38:1 (FM-052). Authored on the root's own
                        // `Mui-focusVisible` class, so it does not depend on
                        // winning a specificity or insertion-order fight.
                        "&.Mui-focusVisible": focusRing(theme),
                    }),
                },
                // FM-056: the refine surfaces' selection pill (the mock's
                // `chip(active)`), as a themed `Button` variant. Its selected
                // look is keyed to the control's own `aria-pressed` state, so
                // the accessible state and the visual state cannot drift
                // apart, and a consumer writes no color, font, or radius of
                // its own.
                variants: [
                    {
                        props: {variant: "refineChip"},
                        style: ({theme}: {theme: Theme}) => ({
                            backgroundColor: theme.palette.surfaces.bar,
                            border: `1px solid ${theme.palette.surfaces.hairline}`,
                            borderRadius: pillRadius,
                            color: theme.palette.text.secondary,
                            fontFamily: monoFontFamily,
                            fontSize: "12px",
                            fontWeight: 400,
                            lineHeight: 1.3,
                            // The one button family that is deliberately NOT
                            // `controlHeight`. These are the mock's dense
                            // 26px quality/type pills: a row of them is a
                            // compact multi-select, not a row of actions, and
                            // at 32px they read as a wall of buttons. Stated
                            // as an explicit opt-out rather than inherited by
                            // accident -- `minHeight: 0` releases the root's
                            // shared height, and the padding below is what
                            // sizes them again.
                            minHeight: 0,
                            minWidth: 0,
                            padding: "5px 10px",
                            "&:hover": {
                                backgroundColor: theme.palette.surfaces.bar,
                                borderColor: theme.alpha(
                                    theme.palette.primary.main,
                                    0.16,
                                ),
                            },
                            '&[aria-pressed="true"]': {
                                backgroundColor: theme.alpha(
                                    theme.palette.primary.main,
                                    0.16,
                                ),
                                borderColor: theme.alpha(
                                    theme.palette.primary.main,
                                    0.45,
                                ),
                                color: theme.palette.primary.light,
                                "&:hover": {
                                    backgroundColor: theme.alpha(
                                        theme.palette.primary.main,
                                        0.16,
                                    ),
                                    borderColor: theme.alpha(
                                        theme.palette.primary.main,
                                        0.45,
                                    ),
                                },
                            },
                        }),
                    },
                    // The neutral secondary action described on
                    // `ButtonPropsVariantOverrides.control` above. The mock's
                    // raised control surface behind a hairline, at the same
                    // 8px `shape.borderRadius` the primary Search button and
                    // every text input take -- so a secondary action reads as
                    // the *same shape* as a primary one and differs only in
                    // weight, while a selection pill (`refineChip`) differs in
                    // shape because it is a different kind of thing.
                    {
                        props: {variant: "control"},
                        style: ({theme}: {theme: Theme}) => ({
                            backgroundColor: theme.palette.surfaces.control,
                            border: `1px solid ${theme.palette.surfaces.hairline}`,
                            color: theme.palette.text.primary,
                            fontSize: "13px",
                            fontWeight: 400,
                            // Horizontal only. Height is the root's shared
                            // `controlHeight`, which also settles what used
                            // to need compensating for here: this variant
                            // draws a 1px border the filled primary does not,
                            // so matched vertical padding made it 2px taller
                            // than the "Send selected to downloader" beside
                            // it. A stated height is border-box, so the two
                            // now agree by construction.
                            padding: "0 13px",
                            "&:hover": {
                                backgroundColor: theme.palette.surfaces.control,
                                borderColor: theme.alpha(
                                    theme.palette.primary.main,
                                    0.35,
                                ),
                            },
                            // Real `disabled` semantics (ADR-0002/FM-040:
                            // never opacity alone) on the same surface, so a
                            // disabled secondary action keeps its footprint
                            // and only its text goes muted.
                            "&.Mui-disabled": {
                                backgroundColor: theme.palette.surfaces.control,
                                borderColor: theme.palette.surfaces.hairline,
                                color: theme.palette.surfaces.mutedText,
                            },
                        }),
                    },
                ],
            },
            // `ToggleButton` is its own `styled(ButtonBase)` component, not a
            // `Button`, so it inherits nothing from the `MuiButton` entry
            // above -- which is exactly how the stats date-range segmented
            // control ("Last 7 days" ... "Custom") stayed at 38.8px while
            // every other control in the application moved to
            // `controlHeight`. Sentence case for the same reason `MuiButton`
            // states it: these are labels, not shouted captions.
            MuiToggleButton: {
                styleOverrides: {
                    root: {
                        minHeight: controlHeight,
                        paddingTop: 0,
                        paddingBottom: 0,
                        textTransform: "none",
                    },
                },
            },
            // ADR-0013 family B, continued. `IconButton` and `Tab` are
            // separate `styled(ButtonBase)` components with their own theme
            // slots, so each names the shared token itself rather than
            // relying on a single `MuiButtonBase` entry cascading into them.
            MuiIconButton: {
                styleOverrides: {
                    root: ({theme}) => ({
                        "&.Mui-focusVisible": focusRing(theme),
                        // 4px around MUI's 24px default glyph is exactly
                        // `controlHeight`, so a bar control like the search
                        // form's Advanced toggle stops being the tallest
                        // thing in its row (it measured 40px). Expressed as
                        // padding rather than a fixed box so `size="small"`
                        // (a 20px glyph) stays proportionally smaller for
                        // in-row icons instead of being padded out to match.
                        padding: 4,
                    }),
                },
            },
            // ADR-0013 family B, continued -- and the one family whose
            // geometry is shaped differently for a directly measured reason.
            // `Tabs` renders every `Tab` inside a `.MuiTabs-scroller` whose
            // computed `overflow` is not `visible` and whose height equals the
            // tab's own height, so an outset ring at a 3px offset is clipped
            // top and bottom (measured live: `stats-tab`, control box
            // 160.00x48.00, outset ring rect exceeded the scroller rect).
            // Drawn inset instead, which clears the same WCAG 2.4.11 area
            // threshold and is not clipped.
            MuiTab: {
                styleOverrides: {
                    root: ({theme}) => ({
                        "&.Mui-focusVisible": focusRing(
                            theme,
                            focusRingInsetOffset,
                        ),
                    }),
                },
            },
            // ADR-0013 family C (the `SwitchBase` family). Authored on the
            // *root* `Mui-focusVisible` class, never on `:focus-visible`:
            // `internal/SwitchBase.js` renders `SwitchBaseInput` as a
            // `styled('input')` with `opacity: 0` covering the whole control,
            // and that transparent overlay is the node that takes DOM focus,
            // so a `:focus-visible` rule paints there invisibly at any
            // specificity. This is the entire reason ADR-0013 chose Option A
            // over Option B for this family.
            MuiCheckbox: {
                styleOverrides: {
                    root: ({theme}) => ({
                        "&.Mui-focusVisible": focusRing(theme),
                    }),
                },
            },
            MuiRadio: {
                styleOverrides: {
                    root: ({theme}) => ({
                        "&.Mui-focusVisible": focusRing(theme),
                    }),
                },
            },
            MuiSwitch: {
                styleOverrides: {
                    root: ({theme}) => ({
                        "&.Mui-focusVisible": focusRing(theme),
                    }),
                },
            },
            // ADR-0015 (amending ADR-0013): the text-input/select family does
            // NOT carry the authored ring. With ADR-0014 restoring stock
            // outlined inputs everywhere, this family indicates focus through
            // MUI's own focused `notchedOutline` (2px `primary.main`), which
            // FM-052 measured passing the 3:1 contrast axis at every site
            // (3.15-5.56:1). The previous `MuiInputBase`
            // `&:has(:focus-visible)` ring double-bordered every focused
            // select and is deliberately absent; do not reintroduce it.
            //
            // ADR-0014 input-family defaults: the mock's recessed input
            // surface and hairline border, and the mock's compact control
            // size, applied here once so feature code never restates them.
            MuiTextField: {
                defaultProps: {size: "small"},
            },
            // The mock's input text size (`font-size:14px` on every text
            // input and select). MUI's `InputBase` root spreads
            // `typography.body1` (1rem = 16px), which is what made every
            // form control render two pixels larger -- and visually heavier,
            // at the same 400 weight -- than the mock.
            MuiInputBase: {
                styleOverrides: {
                    root: {
                        fontSize: controlFontSize,
                        // The shared control height, so a select or text
                        // field sitting in a row of buttons (the search bar,
                        // the results action row) is the same box as they
                        // are. Excludes `multiline`, whose whole purpose is
                        // to grow with its content.
                        "&:not(.MuiInputBase-multiline)": {
                            height: controlHeight,
                        },
                    },
                },
            },
            // The mock's field labels sit permanently in the border notch
            // (its floated 11px caption on every field), never down inside
            // the input where they would sit behind the value. Always-shrunk
            // labels also let MUI show placeholders at rest instead of
            // hiding them behind an unshrunk label.
            MuiInputLabel: {
                defaultProps: {shrink: true},
                styleOverrides: {
                    // The other half of the notch invariant documented at
                    // `controlFontSize`: the visible label is not inside the
                    // `InputBase` root, so it does not inherit the input's
                    // size and would otherwise stay at `body1`'s 16px while
                    // the notch legend is cut at `0.75em` of 14px. Stating
                    // the control size here makes both copies of the label
                    // derive from the same number again, which is the whole
                    // reason a long label now fits its own notch.
                    root: {fontSize: controlFontSize},
                },
            },
            // The mock's checkbox rows (the indexer grid) label at 13px;
            // MUI's `FormControlLabel` otherwise spreads `body1` (16px).
            MuiFormControlLabel: {
                styleOverrides: {
                    label: {fontSize: "13px"},
                },
            },
            // ADR-0013 family F. Drawn *inset*, for a measured reason: both
            // render inside a `Paper` whose computed overflow is not
            // `visible`, and an outset ring at a 3px offset was measured
            // clipped by it -- by the `Menu` `Paper` for a `MenuItem` (the
            // category `Select`'s options and the recent-search entries), and
            // by the mobile navigation `Drawer`'s `MuiPaper-elevation16` for a
            // `ListItemButton`, where it additionally overlapped two
            // neighbouring controls. The inset ring is not clipped at either
            // site and clears the same WCAG 2.4.11 area threshold. Their stock
            // MUI indicator is a
            // `&.Mui-focusVisible { background-color: palette.action.focus }`
            // tint measured at 1.46:1, and 1.73:1 for the compound
            // `Mui-selected` variant an open `Select` renders (FM-052); the
            // authored ring is layered over whichever of those applies rather
            // than replacing it, so the compound variant needs no rule of its
            // own.
            MuiMenuItem: {
                styleOverrides: {
                    root: ({theme}) => ({
                        // The mock's menu rows are 14px like its inputs;
                        // MUI's default is `body1` (16px).
                        fontSize: "14px",
                        "&.Mui-focusVisible": focusRing(
                            theme,
                            focusRingInsetOffset,
                        ),
                    }),
                },
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: ({theme}) => ({
                        "&.Mui-focusVisible": focusRing(
                            theme,
                            focusRingInsetOffset,
                        ),
                    }),
                },
            },
            // ADR-0013 family H, explicitly. `Link.js` gates both its
            // `outline: 0` reset and its `&.MuiLink-focusVisible {outline:
            // 'auto'}` rule behind `props: {component: 'button'}`, so an
            // `href` link (this application's only rendering today) takes
            // neither and renders the `MuiCssBaseline` rule above. Authored
            // here anyway so the family keeps the token if a `Link
            // component="button"` is ever added.
            MuiLink: {
                styleOverrides: {
                    root: ({theme}) => ({
                        "&:focus-visible": focusRing(theme),
                    }),
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: ({ownerState}) => ({
                        // ADR-0036's ground resolution, the half that has to
                        // be true before the other half means anything.
                        // `Paper` in dark mode paints an elevation overlay --
                        // `--Paper-overlay`, a flat white wash whose alpha
                        // comes from `getOverlayAlpha(elevation)` -- *over*
                        // `background.paper`. At the `elevation={24}` MUI's
                        // `Dialog` uses that is white at 0.165, so a dialog's
                        // real ground is not `#262c2e` but roughly `#4a4f50`,
                        // and a config tab body given a `Paper` of its own
                        // would have landed on a third ground rather than the
                        // dialogs'. The mock has no such wash -- its surfaces
                        // are flat colours -- and this application had already
                        // turned the overlay off twice by hand, on `MuiMenu`
                        // and `MuiPopover` below. Stating it once here makes
                        // `background.paper` mean `background.paper` on every
                        // raised surface, which is what lets one field render
                        // one way.
                        //
                        // FM-147 has since removed that tab-body `Paper` again
                        // (ADR-0036's 2026-08-30 amendment: config renders on
                        // the page ground like every other section), so the
                        // grounds a field can sit on are two, not one. This
                        // line is unaffected and stays: a raised surface whose
                        // colour depends on its elevation is exactly what made
                        // "what ground is this?" unanswerable, and every
                        // measurement in this file is taken against flat
                        // surfaces.
                        backgroundImage: "none",
                        // The mock's results card is `border-radius:12px`.
                        // Raised, non-square surfaces (cards, menus, dialogs,
                        // drawers) adopt it; `AppBar` renders its `Paper` with
                        // `square`, so the shell header keeps its full-bleed
                        // square corners.
                        ...(ownerState.square ||
                        (ownerState.elevation ?? 0) === 0
                            ? {}
                            : {borderRadius: 12}),
                    }),
                },
            },
            MuiOutlinedInput: {
                // Keep the border notch open to match the permanently shrunk
                // labels above: `TextField` only forwards `notched` from an
                // explicit `InputLabelProps.shrink`, not from the theme
                // default, so without this the label would float over an
                // unbroken border. Label-less inputs render an empty legend,
                // which draws no gap.
                defaultProps: {notched: true},
                styleOverrides: {
                    // The mock's text inputs: 8px radius (pinned explicitly so
                    // the input radius stays the mock's even if the shared
                    // default is retuned later), recessed surface, hairline
                    // resting border. MUI's own `&.Mui-focused
                    // .notchedOutline` rule has higher specificity than the
                    // resting recolour, so the focused 2px `primary.main`
                    // border still paints (ADR-0015's chosen indicator for
                    // this family).
                    root: ({theme}) => ({
                        borderRadius: 8,
                        backgroundColor: theme.palette.surfaces.recessed,
                        "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: inputOutline,
                        },
                        // ADR-0036's "hover, focus, disabled and error stay
                        // mutually distinguishable" clause, and the one state
                        // the stronger resting border actually collided with.
                        // MUI paints a disabled outline in `action.disabled`,
                        // `rgba(255, 255, 255, 0.3)` in dark mode -- 1.17:1
                        // against the new 0.35 resting edge, i.e. the same
                        // border. Stepping *down* to the hairline instead
                        // reads as the weaker thing a disabled control should
                        // be and measures 2.25:1 against rest. The other three
                        // states need no rule here and are unchanged: hover
                        // repaints the outline `text.primary` (3.26:1 against
                        // rest), focus doubles it to 2px `primary.main`
                        // (ADR-0015's indicator for this family), and error
                        // repaints it `error.main`, now a light red rather
                        // than a near-black one.
                        "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
                            borderColor: theme.palette.surfaces.hairline,
                        },
                    }),
                    // The inner control, sized to the root's stated
                    // `controlHeight`. This has to be authored on
                    // `MuiOutlinedInput` rather than on `MuiInputBase`:
                    // `OutlinedInput` ships its own `input` slot carrying
                    // `padding: 8.5px 14px` at `size="small"`, and a
                    // component slot outranks the base's, so the same rule on
                    // `MuiInputBase.input` lost silently. Measured live
                    // before this entry existed: root 32px, inner `<input>`
                    // 49px -- `height: 100%` resolved to a 32px *content* box
                    // under `content-box` sizing and MUI's 17px of vertical
                    // padding was then added on top, so the focusable element
                    // overflowed its own visible border by 17px.
                    //
                    // Vertical padding goes to zero and the element fills the
                    // height instead, which is what centres the 14px value in
                    // a 32px box. Horizontal padding is left to MUI.
                    input: {
                        boxSizing: "border-box",
                        height: "100%",
                        paddingTop: 0,
                        paddingBottom: 0,
                        // A select renders a `div` in this slot rather than
                        // an `<input>`; it needs the line centred explicitly
                        // because a block box does not centre its own text
                        // the way an input's inner editor does.
                        "&.MuiSelect-select": {
                            alignItems: "center",
                            display: "flex",
                        },
                        // The native number spinner, suppressed once for the
                        // whole application. Seven `type="number"` fields
                        // render across four files and exactly one of them --
                        // `filterControls.tsx`'s `numericFieldSx` -- carried
                        // these two rules locally, its own comment noting that
                        // the theme did not express them; that copy is deleted
                        // with this entry rather than duplicated.
                        //
                        // Both halves are needed and neither is redundant:
                        // Firefox draws the spinner as part of the input's own
                        // widget and only `appearance: textfield` takes it
                        // away (spelled with the `-moz-` prefix as well, which
                        // is what Firefox honoured before the property was
                        // unprefixed and what the acceptance names), while
                        // Chromium draws it as the `::-webkit-*-spin-button`
                        // pseudo-elements, which `appearance` does not touch.
                        // Keyboard Up/Down stepping is a property of
                        // `type="number"` itself, not of the arrows, and is
                        // unaffected by either rule.
                        "&[type=number]": {
                            MozAppearance: "textfield",
                            appearance: "textfield",
                        },
                        "&[type=number]::-webkit-outer-spin-button, &[type=number]::-webkit-inner-spin-button":
                            {
                                WebkitAppearance: "none",
                                margin: 0,
                            },
                    },
                },
            },
            // FM-117 (a). The application had no `MuiAutocomplete` entry at
            // all, so a chips field inherited the input family's single-line
            // geometry: `MuiInputBase`'s `&:not(.MuiInputBase-multiline)`
            // clamp pinned the root at `controlHeight`, and
            // `MuiOutlinedInput.input`'s `height: 100%` pinned the inner
            // editor to it. A `multiple` `Autocomplete` wraps its tags onto
            // as many rows as they need (MUI's own `flexWrap: "wrap"`
            // variant), so every row past the first was drawn outside a 32px
            // box and clipped -- with 21 `ChipsSetting` call sites behind it.
            //
            // The clamp is not deleted; `controlHeight`'s own comment says it
            // exists for inputs "whose single-line box should not grow", and
            // that is still true of every text field and select in the
            // application. What this entry does is say that a multi-value
            // Autocomplete is not one of those, on exactly the pattern
            // `MuiButton` already uses for a wrapping label: `minHeight`
            // instead of `height`, so a chips field that fits on one row is
            // still the same 32px-tall control as its neighbours and one that
            // does not grows instead of clipping. Keyed on MUI's own
            // `multiple` prop through a theme variant, so a single-value
            // Autocomplete -- which really is a single-line control -- keeps
            // the clamp.
            //
            // The compound `.MuiAutocomplete-inputRoot.MuiInputBase-root`
            // selector is deliberate rather than incidental: the clamp it has
            // to beat is a two-class rule of its own
            // (`&:not(.MuiInputBase-multiline)`), so an equal-specificity
            // override would be decided by emotion's insertion order, which
            // depends on which component happens to render first.
            MuiAutocomplete: {
                styleOverrides: {
                    // FM-117 correction. `MuiPaper.root`'s
                    // `backgroundImage: "none"` above is what makes one ground
                    // possible, but it also removes the only thing that
                    // separated a *borderless* raised `Paper` from whatever it
                    // is drawn over. MUI's `AutocompletePaper`
                    // (`Autocomplete.js:306`) is exactly that: a plain `Paper`
                    // with no background and no border of its own. And
                    // `.MuiAutocomplete-paper` is a slot of its own, matched by
                    // neither the `MuiMenu` nor the `MuiPopover` rule below --
                    // the same class-is-not-inherited trap FM-054 recorded when
                    // a bare `Popover` needed `Menu`'s treatment authored a
                    // second time.
                    //
                    // So the suggestion list behind all 21 `ChipsSetting` call
                    // sites and `SettingsSearchField` opened at exactly
                    // `background.paper` `#262c2e` over the config surfaces
                    // that were `#262c2e` too while FM-117's tab-body `Paper`
                    // stood: **1.000:1**, a floating list with nothing but a
                    // near-black elevation shadow between it and the page. At
                    // base it was the elevation-1 wash `#313739`, **1.294:1**
                    // over the `background.default` tab body and 1.169:1 over
                    // `background.paper`.
                    //
                    // Restored with the treatment this theme already gives its
                    // other two floating lists rather than inventing a third:
                    // the raised `surfaces.control` fill plus a
                    // `surfaces.hairline` edge. Measured, the fill reads
                    // **1.070:1** against `background.paper` and **1.185:1**
                    // against `background.default`, and the edge -- which is
                    // what actually delimits the list -- **1.465:1** and
                    // **1.622:1**, both above the 1.294:1 boundary the base
                    // build had. `backgroundImage` is deliberately not
                    // restated: `MuiPaper.root` now says it once for every
                    // surface, which is the point of that rule.
                    //
                    // FM-147 removed the tab-body `Paper` again on the owner's
                    // request (ADR-0036's 2026-08-30 amendment), so a list
                    // opened over a config tab is back on the
                    // `background.default` pair of those numbers -- 1.185:1
                    // and 1.622:1, the better-separated of the two. The
                    // treatment is unchanged; only which ground a config
                    // surface presents is.
                    paper: ({theme}) => ({
                        backgroundColor: theme.palette.surfaces.control,
                        border: `1px solid ${theme.palette.surfaces.hairline}`,
                        // Measured collateral of the two lines above, not a
                        // precaution. Every `ChipsSetting` call site except
                        // the indexer dialog's "Indexer groups" is passed no
                        // suggestions, and a `freeSolo` Autocomplete with no
                        // options still mounts this `Paper` with nothing
                        // inside it: borderless and unfilled it painted
                        // nothing, but a fill and a 1px edge turned it into a
                        // 560x2 strip under the focused field. `:empty` is
                        // exactly the condition -- a paper holding a listbox,
                        // a loading row or a "no options" node has children.
                        "&:empty": {display: "none"},
                    }),
                },
                variants: [
                    {
                        props: {multiple: true},
                        style: {
                            "& .MuiAutocomplete-inputRoot.MuiInputBase-root": {
                                height: "auto",
                                minHeight: controlHeight,
                            },
                            // The free-text editor is a flex item beside the
                            // tags, so it must not stretch to the wrapped
                            // height the way `MuiOutlinedInput.input`'s
                            // `height: 100%` asks it to in a fixed-height box.
                            "& .MuiAutocomplete-inputRoot .MuiAutocomplete-input":
                                {
                                    height: "auto",
                                },
                        },
                    },
                ],
            },
            // FM-117 correction, and the second surface `MuiPaper.root`'s
            // `backgroundImage: "none"` left co-planar with its container. The
            // notification entry list
            // (`NotificationEntriesSection.tsx:142`) renders one
            // default-elevation `Accordion` -- a borderless `Paper` -- per
            // entry inside the config tab body. While FM-117's tab-body
            // `Paper` stood, both were exactly `background.paper` `#262c2e`,
            // so the card boundary that measured **1.294:1** at base (the
            // elevation-1 wash `#313739` over the `background.default`
            // `#1f2426` tab body) measured **1.000:1** afterwards: the entries
            // stopped reading as raised cards and became flat rows separated
            // only by MUI's `divider` hairline.
            //
            // Given the same raised treatment as the floating lists below --
            // `surfaces.control` fill plus a `surfaces.hairline` edge -- so
            // that "a raised surface in this application looks like this" has
            // one answer. Measured on `background.paper`: the fill lifts the
            // card to **1.070:1** and the edge reads **1.465:1**, i.e. a
            // stronger boundary than the base build's 1.294:1. FM-147 then
            // removed the tab-body `Paper` on the owner's request (ADR-0036's
            // 2026-08-30 amendment), so the ground these cards actually sit on
            // is `background.default` again and the pair is the wider
            // **1.185:1** / **1.622:1** -- better separation, not worse, and
            // the treatment itself is untouched. The fields inside keep their
            // outline either way: ADR-0036's `inputOutline` measures
            // **3.01:1** against `surfaces.control`, still clearing WCAG
            // 1.4.11's 3:1, and the recessed field fill separates from the
            // card at 1.216:1 rather than the 1.169:1 it had against
            // `background.paper`.
            //
            // The geometry has to move with the colour. MUI stacks accordions
            // flush and separates them with a 1px `::before` divider precisely
            // because the stock card has no border of its own; with a border
            // that divider doubles the seam, and flush cards whose inner
            // corners are squared (MUI's `!square` variant zeroes the radius
            // for all but the group's outer corners) do not read as cards at
            // all. So the divider goes, the 12px radius `MuiPaper` already
            // gives every raised surface is restated at the selectors MUI
            // squares, and consecutive entries gain a gap. `Mui-expanded`'s
            // own `margin: 16px 0` is neutralised so the gap between two
            // entries does not depend on whether one of them happens to be
            // open.
            MuiAccordion: {
                styleOverrides: {
                    root: ({theme}) => ({
                        backgroundColor: theme.palette.surfaces.control,
                        border: `1px solid ${theme.palette.surfaces.hairline}`,
                        borderRadius: 12,
                        "&:first-of-type, &:last-of-type": {borderRadius: 12},
                        "&::before": {display: "none"},
                        "&:not(:first-of-type)": {marginTop: theme.spacing(1)},
                        "&.Mui-expanded": {margin: 0},
                        "&.Mui-expanded:not(:first-of-type)": {
                            marginTop: theme.spacing(1),
                        },
                    }),
                },
            },
            // Menus and select popovers render on the mock's raised control
            // surface with a hairline border.
            MuiMenu: {
                styleOverrides: {
                    paper: ({theme}) => ({
                        backgroundColor: theme.palette.surfaces.control,
                        backgroundImage: "none",
                        border: `1px solid ${theme.palette.surfaces.hairline}`,
                    }),
                },
            },
            // FM-054: a bare `Popover` (the results toolbar's display-options
            // panel) is a distinct MUI slot from `Menu`'s own popover -- each
            // targets a different CSS class (`.MuiPopover-paper` vs
            // `.MuiMenu-paper`) even though `Menu` renders through `Popover`
            // internally -- so it needs the identical control-surface
            // treatment authored a second time here rather than inherited.
            MuiPopover: {
                styleOverrides: {
                    paper: ({theme}) => ({
                        backgroundColor: theme.palette.surfaces.control,
                        backgroundImage: "none",
                        border: `1px solid ${theme.palette.surfaces.hairline}`,
                    }),
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: ({theme}) => ({
                        // The mock's quality/type pills are `padding:5px 10px`
                        // around a 12px monospace label inside a 1px border,
                        // i.e. ~26px tall -- appreciably denser than MUI's 32px
                        // default.
                        height: 26,
                        // The mock's own pill radius; see `pillRadius`'s doc
                        // comment above for the second consumer this is
                        // shared with.
                        borderRadius: pillRadius,
                        // ADR-0013 family G. `Chip.js` ships several
                        // `&.Mui-focusVisible` background rules; this
                        // overrides them with the shared token. The one `Chip`
                        // this application renders (`SearchResults.tsx`'s
                        // static "Downloaded" indicator) passes neither
                        // `onClick` nor `onDelete`, so it is not focusable and
                        // FM-052 dispositioned it out of WCAG 2.4.7/2.4.11
                        // scope; the rule is authored so the family is covered
                        // the moment an interactive `Chip` appears, and it is
                        // recorded in the FM-053 handoff as the one authored
                        // family with no keyboard-reachable representative to
                        // gate.
                        "&.Mui-focusVisible": focusRing(theme),
                    }),
                },
                // FM-087: the search bar's constraint chips. The mock's pill
                // language (mono 12px label on the bar ground behind a
                // hairline) as a variant, so the search feature writes no
                // colour, font, or radius of its own. The typography half is
                // authored for every colour; the surface half only for the
                // default colour, so an `color="warning"` constraint chip
                // (the empty-indexer-selection state) keeps MUI's own stock
                // warning treatment instead of being repainted here.
                variants: [
                    {
                        props: {variant: "constraint"},
                        style: {
                            fontFamily: monoFontFamily,
                            fontSize: "12px",
                            fontWeight: 400,
                        },
                    },
                    {
                        props: {variant: "constraint", color: "default"},
                        style: ({theme}: {theme: Theme}) => ({
                            backgroundColor: theme.palette.surfaces.bar,
                            border: `1px solid ${theme.palette.surfaces.hairline}`,
                            color: theme.palette.text.secondary,
                            "&:hover": {
                                backgroundColor: theme.palette.surfaces.bar,
                                borderColor: theme.alpha(
                                    theme.palette.primary.main,
                                    0.16,
                                ),
                            },
                            [`& .${chipClasses.deleteIcon}`]: {
                                color: theme.palette.surfaces.mutedText,
                                "&:hover": {
                                    color: theme.palette.primary.light,
                                },
                            },
                        }),
                    },
                ],
            },
        },
    });
}

function systemPrefersDark(): boolean {
    return (
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
    );
}
