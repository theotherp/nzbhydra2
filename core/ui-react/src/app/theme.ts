/**
 * The application theme, composed.
 *
 * Backlog item 30 split this file's three responsibilities into siblings --
 * `themeTokens.ts` (raw values), `themePalettes.ts` (the four colour blocks and
 * the name/preference vocabulary) and `themeComponents.ts` (the `components`
 * slot) -- and left this module as what it always was to the rest of the
 * application: the module that builds the `Theme` and the one import path for
 * the theme's public vocabulary. Every export the application consumed before
 * the split is still exported here, so no call site changed.
 *
 * The MUI module augmentations stay here too: they describe the shape of the
 * theme this module produces.
 */

import type {} from "@mui/x-date-pickers/themeAugmentation";
import {
    createTheme,
    type CSSObject,
    type Theme,
    type TypographyStyle,
} from "@mui/material/styles";

import {createThemeComponents} from "./themeComponents";
import {
    resolveThemeName,
    type SurfaceTokens,
    themeColors,
    type ThemePreference,
} from "./themePalettes";
import {uiFontFamily} from "./themeTokens";

export type {ThemeName, ThemePreference} from "./themePalettes";
export {resolveThemeName, themePreferenceOptions} from "./themePalettes";
export {
    controlHeight,
    denseControlFontSize,
    monoFontFamily,
    pillRadius,
    refineRowBackgrounds,
    refineSectionGap,
    selectAllRadius,
} from "./themeTokens";

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
    // in the same oklch lightness/chroma family as the grey block's own role
    // colours in `themePalettes.ts` (FM-154 renamed `mockPalette` to that
    // block) -- this repository's one interactive-chart consumer, so the
    // sequence is authored fresh rather than reusing role colors
    // (`primary`/`warning`/…) whose semantic meaning elsewhere (brand accent,
    // caution) does not apply to "which series is this" in a chart legend.
    interface ChartTokens {
        categorical: string[];
        /**
         * FM-172 (ADR-0053): the fill of a bar's own value label. Stated per
         * theme rather than shared, because it sits on `categorical[0]` -- the
         * only series colour a bar value label ever paints on, since
         * `HorizontalBarChart` is this application's one labelled chart and
         * always builds exactly one series -- and that colour is light in the
         * three dark themes and darker in `bright`. Each theme block in
         * `themePalettes.ts` states its measured ratio; `theme.test.ts`
         * re-measures them, against the sRGB-clamped rendering rather than the
         * raw oklch arithmetic, because `bright`'s `categorical[0]` is outside
         * the display gamut.
         */
        barLabel: string;
    }

    /**
     * `@mui/x-charts@9.11.1` styles the bar value label as `styled('text',
     * {name: 'MuiBarLabel', slot: 'Root'})`, so
     * `components.MuiBarLabel.styleOverrides.root` reaches it -- but the
     * package declares `MuiBarLabel` only in its props augmentation
     * (`themeAugmentation/props.d.ts`), never in the `Components` map that
     * types `styleOverrides`. Declare the one slot it has, so the override in
     * `themeComponents.ts` is a typed theme entry rather than a cast. The slot
     * takes MUI's usual pair -- a style object, or the callback form that
     * receives the theme -- so the declaration must carry `Components`' own
     * type parameter.
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
    // FM-087: the search bar's constraint chips (the redesign's status row). A
    // themed `Chip` variant authored beside `refineChip` in
    // `themeComponents.ts`, for the same reason: a live constraint is a stock,
    // already focus-ringed `Chip` (ADR-0013 family G) whose look is a theme
    // token (ADR-0014), never an `sx` literal in the search feature.
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
 * rule in `themeComponents.ts` is the only focus declaration left in the
 * theme, and it renders the same resolved token by spreading it: it is the
 * indicator for the one control class in this application that no MUI
 * component styles at all, the sanitized unclassed native `<a href>`
 * `NewsPage`'s `SafeRichContent` renders from third-party HTML (FM-052
 * measured its `currentColor` default at 1.29:1). ADR-0013's Option B
 * mechanism stays rejected: no `!important`, no specificity raise, no
 * per-family opt-in on that rule.
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
        components: createThemeComponents(colors),
    });
}

function systemPrefersDark(): boolean {
    return (
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
    );
}
