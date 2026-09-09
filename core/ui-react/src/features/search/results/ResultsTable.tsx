import {
    Box,
    Button,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
    useTheme,
} from "@mui/material";
import type {SxProps, Theme} from "@mui/material";
import type {Table as ReactTableInstance} from "@tanstack/react-table";
import {flexRender} from "@tanstack/react-table";
import type {VirtualItem} from "@tanstack/react-virtual";
import type {RefObject} from "react";
import {useMemo} from "react";

import type {SearchResult} from "../../../api/search";
import type {ApiTransport} from "../../../api/transport";
import {denseControlFontSize} from "../../../app/theme";
import type {
    Downloader,
    downloadSettings,
} from "../../../domain/downloads/actions";
import type {ExpandSlots} from "./ResultRow";
import {ResultRow} from "./ResultRow";
import {STICKY_BACKGROUND} from "./ResultsToolbar";
import {SelectionMenu} from "./SelectionMenu";
import type {SelectionStatus} from "./resultTable";
import {actionsTrackWidth, isRecentResult} from "./resultTable";

// Header cells carry MUI's default 16px vertical `TableCell` padding, which
// -- together with the tallest control each cell held -- set the pre-FM-045
// header row to 63.25px at 1280x800 (measured against the clean `89286c376`
// baseline). With FM-034's inline filter controls gone the header row holds
// nothing but its sort button, so the row's own padding is what now keeps it
// tall; matching the body cells' existing 6px keeps the simplified header
// measurably shorter, as this task's visual contract requires. FM-042
// (ADR-0011) leaves this padding as-is: the mock's exact 42px header height
// is not itself an acceptance criterion here (only that every header's
// `scrollWidth` fits its `clientWidth` at the evidenced viewports is), and
// the re-proportioned `<colgroup>` plus the label typography below already
// satisfy that without also re-tuning row height.
const HEADER_CELL_PADDING_Y = 0.75;

// FM-150's header inset, named by FM-175 so the Actions header (which sits
// outside the sorted-column loop and needs the same left inset with no right
// one) states the same value rather than a second literal. The `epoch` header
// halves it -- see the header cell's own note below.
const HEADER_CELL_PADDING_X = 1;
const AGE_HEADER_CELL_PADDING_X = 0.5;

// FM-042 (ADR-0011): the mock's own header-row label typography
// (`uimock/NZBHydra Search.dc.html:258`), which ADR-0009 already makes
// authoritative for palette/typography/density. This is the "complementary
// lever" ADR-0011 names alongside the re-proportioned `<colgroup>` for
// making all eight columns' full labels fit: a smaller, uppercase, tracked
// label leaves more of each header cell's narrowed box for the label text
// itself than the previous default MUI `Button` typography did. FM-054
// (ADR-0014): the label color is the theme's own muted `text.secondary`
// role, consumed via `sx`'s palette-path resolution rather than restated as
// a `#hex` literal.
const HEADER_LABEL_FONT_SIZE = "11px";
const HEADER_LABEL_FONT_WEIGHT = 600;
const HEADER_LABEL_LETTER_SPACING = "0.5px";
const HEADER_LABEL_COLOR = "text.secondary";

// FM-041/FM-054: row-density values for the two display-option row
// treatments. Kept as local constants in this file (not a per-feature
// `*Styles.ts` token module, which ADR-0014 forbids) since neither is a
// color, font, or radius value.
const ROW_PADDING_Y = 0.75;
const COMPACT_ROW_PADDING_Y = 0.5;

// FM-175: the body cells' horizontal padding, in theme spacing units -- 8px,
// half MUI's stock `MuiTableCell` 16px. Not density-switched: "compact rows"
// is a *vertical* preference, and this table is horizontally tight at every
// density because ADR-0011 denies it a scrollbar.
const ROW_PADDING_X = 1;

// FM-175: the size of the glyph inside the row's icon buttons (Actions, and
// the title cell's expand controls), down from `fontSize="small"`'s 20px.
// A number, not a `fontSize` token, because it is a measured relationship to
// this table's 12-13px cell text rather than a step on the type ramp.
const ROW_ICON_GLYPH_SIZE = 16;

// FM-129: the compact table's own type ladder, one step under the default
// row treatment at each of the three places compact mode tightens. These stay
// local named constants rather than shared tokens: each is a value *relative*
// to the row density this one table switches between, meaningless outside it,
// and no other surface in the application has a compact mode to share them
// with. The title cell is the exception -- it renders the shared
// `denseControlFontSize` role, so it reads that instead.
const TABLE_CELL_FONT_SIZE = "12px";
const COMPACT_ACTION_FONT_SIZE = "11.5px";
const COMPACT_CHIP_FONT_SIZE = "10.5px";

// FM-042 (ADR-0011): the sticky column-header row pins directly beneath the
// sticky toolbar and therefore always stacks under it -- see
// `ResultsToolbar`'s `TOOLBAR_STICKY_Z_INDEX` for why neither value has to
// consider an open `Menu`/`Popover`.
const HEADER_STICKY_Z_INDEX = 10;

