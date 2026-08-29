import {Box, Button, Checkbox, Menu, MenuItem, Stack} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {useState} from "react";

import {denseControlFontSize, selectAllRadius} from "../../../app/theme";
import type {SelectionStatus} from "./resultTable";

// FM-129: the size of the glyph *inside* the 17x17 square (the check mark and
// the indeterminate dash), not a text role -- it is a metric of this one
// control's box, chosen so both glyphs sit inside the square without touching
// its 1.5px border, and it moves only if that box does. A named local
// constant for that reason rather than a shared density token.
const SELECT_ALL_GLYPH_FONT_SIZE = "11px";

// The tri-state select-all checkbox's small square control (F-SEARCH-GROUP-
// SELECTION, FM-046), matching the mock's own `toggleAll` button: 17x17px, a
// 5px border radius (`app/theme.ts`'s exported `selectAllRadius`, not a local
// literal -- see its doc comment for why this control's two rendering paths
// are both genuine consumers), a filled `primary.main` square with a check
// mark when checked, a dash when indeterminate, and a transparent square with
// a neutral border when unchecked. Implemented through MUI `Checkbox`'s
// `icon`/`checkedIcon`/`indeterminateIcon` props plus `sx` sizing on the
// control itself (ADR-0002: restyle the existing MUI control, never a
// bespoke one) -- the underlying native `<input type="checkbox">`, the
// element Testing Library's and Playwright's `role="checkbox"` queries
// resolve to, is sized to fill this 17x17 control exactly, so its own
// rendered bounding box is what this task's visual contract measures.
const selectAllSquareSx = {
    alignItems: "center",
    borderRadius: selectAllRadius,
    display: "flex",
    fontSize: SELECT_ALL_GLYPH_FONT_SIZE,
    height: 17,
    justifyContent: "center",
    lineHeight: 1,
    width: 17,
} as const;

function SelectAllUncheckedIcon() {
    return (
        <Box
            sx={(theme) => ({
                ...selectAllSquareSx,
                border: `1.5px solid ${theme.alpha(theme.palette.common.white, 0.25)}`,
            })}
        />
    );
}

function SelectAllCheckedIcon() {
    return (
        <Box
            sx={{
                ...selectAllSquareSx,
                bgcolor: "primary.main",
                border: "1.5px solid",
                borderColor: "primary.main",
                color: "primary.contrastText",
            }}
        >
            ✓
        </Box>
    );
}

function SelectAllIndeterminateIcon() {
    return (
        <Box
            sx={{
                ...selectAllSquareSx,
                bgcolor: "primary.main",
                border: "1.5px solid",
                borderColor: "primary.main",
                color: "primary.contrastText",
            }}
        >
            –
        </Box>
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
            alignItems="center"
            data-testid={`${idPrefix}-selection-menu`}
            direction="row"
        >
            <Checkbox
                checked={status === "all"}
                checkedIcon={<SelectAllCheckedIcon />}
                // FM-053 (ADR-0013): kept, deliberately, and no longer an
                // affordance deletion. FM-052 dispositioned this control
                // `fails 2.4.7` because `disableRipple` left it with no
                // indicator at all -- the only property that changed was the
                // `opacity: 0` native input overlay's own `outline-style`.
                // ADR-0013's accepted Option A gives the `SwitchBase` family an
                // authored `&.Mui-focusVisible` ring on the visible root
                // instead (`app/theme.ts`, `MuiCheckbox`), which is the
                // indicator this control now renders and which the ripple
                // never was. Removing `disableRipple` would reinstate a
                // ~38px pulsating ripple on this deliberately flat 17x17
                // `p: 0` square (FM-046) and would measure 1.19:1-2.38:1
                // anyway, so it is replaced rather than restored -- the second
                // of the two options FM-053's Acceptance allows.
                disableRipple
                icon={<SelectAllUncheckedIcon />}
                indeterminate={status === "some"}
                indeterminateIcon={<SelectAllIndeterminateIcon />}
                inputProps={{
                    "aria-label": `Select all visible results${suffix}`,
                }}
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
