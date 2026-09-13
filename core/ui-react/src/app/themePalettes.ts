/**
 * The palettes: the theme vocabulary (`ThemeName`, the preference the nav bar
 * offers, and the `auto` rule that resolves one) and the four complete colour
 * blocks `createHydraTheme` chooses between (ADR-0049, FM-154).
 *
 * Split out of `theme.ts` (backlog item 30); every colour, name and comment is
 * unchanged. This module states values only -- it imports no MUI type and
 * builds no theme -- so the one place a colour lives is still one file.
 */

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
export type SurfaceTokens = {
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

export type ThemeColors = {
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

export const themeColors: Record<ThemeName, ThemeColors> = {
    grey: greyColors,
    bright: brightColors,
    dark: darkColors,
    "dark-dyschromatopsia": darkDyschromatopsiaColors,
};