// The table's fixed `<colgroup>` track widths, single source for both the
// rendered `<colgroup>` below and TABLE_COLUMN_COUNT, so the spacer rows'
// colSpan can never drift from the actual track count under `tableLayout:
// fixed`. In rendered order:
// Checkbox/Title/Indexer/Category/Size/Details/Age/Actions -- which is the
// order `resultColumns` in `ResultRow.tsx` declares, not the one this
// comment claimed before FM-175.
//
// FM-175 (owner request, 2026-09-02) replaces the percentages with fixed
// pixel tracks and leaves Title alone with no width at all. Under
// `tableLayout: fixed` a percentage Title is starved twice over -- it is
// sized *before* the surplus is known, and any width the other columns do
// not need is redistributed to every track pro rata rather than to the one
// column that can use it. A track with no declared width is the only one
// that absorbs the whole remainder, which is exactly the "Title takes what
// the others leave" behaviour ADR-0011 asks for. The px values are the
// measured worst case of each column's own header label (uppercase 11px
// plus the sort glyph, plus the header cell's 8px paddings) rounded up:
// Indexer 88 -> 90, Category 96 -> 98, Size 64 -> 65, Details 87 -> 90,
// Age 51 -> 52; Actions 140 and Details 90 are the owner's own numbers.
// See the `<colgroup>` note below for the resulting Title measurement.
//
// `undefined` means "declare no width for this track"; the entry still
// exists so TABLE_COLUMN_COUNT and the rendered `<col>` list stay in step.
//
// FM-186 makes the last track a function of how many send buttons the row's
// Actions cell has to hold -- `actionsTrackWidth`, the single source both this
// set and the percentage set below derive from. FM-187 adds one more slot to
// that count for the send-to-black-hole button, when some loaded result
// renders it (`actionsSlotCount` below).
function tableColumnWidths(
    slotCount: number,
): Array<number | string | undefined> {
    return [40, undefined, 90, 98, 65, 90, 52, actionsTrackWidth(slotCount)];
}

// The same tracks below the basis width, as percentages of the table.
//
// Pixel tracks have no give: their sum (575px including the checkbox) is a
// floor the table cannot go under, and a fixed-layout table simply overflows
// its box rather than scaling them -- measured, and exactly the horizontal
// scroll ADR-0011 forbids. Every percentage here is its pixel track over the
// 936px basis table, so at the basis the two sets are the same table to the
// pixel and below it every track (Title included) shrinks in proportion
// instead of Title alone being crushed to nothing. Headers clip with an
// ellipsis at the narrow end, as they did before FM-175; the "every header
// fits" criterion is a criterion at the 1280x800 basis, not below it.
function narrowTableColumnWidths(
    slotCount: number,
): Array<number | string | undefined> {
    return [
        40,
        undefined,
        "9.62%",
        "10.47%",
        "6.94%",
        "9.62%",
        "5.56%",
        // Computed rather than written out, so it cannot drift from the pixel
        // track above: 140px is 14.96%, and each 28px slot adds ~2.99% (one
        // slot 17.95%, two 20.94%, three 23.93%).
        `${((actionsTrackWidth(slotCount) / TABLE_BASIS_WIDTH) * 100).toFixed(2)}%`,
    ];
}

// The basis table's width in px, i.e. what a 1280x800 viewport leaves beside
// the docked refine sidebar. Every percentage above is its own pixel track
// over this width, which is what makes the two sets the same table at the
// basis.
const TABLE_BASIS_WIDTH = 936;

// The viewport width the pixel tracks above are measured at, and the width
// at or above which they are used. It is deliberately the same 1280 as the
// visual-evidence desktop viewport rather than a `theme.ts` breakpoint
// token: the two sets of tracks are equal *at* this width by construction,
// so switching anywhere else would put a visible step in the layout. Below
// it the percentage set is not a compromise but the better of the two --
// with the tracks scaling, Title keeps a proportional share instead of
// being handed a remainder that reaches zero at a 575px table.
const TABLE_PIXEL_TRACK_BREAKPOINT = 1280;

/**
 * The `<colgroup>` track widths as CSS rules against the rendered `<col>`
 * elements, rather than as inline `style` attributes on them.
 *
 * Inline styles cannot be overridden by a media query, and FM-175 needs
 * exactly that: one set of tracks at and above the basis width, another
 * below it. Tracks with no declared width are skipped so they stay `auto`
 * in both sets -- that is what makes Title absorb the remainder.
 */
function columnTrackRules(
    widths: Array<number | string | undefined>,
): Record<string, {width: number | string}> {
    return Object.fromEntries(
        widths.flatMap((width, index) =>
            width === undefined
                ? []
                : [[`& colgroup > col:nth-of-type(${index + 1})`, {width}]],
        ),
    );
}

// The table's fixed `<colgroup>` track count, which the spacer rows have to
// span so the fixed layout is not disturbed by a row with a different cell
// count.
const TABLE_COLUMN_COUNT = tableColumnWidths(0).length;

