/**
 * The theme's design tokens: the raw values -- font stacks, control geometry,
 * radii and hover alphas -- that `themePalettes.ts`'s colour blocks and
 * `themeComponents.ts`'s slot overrides are both authored against.
 *
 * Split out of `theme.ts` (backlog item 30); the values, their names and their
 * documentation are unchanged, and `theme.ts` re-exports the ones feature code
 * consumes so no call site moves.
 */

import type {Theme} from "@mui/material/styles";

// The mock's own IBM Plex Sans UI stack, copied from the outer page `<div>`'s
// inline `font-family` in "NZBHydra Search.dc.html". The webfont itself is
// vendored through `@fontsource/ibm-plex-sans` and imported as a build-time CSS
// side effect from `App.tsx`; the mock's runtime `fonts.googleapis.com` link is
// deliberately not adopted (ADR-0009: this application ships no third-party
// runtime CDN dependency).
export const uiFontFamily =
    '"IBM Plex Sans", system-ui, -apple-system, sans-serif';

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
 * 8px) are things you *do*, stadiums are things that are *on or off*. Only two
 * control families take it: the refine surfaces' quality/type selection pills
 * (`MuiButton`'s `refineChip` variant in `themeComponents.ts`) and the search
 * bar's constraint chips (`MuiChip`).
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
 * So `MuiInputLabel` in `themeComponents.ts` states this same size, restoring
 * stock MUI's invariant: both copies now derive from 14px (the label as 14px x
 * 0.75, the legend as 0.75em of 14px), and the legend's 10px padding plus
 * small text's slightly wider per-em advance leave the notch reliably wider
 * than the label at any length. Keep the two entries reading this constant
 * rather than restating the number, so retuning the control size cannot
 * silently reopen the gap.
 */
export const controlFontSize = "14px";

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
 * Exported to `themeComponents.ts` only: its two consumers --
 * `refineRowBackgrounds` below and `MuiButton`'s `refineChip` variant -- are
 * the theme's own modules, and the value a feature would want is the
 * composited colour, which they already return.
 */
export const refineSelectedHoverAlpha = 0.34;

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
export function hoverWash(theme: Theme): string {
    const wash = theme.palette.surfaces.hoverWash;
    return `linear-gradient(${wash}, ${wash})`;
}
