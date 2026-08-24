import {
    Box,
    Button,
    Collapse,
    Drawer,
    Paper,
    Stack,
    TextField,
    Typography,
    useMediaQuery,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {useTheme} from "@mui/material/styles";
import type {Dispatch, ReactNode, SetStateAction} from "react";
import {useMemo} from "react";

import type {SearchResult} from "../../../api/search";
import {NumericFilter, ToggleRowFilter} from "./filterControls";
import type {NumericRange, QuickFilter, ResultFilters} from "./resultTable";
import {defaultFilters, quickFilterKey} from "./resultTable";

// Order-independent for the array-valued fields (`categories`/`indexers`/
// `downloadTypes`), which the UI never reorders but whose default value
// (`defaultFilters`, `resultTable.ts`) is derived by scanning `results` and
// so is not guaranteed to land in the same order the user's own toggling
// produced.
function canonicalFilters(value: ResultFilters): string {
    return JSON.stringify({
        ...value,
        categories: [...value.categories].sort(),
        downloadTypes: [...value.downloadTypes].sort(),
        indexers: [...value.indexers].sort(),
    });
}

// FM-054 (ADR-0014): the mock's `<aside style="flex:0 0 248px;...;
// padding:18px 16px 40px;">` panel padding and its `rowStyle(active)` /
// `chip(active)` section gap, kept as local layout constants (not exported
// design tokens -- ADR-0014 forbids a per-feature `*Styles.ts` token file,
// not an in-component spacing constant) since neither is a color, font, or
// radius value.
const SIDEBAR_PADDING = "18px 16px 40px";
const SECTION_GAP = "22px";

// Exported so `SearchResults.tsx` can compute how much horizontal room the
// sidebar currently claims (e.g. to size the results table's minimum width
// consistently whether the sidebar is expanded or collapsed). The expanded
// width is the mock's own `<aside style="flex:0 0 248px">`.
const EXPANDED_WIDTH = 248;
const COLLAPSED_WIDTH = 48;

// The single definition of "which refine-surface branch is live". Exported so
// `SearchResults.tsx` resolves the same branch this component renders (FM-041's
// "Show refine sidebar" display-options entry has to read and write whichever
// of the two mechanisms is mounted) without duplicating the breakpoint query
// string, which could then drift from this file's own.
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
// `theme.breakpoints.values` is `theme.ts`'s territory and out of this
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

// The "Refine" filter sidebar. Since FM-045 (ADR-0009: full mock fidelity)
// it is the *only* result-filter surface at every viewport: FM-034's inline
// per-column-header filter popovers and the mobile-only `results-filters` /
// `results-quick-filters` toolbar rows are gone, so every filter dimension --
// quality, title, category, indexer, size, age, grabs/seeders, download type
// -- is reachable here and nowhere else. It binds exactly the same
// `ResultFilters` state those removed surfaces drove; no second, independent
// filter state exists.
//
// At `sm` and up it renders as the mock's persistent, collapsible left
// column. Below `sm` a 248px docked column would compete with the table for
// the whole viewport width, so the identical sections render inside a
// temporary MUI `Drawer` opened by the same `refine-sidebar-toggle` control
// instead. Which of the two renders is decided in JavaScript
// (`useMediaQuery`) rather than by CSS `display`, so exactly one copy of
// every control exists in the DOM at a time and no duplicate accessible name
// or `data-testid` is ever present.
export function RefineSidebar({
    categoryOpen,
    clearRange,
    collapsed,
    drawerOpen,
    filters,
    indexerOpen,
    onClearAll,
    onDrawerOpenChange,
    onToggleCategoryOpen,
    onToggleCollapsed,
    onToggleIndexerOpen,
    onToggleQuickFilter,
    quickFilters,
    results,
    setFilters,
    toolbarHeight,
    updateRange,
}: {
    // FM-089: lifted to `SearchResults.tsx` alongside `sidebarCollapsed`/
    // `drawerOpen` so the two booleans can persist through the same
    // `hydra.search-results.table` blob; this component stays presentational
    // and keeps no `useState` of its own for either.
    categoryOpen: boolean;
    clearRange: (name: "size" | "grabs" | "age") => void;
    collapsed: boolean;
    // The below-`sm` drawer's open state, owned by `SearchResults.tsx` since
    // FM-041 so its display-options "Show refine sidebar" entry can read and
    // write the same mechanism this branch's `refine-sidebar-toggle` drives.
    // Deliberately *not* the persisted `collapsed` preference and deliberately
    // still unpersisted (see the branch's own note below): only the state's
    // owner moved, its lifecycle did not change.
    drawerOpen: boolean;
    filters: ResultFilters;
    indexerOpen: boolean;
    onClearAll: () => void;
    onDrawerOpenChange: (open: boolean) => void;
    onToggleCategoryOpen: () => void;
    onToggleCollapsed: () => void;
    onToggleIndexerOpen: () => void;
    onToggleQuickFilter: (filter: QuickFilter) => void;
    quickFilters: QuickFilter[];
    results: SearchResult[];
    setFilters: Dispatch<SetStateAction<ResultFilters>>;
    // FM-055: the sticky results toolbar's *measured* rendered height, owned
    // and re-measured by `SearchResults.tsx` (which already maintains it for
    // the table header's own sticky offset). The docked branch below pins
    // itself directly beneath that toolbar and sizes its own scroll box
    // against it, so the value is passed down rather than duplicated or
    // hardcoded here -- the toolbar's height changes with viewport width,
    // font loading, and its own wrapping.
    toolbarHeight: number;
    updateRange: (
        name: "size" | "grabs" | "age",
        bound: keyof NumericRange,
        value: string,
    ) => void;
}) {
    const compact = useCompactRefineSurface();
    // `drawerOpen` is deliberately not the persisted `collapsed` preference:
    // that preference describes the docked desktop column, and reusing it here
    // would pop an overlay open over the results the moment a desktop user
    // with an expanded sidebar opened the same page on a phone. The drawer
    // always starts closed and is opened on demand. Since FM-041 the state
    // itself lives in `SearchResults.tsx` (see the prop docs above) so the
    // display-options menu can drive it; that lift changed the owner only, not
    // this rationale or the state's initial value.
    const indexerEntries = useMemo(
        () => results.map((result) => result.indexer),
        [results],
    );
    const categoryEntries = useMemo(
        () => results.map((result) => result.category),
        [results],
    );
    // Derived from the loaded results rather than a hardcoded NZB/Torrent
    // pair: downloadType is optional and TORBOX also occurs.
    const downloadTypeOptions = useMemo(
        () =>
            [
                ...new Set(
                    results.flatMap((result) =>
                        result.downloadType === undefined
                            ? []
                            : [result.downloadType],
                    ),
                ),
            ].sort((first, second) => first.localeCompare(second)),
        [results],
    );
    const hasActiveFilters = useMemo(
        () =>
            canonicalFilters(filters) !==
            canonicalFilters(defaultFilters(results, quickFilters)),
        [filters, results, quickFilters],
    );
    const toggleDownloadType = (type: string) => {
        setFilters((current) => ({
            ...current,
            downloadTypes: current.downloadTypes.includes(type)
                ? current.downloadTypes.filter((value) => value !== type)
                : [...current.downloadTypes, type],
        }));
    };
    const sections = (
        <Stack sx={{gap: SECTION_GAP}}>
            {quickFilters.length > 0 && (
                <RefineSection label="Quality">
                    <Stack
                        data-testid="refine-quality-filters"
                        direction="row"
                        flexWrap="wrap"
                        sx={{gap: "6px"}}
                    >
                        {quickFilters.map((filter) => (
                            <RefineChip
                                active={
                                    filters.quickFilters[
                                        quickFilterKey(filter)
                                    ] ?? false
                                }
                                key={`${filter.group}-${filter.id}`}
                                label={filter.label}
                                onToggle={() => onToggleQuickFilter(filter)}
                            />
                        ))}
                    </Stack>
                </RefineSection>
            )}
            <RefineSection label="Title contains">
                {/* FM-054 (ADR-0014): the mock's recessed input surface,
                    hairline border, and 8px radius are the `MuiOutlinedInput`
                    theme default now (`app/theme.ts`); this field carries no
                    local background/border override. */}
                <TextField
                    fullWidth
                    onChange={(event) =>
                        setFilters((current) => ({
                            ...current,
                            title: event.target.value,
                        }))
                    }
                    placeholder="e.g. 1080p, name…"
                    size="small"
                    slotProps={{
                        htmlInput: {
                            "aria-label": "Filter titles",
                            "data-testid": "refine-filter-title",
                        },
                    }}
                    sx={{"& input": {fontSize: "13px"}}}
                    value={filters.title}
                />
            </RefineSection>
            <RefineCollapsibleList
                entries={categoryEntries}
                label="Category"
                listTestId="refine-category-list"
                onChange={(categories) =>
                    setFilters((current) => ({
                        ...current,
                        categories,
                    }))
                }
                onToggleOpen={onToggleCategoryOpen}
                open={categoryOpen}
                optionTestId="refine-category-option"
                selected={filters.categories}
                toggleTestId="refine-category-toggle"
            />
            <RefineCollapsibleList
                entries={indexerEntries}
                label="Indexer"
                listTestId="refine-indexer-list"
                onChange={(indexers) =>
                    setFilters((current) => ({
                        ...current,
                        indexers,
                    }))
                }
                onToggleOpen={onToggleIndexerOpen}
                open={indexerOpen}
                optionTestId="refine-indexer-option"
                selected={filters.indexers}
                toggleTestId="refine-indexer-toggle"
            />
            <RefineSection label="Size (MB)">
                <NumericFilter
                    label="Size (MB)"
                    name="size"
                    onChange={updateRange}
                    onClear={clearRange}
                    range={filters.size}
                    testIdPrefix="refine-size"
                />
            </RefineSection>
            <RefineSection label="Age (days)">
                <NumericFilter
                    label="Age (days)"
                    name="age"
                    onChange={updateRange}
                    onClear={clearRange}
                    range={filters.age}
                    testIdPrefix="refine-age"
                />
            </RefineSection>
            <RefineSection label="Grabs / seeders">
                <NumericFilter
                    label="Grabs / seeders"
                    name="grabs"
                    onChange={updateRange}
                    onClear={clearRange}
                    range={filters.grabs}
                    testIdPrefix="refine-grabs"
                />
            </RefineSection>
            {downloadTypeOptions.length > 0 && (
                <RefineSection label="Type">
                    <Stack
                        data-testid="refine-type-chips"
                        direction="row"
                        flexWrap="wrap"
                        sx={{gap: "6px"}}
                    >
                        {downloadTypeOptions.map((type) => (
                            <RefineChip
                                active={filters.downloadTypes.includes(type)}
                                key={type}
                                label={type}
                                onToggle={() => toggleDownloadType(type)}
                            />
                        ))}
                    </Stack>
                </RefineSection>
            )}
        </Stack>
    );
    const clearAll = (
        <Button
            data-testid="refine-clear-all"
            disabled={!hasActiveFilters}
            onClick={onClearAll}
            size="small"
            sx={{
                color: "primary.main",
                fontSize: "12.5px",
                minWidth: 0,
                px: "4px",
                py: "2px",
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
                    aria-label={
                        drawerOpen
                            ? "Collapse refine sidebar"
                            : "Expand refine sidebar"
                    }
                    data-testid="refine-sidebar-toggle"
                    onClick={() => onDrawerOpenChange(!drawerOpen)}
                    size="small"
                    // The shared neutral-secondary action; only the layout
                    // rule is local. This trigger opens a `Drawer`, so it
                    // carries a caret like every other menu/panel opener.
                    endIcon={<ExpandMoreIcon />}
                    sx={{alignSelf: "flex-start"}}
                    variant="control"
                >
                    Refine
                </Button>
                <Drawer
                    anchor="left"
                    data-testid="refine-sidebar-drawer"
                    onClose={() => onDrawerOpenChange(false)}
                    open={drawerOpen}
                    slotProps={{
                        paper: {
                            sx: {
                                backgroundImage: "none",
                                maxWidth: "100%",
                                p: SIDEBAR_PADDING,
                                width: `min(${EXPANDED_WIDTH + 32}px, 88vw)`,
                            },
                        },
                    }}
                >
                    <Box
                        aria-label="Refine results"
                        component="nav"
                        data-testid="refine-sidebar"
                    >
                        <RefineHeader
                            actions={
                                <>
                                    {clearAll}
                                    <Button
                                        aria-label="Close refine sidebar"
                                        data-testid="refine-sidebar-close"
                                        onClick={() =>
                                            onDrawerOpenChange(false)
                                        }
                                        size="small"
                                        sx={{minWidth: 0, px: "6px"}}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </Button>
                                </>
                            }
                            label="Refine"
                        />
                        {sections}
                    </Box>
                </Drawer>
            </>
        );
    }

    return (
        <Paper
            aria-label="Refine results"
            component="nav"
            data-testid="refine-sidebar"
            elevation={0}
            sx={{
                // FM-055: the docked column (expanded *and* collapsed rail
                // alike) is pinned to the viewport directly beneath the
                // sticky `results-toolbar` and scrolls within itself when it
                // is taller than the space that leaves, so refinement stays
                // reachable while the results list scrolls. ADR-0011 is
                // unaffected: this scroll container is a flex *sibling* of
                // the results table, never an ancestor of its header cells,
                // so the table's own viewport-sticky column header keeps
                // pinning against the document.
                alignSelf: "flex-start",
                backgroundColor: "transparent",
                borderRadius: 0,
                borderRight: "1px solid",
                borderRightColor: "surfaces.hairlineFaint",
                flexShrink: 0,
                maxHeight: `calc(100vh - ${toolbarHeight}px)`,
                // `overflowX` stays clipped (it was the previous blanket
                // `overflow: hidden`'s job) so the width transition below
                // never produces a horizontal scrollbar mid-animation.
                overflowX: "hidden",
                overflowY: "auto",
                p: collapsed ? "18px 8px 18px" : SIDEBAR_PADDING,
                position: "sticky",
                top: `${toolbarHeight}px`,
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
                                collapsed
                                    ? "Expand refine sidebar"
                                    : "Collapse refine sidebar"
                            }
                            data-testid="refine-sidebar-toggle"
                            onClick={onToggleCollapsed}
                            size="small"
                            sx={{
                                color: "surfaces.mutedText",
                                minWidth: 0,
                                px: "6px",
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
                label={collapsed ? undefined : "Refine"}
            />
            {!collapsed && sections}
        </Paper>
    );
}

function RefineHeader({
    actions,
    label,
}: {
    actions: ReactNode;
    // Absent only for the collapsed desktop rail, which has room for the
    // toggle alone.
    label?: string;
}) {
    return (
        <Stack
            alignItems="center"
            direction="row"
            justifyContent="space-between"
            sx={{mb: "16px"}}
        >
            {label !== undefined && (
                <Typography
                    component="span"
                    sx={{
                        color: "text.secondary",
                        fontSize: "12px",
                        fontWeight: 600,
                        letterSpacing: "0.7px",
                        textTransform: "uppercase",
                    }}
                >
                    {label}
                </Typography>
            )}
            <Stack alignItems="center" direction="row" sx={{gap: "2px"}}>
                {actions}
            </Stack>
        </Stack>
    );
}

// The mock's Quality and Type pills (`chip(active)`): a compact monospace
// label in a bordered box that changes background, border, and text color
// when selected. Every one of those rules is `app/theme.ts`'s `MuiButton`
// `variant="refineChip"` -- the same variant `C-HISTORY-REFINE-BAR` already
// renders, and a byte-for-byte duplicate of what this component used to
// author by hand. Its radius is `pillRadius`, a full stadium: a pill is a
// thing that is on or off, and nothing in these surfaces that is merely
// *pressable* is stadium-shaped any more.
function RefineChip({
    active,
    label,
    onToggle,
}: {
    active: boolean;
    label: string;
    onToggle: () => void;
}) {
    return (
        <Button
            aria-pressed={active}
            onClick={onToggle}
            size="small"
            variant="refineChip"
        >
            {label}
        </Button>
    );
}

function RefineSection({
    children,
    label,
}: {
    children: ReactNode;
    label: string;
}) {
    return (
        <Box>
            <Typography
                component="div"
                sx={{
                    color: "surfaces.mutedText",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.6px",
                    mb: "9px",
                    textTransform: "uppercase",
                }}
            >
                {label}
            </Typography>
            {children}
        </Box>
    );
}

function RefineCollapsibleList({
    entries,
    label,
    listTestId,
    onChange,
    onToggleOpen,
    open,
    optionTestId,
    selected,
    toggleTestId,
}: {
    entries: string[];
    label: string;
    listTestId: string;
    onChange: (values: string[]) => void;
    onToggleOpen: () => void;
    open: boolean;
    optionTestId: string;
    selected: string[];
    toggleTestId: string;
}) {
    return (
        <Box>
            <Button
                aria-expanded={open}
                data-testid={toggleTestId}
                onClick={onToggleOpen}
                size="small"
                sx={{
                    color: "surfaces.mutedText",
                    fontSize: "11px",
                    fontWeight: 600,
                    justifyContent: "space-between",
                    letterSpacing: "0.6px",
                    mb: "9px",
                    minWidth: 0,
                    px: 0,
                    py: 0,
                    textTransform: "uppercase",
                    width: "100%",
                }}
            >
                {label}
                {open ? (
                    <ExpandLessIcon fontSize="small" />
                ) : (
                    <ExpandMoreIcon fontSize="small" />
                )}
            </Button>
            <Collapse in={open}>
                <ToggleRowFilter
                    entries={entries}
                    onChange={onChange}
                    optionTestId={optionTestId}
                    selected={selected}
                    testId={listTestId}
                />
            </Collapse>
        </Box>
    );
}
