// FM-111: the results toolbar's two small popovers, moved verbatim out
// of `SearchResults.tsx`. They share this file because they share the
// density constants and the section-heading treatment below -- the
// alternatives were a per-feature style module, which ADR-0014 forbids,
// or a second copy of the same constants, which this task forbids.
import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Link,
    Popover,
    Stack,
    Typography,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneIcon from "@mui/icons-material/Tune";
import {useMemo, useState} from "react";

import {denseControlFontSize} from "../../../app/theme";

// FM-041/FM-054: the Display popover's own density constants -- again local,
// not exported tokens, since none of them is a color value. The popover's
// surface color, border, and outer radius come entirely from the theme's
// `MuiPopover` default (`app/theme.ts`); no local override remains. Its rows'
// hover-highlight corner is the plain 8px action radius (`borderRadius: 1` in
// `sx`), shared with every other list row and menu row in these surfaces --
// stadium corners are reserved for state pills, which these rows are not.
// FM-129: the density values are theme spacing units now (the sx spacing
// scale's 8px step and its quarter steps), not px strings, so these popovers
// sit on the same grid as every other surface in the feature. Their row text
// is the shared `denseControlFontSize` role rather than a constant here.
const DISPLAY_MENU_MIN_WIDTH = 220;
const DISPLAY_MENU_PADDING = 1;
const DISPLAY_MENU_ITEM_PADDING_X = 1;
const DISPLAY_MENU_ITEM_PADDING_Y = 0.75;
const DISPLAY_MENU_ITEM_GAP = 1;

// FM-129: the checkbox glyph in a display-options row. Not a text role: it
// sizes the `SvgIcon` box of a checkbox that has to stay visually balanced
// against a single line of row text, so it is this one consumer's own metric
// and stays a named local constant. `size="small"` alone leaves it a step
// too large for this deliberately dense row.
const DISPLAY_MENU_ITEM_ICON_SIZE = "18px";

// FM-041/FM-055: the shared section-heading treatment for this file's two
// small popovers (display options and, since FM-055, rejection reasons), so
// the second one inherits the first's density instead of restating it. Only
// the muted text *role* is named here; its color comes from the theme.
// FM-129: the heading is the theme's `refineSectionLabel` variant now,
// consumed through the `variant` prop at both sites below -- it is the same
// muted, uppercase, tracked caption role the refine sidebar's section labels
// render, and it was restating that variant's color, weight, tracking and
// transform verbatim at a font size half a pixel under it. Only this
// surface's own box padding is left here.
const POPOVER_HEADING_SX = {pb: 1, pt: 0.5, px: 1} as const;

// FM-055: the `{n} rejected` fragment of `search-results-summary` is a
// control that opens the per-reason breakdown. This restores parity with
// legacy, which exposed exactly this data from exactly this summary badge
// through a click-triggered tooltip (`search-results.html:170-190` and
// `getRejectedReasonsTooltip()` in `search-results-controller.js`); React has
// rendered no rejection reasons at all until now.
//
// A stock `Link component="button"` rather than a restyled `Button`: the
// trigger is one word inside a running sentence, which is the inline
// text-trigger anatomy `Link` already provides (underline included, and
// ADR-0015 keeps the authored focus ring for the `Link` family). Only its
// color is overridden, to the surrounding sentence's own `inherit`, so the
// summary does not read as two competing accent colors next to the
// `primary.main` selected count.
export function RejectedResultsTrigger({
    count,
    reasons,
}: {
    count: number;
    reasons: Record<string, number>;
}) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);
    const entries = useMemo(
        () =>
            Object.entries(reasons).sort(
                (first, second) => second[1] - first[1],
            ),
        [reasons],
    );
    return (
        <>
            <Link
                aria-expanded={open ? "true" : "false"}
                aria-haspopup="true"
                component="button"
                data-testid="results-rejected-trigger"
                onClick={(event) =>
                    setAnchorEl(anchorEl ? null : event.currentTarget)
                }
                sx={{color: "inherit"}}
                type="button"
            >
                {count} rejected
            </Link>
            <Popover
                anchorEl={anchorEl}
                anchorOrigin={{horizontal: "left", vertical: "bottom"}}
                onClose={() => setAnchorEl(null)}
                open={open}
                slotProps={{paper: {sx: {maxWidth: "100%"}}}}
                transformOrigin={{horizontal: "left", vertical: "top"}}
            >
                <Box
                    data-testid="results-rejected-popover"
                    sx={{
                        minWidth: DISPLAY_MENU_MIN_WIDTH,
                        p: DISPLAY_MENU_PADDING,
                    }}
                >
                    <Typography
                        component="div"
                        sx={POPOVER_HEADING_SX}
                        variant="refineSectionLabel"
                    >
                        Rejection reasons
                    </Typography>
                    {entries.length === 0 ? (
                        <Typography
                            component="div"
                            sx={{
                                fontSize: denseControlFontSize,
                                px: DISPLAY_MENU_ITEM_PADDING_X,
                                py: DISPLAY_MENU_ITEM_PADDING_Y,
                            }}
                        >
                            No rejection reasons were reported.
                        </Typography>
                    ) : (
                        <Stack
                            component="ul"
                            sx={{listStyle: "none", m: 0, p: 0}}
                        >
                            {entries.map(([reason, reasonCount]) => (
                                <Stack
                                    component="li"
                                    direction="row"
                                    key={reason}
                                    sx={{
                                        fontSize: denseControlFontSize,
                                        gap: DISPLAY_MENU_ITEM_GAP,
                                        px: DISPLAY_MENU_ITEM_PADDING_X,
                                        py: DISPLAY_MENU_ITEM_PADDING_Y,
                                    }}
                                >
                                    <Box
                                        component="span"
                                        sx={{fontWeight: 600}}
                                    >
                                        {reasonCount}
                                    </Box>
                                    <Box component="span">{reason}</Box>
                                </Stack>
                            ))}
                        </Stack>
                    )}
                </Box>
            </Popover>
        </>
    );
}

