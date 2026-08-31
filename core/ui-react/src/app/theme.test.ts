import {describe, expect, it} from "vitest";

import {readFileSync} from "node:fs";

import {
    controlHeight,
    createHydraTheme,
    monoFontFamily,
    pillRadius,
    resolveThemeName,
    selectAllRadius,
    themePreferenceOptions,
} from "./theme";

/*
 * ---------------------------------------------------------------------------
 * Measured colour, not described colour.
 * ---------------------------------------------------------------------------
 *
 * ADR-0035 ("clears 4.5:1 against both grounds") and ADR-0036 ("visible on
 * both `background.default` and `background.paper`") both state their
 * acceptance as a ratio. Asserting the resulting hex string alone would pin
 * the answer without pinning the property that made it the answer -- a later
 * palette change could move a ground and leave every colour assertion green
 * while the contrast that justified it was gone. So the ratios below are
 * computed from the theme's own tokens.
 *
 * The conversions are the published ones and are deliberately duplicated here
 * rather than taken from a dependency: WCAG 2.x relative luminance
 * (sRGB -> linear, 0.2126/0.7152/0.0722), and Björn Ottosson's OKLab matrices
 * for the `oklch()` tokens `@mui/system`'s own sRGB-only `decomposeColor`
 * cannot read (which is the whole reason this theme sets `colorSpace`).
 */
function hexToRgb(hex: string): [number, number, number] {
    const raw = hex.replace("#", "");
    // Both notations this palette actually writes: `#262c2e` and MUI's `#fff`.
    const digits =
        raw.length === 3
            ? raw
                  .split("")
                  .map((digit) => digit + digit)
                  .join("")
            : raw;
    return [0, 2, 4].map(
        (offset) => parseInt(digits.slice(offset, offset + 2), 16) / 255,
    ) as [number, number, number];
}

/** `rgba(r, g, b, a)` -> its channels, for the translucent border tokens. */
function parseRgba(value: string): {
    alpha: number;
    rgb: [number, number, number];
} {
    const parts = value
        .replace(/^rgba?\(|\)$/g, "")
        .split(",")
        .map((part) => Number(part.trim()));
    return {
        alpha: parts[3] ?? 1,
        rgb: [parts[0] / 255, parts[1] / 255, parts[2] / 255],
    };
}

function parseOklch(value: string): [number, number, number] {
    const parts = value
        .replace(/^oklch\(|\)$/g, "")
        .split(/\s+/)
        .map(Number);
    return [parts[0], parts[1], parts[2]];
}

/**
 * A palette token in whichever of this theme's two notations it is written in.
 * Deliberately not `oklch`-only: a token that regressed to the legacy hex must
 * come back through here as a *measurement* that fails the ratio, not as a
 * parse failure that fails for the wrong reason.
 */
function resolveColor(value: string): [number, number, number] {
    return value.startsWith("oklch(")
        ? oklchToRgb(parseOklch(value))
        : hexToRgb(value);
}

function oklchToRgb([l, c, h]: [number, number, number]): [
    number,
    number,
    number,
] {
    const radians = (h * Math.PI) / 180;
    const a = c * Math.cos(radians);
    const b = c * Math.sin(radians);
    const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const toSrgb = (linear: number) =>
        linear <= 0.0031308
            ? 12.92 * linear
            : 1.055 * linear ** (1 / 2.4) - 0.055;
    return [
        toSrgb(
            4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
        ),
        toSrgb(
            -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
        ),
        toSrgb(
            -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
        ),
    ];
}

