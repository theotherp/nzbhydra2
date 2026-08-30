import {
    Box,
    Button,
    Drawer,
    Paper,
    Stack,
    Typography,
    useMediaQuery,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {useTheme} from "@mui/material/styles";
import type {ReactNode} from "react";

import {denseControlFontSize} from "../../app/theme";

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
    /** The docked branch's toggle while the rail is collapsed, and the
     *  compact branch's trigger while the drawer is closed. */
    expand: string;
    /** The header row's own caption, and the compact trigger's visible text. */
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
    drawer: string;
    surface: string;
    toggle: string;
};

/**
 * ADR-0046's one refine-surface concept: a docked, collapsible left column
 * beside the table it filters, replaced below 768px by a temporary `Drawer`
 * opened by a small "Refine" trigger.
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
     * Optional header content between the caption and the header's controls --
     * ADR-0046's active-filter summary slot. The results page passes nothing:
     * its "Clear all" disabled state already signals "no active filters".
     */
    summary?: ReactNode;
    testIds: RefineSurfaceTestIds;
}) {
    const compact = useCompactRefineSurface();
    const clearAll = (
        <Button
            data-testid={testIds.clearAll}
            disabled={clearAllDisabled}
            onClick={onClearAll}
            size="small"
            sx={{
                color: "primary.main",
                fontSize: denseControlFontSize,
                minWidth: 0,
                px: 0.5,
                py: 0.25,
            }}
        >
            Clear all
        </Button>
    );

    if (compact) {
        return (
            <>
                <Button
                    aria-expanded={drawerOpen}
                    aria-haspopup="dialog"
                    aria-label={drawerOpen ? labels.collapse : labels.expand}
                    data-testid={testIds.toggle}
                    onClick={() => onDrawerOpenChange(!drawerOpen)}
                    size="small"
                    // The shared neutral-secondary action; only the layout
                    // rule is local. This trigger opens a `Drawer`, so it
                    // carries a caret like every other menu/panel opener.
                    endIcon={<ExpandMoreIcon />}
                    sx={{alignSelf: "flex-start"}}
                    variant="control"
                >
                    {labels.heading}
                </Button>
                <Drawer
                    anchor="left"
                    data-testid={testIds.drawer}
                    onClose={() => onDrawerOpenChange(false)}
                    open={drawerOpen}
                    slotProps={{
                        paper: {
                            sx: {
                                backgroundImage: "none",
                                maxWidth: "100%",
                                ...SIDEBAR_PADDING,
                                width: `min(${EXPANDED_WIDTH + 32}px, 88vw)`,
                            },
                        },
                    }}
                >
                    <Box
                        aria-label={labels.surface}
                        component="nav"
                        data-testid={testIds.surface}
                    >
                        <RefineHeader
                            actions={
                                <>
                                    {clearAll}
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
                                </>
                            }
                            label={labels.heading}
                            summary={summary}
                        />
                        {children}
                    </Box>
                </Drawer>
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
                label={collapsed ? undefined : labels.heading}
                summary={collapsed ? undefined : summary}
            />
            {!collapsed && children}
        </Paper>
    );
}

function RefineHeader({
    actions,
    label,
    summary,
}: {
    actions: ReactNode;
    // Absent only for the collapsed desktop rail, which has room for the
    // toggle alone.
    label?: string;
    summary?: ReactNode;
}) {
    return (
        <Stack
            alignItems="center"
            direction="row"
            justifyContent="space-between"
            sx={{mb: 2}}
        >
            {label !== undefined && (
                <Typography component="span" variant="refineSurfaceLabel">
                    {label}
                </Typography>
            )}
            {summary}
            <Stack alignItems="center" direction="row" sx={{gap: 0.25}}>
                {actions}
            </Stack>
        </Stack>
    );
}