/**
 * The results table's own style block, hoisted out of the `Table`'s JSX so
 * it is built from a `useMemo` on its actual inputs (theme, row density and
 * the two column-track sets) rather than as a fresh ~40-rule object on every
 * render. The window virtualizer re-renders `SearchResults` on every scroll
 * offset change, and an `sx` callback in the JSX rebuilt and re-serialized
 * all of this per scroll frame. The rules themselves -- and their order,
 * which decides which of two equally specific selectors wins -- are
 * unchanged.
 */
function resultsTableSx(
    theme: Theme,
    compactRows: boolean,
    narrowColumnWidths: Array<number | string | undefined>,
    pixelColumnWidths: Array<number | string | undefined>,
): SxProps<Theme> {
    return {
        tableLayout: "fixed",
        width: "100%",
        ...columnTrackRules(narrowColumnWidths),
        [theme.breakpoints.up(TABLE_PIXEL_TRACK_BREAKPOINT)]:
            columnTrackRules(pixelColumnWidths),
        // FM-162: the two virtualization spacer rows carry nothing but height
        // -- no padding, no card separator at <768px. Declared here rather than
        // on the rows themselves because the body-cell padding rule below is a
        // descendant selector of this same `sx` and would otherwise win.
        "& tbody > tr[data-virtual-spacer]": {
            border: 0,
        },
        "& tbody > tr[data-virtual-spacer] > td": {
            border: 0,
            padding: 0,
        },
        "& tbody > tr > td": {
            paddingBottom: compactRows ? COMPACT_ROW_PADDING_Y : ROW_PADDING_Y,
            paddingTop: compactRows ? COMPACT_ROW_PADDING_Y : ROW_PADDING_Y,
            // FM-175: top, not the table default `middle`. A wrapped title
            // makes its row two or three lines tall while every other cell
            // still holds one line, and a vertically centred row then floats
            // Indexer/Category/Size halfway down the block with nothing to read
            // them against. Aligned to the top, each cell's first line box
            // starts at the same y as the title's first line, which is the "a
            // title's first line sits level with the Indexer text" the owner
            // asked for and the only reading of it that survives wrapping (the
            // block's centre cannot: the taller the title, the further its
            // first line is from it).
            verticalAlign: "top",
        },
        // FM-179: the one row shape that reads better centred. A row with a
        // cover tile has a 56px object in its title cell and one line of text
        // in every other cell; top-aligned, Indexer/Size/Actions cling to the
        // tile's upper edge with 40px of empty cell under them, which is the
        // same complaint FM-175's rule above answers for wrapped titles,
        // mirrored. Centred, they line up with the tile -- and with the title's
        // first line, which the title cell's own stack centres on the tile in
        // `ResultRow`. Rows without a tile are untouched FM-175.
        "& tbody > tr[data-has-cover] > td": {
            verticalAlign: "middle",
        },
        // FM-175 (owner request, 2026-09-02): 8px horizontal body padding, half
        // MUI's stock 16px, so the width the table spends on gutters goes to
        // the title instead -- 8 cells' worth is ~112px, a third of the Title
        // column. A deviation from stock `MuiTableCell` density, and
        // deliberately authored here rather than in `theme.ts`: this is the one
        // table in the application whose content is squeezed (ADR-0011 forbids
        // it a horizontal scrollbar), so every other table keeps the stock
        // padding. Three cells are excluded, each for its own reason: the
        // checkbox cell keeps MUI's `padding="checkbox"` box (`0 0 0 4px`),
        // which is already tighter than 8px and is what the header checkbox is
        // positioned against; Title sets its own left padding in `ResultRow`
        // because it also carries the per-level nesting indent, and this
        // descendant selector would outrank it; and Actions is handled just
        // below.
        '& tbody > tr > td:not([data-label="Select"]):not([data-label="Title"]):not([data-label="Actions"])':
            {
                paddingLeft: ROW_PADDING_X,
                paddingRight: ROW_PADDING_X,
            },
        // FM-175: the Actions cell spends its right padding too. It is the last
        // cell in the row, its content is right-aligned icon buttons that
        // already carry 4px of their own padding, and the 8px would otherwise
        // sit between the last icon and the table's edge doing nothing. The
        // header cell above drops the same padding so the "ACTIONS" label stays
        // flush with the icons beneath it.
        '& tbody > tr > td[data-label="Actions"]': {
            paddingLeft: ROW_PADDING_X,
            paddingRight: 0,
        },
        // FM-175: the row checkbox's visible square lines up with the header's.
        // Both cells carry MUI's `padding="checkbox"` 4px left inset, so the
        // two boxes share an x only if the row's `Checkbox` adds nothing of its
        // own -- its stock 9px padding is exactly the 9px offset the header's
        // flat 17x17 `p: 0` square (`SelectionMenu.tsx`) does not have.
        // Removing the padding rather than pulling the control left with a
        // negative margin keeps it inside its cell, clear of the recency stripe
        // the same cell draws as an inset shadow on its left edge. The control
        // keeps its 20px `size="small"` box, its ripple and ADR-0013's focus
        // ring, all of which are drawn on this root; only the dead space around
        // it goes. Authored here rather than in `ResultRow` because the compact
        // branch below reaches every `.MuiCheckbox-root` in the body as a
        // descendant of this same `sx` and would outrank a per-instance `sx` --
        // at this specificity the alignment holds at both densities instead of
        // drifting 2px when compact rows are on.
        '& tbody > tr > td[data-label="Select"] .MuiCheckbox-root': {
            padding: 0,
        },
        // FM-175: the row's icons drop from a 20px glyph in a 28px button to a
        // 16px glyph in a 24px one (the theme's `MuiIconButton` 4px padding is
        // untouched, so the box follows the glyph). At 16px they are the scale
        // of the 12-13px text beside them instead of half again as tall, which
        // is what stops the Actions cell and the title's expand controls from
        // setting every row's height. Scoped to this table's body by descendant
        // selector: `MuiSvgIcon`'s own `fontSize="small"` step is a theme-level
        // token and every other icon in the application keeps it.
        '& tbody > tr > td[data-label="Title"] .MuiIconButton-root .MuiSvgIcon-root, & tbody > tr > td[data-label="Actions"] .MuiSvgIcon-root':
            {fontSize: ROW_ICON_GLYPH_SIZE},
        // "Compact rows" tightens the row's own controls proportionally as well
        // as its padding: the row checkbox and the action/expand buttons are
        // what actually set the row's height at this density, so trimming their
        // vertical padding is what makes the compact table measurably shorter.
        // Descendant `sx` from this one `Table`, so `DownloadActions.tsx` (a
        // different capability's file) is untouched and `ResultRow`'s
        // memoization is not involved at all.
        ...(compactRows
            ? {
                  "& tbody .MuiCheckbox-root": {
                      padding: 0.25,
                  },
                  "& tbody .MuiButton-root": {
                      fontSize: COMPACT_ACTION_FONT_SIZE,
                      minHeight: 0,
                      paddingBottom: 0,
                      paddingTop: 0,
                  },
                  // FM-150: since the expand and download controls became icon
                  // buttons, the `.MuiButton-root` rule above no longer reaches
                  // the controls that set a row's height -- these do, together
                  // with the detail links that were always icons.
                  "& tbody .MuiIconButton-root": {
                      padding: 0.25,
                  },
                  "& tbody .MuiChip-root": {
                      fontSize: COMPACT_CHIP_FONT_SIZE,
                      height: "18px",
                  },
                  '& tbody td[data-label="Actions"] .MuiStack-root': {
                      gap: 0.25,
                  },
              }
            : {}),
        "& td, & th": {
            fontSize: TABLE_CELL_FONT_SIZE,
        },
        '& [data-label="Title"]': {
            fontSize: denseControlFontSize,
        },
        // FM-042 (ADR-0011, Option E): the table never scrolls horizontally and
        // carries no `min-width` floor, so at and above the stacking breakpoint
        // it is always exactly as wide as its flex-layout box, with the
        // re-proportioned `<colgroup>` below doing the work of keeping every
        // header legible. Below the breakpoint the table renders as unrelated
        // stacked cards instead (`C-REFINE-SURFACE`'s shared
        // `useCompactRefineSurface()` moves its docked/drawer branch to the
        // same threshold, so the sidebar and the table switch layouts
        // together). The threshold itself -- legacy's measured 767px stacking
        // point, `tables.less:91` -- is expressed as the same raw pixel value
        // (768) passed to `theme.breakpoints.down` here as
        // `useCompactRefineSurface()` passes to its own raw `down` call, rather
        // than through `theme.ts`'s out-of-scope named `sm`/`md` tokens, so the
        // two branches switch at the same computed width.
        [theme.breakpoints.down(768)]: {
            display: "block",
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
            '& td[data-label="Title"]': {
                display: "block",
                textAlign: "left",
            },
            '& td[data-label="Title"]::before': {
                content: "none",
            },
            // Owner (2026-09-07): on a phone the Actions icons are tapped, not
            // clicked, and the 4px gap the desktop row uses (and the 2px the
            // compact-rows branch above sets) left them too close to hit
            // reliably. Same `tbody` selector as that branch so this later rule
            // wins at equal specificity, on a phone with compact rows on too.
            '& tbody td[data-label="Actions"] .MuiStack-root': {gap: 1},
        },
    };
}