// Every display preference for the results list, gathered into the mock's own
// "⚙ Display" popover (FM-041): the two grouping toggles this toolbar used to
// render inline (relocated with their labels and behavior unchanged), the two
// new opt-in row treatments, and a second entry point to the refine surface's
// existing visibility affordance.
//
// A `Popover` of real `Checkbox` controls rather than a `role="menu"` of
// `menuitem`s: every entry is a persistent on/off preference, so `checkbox`
// semantics (an accessible name plus a queryable checked state) describe it
// correctly, where `menuitem` would not. The toggle still advertises the
// popover with `aria-haspopup`/`aria-expanded`.
export function DisplayOptionsMenu({
    compactRows,
    groupEpisodes,
    groupTorrentAndUsenet,
    highlightRecent,
    onToggleCompactRows,
    onToggleGroupEpisodes,
    onToggleGroupTorrentAndUsenet,
    onToggleHighlightRecent,
    onToggleRefineSurface,
    onToggleShowCovers,
    onToggleShowDuplicateControls,
    refineSurfaceShown,
    showCovers,
    showDuplicateControls,
}: {
    compactRows: boolean;
    groupEpisodes: boolean;
    groupTorrentAndUsenet: boolean;
    highlightRecent: boolean;
    onToggleCompactRows: () => void;
    onToggleGroupEpisodes: () => void;
    onToggleGroupTorrentAndUsenet: () => void;
    onToggleHighlightRecent: () => void;
    onToggleRefineSurface: () => void;
    onToggleShowCovers: () => void;
    onToggleShowDuplicateControls: () => void;
    // "Is the refine surface currently shown", resolved by the parent from
    // whichever per-viewport mechanism is live, so this entry's checked state
    // can never disagree with the live `refine-sidebar-toggle`'s
    // `aria-expanded`.
    refineSurfaceShown: boolean;
    // FM-177: legacy's "Show movie covers in results"
    // (`search-results-controller.js:197`), which defaulted on there; the
    // owner asked for off.
    showCovers: boolean;
    // FM-176: legacy's "Show duplicate display triggers"
    // (`search-results-controller.js:162,205`), off by default there too.
    showDuplicateControls: boolean;
}) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);
    const entries: {checked: boolean; label: string; onToggle: () => void}[] = [
        {
            checked: groupTorrentAndUsenet,
            label: "Group torrent and Usenet results",
            onToggle: onToggleGroupTorrentAndUsenet,
        },
        {
            checked: groupEpisodes,
            label: "Group TV episodes",
            onToggle: onToggleGroupEpisodes,
        },
        {
            checked: compactRows,
            label: "Compact rows",
            onToggle: onToggleCompactRows,
        },
        {
            checked: highlightRecent,
            label: "Highlight recent",
            onToggle: onToggleHighlightRecent,
        },
        {
            checked: showDuplicateControls,
            label: "Show duplicate expand controls",
            onToggle: onToggleShowDuplicateControls,
        },
        {
            checked: showCovers,
            label: "Show covers",
            onToggle: onToggleShowCovers,
        },
    ];
    return (
        <>
            <Button
                aria-expanded={open ? "true" : "false"}
                aria-haspopup="true"
                aria-label="Display options"
                data-testid="display-options-toggle"
                // The shared neutral-secondary action (`app/theme.ts`'s
                // `variant="control"`), which is where this button's surface,
                // hairline, radius, and 13px type now come from -- it used to
                // author the same four rules itself, one of six such copies.
                // The gear and caret are real icons rather than the `⚙`/`▼`
                // text glyphs that stood here: those did not scale with the
                // label, sat on a different baseline, and matched nothing
                // else in the icon set.
                endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={(event) =>
                    setAnchorEl(anchorEl ? null : event.currentTarget)
                }
                size="small"
                startIcon={<TuneIcon />}
                variant="control"
            >
                Display
            </Button>
            {/* FM-054 (ADR-0014): the paper surface, border, radius, and
                shadow are the `MuiPopover` theme default now
                (`app/theme.ts`); only the non-token responsive `maxWidth`
                safety net is authored locally. */}
            <Popover
                anchorEl={anchorEl}
                anchorOrigin={{horizontal: "right", vertical: "bottom"}}
                onClose={() => setAnchorEl(null)}
                open={open}
                slotProps={{
                    paper: {sx: {maxWidth: "100%"}},
                }}
                transformOrigin={{horizontal: "right", vertical: "top"}}
            >
                <Box
                    data-testid="display-options"
                    sx={{
                        minWidth: DISPLAY_MENU_MIN_WIDTH,
                        p: DISPLAY_MENU_PADDING,
                    }}
                >
                    <Typography
                        component="div"
                        sx={POPOVER_HEADING_SX}
                        variant="refineSectionLabel"
                    >
                        Display options
                    </Typography>
                    <FormGroup>
                        {entries.map((entry) => (
                            <DisplayOption
                                checked={entry.checked}
                                key={entry.label}
                                label={entry.label}
                                onToggle={entry.onToggle}
                            />
                        ))}
                        {/* The mock's own hairline before the refine-surface
                            entry, separating the row/grouping treatments from
                            the surrounding-layout one. */}
                        <Box
                            sx={{
                                backgroundColor: "surfaces.hairlineFaint",
                                height: "1px",
                                mx: 0.5,
                                my: 0.75,
                            }}
                        />
                        {/* The only entry that closes the popover: below `sm`
                            the refine surface is a temporary `Drawer`, and
                            leaving this popover open behind it would stack two
                            overlays over the results (and hide the popover's
                            own entries from the accessibility tree). Closing
                            unconditionally keeps the behavior the same at
                            every viewport rather than viewport-dependent. */}
                        <DisplayOption
                            checked={refineSurfaceShown}
                            label="Show refine sidebar"
                            onToggle={() => {
                                onToggleRefineSurface();
                                setAnchorEl(null);
                            }}
                        />
                    </FormGroup>
                </Box>
            </Popover>
        </>
    );
}

