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

export function createHydraTheme(
    preference: ThemePreference = "auto",
    prefersDark = systemPrefersDark(),
): Theme {
    const mode = resolveThemeMode(preference, prefersDark);
    const dyschromatopsia = preference === "dark-dyschromatopsia";

    return createTheme({
        palette: {
            mode,
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
