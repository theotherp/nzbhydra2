import {createTheme, type Theme} from "@mui/material/styles";

declare module "@mui/material/styles" {
    // `@mui/material@7.3.9` reads `options.colorSpace` in `createThemeNoVars`
    // and exposes it on the theme (its `alpha`/`lighten`/`darken` helpers and
    // `createPalette`'s `augmentColor` both branch on it), but only declares the
    // option on the internal `createColorScheme` signature, not on the public
    // `ThemeOptions`. Declare it here until MUI ships the type.
    interface ThemeOptions {
        colorSpace?: string | undefined;
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

// Mock palette, sourced from `/tmp/hydra mock/Awaiting responses for
// direction/NZBHydra Search.dc.html` (its `<helmet>` `<style>` block, the outer
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
    // No mock evidence: the mock never renders an `info` or `error` role, so
    // ADR-0007's legacy-grey values are deliberately kept rather than inventing
    // unreviewed `oklch` ones (see the FM-043 packet's Out Of Scope).
    info: "#398da5",
    error: "#a33938",
    // The mock's `::-webkit-scrollbar` thumb colors; it has no theme-token
    // equivalent, so the two literals stay here next to the palette they belong
    // to. The track and thumb border reuse `background.default` instead.
    scrollbarThumb: "#3a4446",
    scrollbarThumbHover: "#495456",
} as const;

// MUI's default contrast text for a light-enough surface. Used verbatim for the
// roles MUI would otherwise compute it for, because `oklch()` is outside the
// sRGB formats `@mui/system`'s `getContrastRatio` can decompose.
const darkContrastText = "rgba(0, 0, 0, 0.87)";
const lightContrastText = "#fff";

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
            error: {main: mockPalette.error, contrastText: lightContrastText},
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
        },
        // The mock's dominant corner radius: 21 of its inline styles use
        // `border-radius:8px` (nav pills, the primary Search button, every text
        // input, the toolbar buttons), more than all its other radii combined.
        shape: {borderRadius: 8},
        components: {
            MuiCssBaseline: {
                styleOverrides: ({palette}) => ({
                    ":focus-visible": {
                        outline: "3px solid currentColor",
                        outlineOffset: "3px",
                    },
                    // The mock's `<helmet>` scrollbar block, for browsers that
                    // honor the `::-webkit-scrollbar` pseudo-elements. Track and
                    // thumb border reuse the page background token so a future
                    // palette change does not need this rule edited.
                    "*::-webkit-scrollbar": {width: 11, height: 11},
                    "*::-webkit-scrollbar-track": {
                        background: palette.background.default,
                    },
                    "*::-webkit-scrollbar-thumb": {
                        background: mockPalette.scrollbarThumb,
                        borderRadius: 6,
                        border: `2px solid ${palette.background.default}`,
                    },
                    "*::-webkit-scrollbar-thumb:hover": {
                        background: mockPalette.scrollbarThumbHover,
                    },
                }),
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        // The mock labels its buttons "Search" / "Load more
                        // results" / "Send to downloader" in sentence case.
                        textTransform: "none",
                        // The mock's own button radius (`border-radius:8px` on
                        // the primary Search button and the toolbar buttons).
                        borderRadius: 8,
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    // The mock's results card is `border-radius:12px`. Raised,
                    // non-square surfaces (cards, menus, dialogs, drawers) adopt
                    // it; `AppBar` renders its `Paper` with `square`, so the
                    // shell header keeps its full-bleed square corners.
                    root: ({ownerState}) =>
                        ownerState.square || (ownerState.elevation ?? 0) === 0
                            ? {}
                            : {borderRadius: 12},
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    // The mock's text inputs are `border-radius:8px`. Pinned
                    // explicitly rather than inherited from `shape.borderRadius`
                    // so the input radius stays the mock's even if the shared
                    // default is retuned later.
                    root: {borderRadius: 8},
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
                        // The mock's own pill radius (`border-radius:7px`).
                        borderRadius: 7,
                    },
                },
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
