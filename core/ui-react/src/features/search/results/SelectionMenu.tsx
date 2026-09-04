import {Button, Checkbox, Menu, MenuItem, Stack, SvgIcon} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {useState} from "react";
import type {ReactNode} from "react";

import {denseControlFontSize, selectAllRadius} from "../../../app/theme";
import type {SelectionStatus} from "./resultTable";

// FM-129: the size of the glyph *inside* the 17x17 square (the check mark and
// the indeterminate dash), not a text role -- it is a metric of this one
// control's box, chosen so both glyphs sit inside the square without touching
// its 1.5px border, and it moves only if that box does. A named local
// constant for that reason rather than a shared density token.
const SELECT_ALL_GLYPH_FONT_SIZE = "11px";
// The mock's `toggleAll` box and its border, as numbers, because the square is
// now drawn in user units inside an SVG viewBox rather than as a CSS border.
const SELECT_ALL_SIZE = 17;
const SELECT_ALL_BORDER_WIDTH = 1.5;

// The tri-state select-all checkbox's small square control (F-SEARCH-GROUP-
// SELECTION, FM-046), matching the mock's own `toggleAll` button: 17x17px, a
// 5px border radius (`app/theme.ts`'s exported `selectAllRadius`, not a local
// literal -- see its doc comment for why this control's two rendering paths
// are both genuine consumers), a filled `primary.main` square with a check
// mark when checked, a dash when indeterminate, and a transparent square with
// a neutral border when unchecked.
//
// FM-184 (ADR-0056) is why it is an `SvgIcon` and not the `Box` it used to be.
// Under `@mui/material` 9.4.0 the keyboard focus ring for the `SwitchBase`
// family is MUI's own, and `Checkbox.js` authors it on
// `&.Mui-focusVisible svg:first-of-type` -- the root cannot carry it, because
// `SwitchBase.js` renders the focusable node as an `opacity: 0` input overlay.
// A `Checkbox` whose `icon`/`checkedIcon`/`indeterminateIcon` is not an `svg`
// therefore paints no focus indicator at all. The stroked `rect` below is the
// same 17x17 box the `Box` drew (stroke centred on the path, so the path is
// inset by half the 1.5px border and the outer edge still lands on 0 and 17),
// and the glyphs are still the same two characters at the same font size.
// `app/theme.ts` authors no `MuiCheckbox` rule for this: one would double-ring
// every stock checkbox in the application.
const selectAllOuterRadius = Number.parseFloat(selectAllRadius);

function SelectAllSquare({
    children,
    filled,
}: {
    children?: ReactNode;
    filled: boolean;
}) {
    return (
        <SvgIcon
            sx={{
                height: SELECT_ALL_SIZE,
                width: SELECT_ALL_SIZE,
                // Inherited by the `<text>` glyph below; the svg's own box is
                // stated above, so this sizes the glyph and nothing else.
                fontSize: SELECT_ALL_GLYPH_FONT_SIZE,
                // The square's two colours are carried as `color` and read
                // back through `currentColor` on the shapes, so this file
                // still consumes palette *paths* (ADR-0014) exactly as the
                // `Box` it replaces did, rather than reaching into
                // `theme.palette` -- which breaks wherever the control is
                // rendered without this application's theme.
                color: filled ? "primary.main" : "surfaces.selectAllOutline",
                "& .select-all-glyph": {color: "primary.contrastText"},
            }}
            viewBox={`0 0 ${SELECT_ALL_SIZE} ${SELECT_ALL_SIZE}`}
        >
            <rect
                className="select-all-square"
                fill={filled ? "currentColor" : "none"}
                height={SELECT_ALL_SIZE - SELECT_ALL_BORDER_WIDTH}
                rx={selectAllOuterRadius - SELECT_ALL_BORDER_WIDTH / 2}
                stroke="currentColor"
                strokeWidth={SELECT_ALL_BORDER_WIDTH}
                width={SELECT_ALL_SIZE - SELECT_ALL_BORDER_WIDTH}
                x={SELECT_ALL_BORDER_WIDTH / 2}
                y={SELECT_ALL_BORDER_WIDTH / 2}
            />
            {children}
        </SvgIcon>
    );
}

// The glyph's baseline anchor, measured rather than derived. The `Box` this
// replaces centred the glyph by flex-centring a `line-height: 1` line box in
// the 17x17 square, which is not the same reference SVG's
// `dominant-baseline: central` uses; anchoring at the square's exact centre
// (8.5) rendered both glyphs one device pixel low. Measured in Chrome against
// the previous rendering with the application's own IBM Plex Sans face: every
// anchor in 7.5..8.25 reproduces it pixel for pixel, and 8 is the middle of
// that band.
const SELECT_ALL_GLYPH_BASELINE = 8;

function SelectAllGlyph({children}: {children: ReactNode}) {
    return (
        <text
            className="select-all-glyph"
            dominantBaseline="central"
            fill="currentColor"
            textAnchor="middle"
            x={SELECT_ALL_SIZE / 2}
            y={SELECT_ALL_GLYPH_BASELINE}
        >
            {children}
        </text>
    );
}