/**
 * The three sticky header cells' style blocks, hoisted for the same reason as
 * `resultsTableSx` above: each was an `sx` callback rebuilt per header cell
 * per render, and the virtualizer re-renders this component on every scroll
 * offset change. Their only inputs are the theme and the *measured* toolbar
 * height the sticky `top` is derived from (plus, for a column header, whether
 * it is the `epoch` column with its halved padding), so a `useMemo` on those
 * covers every render. The rules and their order are unchanged.
 */
function headerSelectCellSx(
    theme: Theme,
    toolbarHeight: number,
): SxProps<Theme> {
    return {
        backgroundColor: STICKY_BACKGROUND,
        // FM-042 (ADR-0011): `border-collapse: collapse` (kept, so FM-041's
        // inset recency stripe is undisturbed) means the table paints this
        // row's border, which does not travel with a sticky `<th>` -- drawn as
        // an inset `box-shadow` on the cell instead, verified against a real
        // Chromium build to actually remain visible while pinned.
        boxShadow: `inset 0 -1px 0 ${theme.palette.divider}`,
        position: "sticky",
        py: HEADER_CELL_PADDING_Y,
        top: toolbarHeight,
        zIndex: HEADER_STICKY_Z_INDEX,
    };
}

function headerColumnCellSx(
    theme: Theme,
    toolbarHeight: number,
    isAgeColumn: boolean,
): SxProps<Theme> {
    return {
        backgroundColor: STICKY_BACKGROUND,
        // FM-042 (ADR-0011): see the checkbox header cell's comment above for
        // why this is a `box-shadow` rather than the collapsed table's own
        // border.
        boxShadow: `inset 0 -1px 0 ${theme.palette.divider}`,
        overflow: "hidden",
        position: "sticky",
        // FM-150: Age is the one header whose label no longer fits the column
        // the owner asked for -- "AGE ▼" measures 34.9px against the 29px the
        // 5% track leaves once this padding is taken, so it rendered clipped.
        // Halving its own padding buys the 8px that makes the header legible
        // again without touching any column's width.
        px: isAgeColumn ? AGE_HEADER_CELL_PADDING_X : HEADER_CELL_PADDING_X,
        py: HEADER_CELL_PADDING_Y,
        textOverflow: "ellipsis",
        top: toolbarHeight,
        whiteSpace: "nowrap",
        zIndex: HEADER_STICKY_Z_INDEX,
    };
}

