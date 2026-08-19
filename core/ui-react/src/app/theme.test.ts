import {describe, expect, it} from "vitest";

import {createHydraTheme, monoFontFamily, resolveThemeMode} from "./theme";

describe("resolveThemeMode", () => {
    it("should follow the system preference for automatic mode", () => {
        expect(resolveThemeMode("auto", true)).toBe("dark");
        expect(resolveThemeMode("auto", false)).toBe("light");
    });

    it("should preserve the requested explicit mode", () => {
        expect(resolveThemeMode("light", true)).toBe("light");
        expect(resolveThemeMode("dark", false)).toBe("dark");
        expect(resolveThemeMode("dark-dyschromatopsia", false)).toBe("dark");
    });

    it("should provide the dyschromatopsia severity palette", () => {
        const theme = createHydraTheme("dark-dyschromatopsia", false);

        expect(theme.palette.background.default).toBe("#000000");
        expect(theme.palette.background.paper).toBe("#0f1113");
        expect(theme.palette.error.main).toBe("#b090c8");
        expect(theme.palette.info.main).toBe("#3aaccf");
        expect(theme.palette.primary.main).toBe("#78909c");
        expect(theme.palette.success.main).toBe("#30b885");
        expect(theme.palette.warning.main).toBe("#f0a830");
    });

    it("should keep the dyschromatopsia variant's contrast text unchanged by the mock palette", () => {
        const theme = createHydraTheme("dark-dyschromatopsia", false);

        expect(theme.palette.primary.contrastText).toBe("#fff");
        expect(theme.palette.error.contrastText).toBe("rgba(0, 0, 0, 0.87)");
        expect(theme.palette.info.contrastText).toBe("rgba(0, 0, 0, 0.87)");
        expect(theme.palette.success.contrastText).toBe("rgba(0, 0, 0, 0.87)");
        expect(theme.palette.warning.contrastText).toBe("rgba(0, 0, 0, 0.87)");
    });

    it("should default palette.mode to dark when no preference is supplied", () => {
        const theme = createHydraTheme();

        expect(theme.palette.mode).toBe("dark");
    });
});

describe("createHydraTheme base palette", () => {
    it("should source the base palette from the mock's oklch teal/cyan design", () => {
        const theme = createHydraTheme("dark", false);

        expect(theme.palette.background.default).toBe("#1f2426");
        expect(theme.palette.background.paper).toBe("#262c2e");
        expect(theme.palette.text.primary).toBe("#d6dad9");
        expect(theme.palette.text.secondary).toBe("#9aa2a1");
        expect(theme.palette.primary.main).toBe("oklch(0.75 0.1 190)");
        expect(theme.palette.primary.light).toBe("oklch(0.82 0.1 190)");
        expect(theme.palette.primary.dark).toBe("oklch(0.85 0.1 190)");
        expect(theme.palette.success.main).toBe("oklch(0.75 0.11 150)");
        expect(theme.palette.warning.main).toBe("oklch(0.76 0.1 70)");
    });

    it("should keep info and error at their prior values, which the mock never renders", () => {
        const theme = createHydraTheme("dark", false);

        expect(theme.palette.info.main).toBe("#398da5");
        expect(theme.palette.error.main).toBe("#a33938");
    });

    it("should apply the base palette regardless of light/dark mode", () => {
        const theme = createHydraTheme("light", false);

        expect(theme.palette.mode).toBe("light");
        expect(theme.palette.primary.main).toBe("oklch(0.75 0.1 190)");
        expect(theme.palette.background.default).toBe("#1f2426");
    });

    it("should derive every palette role's alpha and tonal variants inside the oklch color space", () => {
        const theme = createHydraTheme("dark", false);

        // Without this MUI 7.3 opt-in, `@mui/system`'s sRGB-only
        // `decomposeColor` throws for an `oklch()` token the first time any
        // component asks the theme for a translucent or tonal variant of it,
        // which is every `MenuItem`, `Chip`, and hovered `Button`.
        expect(theme.alpha(theme.palette.primary.main, 0.08)).toBe(
            "oklch(from oklch(0.75 0.1 190) l c h / 0.08)",
        );
        expect(theme.palette.success.light).toBe(
            "color-mix(in oklch, oklch(0.75 0.11 150), #fff 20%)",
        );
    });

    it("should spell out contrast text for every role rather than deriving it from CSS variables", () => {
        const theme = createHydraTheme("dark", false);

        // `colorSpace` makes MUI derive contrast text as
        // `oklch(from <main> var(--__l) 0 h / var(--__a))`, and those custom
        // properties only exist in the CSS theme-variables build this app does
        // not use, so every role supplies its own literal instead.
        for (const role of [
            "primary",
            "success",
            "warning",
            "info",
            "error",
        ] as const) {
            expect(theme.palette[role].contrastText).not.toContain("var(--");
        }
        expect(theme.palette.primary.contrastText).toBe("#0e1c1b");
    });
});