function SelectAllUncheckedIcon() {
    return <SelectAllSquare filled={false} />;
}

function SelectAllCheckedIcon() {
    return (
        <SelectAllSquare filled>
            <SelectAllGlyph>✓</SelectAllGlyph>
        </SelectAllSquare>
    );
}

function SelectAllIndeterminateIcon() {
    return (
        <SelectAllSquare filled>
            <SelectAllGlyph>–</SelectAllGlyph>
        </SelectAllSquare>
    );
}

// Tri-state select-all checkbox plus an adjacent caret opening a `role="menu"`
// with Select all / Deselect all / Invert selection (FM-040), replacing the
// former flat row of three toolbar buttons. Each menu entry produces exactly
// the same `selectVisibleResults` outcome the old button produced. Rendered
// twice with different `idPrefix`es: once in the table header (visible at
// `sm` and up, where `thead` renders), and once in the toolbar's
// merged `results-bulk-actions` row (visible only below `sm`, where the
// responsive table hides `thead` entirely) so bulk selection stays reachable
// at every viewport. Both copies share the same selection state/callbacks
// from the parent, so they always agree.
export function SelectionMenu({
    idPrefix,
    onDeselectAll,
    onInvertSelection,
    onSelectAll,
    status,
}: {
    idPrefix: "header" | "toolbar";
    onDeselectAll: () => void;
    onInvertSelection: () => void;
    onSelectAll: () => void;
    status: SelectionStatus;
}) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);
    const close = () => setAnchorEl(null);
    const choose = (action: () => void) => {
        action();
        close();
    };
    const suffix = idPrefix === "toolbar" ? " (mobile)" : "";
    return (
        <Stack
            data-testid={`${idPrefix}-selection-menu`}
            direction="row"
            sx={{
                alignItems: "center",
            }}
        >
            <Checkbox
                checked={status === "all"}
                checkedIcon={<SelectAllCheckedIcon />}
                // FM-053 (ADR-0013), FM-184 (ADR-0056): kept, deliberately,
                // and not an affordance deletion. FM-052 dispositioned this
                // control `fails 2.4.7` because `disableRipple` left it with
                // no indicator at all -- the only property that changed was
                // the `opacity: 0` native input overlay's own `outline-style`.
                // Since 9.4.0 MUI's own `Checkbox.js` rings
                // `&.Mui-focusVisible svg:first-of-type`, which is the
                // indicator this control renders (see `SelectAllSquare`
                // above) and which the ripple never was. Removing
                // `disableRipple` would reinstate a ~38px pulsating ripple on
                // this deliberately flat 17x17 `p: 0` square (FM-046) and
                // would measure 1.19:1-2.38:1 anyway, so it is replaced
                // rather than restored.
                disableRipple
                icon={<SelectAllUncheckedIcon />}
                indeterminate={status === "some"}
                indeterminateIcon={<SelectAllIndeterminateIcon />}
                onChange={(event) =>
                    event.target.checked ? onSelectAll() : onDeselectAll()
                }
                size="small"
                sx={{
                    borderRadius: selectAllRadius,
                    height: 17,
                    p: 0,
                    width: 17,
                    "&:hover": {backgroundColor: "transparent"},
                }}
                slotProps={{
                    input: {
                        "aria-label": `Select all visible results${suffix}`,
                    },
                }}
            />
            <Button
                aria-expanded={open ? "true" : undefined}
                aria-haspopup="menu"
                aria-label={`Selection options${suffix}`}
                onClick={(event) => setAnchorEl(event.currentTarget)}
                size="small"
                sx={{color: "text.secondary", minWidth: 0, px: 0.5}}
            >
                <ExpandMoreIcon fontSize="small" />
            </Button>
            {/* FM-054 (ADR-0014): the paper surface, border, and shadow are
                the `MuiMenu` theme default now (`app/theme.ts`); the
                `MenuItem` density is authored locally, including its 8px
                highlight radius -- the same one `DisplayOption`'s popover row
                below draws, since both are compact custom-menu row
                highlights in this file. */}
            <Menu
                anchorEl={anchorEl}
                onClose={close}
                open={open}
                slotProps={{
                    list: {
                        sx: {
                            "& .MuiMenuItem-root": {
                                // The 8px action radius, not a stadium. This
                                // was `pillRadius`, which `sx` multiplied to
                                // 56px (see `app/theme.ts`) and rounded these
                                // dense menu rows into lozenges.
                                borderRadius: 1,
                                fontSize: denseControlFontSize,
                                mx: 0.5,
                                py: 1,
                            },
                        },
                    },
                }}
            >
                <MenuItem onClick={() => choose(onSelectAll)}>
                    Select all
                </MenuItem>
                <MenuItem onClick={() => choose(onDeselectAll)}>
                    Deselect all
                </MenuItem>
                <MenuItem onClick={() => choose(onInvertSelection)}>
                    Invert selection
                </MenuItem>
            </Menu>
        </Stack>
    );
}
