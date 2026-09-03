import {
    Box,
    Button,
    IconButton,
    Paper,
    Stack,
    SwipeableDrawer,
    useMediaQuery,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {useTheme} from "@mui/material/styles";
import type {ReactNode} from "react";

// FM-054 (ADR-0014): the mock's `<aside style="flex:0 0 248px;...;
// padding:18px 16px 40px;">` panel padding, kept as a local layout constant
// (not an exported design token -- ADR-0014 forbids a per-feature
// `*Styles.ts` token file, not an in-component spacing constant) since it is
// neither a color, a font, nor a radius value.
//
// FM-129: it is stated in theme spacing units now (18/16/40/8 are all exact
// steps of the sx spacing scale, so nothing moves). The section rhythm that
// used to be declared beside it is `theme.ts`'s exported `refineSectionGap`
// instead of a second declaration of the same 22px -- the value each consumer
// applies to its own sections, which are this shell's `children`.
//
// FM-136: both paddings, and the two widths below, moved here from
// `RefineSidebar.tsx` unchanged when ADR-0046 made the chrome shared. They
// state the refine surface's geometry once for every consumer.
const SIDEBAR_PADDING = {pb: 5, pt: 2.25, px: 2} as const;
const COLLAPSED_SIDEBAR_PADDING = {pb: 2.25, pt: 2.25, px: 1} as const;

// FM-181: the bottom sheet's own box. It keeps the docked column's horizontal
// padding (so a section renders identically in both branches) but not its
// 40px foot, which existed to clear the docked column's bottom edge; the
// sheet's footer is a real element and states its own.
const SHEET_PADDING_X = 2;

// FM-181: the sheet's top corners. A raised MUI surface is 12px in this theme
// (`MuiPaper`'s `styleOverrides.root`, "the mock's results card is
// border-radius:12px"), but a `Drawer`'s paper renders `square`, so the value
// has to be restated here to round the two edges that are no longer flush
// with the viewport. Deliberately a *string*: `sx`'s `borderRadius` key is
// theme-multiplied (see `pillRadius`'s note in `app/theme.ts`), so the number
// 12 would resolve to 96px.
const SHEET_CORNER_RADIUS = "12px";

// FM-181: how much of the viewport the sheet may claim before its body starts
// scrolling inside it. Leaves the sheet visibly short of the top edge, so what
// is behind it stays recognisable as the page it filters.
const SHEET_MAX_HEIGHT = "85vh";

// The expanded width is the mock's own `<aside style="flex:0 0 248px">`; the
// collapsed rail is wide enough for the chevron toggle alone. Module-local:
// no consumer computes against them (a former comment here claimed
// `SearchResults.tsx` did, which it has not for some time -- FM-136).
const EXPANDED_WIDTH = 248;
const COLLAPSED_WIDTH = 48;

// The single definition of "which refine-surface branch is live". Exported so
// a consumer's own layout can resolve the same branch this shell renders
// (`SearchResults.tsx`'s FM-041 "Show refine sidebar" display-options entry
// has to read and write whichever of the two mechanisms is mounted) without
// duplicating the breakpoint query string, which could then drift from this
// module's own.
//
// `useTheme()` from `@mui/material/styles` (rather than `useMediaQuery`'s own
// callback form) so the breakpoint still resolves in a component test that
// renders without a `ThemeProvider`, where `@mui/system`'s theme context is
// null.
//
// FM-042 (ADR-0011): eight table columns cannot render legibly at MUI's
// `sm` (600px), and legacy's own measured stacking threshold is 767px
// (`core/ui-src/less/partials/tables.less:91`'s `@media (max-width:
// @screen-xs-max)`, resolved from the compiled `bright.css` to 767px) --
// closer to MUI's `md` (900px) than to `sm`, but neither names it exactly.
// `theme.breakpoints.values` is `theme.ts`'s territory and out of that
// task's scope, so the threshold is expressed as the raw pixel value 768
// passed directly to `theme.breakpoints.down` (which resolves it as a
// literal `@media (max-width:767.95px)`, not a lookup against
// `theme.breakpoints.values`) rather than through a named `sm`/`md` token.
// `SearchResults.tsx`'s own stacked-card breakpoint passes the identical
// raw value to `theme.breakpoints.down`, so the table's stacking branch and
// this hook's drawer branch switch at the same computed width.
export function useCompactRefineSurface(): boolean {
    const theme = useTheme();
    return useMediaQuery(theme.breakpoints.down(768));
}

/**
 * The accessible names this surface's chrome renders. Every one of them names
 * the consumer's own domain ("refine sidebar" on the results page, the history
 * views' own wording), so none is hardcoded here.
 */
export type RefineSurfaceLabels = {
    /** The drawer branch's close button. */
    close: string;
    /** The docked branch's toggle while the column is expanded. */
    collapse: string;
    /**
     * FM-181: the compact sheet's own primary footer button, which dismisses
     * the sheet. It names the consumer's outcome rather than the action --
     * the results page counts what is about to be shown ("Show 12 results"),
     * the history views simply say "Done" -- so, like every other label here,
     * the shell states none of it.
     */
    done: string;
    /** The docked branch's toggle while the rail is collapsed, and the
     *  compact branch's trigger while the drawer is closed. */
    expand: string;
    /**
     * The compact trigger's visible text -- the button that summons the
     * drawer, which has to name what it opens. FM-142 (owner request
     * 2026-08-30): it is no longer also a caption inside the surface's own
     * header, which is why no branch of the docked column renders it.
     */
    heading: string;
    /** The landmark's accessible name (`aria-label` on the `nav`). */
    surface: string;
};

/**
 * Per-consumer `data-testid` values. They are compatibility contracts owned by
 * the consuming feature, so the shell states none of them itself.
 */
export type RefineSurfaceTestIds = {
    clearAll: string;
    close: string;
    /** FM-181: the compact sheet's footer "done" button. */
    done: string;
    drawer: string;
    surface: string;
    toggle: string;
};

/**
 * ADR-0046's one refine-surface concept: a docked, collapsible left column
 * beside the table it filters, replaced below 768px by a temporary bottom
 * sheet (FM-181) opened either by this shell's own "Refine" trigger or, with
 * `trigger="external"`, by a control the consumer places itself.
 *
 * This is chrome only. The shell owns no filter state and imports nothing from
 * `features/`: its sections arrive as `children`, its clear-all as an
 * `onClearAll`/`clearAllDisabled` pair, and its labels and test ids as props,
 * so the results page's client-side `ResultFilters` and the history views'
 * server-side `HistoryFilterValues` both stay with their own feature.
 *
 * Which of the two branches renders is decided in JavaScript
 * (`useCompactRefineSurface`) rather than by CSS `display`, so exactly one
 * copy of every control exists in the DOM at a time and no duplicate
 * accessible name or `data-testid` is ever present.
 */
export function RefineSurface({
    children,
    clearAllDisabled,
    collapsed,
    drawerOpen,
    labels,
    onClearAll,
    onDrawerOpenChange,
    onToggleCollapsed,
    stickyOffset = 0,
    summary,
    testIds,
    trigger = "inline",
}: {
    children: ReactNode;
    /** Disables "Clear all"; a consumer passes "no filter is active". */
    clearAllDisabled: boolean;
    collapsed: boolean;
    /**
     * The compact branch's open state. Deliberately not the persisted
     * `collapsed` preference -- that preference describes the docked desktop
     * column, and reusing it here would pop an overlay open over the content
     * the moment a desktop user with an expanded surface opened the same page
     * on a phone. The drawer always starts closed. Both booleans are owned by
     * the consumer (which is what lets a display-options entry drive them);
     * this shell keeps no `useState` of its own.
     */
    drawerOpen: boolean;
    labels: RefineSurfaceLabels;
    onClearAll: () => void;
    onDrawerOpenChange: (open: boolean) => void;
    onToggleCollapsed: () => void;
    /**
     * FM-055: how much sticky chrome sits above the surface, in pixels. The
     * docked branch (expanded *and* collapsed rail alike) pins itself directly
     * beneath it and sizes its own scroll box against it, so a consumer whose
     * chrome height is measured rather than fixed passes the measured value
     * down instead of this shell duplicating or hardcoding it. Defaults to 0
     * for a page with no sticky ancestor above the surface.
     */
    stickyOffset?: number;
    /**
     * Optional header content in the row's left slot, ahead of its controls --
     * ADR-0046's active-filter summary slot. The results page passes nothing:
     * its clear-all's disabled state already signals "no active filters", and
     * its header then holds the controls alone, right-aligned.
     */
    summary?: ReactNode;
    testIds: RefineSurfaceTestIds;
    /**
     * FM-181: where the compact branch's opener lives. `inline` (the default)
     * keeps the shell's own "Refine" text button in the consumer's flow, which
     * is what the history views render. `external` renders no trigger at all:
     * the results page puts its own icon trigger -- with an active-filter
     * badge -- into its one sticky toolbar row and drives `drawerOpen` from
     * there, so the shell must not emit a second control with the same
     * `data-testid`. The docked branch is unaffected; its toggle is part of
     * the column.
     */
    trigger?: "inline" | "external";
}) {
    const compact = useCompactRefineSurface();
    // FM-142: icon-only, following `filterControls.tsx`'s numeric-range clear
    // (FM-088). The 216px inner width of the 248px docked column cannot hold a
    // text button beside the active-filter summary and the collapse toggle --
    // FM-137 measured "Clear all" wrapping inside its own button in the
    // drawer. `ClearAllIcon`, not `CloseIcon`: the drawer's own close button
    // already carries that one, and the two must not read as the same action.
    const clearAll = (
        <IconButton
            aria-label="Clear all filters"
            color="primary"
            data-testid={testIds.clearAll}
            disabled={clearAllDisabled}
            onClick={onClearAll}
            size="small"
        >
            <ClearAllIcon fontSize="small" />
        </IconButton>
    );

    if (compact) {
        return (
            <>
                {trigger === "inline" && (
                    <Button
                        aria-expanded={drawerOpen}
                        aria-haspopup="dialog"
                        aria-label={
                            drawerOpen ? labels.collapse : labels.expand
                        }
                        data-testid={testIds.toggle}
                        onClick={() => onDrawerOpenChange(!drawerOpen)}
                        size="small"
                        // The shared neutral-secondary action; only the layout
                        // rule is local. This trigger opens a sheet, so it
                        // carries a caret like every other menu/panel opener.
                        endIcon={<ExpandMoreIcon />}
                        sx={{alignSelf: "flex-start"}}
                        variant="control"
                    >
                        {labels.heading}
                    </Button>
                )}
                {/* FM-181: a bottom sheet rather than the left drawer this
                    branch used to open. A phone's filter surface is reached
                    with the thumb that is already at the bottom of the
                    screen, and a sheet leaves the page it filters visible
                    above it; `disableSwipeToOpen` because the surface is
                    opened by a named control, never by an undiscoverable
                    edge swipe (which on this page would also fight the
                    results list's own scrolling). */}
                <SwipeableDrawer
                    anchor="bottom"
                    data-testid={testIds.drawer}
                    disableSwipeToOpen
                    onClose={() => onDrawerOpenChange(false)}
                    onOpen={() => onDrawerOpenChange(true)}
                    open={drawerOpen}
                    slotProps={{
                        // `SwipeableDrawer` keeps its paper mounted while
                        // closed so a swipe can find it; with the swipe
                        // disabled that would only leave a whole second copy
                        // of every section, clear-all and toggle in the DOM
                        // for a query to find. One branch, one copy -- the
                        // contract this shell has carried since FM-136.
                        root: {keepMounted: false},
                        paper: {
                            sx: {
                                backgroundImage: "none",
                                borderTopLeftRadius: SHEET_CORNER_RADIUS,
                                borderTopRightRadius: SHEET_CORNER_RADIUS,
                                // The sheet is a three-part column -- header,
                                // scrolling body, pinned footer -- so the
                                // clear-all and done controls stay reachable
                                // however long the sections are.
                                display: "flex",
                                flexDirection: "column",
                                maxHeight: SHEET_MAX_HEIGHT,
                            },
                        },
                    }}
                >
                    <Box
                        aria-label={labels.surface}
                        component="nav"
                        data-testid={testIds.surface}
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            // Without this a flex child refuses to shrink
                            // below its content height, and the body below
                            // would push the footer off the sheet instead of
                            // scrolling.
                            minHeight: 0,
                        }}
                    >
                        <Box sx={{pt: 2.25, px: SHEET_PADDING_X}}>
                            <RefineHeader
                                actions={
                                    <Button
                                        aria-label={labels.close}
                                        data-testid={testIds.close}
                                        onClick={() =>
                                            onDrawerOpenChange(false)
                                        }
                                        size="small"
                                        sx={{minWidth: 0, px: 0.75}}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </Button>
                                }
                                summary={summary}
                            />
                        </Box>
                        <Box
                            sx={{
                                minHeight: 0,
                                overflowY: "auto",
                                pb: 2,
                                px: SHEET_PADDING_X,
                            }}
                        >
                            {children}
                        </Box>
                        <Stack
                            alignItems="center"
                            direction="row"
                            sx={{
                                borderTop: "1px solid",
                                borderTopColor: "surfaces.hairlineFaint",
                                gap: 1,
                                pb: 2.25,
                                pt: 1.5,
                                px: SHEET_PADDING_X,
                            }}
                        >
                            {/* The sheet has room for the words the 216px
                                docked header did not (FM-142), and a footer
                                action a thumb has to hit deserves them: the
                                accessible name is unchanged, so every
                                existing query still resolves. */}
                            <Button
                                aria-label="Clear all filters"
                                data-testid={testIds.clearAll}
                                disabled={clearAllDisabled}
                                onClick={onClearAll}
                                size="small"
                                startIcon={<ClearAllIcon />}
                                variant="control"
                            >
                                Clear all
                            </Button>
                            <Button
                                data-testid={testIds.done}
                                onClick={() => onDrawerOpenChange(false)}
                                size="small"
                                sx={{ml: "auto"}}
                                variant="contained"
                            >
                                {labels.done}
                            </Button>
                        </Stack>
                    </Box>
                </SwipeableDrawer>
            </>
        );
    }

    return (
        <Paper
            aria-label={labels.surface}
            component="nav"
            data-testid={testIds.surface}
            elevation={0}
            sx={{
                // FM-055: the docked column (expanded *and* collapsed rail
                // alike) is pinned to the viewport directly beneath the
                // sticky chrome above it and scrolls within itself when it
                // is taller than the space that leaves, so refinement stays
                // reachable while the results list scrolls. ADR-0011 is
                // unaffected: this scroll container is a flex *sibling* of
                // the table it filters, never an ancestor of its header
                // cells, so the table's own viewport-sticky column header
                // keeps pinning against the document.
                alignSelf: "flex-start",
                backgroundColor: "transparent",
                borderRadius: 0,
                borderRight: "1px solid",
                borderRightColor: "surfaces.hairlineFaint",
                flexShrink: 0,
                maxHeight: `calc(100vh - ${stickyOffset}px)`,
                // `overflowX` stays clipped (it was the previous blanket
                // `overflow: hidden`'s job) so the width transition below
                // never produces a horizontal scrollbar mid-animation.
                overflowX: "hidden",
                overflowY: "auto",
                ...(collapsed ? COLLAPSED_SIDEBAR_PADDING : SIDEBAR_PADDING),
                position: "sticky",
                top: `${stickyOffset}px`,
                transition:
                    "width 150ms ease-in-out, padding 150ms ease-in-out",
                width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
            }}
        >
            <RefineHeader
                actions={
                    <>
                        {!collapsed && clearAll}
                        <Button
                            aria-expanded={!collapsed}
                            aria-label={
                                collapsed ? labels.expand : labels.collapse
                            }
                            data-testid={testIds.toggle}
                            onClick={onToggleCollapsed}
                            size="small"
                            sx={{
                                color: "surfaces.mutedText",
                                minWidth: 0,
                                px: 0.75,
                            }}
                        >
                            {collapsed ? (
                                <ChevronRightIcon fontSize="small" />
                            ) : (
                                <ChevronLeftIcon fontSize="small" />
                            )}
                        </Button>
                    </>
                }
                summary={collapsed ? undefined : summary}
            />
            {!collapsed && children}
        </Paper>
    );
}

// FM-142 (owner request 2026-08-30): no caption. The row is the consumer's
// optional summary in the left slot and the chrome controls at the end, and
// nothing else -- what the surface is is already said by the trigger that
// opens it and by the sections beneath, and at the 248px docked width a
// third element is what made FM-137's header wrap.
//
// `ml: "auto"` rather than the row's former `justifyContent="space-between"`,
// because the controls have to sit at the end whether or not a summary
// precedes them: with no summary (the results page) `space-between` would
// leave them at the start of the row.
function RefineHeader({
    actions,
    summary,
}: {
    actions: ReactNode;
    summary?: ReactNode;
}) {
    return (
        <Stack alignItems="center" direction="row" sx={{mb: 2}}>
            {summary}
            <Stack
                alignItems="center"
                direction="row"
                sx={{gap: 0.25, ml: "auto"}}
            >
                {actions}
            </Stack>
        </Stack>
    );
}
