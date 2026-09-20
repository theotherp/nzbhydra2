import type {Theme} from "@mui/material";

/**
 * `C-STACKED-CARD-TABLE`. Below the raw 768px breakpoint
 * `ResultsTable.tsx`'s `resultsTableSx` uses for the same purpose -- legacy's
 * measured 767px stacking point (`tables.less:91`), and the same raw value
 * `useCompactRefineSurface()` passes to its own `theme.breakpoints.down`, so
 * a table's card layout and its refine sidebar's docked/drawer switch happen
 * together -- turns a `<Table>` into stacked cards: the header hidden, each
 * row a bordered block, and each cell labelled by its own `data-label`
 * through a `::before` pseudo-element.
 *
 * This is a deliberate duplicate of `resultsTableSx`'s own
 * `[theme.breakpoints.down(768)]` block, not a shared import from it: that
 * block also carries rules specific to the results table alone (a Title cell
 * that opts out of its label, a compact-rows density branch, a 2026-09-07
 * Actions tap-target gap), and folding this helper into that file would risk
 * a generic history table inheriting rules it never asked for. Duplicating
 * the base pattern here is the deliberate choice, not an oversight.
 *
 * A consumer spreads this after its own `minWidth` floor in the same `sx`
 * object (see `HistoryPageFrame.tsx`) -- object key order becomes CSS rule
 * order, and this fragment's own `minWidth: 0` inside the breakpoint has to
 * be declared after that floor or the floor keeps winning the cascade below
 * the breakpoint, forcing the horizontal scroll this exists to remove.
 */
// Deliberately not typed `SxProps<Theme>`: that alias is a union (object,
// array, or theme function), which cannot be object-spread. Callers spread
// this into their own `sx` object (see `HistoryPageFrame.tsx`), so it returns
// a plain object instead -- still valid `sx` input, just not the widest type
// for it.
export function stackedCardTableSx(theme: Theme) {
    return {
        [theme.breakpoints.down(768)]: {
            display: "block",
            minWidth: 0,
            "& thead": {display: "none"},
            "& tbody": {display: "block"},
            "& tr": {
                borderTop: `2px solid ${theme.palette.divider}`,
                display: "block",
                "&:first-of-type": {
                    borderTop: "none",
                },
            },
            "& td": {
                alignItems: "center",
                border: "none",
                display: "flex",
                flexDirection: "row",
                gap: 1,
                justifyContent: "space-between",
                textAlign: "right",
                "&::before": {
                    color: theme.palette.text.secondary,
                    content: "attr(data-label)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textAlign: "left",
                    textTransform: "uppercase",
                },
            },
        },
    };
}
