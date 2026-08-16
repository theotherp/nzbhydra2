import {createTheme, type Theme} from "@mui/material/styles";

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

// Legacy "grey" theme palette, sourced from core/ui-src/less/themes/vars-grey.less
// (the theme legacy renders by default; imported by core/ui-src/less/themes/grey.less).
// See docs/frontend-migration/decisions/ADR-0007-branded-mui-theme-foundation.md for
// the accepted Option A token mapping and the one explicitly-flagged `primary` variance.
const legacyGreyPalette = {
    // @body-bg / @gray-darker: rgb(38, 44, 46)
    backgroundDefault: "#262c2e",
    // lighten(@body-bg, 3%) -- legacy's @table-bg/@panel-bg surface tone used for
    // panels, tables, and popovers raised above the page background.
    backgroundPaper: "#2d3436",
    // @text-color: rgb(200, 200, 200)
    textPrimary: "#c8c8c8",
    // @text-muted / @gray-light: rgb(122, 130, 136)
    textSecondary: "#7a8288",
    // @brand-success: darken(rgb(98, 196, 98), 10%)
    success: "#42b142",
    // @brand-info: darken(rgb(79, 169, 194), 10%)
    info: "#398da5",
    // @brand-warning: darken(rgb(194, 115, 6), @color-darken / 2) == darken(., 5%)
    warning: "#a96405",
    // @brand-danger: darken(rgb(194, 78, 76), 10%)
    error: "#a33938",
    // Logo-green primary: the one explicitly-accepted variance from literal legacy
    // color-for-color mapping (ADR-0007 Human Decision). Legacy's own @brand-primary
    // is a muted gray (@gray-light) used sparingly; MUI's `primary` token drives far
    // more interactive affordances (links, focus rings, selected/active states) than
    // legacy's own muted-gray brand color did, so the logo's core green (sampled from
    // core/ui-src/img/logo.png and confirmed by the matching gradient stop in
    // core/ui-src/img/favicon.svg) is used instead.
    primary: "#0fab4b",
} as const;

export function createHydraTheme(
    preference: ThemePreference = "dark",
    prefersDark = systemPrefersDark(),
): Theme {
    const mode = resolveThemeMode(preference, prefersDark);
    const dyschromatopsia = preference === "dark-dyschromatopsia";

    return createTheme({
        palette: {
            mode,
            background: {
                default: legacyGreyPalette.backgroundDefault,
                paper: legacyGreyPalette.backgroundPaper,
            },
            text: {
                primary: legacyGreyPalette.textPrimary,
                secondary: legacyGreyPalette.textSecondary,
            },
            primary: {main: legacyGreyPalette.primary},
            success: {main: legacyGreyPalette.success},
            info: {main: legacyGreyPalette.info},
            warning: {main: legacyGreyPalette.warning},
            error: {main: legacyGreyPalette.error},
            // The dark-dyschromatopsia accessibility variant's own overrides are
            // spread last so they continue to take precedence over the new base
            // palette above, unchanged in value from before this task.
            ...(dyschromatopsia
                ? {
                      background: {default: "#000000", paper: "#0f1113"},
                      error: {main: "#b090c8"},
                      info: {main: "#3aaccf"},
                      primary: {main: "#78909c"},
                      success: {main: "#30b885"},
                      warning: {main: "#f0a830"},
                  }
                : {}),
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    ":focus-visible": {
                        outline: "3px solid currentColor",
                        outlineOffset: "3px",
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