function headerActionsCellSx(
    theme: Theme,
    toolbarHeight: number,
): SxProps<Theme> {
    return {
        backgroundColor: STICKY_BACKGROUND,
        // FM-042 (ADR-0011): see the checkbox header cell's comment above for
        // why this is a `box-shadow` rather than the collapsed table's own
        // border.
        boxShadow: `inset 0 -1px 0 ${theme.palette.divider}`,
        color: HEADER_LABEL_COLOR,
        fontSize: HEADER_LABEL_FONT_SIZE,
        fontWeight: HEADER_LABEL_FONT_WEIGHT,
        letterSpacing: HEADER_LABEL_LETTER_SPACING,
        overflow: "hidden",
        // FM-175: the one header cell that does not take the `px: 1` above,
        // because the Actions *body* cell drops its right padding entirely. A
        // label right-aligned 16px -- or even 8px -- inside the column whose
        // icons sit flush against the table's edge reads as a misaligned
        // header, so this cell matches the body cell's box rather than the
        // other headers'.
        pl: HEADER_CELL_PADDING_X,
        position: "sticky",
        pr: 0,
        py: HEADER_CELL_PADDING_Y,
        textOverflow: "ellipsis",
        textTransform: "uppercase",
        top: toolbarHeight,
        whiteSpace: "nowrap",
        zIndex: HEADER_STICKY_Z_INDEX,
    };
}

/**
 * The header sort button's style block. It has exactly two shapes -- the
 * left-aligned Title header's and every other header's -- and neither depends
 * on the theme or on any state, so both are module constants rather than an
 * object rebuilt per header per render.
 *
 * A native `<button>` keeps its intrinsic shrink-to-fit width even with
 * `display: flex` (buttons never stretch to fill their containing block the
 * way a `<div>` does), so a bare `textAlign` here has nothing to act on and
 * the label just hugs the cell's left edge regardless of alignment -- the
 * fixed `width: "100%"` plus `justifyContent` is what actually right-aligns a
 * non-Title header against its column's right-aligned body content.
 *
 * The mock gives the Title sort button `padding:0 6px` and every other
 * column's `0 4px` (`uimock/NZBHydra Search.dc.html:270-277`). FM-175 drops
 * Title's to zero -- a mock-pixel deviation, which ADR-0014 allows freely.
 * Title is the one left-aligned header, so its own padding is what decides
 * where the word "TITLE" starts, and the owner asked for the titles beneath it
 * to start at the same x. The body cell can only offer its 8px padding edge;
 * 6px of button padding on top of the header's own 8px would leave the label
 * 6px adrift of every title in the column. The right-aligned headers keep
 * their 4px, which is what holds them off their cell's right edge.
 */
function sortButtonSx(isTitle: boolean): SxProps<Theme> {
    return {
        alignItems: "center",
        color: HEADER_LABEL_COLOR,
        display: "flex",
        flexShrink: 0,
        fontSize: HEADER_LABEL_FONT_SIZE,
        fontWeight: HEADER_LABEL_FONT_WEIGHT,
        justifyContent: isTitle ? "flex-start" : "flex-end",
        letterSpacing: HEADER_LABEL_LETTER_SPACING,
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
        px: isTitle ? 0 : 0.5,
        textOverflow: "ellipsis",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        width: "100%",
    };
}

