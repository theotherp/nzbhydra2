import {chipClasses} from "@mui/material/Chip";
import {
    createTheme,
    type CSSObject,
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

    // `@mui/material@9.4.0` reads `options.colorSpace` in `createThemeNoVars`
    // and exposes it on the theme (its `alpha`/`lighten`/`darken` helpers and
    // `createPalette`'s `augmentColor` both branch on it), but only declares the
    // option on the internal `createColorScheme` signature, not on the public
    // `ThemeOptions`. Declare it here until MUI ships the type.
    interface ThemeOptions {
        colorSpace?: string | undefined;
    }

    // ADR-0014: the mock's surface tokens (declared as `SurfaceTokens` at this
    // file's own module scope, because FM-154's theme blocks state them too),
    // exposed on the palette so feature code can consume them via `sx` palette
    // paths ("surfaces.control") instead of restating hex literals.
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
        /**
         * FM-172 (ADR-0053): the fill of a bar's own value label. Stated per
         * theme rather than shared, because it sits on `categorical[0]` --
         * the only series colour a bar value label ever paints on, since
         * `HorizontalBarChart` is this application's one labelled chart and
         * always builds exactly one series -- and that colour is light in the
         * three dark themes and darker in `bright`. Each theme block below
         * states its measured ratio; `theme.test.ts` re-measures them, against
         * the sRGB-clamped rendering rather than the raw oklch arithmetic,
         * because `bright`'s `categorical[0]` is outside the display gamut.
         */
        barLabel: string;
    }

    /**
     * `@mui/x-charts@9.11.1` styles the bar value label as
     * `styled('text', {name: 'MuiBarLabel', slot: 'Root'})`, so
     * `components.MuiBarLabel.styleOverrides.root` reaches it -- but the
     * package declares `MuiBarLabel` only in its props augmentation
     * (`themeAugmentation/props.d.ts`), never in the `Components` map that
     * types `styleOverrides`. Declare the one slot it has, so the override
     * below is a typed theme entry rather than a cast. The slot takes MUI's
     * usual pair -- a style object, or the callback form that receives the
     * theme -- so the declaration must carry `Components`' own type
     * parameter.
     */
    interface Components<Theme = unknown> {
        MuiBarLabel?: {
            styleOverrides?: {
                root?: CSSObject | ((props: {theme: Theme}) => CSSObject);
            };
        };
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
        // searches" trigger, and the download-history row's NZB/Torrent link
        // (FM-150 turned the *search result* row's copy of that control into
        // an icon button, so the results table no longer uses this variant).
        // Before this variant, six call sites authored the same intent with six
        // slightly different `sx` blocks (three paddings, two colour roles,
        // and MUI's stock teal `outlined` in two of them).
        control: true;
    }
}

/**
 * The concrete themes this application ships (ADR-0049), each one a complete
 * colour block in `themeColors` below.
 *
 * `grey` is the default and is the palette this application rendered before
 * FM-154 gave it a name; `bright`, `dark` and `dark-dyschromatopsia` carry the
 * character of the legacy AngularJS themes of the same names
 * (`core/ui-src/less/themes/`) into this file's token vocabulary.
 */
export type ThemeName = "grey" | "bright" | "dark" | "dark-dyschromatopsia";

/** A concrete theme, or "follow the operating system" (ADR-0049). */
export type ThemePreference = "auto" | ThemeName;

/**
 * The preference vocabulary the nav-bar selector offers, in the order it
 * offers it. Authored here rather than in `AppShell.tsx` so the set of themes
 * and the labels for them cannot drift apart from the blocks below.
 */
export const themePreferenceOptions: readonly {
    label: string;
    value: ThemePreference;
}[] = [
    {label: "Auto", value: "auto"},
    {label: "Grey", value: "grey"},
    {label: "Bright", value: "bright"},
    {label: "Dark", value: "dark"},
    {label: "Dark (Dyschromatopsia)", value: "dark-dyschromatopsia"},
];

/**
 * ADR-0049's `auto` rule: a system light preference resolves to `bright`, a
 * system dark preference to `grey` (the application's default dark theme, not
 * the near-black `dark` one).
 */