// One popover entry, matching the mock's `<label>` + `<input type=checkbox>`
// shape: a row at `7px 8px` padding with a 9px gap, at the shared 8px action
// radius.
function DisplayOption({
    checked,
    label,
    onToggle,
}: {
    checked: boolean;
    label: string;
    onToggle: () => void;
}) {
    return (
        <FormControlLabel
            control={
                <Checkbox checked={checked} onChange={onToggle} size="small" />
            }
            label={label}
            sx={{
                // As with the selection menu's rows above: the 8px action
                // radius, not the 56px `pillRadius` used to resolve to here.
                borderRadius: 1,
                gap: DISPLAY_MENU_ITEM_GAP,
                m: 0,
                px: DISPLAY_MENU_ITEM_PADDING_X,
                py: DISPLAY_MENU_ITEM_PADDING_Y,
                // The label's color is `text.primary` -- already the
                // `FormControlLabel` label's own default, so it needs no
                // override (the mock's `#d6dad9` item text is the theme's
                // `text.primary` exactly).
                "& .MuiFormControlLabel-label": {
                    fontSize: denseControlFontSize,
                },
                "& .MuiCheckbox-root": {p: 0},
                "& .MuiSvgIcon-root": {fontSize: DISPLAY_MENU_ITEM_ICON_SIZE},
            }}
        />
    );
}