describe("createHydraTheme typography and density", () => {
    it("should use the mock's vendored IBM Plex Sans stack at MUI's default base size", () => {
        const theme = createHydraTheme("dark", false);

        expect(theme.typography.fontFamily).toBe(
            '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
        );
        expect(theme.typography.fontSize).toBe(14);
    });

    it("should expose the mock's IBM Plex Mono stack for numeric and tabular values", () => {
        expect(monoFontFamily).toBe('"IBM Plex Mono", monospace');
    });

    it("should adopt the mock's denser radii and sentence-case buttons", () => {
        const theme = createHydraTheme("dark", false);

        expect(theme.shape.borderRadius).toBe(8);
        // `MuiButton`'s root override became a theme-reading function when
        // ADR-0013's authored focus ring joined it, so it is resolved and
        // compared by value, on the same pattern as `MuiPaper` below.
        const buttonRoot = theme.components?.MuiButton?.styleOverrides?.root;

        expect(typeof buttonRoot).toBe("function");
        expect(
            (buttonRoot as (props: {theme: typeof theme}) => unknown)({theme}),
        ).toEqual({
            textTransform: "none",
            borderRadius: 8,
            "&.Mui-focusVisible": {
                outline: "3px solid oklch(0.75 0.1 190)",
                outlineOffset: "3px",
            },
        });
        expect(
            theme.components?.MuiOutlinedInput?.styleOverrides?.root,
        ).toEqual({borderRadius: 8});
        // `MuiChip`'s root override became a theme-reading function for the
        // same reason `MuiButton`'s did: `Chip` is one of ADR-0013's authored
        // control families, so its `&.Mui-focusVisible` rule reads the shared
        // focus-ring token off the theme. Resolved and compared by value on
        // the same `MuiPaper` pattern; the mock's `height: 26` and
        // `borderRadius: 7` literals this assertion exists to pin are still
        // asserted.
        const chipRoot = theme.components?.MuiChip?.styleOverrides?.root;

        expect(typeof chipRoot).toBe("function");
        expect(
            (chipRoot as (props: {theme: typeof theme}) => unknown)({theme}),
        ).toEqual({
            height: 26,
            borderRadius: 7,
            "&.Mui-focusVisible": {
                outline: "3px solid oklch(0.75 0.1 190)",
                outlineOffset: "3px",
            },
        });
    });

    it("should round only raised, non-square paper surfaces so the AppBar stays full-bleed", () => {
        const theme = createHydraTheme("dark", false);
        const paperRoot = theme.components?.MuiPaper?.styleOverrides?.root;

        expect(typeof paperRoot).toBe("function");
        const resolve = (ownerState: {square?: boolean; elevation?: number}) =>
            (
                paperRoot as (props: {
                    ownerState: {square?: boolean; elevation?: number};
                }) => unknown
            )({ownerState});

        expect(resolve({square: false, elevation: 1})).toEqual({
            borderRadius: 12,
        });
        // `AppBar` renders its own `Paper` with `square`, so the shell header
        // keeps square corners while cards, menus, and dialogs get the mock's
        // 12px results-card radius.
        expect(resolve({square: true, elevation: 4})).toEqual({});
        expect(resolve({square: false, elevation: 0})).toEqual({});
    });

    it("should style the scrollbar from the mock while sourcing its track from the page background", () => {
        const theme = createHydraTheme("dark", false);
        const baseline = theme.components?.MuiCssBaseline?.styleOverrides;

        expect(typeof baseline).toBe("function");
        const styles = (
            baseline as (theme: unknown) => Record<string, unknown>
        )(theme);

        // ADR-0013 reconciled this rule with the authored focus-ring token, so
        // it renders `palette.primary.main` explicitly instead of the
        // `currentColor` that measured 1.29:1 on `NewsPage`'s bare anchors.
        expect(styles[":focus-visible"]).toEqual({
            outline: "3px solid oklch(0.75 0.1 190)",
            outlineOffset: "3px",
        });
        expect(styles["*::-webkit-scrollbar"]).toEqual({width: 11, height: 11});
        expect(styles["*::-webkit-scrollbar-track"]).toEqual({
            background: "#1f2426",
        });
        expect(styles["*::-webkit-scrollbar-thumb"]).toEqual({
            background: "#3a4446",
            borderRadius: 6,
            border: "2px solid #1f2426",
        });
        expect(styles["*::-webkit-scrollbar-thumb:hover"]).toEqual({
            background: "#495456",
        });
    });
});