function rgbToOklch([r, g, b]: [number, number, number]): [
    number,
    number,
    number,
] {
    const toLinear = (channel: number) =>
        channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
    const [lr, lg, lb] = [r, g, b].map(toLinear);
    const long = Math.cbrt(
        0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
    );
    const medium = Math.cbrt(
        0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
    );
    const short = Math.cbrt(
        0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
    );
    const l = 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short;
    const a = 1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short;
    const b2 =
        0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short;
    const hue = (Math.atan2(b2, a) * 180) / Math.PI;
    return [l, Math.hypot(a, b2), hue < 0 ? hue + 360 : hue];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
    const toLinear = (channel: number) =>
        channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(
    a: [number, number, number],
    b: [number, number, number],
): number {
    const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort(
        (x, y) => y - x,
    );
    return (high + 0.05) / (low + 0.05);
}

/**
 * A colour resolved against the opaque surface behind it. An opaque token
 * composites to itself, so a token that regressed from `rgba()` to a hex still
 * arrives at the ratio assertions as a measurement rather than as `NaN`.
 */
function compositeOver(
    value: string,
    ground: [number, number, number],
): [number, number, number] {
    const {alpha, rgb} = value.startsWith("rgb")
        ? parseRgba(value)
        : {alpha: 1, rgb: resolveColor(value)};
    return rgb.map((channel, index) => {
        const behind = ground[index];
        return alpha * channel + (1 - alpha) * behind;
    }) as [number, number, number];
}

describe("resolveThemeName", () => {
    // ADR-0049 states the `auto` mapping in words -- system light to `bright`,
    // system dark to `grey` -- and the second half is the one worth pinning:
    // the theme named `dark` is *not* what a system dark preference resolves
    // to. `grey` is this application's default dark theme; `dark` is legacy's
    // separate near-black one, which a user has to ask for.
    it("should map the automatic preference onto bright and grey", () => {
        expect(resolveThemeName("auto", true)).toBe("grey");
        expect(resolveThemeName("auto", false)).toBe("bright");
    });

    it("should pass an explicit preference through unchanged", () => {
        for (const name of [
            "grey",
            "bright",
            "dark",
            "dark-dyschromatopsia",
        ] as const) {
            expect(resolveThemeName(name, true)).toBe(name);
            expect(resolveThemeName(name, false)).toBe(name);
        }
    });

    it("should offer every theme, and only themes that exist, in the selector", () => {
        expect(themePreferenceOptions.map((option) => option.value)).toEqual([
            "auto",
            "grey",
            "bright",
            "dark",
            "dark-dyschromatopsia",
        ]);
        for (const option of themePreferenceOptions) {
            expect(option.label).not.toHaveLength(0);
            // Every offered value has to build a theme; `auto` included.
            expect(createHydraTheme(option.value, false).palette.mode).toBe(
                option.value === "auto" || option.value === "bright"
                    ? "light"
                    : "dark",
            );
        }
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
        const theme = createHydraTheme("grey", false);

        expect(theme.palette.surfaces).toEqual({
            bar: "#232a2c",
            control: "#2a3133",
            recessed: "#1c2224",
            hairline: "rgba(255, 255, 255, 0.1)",
            hairlineFaint: "rgba(255, 255, 255, 0.06)",
            mutedText: "#6b7472",
            // FM-154's one addition to the token set. It is the theme's own
            // `primary.main`, which is what `AppShell` read before the token
            // existed, so the grey theme's app bar renders exactly as it did.
            barAccent: "oklch(0.75 0.1 190)",
            // FM-154's second addition, and the one that must not move a
            // pixel here: it is the colour `SelectionMenu` composited from
            // `alpha(common.white, 0.25)` before the token existed, so the
            // grey theme's select-all square renders exactly as it did.
            selectAllOutline: "rgba(255, 255, 255, 0.25)",
        });
        expect(theme.palette.surfaces.barAccent).toBe(
            theme.palette.primary.main,
        );
    });

    it("should keep the dyschromatopsia variant's contrast text unchanged by the mock palette", () => {
        const theme = createHydraTheme("dark-dyschromatopsia", false);

        expect(theme.palette.primary.contrastText).toBe("#fff");
        expect(theme.palette.error.contrastText).toBe("rgba(0, 0, 0, 0.87)");
        expect(theme.palette.info.contrastText).toBe("rgba(0, 0, 0, 0.87)");
        expect(theme.palette.success.contrastText).toBe("rgba(0, 0, 0, 0.87)");
        expect(theme.palette.warning.contrastText).toBe("rgba(0, 0, 0, 0.87)");
    });

    // ADR-0049 makes `grey` the default, and `grey` is the palette this
    // application already rendered -- so "the default did not drift" is the
    // single most load-bearing claim FM-154 makes. It is asserted as a whole
    // palette rather than as a mode, against the values read off the
    // pre-FM-154 build, so a change to any one of them has to come through
    // here. (The derived tonal and alpha variants are pinned by the
    // `createHydraTheme base palette` block below.)
    it("should default to the grey theme, whose palette is the pre-FM-154 one", () => {
        const fromDefault = createHydraTheme();
        const grey = createHydraTheme("grey", false);

        expect(fromDefault.palette.mode).toBe("dark");
        for (const theme of [fromDefault, grey]) {
            expect(theme.palette.background.default).toBe("#1f2426");
            expect(theme.palette.background.paper).toBe("#262c2e");
            expect(theme.palette.text.primary).toBe("#d6dad9");
            expect(theme.palette.text.secondary).toBe("#9aa2a1");
            expect(theme.palette.primary.main).toBe("oklch(0.75 0.1 190)");
            expect(theme.palette.primary.light).toBe("oklch(0.82 0.1 190)");
            expect(theme.palette.primary.dark).toBe("oklch(0.85 0.1 190)");
            expect(theme.palette.primary.contrastText).toBe("#0e1c1b");
            expect(theme.palette.success.main).toBe("oklch(0.75 0.11 150)");
            expect(theme.palette.warning.main).toBe("oklch(0.76 0.1 70)");
            expect(theme.palette.info.main).toBe("#398da5");
            expect(theme.palette.error.main).toBe("oklch(0.7 0.14 24.3)");
            expect(theme.palette.charts.categorical).toEqual([
                "oklch(0.75 0.1 190)",
                "oklch(0.78 0.12 80)",
                "oklch(0.76 0.11 300)",
                "oklch(0.74 0.12 20)",
                "oklch(0.75 0.1 250)",
                "oklch(0.78 0.11 140)",
            ]);
        }
    });

    // The dyschromatopsia variant used to be six overrides spread over the grey
    // palette; FM-154 wrote it out as a block of its own. What that must not
    // change is the *effective* palette, so the merge's outcome is asserted
    // key by key -- including the three keys the merge produced by omission
    // rather than by statement: the variant never restated `primary.light` /
    // `primary.dark` (its spread replaced the whole role object, so MUI derives
    // both from `main`), and it never restated the surface tokens.
    it("should keep the dyschromatopsia palette exactly as the pre-FM-154 override spread produced it", () => {
        const theme = createHydraTheme("dark-dyschromatopsia", false);

        expect(theme.palette.primary.light).toBe(
            "color-mix(in oklch, #78909c, #fff 20%)",
        );
        expect(theme.palette.primary.dark).toBe(
            "color-mix(in oklch, #78909c, #000 30%)",
        );
        expect(theme.palette.text.primary).toBe("#d6dad9");
        expect(theme.palette.text.secondary).toBe("#9aa2a1");
        const grey = createHydraTheme("grey", false).palette.surfaces;

        expect(theme.palette.surfaces).toEqual({
            ...grey,
            // The one token that is not shared, and must not be: this theme's
            // app bar accent is its own `primary.main`, not grey's teal.
            barAccent: theme.palette.primary.main,
        });
    });
});

describe("createHydraTheme base palette", () => {
    it("should source the base palette from the mock's oklch teal/cyan design", () => {
        const theme = createHydraTheme("grey", false);

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

    it("should keep info at its prior value, which the mock never renders", () => {
        const theme = createHydraTheme("grey", false);

        expect(theme.palette.info.main).toBe("#398da5");
    });

    // ADR-0035. `error.main` is a foreground at every `color="error"` control
    // in the application, and the carried-over legacy `#a33938` measured
    // 2.16:1 / 2.39:1 against the two grounds those controls render on. The
    // correction is lightness only, so the assertion is on the three oklch
    // channels rather than on a hex string: a future retune that moved hue or
    // chroma would still be a different decision than the one ADR-0035 took.
    it("should raise error.main's lightness while carrying the legacy hue and chroma across", () => {
        const theme = createHydraTheme("grey", false);

        expect(theme.palette.error.main).toBe("oklch(0.7 0.14 24.3)");

        const legacy = rgbToOklch(hexToRgb("#a33938"));
        const [lightness, chroma, hue] = parseOklch(theme.palette.error.main);

        expect(chroma).toBeCloseTo(legacy[1], 2);
        expect(hue).toBeCloseTo(legacy[2], 1);
        expect(lightness).toBeGreaterThan(legacy[0]);
    });

    // ADR-0049: every theme is a *complete* block, so "complete" is asserted
    // structurally rather than trusted. The failure this guards against is the
    // one a light theme makes silent: a block that omits `inputOutline`, a
    // scrollbar colour or a chart sequence does not throw, it renders the
    // wrong-mode value or `undefined` at one surface nobody screenshotted.
    it("should give every theme a full colour set, with no key left to a neighbouring block", () => {
        for (const name of [
            "grey",
            "bright",
            "dark",
            "dark-dyschromatopsia",
        ] as const) {
            const {palette} = createHydraTheme(name, false);
            const surfaces = palette.surfaces;

            for (const value of [
                palette.background.default,
                palette.background.paper,
                palette.text.primary,
                palette.text.secondary,
                palette.primary.main,
                palette.primary.contrastText,
                palette.success.main,
                palette.warning.main,
                palette.info.main,
                palette.error.main,
                surfaces.bar,
                surfaces.barAccent,
                surfaces.control,
                surfaces.recessed,
                surfaces.hairline,
                surfaces.hairlineFaint,
                surfaces.mutedText,
                surfaces.selectAllOutline,
            ]) {
                expect(typeof value).toBe("string");
                expect(value).not.toHaveLength(0);
            }
            expect(palette.charts.categorical).toHaveLength(6);
            // The two tokens that are consumed from the block directly rather
            // than through the palette, and so cannot be read off `palette`:
            // asserted through the rules that render them.
            const outlined = (
                createHydraTheme(name, false).components?.MuiOutlinedInput
                    ?.styleOverrides?.root as (props: {
                    theme: ReturnType<typeof createHydraTheme>;
                }) => Record<string, Record<string, string>>
            )({theme: createHydraTheme(name, false)});

            expect(
                outlined["& .MuiOutlinedInput-notchedOutline"].borderColor,
            ).toMatch(/^(#|rgba?\(|oklch\()/);
            const baseline = (
                createHydraTheme(name, false).components?.MuiCssBaseline
                    ?.styleOverrides as (
                    theme: unknown,
                ) => Record<string, Record<string, unknown>>
            )(createHydraTheme(name, false));

            expect(baseline["*::-webkit-scrollbar-thumb"].background).toMatch(
                /^#/,
            );
            expect(
                baseline["*::-webkit-scrollbar-thumb:hover"].background,
            ).toMatch(/^#/);
        }
    });

    /*
     * ADR-0049's structural requirement, enforced rather than described: "all
     * colours of a theme live together in one named palette block". A colour
     * written anywhere else in this file -- a hairline in a `styleOverride`, a
     * contrast text beside a component entry -- is invisible to a reader
     * comparing two themes and, worse, is the same in all four of them, which
     * is precisely how a dark-theme remnant survives into a light one.
     *
     * The check is a grep over this file's own source with comments removed
     * (the prose above and below the blocks quotes measured colours constantly,
     * and quoting a colour is not stating one). The block region is delimited
     * by two declarations rather than by a comment marker, so stripping the
     * comments cannot move it.
     */
    it("should state no colour outside the theme blocks", () => {
        // Read from the Vitest root (`core/ui-react`) rather than from
        // `import.meta.url`, which Vite rewrites to a non-`file:` URL.
        const source = readFileSync("src/app/theme.ts", {encoding: "utf8"})
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, "");
        const start = source.indexOf("const darkContrastText");
        const end = source.indexOf("const focusRingWidth");

        expect(start).toBeGreaterThan(0);
        expect(end).toBeGreaterThan(start);
        const strays = [
            ...source.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(|oklch\(/g),
        ].filter((match) => match.index < start || match.index > end);

        expect(
            strays.map(
                (match) =>
                    `${match[0]} at ${source.slice(Math.max(0, match.index - 40), match.index + 20).trim()}`,
            ),
        ).toEqual([]);
    });

    it("should derive every palette role's alpha and tonal variants inside the oklch color space", () => {
        const theme = createHydraTheme("grey", false);

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
        const theme = createHydraTheme("grey", false);

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
        const theme = createHydraTheme("grey", false);

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
        const theme = createHydraTheme("grey", false);
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
        const theme = createHydraTheme("grey", false);

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
            // ADR-0036: the notch border is its own token, stronger than the
            // `surfaces.hairline` it used to share with menus and popovers,
            // and the disabled state steps *down* to that hairline so the two
            // stay distinguishable now that rest is heavier than MUI's own
            // `action.disabled`. Both ratios are measured below.
            "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(255, 255, 255, 0.35)",
            },
            "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
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
            // FM-117 (b). Both halves are load-bearing and neither substitutes
            // for the other: Firefox draws the spinner inside the input's own
            // widget and drops it only for `appearance: textfield` (asserted
            // with the `-moz-` prefix as well, which is the spelling the
            // acceptance names), Chromium draws it as two pseudo-elements
            // `appearance` does not reach. Asserted here rather than at the
            // one call site that used to carry it, because seven
            // `type="number"` fields across four files needed it and one had
            // it.
            "&[type=number]": {
                MozAppearance: "textfield",
                appearance: "textfield",
            },
            "&[type=number]::-webkit-outer-spin-button, &[type=number]::-webkit-inner-spin-button":
                {
                    WebkitAppearance: "none",
                    margin: 0,
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
        const theme = createHydraTheme("grey", false);
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
        const theme = createHydraTheme("grey", false);
        const paperRoot = theme.components?.MuiPaper?.styleOverrides?.root;

        expect(typeof paperRoot).toBe("function");
        const resolve = (ownerState: {square?: boolean; elevation?: number}) =>
            (
                paperRoot as (props: {
                    ownerState: {square?: boolean; elevation?: number};
                }) => unknown
            )({ownerState});

        expect(resolve({square: false, elevation: 1})).toEqual({
            backgroundImage: "none",
            borderRadius: 12,
        });
        // `AppBar` renders its own `Paper` with `square`, so the shell header
        // keeps square corners while cards, menus, and dialogs get the mock's
        // 12px results-card radius.
        expect(resolve({square: true, elevation: 4})).toEqual({
            backgroundImage: "none",
        });
        expect(resolve({square: false, elevation: 0})).toEqual({
            backgroundImage: "none",
        });
    });

    // ADR-0036's ground resolution, at the layer that makes it true. MUI's
    // dark-mode `Paper` paints `--Paper-overlay`, a white wash whose alpha is
    // `getOverlayAlpha(elevation)`, over `background.paper`; at `Dialog`'s
    // `elevation={24}` that is 0.165, so a dialog's real ground was
    // ~`#4a4f50` rather than `#262c2e` and the config tab body's new `Paper`
    // would have been a third ground rather than the dialogs'. Asserted at
    // every elevation, including the `square`/zero-elevation shapes the radius
    // rule deliberately skips, because "one ground" is exactly the claim that
    // no `Paper` in the application is exempt.
    it("should paint every paper surface flat, so background.paper means background.paper", () => {
        const theme = createHydraTheme("grey", false);
        const paperRoot = theme.components?.MuiPaper?.styleOverrides
            ?.root as (props: {
            ownerState: {square?: boolean; elevation?: number};
        }) => Record<string, unknown>;

        for (const ownerState of [
            {square: false, elevation: 0},
            {square: false, elevation: 1},
            {square: false, elevation: 24},
            {square: true, elevation: 4},
        ]) {
            expect(paperRoot({ownerState}).backgroundImage).toBe("none");
        }
    });

    // FM-117 (a). The clamp that clipped a wrapped chips field is not
    // deleted -- `controlHeight` still means "this single-line box does not
    // grow" for every text field and select -- so the assertion is a pair: the
    // clamp survives on `MuiInputBase`, and a *multi-value* Autocomplete is
    // excused from it. A single-value Autocomplete is genuinely a single-line
    // control and keeps it, which is why the rule is keyed on MUI's own
    // `multiple` prop and not on the Autocomplete class alone.
    it("should let a multi-value autocomplete grow with its chip rows while single-line inputs keep the clamp", () => {
        const theme = createHydraTheme("grey", false);
        const variants = theme.components?.MuiAutocomplete?.variants ?? [];
        const growing = variants.filter(
            (variant) =>
                (variant.props as {multiple?: boolean}).multiple === true,
        );

        expect(growing).toHaveLength(1);
        expect(growing[0]?.style).toEqual({
            // The compound selector is asserted, not just its declarations:
            // the clamp it overrides is itself a two-class rule, so an
            // equal-specificity override would be settled by emotion's
            // insertion order rather than by this file.
            "& .MuiAutocomplete-inputRoot.MuiInputBase-root": {
                height: "auto",
                minHeight: controlHeight,
            },
            "& .MuiAutocomplete-inputRoot .MuiAutocomplete-input": {
                height: "auto",
            },
        });
        // No variant claims the single-value case, so it still meets
        // `MuiInputBase`'s clamp.
        expect(variants).toHaveLength(1);
        expect(
            theme.components?.MuiInputBase?.styleOverrides?.root,
        ).toMatchObject({
            "&:not(.MuiInputBase-multiline)": {height: controlHeight},
        });
    });

    it("should style the scrollbar from the mock while sourcing its track from the page background", () => {
        const theme = createHydraTheme("grey", false);
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

/*
 * ADR-0035 and ADR-0036's acceptance, as arithmetic rather than as adjectives.
 * Every ratio below is computed from the theme's own tokens, so a later change
 * to a ground, to `error.main`, or to the notch border has to come back through
 * this block. The two grounds are named once and reused, because "proven on one
 * surface" is the failure ADR-0036 exists to correct.
 */
describe("createHydraTheme measured contrast (ADR-0035, ADR-0036)", () => {
    const theme = createHydraTheme("grey", false);
    const grounds = {
        "background.default": hexToRgb(theme.palette.background.default),
        "background.paper": hexToRgb(theme.palette.background.paper),
    } as const;

    describe("error.main as a foreground (ADR-0035)", () => {
        const errorRgb = resolveColor(theme.palette.error.main);

        for (const [name, ground] of Object.entries(grounds)) {
            it(`should clear WCAG 1.4.3's 4.5:1 against ${name}`, () => {
                // Measured: 4.99:1 on paper, 5.52:1 on default.
                expect(contrastRatio(errorRgb, ground)).toBeGreaterThanOrEqual(
                    4.5,
                );
            });

            it(`should be a real correction rather than a restatement of the legacy value on ${name}`, () => {
                // The value ADR-0035 replaced, measured on the same ground:
                // 2.16:1 on paper and 2.39:1 on default. Asserted so this
                // block cannot go green by accident on a token that never
                // moved -- if `error.main` were reverted, the case above and
                // this one would swap results.
                expect(contrastRatio(hexToRgb("#a33938"), ground)).toBeLessThan(
                    4.5,
                );
            });
        }
    });

    it("should keep error legible where the token is a background, not a foreground", () => {
        // ADR-0035's required re-check. Two families paint `error.main` as a
        // surface -- filled `Chip color="error"` (`ChipsSetting`'s refusal
        // chips and `IndexerTable`'s disabled marker) and MUI's own filled
        // `Alert` -- and both take their text from `error.contrastText`.
        // Lightening the token broke the previous `#fff` pairing (2.84:1),
        // which is why the contrast text moved with it.
        const errorRgb = resolveColor(theme.palette.error.main);
        const contrastText = compositeOver(
            theme.palette.error.contrastText,
            errorRgb,
        );

        expect(contrastRatio(errorRgb, contrastText)).toBeGreaterThanOrEqual(
            4.5,
        );
        expect(contrastRatio(errorRgb, [1, 1, 1])).toBeLessThan(4.5);
        expect(theme.palette.error.contrastText).toBe("rgba(0, 0, 0, 0.87)");
    });

    describe("the outlined field's border (ADR-0036)", () => {
        const outlinedRoot = theme.components?.MuiOutlinedInput?.styleOverrides
            ?.root as (props: {
            theme: typeof theme;
        }) => Record<string, Record<string, string>>;
        const resolved = outlinedRoot({theme});
        const resting =
            resolved["& .MuiOutlinedInput-notchedOutline"].borderColor;
        const disabled =
            resolved["&.Mui-disabled .MuiOutlinedInput-notchedOutline"]
                .borderColor;

        for (const [name, ground] of Object.entries(grounds)) {
            it(`should reach WCAG 1.4.11's 3:1 boundary contrast on ${name}`, () => {
                // Measured: 3.08:1 on paper, 3.17:1 on default. The
                // `surfaces.hairline` this replaced managed 1.37 and 1.36 --
                // asserted alongside, so the case cannot pass on a token that
                // was never strengthened.
                expect(
                    contrastRatio(compositeOver(resting, ground), ground),
                ).toBeGreaterThanOrEqual(3);
                expect(
                    contrastRatio(
                        compositeOver(theme.palette.surfaces.hairline, ground),
                        ground,
                    ),
                ).toBeLessThan(3);
            });
        }

        it("should stay visible against the field's own recessed fill", () => {
            const fill = hexToRgb(theme.palette.surfaces.recessed);

            // 3.19:1 -- the border reads as an edge from the inside as well,
            // which is what a notch a label sits in has to do.
            expect(
                contrastRatio(compositeOver(resting, fill), fill),
            ).toBeGreaterThanOrEqual(3);
        });

        it("should keep the disabled outline distinguishable from the resting one", () => {
            const paper = grounds["background.paper"];

            // 2.25:1 between rest and disabled. MUI's own
            // `action.disabled` (`rgba(255, 255, 255, 0.3)` in dark mode)
            // would have been 1.17:1 against the new resting border -- the
            // same border to the eye, which is the collision the explicit
            // rule exists to avoid.
            expect(
                contrastRatio(
                    compositeOver(resting, paper),
                    compositeOver(disabled, paper),
                ),
            ).toBeGreaterThan(2);
            expect(
                contrastRatio(
                    compositeOver(resting, paper),
                    compositeOver("rgba(255, 255, 255, 0.3)", paper),
                ),
            ).toBeLessThan(1.5);
        });

        it("should keep the hover outline distinguishable from the resting one", () => {
            const paper = grounds["background.paper"];

            // MUI repaints the outline `text.primary` on hover (its own
            // `&:hover .notchedOutline` rule outranks the resting recolour),
            // measured 3.26:1 against the new rest.
            expect(
                contrastRatio(
                    hexToRgb(theme.palette.text.primary),
                    compositeOver(resting, paper),
                ),
            ).toBeGreaterThan(3);
        });
    });
});

/*
 * FM-154's one call-site correction, measured rather than described.
 *
 * `SelectionMenu`'s unchecked select-all square drew its border from
 * `alpha(common.white, 0.25)` -- a colour authored when this application had
 * exactly one, dark, theme. The square sits on `background.default` (the
 * results table's sticky select column paints the page ground), so on the
 * `bright` theme's `#f2f4f3` that white edge measured 1.03:1: the boundary
 * that identifies the control was simply absent, against WCAG 1.4.11's 3:1.
 *
 * The two themes that existed before FM-154 keep the exact composited colour
 * they rendered -- the invariance this task is pinned against outranks the
 * ratio here, and their shortfall is carried as a follow-up, not fixed in
 * silence. So the assertions below are split: the two new themes must clear
 * 3:1, and the two old ones must still hold the byte-identical remnant value.
 */
describe("the select-all square's border (FM-154)", () => {
    const remnant = "rgba(255, 255, 255, 0.25)";

    for (const name of ["bright", "dark"] as const) {
        it(`should reach WCAG 1.4.11's 3:1 boundary contrast on ${name}'s results ground`, () => {
            const {palette} = createHydraTheme(name, false);
            const ground = hexToRgb(palette.background.default);
            const outline = palette.surfaces.selectAllOutline;

            // Measured: bright 3.30:1 on `#f2f4f3` (3.33:1 on its paper),
            // dark 3.95:1 on `#000000`.
            expect(
                contrastRatio(compositeOver(outline, ground), ground),
            ).toBeGreaterThanOrEqual(3);
            expect(
                contrastRatio(
                    compositeOver(outline, hexToRgb(palette.background.paper)),
                    hexToRgb(palette.background.paper),
                ),
            ).toBeGreaterThanOrEqual(3);
            // The value replaced, on the same ground: 1.03:1 on bright and
            // 2.02:1 on dark. Asserted alongside so neither case can go green
            // on a token that was never re-authored.
            expect(
                contrastRatio(compositeOver(remnant, ground), ground),
            ).toBeLessThan(3);
        });
    }

    it("should keep the pre-FM-154 themes' square rendering byte-identical", () => {
        for (const name of ["grey", "dark-dyschromatopsia"] as const) {
            expect(
                createHydraTheme(name, false).palette.surfaces.selectAllOutline,
            ).toBe(remnant);
        }
    });
});

/*
 * The FM-117 correction: `MuiPaper.root`'s `backgroundImage: "none"` is what
 * makes ADR-0036's one ground true, but it also removes the only separation a
 * *borderless* raised `Paper` had from the surface under it. Two such surfaces
 * exist in this application -- the notification list's `Accordion` entries and
 * MUI's `AutocompletePaper` behind every chips field -- and both sat directly
 * on `background.paper` afterwards, i.e. at 1.000:1.
 *
 * Every case below is paired with its own inverse, on the pattern the ADR-0035
 * and ADR-0036 blocks above use: the ratio the treatment achieves is asserted
 * *and* the ratio a bare `background.paper` surface would have is asserted to
 * fall short. A future flattening that deleted these rules would flip both
 * halves rather than leaving a green test behind.
 */
describe("borderless raised surfaces after the paper flattening (FM-117)", () => {
    const theme = createHydraTheme("grey", false);
    const paper = hexToRgb(theme.palette.background.paper);
    const pageGround = hexToRgb(theme.palette.background.default);
    /**
     * The boundary the base build had: an elevation-1 `Paper` (MUI's
     * `getOverlayAlpha(1)`, white at ~0.0512, giving `#313739`) over the
     * pre-FM-117 `background.default` config tab body measured 1.294:1. A
     * replacement separation has to be at least that, so that is the floor --
     * not a number chosen to fit the answer.
     */
    const baseBoundary = 1.294;

    /**
     * The rule's own declarations, or what MUI paints without it.
     *
     * The fallbacks are the point rather than defensive noise: a `Paper` with
     * no theme rule of its own *is* `background.paper` with no border, so a
     * build that deleted either rule has to arrive at the assertions below as
     * the 1.000:1 measurement it really renders -- not as an exception thrown
     * off a missing key, which would fail for the wrong reason and teach a
     * future reader nothing. The same reasoning `resolveColor` above is
     * written for.
     */
    function raisedSurface(override: unknown): {edge: string; fill: string} {
        const style =
            typeof override === "function"
                ? (override({theme}) as Record<string, string | undefined>)
                : undefined;
        const fill = style?.backgroundColor ?? theme.palette.background.paper;
        // `1px solid rgba(...)`, as this rule and `MuiMenu`/`MuiPopover`
        // before it write it. No border means the surface's own edge is its
        // fill, which is exactly the flattened case.
        return {
            edge: style?.border?.replace(/^\d+px solid /, "") ?? fill,
            fill,
        };
    }

    const raised = [
        {
            name: "the notification entry Accordion",
            override: theme.components?.MuiAccordion?.styleOverrides?.root,
        },
        {
            name: "the Autocomplete suggestion list",
            override: theme.components?.MuiAutocomplete?.styleOverrides?.paper,
        },
    ] as const;

    for (const {name, override} of raised) {
        describe(name, () => {
            const surface = raisedSurface(override);
            const fill = resolveColor(surface.fill);
            const edgeToken = surface.edge;

            it("should sit on the raised control surface rather than on background.paper itself", () => {
                expect(surface.fill).toBe(theme.palette.surfaces.control);
                // 1.070:1 against a config tab body -- a lift, not the
                // boundary. The edge below is what does the work; this half is
                // asserted so a later change cannot quietly drop the fill and
                // leave the surface co-planar again.
                expect(contrastRatio(fill, paper)).toBeGreaterThan(1);
                // The inverse. Without the rule this surface is
                // `background.paper` on `background.paper`, which is the
                // 1.000:1 the correction exists to remove.
                expect(contrastRatio(paper, paper)).toBe(1);
            });

            for (const [ground, groundName] of [
                [paper, "a config surface"],
                [pageGround, "background.default"],
            ] as const) {
                it(`should draw an edge at least as strong as the boundary the base build had, over ${groundName}`, () => {
                    // Measured: 1.465:1 over `background.paper` and 1.622:1
                    // over `background.default`.
                    expect(
                        contrastRatio(compositeOver(edgeToken, fill), ground),
                    ).toBeGreaterThanOrEqual(baseBoundary);
                    // The inverse, and the reason the number above is not
                    // self-fulfilling: a borderless surface has no edge at
                    // all, so the strongest thing the flattened build could
                    // offer over the same ground was the surface itself.
                    expect(contrastRatio(paper, ground)).toBeLessThan(
                        baseBoundary,
                    );
                });
            }
        });
    }

    it("should hide the suggestion paper while it is empty, which is what giving it a border cost", () => {
        // The measured consequence of the rule above rather than a
        // precaution: every `ChipsSetting` call site but one passes no
        // suggestions, and a `freeSolo` Autocomplete with none still mounts
        // its `Paper` empty. Measured in Chromium, the fill and 1px edge
        // turned that into a visible 560x2 strip under the focused field.
        const style = (
            theme.components?.MuiAutocomplete?.styleOverrides
                ?.paper as (props: {
                theme: typeof theme;
            }) => Record<string, unknown>
        )({theme});

        expect(style["&:empty"]).toEqual({display: "none"});
        // The inverse: the rule is only needed because the paper now paints
        // something of its own. A build that dropped the fill and the border
        // would not need it -- and would be back at 1.000:1, which the cases
        // above catch.
        expect(style.border).toContain(theme.palette.surfaces.hairline);
    });

    it("should keep the ADR-0036 notch border legible for fields raised onto the control surface", () => {
        // The collateral check the correction is itself a lesson about: moving
        // the notification entries onto `surfaces.control` moves every field
        // inside them onto a third ground, and ADR-0036's border has to clear
        // 3:1 there too. Measured 3.01:1 -- it does, but only just, so this is
        // pinned rather than assumed.
        const control = hexToRgb(theme.palette.surfaces.control);
        const outlinedRoot = theme.components?.MuiOutlinedInput?.styleOverrides
            ?.root as (props: {
            theme: typeof theme;
        }) => Record<string, Record<string, string>>;
        const resting = outlinedRoot({theme})[
            "& .MuiOutlinedInput-notchedOutline"
        ].borderColor;

        expect(
            contrastRatio(compositeOver(resting, control), control),
        ).toBeGreaterThanOrEqual(3);
        expect(
            contrastRatio(
                compositeOver(theme.palette.surfaces.hairline, control),
                control,
            ),
        ).toBeLessThan(3);
    });
});

/*
 * FM-154 (ADR-0049). Every theme is measured, not only the one this repository
 * had already measured, because ADR-0049's "individual colours may be improved"
 * is not permission to ship a palette that has not been checked -- and because
 * `bright` is the first `palette.mode: "light"` this codebase has ever
 * rendered, where every dark-theme value is wrong in the same direction at
 * once.
 *
 * The grounds are each theme's own three: the page, the raised paper, and
 * `surfaces.control`, which is where menus, popovers, autocomplete lists and
 * notification cards put text. The axes are WCAG 1.4.3 (4.5:1 for text) for the
 * two text roles and WCAG 1.4.11 (3:1 for a control boundary) for the notch
 * border and for `primary.main`, which is also the ADR-0013 focus ring's
 * colour.
 *
 * `surfaces.mutedText` is deliberately not asserted here: the mock's own
 * `#6b7472` measures 2.75-3.26:1 on the grey theme's grounds, a pre-existing
 * shortfall FM-154 neither introduced nor is scoped to fix, and pinning the two
 * new themes to a bar the default theme does not clear would misreport which
 * palette has the problem. It is recorded in the FM-154 handoff instead.
 */
describe("every theme's measured contrast (ADR-0049)", () => {
    for (const name of [
        "grey",
        "bright",
        "dark",
        "dark-dyschromatopsia",
    ] as const) {
        describe(name, () => {
            const theme = createHydraTheme(name, false);
            const grounds = {
                "background.default": resolveColor(
                    theme.palette.background.default,
                ),
                "background.paper": resolveColor(
                    theme.palette.background.paper,
                ),
                "surfaces.control": resolveColor(
                    theme.palette.surfaces.control,
                ),
            } as const;
            const notch = (
                theme.components?.MuiOutlinedInput?.styleOverrides
                    ?.root as (props: {
                    theme: typeof theme;
                }) => Record<string, Record<string, string>>
            )({theme})["& .MuiOutlinedInput-notchedOutline"].borderColor;

            for (const [groundName, ground] of Object.entries(grounds)) {
                it(`should carry both text roles at WCAG 1.4.3 on ${groundName}`, () => {
                    for (const text of [
                        theme.palette.text.primary,
                        theme.palette.text.secondary,
                    ]) {
                        expect(
                            contrastRatio(compositeOver(text, ground), ground),
                        ).toBeGreaterThanOrEqual(4.5);
                    }
                });

                it(`should draw the focus ring and the notch border at WCAG 1.4.11 on ${groundName}`, () => {
                    for (const boundary of [
                        theme.palette.primary.main,
                        notch,
                    ]) {
                        expect(
                            contrastRatio(
                                compositeOver(boundary, ground),
                                ground,
                            ),
                        ).toBeGreaterThanOrEqual(3);
                    }
                });
            }

            it("should keep the notch border legible from inside the field too", () => {
                const fill = resolveColor(theme.palette.surfaces.recessed);

                expect(
                    contrastRatio(compositeOver(notch, fill), fill),
                ).toBeGreaterThanOrEqual(3);
            });

            /*
             * ADR-0035's standing re-check, applied to every theme: five roles
             * are painted as *grounds* somewhere (a filled `Chip`, a filled
             * `Alert`, and -- for `primary` -- the `bright` theme's app bar and
             * every `variant="contained"` button), and each takes its text from
             * its own `contrastText`.
             *
             * Two of the fifteen pairings this repository already shipped fall
             * short, and FM-154 carries both across unchanged rather than
             * quietly retuning a palette it was asked to preserve
             * byte-for-byte: grey's `info` `#398da5` under `#fff` measures
             * 3.80:1, and dyschromatopsia's `primary` `#78909c` under `#fff`
             * 3.35:1. They are named and pinned below rather than excluded by a
             * lowered bar, so a later correction has to come through this test,
             * and the two themes FM-154 authored are held to the full 4.5:1.
             */
            const carriedOverShortfall: Partial<Record<string, number>> = {
                grey: 3.79,
                "dark-dyschromatopsia": 3.35,
            };

            it("should pair every filled role with a contrast text that carries on it", () => {
                const measured = new Map<string, number>();
                for (const role of [
                    "primary",
                    "success",
                    "warning",
                    "info",
                    "error",
                ] as const) {
                    const main = resolveColor(theme.palette[role].main);

                    measured.set(
                        role,
                        contrastRatio(
                            compositeOver(
                                theme.palette[role].contrastText,
                                main,
                            ),
                            main,
                        ),
                    );
                }
                const floor = carriedOverShortfall[name] ?? 4.5;

                for (const ratio of measured.values()) {
                    expect(ratio).toBeGreaterThanOrEqual(floor);
                }
                // The inverse, so a shortfall cannot be recorded here and then
                // silently persist after the value is fixed: the two carried-
                // over exceptions are pinned to the exact pairing that is short,
                // and a theme with no exception is asserted to need none.
                if (name === "grey") {
                    expect(measured.get("info")).toBeCloseTo(3.8, 1);
                } else if (name === "dark-dyschromatopsia") {
                    expect(measured.get("primary")).toBeCloseTo(3.35, 1);
                } else {
                    for (const ratio of measured.values()) {
                        expect(ratio).toBeGreaterThanOrEqual(4.5);
                    }
                }
            });

            it("should keep the chart sequence readable on the card it is drawn on", () => {
                const ground = grounds["background.paper"];

                for (const series of theme.palette.charts.categorical) {
                    expect(
                        contrastRatio(compositeOver(series, ground), ground),
                    ).toBeGreaterThanOrEqual(3);
                }
            });
        });
    }

    // The `bright` theme's own reason for existing, and the assertion that
    // would fail first if a dark-theme value were left in its block: on a light
    // ground the page must be light and the text dark, not the other way round.
    it("should render bright as a genuinely light theme", () => {
        const bright = createHydraTheme("bright", false).palette;

        expect(bright.mode).toBe("light");
        expect(
            relativeLuminance(resolveColor(bright.background.default)),
        ).toBeGreaterThan(0.7);
        expect(
            relativeLuminance(resolveColor(bright.text.primary)),
        ).toBeLessThan(0.05);
        // Legacy `theme-bright.less`'s `@brand-primary: #00640e`, carried
        // across verbatim; ADR-0049 asks for the character to be kept and this
        // is the value that is the character.
        expect(bright.primary.main).toBe("#00640e");
        // Every hairline and outline in a light theme composites *black* over
        // the ground. A remaining `rgba(255, 255, 255, ...)` would be invisible
        // rather than wrong-looking, which is why it is asserted rather than
        // eyeballed on the strip.
        for (const token of [
            bright.surfaces.hairline,
            bright.surfaces.hairlineFaint,
        ]) {
            expect(token).toMatch(/^rgba\(0, 0, 0,/);
        }
    });

    // The `dark` theme's character per ADR-0049 and `theme-dark.less`: a pure
    // black page with a lifted -- but only just lifted -- paper, and text that
    // is muted rather than white.
    it("should render dark as legacy's near-black theme", () => {
        const dark = createHydraTheme("dark", false).palette;

        expect(dark.background.default).toBe("#000000");
        expect(dark.surfaces.recessed).toBe("#0f1113");
        expect(
            contrastRatio(
                resolveColor(dark.background.paper),
                resolveColor(dark.background.default),
            ),
        ).toBeLessThan(1.5);
        // Legacy `@text-color: rgb(156, 156, 156)`, verbatim.
        expect(dark.text.primary).toBe("#9c9c9c");
    });
});
