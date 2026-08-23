import {describe, expect, it} from "vitest";

import {
    controlHeight,
    createHydraTheme,
    monoFontFamily,
    pillRadius,
    resolveThemeMode,
    selectAllRadius,
} from "./theme";

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

    it("should expose the mock's surface tokens on the palette", () => {
        const theme = createHydraTheme("dark", false);

        expect(theme.palette.surfaces).toEqual({
            bar: "#232a2c",
            control: "#2a3133",
            recessed: "#1c2224",
            hairline: "rgba(255, 255, 255, 0.1)",
            hairlineFaint: "rgba(255, 255, 255, 0.06)",
            mutedText: "#6b7472",
        });
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

    // Both radius tokens are CSS *strings*, and the test asserts that rather
    // than only their values: `sx`'s `borderRadius` key is theme-multiplied
    // (`@mui/system`'s `defaultSxConfig.js` maps it to
    // `themeKey: "shape.borderRadius"`), so a numeric token means one thing
    // in `styleOverrides` and 8x that in `sx`. Both of these are consumed
    // through both mechanisms; strings resolve identically in each.
    it("should expose the stadium pill radius as a pass-through CSS string", () => {
        expect(pillRadius).toBe("999px");
        expect(typeof pillRadius).toBe("string");
    });

    it("should expose one shared control height for buttons and inputs", () => {
        expect(controlHeight).toBe(32);
    });

    // The unification is only worth anything if the exceptions stay
    // deliberate, so the one button family that opts out is asserted to opt
    // out -- a future edit that drops its `minHeight: 0` would silently
    // inflate the mock's dense 26px quality/type pills to 32px.
    it("should let the refine pill opt out of the shared control height", () => {
        const theme = createHydraTheme("dark", false);
        const variants = theme.components?.MuiButton?.variants ?? [];
        const refineChip = variants.find(
            (variant) =>
                (variant.props as {variant?: string}).variant === "refineChip",
        );

        expect(refineChip).toBeDefined();
        const style = (
            refineChip?.style as (props: {theme: typeof theme}) => {
                minHeight?: number;
            }
        )({theme});

        expect(style.minHeight).toBe(0);
    });

    it("should expose the select-all control's own radius for its two rendering paths", () => {
        expect(selectAllRadius).toBe("5px");
        expect(typeof selectAllRadius).toBe("string");
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
            // The shared control height, stated on the root so every button
            // in the application inherits it. The two families that opt out
            // do so explicitly and are asserted below.
            minHeight: controlHeight,
            paddingTop: 0,
            paddingBottom: 0,
            "&.Mui-focusVisible": {
                outline: "3px solid oklch(0.75 0.1 190)",
                outlineOffset: "3px",
            },
        });
        // `MuiOutlinedInput`'s root override became a theme-reading function
        // when ADR-0014's surface tokens joined it (recessed input ground,
        // hairline resting border); the 8px radius literal it exists to pin is
        // still asserted, and no focus ring is authored for the input family
        // (ADR-0015 -- MUI's own focused notchedOutline is the indicator).
        const outlinedRoot =
            theme.components?.MuiOutlinedInput?.styleOverrides?.root;

        expect(typeof outlinedRoot).toBe("function");
        expect(
            (outlinedRoot as (props: {theme: typeof theme}) => unknown)({
                theme,
            }),
        ).toEqual({
            borderRadius: 8,
            backgroundColor: "#1c2224",
            "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(255, 255, 255, 0.1)",
            },
        });
        // `MuiInputBase` carries only sizing declarations -- the mock's 14px
        // input text size and the shared `controlHeight` -- and in
        // particular no focus styling: ADR-0015's guard is that the input
        // family's indicator stays MUI's own focused notchedOutline, never a
        // reintroduced InputBase ring. Asserted exhaustively (`toEqual`, not
        // a property probe) so any added rule has to come through this test,
        // which is what makes it a guard rather than a description.
        expect(theme.components?.MuiInputBase).toEqual({
            styleOverrides: {
                root: {
                    fontSize: "14px",
                    "&:not(.MuiInputBase-multiline)": {height: controlHeight},
                },
            },
        });
        // The inner control is sized on `MuiOutlinedInput`, not here, and the
        // distinction is load-bearing rather than stylistic: `OutlinedInput`
        // ships its own `input` slot with `padding: 8.5px 14px`, a component
        // slot outranks `MuiInputBase`'s, and the same rule authored on the
        // base lost silently -- leaving the focusable `<input>` 17px taller
        // than the 32px border it sits in (measured live: root 32, inner 49).
        // Asserted here so that regression cannot come back unnoticed.
        const outlinedInput = theme.components?.MuiOutlinedInput?.styleOverrides
            ?.input as Record<string, unknown>;

        expect(outlinedInput).toEqual({
            boxSizing: "border-box",
            height: "100%",
            paddingTop: 0,
            paddingBottom: 0,
            "&.MuiSelect-select": {
                alignItems: "center",
                display: "flex",
            },
        });
        expect(theme.components?.MuiTextField?.defaultProps).toEqual({
            size: "small",
        });
        // FM-090's notch invariant, pinned as a pair: an outlined field's
        // label is rendered twice at two independently declared sizes -- the
        // visible `InputLabel` (this entry) and the hidden `legend` MUI cuts
        // the notch from at `0.75em` of the `InputBase` root (asserted
        // above). When those two sizes disagree the notch is cut for text of
        // a different width than the text painted over it, and the deficit
        // grows with the label until the border crosses it. Asserting the
        // *same* value in both places is what makes a future retune of one
        // of them fail here rather than in a screenshot nobody takes during
        // the font swap. The always-shrunk default is asserted with it: the
        // label only sits in the notch at all because of it.
        expect(theme.components?.MuiInputLabel).toEqual({
            defaultProps: {shrink: true},
            styleOverrides: {root: {fontSize: "14px"}},
        });
        expect(
            (
                theme.components?.MuiInputLabel?.styleOverrides?.root as {
                    fontSize: string;
                }
            ).fontSize,
        ).toBe(
            (
                theme.components?.MuiInputBase?.styleOverrides?.root as {
                    fontSize: string;
                }
            ).fontSize,
        );
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
            borderRadius: "999px",
            "&.Mui-focusVisible": {
                outline: "3px solid oklch(0.75 0.1 190)",
                outlineOffset: "3px",
            },
        });
    });

    // FM-087: the search bar's constraint chips take their whole look from
    // the theme, so the search feature states no colour, font, or radius of
    // its own for them (ADR-0014). The typography half applies to every
    // colour; the surface half only to the default one, leaving MUI's stock
    // `warning` treatment intact for the empty-indexer-selection chip.
    it("should dress a constraint chip from the theme, without repainting its warning colour", () => {
        const theme = createHydraTheme("dark", false);
        const variants = theme.components?.MuiChip?.variants ?? [];
        const resolve = (props: Record<string, unknown>) =>
            variants
                .filter((variant) =>
                    Object.entries(
                        variant.props as Record<string, unknown>,
                    ).every(([key, value]) => props[key] === value),
                )
                .map((variant) =>
                    typeof variant.style === "function"
                        ? (
                              variant.style as (props: {
                                  theme: typeof theme;
                              }) => unknown
                          )({theme})
                        : variant.style,
                );

        expect(resolve({variant: "constraint", color: "default"})).toEqual([
            {
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: "12px",
                fontWeight: 400,
            },
            {
                backgroundColor: "#232a2c",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#9aa2a1",
                "&:hover": {
                    backgroundColor: "#232a2c",
                    borderColor: theme.alpha(theme.palette.primary.main, 0.16),
                },
                "& .MuiChip-deleteIcon": {
                    color: "#6b7472",
                    "&:hover": {color: "oklch(0.82 0.1 190)"},
                },
            },
        ]);
        expect(resolve({variant: "constraint", color: "warning"})).toEqual([
            {
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: "12px",
                fontWeight: 400,
            },
        ]);
        expect(resolve({variant: "filled", color: "default"})).toEqual([]);
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