const TITLE_SORT_BUTTON_SX = sortButtonSx(true);
const COLUMN_SORT_BUTTON_SX = sortButtonSx(false);

/**
 * FM-192: the results table itself -- the empty-filter notice, the
 * `<colgroup>`, the sticky header row and the virtualized body -- moved
 * verbatim out of `SearchResults`.
 *
 * Boundary: the `RefineSidebar` invocation that shares the base region's
 * `Stack` stays with `SearchResults`, because it is driven entirely by the
 * refine-filter state the data pipeline owns and nothing about it is the
 * table. This component is the base region's inner
 * `<Box sx={{minWidth: 0, width: "100%"}}>` and its contents.
 *
 * The table's own style blocks moved with it (ADR-0014: a constant lives with
 * its sole consumer, not in a shared `*Styles.ts`), and so did the four
 * `useMemo`s that build them -- same inputs, same dependency arrays, so they
 * still hold across the scroll-driven re-renders `92a90787d` added them for.
 */
export function ResultsTable({
    actionsSlotCount,
    compactRows,
    coverWidth,
    currentSelectionStatus,
    dereferer,
    deselectAllVisible,
    downloadedIds,
    downloaders,
    expandSlots,
    filteredResults,
    handleDownloaded,
    handleToggleDuplicateExpansion,
    handleToggleTitleExpansion,
    highlightRecent,
    indexerColors,
    invertVisibleSelection,
    maySeeDetailsDl,
    rowDescriptors,
    selectAllVisible,
    selected,
    settings,
    showCovers,
    spacerHeightBottom,
    spacerHeightTop,
    table,
    tableBodyRef,
    toolbarHeight,
    transport,
    updateSelection,
    virtualRows,
}: {
    actionsSlotCount: number;
    compactRows: boolean;
    coverWidth: number;
    currentSelectionStatus: SelectionStatus;
    dereferer: unknown;
    deselectAllVisible: () => void;
    downloadedIds: Set<string>;
    downloaders: Downloader[];
    expandSlots: ExpandSlots;
    filteredResults: SearchResult[];
    handleDownloaded: (resultId: string) => void;
    handleToggleDuplicateExpansion: (key: string) => void;
    handleToggleTitleExpansion: (key: string) => void;
    highlightRecent: boolean;
    indexerColors: Record<string, string>;
    invertVisibleSelection: () => void;
    maySeeDetailsDl: boolean;
    rowDescriptors: VisibleRowDescriptor[];
    selectAllVisible: () => void;
    selected: Set<string>;
    settings: ReturnType<typeof downloadSettings>;
    showCovers: boolean;
    spacerHeightBottom: number;
    spacerHeightTop: number;
    table: ReactTableInstance<SearchResult>;
    tableBodyRef: RefObject<HTMLTableSectionElement | null>;
    toolbarHeight: number;
    transport: ApiTransport;
    updateSelection: (
        resultId: string,
        checked: boolean,
        shiftKey: boolean,
    ) => void;
    virtualRows: VirtualItem[];
}) {
    // The two `<colgroup>` track sets, both derived from that count so they
    // still describe the same table at the 936px basis.
    const pixelColumnWidths = useMemo(
        () => tableColumnWidths(actionsSlotCount),
        [actionsSlotCount],
    );
    const narrowColumnWidths = useMemo(
        () => narrowTableColumnWidths(actionsSlotCount),
        [actionsSlotCount],
    );
    // The results table's and its sticky header cells' style blocks, built
    // once per change of their actual inputs rather than per render: the
    // window virtualizer re-renders this component on every scroll offset
    // change, and as inline `sx` callbacks these ~40 table rules plus one
    // object per header cell were rebuilt and re-serialized per scroll frame.
    // The emitted CSS is unchanged -- see the builders at module level.
    const theme = useTheme();
    const tableSx = useMemo(
        () =>
            resultsTableSx(
                theme,
                compactRows,
                narrowColumnWidths,
                pixelColumnWidths,
            ),
        [compactRows, narrowColumnWidths, pixelColumnWidths, theme],
    );
    const headerCellSx = useMemo(
        () => ({
            actions: headerActionsCellSx(theme, toolbarHeight),
            age: headerColumnCellSx(theme, toolbarHeight, true),
            column: headerColumnCellSx(theme, toolbarHeight, false),
            select: headerSelectCellSx(theme, toolbarHeight),
        }),
        [theme, toolbarHeight],
    );
    return (
        <Box sx={{minWidth: 0, width: "100%"}}>
            {filteredResults.length === 0 && (
                <Typography component="h2" variant="h6">
                    All results are currently filtered
                </Typography>
            )}
            <Table
                // The row-density preference, advertised on
                // the element that carries it. The density
                // itself is descendant `sx` below (one rule
                // for every body cell rather than a
                // per-cell prop, so `ResultRow`'s
                // memoization is untouched by it), which a
                // jsdom component test cannot resolve
                // through a specificity-ordered cascade;
                // the rendered geometry is asserted in the
                // browser instead, matching how
                // `data-nesting-level`/`data-sort-direction`
                // already expose row and header state here.
                data-compact-rows={compactRows ? "true" : "false"}
                data-testid="search-results-table"
                // FM-162: how many rows this table stands for,
                // as opposed to how many are currently
                // mounted. Since the body is virtualized, the
                // rendered `search-result-row` count is a
                // function of the viewport; this is the number
                // that used to be readable by counting them.
                data-row-count={rowDescriptors.length}
                sx={tableSx}
            >
                {/* FM-042 (ADR-0011) established that this
                        table never scrolls horizontally and
                        carries no `min-width` floor, so these
                        eight tracks are the whole width
                        budget: what one column gives up,
                        another gets.

                        FM-150 (owner request, 2026-08-31)
                        traded Age's and Size's *mathematical*
                        worst case for the values users
                        actually see and gave the surplus to
                        Title, as percentages of the ~896px a
                        1280x800 viewport leaves beside the
                        docked refine sidebar. FM-175 (owner
                        request, 2026-09-02) keeps that trade
                        and changes how it is expressed: every
                        column except Title is now a fixed
                        pixel track sized for its own header
                        label, and Title carries no width at
                        all, so it is the single track the
                        remainder falls into. Measured at that
                        same basis, with the body cells'
                        8px horizontal padding (below):

                        - Table 936px, of which the 40px
                          checkbox track plus
                          90+98+65+90+52+140 = 535px of named
                          tracks leaves Title 361px, i.e. a
                          345px content box -- up from
                          FM-150's 349px track / 317px box,
                          and clear of the 340px FM-175 was
                          given as its floor. That is the
                          zero-downloader table; see the
                          Actions bullet below for what one
                          and two downloaders leave.
                        - The named tracks each clear their
                          own header label's measured width
                          (uppercase 11px plus the sort glyph
                          plus the cell's 8px paddings):
                          Indexer 88/90, Category 96/98, Size
                          64/65, Details 87/90, Age 51/52.
                          Age keeps the halved header padding
                          FM-150 gave it (see the header
                          cell's own note below); without it
                          "AGE (glyph)" would need 59px.
                        - Age and Size keep FM-150's accepted
                          exposure: `9999d` and `999.99 GB`
                          are wider than their tracks and
                          spill left into the neighbouring
                          column's padding. These cells are
                          `nowrap`, so nothing reflows and
                          the value stays legible -- accepted
                          there, unchanged here.
                        - Actions is 140px for its fixed
                          inventory: four 24px detail icons
                          plus the 24px download, 5x24 plus
                          four 4px gaps = 136px, so the icon
                          group never wraps and the
                          "Downloaded" chip still has a line
                          to drop to. FM-186 (owner request,
                          2026-09-05) adds one 24px send
                          button and one 4px gap per enabled
                          downloader to that same group, so
                          the track is
                          `actionsTrackWidth(count)` =
                          140 + 28*count -- 168px at one
                          downloader, 196px at two -- and
                          both width sets are derived from
                          that one function rather than
                          restated.
                        - Title absorbs the difference, as
                          the only track with no width: its
                          content box is 345px with no
                          downloader, 317px with one and
                          289px with two. The 289px is below
                          FM-175's 340px floor and is
                          accepted by this request, which
                          asked for the send buttons on the
                          row and for the track to grow with
                          the downloader count rather than
                          for the icons to wrap.
                        - FM-187 (owner request, 2026-09-05)
                          adds one more slot of exactly that
                          size for the send-to-black-hole
                          button, but only while some loaded
                          result would render it
                          (`blackHoleSlot` in
                          `resultTable.ts`). It is derived
                          from the results, not the config
                          alone, because `sendMagnetLinks`
                          defaults to true and an NZB-only
                          install must stay at 140px; and from
                          the *unfiltered* results, so refining
                          never shifts the columns.

                        These `<col>` elements carry no width
                        of their own: both sets of tracks are
                        CSS rules in the `sx` above, because
                        an inline width could not be swapped
                        at a breakpoint. Between the 768px
                        stacking breakpoint (below which the
                        `<colgroup>` stops applying at all --
                        the cells become blocks) and the
                        1280px basis, the pixel tracks would
                        add up to more table than there is:
                        a fixed layout does not scale them
                        down, it overflows, so
                        `narrowTableColumnWidths` holds
                        the same shape as percentages there
                        and ADR-0011's "no horizontal scroll"
                        stays true at every width. */}
                <colgroup>
                    {pixelColumnWidths.map((_, index) => (
                        <col key={index} />
                    ))}
                </colgroup>
                <TableHead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            <TableCell
                                data-label="Select"
                                padding="checkbox"
                                sx={headerCellSx.select}
                            >
                                <SelectionMenu
                                    idPrefix="header"
                                    onDeselectAll={deselectAllVisible}
                                    onInvertSelection={invertVisibleSelection}
                                    onSelectAll={selectAllVisible}
                                    status={currentSelectionStatus}
                                />
                            </TableCell>
                            {headerGroup.headers.map((header) => {
                                const isTitle = header.column.id === "title";
                                const label =
                                    typeof header.column.columnDef.header ===
                                    "string"
                                        ? header.column.columnDef.header
                                        : undefined;
                                const sortDirection =
                                    header.column.getIsSorted();
                                return (
                                    <TableCell
                                        align={isTitle ? "left" : "right"}
                                        aria-sort={
                                            sortDirection === "asc"
                                                ? "ascending"
                                                : sortDirection === "desc"
                                                  ? "descending"
                                                  : "none"
                                        }
                                        data-label={label}
                                        key={header.id}
                                        sx={
                                            header.column.id === "epoch"
                                                ? headerCellSx.age
                                                : headerCellSx.column
                                        }
                                    >
                                        {header.isPlaceholder ? null : (
                                            <Button
                                                aria-label={`${label ?? ""}${
                                                    sortDirection === "asc"
                                                        ? " (ascending)"
                                                        : sortDirection ===
                                                            "desc"
                                                          ? " (descending)"
                                                          : ""
                                                }`}
                                                data-sort-direction={
                                                    sortDirection || "none"
                                                }
                                                data-testid={`sort-${header.column.id}`}
                                                onClick={header.column.getToggleSortingHandler()}
                                                size="small"
                                                sx={
                                                    isTitle
                                                        ? TITLE_SORT_BUTTON_SX
                                                        : COLUMN_SORT_BUTTON_SX
                                                }
                                            >
                                                {flexRender(
                                                    header.column.columnDef
                                                        .header,
                                                    header.getContext(),
                                                )}
                                                {sortDirection && (
                                                    <Box
                                                        aria-hidden="true"
                                                        component="span"
                                                    >
                                                        {sortDirection === "asc"
                                                            ? " ▲"
                                                            : " ▼"}
                                                    </Box>
                                                )}
                                            </Button>
                                        )}
                                    </TableCell>
                                );
                            })}
                            <TableCell
                                align="right"
                                data-label="Actions"
                                sx={headerCellSx.actions}
                            >
                                Actions
                            </TableCell>
                        </TableRow>
                    ))}
                </TableHead>
                <TableBody ref={tableBodyRef}>
                    {/* FM-162: the space the rows above the
                        rendered window would occupy. An
                        in-flow row, so the fixed table layout
                        and the <768px card layout both handle
                        it without knowing it is there. */}
                    {spacerHeightTop > 0 && (
                        <TableRow
                            aria-hidden="true"
                            data-testid="results-virtual-spacer-top"
                            data-virtual-spacer="top"
                        >
                            <TableCell
                                colSpan={TABLE_COLUMN_COUNT}
                                style={{
                                    height: `${spacerHeightTop}px`,
                                }}
                            />
                        </TableRow>
                    )}
                    {virtualRows.map((virtualRow) => {
                        const row = rowDescriptors[virtualRow.index];
                        return (
                            <ResultRow
                                coverWidth={showCovers ? coverWidth : undefined}
                                dereferer={dereferer}
                                downloaded={downloadedIds.has(
                                    row.result.searchResultId,
                                )}
                                downloadSettings={settings}
                                downloaders={downloaders}
                                duplicateExpanded={row.duplicateExpanded}
                                duplicateKey={row.duplicateKey}
                                expandSlots={expandSlots}
                                indexerColors={indexerColors}
                                isNewGroup={row.isNewGroup}
                                key={row.result.searchResultId}
                                maySeeDetailsDl={maySeeDetailsDl}
                                nestingLevel={row.nestingLevel}
                                onDownloaded={handleDownloaded}
                                onSelectionChange={updateSelection}
                                onToggleDuplicateExpansion={
                                    handleToggleDuplicateExpansion
                                }
                                onToggleTitleExpansion={
                                    handleToggleTitleExpansion
                                }
                                recent={
                                    highlightRecent &&
                                    isRecentResult(row.result)
                                }
                                result={row.result}
                                selected={selected.has(
                                    row.result.searchResultId,
                                )}
                                showDuplicateExpand={row.showDuplicateExpand}
                                showTitleExpand={row.showTitleExpand}
                                titleExpanded={row.titleExpanded}
                                titleGroupKey={row.titleGroupKey}
                                transport={transport}
                            />
                        );
                    })}
                    {spacerHeightBottom > 0 && (
                        <TableRow
                            aria-hidden="true"
                            data-testid="results-virtual-spacer-bottom"
                            data-virtual-spacer="bottom"
                        >
                            <TableCell
                                colSpan={TABLE_COLUMN_COUNT}
                                style={{
                                    height: `${spacerHeightBottom}px`,
                                }}
                            />
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Box>
    );
}

// FM-192: exported, because `SearchResults` still builds the list (the window
// virtualizer counts it) and hands it here.
/** One rendered table-body row, with everything the grouping decides about it. */
export type VisibleRowDescriptor = {
    duplicateExpanded: boolean;
    duplicateKey: string;
    isNewGroup: boolean;
    nestingLevel: number;
    result: SearchResult;
    showDuplicateExpand: boolean;
    showTitleExpand: boolean;
    titleExpanded: boolean;
    titleGroupKey: string;
};