export function resolveThemeName(
    preference: ThemePreference,
    prefersDark: boolean,
): ThemeName {
    if (preference === "auto") {
        return prefersDark ? "grey" : "bright";
    }

    return preference;
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

/**
 * FM-161: the alpha at which a *selected* refine selection control paints
 * `primary.main` while the pointer is over it -- the refine rows' selected
 * hover and the `refineChip` pill's `aria-pressed="true"` hover.
 *
 * A single number rather than a per-theme token because it is an alpha, not a
 * colour: it composites the theme's own `primary.main` over the theme's own
 * ground, so each palette arrives at its own composited value from it. The
 * resting alphas it sits above are the pinned ones -- 0.12 for a row
 * (FM-153's quiet wall-of-teal treatment) and 0.16 for a pill -- and 0.34 is
 * the value that clears FM-161's 1.10:1 composited-background floor for
 * *both* of them on all four palettes at once, in the same step. It has to
 * reach that far: the hovered-unselected state has to be tellable from the
 * *selected resting* fill too, and on `dark` and `dark-dyschromatopsia` the
 * whole span from the page ground to that resting fill is only 1.19:1 and
 * 1.15:1 wide, so a neutral hover cannot fit *underneath* it and must sit
 * above it -- which in turn pushes the selected hover above that again.
 * `theme.test.ts` measures every pair.
 *
 * Module-private: its two consumers -- `refineRowBackgrounds` below and
 * `MuiButton`'s `refineChip` variant -- both live in this file, and the value
 * a feature would want is the composited colour, which they already return.
 */
const refineSelectedHoverAlpha = 0.34;

/**
 * FM-161: the four background colours a `RefineMultiselect` row renders in,
 * for the one component that draws them.
 *
 * A theme-reading helper rather than four exported literals, on the
 * `denseControlFontSize` precedent (a shared value a feature applies through
 * `sx`) crossed with FM-054's ADR-0014 rule that these fills are
 * `theme.alpha()` of a palette role rather than restated `oklch(... / N)`
 * strings. It stays out of `MuiButton`'s variants deliberately: the rows have
 * a single consumer, and their `active` flag already drives both the fill and
 * the `aria-pressed` state the specs assert, so a variant would only split one
 * decision across two files.
 *
 * The resting pair is FM-153's, unchanged: `transparent` unselected, and
 * `primary.main` at 0.12 selected -- quieter than the pills' 0.16 because the
 * results sidebar starts with every category and indexer selected and the
 * pills' language turns that into a wall of teal. Only the two hover values
 * are FM-161's, and they say two different things: an *unselected* row lifts
 * neutrally (`surfaces.hoverWash`, no hue at all), a *selected* one deepens in
 * the selection's own hue, so the state a click is about to produce is legible
 * from the colour under the cursor rather than only from the row's memory of
 * what it was.
 *
 * `surfaces` is read defensively for one reason: this component renders in
 * several feature suites that mount it under MUI's *stock* theme rather than
 * a `createHydraTheme` one, where no `surfaces` block exists at all. Those
 * suites assert `aria-pressed` and text, never colour, so what they need is
 * for the row to render; MUI's own `action.hover` is what they rendered
 * before FM-161 and is what they keep. Nothing about the four real palettes
 * routes through the fallback, and `theme.test.ts` measures each of them.
 */
export function refineRowBackgrounds(theme: Theme): {
    selected: string;
    selectedHover: string;
    unselected: string;
    unselectedHover: string;
} {
    return {
        selected: theme.alpha(theme.palette.primary.main, 0.12),
        selectedHover: theme.alpha(
            theme.palette.primary.main,
            refineSelectedHoverAlpha,
        ),
        unselected: "transparent",
        unselectedHover:
            theme.palette.surfaces?.hoverWash ?? theme.palette.action.hover,
    };
}

/**
 * FM-161: `surfaces.hoverWash` as a `background-image`, for the two control
 * families that already own an opaque fill.
 *
 * A `RefineMultiselect` row is unpainted at rest, so its hover can simply be
 * the wash and composite over the page. A pill and a constraint chip are not:
 * both rest on `surfaces.bar`, and a translucent `background-color` would
 * *replace* that fill and composite over whatever page happens to be behind
 * -- which is a different colour per theme and per surface, and not the
 * ground the eye is comparing against. Painting the wash as a one-stop
 * gradient instead layers it above the control's own fill (CSS paints
 * `background-image` over `background-color`), so the step is stated once and
 * lands identically wherever the control is used. It is the same mechanism
 * MUI's own dark-mode `--Paper-overlay` uses.
 */
function hoverWash(theme: Theme): string {
    const wash = theme.palette.surfaces.hoverWash;
    return `linear-gradient(${wash}, ${wash})`;
}

/*
 * ===========================================================================
 * The theme colour blocks (ADR-0049, FM-154).
 * ===========================================================================
 *
 * Every colour this application renders is stated in exactly one of the four
 * `ThemeColors` blocks below, and `createHydraTheme` resolves exactly one of
 * them per theme. Nothing outside this section states a colour: the component
 * `styleOverrides` further down read either the resolved MUI palette
 * (`theme.palette.*`) or the active block itself (`colors.*`), never a literal
 * of their own. That is the ADR's own requirement -- "all colours of a theme
 * live together in one named palette block so each theme's full colour set is
 * readable in one place" -- and it is what makes reviewing a new theme a matter
 * of reading one object rather than of grepping the file.
 *
 * The blocks are deliberately *complete* rather than layered on a base. Before
 * FM-154 `dark-dyschromatopsia` was expressed as a spread of six overrides over
 * the grey palette, and reading it meant holding two objects in mind and
 * knowing which key won; it is now written out in full, with the same effective
 * values. Duplication between blocks is the price, and it is the price the ADR
 * chose.
 *
 * The two `contrastText` values below are the only colours shared *between*
 * blocks. They are MUI's own defaults for a role that is light enough / dark
 * enough to need them, restated here because `oklch()` is outside the sRGB
 * formats `@mui/system`'s `getContrastRatio` can decompose, so MUI cannot
 * derive them for this palette. They are consumed only from inside the blocks.
 */
const darkContrastText = "rgba(0, 0, 0, 0.87)";
const lightContrastText = "#fff";

/**
 * ADR-0014's surface tokens: the non-role colours the mock's control language
 * needs, carried on `palette.surfaces` so feature code reaches them through an
 * `sx` palette path rather than by restating a literal. Every theme block below
 * states a complete set.
 */
type SurfaceTokens = {
    /** The search-bar row ground (`#232a2c` in the mock). */
    bar: string;
    /**
     * FM-154 (ADR-0049): the accent drawn *on the app-bar ground* -- the
     * active navigation item's rail and its label.
     *
     * Its own token rather than `primary.main` because the app bar is the one
     * surface whose colour MUI derives from the palette differently per mode.
     * `AppBar`'s `enableColorOnDark: false` default (see `AppBar.js`'s two
     * `enableColorOnDark` variants) drops the colour declaration under
     * `palette.mode: "dark"`, so a dark theme's bar is `background.paper` and
     * `primary.main` reads on it; under `mode: "light"` the same variant paints
     * the bar `primary.main` itself, where a `primary.main` accent is
     * invisible. Each block states what its own bar wants: the three dark
     * themes repeat their `primary.main` verbatim (so nothing about their
     * rendering changes), and `bright` -- whose bar is the legacy bright
     * theme's green -- states the contrast text instead.
     */
    barAccent: string;
    /** Raised control surface: selects, menus, secondary buttons. */
    control: string;
    /** 1px control border hairline. */
    hairline: string;
    /** Fainter hairline for row/section separators. */
    hairlineFaint: string;
    /**
     * FM-161: the neutral wash a refine selection control paints while the
     * pointer is over it *and it is not selected* -- the `RefineMultiselect`
     * row's unselected hover (over `background.default`, or over
     * `background.paper` in the compact drawer), and the overlay the
     * `refineChip` pill and the `constraint` `Chip` lay over their own
     * `surfaces.bar` ground.
     *
     * Translucent and hueless on purpose. It is the half of the hover
     * vocabulary that means "the pointer is here", against the
     * `primary.main`-at-`refineSelectedHoverAlpha` half that means "and this
     * one is selected"; a hue here would make an unselected row's hover read
     * as a selection it is not.
     *
     * A per-theme token rather than MUI's `action.hover`, which is what these
     * controls used and is where the defect lived: at
     * `rgba(255, 255, 255, 0.08)` it lands within 1.02-1.06:1 of the
     * *selected resting* fill on the three dark palettes, so a click's
     * deselect result was invisible under the cursor, and its light-mode
     * `rgba(0, 0, 0, 0.04)` is 1.09:1 from the page it sits on. Each block
     * states its own value, measured against every adjacent state in
     * `theme.test.ts`, because the alpha that clears 1.10:1 on all of them
     * depends on how far that block's own ground sits from its own
     * `primary.main` -- one shared alpha cannot serve `#1f2426` and `#101010`
     * at once.
     */
    hoverWash: string;
    /**
     * The muted-glyph color: section captions, counts, popover captions, and
     * disabled/neutral control text. FM-054: four independent feature-local
     * literals collapsed into this one token.
     *
     * It is text, so WCAG 1.4.3's 4.5:1 is its axis on all three grounds a
     * glyph lands on (`background.default`, `background.paper`,
     * `surfaces.control`), and `theme.test.ts`'s ADR-0049 block measures it
     * there for every theme. FM-156 re-authored the two blocks that did not
     * clear it; each block states its own measurements.
     */
    mutedText: string;
    /** Recessed input surface: text fields. */
    recessed: string;
    /**
     * FM-154: the resting edge of the results table's tri-state select-all
     * square (`SelectionMenu`'s `SelectAllUncheckedIcon`), the one unfilled
     * control this application draws directly on `background.default`.
     *
     * Named for its single consumer, like `selectAllRadius` above and for the
     * same reason: it is a measured property of that one 17x17 box, not a
     * shared control language. It is a token rather than a call-site colour
     * because the call site wrote `alpha(common.white, 0.25)` -- a dark-theme
     * remnant that ADR-0014 already bars and that a light ground makes
     * invisible (1.03:1 on `bright`'s `#f2f4f3`, against WCAG 1.4.11's 3:1).
     *
     * Not `surfaces.hairline` and not `inputOutline`: the first is fainter
     * still, and the second is the notched-input border ADR-0036 measured
     * against a *recessed fill* -- reusing it would tie this box's edge to a
     * value authored for a different ground.
     *
     * Measured on each theme's `background.default`, the ground the sticky
     * select column paints (`background.paper` in brackets, the ground the
     * same square gets inside a raised results card):
     *   - `bright` `rgba(0, 0, 0, 0.45)` -- **3.30:1** on `#f2f4f3` (3.33:1).
     *     (The 0.25 white the call site used reached 1.03:1 here.)
     *   - `dark` `rgba(255, 255, 255, 0.42)` -- **4.09:1** on `#101010`
     *     (4.02:1), and the same alpha as this block's own `inputOutline`, so
     *     the theme states one neutral-edge strength rather than two.
     *   - `grey` `rgba(255, 255, 255, 0.35)` -- **3.17:1** on `#1f2426`
     *     (3.08:1), likewise this block's own `inputOutline` alpha.
     *   - `dark-dyschromatopsia` `rgba(255, 255, 255, 0.42)` -- **4.09:1** on
     *     `#101010` (4.02:1). It took `dark`'s alpha rather than the grey
     *     block's for the reason FM-156 recorded -- 0.35 reached only 3.01:1
     *     on the pure black page both themes had then -- and keeps it under
     *     ADR-0055, which re-authors only where a floor is lost (on `#101010`
     *     that alpha would now reach 3.20:1).
     *
     * FM-154 authored only the first two: `grey` and `dark-dyschromatopsia`
     * were pinned byte-identical and kept the call site's own
     * `rgba(255, 255, 255, 0.25)`, at 2.28:1 and 2.21:1. FM-156 redeems that
     * follow-up, and `theme.test.ts` now measures all four themes on the one
     * bar instead of pinning two of them to the remnant.
     */
    selectAllOutline: string;
    /**
     * FM-156: the scrim `TableScrollAffordance`'s edge fade gradients from
     * (`C-TABLE-SCROLL-AFFORDANCE`, ADR-0038) -- the strip that says "there is
     * more content that way" over whichever edge of a horizontally scrolling
     * table currently clips content.
     *
     * Named for its single consumer, like `selectAllOutline` above. It is a
     * token rather than a call-site colour because the call site wrote
     * `alpha(common.black, 0.45)`, the last of ADR-0014's call-site-colour
     * remnants in `src`: a value authored when every theme had a dark ground,
     * where -- on the two grounds a scrolling table sits on,
     * `background.paper` and `surfaces.control` -- it darkens by 1.14-1.31:1
     * and leaves the text it crosses at 7.42-13.44:1. On `bright` the same
     * scrim is a 3.33:1 black smear over a
     * white card that takes `text.primary` from 17.75:1 down to 5.33:1.
     *
     * Decoration, so it carries no WCAG axis of its own; what it has is a band
     * with an end at each side. The three dark themes keep the composited
     * colour they render today, and `bright` states the alpha that lands in
     * that same band on its own grounds. Each block states its measurements.
     */
    tableScrollFade: string;
};

/** A MUI palette role. `light`/`dark` are omitted where MUI derives them. */
type RoleColors = {
    contrastText: string;
    dark?: string;
    light?: string;
    main: string;
};

type ThemeColors = {
    background: {default: string; paper: string};
    /** The dashboard's categorical chart sequence (see `ChartTokens`). */
    charts: string[];
    /** The bar value label's fill, on `charts[0]` (see `ChartTokens`). */
    chartBarLabel: string;
    error: RoleColors;
    info: RoleColors;
    /** The outlined-input notch border (ADR-0036). */
    inputOutline: string;
    /** MUI's own light/dark switch: it decides every derived palette value. */
    mode: "light" | "dark";
    primary: RoleColors;
    scrollbar: {thumb: string; thumbHover: string};
    success: RoleColors;
    surfaces: SurfaceTokens;
    text: {primary: string; secondary: string};
    warning: RoleColors;
};

/**
 * `grey` -- the default theme, and the palette this application rendered
 * before FM-154 named it.
 *
 * Sourced from `uimock/NZBHydra Search.dc.html` (its `<helmet>` `<style>`
 * block, the outer page `<div>`'s inline style, and its `<header>`), which
 * superseded ADR-0007's legacy-grey tokens per ADR-0009's accepted
 * full-mock-fidelity decision. Every value here is carried across from the
 * pre-FM-154 `mockPalette`/`mockSurfaces`/`inputOutline`/chart constants
 * unchanged, and `theme.test.ts` pins that -- with the exceptions re-authored
 * under ADR-0049 against measured contrast, each measured at its own line
 * below: `surfaces.mutedText` and `surfaces.selectAllOutline` (FM-156), and
 * the whole `primary` family plus the `surfaces.barAccent` that restates it
 * (FM-158, ADR-0052 -- the mock's teal was never this product's brand).
 */
const greyColors: ThemeColors = {
    mode: "dark",
    background: {
        // Outer page `<div>` / `body{background:#1f2426}`.
        default: "#1f2426",
        // `<header>` surface tone; reused by MUI for `AppBar`, `Paper`,
        // popovers.
        paper: "#262c2e",
    },
    text: {
        // Outer page `<div>`'s `color:#d6dad9`.
        primary: "#d6dad9",
        // The mock's muted nav/label color (`<nav>`'s inactive links).
        secondary: "#9aa2a1",
    },
    /*
     * ADR-0052. This family was the mock's brand teal
     * (`oklch(0.75 0.1 190)` and its two lighter variants) -- carried in
     * byte-for-byte from the uimock under ADR-0008/0009 and never a theme
     * decision of this application's own. It is the wrong brand: the product's
     * logo is green (`rgb(6, 161, 40)`, and legacy's `@brand-primary`
     * `#00640e`), and this is the family every primary button, link, active nav
     * rail, `surfaces.barAccent` and ADR-0013 focus ring in the default theme
     * paints.
     *
     * Re-authored the way ADR-0035 corrected `error.main` and FM-156 corrected
     * `surfaces.mutedText`: hue and chroma are carried across from the brand
     * mark unchanged and only lightness moves. `rgb(6, 161, 40)` decomposes to
     * `oklch(0.6164 0.1948 144.57)`, so the whole family is authored at
     * **0.195 / 144.6** -- the logo's own chroma and hue, well above `success`'s
     * muted 0.11 and below its 150 hue. (The darker logo pair member `#00640e`
     * is `oklch(0.4367 0.1426 143.8)`: the same family, one shade down.)
     *
     * Lightness is measured, not copied. The mark's own 0.616 reaches only
     * 4.58 / 4.13 / 3.86:1 on this theme's three grounds (`background.default`
     * `#1f2426`, `background.paper` `#262c2e`, `surfaces.control` `#2a3133`) --
     * short of WCAG 1.4.3's 4.5:1 on two of them, and this token is a
     * *foreground* at every text button and link. 0.68 is the first 0.01 step
     * that clears 4.5:1 on all three by a margin rather than by rounding: at
     * the worst ground, `surfaces.control`, 0.66 lands on 4.59 and 0.67 on
     * 4.76, against 0.68's 4.95. It was not pushed further because every step
     * of lightness spends the separation from `success.main` (0.75) and from
     * the sixth chart series (0.78) that keeps this green readable as the
     * brand rather than as a status.
     */
    primary: {
        // The brand green: primary "Search" button, active nav rail,
        // `surfaces.barAccent`, and the ADR-0013 focus ring. 5.86 / 5.29 /
        // 4.95:1 on `background.default` / `background.paper` /
        // `surfaces.control` -- WCAG 1.4.3 as text, and far past 1.4.11's 3:1
        // as the focus-ring and boundary axis.
        main: "oklch(0.68 0.195 144.6)",
        // The emphasis variant (result action links), lighter than `main` as
        // this block's role shape has always had it. 7.56 / 6.83 / 6.38:1.
        light: "oklch(0.75 0.195 144.6)",
        // The `a:hover` variant, lighter again. 8.39 / 7.58 / 7.08:1.
        dark: "oklch(0.78 0.195 144.6)",
        // Text drawn on top of the brand green (`<button>Search</button>`).
        // The teal family's `#0e1c1b` was that hue at `oklch(0.213 0.020 190)`;
        // re-derived is the same near-black rotated onto the new hue,
        // `oklch(0.213 0.020 144.6)`, measured 6.54:1 on `main`.
        contrastText: "#131b13",
    },
    // The mock's "all indexers online" status dot.
    success: {main: "oklch(0.75 0.11 150)", contrastText: darkContrastText},
    // The mock's amber accent.
    warning: {main: "oklch(0.76 0.1 70)", contrastText: darkContrastText},
    // No mock evidence: the mock never renders an `info` role, so ADR-0007's
    // legacy-grey value is deliberately kept rather than inventing an
    // unreviewed `oklch` one (see the FM-043 packet's Out Of Scope).
    info: {main: "#398da5", contrastText: lightContrastText},
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
    // every step of lightness spends contrast there to buy it here. The
    // lightened token then broke the previous `#fff` contrast text (2.84:1)
    // that `#a33938` passed at 6.56:1, so the pairing moves with it: MUI's
    // dark contrast text restores it at 6.51:1.
    error: {main: "oklch(0.7 0.14 24.3)", contrastText: darkContrastText},
    // ADR-0014 surface tokens, read from the mock's search-bar row and
    // controls. Feature code consumes these through the palette
    // (`surfaces.*`), never by restating the literals.
    surfaces: {
        bar: "#232a2c",
        control: "#2a3133",
        recessed: "#1c2224",
        hairline: "rgba(255, 255, 255, 0.1)",
        hairlineFaint: "rgba(255, 255, 255, 0.06)",
        // FM-161. On this page (`#1f2426`) a hovered unselected row has to
        // clear both the page under it and the `primary.main`-at-0.12
        // selected rest beside it, and the span between those two is only
        // 1.21:1 -- too narrow to fit a state inside -- so the wash sits
        // above the selected rest instead: 1.46:1 from the page, 1.21:1 from
        // the selected rest, and 1.25:1 under the selected hover above it.
        // Over the pills' and constraint chips' own `surfaces.bar`, 1.46:1.
        // MUI's `action.hover` (`rgba(255, 255, 255, 0.08)`), which these
        // controls used, reached 1.06:1 against that selected rest.
        hoverWash: "rgba(255, 255, 255, 0.12)",
        // FM-156, ADR-0049: the mock's own `#6b7472` measured 3.26 / 2.95 /
        // 2.75:1 on this theme's three grounds -- under WCAG 1.4.3 for the
        // captions and counts it paints, and worst on `surfaces.control`,
        // where every menu and popover caption lands. Corrected the way
        // ADR-0035 corrected `error.main`: lightness only, so the mock's
        // neutral green-grey is kept exactly. `#6b7472` decomposes to
        // `oklch(0.551 0.011 181.1)`; chroma and hue carry across and L moves
        // 0.551 -> 0.678, landing on 5.44 / 4.91 / 4.59:1.
        //
        // L was not pushed further because this token has a second job: it
        // must still read *muted* beside `text.secondary` `#9aa2a1`, which
        // measures 6.02 / 5.44 / 5.08:1. The gap left here on the binding
        // ground is 0.49; the `dark` block's own pair sits level there since
        // FM-180 re-authored both against ADR-0055's grounds (4.56 against
        // 4.54:1) and is told apart by hue, so this theme's two muted tones
        // stand further apart than that theme's, not less far.
        mutedText: "#919a98",
        // A dark theme's app bar is `background.paper`, so the accent on it is
        // the brand green itself -- the value `AppShell` read as
        // `primary.main` before this token existed, and it follows that token
        // through ADR-0052's re-authoring.
        barAccent: "oklch(0.68 0.195 144.6)",
        // FM-156: this block's own `inputOutline` alpha, so the theme states
        // one neutral-edge strength rather than two -- 3.17:1 on the page the
        // sticky select column paints. The `rgba(255, 255, 255, 0.25)` FM-154
        // carried across here reached 2.28:1. See the token's doc comment.
        selectAllOutline: "rgba(255, 255, 255, 0.35)",
        // FM-156: the composited colour `TableScrollAffordance` painted from
        // `alpha(common.black, 0.45)` before the token existed, so this
        // theme's scrolled tables render unchanged -- 1.26:1 of darkening on
        // `background.paper` and 1.31:1 on `surfaces.control`, leaving
        // `text.primary` at 12.64 / 12.31:1 through the fade.
        tableScrollFade: "rgba(0, 0, 0, 0.45)",
    },
    /*
     * ADR-0036: the outlined-input notch border, as its own token rather than
     * as `surfaces.hairline`.
     *
     * The defect was that an outlined field did not read as outlined.
     * Measured, the resting `surfaces.hairline` `rgba(255, 255, 255, 0.1)`
     * edge is **1.37:1** against `background.paper` `#262c2e` and **1.36:1**
     * against `background.default` `#1f2426` -- below the 3:1 WCAG 1.4.11 asks
     * of the visual boundary that identifies a control, and so faint that
     * MUI's permanently shrunk label had nothing to sit in and read as
     * floating over a filled box instead of notched into a border.
     *
     * `0.35` is the lowest round alpha that clears 3:1 on **both** grounds:
     * **3.08:1** on `background.paper`, **3.17:1** on `background.default`,
     * and **3.19:1** against the field's own `surfaces.recessed` fill, so the
     * edge is legible from the inside too. (0.30 reaches only 2.64 / 2.69;
     * MUI's own stock dark outline, 0.23, only 2.11 / 2.13.)
     *
     * A token of its own rather than a raised `surfaces.hairline` -- ADR-0036
     * allows either -- because that token also paints the menu, popover and
     * constraint-chip borders, none of which were reported and none of which
     * were measured.
     */
    inputOutline: "rgba(255, 255, 255, 0.35)",
    // The mock's `::-webkit-scrollbar` thumb colors. The track and the thumb's
    // border reuse `background.default` instead of stating a third value.
    scrollbar: {thumb: "#3a4446", thumbHover: "#495456"},
    // FM-024's chart categorical sequence (see the `ChartTokens` doc comment
    // above): six oklch hues at the mock's own lightness/chroma band
    // (L 0.72-0.82, C 0.09-0.12), spaced around the hue circle so adjacent
    // series stay distinguishable for the deuteranopia/protanopia range the
    // `dark-dyschromatopsia` theme exists for -- teal, amber, violet, rose,
    // blue, and green. The first entry was the brand primary when this theme's
    // primary was the mock's teal; ADR-0052 moved the brand to green and left
    // this sequence alone, because a categorical series colour is a
    // data encoding rather than a brand accent -- and because moving it onto
    // the new primary would have put it beside the sixth entry's green.
    charts: [
        "oklch(0.75 0.1 190)",
        "oklch(0.78 0.12 80)",
        "oklch(0.76 0.11 300)",
        "oklch(0.74 0.12 20)",
        "oklch(0.75 0.1 250)",
        "oklch(0.78 0.11 140)",
    ],
    // FM-172/ADR-0053: the value label printed inside a bar, on this theme's
    // `charts[0]` teal. x-charts fills it with `text.primary`, which here is
    // the light body grey `#d6dad9` -- 1.51:1 on that teal, one of the two
    // themes the owner reported as unreadable. The warm near-black this
    // application already uses as its light-ground text (`bright`'s
    // `text.primary`) reads 8.63:1 on the same teal.
    chartBarLabel: "#111514",
};

/**
 * `dark-dyschromatopsia` -- the accessibility variant. Its role colours are
 * unchanged in effect; its grounds moved with `dark`'s under ADR-0055.
 *
 * Legacy source: `core/ui-src/less/themes/theme-dark-dyschromatopsia.less`,
 * which is `vars-grey.less` plus a black ground and a set of role colours
 * chosen so the roles stay distinguishable without relying on the red/green
 * axis. ADR-0007 carried those role colours into this file; before FM-154 they
 * lived as a six-key spread over the grey palette, and this block is that
 * merge written out. The role colours are still byte-for-byte what the spread
 * produced, which `theme.test.ts` pins -- including the deliberate absence of
 * `primary.light`/`primary.dark`, which MUI derives from `main` here (the
 * spread replaced the whole `primary` object, so it always did).
 *
 * The exceptions are the tokens re-authored against measured contrast since:
 * `surfaces.mutedText` and `surfaces.selectAllOutline` (FM-156, ADR-0049),
 * `surfaces.hoverWash` (FM-161), and -- as of FM-180 -- ADR-0055's six
 * grounds, which this variant states in its own right rather than taking from
 * `grey`. It stops sharing `grey`'s bar, control, recessed and faint hairline
 * with that block and states `dark`'s: page `#101010`, paper `#1e1e1e`, raised
 * controls `#262626`, the app bar level with the cards, the input fill
 * `#141414`, row dividers at 10% white. Its `surfaces.hairline` is untouched
 * at 0.1, which ADR-0055 leaves alone and which is also `grey`'s -- so on this
 * variant the two hairlines coincide, both reading 1.35:1 on
 * `background.paper`.
 *
 * Measured on those grounds (`background.default` `#101010` /
 * `background.paper` `#1e1e1e` / `surfaces.control` `#262626`), every value
 * this variant keeps stays clear of its floor: `text.primary` `#d6dad9` at
 * 13.49 / 11.82 / 10.73:1, `text.secondary` `#9aa2a1` at 7.30 / 6.40 / 5.81:1,
 * `primary.main` `#78909c` at 5.68 / 4.98 / 4.52:1 (its axis is the 3:1 focus
 * ring), `inputOutline` at 0.35 at 3.20:1 on the page and 3.22:1 on the
 * recessed fill, and the four accents at 7.54 / 9.38 / 7.23 / 6.95:1 on the
 * page. Nothing here lost a recorded floor, so ADR-0055 keeps every one.
 */
const darkDyschromatopsiaColors: ThemeColors = {
    mode: "dark",
    background: {default: "#101010", paper: "#1e1e1e"},
    // Unchanged from `grey`: the variant never re-authored its text colours,
    // and the mock's pair clears 4.5:1 on this darker ground by a wider margin
    // than on the grey one -- 13.49 / 11.82 / 10.73:1 and 7.30 / 6.40 /
    // 5.81:1 on the page, the paper and the raised control.
    text: {primary: "#d6dad9", secondary: "#9aa2a1"},
    // Legacy `@brand-primary` for this theme was `#303437`, a near-invisible
    // near-black; ADR-0007 lifted it to the blue-grey `#78909c` it still is.
    // `light`/`dark` are deliberately not stated -- MUI derives them, as it
    // did before this block existed.
    primary: {main: "#78909c", contrastText: lightContrastText},
    success: {main: "#30b885", contrastText: darkContrastText},
    warning: {main: "#f0a830", contrastText: darkContrastText},
    info: {main: "#3aaccf", contrastText: darkContrastText},
    // Legacy `@brand-danger-message: #B090C8` -- the violet that carries
    // "error" off the red/green axis.
    error: {main: "#b090c8", contrastText: darkContrastText},
    surfaces: {
        // FM-180: ADR-0055's six, stated here rather than inherited from
        // `grey` -- the decision binds both near-black themes alike, so these
        // are byte-identical to the `dark` block's.
        bar: "#1e1e1e",
        control: "#262626",
        recessed: "#141414",
        // Left at 0.1, which ADR-0055 does not move; the faint hairline joins
        // it there, so this variant draws its control borders and its row
        // dividers at one strength, 1.35:1 on `background.paper`.
        hairline: "rgba(255, 255, 255, 0.1)",
        hairlineFaint: "rgba(255, 255, 255, 0.1)",
        // FM-161, and the tightest of the four: this variant's `#78909c`
        // primary at 0.12 stands only 1.15:1 off its own page, so the wash is
        // authored a step under the grey block's alpha to leave the selected
        // hover room above it -- 1.42:1 from the page, 1.23:1 from the
        // selected rest, 1.18:1 under the selected hover, and 1.49:1 over
        // `surfaces.bar`. `action.hover` reaches 1.05:1 against the selected
        // rest.
        hoverWash: "rgba(255, 255, 255, 0.13)",
        // FM-156: the grey block's re-authored value, which this variant
        // still shares. On ADR-0055's grounds the mock's `#6b7472` measures
        // 3.96 / 3.47 / 3.15:1 here, well under WCAG 1.4.3; `#919a98` reads
        // 6.60 / 5.78 / 5.25:1, so no floor is lost and FM-180 keeps it.
        mutedText: "#919a98",
        barAccent: "#78909c",
        // FM-156: measured against this variant's own page rather than the
        // grey block's `#1f2426`, where 0.42 was needed because 0.35 reached
        // only 3.01:1 on the pure black this theme had then. On `#101010`
        // that argument no longer holds (0.35 reaches 3.20:1), but ADR-0055
        // re-authors only where a floor is lost, so the alpha stays: this
        // edge reads 4.09:1 on the page and 4.02:1 on the paper. The
        // `rgba(255, 255, 255, 0.25)` FM-154 carried across reaches 2.21:1.
        selectAllOutline: "rgba(255, 255, 255, 0.42)",
        // FM-156: as in `grey`, the colour `TableScrollAffordance` composited
        // before the token existed -- 1.14:1 of darkening on
        // `background.paper` and 1.21:1 on `surfaces.control`, leaving
        // `text.primary` at 13.44 / 12.96:1.
        tableScrollFade: "rgba(0, 0, 0, 0.45)",
    },
    inputOutline: "rgba(255, 255, 255, 0.35)",
    scrollbar: {thumb: "#3a4446", thumbHover: "#495456"},
    charts: [
        "oklch(0.75 0.1 190)",
        "oklch(0.78 0.12 80)",
        "oklch(0.76 0.11 300)",
        "oklch(0.74 0.12 20)",
        "oklch(0.75 0.1 250)",
        "oklch(0.78 0.11 140)",
    ],
    // FM-172/ADR-0053, as in `grey`, whose `charts[0]` and `text.primary`
    // this variant shares: the default label fill measures 1.51:1 on the
    // teal, and this near-black 8.63:1. No red/green axis is involved, so
    // this variant needs no value of its own.
    chartBarLabel: "#111514",
};

/**
 * `dark` -- legacy's near-black theme, on ADR-0055's layered ground.
 *
 * Legacy source: `core/ui-src/less/themes/theme-dark.less`, which is
 * `vars-grey.less` with `@body-bg: rgb(0, 0, 0)`, `@text-color:
 * rgb(156, 156, 156)` and `@input-bg: rgb(15, 17, 19)`. The character ADR-0049
 * asks to keep is what stays: a near-black page, a barely-lifted set of
 * surfaces, and light text that is muted rather than white. What ADR-0055
 * deliberately gives up is legacy's `@body-bg`/`@input-bg` parity. An owner
 * report (2026-09-03) found the pure-black page, its cards and its tables
 * reading as one flat surface with no row dividers -- with elevation overlays
 * off (FM-117) nothing lifted a card off the page, and a 7% hairline vanished
 * on black -- so the grounds below are the layered set that decision names:
 * page `#101010`, paper (cards and tables) `#1e1e1e`, raised controls
 * `#262626`, the app bar level with the cards rather than under them, the
 * input fill `#141414`, and row dividers at 10% white. Overlays stay off; the
 * layering is these tokens. `dark-dyschromatopsia` states the same six.
 *
 * Every colour below is measured against those grounds (`background.default`
 * `#101010` / `background.paper` `#1e1e1e` / `surfaces.control` `#262626`, the
 * darkest and the two lightest surfaces a glyph lands on):
 *
 *   - `text.primary` `#a5a5a5` -- 7.72:1 / 6.77:1 / 6.14:1. Legacy's own muted
 *     `#9c9c9c` stood here until FM-180 and still clears every floor on the
 *     new grounds (6.93 / 6.07 / 5.51:1); it is lifted not for a floor of its
 *     own but to hold the role separation the secondary entry below records;
 *   - `text.secondary` `#858e95` -- 5.71:1 / 5.00:1 / 4.54:1 -- legacy's
 *     `@gray-light: rgb(122, 130, 136)` lifted for a near-black ground.
 *     FM-180 re-authored it: on the raised control surface the previous
 *     `#7e868d` reads 4.09:1, under WCAG 1.4.3, and this is the smallest lift
 *     of that same blue-grey that clears 4.5 there. The owner report of
 *     2026-08-31 -- secondary must read as a visibly separate role from
 *     primary, which was authored at 1.35:1 -- is kept: lifted, secondary
 *     stands only 1.21:1 off the old `#9c9c9c`, so `text.primary` was lifted
 *     with it (ADR-0049) and the pair is back at 1.35:1;
 *   - `surfaces.mutedText` `#8d8d8d` -- 5.73:1 / 5.02:1 / 4.56:1, re-authored
 *     by FM-180 for the same reason and by the same rule: `#8a8a8a` reads
 *     4.38:1 on `#262626`. It still sits a step *above* `text.secondary` on
 *     that binding ground (4.56 against 4.54:1), the accepted arrangement this
 *     block already carried; the two are now level in luminance and told apart
 *     by hue, and pushing either further would spend contrast neither role
 *     needs;
 *   - `primary.main` `#9aa6ac`, legacy's `@brand-primary: @gray-light` in the
 *     same blue-grey family, lifted the same way -- 7.63:1 / 6.69:1 / 6.07:1,
 *     which is also the ADR-0013 focus ring's contrast (its axis is 3:1);
 *   - `inputOutline` at alpha 0.42 -- 4.09:1 on the page and 4.10:1 on the
 *     recessed field fill, clearing WCAG 1.4.11's 3:1 from both sides. Kept at
 *     0.42 rather than dropped to the grey theme's 0.35 (which reaches 3.20:1
 *     on this page now that it is `#101010` rather than black): ADR-0055
 *     re-authors only where a recorded floor is lost, and this one is not.
 *
 * The four accent roles are the grey theme's (`success`, `warning`, `info`,
 * `error`), which is what legacy does too -- `theme-dark.less` imports
 * `vars-grey.less` and overrides only the ground and the text. Measured on the
 * page they read 8.93 / 8.72 / 5.01 / 6.70:1.
 */
const darkColors: ThemeColors = {
    mode: "dark",
    background: {default: "#101010", paper: "#1e1e1e"},
    // Owner report (2026-08-31): the two roles must not read as one colour.
    // FM-180 lifts the pair onto ADR-0055's grounds -- #858e95 is the
    // smallest lift of the legacy blue-grey that holds WCAG 1.4.3 on the
    // raised control surface (5.71:1 on the page, 5.00:1 on paper, 4.54:1 on
    // surfaces.control, where its predecessor #7e868d reads 4.09:1), and
    // #a5a5a5 is the smallest lift of legacy's own muted grey that restores
    // the recorded 1.35:1 separation above it.
    text: {primary: "#a5a5a5", secondary: "#858e95"},
    primary: {
        main: "#9aa6ac",
        light: "#b4bfc4",
        // The same relationship the grey theme's `primary.dark` has to its
        // `main`: this token is the mock's *hover* variant, which on a dark
        // ground is lighter than rest, not darker.
        dark: "#c8d1d5",
        contrastText: darkContrastText,
    },
    success: {main: "oklch(0.75 0.11 150)", contrastText: darkContrastText},
    warning: {main: "oklch(0.76 0.1 70)", contrastText: darkContrastText},
    // The one accent whose *pairing* is re-authored rather than carried
    // across: `#398da5` is light enough that the grey theme's `#fff` on it
    // measures 3.80:1, under WCAG 1.4.3 for the filled `Chip`/`Alert` families
    // that paint this role as a ground. A new theme has no invariance to keep,
    // so it takes the dark contrast text instead, at 4.98:1. (The grey and
    // dyschromatopsia blocks keep theirs unchanged; see the FM-154 handoff.)
    info: {main: "#398da5", contrastText: darkContrastText},
    error: {main: "oklch(0.7 0.14 24.3)", contrastText: darkContrastText},
    surfaces: {
        // ADR-0055's six, stated identically in `darkDyschromatopsiaColors`:
        // the app bar level with the cards rather than darker than them, a
        // raised control a step above the card (1.10:1), the input fill
        // between the page and the card it sits on, and the row divider at
        // 10% white -- 1.35:1 against `background.paper`, which is the ground
        // a table row is drawn on.
        bar: "#1e1e1e",
        control: "#262626",
        recessed: "#141414",
        // Unchanged at 0.12: ADR-0055 moves the faint hairline only, so this
        // block's control border stays a step above the row divider (1.44:1
        // against `background.paper`, to the divider's 1.35:1).
        hairline: "rgba(255, 255, 255, 0.12)",
        hairlineFaint: "rgba(255, 255, 255, 0.1)",
        // FM-161: the widest alpha of the four, because this theme's muted
        // `#9aa6ac` primary at 0.12 is the faintest selected rest of any
        // block (1.19:1 off its page) and the wash still has to clear it --
        // 1.53:1 from the page, 1.28:1 from the selected rest, 1.25:1 under
        // the selected hover, 1.60:1 over `surfaces.bar`. `action.hover`
        // reaches 1.02:1 against the selected rest: the two states would be
        // one colour.
        hoverWash: "rgba(255, 255, 255, 0.15)",
        mutedText: "#8d8d8d",
        barAccent: "#9aa6ac",
        // The same alpha as this block's `inputOutline`, so the theme states
        // one neutral-edge strength: 4.09:1 on the page.
        selectAllOutline: "rgba(255, 255, 255, 0.42)",
        // FM-156: the colour `TableScrollAffordance` composited before the
        // token existed, and kept under ADR-0055 -- decoration, with no floor
        // to lose -- at 1.14:1 of darkening on `background.paper` and 1.21:1 on
        // `surfaces.control`. This theme's `text.primary` is the most muted of
        // the four, so it reads through the fade at 7.70 / 7.42:1, the
        // narrowest of the four and still well clear of body-text contrast.
        tableScrollFade: "rgba(0, 0, 0, 0.45)",
    },
    inputOutline: "rgba(255, 255, 255, 0.42)",
    scrollbar: {thumb: "#2c2c2c", thumbHover: "#3a3a3a"},
    charts: [
        "oklch(0.75 0.1 190)",
        "oklch(0.78 0.12 80)",
        "oklch(0.76 0.11 300)",
        "oklch(0.74 0.12 20)",
        "oklch(0.75 0.1 250)",
        "oklch(0.78 0.11 140)",
    ],
    // FM-172/ADR-0053: the same near-black as the other two dark themes, and
    // the worst starting point of the four -- this theme's `text.primary` is
    // the most muted of them, 1.16:1 on `charts[0]`, which is the reading the
    // owner called unreadable. The near-black reads 8.63:1 there.
    chartBarLabel: "#111514",
};

/**
 * `bright` -- legacy's light theme, and the only theme in this application
 * that renders `palette.mode: "light"`.
 *
 * Legacy source: `core/ui-src/less/themes/theme-bright.less` -- a white page
 * (`@body-bg: rgb(255, 255, 255)`), black text, a green brand
 * (`@brand-primary: #00640e`) and a green navigation bar
 * (`@navbar-default-bg: rgb(6, 161, 40)` with white links). ADR-0049 keeps that
 * character and allows the individual colours to be improved, which here means
 * one thing consistently: legacy's accent colours were authored for a white
 * ground without measuring against it, and half of them do not carry text on
 * one. Each role below states the legacy value it descends from and what it
 * measures now.
 *
 * The green bar is not authored here and is not an accident: `AppBar`'s
 * `enableColorOnDark: false` default paints the bar `primary.main` under
 * `mode: "light"` (see the `barAccent` doc comment above), so legacy's green
 * navigation bar comes back on its own, with `primary.contrastText` on it.
 *
 * Measured against this theme's three grounds -- `background.default`
 * `#f2f4f3`, `background.paper` `#fafbfb`, `surfaces.control` `#ffffff`:
 *
 *   - `text.primary` `#111514` (legacy `@text-color: rgb(0, 0, 0)`, warmed a
 *     shade off pure black) -- 16.66 / 17.75 / 18.40:1;
 *   - `text.secondary` `#4a524f` -- 7.28 / 7.76 / 8.04:1;
 *   - `surfaces.mutedText` `#5f6b66` -- 5.03 / 5.36 / 5.55:1;
 *   - `primary.main` `#00640e` (legacy `@brand-primary`, verbatim) -- 6.72 /
 *     7.16 / 7.42:1, and `#fff` on it 7.42:1, which is what carries the bar;
 *   - `primary.light` `#0a7a20` -- the emphasis variant legacy spells
 *     `@link-color: rgb(12, 164, 63)`; that value measures 3.24:1 on white and
 *     cannot carry text, so it is darkened to 4.98 / 5.31 / 5.50:1;
 *   - `success` `#17742a` (legacy `rgb(35, 161, 35)`, 3.10:1 on white) --
 *     4.94:1 on the bar ground, `#fff` on it 5.89:1;
 *   - `warning` `#9c5400` (legacy `rgb(255, 133, 27)`, 2.20:1) -- 4.79:1 on
 *     the bar ground, `#fff` on it 5.70:1;
 *   - `info` `#0f6c86` (legacy `rgb(117, 202, 235)`, 1.72:1) -- 5.42 / 5.77 /
 *     5.98:1;
 *   - `error` `#c62222` (legacy `rgb(255, 65, 54)`, 3.38:1) -- 5.20 / 5.55 /
 *     5.75:1, and `#fff` on it 5.75:1 for the filled `Chip`/`Alert` families
 *     ADR-0035 requires re-checking whenever `error` moves;
 *   - `inputOutline` at alpha 0.45 -- 3.30:1 on the page, 3.35:1 on the white
 *     field fill, clearing WCAG 1.4.11's 3:1 from both sides (0.40 reaches
 *     only 2.81 / 2.85);
 *   - the chart sequence -- the grey theme's six hues dropped from L 0.72-0.82
 *     to L 0.54-0.58 and given a little more chroma, because the originals
 *     measure under 2:1 on a white card; these read 3.91-5.31:1 on
 *     `background.paper`.
 *
 * The grounds themselves invert the dark themes' relationship, which is MUI's
 * own light-mode convention and legacy's: the page is the *tinted* surface and
 * a raised one is white. `surfaces.recessed` is white too -- legacy's input
 * fill -- and is told apart from the paper it sits on by `inputOutline`, which
 * is exactly the job ADR-0036 gives that token.
 */
const brightColors: ThemeColors = {
    mode: "light",
    background: {default: "#f2f4f3", paper: "#fafbfb"},
    text: {primary: "#111514", secondary: "#4a524f"},
    primary: {
        main: "#00640e",
        light: "#0a7a20",
        dark: "#004a0a",
        contrastText: lightContrastText,
    },
    success: {main: "#17742a", contrastText: lightContrastText},
    warning: {main: "#9c5400", contrastText: lightContrastText},
    info: {main: "#0f6c86", contrastText: lightContrastText},
    error: {main: "#c62222", contrastText: lightContrastText},
    surfaces: {
        bar: "#e8ecea",
        control: "#ffffff",
        recessed: "#ffffff",
        hairline: "rgba(0, 0, 0, 0.18)",
        hairlineFaint: "rgba(0, 0, 0, 0.1)",
        // FM-161, and the one block that darkens rather than lifts: on a
        // light page a white wash has nowhere to go. Black at 0.16 -- four
        // times MUI's light-mode `action.hover`, which moved this page by
        // 1.09:1 and never cleared the floor at all -- reads 1.45:1 from the
        // page, 1.20:1 from the selected rest, 1.21:1 under the selected
        // hover, and 1.44:1 over `surfaces.bar`.
        hoverWash: "rgba(0, 0, 0, 0.16)",
        mutedText: "#5f6b66",
        // The one theme whose app bar is `primary.main` rather than
        // `background.paper`, so its accent is the contrast text (legacy's own
        // `@navbar-default-link-color: rgb(255, 255, 255)`) instead.
        barAccent: lightContrastText,
        // The one theme where the dark-theme white edge disappeared entirely
        // (1.03:1): a dark edge at this block's own `inputOutline` alpha
        // instead, 3.30:1 on the page ground the select column paints.
        selectAllOutline: "rgba(0, 0, 0, 0.45)",
        // FM-156, and the only block that re-authors this scrim rather than
        // keeping what the call site composited. The 0.45 black the three dark
        // themes render is, on a white card, a 3.33:1 wall that drops
        // `text.primary` from 17.75:1 to 5.33:1 -- black smeared over the last
        // column of a config table, not an edge affordance.
        //
        // Authored against the band the dark themes actually render, from both
        // ends: at 0.14 the fade darkens `background.paper` by 1.38:1 and
        // `surfaces.control` by 1.38:1 (the dark themes' own step is
        // 1.05-1.31:1), and leaves `text.primary` at 12.87 / 13.33:1 through
        // it (theirs, 12.31-14.10:1, bar `dark`'s muted 6.90:1). Not the
        // block's `inputOutline` 0.45: that token is a *boundary* measured
        // against 1.4.11, and a scrim over live text is the one thing it is
        // not.
        tableScrollFade: "rgba(0, 0, 0, 0.14)",
    },
    inputOutline: "rgba(0, 0, 0, 0.45)",
    scrollbar: {thumb: "#c3c9c6", thumbHover: "#adb5b1"},
    charts: [
        "oklch(0.55 0.12 190)",
        "oklch(0.58 0.14 80)",
        "oklch(0.56 0.15 300)",
        "oklch(0.54 0.16 20)",
        "oklch(0.55 0.14 250)",
        "oklch(0.58 0.14 140)",
    ],
    // FM-172/ADR-0053, and the reason that decision exists: this theme's
    // `charts[0]` is authored two-thirds of a lightness step below the three
    // dark themes' teal, so the label is measured against a different ground
    // and is stated separately here.
    //
    // Pure black rather than the `#111514` the dark themes use, and rather
    // than the white this token first carried. `charts[0]`'s
    // `oklch(0.55 0.12 190)` is outside sRGB -- its linear red is negative --
    // so a browser renders it as rgb(0, 135, 129), a good deal lighter than
    // the out-of-gamut value the arithmetic alone suggests. Against what is
    // actually painted, white reads 4.40:1 and `text.primary`'s warm
    // near-black 4.18:1, both short of 1.4.3; black reads 4.77:1. The
    // categorical sequence stays as authored (ADR-0052; ADR-0053's addendum
    // would allow re-authoring it for `bright`, but this packet's scope keeps
    // `theme.ts` to the bar-label token, and moving the label clears 1.4.3
    // without disturbing every other `bright` chart).
    chartBarLabel: "#000000",
};

const themeColors: Record<ThemeName, ThemeColors> = {
    grey: greyColors,
    bright: brightColors,
    dark: darkColors,
    "dark-dyschromatopsia": darkDyschromatopsiaColors,
};

/*
 * ---------------------------------------------------------------------------
 * The application's single keyboard focus indicator: MUI's own
 * `theme.focusVisible`, at ADR-0013's measured geometry (ADR-0056).
 * ---------------------------------------------------------------------------
 *
 * ADR-0013 (accepted 2026-08-19, **Option A**) decided that this application
 * indicates keyboard focus with one explicit focus-ring token rather than with
 * the browser default, and measured its geometry: a 3px ring at a 3px offset
 * (changed area `6(w+h) + 108` px2 against WCAG 2.4.11's `2 x perimeter` =
 * `4(w+h)` threshold, cleared at every control size in this application),
 * drawn inset (`-3px`, area `6(w+h) - 36` px2, still above the same threshold)
 * wherever an ancestor measurably clips an outset ring. ADR-0015 amended the
 * scope: the text-input/select family is not ringed at all, because MUI's own
 * focused `notchedOutline` (2px `primary.main`, measured by FM-052 at
 * 3.15-5.56:1) is that family's indicator and a ring doubles it.
 *
 * ADR-0056 keeps both of those decisions and replaces their *mechanism*.
 * `@mui/material` **9.4.0** ships the ring as a first-class theme concern, so
 * this file no longer authors eleven per-family `&.Mui-focusVisible` rules and
 * a `focusRing()` helper of its own; it opts in once, in `createTheme`'s
 * `focusVisible` key below, and MUI decides which component paints where. The
 * mechanism, cited by symbol name because `node_modules` line numbers rot
 * between installs (the failure mode FM-047 hit):
 *
 *   - `styles/focusVisible.js` -- `resolveFocusVisible` fills `outlineStyle:
 *     "solid"`, `outlineColor: palette.primary.main`, `outlineWidth: 2`,
 *     `outlineOffset: 2` and `boxShadow: var(--_focusVisible-shadow, 0 0)`,
 *     merges this file's object over it, and rewrites the offset to
 *     `calc(var(--_focusVisible-offset, 1) * 3px)`. `createThemeNoVars.js`
 *     resolves it per theme, so the ring follows each palette's own
 *     `primary.main` (ADR-0052) with nothing restated here.
 *   - Outset: `ButtonBase.js`'s root variant `internalDisabledThemeFocusVisible:
 *     false` spreads `outsetFocusRing` and the ring onto every `ButtonBase`
 *     root -- `Button`, `IconButton`, a clickable `Chip`, `TableSortLabel`,
 *     `PaginationItem`, `ToggleButton`. `Link.js` rings its own
 *     `MuiLink-focusVisible` class. `Checkbox.js`/`Radio.js` ring
 *     `&.Mui-focusVisible svg:first-of-type`, because `SwitchBase.js` opts
 *     their root out (`internalDisabledThemeFocusVisible: true`): the root's
 *     focusable node is a fully transparent `opacity: 0` input overlay, so the
 *     visible svg carries the indicator instead. `Switch.js` rings
 *     `&.Mui-focusVisible ~ .MuiSwitch-track`.
 *   - Inset, `applyInsetFocusVisible(n)` = an offset of `-n x 3px`: `MenuItem`,
 *     `ListItemButton` and an `Autocomplete` option at `-3px` (a scrolling
 *     `Menu`/`Paper`/listbox clips an outset ring), and `Tab` at **`-9px`**
 *     (`n = 3`), whose `.MuiTabs-scroller` is exactly the tab's own height.
 *   - `AppBar.js`, a filled `Alert.js` and `SnackbarContent.js` set
 *     `--_focusVisible-shadow: 0 0 0 4px background.default`, a halo that
 *     separates the ring from a coloured bar.
 *
 * ONE FOCUS SYSTEM, TWO DECLARATIONS. `MuiCssBaseline`'s `":focus-visible"`
 * rule below is the only focus declaration left in this file, and it renders
 * the same resolved token by spreading it: it is the indicator for the one
 * control class in this application that no MUI component styles at all, the
 * sanitized unclassed native `<a href>` `NewsPage`'s `SafeRichContent` renders
 * from third-party HTML (FM-052 measured its `currentColor` default at
 * 1.29:1). ADR-0013's Option B mechanism stays rejected: no `!important`, no
 * specificity raise, no per-family opt-in on that rule.
 *
 * MUI'S 2/2 DEFAULTS. Deleting the two keys in `focusVisible` below -- and
 * nothing else -- yields MUI's own `outlineWidth: 2` / `outlineOffset: 2`
 * (and `Tab` at `-6px`). ADR-0056 records that as an experiment the owner may
 * run later; until it is run and re-measured, ADR-0013's geometry stands.
 *
 * VERSION SCOPE AND RE-VERIFICATION DUTY (ADR-0012's precedent, ADR-0013's
 * `What would keep it from regressing`): everything above is scoped to
 * `@mui/material` **9.4.0** and to Chrome for Testing. After **any**
 * `@mui/material` upgrade it must be re-proven by re-running
 * `tests/system/tests/focus-indication.spec.ts` in a real browser against a
 * real backend -- not by re-reading those sources, and not by a jsdom
 * component test, which has no `:focus-visible`, no layout, no computed
 * outline and no ripple element (ADR-0004).
 */

export function createHydraTheme(
    preference: ThemePreference = "grey",
    prefersDark = systemPrefersDark(),
): Theme {
    // The one place a theme is chosen. Everything below reads `colors` and
    // nothing below states a colour of its own (ADR-0049).
    const colors = themeColors[resolveThemeName(preference, prefersDark)];

    return createTheme({
        // ADR-0013's measured geometry, and the whole of this application's
        // focus-ring opt-in (ADR-0056). Deleting these two keys -- and nothing
        // else -- takes MUI 9.4's own 2px/2px defaults instead; see the block
        // comment above `createHydraTheme` for the mechanism and for why the
        // 3px/3px pair is what this repository has measured.
        focusVisible: {outlineWidth: 3, outlineOffset: 3},
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
            mode: colors.mode,
            background: colors.background,
            text: colors.text,
            surfaces: colors.surfaces,
            charts: {
                categorical: colors.charts,
                barLabel: colors.chartBarLabel,
            },
            // Every role spells out its own `contrastText` in its block: under
            // `colorSpace` MUI would otherwise derive it as `oklch(from <main>
            // var(--__l) 0 h / var(--__a))`, whose custom properties only exist
            // in the CSS theme-variables build this app does not use.
            primary: colors.primary,
            success: colors.success,
            warning: colors.warning,
            info: colors.info,
            error: colors.error,
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
                color: colors.surfaces.mutedText,
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
                    // ADR-0013 family H, and the only focus declaration this
                    // file still makes (ADR-0056). It is not a second focus
                    // system: it spreads the very token MUI resolved from the
                    // `focusVisible` option above, so the ring, its colour and
                    // its inset behaviour are identical to every component
                    // MUI rings by itself. It is kept because MUI rings no
                    // component here -- this is the one control class in the
                    // application that no MUI component styles at all: the
                    // sanitized, unclassed native `<a href>` `NewsPage`'s
                    // `SafeRichContent` renders from third-party HTML, which
                    // FM-052 measured at 1.29:1 on the browser default.
                    ":focus-visible": {...theme.focusVisible},
                    // The mock's `<helmet>` scrollbar block, for browsers that
                    // honor the `::-webkit-scrollbar` pseudo-elements. Track and
                    // thumb border reuse the page background token so a future
                    // palette change does not need this rule edited.
                    "*::-webkit-scrollbar": {width: 11, height: 11},
                    "*::-webkit-scrollbar-track": {
                        background: theme.palette.background.default,
                    },
                    "*::-webkit-scrollbar-thumb": {
                        background: colors.scrollbar.thumb,
                        borderRadius: 6,
                        border: `2px solid ${theme.palette.background.default}`,
                    },
                    "*::-webkit-scrollbar-thumb:hover": {
                        background: colors.scrollbar.thumbHover,
                    },
                }),
            },
            // FM-172 (ADR-0053): the stats charts' bar value labels. x-charts
            // fills them with `text.primary`, which is authored for the page
            // ground and not for the bar the label is printed on -- in the
            // three dark themes that put light grey text on a light teal bar.
            // The fill moves here, per theme, so no chart component states a
            // colour of its own (ADR-0014) and the bars themselves are
            // untouched (ADR-0052).
            MuiBarLabel: {
                styleOverrides: {
                    root: {fill: colors.chartBarLabel},
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
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
                    },
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
                            // FM-161: the hover moved from the border alone
                            // (an alpha 0.16 edge, 1.06-1.19:1 off the
                            // hairline it replaced, which the owner could not
                            // see) onto the background, where the eye reads a
                            // pill's state. It is laid *over* the pill's own
                            // `surfaces.bar` rather than replacing it --
                            // `background-image` paints above
                            // `background-color` -- so the pill's hover is
                            // measured against its own ground and is the same
                            // step whatever page it sits on. The border shift
                            // stays as the second, quieter half.
                            "&:hover": {
                                backgroundColor: theme.palette.surfaces.bar,
                                backgroundImage: hoverWash(theme),
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
                                // FM-161: this restated the pressed values
                                // verbatim, so a selected pill answered a
                                // pointer with nothing. It now deepens in the
                                // selection's own hue, the same step the
                                // refine rows' selected hover takes, while
                                // the 0.45 border and `primary.light` label
                                // that carry selected-vs-unselected stay put.
                                "&:hover": {
                                    backgroundColor: theme.alpha(
                                        theme.palette.primary.main,
                                        refineSelectedHoverAlpha,
                                    ),
                                    // Stated, not inherited. This block wins
                                    // the `background-color` off the base
                                    // `&:hover` above on specificity, but a
                                    // `background-image` it never mentions
                                    // would go on painting -- so without this
                                    // line the browser renders the neutral
                                    // wash *over* the deepened hue, which is
                                    // neither of the two things the hover
                                    // vocabulary says. The wash is the half
                                    // that means "the pointer is here, and
                                    // this one is not selected"; a selected
                                    // pill answers in the selection's own
                                    // hue alone, exactly as a selected refine
                                    // row does (`refineRowBackgrounds`, which
                                    // carries no wash on its selected hover).
                                    // Clearing it also keeps the pressed
                                    // *pair* on one ground: pressed rest and
                                    // pressed hover both replace the pill's
                                    // `surfaces.bar` with a `primary.main`
                                    // alpha, so the step between them is the
                                    // 0.16 -> `refineSelectedHoverAlpha` step
                                    // and nothing else: 1.40 / 1.36 / 1.48 /
                                    // 1.36:1 on grey, bright, dark and
                                    // dark-dyschromatopsia.
                                    backgroundImage: "none",
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
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        // 4px around MUI's 24px default glyph is exactly
                        // `controlHeight`, so a bar control like the search
                        // form's Advanced toggle stops being the tallest
                        // thing in its row (it measured 40px). Expressed as
                        // padding rather than a fixed box so `size="small"`
                        // (a 20px glyph) stays proportionally smaller for
                        // in-row icons instead of being padded out to match.
                        padding: 4,
                    },
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
            // The mock's compact control size, applied to `Pagination` the
            // same way `MuiTextField` above applies it to text inputs.
            // `HistoryPager` (the one pager the app has) used to set this
            // per instance; centralizing it here means any future
            // `Pagination` gets the same density without restating it.
            MuiPagination: {
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
                        // User report (2026-09-03): on an iPhone the page
                        // "zooms in a bit" when the search field is tapped.
                        // That is iOS Safari's own rule -- focusing an input
                        // whose computed font-size is under 16px scales the
                        // page until it is -- and no desktop simulator
                        // emulates it. Touch devices therefore get the 16px
                        // that switches the zoom off; mouse devices keep the
                        // mock's 14px. `pointer: coarse` rather than a width
                        // breakpoint because the zoom is a property of the
                        // input device, not of the viewport: a tablet at
                        // 1024px zooms too.
                        "@media (pointer: coarse)": {
                            fontSize: "16px",
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
                    // Owner request (2026-08-31): the label reads one step
                    // larger than the control size -- 16px here renders at
                    // 16 x 0.75 = 12px in the notch, against the previous
                    // 14 x 0.75 = 10.5px. The invariant survives in a
                    // generalized form: `MuiOutlinedInput` below states the
                    // legend at exactly 0.75 x this size (12px), so the
                    // notch is still cut for the same text the label
                    // paints; `theme.test.ts` pins the pair.
                    root: {fontSize: "16px"},
                },
            },
            // The mock's checkbox rows (the indexer grid) label at 13px;
            // MUI's `FormControlLabel` otherwise spreads `body1` (16px).
            MuiFormControlLabel: {
                styleOverrides: {
                    label: {fontSize: "13px"},
                },
            },
            MuiMenuItem: {
                styleOverrides: {
                    root: {
                        // The mock's menu rows are 14px like its inputs;
                        // MUI's default is `body1` (16px).
                        fontSize: "14px",
                    },
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
                            borderColor: colors.inputOutline,
                            // The notch-width copy of the label. Its stock
                            // size is 0.75em of the 14px input (10.5px),
                            // which matched the label only while the label
                            // was also 14px; with the label at 16px the
                            // legend states 0.75 x 16 = 12px explicitly so
                            // the notch is cut for the text painted over it
                            // (FM-090's invariant, generalized).
                            "& legend": {fontSize: "12px"},
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
                    root: {
                        // The mock's quality/type pills are `padding:5px 10px`
                        // around a 12px monospace label inside a 1px border,
                        // i.e. ~26px tall -- appreciably denser than MUI's 32px
                        // default.
                        height: 26,
                        // The mock's own pill radius; see `pillRadius`'s doc
                        // comment above for the second consumer this is
                        // shared with.
                        borderRadius: pillRadius,
                    },
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
                            // FM-161: the same border-only hover the refine
                            // pill carried, with the same defect (1.06-1.19:1
                            // of edge, nothing at all on the background), so
                            // it takes the same correction in the same pass
                            // -- one hover vocabulary across every refine
                            // selection control. The chip's ground is
                            // `surfaces.bar` too (the search workspace
                            // `Paper` paints that token), so the wash it lays
                            // over its own fill is exactly the step the eye
                            // sees against the bar behind it.
                            "&:hover": {
                                backgroundColor: theme.palette.surfaces.bar,
                                backgroundImage: hoverWash(theme),
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
