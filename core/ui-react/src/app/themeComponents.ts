/**
 * The `components` slot of the application theme: every `styleOverrides` and
 * `variants` entry MUI resolves per component family.
 *
 * Split out of `theme.ts` (backlog item 30). It is a function of the chosen
 * colour block rather than a constant, exactly as it was when it sat inline in
 * `createHydraTheme`: nothing here states a colour of its own (ADR-0014), it
 * reads either the resolved palette (`theme.palette.*`) or the active block
 * (`colors.*`).
 */

import {chipClasses} from "@mui/material/Chip";
import type {Theme, ThemeOptions} from "@mui/material/styles";

import type {ThemeColors} from "./themePalettes";
import {
    controlFontSize,
    controlHeight,
    hoverWash,
    monoFontFamily,
    pillRadius,
    refineSelectedHoverAlpha,
} from "./themeTokens";

export function createThemeComponents(
    colors: ThemeColors,
): ThemeOptions["components"] {
    return {
        MuiCssBaseline: {
            styleOverrides: (theme) => ({
                // ADR-0013 family H, and the only focus declaration the theme
                // still makes (ADR-0056). It is not a second focus system: it
                // spreads the very token MUI resolved from the `focusVisible`
                // option `theme.ts` passes to `createTheme`, so the ring, its
                // colour and its inset behaviour are identical to every
                // component MUI rings by itself. It is kept because MUI rings
                // no component here -- this is the one control class in the
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
                // `ButtonPropsVariantOverrides.control` in `theme.ts`. The
                // mock's raised control surface behind a hairline, at the same
                // 8px `shape.borderRadius` the primary Search button and every
                // text input take -- so a secondary action reads as the *same
                // shape* as a primary one and differs only in weight, while a
                // selection pill (`refineChip`) differs in shape because it is
                // a different kind of thing.
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
                    ...(ownerState.square || (ownerState.elevation ?? 0) === 0
                        ? {}
                        : {borderRadius: 12}),
                }),
            },
        },
        // FM-185's MUI X pickers render `PickersInputBase`/
        // `PickersOutlinedInput`, not `InputBase`/`OutlinedInput`, so
        // none of the input rules above or below reach them: they came
        // up at MUI's stock 56px with a 40px calendar button beside 32px
        // fields (owner report 2026-09-04). These two blocks restate the
        // same sizing and surface for the picker family -- the control
        // height and text size, the coarse-pointer 16px, the recessed
        // fill, radius, outline colour and 12px legend -- so a picker is
        // the same box as the text field next to it.
        MuiPickersInputBase: {
            styleOverrides: {
                root: {
                    fontSize: controlFontSize,
                    height: controlHeight,
                    "@media (pointer: coarse)": {
                        fontSize: "16px",
                    },
                },
                // MUI's own 16.5px vertical padding is what made the
                // field 56px; the fixed height above centres the
                // sections instead.
                sectionsContainer: {
                    paddingBottom: 0,
                    paddingTop: 0,
                },
            },
        },
        MuiPickersOutlinedInput: {
            // The picker counterpart of `MuiOutlinedInput`'s `notched`
            // default below: MUI X's `PickersTextField` forwards
            // `notched` only from an explicit `slotProps.inputLabel.shrink`
            // (`PickersTextField.js`, `inputAdditionalProps.notched =
            // inputLabelSlotProps.shrink`), never from the theme's
            // `MuiInputLabel` default, so the permanently shrunk label
            // floated over an unbroken border (owner report 2026-09-05).
            defaultProps: {notched: true},
            styleOverrides: {
                root: ({theme}) => ({
                    borderRadius: 8,
                    backgroundColor: theme.palette.surfaces.recessed,
                    "& .MuiPickersOutlinedInput-notchedOutline": {
                        borderColor: colors.inputOutline,
                        "& legend": {fontSize: "12px"},
                    },
                    "&.Mui-disabled .MuiPickersOutlinedInput-notchedOutline": {
                        borderColor: theme.palette.surfaces.hairline,
                    },
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
                        "& .MuiAutocomplete-inputRoot .MuiAutocomplete-input": {
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
    };
}
